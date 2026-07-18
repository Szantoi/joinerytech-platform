# ERPSEP-01 — ERP, iparági domain és instance capability-boundary audit

- **Epic:** EPIC-ERP-SEPARATION-2026Q3
- **Szerep:** architect
- **Prioritás:** P0
- **Státusz:** pending
- **Függőség:** nincs
- **Mutációs határ:** új auditdokumentum és ez a task; minden alkalmazáskód read-only
- **Tiltott scope:** refaktor, package move, migráció, endpoint vagy új aggregate

## Cél és üzleti eredmény

Bizonyíték-alapú ownership-térkép készül arról, hogy mely capability a SpaceOS
Kernel, a horizontális ERP, a JoineryTech industry pack vagy egy instance
tulajdona. Ez akadályozza meg, hogy a „leválasztás” újabb közös monolittá vagy
duplikált domainmodellé váljon.

## Kötelező források

- `docs/knowledge/architecture/SPACEOS_MODULAR_PRODUCT_ARCHITECTURE_2026-07-18.md`
- `docs/knowledge/architecture/ECOSYSTEM_MODULE_ARCHITECTURE.md`
- `docs/knowledge/architecture/ARCHITECTURAL_PATTERNS_CATALOGUE.md`
- `src/spaceos-kernel/`, a hét ERP backend és a portal modulmappái
- `src/spaceos-modules-production/`, cutting/joinery/inventory/procurement
- `EPICS.yaml` és `docs/tasks/EPIC-PROJECT-CORE-2026Q3/`
- Doorstar átadási input: `DSCONV-01` audit, ha már elérhető

## Megvalósítási lépések

1. Készíts route, package/project-reference, DB-schema és frontend-import leltárt.
2. Minden capability-t sorolj `kernel`, `erp`, `industry`, `instance` rétegbe.
3. Jelöld a közvetlen cross-module DB/FK/import és megosztott domainfüggőségeket.
4. Minden fogalomhoz adj `source_of_truth`, consumer, contract és tenant-határt.
5. Készíts `reuse`, `adapt`, `extract`, `retire`, `decision_required` döntést.
6. Add át a bizonyított gap-listát ERPSEP-02 és ERPSEP-03 szerzőinek.

## Kötelező kimenet

`docs/knowledge/architecture/ERP_CAPABILITY_BOUNDARY_AUDIT_2026-07-18.md`, benne:

- capability/ownership mátrix;
- dependency-diagram;
- két modulazonosító-világ megfeleltetése;
- cross-module violation lista fájlhivatkozással;
- klasszikus ERP vs faipari domain határ;
- Doorstarból platformra emelhető és instance-ban maradó capability-k;
- döntést igénylő pontok és ajánlott sorrend.

## Teszt- és bizonyítékterv

```powershell
rg -n "ProjectReference|PackageReference" src -g "*.csproj"
rg -n "modules/(crm|controlling|hr|maintenance|qa|ehs|dms)" src/joinerytech-portal/src
rg -n "Doorstar|WorkflowStepName|StageChain" src docs/knowledge -g "*.cs" -g "*.md"
```

## Elfogadási kritériumok

- [ ] Minden fő capability-nek pontosan egy source of truthja van, vagy
      `decision_required` jelölést kapott.
- [ ] Az audit lefedi a backend, frontend, API, DB, teszt és deploy réteget.
- [ ] Nincs „hiányzik” állítás mindkét meglévő projekt/workflow modell vizsgálata nélkül.
- [ ] Doorstar specifikus elem nem kerül általános ERP-listába.
- [ ] ERPSEP-02/03 az auditból további repo-felmérés nélkül elindítható.

## Stop / eszkaláció

Ha az ownership dokumentum és futó kód között eltér, a kódot tekintsd
bizonyítéknak, az eltérést rögzítsd; ne javítsd ebben a taskban.

## Végrehajtási napló

_Az agent tölti ki._

## Átadási bizonyíték

_Vizsgált HEAD-ek, keresési parancsok, output-link és nyitott döntések._

