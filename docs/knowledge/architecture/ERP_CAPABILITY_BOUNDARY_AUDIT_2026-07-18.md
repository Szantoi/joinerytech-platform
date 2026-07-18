# ERP / iparági domain / instance capability-boundary audit (ERPSEP-01)

> **Dátum:** 2026-07-18 (Europe/Budapest)
> **Jelleg:** bizonyíték-alapú, READ-ONLY capability/ownership audit — nem ADR, nem
> release-engedély
> **Szerep:** architect · **Epic:** EPIC-ERP-SEPARATION-2026Q3 · **Task:** ERPSEP-01
> **Vizsgált HEAD-ek:** platform `229673d` (branch `main`), portal-submodule `6a7ddfb`,
> spaceos-kernel utolsó relevánsan érintő commit `9557185` (2026-07-16, submodule pin)
> **Kötelező bemenet:**
> [`SPACEOS_MODULAR_PRODUCT_ARCHITECTURE_2026-07-18.md`](SPACEOS_MODULAR_PRODUCT_ARCHITECTURE_2026-07-18.md),
> [`ECOSYSTEM_MODULE_ARCHITECTURE.md`](ECOSYSTEM_MODULE_ARCHITECTURE.md),
> [`ARCHITECTURAL_PATTERNS_CATALOGUE.md`](ARCHITECTURAL_PATTERNS_CATALOGUE.md),
> [`WORLDS_API_CONTRACTS_2026-07-18.md`](WORLDS_API_CONTRACTS_2026-07-18.md),
> [`PROJECT_STATE_ASSESSMENT_2026-07-18.md`](PROJECT_STATE_ASSESSMENT_2026-07-18.md)

---

## 0. Kapcsolódó, párhuzamos audit — mit NEM fed le ez a dokumentum

A `PROJECT-BOUNDARY-AUDIT` (EPIC-PROJECT-CORE-2026Q3, párhuzamosan fut) a
Program→Project→Milestone→FlowEpic→Task, `StageChainTemplate` és
`B2BHandshake` modellt vizsgálja mélységben (Kernel `FlowEpic` vs
`SpaceOS.Modules.FlowManagement.FlowProject/FlowTask` vs Production
`ProductionJob`/`WorkflowStep` vs Doorstar `Project/Epic/Task`). Ez a dokumentum
ezt a réteget **nem dönti el** — minden idevágó pontot `decision_required`-ként
jelöl és a másik audit outputjára mutat. Ami itt önálló, bizonyított hozzájárulás:
a canonical CRM modul **nem tartalmazza** a B2B-delegáció eseményét (lásd
7.5. pont) — ez konkrét input a Project-Core ADR-hez.

---

## 1. Vezetői összefoglaló

A célarchitektúra (kernel/erp/industry/instance négy réteg) irányban jó, de a
kódbázisban **három osztályba** eső bizonyíték van:

1. **Tiszta, működő elválasztás** a 7 ERP-modul és egymás között (nincs
   cross-ERP `ProjectReference`, nincs cross-modul mélyimport a portál 7+1
   modulmappájában, minden ERP-modul saját PostgreSQL schema-val rendelkezik).
2. **Valódi, bizonyított rétegzavar** két helyen:
   - a megosztott auth/tenant/RLS csomag (`SpaceOS.Modules.Hosting`) ma **csak
     az ERP-modulokba van bekötve**, az iparági (Cutting/Joinery/Inventory/
     Procurement/Production) modulokba nem — pedig a célarchitektúra ezt
     kifejezetten Kernel-felelősségnek mondja;
   - **négy orphan/duplikált backend-modulmásolat** él a repóban (CRM, HR, DMS,
     EHS), amelyek ugyanazt a DB schema-nevet használják, mint a jelenlegi
     kanonikus modul, de 2026-07-15/16 óta nincs rájuk hivatkozás sehol —
     ez pontosan az architektúra-doksi „duplikált domainmodell" kockázata,
     élesben.
3. **Nyitott, még nem eldöntött kérdés** (a Project/Workflow réteg, a
   modul-azonosító taxonómia egyesítése, a cross-module esemény-kontraktus
   csomag sorsa) — ezek `decision_required`-ként vannak jelölve, ADR-inputként.

A hét ERP-modul iparági szivárgás-vizsgálata **tiszta**: egyetlen `door`,
`station`, `doorstar`, `ajtó` vagy hasonló kifejezés sem található a CRM, HR,
QA, Maintenance, EHS, DMS, Kontrolling forráskódjában (lásd 7.6. pont
bizonyítékparancsa).

---

## 2. Módszer

- Route/package/DB/frontend leltár: `rg` a teljes `src/` fán, `.csproj`
  `ProjectReference` gráf, EF Core `HasDefaultSchema` leltár, portál
  `src/modules/*` mélyimport-ellenőrzés, `git log -1 -- <path>` minden
  jelölt modul-duplikátumra (utolsó érintő commit dátuma a „élő vs. elárvult"
  eldöntéséhez).
- **Korlát:** `spaceos-modules-abstractions`, `spaceos-modules-cabinet`,
  `spaceos-modules-contracts`, `spaceos-modules-identity`,
  `spaceos-modules-sales` git-submodule-ok, amelyek **ebben a munkafában nincsenek
  checkoutolva** (üres könyvtár, csak gitlink-bejegyzés) — tartalmuk csak a rájuk
  hivatkozó modulok `ProjectReference`/NuGet-verzióin és a
  `WORLDS_API_CONTRACTS_2026-07-18.md` bizonyítékain keresztül rekonstruálható.
  Ahol ez a korlát releváns, jelölve van.
- `doorstar-instance` (`../doorstar-instance`, testvér-repó) csak felületesen
  ellenőrzött: a `DSCONV-01-CAPABILITY-MAPPING.md` task **még nincs
  végrehajtva** (67 soros sablon, `Végrehajtási napló: _Az agent tölti ki._`) —
  ezért a Doorstar-specifikus részletek a
  `SPACEOS_MODULAR_PRODUCT_ARCHITECTURE_2026-07-18.md` §10 tervezett-állapot
  leírásán alapulnak, **nem** friss kódauditon. Ez explicit `decision_required`.
