# JoineryTech platform — program- és projektállapot-felmérés

> **Dátum:** 2026-07-18 (Europe/Budapest)  
> **Jelleg:** bizonyíték-alapú programállapot és döntés-előkészítő tudástári pillanatkép  
> **Állapot:** aktuális baseline; nem ADR és nem release-engedély  
> **Vizsgált revízió:** platform `7ca86ee`, portal `b711549` (`v1.0.0`)  
> **Minőségi alap:** [`QUALITY.md`](../../../QUALITY.md)

## 1. Vezetői összefoglaló

A JoineryTech célja világos és koherens: **több-bérlős, moduláris faipari SaaS
platform**, amely az ügyféligénytől és tervezéstől a projekten, beszerzésen,
gyártáson, minőségbiztosításon és kiszállításon át az utókövetésig összefogja a
teljes értékláncot.

A termék nem egyszerű ERP és nem Jira-klón. A legerősebb megkülönböztető elem a
faipari szereplők közötti, céghatárokon átívelő munkamegosztás:

```text
Program → Projekt → Mérföldkő → (Almérföldkő) → FlowEpic → Task → Subtask
                                      │
                                      └── B2BHandshake → másik tenant/cég
```

**A jelenlegi érettségi szint:** működő és kiadott platformmag, gazdag UI-val,
komoly DDD/backend alappal és üzemelő VPS-szolgáltatásokkal; ugyanakkor még nem
tekinthető teljesen integrált production terméknek, mert a portál jelentős része
MSW/mock adaton fut, a közös auth/tenant/RLS hosting-kör folyamatban van, és a
projekt/B2B mag mély üzleti modellje még nincs megvalósítva a valódi portálban.

### Döntési összefoglaló

1. **Stabilitás előbb:** az ADR-061/062 hosting–auth–tenant–RLS végrehajtásának
   bizonyított lezárása az első kapu.
2. **API-first irány helyes:** az `EPIC-UI-WORLDS-2026Q3` production + warehouse
   tranche-a a valós API-kontraktusból induljon; az MSW csak szerződéshű tükör.
3. **A projekt-platform a termék stratégiai magja:** külön bounded contextként
   kell megtervezni, amely hierarchiát, actor-nézetet és B2BHandshake-et birtokol,
   de más modulok üzleti adatait csak hivatkozza.
4. **A tudástár legyen az aktuális igazság:** a `docs/joinerytech` történeti
   design-korpusz, az `EPICS.yaml` az élő célállapot, a `docs/tasks` a kivitelezési
   bizonyíték, a `docs/knowledge` pedig a kurált, aktuális tudás.

## 2. Felmérési kör és módszer

### 2.1 Vizsgált források

- `QUALITY.md`, `AGENTS.md`, `EPICS.yaml`
- `docs/joinerytech/` bejárható prototípus, `PROJECT_STATUS.md`, domain- és
  integrációs tervek, képernyőképek
- `PROJECT_MANAGEMENT_MODEL-frontend-designes-v3.md`
- `docs/knowledge/architecture/`, `docs/knowledge/adr/`, `docs/tasks/`
- `src/joinerytech-portal/` tényleges React-portál
- a hét modernizált modul backendje és a közös hosting-csomag folyamatban lévő
  munkája
- VPS systemd-állapot, portok és `/health` szúrópróba

### 2.2 Elvégzett ellenőrzések

- a prototípus és a valódi portál vizuális, interaktív bejárása;
- forrás-, route-, modul-, dokumentum- és gitlink-leltár;
- `npm run build`;
- teljes `npm test` diagnosztikai futás, majd a bukó teszt izolált futtatása;
- teljes ESLint JSON-riport összesítése;
- VPS service- és listener-ellenőrzés;
- `.env`/secret tracking és `.gitignore` ellenőrzés.

### 2.3 Korlátok

- A felmérés nem auditálta soronként a teljes .NET kódbázist.
- A helyi backend munkafa a felmérés alatt más folyamat által aktívan változott;
  ezért az uncommitted hosting/RLS kód **nem kapott release-minősítést**.
- A VPS ellenőrzése állapot- és health-smoke volt, nem teljes üzleti E2E.
- A teljes frontend tesztfutás 15 perc után diagnosztikai okból megszakadt; a
  részletes eredményt a 6. fejezet rögzíti.

