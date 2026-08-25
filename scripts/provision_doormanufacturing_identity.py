#!/usr/bin/env python3
"""Historical validation for the retired Door Manufacturing identity profile.

This former VPS operator tool modeled Keycloak realm roles and one human
identity. Its pure validators are retained for historical profiles; there is no
reachable Keycloak Admin or invitation execution path.

The profile contains obsolete ``tid``/``enabled_modules`` attributes and
realm-role authority. Only explicit ``--offline`` historical validation is
reachable. Default, live, ``--verify-only``, ``--apply`` and ``--send-invite``
modes fail before profile, credential or network access and emit no runnable
role/user/invitation plan.

The script remains colocated with
``provision_doormanufacturing_keycloak_clients.py`` only for historical parsing.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import Any

import provision_doormanufacturing_keycloak_clients as keycloak


EXIT_CONVERGED = 0
EXIT_PENDING = 1
EXIT_ERROR = 2

PROFILE_VERSION = "doormanufacturing-identity-onboarding/v1"
WEB_CLIENT_ID = "doormanufacturing-web"
PUBLIC_ORIGIN = "https://doormanufacturing.joinerytech.hu"
DEFAULT_INVITE_REDIRECT_URI = f"{PUBLIC_ORIGIN}/flow/auth/callback"
REQUIRED_ACTIONS = ("VERIFY_EMAIL", "UPDATE_PASSWORD")
LEGACY_IDENTITY_ONLINE_DISABLED_MESSAGE = (
    "This legacy flat/realm-role identity provisioner is retired; only explicit "
    "--offline historical validation is allowed."
)
ROLE_PATTERN = re.compile(r"^[a-z][a-z0-9._-]{2,127}$")
MODULE_PATTERN = re.compile(r"^[a-z][a-z0-9._-]{2,127}$")
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class IdentityProvisioningError(keycloak.ProvisioningError):
    """A safe-to-report identity-provisioning error."""


def reject_legacy_identity_online_path() -> None:
    """Make direct invitation/array-transport helpers fail before side effects."""

    raise IdentityProvisioningError(LEGACY_IDENTITY_ONLINE_DISABLED_MESSAGE)


def finding(severity: str, code: str, target: str, message: str) -> dict[str, str]:
    """Return an evidence item without putting user data into operator output."""

    return {"severity": severity, "code": code, "target": target, "message": message}


def profile_value(profile: Mapping[str, Any], *path: str) -> Any:
    """Read a nested JSON property without accepting a malformed intermediate value."""

    current: Any = profile
    for segment in path:
        if not isinstance(current, Mapping):
            return None
        current = current.get(segment)
    return current


def is_unique_string_list(value: Any) -> bool:
    """Accept a nonempty, duplicate-free list of nonblank strings."""

    return (
        isinstance(value, list)
        and bool(value)
        and all(isinstance(item, str) and item.strip() for item in value)
        and len({item.strip() for item in value}) == len(value)
    )


def validate_profile(profile: Any) -> list[dict[str, str]]:
    """Validate the non-secret identity declaration before contacting Keycloak."""

    if not isinstance(profile, Mapping):
        return [finding("Error", "Profile", "profile", "The JSON root must be an object.")]

    findings: list[dict[str, str]] = []
    forbidden_key = keycloak.has_forbidden_secret_key(profile)
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
        findings.append(finding("Error", "ProfileVersion", "version", "Unexpected onboarding profile version."))

    profile_keycloak = profile.get("keycloak")
    if not isinstance(profile_keycloak, Mapping):
        findings.append(finding("Error", "ProfileSection", "keycloak", "Missing Keycloak configuration."))
    else:
        expected = {
            "publicBaseUrl": "https://joinerytech.hu/auth",
            "adminBaseUrl": "http://127.0.0.1:8080/auth",
            "realm": "spaceos",
            "adminRealm": "master",
            "adminClientId": "admin-cli",
        }
        for key, expected_value in expected.items():
            if profile_keycloak.get(key) != expected_value:
                findings.append(
                    finding("Error", "KeycloakContract", f"keycloak.{key}", "Does not match the released contract.")
                )

    tenant = profile.get("tenant")
    if not isinstance(tenant, Mapping):
        findings.append(finding("Error", "ProfileSection", "tenant", "Missing tenant declaration."))
    else:
        tenant_id = tenant.get("id")
        try:
            uuid.UUID(str(tenant_id))
        except (TypeError, ValueError, AttributeError):
            findings.append(finding("Error", "TenantId", "tenant.id", "A UUID tenant ID is required."))
        if not isinstance(tenant.get("name"), str) or not tenant["name"].strip() or len(tenant["name"].strip()) > 100:
            findings.append(finding("Error", "TenantName", "tenant.name", "A 1..100 character tenant name is required."))
        if tenant.get("tenantType") != "Manufacturer":
            findings.append(finding("Error", "TenantType", "tenant.tenantType", "Only the approved Manufacturer profile is accepted."))
        modules = tenant.get("jwtModules")
        if not is_unique_string_list(modules) or any(not MODULE_PATTERN.fullmatch(item.strip()) for item in modules or []):
            findings.append(finding("Error", "JwtModules", "tenant.jwtModules", "A unique canonical module list is required."))

    user = profile.get("user")
    if not isinstance(user, Mapping):
        findings.append(finding("Error", "ProfileSection", "user", "Missing initial-admin declaration."))
    else:
        username = user.get("username")
        email = user.get("email")
        if not isinstance(username, str) or not EMAIL_PATTERN.fullmatch(username.strip()):
            findings.append(finding("Error", "Username", "user.username", "The username must be an email address."))
        if not isinstance(email, str) or not EMAIL_PATTERN.fullmatch(email.strip()):
            findings.append(finding("Error", "Email", "user.email", "A valid email is required."))
        if isinstance(username, str) and isinstance(email, str) and username.strip().casefold() != email.strip().casefold():
            findings.append(finding("Error", "EmailIdentity", "user", "Username and email must be identical for this invitation flow."))
        for field in ("firstName", "lastName"):
            value = user.get(field)
            if not isinstance(value, str) or not value.strip() or len(value.strip()) > 100:
                findings.append(finding("Error", "Name", f"user.{field}", "A 1..100 character name is required."))
        roles = user.get("realmRoles")
        if not is_unique_string_list(roles) or any(not ROLE_PATTERN.fullmatch(item.strip()) for item in roles or []):
            findings.append(finding("Error", "RealmRoles", "user.realmRoles", "A unique scoped role list is required."))

    invite = profile.get("invite")
    if not isinstance(invite, Mapping):
        findings.append(finding("Error", "ProfileSection", "invite", "Missing invitation policy."))
    else:
        if invite.get("clientId") != WEB_CLIENT_ID:
            findings.append(finding("Error", "InviteClient", "invite.clientId", "The public browser client must be used for activation."))
        if invite.get("redirectUri") != DEFAULT_INVITE_REDIRECT_URI:
            findings.append(finding("Error", "InviteRedirect", "invite.redirectUri", "The activation redirect is not canonical."))
        lifespan = invite.get("lifespanSeconds")
        if not isinstance(lifespan, int) or not 300 <= lifespan <= 86_400:
            findings.append(finding("Error", "InviteLifespan", "invite.lifespanSeconds", "Invitation lifetime must be 5 minutes to 24 hours."))

    return findings


def admin_base(profile: Mapping[str, Any]) -> str:
    """Return the configured realm admin base; no request input influences it."""

    return keycloak.endpoint(
        str(profile_value(profile, "keycloak", "adminBaseUrl")),
        "/admin/realms/" + urllib.parse.quote(str(profile_value(profile, "keycloak", "realm")), safe=""),
    )


def user_key(profile: Mapping[str, Any]) -> str:
    """Use a one-way correlation in evidence instead of emitting the email address."""

    username = str(profile_value(profile, "user", "username")).strip().casefold()
    return hashlib.sha256(username.encode("utf-8")).hexdigest()[:16]


def get_exact_user(profile: Mapping[str, Any], token: str, timeout_seconds: int) -> Mapping[str, Any] | None:
    """Find exactly one same-name user or fail closed on an ambiguous response."""

    username = str(profile_value(profile, "user", "username")).strip()
    url = admin_base(profile) + "/users?username=" + urllib.parse.quote(username, safe="") + "&exact=true"
    response = keycloak.request_json("GET", url, token=token, timeout_seconds=timeout_seconds)
    if not isinstance(response, list):
        raise IdentityProvisioningError("Keycloak user lookup returned an unexpected representation.")
    exact = [item for item in response if isinstance(item, Mapping) and item.get("username") == username]
    if len(exact) > 1:
        raise IdentityProvisioningError("Multiple exact Keycloak users matched the configured username.")
    if not exact:
        return None
    user_id = exact[0].get("id")
    if not isinstance(user_id, str) or not user_id:
        raise IdentityProvisioningError("The existing Keycloak user has no stable identifier.")
    detail = keycloak.request_json(
        "GET", admin_base(profile) + "/users/" + urllib.parse.quote(user_id, safe=""), token=token, timeout_seconds=timeout_seconds
    )
    if not isinstance(detail, Mapping):
        raise IdentityProvisioningError("Keycloak user detail returned an unexpected representation.")
    return detail


def get_realm_roles(profile: Mapping[str, Any], token: str, timeout_seconds: int) -> dict[str, Mapping[str, Any]]:
    """Read only roles needed for a bounded desired-vs-observed plan."""

    response = keycloak.request_json(
        "GET", admin_base(profile) + "/roles?briefRepresentation=true&max=1000", token=token, timeout_seconds=timeout_seconds
    )
    if not isinstance(response, list):
        raise IdentityProvisioningError("Keycloak realm roles returned an unexpected representation.")
    observed: dict[str, Mapping[str, Any]] = {}
    for item in response:
        if isinstance(item, Mapping) and isinstance(item.get("name"), str):
            observed[str(item["name"])] = item
    return observed


def get_web_client(profile: Mapping[str, Any], token: str, timeout_seconds: int) -> Mapping[str, Any]:
    """Ensure client provisioning occurred before an account is invited to it."""

    url = admin_base(profile) + "/clients?clientId=" + urllib.parse.quote(WEB_CLIENT_ID, safe="")
    response = keycloak.request_json("GET", url, token=token, timeout_seconds=timeout_seconds)
    if not isinstance(response, list):
        raise IdentityProvisioningError("Keycloak client lookup returned an unexpected representation.")
    exact = [item for item in response if isinstance(item, Mapping) and item.get("clientId") == WEB_CLIENT_ID]
    if len(exact) != 1:
        raise IdentityProvisioningError("The required public browser client is not uniquely provisioned.")
    return exact[0]


def get_client_realm_scope_names(profile: Mapping[str, Any], token: str, client: Mapping[str, Any], timeout_seconds: int) -> set[str]:
    """Read the browser client's explicit realm-role scope allowlist."""

    client_id = client.get("id")
    if not isinstance(client_id, str) or not client_id:
        raise IdentityProvisioningError("The public browser client has no stable identifier.")
    response = keycloak.request_json(
        "GET",
        admin_base(profile) + "/clients/" + urllib.parse.quote(client_id, safe="") + "/scope-mappings/realm",
        token=token,
        timeout_seconds=timeout_seconds,
    )
    if not isinstance(response, list):
        raise IdentityProvisioningError("Keycloak client role scope returned an unexpected representation.")
    return {str(item["name"]) for item in response if isinstance(item, Mapping) and isinstance(item.get("name"), str)}


