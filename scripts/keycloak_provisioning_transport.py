"""Small secret-safe Keycloak Admin transport shared by local provisioners.

This module contains no product or projection decisions.  Callers must validate
their complete profile before obtaining a token.  Admin authentication is
nevertheless defense-in-depth pinned to the VPS loopback listener here too.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Mapping
from typing import Any


ADMIN_BASE_URL = "http://127.0.0.1:8080/auth"
MAX_JSON_RESPONSE_BYTES = 2 * 1024 * 1024
RETRYABLE_HTTP_STATUS = {408, 425, 429, 500, 502, 503, 504}
EMPTY_MUTATION_SUCCESS = {
    "POST": {201, 204},
    "PUT": {204},
    "DELETE": {204},
}


class ProvisioningError(Exception):
    """A safe-to-report provisioning contract error."""


class KeycloakRequestError(ProvisioningError):
    """A reduced transport error that never includes a body or credential."""

    def __init__(self, message: str, *, retryable: bool = False) -> None:
        super().__init__(message)
        self.retryable = retryable


class _NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Never forward an admin credential to a redirect target."""

    def redirect_request(self, request, file_pointer, code, message, headers, new_url):  # noqa: ANN001
        return None


def _strict_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate JSON object key.")
        result[key] = value
    return result


def has_forbidden_secret_key(value: Any, path: str = "") -> str | None:
    """Return the first secret-shaped profile key, including nested values."""

    if isinstance(value, Mapping):
        for key, nested in value.items():
            key_text = str(key)
            next_path = f"{path}.{key_text}" if path else key_text
            if any(marker in key_text.lower() for marker in ("secret", "password", "credential", "token")):
                return next_path
            result = has_forbidden_secret_key(nested, next_path)
            if result:
                return result
    elif isinstance(value, list):
        for index, nested in enumerate(value):
            result = has_forbidden_secret_key(nested, f"{path}[{index}]")
            if result:
                return result
    return None


def endpoint(base_url: str, path: str) -> str:
    return base_url.rstrip("/") + path


def _validate_loopback_url(url: str) -> None:
    parsed = urllib.parse.urlsplit(url)
    if (
        parsed.scheme != "http"
        or parsed.hostname != "127.0.0.1"
        or parsed.port != 8080
        or parsed.netloc != "127.0.0.1:8080"
        or not (parsed.path == "/auth" or parsed.path.startswith("/auth/"))
        or parsed.username is not None
        or parsed.password is not None
        or parsed.fragment
    ):
        raise ProvisioningError("Keycloak requests are restricted to the exact loopback admin boundary.")


_ADMIN_RESPONSE_SECRET_FIELDS = {
    "access_token",
    "accesstoken",
    "client-secret",
    "client_secret",
    "clientsecret",
    "client.secret.creation.time",
    "credential",
    "credentialdata",
    "credentials",
    "id_token",
    "idtoken",
    "initialaccesstoken",
    "password",
    "refresh_token",
    "refreshtoken",
    "registrationaccesstoken",
    "secret",
    "secretdata",
    "token",
}
_SAFE_MAPPER_TOKEN_CONFIG_FIELDS = {
    "access.token.claim",
    "id.token.claim",
    "userinfo.token.claim",
    "introspection.token.claim",
}


def _strip_admin_response_secrets(value: Any, path: tuple[str, ...] = ()) -> Any:
    """Strip only secret-bearing values while retaining semantic mapper flags."""

    if isinstance(value, Mapping):
        result: dict[str, Any] = {}
        in_mapper_config = bool(path) and path[-1] == "config"
        for key, nested in value.items():
            key_text = str(key)
            key_folded = key_text.casefold()
            if in_mapper_config and key_text in _SAFE_MAPPER_TOKEN_CONFIG_FIELDS:
                result[key_text] = _strip_admin_response_secrets(nested, (*path, key_text))
                continue
            if key_folded in _ADMIN_RESPONSE_SECRET_FIELDS:
                continue
            result[key_text] = _strip_admin_response_secrets(nested, (*path, key_text))
        return result
    if isinstance(value, list):
        return [
            _strip_admin_response_secrets(item, (*path, str(index)))
            for index, item in enumerate(value)
        ]
    return value


