# EPIC-ERP-SEPARATION-2026Q3 — horizontális ERP leválasztása és telepíthető platformmodulok

- **Tulajdonos:** root
- **Koordinátor:** conductor
- **Státusz:** in_progress
- **Célarchitektúra:**
  [`SPACEOS_MODULAR_PRODUCT_ARCHITECTURE_2026-07-18.md`](../../knowledge/architecture/SPACEOS_MODULAR_PRODUCT_ARCHITECTURE_2026-07-18.md)
- **Minőségi szerződés:** [`QUALITY.md`](../../../QUALITY.md)

## Cél

A CRM, Kontrolling, HR, Maintenance, QA, EHS és DMS horizontális ERP
capability-k leválasztása a JoineryTech faipari domaintől és az
ügyfél-instance-októl. A modulok publikus kontraktussal, külön frontend- és
backend-csomaghatárral, majd egy közös SpaceOS Module Bundle release-egységben
legyenek telepíthetők.

## Tulajdonosi határ

### Ebben a JoineryTech epicben marad

- SpaceOS/ERP ModuleId és aláírt katalógus;
- ERP bounded-context és cross-module contract;
- közös frontend workspace és publikus modul-API;
- közös backend hosting/package contract;
- Instance Context API és portal composition;
- brand/template/policy/adapter extension-szerződés;
- Maintenance bundle pilot;
- instance composer, lockfile és conformance suite.

### Nem kerül ebbe az epicbe

- Doorstar stationlista, 6-stage template, ProjectSheet-séma és brand;
- Doorstar auth-migráció és adatkonverzió;
- Doorstar portálkompozíció és UAT;
- ügyfélspecifikus adapter vagy seed.

Ezek a `doorstar-instance/docs/projects/doorstar-spaceos-convergence/` projekt
feladatai. A két repository között forrásmásolás helyett verziózott contract és
explicit átadási kapu használható.

## Milestone-ok és taskok

| Szakasz | Task | Szerep | Belépési feltétel | Eredmény |
|---|---|---|---|---|
| E1 | [`ERPSEP-01`](ERPSEP-01-CAPABILITY-BOUNDARY-AUDIT.md) | architect | nincs | ERP/kernel/industry/instance ownership-audit |
| E1 | [`ERPSEP-02`](ERPSEP-02-MODULE-CATALOG-ADR.md) | architect/security | ERPSEP-01 | kanonikus ModuleId és aláírt katalógus ADR |
| E1 | [`ERPSEP-03`](ERPSEP-03-CROSS-MODULE-CONTRACT-ADR.md) | architect/backend | ERPSEP-01 | semleges referenciák, event/API port ADR |
| E1 | [`ERPSEP-PACKAGE-BOUNDARY-PREFLIGHT`](ERPSEP-PACKAGE-BOUNDARY-PREFLIGHT.md) | platform-tooling | ERPSEP-01 | konfigurációvezérelt frontend/backend függőségi regressziókapu |
| E1 | [`ERPSEP-FE-CROSS-MODULE-DEBT-01`](ERPSEP-FE-CROSS-MODULE-DEBT-01.md) | frontend/platform | boundary preflight | Controlling→EHS mély import megszüntetése, shared UI ownership |
| E1 | [`ERPSEP-FE-MOCK-SEED-OWNERSHIP`](ERPSEP-FE-MOCK-SEED-OWNERSHIP.md) | frontend/platform | cross-module debt review | CRM/HR/Kontrolling seed leválasztása a legacy shell-mockokról |
| E2 | [`MODULE-PACKAGES`](MODULE-PACKAGES.md) | frontend | ERPSEP-02, MODULE-FOLDERS | workspace és publikus modulcsomagok |
| E2 | [`ERPSEP-05`](ERPSEP-05-BACKEND-PACKAGING-CONTRACT.md) | backend | ERPSEP-02, STAB-RLS-PROOF | backend package/hosting szerződés |
| E2 | [`ERPSEP-06`](ERPSEP-06-INSTANCE-CONTEXT.md) | backend/frontend/security | ERPSEP-02, MODULE-PACKAGES | hitelesített runtime composition context |
| E3 | [`ERPSEP-07`](ERPSEP-07-EXTENSION-PACK-CONTRACT.md) | architect/designer | ERPSEP-02, ERPSEP-03 | brand/terminology/template/policy/adapter pack |
| E3 | [`ERPSEP-08`](ERPSEP-08-MAINTENANCE-BUNDLE-PILOT.md) | backend/frontend/infra | ERPSEP-05, ERPSEP-06, ERPSEP-07 | első frontend+backend module bundle |
| E4 | [`ERPSEP-09`](ERPSEP-09-COMPOSER-CONFORMANCE.md) | infra/QA/security | ERPSEP-08 | instance.lock, install/upgrade/rollback és conformance |