def desired_user_body(profile: Mapping[str, Any], existing: Mapping[str, Any] | None) -> dict[str, Any]:
    """Build a minimally-mutating Keycloak user representation."""

    existing_attributes = existing.get("attributes") if isinstance(existing, Mapping) else None
    attributes: dict[str, list[str]] = {}
    if isinstance(existing_attributes, Mapping):
        for name, values in existing_attributes.items():
            if isinstance(name, str) and isinstance(values, list) and all(isinstance(item, str) for item in values):
                attributes[name] = list(values)
    attributes["tid"] = [str(profile_value(profile, "tenant", "id"))]
    attributes["enabled_modules"] = [str(item) for item in profile_value(profile, "tenant", "jwtModules")]

    existing_actions = existing.get("requiredActions") if isinstance(existing, Mapping) else None
    actions = [str(item) for item in existing_actions] if isinstance(existing_actions, list) and all(isinstance(item, str) for item in existing_actions) else []
    for required in REQUIRED_ACTIONS:
        if required not in actions:
            actions.append(required)

    return {
        "username": str(profile_value(profile, "user", "username")).strip(),
        "email": str(profile_value(profile, "user", "email")).strip(),
        "firstName": str(profile_value(profile, "user", "firstName")).strip(),
        "lastName": str(profile_value(profile, "user", "lastName")).strip(),
        "enabled": True,
        "emailVerified": bool(existing and existing.get("emailVerified") is True),
        "attributes": attributes,
        "requiredActions": actions,
    }


