#!/usr/bin/env python3
"""Converge the native SpaceOS Keycloak authority projection.

The tool models a dedicated client scope per human consumer, a selected
one-product tenant projection and the Office-to-Plant service-principal
registry.  There is no implicit mode:
``--offline``, ``--verify-only`` or ``--apply`` must be selected explicitly.
``--apply`` is intentionally fail-closed until the Keycloak Admin API mutation
path has an authoritative compare-and-swap/adoption contract and complete
reverse-binding inventory. ``--offline`` validates and renders the desired
operation contract without credentials or network access; ``--verify-only``
performs read-only drift discovery.

The profile is intentionally non-secret.  Client keys are never accepted,
read from Keycloak, printed, or written to an artifact by this tool.
"""

from __future__ import annotations

import argparse
import base64
import binascii
import hashlib
import hmac
import json
import re
import sys
import time
import urllib.parse
import uuid
from collections.abc import Mapping, Sequence
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import keycloak_provisioning_transport as keycloak


EXIT_CONVERGED = 0
EXIT_PENDING = 1
EXIT_ERROR = 2

PROFILE_VERSION = "spaceos-keycloak-authority-projection/v1"
PUBLIC_BASE_URL = "https://joinerytech.hu/auth"
ADMIN_BASE_URL = "http://127.0.0.1:8080/auth"
REALM = "spaceos"
AUTHORITY_SCOPE_NAME = "spaceos-tenant-authority-v1"
OFFICE_TO_PLANT_CLIENT_ID = "joinerytech-office-to-plant"
PLANT_API_AUDIENCE = "joinerytech-plant-api"
HUMAN_PROJECTION_ATTRIBUTE_PREFIX = "spaceos_tenants__"
PKCE_CLIENT_ATTRIBUTE = "pkce.code.challenge.method"
JSON_SAFE_INTEGER = 9_007_199_254_740_991
RESERVED_CONSUMER_CLIENT_IDS = {
    "account",
    "account-console",
    "admin-cli",
    "broker",
    "realm-management",
    "security-admin-console",
    OFFICE_TO_PLANT_CLIENT_ID,
}
SOURCE_PINNED_CONSUMER_BROWSER_POSTURES: dict[str, Mapping[str, Any]] = {
    "doormanufacturing-web": {
        "enabled": True,
        "redirectUris": [
            "https://doormanufacturing.joinerytech.hu/calc/auth/callback",
            "https://doormanufacturing.joinerytech.hu/flow/auth/callback",
        ],
        "webOrigins": ["https://doormanufacturing.joinerytech.hu"],
    },
    # Plant has no tracked browser callback/BFF contract yet.  Keeping the
    # client disabled is part of the source-pinned activation boundary.
    "joinerytech-plant-web": {
        "enabled": False,
        "redirectUris": [],
        "webOrigins": [],
    },
}

MODULE_PATTERN = re.compile(
    r"^(?:spaceos\.(?:crm|controlling|hr|maintenance|qa|ehs|dms)|joinerytech\.(?:door|plant))$"
)
PERMISSION_PATTERN = re.compile(
    r"^(?:spaceos\.(?:crm|controlling|hr|maintenance|qa|ehs|dms)|joinerytech\.(?:door|plant))\.(?:view|edit|admin)$"
)
CLIENT_ID_PATTERN = re.compile(r"^[a-z][a-z0-9.-]{2,127}$")
ACTOR_PATTERN = re.compile(r"^[a-z0-9][a-z0-9._:-]{2,127}$")
REASON_PATTERN = re.compile(r"^[A-Z][A-Z0-9_-]{2,63}$")
STATION_PATTERN = re.compile(r"^[a-z0-9][a-z0-9._:-]{1,127}$")
AUDIENCE_PATTERN = re.compile(r"^[a-z0-9][a-z0-9._:-]{1,127}$")
SHA256_PATTERN = re.compile(r"^[0-9a-f]{64}$")
RFC3339_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$")
UUID_D_PATTERN = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
RESOURCE_ID_PATTERN = re.compile(r"^[A-Za-z0-9._:-]{3,200}$")
SIGNATURE_PATTERN = re.compile(r"^[A-Za-z0-9_-]+$")

OWNER_RECEIPT_VERSION = "spaceos-keycloak-owner-adoption-receipt/v1"
CUSTODY_RECEIPT_VERSION = "spaceos-keycloak-service-custody-receipt/v1"
ADOPTION_MODE = "signed-exact-existing-resources-only"
REREAD_STRATEGY = "observe-plan-reread-sha256"
ATOMICITY_REQUIREMENT = "external-serialized-writer-or-keycloak-spi-required"
PKCS1_SHA256_PREFIX = bytes.fromhex("3031300d060960864801650304020105000420")

# Deliberately empty in this change.  A production signer public key must arrive
# in a separately reviewed commit and its matching private key must never enter
# this repository.  Tests inject an ephemeral key into this mapping.
TRUSTED_RECEIPT_KEYS: dict[str, Mapping[str, Any]] = {}

RESERVED_TENANTS = {
    "00000000-0000-0000-0000-000000000000",
    "00000000-0000-0000-0000-000000000001",
    "00000000-0000-0000-0000-000000000002",
}
FLAT_AUTHORITY_CLAIMS = {"tid", "tenant_id", "permissions", "enabled_modules"}
HUMAN_TOKEN_AUTHORITY_CLAIMS = {
    *FLAT_AUTHORITY_CLAIMS,
    "spaceos_tenants",
    "spaceos_membership_version",
    "spaceos_projection_version",
}
SERVICE_TOKEN_AUTHORITY_CLAIMS = {
    *HUMAN_TOKEN_AUTHORITY_CLAIMS,
    "spaceos_service_principal",
}
HUMAN_OWNED_ATTRIBUTES = {
    # The broad legacy token attribute is owned only so verification detects it
    # and a future reviewed migration can remove it. Desired state never writes
    # it: every consumer gets a dedicated opaque user attribute instead.
    "spaceos_tenants",
    "spaceos_membership_registry",
    "spaceos_consumer_projection_registry",
    "spaceos_selected_membership_version",
    "spaceos_projection_version",
    "spaceos_authority_status",
    "spaceos_last_change_id",
    "spaceos_last_changed_at",
    "spaceos_last_changed_by",
    *FLAT_AUTHORITY_CLAIMS,
}
SERVICE_OWNED_ATTRIBUTES = {
    "spaceos_service_principal",
    "spaceos_membership_version",
    "spaceos_projection_version",
    "spaceos_principal_status",
    "spaceos_key_rotation",
    "spaceos_last_change_id",
    "spaceos_last_changed_at",
    "spaceos_last_changed_by",
}
SERVICE_VERSIONED_ATTRIBUTES = set(SERVICE_OWNED_ATTRIBUTES)
SERVICE_PERMISSIONS = {
    "office.issue_work_package",
    "office.read_outbox",
    "office.ack_outbox",
}


class ProjectionProvisioningError(keycloak.ProvisioningError):
    """A safe-to-report provisioning failure."""


def strict_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            # Do not echo a malicious property name into operator output.
            raise ProjectionProvisioningError("Duplicate JSON object keys are forbidden.")
        result[key] = value
    return result


def strict_json_loads(text: str) -> Any:
    return json.loads(text, object_pairs_hook=strict_object)


def finding(severity: str, code: str, target: str, message: str) -> dict[str, str]:
    return {"severity": severity, "code": code, "target": target, "message": message}


def nested(profile: Mapping[str, Any], *path: str) -> Any:
    current: Any = profile
    for segment in path:
        if not isinstance(current, Mapping):
            return None
        current = current.get(segment)
    return current


def stable_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=True)


def digest(value: Any) -> str:
    return hashlib.sha256(stable_json(value).encode("utf-8")).hexdigest()


def configuration_digest(profile: Mapping[str, Any]) -> str:
    """Hash every desired/config policy field while excluding receipt material.

    Receipt identifiers remain in the adoption and rotation policies, so neither
    receipt can be substituted without changing the configuration hash.  Payload
    and signature bytes are excluded to avoid a circular digest.
    """

    value = deepcopy(dict(profile))
    safety = value.get("mutationSafety")
    if isinstance(safety, Mapping):
        reduced = dict(safety)
        reduced.pop("ownerReceipt", None)
        reduced.pop("custodyReceipt", None)
        value["mutationSafety"] = reduced
    return digest(value)


def _strict_base64url(value: Any) -> bytes | None:
    if not isinstance(value, str) or not value or not SIGNATURE_PATTERN.fullmatch(value):
        return None
    try:
        decoded = base64.b64decode(
            value + "=" * ((4 - len(value) % 4) % 4),
            altchars=b"-_",
            validate=True,
        )
    except (binascii.Error, ValueError):
        return None
    canonical = base64.urlsafe_b64encode(decoded).rstrip(b"=").decode("ascii")
    return decoded if hmac.compare_digest(canonical, value) else None


def verify_rs256_receipt(
    receipt: Any,
    *,
    usage: str,
    trusted_keys: Mapping[str, Mapping[str, Any]] | None = None,
) -> str | None:
    """Return a safe blocker string unless a receipt has a trusted RS256 proof.

    This uses only the Python standard library and verifies the strict
    EMSA-PKCS1-v1_5 SHA-256 encoding.  The repository intentionally ships no
    production trust anchor yet; tests inject an ephemeral public key.
    """

    if not isinstance(receipt, Mapping) or set(receipt) != {"payload", "signature"}:
        return "The receipt envelope is malformed."
    payload = receipt.get("payload")
    signature = receipt.get("signature")
    if not isinstance(payload, Mapping) or not isinstance(signature, Mapping):
        return "The receipt envelope is malformed."
    if set(signature) != {"algorithm", "keyId", "value"} or signature.get("algorithm") != "RS256":
        return "The receipt must use the exact RS256 signature envelope."
    key_id = signature.get("keyId")
    if not isinstance(key_id, str) or not ACTOR_PATTERN.fullmatch(key_id):
        return "The receipt signer key ID is malformed."
    keys = TRUSTED_RECEIPT_KEYS if trusted_keys is None else trusted_keys
    key = keys.get(key_id)
    if not isinstance(key, Mapping):
        return "No repository-pinned production trust anchor exists for this receipt signer."
    if set(key) != {"algorithm", "usage", "modulus", "exponent"}:
        return "The receipt trust anchor is malformed."
    if key.get("algorithm") != "RS256" or key.get("usage") != usage:
        return "The receipt trust anchor is not authorized for this receipt purpose."
    modulus = key.get("modulus")
    exponent = key.get("exponent")
    encoded_signature = _strict_base64url(signature.get("value"))
    if (
        isinstance(modulus, bool)
        or not isinstance(modulus, int)
        or modulus.bit_length() < 3072
        or isinstance(exponent, bool)
        or not isinstance(exponent, int)
        or exponent != 65537
        or encoded_signature is None
    ):
        return "The receipt signature or trust anchor is malformed."
    encoded_length = (modulus.bit_length() + 7) // 8
    if len(encoded_signature) != encoded_length:
        return "The receipt signature length is invalid."
    signature_integer = int.from_bytes(encoded_signature, "big")
    if signature_integer >= modulus:
        return "The receipt signature is outside the trusted RSA domain."
    recovered = pow(signature_integer, exponent, modulus).to_bytes(encoded_length, "big")
    message_hash = hashlib.sha256(stable_json(payload).encode("utf-8")).digest()
    digest_info = PKCS1_SHA256_PREFIX + message_hash
    padding_length = encoded_length - len(digest_info) - 3
    if padding_length < 8:
        return "The receipt trust anchor is too small for RS256."
    expected = b"\x00\x01" + b"\xff" * padding_length + b"\x00" + digest_info
    if not hmac.compare_digest(recovered, expected):
        return "The receipt signature does not verify against the pinned trust anchor."
    return None


def receipt_time_blocker(payload: Mapping[str, Any], now: datetime | None = None) -> str | None:
    issued_at = utc_timestamp(payload.get("issuedAt"))
    expires_at = utc_timestamp(payload.get("expiresAt"))
    if issued_at is None or expires_at is None or not issued_at < expires_at:
        return "The receipt validity window is malformed."
    if expires_at - issued_at > timedelta(days=31):
        return "The receipt validity window exceeds 31 days."
    current = now or datetime.now(timezone.utc)
    if current < issued_at:
        return "The receipt is not valid yet."
    if current >= expires_at:
        return "The receipt has expired."
    return None


def expected_adoption_resource_intents(profile: Mapping[str, Any]) -> list[dict[str, str]]:
    intents = [{
        "kind": "authority-user",
        "logicalId": str(nested(profile, "authority", "subjectId")),
        "disposition": "mutate-exact-existing",
    }]
    for consumer in consumer_projections(profile):
        intents.extend([
            {
                "kind": "client-scope",
                "logicalId": consumer_scope_name(consumer),
                "disposition": "adopt-exact-existing",
            },
            {
                "kind": "consumer-client",
                "logicalId": str(consumer["clientId"]),
                "disposition": "bind-exact-existing",
            },
        ])
    intents.append({
        "kind": "service-client",
        "logicalId": str(nested(profile, "servicePrincipalRegistry")[0]["clientId"]),
        "disposition": "adopt-exact-existing-disabled",
    })
    return sorted(intents, key=lambda item: (item["kind"], item["logicalId"]))


def adoption_owned_state_digest(profile: Mapping[str, Any], kind: str, logical_id: str) -> str:
    """Hash only the fields this tool is allowed to own for the bound resource."""

    return digest(desired_adoption_owned_state(profile, kind, logical_id))


def expected_scope_binding_allowlist(profile: Mapping[str, Any]) -> list[dict[str, str]]:
    return sorted(
        [
            {
                "clientId": str(consumer["clientId"]),
                "scopeName": consumer_scope_name(consumer),
                "binding": "default",
            }
            for consumer in consumer_projections(profile)
        ],
        key=lambda item: (item["clientId"], item["scopeName"], item["binding"]),
    )


def mutation_safety_blockers(profile: Mapping[str, Any]) -> list[str]:
    safety = profile.get("mutationSafety")
    if not isinstance(safety, Mapping):
        return ["Mutation-safety evidence is absent."]
    blockers: list[str] = []
    owner_blocker = verify_rs256_receipt(
        safety.get("ownerReceipt"), usage="owner-adoption"
    )
    if owner_blocker:
        blockers.append("Owner/adoption receipt: " + owner_blocker)
    elif isinstance(safety.get("ownerReceipt"), Mapping):
        temporal = receipt_time_blocker(safety["ownerReceipt"]["payload"])
        if temporal:
            blockers.append("Owner/adoption receipt: " + temporal)
    custody_blocker = verify_rs256_receipt(
        safety.get("custodyReceipt"), usage="service-custody"
    )
    if custody_blocker:
        blockers.append("Service custody receipt: " + custody_blocker)
    elif isinstance(safety.get("custodyReceipt"), Mapping):
        temporal = receipt_time_blocker(safety["custodyReceipt"]["payload"])
        if temporal:
            blockers.append("Service custody receipt: " + temporal)
    return blockers


def opaque_target(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:16]


def normalized_uuid(value: Any) -> str | None:
    if not isinstance(value, str) or not UUID_D_PATTERN.fullmatch(value):
        return None
    try:
        parsed = str(uuid.UUID(value))
    except (ValueError, AttributeError):
        return None
    return None if parsed != value or parsed in RESERVED_TENANTS else parsed


def canonical_resource_uuid(value: Any) -> str | None:
    """Canonical UUID for Keycloak object identities (not tenant semantics)."""

    if not isinstance(value, str) or not UUID_D_PATTERN.fullmatch(value):
        return None
    try:
        parsed = str(uuid.UUID(value))
    except (ValueError, AttributeError):
        return None
    return parsed if parsed == value else None


def bounded_inventory_identity(value: Any, *, maximum: int = 255) -> str | None:
    """Preserve foreign Keycloak names ordinally without imposing our client grammar."""

    if not isinstance(value, str) or not 1 <= len(value) <= maximum:
        return None
    if value != value.strip() or any(ord(character) < 0x20 or ord(character) == 0x7F for character in value):
        return None
    return value


def unique_strings(value: Any, *, maximum: int, pattern: re.Pattern[str] | None = None) -> list[str] | None:
    if not isinstance(value, list) or len(value) > maximum:
        return None
    if any(not isinstance(item, str) or not item or len(item) > 128 for item in value):
        return None
    if len(set(value)) != len(value):
        return None
    if pattern and any(not pattern.fullmatch(item) for item in value):
        return None
    return sorted(value)


def canonical_https_urls(
    value: Any,
    *,
    maximum: int,
    origin_only: bool,
) -> list[str] | None:
    """Validate a strict production browser URL list without wildcard semantics."""

    if not isinstance(value, list) or len(value) > maximum:
        return None
    if any(not isinstance(item, str) for item in value) or len(set(value)) != len(value):
        return None
    canonical: list[str] = []
    for item in value:
        if not 1 <= len(item) <= 512 or item != item.strip() or "*" in item:
            return None
        if any(ord(character) < 0x20 or ord(character) == 0x7F for character in item):
            return None
        try:
            parsed = urllib.parse.urlsplit(item)
            port = parsed.port
        except ValueError:
            return None
        if (
            parsed.scheme != "https"
            or parsed.hostname is None
            or parsed.hostname != parsed.hostname.lower()
            or parsed.username is not None
            or parsed.password is not None
            or port is not None
            or parsed.netloc != parsed.hostname
            or parsed.query
            or parsed.fragment
        ):
            return None
        if origin_only:
            if parsed.path:
                return None
        elif not parsed.path.startswith("/") or parsed.path == "/":
            return None
        if urllib.parse.urlunsplit(("https", parsed.hostname, parsed.path, "", "")) != item:
            return None
        canonical.append(item)
    return sorted(canonical)


def utc_timestamp(value: Any) -> datetime | None:
    """Parse the deliberately narrow UTC timestamp wire format."""

    if not isinstance(value, str) or not RFC3339_PATTERN.fullmatch(value):
        return None
    try:
        return datetime.fromisoformat(value[:-1] + "+00:00")
    except ValueError:
        return None


