#!/usr/bin/env python3
"""Verify the offline, pinned SpaceOS Door Manufacturing auth contract release.

The verifier intentionally reads local files only. It neither discovers Keycloak
metadata nor makes a database, network, secret, tenant, or client operation.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Any, Mapping


ROOT = Path(__file__).resolve().parent.parent
RELEASE_DIR = ROOT / "docs" / "knowledge" / "contracts" / "releases" / "spaceos-door-manufacturing-auth" / "v1.0.0"
INSTANCE_CONTEXT = ROOT / "docs" / "knowledge" / "contracts" / "spaceos-instance-context-v1.openapi.yaml"
HOSTING_PROJECT = ROOT / "src" / "spaceos-modules-hosting" / "src" / "SpaceOS.Modules.Hosting" / "SpaceOS.Modules.Hosting.csproj"
HOSTING_README = ROOT / "src" / "spaceos-modules-hosting" / "README.md"
DEFAULT_INTAKE = ROOT.parent / "doorstar-instance" / "docs" / "projects" / "doorstar-spaceos-convergence" / "contracts" / "spaceos-door-manufacturing-auth-intake-v1.0.0.json"

PROFILE_NAME = "spaceos-door-manufacturing-auth-profile-v1.0.0.json"
STATION_NAME = "spaceos-door-manufacturing-station-policy-v1.0.0.json"
BOUNDARY_NAME = "spaceos-modules-hosting-auth-boundary-v1.0.0.json"
EVIDENCE_NAME = "spaceos-door-manufacturing-auth-negative-path-v1.0.0.json"
INTAKE_RECEIPT_NAME = "DOORSTAR-INTAKE-SHA256"


class VerificationError(RuntimeError):
    """A stable, non-secret local release verification failure."""


def sha256(path: Path) -> str:
    try:
        return hashlib.sha256(path.read_bytes()).hexdigest()
    except OSError as error:
        raise VerificationError(f"Could not read required file: {path.name}") from error


def read_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise VerificationError(f"Invalid JSON release artifact: {path.name}") from error
    if not isinstance(value, dict):
        raise VerificationError(f"Release artifact root must be an object: {path.name}")
    return value


def require(condition: bool, message: str) -> None:
    if not condition:
        raise VerificationError(message)


def expect_mapping(value: Any, label: str) -> Mapping[str, Any]:
    require(isinstance(value, Mapping), f"Expected object: {label}")
    return value


def expected_sums() -> dict[str, str]:
    sums_path = RELEASE_DIR / "SHA256SUMS"
    try:
        lines = sums_path.read_text(encoding="utf-8").splitlines()
    except OSError as error:
        raise VerificationError("Could not read SHA256SUMS.") from error

    records: dict[str, str] = {}
    for line in lines:
        parts = line.split("  ", maxsplit=1)
        require(len(parts) == 2, "SHA256SUMS has an invalid record.")
        digest, name = parts
        require(len(digest) == 64 and all(char in "0123456789abcdef" for char in digest), "SHA256SUMS has an invalid digest.")
        candidate = Path(name)
        require(candidate.name == name and name not in records, "SHA256SUMS has an invalid or duplicate file name.")
        records[name] = digest

    required = {"README.md", PROFILE_NAME, STATION_NAME, BOUNDARY_NAME, EVIDENCE_NAME, INTAKE_RECEIPT_NAME}
    require(set(records) == required, "SHA256SUMS does not describe exactly the v1.0.0 release payload.")
    for name, digest in records.items():
        require(sha256(RELEASE_DIR / name) == digest, f"SHA-256 mismatch: {name}")
    return records


def validate_profile(profile: Mapping[str, Any]) -> None:
    require(profile.get("schemaVersion") == "spaceos.door-manufacturing-auth-profile/v1", "Unexpected auth profile schema version.")
    require(profile.get("id") == "spaceos-door-manufacturing-auth-profile", "Unexpected auth profile id.")
    require(profile.get("version") == "1.0.0", "Unexpected auth profile version.")
    require(profile.get("status") == "released-contract-not-activated", "The profile must not claim runtime activation.")

    provider = expect_mapping(profile.get("identityProvider"), "identityProvider")
    require(provider.get("publicIssuer") == "https://joinerytech.hu/auth/realms/spaceos", "Unexpected public issuer.")
    require(provider.get("jwksUrl") == "https://joinerytech.hu/auth/realms/spaceos/protocol/openid-connect/certs", "Unexpected JWKS URL.")
    signing = expect_mapping(provider.get("signing"), "identityProvider.signing")
    require(signing.get("allowedAlgorithms") == ["RS256"], "Only RS256 may be accepted.")
    require(provider.get("operationalAdminBaseUrl") == "http://127.0.0.1:8080/auth", "Unexpected Keycloak admin target.")

    browser = expect_mapping(profile.get("browserClient"), "browserClient")
    require(browser.get("clientId") == "doormanufacturing-web", "Unexpected browser client id.")
    require(browser.get("publicOrigin") == "https://doormanufacturing.joinerytech.hu", "Unexpected browser origin.")
    require(browser.get("grant") == "authorization_code_with_pkce_s256", "Browser client must use code plus PKCE S256.")

    access_token = expect_mapping(profile.get("accessToken"), "accessToken")
    require(expect_mapping(access_token.get("tokenType"), "accessToken.tokenType") == {"claim": "typ", "value": "Bearer"}, "Unexpected token type profile.")
    require(expect_mapping(access_token.get("authorizedParty"), "accessToken.authorizedParty") == {"claim": "azp", "value": "doormanufacturing-web"}, "Unexpected authorized party profile.")
    audience = expect_mapping(access_token.get("audience"), "accessToken.audience")
    require(audience.get("claim") == "aud" and audience.get("mustContain") == "doormanufacturing-instance-api", "Unexpected audience profile.")
    tenant = expect_mapping(access_token.get("tenant"), "accessToken.tenant")
    require(tenant.get("claim") == "tid", "The profile must accept tid only.")
    module = expect_mapping(access_token.get("moduleEntitlement"), "accessToken.moduleEntitlement")
    require(module.get("claim") == "enabled_modules", "Unexpected module entitlement claim.")
    roles = expect_mapping(access_token.get("realmRoles"), "accessToken.realmRoles")
    require(roles.get("claim") == "realm_access.roles", "Unexpected realm role claim.")
    require(roles.get("capabilityMap") == {
        "doormanufacturing.admin": ["instance.read", "instance.write", "instance.admin"],
        "doormanufacturing.production-manager": ["instance.read", "instance.write"],
    }, "Unexpected scoped realm role map.")
    require(roles.get("rejectedGenericRoles") == ["Admin", "production_manager"], "Generic roles must remain rejected.")

    errors = expect_mapping(profile.get("errorContract"), "errorContract")
    require(expect_mapping(errors.get("unauthenticated"), "errorContract.unauthenticated").get("status") == 401, "401 contract drift.")
    require(expect_mapping(errors.get("forbidden"), "errorContract.forbidden").get("status") == 403, "403 contract drift.")
    correlation = expect_mapping(errors.get("correlation"), "errorContract.correlation")
    require(correlation.get("location") == "body" and correlation.get("name") == "correlationId", "Correlation contract drift.")
    station = expect_mapping(profile.get("station"), "station")
    require(station.get("jwtClaim") == "none" and station.get("status") == "not_implemented_in_this_release", "Station must remain a non-claim activation gate.")


def verify_release(intake_path: Path) -> dict[str, str]:
    sums = expected_sums()
    profile = read_json(RELEASE_DIR / PROFILE_NAME)
    station = read_json(RELEASE_DIR / STATION_NAME)
    boundary = read_json(RELEASE_DIR / BOUNDARY_NAME)
    evidence = read_json(RELEASE_DIR / EVIDENCE_NAME)
    validate_profile(profile)

    require(station.get("schemaVersion") == "spaceos.door-manufacturing-station-policy/v1", "Unexpected station policy schema.")
    require(station.get("status") == "released-policy-contract-not-implemented", "Station policy must not claim implementation.")
    require(expect_mapping(station.get("implementationState"), "station implementationState").get("runtimeEndpoint") == "none", "Station runtime endpoint must not be claimed live.")

    require(boundary.get("schemaVersion") == "spaceos.modules-hosting-auth-boundary/v1", "Unexpected hosting boundary schema.")
    require(boundary.get("materialization") == "This is a source-bound interface attestation, not a NuGet publication or a claim that a binary package was deployed.", "Hosting boundary materialization drift.")
    hosting = expect_mapping(boundary.get("hostingPackage"), "hostingPackage")
    require(hosting.get("packageId") == "SpaceOS.Modules.Hosting", "Unexpected hosting package id.")
    require(hosting.get("packageVersion") == "0.1.0-preview.2", "Unexpected hosting package version.")
    require(hosting.get("projectSha256") == sha256(HOSTING_PROJECT), "Hosting project hash drift.")
    require(hosting.get("readmeSha256") == sha256(HOSTING_README), "Hosting README hash drift.")
    profile_reference = expect_mapping(boundary.get("profileReference"), "profileReference")
    require(profile_reference.get("sha256") == sums[PROFILE_NAME], "Hosting boundary profile hash drift.")

    require(evidence.get("schemaVersion") == "spaceos.door-manufacturing-auth-negative-path-evidence/v1", "Unexpected negative-path evidence schema.")
    require(evidence.get("verdict") == "PASS", "Negative-path evidence is not PASS.")
    result = expect_mapping(evidence.get("result"), "negative path result")
    require(result.get("testFilesPassed") == 1 and result.get("testsPassed") == 6 and result.get("databaseRequired") is False and result.get("networkRequired") is False, "Negative-path evidence result drift.")
    source = expect_mapping(evidence.get("source"), "negative path source")
    validator = ROOT.parent / str(source.get("validatorPath", ""))
    test = ROOT.parent / str(source.get("testPath", ""))
    require(source.get("validatorSha256") == sha256(validator), "Doorstar validator hash drift.")
    require(source.get("testSha256") == sha256(test), "Doorstar negative-path test hash drift.")

    instance_context_hash = sha256(INSTANCE_CONTEXT)
    instance_context_text = INSTANCE_CONTEXT.read_text(encoding="utf-8")
    require(
        "version: 1.0.0-draft.1" in instance_context_text
        and "this document remains a draft and no" in instance_context_text
        and "runtime endpoint is published from it." in instance_context_text,
        "Instance Context draft-state assertion drift.",
    )

    try:
        receipt = (RELEASE_DIR / INTAKE_RECEIPT_NAME).read_text(encoding="utf-8").strip().split("  ", maxsplit=1)
    except OSError as error:
        raise VerificationError("Could not read the Doorstar intake receipt.") from error
    require(len(receipt) == 2 and receipt[1] == "spaceos-door-manufacturing-auth-intake-v1.0.0.json", "Doorstar intake receipt drift.")
    require(receipt[0] == sha256(intake_path), "Doorstar intake checksum mismatch.")

    intake = read_json(intake_path)
    require(intake.get("schemaVersion") == "instance-platform-auth-contract-intake/v1" and intake.get("status") == "released", "Invalid Doorstar intake envelope.")
    platform = expect_mapping(intake.get("platform"), "intake platform")
    require(platform.get("commit") == "63743b91445604cdc53f6b4885da4ca48df3035c", "Unexpected platform source revision.")
    require(expect_mapping(platform.get("hostingPackage"), "intake hostingPackage").get("sha256") == sums[BOUNDARY_NAME], "Intake hosting boundary hash drift.")
    instance_context = expect_mapping(platform.get("instanceContextContract"), "intake instanceContextContract")
    require(instance_context.get("version") == "1.0.0-draft.1" and instance_context.get("sha256") == instance_context_hash, "Intake Instance Context reference drift.")
    require(expect_mapping(platform.get("tenantStationContract"), "intake tenantStationContract").get("sha256") == sums[STATION_NAME], "Intake station policy hash drift.")

    identity = expect_mapping(intake.get("identity"), "intake identity")
    require(identity.get("issuer") == profile["identityProvider"]["publicIssuer"], "Intake issuer drift.")
    require(identity.get("jwksUrl") == profile["identityProvider"]["jwksUrl"], "Intake JWKS drift.")
    require(identity.get("audience") == "doormanufacturing-instance-api" and identity.get("allowedAlgorithms") == ["RS256"], "Intake audience or algorithm drift.")
    require(expect_mapping(intake.get("errors"), "intake errors").get("unauthenticatedStatus") == 401, "Intake 401 drift.")
    errors = expect_mapping(intake.get("errors"), "intake errors")
    require(errors.get("forbiddenStatus") == 403 and expect_mapping(errors.get("correlationId"), "intake correlation").get("location") == "body" and expect_mapping(errors.get("correlationId"), "intake correlation").get("name") == "correlationId", "Intake 403/correlation drift.")
    security_gate = expect_mapping(intake.get("securityGate"), "securityGate")
    evidence_reference = expect_mapping(security_gate.get("negativePathEvidence"), "negativePathEvidence")
    require(security_gate.get("verdict") == "PASS" and evidence_reference.get("sha256") == sums[EVIDENCE_NAME], "Intake security evidence drift.")

    return {
        "verification": "passed",
        "release": "spaceos-door-manufacturing-auth/v1.0.0",
        "intakeSha256": sha256(intake_path),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Verify the offline Door Manufacturing auth-contract release.")
    parser.add_argument("--intake", type=Path, default=DEFAULT_INTAKE, help="Path to the Doorstar intake JSON.")
    args = parser.parse_args(argv)
    try:
        print(json.dumps(verify_release(args.intake.resolve()), sort_keys=True))
        return 0
    except VerificationError as error:
        print(json.dumps({"verification": "failed", "error": str(error)}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