def user_needs_update(existing: Mapping[str, Any], desired: Mapping[str, Any]) -> bool:
    """Compare only fields owned by this tool; never reset an existing verification."""

    if str(existing.get("email", "")).casefold() != str(desired["email"]).casefold():
        raise IdentityProvisioningError("The existing username belongs to a different email address.")
    for field in ("firstName", "lastName", "enabled"):
        if existing.get(field) != desired[field]:
            return True
    existing_attributes = existing.get("attributes")
    if not isinstance(existing_attributes, Mapping):
        return True
    for name in ("tid", "enabled_modules"):
        if existing_attributes.get(name) != desired["attributes"][name]:
            return True
    existing_actions = existing.get("requiredActions")
    existing_action_set = {str(item) for item in existing_actions} if isinstance(existing_actions, list) else set()
    return not set(REQUIRED_ACTIONS).issubset(existing_action_set)


def get_user_role_names(profile: Mapping[str, Any], token: str, user_id: str, timeout_seconds: int) -> set[str]:
    """Read current realm role assignments without using client roles as a fallback."""

    response = keycloak.request_json(
        "GET",
        admin_base(profile) + "/users/" + urllib.parse.quote(user_id, safe="") + "/role-mappings/realm",
        token=token,
        timeout_seconds=timeout_seconds,
    )
    if not isinstance(response, list):
        raise IdentityProvisioningError("Keycloak role mapping returned an unexpected representation.")
    return {str(item["name"]) for item in response if isinstance(item, Mapping) and isinstance(item.get("name"), str)}


