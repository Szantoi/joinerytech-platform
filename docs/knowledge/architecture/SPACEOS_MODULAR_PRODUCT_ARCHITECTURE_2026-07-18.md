# SpaceOS moduláris termékarchitektúra — ERP, iparági domain és instance-szétválasztás

> **Dátum:** 2026-07-18 (Europe/Budapest)  
> **Jelleg:** célarchitektúra és döntés-előkészítő fejlesztési terv  
> **Státusz:** javasolt irány; az ADR-ek elfogadása előtt nem normatív döntés  
> **Vizsgált rendszerek:** SpaceOS Kernel, JoineryTech platform, JoineryTech Portal,
> `doorstar-instance` demó  
> **Minőségi alap:** [`QUALITY.md`](../../../QUALITY.md)  
> **Kapcsolódó állapotkép:**
> [`PROJECT_STATE_ASSESSMENT_2026-07-18.md`](PROJECT_STATE_ASSESSMENT_2026-07-18.md)

---

## 1. Vezetői összefoglaló

A kívánt termékirány megvalósítható, de ehhez a SpaceOS-t nem „minden iparágat
ismerő ERP-vé”, hanem **moduláris termékcsalád-platformmá** kell tenni.

A javasolt felosztás:

1. **SpaceOS Kernel/Foundation:** iparágsemleges platformképességek;
2. **horizontális ERP capability packok:** CRM, Kontrolling, HR, Maintenance,
   QA, EHS és DMS;
3. **JoineryTech industry pack:** faipari termék- és gyártási invariánsok;
4. **instance packok:** például Doorstar arculata, műhelyfolyamata, állomásai,
   sablonjai, policy-jei és integrációs adapterei;
5. **composition app:** az adott telepítés portálhéja és modulkompozíciója.

```text
Doorstar instance pack
    │
    ├── JoineryTech industry pack
    ├── kiválasztott ERP capability packok
    └── SpaceOS-kompatibilis adapterek, brand és konfiguráció
              │
              ▼
        SpaceOS Kernel/Foundation
```

Az alapvető függőségi szabály: **a függőség csak az instance-tól a platformmag
felé mutathat**. A Kernel nem ismerheti a faipart, az általános ERP-modul nem
ismerheti az ajtó vagy egy konkrét műhely fogalmait, a JoineryTech pedig nem
ismerheti a Doorstar lokális állomáskódjait.

A frontend és backend modulonként egybecsomagolható. A helyes absztrakció egy
**SpaceOS Module Bundle**, amely egyetlen verziózott és aláírt release-egységben
tartalmazza a backend futtatási egységet, a frontend asseteket, az API- és
eseménykontraktusokat, a migrációkat, a jogosultságokat, a konfigurációs sémát és
az üzemeltetési metaadatokat.

> **Fontos különbségtétel:** a release-egység, a processzhatár és az
> adatbázishatár nem ugyanaz. Egy modul lehet önállóan verziózott bundle úgy is,
> hogy kezdetben közös moduláris monolith hostban és közös PostgreSQL instance-on
> fut.

---

## 2. Célok és nem célok

### 2.1 Célok

- A hét általános ERP-modul más iparágakban is alkalmazható legyen.
- A faipari domain ne szivárogjon a Kernelbe és a horizontális ERP-modulokba.
- Egy instance saját arculatot, terminológiát, folyamatot és integrációt kaphasson
  platformfork nélkül.
- Egy modul frontendje és backendje együtt, reprodukálhatóan telepíthető,
  frissíthető és visszagörgethető legyen.
- Az instance pontos modul- és verzióösszetétele géppel ellenőrizhető legyen.
- A Doorstar demó funkcionalitása megmaradjon, miközben fokozatosan valódi
  SpaceOS-instance-szá válik.
- Az agentek a tervből külön kutatás nélkül képesek legyenek ADR-t, csomagot,
  API-t és tesztet készíteni.

### 2.2 Nem célok

- Nem cél minden üzleti szabályt JSON-konfigurációvá alakítani.
- Nem cél azonnal minden modult külön microservice-be bontani.
- Nem cél runtime Module Federation bevezetése az első lépésben.
- Nem cél a Doorstar kódjának változtatás nélküli bemásolása a JoineryTech
  Production modulba.
- Nem cél tetszőleges, adatbázisból felvett modulkód futtatása aláírt katalógus és
  kompatibilitás-ellenőrzés nélkül.
- Nem cél egy újabb Project/Task/Workflow modell létrehozása a meglévők mellé.

---

## 3. Jelenlegi bizonyítékok és problémák

### 3.1 A Doorstar jelenleg szemantikailag igazodik, de technikailag külön rendszer

A `doorstar-instance` Production Service leírása szerint a domain szókészlet a
JoineryTech Production moduljához igazodik egy későbbi összeolvasztás érdekében.
A frontend szintén a JoineryTech Portal konvencióit tükrözi. Ugyanakkor jelenleg:

- nincs tényleges SpaceOS/JoineryTech modulcsomag-függőség;
- külön Express + Prisma backend és külön Vite + React frontend működik;
- a frontend API-típusait kézzel kell a Prisma- és route-modellekkel szinkronban
  tartani;
- nincs platformszintű JWT/tenant/RLS hosting;
- a felhasználói szerep és állomás `X-Role`/`X-Station` headerekből származik;
- a `ProjectSheet.data` JSON-alakjának tulajdonosa a frontendként van leírva.

