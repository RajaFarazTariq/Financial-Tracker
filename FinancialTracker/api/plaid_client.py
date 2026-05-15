"""Thin, version-pinned wrapper around the Plaid SDK (plaid-python 39.x).

Every call goes through ``_client()`` which is configured from settings, so the
rest of the codebase never imports the Plaid SDK directly.
"""

from __future__ import annotations

import plaid
from django.conf import settings
from plaid.api import plaid_api
from plaid.model.accounts_balance_get_request import AccountsBalanceGetRequest
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.country_code import CountryCode
from plaid.model.institutions_get_by_id_request import InstitutionsGetByIdRequest
from plaid.model.item_get_request import ItemGetRequest
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.item_remove_request import ItemRemoveRequest
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.transactions_refresh_request import TransactionsRefreshRequest
from plaid.model.transactions_sync_request import TransactionsSyncRequest
from plaid.model.webhook_verification_key_get_request import WebhookVerificationKeyGetRequest


class PlaidNotConfigured(RuntimeError):
    """Raised when Plaid credentials are missing so callers can 400 cleanly."""


def is_configured() -> bool:
    return bool(settings.PLAID_CLIENT_ID and settings.PLAID_SECRET)


def _client() -> plaid_api.PlaidApi:
    if not is_configured():
        raise PlaidNotConfigured(
            "Plaid is not configured. Set PLAID_CLIENT_ID and PLAID_SECRET."
        )
    host = (
        plaid.Environment.Production
        if settings.PLAID_ENV.lower() == "production"
        else plaid.Environment.Sandbox
    )
    config = plaid.Configuration(
        host=host,
        api_key={"clientId": settings.PLAID_CLIENT_ID, "secret": settings.PLAID_SECRET},
    )
    return plaid_api.PlaidApi(plaid.ApiClient(config))


def _country_codes() -> list[CountryCode]:
    return [CountryCode(c.strip().upper()) for c in settings.PLAID_COUNTRY_CODES]


def create_link_token(user) -> str:
    """Short-lived token that initializes Plaid Link in the browser."""
    req = LinkTokenCreateRequest(
        user=LinkTokenCreateRequestUser(client_user_id=str(user.id)),
        client_name="Financial Tracker",
        products=[Products(p.strip()) for p in settings.PLAID_PRODUCTS],
        country_codes=_country_codes(),
        language="en",
    )
    if settings.PLAID_WEBHOOK_URL:
        req.webhook = settings.PLAID_WEBHOOK_URL
    if settings.PLAID_REDIRECT_URI:
        req.redirect_uri = settings.PLAID_REDIRECT_URI
    return _client().link_token_create(req).link_token


def exchange_public_token(public_token: str) -> tuple[str, str]:
    """Trade the one-time public_token for a long-lived (access_token, item_id)."""
    resp = _client().item_public_token_exchange(
        ItemPublicTokenExchangeRequest(public_token=public_token)
    )
    return resp.access_token, resp.item_id


def get_institution(access_token: str) -> tuple[str, str]:
    """Return (institution_id, institution_name) for an item; ('', '') if unknown."""
    item = _client().item_get(ItemGetRequest(access_token=access_token)).item
    inst_id = item.institution_id or ""
    if not inst_id:
        return "", ""
    try:
        inst = _client().institutions_get_by_id(
            InstitutionsGetByIdRequest(
                institution_id=inst_id, country_codes=_country_codes()
            )
        ).institution
        return inst_id, inst.name
    except plaid.ApiException:
        return inst_id, ""


def get_accounts(access_token: str):
    return _client().accounts_get(AccountsGetRequest(access_token=access_token)).accounts


def get_balances(access_token: str):
    return _client().accounts_balance_get(
        AccountsBalanceGetRequest(access_token=access_token)
    ).accounts


def transactions_sync(access_token: str, cursor: str | None):
    kwargs = {"access_token": access_token}
    if cursor:
        kwargs["cursor"] = cursor
    return _client().transactions_sync(TransactionsSyncRequest(**kwargs))


def transactions_refresh(access_token: str) -> None:
    """Ask Plaid to pull fresh data from the bank now (Production; rate-limited)."""
    _client().transactions_refresh(TransactionsRefreshRequest(access_token=access_token))


def remove_item(access_token: str) -> None:
    try:
        _client().item_remove(ItemRemoveRequest(access_token=access_token))
    except plaid.ApiException:
        # Already removed / invalid — safe to ignore on unlink.
        pass


def webhook_verification_key(key_id: str) -> dict:
    return (
        _client()
        .webhook_verification_key_get(WebhookVerificationKeyGetRequest(key_id=key_id))
        .key.to_dict()
    )