def validate_audit(audit: Any, target: str, findings: list[dict[str, str]]) -> None:
    if not isinstance(audit, Mapping):
        findings.append(finding("Error", "Audit", target, "A non-secret audit record is required."))
        return
    allowed = {"changeId", "actorId", "reasonCode", "changedAt", "action"}
    if set(audit) != allowed:
        findings.append(finding("Error", "AuditField", target, "Audit fields must match the exact non-secret schema."))
    if normalized_uuid(audit.get("changeId")) is None:
        findings.append(finding("Error", "AuditChangeId", f"{target}.changeId", "A non-reserved UUID is required."))
    if not isinstance(audit.get("actorId"), str) or not ACTOR_PATTERN.fullmatch(str(audit.get("actorId"))):
        findings.append(finding("Error", "AuditActor", f"{target}.actorId", "A stable non-personal actor ID is required."))
    if not isinstance(audit.get("reasonCode"), str) or not REASON_PATTERN.fullmatch(str(audit.get("reasonCode"))):
        findings.append(finding("Error", "AuditReason", f"{target}.reasonCode", "A machine-readable reason code is required."))
    if utc_timestamp(audit.get("changedAt")) is None:
        findings.append(finding("Error", "AuditTime", f"{target}.changedAt", "A UTC RFC3339 timestamp is required."))
    if audit.get("action") not in {"bootstrap", "replace", "select-tenant", "revoke", "deactivate", "reactivate", "rotate-key"}:
        findings.append(finding("Error", "AuditAction", f"{target}.action", "The lifecycle action is not recognized."))


def validate_membership(entry: Any, index: int, findings: list[dict[str, str]]) -> None:
    target = f"authority.memberships[{index}]"
    if not isinstance(entry, Mapping):
        findings.append(finding("Error", "Membership", target, "A membership object is required."))
        return
    allowed = {"tenant_id", "tenant_type", "brand_skin", "permissions", "enabled_modules", "membership_version", "status"}
    if set(entry) - allowed:
        findings.append(finding("Error", "MembershipField", target, "Unknown membership fields are forbidden."))
    if normalized_uuid(entry.get("tenant_id")) is None:
        findings.append(finding("Error", "TenantId", f"{target}.tenant_id", "A non-reserved UUID is required."))
    if entry.get("status") not in {"active", "revoked", "deactivated"}:
        findings.append(finding("Error", "MembershipStatus", f"{target}.status", "Status must be active, revoked, or deactivated."))
    version = entry.get("membership_version")
    if isinstance(version, bool) or not isinstance(version, int) or not 1 <= version <= JSON_SAFE_INTEGER:
        findings.append(finding("Error", "MembershipVersion", f"{target}.membership_version", "A positive JSON safe integer is required."))
    modules = unique_strings(entry.get("enabled_modules"), maximum=10, pattern=MODULE_PATTERN)
    permissions = unique_strings(entry.get("permissions"), maximum=10)
    if modules is None:
        findings.append(finding("Error", "EnabledModules", f"{target}.enabled_modules", "Use unique canonical ModuleIds."))
    if permissions is None or any(value != "tenant.members.manage" and not PERMISSION_PATTERN.fullmatch(value) for value in permissions or []):
        findings.append(finding("Error", "Permissions", f"{target}.permissions", "Use unique canonical service permissions."))
    if modules is not None and permissions is not None:
        permission_modules = sorted(
            permission[: permission.rfind(".")]
            for permission in permissions
            if permission != "tenant.members.manage"
        )
        if permission_modules != modules:
            findings.append(finding("Error", "PermissionModuleDrift", target, "Permissions and enabled_modules must name the same services exactly."))
    for optional in ("tenant_type", "brand_skin"):
        value = entry.get(optional)
        if value is not None and (not isinstance(value, str) or not value.strip() or len(value) > 100):
            findings.append(finding("Error", "MembershipMetadata", f"{target}.{optional}", "Optional metadata must be a nonblank bounded string."))


def validate_service_principal(principal: Any, index: int, tenant_ids: set[str], findings: list[dict[str, str]]) -> None:
    target = f"servicePrincipalRegistry[{index}]"
    if not isinstance(principal, Mapping):
        findings.append(finding("Error", "ServicePrincipal", target, "A service-principal object is required."))
        return
    allowed = {"purpose", "clientId", "audience", "status", "membershipVersion", "projectionVersion", "scope", "keyRotation", "audit"}
    if set(principal) != allowed:
        findings.append(finding("Error", "ServicePrincipalField", target, "Service-principal fields must match the exact registry schema."))
    if principal.get("purpose") != "office-to-plant" or principal.get("clientId") != OFFICE_TO_PLANT_CLIENT_ID:
        findings.append(finding("Error", "ServicePrincipalIdentity", target, "The dedicated Office-to-Plant client is required."))
    if principal.get("audience") != PLANT_API_AUDIENCE:
        findings.append(finding("Error", "ServicePrincipalAudience", f"{target}.audience", "The exact Plant API audience is required."))
    status = principal.get("status")
    if status not in {"disabled", "active", "revoked", "deactivated"}:
        findings.append(finding("Error", "ServicePrincipalStatus", f"{target}.status", "Invalid service-principal lifecycle status."))
    for name in ("membershipVersion", "projectionVersion"):
        value = principal.get(name)
        if isinstance(value, bool) or not isinstance(value, int) or not 1 <= value <= JSON_SAFE_INTEGER:
            findings.append(finding("Error", "ServicePrincipalVersion", f"{target}.{name}", "A positive JSON safe integer is required."))
    scope = principal.get("scope")
    if not isinstance(scope, Mapping):
        findings.append(finding("Error", "ServicePrincipalScope", f"{target}.scope", "Tenant/project/station scope is required."))
    else:
        if set(scope) != {"tenant_id", "project_ids", "station_ids", "permissions"}:
            findings.append(finding("Error", "ServicePrincipalScopeField", f"{target}.scope", "Scope fields must match the exact tenant/project/station schema."))
        tenant_id = normalized_uuid(scope.get("tenant_id"))
        if tenant_id is None or tenant_id not in tenant_ids:
            findings.append(finding("Error", "ServicePrincipalTenant", f"{target}.scope.tenant_id", "Scope must reference a declared tenant membership."))
        project_ids = unique_strings(scope.get("project_ids"), maximum=32)
        if project_ids is None or not project_ids or any(normalized_uuid(value) is None for value in project_ids):
            findings.append(finding("Error", "ServicePrincipalProjects", f"{target}.scope.project_ids", "At least one unique project UUID is required."))
        station_ids = unique_strings(scope.get("station_ids"), maximum=64, pattern=STATION_PATTERN)
        if station_ids is None or not station_ids:
            findings.append(finding("Error", "ServicePrincipalStations", f"{target}.scope.station_ids", "At least one bounded station ID is required."))
        permissions = unique_strings(scope.get("permissions"), maximum=len(SERVICE_PERMISSIONS))
        if permissions is None or not permissions or not set(permissions).issubset(SERVICE_PERMISSIONS):
            findings.append(finding("Error", "ServicePrincipalPermissions", f"{target}.scope.permissions", "Only the bounded Plant Office-operation vocabulary is accepted."))
    rotation = principal.get("keyRotation")
    if not isinstance(rotation, Mapping):
        findings.append(finding("Error", "KeyRotation", f"{target}.keyRotation", "Key-rotation metadata is required."))
    else:
        rotation_allowed = {"state", "activeVersion", "activeKeyId", "previousKeyId", "activatedAt", "rotateAfter", "overlapUntil", "custodyReceiptId"}
        if set(rotation) != rotation_allowed:
            findings.append(finding("Error", "KeyRotationField", f"{target}.keyRotation", "Rotation fields must match the exact non-secret metadata schema."))
        state = rotation.get("state")
        if state not in {"not-provisioned", "current", "overlap", "retire-old"}:
            findings.append(finding("Error", "KeyRotationState", f"{target}.keyRotation.state", "Invalid rotation state."))
        version = rotation.get("activeVersion")
        if (
            isinstance(version, bool)
            or not isinstance(version, int)
            or not 0 <= version <= JSON_SAFE_INTEGER
            or state != "not-provisioned" and version < 1
        ):
            findings.append(finding("Error", "KeyRotationVersion", f"{target}.keyRotation.activeVersion", "Use zero only for not-provisioned; every provisioned key requires a positive JSON safe integer."))
        if state == "not-provisioned":
            if status == "active" or version != 0 or any(rotation.get(name) is not None for name in ("activeKeyId", "previousKeyId", "activatedAt", "rotateAfter", "overlapUntil")):
                findings.append(finding("Error", "KeyRotationNotProvisioned", f"{target}.keyRotation", "An unprovisioned key cannot activate a principal or claim key evidence."))
        else:
            if not isinstance(rotation.get("activeKeyId"), str) or not ACTOR_PATTERN.fullmatch(str(rotation.get("activeKeyId"))):
                findings.append(finding("Error", "KeyRotationId", f"{target}.keyRotation.activeKeyId", "A non-secret key label is required."))
            activated_at = utc_timestamp(rotation.get("activatedAt"))
            rotate_after = utc_timestamp(rotation.get("rotateAfter"))
            if activated_at is None:
                findings.append(finding("Error", "KeyRotationTime", f"{target}.keyRotation.activatedAt", "A UTC activation time is required."))
            if rotate_after is None:
                findings.append(finding("Error", "KeyRotationDeadline", f"{target}.keyRotation.rotateAfter", "A UTC rotation deadline is required."))
            if activated_at is not None and rotate_after is not None and rotate_after <= activated_at:
                findings.append(finding("Error", "KeyRotationOrder", f"{target}.keyRotation", "The rotation deadline must be later than key activation."))
            previous_key_id = rotation.get("previousKeyId")
            overlap_until = rotation.get("overlapUntil")
            if state == "current":
                if previous_key_id is not None or overlap_until is not None:
                    findings.append(finding("Error", "KeyRotationCurrent", f"{target}.keyRotation", "A current key has no previous-key overlap metadata."))
            elif state in {"overlap", "retire-old"}:
                if not isinstance(previous_key_id, str) or not ACTOR_PATTERN.fullmatch(previous_key_id):
                    findings.append(finding("Error", "KeyRotationPrevious", f"{target}.keyRotation.previousKeyId", "Overlap/retirement requires a non-secret previous key label."))
                overlap_time = utc_timestamp(overlap_until)
                if overlap_time is None:
                    findings.append(finding("Error", "KeyRotationOverlap", f"{target}.keyRotation.overlapUntil", "Overlap/retirement requires an exact UTC deadline."))
                elif activated_at is not None and rotate_after is not None and not (activated_at < overlap_time <= rotate_after):
                    findings.append(finding("Error", "KeyRotationOverlapOrder", f"{target}.keyRotation.overlapUntil", "The previous-key overlap must end after activation and no later than the next rotation deadline."))
        if normalized_uuid(rotation.get("custodyReceiptId")) is None:
            findings.append(finding("Error", "KeyRotationEvidence", f"{target}.keyRotation.custodyReceiptId", "An immutable signed custody receipt UUID is required in every lifecycle state."))
    validate_audit(principal.get("audit"), f"{target}.audit", findings)


def validate_receipt_envelope(receipt: Any, target: str, findings: list[dict[str, str]]) -> tuple[Mapping[str, Any] | None, Mapping[str, Any] | None]:
    if not isinstance(receipt, Mapping) or set(receipt) != {"payload", "signature"}:
        findings.append(finding("Error", "ReceiptEnvelope", target, "Receipt fields must be exactly payload and signature."))
        return None, None
    payload = receipt.get("payload")
    signature = receipt.get("signature")
    if not isinstance(payload, Mapping):
        findings.append(finding("Error", "ReceiptPayload", f"{target}.payload", "A canonical receipt payload is required."))
        payload = None
    if not isinstance(signature, Mapping) or set(signature) != {"algorithm", "keyId", "value"}:
        findings.append(finding("Error", "ReceiptSignature", f"{target}.signature", "The signature envelope must contain exactly algorithm, keyId and value."))
        return payload, None
    if signature.get("algorithm") != "RS256":
        findings.append(finding("Error", "ReceiptAlgorithm", f"{target}.signature.algorithm", "Only source-pinned RS256 receipt verification is supported."))
    if not isinstance(signature.get("keyId"), str) or not ACTOR_PATTERN.fullmatch(str(signature.get("keyId"))):
        findings.append(finding("Error", "ReceiptKeyId", f"{target}.signature.keyId", "A canonical external signer key ID is required."))
    if _strict_base64url(signature.get("value")) is None:
        findings.append(finding("Error", "ReceiptSignatureValue", f"{target}.signature.value", "Use canonical unpadded base64url signature bytes."))
    return payload, signature