def request_json(
    method: str,
    url: str,
    *,
    token: str | None = None,
    body: Mapping[str, Any] | None = None,
    form: Mapping[str, str] | None = None,
    timeout_seconds: int = 30,
) -> Any:
    """Make one HTTP request without surfacing URL/body/credential content."""

    _validate_loopback_url(url)
    parsed_url = urllib.parse.urlsplit(url)
    is_token_exchange = (
        method == "POST"
        and token is None
        and body is None
        and isinstance(form, Mapping)
        and parsed_url.path == "/auth/realms/master/protocol/openid-connect/token"
        and not parsed_url.query
    )
    if method != "GET" and not is_token_exchange:
        raise ProvisioningError(
            "Classic Keycloak Admin REST mutation is hard-disabled in the shared transport."
        )
    headers = {"Accept": "application/json"}
    data: bytes | None = None
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if body is not None:
        data = json.dumps(body, separators=(",", ":")).encode("utf-8")
        headers["Content-Type"] = "application/json"
    elif form is not None:
        data = urllib.parse.urlencode(form).encode("utf-8")
        headers["Content-Type"] = "application/x-www-form-urlencoded"
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    # Ignore HTTP(S)_PROXY/ALL_PROXY and never follow a redirect. The request contains
    # either the admin password or a bearer token and may only reach 127.0.0.1:8080.
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), _NoRedirectHandler())
    try:
        with opener.open(request, timeout=timeout_seconds) as response:
            content_length = response.headers.get("Content-Length")
            if content_length is not None:
                try:
                    if int(content_length) > MAX_JSON_RESPONSE_BYTES:
                        raise KeycloakRequestError(f"Keycloak {method} response exceeded the size limit.")
                except ValueError:
                    raise KeycloakRequestError(f"Keycloak {method} response had an invalid length.") from None
            payload = response.read(MAX_JSON_RESPONSE_BYTES + 1)
            if len(payload) > MAX_JSON_RESPONSE_BYTES:
                raise KeycloakRequestError(f"Keycloak {method} response exceeded the size limit.")
            status = getattr(response, "status", None)
            if not payload:
                if isinstance(status, int) and status in EMPTY_MUTATION_SUCCESS.get(method, set()):
                    return None
                raise KeycloakRequestError(f"Keycloak {method} request returned an unexpected empty response.")
            if response.headers.get_content_type() != "application/json":
                raise KeycloakRequestError(f"Keycloak {method} request returned an unexpected content type.")
    except urllib.error.HTTPError as error:
        raise KeycloakRequestError(
            f"Keycloak {method} request failed (HTTP {error.code}).",
            retryable=error.code in RETRYABLE_HTTP_STATUS,
        ) from None
    except (urllib.error.URLError, TimeoutError):
        raise KeycloakRequestError(
            f"Keycloak {method} request failed (network or TLS error).",
            retryable=True,
        ) from None
    try:
        parsed = json.loads(payload.decode("utf-8"), object_pairs_hook=_strict_object)
        # Admin API responses may include confidential-client secrets. Authentication
        # responses are the sole exception because obtain_admin_token consumes the
        # access token in memory; callers pass no bearer token for that request.
        return _strip_admin_response_secrets(parsed) if token is not None else parsed
    except (UnicodeDecodeError, json.JSONDecodeError, ValueError):
        raise KeycloakRequestError(f"Keycloak {method} request returned invalid JSON.") from None


def obtain_admin_token(profile: Mapping[str, Any], timeout_seconds: int) -> str:
    """Obtain an in-memory admin token only for the exact loopback boundary."""

    keycloak = profile.get("keycloak")
    if not isinstance(keycloak, Mapping) or keycloak.get("adminBaseUrl") != ADMIN_BASE_URL:
        raise ProvisioningError("Keycloak admin authentication is restricted to the exact loopback endpoint.")
    parsed = urllib.parse.urlsplit(str(keycloak["adminBaseUrl"]))
    if (
        parsed.scheme != "http"
        or parsed.hostname != "127.0.0.1"
        or parsed.port != 8080
        or parsed.path != "/auth"
        or parsed.username is not None
        or parsed.password is not None
        or parsed.query
        or parsed.fragment
    ):
        raise ProvisioningError("Keycloak admin authentication is restricted to the exact loopback endpoint.")
    username = os.environ.get("KEYCLOAK_ADMIN_USER") or os.environ.get("KEYCLOAK_ADMIN")
    password = os.environ.get("KEYCLOAK_ADMIN_PASSWORD")
    if not username or not password:
        raise ProvisioningError(
            "Missing admin credentials: set KEYCLOAK_ADMIN_USER (or KEYCLOAK_ADMIN) and KEYCLOAK_ADMIN_PASSWORD in the process environment."
        )
    token_url = endpoint(
        str(keycloak["adminBaseUrl"]),
        "/realms/" + urllib.parse.quote(str(keycloak["adminRealm"]), safe="") + "/protocol/openid-connect/token",
    )
    try:
        response = request_json(
            "POST",
            token_url,
            form={
                "grant_type": "password",
                "client_id": str(keycloak["adminClientId"]),
                "username": username,
                "password": password,
            },
            timeout_seconds=timeout_seconds,
        )
    finally:
        password = ""
    token = response.get("access_token") if isinstance(response, Mapping) else None
    if not isinstance(token, str) or not token:
        raise KeycloakRequestError("Keycloak admin authentication returned no access token.")
    return token