## Függőségi térkép

```text
ERPSEP-01 ──┬──> ERPSEP-02 ──┬──> MODULE-PACKAGES ──┐
            │                ├──> ERPSEP-05 ────────┼──> ERPSEP-08 ──> ERPSEP-09
            │                └──> ERPSEP-06 ────────┤
            ├──> ERPSEP-03 ─────> ERPSEP-07 ────────┘
            └──> PACKAGE-BOUNDARY-PREFLIGHT (mérési kapu; ADR-független)

PROJECT-CORE-ADR ──> ERPSEP-07 production/workflow extension pontjai
STAB-RLS-PROOF  ───> ERPSEP-05 és minden backend bundle
```

## Doorstar felé publikálandó kapuk

| JoineryTech kimenet | Doorstar feloldott task |
|---|---|
| ERPSEP-02 elfogadott ModuleId/manifest | DSCONV-01 mapping véglegesítése |
| ERPSEP-03 cross-module contract | DSCONV-05 model adapter |
| MODULE-PACKAGES + ERPSEP-06 | DSCONV-06 composition app |
| ERPSEP-07 extension pack schema | DSCONV-04 instance pack |
| ERPSEP-08 bundle v1 | DSCONV-07 instance deployment |
| ERPSEP-09 conformance runner | DSCONV-08 teljes kompatibilitási gate |

Az átadás contract-verzióval, schema-hash-sel és changeloggal történik. A
Doorstar repository nem hivatkozhat JoineryTech munkafa relatív fájlútvonalára.

## Epic Definition of Done

- [ ] A hét ERP-modul faipari vagy Doorstar típust nem importál.
- [ ] Minden modulnak kanonikus ModuleId-je és publikus kontraktusa van.
- [ ] A frontend és backend csomaghatár builddel és dependency-audittal bizonyított.
- [ ] A Maintenance bundle clean install, upgrade és rollback tesztje zöld.
- [ ] Disabled/unentitled modul UI- és API-oldalon is tiltott.
- [ ] Az instance descriptor és lock ugyanazt a bundle-digest készletet oldja fel.
- [ ] Doorstar számára minden szükséges platformkontraktus publikált, de Doorstar
      specifikus kód nem került a platformmodulokba.
- [ ] Friss kontextusú reviewer/QA agent megpróbálta megcáfolni a kész állapotot.

## Párhuzamossági és stop szabályok

- `ERPSEP-01`, a Project Core audit és a Doorstar capability audit read-only
  módon párhuzamosítható.
- A portált egyszerre csak egy frontend agent mutálhatja.
- A shared hosting/RLS fákat egyszerre csak egy backend/security agent mutálhatja.
- ADR elfogadás előtt nincs csomag- vagy domainimplementáció.
- ADR elfogadás előtt megengedett a package-boundary preflight tooling, ha nem
  választ végleges ModuleId-t, package-nevet, trust rootot, entitlementet vagy
  runtime composition modellt.
- Éles deploy, registry-publikálás és migráció csak root jóváhagyással végezhető.
