"""Offline tests for the native Keycloak authority projection provisioner."""

from __future__ import annotations

import base64
import hashlib
import inspect
import json
import math
import secrets
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from io import StringIO
from pathlib import Path
from unittest.mock import MagicMock, patch


SCRIPTS = Path(__file__).resolve().parent
ROOT = SCRIPTS.parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

import provision_keycloak_tenant_projection as subject  # noqa: E402


def sample_profile() -> dict:
    return json.loads((ROOT / "config" / "keycloak-tenant-projection.sample.json").read_text(encoding="utf-8"))


def _probable_prime(value: int, rounds: int = 10) -> bool:
    small_primes = (3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47)
    if any(value % prime == 0 for prime in small_primes):
        return value in small_primes
    divisor = value - 1
    power = 0
    while divisor % 2 == 0:
        divisor //= 2
        power += 1
    for _ in range(rounds):
        base = secrets.randbelow(value - 3) + 2
        witness = pow(base, divisor, value)
        if witness in (1, value - 1):
            continue
        for _ in range(power - 1):
            witness = pow(witness, 2, value)
            if witness == value - 1:
                break
        else:
            return False
    return True


def _ephemeral_prime(bits: int) -> int:
    while True:
        candidate = secrets.randbits(bits) | (1 << (bits - 1)) | 1
        if math.gcd(candidate - 1, 65537) == 1 and _probable_prime(candidate):
            return candidate


def ephemeral_test_rsa() -> tuple[int, int]:
    while True:
        first = _ephemeral_prime(1536)
        second = _ephemeral_prime(1536)
        if first == second:
            continue
        modulus = first * second
        if modulus.bit_length() < 3072:
            continue
        phi = (first - 1) * (second - 1)
        if math.gcd(phi, 65537) == 1:
            return modulus, pow(65537, -1, phi)


def sign_receipt_payload(payload: dict, modulus: int, private_exponent: int) -> str:
    encoded_length = (modulus.bit_length() + 7) // 8
    digest_info = subject.PKCS1_SHA256_PREFIX + hashlib.sha256(
        subject.stable_json(payload).encode("utf-8")
    ).digest()
    encoded = b"\x00\x01" + b"\xff" * (encoded_length - len(digest_info) - 3) + b"\x00" + digest_info
    signature = pow(int.from_bytes(encoded, "big"), private_exponent, modulus).to_bytes(encoded_length, "big")
    return base64.urlsafe_b64encode(signature).rstrip(b"=").decode("ascii")


def converged_observed(profile: dict) -> dict:
    principal = profile["servicePrincipalRegistry"][0]
    resources = subject.adoption_resource_map(profile)
    service_client = subject.desired_service_client(principal)
    service_client["id"] = resources[("service-client", principal["clientId"])]["resourceId"]
    consumers = {}
    managed_scopes = {}
    managed_scope_mappers = {}
    for projection in subject.consumer_projections(profile):
        client_id = projection["clientId"]
        managed_scope = subject.desired_consumer_scope(projection)
        managed_scope["id"] = resources[
            ("client-scope", subject.consumer_scope_name(projection))
        ]["resourceId"]
        managed_scopes[client_id] = managed_scope
        managed_scope_mappers[client_id] = subject.human_mappers(projection)
        security = subject.desired_consumer_security_profile(profile, projection)
        consumers[client_id] = {
            "client": {
                "id": resources[("consumer-client", client_id)]["resourceId"],
                "clientId": client_id,
                **{
                    name: security[name]
                    for name in subject.CLIENT_ELIGIBILITY_FIELDS
                },
                "redirectUris": security["redirectUris"],
                "webOrigins": security["webOrigins"],
                "attributes": {
                    subject.PKCE_CLIENT_ATTRIBUTE: security["pkceCodeChallengeMethod"]
                },
            },
            "directMappers": [],
            "defaultScopes": [managed_scope],
            "optionalScopes": [],
            "attachedMappers": {
                subject.consumer_scope_name(projection): subject.human_mappers(projection)
            },
        }
    service_record = {
        "client": service_client,
        "directMappers": subject.service_mappers(principal),
        "defaultScopes": [],
        "optionalScopes": [],
        "attachedMappers": {},
    }
    observed = {
        "user": {
            "id": profile["authority"]["subjectId"],
            "username": "redacted-user",
            "attributes": subject.desired_human_attributes(profile),
        },
        "managedScopes": managed_scopes,
        "managedScopeMappers": managed_scope_mappers,
        "consumers": consumers,
        "serviceClient": service_client,
        "serviceMappers": subject.service_mappers(principal),
        "serviceUser": {
            "id": "service-user-id",
            "username": "service-account-joinerytech-office-to-plant",
            "attributes": subject.desired_service_attributes(principal),
        },
        "serviceDefaultScopes": [],
        "serviceOptionalScopes": [],
        "serviceAttachedMappers": {},
        "realmInventory": {
            "complete": True,
            "stablePasses": 2,
            "clientScopes": list(managed_scopes.values()),
            "clients": [*consumers.values(), service_record],
        },
    }
    observed["observationFingerprint"] = subject.observation_fingerprint(profile, observed)
    return observed


