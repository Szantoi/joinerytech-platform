# ERPSEP-08 — Maintenance frontend+backend Module Bundle pilot

- **Epic:** EPIC-ERP-SEPARATION-2026Q3
- **Szerep:** backend/frontend/infra/QA
- **Prioritás:** P1
- **Státusz:** blocked
- **Függőség:** ERPSEP-05, ERPSEP-06, ERPSEP-07
- **Mutációs határ:** Maintenance package, bundle build tooling és teszt fixture
- **Tiltott scope:** Maintenance domain redesign, Doorstar, éles deploy,
  runtime Module Federation

## Cél és üzleti eredmény

Egy horizontális ERP-modul bizonyítsa, hogy frontendje, backendje, kontraktusa,
migrációja, permissionje és konfigurációja egyetlen verziózott, aláírt release-
egységként telepíthető, frissíthető és visszagörgethető.

## Kötelező bundle-tartalom

- `module.yaml`;
- backend image/package reference és SBOM;
- verziózott frontend asset + integrity manifest;
- OpenAPI és event schema;
- PostgreSQL migráció;
- config schema/default;
- permission manifest;
- health/readiness probe;
- signature és changelog.

## Megvalósítási lépések

1. Rögzítsd a Maintenance build/test/migration baseline-t.
2. Készíts determinisztikus bundle-build scriptet.
3. Telepíts clean fixture instance-ba.
4. Teszteld enabled/disabled és tenant isolation állapotban.
5. Készíts kompatibilis upgrade-et és szándékosan hibás upgrade-et.
6. Bizonyítsd a rollbacket DB/API/UI smoke-kal.

## Teszt- és bizonyítékterv

```powershell
dotnet test src/maintenance/tests/SpaceOS.Modules.Maintenance.Tests.csproj
cd src/joinerytech-portal
npm test
npm run build
```

Ehhez jár bundle install/upgrade/rollback integrációs suite és digest/SBOM
ellenőrzés.

## Elfogadási kritériumok

- [ ] Clean install után UI, API, migration és health zöld.
- [ ] Frontend és backend ugyanazt a ModuleId/verziót jelenti.
- [ ] Inkompatibilis vagy sérült bundle nem aktiválható.
- [ ] Disabled modul közvetlen API-hívása tiltott.
- [ ] Hibás upgrade után bizonyított rollback van.
- [ ] Ugyanabból az inputból byte/digest szinten reprodukálható output készül,
      vagy a nem determinisztikus mezők dokumentáltak.

## Stop / eszkaláció

Éles registry push vagy VPS deploy csak root jóváhagyással. Adatvesztő rollback
nélkül a pilot nem minősíthető késznek.

## Végrehajtási napló

_Az agent tölti ki._

## Átadási bizonyíték

_Bundle digest, SBOM, install/upgrade/rollback log és QA verdict._

