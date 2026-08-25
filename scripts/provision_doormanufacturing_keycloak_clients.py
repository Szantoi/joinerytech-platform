#!/usr/bin/env python3
"""Historical validation for the retired Door Manufacturing client profile.

This was the POSIX/VPS counterpart to the repository's retired tenant-onboarding
workflow. Its pure validators are retained for historical profiles; there is no
reachable Keycloak Admin execution path.

The profile contains obsolete ``tid``/``enabled_modules`` mapper intent. Only
explicit ``--offline`` historical validation is reachable. Default, live,
``--verify-only`` and ``--apply`` modes fail before profile, credential or
network access and emit no runnable mapper/client plan.

The public browser client is deliberately pinned to the canonical HTTPS origin
and its two exact OIDC callback URLs.  Wildcards, localhost, arbitrary paths,
and ``*``/``+`` web-origin shortcuts are rejected before any Keycloak call.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any


EXIT_CONVERGED = 0
EXIT_PENDING = 1
EXIT_ERROR = 2

PROFILE_VERSION = "doormanufacturing-keycloak-clients/v1"
PUBLIC_ORIGIN = "https://doormanufacturing.joinerytech.hu"
WEB_CLIENT_ID = "doormanufacturing-web"
INSTANCE_API_CLIENT_ID = "doormanufacturing-instance-api"
PUBLIC_KEYCLOAK_BASE_URL = "https://joinerytech.hu/auth"
ADMIN_KEYCLOAK_BASE_URL = "http://127.0.0.1:8080/auth"
ISSUER = "https://joinerytech.hu/auth/realms/spaceos"
TENANT_CLAIM = "tid"
MODULES_CLAIM = "enabled_modules"
SIGNING_ALGORITHM = "RS256"
LEGACY_ONLINE_DISABLED_MESSAGE = (
    "This legacy flat-claim provisioner is retired; only explicit --offline "
    "historical validation is allowed."
)
WEB_CALLBACK_URIS = (
    f"{PUBLIC_ORIGIN}/flow/auth/callback",
    f"{PUBLIC_ORIGIN}/calc/auth/callback",
)


class ProvisioningError(Exception):
    """A safe-to-report provisioning error (it never carries a response body)."""


class KeycloakRequestError(ProvisioningError):
    """A Keycloak API error reduced to method, endpoint kind, and HTTP status."""


def reject_legacy_online_path() -> None:
    """Make every retained credential/transport helper fail before side effects."""

    raise ProvisioningError(LEGACY_ONLINE_DISABLED_MESSAGE)


@dataclass(frozen=True)
class DesiredClient:
    """A client representation limited to the fields this script owns."""

    kind: str
    client_id: str
    representation: dict[str, Any]


@dataclass(frozen=True)
class DesiredMapper:
    """A single client protocol mapper; it is never a user/tenant mutation."""

    client_id: str
    name: str
    representation: dict[str, Any]


def finding(severity: str, code: str, target: str, message: str) -> dict[str, str]:
    """Create a machine-readable validation finding without echoing profile values."""

    return {"severity": severity, "code": code, "target": target, "message": message}


def profile_value(profile: Mapping[str, Any], *path: str) -> Any:
    """Read a hand-edited JSON profile defensively, like Get-ProfileValue in onboarding."""

    current: Any = profile
    for segment in path:
        if not isinstance(current, Mapping):
            return None
        current = current.get(segment)
    return current


def is_string_list(value: Any) -> bool:
    return isinstance(value, list) and all(isinstance(item, str) for item in value)


def has_exact_members(values: Any, expected: Sequence[str]) -> bool:
    """Compare URI/origin lists as duplicate-free sets, not as unstable API order."""

    return (
        is_string_list(values)
        and len(values) == len(expected)
        and len(set(values)) == len(values)
        and set(values) == set(expected)
    )


def has_forbidden_secret_key(value: Any, path: str = "") -> str | None:
    """Reject secrets in a declarative profile so they cannot reach an artifact."""

    if isinstance(value, Mapping):
        for key, nested in value.items():
            key_text = str(key)
            lowered = key_text.lower()
            next_path = f"{path}.{key_text}" if path else key_text
            if any(marker in lowered for marker in ("secret", "password", "credential", "token")):
                return next_path
            nested_result = has_forbidden_secret_key(nested, next_path)
            if nested_result:
                return nested_result
    elif isinstance(value, list):
        for index, nested in enumerate(value):
            nested_result = has_forbidden_secret_key(nested, f"{path}[{index}]")
            if nested_result:
                return nested_result
    return None


def is_exact_public_keycloak_base_url(value: Any) -> bool:
    """The browser/JWT issuer base is public, HTTPS, and immutable by contract."""

    return value == PUBLIC_KEYCLOAK_BASE_URL


def is_exact_loopback_admin_base_url(value: Any) -> bool:
    """Admin credentials may only travel to the VPS-local Keycloak listener."""

    if value != ADMIN_KEYCLOAK_BASE_URL:
        return False
    parsed = urllib.parse.urlsplit(value)
    return (
        parsed.scheme == "http"
        and parsed.hostname == "127.0.0.1"
        and parsed.port == 8080
        and parsed.path == "/auth"
        and parsed.username is None
        and parsed.password is None
        and not parsed.query
        and not parsed.fragment
    )


def validate_profile(profile: Any) -> list[dict[str, str]]:
    """Validate all client safety invariants before Keycloak is contacted."""

    findings: list[dict[str, str]] = []
    if not isinstance(profile, Mapping):
        return [finding("Error", "Profile", "profile", "The JSON root must be an object.")]

    forbidden_key = has_forbidden_secret_key(profile)
    if forbidden_key:
        findings.append(
            finding(
                "Error",
                "SecretInProfile",
                forbidden_key,
                "Profiles must not contain credentials, secrets, passwords, or tokens.",
            )
        )

    if profile.get("version") != PROFILE_VERSION:
        findings.append(
            finding("Error", "ProfileVersion", "version", f"version must be '{PROFILE_VERSION}'.")
        )

    keycloak = profile.get("keycloak")
    if not isinstance(keycloak, Mapping):
        findings.append(finding("Error", "ProfileSection", "keycloak", "Missing keycloak object."))
    else:
        if "baseUrl" in keycloak:
            findings.append(
                finding(
                    "Error",
                    "AmbiguousKeycloakBaseUrl",
                    "keycloak.baseUrl",
                    "Use distinct keycloak.publicBaseUrl and loopback-only keycloak.adminBaseUrl; a single baseUrl is forbidden.",
                )
            )
        if not is_exact_public_keycloak_base_url(keycloak.get("publicBaseUrl")):
            findings.append(
                finding(
                    "Error",
                    "PublicKeycloakBaseUrl",
                    "keycloak.publicBaseUrl",
                    f"Must be exactly '{PUBLIC_KEYCLOAK_BASE_URL}' so the JWT issuer remains public HTTPS.",
                )
            )
        if not is_exact_loopback_admin_base_url(keycloak.get("adminBaseUrl")):
            findings.append(
                finding(
                    "Error",
                    "AdminKeycloakBaseUrl",
                    "keycloak.adminBaseUrl",
                    f"Must be exactly '{ADMIN_KEYCLOAK_BASE_URL}'; the public /auth/admin endpoint is forbidden.",
                )
            )
        for field_name in ("realm", "adminRealm", "adminClientId"):
            field_value = keycloak.get(field_name)
            if not isinstance(field_value, str) or not field_value.strip():
                findings.append(
                    finding("Error", "KeycloakConfig", f"keycloak.{field_name}", "A non-empty value is required.")
                )

    contract = profile.get("jwtContract")
    if not isinstance(contract, Mapping):
        findings.append(finding("Error", "ProfileSection", "jwtContract", "Missing pinned JWT contract object."))
    else:
        exact_contract_values = {
            "issuer": ISSUER,
            "tenantClaim": TENANT_CLAIM,
            "modulesClaim": MODULES_CLAIM,
            "audience": INSTANCE_API_CLIENT_ID,
            "browserAuthorizedParty": WEB_CLIENT_ID,
        }
        for field_name, expected in exact_contract_values.items():
            if contract.get(field_name) != expected:
                findings.append(
                    finding(
                        "Error",
                        "JwtContract",
                        f"jwtContract.{field_name}",
                        f"Must be exactly '{expected}'.",
                    )
                )
        if not has_exact_members(contract.get("allowedAlgorithms"), (SIGNING_ALGORITHM,)):
            findings.append(
                finding(
                    "Error",
                    "JwtContract",
                    "jwtContract.allowedAlgorithms",
                    "Must contain only 'RS256'. The provisioner verifies the realm signing default but never changes it.",
                )
            )
        if isinstance(keycloak, Mapping) and is_exact_public_keycloak_base_url(keycloak.get("publicBaseUrl")):
            expected_issuer = str(keycloak["publicBaseUrl"]) + "/realms/" + str(keycloak.get("realm", ""))
            if contract.get("issuer") != expected_issuer:
                findings.append(
                    finding(
                        "Error",
                        "IssuerBinding",
                        "keycloak.publicBaseUrl/keycloak.realm/jwtContract.issuer",
                        "The public issuer base must derive exactly to the pinned JWT issuer; the loopback admin target is intentionally not an issuer.",
                    )
                )

    if profile.get("publicOrigin") != PUBLIC_ORIGIN:
        findings.append(
            finding(
                "Error",
                "PublicOrigin",
                "publicOrigin",
                f"The public origin must be exactly '{PUBLIC_ORIGIN}' (no path, slash, wildcard, port, or alternate host).",
            )
        )

    clients = profile.get("clients")
    if not isinstance(clients, Mapping):
        findings.append(finding("Error", "ProfileSection", "clients", "Missing clients object."))
        return findings

    web = clients.get("web")
    if not isinstance(web, Mapping):
        findings.append(finding("Error", "ProfileSection", "clients.web", "Missing web client object."))
    else:
        if web.get("clientId") != WEB_CLIENT_ID:
            findings.append(
                finding("Error", "ClientId", "clients.web.clientId", f"Must be exactly '{WEB_CLIENT_ID}'.")
            )
        redirects = web.get("redirectUris")
        if not has_exact_members(redirects, WEB_CALLBACK_URIS):
            findings.append(
                finding(
                    "Error",
                    "RedirectUris",
                    "clients.web.redirectUris",
                    "Must contain only the two exact HTTPS /flow/auth/callback and /calc/auth/callback URLs on the canonical origin; wildcards are forbidden.",
                )
            )
        origins = web.get("webOrigins")
        if not has_exact_members(origins, (PUBLIC_ORIGIN,)):
            findings.append(
                finding(
                    "Error",
                    "WebOrigins",
                    "clients.web.webOrigins",
                    "Must contain only the exact canonical HTTPS origin; '*' and '+' are forbidden.",
                )
            )

    instance_api = clients.get("instanceApi")
    if not isinstance(instance_api, Mapping):
        findings.append(
            finding("Error", "ProfileSection", "clients.instanceApi", "Missing instanceApi client object.")
        )
    else:
        if instance_api.get("clientId") != INSTANCE_API_CLIENT_ID:
            findings.append(
                finding(
                    "Error",
                    "ClientId",
                    "clients.instanceApi.clientId",
                    f"Must be exactly '{INSTANCE_API_CLIENT_ID}'.",
                )
            )
        for browser_field in ("redirectUris", "webOrigins"):
            if browser_field in instance_api and instance_api[browser_field] not in ([], None):
                findings.append(
                    finding(
                        "Error",
                        "ConfidentialBrowserSurface",
                        f"clients.instanceApi.{browser_field}",
                        "The confidential service-account client must not have browser redirects or web origins.",
                    )
                )

    return findings


def desired_clients(profile: Mapping[str, Any]) -> list[DesiredClient]:
    """Build only the security-sensitive Keycloak ClientRepresentation fields we own."""

    web = profile["clients"]["web"]
    # PKCE S256 is required for the public authorization-code flow.  No client
    # secret is supplied or generated by this representation.
    web_representation: dict[str, Any] = {
        "clientId": WEB_CLIENT_ID,
        "protocol": "openid-connect",
        "enabled": True,
        "publicClient": True,
        "clientAuthenticatorType": "client-secret",
        "standardFlowEnabled": True,
        "implicitFlowEnabled": False,
        "directAccessGrantsEnabled": False,
        "serviceAccountsEnabled": False,
        "authorizationServicesEnabled": False,
        "bearerOnly": False,
        "consentRequired": False,
        "fullScopeAllowed": False,
        "redirectUris": list(web["redirectUris"]),
        "webOrigins": list(web["webOrigins"]),
        "attributes": {"pkce.code.challenge.method": "S256"},
    }

    # The service account starts deliberately unprivileged: role/scope grants,
    # tenant mapping, and the released platform-auth contract are separate gates.
    # Omitting ``secret`` lets Keycloak generate it; this script never requests it.
    instance_api_representation: dict[str, Any] = {
        "clientId": INSTANCE_API_CLIENT_ID,
        "protocol": "openid-connect",
        "enabled": True,
        "publicClient": False,
        "clientAuthenticatorType": "client-secret",
        "standardFlowEnabled": False,
        "implicitFlowEnabled": False,
        "directAccessGrantsEnabled": False,
        "serviceAccountsEnabled": True,
        "authorizationServicesEnabled": False,
        "bearerOnly": False,
        "consentRequired": False,
        "fullScopeAllowed": False,
        "redirectUris": [],
        "webOrigins": [],
        "attributes": {},
    }
    return [
        DesiredClient("public-browser", WEB_CLIENT_ID, web_representation),
        DesiredClient("confidential-service-account", INSTANCE_API_CLIENT_ID, instance_api_representation),
    ]


def desired_mappers(profile: Mapping[str, Any]) -> list[DesiredMapper]:
    """Return the three web-client mappers required by the pinned JWT contract.

    ``azp`` needs no custom mapper: Keycloak sets the authorized party to the
    OIDC client ID itself. The profile pins that fact to ``doormanufacturing-web``.
    The two user-attribute mappers only read attributes written by the separate,
    operator-gated tenant onboarding; this script never writes a user attribute.
    """

    contract = profile["jwtContract"]
    tenant_claim = str(contract["tenantClaim"])
    modules_claim = str(contract["modulesClaim"])
    audience = str(contract["audience"])
    return [
        DesiredMapper(
            WEB_CLIENT_ID,
            tenant_claim,
            {
                "name": tenant_claim,
                "protocol": "openid-connect",
                "protocolMapper": "oidc-usermodel-attribute-mapper",
                "config": {
                    "user.attribute": tenant_claim,
                    "claim.name": tenant_claim,
                    "jsonType.label": "String",
                    "id.token.claim": "true",
                    "access.token.claim": "true",
                    "userinfo.token.claim": "true",
                    "multivalued": "false",
                },
            },
        ),
        DesiredMapper(
            WEB_CLIENT_ID,
            modules_claim,
            {
                "name": modules_claim,
                "protocol": "openid-connect",
                "protocolMapper": "oidc-usermodel-attribute-mapper",
                "config": {
                    "user.attribute": modules_claim,
                    "claim.name": modules_claim,
                    "jsonType.label": "String",
                    "id.token.claim": "true",
                    "access.token.claim": "true",
                    "userinfo.token.claim": "true",
                    "multivalued": "true",
                    "aggregate.attrs": "true",
                },
            },
        ),
        DesiredMapper(
            WEB_CLIENT_ID,
            f"{audience}-audience",
            {
                "name": f"{audience}-audience",
                "protocol": "openid-connect",
                "protocolMapper": "oidc-audience-mapper",
                "config": {
                    "included.custom.audience": audience,
                    "access.token.claim": "true",
                    "id.token.claim": "false",
                },
            },
        ),
    ]


def normalize_bool(value: Any) -> bool | None:
    if isinstance(value, bool):
        return value
    if isinstance(value, str) and value.lower() in {"true", "false"}:
        return value.lower() == "true"
    return None


def client_drift(desired: DesiredClient, observed: Mapping[str, Any]) -> list[str]:
    """Return field names that differ, without copying arbitrary observed data.

    Keycloak may omit a ``false`` boolean from a representation even though the
    effective server default is false. The observer now uses a detailed client
    GET, but preserving this normalization prevents a version-specific omitted
    false from creating an endless apply/verify loop. A missing value can never
    satisfy an expected ``true`` setting.
    """

    differences: list[str] = []
    for key, expected in desired.representation.items():
        actual = observed.get(key)
        if isinstance(expected, bool):
            normalized = normalize_bool(actual)
            if normalized is None and expected is False:
                normalized = False
            if normalized is not expected:
                differences.append(key)
        elif isinstance(expected, list):
            if not has_exact_members(actual, expected):
                differences.append(key)
        elif isinstance(expected, Mapping):
            actual_attributes = actual if isinstance(actual, Mapping) else {}
            if any(str(actual_attributes.get(name)) != str(value) for name, value in expected.items()):
                differences.append(key)
        elif actual != expected:
            differences.append(key)
    return differences


def mapper_drift(desired: DesiredMapper, observed: Mapping[str, Any]) -> list[str]:
    """Compare only the mapper fields owned by this contract."""

    differences: list[str] = []
    for key in ("name", "protocol", "protocolMapper"):
        if observed.get(key) != desired.representation[key]:
            differences.append(key)
    current_config = observed.get("config") if isinstance(observed.get("config"), Mapping) else {}
    desired_config = desired.representation["config"]
    if any(str(current_config.get(key)) != str(value) for key, value in desired_config.items()):
        differences.append("config")
    return differences


def build_plan(
    desired: Sequence[DesiredClient],
    observed: Mapping[str, Mapping[str, Any]],
    mapper_desired: Sequence[DesiredMapper] = (),
    mapper_observed: Mapping[str, Mapping[str, Mapping[str, Any]]] | None = None,
) -> list[dict[str, Any]]:
    """Pure desired-vs-observed plan; this is the idempotency core."""

    plan: list[dict[str, Any]] = []
    for client in desired:
        current = observed.get(client.client_id)
        if current is None:
            plan.append(
                {
                    "step": "oidc-client",
                    "target": client.client_id,
                    "kind": client.kind,
                    "action": "Create",
                    "detail": "Client is absent. The confidential client secret is never requested or reported.",
                }
            )
            continue
        differences = client_drift(client, current)
        if differences:
            plan.append(
                {
                    "step": "oidc-client",
                    "target": client.client_id,
                    "kind": client.kind,
                    "action": "Update",
                    "detail": "Managed fields differ: " + ", ".join(differences) + ".",
                }
            )
        else:
            plan.append(
                {
                    "step": "oidc-client",
                    "target": client.client_id,
                    "kind": client.kind,
                    "action": "NoChange",
                    "detail": "All managed client fields already match the profile.",
                }
            )
    all_mappers = mapper_observed or {}
    for mapper in mapper_desired:
        client_mappers = all_mappers.get(mapper.client_id, {})
        current_mapper = client_mappers.get(mapper.name)
        if current_mapper is None:
            plan.append(
                {
                    "step": "protocol-mapper",
                    "target": f"{mapper.client_id}/{mapper.name}",
                    "kind": "jwt-contract",
                    "action": "Create",
                    "detail": "Protocol mapper is absent.",
                }
            )
            continue
        differences = mapper_drift(mapper, current_mapper)
        if differences:
            plan.append(
                {
                    "step": "protocol-mapper",
                    "target": f"{mapper.client_id}/{mapper.name}",
                    "kind": "jwt-contract",
                    "action": "Update",
                    "detail": "Managed mapper fields differ: " + ", ".join(differences) + ".",
                }
            )
        else:
            plan.append(
                {
                    "step": "protocol-mapper",
                    "target": f"{mapper.client_id}/{mapper.name}",
                    "kind": "jwt-contract",
                    "action": "NoChange",
                    "detail": "All managed mapper fields already match the JWT contract.",
                }
            )
    return plan


def plan_summary(plan: Sequence[Mapping[str, Any]]) -> dict[str, int]:
    create = sum(action["action"] == "Create" for action in plan)
    update = sum(action["action"] == "Update" for action in plan)
    no_change = sum(action["action"] == "NoChange" for action in plan)
    return {
        "create": create,
        "update": update,
        "noChange": no_change,
        "pendingCount": create + update,
        "total": len(plan),
    }


def redactable_desired_client(client: DesiredClient) -> dict[str, Any]:
    """The desired public shape is safe to include in reports; secrets are absent."""

    return {
        "kind": client.kind,
        "clientId": client.client_id,
        "redirectUris": client.representation["redirectUris"],
        "webOrigins": client.representation["webOrigins"],
        "settings": {
            key: client.representation[key]
            for key in (
                "publicClient",
                "standardFlowEnabled",
                "implicitFlowEnabled",
                "directAccessGrantsEnabled",
                "serviceAccountsEnabled",
                "authorizationServicesEnabled",
                "fullScopeAllowed",
            )
        },
    }


def redactable_desired_mapper(mapper: DesiredMapper) -> dict[str, Any]:
    """Mapper definitions are contract metadata and contain no credential material."""

    return {
        "clientId": mapper.client_id,
        "name": mapper.name,
        "protocolMapper": mapper.representation["protocolMapper"],
        "claimOrAudience": mapper.representation["config"].get(
            "claim.name", mapper.representation["config"].get("included.custom.audience")
        ),
    }


def endpoint(base_url: str, path: str) -> str:
    return base_url.rstrip("/") + path


def request_json(
    method: str,
    url: str,
    *,
    token: str | None = None,
    body: Mapping[str, Any] | None = None,
    form: Mapping[str, str] | None = None,
    timeout_seconds: int = 30,
) -> Any:
    """Call Keycloak without surfacing request/response bodies in an exception."""

    reject_legacy_online_path()

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
    try:
        with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
            payload = response.read()
    except urllib.error.HTTPError as error:
        raise KeycloakRequestError(f"Keycloak {method} request failed (HTTP {error.code}).") from None
    except urllib.error.URLError:
        raise KeycloakRequestError(f"Keycloak {method} request failed (network or TLS error).") from None
    if not payload:
        return None
    try:
        return json.loads(payload.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise KeycloakRequestError(f"Keycloak {method} request returned invalid JSON.") from None


def obtain_admin_token(profile: Mapping[str, Any], timeout_seconds: int) -> str:
    """Use environment-only admin credentials and retain only the access token in memory."""

    reject_legacy_online_path()

    # Existing platform automation uses KEYCLOAK_ADMIN_USER. The VPS Keycloak
    # unit already supplies KEYCLOAK_ADMIN, so accepting it as a fallback avoids
    # a shell-level copy/rename of the same secret-bearing environment.
    username = os.environ.get("KEYCLOAK_ADMIN_USER") or os.environ.get("KEYCLOAK_ADMIN")
    password = os.environ.get("KEYCLOAK_ADMIN_PASSWORD")
    if not username or not password:
        raise ProvisioningError(
            "Missing admin credentials: set KEYCLOAK_ADMIN_USER (or KEYCLOAK_ADMIN) and KEYCLOAK_ADMIN_PASSWORD in the process environment."
        )
    keycloak = profile["keycloak"]
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
        # Python cannot guarantee byte-level zeroisation of immutable strings, but
        # dropping the local reference prevents accidental later reporting/use.
        password = ""
    token = response.get("access_token") if isinstance(response, Mapping) else None
    if not isinstance(token, str) or not token:
        raise KeycloakRequestError("Keycloak admin authentication returned no access token.")
    return token


def admin_clients_url(profile: Mapping[str, Any], client_id: str | None = None) -> str:
    keycloak = profile["keycloak"]
    url = endpoint(
        str(keycloak["adminBaseUrl"]),
        "/admin/realms/" + urllib.parse.quote(str(keycloak["realm"]), safe="") + "/clients",
    )
    if client_id is not None:
        url += "?clientId=" + urllib.parse.quote(client_id, safe="")
    return url


def observe_clients(profile: Mapping[str, Any], token: str, timeout_seconds: int) -> dict[str, Mapping[str, Any]]:
    """Read detailed state for the two exact client IDs; duplicate IDs fail closed.

    ``GET /clients?clientId=`` is a brief/list representation and can omit
    false-valued security flags (notably ``authorizationServicesEnabled``).
    The list call is used only to discover the opaque internal ID; the plan is
    built from a subsequent ``GET /clients/{id}`` detailed representation.
    """

    observed: dict[str, Mapping[str, Any]] = {}
    for client_id in (WEB_CLIENT_ID, INSTANCE_API_CLIENT_ID):
        result = request_json(
            "GET", admin_clients_url(profile, client_id), token=token, timeout_seconds=timeout_seconds
        )
        if not isinstance(result, list):
            raise KeycloakRequestError("Keycloak client lookup returned an unexpected representation.")
        exact = [candidate for candidate in result if isinstance(candidate, Mapping) and candidate.get("clientId") == client_id]
        if len(exact) > 1:
            raise ProvisioningError(f"More than one Keycloak client has clientId '{client_id}'; refusing to guess.")
        if exact:
            keycloak_id = exact[0].get("id")
            if not isinstance(keycloak_id, str) or not keycloak_id:
                raise ProvisioningError(f"Keycloak client '{client_id}' has no internal id in the lookup response; refusing to guess.")
            detailed = request_json(
                "GET",
                admin_clients_url(profile) + "/" + urllib.parse.quote(keycloak_id, safe=""),
                token=token,
                timeout_seconds=timeout_seconds,
            )
            if not isinstance(detailed, Mapping) or detailed.get("clientId") != client_id:
                raise KeycloakRequestError("Keycloak detailed client lookup returned an unexpected representation.")
            observed[client_id] = detailed
    return observed


def observe_realm_signing_algorithm(profile: Mapping[str, Any], token: str, timeout_seconds: int) -> None:
    """Fail closed if the platform-owned realm is not already configured for RS256.

    The realm signing policy is intentionally outside this client-only tool's
    mutation surface.  Reading it before planning means an accidental HS/ES
    realm cannot be made to look production-ready by client configuration alone.
    """

    realm = urllib.parse.quote(str(profile["keycloak"]["realm"]), safe="")
    base_url = endpoint(str(profile["keycloak"]["adminBaseUrl"]), "/admin/realms/" + realm)
    result = request_json("GET", base_url, token=token, timeout_seconds=timeout_seconds)
    actual = result.get("defaultSignatureAlgorithm") if isinstance(result, Mapping) else None
    if actual != SIGNING_ALGORITHM:
        raise ProvisioningError(
            "Keycloak realm defaultSignatureAlgorithm is not RS256; this client-only provisioner will not mutate realm signing policy."
        )


def observe_mappers(
    profile: Mapping[str, Any],
    token: str,
    timeout_seconds: int,
    clients: Mapping[str, Mapping[str, Any]],
) -> dict[str, dict[str, Mapping[str, Any]]]:
    """Read protocol mappers for existing managed clients, rejecting duplicate names."""

    observed: dict[str, dict[str, Mapping[str, Any]]] = {}
    for client_id in (WEB_CLIENT_ID,):
        client = clients.get(client_id)
        keycloak_id = client.get("id") if isinstance(client, Mapping) else None
        if not isinstance(keycloak_id, str) or not keycloak_id:
            observed[client_id] = {}
            continue
        result = request_json(
            "GET",
            admin_clients_url(profile) + "/" + urllib.parse.quote(keycloak_id, safe="") + "/protocol-mappers/models",
            token=token,
            timeout_seconds=timeout_seconds,
        )
        if not isinstance(result, list):
            raise KeycloakRequestError("Keycloak protocol-mapper lookup returned an unexpected representation.")
        named: dict[str, Mapping[str, Any]] = {}
        for mapper in result:
            if not isinstance(mapper, Mapping) or not isinstance(mapper.get("name"), str):
                continue
            name = str(mapper["name"])
            if name in named:
                raise ProvisioningError(f"More than one protocol mapper is named '{client_id}/{name}'; refusing to guess.")
            named[name] = mapper
        observed[client_id] = named
    return observed


def apply_client_plan(
    profile: Mapping[str, Any],
    desired: Sequence[DesiredClient],
    observed: Mapping[str, Mapping[str, Any]],
    plan: Sequence[Mapping[str, Any]],
    token: str,
    timeout_seconds: int,
) -> None:
    """Apply only planned client mutations; no secret endpoint is ever called."""

    desired_by_id = {client.client_id: client for client in desired}
    for action in plan:
        if action["step"] != "oidc-client" or action["action"] == "NoChange":
            continue
        client_id = str(action["target"])
        desired_client = desired_by_id[client_id]
        if action["action"] == "Create":
            try:
                request_json(
                    "POST",
                    admin_clients_url(profile),
                    token=token,
                    body=desired_client.representation,
                    timeout_seconds=timeout_seconds,
                )
            except KeycloakRequestError as error:
                # A concurrent safe apply may have created the exact client.  Re-read
                # it rather than retrying blindly; any remaining drift is verified later.
                if "HTTP 409" not in str(error):
                    raise
        elif action["action"] == "Update":
            current = observed.get(client_id)
            keycloak_id = current.get("id") if isinstance(current, Mapping) else None
            if not isinstance(keycloak_id, str) or not keycloak_id:
                raise ProvisioningError(f"Keycloak client '{client_id}' has no internal id; refusing update.")
            request_json(
                "PUT",
                admin_clients_url(profile) + "/" + urllib.parse.quote(keycloak_id, safe=""),
                token=token,
                body=desired_client.representation,
                timeout_seconds=timeout_seconds,
            )


def apply_mapper_plan(
    profile: Mapping[str, Any],
    mapper_desired: Sequence[DesiredMapper],
    observed_clients: Mapping[str, Mapping[str, Any]],
    observed_mappers: Mapping[str, Mapping[str, Mapping[str, Any]]],
    plan: Sequence[Mapping[str, Any]],
    token: str,
    timeout_seconds: int,
) -> None:
    """Apply only planned protocol-mapper mutations after their web client exists."""

    desired_by_target = {f"{mapper.client_id}/{mapper.name}": mapper for mapper in mapper_desired}
    for action in plan:
        if action["step"] != "protocol-mapper" or action["action"] == "NoChange":
            continue
        target = str(action["target"])
        mapper = desired_by_target[target]
        client = observed_clients.get(mapper.client_id)
        keycloak_id = client.get("id") if isinstance(client, Mapping) else None
        if not isinstance(keycloak_id, str) or not keycloak_id:
            raise ProvisioningError(f"Keycloak client '{mapper.client_id}' has no internal id; refusing mapper mutation.")
        mapper_url = (
            admin_clients_url(profile)
            + "/"
            + urllib.parse.quote(keycloak_id, safe="")
            + "/protocol-mappers/models"
        )
        if action["action"] == "Create":
            request_json("POST", mapper_url, token=token, body=mapper.representation, timeout_seconds=timeout_seconds)
            continue
        existing = observed_mappers.get(mapper.client_id, {}).get(mapper.name)
        mapper_id = existing.get("id") if isinstance(existing, Mapping) else None
        if not isinstance(mapper_id, str) or not mapper_id:
            raise ProvisioningError(f"Keycloak protocol mapper '{target}' has no internal id; refusing update.")
        body = {"id": mapper_id, **mapper.representation}
        request_json(
            "PUT",
            mapper_url + "/" + urllib.parse.quote(mapper_id, safe=""),
            token=token,
            body=body,
            timeout_seconds=timeout_seconds,
        )


def safe_summary(
    *,
    mode: str,
    profile_path: Path,
    profile: Mapping[str, Any],
    findings: Sequence[Mapping[str, str]],
    desired: Sequence[DesiredClient] | None = None,
    mappers: Sequence[DesiredMapper] | None = None,
    plan: Sequence[Mapping[str, Any]] | None = None,
    verified: bool | None = None,
    error: str | None = None,
) -> dict[str, Any]:
    summary: dict[str, Any] = {
        "script": "provision_doormanufacturing_keycloak_clients.py",
        "task": "AUTH-DOORSTAR-ONBOARDING-client-provisioning",
        "mode": mode,
        "profilePath": str(profile_path),
        "realm": profile_value(profile, "keycloak", "realm"),
        "jwtContract": profile_value(profile, "jwtContract"),
        "publicOrigin": PUBLIC_ORIGIN,
        "validation": list(findings),
    }
    if desired is not None:
        summary["desiredClients"] = [redactable_desired_client(client) for client in desired]
    if mappers is not None:
        summary["desiredMappers"] = [redactable_desired_mapper(mapper) for mapper in mappers]
    if plan is not None:
        summary["plan"] = list(plan)
        summary["planSummary"] = plan_summary(plan)
        summary["pendingCount"] = plan_summary(plan)["pendingCount"]
    if verified is not None:
        summary["verified"] = verified
    if error is not None:
        summary["error"] = error
    return summary


def write_summary(summary: Mapping[str, Any], summary_path: str | None) -> None:
    text = json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True)
    print(text)
    if summary_path:
        target = Path(summary_path)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text + "\n", encoding="utf-8")


def retired_summary(
    profile_path: Path,
    profile: Mapping[str, Any],
    findings: Sequence[Mapping[str, str]],
    *,
    error: str | None = None,
) -> dict[str, Any]:
    """Emit non-runnable historical evidence without the obsolete mapper shape."""

    result: dict[str, Any] = {
        "schemaVersion": "doormanufacturing-keycloak-clients-retired-summary/v1",
        "script": "provision_doormanufacturing_keycloak_clients.py",
        "mode": "Error" if error is not None else "HistoricalOffline",
        "profilePath": str(profile_path),
        "profileDigest": hashlib.sha256(
            json.dumps(profile, separators=(",", ":"), sort_keys=True).encode("utf-8")
        ).hexdigest() if profile else None,
        "validation": list(findings),
        "historicalValidationOnly": True,
        "runnablePlanEmitted": False,
        "activationEvidence": False,
        "mutationSafetyEvidence": False,
    }
    if error is not None:
        result["error"] = error
    return result


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile", required=True, help="JSON profile; it must contain no secret.")
    parser.add_argument("--apply", action="store_true", help="Retired mutation mode; always rejected.")
    parser.add_argument("--offline", action="store_true", help="Historical local profile validation only.")
    parser.add_argument("--verify-only", action="store_true", help="Retired live verification mode; always rejected.")
    parser.add_argument("--summary-path", help="Optional safe JSON evidence file (contains no credentials or client secret).")
    parser.add_argument("--timeout-seconds", type=int, default=30, help="Per-request timeout; default 30 seconds.")
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv if argv is not None else sys.argv[1:])
    profile_path = Path(args.profile)
    profile: Mapping[str, Any] = {}
    findings: list[dict[str, str]] = []
    try:
        if not args.offline or args.apply or args.verify_only:
            raise ProvisioningError(LEGACY_ONLINE_DISABLED_MESSAGE)
        if args.timeout_seconds <= 0:
            raise ProvisioningError("--timeout-seconds must be positive.")
        try:
            profile = json.loads(profile_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            raise ProvisioningError("The profile could not be read as UTF-8 JSON.") from None

        findings = validate_profile(profile)
        if any(item["severity"] == "Error" for item in findings):
            raise ProvisioningError("Profile validation failed; no Keycloak call was made.")
        write_summary(retired_summary(profile_path, profile, findings), args.summary_path)
        return EXIT_CONVERGED
    except ProvisioningError as error:
        summary = retired_summary(profile_path, profile, findings, error=str(error))
        try:
            write_summary(summary, args.summary_path)
        except OSError:
            # The primary JSON output must remain safe even if an optional artifact path fails.
            print(json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True))
        return EXIT_ERROR


if __name__ == "__main__":
    raise SystemExit(main())
