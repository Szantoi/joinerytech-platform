# ERPSEP-01 — ERP, iparági domain és instance capability-boundary audit

- **Epic:** EPIC-ERP-SEPARATION-2026Q3
- **Szerep:** architect
- **Prioritás:** P0
- **Státusz:** ✅ done (2026-07-18, root-ellenőrzéssel)
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

- Elolvasva a kötelező bemenetek: `SPACEOS_MODULAR_PRODUCT_ARCHITECTURE_2026-07-18.md`,
  `ECOSYSTEM_MODULE_ARCHITECTURE.md`, `ARCHITECTURAL_PATTERNS_CATALOGUE.md`,
  `WORLDS_API_CONTRACTS_2026-07-18.md`, `PROJECT_STATE_ASSESSMENT_2026-07-18.md`,
  `EPICS.yaml` (EPIC-ERP-SEPARATION-2026Q3 + EPIC-PROJECT-CORE-2026Q3 bejegyzések),
  `PROJECT-BOUNDARY-AUDIT.md` (a párhuzamos task hatáskörének elhatárolásához).
- Leltár: teljes `.csproj` `ProjectReference` gráf (`rg -n "ProjectReference" src
  -g "*.csproj"`, ~170 találat), EF Core `HasDefaultSchema` leltár minden
  DbContext-ben, portál `src/modules/*` cross-import ellenőrzés (nulla találat),
  Kernel `ModuleRegistryService.cs` statikus allowlist, portál
  `AuthContext.tsx` `enabled_modules` claim-kezelés.
- `git log -1 -- <path>` minden gyanús duplikátum-jelöltre (crm/hr/dms/ehs/
  joinerytech) — ez tárta fel a 4+1 orphan modul-másolatot (7.1–7.4, 7.9. pont).
- Iparági/instance szivárgás-ellenőrzés a 7 ERP-modulban (`rg -in
  "doorstar|station|ajt[óo]|cabinet_id|door_id" ...`) — nulla találat.
- `doorstar-instance/docs/projects/doorstar-spaceos-convergence/
  DSCONV-01-CAPABILITY-MAPPING.md` ellenőrizve: még sablon-állapotban (67 sor,
  „Az agent tölti ki" a napló-szakaszban) — a Doorstar-szakasz ezért tervezett
  célállapotként, `decision_required` jelöléssel került be, nem friss auditként.
- Kimenet megírva: `docs/knowledge/architecture/ERP_CAPABILITY_BOUNDARY_AUDIT_2026-07-18.md`.
- Alkalmazáskód, `EPICS.yaml` és más task-fájl nem módosult; kizárólag ez a
  task-fájl (saját szakaszai) és a fenti kimeneti dokumentum keletkezett/módosult.

## Átadási bizonyíték

- **Vizsgált HEAD-ek:** platform `229673d10aa5c595d583edb40356c687da4c94a5`
  (branch `main`), portal submodule `6a7ddfb31c317a6ca87e725967cb66b757f8d0b9`,
  spaceos-kernel utolsó relevánsan érintő commit `9557185` (2026-07-16,
  submodule pin a platform repóban).
- **Kulcsparancsok** (a task bizonyítéktervéből, lefuttatva):
  - `rg -n "ProjectReference" src -g "*.csproj"` — teljes cross-projekt gráf.
  - `rg -n "modules/(crm|controlling|hr|maintenance|qa|ehs|dms)" ...` helyett a
    portál tényleges mappastruktúráján (`src/joinerytech-portal/src/modules/*`)
    végzett cross-import ellenőrzés — 0 találat mélyimportra.
  - `rg -in "doorstar|station|ajt[óo]|cabinet_id|door_id" src/ehs/src src/hr/src
    src/qa/src src/maintenance/src src/dms/src "src/SpaceOS.Modules.CRM/src"
    "src/spaceos-modules/spaceos-modules-kontrolling/src" -g "*.cs"` — 0 találat.
  - `rg -n "HasDefaultSchema" src -g "*.cs"` — schema-leltár minden modulra.
  - `git log -1 --format="%h %ad %s" --date=short -- <modul-út>` minden
    kanonikus/orphan párra.
- **Output-link:** [`ERP_CAPABILITY_BOUNDARY_AUDIT_2026-07-18.md`](../../knowledge/architecture/ERP_CAPABILITY_BOUNDARY_AUDIT_2026-07-18.md).
- **Nyitott döntések (részletesen a kimeneti dokumentum 10. pontjában):**
  ERPSEP-02 modul-katalógus (a Kernel ökoszisztéma-registry és a portál
  ERP-világ egyesítése), ERPSEP-05 Hosting-csomag kernel-tier emelése,
  ERPSEP-03 `SpaceOS.Modules.Contracts` szerepe, négy orphan modul-duplikátum
  (CRM/HR/DMS/EHS) retire-döntése + a JoineryTech legacy Tenant/User modul
  retire-döntése, CRM B2B-delegációs esemény hiánya a kanonikus modulból
  (átadva a PROJECT-BOUNDARY-AUDIT-nak), Doorstar-szakasz véglegesítése a
  DSCONV-01 lezárása után.
- **Korlátok:** `spaceos-modules-abstractions/-cabinet/-contracts/-identity/
  -sales` submodule-ok nem voltak checkoutolva ebben a munkafában; a
  Doorstar-instance repó csak felületesen (DSCONV-01 sablon-ellenőrzésig)
  lett vizsgálva.