Ez jó demó- és UX-labor, de még nem bizonyítja a moduláris telepíthetőséget vagy a
platformkompatibilitást.

### 3.2 Többszörös projekt- és workflow-modellek

Jelenleg legalább az alábbi fogalomkészletek érintik ugyanazt a területet:

- Kernel `FlowEpic`, `B2BHandshake`, `StageDefinition`, `StageChainTemplate`;
- `SpaceOS.Modules.FlowManagement` `FlowProgram`, `FlowProject`, `FlowMilestone`,
  `FlowTask` modellje;
- JoineryTech/SpaceOS Production `ProductionJob` és `WorkflowStep` modellje;
- Doorstar `Project`, `Epic`, `EpicStep`, `Task`, `StationWorkflow` modellje.

A Kernel Stage Registry már tenant-konfigurálható, rendezett és opcionális
lépéseket kezelő folyamatláncot ad. Ezzel párhuzamosan a Production aggregate
konkrét Doorstar hatlépcsős workflow-ként definiálja magát, és konstruktorban
hozza létre a fix lépéseket.

**Következmény:** Production- vagy Doorstar-migráció előtt kötelező az ownership
lezárása. A már kiadott
[`PROJECT-BOUNDARY-AUDIT`](../../tasks/EPIC-PROJECT-CORE-2026Q3/PROJECT-BOUNDARY-AUDIT.md)
feladatot ki kell terjeszteni a Production és Doorstar modellekre is.

### 3.3 Két eltérő modulazonosító-világ

A Kernel statikus registry-je jelenleg például a `door`, `cabinet`, `window`,
`cutting`, `spatial`, `trading`, `delivery`, `installation`, `orders` azonosítókat
ismeri. A modern portál és az auth-mock ezzel szemben a `crm`, `kontrolling`,
`hr`, `maintenance`, `qa`, `ehs`, `dms` modulokra épül, mellettük további legacy
világokkal.

A Kernel hardcoded registry-je tudatos defense-in-depth védelem a PostgreSQL
trigger mellett. Ezt nem szabad egy korlátlan DB-regiszterre cserélni. A
megoldás egy egységes, verziózott, aláírt modul-katalógus, amelyből a Kernel- és
DB-validáció is levezethető.

### 3.4 A frontend még statikus composition root

A frontend modulmappák első konszolidációs lépcsője elkészült. A következő,
`MODULE-PACKAGES` backlogelem már helyesen tervezi:

- `@joinerytech/ui`;
- `@joinerytech/core`;
- modulcsomagok;
- `apps/joinerytech-portal` és `apps/doorstar-portal` kompozíciós alkalmazások.

Jelenleg azonban az `App.tsx` route-jai és lazy importjai, a `mocks/worlds.ts`
világ-regisztere, a `HomeScreen` role–world mátrixa és több brandelem statikus.
Az auth-kód kiolvassa az `enabled_modules` claimet, de az nem vezérli teljes
körűen a route-, navigáció- és API-hozzáférést.

### 3.5 A branding alapja létezik, de nincs végigvezetve

A Kernel Tenant modellben van `BrandSkinId`, a portálon viszont a logó, terméknév,
világlista és más shell-elemek részben hardcodedak. A mutable instance-konfigurációt
nem célszerű kizárólag JWT-claimként továbbítani, mert a token lejártáig elavul.
Szükséges egy hitelesített Instance Context API.

### 3.6 A jelenlegi release-modell egységes deploymentre épül

Az
[`ARCHITECTURAL_PATTERNS_CATALOGUE.md`](ARCHITECTURAL_PATTERNS_CATALOGUE.md)
moduláris monolithot, közös adatbázis-instance-ot és egységes deploymentet ír le.
Ez megfelelő jelenlegi futtatási modell, de nem biztosít önmagában önálló
modulverziózást, telepítést és rollbacket.

---

## 4. Normatív rétegmodell

### 4.1 SpaceOS Kernel/Foundation

Iparágsemleges felelősségek:

- tenant és identity;
- JWT, authorization, RLS és security context;
- audit, outbox, inbox, idempotencia és observability;
- modul-katalógus, entitlement és feature flag;
- Instance Context és brand-kiválasztás;
- általános stage/workflow primitívek;
- általános projekt- és B2B-delegációs primitívek, ha az ownership-audit ezt
  igazolja;
- fájl/blob és platformszintű integrációs primitívek;
- health, readiness és compatibility protokoll.

**Tiltott függőségek:** `door`, `cabinet`, gyártógép, műhelyállomás, Doorstar,
faipari művelet vagy ügyfélspecifikus terminológia.

### 4.2 Horizontális ERP capability packok

| Modul | Saját source of truth | Tiltott domainfüggőség |
|---|---|---|
| CRM | lead, opportunity, quote, ügyfélkapcsolat | ajtógeometria, műhelyállomás |
| Kontrolling | költség, terv–tény, EAC, variance | faipari technológiai döntés |
| HR | dolgozó, kompetencia, képzés, tanúsítvány | konkrét gyártási aggregate |
| Maintenance | asset, work order, maintenance plan | Doorstar állomáskód |
| QA | inspection, checkpoint, defect, rework ticket | ajtó belső szerkezete |
| EHS | incident, hazard, risk, PPE, action | instance-workflow |
| DMS | document, version, approval, link | termék üzleti invariáns |

