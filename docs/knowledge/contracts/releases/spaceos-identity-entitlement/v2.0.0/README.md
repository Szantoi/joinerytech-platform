# SpaceOS identity & entitlement contract v2.0.0

`spaceos-identity-entitlement/v2.0.0` is a public, non-secret, immutable
release package for a Doorstar **human-token** consumer.  It defines the
canonical SpaceOS human identity and entitlement projection, its online
membership readback boundary, and explicit non-human boundaries.  It is not a
runtime activation, Keycloak configuration, tenant onboarding record, Plant
cutover, or authorization to deploy anything.

## Exact consumer acceptance

A Doorstar consumer may accept this release only when all of the following are
true:

1. The selected release id is `spaceos-identity-entitlement` and the version
   is exactly `2.0.0`.
2. Every payload file listed in `SHA256SUMS` has its exact SHA-256 digest.
3. `release-manifest-v2.0.0.json` cross-references the same schema, package,
   compatibility, SBOM, provenance, profile, and vector digests.
4. The consumer applies the exact human profile in
   `spaceos-identity-entitlement-v2.0.0.json`; it must not union it with the
   service or Plant profiles.

The following are not release selectors and must be rejected: `latest`, a
semver range, an unpinned URL, a git branch, a moving tag without the exact
payload hashes, a local build, a working-tree path, or any undocumented ref.
A future publication record may additionally name an immutable annotated tag
and full commit id, but neither is a substitute for this content-addressed
bundle.  This release deliberately does not invent an unpublished tag or
commit id.

## Offline verification

Run from the JoineryTech platform checkout:

```powershell
node scripts/verify_spaceos_identity_entitlement_contract.mjs
node --test scripts/test_verify_spaceos_identity_entitlement_contract.mjs
```

The verifier reads only local files.  Its conformance tests mint synthetic
test JWTs with ephemeral test keys using `node:crypto`; they make no network,
Keycloak, JWKS, database, tenant, credential, Plant, or deployment operation.
The passing result proves cryptographic **local conformance** to this release,
not a live issuer/JWKS configuration, membership-service availability, actual
tenant entitlement, Keycloak mapper state, or Plant user/device/station PoP
activation.

## Release payload

| File | Purpose |
| --- | --- |
| `spaceos-identity-entitlement-v2.0.0.schema.json` | JSON Schema for the released profile shape and principal boundary. |
| `spaceos-identity-entitlement-v2.0.0.json` | Canonical human, M2M, Plant-PoP, readback, and consumer-selection rules. |
| `spaceos-identity-entitlement-package-v2.0.0.json` | Release package metadata and content-addressed references. |
| `spaceos-identity-entitlement-test-vectors-v2.0.0.json` | Non-secret two-tenant negative/positive conformance matrix. |
| `spaceos-identity-entitlement-compatibility-v2.0.0.json` | Wire-compatibility basis and deterministic compatibility hash. |
| `spaceos-identity-entitlement-sbom-v2.0.0.cdx.json` | CycloneDX 1.5 SBOM for the release payload. |
| `spaceos-identity-entitlement-provenance-v2.0.0.intoto.json` | in-toto Statement v1 style provenance. |
| `release-manifest-v2.0.0.json` | Digest index for all immutable payload artifacts. |
| `SHA256SUMS` | SHA-256 integrity root for every payload file except itself. |

The package metadata intentionally does not self-hash.  Its SHA-256, the
schema hash, SBOM hash, provenance hash, and compatibility-file hash are
carried by the release manifest and `SHA256SUMS`; a self-reference would make
the bundle unverifiable.