## 3. A cél és a termékmodell értelmezése

### 3.1 Platformrétegek

| Réteg | Szerep | Jelenlegi állapot |
|---|---|---|
| **SpaceOS/Nexus alap** | Kernel, tenant, auth, orchestration, tudás | működő alap, részben külön sziget/repo |
| **JoineryTech platform** | általános faipari SaaS modulok és portál | 7 modernizált modul + legacy világok |
| **Doorstar/ügyfélspecifikus réteg** | konkrét ügyfélfolyamat és konfiguráció | downstream testreszabási cél |

### 3.2 A hét modern platformmodul

CRM, Kontrolling, HR, Maintenance, QA, EHS és DMS teljes UI-review körön ment át.
Ezek adják a stabil általános platformmagot, de nem fedik le önmagukban a teljes
faipari értékláncot.

### 3.3 A szélesebb faipari munkavilág

A portál tényleges világregisztere **27 világot** tartalmaz. A hét modernizált
modul mellett production, sales, design, warehouse, shopfloor, projects,
logistics, mfgprep és további világok renderelnek, de sok helyen legacy
komponensekkel, statikus adatokkal vagy MSW-vel.

Ez fontos megkülönböztetés:

- **a UI szélessége** már erősen mutatja a végterméket;
- **a domain/API mélysége** világonként nagyon eltérő;
- ezért a „látható és kattintható” nem azonos a „production-integrált” állapottal.

### 3.4 A projekt-platform mint stratégiai mag

A design-korpuszban a projekt nem egyszerű rekord vagy dashboard. A projekt:

- a teljes ügyfél- és helyszínspecifikus munkacsomag;
- tenant-specifikus mérföldkőláncot használ;
- FlowEpic egységeket delegálhat más cégeknek;
- actor-típus alapján ugyanazon URL-en eltérő adatszeletet mutat;
- a Sales, DMS, Production, Warehouse, QA, Logistics és Kontrolling eseményeit
  összefogja, de azok adatait nem duplikálja.

A valódi portál jelenlegi `ProjectsPage.tsx` implementációja ezzel szemben
statikus `PROJECTS` adathalmazból dolgozik. Van áttekintés, projektlista, Kanban,
szakágállapot és tétellista, de nincs teljes program/mérföldkő/epik hierarchia,
actor-szűrt nézet vagy B2BHandshake-folyamat.

**Következtetés:** a projekt-platform nem egy további legacy világ a sok közül,
hanem potenciálisan a JoineryTech összefogó alkalmazási gerince. Megvalósítása
előtt teljes architekturális terv és ownership-döntés kötelező.

## 4. Aktuális rendszerállapot

### 4.1 Frontend

| Bizonyíték | Eredmény |
|---|---|
| Portál verzió | `1.0.0`, portal `b711549` |
| Tényleges stack | React `19.2.x`, TypeScript `6.0.x`, Vite `8.0.x`, Vitest `4.1.x` |
| Világok | 27 regisztrált világ |
| Modernizált világok | 7 designer-APPROVED modul |
| Build | zöld, 60 lazy chunk |
| Shell bundle | 374,95 kB / 108,81 kB gzip |
| Adatréteg | modern modulokban typed services + TanStack Query + zod + MSW |
| Valós API-használat | fejlesztői futásban az MSW aktív; fokozatos bekötés szükséges |
| Lint | 198 error + 17 warning, 93 érintett fájl |

Pozitív technikai jelek:

- nincs 500 sor feletti TS/TSX forrásfájl;
- a route-alapú code splitting működik;
- a modern modulokban kialakult egy újrahasználható services/mocks/pages minta;
- dark mode és a11y primitívek rendelkezésre állnak.

Nyitott frontend-kockázatok:

- a legacy világokban hardcoded stílus, lokális üzleti logika és mock adat;
- a világregiszter a `mocks/` fa alatt él, noha platform-konfiguráció;
- a portál gyökér-README-je még generikus Vite-sablon;
- a tudástári React 18/TS5 leírás elavult a tényleges stackhez képest;
- az MSW és a valódi API közötti szerződéshűség még nem mindenhol bizonyított.

### 4.2 Backend és platform-hosting

