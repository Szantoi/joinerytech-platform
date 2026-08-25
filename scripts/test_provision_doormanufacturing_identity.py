"""Pure validation coverage for the non-secret Door Manufacturing identity profile."""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parent))

import provision_doormanufacturing_identity as identity


def profile() -> dict:
    return {
        "version": identity.PROFILE_VERSION,
        "keycloak": {
            "publicBaseUrl": "https://joinerytech.hu/auth",
            "adminBaseUrl": "http://127.0.0.1:8080/auth",
            "realm": "spaceos",
            "adminRealm": "master",
            "adminClientId": "admin-cli",
        },
        "tenant": {
            "id": "11111111-1111-4111-8111-111111111111",
            "name": "Example Joinery",
            "tenantType": "Manufacturer",
            "jwtModules": ["joinerytech.door", "joinerytech.cutting"],
        },
        "user": {
            "username": "owner@example.invalid",
            "email": "owner@example.invalid",
            "firstName": "Example",
            "lastName": "Owner",
            "realmRoles": ["doormanufacturing.admin"],
        },
        "invite": {
            "clientId": identity.WEB_CLIENT_ID,
            "redirectUri": identity.DEFAULT_INVITE_REDIRECT_URI,
            "lifespanSeconds": 43200,
        },
    }


class IdentityProfileTests(unittest.TestCase):
    def test_valid_profile_is_accepted(self) -> None:
        self.assertEqual(identity.validate_profile(profile()), [])

    def test_secret_is_rejected_before_networking(self) -> None:
        candidate = profile()
        candidate["password"] = "not-allowed"
        self.assertTrue(any(item["code"] == "SecretInProfile" for item in identity.validate_profile(candidate)))

    def test_noncanonical_invitation_is_rejected(self) -> None:
        candidate = profile()
        candidate["invite"]["redirectUri"] = "https://example.invalid/"
        self.assertTrue(any(item["code"] == "InviteRedirect" for item in identity.validate_profile(candidate)))

    def test_different_username_and_email_is_rejected(self) -> None:
        candidate = profile()
        candidate["user"]["email"] = "different@example.invalid"
        self.assertTrue(any(item["code"] == "EmailIdentity" for item in identity.validate_profile(candidate)))

    def test_existing_verified_user_is_not_unverified(self) -> None:
        desired = identity.desired_user_body(profile(), {"emailVerified": True, "attributes": {}, "requiredActions": []})
        self.assertTrue(desired["emailVerified"])
        self.assertEqual(desired["attributes"]["tid"], ["11111111-1111-4111-8111-111111111111"])
        self.assertEqual(set(identity.REQUIRED_ACTIONS), set(desired["requiredActions"]))

    def test_plan_requires_explicit_browser_scope_when_full_scope_is_off(self) -> None:
        candidate = profile()
        plan = identity.build_plan(candidate, None, {"doormanufacturing.admin": {}}, None, set())
        self.assertTrue(any(item["step"] == "browser-client-role-scope" and item["action"] == "Create" for item in plan))

    def test_internal_network_and_invitation_helpers_are_hard_disabled(self) -> None:
        with patch.object(
            identity.urllib.request,
            "urlopen",
            side_effect=AssertionError("network reached"),
        ) as urlopen:
            with self.assertRaisesRegex(identity.keycloak.ProvisioningError, "retired"):
                identity.assert_smtp_ready(profile(), "must-not-be-used", 1)
            with self.assertRaisesRegex(identity.IdentityProvisioningError, "retired"):
                identity.request_json_array(
                    "POST",
                    "http://127.0.0.1:8080/auth/admin/realms/spaceos/users/example/role-mappings/realm",
                    "must-not-be-used",
                    [],
                    1,
                )
            with self.assertRaisesRegex(identity.IdentityProvisioningError, "retired"):
                identity.send_actions_email(
                    profile(),
                    "must-not-be-used",
                    {"id": "example"},
                    1,
                )
        urlopen.assert_not_called()

    def test_offline_mode_is_historical_only_and_emits_no_runnable_plan(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "identity.json"
            path.write_text(json.dumps(profile()), encoding="utf-8")
            output = StringIO()
            with patch.object(
                identity.keycloak,
                "obtain_admin_token",
                side_effect=AssertionError("credential path reached"),
            ) as token_mock, patch.object(
                identity.keycloak,
                "request_json",
                side_effect=AssertionError("network path reached"),
            ) as request_mock, redirect_stdout(output):
                exit_code = identity.main(["--profile", str(path), "--offline"])
        self.assertEqual(identity.EXIT_CONVERGED, exit_code)
        summary = json.loads(output.getvalue())
        self.assertEqual("HistoricalOffline", summary["mode"])
        self.assertTrue(summary["historicalValidationOnly"])
        self.assertFalse(summary["runnablePlanEmitted"])
        self.assertFalse(summary["invitationSent"])
        self.assertNotIn("plan", summary)
        token_mock.assert_not_called()
        request_mock.assert_not_called()

    def test_live_verify_apply_and_invite_stop_before_profile_or_network(self) -> None:
        live_modes = (
            [],
            ["--verify-only"],
            ["--apply"],
            ["--send-invite"],
            ["--offline", "--verify-only"],
            ["--offline", "--apply"],
            ["--offline", "--send-invite"],
        )
        for mode in live_modes:
            with self.subTest(mode=mode), patch.object(
                Path,
                "read_text",
                side_effect=AssertionError("profile read reached"),
            ), patch.object(
                identity.keycloak,
                "obtain_admin_token",
                side_effect=AssertionError("credential path reached"),
            ) as token_mock, patch.object(
                identity.keycloak,
                "request_json",
                side_effect=AssertionError("network path reached"),
            ) as request_mock, redirect_stdout(StringIO()):
                exit_code = identity.main([
                    "--profile",
                    "must-not-be-read.json",
                    *mode,
                ])
            self.assertEqual(identity.EXIT_ERROR, exit_code)
            token_mock.assert_not_called()
            request_mock.assert_not_called()


if __name__ == "__main__":
    unittest.main()
