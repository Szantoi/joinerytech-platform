"""Offline regression tests for the Door Manufacturing auth-contract verifier."""

from __future__ import annotations

import copy
import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("verify_doormanufacturing_auth_contract.py")
SPEC = importlib.util.spec_from_file_location("verify_doormanufacturing_auth_contract", SCRIPT)
assert SPEC and SPEC.loader
VERIFIER = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = VERIFIER
SPEC.loader.exec_module(VERIFIER)


class DoorManufacturingAuthContractVerificationTests(unittest.TestCase):
    def test_release_and_consumer_intake_verify_offline(self) -> None:
        result = VERIFIER.verify_release(VERIFIER.DEFAULT_INTAKE)
        self.assertEqual("passed", result["verification"])
        self.assertRegex(result["intakeSha256"], r"^[0-9a-f]{64}$")

    def test_generic_realm_role_cannot_replace_the_scoped_role_map(self) -> None:
        profile = json.loads((VERIFIER.RELEASE_DIR / VERIFIER.PROFILE_NAME).read_text(encoding="utf-8"))
        mutated = copy.deepcopy(profile)
        mutated["accessToken"]["realmRoles"]["capabilityMap"] = {
            "Admin": ["instance.admin"]
        }
        with self.assertRaisesRegex(VERIFIER.VerificationError, "scoped realm role map"):
            VERIFIER.validate_profile(mutated)

    def test_wrong_algorithm_is_rejected(self) -> None:
        profile = json.loads((VERIFIER.RELEASE_DIR / VERIFIER.PROFILE_NAME).read_text(encoding="utf-8"))
        mutated = copy.deepcopy(profile)
        mutated["identityProvider"]["signing"]["allowedAlgorithms"] = ["ES256"]
        with self.assertRaisesRegex(VERIFIER.VerificationError, "Only RS256"):
            VERIFIER.validate_profile(mutated)

    def test_consumer_copy_must_match_the_released_checksum_exactly(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            intake = Path(directory) / "spaceos-door-manufacturing-auth-intake-v1.0.0.json"
            intake.write_text(VERIFIER.DEFAULT_INTAKE.read_text(encoding="utf-8") + "\n", encoding="utf-8")
            with self.assertRaisesRegex(VERIFIER.VerificationError, "intake checksum mismatch"):
                VERIFIER.verify_release(intake)


if __name__ == "__main__":
    unittest.main(verbosity=2)