A hét kiemelt modul mögött futtatható host és tesztelt domain/API réteg alakult
ki. A legfontosabb aktuális munka a modulonként duplikált és részben hibás
auth/tenant/RLS wiring közös `SpaceOS.Modules.Hosting` csomagba emelése.

A felméréskori munkafa több mint száz státuszbejegyzést érintett, többek között:

- közös JWT/auth konfiguráció;
- tenant azonosítása hitelesített JWT-claimből;
- `HasQueryFilter` védőháló;
- PostgreSQL RLS session-context és policy-k;
- hiányzó/hibás migrációk pótlása;
- Maintenance és QA futtatható host;
- modulonkénti regressziós tenant-tesztek.

Ez a munka stratégiailag helyes, de nagy blast radiusú. Release-késznek csak
tiszta, külön verifikált állapotban tekinthető.

### 4.3 Üzemeltetés

A 2026-07-18-i read-only VPS ellenőrzés szerint:

- mind a 11 dokumentált service `active`;
- nincs failed systemd unit;
- a várt portok hallgatnak;
- knowledge, joinery, abstractions, inventory, identity, sales és MinIO health
  útja 200-at adott;
- kernel, orchestrator, cutting és procurement `/health` útja 404-et adott,
  miközben a service aktív és a port hallgat.

**Következtetés:** a runtime jelenleg él, de az observability-kontraktus nem
egységes. Minden HTTP service számára közös `/health/live` és `/health/ready`
szabvány javasolt.

### 4.4 Repository és reprodukálhatóság

- A portal submodule a felmérés végén tiszta volt.
- A platform gyökérben az auth/RLS munka jelentős uncommitted változáskészlet.
- Három gitlinkhez nincs `.gitmodules` mapping
  (`joinerytech-keycloak-theme`, `spaceos-modules-identity`,
  `spaceos-modules-sales`), ezért a gyökér `git submodule status` hibával leáll.
- A `.env` nincs trackelve, a `.gitignore` megfelelő mintákat tartalmaz.
- Az `agents.yaml` történeti tokenje dokumentált rotáció-jelölt maradt.

## 5. Tudástár és dokumentációs állapot

### 5.1 A `docs/joinerytech` szerepe

Mért állapot:

| Mutató | Érték |
|---|---:|
| Fájl | 763 |
| Méret | 61,05 MB |
| Markdown | 42 |
| Kép | 401 |
| Kódjellegű fájl | 312 |

Ez rendkívül értékes design- és kutatási korpusz, de együtt tartalmaz:

- futtatható prototípuskódot és build-outputot;
- termék- és domainleírásokat;
- iterációs képernyőképeket;
- feltöltött könyvoldalakat és kutatási forrásokat;
- append-only projektstátusz-történetet;
- archív és aktuálisnak tűnő állításokat.

Ezért ezt a mappát **történeti design-korpuszként**, nem aktuális projektállapotként
kell kezelni.

### 5.2 Javasolt igazságforrás-hierarchia

| Kérdés | Kötelező forrás |
|---|---|
| Mi a program/epic aktuális célja és státusza? | `EPICS.yaml` |
| Miért született egy architekturális döntés? | `docs/knowledge/adr/` |
| Mi az aktuális architektúra és állapotkép? | `docs/knowledge/architecture/` |
| Mi készült el és milyen bizonyítékkal? | `docs/tasks/<epic>/` |
| Mi volt a prototípus eredeti design intentje? | `docs/joinerytech/` |
| Mi a futó operatív minta? | `docs/knowledge/patterns/` + deployment docs |

### 5.3 Dokumentációs inkonzisztenciák

- `EPIC-UI-PORTAL-2026Q3.status = in_progress`, miközben a release-task ugyanabban
  a fájlban az epicet CLOSED-ként írja le.
- A világ-leltár ~23 világot ír, a tényleges regiszter és teszt 27-et.
- A tudástár indexe React 18-at, a portál React 19-et használ.
- A július 16-i világ-leltár még hiányzó hostokat és ADR-döntéseket említ,
  amelyek aznap később elkészültek vagy elfogadásra kerültek.
- A UI-ban, package-ben és release-dokumentációban különböző verziószámok
  (`v3.2.1`, `v1.0.0`, platform `v0.2.0`) jelennek meg, jelentésük nincs egy helyen
  definiálva.