def validate_mutation_safety(profile: Mapping[str, Any], findings: list[dict[str, str]]) -> None:
    target = "mutationSafety"
    safety = profile.get("mutationSafety")
    allowed = {
        "adoptionPolicy",
        "inventoryPolicy",
        "rereadPolicy",
        "compensationPolicy",
        "consumerEligibilityPolicy",
        "ownerReceipt",
        "custodyReceipt",
    }
    if not isinstance(safety, Mapping) or set(safety) != allowed:
        findings.append(finding("Error", "MutationSafetyField", target, "Mutation-safety fields must match the exact fail-closed schema."))
        return

    adoption = safety.get("adoptionPolicy")
    resources: list[Any] = []
    if not isinstance(adoption, Mapping) or set(adoption) != {"mode", "ownerReceiptId", "resources"}:
        findings.append(finding("Error", "AdoptionPolicy", f"{target}.adoptionPolicy", "An exact signed adoption policy is required."))
    else:
        if adoption.get("mode") != ADOPTION_MODE:
            findings.append(finding("Error", "AdoptionMode", f"{target}.adoptionPolicy.mode", "Implicit, create-on-name and self-adoption modes are forbidden."))
        if normalized_uuid(adoption.get("ownerReceiptId")) is None:
            findings.append(finding("Error", "AdoptionReceiptId", f"{target}.adoptionPolicy.ownerReceiptId", "A canonical non-reserved owner receipt UUID is required."))
        if not isinstance(adoption.get("resources"), list):
            findings.append(finding("Error", "AdoptionResources", f"{target}.adoptionPolicy.resources", "Every mutable or bound resource requires an immutable internal-ID adoption entry."))
        else:
            resources = list(adoption["resources"])
            actual_intents: list[dict[str, str]] = []
            seen_resource_ids: set[str] = set()
            for index, resource in enumerate(resources):
                resource_target = f"{target}.adoptionPolicy.resources[{index}]"
                if not isinstance(resource, Mapping) or set(resource) != {"kind", "logicalId", "resourceId", "disposition", "desiredOwnedStateSha256", "observedOwnedStateSha256"}:
                    findings.append(finding("Error", "AdoptionResourceField", resource_target, "Adoption entries require exact identity, desired-state and signed observed-baseline digests."))
                    continue
                resource_id = resource.get("resourceId")
                if canonical_resource_uuid(resource_id) is None or resource_id in seen_resource_ids:
                    findings.append(finding("Error", "AdoptionResourceId", f"{resource_target}.resourceId", "A unique canonical Keycloak internal UUID is required."))
                elif isinstance(resource_id, str):
                    seen_resource_ids.add(resource_id)
                actual_intents.append({
                    "kind": str(resource.get("kind")),
                    "logicalId": str(resource.get("logicalId")),
                    "disposition": str(resource.get("disposition")),
                })
                try:
                    expected_owned_digest = adoption_owned_state_digest(
                        profile, str(resource.get("kind")), str(resource.get("logicalId"))
                    )
                except (KeyError, TypeError, IndexError, StopIteration, ProjectionProvisioningError):
                    expected_owned_digest = None
                if resource.get("desiredOwnedStateSha256") != expected_owned_digest:
                    findings.append(finding("Error", "AdoptionDesiredState", f"{resource_target}.desiredOwnedStateSha256", "The receipt-bound resource must pin the exact desired allowlisted owned-state digest."))
                observed_digest = resource.get("observedOwnedStateSha256")
                if not isinstance(observed_digest, str) or not SHA256_PATTERN.fullmatch(observed_digest) or observed_digest == "0" * 64:
                    findings.append(finding("Error", "AdoptionObservedState", f"{resource_target}.observedOwnedStateSha256", "A signed nonzero digest from the reviewed online read-only adoption candidate is required."))
            try:
                expected_intents = expected_adoption_resource_intents(profile)
            except (KeyError, TypeError, IndexError):
                expected_intents = []
            canonical_resources = sorted(
                resources,
                key=lambda item: (
                    str(item.get("kind")) if isinstance(item, Mapping) else "",
                    str(item.get("logicalId")) if isinstance(item, Mapping) else "",
                ),
            )
            if resources != canonical_resources or actual_intents != expected_intents:
                findings.append(finding("Error", "AdoptionResourceSet", f"{target}.adoptionPolicy.resources", "The sorted resource set must bind exactly the authority user, each consumer/client-scope pair, and the disabled service client."))

    inventory = safety.get("inventoryPolicy")
    if not isinstance(inventory, Mapping) or set(inventory) != {"pageSize", "maxPages", "stablePasses", "allowedScopeBindings"}:
        findings.append(finding("Error", "InventoryPolicy", f"{target}.inventoryPolicy", "A bounded complete realm inventory policy is required."))
    else:
        page_size = inventory.get("pageSize")
        max_pages = inventory.get("maxPages")
        if isinstance(page_size, bool) or not isinstance(page_size, int) or not 1 <= page_size <= 100:
            findings.append(finding("Error", "InventoryPageSize", f"{target}.inventoryPolicy.pageSize", "Inventory page size must be 1..100."))
        if isinstance(max_pages, bool) or not isinstance(max_pages, int) or not 1 <= max_pages <= 100:
            findings.append(finding("Error", "InventoryMaxPages", f"{target}.inventoryPolicy.maxPages", "Inventory maxPages must be 1..100."))
        if inventory.get("stablePasses") != 2:
            findings.append(finding("Error", "InventoryStablePasses", f"{target}.inventoryPolicy.stablePasses", "Exactly two byte-identical complete inventory passes are required."))
        try:
            expected_bindings = expected_scope_binding_allowlist(profile)
        except (KeyError, TypeError, IndexError):
            expected_bindings = []
        if inventory.get("allowedScopeBindings") != expected_bindings:
            findings.append(finding("Error", "InventoryAllowlist", f"{target}.inventoryPolicy.allowedScopeBindings", "Only each receipt-bound human consumer's own default managed scope may be allowed."))

    reread = safety.get("rereadPolicy")
    expected_reread = {
        "strategy": REREAD_STRATEGY,
        "requireExactFingerprint": True,
        "atomicityRequirement": ATOMICITY_REQUIREMENT,
    }
    if reread != expected_reread:
        findings.append(finding("Error", "RereadPolicy", f"{target}.rereadPolicy", "Observe/plan/exact-reread is mandatory and cannot claim atomic CAS."))

    compensation = safety.get("compensationPolicy")
    expected_compensation = {
        "disableServiceBeforeAnyMutation": True,
        "disableOnAnyUncertainty": True,
        "requireDisabledReadback": True,
    }
    if compensation != expected_compensation:
        findings.append(finding("Error", "CompensationPolicy", f"{target}.compensationPolicy", "Every uncertain or failed mutation must prove the service principal disabled."))

    eligibility = safety.get("consumerEligibilityPolicy")
    expected_eligibility = {
        "protocol": "openid-connect",
        "publicClient": True,
        "bearerOnly": False,
        "standardFlowEnabled": True,
        "implicitFlowEnabled": False,
        "directAccessGrantsEnabled": False,
        "serviceAccountsEnabled": False,
        "authorizationServicesEnabled": False,
        "fullScopeAllowed": False,
        "pkceCodeChallengeMethod": "S256",
    }
    if eligibility != expected_eligibility:
        findings.append(finding("Error", "ConsumerEligibilityPolicy", f"{target}.consumerEligibilityPolicy", "Human consumers require the exact public Authorization Code/PKCE-compatible, non-service profile."))

    owner_payload, _ = validate_receipt_envelope(safety.get("ownerReceipt"), f"{target}.ownerReceipt", findings)
    if owner_payload is not None:
        owner_fields = {
            "schemaVersion", "receiptId", "issuedAt", "expiresAt", "ownerId", "realm",
            "authoritySubjectId", "consumerClientIds", "managedScopeNames",
            "serviceClientId", "authorityChangeId", "serviceChangeId",
            "configurationSha256", "adoptionPolicySha256", "inventoryPolicySha256",
        }
        if set(owner_payload) != owner_fields:
            findings.append(finding("Error", "OwnerReceiptField", f"{target}.ownerReceipt.payload", "Owner receipt payload fields must match the exact immutable schema."))
        if owner_payload.get("schemaVersion") != OWNER_RECEIPT_VERSION:
            findings.append(finding("Error", "OwnerReceiptVersion", f"{target}.ownerReceipt.payload.schemaVersion", "Unexpected owner receipt version."))
        if normalized_uuid(owner_payload.get("receiptId")) is None or isinstance(adoption, Mapping) and owner_payload.get("receiptId") != adoption.get("ownerReceiptId"):
            findings.append(finding("Error", "OwnerReceiptId", f"{target}.ownerReceipt.payload.receiptId", "Owner receipt ID must match the adoption policy."))
        owner_issued = utc_timestamp(owner_payload.get("issuedAt"))
        owner_expires = utc_timestamp(owner_payload.get("expiresAt"))
        if owner_issued is None or owner_expires is None or not owner_issued < owner_expires or owner_expires - owner_issued > timedelta(days=31) or not isinstance(owner_payload.get("ownerId"), str) or not ACTOR_PATTERN.fullmatch(str(owner_payload.get("ownerId"))):
            findings.append(finding("Error", "OwnerReceiptIssuer", f"{target}.ownerReceipt.payload", "Owner receipt requires a canonical issuer and UTC issue time."))
        try:
            consumers = [str(item["clientId"]) for item in consumer_projections(profile)]
            scope_names = [consumer_scope_name(item) for item in consumer_projections(profile)]
            principal = profile["servicePrincipalRegistry"][0]
            expected_owner = {
                "realm": profile["keycloak"]["realm"],
                "authoritySubjectId": profile["authority"]["subjectId"],
                "consumerClientIds": consumers,
                "managedScopeNames": scope_names,
                "serviceClientId": principal["clientId"],
                "authorityChangeId": profile["authority"]["audit"]["changeId"],
                "serviceChangeId": principal["audit"]["changeId"],
                "configurationSha256": configuration_digest(profile),
                "adoptionPolicySha256": digest(adoption),
                "inventoryPolicySha256": digest(inventory),
            }
            if any(owner_payload.get(name) != value for name, value in expected_owner.items()):
                findings.append(finding("Error", "OwnerReceiptBinding", f"{target}.ownerReceipt.payload", "Owner receipt must bind the exact realm, subject, clients, scopes, changes, policies and configuration hash."))
        except (KeyError, TypeError, IndexError):
            findings.append(finding("Error", "OwnerReceiptBinding", f"{target}.ownerReceipt.payload", "Owner receipt bindings could not be derived from the profile."))

    custody_payload, _ = validate_receipt_envelope(safety.get("custodyReceipt"), f"{target}.custodyReceipt", findings)
    if custody_payload is not None:
        custody_fields = {
            "schemaVersion", "receiptId", "issuedAt", "expiresAt", "custodianId", "nonce",
            "realm", "clientInternalId", "clientId", "audience", "scopeSha256",
            "keyState", "activeVersion", "activeKeyId", "keyFingerprintSha256",
            "activatedAt", "rotateAfter", "overlapUntil", "serviceChangeId",
            "configurationSha256",
        }
        if set(custody_payload) != custody_fields:
            findings.append(finding("Error", "CustodyReceiptField", f"{target}.custodyReceipt.payload", "Custody receipt payload fields must match the exact immutable schema."))
        if custody_payload.get("schemaVersion") != CUSTODY_RECEIPT_VERSION:
            findings.append(finding("Error", "CustodyReceiptVersion", f"{target}.custodyReceipt.payload.schemaVersion", "Unexpected custody receipt version."))
        if normalized_uuid(custody_payload.get("receiptId")) is None or normalized_uuid(custody_payload.get("nonce")) is None:
            findings.append(finding("Error", "CustodyReceiptId", f"{target}.custodyReceipt.payload", "Custody receipt and nonce require distinct canonical UUIDs."))
        if custody_payload.get("receiptId") == custody_payload.get("nonce"):
            findings.append(finding("Error", "CustodyReceiptReplay", f"{target}.custodyReceipt.payload.nonce", "Custody nonce must be distinct from the receipt ID."))
        custody_issued = utc_timestamp(custody_payload.get("issuedAt"))
        custody_expires = utc_timestamp(custody_payload.get("expiresAt"))
        if custody_issued is None or custody_expires is None or not custody_issued < custody_expires or custody_expires - custody_issued > timedelta(days=31) or not isinstance(custody_payload.get("custodianId"), str) or not ACTOR_PATTERN.fullmatch(str(custody_payload.get("custodianId"))):
            findings.append(finding("Error", "CustodyReceiptIssuer", f"{target}.custodyReceipt.payload", "Custody receipt requires a canonical issuer and UTC issue time."))
        try:
            principal = profile["servicePrincipalRegistry"][0]
            rotation = principal["keyRotation"]
            service_resources = [
                item for item in resources
                if isinstance(item, Mapping) and item.get("kind") == "service-client"
            ]
            service_internal_id = service_resources[0]["resourceId"] if len(service_resources) == 1 else None
            expected_custody = {
                "receiptId": rotation["custodyReceiptId"],
                "realm": profile["keycloak"]["realm"],
                "clientInternalId": service_internal_id,
                "clientId": principal["clientId"],
                "audience": principal["audience"],
                "scopeSha256": digest(service_projection(principal)),
                "keyState": rotation["state"],
                "activeVersion": rotation["activeVersion"],
                "activeKeyId": rotation["activeKeyId"],
                "activatedAt": rotation["activatedAt"],
                "rotateAfter": rotation["rotateAfter"],
                "overlapUntil": rotation["overlapUntil"],
                "serviceChangeId": principal["audit"]["changeId"],
                "configurationSha256": configuration_digest(profile),
            }
            if any(custody_payload.get(name) != value for name, value in expected_custody.items()):
                findings.append(finding("Error", "CustodyReceiptBinding", f"{target}.custodyReceipt.payload", "Custody receipt must bind the exact internal client, audience, scope, rotation, change and configuration."))
            fingerprint = custody_payload.get("keyFingerprintSha256")
            if rotation["state"] == "not-provisioned":
                if fingerprint is not None:
                    findings.append(finding("Error", "CustodyKeyFingerprint", f"{target}.custodyReceipt.payload.keyFingerprintSha256", "An unprovisioned key must not claim a fingerprint."))
            elif not isinstance(fingerprint, str) or not SHA256_PATTERN.fullmatch(fingerprint) or fingerprint == "0" * 64:
                findings.append(finding("Error", "CustodyKeyFingerprint", f"{target}.custodyReceipt.payload.keyFingerprintSha256", "Provisioned custody requires a nonzero SHA-256 key fingerprint."))
        except (KeyError, TypeError, IndexError):
            findings.append(finding("Error", "CustodyReceiptBinding", f"{target}.custodyReceipt.payload", "Custody receipt bindings could not be derived from the profile."))


def validate_profile(profile: Any) -> list[dict[str, str]]:
    if not isinstance(profile, Mapping):
        return [finding("Error", "Profile", "profile", "The JSON root must be an object.")]
    findings: list[dict[str, str]] = []
    root_allowed = {"schemaVersion", "keycloak", "retryPolicy", "authorityScope", "authority", "servicePrincipalRegistry", "mutationSafety"}
    if set(profile) != root_allowed:
        findings.append(finding("Error", "ProfileField", "profile", "Profile fields must match the exact authority schema."))
    forbidden = keycloak.has_forbidden_secret_key(profile)
    if forbidden:
        findings.append(finding("Error", "SecretInProfile", forbidden, "Profiles cannot contain secrets, passwords, credentials, or tokens."))
    if profile.get("schemaVersion") != PROFILE_VERSION:
        findings.append(finding("Error", "ProfileVersion", "schemaVersion", "Unexpected projection profile version."))
    expected_keycloak = {
        "publicBaseUrl": PUBLIC_BASE_URL,
        "adminBaseUrl": ADMIN_BASE_URL,
        "realm": REALM,
        "adminRealm": "master",
        "adminClientId": "admin-cli",
    }
    configured_keycloak = profile.get("keycloak")
    if not isinstance(configured_keycloak, Mapping):
        findings.append(finding("Error", "Keycloak", "keycloak", "Keycloak endpoint configuration is required."))
    else:
        if set(configured_keycloak) != set(expected_keycloak):
            findings.append(finding("Error", "KeycloakField", "keycloak", "Keycloak fields must match the exact endpoint schema."))
        for key, expected in expected_keycloak.items():
            if configured_keycloak.get(key) != expected:
                findings.append(finding("Error", "KeycloakBoundary", f"keycloak.{key}", "The immutable issuer/loopback-admin boundary does not match."))
    retry = profile.get("retryPolicy")
    if not isinstance(retry, Mapping):
        findings.append(finding("Error", "RetryPolicy", "retryPolicy", "A bounded retry policy is required."))
    else:
        if set(retry) != {"maxAttempts", "initialDelayMs", "maxDelayMs"}:
            findings.append(finding("Error", "RetryField", "retryPolicy", "Retry fields must match the exact bounded schema."))
        attempts = retry.get("maxAttempts")
        initial = retry.get("initialDelayMs")
        maximum = retry.get("maxDelayMs")
        if isinstance(attempts, bool) or not isinstance(attempts, int) or not 1 <= attempts <= 5:
            findings.append(finding("Error", "RetryAttempts", "retryPolicy.maxAttempts", "Retry attempts must be 1..5."))
        if isinstance(initial, bool) or not isinstance(initial, int) or not 1 <= initial <= 2000:
            findings.append(finding("Error", "RetryDelay", "retryPolicy.initialDelayMs", "Initial delay must be 1..2000 ms."))
        if isinstance(maximum, bool) or not isinstance(maximum, int) or not 1 <= maximum <= 10000 or isinstance(initial, int) and maximum < initial:
            findings.append(finding("Error", "RetryMaximum", "retryPolicy.maxDelayMs", "Maximum delay must be bounded and not lower than the initial delay."))
    scope = profile.get("authorityScope")
    validated_consumers: list[tuple[int, Mapping[str, Any]]] = []
    if not isinstance(scope, Mapping) or scope.get("name") != AUTHORITY_SCOPE_NAME:
        findings.append(finding("Error", "AuthorityScope", "authorityScope.name", "The dedicated native authority scope name is fixed."))
    else:
        if set(scope) != {"name", "consumerProjections", "prohibitedFlatClaims"}:
            findings.append(finding("Error", "AuthorityScopeField", "authorityScope", "Authority-scope fields must match the exact schema."))
        consumers = scope.get("consumerProjections")
        if not isinstance(consumers, list) or not 1 <= len(consumers) <= 16:
            findings.append(finding("Error", "AuthorityConsumers", "authorityScope.consumerProjections", "Define 1..16 exact consumer-specific projections."))
            consumers = []
        seen_clients: set[str] = set()
        for index, consumer in enumerate(consumers):
            target = f"authorityScope.consumerProjections[{index}]"
            if not isinstance(consumer, Mapping):
                findings.append(finding("Error", "AuthorityConsumer", target, "A consumer projection object is required."))
                continue
            if set(consumer) != {
                "clientId", "audiences", "moduleId", "permission",
                "enabled", "redirectUris", "webOrigins",
            }:
                findings.append(finding("Error", "AuthorityConsumerField", target, "Consumer projection fields must match the exact schema."))
            client_id = consumer.get("clientId")
            if not isinstance(client_id, str) or not CLIENT_ID_PATTERN.fullmatch(client_id):
                findings.append(finding("Error", "AuthorityConsumerId", f"{target}.clientId", "A canonical consumer client ID is required."))
            elif client_id in seen_clients:
                findings.append(finding("Error", "AuthorityConsumerDuplicate", f"{target}.clientId", "Each consumer client ID must be unique."))
            elif client_id in RESERVED_CONSUMER_CLIENT_IDS or client_id.startswith("realm-"):
                findings.append(finding("Error", "AuthorityConsumerReserved", f"{target}.clientId", "Keycloak internal and service-principal clients cannot consume human authority."))
            else:
                seen_clients.add(client_id)
            audiences = consumer.get("audiences")
            canonical_audiences = unique_strings(audiences, maximum=8, pattern=AUDIENCE_PATTERN)
            if canonical_audiences is None or not canonical_audiences or audiences != canonical_audiences:
                findings.append(finding("Error", "AuthorityConsumerAudience", f"{target}.audiences", "Audiences must be a non-empty, unique, ordinally sorted canonical list."))
            module_id = consumer.get("moduleId")
            permission = consumer.get("permission")
            if not isinstance(module_id, str) or not MODULE_PATTERN.fullmatch(module_id):
                findings.append(finding("Error", "AuthorityConsumerModule", f"{target}.moduleId", "One canonical product ModuleId is required."))
            if (
                not isinstance(permission, str)
                or not PERMISSION_PATTERN.fullmatch(permission)
                or not isinstance(module_id, str)
                or permission[: permission.rfind(".")] != module_id
            ):
                findings.append(finding("Error", "AuthorityConsumerPermission", f"{target}.permission", "One permission belonging exactly to the consumer product module is required."))
            enabled = consumer.get("enabled")
            redirects = canonical_https_urls(
                consumer.get("redirectUris"), maximum=8, origin_only=False
            )
            origins = canonical_https_urls(
                consumer.get("webOrigins"), maximum=8, origin_only=True
            )
            if not isinstance(enabled, bool):
                findings.append(finding("Error", "AuthorityConsumerEnabled", f"{target}.enabled", "The browser client enabled posture must be explicit."))
            if redirects is None or consumer.get("redirectUris") != redirects:
                findings.append(finding("Error", "AuthorityConsumerRedirect", f"{target}.redirectUris", "Redirect URIs must be a unique sorted list of canonical absolute HTTPS callbacks without wildcard, port, query or fragment."))
            if origins is None or consumer.get("webOrigins") != origins:
                findings.append(finding("Error", "AuthorityConsumerOrigin", f"{target}.webOrigins", "Web origins must be a unique sorted list of canonical absolute HTTPS origins without wildcard, port, path, query or fragment."))
            if enabled is True and (not redirects or not origins):
                findings.append(finding("Error", "AuthorityConsumerBrowserPosture", target, "An enabled browser client requires explicit nonempty redirect and origin allowlists."))
            if enabled is False and (redirects or origins):
                findings.append(finding("Error", "AuthorityConsumerBrowserPosture", target, "A disabled browser client must keep redirect and origin allowlists empty until a separately reviewed activation profile exists."))
            pinned_posture = SOURCE_PINNED_CONSUMER_BROWSER_POSTURES.get(str(client_id))
            actual_posture = {
                "enabled": enabled,
                "redirectUris": consumer.get("redirectUris"),
                "webOrigins": consumer.get("webOrigins"),
            }
            if pinned_posture is None or actual_posture != pinned_posture:
                findings.append(finding("Error", "AuthorityConsumerSourcePin", target, "The browser client posture must match the separately reviewed source-pinned client callback contract."))
            validated_consumers.append((index, consumer))
        prohibited = scope.get("prohibitedFlatClaims")
        if not isinstance(prohibited, list) or any(not isinstance(item, str) for item in prohibited) or len(prohibited) != len(set(prohibited)) or set(prohibited) != FLAT_AUTHORITY_CLAIMS:
            findings.append(finding("Error", "FlatClaims", "authorityScope.prohibitedFlatClaims", "All four mixed-profile flat claims must be prohibited."))
    authority = profile.get("authority")
    tenant_ids: set[str] = set()
    if not isinstance(authority, Mapping):
        findings.append(finding("Error", "Authority", "authority", "Human authority declaration is required."))
    else:
        if set(authority) != {"subjectId", "selectedTenantId", "projectionVersion", "memberships", "audit"}:
            findings.append(finding("Error", "AuthorityField", "authority", "Authority fields must match the exact registry schema."))
        if normalized_uuid(authority.get("subjectId")) is None:
            findings.append(finding("Error", "SubjectId", "authority.subjectId", "A stable Keycloak user UUID is required."))
        projection_version = authority.get("projectionVersion")
        if isinstance(projection_version, bool) or not isinstance(projection_version, int) or not 1 <= projection_version <= JSON_SAFE_INTEGER:
            findings.append(finding("Error", "ProjectionVersion", "authority.projectionVersion", "A positive JSON safe integer is required."))
        memberships = authority.get("memberships")
        if not isinstance(memberships, list) or not 1 <= len(memberships) <= 32:
            findings.append(finding("Error", "MembershipRegistry", "authority.memberships", "The registry requires 1..32 memberships."))
            memberships = []
        for index, membership in enumerate(memberships):
            validate_membership(membership, index, findings)
            if isinstance(membership, Mapping):
                tenant_id = normalized_uuid(membership.get("tenant_id"))
                if tenant_id:
                    if tenant_id in tenant_ids:
                        findings.append(finding("Error", "DuplicateTenant", f"authority.memberships[{index}].tenant_id", "Each tenant membership must be unique."))
                    tenant_ids.add(tenant_id)
        selected = authority.get("selectedTenantId")
        if selected is not None:
            selected_id = normalized_uuid(selected)
            selected_memberships = [entry for entry in memberships if isinstance(entry, Mapping) and normalized_uuid(entry.get("tenant_id")) == selected_id]
            if selected_id is None or len(selected_memberships) != 1 or selected_memberships[0].get("status") != "active":
                findings.append(finding("Error", "SelectedTenant", "authority.selectedTenantId", "The selected projection must reference exactly one active registry membership."))
            elif validated_consumers:
                selected_membership_value = selected_memberships[0]
                selected_modules = selected_membership_value.get("enabled_modules")
                selected_permissions = selected_membership_value.get("permissions")
                for index, consumer in validated_consumers:
                    if (
                        not isinstance(selected_modules, list)
                        or consumer.get("moduleId") not in selected_modules
                        or not isinstance(selected_permissions, list)
                        or consumer.get("permission") not in selected_permissions
                    ):
                        findings.append(finding(
                            "Error",
                            "AuthorityConsumerGrant",
                            f"authorityScope.consumerProjections[{index}]",
                            "Every consumer projection must select one module and permission present in the active membership registry.",
                        ))
        validate_audit(authority.get("audit"), "authority.audit", findings)
    principals = profile.get("servicePrincipalRegistry")
    if not isinstance(principals, list) or len(principals) != 1:
        findings.append(finding("Error", "ServicePrincipalRegistry", "servicePrincipalRegistry", "Exactly one dedicated Office-to-Plant principal declaration is required."))
    else:
        validate_service_principal(principals[0], 0, tenant_ids, findings)
    validate_mutation_safety(profile, findings)
    return findings