- Egyetlen alkalmazáskód-fájl sem módosult; a mutáció erre a dokumentumra és az
  ERPSEP-01 task-fájl saját szakaszaira korlátozódik.

---

## 3. Rétegleltár — mi hol él ma

### 3.1 Kernel/Foundation

| Csomag | Út | Felelősség | Bizonyíték |
|---|---|---|---|
| `SpaceOS.Kernel.Domain/Application/Infrastructure/Api` | `src/spaceos-kernel/` | tenant, identity, JWT, `ModuleRegistryService` (statikus, TenantType-szintű allowlist), audit, HashSink | `SpaceOS.Kernel.Domain/Services/ModuleRegistryService.cs` |
| `SpaceOS.Modules.FlowManagement` | `src/spaceos-kernel/SpaceOS.Modules.FlowManagement/` | `FlowProgram/FlowProject/FlowMilestone/FlowTask`, saját `modules` schema | `Infrastructure/ModulesDbContext.cs:42` (`HasDefaultSchema("modules")`) — **ownership PROJECT-BOUNDARY-AUDIT hatáskörében**, `decision_required` itt |
| `FlowEpic`, `B2BHandshake`, `StageChainTemplate` | `src/spaceos-kernel/SpaceOS.Kernel.Domain/Entities|ValueObjects/` | delegációs/workflow primitívek | **`decision_required`** — lásd 0. pont |
| Migration 0025 | `SpaceOS.Infrastructure/Migrations/20260408100000_Migration_0025_TenantEnabledModules.cs` | `Tenants.EnabledModules varchar[]` | önmagában nem validál — a `ModuleRegistryService` + DB trigger együtt (defense-in-depth, kód-kommentben rögzítve) |

**Megjegyzés — a Kernel statikus registry ipar-semlegessége kérdéses:** a
`ModuleRegistryService` `door/cabinet/window/cutting/spatial/trading/delivery/
installation/orders` értékeket hardcode-olja `TenantType`-onként. Ezek az
**ökoszisztéma-aktor** (Manufacturer/PanelCutter/Trader/Logistics/Installer/
EndCustomer, `ECOSYSTEM_MODULE_ARCHITECTURE.md` ADR-018/019) moduljai —
tehát a Kernelben ma egy **faipari-ökoszisztéma-specifikus** modul-lista él,
nem egy iparágsemleges. Ez nem feltétlenül hiba (a Kernel egy konfigurálható
allowlistet hostol, nem definiálja a modulok tartalmát), de a
`ERPSEP-02`-nek explicit döntenie kell: ez a lista platform-semleges
mechanizmus konfigurálható tartalommal, vagy ipari szivárgás a Kernelbe?
`decision_required`.

### 3.2 Megosztott, cross-cutting infrastruktúra-csomag

| Csomag | Út | Ki használja | Megjegyzés |
|---|---|---|---|
| `SpaceOS.Modules.Hosting` | `src/spaceos-modules-hosting/src/SpaceOS.Modules.Hosting/` (Auth, Persistence/RLS, Tenancy, Wire/`EnumWireMap`) | **kizárólag a 7 ERP-modul**: CRM, HR, EHS, Kontrolling, Maintenance, QA, DMS (`ProjectReference` bizonyíték: 2.4 pont) | Tartalma pontosan a célarchitektúra §4.1 Kernel-felelőssége (JWT, RLS, tenant, wire-enum) — **de nem a Kernel repóban él, és nem fogyasztja az iparági modul (Cutting/Joinery/Inventory/Procurement/Production)**. `decision_required` (ERPSEP-05): Kernel-tier csomaggá kell-e emelni, hogy az iparági modulok is fogyaszthassák, megszüntetve a WORLDS_API_CONTRACTS-ban dokumentált tenant/auth-inkonzisztenciákat (lásd 7.2)? |

### 3.3 Horizontális ERP capability packok (7 modul)

| Modul | Kanonikus út | DB schema | Kernel-függés | Hosting-függés |
|---|---|---|---|---|
| CRM | `src/SpaceOS.Modules.CRM/src/Lead.{Domain,Application,Infrastructure,Api}` | `crm` | igen (Kernel.Domain nincs is közvetlen `ProjectReference`-ben a Lead.* rétegekben — csak Hosting-on át) | igen (`Lead.Application/Infrastructure/Api` mind referál) |
| Kontrolling | `src/spaceos-modules/spaceos-modules-kontrolling/src/SpaceOS.Modules.Kontrolling.csproj` | `kontrolling` | igen | igen |
| HR | `src/hr/src/SpaceOS.Modules.HR.csproj` | `hr` | igen | igen |
| Maintenance | `src/maintenance/src/SpaceOS.Modules.Maintenance.csproj` | `maintenance` | igen | igen |
| QA | `src/qa/src/SpaceOS.Modules.QA.csproj` | (nincs explicit `HasDefaultSchema` a leltárban — ellenőrizendő) | igen | igen |
| EHS | `src/ehs/src/{Domain,Application,Infrastructure,Api}` | (Ehs.Domain csak Kernel.Domain-t referál; Hosting az Application/Infrastructure/Api szinten) | igen | igen |
| DMS | `src/dms/src/SpaceOS.Modules.DMS.csproj` | `dms` | igen | igen |

**Pozitív bizonyíték:** a `.csproj` gráfban **nincs egyetlen cross-ERP
`ProjectReference` sem** (CRM nem hivatkozik HR-re, QA nem Maintenance-re stb.)
— a horizontális modulok forráskód-szinten valóban izoláltak egymástól.

### 3.4 JoineryTech industry pack

