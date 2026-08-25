"""Unit tests for the Door Manufacturing Keycloak client provisioner.

These exercise only pure validation and desired-vs-observed planning.  They do
not start Keycloak, read environment credentials, or make a network request.

Run:
    python -m unittest scripts/test_provision_doormanufacturing_keycloak_clients.py -v
"""

from __future__ import annotations

import copy
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path
from unittest.mock import MagicMock, patch


SCRIPT_ROOT = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_ROOT.parent
IMPLEMENTATION = SCRIPT_ROOT / "provision_doormanufacturing_keycloak_clients.py"
SPEC = importlib.util.spec_from_file_location("door_manufacturing_client_provisioning", IMPLEMENTATION)
assert SPEC and SPEC.loader
provisioning = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = provisioning
SPEC.loader.exec_module(provisioning)


def sample_profile() -> dict:
    return json.loads((REPO_ROOT / "config/doormanufacturing-keycloak-clients.sample.json").read_text(encoding="utf-8"))


class ProfileValidationTests(unittest.TestCase):
    def test_sample_profile_is_valid(self) -> None:
        errors = [item for item in provisioning.validate_profile(sample_profile()) if item["severity"] == "Error"]
        self.assertEqual([], errors)

    def test_origin_must_be_the_exact_canonical_https_origin(self) -> None:
        profile = sample_profile()
        profile["publicOrigin"] = "https://doormanufacturing.joinerytech.hu/"
        codes = {item["code"] for item in provisioning.validate_profile(profile)}
        self.assertIn("PublicOrigin", codes)

    def test_browser_client_rejects_a_wildcard_or_extra_redirect(self) -> None:
        profile = sample_profile()
        profile["clients"]["web"]["redirectUris"].append("https://doormanufacturing.joinerytech.hu/*")
        codes = {item["code"] for item in provisioning.validate_profile(profile)}
        self.assertIn("RedirectUris", codes)

    def test_browser_client_rejects_web_origin_wildcard(self) -> None:
        profile = sample_profile()
        profile["clients"]["web"]["webOrigins"] = ["*"]
        codes = {item["code"] for item in provisioning.validate_profile(profile)}
        self.assertIn("WebOrigins", codes)

    def test_confidential_client_rejects_browser_surface(self) -> None:
        profile = sample_profile()
        profile["clients"]["instanceApi"]["redirectUris"] = ["https://doormanufacturing.joinerytech.hu/calc/auth/callback"]
        codes = {item["code"] for item in provisioning.validate_profile(profile)}
        self.assertIn("ConfidentialBrowserSurface", codes)

    def test_profile_refuses_a_secret_key_without_echoing_its_value(self) -> None:
        profile = sample_profile()
        profile["clients"]["instanceApi"]["clientSecret"] = "not-to-log"
        findings = provisioning.validate_profile(profile)
        self.assertIn("SecretInProfile", {item["code"] for item in findings})
        self.assertNotIn("not-to-log", json.dumps(findings))

    def test_profile_requires_the_released_jwt_contract_shape(self) -> None:
        profile = sample_profile()
        profile["jwtContract"]["allowedAlgorithms"] = ["ES256"]
        profile["jwtContract"]["tenantClaim"] = "tenant_id"
        codes = {item["code"] for item in provisioning.validate_profile(profile)}
        self.assertIn("JwtContract", codes)

    def test_public_keycloak_issuer_target_must_bind_to_the_pinned_issuer(self) -> None:
        profile = sample_profile()
        profile["keycloak"]["realm"] = "other-realm"
        codes = {item["code"] for item in provisioning.validate_profile(profile)}
        self.assertIn("IssuerBinding", codes)

    def test_admin_api_must_use_the_exact_loopback_listener(self) -> None:
        profile = sample_profile()
        profile["keycloak"]["adminBaseUrl"] = "https://joinerytech.hu/auth"
        codes = {item["code"] for item in provisioning.validate_profile(profile)}
        self.assertIn("AdminKeycloakBaseUrl", codes)

    def test_legacy_single_keycloak_base_url_is_forbidden(self) -> None:
        profile = sample_profile()
        profile["keycloak"]["baseUrl"] = "https://joinerytech.hu/auth"
        codes = {item["code"] for item in provisioning.validate_profile(profile)}
        self.assertIn("AmbiguousKeycloakBaseUrl", codes)


