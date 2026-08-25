# SpaceOS Door Manufacturing auth contract v1.0.0

This directory is a versioned, non-secret contract release. Its integrity is
the exact SHA-256 values in `SHA256SUMS`; no file in this release is a mutable
`latest` reference. `DOORSTAR-INTAKE-SHA256` separately pins the exact
consumer manifest copy that the Instance must accept.

The released part is the public JWT/authorization profile and its explicit
station-policy boundary. It is deliberately **not** an activation declaration:
the Keycloak clients and user/tenant data still require operator-gated
provisioning, the station resolver is not implemented, the Instance Context
OpenAPI is `1.0.0-draft.1` without a live endpoint, and the Door Manufacturing
database/RLS proof is separate.

## Consumer input

The corresponding Doorstar intake is:

`doorstar-instance/docs/projects/doorstar-spaceos-convergence/contracts/spaceos-door-manufacturing-auth-intake-v1.0.0.json`

It is intentionally a copied, pinned consumer record rather than a URL fetch.
Before accepting it, compare the Platform checkout to the source revision
recorded in the intake and verify the hashes locally:

```powershell
git rev-parse HEAD
python scripts/verify_doormanufacturing_auth_contract.py `
  --intake ..\doorstar-instance\docs\projects\doorstar-spaceos-convergence\contracts\spaceos-door-manufacturing-auth-intake-v1.0.0.json

cd ..\doorstar-instance\src\production-service
npm run verify:platform-auth-contract -- `
  --manifest ..\..\docs\projects\doorstar-spaceos-convergence\contracts\spaceos-door-manufacturing-auth-intake-v1.0.0.json
```

Both commands are local-only: they do not contact Keycloak/JWKS, create a
tenant, change a database, or read a secret.

## Required activation evidence

1. Run the Keycloak client provisioner with an explicitly approved apply, then
   run its read-only convergence verification. The admin endpoint is VPS
   loopback-only and is never the JWT issuer.
2. Provision the active local tenant mapping and the user separately. Do not
   create it merely because a JWT is presented.
3. Implement and prove tenant-scoped station membership. The release carries no
   station claim and does not make `X-Station` authoritative.
4. Keep the Instance Context endpoint unmounted until its draft becomes an
   accepted, implemented platform endpoint.
5. Complete the Instance `tenant_id`/FORCE RLS migration with two-tenant and
   same-pool reuse evidence before mounting a multi-tenant production route.