Az ERP-modulok csak semleges referenciákon, portokon és verziózott eseményeken
keresztül kapcsolódhatnak más bounded contextekhez.

### 4.3 JoineryTech industry pack

Faipari tulajdon:

- ajtó-, szekrény-, ablak- és más parametrikus termékmodellek;
- geometriai és gyárthatósági invariánsok;
- BOM-, cutting-, nesting- és anyagoptimalizálási szabályok;
- faipari művelettípusok és technológiai routing;
- gyártási capability-k, amelyek több faipari instance-ban azonosak;
- JoineryTech-alapértelmezett terminológia, workflow- és űrlapsablonok.

A JoineryTech pack felhasználhat horizontális ERP-modulokat azok publikus
kontraktusán keresztül, de nem módosíthatja azok belső domainmodelljét.

### 4.4 Instance pack — Doorstar

Doorstar-tulajdon:

- brand tokenek, logó, betűk és UI-hang;
- műhelyállomások és állomás–stage hozzárendelések;
- a hatlépcsős folyamat mint verziózott template;
- lokális űrlap- és ProjectSheet-sémák;
- szerepkör- és állomáspolicy-k;
- Doorstar specifikus import/export és külső rendszer adapterek;
- seed- és migrációs mappingek;
- csak valóban ügyfélspecifikus viselkedés.

Az instance pack nem tartalmazhat a platformmodulból átmásolt és lokálisan
módosított forrásfát.

### 4.5 Composition app

Az `apps/joinerytech-portal` és `apps/doorstar-portal` feladata kizárólag:

- a modulok kiválasztása;
- a platform shell elindítása;
- az instance-konfiguráció betöltése;
- route-, menü-, permission- és mock/teszt-aggregáció;
- deploykörnyezet-specifikus bootstrap.

Üzleti szabály és modulbelső komponens nem kerülhet az app composition rootba.

---

## 5. Bounded context és integrációs szabályok

### 5.1 Source-of-truth szabály

Minden fő üzleti fogalomnak pontosan egy tulajdonosa van. Más modul csak
referenciát és a saját use case-éhez szükséges snapshotot tárolhat.

Példák:

- a CRM birtokolja az opportunityt, de nem a gyártmány geometriáját;
- a Production birtokolja a végrehajtási állapotot, de nem a HR dolgozói törzset;
- a QA birtokolja az inspectiont, de a vizsgált tárgyra `SubjectRef` mutat;
- a Kontrolling birtokolja a költségprojekciót, de a projekt hierarchy
  source-of-truthját porton keresztül olvassa;
- a DMS birtokolja a dokumentumverziót, de a dokumentum üzleti tárgyát linkeli.

### 5.2 Semleges referenciák

Javasolt alapformák:

```text
SubjectRef(moduleId, aggregateType, aggregateId)
ProjectRef(projectId)
OrderRef(orderId)
WorkItemRef(moduleId, workItemType, workItemId)
AssetRef(assetId)
DocumentRef(documentId)
PartyRef(partyId)
```

A referencia nem ad felhatalmazást. Minden feloldásnál az aktív tenantot és a
felhasználó permissionjeit a célmodul ellenőrzi.

### 5.3 Modulkapcsolat

Megengedett:

- versioned OpenAPI;
- contract NuGet/npm package, kizárólag DTO-val és eseményekkel;
- integration event + outbox/inbox;
- explicit application port és adapter;
- lokális, modul tulajdonú read projection.

Tiltott:

- másik modul belső namespace-ének vagy frontend fájljának mélyimportja;
- közvetlen írás másik modul táblájába;
- bounded contextek közötti EF navigation;
- megosztott „Common.Domain” üzleti entitástemető;
- frontend által egyedül birtokolt API- vagy perzisztenciaséma;
- szöveges modulnévre épített, validálatlan dinamikus betöltés.

### 5.4 Contract-first

Az OpenAPI 3.1 specifikáció a HTTP-kontraktus source of truthja. A frontend
Orval-generált kliensből dolgozik, a backend pedig a specifikációhoz igazított
contract/compatibility tesztet futtat. Az eseménykontraktusok külön, verziózott
JSON Schema vagy AsyncAPI leírást kapnak.

Kapcsolódó minta:
[`CONTRACT_FIRST_DEVELOPMENT.md`](../patterns/CONTRACT_FIRST_DEVELOPMENT.md).

---

## 6. Modulazonosítás és életciklus

### 6.1 Egységes ModuleId

Javasolt névkonvenció:

```text
spaceos.kernel
spaceos.crm
spaceos.controlling
spaceos.hr
spaceos.maintenance
spaceos.qa
spaceos.ehs
spaceos.dms
joinerytech.door
joinerytech.cutting
joinerytech.production
doorstar.workshop
doorstar.import-adapter
```

A rövid legacy neveket migrációs alias-lista kezeli, de új kód kizárólag a
kanonikus azonosítót használja.

### 6.2 Modulállapotok

```text
known → installed → entitled → enabled → visible/usable
```

| Állapot | Jelentés | Tulajdonos |
|---|---|---|
| known | szerepel az aláírt, platform által elfogadott katalógusban | platform release |
| installed | a bundle és migrációi az instance-on rendelkezésre állnak | instance operator |
| entitled | a tenant licenc/policy alapján használhatja | entitlement service |
| enabled | a tenant bekapcsolta és konfigurálta | tenant admin |
| visible/usable | a felhasználó permissionjei is engedik | authz + célmodul |