def build_plan(
    profile: Mapping[str, Any],
    existing_user: Mapping[str, Any] | None,
    roles: Mapping[str, Mapping[str, Any]],
    user_roles: set[str] | None,
    client_role_scope: set[str] | None,
) -> list[dict[str, str]]:
    """Render the bounded mutation plan without exposing names or email addresses."""

    plan: list[dict[str, str]] = []
    desired_roles = [str(item).strip() for item in profile_value(profile, "user", "realmRoles")]
    for role in desired_roles:
        plan.append({
            "step": "realm-role",
            "target": role,
            "action": "NoChange" if role in roles else "Create",
            "detail": "Tenant-scoped role required by the released Door Manufacturing contract.",
        })
    for role in desired_roles:
        if role not in (client_role_scope or set()):
            plan.append({
                "step": "browser-client-role-scope",
                "target": role,
                "action": "Create",
                "detail": "Explicit scope is required because fullScopeAllowed is disabled.",
            })
    if existing_user is None:
        plan.append({"step": "initial-admin", "target": user_key(profile), "action": "Create", "detail": "A passwordless, activation-required identity will be created."})
    else:
        desired = desired_user_body(profile, existing_user)
        plan.append({
            "step": "initial-admin",
            "target": user_key(profile),
            "action": "Update" if user_needs_update(existing_user, desired) else "NoChange",
            "detail": "Only profile, tenant and required-action fields owned by this tool are compared.",
        })
        missing = set(desired_roles) - (user_roles or set())
        for role in sorted(missing):
            plan.append({"step": "realm-role-mapping", "target": role, "action": "Create", "detail": "Maps the scoped role to the initial admin."})
    return plan


def create_or_update_user(profile: Mapping[str, Any], token: str, existing: Mapping[str, Any] | None, timeout_seconds: int) -> Mapping[str, Any]:
    """Create the owner account or converge only fields this tool owns."""

    desired = desired_user_body(profile, existing)
    if existing is None:
        keycloak.request_json("POST", admin_base(profile) + "/users", token=token, body=desired, timeout_seconds=timeout_seconds)
        created = get_exact_user(profile, token, timeout_seconds)
        if created is None:
            raise IdentityProvisioningError("Keycloak created the identity but it could not be read back.")
        return created
    if user_needs_update(existing, desired):
        user_id = existing.get("id")
        if not isinstance(user_id, str) or not user_id:
            raise IdentityProvisioningError("The existing Keycloak user has no stable identifier.")
        keycloak.request_json(
            "PUT", admin_base(profile) + "/users/" + urllib.parse.quote(user_id, safe=""), token=token, body=desired, timeout_seconds=timeout_seconds
        )
    return existing