| Modul | Út | DB schema | Megjegyzés |
|---|---|---|---|
| Cutting | `src/spaceos-modules-cutting/` | `spaceos_cutting` + `cutting_analytics` | Hosting-ot **nem** fogyasztja; saját JWT/tenant-kezelés modulcsoportonként eltérő claim-mel (`tid` vs `tenant_id`), `pricing-rules` csoport auth nélkül, `analytics` `tenantId` query-paramból — lásd `WORLDS_API_CONTRACTS_2026-07-18.md` §1.6 |
| Joinery | `src/spaceos-modules-joinery/` | `spaceos_joinery` | magyar domain-szótár (`gyartasilap`, `anyaglista`, `DoorType.Butorfront/Disztok/Falcos/...`) — egyértelműen iparági, nem ERP; Hosting-ot nem fogyasztja, saját `TenantSessionInterceptor` (`app.tenant_id` GUC-név, eltér a többi modul `app.current_tenant_id`-jától) |
| Inventory | `src/spaceos-modules-inventory/` | `spaceos_inventory` | saját `SpaceOS.Modules.Inventory.Contracts` (in-process, NEM wire) + külső `SpaceOS.Modules.Contracts` NuGet 1.2.0 a `ReservationDto`-hoz |
| Procurement | `src/spaceos-modules-procurement/` | `spaceos_procurement` | — |
| Production | `src/spaceos-modules-production/Production.{Domain,Application,Infrastructure,Api}` | `production` | csak `spaceos-modules-contracts`-ra hivatkozik, Hosting-ra nem; ownership `decision_required` a Project-Core audittal közösen (`ProductionJob`/`WorkflowStep`) |
| JoineryTech (legacy?) | `src/spaceos-modules-joinerytech/SpaceOS.Modules.JoineryTech.*` | saját `Migrations/` | **orphan-gyanús** — lásd 7.4 pont, saját `Tenant`/`User`/`RefreshToken` entitást hordoz, ami Kernel-felelősség lenne |
| Abstractions, Cabinet, Contracts | `src/spaceos-modules-abstractions`, `-cabinet`, `-contracts` | n/a | submodule, nincs checkoutolva ebben a munkafában — tartalom csak közvetve (más modulok referenciáin át) igazolható |
| Nesting algoritmusok | `src/spaceos-nesting-algorithms/SpaceOS.Nesting.Algorithms` | n/a | Cutting.Application/Infrastructure fogyasztja |
| Sales, Identity | `src/spaceos-modules-sales`, `src/spaceos-modules-identity` | n/a | git-submodule, checkoutolatlan; a gyökér `CLAUDE.md` szerint a sales repo GitHubon nem létezik (törött gitlink) |

### 3.5 Instance réteg (Doorstar)

`../doorstar-instance` — **külön repó, nem submodule ebben a platformban.**
Express + Prisma `production-service`, saját `Project/Epic/EpicStep/Task/
StationWorkflow/ProjectSheet` modell, `X-Role`/`X-Station` header-alapú
"auth", nincs platform JWT/tenant/RLS. A `DSCONV-01` (Doorstar oldali
capability mapping) **még nincs végrehajtva** — lásd 2. pont korlát.

### 3.6 Frontend (portál) — modulmappák

`src/joinerytech-portal/src/modules/{controlling,crm,dms,ehs,hr,maintenance,
production,qa}` — 8 mappa (a 7 ERP + `production` mint iparági/industry
világ). Ellenőrzés: **nincs mélyimport** egyik modulmappából a másikba
(`rg -n "from ['\"](\.\./)+modules/(...)" modules/<m>` minden `<m>`-re üres
találat) — a célarchitektúra 5.3 tiltáslistájának ez a pontja **ma teljesül**.

`src/joinerytech-portal/src/auth/AuthContext.tsx`:
- 42-47. sor: `enabled_modules` JWT-claim kiolvasása;
- **86. sor:** a mock/dev útvonalon `enabledModules: ['crm','kontrolling','hr',
  'maintenance','qa','ehs','dms']` **hardcode-olva van** — tehát az
  entitlement-alapú megjelenítés (MODARCH-04 tárgya) ma nem érvényesül
  ténylegesen, csak a claim-parse logika létezik. Ez már ismert gap
  (SPACEOS_MODULAR_PRODUCT_ARCHITECTURE §3.4) — itt csak a pontos sorhivatkozás
  az új bizonyíték.

---

## 4. Capability/ownership mátrix

Jelmagyarázat a döntés-oszlopban: `reuse` = megvan, jó helyen; `adapt` = megvan,
de a szerződést módosítani kell; `extract` = ki kell emelni a mai
csomagból/helyről; `retire` = törlésre jelölt, élő hivatkozás nélküli kód;
`decision_required` = ADR-t igényel a leválasztás előtt.