Egy UI-csempe vagy route csak akkor jelenhet meg, ha mind az öt feltétel teljesül.
Az API-nak ettől függetlenül minden hívásnál ellenőriznie kell az entitlementet,
az enabled állapotot, a tenantot és a permissiont.

### 6.3 Defense in depth

Az aláírt modul-katalógusból build- vagy deployidőben előállítható:

- Kernel allowlist;
- PostgreSQL validációs trigger inputja;
- gateway route-lista;
- portal import map vagy statikus composition registry;
- licence/entitlement katalógus;
- conformance tesztmátrix.

Ez megőrzi a jelenlegi statikus registry biztonsági szándékát, de megszünteti a
több, egymástól eltérő kézi modul-listát.

---

## 7. SpaceOS Module Bundle

### 7.1 Kötelező tartalom

```text
spaceos.maintenance-1.0.0/
├── module.yaml
├── backend/
│   ├── image-reference.json
│   └── sbom.spdx.json
├── frontend/
│   ├── index.js
│   ├── assets/
│   └── integrity.json
├── contracts/
│   ├── openapi.yaml
│   └── events/
├── migrations/
├── config/
│   ├── schema.json
│   └── defaults.json
├── permissions/
│   └── permissions.yaml
├── health/
│   └── probes.yaml
└── signature/
```

### 7.2 Javasolt manifest

```yaml
schemaVersion: spaceos.module/v1
id: spaceos.maintenance
displayName: Maintenance
version: 1.0.0
requiresPlatform: ">=0.3.0 <1.0.0"

backend:
  mode: shared-host
  image: registry.example/spaceos-maintenance@sha256:...
  apiBase: /api/maintenance
  health: /health

frontend:
  entry: /ui/spaceos.maintenance/1.0.0/index.js
  routes:
    - path: /maintenance
      permission: maintenance.read

contracts:
  openapi: contracts/openapi.yaml
  events: contracts/events

dependencies:
  - id: spaceos.kernel
    version: ">=0.3.0 <1.0.0"

configuration:
  schema: config/schema.json
  defaults: config/defaults.json

migrations:
  provider: postgresql
  path: migrations

permissions:
  manifest: permissions/permissions.yaml
```

### 7.3 Telepítési módok

#### A. Shared-host bundle — javasolt első cél

- külön csomag és verzió;
- közös .NET host-processz;
- közös PostgreSQL instance, modulonkénti schema/policy;
- a backend vagy gateway szolgálja ki a modul verziózott frontend assetjeit;
- egyszerűbb diagnosztika és alacsonyabb üzemeltetési költség.

#### B. Sidecar/standalone module service

- külön processz és skálázás;
- ugyanaz a bundle- és manifest-szerződés;
- csak akkor indokolt, ha terhelés, izoláció, release cadence vagy technológiai
  különbség szükségessé teszi.

#### C. Runtime remote frontend

- import map vagy Module Federation alapú betöltés;
- csak a statikus workspace-kompozíció és bundle-integrity bizonyítása után;
- szükséges hozzá CSP, Subresource Integrity, verziókompatibilitás, fallback és
  route-conflict ellenőrzés.

### 7.4 Telepítési tranzakció

```text
resolve dependency graph
  → verify signature/SBOM/compatibility
  → download bundle
  → backup + migration preflight
  → apply migration
  → register backend + frontend
  → health/readiness/conformance smoke
  → activate
  → write instance.lock
```

Hiba esetén az aktiválás nem történhet meg. A migrációknak előre dokumentált
forward-fix vagy rollback stratégiával kell rendelkezniük.

---

## 8. Frontend termékcsalád-architektúra

### 8.1 Workspace-cél

```text
packages/
├── spaceos-ui/
├── spaceos-core/
├── crm/
├── controlling/
├── hr/
├── maintenance/
├── qa/
├── ehs/
└── dms/

apps/
├── joinerytech-portal/
└── doorstar-portal/
```

Minden modulcsomag publikus API-t ad:

```text
@spaceos/maintenance
@spaceos/maintenance/routes
@spaceos/maintenance/mocks
@spaceos/maintenance/manifest
```

A modul belső `pages`, `services`, `stores` vagy `components` fái nem
importálhatók más modulból.

### 8.2 Runtime Instance Context

Javasolt végpont:

```http
GET /api/platform/instance-context
Authorization: Bearer <token>
```

Javasolt válasz:

```json
{
  "instanceId": "doorstar",
  "tenantId": "...",
  "platformVersion": "0.3.0",
  "brand": {
    "id": "doorstar-brand",
    "version": "1.0.0",
    "tokensUrl": "/instance/brand/tokens.css"
  },
  "terminology": {
    "workItem": "Feladat",
    "productionBoard": "Üzemi tábla"
  },
  "modules": [
    {
      "id": "joinerytech.production",
      "version": "1.1.0",
      "enabled": true,
      "uiEntry": "/ui/joinerytech.production/1.1.0/index.js",
      "permissions": ["production.read"]
    }
  ],
  "featureFlags": {}
}
```

Az instance-context a hitelesített tenant és user alapján készül. Nem bízhat a
kliens által megadott tenant-, role-, station- vagy module-headerben.