## 6. QUALITY.md megfelelési mátrix

| Elv | Állapot | Bizonyíték / rés |
|---|---|---|
| **1. Cél és leállási feltétel** | 🟡 | cél és stop condition van; az első epic gyökérstátusza nem követte a release-döntést |
| **2. Teljes tervezés + ADR** | 🟢/🟡 | erős ADR- és design-kultúra; több történeti terv nincs egyértelműen archived/superseded jelölve |
| **3. Clean code + DDD + config** | 🟡 | backend DDD és options-minták erősek; legacy frontend hardcode; több aktív backendmodulnak nincs README-je |
| **4. Unit + integráció + összevetés** | 🟡 | nagy tesztkorpusz; a default frontend suite nem determinisztikus kapu |
| **5. Hatékonyság + újrahasználás + memória** | 🟢/🟡 | közös hosting, fsmGuards, minták és task-doksik jók; dokumentumduplikáció növeli a kontextusköltséget |
| **6. Specializált munkamódszer** | 🟢 | szerepek, review-k és párhuzamos sávok működnek; fájlhatárokra továbbra is figyelni kell |
| **7. Stabilitás és biztonság** | 🔴/🟡 | VPS stabil; auth/tenant/RLS a kritikus nyitott kapu; történeti tokenrotáció nyitott |
| **8. Földelt agent-munka** | 🟡 | sok build/test/health bizonyíték; néhány „kész” állítás később fordítatlan vagy nem futó kódról szólt |

### 6.1 Frontend verifikáció részlete

`npm run build`:

- **PASS**;
- TypeScript és Vite build zöld;
- 60 lazy chunk;
- shell: 374,95 kB / 108,81 kB gzip.

`npm test`:

- a teljes futás 15 perc alatt nem zárult le;
- a `PublicQuoteRequestPage` 50 tételes limit-tesztje 66,2 másodperc után
  timeoutolt a teljes suite-ban;
- a futás ekkor még egyetlen, kb. 1,5 GB memóriájú workeren dolgozott;
- diagnosztikai okból megszakítva, tehát nincs teljes-suite PASS állítás.

Izolált kontroll:

- ugyanaz a teszt **1/1 PASS**;
- teljes idő: 82,38 s;
- tesztidő: 42,17 s;
- jsdom environment: 28,81 s.

**Értelmezés:** nem igazolt termékregresszió, viszont a teszt 49 növekvő DOM-on
végzett egymás utáni render-ciklusa és a suite konfigurációja nem alkalmas gyors,
determinisztikus quality gate-nek.

`eslint`:

- 198 error;
- 17 warning;
- 93 érintett fájl;
- csak 1 error és 4 warning automatikusan javítható.

## 7. Kockázattérkép

| ID | Kockázat | Hatás | Valószínűség | Következő bizonyíték |
|---|---|---|---|---|
| R1 | Tenant áttörés hitelesítetlen header vagy hibás RLS miatt | kritikus | közepes, amíg az ADR-kör nincs lezárva | két-tenantos integrációs teszt + JWT-claim ellenőrzés |
| R2 | UI-készültség összetévesztése production-integrációval | magas | magas | minden világon `data_source: mock/api/mixed` nyilvántartás |
| R3 | Default frontend tesztkapu lassú/flaky | magas | magas | CI-szabványos worker-limit + teljes suite PASS időkerettel |
| R4 | Tudástár- és goal-config drift | magas | magas | indexfrissítés + superseded jelölés + automatikus link/állapot check |
| R5 | Törött gitlinkek miatt nem reprodukálható checkout | magas | magas | tiszta clone + recursive submodule smoke |
| R6 | Projekt/B2B stratégiai mag ownership nélkül nő | magas | közepes | külön ADR + bounded-context és esemény/port térkép |
| R7 | Legacy frontend adósság lassítja az API-first migrációt | közepes | magas | tranche-onként lint=0 és contract test |
| R8 | Inkonzisztens health/observability | közepes | közepes | egységes liveness/readiness endpoint és deploy gate |
| R9 | Történeti secret kompromittálhat aktív rendszert | kritikus | ismeretlen | rotáció + visszavonás dokumentált bizonyítéka |