class DesiredClientTests(unittest.TestCase):
    def test_public_client_requires_code_pkce_and_has_no_password_or_service_grant(self) -> None:
        web, instance_api = provisioning.desired_clients(sample_profile())
        self.assertEqual(provisioning.WEB_CLIENT_ID, web.client_id)
        self.assertTrue(web.representation["publicClient"])
        self.assertTrue(web.representation["standardFlowEnabled"])
        self.assertFalse(web.representation["implicitFlowEnabled"])
        self.assertFalse(web.representation["directAccessGrantsEnabled"])
        self.assertFalse(web.representation["serviceAccountsEnabled"])
        self.assertEqual("S256", web.representation["attributes"]["pkce.code.challenge.method"])
        self.assertNotIn("secret", web.representation)
        self.assertEqual(provisioning.INSTANCE_API_CLIENT_ID, instance_api.client_id)

    def test_confidential_client_is_service_account_only_and_never_carries_a_secret(self) -> None:
        _, instance_api = provisioning.desired_clients(sample_profile())
        self.assertFalse(instance_api.representation["publicClient"])
        self.assertTrue(instance_api.representation["serviceAccountsEnabled"])
        self.assertFalse(instance_api.representation["standardFlowEnabled"])
        self.assertFalse(instance_api.representation["implicitFlowEnabled"])
        self.assertFalse(instance_api.representation["directAccessGrantsEnabled"])
        self.assertEqual([], instance_api.representation["redirectUris"])
        self.assertEqual([], instance_api.representation["webOrigins"])
        self.assertNotIn("secret", instance_api.representation)


class IdempotencyTests(unittest.TestCase):
    def test_converged_clients_plan_no_change_on_a_second_run(self) -> None:
        desired = provisioning.desired_clients(sample_profile())
        observed = {
            client.client_id: {"id": f"internal-{index}", **copy.deepcopy(client.representation)}
            for index, client in enumerate(desired)
        }
        plan = provisioning.build_plan(desired, observed)
        self.assertEqual(0, provisioning.plan_summary(plan)["pendingCount"])
        self.assertEqual({"NoChange"}, {item["action"] for item in plan})

    def test_unsafe_direct_access_grant_is_planned_for_correction(self) -> None:
        desired = provisioning.desired_clients(sample_profile())
        web = desired[0]
        observed = {web.client_id: {"id": "internal-web", **copy.deepcopy(web.representation)}}
        observed[web.client_id]["directAccessGrantsEnabled"] = True
        plan = provisioning.build_plan([web], observed)
        self.assertEqual("Update", plan[0]["action"])
        self.assertIn("directAccessGrantsEnabled", plan[0]["detail"])

    def test_keycloak_omitted_false_authorization_services_is_converged(self) -> None:
        """KC list/detail representations may omit false; it must not loop applies."""

        web = provisioning.desired_clients(sample_profile())[0]
        observed = {"id": "internal-web", **copy.deepcopy(web.representation)}
        observed.pop("authorizationServicesEnabled")
        plan = provisioning.build_plan([web], {web.client_id: observed})
        self.assertEqual("NoChange", plan[0]["action"])

    def test_extra_web_origin_is_drift_not_silently_accepted(self) -> None:
        desired = provisioning.desired_clients(sample_profile())
        web = desired[0]
        observed = {web.client_id: {"id": "internal-web", **copy.deepcopy(web.representation)}}
        observed[web.client_id]["webOrigins"] = [provisioning.PUBLIC_ORIGIN, "https://other.example"]
        plan = provisioning.build_plan([web], observed)
        self.assertEqual("Update", plan[0]["action"])
        self.assertIn("webOrigins", plan[0]["detail"])

    def test_jwt_mappers_are_created_then_converge_without_a_second_change(self) -> None:
        clients = provisioning.desired_clients(sample_profile())
        mappers = provisioning.desired_mappers(sample_profile())
        observed_clients = {
            client.client_id: {"id": f"internal-{index}", **copy.deepcopy(client.representation)}
            for index, client in enumerate(clients)
        }
        first = provisioning.build_plan(clients, observed_clients, mappers, {provisioning.WEB_CLIENT_ID: {}})
        mapper_actions = [item for item in first if item["step"] == "protocol-mapper"]
        self.assertEqual(3, len(mapper_actions))
        self.assertEqual({"Create"}, {item["action"] for item in mapper_actions})

        observed_mappers = {
            provisioning.WEB_CLIENT_ID: {
                mapper.name: {"id": f"mapper-{index}", **copy.deepcopy(mapper.representation)}
                for index, mapper in enumerate(mappers)
            }
        }
        second = provisioning.build_plan(clients, observed_clients, mappers, observed_mappers)
        self.assertEqual(0, provisioning.plan_summary(second)["pendingCount"])

    def test_wrong_audience_mapper_is_corrected(self) -> None:
        mapper = provisioning.desired_mappers(sample_profile())[2]
        observed = copy.deepcopy(mapper.representation)
        observed["id"] = "mapper-audience"
        observed["config"]["included.custom.audience"] = "other-api"
        plan = provisioning.build_plan(
            [], {}, [mapper], {provisioning.WEB_CLIENT_ID: {mapper.name: observed}}
        )
        self.assertEqual("Update", plan[0]["action"])
        self.assertIn("config", plan[0]["detail"])