def canonical_membership(entry: Mapping[str, Any], *, include_lifecycle: bool) -> dict[str, Any]:
    result: dict[str, Any] = {
        "tenant_id": str(normalized_uuid(entry["tenant_id"])),
        "permissions": sorted(entry["permissions"]),
        "enabled_modules": sorted(entry["enabled_modules"]),
    }
    for optional in ("tenant_type", "brand_skin"):
        if entry.get(optional) is not None:
            result[optional] = str(entry[optional]).strip()
    if include_lifecycle:
        result["membership_version"] = int(entry["membership_version"])
        result["status"] = str(entry["status"])
    return result


def consumer_projections(profile: Mapping[str, Any]) -> list[Mapping[str, Any]]:
    """Return consumer declarations in canonical client order after validation."""

    return sorted(profile["authorityScope"]["consumerProjections"], key=lambda item: str(item["clientId"]))


def consumer_scope_name(consumer: Mapping[str, Any]) -> str:
    """A client-specific scope prevents one product grant leaking to another client."""

    return f"{AUTHORITY_SCOPE_NAME}--{consumer['clientId']}"


def consumer_projection_attribute(consumer: Mapping[str, Any]) -> str:
    """Keep client IDs out of Keycloak user-attribute names while remaining deterministic."""

    suffix = hashlib.sha256(str(consumer["clientId"]).encode("utf-8")).hexdigest()[:16]
    return HUMAN_PROJECTION_ATTRIBUTE_PREFIX + suffix


def desired_consumer_scope(consumer: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "name": consumer_scope_name(consumer),
        "protocol": "openid-connect",
        "attributes": {
            "include.in.token.scope": "false",
            "display.on.consent.screen": "false",
        },
    }


def canonical_consumer_registry_entry(consumer: Mapping[str, Any]) -> dict[str, Any]:
    """Persist non-tokenized consumer intent so version changes are observable."""

    return {
        "client_id": str(consumer["clientId"]),
        "audiences": list(consumer["audiences"]),
        "module_id": str(consumer["moduleId"]),
        "permission": str(consumer["permission"]),
        "enabled": bool(consumer["enabled"]),
        "redirect_uris": list(consumer["redirectUris"]),
        "web_origins": list(consumer["webOrigins"]),
        "projection_attribute": consumer_projection_attribute(consumer),
        "scope_name": consumer_scope_name(consumer),
    }


def desired_consumer_security_profile(
    profile: Mapping[str, Any], consumer: Mapping[str, Any]
) -> dict[str, Any]:
    """Canonical security-critical Keycloak posture for one human consumer."""

    result = dict(profile["mutationSafety"]["consumerEligibilityPolicy"])
    result.update({
        "enabled": bool(consumer["enabled"]),
        "redirectUris": list(consumer["redirectUris"]),
        "webOrigins": list(consumer["webOrigins"]),
    })
    return result


def observed_consumer_security_profile(client: Any) -> dict[str, Any]:
    """Project only the allowlisted human-client security fields from Admin GET."""

    if not isinstance(client, Mapping):
        raise ProjectionProvisioningError("The human consumer client profile is malformed.")
    attributes = client.get("attributes")
    result = {name: client.get(name) for name in CLIENT_ELIGIBILITY_FIELDS}
    result["pkceCodeChallengeMethod"] = (
        attributes.get(PKCE_CLIENT_ATTRIBUTE) if isinstance(attributes, Mapping) else None
    )
    result["redirectUris"] = client.get("redirectUris")
    result["webOrigins"] = client.get("webOrigins")
    return result


def human_owned_attributes(profile: Mapping[str, Any], observed: Any = None) -> set[str]:
    """Own the configured per-client projections and detect retired projection attributes."""

    owned = set(HUMAN_OWNED_ATTRIBUTES)
    owned.update(consumer_projection_attribute(consumer) for consumer in consumer_projections(profile))
    if isinstance(observed, Mapping):
        owned.update(
            str(name)
            for name in observed
            if isinstance(name, str) and name.startswith(HUMAN_PROJECTION_ATTRIBUTE_PREFIX)
        )
    return owned


def consumer_token_projection(
    selected: Mapping[str, Any] | None,
    consumer: Mapping[str, Any],
) -> list[dict[str, Any]]:
    """Render the exact three-key, one-product wire grammar for one consumer."""

    if selected is None:
        return []
    return [{
        "tenant_id": str(normalized_uuid(selected["tenant_id"])),
        "permissions": [str(consumer["permission"])],
        "enabled_modules": [str(consumer["moduleId"])],
    }]


def selected_membership(profile: Mapping[str, Any]) -> Mapping[str, Any] | None:
    selected = nested(profile, "authority", "selectedTenantId")
    if selected is None:
        return None
    selected_id = normalized_uuid(selected)
    for entry in nested(profile, "authority", "memberships"):
        if normalized_uuid(entry.get("tenant_id")) == selected_id:
            return entry
    return None


def desired_human_attributes(profile: Mapping[str, Any]) -> dict[str, list[str]]:
    authority = profile["authority"]
    selected = selected_membership(profile)
    registry = [canonical_membership(entry, include_lifecycle=True) for entry in authority["memberships"]]
    registry.sort(key=lambda entry: entry["tenant_id"])
    audit = authority["audit"]
    result = {
        "spaceos_membership_registry": [stable_json(registry)],
        "spaceos_consumer_projection_registry": [stable_json([
            canonical_consumer_registry_entry(consumer)
            for consumer in consumer_projections(profile)
        ])],
        "spaceos_selected_membership_version": [str(selected["membership_version"] if selected else max(entry["membership_version"] for entry in authority["memberships"]))],
        "spaceos_projection_version": [str(authority["projectionVersion"])],
        "spaceos_authority_status": ["active" if selected else "inactive"],
        "spaceos_last_change_id": [str(audit["changeId"]).lower()],
        "spaceos_last_changed_at": [str(audit["changedAt"])],
        "spaceos_last_changed_by": [str(audit["actorId"])],
    }
    for consumer in consumer_projections(profile):
        result[consumer_projection_attribute(consumer)] = [
            stable_json(consumer_token_projection(selected, consumer))
        ]
    return result


def service_projection(principal: Mapping[str, Any]) -> dict[str, Any]:
    scope = principal["scope"]
    return {
        "principal_id": principal["clientId"],
        "tenant_id": str(normalized_uuid(scope["tenant_id"])),
        "project_ids": sorted(str(normalized_uuid(value)) for value in scope["project_ids"]),
        "station_ids": sorted(scope["station_ids"]),
        "permissions": sorted(scope["permissions"]),
    }


def desired_service_attributes(principal: Mapping[str, Any]) -> dict[str, list[str]]:
    audit = principal["audit"]
    return {
        "spaceos_service_principal": [stable_json(service_projection(principal))],
        "spaceos_membership_version": [str(principal["membershipVersion"])],
        "spaceos_projection_version": [str(principal["projectionVersion"])],
        "spaceos_principal_status": [str(principal["status"])],
        "spaceos_key_rotation": [stable_json(principal["keyRotation"])],
        "spaceos_last_change_id": [str(audit["changeId"]).lower()],
        "spaceos_last_changed_at": [str(audit["changedAt"])],
        "spaceos_last_changed_by": [str(audit["actorId"])],
    }


def human_mappers(consumer: Mapping[str, Any]) -> list[dict[str, Any]]:
    def attribute_mapper(name: str, attribute: str, claim: str, json_type: str) -> dict[str, Any]:
        return {
            "name": name,
            "protocol": "openid-connect",
            "protocolMapper": "oidc-usermodel-attribute-mapper",
            "config": {
                "user.attribute": attribute,
                "claim.name": claim,
                "jsonType.label": json_type,
                "access.token.claim": "true",
                "id.token.claim": "false",
                "userinfo.token.claim": "false",
                "introspection.token.claim": "true",
                "multivalued": "false",
            },
        }
    mappers = [
        attribute_mapper(
            "spaceos-native-tenant-authority",
            consumer_projection_attribute(consumer),
            "spaceos_tenants",
            "JSON",
        ),
        attribute_mapper("spaceos-membership-version", "spaceos_selected_membership_version", "spaceos_membership_version", "long"),
        attribute_mapper("spaceos-projection-version", "spaceos_projection_version", "spaceos_projection_version", "long"),
    ]
    for index, audience in enumerate(consumer["audiences"]):
        mappers.append({
            "name": f"spaceos-consumer-audience-{index + 1}",
            "protocol": "openid-connect",
            "protocolMapper": "oidc-audience-mapper",
            "config": {
                "included.custom.audience": audience,
                "access.token.claim": "true",
                "id.token.claim": "false",
                "introspection.token.claim": "true",
            },
        })
    return mappers


def service_mappers(principal: Mapping[str, Any]) -> list[dict[str, Any]]:
    def attribute_mapper(name: str, attribute: str, claim: str, json_type: str) -> dict[str, Any]:
        return {
            "name": name,
            "protocol": "openid-connect",
            "protocolMapper": "oidc-usermodel-attribute-mapper",
            "config": {
                "user.attribute": attribute,
                "claim.name": claim,
                "jsonType.label": json_type,
                "access.token.claim": "true",
                "id.token.claim": "false",
                "userinfo.token.claim": "false",
                "introspection.token.claim": "true",
                "multivalued": "false",
            },
        }
    return [
        attribute_mapper("spaceos-service-principal", "spaceos_service_principal", "spaceos_service_principal", "JSON"),
        attribute_mapper("spaceos-service-membership-version", "spaceos_membership_version", "spaceos_membership_version", "long"),
        attribute_mapper("spaceos-service-projection-version", "spaceos_projection_version", "spaceos_projection_version", "long"),
        {
            "name": "joinerytech-plant-api-audience",
            "protocol": "openid-connect",
            "protocolMapper": "oidc-audience-mapper",
            "config": {
                "included.custom.audience": principal["audience"],
                "access.token.claim": "true",
                "id.token.claim": "false",
                "introspection.token.claim": "true",
            },
        },
    ]


def desired_service_client(principal: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "clientId": principal["clientId"],
        "name": "JoineryTech Office to Plant service principal",
        "description": "Dedicated tenant/project/station-scoped DPEX machine identity.",
        "enabled": principal["status"] == "active",
        "protocol": "openid-connect",
        "publicClient": False,
        "bearerOnly": False,
        "standardFlowEnabled": False,
        "implicitFlowEnabled": False,
        "directAccessGrantsEnabled": False,
        "serviceAccountsEnabled": True,
        "authorizationServicesEnabled": False,
        "fullScopeAllowed": False,
        "clientAuthenticatorType": "client-secret",
        "redirectUris": [],
        "webOrigins": [],
        "defaultClientScopes": [],
        "optionalClientScopes": [],
        "attributes": {
            "spaceos.registry.owner": "provision_keycloak_tenant_projection.py",
            "spaceos.expected.azp": principal["clientId"],
            "spaceos.expected.aud": principal["audience"],
            "oauth2.device.authorization.grant.enabled": "false",
            "oidc.ciba.grant.enabled": "false",
        },
    }


def owned_attribute_drift(observed: Any, desired: Mapping[str, list[str]], owned: set[str]) -> bool:
    attributes = observed if isinstance(observed, Mapping) else {}
    for name in owned:
        expected = desired.get(name)
        actual = attributes.get(name)
        if expected is None:
            if actual is not None:
                return True
        elif actual != expected:
            return True
    return False


def single_attribute(attributes: Any, name: str) -> str | None:
    if not isinstance(attributes, Mapping):
        return None
    value = attributes.get(name)
    if not isinstance(value, list) or len(value) != 1 or not isinstance(value[0], str):
        return None
    return value[0]


def attribute_integer(attributes: Any, name: str) -> int | None:
    raw = single_attribute(attributes, name)
    if raw is None or not raw.isdigit():
        return None
    value = int(raw)
    return value if value >= 0 else None


def attribute_json(attributes: Any, name: str) -> Any:
    raw = single_attribute(attributes, name)
    if raw is None:
        return None
    try:
        return strict_json_loads(raw)
    except (json.JSONDecodeError, ProjectionProvisioningError):
        return None


