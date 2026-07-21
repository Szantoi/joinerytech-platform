# B2B-09 — cross-tenant security, contract és E2E release-kapu

- **Szerep:** QA/security
- **Prioritás:** P0
- **Státusz:** blocked
- **Függőség:** `B2B-07 = done`, `B2B-08 = done`
- **Kimenet:** verziózott B2B conformance artifact és PASS/FAIL release-verdict

## Cél

Függetlenül bizonyítani, hogy a teljes kézfogás a domén-, tenant-, agreement-,
adatcsere-, API- és UX-szerződés szerint működik, és publikálható a Doorstar pilot
számára.

## Kötelező conformance forgatókönyv

1. Host draftot és immutable terms revisiont készít.
2. Host work package-et ajánl guestnek.
3. Guest csak az engedett adatot látja; attacker semmit.
4. Guest accept/reject útja a pontos revision hash-t használja.
5. Guest start, submit és proof/document attach lépést hajt végre.
6. Host changes requested, új submit, majd complete lépést hajt végre.
7. Mindkét nézet event sequence/revision hash egyezést igazol.
8. Revoke/expiry, stale revision, replay, duplicate és out-of-order negatív út
   fail-closed.

## Kötelező bizonyítékok

- domain FSM matrix coverage;
- nem-superuser PostgreSQL RLS suite host/guest/attacker tenanttal;
- canonical hash golden test;
- outbox/inbox fault injection és replay;
- OpenAPI breaking/drift verdict és generated client build;
- Portal két-tenant Playwright + a11y;
- observability/reconciliation runbook smoke;
- migration up/down vagy dokumentált forward-fix/rollback;
- dependency/SBOM/secret scan az artifactokra.

## Mutációs határ

Conformance tesztek, fixture-ek, CI gate, runbook és saját task napló. Product
kódhiba itt nem javítható mellékesen: vissza kell adni az owning tasknak.

## Publikálandó handoff

```yaml
platform_commit: <sha>
collaboration_package: <id@version-or-digest>
openapi_sha256: <hash>
event_schema_sha256: <hash>
terms_schema_sha256: <hash>
conformance_runner: <version>
security_verdict: PASS
contract_verdict: PASS
e2e_verdict: PASS
```

## Elfogadási kritériumok

- [ ] A kötelező scenario minden pozitív és negatív útja automatizált.
- [ ] Nincs skip, retryval elfedett flake vagy superuseres RLS-bizonyíték.
- [ ] Host/guest timeline sequence és revision hash egyezik.
- [ ] Attacker tenant existence/adat szivárgást nem kap.
- [ ] Revoke után új olvasás és mutation elutasított.
- [ ] Minden artifact pontos verzióval és hash-sel reprodukálható.
- [ ] QA és security reviewer egyaránt PASS.
- [ ] Doorstar `DSCONV-GATE-HANDSHAKE` inputja hiánytalan.

## Stop / eszkaláció

Bármely cross-tenant szivárgás, audit/hash eltérés, nem idempotens replay vagy
contract drift release blocker. A verdict ilyenkor FAIL; nem minősíthető ismert
alacsony prioritású hibának.

## Végrehajtási napló

_Kitöltendő: environment, commit, parancsok, futási idők, hibák, rerunok._

## Átadási bizonyíték

_Kitöltendő: fenti YAML valós értékekkel, report linkek, reviewer aláírás._