class ScriptContractTests(unittest.TestCase):
    def test_client_observer_uses_detailed_get_not_only_the_brief_list(self) -> None:
        profile = sample_profile()
        desired = provisioning.desired_clients(profile)
        calls: list[str] = []
        detailed_by_id = {
            "internal-web": {"id": "internal-web", **copy.deepcopy(desired[0].representation)},
            "internal-instance": {"id": "internal-instance", **copy.deepcopy(desired[1].representation)},
        }

        def fake_request(method: str, url: str, **_: object) -> object:
            self.assertEqual("GET", method)
            calls.append(url)
            if "?clientId=doormanufacturing-web" in url:
                return [{"id": "internal-web", "clientId": provisioning.WEB_CLIENT_ID}]
            if "?clientId=doormanufacturing-instance-api" in url:
                return [{"id": "internal-instance", "clientId": provisioning.INSTANCE_API_CLIENT_ID}]
            if url.endswith("/clients/internal-web"):
                return detailed_by_id["internal-web"]
            if url.endswith("/clients/internal-instance"):
                return detailed_by_id["internal-instance"]
            self.fail(f"Unexpected Keycloak observer URL: {url}")

        with patch.object(provisioning, "request_json", side_effect=fake_request):
            observed = provisioning.observe_clients(profile, "memory-only-token", 30)

        self.assertEqual(False, observed[provisioning.WEB_CLIENT_ID]["authorizationServicesEnabled"])
        self.assertTrue(any(url.endswith("/clients/internal-web") for url in calls))
        self.assertTrue(any(url.endswith("/clients/internal-instance") for url in calls))

    def test_all_admin_api_paths_use_loopback_not_the_public_issuer_base(self) -> None:
        profile = sample_profile()
        self.assertTrue(provisioning.admin_clients_url(profile).startswith(provisioning.ADMIN_KEYCLOAK_BASE_URL))
        with patch.object(provisioning, "request_json", return_value={"defaultSignatureAlgorithm": "RS256"}) as request:
            provisioning.observe_realm_signing_algorithm(profile, "memory-only-token", 30)
        self.assertTrue(request.call_args.args[1].startswith(provisioning.ADMIN_KEYCLOAK_BASE_URL))

    def test_public_issuer_is_preserved_in_the_profile_while_admin_base_is_loopback(self) -> None:
        profile = sample_profile()
        self.assertEqual(provisioning.PUBLIC_KEYCLOAK_BASE_URL, profile["keycloak"]["publicBaseUrl"])
        self.assertEqual(provisioning.ADMIN_KEYCLOAK_BASE_URL, profile["keycloak"]["adminBaseUrl"])
        self.assertEqual(provisioning.ISSUER, profile["jwtContract"]["issuer"])

    def test_credential_and_transport_helpers_are_hard_disabled(self) -> None:
        blocked_environment = MagicMock()
        blocked_environment.get.side_effect = AssertionError("credential read reached")
        with patch.object(provisioning.os, "environ", blocked_environment), patch.object(
            provisioning.urllib.request,
            "urlopen",
            side_effect=AssertionError("network reached"),
        ) as urlopen:
            with self.assertRaisesRegex(provisioning.ProvisioningError, "retired"):
                provisioning.obtain_admin_token(sample_profile(), 30)
            with self.assertRaisesRegex(provisioning.ProvisioningError, "retired"):
                provisioning.request_json(
                    "GET",
                    provisioning.ADMIN_KEYCLOAK_BASE_URL + "/admin/realms/spaceos",
                    token="must-not-be-used",
                    timeout_seconds=30,
                )
        blocked_environment.get.assert_not_called()
        urlopen.assert_not_called()

    def test_offline_mode_needs_no_credentials_or_network_and_emits_no_secret(self) -> None:
        result = subprocess.run(
            [
                sys.executable,
                str(IMPLEMENTATION),
                "--profile",
                str(REPO_ROOT / "config/doormanufacturing-keycloak-clients.sample.json"),
                "--offline",
            ],
            check=False,
            capture_output=True,
            text=True,
            cwd=REPO_ROOT,
        )
        self.assertEqual(0, result.returncode, result.stderr)
        summary = json.loads(result.stdout)
        self.assertEqual("HistoricalOffline", summary["mode"])
        self.assertTrue(summary["historicalValidationOnly"])
        self.assertFalse(summary["runnablePlanEmitted"])
        self.assertFalse(summary["activationEvidence"])
        self.assertFalse(summary["mutationSafetyEvidence"])
        self.assertNotIn("desiredClients", summary)
        self.assertNotIn("desiredMappers", summary)
        self.assertNotIn("plan", summary)
        self.assertNotIn("secret", result.stdout.lower())
        self.assertNotIn("password", result.stdout.lower())
        self.assertNotIn("token", result.stdout.lower())

    def test_apply_is_rejected_even_when_offline_without_keycloak_contact(self) -> None:
        result = subprocess.run(
            [
                sys.executable,
                str(IMPLEMENTATION),
                "--profile",
                str(REPO_ROOT / "config/doormanufacturing-keycloak-clients.sample.json"),
                "--apply",
                "--offline",
            ],
            check=False,
            capture_output=True,
            text=True,
            cwd=REPO_ROOT,
        )
        self.assertEqual(2, result.returncode)
        self.assertIn("retired", result.stdout)

    def test_every_live_mode_is_disabled_before_profile_credentials_or_network(self) -> None:
        live_modes = (
            [],
            ["--verify-only"],
            ["--apply"],
            ["--offline", "--verify-only"],
            ["--offline", "--apply"],
        )
        for mode in live_modes:
            with self.subTest(mode=mode), patch.object(
                Path,
                "read_text",
                side_effect=AssertionError("profile read reached"),
            ), patch.object(
                provisioning,
                "obtain_admin_token",
                side_effect=AssertionError("credential path reached"),
            ) as token_mock, patch.object(
                provisioning,
                "request_json",
                side_effect=AssertionError("network path reached"),
            ) as request_mock, redirect_stdout(StringIO()):
                exit_code = provisioning.main([
                    "--profile",
                    str(REPO_ROOT / "config/doormanufacturing-keycloak-clients.sample.json"),
                    *mode,
                ])
            self.assertEqual(provisioning.EXIT_ERROR, exit_code)
            token_mock.assert_not_called()
            request_mock.assert_not_called()

    def test_invalid_profile_fails_before_a_network_call(self) -> None:
        profile = sample_profile()
        profile["clients"]["web"]["webOrigins"] = ["*"]
        profile["keycloak"]["adminBaseUrl"] = "http://127.0.0.1:1/unreachable"
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "invalid.json"
            path.write_text(json.dumps(profile), encoding="utf-8")
            result = subprocess.run(
                [sys.executable, str(IMPLEMENTATION), "--profile", str(path), "--offline"],
                check=False,
                capture_output=True,
                text=True,
                cwd=REPO_ROOT,
                timeout=5,
            )
        self.assertEqual(2, result.returncode)
        self.assertIn("Profile validation failed", result.stdout)


if __name__ == "__main__":
    unittest.main(verbosity=2)
