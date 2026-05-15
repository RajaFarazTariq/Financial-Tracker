"""Transparent at-rest encryption for sensitive strings (Plaid access tokens)."""

import base64
import hashlib
import functools

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.db import models


@functools.lru_cache(maxsize=1)
def _fernet() -> Fernet:
    key = settings.PLAID_TOKEN_KEY
    if key:
        return Fernet(key.encode() if isinstance(key, str) else key)
    # Deterministically derive a valid Fernet key from SECRET_KEY when no
    # dedicated key is configured (fine for dev; set PLAID_TOKEN_KEY in prod).
    derived = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(derived))


class EncryptedTextField(models.TextField):
    """TextField whose value is Fernet-encrypted (AES-128-CBC + HMAC) at rest."""

    def get_prep_value(self, value):
        if value is None or value == "":
            return value
        return _fernet().encrypt(str(value).encode()).decode()

    def from_db_value(self, value, expression, connection):
        if value is None or value == "":
            return value
        try:
            return _fernet().decrypt(value.encode()).decode()
        except InvalidToken:
            # Tolerate a legacy/plaintext value rather than hard-failing.
            return value

    def to_python(self, value):
        return value