## 8. Lehetőségek és megvalósítási opciók

### 8.1 Stabilizáció és API-integráció

#### Opció A — UI-modernizálás továbbra is MSW-first

**Előny:** gyors képernyőszállítás és designer feedback.  
**Hátrány:** újabb kontraktus-eltérés és „kattintható, de nem integrált” világok.  
**Értékelés:** a korábbi hét modulnál hasznos volt, a következő hullámra nem
javasolt alapértelmezés.

#### Opció B — API-first, az MSW a valós kontraktus tükre

**Előny:** a frontend séma, enum, FSM és hibakontraktus a futó backendből indul;
kisebb integrációs meglepetés.  
**Hátrány:** az API-audit és backend gap-ek miatt lassabb indulás.  
**Értékelés:** **ajánlott és már elfogadott irány** az
`EPIC-UI-WORLDS-2026Q3` production + warehouse tranche-ában.

#### Opció C — közvetlenül csak élő API, MSW nélkül

**Előny:** nincs kettős implementáció.  
**Hátrány:** lassabb és törékenyebb FE-fejlesztés, offline tesztelés és hibaszimuláció
nehezebb.  
**Értékelés:** nem javasolt; a szerződéshű MSW hasznos tesztdouble marad.

### 8.2 Projekt-platform megvalósítása

#### Opció P1 — Projektek mint önálló CRUD-modul

Gyors, de elveszíti a B2B és értéklánc-összefogó előnyt. Könnyen duplikálja a
Sales/Kontrolling/Production adatokat. **Nem ajánlott.**

#### Opció P2 — Projektek mint orchestration/reference bounded context

Saját tulajdon:

- program/projekt/mérföldkő/epik hierarchia;
- StageChain-konfiguráció;
- FlowEpic FSM;
- B2BHandshake és actor-szűrt hozzáférési projekció;
- kapcsolódó modulobjektumokra stabil hivatkozások.

Nem saját tulajdon:

- ajánlat és rendelés;
- költség és kontrolling;
- raktárkészlet;
- gyártási technológiai részlet;
- dokumentumverzió;
- chatüzenet.

**Értékelés:** ajánlott stratégiai irány.

#### Opció P3 — A Kernel FlowManagement közvetlen kiterjesztése

Csökkentheti a duplikációt, de a JoineryTech-specifikus projekt UX és domain
visszaszivároghat a generikus kernelbe. Csak akkor jó, ha a kernel absztrakciója
ténylegesen iparágfüggetlen marad. **ADR nélkül nem indítható.**

### 8.3 Tudástár-rendezés

#### Opció K1 — Csak új aktuális index, a korpusz érintetlen

Kis kockázat és gyors eredmény, de a keresési zaj megmarad.

#### Opció K2 — Kurált rétegek és explicit státuszmetadata

Minden aktuális dokumentum kapjon legalább:

```yaml
status: current | superseded | historical | draft
as_of: YYYY-MM-DD
authority: goal-config | adr | architecture | task-evidence | design-intent
supersedes: optional/path.md
```

A fájlok fizikai tömeges mozgatása helyett először index- és metadata-réteg
készüljön. **Ajánlott.**

#### Opció K3 — Teljes dokumentummigráció és archívum-átszervezés

Tiszta végeredményt adhat, de nagy linktörési és git-zaj kockázatú. Csak külön,
rollbackelhető epicben indokolt.

### 8.4 Tesztstratégia

#### Opció T1 — Nagy timeoutok

Gyors tünetkezelés, de nem oldja meg a drága tesztmintát. Nem elégséges.

#### Opció T2 — CI worker-budget + tesztpiramissal szétválasztott suite

- tiszta unit teszt a 50 tételes domain/állapotkorlátra DOM nélkül;
- 1–2 UI-integrációs teszt a disabled gombra;
- szabályozott `maxWorkers`/pool a CI-ben;
- külön gyors PR-gate és teljes nightly suite;
- idő- és memória-budget regressziós küszöb.

**Ajánlott.**

## 9. Ajánlott programkapuk

