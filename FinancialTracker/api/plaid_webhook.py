"""Plaid webhook receiver — the real-time trigger.

Security: the request is unauthenticated but cryptographically verified.
Plaid signs each webhook with an ES256 JWT in the ``Plaid-Verification``
header whose ``request_body_sha256`` claim must match the raw body. We never
trust the payload until that check passes. We respond 200 fast and do the
actual sync in Celery so Plaid's delivery/retry budget is never blocked.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import time

import jwt
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from jwt.algorithms import ECAlgorithm

from accounts.models import PlaidItem

from . import plaid_client
from .tasks import sync_plaid_item

logger = logging.getLogger(__name__)

_KEY_CACHE: dict[str, str] = {}  # kid -> PEM public key
_MAX_AGE_SECONDS = 5 * 60

_TXN_REFRESH_CODES = {
    "SYNC_UPDATES_AVAILABLE",
    "INITIAL_UPDATE",
    "HISTORICAL_UPDATE",
    "DEFAULT_UPDATE",
}


def _public_key_for(kid: str) -> str | None:
    if kid in _KEY_CACHE:
        return _KEY_CACHE[kid]
    try:
        jwk = plaid_client.webhook_verification_key(kid)
    except Exception:  # noqa: BLE001 — any failure => treat as unverifiable
        logger.exception("Could not fetch Plaid webhook verification key %s", kid)
        return None
    pem = ECAlgorithm.from_jwk(json.dumps(jwk))
    _KEY_CACHE[kid] = pem
    return pem


def _verify(request) -> bool:
    token = request.headers.get("Plaid-Verification")
    if not token:
        return False
    try:
        header = jwt.get_unverified_header(token)
    except jwt.InvalidTokenError:
        return False
    if header.get("alg") != "ES256" or "kid" not in header:
        return False

    public_key = _public_key_for(header["kid"])
    if public_key is None:
        return False

    try:
        claims = jwt.decode(token, public_key, algorithms=["ES256"])
    except jwt.InvalidTokenError:
        return False

    # Replay protection.
    if abs(time.time() - claims.get("iat", 0)) > _MAX_AGE_SECONDS:
        return False

    expected = claims.get("request_body_sha256", "")
    actual = hashlib.sha256(request.body).hexdigest()
    return hmac.compare_digest(str(expected), actual)


@csrf_exempt
@require_POST
def plaid_webhook(request):
    if not plaid_client.is_configured():
        # Nothing we could verify or sync — acknowledge so Plaid stops retrying.
        return JsonResponse({"status": "ignored"}, status=200)

    if not _verify(request):
        logger.warning("Rejected Plaid webhook: signature verification failed")
        return JsonResponse({"detail": "invalid signature"}, status=400)

    try:
        payload = json.loads(request.body or b"{}")
    except ValueError:
        return JsonResponse({"detail": "invalid body"}, status=400)

    wtype = payload.get("webhook_type", "")
    wcode = payload.get("webhook_code", "")
    item_id = payload.get("item_id", "")

    item = PlaidItem.objects.filter(item_id=item_id).first() if item_id else None
    if item is None:
        return JsonResponse({"status": "unknown_item"}, status=200)

    if wtype == "TRANSACTIONS" and wcode in _TXN_REFRESH_CODES:
        sync_plaid_item.delay(item.id)
    elif wtype == "TRANSACTIONS" and wcode == "TRANSACTIONS_REMOVED":
        sync_plaid_item.delay(item.id)
    elif wtype == "ITEM":
        if wcode == "ERROR":
            err = (payload.get("error") or {}).get("error_code", "")
            item.status = (
                PlaidItem.Status.LOGIN_REQUIRED
                if err == "ITEM_LOGIN_REQUIRED"
                else PlaidItem.Status.ERROR
            )
            item.error_message = ((payload.get("error") or {}).get("error_message") or err)[:255]
            item.save(update_fields=["status", "error_message"])
        elif wcode in ("PENDING_EXPIRATION", "USER_PERMISSION_REVOKED"):
            item.status = PlaidItem.Status.LOGIN_REQUIRED
            item.save(update_fields=["status"])
        elif wcode == "LOGIN_REPAIRED":
            item.status = PlaidItem.Status.ACTIVE
            item.error_message = ""
            item.save(update_fields=["status", "error_message"])
            sync_plaid_item.delay(item.id)

    return JsonResponse({"status": "accepted"}, status=200)