| # | Capability | Réteg | Source of truth (kanonikus út) | Consumer(ek) | Contract | Tenant-határ | Döntés |
|---|---|---|---|---|---|---|---|
| 1 | Tenant/identity/JWT | kernel | `src/spaceos-kernel/SpaceOS.Kernel.Domain` + `SpaceOS.Infrastructure` | minden modul (JWT claim) | Kernel Auth API | platform-szintű | `reuse` |
| 2 | Modul-allowlist (statikus) | kernel | `ModuleRegistryService.cs` | Kernel API + DB trigger | belső | tenant-type-szintű | `decision_required` (ipar-semlegesség tisztázandó — 3.1) |
| 3 | RLS/tenant-session/wire-enum | kernel-jellegű, ma külön csomag | `src/spaceos-modules-hosting/src/SpaceOS.Modules.Hosting` | csak a 7 ERP-modul | belső NuGet-szerű ProjectReference | modulonként egyeztetett | `decision_required` (ERPSEP-05: Kernel-tier emelés) |
| 4 | Program/Project/Milestone/FlowEpic/B2BHandshake/StageChain | kernel vagy erp (nyitott) | Kernel `FlowManagement` + `FlowEpic`/`B2BHandshake` + Production `ProductionJob` + Doorstar `Project/Epic/Task` (4 párhuzamos modell) | portál `ProjectsPage.tsx` (ma statikus adat) | nincs egységes | nyitott | `decision_required` — **PROJECT-BOUNDARY-AUDIT hatásköre** |
| 5 | CRM: Lead/Opportunity/pipeline | erp | `src/SpaceOS.Modules.CRM/src/Lead.*` | portál `modules/crm` | OpenAPI (Lead.Api) | `crm` schema, RLS | `reuse` |
| 5b | CRM: B2B delegáció (`OpportunityDelegatedToPartnerEvent`) | erp/kernel határ | **csak** `src/spaceos-modules/spaceos-modules-crm` (orphan) — a kanonikus CRM-ben **nincs ilyen esemény** | — (nincs élő consumer) | — | — | `decision_required` — capability hiányzik a kanonikus CRM-ből, vagy a duplikátumból kell portolni (lásd 7.5) |
| 6 | Kontrolling: cost/EAC/variance + `IProjectPortfolioSource` | erp | `src/spaceos-modules/spaceos-modules-kontrolling/src/` | portál `modules/controlling` | belső port + `ConfiguredProjectPortfolioSource` adapter | `kontrolling` schema | `reuse`; a portfolio-forrás végleges Project-ownership-től függ → `decision_required` link a #4-hez |
| 7 | HR: dolgozó/kompetencia/képzés | erp | `src/hr/src/` | portál `modules/hr` | — | `hr` schema | `reuse` |
| 8 | Maintenance: asset/work order | erp | `src/maintenance/src/` | portál `modules/maintenance` | — | `maintenance` schema | `reuse` |
| 9 | QA: inspection/defect/rework | erp | `src/qa/src/` | portál `modules/qa` | — | (ellenőrizendő schema) | `reuse` |
| 10 | EHS: incident/hazard/risk/PPE | erp | `src/ehs/src/` | portál `modules/ehs` | — | Hosting-alapú, frissen migrált (`HostingTenantContextAdapter.cs`) | `reuse` |
| 11 | DMS: document/version/approval | erp | `src/dms/src/` | portál `modules/dms` | — | `dms` schema | `reuse` |
| 12 | Cutting: nesting/CNC/waste | industry | `src/spaceos-modules-cutting/` | portál `modules/production`, Inventory (offcut-integráció) | belső HTTP + domain event (`CuttingPlanFrozen`) | `spaceos_cutting`/`cutting_analytics` schema, **saját, ADR-061-hez képest lemaradó auth** | `adapt` (auth/tenant egységesítés ERPSEP-05 után) |
| 13 | Joinery: DoorOrder/gyartasilap/anyaglista | industry | `src/spaceos-modules-joinery/` | portál `modules/production` | — | `spaceos_joinery` schema, saját GUC-név (`app.tenant_id`) | `adapt` |
| 14 | Inventory: stock/offcut/reservation | industry | `src/spaceos-modules-inventory/` | Cutting, Joinery, Cabinet, FreeTier (`consumerModule` allowlist) | `SpaceOS.Modules.Contracts` NuGet 1.2.0 (`ReservationDto`) | `spaceos_inventory` | `adapt`; élő route-ütközés (`GET /api/inventory/offcuts` 500, ld. WORLDS_API_CONTRACTS §3.1) — nem ERPSEP hatáskör, csak jegyzett |
| 15 | Procurement: supplier/delivery | industry | `src/spaceos-modules-procurement/` | Inventory (`/internal/inbound`) | — | `spaceos_procurement` | `adapt` |
| 16 | Production: `ProductionJob`/`WorkflowStep` | industry/kernel határ | `src/spaceos-modules-production/` | — | `spaceos-modules-contracts` | `production` schema | `decision_required` — Project-Core audittal közös |
| 17 | JoineryTech legacy Tenant/User/Catalog | ismeretlen/orphan | `src/spaceos-modules-joinerytech/` | **nincs élő hivatkozás** (repo-wide grep üres) | — | saját Tenant/User — Kernel-felelősség duplikátuma | `retire` (lásd 7.4) |
| 18 | Doorstar workshop/station/ProjectSheet | instance | `../doorstar-instance` (külön repó) | Doorstar frontend | Prisma, nincs OpenAPI | nincs platform-RLS | `decision_required` — DSCONV-01 még nem készült el |
| 19 | Portál module-mappák (8 db, cross-import-mentes) | composition app | `src/joinerytech-portal/src/modules/*` | route/App.tsx | — | `enabledModules` claim (parse van, gate nincs) | `reuse` (parse) / `decision_required` (route-gate, MODARCH-04 hatáskör) |
| 20 | Duplikált CRM/HR/DMS/EHS modul-másolatok | orphan | `src/spaceos-modules/spaceos-modules-{crm,hr,dms}`, `src/spaceos-modules-ehs` | **nincs** | — | ütköző schema-nevek a kanonikussal | `retire` (lásd 7.1–7.3) |

---

## 5. Dependency-diagram

```text
                         ┌───────────────────────────┐
                         │   SpaceOS Kernel/Found.   │
                         │  (spaceos-kernel: tenant, │
                         │   JWT, ModuleRegistry,    │
                         │   FlowEpic/B2B — nyitott) │
                         └────────────┬──────────────┘
                                      │ ProjectReference (Kernel.Domain)
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
   ┌──────────▼─────────┐   ┌─────────▼──────────┐   ┌────────▼─────────┐
   │ SpaceOS.Modules.    │   │  7 ERP capability   │   │  JoineryTech      │
   │ Hosting (auth/RLS/  │◄──┤  pack: CRM, Kontr., │   │  industry pack:   │
   │ wire) — CSAK ERP    │   │  HR, Maint., QA,    │   │  Cutting, Joinery,│
   │ fogyasztja ma       │   │  EHS, DMS           │   │  Inventory, Procu-│
   └─────────────────────┘   └─────────┬───────────┘   │  rement, Prod.    │
                                        │ nincs cross-ERP│  (Hosting-ot NEM  │
                                        │ ProjectReference│  fogyasztja)     │
                                        │                └─────────┬─────────┘
                                        │                          │ internal HTTP +
                                        │                          │ domain event
                                        │                          │ (CuttingPlanFrozen,
                                        │                          │  reserve-panels...)
                                        ▼                          ▼
                              ┌───────────────────┐      ┌──────────────────┐
                              │ Portál (7+1 modul-│      │ Doorstar instance │
                              │ mappa, cross-import│      │ (külön repó,      │
                              │ -mentes; enabled_ │      │ Prisma, X-Role/   │
                              │ modules claim csak│      │ X-Station, nincs  │
                              │ parse-olva, nem    │      │ platform-RLS)     │
                              │ gate-elve)         │      └──────────────────┘
                              └───────────────────┘

Orphan/decision_required szigetek (nincs élő él a fenti gráfhoz):
  - src/spaceos-modules/spaceos-modules-{crm,hr,dms}  → retire
  - src/spaceos-modules-ehs (Ehs.*)                    → retire
  - src/spaceos-modules-joinerytech (Tenant/User/Cat.) → retire
  - Kernel FlowEpic/B2BHandshake vs FlowManagement vs
    Production.WorkflowStep vs Doorstar Project/Epic   → decision_required
    (PROJECT-BOUNDARY-AUDIT)
```