def human_version_blockers(profile: Mapping[str, Any], observed_attributes: Any) -> list[str]:
    """Protect exact-replace from version rollback and unversioned authority change."""

    if not isinstance(observed_attributes, Mapping):
        return []
    owned = human_owned_attributes(profile, observed_attributes)
    if "spaceos_membership_registry" not in observed_attributes:
        if (owned - FLAT_AUTHORITY_CLAIMS).intersection(observed_attributes):
            return ["Existing owned authority attributes are partial; manual incident review is required."]
        return []
    previous_registry = attribute_json(observed_attributes, "spaceos_membership_registry")
    previous_consumer_registry = attribute_json(
        observed_attributes, "spaceos_consumer_projection_registry"
    )
    previous_selected_version = attribute_integer(observed_attributes, "spaceos_selected_membership_version")
    previous_projection_version = attribute_integer(observed_attributes, "spaceos_projection_version")
    previous_status = single_attribute(observed_attributes, "spaceos_authority_status")
    if (
        not isinstance(previous_registry, list)
        or not previous_registry
        or not isinstance(previous_consumer_registry, list)
        or not previous_consumer_registry
        or len(previous_consumer_registry) > 16
        or previous_selected_version is None
        or previous_selected_version < 1
        or previous_projection_version is None
        or previous_projection_version < 1
        or previous_status not in {"active", "inactive"}
    ):
        return ["Existing owned authority attributes are malformed; manual incident review is required."]
    if "spaceos_tenants" in observed_attributes:
        return ["The broad legacy tenant projection cannot be safely adopted as a consumer-specific authority attribute."]
    previous_by_tenant: dict[str, Mapping[str, Any]] = {}
    for entry in previous_registry:
        if not isinstance(entry, Mapping) or normalized_uuid(entry.get("tenant_id")) is None:
            return ["Existing membership registry is not canonical."]
        tenant_id = str(normalized_uuid(entry["tenant_id"]))
        if tenant_id in previous_by_tenant:
            return ["Existing membership registry contains duplicate tenants."]
        allowed_fields = {
            "tenant_id",
            "tenant_type",
            "brand_skin",
            "permissions",
            "enabled_modules",
            "membership_version",
            "status",
        }
        required_fields = {
            "tenant_id",
            "permissions",
            "enabled_modules",
            "membership_version",
            "status",
        }
        if not required_fields.issubset(entry) or set(entry) - allowed_fields:
            return ["Existing membership registry is not canonical."]
        try:
            canonical_entry = canonical_membership(entry, include_lifecycle=True)
        except (KeyError, TypeError, ValueError):
            return ["Existing membership registry is not canonical."]
        if (
            stable_json(entry) != stable_json(canonical_entry)
            or entry.get("status") not in {"active", "revoked", "deactivated"}
            or isinstance(entry.get("membership_version"), bool)
            or not isinstance(entry.get("membership_version"), int)
            or int(entry["membership_version"]) < 1
        ):
            return ["Existing membership registry is not canonical."]
        previous_by_tenant[tenant_id] = entry
    previous_consumers_by_attribute: dict[str, Mapping[str, Any]] = {}
    previous_consumer_ids: set[str] = set()
    for entry in previous_consumer_registry:
        if not isinstance(entry, Mapping) or set(entry) != {
            "client_id",
            "audiences",
            "module_id",
            "permission",
            "enabled",
            "redirect_uris",
            "web_origins",
            "projection_attribute",
            "scope_name",
        }:
            return ["Existing consumer projection registry is not canonical."]
        client_id = entry.get("client_id")
        audiences = entry.get("audiences")
        canonical_audiences = unique_strings(audiences, maximum=8, pattern=AUDIENCE_PATTERN)
        module_id = entry.get("module_id")
        permission = entry.get("permission")
        enabled = entry.get("enabled")
        redirect_uris = entry.get("redirect_uris")
        web_origins = entry.get("web_origins")
        projection_attribute = entry.get("projection_attribute")
        scope_name = entry.get("scope_name")
        synthetic_consumer = {
            "clientId": client_id,
            "audiences": audiences,
            "moduleId": module_id,
            "permission": permission,
            "enabled": enabled,
            "redirectUris": redirect_uris,
            "webOrigins": web_origins,
        }
        canonical_redirects = canonical_https_urls(
            redirect_uris, maximum=8, origin_only=False
        )
        canonical_origins = canonical_https_urls(
            web_origins, maximum=8, origin_only=True
        )
        pinned_posture = SOURCE_PINNED_CONSUMER_BROWSER_POSTURES.get(str(client_id))
        if (
            not isinstance(client_id, str)
            or not CLIENT_ID_PATTERN.fullmatch(client_id)
            or client_id in RESERVED_CONSUMER_CLIENT_IDS
            or client_id.startswith("realm-")
            or client_id in previous_consumer_ids
            or canonical_audiences is None
            or not canonical_audiences
            or audiences != canonical_audiences
            or not isinstance(module_id, str)
            or not MODULE_PATTERN.fullmatch(module_id)
            or not isinstance(permission, str)
            or not PERMISSION_PATTERN.fullmatch(permission)
            or permission[: permission.rfind(".")] != module_id
            or not isinstance(enabled, bool)
            or canonical_redirects is None
            or redirect_uris != canonical_redirects
            or canonical_origins is None
            or web_origins != canonical_origins
            or pinned_posture != {
                "enabled": enabled,
                "redirectUris": redirect_uris,
                "webOrigins": web_origins,
            }
            or projection_attribute != consumer_projection_attribute(synthetic_consumer)
            or scope_name != consumer_scope_name(synthetic_consumer)
            or stable_json(entry) != stable_json(canonical_consumer_registry_entry(synthetic_consumer))
            or projection_attribute in previous_consumers_by_attribute
        ):
            return ["Existing consumer projection registry is not canonical."]
        previous_consumer_ids.add(client_id)
        previous_consumers_by_attribute[str(projection_attribute)] = entry
    if [entry["client_id"] for entry in previous_consumer_registry] != sorted(previous_consumer_ids):
        return ["Existing consumer projection registry is not in canonical client order."]
    observed_projection_attributes = sorted(
        name
        for name in observed_attributes
        if isinstance(name, str) and name.startswith(HUMAN_PROJECTION_ATTRIBUTE_PREFIX)
    )
    if set(observed_projection_attributes) != set(previous_consumers_by_attribute):
        return ["Existing consumer projection attributes do not exactly match their non-tokenized registry."]
    previous_projections: dict[str, list[dict[str, Any]]] = {}
    projected_tenant_ids: set[str] = set()
    projected_registry_entry: Mapping[str, Any] | None = None
    for attribute_name in observed_projection_attributes:
        projection = attribute_json(observed_attributes, attribute_name)
        if not isinstance(projection, list) or len(projection) > 1:
            return ["Existing consumer-specific tenant projection is malformed."]
        if not projection:
            previous_projections[attribute_name] = []
            continue
        projected = projection[0]
        if not isinstance(projected, Mapping) or set(projected) != {
            "tenant_id",
            "permissions",
            "enabled_modules",
        }:
            return ["Existing consumer-specific tenant projection is not the exact three-key wire shape."]
        tenant_id = normalized_uuid(projected.get("tenant_id"))
        permissions = unique_strings(projected.get("permissions"), maximum=1, pattern=PERMISSION_PATTERN)
        modules = unique_strings(projected.get("enabled_modules"), maximum=1, pattern=MODULE_PATTERN)
        if (
            tenant_id is None
            or permissions is None
            or len(permissions) != 1
            or projected.get("permissions") != permissions
            or modules is None
            or len(modules) != 1
            or projected.get("enabled_modules") != modules
            or permissions[0][: permissions[0].rfind(".")] != modules[0]
        ):
            return ["Existing consumer-specific tenant projection is not canonical."]
        registry_entry = previous_by_tenant.get(str(tenant_id))
        consumer_registry_entry = previous_consumers_by_attribute[attribute_name]
        if (
            registry_entry is None
            or registry_entry.get("status") != "active"
            or permissions[0] not in registry_entry.get("permissions", [])
            or modules[0] not in registry_entry.get("enabled_modules", [])
            or permissions != [consumer_registry_entry["permission"]]
            or modules != [consumer_registry_entry["module_id"]]
        ):
            return ["Existing consumer-specific tenant projection is not backed by one active membership grant."]
        previous_projections[attribute_name] = [dict(projected)]
        projected_tenant_ids.add(str(tenant_id))
        projected_registry_entry = registry_entry
    if len(projected_tenant_ids) > 1:
        return ["Consumer projections disagree on the selected tenant."]
    if previous_status == "active":
        if not projected_tenant_ids or any(not projection for projection in previous_projections.values()):
            return ["Active authority requires every existing consumer projection to select the same tenant."]
        if projected_registry_entry is None:
            return ["Existing active tenant projection is not backed by the registry."]
        expected_selected_version = projected_registry_entry["membership_version"]
        expected_status = "active"
    else:
        if projected_tenant_ids:
            return ["Inactive authority cannot retain an active consumer projection."]
        expected_selected_version = max(int(entry["membership_version"]) for entry in previous_registry)
        expected_status = "inactive"
    if previous_selected_version != expected_selected_version or previous_status != expected_status:
        return ["Existing selected membership version/status does not match the authoritative registry."]
    desired_registry = [canonical_membership(entry, include_lifecycle=True) for entry in profile["authority"]["memberships"]]
    desired_by_tenant = {entry["tenant_id"]: entry for entry in desired_registry}
    blockers: list[str] = []
    removed = set(previous_by_tenant) - set(desired_by_tenant)
    if removed:
        blockers.append("Membership rows cannot be deleted; revoke or deactivate them with a version increment.")
    transitions: set[str] = set()
    for tenant_id, desired in desired_by_tenant.items():
        previous = previous_by_tenant.get(tenant_id)
        if previous is None:
            transitions.add("bootstrap")
            continue
        old_version = previous.get("membership_version")
        new_version = desired["membership_version"]
        if isinstance(old_version, bool) or not isinstance(old_version, int) or old_version < 1:
            blockers.append("Existing membership version is malformed.")
            continue
        if new_version < old_version:
            blockers.append("Membership version rollback is forbidden.")
        if stable_json(previous) != stable_json(desired) and new_version <= old_version:
            blockers.append("Every membership/status/permission replacement must increment membership_version.")
        old_status = previous.get("status")
        new_status = desired.get("status")
        if old_status != new_status:
            if new_status == "revoked":
                transitions.add("revoke")
            elif new_status == "deactivated":
                transitions.add("deactivate")
            elif new_status == "active":
                transitions.add("reactivate")
        elif stable_json(previous) != stable_json(desired):
            transitions.add("replace")
    selected = selected_membership(profile)
    desired_projections = {
        consumer_projection_attribute(consumer): consumer_token_projection(selected, consumer)
        for consumer in consumer_projections(profile)
    }
    desired_consumer_registry = [
        canonical_consumer_registry_entry(consumer)
        for consumer in consumer_projections(profile)
    ]
    desired_projection_version = profile["authority"]["projectionVersion"]
    if desired_projection_version < previous_projection_version:
        blockers.append("Projection version rollback is forbidden.")
    if (
        stable_json(previous_projections) != stable_json(desired_projections)
        or stable_json(previous_consumer_registry) != stable_json(desired_consumer_registry)
    ):
        if desired_projection_version <= previous_projection_version:
            blockers.append("Consumer-specific token authority changes require a projection_version increment and a fresh token.")
        previous_tenant_id = next(iter(projected_tenant_ids), None)
        desired_tenant_id = str(normalized_uuid(selected["tenant_id"])) if selected else None
        transitions.add("select-tenant" if previous_tenant_id != desired_tenant_id else "replace")
    action = profile["authority"]["audit"]["action"]
    lifecycle_transitions = transitions & {"revoke", "deactivate", "reactivate"}
    if len(lifecycle_transitions) > 1:
        blockers.append("A single audited apply cannot combine different lifecycle transitions.")
    elif lifecycle_transitions and action not in lifecycle_transitions:
        blockers.append("Audit action must name the membership lifecycle transition.")
    elif not lifecycle_transitions and "select-tenant" in transitions and action != "select-tenant":
        blockers.append("Audit action must be select-tenant when active token authority changes.")
    elif not lifecycle_transitions and "replace" in transitions and action != "replace":
        blockers.append("Audit action must be replace for an authority grant replacement.")
    return sorted(set(blockers))


def service_version_blockers(principal: Mapping[str, Any], observed_attributes: Any) -> list[str]:
    if not isinstance(observed_attributes, Mapping):
        return []
    if "spaceos_service_principal" not in observed_attributes:
        if SERVICE_VERSIONED_ATTRIBUTES.intersection(observed_attributes):
            return ["Existing service-principal registry attributes are partial; manual incident review is required."]
        return []
    previous_projection = attribute_json(observed_attributes, "spaceos_service_principal")
    previous_rotation = attribute_json(observed_attributes, "spaceos_key_rotation")
    old_membership_version = attribute_integer(observed_attributes, "spaceos_membership_version")
    old_projection_version = attribute_integer(observed_attributes, "spaceos_projection_version")
    old_status = single_attribute(observed_attributes, "spaceos_principal_status")
    if (
        not isinstance(previous_projection, Mapping)
        or not isinstance(previous_rotation, Mapping)
        or old_membership_version is None
        or old_membership_version < 1
        or old_projection_version is None
        or old_projection_version < 1
        or old_status not in {"disabled", "active", "revoked", "deactivated"}
    ):
        return ["Existing service-principal registry attributes are malformed; manual incident review is required."]
    blockers: list[str] = []
    desired_projection = service_projection(principal)
    if principal["membershipVersion"] < old_membership_version:
        blockers.append("Service-principal membership version rollback is forbidden.")
    if principal["projectionVersion"] < old_projection_version:
        blockers.append("Service-principal projection version rollback is forbidden.")
    membership_changed = old_status != principal["status"]
    projection_changed = stable_json(previous_projection) != stable_json(desired_projection)
    rotation_changed = stable_json(previous_rotation) != stable_json(principal["keyRotation"])
    if membership_changed and principal["membershipVersion"] <= old_membership_version:
        blockers.append("Revoke/deactivate/reactivate must increment the service-principal membership version.")
    if projection_changed and principal["projectionVersion"] <= old_projection_version:
        blockers.append("Tenant/project/station scope replacement must increment the service-principal projection version.")
    if rotation_changed:
        old_key_version = previous_rotation.get("activeVersion")
        new_key_version = principal["keyRotation"].get("activeVersion")
        if isinstance(old_key_version, bool) or not isinstance(old_key_version, int) or not isinstance(new_key_version, int) or new_key_version <= old_key_version:
            blockers.append("Key rotation metadata can change only with a strictly higher active key version.")
        if principal["audit"]["action"] != "rotate-key":
            blockers.append("Key rotation metadata changes require an audited rotate-key action.")
    expected_action = {"revoked": "revoke", "deactivated": "deactivate", "active": "reactivate"}.get(principal["status"])
    if membership_changed and principal["audit"]["action"] != expected_action:
        blockers.append("Audit action must name the service-principal lifecycle transition.")
    return sorted(set(blockers))


def exact_mapper_equal(observed: Mapping[str, Any], desired: Mapping[str, Any]) -> bool:
    return all(observed.get(name) == desired.get(name) for name in ("name", "protocol", "protocolMapper")) and observed.get("config") == desired.get("config")


def desired_contract(profile: Mapping[str, Any]) -> dict[str, Any]:
    principal = profile["servicePrincipalRegistry"][0]
    selected = selected_membership(profile)
    return {
        "human": {
            "subjectKey": opaque_target(profile["authority"]["subjectId"]),
            "selectedTenantCount": 1 if selected else 0,
            "selectedTenantKey": opaque_target(selected["tenant_id"]) if selected else None,
            "membershipCount": len(profile["authority"]["memberships"]),
            "membershipVersion": selected["membership_version"] if selected else max(
                entry["membership_version"] for entry in profile["authority"]["memberships"]
            ),
            "projectionVersion": profile["authority"]["projectionVersion"],
            "claim": "spaceos_tenants",
            "entryKeys": ["enabled_modules", "permissions", "tenant_id"],
            "productGrantCardinality": {"enabledModules": 1, "permissions": 1},
            "flatClaims": "prohibited",
            "consumers": [
                {
                    "clientId": consumer["clientId"],
                    "scopeName": consumer_scope_name(consumer),
                    "audiences": list(consumer["audiences"]),
                    "moduleId": consumer["moduleId"],
                    "permission": consumer["permission"],
                    "enabled": consumer["enabled"],
                    "redirectUris": list(consumer["redirectUris"]),
                    "webOrigins": list(consumer["webOrigins"]),
                    "pkceCodeChallengeMethod": profile["mutationSafety"]["consumerEligibilityPolicy"]["pkceCodeChallengeMethod"],
                    "browserActivationEvidence": False,
                    "projectionDigest": digest(consumer_token_projection(selected, consumer)),
                }
                for consumer in consumer_projections(profile)
            ],
        },
        "servicePrincipal": {
            "clientId": principal["clientId"],
            "audience": principal["audience"],
            "azp": principal["clientId"],
            "status": principal["status"],
            "scopeDigest": digest(service_projection(principal)),
            "keyRotationDigest": digest(principal["keyRotation"]),
        },
        "audit": {
            "authorityChangeId": profile["authority"]["audit"]["changeId"],
            "authorityAction": profile["authority"]["audit"]["action"],
            "servicePrincipalChangeId": principal["audit"]["changeId"],
            "servicePrincipalAction": principal["audit"]["action"],
        },
        "readback": {
            "strategy": "exact-replace-then-online-reread",
            "staleTokenDecision": "deny-unless-online-membership-and-projection-versions-match-active-registry",
            "retry": dict(profile["retryPolicy"]),
        },
    }


def offline_plan(profile: Mapping[str, Any]) -> list[dict[str, Any]]:
    consumers = consumer_projections(profile)
    principal = profile["servicePrincipalRegistry"][0]
    steps: list[dict[str, Any]] = [
        {"step": "human-membership-registry", "action": "ObserveThenExactReplace", "target": opaque_target(profile["authority"]["subjectId"]), "readback": "GET user by immutable ID; compare owned attributes byte-for-byte after canonicalization."},
    ]
    for consumer in consumers:
        binding_readback = "GET direct and attached-scope mappers; only this consumer's one-product authority scope may emit a protected claim."
        if consumer["enabled"] is False:
            binding_readback += " The source-pinned browser client remains disabled/default-off."
        steps.extend([
            {"step": "native-authority-client-scope", "action": "ObserveThenExactReplace", "target": consumer_scope_name(consumer), "readback": "GET this consumer-only scope and its exact projection/version/audience mapper set."},
            {"step": "consumer-browser-security-posture", "action": "Required", "target": consumer["clientId"], "readback": "GET exact enabled state, source-pinned HTTPS redirect/origin allowlists, public Authorization Code flags and S256 PKCE."},
            {"step": "consumer-scope-binding", "action": "ObserveThenAttach", "target": consumer["clientId"], "readback": binding_readback},
        ])
        if consumer["enabled"] is False:
            steps.append({
                "step": "consumer-browser-activation",
                "action": "Block",
                "target": consumer["clientId"],
                "readback": "Browser authentication remains activation-not-ready: no source-pinned redirect/origin contract exists and the client must stay disabled.",
            })
    for blocker in mutation_safety_blockers(profile):
        steps.append({
            "step": "signed-receipt-verification",
            "action": "Block",
            "target": REALM,
            "readback": blocker,
        })
    steps.extend([
        {"step": "office-to-plant-client", "action": "ObserveThenExactReplace", "target": principal["clientId"], "readback": "GET full client representation; exact azp/audience and grant flags must converge."},
        {"step": "office-to-plant-service-account", "action": "ObserveThenExactReplace", "target": principal["clientId"], "readback": "GET service-account user; compare tenant/project/station scope, versions, lifecycle and rotation metadata."},
        {"step": "realm-client-reverse-binding-inventory", "action": "Required", "target": REALM, "readback": "Two complete stable passes must enumerate every realm client, direct/attached mapper and default/optional scope edge against the signed allowlist."},
        {"step": "stale-state-reread", "action": "Required", "target": REALM, "readback": "Immediately before mutation, re-observe the allowlisted owned/guard subset and compare its SHA-256 fingerprint exactly."},
        {"step": "service-disable-compensation", "action": "Required", "target": principal["clientId"], "readback": "Stage disabled before every mutation and prove disabled by fresh readback after every error or uncertain outcome."},
        {"step": "post-apply-authority-readback", "action": "Required", "target": REALM, "readback": "Inside the future serialized writer failure boundary, repeat every observation; any exception or nonzero action must prove the service disabled before returning. Then issue fresh tokens in the separate OIDC/JWKS E2E gate."},
        {"step": "keycloak-atomic-cas", "action": "Block", "target": REALM, "readback": "Classic Admin REST exposes no strong atomic conditional update for these resources; a serialized server-side writer/lock/SPI is required before apply can exist."},
    ])
    return steps


def admin_realm_url(profile: Mapping[str, Any], suffix: str = "") -> str:
    base = keycloak.endpoint(profile["keycloak"]["adminBaseUrl"], "/admin/realms/" + urllib.parse.quote(profile["keycloak"]["realm"], safe=""))
    return base + suffix


def request(profile: Mapping[str, Any], method: str, url: str, *, token: str, body: Mapping[str, Any] | None = None, timeout_seconds: int) -> Any:
    if method != "GET":
        raise ProjectionProvisioningError(
            "Classic Keycloak Admin REST mutation is hard-disabled; a serialized server-side writer/SPI is required."
        )
    policy = profile["retryPolicy"]
    # A mutation may have committed before a transport error. Never replay it
    # blindly; only read-only GET gets a classified transient retry.
    attempts = policy["maxAttempts"] if method == "GET" else 1
    delay = policy["initialDelayMs"] / 1000
    for attempt in range(1, attempts + 1):
        try:
            return keycloak.request_json(method, url, token=token, body=body, timeout_seconds=timeout_seconds)
        except keycloak.KeycloakRequestError as error:
            if attempt == attempts or not error.retryable:
                raise
            time.sleep(delay)
            delay = min(delay * 2, policy["maxDelayMs"] / 1000)
    raise AssertionError("unreachable")


def exact_client(profile: Mapping[str, Any], token: str, client_id: str, timeout_seconds: int) -> Mapping[str, Any] | None:
    response = request(profile, "GET", admin_realm_url(profile, "/clients?clientId=" + urllib.parse.quote(client_id, safe="")), token=token, timeout_seconds=timeout_seconds)
    if not isinstance(response, list):
        raise ProjectionProvisioningError("Keycloak client lookup returned an unexpected representation.")
    matches = [item for item in response if isinstance(item, Mapping) and item.get("clientId") == client_id]
    if len(matches) > 1:
        raise ProjectionProvisioningError("Keycloak returned duplicate exact client IDs.")
    if not matches:
        return None
    internal_id = matches[0].get("id")
    if not isinstance(internal_id, str) or not internal_id:
        raise ProjectionProvisioningError("A Keycloak client has no stable identifier.")
    detail = request(profile, "GET", admin_realm_url(profile, "/clients/" + urllib.parse.quote(internal_id, safe="")), token=token, timeout_seconds=timeout_seconds)
    if (
        not isinstance(detail, Mapping)
        or detail.get("id") != internal_id
        or detail.get("clientId") != client_id
    ):
        raise ProjectionProvisioningError("Keycloak client detail returned an unexpected representation.")
    return detail


def observe_mappers(profile: Mapping[str, Any], token: str, base_path: str, timeout_seconds: int) -> list[Mapping[str, Any]]:
    response = request(profile, "GET", admin_realm_url(profile, base_path + "/protocol-mappers/models"), token=token, timeout_seconds=timeout_seconds)
    if not isinstance(response, list):
        raise ProjectionProvisioningError("Keycloak mapper lookup returned an unexpected representation.")
    if any(not isinstance(item, Mapping) for item in response):
        raise ProjectionProvisioningError("Every observed Keycloak mapper must be an object.")
    mappers = list(response)
    index_observed_mappers(mappers)
    return mappers