class ProfileValidationTests(unittest.TestCase):
    def test_sample_profile_is_valid(self) -> None:
        self.assertEqual([], subject.validate_profile(sample_profile()))

    def test_secret_like_key_is_rejected(self) -> None:
        profile = sample_profile()
        profile["adminCredential"] = "must-not-exist"
        codes = {item["code"] for item in subject.validate_profile(profile)}
        self.assertIn("SecretInProfile", codes)

    def test_unknown_profile_field_is_rejected(self) -> None:
        profile = sample_profile()
        profile["compatibilityMode"] = "legacy-flat"
        codes = {item["code"] for item in subject.validate_profile(profile)}
        self.assertIn("ProfileField", codes)

    def test_all_flat_claims_must_be_explicitly_prohibited(self) -> None:
        profile = sample_profile()
        profile["authorityScope"]["prohibitedFlatClaims"].remove("tid")
        codes = {item["code"] for item in subject.validate_profile(profile)}
        self.assertIn("FlatClaims", codes)

    def test_selected_tenant_must_be_one_active_membership(self) -> None:
        profile = sample_profile()
        profile["authority"]["memberships"][0]["status"] = "revoked"
        codes = {item["code"] for item in subject.validate_profile(profile)}
        self.assertIn("SelectedTenant", codes)

    def test_duplicate_membership_tenant_is_rejected(self) -> None:
        profile = sample_profile()
        duplicate = deepcopy(profile["authority"]["memberships"][0])
        profile["authority"]["memberships"].append(duplicate)
        codes = {item["code"] for item in subject.validate_profile(profile)}
        self.assertIn("DuplicateTenant", codes)

    def test_json_bool_is_not_a_version_integer(self) -> None:
        profile = sample_profile()
        profile["authority"]["projectionVersion"] = True
        profile["authority"]["memberships"][0]["membership_version"] = True
        codes = {item["code"] for item in subject.validate_profile(profile)}
        self.assertIn("ProjectionVersion", codes)
        self.assertIn("MembershipVersion", codes)

    def test_versions_fit_the_cross_consumer_json_safe_integer_range(self) -> None:
        profile = sample_profile()
        profile["authority"]["projectionVersion"] = subject.JSON_SAFE_INTEGER + 1
        profile["authority"]["memberships"][0]["membership_version"] = subject.JSON_SAFE_INTEGER + 1
        profile["servicePrincipalRegistry"][0]["membershipVersion"] = subject.JSON_SAFE_INTEGER + 1
        codes = {item["code"] for item in subject.validate_profile(profile)}
        self.assertIn("ProjectionVersion", codes)
        self.assertIn("MembershipVersion", codes)
        self.assertIn("ServicePrincipalVersion", codes)

    def test_internal_and_service_clients_cannot_consume_human_authority(self) -> None:
        for client_id in ("admin-cli", "realm-management", subject.OFFICE_TO_PLANT_CLIENT_ID):
            with self.subTest(client_id=client_id):
                profile = sample_profile()
                profile["authorityScope"]["consumerProjections"][0]["clientId"] = client_id
                codes = {item["code"] for item in subject.validate_profile(profile)}
                self.assertIn("AuthorityConsumerReserved", codes)

    def test_consumer_ids_must_be_unique(self) -> None:
        profile = sample_profile()
        duplicate = deepcopy(profile["authorityScope"]["consumerProjections"][0])
        profile["authorityScope"]["consumerProjections"].append(duplicate)
        codes = {item["code"] for item in subject.validate_profile(profile)}
        self.assertIn("AuthorityConsumerDuplicate", codes)

    def test_consumer_audiences_are_exact_sorted_and_nonempty(self) -> None:
        profile = sample_profile()
        profile["authorityScope"]["consumerProjections"][0]["audiences"] = [
            "kernel-api",
            "doormanufacturing-instance-api",
        ]
        codes = {item["code"] for item in subject.validate_profile(profile)}
        self.assertIn("AuthorityConsumerAudience", codes)

    def test_consumer_browser_urls_are_strict_and_source_pinned(self) -> None:
        profile = sample_profile()
        consumer = profile["authorityScope"]["consumerProjections"][0]
        consumer["redirectUris"] = ["https://attacker.invalid/*"]
        consumer["webOrigins"] = ["https://attacker.invalid"]
        codes = {item["code"] for item in subject.validate_profile(profile)}
        self.assertIn("AuthorityConsumerRedirect", codes)
        self.assertIn("AuthorityConsumerSourcePin", codes)

    def test_consumer_browser_url_object_is_structured_validation_error(self) -> None:
        profile = sample_profile()
        profile["authorityScope"]["consumerProjections"][0]["redirectUris"] = [{}]
        codes = {item["code"] for item in subject.validate_profile(profile)}
        self.assertIn("AuthorityConsumerRedirect", codes)

    def test_consumer_browser_posture_cannot_substitute_a_valid_https_origin(self) -> None:
        profile = sample_profile()
        consumer = profile["authorityScope"]["consumerProjections"][0]
        consumer["redirectUris"] = ["https://attacker.invalid/auth/callback"]
        consumer["webOrigins"] = ["https://attacker.invalid"]
        codes = {item["code"] for item in subject.validate_profile(profile)}
        self.assertNotIn("AuthorityConsumerRedirect", codes)
        self.assertNotIn("AuthorityConsumerOrigin", codes)
        self.assertIn("AuthorityConsumerSourcePin", codes)

    def test_s256_pkce_policy_is_exact_and_required(self) -> None:
        for value in (None, "plain"):
            with self.subTest(value=value):
                profile = sample_profile()
                if value is None:
                    profile["mutationSafety"]["consumerEligibilityPolicy"].pop(
                        "pkceCodeChallengeMethod"
                    )
                else:
                    profile["mutationSafety"]["consumerEligibilityPolicy"][
                        "pkceCodeChallengeMethod"
                    ] = value
                codes = {item["code"] for item in subject.validate_profile(profile)}
                self.assertIn("ConsumerEligibilityPolicy", codes)

    def test_consumer_permission_must_belong_to_its_single_module(self) -> None:
        profile = sample_profile()
        profile["authorityScope"]["consumerProjections"][0]["permission"] = "joinerytech.plant.admin"
        codes = {item["code"] for item in subject.validate_profile(profile)}
        self.assertIn("AuthorityConsumerPermission", codes)

    def test_consumer_grant_must_exist_in_selected_registry_membership(self) -> None:
        profile = sample_profile()
        profile["authority"]["memberships"][0]["permissions"].remove("joinerytech.door.admin")
        profile["authority"]["memberships"][0]["enabled_modules"].remove("joinerytech.door")
        codes = {item["code"] for item in subject.validate_profile(profile)}
        self.assertIn("AuthorityConsumerGrant", codes)

    def test_noncanonical_uuid_input_is_rejected_not_normalized(self) -> None:
        profile = sample_profile()
        profile["authority"]["memberships"][0]["tenant_id"] = "{11111111-2222-4333-8444-555555555555}"
        profile["authority"]["selectedTenantId"] = "AAAAAAAA-2222-4333-8444-555555555555"
        codes = {item["code"] for item in subject.validate_profile(profile)}
        self.assertIn("TenantId", codes)
        self.assertIn("SelectedTenant", codes)

    def test_permissions_and_modules_must_match_exactly(self) -> None:
        profile = sample_profile()
        profile["authority"]["memberships"][0]["enabled_modules"].remove("spaceos.crm")
        codes = {item["code"] for item in subject.validate_profile(profile)}
        self.assertIn("PermissionModuleDrift", codes)

    def test_service_principal_scope_must_reference_membership(self) -> None:
        profile = sample_profile()
        profile["servicePrincipalRegistry"][0]["scope"]["tenant_id"] = "598e2c60-a188-4c6a-87d5-a33df6841246"
        codes = {item["code"] for item in subject.validate_profile(profile)}
        self.assertIn("ServicePrincipalTenant", codes)

    def test_active_principal_cannot_use_unprovisioned_key_state(self) -> None:
        profile = sample_profile()
        profile["servicePrincipalRegistry"][0]["status"] = "active"
        codes = {item["code"] for item in subject.validate_profile(profile)}
        self.assertIn("KeyRotationNotProvisioned", codes)

    def test_rotation_requires_an_immutable_custody_receipt_id(self) -> None:
        profile = sample_profile()
        principal = profile["servicePrincipalRegistry"][0]
        principal["keyRotation"]["custodyReceiptId"] = "0" * 64
        codes = {item["code"] for item in subject.validate_profile(profile)}
        self.assertIn("KeyRotationEvidence", codes)
        principal["keyRotation"]["custodyReceiptId"] = "16111111-1111-4111-8111-111111111111"
        principal["keyRotation"]["state"] = "current"
        principal["keyRotation"]["activeVersion"] = 0
        codes = {item["code"] for item in subject.validate_profile(profile)}
        self.assertIn("KeyRotationVersion", codes)

    def test_rotation_timestamps_are_calendrical_and_ordered(self) -> None:
        profile = sample_profile()
        principal = profile["servicePrincipalRegistry"][0]
        principal["keyRotation"] = {
            "state": "current",
            "activeVersion": 1,
            "activeKeyId": "office-plant-key-1",
            "previousKeyId": None,
            "activatedAt": "2026-02-31T20:00:00.000Z",
            "rotateAfter": "2026-01-20T20:00:00.000Z",
            "overlapUntil": None,
            "custodyReceiptId": "16111111-1111-4111-8111-111111111111",
        }
        codes = {item["code"] for item in subject.validate_profile(profile)}
        self.assertIn("KeyRotationTime", codes)

        principal["keyRotation"]["activatedAt"] = "2026-08-20T20:00:00.000Z"
        codes = {item["code"] for item in subject.validate_profile(profile)}
        self.assertIn("KeyRotationOrder", codes)


class SignedReceiptTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.modulus, cls.private_exponent = ephemeral_test_rsa()

    def signed_profile(self) -> tuple[dict, dict]:
        profile = sample_profile()
        now = datetime.now(timezone.utc).replace(microsecond=0)
        issued_at = now.strftime("%Y-%m-%dT%H:%M:%SZ")
        expires_at = (now + timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
        owner = profile["mutationSafety"]["ownerReceipt"]
        custody = profile["mutationSafety"]["custodyReceipt"]
        owner["payload"]["issuedAt"] = issued_at
        owner["payload"]["expiresAt"] = expires_at
        custody["payload"]["issuedAt"] = issued_at
        custody["payload"]["expiresAt"] = expires_at
        owner["signature"]["keyId"] = "ephemeral-owner-test"
        custody["signature"]["keyId"] = "ephemeral-custody-test"
        owner["signature"]["value"] = sign_receipt_payload(
            owner["payload"], self.modulus, self.private_exponent
        )
        custody["signature"]["value"] = sign_receipt_payload(
            custody["payload"], self.modulus, self.private_exponent
        )
        keys = {
            "ephemeral-owner-test": {
                "algorithm": "RS256",
                "usage": "owner-adoption",
                "modulus": self.modulus,
                "exponent": 65537,
            },
            "ephemeral-custody-test": {
                "algorithm": "RS256",
                "usage": "service-custody",
                "modulus": self.modulus,
                "exponent": 65537,
            },
        }
        return profile, keys

    def test_ephemeral_external_anchors_verify_both_exact_receipts(self) -> None:
        profile, keys = self.signed_profile()
        self.assertEqual([], subject.validate_profile(profile))
        with patch.dict(subject.TRUSTED_RECEIPT_KEYS, keys, clear=True):
            self.assertEqual([], subject.mutation_safety_blockers(profile))

    def test_valid_signature_over_substituted_realm_still_fails_semantics(self) -> None:
        profile, keys = self.signed_profile()
        receipt = profile["mutationSafety"]["ownerReceipt"]
        receipt["payload"]["realm"] = "attacker-realm"
        receipt["signature"]["value"] = sign_receipt_payload(
            receipt["payload"], self.modulus, self.private_exponent
        )
        with patch.dict(subject.TRUSTED_RECEIPT_KEYS, keys, clear=True):
            self.assertIsNone(subject.verify_rs256_receipt(receipt, usage="owner-adoption"))
        codes = {item["code"] for item in subject.validate_profile(profile)}
        self.assertIn("OwnerReceiptBinding", codes)

    def test_custody_scope_substitution_breaks_signature_or_semantic_binding(self) -> None:
        profile, keys = self.signed_profile()
        receipt = profile["mutationSafety"]["custodyReceipt"]
        receipt["payload"]["audience"] = "attacker-api"
        with patch.dict(subject.TRUSTED_RECEIPT_KEYS, keys, clear=True):
            blocker = subject.verify_rs256_receipt(receipt, usage="service-custody")
        self.assertIn("does not verify", blocker or "")

        receipt["signature"]["value"] = sign_receipt_payload(
            receipt["payload"], self.modulus, self.private_exponent
        )
        self.assertIn(
            "CustodyReceiptBinding",
            {item["code"] for item in subject.validate_profile(profile)},
        )

    def test_expired_validly_signed_receipts_are_not_mutation_evidence(self) -> None:
        profile, keys = self.signed_profile()
        now = datetime.now(timezone.utc).replace(microsecond=0)
        for name in ("ownerReceipt", "custodyReceipt"):
            receipt = profile["mutationSafety"][name]
            receipt["payload"]["issuedAt"] = (now - timedelta(days=2)).strftime("%Y-%m-%dT%H:%M:%SZ")
            receipt["payload"]["expiresAt"] = (now - timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
            receipt["signature"]["value"] = sign_receipt_payload(
                receipt["payload"], self.modulus, self.private_exponent
            )
        with patch.dict(subject.TRUSTED_RECEIPT_KEYS, keys, clear=True):
            blockers = subject.mutation_safety_blockers(profile)
        self.assertEqual(2, sum("expired" in item for item in blockers))

    def test_wrong_receipt_usage_is_rejected_even_with_valid_signature(self) -> None:
        profile, keys = self.signed_profile()
        owner = profile["mutationSafety"]["ownerReceipt"]
        owner["signature"]["keyId"] = "ephemeral-custody-test"
        owner["signature"]["value"] = sign_receipt_payload(
            owner["payload"], self.modulus, self.private_exponent
        )
        with patch.dict(subject.TRUSTED_RECEIPT_KEYS, keys, clear=True):
            blocker = subject.verify_rs256_receipt(owner, usage="owner-adoption")
        self.assertIn("not authorized", blocker or "")


class DesiredProjectionTests(unittest.TestCase):
    def test_token_projection_contains_exactly_selected_tenant(self) -> None:
        profile = sample_profile()
        second = deepcopy(profile["authority"]["memberships"][0])
        second["tenant_id"] = "598e2c60-a188-4c6a-87d5-a33df6841246"
        second["membership_version"] = 4
        profile["authority"]["memberships"].append(second)
        attributes = subject.desired_human_attributes(profile)
        registry = json.loads(attributes["spaceos_membership_registry"][0])
        self.assertEqual(2, len(registry))
        for consumer in subject.consumer_projections(profile):
            token_projection = json.loads(
                attributes[subject.consumer_projection_attribute(consumer)][0]
            )
            self.assertEqual(1, len(token_projection))
            self.assertEqual(profile["authority"]["selectedTenantId"], token_projection[0]["tenant_id"])

    def test_no_selection_emits_empty_authority_but_versions_remain(self) -> None:
        profile = sample_profile()
        profile["authority"]["selectedTenantId"] = None
        attributes = subject.desired_human_attributes(profile)
        for consumer in subject.consumer_projections(profile):
            self.assertEqual(
                [],
                json.loads(attributes[subject.consumer_projection_attribute(consumer)][0]),
            )
        self.assertEqual(["1"], attributes["spaceos_selected_membership_version"])
        self.assertEqual(["1"], attributes["spaceos_projection_version"])

    def test_each_native_entry_is_exact_three_key_one_product_wire(self) -> None:
        profile = sample_profile()
        attributes = subject.desired_human_attributes(profile)
        for consumer in subject.consumer_projections(profile):
            projection = json.loads(
                attributes[subject.consumer_projection_attribute(consumer)][0]
            )[0]
            self.assertEqual(
                {"tenant_id", "permissions", "enabled_modules"},
                set(projection),
            )
            self.assertEqual([consumer["permission"]], projection["permissions"])
            self.assertEqual([consumer["moduleId"]], projection["enabled_modules"])

    def test_registry_keeps_metadata_and_multi_product_authority_off_token(self) -> None:
        profile = sample_profile()
        attributes = subject.desired_human_attributes(profile)
        registry = json.loads(attributes["spaceos_membership_registry"][0])[0]
        self.assertEqual("Manufacturer", registry["tenant_type"])
        self.assertEqual("doorstar", registry["brand_skin"])
        self.assertGreater(len(registry["permissions"]), 1)
        self.assertGreater(len(registry["enabled_modules"]), 1)
        self.assertNotIn("spaceos_tenants", attributes)

    def test_consumer_registry_is_persisted_but_never_mapped_to_a_token(self) -> None:
        profile = sample_profile()
        attributes = subject.desired_human_attributes(profile)
        registry = json.loads(attributes["spaceos_consumer_projection_registry"][0])
        self.assertEqual(
            [consumer["clientId"] for consumer in subject.consumer_projections(profile)],
            [entry["client_id"] for entry in registry],
        )
        mapped_attributes = {
            mapper["config"].get("user.attribute")
            for consumer in subject.consumer_projections(profile)
            for mapper in subject.human_mappers(consumer)
        }
        self.assertNotIn("spaceos_consumer_projection_registry", mapped_attributes)
        self.assertNotIn("spaceos_membership_registry", mapped_attributes)

    def test_human_attributes_do_not_emit_flat_aliases(self) -> None:
        attributes = subject.desired_human_attributes(sample_profile())
        self.assertTrue(subject.FLAT_AUTHORITY_CLAIMS.isdisjoint(attributes))

    def test_version_mappers_emit_native_long_access_token_claims(self) -> None:
        consumer = subject.consumer_projections(sample_profile())[0]
        by_claim = {
            mapper["config"]["claim.name"]: mapper
            for mapper in subject.human_mappers(consumer)
            if "claim.name" in mapper["config"]
        }
        for claim in ("spaceos_membership_version", "spaceos_projection_version"):
            self.assertEqual("long", by_claim[claim]["config"]["jsonType.label"])
            self.assertEqual("true", by_claim[claim]["config"]["access.token.claim"])
            self.assertEqual("false", by_claim[claim]["config"]["id.token.claim"])

    def test_human_mappers_pin_every_consumer_audience_exactly(self) -> None:
        profile = sample_profile()
        for consumer in subject.consumer_projections(profile):
            emitted = sorted(
                mapper["config"]["included.custom.audience"]
                for mapper in subject.human_mappers(consumer)
                if mapper["protocolMapper"] == "oidc-audience-mapper"
            )
            self.assertEqual(consumer["audiences"], emitted)

    def test_service_projection_is_bounded_to_tenant_projects_and_stations(self) -> None:
        principal = sample_profile()["servicePrincipalRegistry"][0]
        projection = json.loads(subject.desired_service_attributes(principal)["spaceos_service_principal"][0])
        self.assertEqual(
            {"principal_id", "tenant_id", "project_ids", "station_ids", "permissions"},
            set(projection),
        )
        self.assertEqual(["station-cnc-01"], projection["station_ids"])

    def test_service_permission_vocabulary_matches_plant_exact_contract(self) -> None:
        principal = sample_profile()["servicePrincipalRegistry"][0]
        projection = subject.service_projection(principal)
        self.assertEqual(
            ["office.ack_outbox", "office.issue_work_package", "office.read_outbox"],
            projection["permissions"],
        )
        self.assertEqual(set(projection["permissions"]), subject.SERVICE_PERMISSIONS)

    def test_platform_fixtures_match_plant_and_doorstar_human_grammars(self) -> None:
        profile = sample_profile()
        attributes = subject.desired_human_attributes(profile)
        consumers = {value["clientId"]: value for value in subject.consumer_projections(profile)}
        expected = {
            "doormanufacturing-web": (
                ["doormanufacturing-instance-api", "kernel-api"],
                "joinerytech.door",
                "joinerytech.door.admin",
            ),
            "joinerytech-plant-web": (
                ["joinerytech-plant-api", "joinerytech-plant-web"],
                "joinerytech.plant",
                "joinerytech.plant.admin",
            ),
        }
        for client_id, (audiences, module_id, permission) in expected.items():
            consumer = consumers[client_id]
            projection = json.loads(
                attributes[subject.consumer_projection_attribute(consumer)][0]
            )
            self.assertEqual(audiences, consumer["audiences"])
            self.assertEqual(
                [{
                    "tenant_id": profile["authority"]["selectedTenantId"],
                    "permissions": [permission],
                    "enabled_modules": [module_id],
                }],
                projection,
            )

    def test_service_mapper_pins_audience_and_azp_is_client_id(self) -> None:
        principal = sample_profile()["servicePrincipalRegistry"][0]
        audience = next(mapper for mapper in subject.service_mappers(principal) if mapper["protocolMapper"] == "oidc-audience-mapper")
        self.assertEqual(subject.PLANT_API_AUDIENCE, audience["config"]["included.custom.audience"])
        self.assertEqual(subject.OFFICE_TO_PLANT_CLIENT_ID, subject.desired_contract(sample_profile())["servicePrincipal"]["azp"])


class PlanSafetyTests(unittest.TestCase):
    def test_offline_contract_keeps_plant_browser_activation_default_off(self) -> None:
        profile = sample_profile()
        plan = subject.offline_plan(profile)
        plant_block = next(
            step for step in plan
            if step["step"] == "consumer-browser-activation"
            and step["target"] == "joinerytech-plant-web"
        )
        self.assertEqual("Block", plant_block["action"])
        plant_contract = next(
            item for item in subject.desired_contract(profile)["human"]["consumers"]
            if item["clientId"] == "joinerytech-plant-web"
        )
        self.assertFalse(plant_contract["enabled"])
        self.assertFalse(plant_contract["browserActivationEvidence"])
        self.assertEqual([], plant_contract["redirectUris"])
        self.assertEqual([], plant_contract["webOrigins"])

    def test_locally_matching_state_still_has_trust_anchor_and_atomic_cas_blocks(self) -> None:
        profile = sample_profile()
        plan = subject.build_plan(profile, converged_observed(profile))
        self.assertEqual({"pendingCount": 4, "blockedCount": 4}, subject.plan_counts(plan))
        blocked = [step for step in plan if step["action"] == "Block"]
        self.assertEqual(
            [
                "signed-receipt-verification",
                "signed-receipt-verification",
                "consumer-browser-activation",
                "keycloak-atomic-cas",
            ],
            [step["step"] for step in blocked],
        )

    def test_mixed_flat_mapper_blocks_apply(self) -> None:
        profile = sample_profile()
        observed = converged_observed(profile)
        observed["consumers"]["joinerytech-plant-web"]["directMappers"].append({
            "name": "legacy-tid",
            "config": {"claim.name": "tid"},
        })
        plan = subject.build_plan(profile, observed)
        blockers = [step for step in plan if step["action"] == "Block"]
        self.assertTrue(any(step["step"] == "consumer-mixed-claim-guard" for step in blockers))

    def test_unmanaged_duplicate_native_mapper_blocks_apply(self) -> None:
        profile = sample_profile()
        observed = converged_observed(profile)
        observed["consumers"]["joinerytech-plant-web"]["attachedMappers"]["other-scope"] = [{
            "name": "duplicate-native",
            "config": {"claim.name": "spaceos_tenants"},
        }]
        plan = subject.build_plan(profile, observed)
        self.assertTrue(any(step["action"] == "Block" for step in plan))

    def test_unmanaged_version_mapper_blocks_apply(self) -> None:
        profile = sample_profile()
        observed = converged_observed(profile)
        observed["consumers"]["joinerytech-plant-web"]["directMappers"].append({
            "name": "duplicate-membership-version",
            "config": {"claim.name": "spaceos_membership_version"},
        })
        plan = subject.build_plan(profile, observed)
        self.assertTrue(any(step["step"] == "consumer-mixed-claim-guard" and step["action"] == "Block" for step in plan))

    def test_unmanaged_audience_resolve_mapper_blocks_exact_aud_evidence(self) -> None:
        profile = sample_profile()
        observed = converged_observed(profile)
        observed["consumers"]["joinerytech-plant-web"]["attachedMappers"]["roles"] = [{
            "name": "audience-resolve",
            "protocol": "openid-connect",
            "protocolMapper": "oidc-audience-resolve-mapper",
            "config": {},
        }]
        plan = subject.build_plan(profile, observed)
        self.assertTrue(any(
            step["step"] == "consumer-audience-guard" and step["action"] == "Block"
            for step in plan
        ))

    def test_authority_claim_prefix_collision_blocks(self) -> None:
        profile = sample_profile()
        observed = converged_observed(profile)
        observed["consumers"]["joinerytech-plant-web"]["directMappers"].append({
            "name": "prefix-collision",
            "config": {"claim.name": "spaceos_tenants.permissions"},
        })
        plan = subject.build_plan(profile, observed)
        self.assertTrue(any(
            step["step"] == "consumer-mixed-claim-guard" and step["action"] == "Block"
            for step in plan
        ))

    def test_partial_human_versioned_state_blocks_bootstrap_bypass(self) -> None:
        blockers = subject.human_version_blockers(
            sample_profile(),
            {"spaceos_projection_version": ["99"]},
        )
        self.assertTrue(any("partial" in message.lower() for message in blockers))

    def test_selected_membership_version_must_match_registry(self) -> None:
        profile = sample_profile()
        attributes = subject.desired_human_attributes(profile)
        attributes["spaceos_selected_membership_version"] = ["99"]
        blockers = subject.human_version_blockers(profile, attributes)
        self.assertTrue(any("authoritative registry" in message.lower() for message in blockers))

    def test_membership_version_rollback_blocks(self) -> None:
        profile = sample_profile()
        observed = converged_observed(profile)
        previous = deepcopy(profile)
        previous["authority"]["memberships"][0]["membership_version"] = 2
        observed["user"]["attributes"] = subject.desired_human_attributes(previous)
        blockers = subject.human_version_blockers(profile, observed["user"]["attributes"])
        self.assertTrue(any("rollback" in message.lower() for message in blockers))

    def test_permission_change_without_membership_increment_blocks(self) -> None:
        profile = sample_profile()
        observed = converged_observed(profile)
        profile["authority"]["memberships"][0]["permissions"] = [
            "joinerytech.plant.edit",
            "spaceos.crm.admin",
            "tenant.members.manage",
        ]
        blockers = subject.human_version_blockers(profile, observed["user"]["attributes"])
        self.assertTrue(any("membership_version" in message for message in blockers))

    def test_versioned_permission_replacement_accepts_replace_audit_action(self) -> None:
        previous = sample_profile()
        desired = deepcopy(previous)
        desired["authority"]["memberships"][0]["permissions"] = [
            "joinerytech.plant.edit",
            "spaceos.crm.admin",
            "tenant.members.manage",
        ]
        desired["authority"]["memberships"][0]["membership_version"] = 2
        desired["authority"]["projectionVersion"] = 2
        desired["authority"]["audit"]["action"] = "replace"
        blockers = subject.human_version_blockers(desired, subject.desired_human_attributes(previous))
        self.assertEqual([], blockers)

    def test_membership_removal_requires_revoke_or_deactivate(self) -> None:
        profile = sample_profile()
        previous = deepcopy(profile)
        second = deepcopy(previous["authority"]["memberships"][0])
        second["tenant_id"] = "598e2c60-a188-4c6a-87d5-a33df6841246"
        previous["authority"]["memberships"].append(second)
        observed_attributes = subject.desired_human_attributes(previous)
        blockers = subject.human_version_blockers(profile, observed_attributes)
        self.assertTrue(any("cannot be deleted" in message for message in blockers))

    def test_tenant_switch_requires_projection_increment_and_fresh_token_action(self) -> None:
        previous = sample_profile()
        desired = deepcopy(previous)
        second = deepcopy(desired["authority"]["memberships"][0])
        second["tenant_id"] = "598e2c60-a188-4c6a-87d5-a33df6841246"
        desired["authority"]["memberships"].append(second)
        desired["authority"]["selectedTenantId"] = second["tenant_id"]
        blockers = subject.human_version_blockers(desired, subject.desired_human_attributes(previous))
        self.assertTrue(any("projection_version" in message for message in blockers))
        desired["authority"]["projectionVersion"] = 2
        desired["authority"]["audit"]["action"] = "select-tenant"
        blockers = subject.human_version_blockers(desired, subject.desired_human_attributes(previous))
        self.assertEqual([], blockers)

    def test_consumer_audience_change_requires_projection_increment(self) -> None:
        previous = sample_profile()
        desired = deepcopy(previous)
        desired["authorityScope"]["consumerProjections"][0]["audiences"] = [
            "doormanufacturing-instance-api",
            "kernel-api-v2",
        ]
        blockers = subject.human_version_blockers(
            desired,
            subject.desired_human_attributes(previous),
        )
        self.assertTrue(any("projection_version" in message for message in blockers))
        desired["authority"]["projectionVersion"] = 2
        desired["authority"]["audit"]["action"] = "replace"
        self.assertEqual(
            [],
            subject.human_version_blockers(
                desired,
                subject.desired_human_attributes(previous),
            ),
        )

    def test_legacy_broad_projection_requires_manual_adoption(self) -> None:
        profile = sample_profile()
        attributes = subject.desired_human_attributes(profile)
        consumer = subject.consumer_projections(profile)[0]
        attributes["spaceos_tenants"] = [
            attributes[subject.consumer_projection_attribute(consumer)][0]
        ]
        blockers = subject.human_version_blockers(profile, attributes)
        self.assertTrue(any("legacy" in message.lower() for message in blockers))

    def test_service_scope_change_requires_projection_increment(self) -> None:
        profile = sample_profile()
        principal = profile["servicePrincipalRegistry"][0]
        observed_attributes = subject.desired_service_attributes(principal)
        changed = deepcopy(principal)
        changed["scope"]["station_ids"] = ["station-cnc-02"]
        blockers = subject.service_version_blockers(changed, observed_attributes)
        self.assertTrue(any("projection version" in message.lower() for message in blockers))

    def test_service_key_metadata_change_requires_version_and_rotate_action(self) -> None:
        principal = sample_profile()["servicePrincipalRegistry"][0]
        observed_attributes = subject.desired_service_attributes(principal)
        changed = deepcopy(principal)
        changed["keyRotation"]["state"] = "current"
        blockers = subject.service_version_blockers(changed, observed_attributes)
        self.assertTrue(any("key rotation" in message.lower() for message in blockers))

    def test_partial_service_versioned_state_blocks_bootstrap_bypass(self) -> None:
        blockers = subject.service_version_blockers(
            sample_profile()["servicePrincipalRegistry"][0],
            {
                "spaceos_membership_version": ["99"],
                "spaceos_projection_version": ["99"],
            },
        )
        self.assertTrue(any("partial" in message.lower() for message in blockers))

    def test_service_attached_scopes_are_planned_for_detach(self) -> None:
        profile = sample_profile()
        observed = converged_observed(profile)
        observed["serviceDefaultScopes"] = [{"id": "realm-role-scope", "name": "roles"}]
        observed["serviceOptionalScopes"] = []
        observed["serviceAttachedMappers"] = {"roles": []}
        plan = subject.build_plan(profile, observed)
        detach = [step for step in plan if step["step"] == "office-to-plant-scope-binding"]
        self.assertEqual(["Detach"], [step["action"] for step in detach])

    def test_service_device_and_ciba_grants_are_explicitly_disabled(self) -> None:
        profile = sample_profile()
        desired = subject.desired_service_client(profile["servicePrincipalRegistry"][0])
        observed = deepcopy(desired)
        observed["attributes"]["oauth2.device.authorization.grant.enabled"] = "true"
        self.assertIn("attributes.oauth2.device.authorization.grant.enabled", subject.client_drift(observed, desired))

    def test_apply_refuses_blocked_plan_before_request(self) -> None:
        profile = sample_profile()
        observed = converged_observed(profile)
        plan = [{"step": "guard", "target": "x", "action": "Block", "readback": "blocked"}]
        with patch.object(subject, "request") as request_mock:
            with self.assertRaises(subject.ProjectionProvisioningError):
                subject.apply(profile, "redacted", observed, plan, 1)
        request_mock.assert_not_called()

    def test_imported_apply_with_crafted_unblocked_plan_is_hard_off_before_reread(self) -> None:
        profile = sample_profile()
        observed = converged_observed(profile)
        crafted = [{"step": "crafted", "target": "x", "action": "NoChange", "readback": "x"}]
        with patch.object(subject, "observe") as observe_mock, patch.object(subject, "request") as request_mock:
            with self.assertRaises(subject.ProjectionProvisioningError):
                subject.apply(profile, "redacted", observed, crafted, 1)
        observe_mock.assert_not_called()
        request_mock.assert_not_called()

    def test_signed_observed_baseline_drift_blocks_same_id_adoption(self) -> None:
        profile = sample_profile()
        observed = converged_observed(profile)
        observed["user"]["attributes"]["spaceos_projection_version"] = ["2"]
        observed["observationFingerprint"] = subject.observation_fingerprint(profile, observed)
        blockers = subject.adoption_and_inventory_blockers(profile, observed)
        self.assertTrue(any("signed adoption baseline" in item for item in blockers))

    def test_foreign_client_reverse_binding_to_managed_scope_blocks(self) -> None:
        profile = sample_profile()
        observed = converged_observed(profile)
        managed_scope = observed["managedScopes"]["joinerytech-plant-web"]
        observed["realmInventory"]["clients"].append({
            "client": {
                "id": "18111111-1111-4111-8111-111111111111",
                "clientId": "legacy client with broader-keycloak-syntax",
            },
            "directMappers": [],
            "defaultScopes": [managed_scope],
            "optionalScopes": [],
            "attachedMappers": {managed_scope["name"]: []},
        })
        observed["observationFingerprint"] = subject.observation_fingerprint(profile, observed)
        blockers = subject.adoption_and_inventory_blockers(profile, observed)
        self.assertTrue(any("Unauthorized reverse binding" in item for item in blockers))

    def test_exact_duplicate_scope_binding_blocks(self) -> None:
        profile = sample_profile()
        observed = converged_observed(profile)
        record = observed["consumers"]["doormanufacturing-web"]
        record["optionalScopes"].append(deepcopy(record["defaultScopes"][0]))
        blockers = subject.adoption_and_inventory_blockers(profile, observed)
        self.assertTrue(any("duplicate or malformed attached scope identities" in item for item in blockers))

    def test_scope_id_alias_across_binding_classes_blocks(self) -> None:
        profile = sample_profile()
        observed = converged_observed(profile)
        record = observed["consumers"]["doormanufacturing-web"]
        managed_scope = record["defaultScopes"][0]
        alias = {"id": managed_scope["id"], "name": "foreign-alias-scope"}
        record["optionalScopes"].append(alias)
        record["attachedMappers"][alias["name"]] = []
        blockers = subject.adoption_and_inventory_blockers(profile, observed)
        self.assertTrue(any("duplicate or malformed attached scope identities" in item for item in blockers))

    def test_right_managed_scope_name_with_wrong_internal_id_blocks(self) -> None:
        profile = sample_profile()
        observed = converged_observed(profile)
        record = observed["consumers"]["doormanufacturing-web"]
        substituted = deepcopy(record["defaultScopes"][0])
        substituted["id"] = "18444444-4444-4444-8444-444444444444"
        record["defaultScopes"] = [substituted]
        blockers = subject.adoption_and_inventory_blockers(profile, observed)
        self.assertTrue(any("substituted internal ID" in item for item in blockers))

    def test_foreign_attached_scope_protected_claim_blocks(self) -> None:
        profile = sample_profile()
        observed = converged_observed(profile)
        observed["realmInventory"]["clients"].append({
            "client": {
                "id": "18222222-2222-4222-8222-222222222222",
                "clientId": "foreign-client",
            },
            "directMappers": [],
            "defaultScopes": [{"id": "18333333-3333-4333-8333-333333333333", "name": "foreign-scope"}],
            "optionalScopes": [],
            "attachedMappers": {
                "foreign-scope": [{"name": "raw-tenant", "config": {"claim.name": "spaceos_tenants"}}]
            },
        })
        observed["observationFingerprint"] = subject.observation_fingerprint(profile, observed)
        blockers = subject.adoption_and_inventory_blockers(profile, observed)
        self.assertTrue(any("attached scope emits protected" in item for item in blockers))

    def test_human_consumer_service_account_capability_blocks(self) -> None:
        profile = sample_profile()
        observed = converged_observed(profile)
        observed["consumers"]["joinerytech-plant-web"]["client"]["serviceAccountsEnabled"] = True
        observed["observationFingerprint"] = subject.observation_fingerprint(profile, observed)
        blockers = subject.adoption_and_inventory_blockers(profile, observed)
        self.assertTrue(any("non-service human OIDC" in item for item in blockers))

    def test_human_consumer_missing_or_wrong_pkce_blocks_and_changes_fingerprint(self) -> None:
        profile = sample_profile()
        baseline = converged_observed(profile)
        baseline_fingerprint = subject.observation_fingerprint(profile, baseline)
        for value in (None, "plain"):
            with self.subTest(value=value):
                observed = deepcopy(baseline)
                attributes = observed["consumers"]["doormanufacturing-web"]["client"]["attributes"]
                if value is None:
                    attributes.pop(subject.PKCE_CLIENT_ATTRIBUTE)
                else:
                    attributes[subject.PKCE_CLIENT_ATTRIBUTE] = value
                self.assertNotEqual(
                    baseline_fingerprint,
                    subject.observation_fingerprint(profile, observed),
                )
                blockers = subject.adoption_and_inventory_blockers(profile, observed)
                self.assertTrue(any("non-service human OIDC" in item for item in blockers))

    def test_human_consumer_redirect_and_origin_drift_block(self) -> None:
        profile = sample_profile()
        for field, value in (
            ("redirectUris", ["https://attacker.invalid/auth/callback"]),
            ("webOrigins", ["https://attacker.invalid"]),
        ):
            with self.subTest(field=field):
                observed = converged_observed(profile)
                observed["consumers"]["doormanufacturing-web"]["client"][field] = value
                blockers = subject.adoption_and_inventory_blockers(profile, observed)
                self.assertTrue(any("non-service human OIDC" in item for item in blockers))

    def test_stale_observation_fingerprint_blocks_before_plan_mutation(self) -> None:
        profile = sample_profile()
        observed = converged_observed(profile)
        observed["user"]["attributes"]["spaceos_projection_version"] = ["2"]
        plan = subject.build_plan(profile, observed)
        self.assertTrue(any(
            step["step"] == "observation-fingerprint" and step["action"] == "Block"
            for step in plan
        ))

    def test_foreign_server_fields_never_enter_fingerprint(self) -> None:
        profile = sample_profile()
        observed = converged_observed(profile)
        changed = deepcopy(observed)
        changed["user"]["credentials"] = [{"value": "must-not-enter"}]
        changed["user"]["access"] = {"manage": True}
        changed["user"]["attributes"]["foreign_profile_note"] = ["must-not-enter"]
        changed["serviceClient"]["secret"] = "must-not-enter"
        changed["serviceClient"]["registrationAccessToken"] = "must-not-enter"
        changed["serviceClient"]["registeredNodes"] = {"node": 1}
        changed["serviceClient"]["attributes"]["foreign.client.attribute"] = "must-not-enter"
        self.assertEqual(
            subject.observation_fingerprint(profile, observed),
            subject.observation_fingerprint(profile, changed),
        )

    def test_classic_mutation_entrypoints_have_no_callable_scaffold(self) -> None:
        profile = sample_profile()
        observed = converged_observed(profile)
        plan = [{"step": "crafted", "target": "x", "action": "NoChange", "readback": "x"}]
        for entrypoint in (subject.apply, subject._apply_mutations):
            with self.subTest(entrypoint=entrypoint.__name__), patch.object(
                subject, "observe"
            ) as observe_mock, patch.object(subject, "request") as request_mock:
                with self.assertRaises(subject.ProjectionProvisioningError):
                    entrypoint(profile, "redacted", observed, plan, 1)
            observe_mock.assert_not_called()
            request_mock.assert_not_called()
            source = inspect.getsource(entrypoint)
            self.assertNotIn("request(", source)
            self.assertNotIn("observe(", source)
            self.assertNotIn('"POST"', source)
            self.assertNotIn('"PUT"', source)
            self.assertNotIn('"DELETE"', source)

    def test_classic_mutation_disable_has_no_runtime_toggle(self) -> None:
        self.assertFalse(hasattr(subject, "CLASSIC_ADMIN_MUTATION_DISABLED"))
        request_source = inspect.getsource(subject.request)
        self.assertNotIn("CLASSIC_ADMIN_MUTATION_DISABLED", request_source)

    def test_post_write_full_readback_is_inside_future_compensation_contract(self) -> None:
        plan = subject.build_plan(sample_profile(), converged_observed(sample_profile()))
        readback = next(
            step["readback"] for step in plan
            if step["step"] == "post-apply-authority-readback"
        )
        self.assertIn("compensation boundary", readback)
        self.assertIn("proves disabled", readback)


class InventoryTests(unittest.TestCase):
    def test_realm_clients_are_bounded_paginated_and_foreign_ids_are_preserved(self) -> None:
        profile = sample_profile()
        profile["mutationSafety"]["inventoryPolicy"]["pageSize"] = 2
        profile["mutationSafety"]["inventoryPolicy"]["maxPages"] = 3
        summaries = [
            {"id": "19111111-1111-4111-8111-111111111111", "clientId": "legacy client"},
            {"id": "19222222-2222-4222-8222-222222222222", "clientId": "realm/internal@client"},
            {"id": "19333333-3333-4333-8333-333333333333", "clientId": "canonical-client"},
        ]

        def response(_profile, method, url, **_kwargs):
            self.assertEqual("GET", method)
            if "/clients?first=0&max=2" in url:
                return summaries[:2]
            if "/clients?first=2&max=2" in url:
                return summaries[2:]
            return next(item for item in summaries if url.endswith("/" + item["id"]))

        with patch.object(subject, "request", side_effect=response), patch.object(
            subject, "observe_mappers", return_value=[]
        ), patch.object(subject, "observe_scope_bindings", return_value=([], [], {})):
            result = subject.observe_realm_clients(profile, "redacted", 1, {})
        self.assertEqual(
            ["canonical-client", "legacy client", "realm/internal@client"],
            [item["client"]["clientId"] for item in result],
        )

    def test_realm_client_pagination_duplicate_or_nonprogress_blocks(self) -> None:
        profile = sample_profile()
        profile["mutationSafety"]["inventoryPolicy"]["pageSize"] = 1
        profile["mutationSafety"]["inventoryPolicy"]["maxPages"] = 3
        duplicate = [{"id": "19444444-4444-4444-8444-444444444444", "clientId": "same-client"}]
        with patch.object(subject, "request", return_value=duplicate):
            with self.assertRaises(subject.ProjectionProvisioningError):
                subject.observe_realm_clients(profile, "redacted", 1, {})

    def test_realm_client_pagination_bound_exhaustion_blocks(self) -> None:
        profile = sample_profile()
        profile["mutationSafety"]["inventoryPolicy"]["pageSize"] = 1
        profile["mutationSafety"]["inventoryPolicy"]["maxPages"] = 2
        pages = iter([
            [{"id": "19555555-5555-4555-8555-555555555555", "clientId": "first-client"}],
            [{"id": "19666666-6666-4666-8666-666666666666", "clientId": "second-client"}],
        ])
        with patch.object(subject, "request", side_effect=lambda *_args, **_kwargs: next(pages)):
            with self.assertRaises(subject.ProjectionProvisioningError):
                subject.observe_realm_clients(profile, "redacted", 1, {})

    def test_scope_binding_observation_rejects_duplicate_and_substituted_pairs(self) -> None:
        profile = sample_profile()
        first = {"id": "19711111-1111-4111-8111-111111111111", "name": "scope-one"}
        second = {"id": "19722222-2222-4222-8222-222222222222", "name": "scope-two"}
        catalog = {"scope-one": first, "scope-two": second}
        cases = {
            "exact-duplicate": ([first], [deepcopy(first)]),
            "id-alias": ([first], [{"id": first["id"], "name": "scope-two"}]),
            "wrong-id-right-name": ([{"id": second["id"], "name": "scope-one"}], []),
        }
        for name, (defaults, optionals) in cases.items():
            with self.subTest(name=name), patch.object(
                subject, "request", side_effect=[defaults, optionals]
            ), patch.object(subject, "observe_mappers") as mapper_mock:
                with self.assertRaises(subject.ProjectionProvisioningError):
                    subject.observe_scope_bindings(
                        profile, "redacted", "/clients/client-id", 1, catalog
                    )
            mapper_mock.assert_not_called()

    def test_observe_mappers_rejects_scalar_entries(self) -> None:
        with patch.object(subject, "request", return_value=["malformed"]):
            with self.assertRaises(subject.ProjectionProvisioningError):
                subject.observe_mappers(sample_profile(), "redacted", "/clients/client-id", 1)

    def test_observe_mappers_requires_stable_id_and_exact_representation(self) -> None:
        mapper = {
            "name": "claim",
            "protocol": "openid-connect",
            "protocolMapper": "oidc-usermodel-attribute-mapper",
            "config": {},
        }
        with patch.object(subject, "request", return_value=[mapper]):
            with self.assertRaises(subject.ProjectionProvisioningError):
                subject.observe_mappers(sample_profile(), "redacted", "/clients/client-id", 1)

    def test_observe_mappers_rejects_duplicate_stable_ids(self) -> None:
        first = {
            "id": "19811111-1111-4111-8111-111111111111",
            "name": "claim-one",
            "protocol": "openid-connect",
            "protocolMapper": "oidc-usermodel-attribute-mapper",
            "config": {},
        }
        second = {**first, "name": "claim-two"}
        with patch.object(subject, "request", return_value=[first, second]):
            with self.assertRaises(subject.ProjectionProvisioningError):
                subject.observe_mappers(sample_profile(), "redacted", "/clients/client-id", 1)

    def test_nonpaginated_client_scope_collection_has_strict_total_bound(self) -> None:
        profile = sample_profile()
        profile["mutationSafety"]["inventoryPolicy"]["pageSize"] = 1
        profile["mutationSafety"]["inventoryPolicy"]["maxPages"] = 1
        response = [
            {"id": "19777777-7777-4777-8777-777777777777", "name": "one"},
            {"id": "19888888-8888-4888-8888-888888888888", "name": "two"},
        ]
        with patch.object(subject, "request", return_value=response):
            with self.assertRaises(subject.ProjectionProvisioningError):
                subject.observe_client_scopes(profile, "redacted", 1)

    def test_two_complete_inventory_passes_must_match(self) -> None:
        profile = sample_profile()
        first = converged_observed(profile)
        second = deepcopy(first)
        second["user"]["attributes"]["spaceos_projection_version"] = ["2"]
        with patch.object(subject, "observe_once", side_effect=[first, second]):
            with self.assertRaises(subject.ProjectionProvisioningError):
                subject.observe(profile, "redacted", 1)


class RetryAndCliTests(unittest.TestCase):
    def test_admin_transport_disables_proxy_redirect_and_strips_response_secrets(self) -> None:
        response = MagicMock()
        response.read.return_value = (
            b'{"id":"client-id","secret":"must-not-escape",'
            b'"accessToken":"must-not-escape-either",'
            b'"attributes":{"safe":"kept","client.secret.creation.time":"drop",'
            b'"initialAccessToken":"drop-too"}}'
        )
        context = MagicMock()
        context.__enter__.return_value = response
        response.headers.get_content_type.return_value = "application/json"
        response.headers.get.return_value = None
        opener = MagicMock()
        opener.open.return_value = context
        with patch.object(subject.keycloak.urllib.request, "build_opener", return_value=opener) as build_opener:
            result = subject.keycloak.request_json(
                "GET",
                "http://127.0.0.1:8080/auth/admin/realms/spaceos/clients/client-id",
                token="redacted",
                timeout_seconds=1,
            )

        self.assertEqual({"id": "client-id", "attributes": {"safe": "kept"}}, result)
        proxy_handler, redirect_handler = build_opener.call_args.args
        self.assertEqual({}, proxy_handler.proxies)
        self.assertIsInstance(redirect_handler, subject.keycloak._NoRedirectHandler)
        self.assertIsNone(redirect_handler.redirect_request(None, None, 302, "redirect", {}, "http://attacker.invalid"))

    def test_admin_transport_preserves_canonical_mapper_token_flags(self) -> None:
        desired = deepcopy(subject.human_mappers(subject.consumer_projections(sample_profile())[0])[0])
        desired["id"] = "19911111-1111-4111-8111-111111111111"
        response = MagicMock()
        response.read.return_value = json.dumps(desired, separators=(",", ":")).encode("utf-8")
        response.headers.get_content_type.return_value = "application/json"
        response.headers.get.return_value = None
        context = MagicMock()
        context.__enter__.return_value = response
        opener = MagicMock()
        opener.open.return_value = context
        with patch.object(subject.keycloak.urllib.request, "build_opener", return_value=opener):
            observed = subject.keycloak.request_json(
                "GET",
                "http://127.0.0.1:8080/auth/admin/realms/spaceos/client-scopes/scope-id/protocol-mappers/models/mapper-id",
                token="redacted",
                timeout_seconds=1,
            )
        for key in subject.keycloak._SAFE_MAPPER_TOKEN_CONFIG_FIELDS:
            self.assertIn(key, observed["config"])
        self.assertTrue(subject.exact_mapper_equal(observed, desired))

    def test_admin_transport_rejects_nonexact_loopback_before_opening(self) -> None:
        with patch.object(subject.keycloak.urllib.request, "build_opener") as build_opener:
            with self.assertRaises(subject.keycloak.ProvisioningError):
                subject.keycloak.request_json(
                    "GET",
                    "http://localhost:8080/auth/admin/realms/spaceos",
                    token="redacted",
                )
        build_opener.assert_not_called()

    def test_shared_transport_blocks_classic_admin_mutation_before_opening(self) -> None:
        for method in ("POST", "PUT", "DELETE"):
            with self.subTest(method=method):
                with patch.object(subject.keycloak.urllib.request, "build_opener") as build_opener:
                    with self.assertRaises(subject.keycloak.ProvisioningError):
                        subject.keycloak.request_json(
                            method,
                            "http://127.0.0.1:8080/auth/admin/realms/spaceos/client-scopes/scope-id",
                            token="redacted",
                            body={} if method in {"POST", "PUT"} else None,
                            timeout_seconds=1,
                        )
                build_opener.assert_not_called()

    def test_shared_transport_allows_only_exact_master_token_exchange_post(self) -> None:
        response = MagicMock()
        response.status = 200
        response.read.return_value = b'{"access_token":"redacted"}'
        response.headers.get.return_value = None
        response.headers.get_content_type.return_value = "application/json"
        context = MagicMock()
        context.__enter__.return_value = response
        opener = MagicMock()
        opener.open.return_value = context
        with patch.object(subject.keycloak.urllib.request, "build_opener", return_value=opener):
            result = subject.keycloak.request_json(
                "POST",
                "http://127.0.0.1:8080/auth/realms/master/protocol/openid-connect/token",
                form={"grant_type": "password"},
                timeout_seconds=1,
            )
        self.assertEqual({"access_token": "redacted"}, result)

    def test_admin_transport_rejects_empty_read_response(self) -> None:
        response = MagicMock()
        response.status = 200
        response.read.return_value = b""
        response.headers.get.return_value = "0"
        context = MagicMock()
        context.__enter__.return_value = response
        opener = MagicMock()
        opener.open.return_value = context
        with patch.object(subject.keycloak.urllib.request, "build_opener", return_value=opener):
            with self.assertRaises(subject.keycloak.KeycloakRequestError):
                subject.keycloak.request_json(
                    "GET",
                    "http://127.0.0.1:8080/auth/admin/realms/spaceos/client-scopes",
                    token="redacted",
                    timeout_seconds=1,
                )

    def test_shared_transport_rejects_nonloopback_admin_before_authentication(self) -> None:
        profile = sample_profile()
        profile["keycloak"]["adminBaseUrl"] = "https://joinerytech.hu/auth"
        with patch.object(subject.keycloak, "request_json") as request_mock:
            with self.assertRaises(subject.keycloak.ProvisioningError):
                subject.keycloak.obtain_admin_token(profile, 1)
        request_mock.assert_not_called()

    def test_idempotent_get_uses_bounded_retry(self) -> None:
        profile = sample_profile()
        with patch.object(subject.keycloak, "request_json", side_effect=[
            subject.keycloak.KeycloakRequestError("one", retryable=True),
            subject.keycloak.KeycloakRequestError("two", retryable=True),
            {"ok": True},
        ]) as request_mock, patch.object(subject.time, "sleep") as sleep_mock:
            result = subject.request(profile, "GET", "http://127.0.0.1/test", token="redacted", timeout_seconds=1)
        self.assertEqual({"ok": True}, result)
        self.assertEqual(3, request_mock.call_count)
        self.assertEqual(2, sleep_mock.call_count)

    def test_nonretryable_get_error_is_not_replayed(self) -> None:
        profile = sample_profile()
        with patch.object(
            subject.keycloak,
            "request_json",
            side_effect=subject.keycloak.KeycloakRequestError("HTTP 401", retryable=False),
        ) as request_mock, patch.object(subject.time, "sleep") as sleep_mock:
            with self.assertRaises(subject.keycloak.KeycloakRequestError):
                subject.request(profile, "GET", "http://127.0.0.1/test", token="redacted", timeout_seconds=1)
        self.assertEqual(1, request_mock.call_count)
        sleep_mock.assert_not_called()

    def test_classic_admin_post_is_hard_disabled_before_transport(self) -> None:
        profile = sample_profile()
        with patch.object(subject.keycloak, "request_json") as request_mock:
            with self.assertRaises(subject.ProjectionProvisioningError):
                subject.request(profile, "POST", "http://127.0.0.1/test", token="redacted", body={}, timeout_seconds=1)
        request_mock.assert_not_called()

    def test_classic_admin_delete_is_hard_disabled_before_transport(self) -> None:
        profile = sample_profile()
        with patch.object(subject.keycloak, "request_json") as request_mock:
            with self.assertRaises(subject.ProjectionProvisioningError):
                subject.request(profile, "DELETE", "http://127.0.0.1/test", token="redacted", timeout_seconds=1)
        request_mock.assert_not_called()

    def test_projection_convergence_is_never_full_activation_evidence(self) -> None:
        profile = sample_profile()
        value = subject.summary(
            ROOT / "config" / "keycloak-tenant-projection.sample.json",
            profile,
            "ApplyReadback",
            [],
            [{"step": "post-apply-authority-readback", "target": "spaceos", "action": "Required", "readback": "done"}],
        )
        self.assertFalse(value["projectionConvergenceEvidence"])
        self.assertFalse(value["mutationSafetyEvidence"])
        self.assertFalse(value["activationEvidence"])
        self.assertFalse(value["liveTokenEvidence"])
        self.assertFalse(value["liveKeyRotationEvidence"])

    def test_offline_cli_never_requests_admin_token(self) -> None:
        with patch.object(subject.keycloak, "obtain_admin_token", side_effect=AssertionError("network path reached")):
            with redirect_stdout(StringIO()):
                exit_code = subject.main([
                    "--profile",
                    str(ROOT / "config" / "keycloak-tenant-projection.sample.json"),
                    "--offline",
                ])
        self.assertEqual(subject.EXIT_CONVERGED, exit_code)

    def test_explicit_verify_mode_is_read_only(self) -> None:
        profile = sample_profile()
        observed = converged_observed(profile)
        with patch.object(subject.keycloak, "obtain_admin_token", return_value="redacted"), patch.object(subject, "observe", return_value=observed), patch.object(subject, "apply") as apply_mock:
            with redirect_stdout(StringIO()):
                exit_code = subject.main(["--profile", str(ROOT / "config" / "keycloak-tenant-projection.sample.json"), "--verify-only"])
        self.assertEqual(subject.EXIT_PENDING, exit_code)
        apply_mock.assert_not_called()

    def test_apply_is_safety_disabled_before_profile_or_admin_authentication(self) -> None:
        with patch.object(Path, "read_text", side_effect=AssertionError("profile read reached")), patch.object(
            subject.keycloak,
            "obtain_admin_token",
            side_effect=AssertionError("credential path reached"),
        ) as token_mock:
            with redirect_stdout(StringIO()):
                exit_code = subject.main([
                    "--profile",
                    str(ROOT / "config" / "keycloak-tenant-projection.sample.json"),
                    "--apply",
                ])
        self.assertEqual(subject.EXIT_ERROR, exit_code)
        token_mock.assert_not_called()

    def test_missing_mode_stops_before_admin_authentication(self) -> None:
        with patch.object(subject.keycloak, "obtain_admin_token", side_effect=AssertionError("credential path reached")) as token_mock:
            with redirect_stdout(StringIO()):
                exit_code = subject.main(["--profile", str(ROOT / "config" / "keycloak-tenant-projection.sample.json")])
        self.assertEqual(subject.EXIT_ERROR, exit_code)
        token_mock.assert_not_called()

    def test_multiple_modes_stop_before_admin_authentication(self) -> None:
        with patch.object(subject.keycloak, "obtain_admin_token", side_effect=AssertionError("credential path reached")) as token_mock:
            with redirect_stdout(StringIO()):
                exit_code = subject.main([
                    "--profile",
                    str(ROOT / "config" / "keycloak-tenant-projection.sample.json"),
                    "--verify-only",
                    "--apply",
                ])
        self.assertEqual(subject.EXIT_ERROR, exit_code)
        token_mock.assert_not_called()

    def test_profile_validation_happens_before_admin_authentication(self) -> None:
        profile = sample_profile()
        profile["keycloak"]["adminBaseUrl"] = "https://public.example.invalid/auth"
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "invalid.json"
            path.write_text(json.dumps(profile), encoding="utf-8")
            with patch.object(subject.keycloak, "obtain_admin_token", side_effect=AssertionError("credential path reached")):
                with redirect_stdout(StringIO()):
                    exit_code = subject.main(["--profile", str(path), "--verify-only"])
        self.assertEqual(subject.EXIT_ERROR, exit_code)

    def test_duplicate_profile_key_stops_before_admin_authentication(self) -> None:
        raw = (ROOT / "config" / "keycloak-tenant-projection.sample.json").read_text(encoding="utf-8")
        raw = raw.replace(
            '"schemaVersion": "spaceos-keycloak-authority-projection/v1",',
            '"schemaVersion": "spaceos-keycloak-authority-projection/v1",\n  "schemaVersion": "legacy-flat",',
            1,
        )
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "duplicate.json"
            path.write_text(raw, encoding="utf-8")
            with patch.object(subject.keycloak, "obtain_admin_token", side_effect=AssertionError("credential path reached")) as token_mock:
                with redirect_stdout(StringIO()):
                    exit_code = subject.main(["--profile", str(path), "--verify-only"])
        self.assertEqual(subject.EXIT_ERROR, exit_code)
        token_mock.assert_not_called()


if __name__ == "__main__":
    unittest.main()