### 8.3 Brand és terminológia

A brand pack tartalmazhat:

- CSS/design tokeneket;
- logót és engedélyezett asseteket;
- betűkészlet-konfigurációt;
- világ- és státuszszíneket;
- shell layout-opciókat a dokumentált slotokon belül.

A terminológia külön csomag legyen, hogy egy szövegcseréhez ne kelljen új
komponenst forkolni. A domainazonosítók és API-kulcsok nem fordíthatók át
terminológiai csomaggal.

---

## 9. Instance-testreszabási szerződés

### 9.1 Engedélyezett extension pointok

| Szint | Mire való | Példa |
|---|---|---|
| brand | vizuális identitás | Doorstar logó és whiteboard-hangulat |
| terminology | megjelenített elnevezések | „Üzemi tábla” |
| configuration | értékek és kapcsolók | állomások, limitek, SLA |
| template | verziózott struktúrák | hatlépcsős workflow, űrlap |
| policy | cserélhető döntési logika | ki indíthat következő lépést |
| adapter | külső rendszerkapcsolat | import, könyvelés, gépadat |
| domain module | új invariáns | új iparági gyártási képesség |

### 9.2 Mikor nem konfiguráció?

Ha egy eltérés:

- tranzakciós invariánst változtat;
- új állapotgépet vagy aggregate-et igényel;
- pénzügyi, biztonsági vagy compliance döntést hoz;
- más modul eseményére új üzleti reakciót vezet be;

akkor verziózott policy- vagy domainmodul szükséges hozzá, saját tesztekkel.

### 9.3 Instance descriptor és lock

```yaml
schemaVersion: spaceos.instance/v1
id: doorstar
platform: 0.3.0
industryPack: joinerytech.manufacturing@1.0.0

modules:
  - spaceos.crm@1.0.0
  - spaceos.maintenance@1.0.0
  - spaceos.qa@1.0.0
  - joinerytech.production@1.1.0

brand: doorstar.brand@1.0.0
terminology: doorstar.hu-HU@1.0.0
templates:
  - doorstar.workshop@1.0.0
adapters:
  - doorstar.import@1.0.0
```

Az `instance.lock` a feloldott verziók mellett pontos OCI digesteket, contract
hash-eket és migrációs verziókat tárol. A deploy mindig a lock alapján
reprodukálható.

---

## 10. Doorstar célállapot és migráció

### 10.1 Mit kell megőrizni?

- a jelenlegi üzemi tábla UX-ét;
- station-alapú munkaszervezést;
- kapacitás- és Kanban-nézeteket;
- projektlapokat és műhelyspecifikus adatokat;
- Doorstar saját vizuális identitását;
- a hatlépcsős üzleti folyamatot, ha az ownership-audit igazolja.

### 10.2 Mit kell lecserélni vagy közösíteni?

| Jelenlegi Doorstar megoldás | Célállapot |
|---|---|
| külön kézzel karbantartott FE típusok | OpenAPI + Orval generált kliens |
| `X-Role`/`X-Station` bizalmi header | JWT claim + permission/policy + szerveroldali station membership |
| önálló, tenant nélküli adatmodell | SpaceOS tenant-context + RLS vagy bizonyított instance isolation |
| fix Stage enum | verziózott Doorstar workflow template, ha nem valódi domain-invariáns |
| frontend által birtokolt ProjectSheet JSON | verziózott schema + backendvalidáció |
| saját Project/Epic/Task modell | ownership-audit szerinti közös modell vagy explicit adapter |
| külön teljes React app | `apps/doorstar-portal` composition root |
| kézi „future merge” igazodás | valódi package/bundle dependency |

### 10.3 Migrációs szakaszok

1. **Contract és security baseline**  
   OpenAPI, generált kliens, JWT, tenant, permission, audit.

2. **Ownership adapter**  
   A Doorstar route-ok mögött adapter választja el a jelenlegi Prisma modellt a
   végleges SpaceOS project/workflow kontraktustól.

3. **Template- és brandkivonás**  
   Állomások, workflow, űrlapsémák, tokenek és terminológia instance packba kerül.

4. **Közös modulok fogyasztása**  
   A Doorstar portál ugyanazokat a QA, Maintenance, DMS és más csomagokat használja,
   mint a JoineryTech portál.

5. **Bundle deployment**  
   Az instance descriptor és lock alapján reprodukálható telepítés.

6. **Párhuzamos működés és kiváltás**  
   Contract/E2E teszttel bizonyított adat- és viselkedési ekvivalencia után a
   duplikált Doorstar komponensek eltávolíthatók.

---

## 11. Biztonsági és üzemeltetési kapuk

### 11.1 Kötelező biztonsági tulajdonságok

- tenant kizárólag hitelesített claimből vagy szerveroldali instance-bindingből;
- PostgreSQL RLS és application query filter defense in depth;
- entitlement és enabled-module ellenőrzés backendoldalon;
- policy-alapú authorization, nem kliensheader;
- aláírt bundle és integritás-ellenőrzött frontend asset;
- audit minden modulinstallra, konfiguráció- és workflow-változtatásra;
- secret nem kerül instance descriptorba vagy bundle-be;
- cross-tenant referencia nem oldható fel explicit B2B jogosultság nélkül.

### 11.2 Kötelező operációs tulajdonságok