def index_observed_mappers(
    mappers: Sequence[Mapping[str, Any]],
) -> dict[str, Mapping[str, Any]]:
    """Validate live Admin mapper identities without weakening desired DTO checks."""

    result: dict[str, Mapping[str, Any]] = {}
    ids: set[str] = set()
    for mapper in mappers:
        mapper_id = mapper.get("id")
        name = mapper.get("name")
        protocol = mapper.get("protocol")
        protocol_mapper = mapper.get("protocolMapper")
        config = mapper.get("config")
        if (
            canonical_resource_uuid(mapper_id) is None
            or bounded_inventory_identity(name) is None
            or bounded_inventory_identity(protocol) is None
            or bounded_inventory_identity(protocol_mapper) is None
            or not isinstance(config, Mapping)
            or any(
                bounded_inventory_identity(key) is None
                or not isinstance(value, str)
                or len(value) > 4096
                or any(ord(character) < 0x20 or ord(character) == 0x7F for character in value)
                for key, value in config.items()
            )
        ):
            raise ProjectionProvisioningError("An observed Keycloak mapper has a malformed identity or representation.")
        if mapper_id in ids or name in result:
            raise ProjectionProvisioningError("Duplicate observed Keycloak mapper names or IDs block convergence.")
        ids.add(str(mapper_id))
        result[str(name)] = mapper
    return result


def index_mappers(mappers: Sequence[Mapping[str, Any]]) -> dict[str, Mapping[str, Any]]:
    """Index exact mapper names without last-wins ambiguity."""

    result: dict[str, Mapping[str, Any]] = {}
    ids: set[str] = set()
    for mapper in mappers:
        name = mapper.get("name")
        if not isinstance(name, str) or not name:
            raise ProjectionProvisioningError("Every Keycloak mapper must have a nonblank name.")
        if name in result:
            raise ProjectionProvisioningError("Duplicate Keycloak mapper names block convergence.")
        mapper_id = mapper.get("id")
        if mapper_id is not None:
            if not isinstance(mapper_id, str) or not mapper_id or mapper_id in ids:
                raise ProjectionProvisioningError("Duplicate or malformed Keycloak mapper IDs block convergence.")
            ids.add(mapper_id)
        result[name] = mapper
    return result


def observe_client_scopes(profile: Mapping[str, Any], token: str, timeout_seconds: int) -> dict[str, Mapping[str, Any]]:
    """Read the complete non-paginated Keycloak client-scope collection.

    Keycloak's classic Admin REST documents no first/max parameters for this
    endpoint.  A strict configured upper bound therefore fails closed instead
    of pretending that an oversized or truncated response is complete.
    """

    response = request(profile, "GET", admin_realm_url(profile, "/client-scopes"), token=token, timeout_seconds=timeout_seconds)
    if not isinstance(response, list):
        raise ProjectionProvisioningError("Keycloak client-scope lookup returned an unexpected representation.")
    inventory = profile["mutationSafety"]["inventoryPolicy"]
    maximum_items = int(inventory["pageSize"]) * int(inventory["maxPages"])
    if len(response) > maximum_items:
        raise ProjectionProvisioningError("The complete client-scope collection exceeds the reviewed inventory bound.")
    scopes: dict[str, Mapping[str, Any]] = {}
    ids: set[str] = set()
    for item in response:
        if (
            not isinstance(item, Mapping)
            or bounded_inventory_identity(item.get("name")) is None
            or canonical_resource_uuid(item.get("id")) is None
        ):
            raise ProjectionProvisioningError("Every Keycloak client scope must have a stable name and identifier.")
        name = str(item["name"])
        scope_id = str(item["id"])
        if name in scopes or scope_id in ids:
            raise ProjectionProvisioningError("Duplicate Keycloak client-scope names or IDs block convergence.")
        detail = request(
            profile,
            "GET",
            admin_realm_url(profile, "/client-scopes/" + urllib.parse.quote(scope_id, safe="")),
            token=token,
            timeout_seconds=timeout_seconds,
        )
        if not isinstance(detail, Mapping) or detail.get("id") != scope_id or detail.get("name") != name:
            raise ProjectionProvisioningError("Keycloak client-scope detail changed identity during inventory.")
        scopes[name] = detail
        ids.add(scope_id)
    return scopes


def client_scope_catalog_maps(
    scopes: Mapping[str, Mapping[str, Any]],
) -> tuple[dict[str, str], dict[str, str]]:
    """Build an unambiguous immutable name/ID catalog from complete scope inventory."""

    by_name: dict[str, str] = {}
    by_id: dict[str, str] = {}
    for catalog_name, scope in scopes.items():
        name = scope.get("name") if isinstance(scope, Mapping) else None
        scope_id = scope.get("id") if isinstance(scope, Mapping) else None
        if (
            bounded_inventory_identity(catalog_name) is None
            or name != catalog_name
            or bounded_inventory_identity(name) is None
            or canonical_resource_uuid(scope_id) is None
            or name in by_name
            or scope_id in by_id
        ):
            raise ProjectionProvisioningError("The complete client-scope catalog has an ambiguous name/ID identity.")
        by_name[str(name)] = str(scope_id)
        by_id[str(scope_id)] = str(name)
    return by_name, by_id


def observe_realm_clients(
    profile: Mapping[str, Any], token: str, timeout_seconds: int,
    client_scopes: Mapping[str, Mapping[str, Any]],
) -> list[dict[str, Any]]:
    """Enumerate every realm client through bounded, progress-checked pages."""

    policy = profile["mutationSafety"]["inventoryPolicy"]
    page_size = int(policy["pageSize"])
    max_pages = int(policy["maxPages"])
    summaries: list[Mapping[str, Any]] = []
    seen_ids: set[str] = set()
    seen_client_ids: set[str] = set()
    complete = False
    for page_index in range(max_pages):
        first = page_index * page_size
        response = request(
            profile,
            "GET",
            admin_realm_url(profile, f"/clients?first={first}&max={page_size}"),
            token=token,
            timeout_seconds=timeout_seconds,
        )
        if not isinstance(response, list) or len(response) > page_size:
            raise ProjectionProvisioningError("Keycloak client inventory page is malformed or exceeds the requested bound.")
        page_ids: set[str] = set()
        for item in response:
            if not isinstance(item, Mapping):
                raise ProjectionProvisioningError("Every Keycloak client inventory item must be an object.")
            internal_id = item.get("id")
            client_id = item.get("clientId")
            if (
                not isinstance(internal_id, str)
                or canonical_resource_uuid(internal_id) is None
                or not isinstance(client_id, str)
                or bounded_inventory_identity(client_id) is None
                or internal_id in seen_ids
                or internal_id in page_ids
                or client_id in seen_client_ids
            ):
                raise ProjectionProvisioningError("Duplicate or malformed realm client identity blocks complete inventory.")
            page_ids.add(internal_id)
            seen_ids.add(internal_id)
            seen_client_ids.add(client_id)
            summaries.append(item)
        if len(response) < page_size:
            complete = True
            break
    if not complete:
        raise ProjectionProvisioningError("Realm client pagination exhausted its reviewed bound before proving completion.")

    clients: list[dict[str, Any]] = []
    scope_mapper_cache: dict[str, list[Mapping[str, Any]]] = {}
    for summary_item in summaries:
        internal_id = str(summary_item["id"])
        client_id = str(summary_item["clientId"])
        client_path = "/clients/" + urllib.parse.quote(internal_id, safe="")
        detail = request(
            profile,
            "GET",
            admin_realm_url(profile, client_path),
            token=token,
            timeout_seconds=timeout_seconds,
        )
        if not isinstance(detail, Mapping) or detail.get("id") != internal_id or detail.get("clientId") != client_id:
            raise ProjectionProvisioningError("Keycloak client detail changed identity during inventory.")
        direct = observe_mappers(profile, token, client_path, timeout_seconds)
        default_scopes, optional_scopes, attached = observe_scope_bindings(
            profile, token, client_path, timeout_seconds, client_scopes
        )
        # Reuse already read mapper content by immutable scope ID only after
        # observe_scope_bindings proved name/ID consistency for this client.
        normalized_attached: dict[str, list[Mapping[str, Any]]] = {}
        for scope in [*default_scopes, *optional_scopes]:
            scope_id = str(scope["id"])
            scope_name = str(scope["name"])
            if scope_id not in scope_mapper_cache:
                scope_mapper_cache[scope_id] = attached[scope_name]
            elif digest(scope_mapper_cache[scope_id]) != digest(attached[scope_name]):
                raise ProjectionProvisioningError("Attached client-scope mappers changed during one inventory pass.")
            normalized_attached[scope_name] = scope_mapper_cache[scope_id]
        clients.append({
            "client": detail,
            "directMappers": direct,
            "defaultScopes": default_scopes,
            "optionalScopes": optional_scopes,
            "attachedMappers": normalized_attached,
        })
    return sorted(clients, key=lambda item: str(item["client"]["clientId"]))


def observe_scope_bindings(
    profile: Mapping[str, Any], token: str, client_path: str, timeout_seconds: int,
    client_scopes: Mapping[str, Mapping[str, Any]],
) -> tuple[list[Mapping[str, Any]], list[Mapping[str, Any]], dict[str, list[Mapping[str, Any]]]]:
    """Read bindings and require an exact pair from the complete scope catalog."""

    default_scopes = request(profile, "GET", admin_realm_url(profile, client_path + "/default-client-scopes"), token=token, timeout_seconds=timeout_seconds)
    optional_scopes = request(profile, "GET", admin_realm_url(profile, client_path + "/optional-client-scopes"), token=token, timeout_seconds=timeout_seconds)
    if not isinstance(default_scopes, list) or not isinstance(optional_scopes, list):
        raise ProjectionProvisioningError("Client-scope binding lookup returned an unexpected representation.")
    catalog_by_name, catalog_by_id = client_scope_catalog_maps(client_scopes)
    attached: dict[str, list[Mapping[str, Any]]] = {}
    seen_names: set[str] = set()
    seen_ids: set[str] = set()
    validated: list[tuple[str, str]] = []
    for scope in [*default_scopes, *optional_scopes]:
        if (
            not isinstance(scope, Mapping)
            or canonical_resource_uuid(scope.get("id")) is None
            or bounded_inventory_identity(scope.get("name")) is None
        ):
            raise ProjectionProvisioningError("Every attached client scope must have a stable name and identifier.")
        name = str(scope["name"])
        scope_id = str(scope["id"])
        if name in seen_names or scope_id in seen_ids:
            raise ProjectionProvisioningError("Duplicate attached client-scope names or IDs block convergence.")
        if catalog_by_name.get(name) != scope_id or catalog_by_id.get(scope_id) != name:
            raise ProjectionProvisioningError("An attached client scope does not match the complete immutable name/ID catalog.")
        seen_names.add(name)
        seen_ids.add(scope_id)
        validated.append((name, scope_id))
    for name, scope_id in validated:
        attached[name] = observe_mappers(profile, token, "/client-scopes/" + urllib.parse.quote(scope_id, safe=""), timeout_seconds)
    return default_scopes, optional_scopes, attached


def observe_once(profile: Mapping[str, Any], token: str, timeout_seconds: int) -> dict[str, Any]:
    authority = profile["authority"]
    user = request(profile, "GET", admin_realm_url(profile, "/users/" + urllib.parse.quote(authority["subjectId"], safe="")), token=token, timeout_seconds=timeout_seconds)
    if not isinstance(user, Mapping) or user.get("id") != authority["subjectId"]:
        raise ProjectionProvisioningError("The immutable authority subject could not be read.")
    scopes = observe_client_scopes(profile, token, timeout_seconds)
    managed_scopes: dict[str, Mapping[str, Any] | None] = {}
    managed_scope_mappers: dict[str, list[Mapping[str, Any]]] = {}
    for consumer_projection in consumer_projections(profile):
        client_id = str(consumer_projection["clientId"])
        managed_scope = scopes.get(consumer_scope_name(consumer_projection))
        managed_scopes[client_id] = managed_scope
        scope_mappers: list[Mapping[str, Any]] = []
        if managed_scope:
            scope_id = managed_scope.get("id")
            if not isinstance(scope_id, str) or not scope_id:
                raise ProjectionProvisioningError("A managed consumer client scope has no stable identifier.")
            scope_mappers = observe_mappers(profile, token, "/client-scopes/" + urllib.parse.quote(scope_id, safe=""), timeout_seconds)
        managed_scope_mappers[client_id] = scope_mappers
    realm_clients = observe_realm_clients(profile, token, timeout_seconds, scopes)
    clients_by_id = {
        str(item["client"]["clientId"]): item
        for item in realm_clients
    }
    consumers: dict[str, Any] = {}
    for consumer_projection in consumer_projections(profile):
        client_id = str(consumer_projection["clientId"])
        consumers[client_id] = clients_by_id.get(client_id)
    principal = profile["servicePrincipalRegistry"][0]
    service_record = clients_by_id.get(str(principal["clientId"]))
    service_client = service_record["client"] if service_record else None
    service_mappers_observed: list[Mapping[str, Any]] = []
    service_user: Mapping[str, Any] | None = None
    service_default_scopes: list[Mapping[str, Any]] = []
    service_optional_scopes: list[Mapping[str, Any]] = []
    service_attached_mappers: dict[str, list[Mapping[str, Any]]] = {}
    if service_client and service_record:
        internal_id = str(service_client["id"])
        base_path = "/clients/" + urllib.parse.quote(internal_id, safe="")
        service_mappers_observed = list(service_record["directMappers"])
        service_default_scopes = list(service_record["defaultScopes"])
        service_optional_scopes = list(service_record["optionalScopes"])
        service_attached_mappers = dict(service_record["attachedMappers"])
        account = request(profile, "GET", admin_realm_url(profile, base_path + "/service-account-user"), token=token, timeout_seconds=timeout_seconds)
        if isinstance(account, Mapping):
            service_user = account
    return {
        "user": user,
        "managedScopes": managed_scopes,
        "managedScopeMappers": managed_scope_mappers,
        "consumers": consumers,
        "serviceClient": service_client,
        "serviceMappers": service_mappers_observed,
        "serviceUser": service_user,
        "serviceDefaultScopes": service_default_scopes,
        "serviceOptionalScopes": service_optional_scopes,
        "serviceAttachedMappers": service_attached_mappers,
        "realmInventory": {
            "complete": True,
            "clientScopes": list(scopes.values()),
            "clients": realm_clients,
        },
    }


def observe(profile: Mapping[str, Any], token: str, timeout_seconds: int) -> dict[str, Any]:
    """Require two complete stable passes before returning read-only evidence."""

    first = observe_once(profile, token, timeout_seconds)
    second = observe_once(profile, token, timeout_seconds)
    first_fingerprint = observation_fingerprint(profile, first)
    second_fingerprint = observation_fingerprint(profile, second)
    if first_fingerprint != second_fingerprint:
        raise ProjectionProvisioningError("Realm authority inventory changed between the two required complete passes.")
    result = deepcopy(second)
    result["realmInventory"]["stablePasses"] = 2
    result["observationFingerprint"] = second_fingerprint
    return result


CLIENT_ELIGIBILITY_FIELDS = (
    "enabled",
    "protocol",
    "publicClient",
    "bearerOnly",
    "standardFlowEnabled",
    "implicitFlowEnabled",
    "directAccessGrantsEnabled",
    "serviceAccountsEnabled",
    "authorizationServicesEnabled",
    "fullScopeAllowed",
)
MAPPER_CONFIG_FINGERPRINT_FIELDS = {
    "user.attribute",
    "claim.name",
    "jsonType.label",
    "access.token.claim",
    "id.token.claim",
    "userinfo.token.claim",
    "introspection.token.claim",
    "multivalued",
    "included.custom.audience",
}
SCOPE_ATTRIBUTE_FINGERPRINT_FIELDS = {
    "include.in.token.scope",
    "display.on.consent.screen",
}


def mapper_fingerprint_view(mapper: Any) -> dict[str, Any]:
    if not isinstance(mapper, Mapping):
        raise ProjectionProvisioningError("A mapper fingerprint source is malformed.")
    config = mapper.get("config")
    safe_config = {
        key: config.get(key)
        for key in sorted(MAPPER_CONFIG_FINGERPRINT_FIELDS)
        if isinstance(config, Mapping) and key in config
    }
    return {
        "targetId": mapper.get("id") if isinstance(mapper.get("id"), str) else None,
        "name": mapper.get("name"),
        "protocol": mapper.get("protocol"),
        "protocolMapper": mapper.get("protocolMapper"),
        "config": safe_config,
    }


def mapper_owned_state_view(mapper: Any) -> dict[str, Any]:
    value = mapper_fingerprint_view(mapper)
    value.pop("targetId", None)
    config = mapper.get("config") if isinstance(mapper, Mapping) else None
    value["hasUnknownConfig"] = not isinstance(config, Mapping) or bool(
        set(config) - MAPPER_CONFIG_FINGERPRINT_FIELDS
    )
    return value


def scope_fingerprint_view(scope: Any) -> dict[str, Any]:
    if not isinstance(scope, Mapping):
        raise ProjectionProvisioningError("A client-scope fingerprint source is malformed.")
    attributes = scope.get("attributes")
    return {
        "targetId": scope.get("id") if isinstance(scope.get("id"), str) else None,
        "name": scope.get("name"),
        "protocol": scope.get("protocol"),
        "attributes": {
            key: attributes.get(key)
            for key in sorted(SCOPE_ATTRIBUTE_FINGERPRINT_FIELDS)
            if isinstance(attributes, Mapping) and key in attributes
        },
    }


def scope_owned_state_view(scope: Any) -> dict[str, Any]:
    value = scope_fingerprint_view(scope)
    value.pop("targetId", None)
    attributes = scope.get("attributes") if isinstance(scope, Mapping) else None
    value["hasUnknownAttributes"] = not isinstance(attributes, Mapping) or bool(
        set(attributes) - SCOPE_ATTRIBUTE_FINGERPRINT_FIELDS
    )
    return value


def service_client_owned_state_view(client: Any, desired: Mapping[str, Any]) -> dict[str, Any]:
    if not isinstance(client, Mapping):
        raise ProjectionProvisioningError("The service-client owned state is malformed.")
    result: dict[str, Any] = {}
    for name, expected in desired.items():
        if name == "attributes":
            attributes = client.get("attributes")
            result[name] = {
                attribute_name: attributes.get(attribute_name) if isinstance(attributes, Mapping) else None
                for attribute_name in sorted(expected)
            }
        else:
            result[name] = client.get(name)
    return result