def assign_missing_roles(profile: Mapping[str, Any], token: str, user: Mapping[str, Any], roles: Mapping[str, Mapping[str, Any]], timeout_seconds: int) -> None:
    """Add only scoped roles missing from the user; no role is removed."""

    user_id = user.get("id")
    if not isinstance(user_id, str) or not user_id:
        raise IdentityProvisioningError("The Keycloak user has no stable identifier.")
    existing = get_user_role_names(profile, token, user_id, timeout_seconds)
    missing = [str(name).strip() for name in profile_value(profile, "user", "realmRoles") if str(name).strip() not in existing]
    if not missing:
        return
    role_bodies = []
    for name in missing:
        role = roles.get(name)
        if not isinstance(role, Mapping) or not isinstance(role.get("id"), str):
            raise IdentityProvisioningError("A required realm role is unavailable after provisioning.")
        role_bodies.append({"id": role["id"], "name": name})
    # Keycloak requires an array for realm role mappings; the shared transport
    # intentionally accepts mapping bodies only, so use the same safe error
    # reduction locally for this one array endpoint.
    request_json_array(
        "POST",
        admin_base(profile) + "/users/" + urllib.parse.quote(user_id, safe="") + "/role-mappings/realm",
        token,
        role_bodies,
        timeout_seconds,
    )


def assign_missing_client_role_scopes(
    profile: Mapping[str, Any], token: str, client: Mapping[str, Any], roles: Mapping[str, Mapping[str, Any]], timeout_seconds: int
) -> None:
    """Allow only the two declared tenant-scoped roles into browser access tokens."""

    client_id = client.get("id")
    if not isinstance(client_id, str) or not client_id:
        raise IdentityProvisioningError("The public browser client has no stable identifier.")
    existing = get_client_realm_scope_names(profile, token, client, timeout_seconds)
    missing = [str(name).strip() for name in profile_value(profile, "user", "realmRoles") if str(name).strip() not in existing]
    if not missing:
        return
    bodies = []
    for name in missing:
        role = roles.get(name)
        if not isinstance(role, Mapping) or not isinstance(role.get("id"), str):
            raise IdentityProvisioningError("A required realm role is unavailable for browser scope mapping.")
        bodies.append({"id": role["id"], "name": name})
    request_json_array(
        "POST",
        admin_base(profile) + "/clients/" + urllib.parse.quote(client_id, safe="") + "/scope-mappings/realm",
        token,
        bodies,
        timeout_seconds,
    )