- `/health` és `/ready` modulonként;
- modul- és platformverzió a health/diagnostics válaszban;
- strukturált log: instance, tenant, module, version, correlation ID;
- migráció preflight és backup gate;
- install/upgrade/rollback napló;
- frontend és backend kompatibilitás ugyanabból a manifestből;
- deploy után listener PID és systemd MainPID egyezésének ellenőrzése.

---

## 12. Agent-végrehajtási backlog

Az alábbi `MODARCH` elemek a célarchitektúra fogalmi munkacsomagjai. A tényleges,
normatív taskfájlok repository-tulajdon szerint különváltak:

- **JoineryTech / SpaceOS / ERP:**
  [`EPIC-ERP-SEPARATION-2026Q3`](../../tasks/EPIC-ERP-SEPARATION-2026Q3/README.md);
- **Project/FlowEpic/StageChain ownership:**
  [`EPIC-PROJECT-CORE-2026Q3`](../../tasks/EPIC-PROJECT-CORE-2026Q3/README.md);
- **Doorstar instance és migráció:**
  [`doorstar-spaceos-convergence`](../../../../doorstar-instance/docs/projects/doorstar-spaceos-convergence/README.md).

| Fogalmi munkacsomag | Normatív végrehajtási hely |
|---|---|
| MODARCH-01 | JoineryTech `ERPSEP-02` |
| MODARCH-02 | JoineryTech `PROJECT-BOUNDARY-AUDIT/PROJECT-CORE-ADR` + Doorstar `DSCONV-01` input |
| MODARCH-03 | JoineryTech `MODULE-PACKAGES` |
| MODARCH-04 | JoineryTech `ERPSEP-06` |
| MODARCH-05 | JoineryTech `ERPSEP-05` |
| MODARCH-06 | JoineryTech `ERPSEP-07`; Doorstar kitöltés: `DSCONV-04` |
| MODARCH-07 | JoineryTech `ERPSEP-08` |
| MODARCH-08 | Doorstar `DSCONV-02` és `DSCONV-03` |
| MODARCH-09 | Doorstar `DSCONV-04`, `DSCONV-05`, `DSCONV-06` |
| MODARCH-10 | JoineryTech `ERPSEP-09`; Doorstar fogyasztás: `DSCONV-07/08` |
| MODARCH-11 | későbbi JoineryTech platform-ADR, csak két bundle pilot után |

Agent nem dolgozhat közvetlenül a lenti fogalmi leírásból: a megfelelő repository
taskfájlját kell követnie. Egy agent csak a saját mutációs határán belül
dolgozhat; az ADR-taskok kódot nem módosíthatnak.

### MODARCH-01 — Modulazonosító és aláírt katalógus ADR

- **Szerep:** architect + security
- **Prioritás:** P0
- **Függőség:** nincs
- **Cél:** egyetlen ModuleId-taxonomy és module-state modell létrehozása.
- **Kötelező input:** Kernel `ModuleRegistryService`, PostgreSQL enabled-module
  trigger, portal `WORLDS`, auth `enabled_modules`, `EPICS.yaml`.
- **Kimenet:** ADR + `module.schema.json` vázlat + legacy alias/migrációs tábla.
- **Döntendő:** katalógusaláírás, kanonikus ID, dependency syntax, unknown module
  viselkedés, known/installed/entitled/enabled ownership.
- **Elfogadás:** nincs két kézi modul-lista; a defense-in-depth megmarad; ismeretlen
  vagy nem aláírt modul nem aktiválható.
- **Stop:** ha a DB trigger és a Kernel registry production viselkedése nem
  bizonyítható, `decision_required`.

### MODARCH-02 — Project/Workflow/Production/Doorstar ownership-audit

- **Szerep:** architect + backend
- **Prioritás:** P0
- **Függőség:** nincs; MODARCH-01-gyel párhuzamosítható
- **Cél:** minden projekt-, epic-, task-, stage- és production-fogalom egyetlen
  source of truthjához rendelése.
- **Kötelező input:** meglévő `PROJECT-BOUNDARY-AUDIT`, Kernel FlowEpic/StageChain,
  FlowManagement, Production aggregate, Doorstar Prisma és route-ok.
- **Kimenet:** capability matrix, aggregate ownership map, esemény/port térkép,
  `reuse/adapt/extend/new` döntés és ADR-kérdések.
- **Elfogadás:** nem keletkezik harmadik modell; eldől, mi generikus workflow,
  mi gyártási invariáns és mi Doorstar template.
- **Stop:** build/test bizonyíték nélkül semmi nem minősíthető production-readynek.

### MODARCH-03 — Frontend workspace és publikus modul-API

- **Szerep:** frontend
- **Prioritás:** P0
- **Függőség:** MODARCH-01 elfogadott ID-konvenció
- **Cél:** a meglévő `MODULE-PACKAGES` végrehajtása.
- **Mutációs határ:** portal package/workspace konfiguráció, modul public entrypointok,
  composition appok; backend tiltott.
- **Kimenet:** `@spaceos/ui`, `@spaceos/core`, hét modulcsomag,
  `apps/joinerytech-portal`, `apps/doorstar-portal` bootstrap.
- **Elfogadás:** nincs kereszt-modul mélyimport; nincs MSW-kód production chunkban;
  route/chunk baseline dokumentált; TypeScript, build, lint és teszt zöld vagy
  pre-existing baseline-hoz képest nem romlik.