def desired_adoption_owned_state(profile: Mapping[str, Any], kind: str, logical_id: str) -> Any:
    if kind == "authority-user":
        return desired_human_attributes(profile)
    if kind == "consumer-client":
        consumer = next(
            item for item in consumer_projections(profile)
            if str(item["clientId"]) == logical_id
        )
        return {
            "eligibility": desired_consumer_security_profile(profile, consumer),
            "defaultManagedScope": consumer_scope_name(consumer),
            "optionalManagedScope": False,
        }
    if kind == "client-scope":
        consumer = next(
            item for item in consumer_projections(profile)
            if consumer_scope_name(item) == logical_id
        )
        return {
            "scope": scope_owned_state_view(desired_consumer_scope(consumer)),
            "mappers": sorted(
                [mapper_owned_state_view(item) for item in human_mappers(consumer)],
                key=lambda item: str(item["name"]),
            ),
        }
    if kind == "service-client":
        principal = profile["servicePrincipalRegistry"][0]
        desired_client = desired_service_client(principal)
        return {
            "client": service_client_owned_state_view(desired_client, desired_client),
            "mappers": sorted(
                [mapper_owned_state_view(item) for item in service_mappers(principal)],
                key=lambda item: str(item["name"]),
            ),
            "accountAttributes": desired_service_attributes(principal),
            "defaultScopes": [],
            "optionalScopes": [],
        }
    raise ProjectionProvisioningError("Unknown adoption resource kind.")


def observed_adoption_owned_state_digest(
    profile: Mapping[str, Any], observed: Mapping[str, Any], kind: str, logical_id: str
) -> str:
    if kind == "authority-user":
        user = observed.get("user")
        attributes = user.get("attributes") if isinstance(user, Mapping) else None
        if not isinstance(attributes, Mapping):
            raise ProjectionProvisioningError("The authority-user adoption baseline is malformed.")
        owned = human_owned_attributes(profile, attributes)
        return digest({name: attributes[name] for name in sorted(owned) if name in attributes})
    if kind == "consumer-client":
        record = nested(observed, "consumers", logical_id)
        if not isinstance(record, Mapping) or not isinstance(record.get("client"), Mapping):
            raise ProjectionProvisioningError("The consumer-client adoption baseline is missing.")
        client = record["client"]
        managed_scope = consumer_scope_name(next(
            item for item in consumer_projections(profile)
            if str(item["clientId"]) == logical_id
        ))
        default_names = [
            str(item.get("name")) for item in record.get("defaultScopes", [])
            if isinstance(item, Mapping) and item.get("name") == managed_scope
        ]
        optional_names = [
            str(item.get("name")) for item in record.get("optionalScopes", [])
            if isinstance(item, Mapping) and item.get("name") == managed_scope
        ]
        return digest({
            "eligibility": observed_consumer_security_profile(client),
            "defaultManagedScope": managed_scope if default_names == [managed_scope] else None,
            "optionalManagedScope": bool(optional_names),
        })
    if kind == "client-scope":
        consumer = next(
            item for item in consumer_projections(profile)
            if consumer_scope_name(item) == logical_id
        )
        client_id = str(consumer["clientId"])
        scope = nested(observed, "managedScopes", client_id)
        mappers = nested(observed, "managedScopeMappers", client_id)
        if not isinstance(scope, Mapping) or not isinstance(mappers, list):
            raise ProjectionProvisioningError("The managed client-scope adoption baseline is missing.")
        return digest({
            "scope": scope_owned_state_view(scope),
            "mappers": sorted(
                [mapper_owned_state_view(item) for item in mappers],
                key=lambda item: str(item["name"]),
            ),
        })
    if kind == "service-client":
        principal = profile["servicePrincipalRegistry"][0]
        client = observed.get("serviceClient")
        mappers = observed.get("serviceMappers")
        service_user = observed.get("serviceUser")
        attributes = service_user.get("attributes") if isinstance(service_user, Mapping) else None
        if not isinstance(client, Mapping) or not isinstance(mappers, list) or not isinstance(attributes, Mapping):
            raise ProjectionProvisioningError("The service-client adoption baseline is missing.")
        return digest({
            "client": service_client_owned_state_view(client, desired_service_client(principal)),
            "mappers": sorted(
                [mapper_owned_state_view(item) for item in mappers],
                key=lambda item: str(item["name"]),
            ),
            "accountAttributes": {
                name: attributes[name]
                for name in sorted(SERVICE_OWNED_ATTRIBUTES)
                if name in attributes
            },
            "defaultScopes": [
                scope_fingerprint_view(item) for item in observed.get("serviceDefaultScopes", [])
            ],
            "optionalScopes": [
                scope_fingerprint_view(item) for item in observed.get("serviceOptionalScopes", [])
            ],
        })
    raise ProjectionProvisioningError("Unknown adoption resource kind.")


def client_fingerprint_view(profile: Mapping[str, Any], client: Any) -> dict[str, Any]:
    if not isinstance(client, Mapping):
        raise ProjectionProvisioningError("A client fingerprint source is malformed.")
    principal = profile["servicePrincipalRegistry"][0]
    attributes = client.get("attributes")
    owned_service_attribute_names = set(desired_service_client(principal)["attributes"])
    return {
        "targetId": client.get("id") if isinstance(client.get("id"), str) else None,
        "clientId": client.get("clientId"),
        "eligibility": observed_consumer_security_profile(client),
        "ownedServiceAttributes": {
            name: attributes.get(name)
            for name in sorted(owned_service_attribute_names)
            if client.get("clientId") == principal["clientId"]
            and isinstance(attributes, Mapping)
            and name in attributes
        },
    }


def observation_fingerprint(profile: Mapping[str, Any], observed: Mapping[str, Any]) -> str:
    """Fingerprint only immutable anchors and explicitly owned/guard fields.

    Server response secrets, access metadata, registered nodes and all foreign
    user/client fields are intentionally absent.  They can neither leak into an
    evidence artifact nor be replayed in a future PUT body.
    """

    user = observed.get("user")
    user_attributes = user.get("attributes") if isinstance(user, Mapping) else None
    user_owned = human_owned_attributes(profile, user_attributes)
    service_user = observed.get("serviceUser")
    service_attributes = service_user.get("attributes") if isinstance(service_user, Mapping) else None
    inventory = observed.get("realmInventory")
    clients = inventory.get("clients") if isinstance(inventory, Mapping) else []
    scopes = inventory.get("clientScopes") if isinstance(inventory, Mapping) else []
    canonical_clients: list[dict[str, Any]] = []
    for entry in clients if isinstance(clients, list) else []:
        if not isinstance(entry, Mapping):
            raise ProjectionProvisioningError("Realm client inventory contains a malformed record.")
        direct = entry.get("directMappers")
        defaults = entry.get("defaultScopes")
        optionals = entry.get("optionalScopes")
        attached = entry.get("attachedMappers")
        canonical_clients.append({
            "client": client_fingerprint_view(profile, entry.get("client")),
            "directMappers": sorted(
                [mapper_fingerprint_view(item) for item in direct if isinstance(item, Mapping)],
                key=lambda item: (str(item["name"]), str(item["targetId"])),
            ) if isinstance(direct, list) else None,
            "defaultScopes": sorted(
                [scope_fingerprint_view(item) for item in defaults if isinstance(item, Mapping)],
                key=lambda item: (str(item["name"]), str(item["targetId"])),
            ) if isinstance(defaults, list) else None,
            "optionalScopes": sorted(
                [scope_fingerprint_view(item) for item in optionals if isinstance(item, Mapping)],
                key=lambda item: (str(item["name"]), str(item["targetId"])),
            ) if isinstance(optionals, list) else None,
            "attachedMappers": {
                name: sorted(
                    [mapper_fingerprint_view(item) for item in mappers if isinstance(item, Mapping)],
                    key=lambda item: (str(item["name"]), str(item["targetId"])),
                )
                for name, mappers in sorted(attached.items())
                if isinstance(name, str) and isinstance(mappers, list)
            } if isinstance(attached, Mapping) else None,
        })
    canonical_clients.sort(key=lambda item: str(item["client"]["clientId"]))
    canonical = {
        "authorityUser": {
            "targetId": user.get("id") if isinstance(user, Mapping) else None,
            "ownedAttributes": {
                name: user_attributes.get(name)
                for name in sorted(user_owned)
                if isinstance(user_attributes, Mapping) and name in user_attributes
            },
        },
        "managedScopes": {
            name: scope_fingerprint_view(value) if isinstance(value, Mapping) else None
            for name, value in sorted((observed.get("managedScopes") or {}).items())
        },
        "managedScopeMappers": {
            name: sorted(
                [mapper_fingerprint_view(item) for item in values if isinstance(item, Mapping)],
                key=lambda item: (str(item["name"]), str(item["targetId"])),
            )
            for name, values in sorted((observed.get("managedScopeMappers") or {}).items())
            if isinstance(values, list)
        },
        "serviceAccount": {
            "targetId": service_user.get("id") if isinstance(service_user, Mapping) else None,
            "ownedAttributes": {
                name: service_attributes.get(name)
                for name in sorted(SERVICE_OWNED_ATTRIBUTES)
                if isinstance(service_attributes, Mapping) and name in service_attributes
            },
        },
        "realmInventory": {
            "complete": inventory.get("complete") if isinstance(inventory, Mapping) else False,
            "clientScopes": sorted(
                [scope_fingerprint_view(item) for item in scopes if isinstance(item, Mapping)],
                key=lambda item: (str(item["name"]), str(item["targetId"])),
            ) if isinstance(scopes, list) else None,
            "clients": canonical_clients,
        },
    }
    return digest(canonical)


def adoption_resource_map(profile: Mapping[str, Any]) -> dict[tuple[str, str], Mapping[str, Any]]:
    resources = profile["mutationSafety"]["adoptionPolicy"]["resources"]
    return {(str(item["kind"]), str(item["logicalId"])): item for item in resources}


def adoption_and_inventory_blockers(profile: Mapping[str, Any], observed: Mapping[str, Any]) -> list[str]:
    blockers: list[str] = []
    resources = adoption_resource_map(profile)
    for (kind, logical_id), resource in sorted(resources.items()):
        try:
            observed_digest = observed_adoption_owned_state_digest(
                profile, observed, kind, logical_id
            )
        except (KeyError, TypeError, IndexError, StopIteration, ProjectionProvisioningError):
            blockers.append(f"The signed adoption baseline for {kind}/{logical_id} cannot be reconstructed.")
            continue
        if observed_digest != resource.get("observedOwnedStateSha256"):
            blockers.append(f"The observed owned state for {kind}/{logical_id} differs from its signed adoption baseline.")
    user = observed.get("user")
    subject_id = str(profile["authority"]["subjectId"])
    expected_user_id = resources[("authority-user", subject_id)]["resourceId"]
    if not isinstance(user, Mapping) or user.get("id") != expected_user_id:
        blockers.append("The authority user does not match its signed internal-ID adoption receipt.")

    managed_scopes = observed.get("managedScopes") if isinstance(observed.get("managedScopes"), Mapping) else {}
    consumers = observed.get("consumers") if isinstance(observed.get("consumers"), Mapping) else {}
    for consumer in consumer_projections(profile):
        client_id = str(consumer["clientId"])
        scope_name = consumer_scope_name(consumer)
        scope = managed_scopes.get(client_id)
        client_record = consumers.get(client_id)
        expected_scope_id = resources[("client-scope", scope_name)]["resourceId"]
        expected_client_id = resources[("consumer-client", client_id)]["resourceId"]
        if not isinstance(scope, Mapping) or scope.get("id") != expected_scope_id or scope.get("name") != scope_name:
            blockers.append(f"Managed scope {scope_name} does not match its signed internal-ID adoption receipt.")
        client = client_record.get("client") if isinstance(client_record, Mapping) else None
        if not isinstance(client, Mapping) or client.get("id") != expected_client_id or client.get("clientId") != client_id:
            blockers.append(f"Consumer {client_id} does not match its signed internal-ID adoption receipt.")
        elif observed_consumer_security_profile(client) != desired_consumer_security_profile(profile, consumer):
            blockers.append(f"Consumer {client_id} is not the exact receipt-bound non-service human OIDC client profile.")

    principal = profile["servicePrincipalRegistry"][0]
    service_client = observed.get("serviceClient")
    expected_service_id = resources[("service-client", str(principal["clientId"]))]["resourceId"]
    if (
        not isinstance(service_client, Mapping)
        or service_client.get("id") != expected_service_id
        or service_client.get("clientId") != principal["clientId"]
    ):
        blockers.append("The service client does not match its signed internal-ID adoption receipt.")
    elif service_client.get("enabled") is not False:
        blockers.append("The adopted service client must remain disabled before any future mutation transaction.")

    inventory = observed.get("realmInventory")
    if not isinstance(inventory, Mapping) or inventory.get("complete") is not True or inventory.get("stablePasses") != 2:
        blockers.append("Two stable complete realm inventory passes are required.")
        return sorted(set(blockers))
    realm_clients = inventory.get("clients")
    realm_scopes = inventory.get("clientScopes")
    if not isinstance(realm_clients, list) or not isinstance(realm_scopes, list):
        blockers.append("Realm inventory collections are malformed.")
        return sorted(set(blockers))

    all_ids: set[str] = set()
    all_client_ids: set[str] = set()
    for record in realm_clients:
        client = record.get("client") if isinstance(record, Mapping) else None
        internal_id = client.get("id") if isinstance(client, Mapping) else None
        client_id = client.get("clientId") if isinstance(client, Mapping) else None
        if (
            canonical_resource_uuid(internal_id) is None
            or not isinstance(client_id, str)
            or bounded_inventory_identity(client_id) is None
            or internal_id in all_ids
            or client_id in all_client_ids
        ):
            blockers.append("Realm client inventory contains duplicate or malformed identities.")
            continue
        all_ids.add(str(internal_id))
        all_client_ids.add(client_id)

    catalog_by_id: dict[str, str] = {}
    catalog_by_name: dict[str, str] = {}
    for scope in realm_scopes:
        internal_id = scope.get("id") if isinstance(scope, Mapping) else None
        scope_name = scope.get("name") if isinstance(scope, Mapping) else None
        if (
            canonical_resource_uuid(internal_id) is None
            or bounded_inventory_identity(scope_name) is None
            or internal_id in catalog_by_id
            or scope_name in catalog_by_name
        ):
            blockers.append("Realm client-scope inventory contains duplicate or malformed identities.")
            continue
        catalog_by_id[str(internal_id)] = str(scope_name)
        catalog_by_name[str(scope_name)] = str(internal_id)
    for consumer in consumer_projections(profile):
        scope_name = consumer_scope_name(consumer)
        expected_id = resources[("client-scope", scope_name)]["resourceId"]
        matches = [
            item for item in realm_scopes
            if isinstance(item, Mapping) and item.get("name") == scope_name and item.get("id") == expected_id
        ]
        if len(matches) != 1:
            blockers.append(f"Managed scope {scope_name} is absent or substituted in the complete realm scope inventory.")

    managed_names = {consumer_scope_name(item) for item in consumer_projections(profile)}
    allowed = {
        (item["clientId"], item["scopeName"], item["binding"])
        for item in profile["mutationSafety"]["inventoryPolicy"]["allowedScopeBindings"]
    }
    actual_managed_edges: set[tuple[str, str, str]] = set()
    for record in realm_clients:
        if not isinstance(record, Mapping) or not isinstance(record.get("client"), Mapping):
            continue
        client_id = str(record["client"].get("clientId"))
        bound_names: set[str] = set()
        bound_ids: set[str] = set()
        for binding, field in (("default", "defaultScopes"), ("optional", "optionalScopes")):
            values = record.get(field)
            if not isinstance(values, list):
                blockers.append(f"Client {client_id} has a malformed {binding} scope inventory.")
                continue
            for scope in values:
                if not isinstance(scope, Mapping):
                    blockers.append(f"Client {client_id} has a malformed attached scope.")
                    continue
                scope_name = scope.get("name")
                scope_id = scope.get("id")
                if (
                    bounded_inventory_identity(scope_name) is None
                    or canonical_resource_uuid(scope_id) is None
                    or scope_name in bound_names
                    or scope_id in bound_ids
                ):
                    blockers.append(f"Client {client_id} has duplicate or malformed attached scope identities.")
                    continue
                scope_name = str(scope_name)
                scope_id = str(scope_id)
                bound_names.add(scope_name)
                bound_ids.add(scope_id)
                if catalog_by_name.get(scope_name) != scope_id or catalog_by_id.get(scope_id) != scope_name:
                    blockers.append(f"Client {client_id} has an attached scope pair outside the exact realm scope catalog.")
                if scope_name in managed_names:
                    edge = (client_id, scope_name, binding)
                    actual_managed_edges.add(edge)
                    expected_scope_id = resources[("client-scope", scope_name)]["resourceId"]
                    if scope_id != expected_scope_id:
                        blockers.append(f"Managed scope {scope_name} is bound through a substituted internal ID on client {client_id}/{binding}.")
                    if edge not in allowed or client_id in RESERVED_CONSUMER_CLIENT_IDS or client_id.startswith("realm-"):
                        blockers.append(f"Unauthorized reverse binding to managed scope {scope_name} from client {client_id}/{binding}.")
        direct = record.get("directMappers")
        attached = record.get("attachedMappers")
        if (
            not isinstance(attached, Mapping)
            or any(not isinstance(name, str) or not isinstance(mappers, list) for name, mappers in attached.items())
            or set(attached) != bound_names
        ):
            blockers.append(f"Client {client_id} has incomplete or ambiguous attached-scope mapper inventory.")
        if client_id not in {str(item["clientId"]) for item in consumer_projections(profile)}:
            protected_roots = (
                {"spaceos_tenants", *FLAT_AUTHORITY_CLAIMS}
                if client_id == principal["clientId"]
                else HUMAN_TOKEN_AUTHORITY_CLAIMS
            )
            candidate_mappers = list(direct) if isinstance(direct, list) else []
            if isinstance(attached, Mapping):
                candidate_mappers.extend(
                    mapper
                    for mappers in attached.values()
                    if isinstance(mappers, list)
                    for mapper in mappers
                )
            conflicting = sorted({
                str(claim)
                for mapper in candidate_mappers
                if isinstance(mapper, Mapping)
                and claim_conflicts((claim := mapper_claim(mapper)), protected_roots)
            })
            if conflicting:
                blockers.append(f"Non-consumer client {client_id} directly or through an attached scope emits protected human authority claims.")
    if not actual_managed_edges.issubset(allowed):
        blockers.append("The complete managed-scope reverse edge set is not a subset of the signed allowlist.")
    return sorted(set(blockers))