def request_json_array(method: str, url: str, token: str, body: list[Mapping[str, str]], timeout_seconds: int) -> None:
    """Call the only Keycloak array-body endpoint without retaining response content."""

    reject_legacy_identity_online_path()

    request = urllib.request.Request(
        url,
        data=json.dumps(body, separators=(",", ":")).encode("utf-8"),
        headers={"Accept": "application/json", "Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method=method,
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout_seconds):
            return
    except urllib.error.HTTPError as error:
        raise IdentityProvisioningError(f"Keycloak {method} role mapping failed (HTTP {error.code}).") from None
    except urllib.error.URLError:
        raise IdentityProvisioningError(f"Keycloak {method} role mapping failed (network or TLS error).") from None


def send_actions_email(profile: Mapping[str, Any], token: str, user: Mapping[str, Any], timeout_seconds: int) -> None:
    """Send the action array with an endpoint-specific body, without an email echo."""

    reject_legacy_identity_online_path()

    assert_smtp_ready(profile, token, timeout_seconds)
    user_id = user.get("id")
    if not isinstance(user_id, str) or not user_id:
        raise IdentityProvisioningError("The Keycloak user has no stable identifier.")
    invite = profile_value(profile, "invite")
    query = urllib.parse.urlencode({
        "client_id": str(invite["clientId"]),
        "redirect_uri": str(invite["redirectUri"]),
        "lifespan": str(invite["lifespanSeconds"]),
    })
    url = admin_base(profile) + "/users/" + urllib.parse.quote(user_id, safe="") + "/execute-actions-email?" + query
    request = urllib.request.Request(
        url,
        data=json.dumps(list(REQUIRED_ACTIONS), separators=(",", ":")).encode("utf-8"),
        headers={"Accept": "application/json", "Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="PUT",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout_seconds):
            return
    except urllib.error.HTTPError as error:
        raise IdentityProvisioningError(f"Keycloak action-email request failed (HTTP {error.code}).") from None
    except urllib.error.URLError:
        raise IdentityProvisioningError("Keycloak action-email request failed (network or TLS error).") from None


def assert_smtp_ready(profile: Mapping[str, Any], token: str, timeout_seconds: int) -> None:
    """Fail before an invitation attempt when the realm has no usable sender."""

    realm = keycloak.request_json("GET", admin_base(profile), token=token, timeout_seconds=timeout_seconds)
    smtp = realm.get("smtpServer") if isinstance(realm, Mapping) else None
    if not isinstance(smtp, Mapping):
        raise IdentityProvisioningError("Keycloak SMTP is not configured; invitation email was not attempted.")
    host = smtp.get("host")
    sender = smtp.get("from")
    if not isinstance(host, str) or not host.strip() or not isinstance(sender, str) or not EMAIL_PATTERN.fullmatch(sender.strip()):
        raise IdentityProvisioningError("Keycloak SMTP is incomplete; invitation email was not attempted.")


def safe_summary(mode: str, profile_path: Path, findings: list[dict[str, str]], plan: list[dict[str, str]], sent_invite: bool) -> dict[str, Any]:
    """Emit redacted operator evidence suitable for a root-only log."""

    pending = sum(1 for item in plan if item["action"] != "NoChange")
    return {
        "script": "provision_doormanufacturing_identity.py",
        "task": "AUTH-DOORSTAR-ONBOARDING-initial-identity",
        "mode": mode,
        "profilePath": str(profile_path),
        "realm": "spaceos",
        "tenantConfigured": True,
        "initialAdminKey": "redacted",
        "validation": findings,
        "plan": plan,
        "pendingCount": pending,
        "invitationSent": sent_invite,
    }


def write_summary(summary: Mapping[str, Any], summary_path: str | None) -> None:
    """Write redacted evidence only when the caller explicitly selects a path."""

    payload = json.dumps(summary, indent=2, sort_keys=True) + "\n"
    print(payload, end="")
    if summary_path:
        Path(summary_path).write_text(payload, encoding="utf-8")


def retired_summary(
    profile_path: Path,
    profile: Mapping[str, Any],
    findings: Sequence[Mapping[str, str]],
    *,
    error: str | None = None,
) -> dict[str, Any]:
    """Emit redacted historical evidence without runnable identity actions."""

    result: dict[str, Any] = {
        "schemaVersion": "doormanufacturing-identity-retired-summary/v1",
        "script": "provision_doormanufacturing_identity.py",
        "mode": "Error" if error is not None else "HistoricalOffline",
        "profilePath": str(profile_path),
        "profileDigest": hashlib.sha256(
            json.dumps(profile, separators=(",", ":"), sort_keys=True).encode("utf-8")
        ).hexdigest() if profile else None,
        "validation": list(findings),
        "historicalValidationOnly": True,
        "runnablePlanEmitted": False,
        "invitationSent": False,
        "activationEvidence": False,
        "mutationSafetyEvidence": False,
    }
    if error is not None:
        result["error"] = error
    return result


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    """Parse mutually-exclusive safety modes."""

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile", required=True, help="Non-secret JSON identity profile.")
    parser.add_argument("--offline", action="store_true", help="Historical local profile validation only.")
    parser.add_argument("--verify-only", action="store_true", help="Retired live verification mode; always rejected.")
    parser.add_argument("--apply", action="store_true", help="Retired mutation mode; always rejected.")
    parser.add_argument("--send-invite", action="store_true", help="Retired invitation mode; always rejected.")
    parser.add_argument("--summary-path", help="Optional redacted JSON evidence output.")
    parser.add_argument("--timeout-seconds", type=int, default=30)
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    """Run the selected safe mode and return a deterministic status code."""

    args = parse_args(argv if argv is not None else sys.argv[1:])
    profile_path = Path(args.profile)
    findings: list[dict[str, str]] = []
    profile: Mapping[str, Any] = {}
    try:
        if not args.offline or args.verify_only or args.apply or args.send_invite:
            raise IdentityProvisioningError(LEGACY_IDENTITY_ONLINE_DISABLED_MESSAGE)
        if args.timeout_seconds <= 0:
            raise IdentityProvisioningError("--timeout-seconds must be positive.")
        try:
            profile = json.loads(profile_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            raise IdentityProvisioningError("The profile could not be read as UTF-8 JSON.") from None
        findings = validate_profile(profile)
        if any(item["severity"] == "Error" for item in findings):
            raise IdentityProvisioningError("Profile validation failed; no Keycloak call was made.")
        write_summary(retired_summary(profile_path, profile, findings), args.summary_path)
        return EXIT_CONVERGED
    except (IdentityProvisioningError, keycloak.ProvisioningError, keycloak.KeycloakRequestError) as error:
        summary = retired_summary(profile_path, profile, findings, error=str(error))
        write_summary(summary, args.summary_path)
        return EXIT_ERROR


if __name__ == "__main__":
    raise SystemExit(main())