- **Stop:** az EHS wizard ownershipját és a jelenlegi egyetlen ismert cross-module
  importot a csomagbontás előtt dönteni kell.

### MODARCH-04 — Instance Context és dinamikus portálkompozíció

- **Szerep:** backend + frontend + security
- **Prioritás:** P0
- **Függőség:** MODARCH-01; frontend bekötéshez MODARCH-03
- **Cél:** hitelesített tenant-, brand-, module-, permission- és feature-context.
- **Kimenet:** OpenAPI 3.1 spec, backend endpoint, Orval kliens, context cache- és
  invalidation-szabály, shell registry.
- **Elfogadás:** disabled/unentitled modul route-ja és API-ja tiltott; brand és
  menü hardcoded érték nélkül instance-ból jön; JWT csak stabil auth claimet hordoz.
- **Teszt:** tenant isolation, stale token/context, permission downgrade,
  ismeretlen modul, brand fallback.

### MODARCH-05 — Backend modulcsomagolási szerződés

- **Szerep:** backend + infra
- **Prioritás:** P1
- **Függőség:** MODARCH-01
- **Cél:** shared-host és standalone modulok közös packaging API-ja.
- **Kimenet:** NuGet/project package-határ, hosting extension contract,
  migration discovery, health/version endpoint, bundle backend manifest.
- **Elfogadás:** egy modul nem igényel repo-szintű relatív `ProjectReference`-et a
  fogyasztó instance-ban; verziókonfliktus build/deploy előtt látható; auth/RLS
  hosting nem duplikálódik.

### MODARCH-06 — Brand, terminology, template és policy pack szerződés

- **Szerep:** architect + designer + frontend + backend
- **Prioritás:** P1
- **Függőség:** MODARCH-01, MODARCH-04
- **Cél:** dokumentált testreszabási szintek és sémák.
- **Kimenet:** JSON Schema-k, token contract, terminology key registry,
  workflow/form template versioning, policy interface és adapter convention.
- **Elfogadás:** Doorstar arculat, állomáslista és hatlépcsős folyamat core fork
  nélkül leírható; ismeretlen token/policy/template fail-fast validációt ad.
- **Stop:** üzleti invariáns nem kerülhet configba ADR nélkül.

### MODARCH-07 — Maintenance Module Bundle pilot

- **Szerep:** backend + frontend + infra + QA
- **Prioritás:** P1
- **Függőség:** MODARCH-03, MODARCH-04, MODARCH-05
- **Cél:** az első teljes frontend+backend bundle bizonyítása egy horizontális
  ERP-modullal.
- **Miért Maintenance:** jól körülhatárolt capability, frontend és backend is
  létezik, és kevésbé terheli a Doorstar/Production ownership-döntés.
- **Kimenet:** `module.yaml`, backend image/package, frontend asset, OpenAPI,
  migráció, permission seed, config schema, SBOM, signature és installer script.
- **Elfogadás:** clean install, upgrade, hibás upgrade rollback, disabled module,
  tenant isolation és smoke E2E automatizáltan zöld.
- **Stop:** nem kerülhet productionre hosting/RLS gate és visszaállítási próba nélkül.

### MODARCH-08 — Doorstar contract és security konvergencia

- **Szerep:** backend + frontend + security
- **Prioritás:** P1
- **Függőség:** MODARCH-02 döntés, MODARCH-04
- **Cél:** a Doorstar demó platformbiztos kontraktus- és authrétegre emelése UX
  változtatás nélkül.
- **Kimenet:** OpenAPI, generált kliens, JWT/tenant/policy adapter, ProjectSheet
  sémaverzió, audit és compatibility teszt.
- **Elfogadás:** nincs trusted `X-Role`/`X-Station`; nincs kézi FE API-típus;
  invalid sheet payload szerveroldalon elutasított; cross-tenant teszt zöld.

### MODARCH-09 — Doorstar instance pack és composition app

- **Szerep:** frontend + backend + designer
- **Prioritás:** P1
- **Függőség:** MODARCH-02, MODARCH-03, MODARCH-06, MODARCH-08
- **Cél:** a Doorstar-specifikus részek kivonása verziózott instance packba.
- **Kimenet:** Doorstar brand, terminology, station/workflow/form template,
  policy/adapter csomagok és `apps/doorstar-portal`.
- **Elfogadás:** Doorstar UX és fő üzleti flow működik platformforrás módosítása
  nélkül; JoineryTech-frissítés rebase/cherry-pick nélkül fogyasztható.

### MODARCH-10 — Instance composer, lockfile és conformance suite

- **Szerep:** orchestrator + infra + QA + security
- **Prioritás:** P2
- **Függőség:** MODARCH-07 pilot
- **Cél:** reprodukálható modulinstall, upgrade, rollback és kompatibilitás.
- **Kimenet:** instance schema, dependency resolver, `instance.lock`, bundle
  signature verification, compatibility matrix és conformance runner.
- **Elfogadás:** ugyanaz a lock ugyanazokat a digesteket telepíti; inkompatibilis
  modul nem aktiválható; rollback után DB/API/UI smoke zöld; auditnapló teljes.

### MODARCH-11 — Runtime remote frontend döntési kapu