def mapper_claim(mapper: Mapping[str, Any]) -> str | None:
    config = mapper.get("config")
    if not isinstance(config, Mapping):
        return None
    value = config.get("claim.name")
    return value if isinstance(value, str) else None


def claim_conflicts(claim: str | None, authority_roots: set[str]) -> bool:
    """Treat an authority root and any dotted child path as the same protected claim."""

    return claim is not None and any(
        claim == root or claim.startswith(root + ".") for root in authority_roots
    )


def mapper_affects_audience(mapper: Mapping[str, Any]) -> bool:
    """Reject any non-owned mapper that can widen or replace the exact aud set."""

    claim = mapper_claim(mapper)
    protocol_mapper = mapper.get("protocolMapper")
    return (
        claim == "aud"
        or isinstance(claim, str) and claim.startswith("aud.")
        or protocol_mapper in {"oidc-audience-mapper", "oidc-audience-resolve-mapper"}
    )


def client_drift(observed: Mapping[str, Any], desired: Mapping[str, Any]) -> list[str]:
    drift: list[str] = []
    for field in ("clientId", "name", "description", "enabled", "protocol", "publicClient", "bearerOnly", "standardFlowEnabled", "implicitFlowEnabled", "directAccessGrantsEnabled", "serviceAccountsEnabled", "authorizationServicesEnabled", "fullScopeAllowed", "clientAuthenticatorType", "redirectUris", "webOrigins"):
        actual = observed.get(field, False if isinstance(desired.get(field), bool) else None)
        if actual != desired[field]:
            drift.append(field)
    attributes = observed.get("attributes")
    if not isinstance(attributes, Mapping):
        drift.append("attributes")
    else:
        for name, expected in desired["attributes"].items():
            if attributes.get(name) != expected:
                drift.append("attributes." + name)
    return drift


def mapper_plan(step: str, target: str, observed: Sequence[Mapping[str, Any]], desired: Sequence[Mapping[str, Any]]) -> list[dict[str, Any]]:
    observed_by_name = index_mappers(observed)
    desired_by_name = index_mappers(desired)
    plan: list[dict[str, Any]] = []
    for name in sorted(set(observed_by_name) | set(desired_by_name)):
        current = observed_by_name.get(name)
        expected = desired_by_name.get(name)
        if current is None:
            action = "Create"
        elif expected is None:
            action = "Delete"
        elif exact_mapper_equal(current, expected):
            action = "NoChange"
        else:
            action = "ExactReplace"
        plan.append({"step": step, "target": f"{target}/{name}", "action": action, "readback": "Re-read the complete owned mapper set."})
    return plan


def build_plan(profile: Mapping[str, Any], observed: Mapping[str, Any]) -> list[dict[str, Any]]:
    plan: list[dict[str, Any]] = []
    for message in mutation_safety_blockers(profile):
        plan.append({"step": "signed-receipt-verification", "target": REALM, "action": "Block", "readback": message})
    try:
        current_fingerprint = observation_fingerprint(profile, observed)
    except ProjectionProvisioningError as error:
        current_fingerprint = None
        plan.append({"step": "observation-fingerprint", "target": REALM, "action": "Block", "readback": str(error)})
    expected_fingerprint = observed.get("observationFingerprint")
    if not isinstance(expected_fingerprint, str) or not SHA256_PATTERN.fullmatch(expected_fingerprint) or expected_fingerprint != current_fingerprint:
        plan.append({"step": "observation-fingerprint", "target": REALM, "action": "Block", "readback": "The supplied observation fingerprint is missing, malformed or stale."})
    for message in adoption_and_inventory_blockers(profile, observed):
        plan.append({"step": "signed-adoption-reverse-inventory", "target": REALM, "action": "Block", "readback": message})
    human_attrs = desired_human_attributes(profile)
    user_attrs = observed["user"].get("attributes") if isinstance(observed.get("user"), Mapping) else None
    for message in human_version_blockers(profile, user_attrs):
        plan.append({"step": "human-version-guard", "target": opaque_target(profile["authority"]["subjectId"]), "action": "Block", "readback": message})
    owned_human = human_owned_attributes(profile, user_attrs)
    plan.append({"step": "human-membership-registry", "target": opaque_target(profile["authority"]["subjectId"]), "action": "ExactReplace" if owned_attribute_drift(user_attrs, human_attrs, owned_human) else "NoChange", "readback": "Registry/meta remain non-tokenized; every owned consumer projection and every flat-alias absence must match exactly."})
    managed_scopes = observed.get("managedScopes") if isinstance(observed.get("managedScopes"), Mapping) else {}
    managed_scope_mappers = observed.get("managedScopeMappers") if isinstance(observed.get("managedScopeMappers"), Mapping) else {}
    for consumer_projection in consumer_projections(profile):
        client_id = str(consumer_projection["clientId"])
        scope_name = consumer_scope_name(consumer_projection)
        managed_scope = managed_scopes.get(client_id)
        if managed_scope is None:
            plan.append({"step": "native-authority-client-scope", "target": scope_name, "action": "Block", "readback": "Signed exact-existing adoption does not authorize creating a missing client scope."})
        elif not isinstance(managed_scope, Mapping):
            plan.append({"step": "native-authority-client-scope", "target": scope_name, "action": "Block", "readback": "The observed consumer-specific scope representation is malformed."})
        else:
            expected_scope = desired_consumer_scope(consumer_projection)
            action = "NoChange" if all(managed_scope.get(key) == value for key, value in expected_scope.items()) else "ExactReplace"
            plan.append({"step": "native-authority-client-scope", "target": scope_name, "action": action, "readback": "Re-read the full consumer-specific scope representation."})
            observed_mappers = managed_scope_mappers.get(client_id, [])
            if not isinstance(observed_mappers, Sequence) or isinstance(observed_mappers, (str, bytes)):
                plan.append({"step": "native-authority-mapper", "target": scope_name, "action": "Block", "readback": "The observed mapper set is malformed."})
            else:
                plan.extend(mapper_plan("native-authority-mapper", scope_name, observed_mappers, human_mappers(consumer_projection)))
        consumer = observed["consumers"].get(client_id)
        if consumer is None:
            plan.append({"step": "consumer-scope-binding", "target": client_id, "action": "Block", "readback": "The consumer client must exist before projection apply."})
            continue
        observed_security = observed_consumer_security_profile(consumer.get("client"))
        desired_security = desired_consumer_security_profile(profile, consumer_projection)
        plan.append({
            "step": "consumer-browser-security-posture",
            "target": client_id,
            "action": "NoChange" if observed_security == desired_security else "Block",
            "readback": "Enabled state, exact HTTPS redirect/origin allowlists, public Authorization Code flags and S256 PKCE must match the signed adoption baseline.",
        })
        if consumer_projection["enabled"] is False:
            plan.append({
                "step": "consumer-browser-activation",
                "target": client_id,
                "action": "Block",
                "readback": "Browser authentication remains activation-not-ready: this source-pinned consumer is disabled and has no approved redirect/origin allowlist.",
            })
        conflicting: set[str] = set()
        for mapper in consumer["directMappers"]:
            claim = mapper_claim(mapper)
            if claim_conflicts(claim, HUMAN_TOKEN_AUTHORITY_CLAIMS):
                conflicting.add(str(claim))
        for scope_name, mappers in consumer["attachedMappers"].items():
            if scope_name == consumer_scope_name(consumer_projection):
                continue
            for mapper in mappers:
                claim = mapper_claim(mapper)
                if claim_conflicts(claim, HUMAN_TOKEN_AUTHORITY_CLAIMS):
                    conflicting.add(str(claim))
        if conflicting:
            plan.append({"step": "consumer-mixed-claim-guard", "target": client_id, "action": "Block", "readback": "Remove the conflicting unmanaged flat/native mapper in a separately reviewed change: " + ",".join(sorted(conflicting))})
        unmanaged_audience_mapper = any(
            mapper_affects_audience(mapper)
            for mapper in consumer["directMappers"]
        ) or any(
            mapper_affects_audience(mapper)
            for attached_scope_name, mappers in consumer["attachedMappers"].items()
            if attached_scope_name != consumer_scope_name(consumer_projection)
            for mapper in mappers
        )
        if unmanaged_audience_mapper:
            plan.append({
                "step": "consumer-audience-guard",
                "target": client_id,
                "action": "Block",
                "readback": "Only the consumer-owned custom audience mappers may affect aud; remove audience-resolve/direct/foreign audience mappers in a separately reviewed change.",
            })
        default_names = {str(scope.get("name")) for scope in consumer["defaultScopes"] if isinstance(scope, Mapping)}
        optional_names = {str(scope.get("name")) for scope in consumer["optionalScopes"] if isinstance(scope, Mapping)}
        own_scope_name = consumer_scope_name(consumer_projection)
        action = "NoChange" if own_scope_name in default_names and own_scope_name not in optional_names else "AttachDefault"
        binding_readback = "Exactly this consumer-specific native scope must be default, never optional."
        if consumer_projection["enabled"] is False:
            binding_readback += " The source-pinned browser client remains disabled/default-off."
        plan.append({"step": "consumer-scope-binding", "target": client_id, "action": action, "readback": binding_readback})
    principal = profile["servicePrincipalRegistry"][0]
    desired_client = desired_service_client(principal)
    service_client = observed.get("serviceClient")
    if service_client is None:
        plan.append({"step": "office-to-plant-client", "target": principal["clientId"], "action": "Block", "readback": "Signed exact-existing adoption does not authorize creating a missing service client; a separate creation ceremony is required."})
    else:
        drift = client_drift(service_client, desired_client)
        plan.append({"step": "office-to-plant-client", "target": principal["clientId"], "action": "ExactReplace" if drift else "NoChange", "readback": "Re-read full client flags; azp is the exact clientId and audience mapper is exact."})
        plan.extend(mapper_plan("office-to-plant-mapper", principal["clientId"], observed.get("serviceMappers", []), service_mappers(principal)))
        for binding_kind, scopes in (
            ("default", observed.get("serviceDefaultScopes", [])),
            ("optional", observed.get("serviceOptionalScopes", [])),
        ):
            for scope in scopes:
                scope_name = str(scope.get("name"))
                claims = sorted(
                    claim
                    for mapper in observed.get("serviceAttachedMappers", {}).get(scope_name, [])
                    if claim_conflicts((claim := mapper_claim(mapper)), SERVICE_TOKEN_AUTHORITY_CLAIMS)
                )
                detail = "Dedicated service tokens accept no attached client scope."
                if claims:
                    detail += " Conflicting authority claims: " + ",".join(claims)
                plan.append({
                    "step": "office-to-plant-scope-binding",
                    "target": f"{principal['clientId']}/{binding_kind}/{scope_name}",
                    "action": "Detach",
                    "readback": detail,
                })
        service_user = observed.get("serviceUser")
        if service_user is None:
            plan.append({"step": "office-to-plant-service-account", "target": principal["clientId"], "action": "Block", "readback": "Keycloak must expose a service-account user."})
        else:
            service_attrs = service_user.get("attributes") if isinstance(service_user, Mapping) else None
            for message in service_version_blockers(principal, service_attrs):
                plan.append({"step": "office-to-plant-version-guard", "target": principal["clientId"], "action": "Block", "readback": message})
            plan.append({"step": "office-to-plant-service-account", "target": principal["clientId"], "action": "ExactReplace" if owned_attribute_drift(service_attrs, desired_service_attributes(principal), SERVICE_OWNED_ATTRIBUTES) else "NoChange", "readback": "Tenant/project/station scope, versions, status, audit and rotation metadata must match exactly."})
    plan.append({"step": "stale-state-reread", "target": REALM, "action": "Required", "readback": "Immediately pre-mutation, require exact observation fingerprint " + str(expected_fingerprint) + "."})
    plan.append({"step": "service-disable-compensation", "target": principal["clientId"], "action": "Required", "readback": "Any failure or uncertain response must finish with an exact fresh disabled-client readback."})
    plan.append({"step": "post-apply-authority-readback", "target": REALM, "action": "Required", "readback": "The future serialized writer must keep complete online re-observation inside its compensation boundary; any exception or nonzero action proves disabled before returning."})
    plan.append({
        "step": "keycloak-atomic-cas",
        "target": REALM,
        "action": "Block",
        "readback": "Classic Keycloak Admin REST lacks a strong atomic conditional write across user/client/scope/mapper/binding resources; exact reread narrows but cannot close the race.",
    })
    return plan


def plan_counts(plan: Sequence[Mapping[str, Any]]) -> dict[str, int]:
    ignored = {"NoChange", "Required"}
    pending = sum(1 for step in plan if step.get("action") not in ignored)
    blocked = sum(1 for step in plan if step.get("action") == "Block")
    return {"pendingCount": pending, "blockedCount": blocked}


def _apply_mutations(profile: Mapping[str, Any], token: str, observed: Mapping[str, Any], plan: Sequence[Mapping[str, Any]], timeout_seconds: int) -> None:
    """Retired classic Admin mutation entrypoint; intentionally has no scaffold."""

    del profile, token, observed, plan, timeout_seconds
    raise ProjectionProvisioningError(
        "Classic Keycloak mutation is retired; use a separately reviewed serialized server-side writer/SPI."
    )


def apply(profile: Mapping[str, Any], token: str, observed: Mapping[str, Any], plan: Sequence[Mapping[str, Any]], timeout_seconds: int) -> None:
    """Retired public mutation entrypoint; always stops before reads or writes."""

    del profile, token, observed, plan, timeout_seconds
    raise ProjectionProvisioningError(
        "Apply is hard-disabled; a separately reviewed serialized server-side writer/SPI is required."
    )


def summary(profile_path: Path, profile: Mapping[str, Any], mode: str, findings: Sequence[Mapping[str, Any]], plan: Sequence[Mapping[str, Any]]) -> dict[str, Any]:
    result = {
        "schemaVersion": "spaceos-keycloak-authority-projection-summary/v1",
        "mode": mode,
        "profile": str(profile_path),
        "profileDigest": digest(profile),
        "contract": desired_contract(profile),
        "findings": list(findings),
        "plan": list(plan),
    }
    result.update(plan_counts(plan))
    # Mutating convergence cannot be claimed while --apply is hard-disabled and
    # reverse-binding/adoption/CAS evidence is incomplete.
    result["projectionConvergenceEvidence"] = False
    result["mutationSafetyEvidence"] = False
    # Provisioning convergence is only one activation prerequisite. Live token,
    # online Kernel/Plant membership and key custody remain separate gates.
    result["activationEvidence"] = False
    result["liveTokenEvidence"] = False
    result["liveKeyRotationEvidence"] = False
    return result


def write_summary(value: Mapping[str, Any], path: str | None) -> None:
    text = json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True)
    print(text)
    if path:
        target = Path(path)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text + "\n", encoding="utf-8")


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile", required=True, help="Non-secret JSON authority declaration.")
    parser.add_argument("--offline", action="store_true", help="Validate and render the exact-replace/readback contract without network access.")
    parser.add_argument("--verify-only", action="store_true", help="Online read-only convergence verification.")
    parser.add_argument("--apply", action="store_true", help="Reserved mutating mode; currently safety-disabled and exits before profile, credentials or network.")
    parser.add_argument("--summary-path", help="Optional non-secret JSON evidence output.")
    parser.add_argument("--timeout-seconds", type=int, default=30, help="Per-request timeout (1..120 seconds).")
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv if argv is not None else sys.argv[1:])
    profile_path = Path(args.profile)
    try:
        if sum(bool(value) for value in (args.offline, args.verify_only, args.apply)) != 1:
            raise ProjectionProvisioningError("Select exactly one explicit mode: --offline, --verify-only or --apply.")
        if args.apply:
            raise ProjectionProvisioningError(
                "--apply is safety-disabled until production receipt trust anchors and a serialized atomic server-side writer/SPI are separately reviewed."
            )
        if not 1 <= args.timeout_seconds <= 120:
            raise ProjectionProvisioningError("--timeout-seconds must be 1..120.")
        try:
            profile = strict_json_loads(profile_path.read_text(encoding="utf-8"))
        except (OSError, UnicodeDecodeError, json.JSONDecodeError, ProjectionProvisioningError):
            raise ProjectionProvisioningError("The profile could not be read as UTF-8 strict JSON.") from None
        findings = validate_profile(profile)
        if any(item["severity"] == "Error" for item in findings):
            failure = {
                "schemaVersion": "spaceos-keycloak-authority-projection-summary/v1",
                "mode": "ValidationFailed",
                "profile": str(profile_path),
                "findings": findings,
                "projectionConvergenceEvidence": False,
                "mutationSafetyEvidence": False,
                "activationEvidence": False,
                "liveTokenEvidence": False,
                "liveKeyRotationEvidence": False,
            }
            write_summary(failure, args.summary_path)
            return EXIT_ERROR
        if args.offline:
            write_summary(summary(profile_path, profile, "Offline", findings, offline_plan(profile)), args.summary_path)
            return EXIT_CONVERGED
        mode = "Apply" if args.apply else "Verify"
        token = keycloak.obtain_admin_token(profile, args.timeout_seconds)
        try:
            observed = observe(profile, token, args.timeout_seconds)
            plan = build_plan(profile, observed)
            if args.apply:
                apply(profile, token, observed, plan, args.timeout_seconds)
                reread = observe(profile, token, args.timeout_seconds)
                plan = build_plan(profile, reread)
                result = summary(profile_path, profile, "ApplyReadback", findings, plan)
            else:
                result = summary(profile_path, profile, mode, findings, plan)
            write_summary(result, args.summary_path)
            return EXIT_CONVERGED if result["pendingCount"] == 0 else EXIT_PENDING
        finally:
            token = ""
    except ProjectionProvisioningError as error:
        write_summary({
            "schemaVersion": "spaceos-keycloak-authority-projection-summary/v1",
            "mode": "Error",
            "profile": str(profile_path),
            "findings": [finding("Error", "Provisioning", "runtime", str(error))],
            "projectionConvergenceEvidence": False,
            "mutationSafetyEvidence": False,
            "activationEvidence": False,
            "liveTokenEvidence": False,
            "liveKeyRotationEvidence": False,
        }, args.summary_path)
        return EXIT_ERROR
    except keycloak.ProvisioningError as error:
        write_summary({
            "schemaVersion": "spaceos-keycloak-authority-projection-summary/v1",
            "mode": "Error",
            "profile": str(profile_path),
            "findings": [finding("Error", "Keycloak", "runtime", str(error))],
            "projectionConvergenceEvidence": False,
            "mutationSafetyEvidence": False,
            "activationEvidence": False,
            "liveTokenEvidence": False,
            "liveKeyRotationEvidence": False,
        }, args.summary_path)
        return EXIT_ERROR


if __name__ == "__main__":
    sys.exit(main())
