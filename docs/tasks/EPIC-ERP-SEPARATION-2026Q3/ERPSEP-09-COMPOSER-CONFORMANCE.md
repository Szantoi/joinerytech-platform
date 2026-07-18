# ERPSEP-09 — instance composer, lockfile és module conformance suite

- **Epic:** EPIC-ERP-SEPARATION-2026Q3
- **Szerep:** infra/QA/security
- **Prioritás:** P2
- **Státusz:** blocked
- **Függőség:** ERPSEP-08
- **Mutációs határ:** composer/resolver/conformance tooling és dokumentáció
- **Tiltott scope:** új üzleti capability, Doorstar instance descriptor tartalma,
  automatikus éles deploy

## Cél és üzleti eredmény

Egy instance deklaratív descriptorból és lockfile-ból reprodukálhatóan álljon
össze. A resolver csak aláírt, kompatibilis bundle-ket aktiváljon, a conformance
suite pedig install, upgrade, rollback, auth, tenant és UI/API konzisztenciát
bizonyítson.

## Kötelező kimenet

- `spaceos.instance/v1` JSON/YAML schema;
- dependency resolver és konfliktusriport;
- `instance.lock` pontos OCI digesttel, contract hash-sel és migration verzióval;
- signature/SBOM verification;
- modul conformance runner;
- dry-run és rollback parancs;
- géppel olvasható install auditlog.

## Elfogadási kritériumok

- [ ] Ugyanaz a lock ugyanazokat a digesteket oldja fel.
- [ ] Hiányzó, visszavont vagy inkompatibilis dependency fail-closed.
- [ ] Dependency cycle és route/permission collision telepítés előtt látható.
- [ ] Install/upgrade/rollback idempotens vagy biztonságosan újraindítható.
- [ ] A Maintenance pilot teljes conformance suite-ja zöld.
- [ ] A Doorstar repository ugyanazt a runnert saját descriptorral futtathatja.

## Teszt- és bizonyítékterv

Golden fixture-ek: valid instance, hiányzó dependency, verzióütközés, sérült
signature, migration failure, frontend integrity mismatch és rollback.

## Stop / eszkaláció

Secretet, külső credentialt vagy deploykulcsot a descriptor/lock nem tárolhat.
Éles aktiválás emberi kapu nélkül tilos.

## Végrehajtási napló

_Az agent tölti ki._

## Átadási bizonyíték

_Fixture-lista, resolver/conformance riport és security review._