- **Szerep:** architect + frontend + security
- **Prioritás:** P2/optional
- **Függőség:** legalább két bizonyított bundle és MODARCH-10
- **Cél:** eldönteni, szükséges-e runtime UI-betöltés.
- **Kimenet:** ADR statikus workspace composition vs import map vs Module
  Federation összehasonlítással.
- **Elfogadás:** bundle size, cache, CSP/SRI, offline fallback, route conflict,
  React singleton és rollback mérve van.
- **Alapértelmezés:** bizonyított üzleti igény nélkül marad a statikus composition.

---

## 13. Függőségi sorrend és release-kapuk

```text
MODARCH-01 Module Catalog
    ├── MODARCH-03 Frontend Packages
    │       └── MODARCH-04 Instance Context
    │               └── MODARCH-07 Bundle Pilot
    │                       └── MODARCH-10 Composer/Conformance
    ├── MODARCH-05 Backend Packaging ───────┘
    └── MODARCH-06 Extension Packs ──┐
                                     ├── MODARCH-09 Doorstar Instance
MODARCH-02 Ownership Audit ──────────┤
    └── MODARCH-08 Doorstar Security ┘
```

### Gate A — Architektúra

- ModuleId és modulállapot elfogadott;
- workflow/project/production ownership elfogadott;
- extension point és tiltott függőség dokumentált.

### Gate B — Csomaghatár

- frontend public API-k;
- backend hosting/package contract;
- contract-first API;
- nincs cross-module deep import vagy közvetlen DB-írás.

### Gate C — Bundle pilot

- Maintenance install/upgrade/rollback;
- signature, SBOM, health és migration gate;
- frontend+backend verzióazonosság.

### Gate D — Doorstar mint valódi instance

- közös auth/tenant/RLS;
- OpenAPI + generált kliens;
- brand/template/policy/adapter pack;
- közös modulok platformfork nélkül;
- Doorstar E2E és compatibility suite zöld.

---

## 14. Kockázatok és ellenszerek

| Kockázat | Hatás | Ellenszer |
|---|---|---|
| túl korai microservice-bontás | üzemeltetési és hálózati komplexitás | bundle előbb, processzbontás csak mérés után |
| minden konfigurálhatóvá tétele | rejtett, tesztelhetetlen domainlogika | config/policy/domain döntési szabály |
| modulverzió-drift | runtime inkompatibilitás | manifest constraint + lock + conformance |
| runtime frontend dependency conflict | React/router singleton hibák | peer dependency policy, statikus composition elsőként |
| tetszőleges modulaktiválás | supply-chain és authz rés | aláírt katalógus + allowlist + DB trigger |
| Doorstar-bemásolás a core-ba | ügyfélspecifikus platformfork | ownership audit + instance pack |
| túl általános közös domainmodell | bounded context összefonódás | semleges referenciák és explicit portok |
| frontend-owned JSON | adat- és verziódrift | verziózott JSON Schema + backend validation |
| nagy migráció egyszerre | ügyfélfolyamat regresszió | strangler adapter, párhuzamos E2E, lépcsős kiváltás |

---

## 15. Ajánlott első két bizonyító lépés

1. **MODARCH-01 + MODARCH-02 párhuzamos döntés-előkészítése.**  
   Ezek nélkül a csomagnevek, a workflow ownership és a Doorstar migráció célpontja
   bizonytalan marad.

2. **Maintenance bundle pilot, majd Doorstar Production mint második pilot.**  
   A Maintenance bizonyítja a csomagolási mechanikát kisebb domainkockázattal. A
   Doorstar Production ezután bizonyítja, hogy ugyanaz a mechanika valódi
   ügyfélspecifikus arculatot, workflow-t és policy-t is képes hordozni.

---

## 16. Memento

### Rögzített felismerések

- A cél egy SpaceOS-alapú termékcsalád, nem egyetlen faipari monolit.
- A horizontális ERP-modulok és az iparági domain külön bounded context-réteg.
- A Doorstar a kívánt instance-modell jó UX-demója, de jelenleg párhuzamos
  implementáció.
- A frontend+backend modulonként egy bundle-be csomagolható anélkül, hogy azonnal
  microservice-architektúrára kellene váltani.
- Az instance-testreszabás kontrollált brand, terminology, config, template,
  policy és adapter extension pointokon történik.
- A modulkompozícióhoz egységes, aláírt katalógus és
  known/installed/entitled/enabled állapotmodell szükséges.
- A projekt/workflow/production ownership tisztázása minden Doorstar-összevonás
  előfeltétele.

### Nyitott döntések

- A Project/FlowEpic/FlowTask végleges tulajdonosa.
- A generikus workflow és a manufacturing execution pontos határa.
- A `joinerytech.production` általános faipari capability vagy több kisebb modul.
- Shared-host plugin vagy külön processz mely moduloknál indokolt.
- Brand/policy/template csomagok aláírási és publikálási registry-je.
- Runtime remote frontend ad-e mérhető előnyt a statikus compositionhöz képest.

### Következő átadási pont

A taskok repository-tulajdon szerint kiadásra kerültek. Elsőként párhuzamosan
indítható a JoineryTech `ERPSEP-01` capability-boundary audit, a meglévő
`PROJECT-BOUNDARY-AUDIT`, valamint a Doorstar `DSCONV-00` security baseline és
`DSCONV-01` capability mapping. Kódmutáció csak az érintett ADR-ek és platform
gate-ek elfogadása után indulhat.