| Kapu | Cél | Mérhető leállási feltétel |
|---|---|---|
| **G0 — Tudáskonzisztencia** | aktuális igazságforrás | régi UI epic lezárva; index aktuális; technológiai és verziójelentés rögzítve |
| **G1 — Hosting/Auth/RLS** | biztonságos modul-host baseline | tiszta diff; közös csomagtesztek; minden modul build+test; két-tenant RLS; token nélküli 401; header nem írhatja felül a claimet |
| **G2 — Valós API-kapcsolat** | MSW→API átmenet bizonyítása | legalább egy modern modul production-like API módban E2E zöld; mock/api feature flag; contract drift test |
| **G3 — Production tranche** | production világ modernizálása | cutting+joinery valós kontraktus; lint 0 az érintett világban; designer APPROVED; build+teszt zöld |
| **G4 — Warehouse tranche** | warehouse világ modernizálása | inventory+procurement valós kontraktus; FSM és hibakód tükör; designer APPROVED |
| **G5 — Projektmag-terv** | stratégiai bounded context | ADR elfogadva; ownership-, actor-, esemény-, API- és migrációs terv; implementáció még nem indul előbb |
| **G6 — Reprodukálható release** | stabil kiadás | tiszta clone/submodule; determinisztikus tesztparancs; health gate; deploy után MainPID↔port bizonyíték |

### Ajánlott párhuzamos munkasávok

```text
Sáv A — Platform-biztonság: ADR-061/062 hosting + auth + RLS
Sáv B — Read-only kontraktusaudit: production + warehouse backendek
Sáv C — Döntés-előkészítés: projekt bounded context és B2BHandshake ADR

FE-mutáció csak a kontraktusaudit után, egyszerre egy portál-agenttel.
```

## 10. Nyitott döntések

1. Mi a `Projects` bounded context pontos tulajdona a Kernel FlowManagementhez és
   a Kontrolling projekt-read modelhez képest?
2. Mi a B2BHandshake legkisebb értékadó MVP-je: meghívás + elfogadás + státusz,
   vagy már actor-szűrt task/proof kezelés is?
3. A hét modernizált modul valós API-bekötése megelőzi-e a következő legacy
   világakat, vagy külön stabilizációs tranche lesz?
4. Melyik verziószám mit jelent: portal release, platform release, UI/design
   schema vagy tenant-konfiguráció?
5. Mi legyen a `docs/joinerytech` hosszú távú megőrzési és keresési szabálya?
6. Mikor és milyen bizonyítékkal zárható le a történeti tokenrotáció?

## 11. Következő felülvizsgálat

Ezt a pillanatképet az alábbi események bármelyike után frissíteni vagy
superseded státuszba tenni kell:

- ADR-061/062 végrehajtás merge + teljes minőségkapu;
- production vagy warehouse világ designer-APPROVED lezárása;
- az első modern modul valós API-s production-like E2E-je;
- projekt/B2BHandshake ADR elfogadása;
- következő portal/platform release.

## 12. Kapcsolódó források

- [`EPICS.yaml`](../../../EPICS.yaml)
- [`PORTAL_WORLDS_INVENTORY_2026-07-16.md`](PORTAL_WORLDS_INVENTORY_2026-07-16.md)
- [`WORLDS_API_CONTRACTS_2026-07-18.md`](WORLDS_API_CONTRACTS_2026-07-18.md)
- [`UI_IMPLEMENTATION_PLAN_2026-07-14.md`](UI_IMPLEMENTATION_PLAN_2026-07-14.md)
- [`VPS_SERVICE_STATE_2026-07-16.md`](VPS_SERVICE_STATE_2026-07-16.md)
- [`ADR-059..064`](../adr/README.md)
- [`PROJECT_MANAGEMENT_MODEL-frontend-designes-v3.md`](../../joinerytech/uploads/PROJECT_MANAGEMENT_MODEL-frontend-designes-v3.md)
- [`PROJECT_STATUS.md`](../../joinerytech/PROJECT_STATUS.md)
- [`docs/tasks/EPIC-UI-PORTAL-2026Q3/`](../../tasks/EPIC-UI-PORTAL-2026Q3/README.md)

---

_A dokumentum a 2026-07-18-i ellenőrzött állapotot rögzíti. Jövőbeli változás
esetén ne írjuk át történetietlenül: új dátumozott assessment vagy explicit
`superseded` jelölés készüljön._
