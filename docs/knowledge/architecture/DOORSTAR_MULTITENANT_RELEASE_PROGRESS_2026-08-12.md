# Doorstar multi-tenant release progress — 2026-08-12

## Safe state

- `doormanufacturing.joinerytech.hu` is fail-closed: root, Flow and Calc return `503`; API routes return `404`; `/healthz` returns `204`.
- The separate synthetic demo host is unchanged.
- No database migration, Keycloak change, service activation, tenant data creation, or public application route was enabled in this work slice.

## Private, pinned source releases

| Component | Protected private tag | Commit | Validation status |
| --- | --- | --- | --- |
| Flow Lab | `flow-instance-gateway-replay-v0.1.0-rc.1` | `f1df0ac28f9c94ff8cd39d55813be1f5ae2df99a` | Build, format, PII gate, 746 tests, web lint/test/build passed; real source-root guard remains deliberately fail-closed. |
| Calculation Lab | `calc-n6-postgresql-replay-store-v0.1.0-rc.1` | `e088dcef37da765a80a1de9ecc851d7b94f5674b` | 259 backend and 92 web tests, build and lint passed. |
| Instance synthetic source baseline | `instance-flow-gateway-source-v0.1.0-rc.1` | `4acc628027d1e6516d6fa6a5cac1afdd860afa73` | Artifact manifests, focused BFF/tenant/RLS tests and build passed; this is synthetic provenance and not activation eligible. |
| Instance tenant selector hardening | `instance-tenant-selector-hardening-v0.1.0-rc.1` | `b99d55fb12f73ab9be03589775848f5e7a4b8b60` | Rejects normalized client tenant selectors before JWT/JWKS or tenant-directory work; build, 40 focused tests and OpenAPI coverage passed. |
| Instance P0 contract provenance | `instance-p0-contract-provenance-v0.1.0-rc.2` | `5b2dd0b5c06b8d98feb38cf218285404fb0916de` | Restores the P0 mirror byte-for-byte from the protected Calc release; 19 P0 tests, build and OpenAPI coverage passed. |

The Instance hardening rejects `X-Tenant`, `X-Tenant-Id`, `X-Tenant-Key`, `X-Tenant-Label`, casing changes, and separator variants such as `X-TenantKey` and `X_Tenant_Id`. Tenant identity remains derived only from the issued JWT and active server-side tenant record.

## Remaining activation gates

1. Recover or independently verify the remaining planning fixture bundle and the private RAG-input Python tool. The verified Calc P0 mirror is now present, but the complete database-free suite remains fail-closed at 400/409; the nine remaining failures are not hidden or waived. The Python tool was searched across private Instance/Flow/Calc releases and verified VPS artifacts; only excluded public/demo copies exist.
2. Establish a dedicated staging migrator/audit role and one-shot proof unit. The pending Instance BFF migration is additive and does not provide tenant RLS.
3. Apply and prove the full tenant-owned schema under a non-owner, `NOBYPASSRLS` application role: fresh schema, FORCE RLS/policies, two tenants, forged-header/cookie negatives, station scope, compound uniqueness, and connection-pool reuse. The existing pool proof intentionally has not run: it mutates staging sentinel rows, and no activation-eligible release, dedicated audit/migrator role, matching relation manifest, or disabled proof unit exists yet.
4. Create and review Flow and Calculation Lab staging activation contracts, then run signed-assertion, replay, tenant catalog, and cross-component JWT E2E proofs.

Until every gate passes, canonical routing must remain closed and the releases must not be used to activate an application service.
