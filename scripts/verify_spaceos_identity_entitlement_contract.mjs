/**
 * Local-only verifier for the immutable SpaceOS identity/entitlement v2.0.0
 * release. It intentionally performs no HTTP, Keycloak, JWKS, database,
 * tenant, credential, Plant, or deployment operation.
 */
import { createHash, sign, verify } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
export const RELEASE_DIR = join(ROOT, "docs", "knowledge", "contracts", "releases", "spaceos-identity-entitlement", "v2.0.0");
export const FILES = Object.freeze({
  readme: "README.md",
  schema: "spaceos-identity-entitlement-v2.0.0.schema.json",
  contract: "spaceos-identity-entitlement-v2.0.0.json",
  package: "spaceos-identity-entitlement-package-v2.0.0.json",
  vectors: "spaceos-identity-entitlement-test-vectors-v2.0.0.json",
  compatibility: "spaceos-identity-entitlement-compatibility-v2.0.0.json",
  sbom: "spaceos-identity-entitlement-sbom-v2.0.0.cdx.json",
  provenance: "spaceos-identity-entitlement-provenance-v2.0.0.intoto.json",
  manifest: "release-manifest-v2.0.0.json",
  sums: "SHA256SUMS",
});
const PAYLOAD_FILES = Object.freeze(Object.values(FILES).filter((name) => name !== FILES.sums));
const EXPECTED_AUDIENCE = Object.freeze(["doormanufacturing-instance-api", "kernel-api"]);
const EXPECTED_PERMISSIONS = new Set(["joinerytech.door.admin", "joinerytech.door.edit", "joinerytech.door.view"]);
const HUMAN_SPACEOS_CLAIMS = new Set(["spaceos_principal_kind", "spaceos_tenants", "spaceos_membership_version", "spaceos_projection_version"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const HASH = /^[a-f0-9]{64}$/;

export class VerificationError extends Error {}
const fail = (message) => { throw new VerificationError(message); };
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const object = (value, label) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be an object`);
  return value;
};
const array = (value, label) => {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
  return value;
};
const exactKeys = (value, keys, label) => {
  const actual = Object.keys(object(value, label)).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) fail(`${label} has unexpected fields`);
};
const exactArray = (actual, expected, label) => {
  if (!Array.isArray(actual) || actual.length !== expected.length || new Set(actual).size !== actual.length || !expected.every((item) => actual.includes(item))) fail(`${label} does not match exactly`);
};
export const sha256Text = (text) => createHash("sha256").update(text, "utf8").digest("hex");
export const sha256File = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
export const canonicalJson = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
};
const readJson = (name) => {
  try { return object(JSON.parse(readFileSync(join(RELEASE_DIR, name), "utf8")), name); }
  catch (error) { if (error instanceof VerificationError) throw error; fail(`invalid JSON artifact: ${name}`); }
};

export function parseSums() {
  const records = new Map();
  const lines = readFileSync(join(RELEASE_DIR, FILES.sums), "utf8").split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    const match = /^([a-f0-9]{64})  ([A-Za-z0-9][A-Za-z0-9._-]*)$/.exec(line);
    if (!match || records.has(match?.[2])) fail("SHA256SUMS has an invalid or duplicate record");
    records.set(match[2], match[1]);
  }
  if (records.size !== PAYLOAD_FILES.length || PAYLOAD_FILES.some((name) => !records.has(name))) fail("SHA256SUMS must list exactly the released payload files");
  return records;
}

function verifyFileSet() {
  const names = readdirSync(RELEASE_DIR).sort();
  const expected = [...Object.values(FILES)].sort();
  if (names.length !== expected.length || names.some((name, index) => name !== expected[index])) fail("release directory has a missing or unexpected artifact");
  for (const name of names) {
    const path = join(RELEASE_DIR, name);
    if (!existsSync(path) || !lstatSync(path).isFile() || lstatSync(path).isSymbolicLink()) fail(`release artifact must be a regular non-symlink file: ${name}`);
  }
}

function verifySums(records) {
  for (const [name, digest] of records) if (sha256File(join(RELEASE_DIR, name)) !== digest) fail(`SHA-256 mismatch: ${name}`);
}

function expectProfile(profile) {
  if (profile.schemaVersion !== "spaceos.identity-entitlement-contract/v2" || profile.id !== "spaceos-identity-entitlement" || profile.version !== "2.0.0" || profile.status !== "released-contract-not-activated") fail("contract identity/version/status drift");
  exactKeys(profile, ["schemaVersion", "id", "version", "status", "issuedAt", "releaseSemantics", "identityProvider", "humanToken", "servicePrincipalToken", "plantUserDeviceStationPopToken", "onlineMembershipReadback", "consumerAcceptance"], "contract");
  const provider = object(profile.identityProvider, "identityProvider");
  if (provider.issuer !== "https://joinerytech.hu/auth/realms/spaceos" || provider.jwksUri !== "https://joinerytech.hu/auth/realms/spaceos/protocol/openid-connect/certs") fail("issuer/JWKS drift");
  exactArray(provider.allowedAlgorithms, ["RS256"], "allowed algorithms");
  if (object(provider.keyRotation, "key rotation").kidRequired !== true || provider.keyRotation.noKidFallback !== true || provider.keyRotation.maximumVerificationKeyCacheSeconds !== 300) fail("kid rotation must fail closed and bounded at 300 seconds");
  const human = object(profile.humanToken, "human token");
  if (human.principalKind !== "human") fail("human principal discriminator drift");
  const header = object(object(human.jose, "jose").protectedHeader, "protected header");
  const requiredHeader = object(header.required, "required JOSE header");
  if (requiredHeader.alg !== "RS256" || requiredHeader.typ !== "JWT" || typeof requiredHeader.kid !== "string") fail("protected JOSE profile drift");
  const payload = object(human.payload, "human payload");
  if (object(payload.issuer, "payload issuer").equals !== provider.issuer || object(payload.authorizedParty, "azp").equals !== "doormanufacturing-web" || object(payload.tokenType, "payload typ").equals !== "Bearer") fail("payload issuer/azp/typ drift");
  exactArray(object(payload.audience, "audience").exactly, EXPECTED_AUDIENCE, "audience");
  const projection = object(human.nativeTenantProjection, "native tenant projection");
  if (projection.claim !== "spaceos_tenants" || projection.entries !== 1 || projection.membershipVersionClaim !== "spaceos_membership_version" || projection.projectionVersionClaim !== "spaceos_projection_version") fail("native projection/version drift");
  exactArray(projection.entryFields, ["enabled_modules", "permissions", "tenant_id"], "native projection fields");
  const entitlement = object(projection.doorstarEntitlement, "Doorstar entitlement");
  exactArray(entitlement.enabledModulesExactly, ["joinerytech.door"], "Doorstar module");
  exactArray(entitlement.acceptedPermissionsExactlyOneOf, [...EXPECTED_PERMISSIONS].sort(), "Doorstar permissions");
  const consumer = object(human.doorstarHumanConsumer, "human consumer");
  if (consumer.onlyAcceptedPrincipalKind !== "human" || !String(consumer.noFallbackOrUnion).includes("reject")) fail("human-only consumer rule drift");
  for (const name of ["cnf", "dpop_jkt", "device_id", "station_id", "spaceos_plant_pop"]) if (!array(consumer.forbiddenClaims, "forbidden claims").includes(name)) fail(`missing forbidden human claim: ${name}`);
  if (!array(consumer.forbiddenClaimPrefixes, "forbidden prefixes").includes("spaceos_plant_")) fail("missing Plant prefix denial");
  const service = object(profile.servicePrincipalToken, "service profile");
  const plant = object(profile.plantUserDeviceStationPopToken, "Plant profile");
  if (service.principalKind !== "service" || service.doorstarHumanConsumerDisposition !== "reject" || plant.principalKind !== "plant_user_device" || plant.doorstarHumanConsumerDisposition !== "reject") fail("non-human boundary drift");
  for (const name of ["cnf", "dpop_jkt", "device_id", "station_id", "spaceos_plant_pop"]) if (!array(plant.requiredClaims, "Plant required claims").includes(name)) fail(`Plant profile missing ${name}`);
  const readback = object(profile.onlineMembershipReadback, "membership readback");
  if (readback.requiredBeforeAuthorityGrant !== true || !String(readback.revocationRule).includes("deny") || !String(readback.downgradeRule).includes("deny") || !String(readback.staleTokenRule).includes("iat")) fail("readback revoke/downgrade/stale boundary drift");
  const acceptance = object(profile.consumerAcceptance, "consumer acceptance");
  if (acceptance.releaseId !== "spaceos-identity-entitlement" || acceptance.exactVersion !== "2.0.0" || acceptance.integrityAlgorithm !== "SHA-256") fail("consumer acceptance drift");
  for (const selector of ["latest", "branch", "local-build", "undocumented-ref"]) if (!array(acceptance.rejectedSelectors, "rejected selectors").includes(selector)) fail(`missing rejected selector: ${selector}`);
}

function expectCrossReferences(records, profile, pkg, compatibility, sbom, provenance, manifest) {
  const hash = (name) => records.get(name);
  if (pkg.schemaVersion !== "spaceos.identity-entitlement-package/v2" || object(pkg.release, "package release").contractId !== profile.id || pkg.release.version !== profile.version) fail("package identity drift");
  const artifactChecks = [["schema", FILES.schema], ["contract", FILES.contract], ["testVectors", FILES.vectors], ["compatibility", FILES.compatibility]];
  for (const [kind, name] of artifactChecks) {
    const entry = object(object(pkg.artifacts, "package artifacts")[kind], `package ${kind}`);
    if (entry.path !== name || entry.sha256 !== hash(name)) fail(`package ${kind} hash drift`);
  }
  if (compatibility.compatibilityHash !== sha256Text(canonicalJson(compatibility.compatibilityBasis))) fail("compatibility hash drift");
  if (compatibility.compatibilityBasis?.contractSchemaArtifactSha256 !== hash(FILES.schema) || compatibility.compatibilityBasis?.contractArtifactSha256 !== hash(FILES.contract)) fail("compatibility basis contract/schema hash drift");
  if (object(pkg.artifacts, "package artifacts").compatibility.compatibilityHash !== compatibility.compatibilityHash) fail("package compatibility hash drift");
  if (sbom.bomFormat !== "CycloneDX" || sbom.specVersion !== "1.5") fail("SBOM format drift");
  const sbomComponents = array(sbom.components, "SBOM components");
  for (const [name, digest] of [[FILES.schema, hash(FILES.schema)], [FILES.contract, hash(FILES.contract)], [FILES.package, hash(FILES.package)], [FILES.vectors, hash(FILES.vectors)], [FILES.compatibility, hash(FILES.compatibility)]]) {
    if (!sbomComponents.some((component) => component?.name === name && component?.hashes?.some((entry) => entry.alg === "SHA-256" && entry.content === digest))) fail(`SBOM hash drift: ${name}`);
  }
  if (provenance._type !== "https://in-toto.io/Statement/v1" || provenance.predicateType !== "https://slsa.dev/provenance/v1") fail("provenance type drift");
  for (const [name, digest] of [[FILES.schema, hash(FILES.schema)], [FILES.contract, hash(FILES.contract)], [FILES.package, hash(FILES.package)], [FILES.compatibility, hash(FILES.compatibility)], [FILES.vectors, hash(FILES.vectors)], [FILES.sbom, hash(FILES.sbom)]]) {
    if (!array(provenance.subject, "provenance subject").some((subject) => subject?.name === name && subject?.digest?.sha256 === digest)) fail(`provenance hash drift: ${name}`);
  }
  if (manifest.schemaVersion !== "spaceos.identity-entitlement-release-manifest/v2" || manifest.release?.id !== profile.id || manifest.release?.version !== profile.version) fail("release manifest identity drift");
  const manifestFiles = object(manifest.artifacts, "manifest artifacts");
  if (own(manifestFiles, FILES.manifest)) fail("manifest must not self-reference");
  const payloadWithoutManifest = [...records].filter(([name]) => name !== FILES.manifest);
  for (const [name, digest] of payloadWithoutManifest) if (manifestFiles[name]?.sha256 !== digest) fail(`manifest hash drift: ${name}`);
  if (Object.keys(manifestFiles).length !== payloadWithoutManifest.length || manifest.compatibility?.compatibilityHash !== compatibility.compatibilityHash) fail("manifest artifact set or compatibility hash drift");
}

export function verifyRelease() {
  verifyFileSet();
  const records = parseSums();
  verifySums(records);
  const schema = readJson(FILES.schema);
  if (schema.additionalProperties !== false || schema.$schema !== "https://json-schema.org/draft/2020-12/schema") fail("schema must have a strict root");
  const profile = readJson(FILES.contract);
  const pkg = readJson(FILES.package);
  const vectors = readJson(FILES.vectors);
  const compatibility = readJson(FILES.compatibility);
  const sbom = readJson(FILES.sbom);
  const provenance = readJson(FILES.provenance);
  const manifest = readJson(FILES.manifest);
  expectProfile(profile);
  if (vectors.schemaVersion !== "spaceos.identity-entitlement-test-vectors/v2" || vectors.version !== "2.0.0") fail("test vector identity drift");
  for (const id of ["tenant-a-human-allow", "tenant-b-cross-tenant-deny", "membership-revoke-deny", "membership-downgrade-deny", "stale-token-cutoff-deny", "jwks-post-rotation-old-kid-deny", "jwks-retirement-cache-bound-deny", "service-principal-human-deny", "plant-pop-human-deny", "selector-latest-deny"]) if (!array(vectors.cases, "test cases").some((entry) => entry?.id === id)) fail(`missing test vector: ${id}`);
  expectCrossReferences(records, profile, pkg, compatibility, sbom, provenance, manifest);
  return Object.freeze({ verification: "passed", release: "spaceos-identity-entitlement/v2.0.0", releaseManifestSha256: records.get(FILES.manifest), compatibilityHash: compatibility.compatibilityHash });
}

const base64 = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
export function signJwt(header, claims, privateKey) {
  const input = `${base64(header)}.${base64(claims)}`;
  return `${input}.${sign("RSA-SHA256", Buffer.from(input), privateKey).toString("base64url")}`;
}
function parseJwt(token) {
  if (typeof token !== "string" || token.split(".").length !== 3) fail("malformed JWT");
  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
  try { return { header: object(JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8")), "JWT header"), claims: object(JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")), "JWT payload"), input: `${encodedHeader}.${encodedPayload}`, signature: Buffer.from(encodedSignature, "base64url") }; }
  catch { fail("malformed JWT JSON"); }
}
export function validateHumanClaims(claims, now) {
  if (claims.iss !== "https://joinerytech.hu/auth/realms/spaceos" || claims.azp !== "doormanufacturing-web" || claims.typ !== "Bearer" || claims.spaceos_principal_kind !== "human") fail("human token envelope rejected");
  exactArray(claims.aud, EXPECTED_AUDIENCE, "JWT audience");
  for (const key of Object.keys(claims)) if (key.startsWith("spaceos_") && !HUMAN_SPACEOS_CLAIMS.has(key)) fail("unknown/non-human spaceos claim rejected");
  for (const key of ["tid", "tenant_id", "tenantId", "tenant_ref", "permissions", "enabled_modules", "enabledModules", "realm_access", "spaceosTenants", "spaceOsTenants", "membershipVersion", "projectionVersion"]) if (own(claims, key)) fail("flat or alias projection claim rejected");
  for (const key of ["cnf", "dpop_jkt", "device_id", "station_id", "spaceos_service_principal"]) if (own(claims, key)) fail("non-human proof/service claim rejected");
  if (typeof claims.sub !== "string" || !claims.sub || !Number.isSafeInteger(claims.iat) || !Number.isSafeInteger(claims.exp) || claims.iat > claims.exp || claims.exp <= now - 60 || claims.iat > now + 60 || claims.exp - claims.iat > 900) fail("JWT time/subject rejected");
  if (!Number.isSafeInteger(claims.spaceos_membership_version) || claims.spaceos_membership_version <= 0 || !Number.isSafeInteger(claims.spaceos_projection_version) || claims.spaceos_projection_version <= 0) fail("projection versions rejected");
  const entries = array(claims.spaceos_tenants, "spaceos_tenants");
  if (entries.length !== 1) fail("human token must contain exactly one tenant");
  const entry = object(entries[0], "spaceos_tenants entry");
  exactKeys(entry, ["tenant_id", "permissions", "enabled_modules"], "spaceos_tenants entry");
  if (typeof entry.tenant_id !== "string" || !UUID.test(entry.tenant_id) || /^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(entry.tenant_id)) fail("tenant id rejected");
  exactArray(entry.enabled_modules, ["joinerytech.door"], "enabled modules");
  if (!Array.isArray(entry.permissions) || entry.permissions.length !== 1 || !EXPECTED_PERMISSIONS.has(entry.permissions[0])) fail("permission rejected");
  return Object.freeze({ sub: claims.sub, tenant_id: entry.tenant_id, permissions: [...entry.permissions], enabled_modules: [...entry.enabled_modules], spaceos_membership_version: claims.spaceos_membership_version, spaceos_projection_version: claims.spaceos_projection_version, iat: claims.iat });
}
export function validateOnlineMembershipReadback(identity, readback, targetTenantId) {
  const current = object(readback, "membership readback");
  exactKeys(current, ["active", "sub", "tenant_id", "permissions", "enabled_modules", "spaceos_membership_version", "spaceos_projection_version", "accept_tokens_issued_at_or_after"], "membership readback");
  if (typeof targetTenantId !== "string" || typeof current.sub !== "string" || typeof current.tenant_id !== "string" || !Number.isSafeInteger(current.spaceos_membership_version) || current.spaceos_membership_version <= 0 || !Number.isSafeInteger(current.spaceos_projection_version) || current.spaceos_projection_version <= 0 || !Number.isSafeInteger(current.accept_tokens_issued_at_or_after) || current.accept_tokens_issued_at_or_after < 0 || !Array.isArray(current.permissions) || !Array.isArray(current.enabled_modules)) fail("membership readback types rejected");
  if (targetTenantId !== identity.tenant_id || current.active !== true || current.sub !== identity.sub || current.tenant_id !== identity.tenant_id) fail("cross-tenant or revoked membership denied");
  if (current.spaceos_membership_version !== identity.spaceos_membership_version || current.spaceos_projection_version !== identity.spaceos_projection_version || current.accept_tokens_issued_at_or_after > identity.iat) fail("membership version or stale-token cutoff denied");
  exactArray(current.permissions, identity.permissions, "readback permissions");
  exactArray(current.enabled_modules, identity.enabled_modules, "readback modules");
  return true;
}
export function validateHumanJwt(token, jwks, now) {
  const parsed = parseJwt(token);
  if (own(parsed.header, "crit") || own(parsed.header, "jku") || own(parsed.header, "x5u") || parsed.header.b64 === false) fail("unsupported JOSE extension rejected");
  if (parsed.header.alg !== "RS256" || parsed.header.typ !== "JWT" || typeof parsed.header.kid !== "string" || !parsed.header.kid || !own(jwks, parsed.header.kid)) fail("unknown or invalid JWKS kid");
  if (!verify("RSA-SHA256", Buffer.from(parsed.input), jwks[parsed.header.kid], parsed.signature)) fail("JWT signature rejected");
  return validateHumanClaims(parsed.claims, now);
}
export function assertExactReleaseSelector(selector) {
  if (!selector || typeof selector !== "object" || Array.isArray(selector)) fail("selector must be a content-addressed object");
  exactKeys(selector, ["kind", "releaseId", "version", "releaseManifestSha256", "sha256SumsSha256"], "release selector");
  const manifestHash = sha256File(join(RELEASE_DIR, FILES.manifest));
  const sumsHash = sha256File(join(RELEASE_DIR, FILES.sums));
  if (selector.kind !== "content-addressed-release" || selector.releaseId !== "spaceos-identity-entitlement" || selector.version !== "2.0.0" || !HASH.test(selector.releaseManifestSha256) || !HASH.test(selector.sha256SumsSha256) || selector.releaseManifestSha256 !== manifestHash || selector.sha256SumsSha256 !== sumsHash) fail("latest, branch, local build, or unpinned selector rejected");
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.slice(2).length) fail("the verifier accepts no release selector or local-build override");
    process.stdout.write(`${JSON.stringify(verifyRelease())}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ verification: "failed", error: error instanceof Error ? error.message : "unknown verification error" })}\n`);
    process.exitCode = 1;
  }
}