---

## 6. Két modulazonosító-világ megfeleltetése

| Kernel/DB statikus registry (`ModuleRegistryService.cs`, ökoszisztéma-aktor-szintű) | Portál `enabled_modules` világ (`AuthContext.tsx`, ERP-szintű) | Megfeleltetés — bizonyíték |
|---|---|---|
| `door`, `cabinet`, `window`, `cutting`, `spatial` (Manufacturer opcionális) | `production` (portál `src/modules/production`) | `production` világ = Cutting (5005) + Joinery (5002) backend, `WORLDS_API_CONTRACTS_2026-07-18.md` fejléc-táblázata szerint. `cabinet`/`window`/`spatial` Kernel-szinten **létező allowlist-tag, de nincs mögötte portál-világ és nincs futó backend** (`spaceos-modules-cabinet` submodule checkoutolatlan, `Modules.Spatial` az ECOSYSTEM-doksi szerint még tervezési fázisban, „Horizon 3"/`TBD`) |
| `trading` (Trader kötelező) | — | nincs portál-világ, nincs futó backend a repóban; `ECOSYSTEM_MODULE_ARCHITECTURE.md` §7 szerint `Modules.Trading` `struktúrában definiált, nem implementált` |
| `delivery` (Logistics kötelező, Trader opcionális) | — | ua., `Modules.Delivery` nem implementált |
| `installation` (Installer kötelező) | — | ua., `Modules.Installation` nem implementált |
| `orders` (EndCustomer kötelező) | — | ua., EndCustomer-portál `OD-04` (subpath vs külön domain) nyitott az ECOSYSTEM-doksiban |
| — | `crm`, `kontrolling`, `hr`, `maintenance`, `qa`, `ehs`, `dms` | **nincs Kernel-oldali megfelelőjük** a `ModuleRegistryService`-ben — a 7 ERP-modul ma **nincs** a Kernel `TenantType`-onkénti allowlistben regisztrálva; a portál saját, Kernel-független `enabled_modules` JWT-claimet olvas |
| — | `warehouse` (legacy világ, PROJECT_STATE_ASSESSMENT szerint 27 világ egyike) | `warehouse` = Inventory (5004) + Procurement (5006), `WORLDS_API_CONTRACTS` szerint |
| — | `sales`, `shopfloor`, `projects`, `logistics`, `mfgprep` + ~16 további legacy világ | nincs egységes Kernel-oldali azonosító; `PORTAL_WORLDS_INVENTORY_2026-07-16.md` tartja számon |

**Következtetés:** a két világ ma **diszjunkt és nincs kódszintű
megfeleltető tábla** — pontosan az architektúra-doksi §3.3-ban leírt probléma,
élő bizonyítékkal alátámasztva. A 7 ERP-modul egyáltalán nincs benne a Kernel
allowlistjében; a Kernel ökoszisztéma-modulnevei (trading/delivery/
installation/orders) még sehol nem materializálódtak portál-világként vagy
futó backendként. **`decision_required` — ERPSEP-02 elsődleges tárgya**:
egyetlen kanonikus `ModuleId`-tér (a célarchitektúra §6.1 `spaceos.crm`,
`joinerytech.cutting` stílusú javaslata) + migrációs alias-tábla mindkét mai
világhoz.

---

## 7. Cross-module violation lista (fájlhivatkozással)

### 7.1 Duplikált CRM-implementáció

- Kanonikus, aktívan karbantartott: `src/SpaceOS.Modules.CRM/src/Lead.{Domain,
  Application,Infrastructure,Api}` — utolsó érintő commit `fc1ed46`
  (2026-07-18, ADR-059 wire).
- Orphan: `src/spaceos-modules/spaceos-modules-crm/src/SpaceOS.Modules.CRM.csproj`
  — utolsó érintő commit `f011725` (2026-07-15). **Ugyanazt a `crm` DB
  schema-nevet deklarálja** (`src/spaceos-modules/spaceos-modules-crm/src/
  Infrastructure/Persistence/CrmDbContext.cs:28`). Nincs élő hivatkozás rá
  (nincs `.sln`, nincs docs-referencia az EPICS.yaml-en és az ADR-IMPL-doksikon
  kívül, amelyek historikusak).
- **Kockázat:** ha valaha mindkettő ugyanazon DB-hez futna migrációt, a `crm`
  schema két, egymástól független migrációs history-t kapna.
- **Döntés:** `retire` a duplikátumra, miután megerősítve, hogy semmilyen
  élesítendő capability (l. 7.5) nem vész el vele.

### 7.2 Duplikált HR-implementáció

- Kanonikus: `src/hr/src/SpaceOS.Modules.HR.csproj` (`fc1ed46`, 2026-07-18),
  schema `hr` (`src/hr/src/Infrastructure/Persistence/HRDbContext.cs:42`).
- Orphan: `src/spaceos-modules/spaceos-modules-hr/src/SpaceOS.Modules.HR.csproj`
  (`f011725`, 2026-07-15), **ugyanaz a `hr` schema**
  (`src/spaceos-modules/spaceos-modules-hr/src/Infrastructure/Data/
  HrDbContext.cs:28`). `retire`-jelölt.

### 7.3 Duplikált DMS-implementáció

- Kanonikus: `src/dms/src/SpaceOS.Modules.DMS.csproj` (`fc1ed46`), schema `dms`
  (`src/dms/src/Infrastructure/Persistence/DMSDbContext.cs:58`).
- Orphan: `src/spaceos-modules/spaceos-modules-dms/src/SpaceOS.Modules.DMS.csproj`
  (`f011725`). `retire`-jelölt.

### 7.4 Duplikált EHS-implementáció + Kernel-felelősség duplikálása

- Kanonikus: `src/ehs/src/{Domain,Application,Infrastructure,Api}` (`fc1ed46`,
  frissen migrálva a Hosting-csomagra: `HttpTenantContext.cs` törölve,
  `HostingTenantContextAdapter.cs` az új adapter,
  `src/ehs/src/Infrastructure/Data/HostingTenantContextAdapter.cs`).
- Orphan: `src/spaceos-modules-ehs/Ehs.{Api,Application,Domain,Infrastructure}`
  (`4a58e48`, 2026-07-18 — **ez a legfrissebb az orphanok közül**, de a
  napi ADR-059 wire-commit már nem érinti). Más elnevezési konvenció
  (`Ehs.*` vs `SpaceOS.Modules.Ehs.*`) — erős jel, hogy ez egy korábbi
  scaffold-generáció, amit a mai `src/ehs` váltott le. `retire`-jelölt, de
  **elsőként ellenőrizendő**, hogy a `docs/tasks/EPIC-UI-PORTAL-2026Q3/
  archive/ADR-IMPL-HOSTING.md:58` által javított
  `src/spaceos-modules-ehs/Ehs.Api/appsettings.json` Authority-drift fix
  ténylegesen átkerült-e a kanonikus `src/ehs` appsettings-be (ez már
  read-write task, itt csak jelzés).

### 7.5 Hiányzó capability a kanonikus CRM-ben — B2B delegáció

- `OpportunityDelegatedToPartnerEvent` **kizárólag**
  `src/spaceos-modules/spaceos-modules-crm/src/Domain/Events/
  OpportunityDelegatedToPartnerEvent.cs`-ben létezik (az orphan CRM-ben).
- A kanonikus `src/SpaceOS.Modules.CRM/src/Lead.Domain/Events/
  OpportunityEvents.cs` 13 eseményt definiál (Created, NeedsAssessment,
  SolutionAssembly, ProposalSent, Negotiation, Won, Lost, Abandoned,
  EstimateUpdated, Reassigned, ActivityLogged, TaskCreated, TaskCompleted)
  — **egyik sem delegáció/B2B-jellegű**.
- **Következtetés:** a `PROJECT-BOUNDARY-AUDIT` kötelező forrásai közt
  szereplő `OpportunityDelegatedToPartnerEvent` (ld. `PROJECT-BOUNDARY-AUDIT.md`
  29. sor) ma **csak elárvult kódban** létezik. Ha ez a capability a
  Project-Core ADR szerint megmarad, portolni kell a kanonikus CRM-be (vagy a
  Kernel `B2BHandshake` váltja ki) — ez nem automatikus „van már" állítás.
  `decision_required`, átadva a Project-Core audit szerzőjének.

### 7.6 Iparági/instance szivárgás-ellenőrzés a 7 ERP-modulban — TISZTA

Bizonyítékparancs (lefuttatva, nulla találat):

```powershell
rg -in "doorstar|station|ajt[óo]|cabinet_id|door_id" `
  src/ehs/src src/hr/src src/qa/src src/maintenance/src src/dms/src `
  "src/SpaceOS.Modules.CRM/src" "src/spaceos-modules/spaceos-modules-kontrolling/src" `
  -g "*.cs"
```

Nulla találat — a 7 ERP-modul forráskódja nem tartalmaz iparági vagy
instance-specifikus terminológiát. Ez pozitív bizonyíték amellett, hogy a
horizontális/iparági szétválasztás **forráskód-szinten már ma is jórészt
érvényesül**, csak az infrastruktúra-réteg (Hosting) és a modul-katalógus
egységesítése hiányzik.

### 7.7 Hosting-csomag aszimmetrikus adoptciója (ismételt jegyzés, konkrét fájlokkal)

`SpaceOS.Modules.Hosting`-ra ProjectReference-szel hivatkozó modulok:
`src/SpaceOS.Modules.CRM/src/Lead.{Application,Infrastructure}`, `src/hr/src/
SpaceOS.Modules.HR.csproj`, `src/maintenance/src/SpaceOS.Modules.Maintenance.
csproj`, `src/qa/src/SpaceOS.Modules.QA.csproj`, `src/ehs/src/{Application,
Infrastructure}`, `src/dms/src/SpaceOS.Modules.DMS.csproj`,
`src/spaceos-modules/spaceos-modules-kontrolling/src/SpaceOS.Modules.
Kontrolling.csproj`. **Egyik iparági modul (`spaceos-modules-cutting`,
`-joinery`, `-inventory`, `-procurement`, `-production`) `.csproj`-ja sem
hivatkozik rá.** Ez a forrása a `WORLDS_API_CONTRACTS_2026-07-18.md`-ban
dokumentált inkonzisztenciáknak (claim-név drift `tid`/`tenant_id`, GUC-név
drift `app.tenant_id`/`app.current_tenant_id`, védtelen `pricing-rules`
csoport, `analytics` tenantId query-paramból). `decision_required` —
ERPSEP-05 elsődleges döntési pontja.

### 7.8 `SpaceOS.Modules.Contracts` inkonzisztens adopció

A célarchitektúra (5.3) a „contract NuGet/npm package, csak DTO és esemény"
mintát írja elő cross-module kapcsolatra. A repóban létező
`spaceos-modules-contracts` csomagot **csak** a Production-modul
(`Production.Domain/Application` `ProjectReference`) és a két **orphan**
modul (spaceos-modules-crm, spaceos-modules-dms) referálja közvetlenül
`ProjectReference`-ként; a kanonikus CRM/DMS/HR/EHS/QA/Maintenance/
Kontrolling egyike sem. A wire-szintű tényleges használat, amit találtunk:
Inventory `ReservationDto` egy **külső NuGet-verzióként** (`SpaceOS.Modules.
Contracts 1.2.0`) fogyasztja. Nincs bizonyíték arra, hogy ez ma a 7 ERP-modul
közötti tényleges cross-module kontraktus-mechanizmus lenne. `decision_required`
— ERPSEP-03 tárgya: ez a csomag legyen-e az egységes ERP-cross-module esemény/
DTO-kontraktus, vagy külön kell tervezni.

### 7.9 Orphan „JoineryTech" modul Kernel-felelősség-duplikátummal

`src/spaceos-modules-joinerytech/SpaceOS.Modules.JoineryTech.Domain/Entities/`
tartalma: `CatalogCategory.cs`, `CatalogItem.cs`, `RefreshToken.cs`,
`Tenant.cs`, `User.cs`. Utolsó érintő commit `f011725` (2026-07-15); **nincs
élő hivatkozás rá** sem a docs, sem az EPICS.yaml, sem a Kernel, sem az
orchestrator oldaláról (repo-wide grep nulla találat). Saját `Tenant`/`User`/
`RefreshToken` entitása pontosan az a felelősség, amit a célarchitektúra
kizárólagosan a Kernelnek szán (§4.1) — ha ez a modul valaha élesedne, azonnali
duplikált identity-modellt hozna létre. `retire`-jelölt, ellenőrizendő, hogy
a `CatalogCategory`/`CatalogItem` (termékkatalógus) fogalom nem hiányzik-e
valahol máshol élőben (pl. Joinery/Abstractions) — ha igen, az extrahálandó
capability, nem a teljes modul.

---

## 8. Klasszikus ERP vs. faipari domain határ — bizonyított állapot

| Jellemző | Klasszikus ERP-oldal (bizonyíték) | Faipari/iparági oldal (bizonyíték) |
|---|---|---|
| Terminológia | angol domain-nevek (Lead, Opportunity, WorkOrder, Incident, Inspection) | magyar szakszavak wire- és domain-szinten is: `gyartasilap`, `anyaglista`, `DoorType.Butorfront/Disztok/Falcos/Sikban/...`, `OpeningDirection.Left/Right/...` (`WORLDS_API_CONTRACTS §2.3-2.4`) |
| DB schema-elnevezés | angol, modulnév szerinti (`crm`, `hr`, `maintenance`, `dms`) | `spaceos_cutting`, `spaceos_joinery`, `spaceos_inventory`, `spaceos_procurement`, `production` — más névkonvenció (`spaceos_` prefix), jelezve, hogy ezek egy másik generációban/csapat-konvencióval készültek |
| Hosting/RLS-csomag | mind a 7 modul fogyasztja | egyik iparági modul sem fogyasztja (7.7) |
| Tenant-forrás | egységesen JWT-claim a Hosting-on át | modulonként eltér (Cutting: `tid`/`tenant_id`/szubdomén/query-param mix; Joinery: `tenant_id` + saját GUC-név) |
| Cross-modul integráció mintája | nincs cross-ERP hívás (0 találat) | valódi domain-event + internal HTTP minta már működik: `CuttingPlanFrozen` → Inventory offcut-regisztráció, `reserve-panels` → Inventory reservation, `consumerModule` allowlist (`Cutting, Joinery, Cabinet, FreeTier`) — ez a célarchitektúra 5.3 "integration event + outbox/inbox" mintájának **élő, jó példája** az iparági rétegben |
| Ökoszisztéma-aktor modell | nem releváns (ERP-modulok tenant-agnosztikusak az iparra nézve) | `ECOSYSTEM_MODULE_ARCHITECTURE.md` szerint Manufacturer/PanelCutter/Trader/Logistics/Installer/EndCustomer — ma csak Manufacturer-ág van ténylegesen megvalósítva (Cutting/Joinery/Inventory/Procurement fut), a többi aktortípus modulja (Trading/Delivery/Installation) **nincs implementálva** |

**Összegzés:** a klasszikus ERP/faipari határ **forráskód-szinten valós és
nagyrészt tiszta** — a 7 ERP-modul nem tartalmaz faipari fogalmat, az iparági
modulok pedig nem tartalmaznak ERP-üzleti logikát. A fő kockázat nem
keveredés, hanem **inkonzisztens platform-szolgáltatás-adopció** (Hosting,
Contracts) az iparági oldalon, ami később megnehezíti az egységes
Module Bundle csomagolást (ERPSEP-05/08).

---

## 9. Doorstarból platformra emelhető és instance-ban maradó capability-k

> **Fontos korlát:** ez a szakasz **nem önálló kódaudit eredménye** — a
> `DSCONV-01` (Doorstar-oldali kötelező input) még nincs végrehajtva (2. pont).
> Az alábbi táblázat a `SPACEOS_MODULAR_PRODUCT_ARCHITECTURE_2026-07-18.md`
> §10.1/10.2 tervezett célállapotát ismétli meg, **`decision_required`**
> jelöléssel — DSCONV-01 lezárása előtt ADR-alapként ne kezeljük véglegesnek.

| Doorstar-elem | Javasolt célsors | Indoklás |
|---|---|---|
| üzemi tábla UX, station-alapú munkaszervezés, kapacitás/Kanban nézetek | **instance-ban marad** | Doorstar-specifikus UX, nem általános ERP vagy iparági invariáns |
| hatlépcsős folyamat (fix Stage enum) | **decision_required**: instance-template vagy valódi iparági/kernel workflow-invariáns | a Kernel StageChain már tenant-konfigurálható lépéssort ad — ha a hatlépcsős folyamat csak Doorstar sajátja, instance-template; ha minden faipari gyártó ugyanezt használná, iparági/kernel primitívnek minősülhet — **ezt csak PROJECT-BOUNDARY-AUDIT + DSCONV-01 döntheti el** |
| `X-Role`/`X-Station` header-alapú "auth" | **retire, JWT+permission+policy váltja** | nem platform-kompatibilis, biztonsági gap |
| önálló Prisma `Project/Epic/EpicStep/Task` modell | **decision_required** | ütközik a Kernel `FlowEpic` és `FlowManagement` modellel — negyedik párhuzamos modell (0. pont); a Project-Core ADR-nek kell eldöntenie, hogy adapter vagy migráció a cél |
| `ProjectSheet.data` frontend-owned JSON | **adapt: verziózott schema + backend-validáció** | célarchitektúra 10.2 táblázata explicit ezt írja elő |
| Doorstar brand, logó, betűk, UI-hang | **instance-ban marad** | brand extension point (célarchitektúra §9.1) |
| import/export adapterek külső rendszerekhez | **instance-ban marad** | adapter extension point |
| Cutting/Joinery domain-fogalmak, ha a Doorstar ezeket valóban a JoineryTech industry pack szemantikájával egyezően használja | **platformra emelhető (industry pack fogyasztás)** | a `SPACEOS_MODULAR_PRODUCT_ARCHITECTURE.md` §3.1 szerint a domain szókészlet már igazodik — de ez **nincs kódszinten bizonyítva** ebben az auditban (Doorstar repo csak felületesen ellenőrzött) |

---

## 10. Döntést igénylő pontok — összegzés és javasolt sorrend

1. **ERPSEP-02 (Modul-katalógus ADR) — első.** Egyesíteni kell a Kernel
   ökoszisztéma-regisztert (door/cabinet/.../orders) és a portál
   `enabled_modules` ERP-világot (crm/.../dms) egyetlen kanonikus
   `ModuleId`-térbe, alias-táblával. Enélkül az ERPSEP-05/06/08 csak
   ideiglenes névkonvenciót kapna. **Bizonyíték:** 6. pont — a két világ ma
   diszjunkt, kódszintű megfeleltetés nélkül.
2. **ERPSEP-05 (Backend packaging) — a Hosting-csomag kérdésével együtt.**
   El kell dönteni: a `SpaceOS.Modules.Hosting` Kernel-tier csomaggá válik-e,
   amit az iparági modulok is kötelesek fogyasztani, vagy marad ERP-only
   konvenció, és az iparági modulok saját, de egységesített auth-mintát
   kapnak. **Bizonyíték:** 3.2, 7.7.
3. **ERPSEP-03 (Cross-module kontraktus ADR) — párhuzamosan.** A
   `SpaceOS.Modules.Contracts` csomag szerepének tisztázása: egységes
   ERP-cross-module esemény/DTO-mechanizmus legyen, vagy csak iparági belső
   integrációs csomag marad. **Bizonyíték:** 7.8.
4. **Repo-hygiénia (nem ERPSEP-tétel, de blokkoló a tiszta ownership-hez):**
   a négy orphan modul-duplikátum (7.1–7.4, 7.9) törlésre jelölése —
   ez egy külön, kis kockázatú, tisztán mutáló task, amit egy soron
   következő (nem read-only) taskban célszerű végrehajtani, miután
   megerősítést nyert, hogy semmilyen élő build/CI rájuk nem hivatkozik.
5. **PROJECT-BOUNDARY-AUDIT eredményére várva:** a Project/FlowEpic/
   Production/Doorstar workflow-modellek ownership-je (0. pont, 4. sor a
   mátrixban, 9. pont) — ez blokkolja az ERPSEP-07 (extension pack) taskot
   is, mert az függ a `PROJECT-CORE-ADR`-től.
6. **DSCONV-01 (Doorstar-oldali kötelező input) végrehajtása** — enélkül a
   9. pont csak tervezett célállapot, nem bizonyított leltár. Javasolt, hogy
   ez Result feature-ként fusson a Project-Core és ERPSEP munkafolyamokkal
   párhuzamosan, mielőtt az ERPSEP-07/08/09 véglegesítené az instance-pack
   szerződést.

### Nem eldöntött, de itt jegyzett kisebb pontok

- QA modul DB schema-neve nem került elő az `HasDefaultSchema` grep-ben —
  ellenőrizendő, hogy tényleg `qa`-e vagy más konvenciót követ (nem
  blokkolja az ERPSEP-01 elfogadását, de érdemes egy gyors utó-ellenőrzés
  a következő taskban).
- A `spaceos-modules-abstractions`, `-cabinet`, `-contracts`, `-identity`,
  `-sales` submodule-ok tartalma ebben a munkafában nem volt checkoutolva —
  az ERPSEP-02/05 szerzőjének külön be kell húznia ezeket a repókat a teljes
  képhez.

---

## 11. Memento

### Rögzített felismerések

- A 7 ERP-modul egymástól és az iparági/instance rétegtől forráskód-szinten
  **ma is tiszta** (nincs cross-ERP `ProjectReference`, nincs iparági
  terminológia-szivárgás, nincs portál-oldali cross-module mélyimport).
- A fő kockázat nem keveredés, hanem **inkonzisztens platform-szolgáltatás-
  adopció** (Hosting-csomag csak ERP-oldalon) és **négy orphan
  modul-duplikátum**, amelyek ugyanazt a DB schema-nevet viselik, mint az
  élő kanonikus modul.
- A Kernel modul-allowlistje és a portál `enabled_modules` világa ma
  **diszjunkt, kódszintű megfeleltetés nélkül** — ez az ERPSEP-02 fő tárgya.
- A CRM B2B-delegációs esemény ma **csak az orphan kódban** létezik — konkrét,
  új input a PROJECT-BOUNDARY-AUDIT/PROJECT-CORE-ADR számára.
- A Doorstar-specifikus szakasz (9. pont) tervezett célállapot, nem friss
  kódaudit — a DSCONV-01 végrehajtása előtt nem tekintendő véglegesnek.

### Következő átadási pont

ERPSEP-02 és ERPSEP-03 ebből az auditból további repo-felmérés nélkül
elindítható a 4., 6., 7. és 10. pontok alapján. ERPSEP-05 az orphan Hosting-
adopciós kérdést (7.7) és a duplikátum-listát (7.1–7.4, 7.9) kapja induló
inputként. A Project/Workflow-réteg (0. pont, 9. pont) lezárása a
PROJECT-BOUNDARY-AUDIT/PROJECT-CORE-ADR feladata — onnan várjuk a
visszacsatolást ERPSEP-07 indítása előtt.
