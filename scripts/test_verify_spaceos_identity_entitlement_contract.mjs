/** Local, network-free conformance tests for the SpaceOS identity release. */
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  assertExactReleaseSelector,
  FILES,
  RELEASE_DIR,
  sha256File,
  signJwt,
  validateHumanJwt,
  validateOnlineMembershipReadback,
  verifyRelease,
} from "./verify_spaceos_identity_entitlement_contract.mjs";

const now = 1800000000;
const tenantA = "11111111-1111-4111-8111-111111111111";
const tenantB = "22222222-2222-4222-8222-222222222222";
const keys = {
  old: generateKeyPairSync("rsa", { modulusLength: 2048 }),
  next: generateKeyPairSync("rsa", { modulusLength: 2048 }),
};

function claims(overrides = {}) {
  return {
    iss: "https://joinerytech.hu/auth/realms/spaceos",
    aud: ["doormanufacturing-instance-api", "kernel-api"],
    azp: "doormanufacturing-web",
    typ: "Bearer",
    sub: "synthetic-human-subject",
    iat: now - 100,
    exp: now + 500,
    spaceos_principal_kind: "human",
    spaceos_tenants: [{
      tenant_id: tenantA,
      permissions: ["joinerytech.door.view"],
      enabled_modules: ["joinerytech.door"],
    }],
    spaceos_membership_version: 12,
    spaceos_projection_version: 21,
    ...overrides,
  };
}

function token(kind, payload = claims()) {
  return signJwt({ alg: "RS256", typ: "JWT", kid: kind === "old" ? "test-old-kid" : "test-new-kid" }, payload, keys[kind].privateKey);
}

function readback(identity, overrides = {}) {
  return {
    active: true,
    sub: identity.sub,
    tenant_id: identity.tenant_id,
    permissions: identity.permissions,
    enabled_modules: identity.enabled_modules,
    spaceos_membership_version: identity.spaceos_membership_version,
    spaceos_projection_version: identity.spaceos_projection_version,
    accept_tokens_issued_at_or_after: identity.iat - 1,
    ...overrides,
  };
}

test("release files and cross-artifact SHA-256 references verify offline", () => {
  const result = verifyRelease();
  assert.equal(result.verification, "passed");
  assert.match(result.releaseManifestSha256, /^[a-f0-9]{64}$/);
  assert.match(result.compatibilityHash, /^[a-f0-9]{64}$/);
  const manifest = JSON.parse(readFileSync(join(RELEASE_DIR, FILES.manifest), "utf8"));
  assert.equal(Object.hasOwn(manifest.artifacts, FILES.manifest), false);
});

test("two tenants cannot cross authorize, revoked and downgraded memberships deny, and stale cutoff denies", () => {
  const identity = validateHumanJwt(token("old"), { "test-old-kid": keys.old.publicKey }, now);
  assert.equal(validateOnlineMembershipReadback(identity, readback(identity), tenantA), true);
  assert.throws(() => validateOnlineMembershipReadback(identity, readback(identity), tenantB), /cross-tenant/);
  assert.throws(() => validateOnlineMembershipReadback(identity, readback(identity, { active: false }), tenantA), /revoked/);
  assert.throws(() => validateOnlineMembershipReadback(identity, readback(identity, { permissions: ["joinerytech.door.edit"], spaceos_membership_version: 13 }), tenantA), /version|permissions/);
  assert.throws(() => validateOnlineMembershipReadback(identity, readback(identity, { accept_tokens_issued_at_or_after: identity.iat + 1 }), tenantA), /stale-token/);
  assert.throws(() => validateOnlineMembershipReadback(identity, readback(identity, { accept_tokens_issued_at_or_after: "1799999900" }), tenantA), /types/);
});

test("old/new kid overlap works only by exact kid and a fresh JWKS refresh denies the old kid within 300 seconds", () => {
  const overlap = { "test-old-kid": keys.old.publicKey, "test-new-kid": keys.next.publicKey };
  assert.equal(validateHumanJwt(token("old"), overlap, now).tenant_id, tenantA);
  assert.equal(validateHumanJwt(token("next"), overlap, now).tenant_id, tenantA);
  const postRotation = { "test-new-kid": keys.next.publicKey };
  assert.throws(() => validateHumanJwt(token("old"), postRotation, now), /unknown.*kid/);
  assert.equal(validateHumanJwt(token("next"), postRotation, now).tenant_id, tenantA);
});

test("service, Plant PoP, and unknown SpaceOS claim objects cannot become human tokens", () => {
  const jwks = { "test-old-kid": keys.old.publicKey };
  assert.throws(() => validateHumanJwt(token("old", claims({ spaceos_principal_kind: "service", spaceos_service_principal: { client_id: "synthetic" } })), jwks, now), /human token envelope/);
  assert.throws(() => validateHumanJwt(token("old", claims({ spaceos_principal_kind: "plant_user_device", cnf: { jkt: "synthetic" }, dpop_jkt: "synthetic", device_id: "device-1", station_id: "station-1", spaceos_plant_pop: {} })), jwks, now), /human token envelope/);
  assert.throws(() => validateHumanJwt(token("old", claims({ spaceos_tenants: [{ tenant_id: tenantA, permissions: ["joinerytech.door.view"], enabled_modules: ["joinerytech.door"], unexpected: {} }] })), jwks, now), /unexpected fields/);
  assert.throws(() => validateHumanJwt(token("old", claims({ spaceos_unknown_extension: {} })), jwks, now), /unknown\/non-human/);
  assert.throws(() => validateHumanJwt(signJwt({ alg: "RS256", typ: "JWT", kid: "test-old-kid", crit: ["exp"] }, claims(), keys.old.privateKey), jwks, now), /JOSE extension/);
  assert.throws(() => validateHumanJwt(token("old", claims({ tid: tenantA })), jwks, now), /flat or alias/);
});

test("latest, branch, and local-build selectors are rejected", () => {
  for (const selector of ["latest", "main", "local-build", { kind: "branch", releaseId: "spaceos-identity-entitlement", version: "2.0.0", releaseManifestSha256: "0".repeat(64), sha256SumsSha256: "0".repeat(64) }]) {
    assert.throws(() => assertExactReleaseSelector(selector), /selector|latest|branch|local build/);
  }
  const manifestHash = sha256File(join(RELEASE_DIR, FILES.manifest));
  const sumsHash = sha256File(join(RELEASE_DIR, FILES.sums));
  assert.throws(() => assertExactReleaseSelector({ kind: "content-addressed-release", releaseId: "spaceos-identity-entitlement", version: "2.0.0", releaseManifestSha256: manifestHash, sha256SumsSha256: "0".repeat(64) }), /selector/);
  assert.equal(assertExactReleaseSelector({ kind: "content-addressed-release", releaseId: "spaceos-identity-entitlement", version: "2.0.0", releaseManifestSha256: manifestHash, sha256SumsSha256: sumsHash }), true);
});
