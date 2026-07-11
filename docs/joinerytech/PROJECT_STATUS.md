# JoineryTech Portal — Projekt állapot & elképzelések

> Belső, mobilbarát vállalatirányítási prototípus asztalos- és bútoripari cégeknek.
> Egyetlen HTML alkalmazás, React + Babel (CDN), Tailwind utility osztályokkal.
> **Minden adat szimulált** — nincs backend; egy közös, `localStorage`-ben megőrzött store hajtja az egészet.

_Utolsó frissítés: 2026-06-14 — **Partner-kapcsolat nézet** (4.11): a beszállítói portál belső tükre. Beállítások → Partnerek → partner megnyitása → teljes képernyős `PartnerCockpit` (élő `sim.partners`). Két nézet: „Belső nézet" (kapcsolati KPI-k + RFQ/PO/kézfogás belső extrákkal + minősítés + jegyzetek) és „Partner szemével" (vendég-tükör, belső adatok rejtve) + „Belépés partnerként" (impersonate a portál-fiókba). Egy igazságforrás, nincs új entitás; additív. `page-partner.jsx`. Korábbi: 2026-06-14 — **Beszállítói portál** (4.10): a befelé jövő RFQ→PO→bevételezés lánc beszállítói oldala. Teljes képernyős önkiszolgáló portál (`portal === "supplier"`, mint a B2C webshop), `supplierName()`-re szűrve. Beszállítói ajánlat-beadás (`submitSupplierBid`), PO-visszaigazolás + feladás/ASN (`acknowledgePO`/`markPOShipped`) — a meglévő RFQ/PO FSM másik oldala, nincs új entitás. Teszt-fiók: Falco Sopron Zrt. (`acc-vendor`). Additív (nincs LS-bump). `page-supplier.jsx`. Korábbi: 2026-06-14 — **Munkavédelem / EHS világ** (4.9, red akcent): üzemi munkavédelem a magyar Mvt. + ISO 45001 mentén. Önálló `ehs` világ HORGONY-elven (HR=ember, Karbantartás=gép, Feladataim=CAPA). 3 entitás: baleset/kvázibaleset-FSM (`bejelentve→kivizsgalas→intezkedes→lezarva` + CAPA), 5×5 kockázatértékelés (számított pont/band + maradék-kockázat + éves felülvizsgálat), oktatás/kompetencia lejárat-figyeléssel. 4 képernyő, új `ehs.manage` perm, additív (nincs LS-bump). `data-ehs.js`/`page-ehs.jsx`/`page-ehs-2.jsx`. Korábbi: 2026-06-14 — **Dok-szinkron (drift-javítás):** a **4.7-A** iparág-specifikus blokk (Termékkonfigurátor/CPQ + Anyagoptimalizálás+maradékkezelés) ténylegesen MEGÉPÜLT (`configurator` képernyő; `data-nesting.js`/`page-nesting.jsx` 2D nesting + `offcuts[]` maradékanyag-raktár — lásd CLAUDE.md 4.7-A), és a **4.6** gap-analízis #4 **HR** / #5 **Karbantartás** is KÉSZ — a táblázat-státuszok frissítve. Korábbi: 2026-06-08 — **CRM / Lead-pipeline világ** (3.33, blue akcent): új `crm` világ az ajánlat-FSM ELÉ fűzve. Két entitás, két FSM, egy konverziós kézfogás: **LEAD** (`uj → kapcsolat → minosites → nurturing → konvertalva`, +elvetve) → **`convertLeadToOpp`** → **OPPORTUNITY** (`nyitott → igenyfelmeres → osszeallitas → ajanlat → targyalas → megnyert/elveszett`). A lánc vége a meglévő **`createQuote`** (Sales) + új ügyfél a CUSTOMERS-be (`winOpp`). `oppCreateQuote` → draft (vázlat) ajánlat + CRM-feladat (összeállításra vár az Értékesítésben). Forrás-bontás, tevékenység-napló (hívás/email/találkozó), feladatok SLA-val, B2B kiadás (`handshakes` kind:crm), webshop érdeklődés → auto-lead (`createLeadFromWebshop`), súlyozott forecast (`CrmEngine`). Nézetek: Áttekintés/Pipeline kanban/Leadek/Lehetőségek/Feladatok/Forecast. Új `crm.manage` perm. LS_KEY `jt_sim_v54`, seed `v: 37`. **Roadmap (4.7): második hullám** — iparág-specifikus (Konfigurátor/CPQ, Anyagoptimalizálás+maradék) + általános ERP-bővítések (Minőségbiztosítás / Dokumentumtár / Idő & jelenlét, tiszta felelősségi határokkal) — utóbbiak épülőben. Korábbi: **Karbantartás / Eszközgazdálkodás világ** (3.32): új `maintenance` világ (cyan akcent). Kanonikus eszköz-törzs (`sim.assets[]`: gép / jármű / szerszám / infrastruktúra / IT / helyiség) az EGY igazságforrás — a Shop Floor + Gyártás innen olvassa a gép üzemállapotát. Az **üzemállapot SZÁMÍTOTT** a nyitott munkalapokból (`MaintEngine.assetStatus`: üzemel / karbantartás alatt / leállítva / selejtezve). Karbantartási munkalap FSM (`workOrders[].status`): `bejelentve → ütemezve → folyamatban → kész` (+ halasztva / elutasítva, `setWorkOrderStatus` validált, `maintenance.manage`). Megelőző tervek: **időköz- ÉS üzemóra-alapú** + **takarítási rend** (`maintPlans[]`, `MaintEngine.planDue` → esedékesség, `createWorkOrderFromPlan`). Bekötések: HR (belső szerelő ütemezése egy `assignments` rekordot ír → kapacitás-terhelés), külső szerviz/takarító partner → B2B kézfogás (`handshakes` kind:maintenance), Raktár/Beszerzés (alkatrész-igény `woRequestParts` → Draft requisition), Kontrolling (projekthez kötött munkalap → `pushWorkOrderToCtrl` rezsi tény-tétel), Gyártás (a leállás → „N karbantartás" a Production dashboardon). Állásidő-napló (`downtime[]`). Nézetek: Áttekintés / Eszközök (+ kártya SlideOver) / Munkalapok (FSM) / Ütemterv / Állásidő. Új `maintenance.manage` perm. Új store-mezők: `assets`, `workOrders`, `maintPlans`, `downtime`, `assetSeq`/`woSeq`/`planSeq`/`dtSeq`. LS_KEY `jt_sim_v53`, seed `v: 36`. Korábbi: **HR / Munkaerő-kapacitás világ** (3.31). új `hr` világ (amber akcent). A dolgozói törzs (`sim.employees[]`) az EGY igazságforrás; a Logisztika brigádjai (`crews[].memberIds`) erre mutatnak (a régi `members[]` string-lista fallback). Kapacitás SZÁMÍTOTT (`HrEngine`): napi terhelés = projekt-/feladat-beosztás (`assignments[]`) + fuvar-beosztás (a crew-tagság a Logisztikából) vs. napi kapacitás (heti óra / 5); túlterhelés = lekötött > kapacitás. Távollét-kérelem FSM (`absences[].status`): `kért → jóváhagyva → folyamatban → lezárva` (+ elutasítva, `setAbsenceStatus` validált, jóváhagyás/elutasítás `hr.manage` joghoz). Munkaóra-napló (`timeLogs[]`) → `pushTimeLogToCtrl` átküldi a Kontrollingba „munka" kategóriás tény-korrekcióként (óra × óradíj). Készség-mátrix (szintezett `skills`), bér-kategória (óradíj). Nézetek: Áttekintés (kapacitás KPI + mai jelenlét + túlterhelés + nyitott kérelmek) / Dolgozók (+ profil SlideOver) / Kapacitás-naptár (dolgozó-soros heti rács) / Távollét (FSM) / Készségek. Új `hr.manage` perm. Új store-mezők: `employees`, `absences`, `assignments`, `timeLogs`, `hrSeq`/`absSeq`/`asgSeq`/`tlSeq`. LS_KEY `jt_sim_v52`, seed `v: 35`. Korábbi: **Reklamáció világ** (3.30): új `service` világ (rose akcent), az átadás utáni hurok. 3 jegytípus (garancia / hiánypótlás / karbantartás), FSM `bejelentve → kivizsgálás → ütemezve → javítás → ellenőrzés → lezárva` (+ elutasítva, rework-hurok), `setTicketStatus` validált átmenet. 4 csatorna: webshop önkiszolgáló, belső felvétel, Logisztika `reklamáció` ág → auto-jegy (`createTicketFromShipment`), átadási hiánylista (`createTicketFromDefect`). Prioritás + SLA (nap), garancia-idő az átadástól + lejárat (`ServiceEngine`). Megoldási módok bekötve: helyszíni → Logisztika fuvar, csere → gyártási rendelés, behúzás → visszáru-fuvar. B2B kiadás (`handshakes` kind:service), webshop bejelentő + 4 lépéses követés. Nézetek: Áttekintés / Bejelentések / Tábla. Új store-mezők: `serviceTickets`, `svcSeq`. LS_KEY `jt_sim_v51`, seed `v: 34`. Korábbi: **Kontrolling világ** (3.29)._Új tétel” / soronkénti Szerkesztés / Archiválás): forrás-soronként kind-váltó (külső szállító datalist / külső munka partner-select / belső egység FACILITIES-select) + ár/átfutás, gyűjtő-kapcsoló + tag-választó, raktári tétel-link. (2) **internal_unit → B2B kézfogás-lánc**: belső egységtől igényelt tétel PO helyett `internal_order` kézfogásként adható ki (`delegateReqToInternalUnit` → `handshakes[kind:"internal_order"]`, status `sent→accepted→done`; req-státusz `Delegated→Fulfilled`); új `fac-lakatos` FACILITIES-egység. (3) **Gyűjtő robbantása**: `requisitionFromProc` egy `group` tételre multi-soros igényt hoz létre (tagonként egy sor, előtöltött szállítóval). Új store-akciók: `delegateReqToInternalUnit`/`acceptInternalOrder`/`completeInternalOrder`/`declineInternalOrder`/`internalOrders`/`internalOrderForReq`. Új req-státuszok + `IO_STATUS` tónus-térkép (`data-procurement2.js`). Nincs séma-bump (LS_KEY `jt_sim_v47`, seed `v: 30`). Korábban: **Cikkszám-életciklus + Törzsadat világ** (3.25): a katalógus-tétel `status` FSM-et kapott (`draft → review → active`, mellék `incomplete`/`rejected`/`archived`); új **Törzsadat** (`masterdata`) világ a governance-otthon (Cikkszámok + Jóváhagyások), `catalog.approve` jog, `addCatalogDraft`/`setCatalogStatus`/`catalogCompleteness`/`sellableCatalog`; a fogyasztói kapuk (ajánlat ItemBuilder, webshop) CSAK `active` tételt látnak. Korábban: **Tervezési anyag = a katalógus az egyetlen forrás** (3.24). Korábban: **Beszerzési katalógus külön a globális katalógustól** (3.23). Korábban: variáns-csoport a listában + variáns-aware megfeleltetés/beszerzés (3.22b), variánskezelés-mag (3.22)_

---

## 1. Mi ez a projekt?

Egy **kattintható, valóban interaktív** prototípus, ami egy asztalosipari cég teljes ügymenetét modellezi: ajánlattól a gyártáson át a beszerzésig és a kiszállításig. A hangsúly:

- **Mobil-első, egykezes használat** — alsó navigáció, alulról nyíló panelek, hüvelykujj-zónás vezérlők.
- **Valós, állapotvezérelt működés API-k nélkül** — a műveletek tényleg átgyűrűznek a modulok között (pl. ajánlat elfogadása → rendelés jön létre → gyártásba adás csökkenti a készletet).
- **Komponens-alapú, újrafelhasználható** felépítés, „Redux-szerű" központi store-ral (külső könyvtár nélkül).

---

## 2. Architektúra

### 2.1 Központi store — `app-store.jsx`
A teljes alkalmazás **egyetlen igazságforrása**. Megvalósítás: globális observable (`window.sim`) + React kötés `useSyncExternalStore`-ral (`window.useSim()`).

- **Immutábilis frissítések** — minden akció új állapotfát ad vissza.
- **Akciók (reducer-szerű):** `approveQuote`, `releaseOrder`, `receivePO`, `createQuote`, `createPOsFromReqs`, `forwardQuote`, `placeCustomerOrder`, `addToCart`, `askAbout`, `saveDesignToCatalog`, raktár-akciók (`receiveToWarehouse`, `receiveAdhoc`, `whReassignLot`, `setWithdrawalStatus`, `createWithdrawal`, `addWhLocation`…), beszállítói megfeleltetés (`addSupplierMap`, `learnSupplierMap`, `resolveSupplierItem`), fiók- és jogosultság-akciók stb.
- **Megőrzés:** `localStorage` kulcs `jt_sim_v43` (séma-verzió emeléskor a régi mentés felülíródik; a `load()` `v >= 26`-tól fogad el).
- **Demó visszaállítás:** `window.sim.reset()` → kiinduló („seed") állapot.
- A seed a meglévő globális adat-konstansokból töltődik (`QUOTES`, `ORDERS`, `MATERIALS`), hogy ne legyen adat-duplikáció.

> **Miért nem valódi Redux?** A minta ugyanaz (egy állapotfa, immutábilis akciók, feliratkozás, persist), csak 0 kB könyvtárral. Éles rendszerben triviálisan átültethető Reduxra/Zustandra — ezt a fejlesztői átadásnál dokumentáljuk.

### 2.2 Belépési pont — `JoineryTech Portal.html`
- Betölti a `data-*.js` (klasszikus globálisok) majd a `*.jsx` (Babel) fájlokat — **a sorrend számít**.
- `App` komponens: routing (világ + képernyő), nyelvváltás, Tweaks panel, fiók-alapú világszűrés.
- Routing-ágak: **B2C fiók → teljes webshop**; **`shop` világ → portfólió webshop**; egyébként a belső shell (Home → világ → képernyő). A **`trade` (Kereskedelem) világ** a belső shellben, narancs akcenttel (3.15).

### 2.3 Modulok (fájlonként)
| Terület | Fájl(ok) |
|---|---|
| Adat (seed) | `data.js`, `data-extra.js`, `data-extra-2.js`, `data-worlds.js`, `data-procurement2.js`, `data-sales-detail.js` |
| Központi store | `app-store.jsx` |
| Közös UI / ikonok | `ui.jsx` |
| Home / shell | `page-home.jsx` |
| Mobil navigáció | `mobile-nav.jsx` |
| Üzenetek (Comm Hub) | `comm-hub.jsx` |
| Jogosultság / profilok | `portal.jsx` |
| Webshop (B2C) | `webshop.jsx` |
| Tétel-összeállító | `item-builder.jsx` |
| Tervezett bútor (tervezés→ajánlat) | `design-item-wizard.jsx` |
| Termék-összeállítás (BOM) | `assembly.jsx` |
| Értékesítés | `page-sales.jsx`, `page-sales-detail.jsx` |
| Rendelések | `page-orders.jsx` |
| Gyártás | `page-production.jsx`, `page-world-pages.jsx`, `page-workflow.jsx`, `page-flow.jsx` |
| Gyártás-előkészítés | `data-mfgprep.js`, `mfg-prep-engine.js`, `page-mfg-prep.jsx`, `page-outsource-settings.jsx` |
| **Kereskedelem (trade)** | `data-trade.js`, `page-trade.jsx`, `page-trade-2.jsx` |
| Belsőépítészet (interior) | `data-interior.js`, `page-interior.jsx`, `page-interior-2.jsx`, `page-interior-3.jsx` |
| Raktár / beszerzés | `page-rest.jsx`, `page-warehouse.jsx`, `page-warehouse-2.jsx`, `data-warehouse.js`, `page-procurement2.jsx`, `page-procurement1.jsx` |
| Beszállítói cikk-megfeleltetés | `page-suppliermap.jsx` |
| Üzem (shopfloor) | `page-workshop.jsx` (`WorkshopTerminal`) — a régi `page-shopfloor.jsx` (`ShopFloor` PIN-kioszk) **2026-06-13-án törölve** (lásd 2.4) |
| Beállítások / katalógus | `page-settings2.jsx`, `page-extras.jsx`, `page-extras-2.jsx` |
| Egyéb | `page-dashboard.jsx`, `page-design.jsx`, `page-login.jsx`, `tweaks-panel.jsx`, `image-slot.js` |

---

## 2.4 Halott területek / lánc-hézagok (audit — 2026-06-13)

> Auditáltuk, mely fejlesztés-közben keletkezett terület **nem került be az értékláncba** (se be-, se kimenő kapcsolat, vagy betöltve-de-nem-renderelve). A **fő értéklánc hézagmentes** (webshop→CRM→ajánlat→rendelés→gyártás→QA→logisztika→pénzügy→reklamáció); a holt zónák a periférián keletkeztek.

**A) Teljes szigetek / zsákutcák (beépült, de nem termel a láncba):**

1. **AI munkaterület (agents / skills / agentMemory / projekt system prompt) — ~~csak vázlat~~ → ✅ ÉL (2026-06-14)** — önálló `ai` világ (indigo) valós store-integrációval: `aiSkills`/`aiAgents`/`aiMemory`/`aiProjectPrompt` + teljes CRUD (`ai.manage` jog). 4 képernyő: Agent Kanban (`definialt→aktiv→varakozik→archivalt`) · Skill-ek · Memória (scope) · Playground. A sketch (`AI Agent Workspace Sketch.html`) **törölve**, valós modul váltja (`data-ai.js`, `page-ai.jsx`, `page-ai-2.jsx`).
2. **`brandContext()` — ~~híd a semmibe~~ → ✅ BEKÖTVE (2026-06-14)** — az AI Playground **`assembleSystemPrompt`** helpere a brandContext()-et a rendszer-prompt 1. rétegéként fűzi (cég → projekt → agent → skill → memória), és a **`window.claude.complete`** ténylegesen meghívja. Verifikálva: a válasz a brandContext küldetését, az agent szerepkörét és a memóriát (pl. árérzékeny → garanciát hangsúlyozni) is figyelembe veszi. A `brandContext()` többé nem 0-fogyasztós.
3. **Idő & jelenlét (attendance) — ~~kimeneti zsákutca~~ → ✅ BEKÖTVE (3.55)** — a `hrAttendanceToday()` (AttEngine) a jelenlét-modul mai be-/kijelentkezéseiből számol (bent lévők / ledolgozott óra / túlóra / bérköltség), és a HR-dashboard „Mai jelenlét" kártyája EZT mutatja (link a Jelenlét világba). A jelenlétnek immár van tényleges HR-fogyasztója. *(Projekt-szintű Kontrolling-bekötés a `timeLogs`-on marad — a napi jelenlét = rezsi-szintű HR-metrika.)*

**B) Orphan / legacy fájlok (betöltve volt, de nem renderelve):**

4. **`page-shopfloor.jsx` (`ShopFloor` PIN-kioszk)** — a `shopfloor` világ a `WorkshopTerminal`-t (page-workshop.jsx) tölti; a régi `ShopFloor` sehol nem renderelt. → ✅ **FELSZÁMOLVA 2026-06-13:** script-tag eltávolítva mindkét HTML-ből, `page-shopfloor.jsx` + `build/page-shopfloor.js` + `files.json`-bejegyzés törölve. *(A `SHOPFLOOR_MACHINES`/`SHOPFLOOR_QUEUE` konstansok a `data-worlds.js`-ben maradnak — a ProductionDashboard KPI és a `prodsched` PROD_STATIONS használja őket.)*
5. **`select-render-test.html`** — fejlesztői teszt-artifact, semmi nem hivatkozta. → ✅ **TÖRÖLVE 2026-06-13.**

**C) Félig bekötött (van belépés, de a lánc nem zár):**

6. **Karbantartás → Gyártásütemezés — ~~szakadás~~ → ✅ BEKÖTVE (2026-06-13)** — a stáció → eszköz (`asset.machineId`) → nyitott `downtime` híd (`_prodDownOn`/`prodDownMap`) él: a leállított gép-nap **kapacitása 0**, az oda ütemezett task ütközés (piros csíkozott cella + „tedd át!" + deep-link). ⚠️ **Gyökérok:** a forrás (`app-store.jsx` + `page-prodsched.jsx`) MÁR tartalmazta a teljes hidat, de a `build/app-store.js` és `build/page-prodsched.js` **ELAVULT** volt — a híd hozzáadása után sosem fordították újra, ezért a futó (build-alapú) app nem vette figyelembe. Az audit futásidőben helyes volt; a fix = **újrabuild + ?v bump** (`app-store.js?v=26`, `page-prodsched.js?v=2`). **Tanulság:** `.jsx` módosítás után a BUILD kötelező (CLAUDE.md) — érdemes időnként build↔forrás drift-ellenőrzés.
   - ✅ **Teljes build↔forrás drift-sweep lefutott (2026-06-13):** mind a **96 `.jsx`/`build` pár** összevetve (forrás Babel-transzform → substring-egyezés a buildben). Eredmény: a két elavult fájlon (`app-store.js`, `page-prodsched.js`) kívül **MINDEN build szinkronban** — nincs további néma drift, nincs hiányzó build.
7. **`calc`/`ready` rendelés-állapot — ~~csak UI-overlay~~ → ✅ PERZISZTÁLVA (2026-06-13)** — a calc/ready életciklus + az anyaglista-eredmény eddig csak a tranziens `window.orderFlow`-ban élt (frissítéskor elveszett), pedig a seed `o.status` már használt `calc`/`ready`-t. Most a UI-akció a store-t lépteti: **`startOrderCalc`** (draft→calc) + **`completeOrderCalc`** (calc→ready, az eredmény az **`o.calc`** mezőben). Verifikálva: a teljes `draft→calc→ready→released` lánc + az anyaglista perzisztál a localStorage-ba, túléli a kiadást. Additív mező → nincs LS-bump. Build: `app-store.js?v=28`, `page-flow.js?v=3`.

---

## 3. Elkészült funkciók

### 3.1 Mobil UX (kész, ellenőrzött)
- **Táblázat → kártya minta:** minden adatsűrű táblázat mobilon tömör, koppintható sorrá alakul, ami a meglévő részlet-panelt (SlideOver) nyitja. Érintett: Ajánlatok, Mozgások, Beszerzés (igények/számlák/egyeztetés), Partnerek, Katalógus, Audit napló stb.
- **Alsó navigáció** (`mobile-nav.jsx`) — világok közti váltás, aktív kiemelés.
- **Reszponzív padding/rácsok** minden oldalon; vízszintes kilógás megszüntetve.
- **SlideOver z-index javítás** — a részlet-panelek a menü fölé kerülnek, a láblécben biztonsági térköz (a gombok sosem takartak).

### 3.2 Comm Hub — egységes kommunikáció (`comm-hub.jsx`)
- A régi lebegő AI-buborék helyett **fejléc-gomb** + alulról nyíló panel (mobil bottom-sheet / asztali lebegő).
- Fülek: **Csapat** (belső üzenetek) és **Asszisztens** (szkriptelt AI).
- **Csatorna-integráció:** WhatsApp / Telegram / Messenger / e-mail — összekapcsolható, avatáron jelvény, szálban szinkron-jelzés.
- **Mellékletek:** üzenethez csatolható entitás (rendelés / ajánlat / gyártás / anyag).
- **Visszakérdés:** bármely entitásból `askAbout()` → a hub előtöltött szállal nyílik.
- **Rendszerüzenetek:** folyamat-események (pl. új rendelés, alacsony készlet) bekerülnek a hubba — Tweaks-ben kapcsolható.

### 3.3 Üzleti lánc (kész, ellenőrzött)
**Ajánlat → Rendelés → Gyártás → Készlet** valós átgyűrűzéssel:
- Ajánlat elfogadása + konvertálása → **új rendelés** a store-ban.
- Rendelés gyártásba adása → **gyártási tétel** jön létre, **csökken a készlet**, **mozgás** naplózódik, alacsony készletnél figyelmeztetés.
- Beszerzés bevételezése → **növeli a készletet** + mozgás.
- Minden állapot megőrződik; „Demó visszaállítása" gomb a Tweaks panelben.

### 3.4 Jogosultság-réteg & többszereplős modell (`portal.jsx`)
- **Fiókok:** belső munkatárs, B2B partner, viszonteladó, B2C ügyfél.
- Fiókonként **aktivált világok** (mely ablakokat látja) + **jogosultságok** (létrehozás, konvertálás, gyártásba adás, követés, továbbajánlás, hozzáférés-kezelés).
- **Profilváltó** a fejlécben; a Home csak az adott fiók világait mutatja.
- **Admin konfigurátor:** fiókonként ki/be kapcsolható ablakok és jogosultságok → a cég a saját ügymenetére szabhatja.
- **Jogosultságfüggő konvertálás:** ajánlat vázlatként indul; konvertálás csak megfelelő joggal, egyébként lezárt jelzés.
- **B2B2C továbbajánlás:** kapott ajánlat **árréssel** továbbajánlható → láncolt gyermek-ajánlat + rendszerüzenet.

### 3.5 Webshop / B2C portál (`webshop.jsx`)
- **Bolt:** portfólió-katalógus (kategória-szűrő, termékkártyák, kép helye), kosár, checkout.
- **Rendeléseim:** egyszerű állapot-idővonal (Beérkezett → Visszaigazolva → Gyártás alatt → Kész) + rendelés-összefoglaló + „Üzenet a cégnek" gomb.
- A webshop-rendelés a **közös pipeline-ba** kerül (belső csapat látja); az ügyfél egyszerűsített állapotot lát.
- **Routing:** B2C fióknak az egész app a webshop; cégeknek a `shop` világ a Home-on.

### 3.6 Tétel-összeállító (`item-builder.jsx`)
Újrafelhasználható, webshop-szerű „összekattintós" összeállító két helyen:
- **Ajánlat** (Értékesítés → „Új ajánlat"): saját cikkszámok + kész termékek közös keresőben.
- **Beszerzési igény** (Raktár → „Új igény"): szállítónként csoportosított katalógus.
- **Egyedi tétel és szolgáltatás** kézzel (név, nettó ár, mennyiség, egység, ÁFA: 0/5/18/27).
- **Tervezett bútor** (csak ajánlat-mód): lila belépő a katalógus tetején → `DesignItemWizard` (lásd 3.11), a kész tervezett tétel `custom: true` + `design{}` adattal kerül az ajánlat tételei közé („tervezett bútor" címke).
- Összegzés **nettó + ÁFA + bruttó** bontásban; mobilon alulról nyíló tétellista.
- **Koppintható, szerkeszthető tétel-sor** (`LineRow`/`LineEditDetail`): a Tételek listában bármely sorra koppintva lenyílik egy szerkesztő-panel — **megnevezés, egységár (nettó), egység, ÁFA-kulcs** helyben módosítható (`setLine`, immutábilis sor-frissítés). Ha a tétel **tervezett bútor** (`design{}`) vagy **konfiguráció** (`config{}`), a panel az olvasható kapcsolódó **részleteket** is mutatja (helyiség/méret/stílus/tervezési mélység, ill. kategória/stílus/műszaki/pontossági sáv — `DesignMeta`/`ConfigMeta`, a `config` ID-k a store-ból feloldva). A sor jobb szélén lenyíló jelző (chevron) + teal pötty ha van extra részlet.
- **Specifikáció módosítása + ár-újraszámítás** (a sor-panelből): **konfigurációs tétel** → **ugyanaz a `ConfigEvaluator` felület** ny:lik `editLine` proppal (nincs külön szerkesztő-komponens — egy felület, egy `window.SpecEngine.evaluateConfig` motor); szerkesztéskor a **kategória + sablon zárolt**, a **stílus / műszaki / db** cserélhető, a motor élőben újraszámol (korábbi→új ár-diff), mentéskor `onSave → setLine(price, config{styleId,techId,bandPct})`. Csak a cím/gomb felirat változik a belépési pont szerint, a logika nem ágazik szét. **Tervezett bútor** → ugyanaz a `DesignItemWizard` **előtölthető** (`initial` prop, `editMode`): a meglevő igény/stílus/mélység visszaíródik, a becslés újraszámol, mentéskor a sor a `buildLine()`-nal frissül. **Nem hoz létre új státuszt** — csak a sor-adatot írja.

### 3.7 Beszerzés — szállítónkénti bontás + rendelés→beszerzés
- A jóváhagyott igényekből **szállítónként külön megrendelés** generálódik (egy előnézeti lap mutatja a bontást). Kulcs-szabály: ahány szállító, annyi PO.
- A **beszerzési igények a store-ban** élnek (`requisitions`, seed `PR_REQUISITIONS`-ból) — a ReqTab innen olvas, akciók: `addRequisitions`, `updateRequisition`.
- **Rendelés → beszerzés:** a rendelés-nézet „Beszerzés indítása" gombja (`requisitionForOrder(orderId)`) kiszámolja az anyagszükségletet, amit lehet **kivesz a raktárból** (készletcsökkenés + „Kivét" mozgás), a hiányra pedig **Draft beszerzési igényt** hoz létre (szállítóval, az `orderRef`/`projectRef` linkkel) — ez a Beszerzés → Igénylések közé kerül, és onnan szállítónként PO-vá alakul.

### 3.8 Termék-összeállítás / BOM (`assembly.jsx`) — első verzió
- **Beágyazott fa:** Összeállítás → Szekrény → Alkatrész → Anyag / Vasalat / Megmunkálás.
- Egy tétel alatt több szekrény; egy összeállításban több tétel (Nappali, Konyha, 6 ajtó, lámpa…).
- **Közös konfiguráció függőséggel:** szín, korpusz, front, vasalat-márka → a BOM újraszámol; Soft-close csak Blummal.
- **BOM-összegzés** (mennyiségek felgörgetése), **szállító-választás** anyagsoronként, **megmunkálás saját/külső**.
- BOM-ból **beszerzési igény** → szállítónkénti megrendelés (becsatlakozik a 3.7-be).

---

## 3.9 ✅ Projektek modul — szakág-koordináció (kész)

> **Honnan jött:** a `USER_PROFILES.md` B3 felismeréséből — a belsőépítész **szakág-koordinátor**, és a **bútorbeépítés időpontja függ** más szakágak (víz / áram / szellőzés / gépészet) munkájától.

**Elkészült:** `page-projects.jsx` + store-bővítés. A **projekt** összefogó egység: bútor-**tételek** (rendeléshez köthető) + szakág-**függőségek**. A beépítés (`install`) csak akkor indítható, ha minden `blocksInstall` függőség `done` — különben lezárt jelzés. Lista (mobil kártya / desktop), detail SlideOver: tételek + szakág-függőség-idővonal (állítható státusz) + számított beépítés-készenlét sáv (mi blokkol, csúszás-kockázat). Szakág-felelősnek üzenet a Comm Hubon. Új `projects` világ (violet), a belső + viszonteladó fiókoknál aktív.

**Kapcsolatok:** projekt-tételből közvetlen **rendelés** hozható létre (`createOrderFromProjectItem`) → a közös pipeline-ba kerül, a tétel visszalinkelődik. **Ajánlat → projekt:** konvertáláskor (a `quote.convert` joggal) egy **kapcsolóval** projekt is generálható az elfogadott ajánlatból (`createProjectFromQuote`) — **mindig `draft` (vázlat)** állapotban jön létre, hogy a beépítés indítása előtt kiegészíthető legyen; a quote tételei lesznek a projekt tételei (az első a rendeléssel linkelve), alap szakág-függőségekkel; belsőépítész (reseller) / belső fióknál a kapcsoló alapból bekapcsolt. A projekt-detailban (vázlat/folyamatban) **szakág hozzáadható/törölhető/blokkoló-jelölhető** (`addDependency`/`removeDependency`/`setDependencyField`). Projekt **létrehozható az UI-ból** is (`createProject` + „Új projekt" lap). **Ütemezés nézet** (`ScheduleView`): nézetváltó (Kártyák / Ütemezés) — heti tengelyű idővonal „ma" jelölővel, projektenkénti sávval, a szakág-mérföldkövekkel a határidejükön, csúszás piros gyűrűvel. **D2 ügyfél-nézet:** a webshop portálon „Projektem" fül (csak ha a B2C ügyfélnek van projektje) — egyszerűsített állapot-idővonal (Tervezés → Készül → Beépítésre kész → Kész), ügyfél-barát szakág-összegzés (mi kész / mire várunk, belső zsargon nélkül), tartalom-lista, „Üzenet a tervezőnek".

### Állapotgépek (élesben, eszerint kezeld)
- **Projekt — `projects[].status`:** `draft → active → install → done` (mellék: `on_hold`). Átmenet: `setProjectStatus(id, status)` (install csak ha `projectInstallStatus().ready`).
- **Szakág-függőség — `dependencies[].status`:** `pending → scheduled → in_progress → done` (mellék: `blocked`). Átmenet: `setDependencyStatus(projectId, depId, status)`. Szakág (`trade`): `viz|aram|szellozes|gepeszet|butor`; `blocksInstall` jelöli a kötelezőt.
- **Számított:** `projectInstallStatus(project)` → `{ ready, blockedBy, atRisk, total, doneCount }`. Tónusok: `TRADE_META`, `PROJECT_STATUS_TONE`, `DEP_STATUS` (`page-projects.jsx`).

---

## 3.10 🟡 Projektmenedzsment hierarchia — SpaceOS modell (folyamatban)

> **Forrás:** `uploads/PROJECT_MANAGEMENT_MODEL-frontend-designes-v3.md`. A meglévő szakág-koordinációs projekt-modul (3.9) **kibővítése** egy teljes, skálafüggetlen projektmenedzsment-hierarchiává. **Nem Jira-klón** — a lényeg: a projekt **átmegy céghatárokon** (B2BHandshake).

**Hierarchia:** `Program → Projekt → Mérföldkő → Almérföldkő(opc.) → Epik → Task → Subtask`. Skálafüggetlen: A1 egyfős = `Projekt → Epik → Task`; A4 20+ fő = teljes lánc programmal. Az **Epik a kulcsegység** (FlowEpic) — önálló, lezárható munkacsomag, ami delegálható másik céghez.

**Mérföldkő vs. szakág-függőség:** a mérföldkő projekt-FÁZIS (Ajánlat→Felmérés→Gyártás→Beépítés→Átadás, tenant-specifikus sorrend = StageChain); a meglévő `dependencies[]` (víz/áram/szellőzés/gepészet) szakág-koordináció — **a kettő együtt él**, az új modell nem cseréli le.

### Állapotgépek (élesben, eszerint kezeld)
- **Epik — `epics[].status` (FSM):** `BACKLOG_READY → IN_DEV → IN_REVIEW → CLOSED_DONE` (mellék: `IN_REVIEW → CLOSED_BLOCKED`). Tiltott: fázis-ugrás, lezárt visszanyitása, `IN_DEV→BACKLOG_READY`. Tiltott gomb LEZÁRT (disabled+tooltip), nem rejtett. `CLOSED_BLOCKED`-nál indoklás kötelező. Átmenet: `setEpicStatus(projectId, epicId, status, opts)`. Tónus: `EPIC_TONE`.
- **B2BHandshake — `handshakes[]`:** `delegateEpic(projectId, epicId, partnerId)` → delegált epik mindkét cég nézetében; `acceptDelegation(...)` partner-oldal. Nem-platform partner → külső hivatkozás, kézi státusz.

### Store-integráció (terv)
```
sim.programs[]   (opc., A4)   sim.projects[].milestones[].subMilestones[].epics[].tasks[].subtasks[]   sim.handshakes[]
```
Új akciók: `setEpicStatus`, `delegateEpic`, `acceptDelegation`, `createMilestone`, `addEpic`, `addTask`. **LS_KEY emelés** a séma bővülésekor (`jt_sim_v6 → v7`).

### UX, amit modellezni kell
1. **Hierarchia-navigáció** breadcrumb-bal (`Program > Projekt > Mérföldkő > Epik`), kártya/lista váltás minden szinten, opcionális almérföldkő vizuálisan jelölt.
2. **Nézet-szétválás** 6 actor-típusra (manufacturer/supplier/dealer/installer/designer/client) — ugyanaz az URL, más szelet; profilváltóval tesztelhető.
3. **Kézfogás UX:** delegálás folyamata (epik → partner keresés → küldés → várakozás → visszajelzés); delegált epik kártyán „Külső partner végzi" + partner + státusz; beérkező delegáció elfogadás/visszautasítás.
4. **FSM szigor:** tiltott átmenet lezárt gomb + tooltip; `CLOSED_BLOCKED` indoklás kötelező.
5. **Skálafüggetlenség:** ugyanaz a UI kezeli a 3-mérföldköves egyfős és a programos, 50+ epikes komplex projektet.

---

## 3.11 ✅ Tervezett bútor — Tervezés → ajánlat (`design-item-wizard.jsx`)

> **Honnan jött:** az értékesítési folyamatba be kell kötni a **Tervezés világot** — egy ajánlat tétele lehet **egyedi tervezésű** vagy **katalógus-alapú** bútor/összeállítás, és fordítva: a Tervezés világból **indítható egy tervezés, amiből ajánlat készül**.

**A Designes folyamat a gerinc:** `Igényfelmérés → Stílustervezés → Elrendezés → Műszaki tervezés → Gyártástervezés`.
- **Egy ajánlathoz NEM kell a teljes folyamat** — elég az **igény** és a **stílus** ismerete a becsléshez. Az *Elrendezés*, a *Műszaki* („ha bizonytalan megoldás / határeset") és a *Gyártás* („ha saját gyártás" → anyag/vasalat/megmunkálás levezetése) **opcionális mélység-kapcsolók**, amelyek **szűkítik a becslés ±% pontossági sávját**.
- **Stílus + elrendezés** adja a *funkciót* és a *felhasználható anyagokat*; a *műszaki* a megvalósíthatóság feltételeit; a *gyártás* a tényleges szükségleteket.

**Két kategória (kétirányú katalógus):**
- **Egyedi tervezés** — nulláról, szabad méret/anyag/funkció.
- **Katalógus bútor** — kiindulás egy `PARAM_TEMPLATES` sablonból vagy egy kész termékből (méret/ár előtöltés).
- A kész tervezett darab **visszamenthető a katalógusba** (`saveDesignToCatalog` → `products`-ba), és a jövőbeli ajánlatokban kiindulásként választható → a kör bezárul.

**5 lépéses varázsló:** `Típus → Igény → Stílus → Mélység → Ár`. Élő becslés (felület × anyagdíj-proxy × stílus-szorzó), szerkeszthető egységár pontossági sávval, db/ÁFA, opcionális katalógusba mentés.

**Két belépő (ugyanaz a komponens, `context` propon):**
- `context="quote"` — az **ajánlat ItemBuilder** tetején lila „Tervezett bútor hozzáadása" belépő; az eredmény az aktuális ajánlat tétele lesz (`onAdd(line)`).
- `context="design"` — a **Tervezés világ** irányítópultján „Tervezés indítása" → a varázsló végén **ügyfélválasztó** (`CustomerPickerDialog`) → **új ajánlat jön létre** (`createQuote`), Vázlat státuszban, sikerképernyővel.

**Store-kapcsolat:** új akció `saveDesignToCatalog({ name, price, cat, blurb })` → `products`-ba szúr (`P-2xx` id, `_design` jelölő), rendszerüzenettel; az ItemBuilder forrása (`page-sales` → `sim.products`) automatikusan felveszi. A tervezett tétel a meglévő `createQuote` láncon megy át — **nem új státusz**, a kvóta továbbra is `draft → sent → approved → converted`.

---

## 3.12 ✅ Katalógus — a közös adatforrás (`catalog-manager.jsx`)

> **A lényeg:** a katalógus a többi modul **közös törzsadata**. A Beállításokban definiálhatók **új katalógus-típusok** (kategóriák + saját mezősémával), és a Beszerzés, Raktár, Bolt, Tervezés, Értékesítés — és a Gyártás is — **ugyanazokból az adatokból dolgozik**. Nincs modulonkénti másolat. A **3.17-es refaktor** óta ez tartalmazza a korábban szétszórt `CATALOG_LOOKUP`, `HARDWARE_CATALOG` és `intCatProducts` adatokat is — lásd 3.17.

### Adatmodell (store, egyetlen igazságforrás)
- **`sim.catalog`** — a katalógus tételek lapos listája. Tételenként: `code`, `name`, `unit`, `cat` (kategórianév) + `categoryId`, `price`, **`suppliers[]`** (név / ár / `leadDays`), a kategória-séma szerinti **típusos tulajdonságok** (`props`), `tags[]`, **`shop{}`** (webshop-mezők), `active` jelző.
- **Láthatóság (3.17 óta):** `visibility` (`public | protected | private | world-only`) + `allowedWorlds[]` (world-only esetén) + `fieldVis{}` (mezőszintű felülírás) + `fieldAllowedWorlds{}` (mezőszintű world-only lista).
- **Világi kiterjesztések (3.17 óta):** `worldExt{}` — minden világ tetszőleges extra adatot fűzhet a tételhez (pl. `design.brands`, `interior.desc/color/typeId`).
- **`sim.catCategories`** — **hierarchikus** kategóriafa (`parentId`). Minden kategória **típusos mezőket** definiál: `text | number (+egység) | select | bool | date | color`. A gyermek-kategória **örökli** a szülők mezőit (`categoryFields(catId)` a teljes láncot feloldja). Ez a séma hajtja a **tétel-létrehozást és a boltot** is.
- **`sim.catTags`** — közös címke-készlet.

### Hol definiálható (Beállítások → Katalógus)
Két nézet: **Tételek** (lista / létrehozás / szerkesztés — a tétel örökli a kategória típusos mezőit, címkézhető, boltra jelölhető) és **Kategóriák** (hierarchikus fa; kategóriánként típusos mezők szerkesztése). **Új katalógus-típus = új kategória a saját mezősémájával.** Akciók: `addCategory` / `updateCategory` / `removeCategory`, `addCatalogItem` / `updateCatalogItem` / `archiveCatalogItem` / `restoreCatalogItem`, `addTag`, `setItemShop`, `setCatalogItemVisibility`, `setFieldVis`, `worldExtSet`.

### Ki használja ugyanazt az adatot
- **Értékesítés** (ajánlat ItemBuilder): a `sim.catalog` + `sim.products` a választható forrás.
- **Beszerzés** (igény ItemBuilder): `sim.catalog` **szállító szerint** csoportosítva; a tétel `suppliers[]`-e hajtja a **szállítónkénti PO-bontást**.
- **Raktár** (készlet / mozgások): a `materials` és a mozgások a katalógus **`code`-jaihoz** kötődnek.
- **Bolt** (webshop): `shopProducts()` = kurált `products` + a `shop.enabled`-re jelölt katalógus-tételek (termék-alakra képezve).
- **Tervezés**: az anyag-katalógus (`CATALOG_LOOKUP` / `MATERIALS`) táplálja a parametrikus sablonokat és a Tervezett bútor varázsló stílus-anyagait; a katalógusba mentett tervek (`saveDesignToCatalog` → `products`) visszatérnek az ajánlat-forrásba.
- **Gyártás**: a szükségletek (anyag / vasalat / megmunkálás) **ugyanezekre a katalógus-tételekre / `code`-okra** oldódnak fel — a BOM anyagsorai és a Tervezett bútor gyártástervezése is innen származtatja az igényt.
- **Belsőépítészet**: `worldExt.interior` mezőt hordozó tételek — levezetett `intCatProducts` a `getState()`-ből (backward compat, 3.17 óta).

**Összefüggés:** minden modul a `window.sim` katalógus-adatát olvassa/írja — egy helyütt adatdefiníció (Beállítások), széles felhasználás (Beszerzés → Raktár → Értékesítés/Bolt → Tervezés → Gyártás).

---

## 3.13 ✅ Specifikációk — moduláris stílus/műszaki sémák + kiértékelő ármotor

> **Honnan jött:** a tervezés során létrejön egy információ-halmaz, ami **egy vagy több termékre is érvényes** (stílus + műszaki paraméterek), és **bővíthető** legyen. Cél: a kötelezőkön túl tetszőleges propertikkel rendelhető stílus- és műszaki-sémák, **ár-szorzókkal**; üres, parametrikus sablonok; és egy **ármotor**, ami stílus + műszaki + behúzott sablonokból árat ad az ajánlatba.

**Fájlok:** `data-specs.js` (törzsadat), `specs-engine.js` (`window.SpecEngine`), `page-specs.jsx` (kategóriák/stílus/műszaki UI), `page-specs-schema.jsx` (kategória + mezőséma szerkesztő), `config-evaluator.jsx` (ajánlat-kiértékelő).

### Moduláris, bővíthető modell (3 réteg)
- **Spec-kategória** (`specCategories[]`, pl. Szekrény / Ajtó / Falpanel — a **felhasználó bővítheti**): saját **mezősémát** ad külön a **Stílushoz** (`styleFields[]`) és a **Műszakihoz** (`techFields[]`), és **osztályozza a sablonokat** (`template.categoryId`) → ez hajtja a szűrést és az alkalmazhatóságot. *Más kötelező egy szekrénynél, mint egy ajtónál* — ezért kategória-szintűek a sémák. Ikon + akcentszín választható.
- **Mező (property):** `{ key, label, kind, required, options[], … }`. Típusok: `select`, **`list` (több érték egyszerre)**, `material` (anyag-slot), `number`, `bool`, `color`, `text`. **Minden opció ár-módosítót hordozhat:** `mult` (×szorzó) **és/vagy** `add` (+fix felár). `bool` esetén `onTrue:{mult,add}`. Két speciális műszaki **szerep**: `role:"hardwareBrand"` (a vasalat-árat választja a katalógusból) és `role:"precision"` (tűrés-sáv).
- **Stílus / Műszaki példány** (`styles[]`, `techSpecs[]`): egy kategória sémája szerint kitöltött érték-halmaz. Státusz: `active ↔ archived`.

### Üres, parametrikus sablonok
A `PARAM_TEMPLATES` elemei már **geometria + szükséges vasalatok + munka/szállítás**, az **anyag mindig a stílusból** jön (anyag-slot kitöltés). Új mezők: `categoryId`, `hardware:[{id,qty}]` (a `HARDWARE_CATALOG`-ra), `laborHours`, `deliveryDays`. Az anyag-változókat leválasztottuk: a sablon `{slot}` tokent használ, amit a stílus tölt ki.

### Ármotor — `specs-engine.js` (`evaluateConfig`)
Sablononként: **`alap` = anyag (terület×ár, `MATERIAL_PRICE`, +12% kihozatal) + vasalat (db × `HARDWARE_CATALOG[brand]` a műszaki márkája szerint) + munkadíj (`laborHours × LABOR_RATE`)**. Majd a módosítók **mindig az alapra** hatnak, **nem kumulatívan**: `alap×(Σszorzó−1) + Σfelár` — külön a stílusra és a műszakira (`styleAdd`, `techAdd`). A **pontosság** egyszerre **ár-szorzó** (precíz ×1.15 / standard ×1.0 / durva ×0.95, `PRECISION_BANDS`) **és** a becslés **±%-os sávja** (`band`). Eredmény: `net`, `low`/`high` (±%), `laborHours`, `deliveryDays`, soronkénti bontás. *(Hitelesített számítás: ~67 248 Ft nettó egy Szekrény-mintára.)*

### Ajánlatba kötés — `config-evaluator.jsx`
Az ItemBuilderben (csak ajánlat-mód) új **teal „Konfiguráció hozzáadása"** belépő → fullscreen kiértékelő: **kategória → stílus + műszaki → sablonok behúzása (db-lépő)**. Jobb oldali ár-pane élőben: becsült ár + sáv + munka/szállítás + soronkénti bontás (Anyag / Vasalat / Munkadíj / Stílus mód. / Műszaki mód. / Egységár). „Ajánlatba" → minden behúzott sablon külön tételként az ajánlatba (`onAdd`, `config{}` referenciával). Mobil: alulról `safe-area` térköz, reszponzív rács.

### Megjelenés a Tervezésben
*Sablon szerkesztő* tetején „Alkalmazható specifikáció" sáv (a sablon kategóriája + az aktív stílus/műszaki); *Áttekintés* népszerű-sablon listáján stílus/műszaki jelvény (kategória szerint); *Áttekintés* alján „Specifikációk" belépő-kártya. Belépő: Tervezés világ → **„Specifikációk"** képernyő, fülek: **Kategóriák / Stílusok / Műszaki** + kategória-szűrő + Archiváltak kapcsoló.

### Állapotgép + store (élesben eszerint kezeld)
- **Stílus/műszaki példány — `status`:** `active ↔ archived` (egyszerű lánc). Tónus: `SPEC_STATUS_TONE`, akcentek: `SPEC_ACCENT` (`data-specs.js`).
- **Store-akciók — kategória:** `addSpecCategory`, `updateSpecCategory`, `removeSpecCategory`, `setSpecCategoryFields(id, "styleFields"|"techFields", fields)`, `findSpecCategory`. **Példány (kind=`"style"`|`"tech"`):** `addSpecInstance`, `updateSpecInstance`, `setSpecInstanceStatus`, `duplicateSpecInstance`, `removeSpecInstance`; lekérdezés `stylesFor(catId)`, `techSpecsFor(catId)`, `findSpec(kind,id)`.
- **⚠️ Névütközés-tanulság:** a spec-kategória akciókat **`*SpecCategory`-re** kellett nevezni, mert a **katalóguskezelő** már használ `addCategory/updateCategory/removeCategory`-t (`catCategories`) — az azonos nevek az `api` objektumban felülírták egymást és **megakasztották a betöltést**. Új store-mezők: `specCategories[]`, `styles[]`, `techSpecs[]` (seed `SPEC_CATEGORIES_SEED`/`STYLES_SEED`/`TECHSPECS_SEED`). **LS_KEY `jt_sim_v18`, seed `v: 12`** (a `load()` verzió-gate is `12`-re emelve).
- **Betöltési sorrend:** `data-specs.js` + `specs-engine.js` a `data-worlds.js` után, a jsx-ek előtt; `page-specs-schema.jsx` a `page-specs.jsx` előtt; `config-evaluator.jsx` a `design-item-wizard.jsx` után.

---

## 3.14 ✅ Gyártás-előkészítés — szükséglet-levezetés + bérmunka (`page-mfg-prep.jsx`)

> **Honnan jött:** a gyártás projektek információit a **gyártás-előkészítésnek** kell meghatároznia: a megrendelt tételekből (bútor / ajtó / falpanel konfiguráció) levezetni az anyagszükségletet, a sablonok alapján a szabászatot, a vasalatszükségletet, a munkaidőt a részlegek termelékenységi adatai szerint — és lehessen **folyamat-elemeket bérmunkára kiadni** (teljes szabászat, élzárás, festés, CNC) kijelölt partnernek.

**Fájlok:** `data-mfgprep.js` (részleg-termelékenység, bérmunka-műveletek, kategória-térkép, tónusok), `mfg-prep-engine.js` (`window.MfgPrep` levezető motor), `page-mfg-prep.jsx` (lista + teljes képernyős munkalap).

**Egy motor, egy igazságforrás:** a levezetés a meglévő `window.SpecEngine`-re épül (nem duplikál árlogikát). Bemenet a SPEC-rendszer: **kategória → stílus + műszaki + parametrikus sablon**. Ha a tétel hordoz `config{}`-ot, azt használja; egyébként **elem-kategória → spec-kategória + alap-sablon** (`MFG_ELEM_TO_SPECCAT`, `MFG_SPECCAT_TEMPLATES`), az aktív stílus/műszaki példánnyal, a tétel értékéből becsült darabszámmal.

### Levezetett kimenetek (`MfgPrep.derive(project)`)
- **Anyagszükséglet:** lapanyag m² (tételenként ×db, +12% kihozatal) → **táblaszám** (2800×2070 mm tábla / 82% hasznosítás), **készlet-fedezet** jelzés (`MFG_COVER_TONE`: ok / partial / short a raktári `onHand` vs. tábla alapján).
- **Szabászat:** a sablon alkatrészeiből **rész-szintű vágólista** (alkatrész, méret, db, anyagkód, élhossz) + **egyszerű nesting-előnézet** (shelf-packing SVG, a domináns anyag első tábláján, a meglévő nesting-stílusban).
- **Vasalat:** a sablonok vasalat-listájából aggregálva, **a műszaki márkája szerinti** `HARDWARE_CATALOG`-ár.
- **Munkaidő részlegenként:** `MFG_DEPARTMENTS` (Szabászat / Élzárás / CNC / Összeszerelés / Felületkezelés / QC) — **termelékenységi norma** (óra/alkatrész, óra/fm, óra/furat, óra/egység, óra/m²) × mennyiség → óra; **nettó napi kapacitás = kapacitás × hatékonyság** → átfutás (nap) + munkadíj (`LABOR_RATE`).

### Bérmunka-kiadás — B2BHandshake (nem új státusz!)
- **Szerkeszthető típusok** — Beállítások → Munkafolyamat → **„Bérmunka"** szegmens (`page-outsource-settings.jsx`, `OutsourceSettings`). A típusok a `sim.outsourceOps[]` store-ban élnek (seed: `MFG_OUTSOURCE_OPS`); új típus felvehető / átnevezhető / törölhető, állítható az **ikon**, a **részleg/op-kulcs** (innen jön a munkaidő-norma), az **epik-keresőszó** (regex a folyamat-epik címére) és a **partner-kategóriák**. Store-akciók: `addOutsourceOp / updateOutsourceOp / removeOutsourceOp`.
- **Összevont (csomag) kiadás** — a Bérmunka fül **többszörös kijelölést** ad: bejelölsz több műveletet (vagy „**Teljes folyamat**" gombbal mindet), és a kiadó csak azokat a partnereket kínálja, akik **mindet vállalják** (`partnersForOps` — a partner `capabilities[]` képességlistája szerint, pl. szabászat+élzárás a „Profi Lapszabász Kft."-nek, a teljes lánc a „Komplett Bútorüzem Zrt."-nek). Egy kézfogás jön létre, ami az összes érintett epiket lefedi.
- **Részletes infócsomag** — kiadás előtt látható és a kézfogásba mentődik a `payload`: alkatrész-, tábla-, élzárás- (fm), felület- (m²) mennyiség, **műveletenkénti munkaóra + nap**, anyag- és vasalat-lista, becsült díj + szabad szöveges **megjegyzés** a partnernek.
- Store-akció: **`delegateOutsource(projectId, opIds[], partnerId, note)`** → megkeresi az op-okhoz tartozó folyamat-epikeket, **delegálja** (`delegateEpic`) és egy **csomag-kézfogást** ír (`handshakes[]`: `bundle:true`, `epicIds[]`, `opLabels[]`, `payload{}`, `note`). Epik / folyamat hiányában a sor **LEZÁRT** (nem rejtett).
- **Mobil:** a kijelölő lista végig kattintható marad — egy bejelölés csak egy **kompakt lebegő sávot** mutat (N művelet + hány partner vállalja + „Kiadás"); a részletek (csomag-előnézet, partnerválasztó, jegyzet) egy **alulról nyíló lapon** (`DispatchSheet`, `safe-area` térközzel), így több művelet is kijelölhető a megnyitás előtt.

### Belépők + store
- **Gyártás világ → új „Előkészítés" képernyő** (`screen: "prep"`, `data-worlds.js`) — lista a gyártási projektekről **és** a kiadott (`released`) rendelésekről (rendelés → pszeudo-projekt, ott a bérmunka kapuzva: előbb gyártási alprojekt kell).
- **Gyártási projekt kártya** (`page-manufacturing-projects.jsx`) → „Gyártás-előkészítés" gomb → ugyanaz a `MfgPrepWorkspace`.
- Store-akció **`generatePrep(projectId)`** snapshotot tesz a projektre (`project.prep`) + **rendszerüzenetet** küld a Comm Hubba (`postSystem`). A `prep` mező a meglévő projekt-objektumon él → **nem kellett LS_KEY-emelés**.

### Hátralévő (lehetséges) bővítés
- Bérmunka **beszerzési PO-ágon** is (most B2BHandshake-en, csomagolt kiadással).
- A partner-oldali **elfogadás/visszajelzés** folyamatának kibontása a csomag-kézfogásra (`acceptDelegation` már létezik az epik-szinten).
- Nesting valódi optimalizálóval (most shelf-packing előnézet); több táblás vizualizáció.

---

## 3.15 ✅ Kereskedelem világ — pultos eladás, lapszabászat-árazás, árrés-motor (`page-trade*.jsx`)

> **Honnan jött:** hiányzott egy **kereskedelmet célzó világ** lapszabászoknak (C1), vasalat-boltoknak (C2) és design-üzleteknek. A kereskedelem a 3. árazási szektor: nem önköltség×szorzó gyártói modell, hanem **beszerzési ár → markup → eladási ár**. A lapszabászatnak külön kérés volt a **technológiai paraméterek szerinti szolgáltatás-árazás** és a **Gyártás-előkészítésből importált** árazási adat.

**Fájlok:** `data-trade.js` (kategóriák, bolti katalógus+készlet, szolgáltatás-árlista, eladások, szabás-rendelések seed + `window.TradeEngine` számoló motor), `page-trade.jsx` (Áttekintés dashboard + Pult), `page-trade-2.jsx` (Lapszabászat FSM + Árrés-motor + Szolgáltatás-árazás). Akcent: **orange** (`page-home.jsx` `ACCENT_MAP`, `storefront` ikon `ui.jsx` + `WorldIcon`). LS_KEY-emelés `jt_sim_v28` (seed `v: 21`).

### Négy képernyő (`data-worlds.js` → `trade`)
- **Áttekintés** — napi forgalom (nettó/bruttó), átlag árrés + fedezet, tranzakciószám, nyitott szabás-rendelések; árrés kategóriánként, top termékek (forgalom), alacsony készlet, mai eladások.
- **Pult (counter sale)** — katalógusból összekattintható, **készlet-tudatos** kosár (elfogyott = letiltva), kategória-szűrő + kereső, nettó/ÁFA/bruttó + **belső fedezet** kijelzés, gyors szolgáltatás-gombok. Fizetés → **`tradeCheckout`**: eladás rögzül, **készlet csökken + mozgás keletkezik** (átgyűrűzik a Raktárba), alacsony készletnél rendszerüzenet. Mobilon alulról nyíló kosár-sheet (`safe-area`).
- **Lapszabászat** — bejövő szabás-rendelések **saját FSM-mel** (lásd lent) + paraméteres **szabás-rendelő építő**.
- **Árrés-motor** — három fül: **Kategóriák** (markup ↔ árrés szinkron), **Tételek** (tétel-szintű beszerzési ár + markup-felülírás), **Szolgáltatás-árazás** (lásd lent).

### Árazás — markup ≠ árrés (`window.TradeEngine`)
- **markup** = eladási/beszerzési (×szorzó a beszerzésre); **árrés %** = haszon/eladás (= 1 − 1/markup). A UI **mindkettőt** mutatja és szinkronban tartja, hogy a keverés-hiba ne fordulhasson elő. Kategóriánkénti alap-markup (iparági sávokkal: lap 1,2–1,35× … dekor 2,0–5,0×), tételenként felülírható. Store-akciók: `setTradeMarkup / setTradeMargin / setTradeProductMarkup / setTradeProductCost`.

### Paraméteres lapszabászat-árazás (a kérés magja)
- **Szabás kétféleképp:** **fix tábla-ár** (Ft/tábla átalány) **vagy** **kalkulált folyóméter** (Ft/fm × a vágáslista kerületeiből számolt vágáshossz) — kapcsolóval váltható.
- **Élzárás technológiai paraméterekkel:** **vastagság** (0,8 / 2 mm) × **szélesség** (23 / 28 / 42 mm) × **ragasztás** (hagyományos EVA / PU) → ezek **szorzóként** hatnak az alap Ft/fm díjra (`TradeEngine.edgeRate`). Minden kombinációhoz **konkrét Ft/fm felülírás** is megadható (`edgeOverrides`, „egyedi" felülírja a szorzós alapot). Az élzárás/szabás díja **a lapanyag eladási árához adódik** az árajánlatban (külön összegző sorokkal).
- **Szolgáltatás-árazás fül** — itt szerkeszthető minden díj: két szabás-mód, élzárás alap Ft/fm + a három szorzó-dimenzió + a teljes **ár-mátrix** (számított / egyedi Ft/fm / érvényes oszlopok), továbbá furat / CNC / kiszállítás. Store-akciók: `setCutRate / setEdgeBase / setEdgeParamMult / setEdgeOverride / setTradeExtraRate`.
- **Előkészítésből import** — a szabás-rendelő építőben egy gyártási projekt választható; a **`window.MfgPrep.derive(project)`** levezetett adatai (táblaszám, vágáslista, élhossz fm) betöltődnek, a szabás folyóméter-módra vált. A domináns lapanyag név alapján párosul a bolti termékkel.

### Szabás-rendelés FSM (`data-trade.js` → `CUTTING_FLOW`)
`inquiry → quoted → accepted → ready → handed` (mellék: `quoted/inquiry → rejected`, indoklás kötelező). A tiltott átmenetek **LEZÁRT** gombként jelennek meg (nem rejtve). Átmenet: **`setCuttingStatus(id, status, opts)`** — validált FSM + rendszerüzenet. Új rendelés: **`addCuttingOrder`**. Tónusok: `CUTTING_TONE`.

### Fiók-aktiválás
- **`acc-internal`** (belső admin) — `trade` világ a többivel.
- **`acc-supplier`** (Profi Lapszabász Kft., C1) — `["trade", "production", "projects"]`: a **Gyártás világ is aktív**, így az Előkészítés adja az árazási infót az importhoz.
- Tweaks-ből ki/be kapcsolható (`enabledModules` + `RootTweaks` modul-lista).

### Hátralévő (lehetséges) bővítés
- **Vevő-szegmens (perszóna) szerinti árszint** a kereskedelemben is (mint a belsőépítészetnél a partner-kedvezmény) — most kategória-szintű az árazás.
- Import lapanyag-párosítás **kézi választással**, ha a projekt anyaga nincs a bolti katalógusban.
- Pultos eladás **sztornó / visszatérítés** ág (`TRADE_SALE_TONE` már tartalmazza a void/refunded tónust).

---

## 3.16 ✅ Belsőépítészet világ — díjazás-modell (kereskedelmi logika megszüntetve)

> **Honnan jött:** a belsőépítész **nem terméket ad el** árréssel — a saját **tervezési (szellemi) díját** számolja fel. A világból ezért kivettük a kereskedelmi logikát (eladási ár, típus-margin, partner-kedvezmény, tételes árazott ajánlat), és a helyére egy **díjazás-modell** + **információs katalógus** került.

**Fájlok:** `data-interior.js` (seed + helperek + tónusok), `app-store.jsx` (akciók), `page-interior.jsx` (Helyiségek + új **Díjazás** fül), `page-interior-3.jsx` (információs katalógus + tervezett tételek terv-lista). **LS_KEY `jt_sim_v29`, seed `v: 22`.**

### Díjazás — a tervező maga határozza meg (4 mód)
- **Koncepció-szintű `fee{}`** mező: `{ method, m2Rate, hours, hourlyRate, valuePct, flatAmount }`. Négy mód (`FEE_METHODS`, `FEE_METHOD_ORDER`): **`m2`** (Ft/m² × alapterület), **`hourly`** (Ft/óra × becsült órák), **`value`** (a helyiségek **összértékének** %-a), **`flat`** (fix átalány). Default: `FEE_DEFAULT`.
- **Helperek (`data-interior.js`):** `conceptArea` (megadott vagy helyiségekből számolt alapterület), `conceptProjectValue` (a helyiségek becsült kivitelezési **összértéke** — az érték-arányos díj alapja), `conceptFeeAmount` (a kiszámolt díj), `conceptFeeBasis` (ember-olvasható képlet), `feeMethodLabel`.
- **Díjazás fül** (`FeeTab`, `page-interior.jsx`): mód-választó (4 kártya) → a választott módhoz illő paraméterek → élő **Tervezési díj** összegző (+27% ÁFA jelzés) + díj-ajánlat indító.
- **Helyiségek fül** szerkeszthető lett (`RoomsTab`/`RoomRow`): helyiségenkénti **alapterület (m²)** + **becsült kivitelezési érték (Ft)** — ez utóbbi az érték-arányos díj alapja. Akciók: `addConceptRoom`, `updateConceptRoom`, `removeConceptRoom`.

### Sales-híd — díj-ajánlatként (nem tételes ajánlat)
- **`createQuoteFromConcept(conceptId)`** átírva: **egyetlen díj-tételsort** hoz létre ("Belsőépítészeti tervezési díj — {mód} ({képlet})", 27% ÁFA) a kiszámolt összeggel, a meglévő `createQuote` láncon (kvóta-FSM változatlan: `draft → sent → approved → converted`). Jogosultság-kapuzott (`quote.create`) + ready-gate (nem brief) + díj>0 gate; egyébként a gomb **LEZÁRT** (disabled+tooltip).

### Katalógus — kereskedelmi → információs (alkotás-támogató)
- **Megszűnt:** eladási ár (`price`), típus-margin (`marginPct`), partner-kedvezmény fül + `PartnerCard`/`PartnerEditor` (a `partnerPricing` adat + store-akciók **megmaradtak** a Kereskedelem világnak — csak a belsőépítészet UI-ból tűntek el).
- **Új termék-mezők:** `purchasePrice` (beszerzési ár), `source` (beszerzési forrás), `notes` (megjegyzés), `visibility` (**`private | protected | public`**, `INT_VISIBILITY`/`INT_VIS_ORDER`). A táblázat beszerzési forrást + árat + láthatóság-pirulát mutat; **védett** tételnél a beszerzési ár rejtett.
- **Láthatóság = megosztás alapja:** `public` = közös törzsadat, minden világ látja (pl. **Egger Halifax tölgy**, `ip-100`); `protected` = partnerek látják, ár nélkül; `private` = csak a saját cég. `intCatalogForBuilder()` ezért csak a nem-privát tételeket adja át (beszerzési ár önköltség-alapként, eladási ár 0).
- **Akciók:** `addIntProduct`/`updateIntProduct` az új mezőkkel; `addIntType` margin nélkül.

### Tervezett tételek — terv-lista, ár nélkül
- A `ConceptQuoteTab` (Tervezett tételek fül) **ár nélküli terv-listává** vált, **helyiségenként csoportosítva**. A tétel-sor (`QuoteLineRow`) csak helyiség + mennyiség + megjegyzés (nincs egységár/összeg). `addConceptItem`/seed tételek ár-mezők (`cost`/`unitPrice`) nélkül. A díj **külön** számolódik a Díjazás fülön.

### Állapot (élesben eszerint kezeld)
- A koncepció-FSM (`CONCEPT_FLOW`) **változatlan**: `brief → concept → review → approved` stb. A díjazás **nem státusz**, hanem a koncepció `fee{}` adata; a díj-ajánlat a meglévő kvóta-láncba köt.
- **Tónusok/konstansok új:** `FEE_METHODS`, `INT_VISIBILITY`. Új státusz-megjelenítésnél ezeket bővítsd.

---

## 3.17 ✅ Központi katalógus refaktor — láthatóság + mezőszintű láthatóság + bridge-ek

> **Honnan jött:** a katalógus-adat korabel időkben szétszórt volt: `CATALOG_LOOKUP` (`data-worlds.js`) a tervezéshez, `HARDWARE_CATALOG` (`data-specs.js`) a vasalatokhoz, `intCatProducts` a belsőépítészeti katalogushoz. Cél: **egyetlen `sim.catalog`**, ahol minden tételnek van láthatósági szintje, mezőszintű korlátozása és világ-specifikus kiterjesztése.

**Fájlok:** `app-store.jsx` (adatmodell, bridge-ek, új akciók), `catalog-manager.jsx` (UI frissítés).

### 4 szintű tétel-láthatóság
| Szint | Belső világok | B2B partnerek | Webshop vevő |
|---|---|---|---|
| `public` | ✅ mind | ✅ mind | ✅ igen |
| `protected` | ✅ mind | ✅ (engedélyezett) | ❌ nem |
| `private` | ✅ mind | ❌ nem | ❌ nem |
| `world-only` | ✅ csak `allowedWorlds[]` | ❌ nem | ❌ nem |

### Mezőszintű láthatóság (`fieldVis` + `fieldAllowedWorlds`)
Egy tétel lehet `public` (minden világ látja), de egyes mezői külön szinten lehetnek:
- `fieldVis: { price: "world-only", supplier: "protected" }` — melyik szinten látható az adott mező
- `fieldAllowedWorlds: { price: ["procurement", "interior"] }` — world-only esetén pontosan melyik világok

**Kulcsszabály: ha egy világ nem fér hozzá egy mezőhöz, az nem jelenik meg a listájában** (nem maszkolás, hanem teljes kizárás).

Strippable mezők: `price`, `supplier`, `suppliers`, `props`.

### Világi kiterjesztések (`worldExt{}`)
Minden világ tetszőleges extra adatot fűzhet a tételhez:
- `worldExt.design.brands` — márka-szintű árak a vasalatokához (Blum/Hettich/GTV/Vegyes)
- `worldExt.interior.*` — belsőépítészeti leírás, szín, typeId, forrás

### Bridge-ek (backward compat)
Minden `emit()` után a `rebuildBridges()` automatikusan újraépíti:
- `window.CATALOG_LOOKUP` — a `props.t` mezőt hordozó lapanyag-tételekből
- `window.HARDWARE_CATALOG` — a `props.hardwareId` mezőt hordozó vasalat-tételekből
- `intCatProducts` — levezetett, memoizált a `getState()`-ben a `worldExt.interior`-t hordozó tételekből

Mindért a Tervezés/Specs motor, Belsőépítészet világ és az Ajánlatkészítő **változatlanul működnek** — csak az adatforrás lett központ.

### Új store-akciók
- `catalogForWorld(worldId)` — tételek szűrve a világ számára
- `catalogForWorldFields(worldId)` — tételek + csak a világ által látható mezők (stripFieldsForWorld)
- `catalogForPub()` — csak `public` tételek, `null` kontextussal stripelve (vevő/bolt)
- `setCatalogItemVisibility(id, visibility, allowedWorlds)` — tétel szintű láthatóság
- `setFieldVis(id, fieldVisPatch, fieldAllowedWorldsPatch)` — mezőszintű láthatóság
- `worldExtSet(id, worldId, patch)` — világi kiterjesztés frissítése
- `canSeeField(item, fieldKey, worldId)` — publikus helper az UI-komponenteknek

### Migralt adat (43 tétel)
| Forrás | Darab | Láthatóság |
|---|---|---|
| Eredeti catalog | 14 | private |
| `CATALOG_LOOKUP` lapanyagok (EG, MDF, HDF, tölgy, bükk) | 10 | world-only: design+production |
| `HARDWARE_CATALOG` vasalatok (csukó, fiók, felnyíló, polctartó, láb, ajtó) | 6 | world-only: design+production+procurement |
| `intCatProducts` belsőépítészeti tételek | 13 | public/protected/private |

### catalog-manager.jsx UI bővítések
- 4-szintű láthatóság-választó (kartélynézet) + `allowedWorlds` multi-select chip
- **Mezőszintű láthatóság — drag-drop bucket UI** (`CMFieldVisBuckets`): 5 vödör-oszlop (Nincs korlátozás + 4 láthatósági szint), minden mező (Ár, Szállító, Tulajdonságok, Szállítói lista) drag-and-drop chip; Világ-korlátozott vödörből kilépve világ-selector panel jelenik meg
- Világi kiterjesztések accordion — specializalt szerkesztők: hardware márkaárak, interior mezők, fallback JSON
- Láthatósági badge minden listäälelemen + láthatóság-szűrő gombsor

### Katalogús szerkesztés centrializálása (page-interior-3.jsx)
- A Belsőépítészet világ Katalógus füléről eltávolítva a termék-szerkesztő (IntProductEditor form, editProd SlideOver)
- Az „Új tétel” gomb helyén: **„Szerkesztés a Beállításokban →”** teal link (`window.navigateTo("settings", "catalog")`)
- Desktop sorokon fogaskerék → external link ikon; mobil koppintás → ugyana
- Típusok (intCatTypes) szerkesztése megmarad az interiorban (nem részei a central catalog-nak)
- **Elv:** minden világ tétel-szerkesztése a Beállítások → Katalógusba mutat; a világok csak böngészik/szűrik

### Egységes WorldCatalog minden világhoz (`catalog-world-view.jsx` — 3.17b)
- **Egyetlen katalogús-nézet komponens** (`WorldCatalog`): portal.html közvetlenül `<WorldCatalog worldId="..." />` hív — nincs DesignCatalog / InteriorCatalog wrapper
- `WORLD_CATALOG_CONFIG[worldId]`: title, subtitle, accent, pinnedFilters, **tabs** (opcionális)
- **`tabs` support:** ha a config definál tabokat, `WorldCatalog` maga rendereli a tab-sort; nem-catalog tabra váltva a `tab.render()` callback fut → pl. `window.InteriorTypesPanel`
- `InteriorTypesPanel` kinyerve `page-interior-3.jsx`-ből önálló komponensként, exportalva `window`-ba
- **Egyedi pinek** (`sim.worldCatalogPins[worldId][]`): `+` gombbal bármely világban egyedi pin adható (tag / kategória / láthatóság / fieldValue szűrőtípus); store akciók: `addWorldPin`, `removeWorldPin`, `reorderWorldPins`
- **⚠️ React Hooks tanulság:** **korai return hook előtt** → végtelen loop / crash. Minden `useState`/`useMemo` a komponens elejére, feltételes return csak utánuk. Részlet: `CLAUDE.md` → React Hooks szabaly ok.

### LS_KEY
`jt_sim_v32`, seed `v: 24`. A betöltés `v >= 24`-től fogad el; hiányzó `worldCatalogPins` null-check a `load()`-ban.

### Katalógus szerkesztés centrializálása (page-interior-3.jsx)
- A Belsőépítészet világ Katalógus füléről eltávolítva a termék-szerkesztő (IntProductEditor form, editProd SlideOver)
- Az „Új tétel” gomb helyén: **„Szerkesztés a Beállításokban →”** teal link (`window.navigateTo("settings", "catalog")`)
- Desktop sorokon fogaskerék → external link ikon; mobil koppintás → ugyana
- Típusok (intCatTypes) szerkesztése megmarad az interiorban (nem részei a central catalog-nak)
- **Elv:** minden világ tétel-szerkesztése a Beállítások → Katalógusba mutat; a világok csak böngészik/szűrik

### LS_KEY
`jt_sim_v31`, seed `v: 24`. A betöltés `v >= 23`-tól fogad el (korai refaktor verziók is futnak).

---

## 3.18 ✅ Raktár ↔ katalógus összehangolás — katalógus-alapú készletkezelés

> **Honnan jött:** a raktár és a katalógus két párhuzamos adatstruktúra volt (`sim.materials` vs. `sim.catalog`), laza névegyeztetéssel. A felhasználó a katalóguson keresztül akarta kezelni a készletet. Cél: **a katalógustétel a készlet definíciója**, a raktáradat egy világi kiterjesztés rajta.

**Fájlok:** `app-store.jsx` (új akciók + seed), `catalog-world-view.jsx` (`WarehouseStockTab`), `page-world-pages.jsx` (`WarehouseDashboard`), `page-rest.jsx` (Készlet fül → katalógus-nézet), `catalog-manager.jsx` (raktározás-kapcsoló + raktár mezők), `data-worlds.js` (Katalógus képernyő + warehouse config), `ui.jsx` (`archive`, `rotate` ikon), `JoineryTech Portal.html` (routing).

### Adatmodell — `worldExt.warehouse`
A „raktározott" állapot egyetlen mezőn múlik: `catalog[i].worldExt.warehouse = { onHand, min, location, reserved, trend, archived?, archivedAt? }`. Ennek megléte teszi a tételt készletként nyilvántartottá. A **`trend` számított** (`ok | low | critical`, onHand vs. min) — soha ne állítsd kézzel; az akciók újraszámolják.

### Store-akciók (mind a katalógusra hatnak — egyetlen igazságforrás)
- **`setWarehouseStock(id, patch)`** — készletadat frissítése (`onHand/min/location/reserved`) + trend újraszámítás.
- **`enableWarehouseStock(id)`** — BÁRMELY katalógustételt raktározottá tesz (láthatóságtól függetlenül); ha archivált volt, visszaállítja.
- **`archiveWarehouseStock(id)`** — **SOFT TÖRLÉS:** `archived: true` + `archivedAt` — az adat audithoz megmarad, nem törlődik.
- **`restoreWarehouseStock(id)`** — archivált tétel visszaállítása aktívra.

### Raktár világ — 3 elkülönülő képernyő (`data-worlds.js` → `warehouse.screens`)
Korábban az Áttekintés és a Készlet ugyanazt mutatta (nem volt `dash` ág a routerben). Most:
- **Áttekintés** (`WarehouseDashboard`) — KPI-k (Nyilvántartott / Riasztás / Kritikus / Becsült érték), „Utánrendelést igényel" lista, „Készlet állapota" megoszlás, „Legutóbbi mozgások". Archiváltakat kizárja.
- **Készlet** (`InventoryPage` → „Anyagok" fül = beágyazott `WarehouseStockTab`) — szerkeszthető katalógus-alapú lista.
- **Mozgások** (`MovementsPage`) + új **Katalógus** képernyő (`WorldCatalog worldId="warehouse"`, „Tételek" + „Készletkezelés" fül).

### `WarehouseStockTab` — a szerkeszthető készlet-felület
- Megjelenik **két helyen** ugyanazzal az adattal: Készlet → „Anyagok" fül (`embedded`) és Katalógus → „Készletkezelés" fül.
- **Inline szerkesztő** sorra koppintva: onHand / min / pozíció / foglalt + élő készletsáv-előnézet + „Archiválás" gomb.
- **Státusz-szűrő:** Mind / Rendben / Alacsony / Kritikus / **Raktárba vehető** / **Archivált**.
- **Raktárba vétel a Raktár világból:** a „Raktárba vehető" szűrő minden még nem nyilvántartott katalógustételt listáz „+ Felvesz" gombbal → `enableWarehouseStock` + azonnali szerkesztő.
- **Típus (kategória) szűrő:** színes chip-sor (`categoryId` → `catCategories`), csak a látható listában létező kategóriákkal; státuszfül-váltáskor nullázódik (`pickFilter`).

### catalog-manager.jsx — raktározás bekapcsolása
- **„Raktározás" kártya** minden tételnél (nem csak world-only): egy kattintás → `worldExt.warehouse` alapértékkel.
- `CMWorldExtEditor` warehouse ág: onHand / min / pozíció / foglalt mezők + trend-badge.

### Seed + LS_KEY
- 6 demó raktártétel (`wh-001…006`: Bükk/Tölgy bútorlap, MDF, ABS élzáró, Blum csukópánt + fiókcsúszó) `worldExt.warehouse`-szal, vegyes trenddel.
- **`jt_sim_v33`, seed `v: 25`** (a betöltés `v >= 25`-től fogad el). Az `archived` mező hiánya = aktív (backward compat).

### Hátralévő (lehetséges) bővítés
- Archiváláskor **rendszerüzenet** a Comm Hubba (`postSystem`), ha `settings.eventMessages` be van kapcsolva.
- A `sim.materials` bridge teljes levezetése a katalógusból (most a Mozgások még a régi `materials`/`movements` seedet használja).

---

## 3.19 ✅ Raktár — lot + zóna modell, 5-szintű raktárhely, kivét-FSM, bizonylat-vezérelt bevételezés

> **Honnan jött:** a készletet **dinamikusan** kell kezelni: egy katalógustételnek több, külön sorsú **készlet-tétele (lot)** lehet, és minden lotnak van egy **elérhetőségi státusza** (szabad? projekthez zárolt? bolti rendeléshez foglalt? kommissiózva? szállítható?). A fizikai hely **nem** ez — azt külön, 5-szintű **raktárhely**-hierarchia adja. A kivétet több **fogyasztó** indíthatja (gyártás, kereskedelem, bolt, projekt/beépítés, selejt), állapotgéppel. A bevét a valóságban **szállítólevél/számla** alapján, gyakran **több tétellel** érkezik, és a projekt nem mindig szerepel a bizonylaton.

**Fájlok:** `data-warehouse.js` (zónák, fogyasztók, kivét-FSM, hely-szintek konstansai), `app-store.jsx` (lot-modell + akciók + normalizálás), `page-warehouse.jsx` (`WhLocationSelect`, lot-megjelenítés, zóna-mozgató), `page-warehouse-2.jsx` (Bevételezés, Kivét, Beállítások → Raktárhelyek), `ui.jsx` (`file`/`receipt`/`info`/`arrow-right` ikon). **LS_KEY `jt_sim_v43`, seed `v: 26`.**

### Zóna = a lot ELÉRHETŐSÉGI státusza (nem fizikai hely) — `WH_ZONES`
`general (Általános/szabad) → project_locked (Projekthez zárolt) → shop_reserved (Bolti rendeléshez foglalt) → commissioned (Szállításhoz kommissiózva) → shippable (Szállítható)` (`WH_ZONE_ORDER`). A **`general` a SZABAD készlet** — ebből számít a `trend` (vs. `min`): „rendelni kell?". Zóna-váltás engedélyezett irányai: `WH_ZONE_MOVES`.

### Lot-modell — a tényleges készlet-tétel
`catalog[i].worldExt.warehouse = { min, lots:[], archived?, + SZÁMÍTOTT tükör: onHand/available/reserved/trend/location }`. A **lot**: `{ id, qty, zone, locId, locText, projectNo?, projectName?, ref?, refLabel?, receivedFrom?, receivedAt, docType?, docNo? }`. A számított tükör-mezők **soha nem kézzel írtak** — a `normWarehouse(wh)` számolja a lotokból; lot-mutáció mindig a `mutateWarehouse(s, id, fn)` helperrel + emit. Akciók: **`whReassignLot`** (zóna-váltás, részmennyiségnél lot-szétválasztás), **`whMoveLotLocation`** (fizikai áthelyezés), **`whAdjustLot`** (selejt/korrekció). A régi aggregált `setWarehouseStock({onHand,min,location,reserved})` editor backward-compat megmaradt (a lot-modellbe vetít).

### 5-szintű raktárhely-hierarchia — Beállítások → Raktárhelyek
`WH_LEVELS` = `telephely → raktar* → helyiseg → tarolo* → rekesz` (`*` = kötelező). Engedélyezett szintek: `warehouseCfg.levels` (`setWhLevel(key,on)` — kötelező nem kapcsolható ki). A **Telephely = FACILITIES** (egy igazságforrás). Hely-regiszter: `warehouseLocations[]` (`addWhLocation/updateWhLocation/removeWhLocation`), olvasható címke csak az engedélyezett szintekkel: `whLocLabel(loc)`; a lot `locId`+`locText`-et hordoz. UI: `WarehouseLevelsPanel`.

### Kivét-kérelem FSM — Raktár → Kivét (`withdrawals[].status`)
`kert → komissiozva → kiadva` (mellék: `visszavonva`) — `WH_WD_FLOW`/`WH_WD_ORDER`, tiltott átmenet **LEZÁRT** (validált). Átmenet: **`setWithdrawalStatus(id, status)`** — `kiadva`-nál a lotokból fogyaszt (prioritás: ref-egyező → committed → general), soronként Kivét mozgás. Létrehozás: **`createWithdrawal({consumer, ref, refLabel, lines, note})`**. **Fogyasztók** (`WH_CONSUMERS`/`WH_CONSUMER_ORDER`): `gyartas | trade | shop | project | selejt`. UI: `WithdrawalsPage` + `WithdrawCreateDialog`.

### Bevételezés — BIZONYLAT-vezérelt, TÖBB-soros — Raktár → Bevételezés
Egy bizonylat (típus + szám + szállító) → **több tétel-sor**, soronként egy lot. PO-ból: **`receiveToWarehouse(poId, {docType, docNo, lock, projectNo, projectName, lines:[{itemId,qty,locId,locText}]})`**; PO nélkül (kézi érkezés): **`receiveAdhoc({supplier, docType, docNo, lock, projectNo, projectName, lines:[...]})`** → soronként lot + (PO esetén) `delivered` + Bevét mozgás. `docType: "szallitolevel"|"szamla"`, a lotok hordozzák. **A projekt-zárolás NEM automatikus** (a bizonylaton nem mindig szerepel a projekt): alapból `general` (szabad) zónába kerül; a bevételező tudatosan kapcsolja zárolásra, a PO `projectNo`-ja csak **javaslat**. Később bármikor projektre zárolható a lot zóna-mozgatójával. UI: `ReceivingPage` + `ReceiveForm` (PO) / `AdhocReceiveForm` (kézi) + közös `DocSection`/`ProjectLockSection`/`ReceiveLinesEditor`.

### Új seed-mezők + demó
`warehouseCfg`, `warehouseLocations`, `withdrawals`, `whSeq`; a `pos` tételek `itemId` + opc. `projectNo`. A `wh-001…006` tételek vegyes zónájú lotokkal, hely-regiszterrel és nyitott kivét-kérelmekkel.

### Hátralévő (lehetséges) bővítés
- Bevételezéskor **fotó/szkennelt bizonylat** csatolása a lothoz.
- Lot-szintű **lejárat / batch** nyomon követés (most receivedAt van).
- Kivét **vonalkód/QR** támogatás a komissiózáshoz.

---

## 3.20 ✅ Beszállítói cikk-megfeleltetés — idegen cikkszám ↔ saját katalógus (`page-suppliermap.jsx`)

> **Honnan jött:** a raktár **rendszeren kívüli beszállítótól** is kap árut, és a beszállító **saját cikkszáma + megnevezése** ritkán egyezik a miénkkel. Kell egy megfeleltetési tábla (idegen tétel → saját katalógus tétel), amit a **beszerzés is használ** — a legpraktikusabb, ha már **rendeléskor rögzül**, mit rendeltünk melyik beszállító cikkével melyik saját katalógusszámra.

**Fájlok:** `page-suppliermap.jsx` (`SupplierMapPanel` + sorok/űrlap), `app-store.jsx` (seed + akciók + feloldó), `page-warehouse-2.jsx` (bevét-feloldás a `ReceiveLinesEditor`-ban), `data-worlds.js` + `page-rest.jsx` + `JoineryTech Portal.html` (két belépő). **LS_KEY `jt_sim_v43`, seed `v: 26`** (közös a 3.19-cel).

### Adatmodell + feloldó
`sim.supplierMap[] = { id, supplierName, supplierSku, supplierLabel, catalogItemId, note, targets? }`. Akciók: `addSupplierMap/updateSupplierMap/removeSupplierMap`, **`learnSupplierMap`** (upsert — rendeléskor/bevételezéskor). Lekérdezés: `supplierMapBySupplier`, `supplierRefFor(catalogItemId, supplierName)`, `supplierMapTargets(m)`. Feloldó: **`resolveSupplierItem(supplierName, {sku, label})`** → `{ catalogItemId, targets, via }` — prioritás: sku-egyezés → pontos megnevezés → részleges tartalmazás → (végül beszállító-független sku).

### Kardinalitás — 1:1 / N:1 / 1:N + szett (visszafelé)
- **1:1** — egy idegen cikk → egy saját tétel.
- **N:1 (összevonás):** több megfeleltetési **sor** mutat ugyanarra a `catalogItemId`-ra — a beszállító több cikkét (más kiszerelés/cikkszám) nálunk **egy** tételre vesszük fel (demo: `sm-3` + `sm-7` → MDF-016-W).
- **1:N (szétbontás):** egy soron `targets:[{catalogItemId, factor}]` — egy beszállítói cikk **több** saját tételre bomlik, a `factor` = hány saját egység jön 1 beszállítói egységből (demo `sm-8`: BOX szett → 1 fiókcsúszó ×1 + csukópánt ×2). A `catalogItemId` mindig az első cél (back-compat); `supplierMapTargets(m)` normalizál.
- **Szett / a szorzó VISSZAFELÉ (rendelés):** a többszörös cél-tételű megfeleltetés egy **szett** (`supplierKits()`). Rendeléskor a kérdés fordított: „kell N szett → mennyi komponenst rendeljek?" → **`orderKitLines(mappingId, kitQty)`** (qty = kitQty × factor komponensenként). Demó `sm-9`: **Häfele konténer 3-fiókos szett** = 1 zár (×1) + 3 fiók doboz (×3) + 3 sín (×3) → 2 konténerhez 2 zár + 6 fiók + 6 sín. Új komponens-tételek: `wh-007` (Häfele bútorzár), `wh-008` (Häfele Matrix fiók doboz); a sín a meglévő `wh-006`. UI: **`SupplierOrderKit`** kalkulátor a panel tetején — szett + db → komponens-táblázat → **„Igények létrehozása"** (`addRequisitions`, Draft) → a normál szállítónkénti PO-bontásba.
- **Mértékegység-átváltás (más egység):** a megfeleltetés `supplierUnit` mezője a beszállító egysége (tábla/tekercs/doboz/pár…), a (single) `targets[0].factor` az **átváltás** = hány saját egység jön 1 beszállítói egységből. Demó `sm-10`: Falco **tábla** → `wh-011` Bükk lapanyag **m²**, 1 tábla = 5,796 m². Az űrlapon „Beszállító mértékegysége" + ×szorzó (a saját tétel egységével); a **bevételezésnél** a beszállítói mennyiséget (pl. 10 tábla) megadva automatikusan a saját egységre vált (57,96 m²) — `ReceiveLinesEditor` átváltó mező. A `supplierMapTargets` az 1:1-es factort is megőrzi (a store akkor is `targets`-be ment, ha egy célnál factor≠1).
- **Méret-alapú átváltás (nem szabványos tábla):** a tábla mérete nem mindig szabványos — a laminált forgácslapnál ritka, a **rétegelt lemeznél jellemző**. A megfeleltetés `sheet:{ w, l, variable }` (mm) hordozza a névleges méretet, a `factor = w*l/1e6`. Ha `variable:true` (rétegelt lemez), a **bevételezésnél a tényleges szél×hossz** adható meg táblánként (`m² = darab × w*l/1e6`); `variable:false`-nál (laminált) a szabványos méret zárolt. Az űrlapon „Méret-alapú átváltás (tábla → m²)" kapcsoló + szél×hossz + „változó méret" jelölő. Demó `sm-11`: Falco **nyír rétegelt lemez** (névleges 2440×1220, változó) → `wh-012` m².

### Két belépő — a beszerzés is elérje
Ugyanaz a `SupplierMapPanel` két helyen: **Beállítások → Beszállítói cikkek** és **Beszerzés → Beszállítói cikkek** (utóbbi `settings.manage` jog nélkül is). Grupált beszállítónként, kereső + szűrő, hiányzó-megfeleltetés figyelmeztetés. Az űrlapon a cél-tételhez **„Szétbontás több tételre"** ad szorzós sorokat; a táblában az 1:N sor „N tételre bontva" bontással jelenik meg.

### Integráció a két oldalon
- **Beszerzés:** `createPOsFromReqs` a PO-sorokra ráírja a `supplierSku`/`supplierLabel`-t + `catalogItemId`-t a megfeleltetésből (a beszállító a saját cikkével kapja a rendelést).
- **Raktár (bevételezés):** a `ReceiveLinesEditor` soronként feloldja az idegen cikket; **1:N-nél „Bontás N tételre" gomb** (a sort N sorra cseréli, qty × factor); a PO-előtöltés is használja; ismeretlen idegen cikknél **felajánlja a `learnSupplierMap` mentést**.

### Hátralévő (lehetséges) bővítés
- Beszállítónkénti **ár-emlékezet** a megfeleltetésen (most a katalógus `suppliers[]`-ben van).
- Tömeges **import** (CSV/XLS) a beszállítói árlistából.

---

## 3.21 ✅ Összeállítás — multi-level BOM a katalógus-tételen

> **Honnan jött:** a cikkszám-megfeleltetés szorzója felvetette az **assembly rendszert**: a CAD-tervezéskor egy szekrényhez sínt, pántot, lábat adunk; ha a szekrényt a **katalógusban** akarjuk kezelni, akkor az **összeállítást** kezeljük — és ebből jön az **ellátás/rendelés**. A Häfele-szett (3.20 `orderKitLines`) ennek beszállító-oldali esete; ez az **általánosítás**: bármely katalógus-tétel komponensekből állhat.

**Döntés (defaultok):** a **katalógus-tétel hordozza a BOM-ot** (egy igazságforrás), **rekurzív** többszintű, a spec-sablonokkal (`PARAM_TEMPLATES.hardware`) és az `assembly.jsx`-szel **parallel** (nem konvergáltattuk). Most a mag: adatmodell + beszerzési kibontás + BOM-szerkesztő.

**Fájlok:** `app-store.jsx` (BOM-mező + helperek + demó tételek), `catalog-manager.jsx` (BOM-szerkesztő a tétel-szerkesztőben), `page-suppliermap.jsx` (`SupplierOrderKit` általánosítva katalógus-összeállításra). **LS_KEY `jt_sim_v43`, seed `v: 26`.**

### Adatmodell
`catalogItem.bom = [{ catalogItemId, qty }]` — a KÖZVETLEN komponensek (a komponens maga is lehet összeállítás → rekurzió). A `bom` hiánya/üres = **atomi rész**. A mező a `__normCatItem` `...it` spreadjén átmegy; `add/updateCatalogItem` megtartja. Demó: `wh-009` Konyha alsószekrény 60 (0,5 bükk lap + 3× `wh-010` fiók-egység + 1 zár), `wh-010` fiók-egység (1 fiók doboz + 1 sín) → kétszintű.

### Store-helperek
`itemBom(id)`, `isAssembly(id)`, **`explodeBom(id, qty)`** (rekurzív a levél-tételekig, ciklus-védett, mennyiségeket összegez → `[{catalogItemId, qty, code, name, unit, price}]`), `bomCost(id, qty)` (felgörgetett anyagköltség), **`bomCoverage(id, qty)`** (komponensenként szabad készlet vs. szükséglet → `free/short/covered`), `setItemBom(id, bom)`.

### UI
- **Szerkesztés:** Beállítások → Katalógus → tétel-szerkesztő **„Összeállítás (BOM)"** szekció — komponens (katalógus-tétel) + ×mennyiség, a „⊞" jelű komponens maga is összeállítás.
- **Rendelés (a szorzó/BOM visszafelé):** Beszerzés → Beszállítói cikkek → **„Összeállítás / szett rendelés"** kalkulátor (`SupplierOrderKit`, általánosítva) — forrás a **katalógus-összeállítás** VAGY a **beszállítói szett**; db megadása → komponens-szükséglet **készletfedezettel** (szabad/hiány, piros ha rendelni kell) → „Csak a hiányt rendeljem" opció → **Draft beszerzési igények** (`addRequisitions`, katalógus-összeállításnál **komponensenkénti** szállítóval) → normál szállítónkénti PO-bontás.
- **Késztermék-készlet (raktározni / bevételezni / kiadni):** az összeállítás MAGA is raktározható késztermék (`worldExt.warehouse` + lotok) — bevételezhető (vásárolt késztermék a `receiveToWarehouse`/`receiveAdhoc`-kal), kiadható (`createWithdrawal`), mint bármely tétel. Házon belüli gyártás: **`buildAssembly(id, qty, opts)`** — `explodeBom` szerint fogyasztja a szabad komponens-készletet (Kivét mozgás) és a kész összeállítást lotként készletre veszi (Bevét mozgás); komponens-hiányt blokkol. Belépő: a kalkulátor **„Gyártás készletre"** gombja. Demó: `wh-009`/`wh-010` készletezett késztermék. **LS_KEY `jt_sim_v43`.**

### Hátralévő (lehetséges) bővítés
- CAD/Tervezés: a megtervezett bútor BOM-ja mentődjön a katalógusba (`saveDesignToCatalog` → `bom`).
- MfgPrep: a katalógus-BOM legyen a gyártás-előkészítés szükséglet-forrása (most a spec-sablon hardver-listája).
- Konvergencia: a spec-sablon `hardware[]` és az `assembly.jsx` egyesítése a katalógus-BOM-ra.
- Az összeállítás (szekrény) **késztermékként is készletezhető** legyen (most a készlet a komponenseken).

---

## 3.22 ✅ Variánskezelés — fő-tétel alatt méret/szín/anyag változatok

> **Honnan jött:** egy fő-tétel (cikkszám) alatt kell kezelni az eltérő változatokat — szín, méret, anyag. Mint egy cipőnél piros/fehér + több méret. A **kapcsolat megmarad** a hasonló tételeknél, de **mennyiség szerint külön** tartjuk nyilván (saját készlet). Pl. fióksín: egy márka egy típusa → 350 mm fehér 100 pár, 450 mm fehér 200 pár, 450 mm barna 100 pár. A maradékkezelésnél (m²/fm) is segít. Lényeg: a tulajdonságok **származtathatók és felülírhatók**.

**Fájlok:** `app-store.jsx` (modell + helperek + akciók + demó), `catalog-manager.jsx` (`CMVariantSection` a tétel-szerkesztőben). **LS_KEY `jt_sim_v43`, seed `v: 26`.**

### Modell — fő-tétel + variánsok (öröklés/felülírás)
- **Fő-tétel:** `variantAxes:[{key,label,options[]}]` — a változó tulajdonságok (tengelyek), pl. Hossz × Szín.
- **Variáns:** önálló katalógus-tétel `variantOf:<parentId>` + `variantValues:{axisKey:value}` mezőkkel. Saját `code`, `price`, és **saját `worldExt.warehouse` (lotok)** — minden mást **örököl** a fő-tételtől (unit, kategória, szállító, props, BOM). A felülírás a variáns saját mezőin keresztül megy.
- A variánsok a **raktári készlet-listában külön sorként**, saját mennyiséggel jelennek meg → „külön nyilvántartás mennyiség szerint".

### Store
`isVariantParent(id)`, `itemVariants(parentId)`, `variantParentOf(id)`, `variantLabel(idOrItem)`, **`effectiveItem(id)`** (örökölt+felülírt nézet: a props a fő-tétel + variáns egyesítése), `variantStockSummary(parentId)` (variánsonkénti készlet a mátrixhoz). Akciók: `setVariantAxes(parentId, axes)`, **`addVariant(parentId, values, overrides)`** (örökli a fő-tétel adatait, saját üres raktárral), `updateVariant(id, patch)`, `removeVariant(id)`.

### UI
Beállítások → Katalógus → tétel-szerkesztő **„Variánsok"** szekció (`CMVariantSection`, `window.useSim`-mel reaktív):
- **Tengelyek** szerkesztése (változó tulajdonságok, vesszős opció-lista) → „Tengelyek mentése".
- **Variáns-mátrix:** érték-címke + cikkszám + **saját készlet** (szabad, min alatt piros) + törlés.
- **Új variáns:** tengelyenkénti érték-választó + opc. ár → `addVariant`.
- Variáns megnyitásakor öröklés-jelzés (mely fő-tétel variánsa).

Demó: `wh-013` Blum Antaro fiókcsúszó (Hossz × Szín) → `wh-013-a/b/c`: 350 fehér 100 pár, 450 fehér 200 pár, 450 barna 100 pár.

### Hátralévő (lehetséges) bővítés
- Maradék/hulladék (m²/fm) variáns-alapú nyilvántartása méret szerint.
- Mátrix-generálás (összes tengely-kombináció egy gombbal).

### 3.22b ✅ Variáns-csoport a listában + variáns-aware megfeleltetés/beszerzés

> **Honnan jött:** a variáns-családot a katalógus-listában is kezelni kell (összecsukható csoport a fő-tétel alatt), és a beszerzés/megfeleltetés is **variáns-szintű** legyen (a beszállítói cikk konkrét variánsra mutathasson). **LS_KEY `jt_sim_v43`.**

- **Katalógus-lista — összecsukható variáns-csoport** (`catalog-manager.jsx`, `CatalogPanel`): a variáns-gyermekek nem önálló top-level sorok; a fő-tétel egy **chevron-toggle**-lal nyitható, „N variáns" jelvénnyel és Σ-készlettel. Kinyitva a variánsok behúzva, saját készlettel + árral. Asztali (grid) és mobil (kártya) is. Logika: `childrenByParent` (memo), `topLevel` (a filtered-ből a gyermekek kihagyva, a fő-tétel felszínre hozva), `expanded` (parentId→bool), `toggleExpand`. Ha egy variáns átment a szűrőn/kereső, a fő-tétele megjelenik.
- **Variáns-aware megfeleltetés** (`page-suppliermap.jsx`): a cél-választó (`pickGroups`) a variánsokat a fő-tétel alá csoportosítja (`◆ Fő-tétel` optgroup), variáns-címkével; az **absztrakt fő-tétel** (variantAxes) NEM választható (a készlet a variánson van). A megfeleltetés-sorok (`SupplierMapRow`) variáns-címkét mutatnak (fő-tétel név · variáns-érték). Demó: `sm-12` Blum „Antaro Zargen 450mm seidenweiss" → `wh-013-b` (450 mm fehér variáns).
- **Variáns-aware bevételezés/kivét** (`page-warehouse-2.jsx`): a tétel-választók (`ReceiveLinesEditor`, kivét-dialógus) szintén kihagyják a fő-tételt és variáns-címkét mutatnak (`whItemOptLabel`, `isVariantParentItem`). A `resolveSupplierItem` változatlanul a variáns-id-t adja vissza → a lot a **variáns saját készletére** kerül.

### Hátralévő (variáns) bővítés
- Maradék/hulladék (m²/fm) variáns-alapú nyilvántartása méret szerint.
- Mátrix-generálás (összes tengely-kombináció egy gombbal).
- Variáns-szintű min/újrarendelési trend a beszerzési javaslatban.

### 3.23 ✅ Beszerzési katalógus — külön a globális katalógustól (`procCatalog`)

> **Honnan jött:** „A beszerzés katalógusa nem a globális katalógus." A Beszerzés → Katalógus eddig a globális `sim.catalog`-ot listázta (kész bútorok, variánsok, BOM-összeállítások, szolgáltatások is) — koncepcionálisan rossz. A beszerzés egy „beszerezhető dolgok" törzse: minden, amit **külső partnertől VAGY elszeparált belső egységtől** kell megigényelni és követni a **bevételezésig**, és információt adni az értékesítés/kereskedelem/bolt felé. **LS_KEY `jt_sim_v44`, seed `v: 27`.**

- **Külön store-mező** (`app-store.jsx`): `sim.procCatalog[]` + `procSeq`. Modell: `{ id, code, name, kind, unit, cat, catalogItemId?, group?, members?, sources:[], active }`. A `catalogItemId` opcionális (anyag/vasalat → saját raktári tétel; tiszta szolgáltatás/külső munka standalone). `group:true` = **gyűjtő cikkszám**. Load-migráció pótolja a hiányzó/üres `procCatalog`-ot.
- **Forrás-típusok** (`source.kind`, `PROC_SOURCE_META`/`PROC_SOURCE_ORDER` a `data-procurement2.js`-ben): `supplier` (külső szállító) · `work` (külső munka: festés/szobrászat/CNC bérmunka — `partnerId`) · `internal_unit` (elszeparált belső egység, pl. lakatos üzem — `unitId`). `price`/`leadDays` lehet null → „ajánlatkérés".
- **Store-akciók:** `procCatalogList`, `findProcItem`, `addProcItem`, `updateProcItem`, `removeProcItem` (soft archive). Igény-indítás: **`requisitionFromProc(procId, source, qty)`** → Draft `requisition` (`sourceKind`+`procId`), **beleköt a meglévő igénylés → PO → bevételezés láncba** (`createPOsFromReqs` szállítónkénti bontás).
- **UI** (`page-procurement2.jsx`, `CatalogPage` átírva): „Beszerzési katalógus" cím, kategória + **forrás-típus** szűrő, soronként forrás-összehasonlítás (legjobb ár / leggyorsabb / sorösszeg) + „Igény" gomb, gyűjtő-jelvény, forrás-chipek. Asztali táblázat + mobil koppintható sor. Nav-címke „Beszerzési katalógus" (`data-worlds.js`).
- **Seed:** `pc-01..04` külső szállítós anyag/vasalat (saját raktári tételre mutat), `pc-05..07` külső munka (festés/szobrászat/CNC), `pc-08..09` belső egység (lakatos: vasláb, keret), `pc-10` gyűjtő cikkszám.

### Hátralévő (beszerzési katalógus) bővítés
- `procCatalog`-tétel szerkesztő UI (most seed-szintű; CRUD az actionökkel kész, panel hiányzik).
- Belső egység (`internal_unit`) → B2BHandshake / delegálás bekötése a kézfogás-láncba (most sima igénylés).
- Gyűjtő cikkszám (`group`) tagjainak robbantása az igénylésnél (komponensekre bontás).

### 3.25 ✅ Cikkszám-életciklus (jóváhagyási FSM) + Törzsadat világ

> **Honnan jött:** „Hol van jó helyen a katalógus/cikkszám-kezelés? Bevezetnék egy státuszt, amibe bárki felvehet a kötelező mezőkkel és tovább dolgozhat vele, de ajánlat/eladás nem lehet belőle, amíg nincs jóváhagyva.” Döntés: a cikkszám-törzs **kereszt-metsző governance-adat** → saját **Törzsadat** világ a kanonikus otthon; a státusz a **tételen** él (világ-független); a beszerzés egy belépési pont a sok közül, nem a tulajdonos. **LS_KEY `jt_sim_v47`, seed `v: 30`.**

- **Életciklus-FSM** (`catalog[].status`): `draft (Piszkozat) → review (Jóváhagyásra vár) → active (Aktív)`; mellék: `incomplete (Hiánypótlás)`, `rejected (Elutasítva)`, `archived`. Tónusok bővítve. `_catFlow` + `catStatusCanGo(from,to)`; tiltott átmenet = LEZÁRT gomb (nem rejtett), epik-FSM mintára.
- **Minimum draft:** `addCatalogDraft({name,categoryId,kind,…})` — csak Megnevezés + Kategória + Típus kell, auto cikkszám (`UJ-NNNN`). Bárki felveheti; belül használható (igénylés/raktár/tervezés), de nem eladható.
- **Teljesség:** `catalogCompleteness(item)` → `{checks, ready, missing}`. Jóváhagyáshoz: eladási ár · beszállítói forrás/beszerzési ár · kategória műszaki mezői (`categoryFields` number/select/material) · láthatóság · név+kategória+típus.
- **Átmenet:** `setCatalogStatus(id, to, {reason})` — validált; `active`/`incomplete`/`rejected` `catalog.approve` joghoz kötött, `incomplete`/`rejected` indok-kötelező; `active`-ra teljesség-ellenőrzés. `catalogByStatus(status)` lekérdezés.
- **Új jog:** `catalog.approve` (`portal.jsx` + `acc-internal` perms).
- **Törzsadat világ** (`masterdata`, `data-worlds.js` + WORLD_ORDER + `acc-internal.worlds` + HTML routing): **Cikkszámok** (`CatalogPanel` a teljes szerkesztővel) + **Jóváhagyások** (`CatalogApprovals`, `page-masterdata.jsx` — review/draft/incomplete/rejected fülek, soronkénti hiánylista, jóváhagy/elutasít/hiánypótlásra-vissza gombok).
- **Szerkesztő** (`catalog-manager.jsx`): státusz-sáv + completeness-checklist + FSM-gombok (lezárt+tooltip a hiányzó mezőkkel) + indok-megjelenítés.
- **Eladhatóság-kapu:** `isCatalogSellable` + `sellableCatalog()` (csak `active`). **Ajánlat ItemBuilder** (`page-sales.jsx` ×2, `page-sales-detail.jsx`) és **webshop** (`shopProducts`/`shopCatalogItems`) már csak `active` tételt kínál. A **Kereskedelem pultos eladás** külön `tradeProducts` törzsből dolgozik → rá nem hat. A **beszerzési igény** ItemBuilder szándékosan NEM gated (belépési pont).
- **Demó:** `c-draft-led` (piszkozat, minimum), `c-inc-fog` (hiánypótlás, indokkal), `c-rev-fog` (jóváhagyásra kész — minden mező kitöltve).
- **Mellékesen javítva:** pre-existing crash — `page-rest.jsx` egy elavult `window.WarehouseDashboard = WarehouseDashboard;` sort tartalmazott (a komponens a `page-world-pages.jsx`-be költözött), ami `ReferenceError`-t dobott module-eval időben és megszakította a további exportokat. Sor eltávolítva.

### 3.24 ✅ Tervezési anyag — a katalógus az EGYETLEN forrás

> **Honnan jött:** „A tervezésnél és a sablonoknál is a katalógus elemeket lehessen csak használni az anyagmeghatározáshoz." Eddig a spec-rendszer anyag-mezői egy külön `MATERIAL_PRICE` (ár) + `CATALOG_LOOKUP` (név/szín/vastagság) táblapárból oldódtak fel — a `sim.catalog` „Lapanyag (Tervezés)" tételeitől függetlenül, duplikáltan. Cél: egy igazságforrás — a katalógus.

- **Új store-helperek** (`app-store.jsx`): `designMaterials()` → a „Lapanyag (Tervezés)" katalógus-kategória választható anyagai (`{code,name,price,t,kind,color,unit}`); `materialInfo(code)` → egy kód feloldása a katalógusból (`{name,price,t,color,unit,known}`), fallback a régi táblákra.
- **Mindenhol katalógus-feloldás:** ármotor (`specs-engine.js` `matInfo` + a `SpecEngine`-re kitéve), séma-szerkesztő anyag-választó (`page-specs-schema.jsx` — `designMaterials()`-ből, „katalógusból" jelzéssel), stílus-szerkesztő gombok + címke (`page-specs.jsx`), sablon-előnézet `materialLabel/materialColor/matThick` + constraint-kiértékelők (`page-design.jsx`).
- **Következmény:** új tervezési anyagot a **katalógusba** kell felvenni (Lapanyag (Tervezés)) — onnan automatikusan választható lesz a stílusban/sablonban, és az ár is onnan számít. Nincs séma-/LS-verzió emelés (csak feloldási út változott).
- **Hátralévő:** a régi `MATERIAL_PRICE`/`CATALOG_LOOKUP`/`MATERIALS` táblák teljes kivezetése (most fallback); a `props.t`/`props.lookupColor` katalógus-mezők szerkesztő-UI-ja.

### 4.1 BOM-összeállító továbbfejlesztés (következő logikus lépés)
- A fa **szerkeszthető** legyen az UI-ból: tétel/szekrény **hozzáadás, törlés, átnevezés, duplikálás**.
- Összeállítás **mentése a store-ba** (most a szerkezet rögzített, csak a konfiguráció él).
- **BOM → ajánlati tétel** kapcsolat: egy összeállításból közvetlenül ajánlat készüljön (a 3.6-tal egyesítve).
- Bővebb **függőségi szabályok** (pl. frontanyag korlátozza a színt, méret korlátozza a vasalatot).
- Saját vs. külső **megmunkálás megrendelése** (a külső munka is a beszerzési/alvállalkozói folyamatba kösson be).

### 4.2 Árazás finomítás
- Tételenkénti **árrés / kedvezmény**.
- Ajánlat-sablonok, mennyiségi sávok.

### 4.3 Ügyfél-élmény
- Valódi **bejelentkező képernyő** fiókonként (most demó-profilváltó).
- Dokumentumok az ügyfélnél: **ajánlat PDF, számla** megtekintése.
- Ügyfél-oldali **értesítések** állapotváltozáskor.

### 4.4 Integrációk / „éles felé"
- **Valódi AI** bekötése a szkriptelt válaszok helyett.
- Külső chat-integrációk valódi bekötése (most a felület és a folyamat van meg).
- **Backend + adatbázis** (a megőrzés most localStorage); a store átültetése valódi API-ra.

### 4.5 Backend-határ & pontszerű API-hívások (stratégia)

> **Honnan jött:** mikor érünk el oda, hogy backend nélkül nem lehet tovább prototipizálni — és hol ad egy API-hívás stabilabb/szebb megoldást, mint a kliens-szimuláció.

**Alapelv:** a `window.sim` + `localStorage` modell **szándékosan** elég messzire visz, mert ez egy **folyamat- és UX-validáló prototípus**, nem éles rendszer. A backend hiánya addig **nem** korlát, amíg: egy felhasználó/böngésző nézi (a profilváltó szimulálja a szerepeket), az adat eldobható (demó-reset), és a logika a kliensen is **hitelesen** lefut. A determinisztikus logikák — **ár-motor, státusz-FSM-ek, B2BHandshake nézet-szétválás** — tiszta számítások: ezeket **nem teszi igazabbá** egy szerver, ezért maradnak a kliensen.

**Ahol a backend valóban hiányozni kezd** (itt a prototípus „hazudni" kezd — ne szimuláljuk tovább, jelöljük meg éles igényként):
- **Valódi több-céges handshake** — két külön böngésző/cég, közös élő állapot.
- **Jogosultság mint biztonság** — most a `hasPerm` csak *elrejt*; élesben a szervernek kell *tiltania*.
- **Egyidejű szerkesztés / push-értesítés** — „beérkezett megbízás", zárolás.
- **Auditált státusz-történet** — ki/mikor/mit léptetett, visszakereshetően.
- **Számlázás, PDF-kiküldés, e-mail** — perzisztens dokumentumok, külső rendszerek.

**A köztes lépés, amit MA is tudunk — pontszerű modell-hívás JS-ből.** Nem klasszikus backend (nincs DB, nincs auth): egy modell-hívás fut a prototípuson belül (`window.claude.complete`), és az eredményt **visszaírjuk a `window.sim`-be**. A perzisztencia, a státusz-lánc és az ár-motor **marad ahol van**. Akkor érdemes, ha egy számítás/szöveg **stabilabb vagy szebb** egy modelltől, mint a kézi szimuláció. Jó illeszkedő pontok:
- **Ajánlat kísérőszöveg / e-mail** automatikus fogalmazása a tételekből → **ez az első kiválasztott lépés** (jól megmutatja a határt, semmit nem kell átépíteni).
- **Igény → specifikáció** fordítás (szabad szöveg → kitöltött stílus/műszaki mezők a `specCategories` séma szerint).
- **Folyamat-leírás** természetes nyelvből → `processes[]` strukturált lépések.
- Bármely „értelmezd és javasolj" lépés, ahol most dummy adatot raknánk.

**Megállapodott irány:** maradunk a `window.sim`-nél, amíg a folyamatokat/UX-et validáljuk (a backend itt csak lassítana); ahol egy modell-hívás érdemben jobb élményt ad, oda **pontszerűen** beteszünk egy API-hívást, és az eredményt a meglévő store-ba kötjük. Az „éles felé" valódi backend-igényeket (fenti lista) a 4.4 gyűjti.

### 4.6 Javasolt jövőbeli világok — gap-analízis (hasonló rendszerekhez mérve)

> **Honnan jött:** „Hasonló szolgáltatások milyen struktúrát alkalmaznak, van-e még olyan világ, amit érdemes megvalósítani?” A meglévő 13 világ lefedi a bútoripari ERP-k (IMOS, Korpus, SAP B1 furniture, Odoo Manufacturing) magját (parametrikus tervezés + BOM, szállítónkénti beszerzés, lot/zóna-raktár, shop floor, törzsadat-governance, webshop, pénzügy). Az alábbi „fehér foltok" a leglogikusabb bővítések — **rangsorolva**, mindegyik a meglévő státusz-láncokra és store-ra köt be.

| # | Javasolt világ | Miért (lánc-bekötés) | Kit szolgál | Állapot |
|---|---|---|---|---|
| 1 | **Logisztika — Kiszállítás & Telepítés** | A lánc most a `delivered`-nél megáll; ez zárja le a fizikai oldalt. Beköt: rendelés `ready/delivered`, raktár `commissioned/shippable` zóna, projekt `install` mérföldkő, beszerzési PO → **beszállítás** (saját fuvar). FSM: `tervezett → berakodva → úton → kiszállítva → beszerelve → átadva` (+ reklamáció). | A1–A4 (saját szerelés → külön beszerelő részleg), B3 koordinátor, D1/D2 ügyfél-követés | ✅ **kész** (3.28) |
| 2 | **Utókalkuláció / Kontrolling — terv vs. tény** | A Pénzügy a számlákat kezeli, de nincs **projekt-jövedelmezőség**. Nem új FSM — **számított nézet** a meglévő adatokból: becsült (`SpecEngine`) vs. tényleges (anyag-kivét + jobok munkaóra + bérmunka-handshake + szállítás), fedezet-riport projektenként. Kis ráfordítás, nagy üzleti érték. | A3–A4 (mérhető átfutás/fedezet), B2 iroda | ✅ **kész** (3.29) |
| 3 | **Szerviz / Garancia / Reklamáció** | Az átadás (`átadva`) után most nincs folyamat. FSM: `bejelentve → kivizsgálás → jóváhagyva/elutasítva → javítás → lezárva`. Beköt a webshopba (D1/D2) és a B2B láncba; a Logisztika `reklamáció` ága ide csatlakozik. | minden gyártó-profil + D1/D2 | ✅ **kész** (3.30) |
| 4 | **HR / Munkaerő-kapacitás** | A shop floor-on gépkezelők vannak, de nincs ember-oldal: jelenlét, kompetenciák, brigádok, kapacitástervezés. A gyártás-előkészítés óra-normáit valós kapacitáshoz kötné; a Logisztika brigád-ütemezésével közös erőforrás-réteg. | A3 (kialakuló részlegek) → A4 (erős szerep-kezelés) | ✅ **kész** (3.31) |
| 5 | **Karbantartás / Eszközgazdálkodás** | A géppark (`SHOPFLOOR_MACHINES` / Beállítások) statikus. Megelőző karbantartás, állásidő-napló, gép-alkatrész — a shop floor gép-`state`-jeihez kötve (`idle/running` mellé `maintenance`). | A4 (több gép, mérhető rendelkezésre állás) | ✅ **kész** (3.32) |
| 6 | **CRM / Lead-pipeline** | A vevők a Sales-ben élnek (`CUSTOMERS`), de nincs **pre-sales tölcsér** (lead → opportunity → ajánlat). Az ajánlat-FSM elé fűzhető. | sales-intenzív A3–A4, B2 | ✅ **kész** (3.33) |

**Döntés:** az **1–6 mind kész** (Logisztika → CRM). A fizikai lánc, az analitikai réteg (Kontrolling), az átadás-utáni hurok (Reklamáció), az ember-oldal (HR), az eszköz-oldal (Karbantartás) és a pre-sales tölcsér (CRM) lefedve. A következő kört lásd a **4.7**-ben.

### 4.7 Második hullám — iparág-specifikus + általános ERP-bővítések

> **Honnan jött:** „Hasonló szoftverekben milyen világokat alakítanak még ki? Mit javasolsz?” A 4.6 első hulláma kész; ez a következő kör. Két csoport: **(A) iparág-specifikus** (ami a bútoripari ERP-ket egyedivé teszi) és **(B) általános ERP-alapok** (tiszta felelősségi határokkal zárják a hézagokat). A felhasználó döntése: előbb a **(B) általános bővítések** épüljenek meg, hogy az alapok meglegyenek és a felelősségek tiszták.

**(A) Iparág-specifikus — ✅ KÉSZ (2026-06-14 frissítés; mindkettő megépült):**
| Világ | Lényeg + bekötés | Állapot |
|---|---|---|
| **Termékkonfigurátor / CPQ** | Vizuális/parametrikus összeállító (méret/anyag/front/vasalat) → azonnali ár + vázlat-ajánlat. A meglévő `PARAM_TEMPLATES` + `SpecEngine` motorra épül; egyenesen a CRM `oppCreateQuote`/`createQuote` láncba köt. | ✅ **kész** — `configurator` képernyő (Tervezés világ), `page-configurator.jsx` + `config-evaluator.jsx`. |
| **Anyagoptimalizálás + maradékkezelés** | Szabásoptimalizálás (kihozatal %) + **maradéklap-készlet** mint külön raktári tétel, ami visszacsatol a Raktárba és a következő szabásnál felhasználható. A shop floor vágási terveire épül. | ✅ **kész** — `data-nesting.js`/`page-nesting.jsx` valódi 2D guillotine-nesting; **`offcuts[]`** maradékanyag-raktár (`OffcutWarehouse`, Raktár → Maradékanyag képernyő is). Lásd CLAUDE.md 4.7-A. |

**(B) Általános ERP-bővítések — ✅ KÉSZ (3 világ; alapok + TISZTA FELELŐSSÉGEK, egy igazságforrás, nincs duplikáció):**
- **Minőségbiztosítás (`quality`, lime)** — OWNS: ellenőrzések + hibajegyzőkönyv (NCR) + checklistek. Felelőssége az **átadás ELŐTTI** minőség (bejövő anyag + gyártásközi + végellenőrzés). Határ: a **Reklamáció (`service`)** az átadás UTÁNI hurok — nem keverednek. Beköt: rendelés/job (mit ellenőriz), bejövő anyag selejt → jelzés a Beszerzésnek/beszállítónak; selejt → opcionális rework.
- **Dokumentumtár (`docs`, violet)** — OWNS: a **verziózott** dokumentum-regiszter (rajz / szerződés / tanúsítvány / munkautasítás). Minden modul **hivatkozik** dokumentumra (projekt / rendelés / cikkszám / ügyfél), de a metaadat + verzió ITT él — nincs szétszórt dokumentum-tárolás.
- **Idő & jelenlét (`attendance`, orange)** — OWNS: be-/kijelentkezés (napi jelenlét) + jelenléti ív + műszak. A **dolgozói törzs az HR-é** (`sim.employees`), ide csak hivatkozik. Feeds: HR-kapacitás (tény-jelenlét) + Kontrolling (tény-bérköltség). Határ: a HR `timeLogs` = **projekt-munkaóra allokáció**; az `attendance` = **napi jelenlét/műszak** — két külön réteg, nem duplikálják egymást.

**(C) Megfontolandó (stratégiától függ) — ⬜ 1 fennmaradó „fehér folt" (2026-06-14):** Vezetői BI-cockpit (kereszt-világ exec dashboard a Kontrolling fölött). **✅ Munkavédelem / EHS — KÉSZ (4.9).** **✅ Beszállítói / B2B portál — KÉSZ (4.10).**

---

### 4.8 Operatív kiegészítések — a meglévő láncot záró/összefogó funkciók (2026-06-08 javaslat)

> **Honnan jött:** „Mik azok az operatív funkciók, amik jól kiegészítik a projektet?” A teljes lead→ajánlat→gyártás→szállítás→reklamáció gerinc + HR/karbantartás/minőség/pénzügy már megvan. Ami hiányzik: (A) **hézagok a meglévő láncban**, (B) **kereszt-metsző rétegek**, amik a már meglévő 20+ világot fogják össze. A felhasználó döntése: **mindegyik megépítendő; először az (A) blokk** (kis lépés, nagy érték). Mindhárom **a meglévő világ új képernyőjeként** kerül be (nem új top-level világ — „hézag a láncban" elv), a meglévő FSM/store/UI mintát követve.

**(A) Hézagok a meglévő láncban — ELŐSZÖR ÉPÜL:**
| # | Funkció | Hova köt | Lényeg |
|---|---|---|---|
| **A1** | **Beszállítói ajánlatkérés (RFQ)** — `procurement` világ új „Ajánlatkérés" képernyő | A PO **ELÉ** fűzve: igény → RFQ → bírálat → odaítélés → PO (`createPOsFromReqs`) | Most az `Approved` igény egyből PO-vá alakul; hiányzik a **bekérünk több ajánlatot → összehasonlítjuk → odaítéljük** kör. A `procCatalog.sources[]` + `supplierMap` adja az ár-összehasonlítás alapját. FSM: `osszeallitas → kikuldve → biralat → odaitelve` (+`visszavonva`). |
| **A2** | **Leltár / készlet-revízió (cycle counting)** — `warehouse` világ új „Leltár" képernyő | A lot-modellre ül: snapshot a `warehouseItems()` lotjaiból → számlálás → eltérés → könyvelés (`whAdjustLot`) | Van lot/zóna modell és `whAdjustLot`, de nincs **leltározási folyamat**. FSM: `nyitott → szamlalas → egyeztetes → lezarva` (+`megszakitva`). Számított: eltérés (counted − system), pontosság %. |
| **A3** | **Gyártásütemezés / véges kapacitás** — `production` világ új „Ütemezés" képernyő | `jobs` + `SHOPFLOOR_MACHINES` + HR-kapacitás | Van job-FSM és gépek, de nincs **ütemező-vászon**: gyártási task → gép + nap, kapacitás-ütközés (gép-nap terhelés > kapacitás), hátralék-backlog. A Logisztika/HR naptár-mintára. Task-FSM: `varolista → utemezve → folyamatban → kesz` (+`blokkolt`). |

**(B) Kereszt-metsző rétegek — később (A után):**
- **Egységes „Teendőim" / jóváhagyási bejövő** — a szétszórt feladatok/jóváhagyások (CRM, QA, karbantartási WO, távollét, katalógus-jóváhagyás, ajánlat-konverzió) **egy cockpitban**, SLA-val. A store már mindent emittál — aggregálni kell.
- **Jóváhagyási / hatáskör-mátrix (authorization limits)** — érték-küszöbök (kedvezmény-limit, PO-limit, sztornó-jóváhagyás) a meglévő `perm`-rendszerre ültetve; limit felett → „jóváhagyásra vár".
- **Szerződés + ütemezett számlázás (milestone billing)** — szerződés fizetési mérföldkövekkel (előleg/részszámla/végszámla ütemterv), ami a projekt-fázisokhoz kötve generálja a `finInvoices` draftokat. Híd: Projektek ↔ Pénzügy.

**(C-op) Iparág-közeli (a 4.7-A párjaként):** Maradékanyag / hulladék-raktár (offcut inventory) — a nesting/anyagoptimalizáláshoz, a használható kihullót külön lot-típusként a szabad készletbe.

**Státusz:** A1–A3 **✅ KÉSZ** (2026-06-08) — mindhárom a meglévő világ új képernyőjeként, a meglévő FSM/store/UI mintát követve, 0 konzol-hiba, verifikált integrációkkal (RFQ odaítélés → `createPOsFromReqs` → PO; leltár-zárás → `whAdjustLot`; gyártás-task → gép-nap kapacitás/ütközés). Részletek: lásd a CLAUDE.md megfelelő FSM-szakaszait + 3.34/3.35/3.36 lent. A B/C-op blokk a roadmapen marad.

**Visszajelzés-kör (2026-06-08):** **A1** — `pos` új `draft` állapot: `awardRfq` mostantól VÁZLAT PO-t hoz létre (megjegyzés a forrás-RFQ-ra), a vázlatok a Beszerzés → Ajánlatkérés tetején **szállító alá gyűjtve, összevonhatók** (`PoDraftPanel`, `mergeDraftPOs`/`releasePO`/`requisitionToDraftPO`/`createRfqFromPO` — „a vázlatból induljon az ajánlatkérés"). **A2-bugfix** — a Mozgások képernyő kifagyott ismeretlen mozgás-típuson (`Selejt`/`Zóna`/`Mozgatás`); a `MOV_TONE` kiegészítve + fallback (`movTone`). **A3** — idő-naplózás + **Feladat-terminál** (`page-prodterminal.jsx`, tablet-first): start/szünet/kész munka-naplózás, operátoronkénti termelékenység, a rendelés TELJES folyamat-lánca, felelősök (projekt felelős / gyártás-előkészítő / kiosztva), raktári kivét, dokumentumok, etikett **QR-szkennelés** (pl. „anyag nálam van"). **LS_KEY `jt_sim_v59`, seed `v: 42`**.

### 4.8-B Kereszt-metsző réteg — ✅ KÉSZ (2026-06-08)
A (B) roadmap-blokk mind a 3 eleme megépült és verifikálva (0 konzol-hiba):
- **B1 · Feladataim** (`tasks` világ, indigo) — szerep-független személyes munkafelület. SZÁMÍTOTT aggregátor (`unifiedTasks()`): minden világ feladata (gyártás · CRM · QA · karbantartás · reklamáció · logisztika · raktár · jóváhagyás) EGY listában, a saját FSM-jét megtartva. Enyém/Csapat nézet, személy-választó, kártya/lista váltó, forrás-szűrők; gyártási feladat-detail (idő-naplózás) újrahasználva, többi deep-linkel. A Gyártás → Feladat-terminál IDE költözött. `data-tasks.js`, `page-tasks.jsx`.
- **B2 · Hatáskör-mátrix** (Beállítások → Hatáskörök) — érték-küszöbök a perm fölött (`authConfig`: PO-érték / sztornó / kedvezmény). Limit felett → `requestApproval` (FSM `fuggoben→jovahagyva/elutasitva`) a Feladataim jóváhagyások közt; `decideApproval` (`auth.approve` jog) jóváhagyáskor végrehajtja a visszatartott műveletet (`releasePO` hook). `data-auth.js`, `page-auth.jsx`.
- **B3 · Szerződés + ütemezett számlázás** (Pénzügy → Szerződések) — milestone billing: szerződéses érték fizetési mérföldkövekre bontva (előleg/részszámla/végszámla); `billMilestone` a %-ból kimenő számla-piszkozatot generál a Pénzügyben (`finInvoices`), híd Projektek↔Pénzügy. `data-contracts.js`, `page-contracts.jsx`.

**LS_KEY `jt_sim_v59`, seed `v: 42`.** Visszajelzés-kör (2026-06-08): B2 — túlóra-elrendelés is engedélyköteles (`overtime.order` + `overtimeHours` küszöb, Attendance „Túlóra elrendelése" gomb → limit felett jóváhagyás). B3 — az új szerződés számlázási ütemterve a felhasználó által szerkeszthető (mérföldkövek label/%/kiváltó/típus, Σ=100%). Hátralévő roadmap: 4.7-A iparág-specifikus (CPQ, anyagoptimalizálás) + C-op maradékanyag-raktár.

---

## 4.9 ✅ Munkavédelem / EHS világ — üzemi munkavédelem (2026-06-14)

> **Honnan jött:** a 4.7-C „fehér folt" hármasából a **Munkavédelem / EHS**. A magyar **Mvt. (1993. évi XCIII. tv.)** kötelezettségeire húzva (kockázatértékelés, oktatás, baleset-kivizsgálás), ISO 45001 PDCA-szemlélettel. Faipar-specifikus profil (fapor/ATEX, gépbaleset, zaj, VOC). Build-jegyzet: `EHS_PLAN.md`.

**Fájlok:** `data-ehs.js` (FSM-konstansok + `EhsEngine` + seed), `page-ehs.jsx` (Áttekintés + Balesetek + Kockázatok + Oktatás), `page-ehs-2.jsx` (IncDetail/RiskDetail SlideOverök + sheetek). Módosítva: `app-store.jsx`, `data-worlds.js`, `data-tasks.js`, `portal.jsx`, `app-main.jsx`, `page-home.jsx` (ACCENT_MAP += red/lime/cyan/blue), mindkét HTML.

**Önálló `ehs` világ (accent red, ikon alert), HORGONY-elven** (egy igazságforrás, nincs duplikáció): ember-törzs = HR (`sim.employees`, oktatás `empId`-vel), gép-törzs = Karbantartás (`sim.assets`, kockázat `assetId`-vel), intézkedés (CAPA) → Feladataim (`unifiedTasks`). A Reklamáció (`service`) az átadás UTÁNI hurok — nem keverednek.

**Három entitás (FSM az incidensen; a kockázat-pont + oktatás-érettség SZÁMÍTOTT):**
- **Baleset/kvázibaleset** (`ehsIncidents[].status`): `bejelentve → kivizsgalas → intezkedes → lezarva` (+ `elutasitva`). Típus (baleset/kvazi/kornyezeti) + súlyosság (konnyu/munkakieso/sulyos) + **CAPA** (`actions[]`). Bejelentés PERM-MENTES; státuszváltás `ehs.manage` (indok kötelező elutasításnál). Akciók: `addEhsIncident` · `setEhsIncidentStatus` · `addEhsAction`/`toggleEhsAction`/`removeEhsAction`.
- **Kockázatértékelés** (`ehsRisks[]`): 5×5 valószínűség×súlyosság → `EhsEngine.score`/`band` (alacsony/közepes/magas/kiemelt); kontrollok + maradék-kockázat (resL/resS) + éves felülvizsgálat (`isReviewDue`). Akciók (`ehs.manage`): `addEhsRisk`/`updateEhsRisk`/`addEhsRiskControl`/`removeEhsRiskControl`/`reviewEhsRisk`.
- **Oktatás/kompetencia** (`ehsTrainings[]`): dolgozónkénti rekord (HR-horgony), `EhsEngine.trainStatus` (érvényes/hamarosan lejár/lejárt). Akciók: `addEhsTraining`/`renewEhsTraining`/`removeEhsTraining`.

**Bekötés:** Feladataim (`unifiedTasks` += nyitott incidens + nyitott CAPA, `TASK_SOURCES.ehs`). Új **`ehs.manage`** perm (`portal.jsx` + `acc-internal`). **Additív → NINCS LS-bump** (load-fallback pótolja `ehsIncidents`/`ehsRisks`/`ehsTrainings` + a `acc-internal.worlds/perms` migráció). Verifikálva: 4 képernyő render, detail+CAPA, 0 konzol-hiba.

**Hátralévő (lehetséges):** SDS/veszélyesanyag-regiszter (katalógus-horgony) + biztonsági bejárás (Quality-checklist klón); EVE/PPE-kiadás dolgozónként; munkavédelmi bejárás → CAPA. A 4.7-C-ből hátra: B2B/beszállítói portál, Vezetői BI-cockpit.

---

## 4.10 ✅ Beszállítói portál — külső önkiszolgálás (2026-06-14)

> **Honnan jött:** a 4.7-C „fehér folt" hármasából a **B2B/beszállítói portál**. A befelé jövő (RFQ → PO → bevételezés) lánc **beszállítói oldalát** nyitja meg — az eddig „szimulált" pont (a beszerző találta ki a beszállító árát) most **valódi ellenféllel** zárul. Minta: a B2C webshop (`account.type` szerinti teljes-képernyős ág) + a B2BHandshake (egy igazságforrás, két perspektíva).

**Fájlok:** `page-supplier.jsx` (teljes portál-váz + 3 nézet). Módosítva: `app-store.jsx` (supplier-helperek + akciók + load-migráció), `app-main.jsx` (`portal === "supplier"` ág), `portal.jsx` (`supplier.portal` perm), `data-rfq.js` (RFQ-005 seed: Falco meghívva). **NINCS új entitás** — a meglévő RFQ/PO FSM beszállítói oldali akciói.

**Teljes képernyős élmény** (mint a webshop), amikor `account.portal === "supplier"`. Teszt-fiók: **Falco Sopron Zrt.** (`acc-vendor`, `partnerId: pt-falco`, perm `supplier.portal`). A profilváltóból elérhető. **Scoping = `supplierName()`** — a beszállító CSAK a saját nevére szűrt RFQ-kat/PO-kat látja (más beszállítói adatot soha).

**3 nézet + a meglévő lánc beszállítói oldala:**
- **Áttekintés** — KPI (ajánlatra vár · bírálat alatt · visszaigazolásra vár · elnyert) + teendő-riasztás.
- **Ajánlatkérések** — `supplierRfqs()`, beszállító-specifikus állapot (`supplierRfqState`: beadando/beadva/nyertes/elveszett/lezart). Az ajánlat-beadó panel (`RfqBidPanel`) soronkénti ár+átfutás → **`submitSupplierBid(rfqId, bidsByLine, note)`** (csak `kikuldve` RFQ-ra) → a bid a meglévő `rfq.suppliers[].bids`-be száll, `responded:true` (a belső `awardRfq` ezt bírálja).
- **Megrendelések** — `supplierPos()` (a beszállítóra szűrt, nem-draft PO-k); **`acknowledgePO(poId,{promiseDate})`** (visszaigazolás + vállalt szállítás) → **`markPOShipped(poId)`** (feladva/ASN). A belső `receivePO` ezt zárja bevételezéssel.

**Egy igazságforrás:** minden beszállítói akció a már létező FSM másik oldala — az adat egy helyen él, nincs duplikáció. Verifikálva: portál render + scoping (Falco 3 RFQ-ja helyes állapottal) + ajánlat-beadás (beadando→beadva, árak rögzülnek) + PO visszaigazolás/feladás, 0 boot-hiba.

**Hátralévő (lehetséges):** ~~beszállítói számla-benyújtás~~ ✅ **KÉSZ (4.12, 2026-06-15)** — `submitSupplierInvoice` → `dir:in` piszkozat (befogadásra vár), portál „Számláim" tab + benyújtó panel, belső Pénzügy „Befogadás" + portál-badge. Még: önkiszolgáló árlista (`procCatalog.sources`), beszállítói reklamáció-válasz (bejövő QA `selejt`).

---

## 4.11 ✅ Partner-kapcsolat nézet — a portál belső tükre (2026-06-14)

> **Honnan jött:** felhasználói ötlet — „ha rendszeren belül van egy cég, és megnyitja a partnere oldalát, ugyanazt (sőt többet) kell látnia, mint amit egy külsős lát a nála nyilvántartott folyamatairól". A beszállítói portál (4.10) **belső tükre**: a B2B kapcsolat szimmetrikus, EGY igazságforrással (a közös RFQ/PO/kézfogás lánc). A CLAUDE.md „VENDÉG NÉZET vs Megnyitás" elve egy egész kapcsolatra méretezve.

**Fájlok:** `page-partner.jsx` (`PartnerCockpit` teljes képernyős). Módosítva: `app-store.jsx` (partner-helperek + seed + load-migráció), `page-settings2.jsx` (PartnersPanel élő `sim.partners`-re kötve + cockpit-megnyitás). **NINCS új entitás** — a meglévő RFQ/PO/kézfogás lánc partner-névre szűrve + a customer-profil/jegyzet minta tükrözve.

**Belépő:** Beállítások → Partnerek → partner megnyitása → teljes szélességű `PartnerCockpit` (a szűk SlideOver helyett). A PartnersPanel mostantól a valós `sim.partners`-ből listáz (9 partner; Falco + Egger anyag-beszállító beemelve a gazdag RFQ/PO adathoz).

**Két nézet egy vásznon (`view` toggle):**
- **Belső nézet** (alap): kapcsolati KPI-k (velük költött · nyerési arány · átlag átfutás · megtakarítás/késés — `partnerStats`, SZÁMÍTOTT) + RFQ + PO + kézfogás listák **belső extrákkal** (ajánlatuk értéke, PO-összeg) + **minősítés** (csillag + megbízhatóság, `partnerProfile`) + **belső jegyzetek** (`partnerNotesFor`/`addPartnerNote`).
- **Partner szemével** (vendég-tükör): ugyanaz a lista, de a belső adatok (ár, árrés, jegyzet, minősítés) rejtve — „Ezt látja {partner} a saját portálján." sávval.

**„Belépés partnerként"** (`accountForPartner` → `setAccount`): ha a partnernek van portál-fiókja (Falco → `acc-vendor`), átvált a valódi portál-nézetébe (impersonate). A read-only tükör + a tényleges belépés kombinációja.

**Store (mind perm-mentes, SZÁMÍTOTT vagy map):** `partnerByName` · `accountForPartner` · `partnerHandshakes` · `partnerStats` (spend/winRate/avgLead/savings/lateCount) · `partnerProfile`/`setPartnerProfile` · `partnerNotesFor`/`addPartnerNote`/`removePartnerNote`. **Additív → NINCS LS-bump** (load-fallback pótolja `partnerProfiles`/`partnerNotes` + a Falco/Egger partnert). Verifikálva: cockpit render, KPI-k, nézet-váltó, jegyzet+minősítés CRUD, Belépés → acc-vendor, 0 konzol-hiba.

---

## 5. Konvenciók & technikai megjegyzések

- **Stílus:** Tailwind utility osztályok; paletta **stone** (semleges) + **teal** (kiemelés); modulonként akcent-szín.
- **Babel-szkriptek külön scope-ban futnak** — a megosztott komponensek `window`-ra exportálódnak (`Object.assign(window, {...})`), és úgy érhetők el más fájlból.
- **Stílusobjektum-névütközés tilos** — egyedi nevek vagy inline stílus (lásd a projekt-szabályokat).
- **Store-séma változásakor** emeld a `LS_KEY` verziót (`jt_sim_vN`), különben a régi mentés ütközhet.
- **Mobil mérce:** min. 44px érintési célok; nincs vízszintes kilógás; alulról nyíló panelek `env(safe-area-inset-bottom)` térközzel.
- **Ellenőrzés:** minden nagyobb változás után irányított verifier-futtatás mobil + asztali nézetben.

---

## 6. Fiókok a demóhoz (profilváltó)

| Fiók | Típus | Világok | Kulcs-jogosultságok |
|---|---|---|---|
| JoineryTech (belső) | internal | mind | mind (konvertálás, gyártásba adás, hozzáférés-kezelés) |
| Bognár Bútor Kft. | B2B | Értékesítés, Gyártás, Bolt | ajánlat, konvertálás, továbbajánlás, követés |
| Lakberendezés Plusz | viszonteladó | Értékesítés | ajánlat, **továbbajánlás**, követés (konvertálás **nincs**) |
| Nagy Anna | B2C | (webshop) | rendelés, követés |

---

## 3.27 ✅ Pénzügy világ — kimenő/bejövő számlák + kifizetések (`data-finance.js`, `page-finance*.jsx`)

> **Honnan jött:** „Szeretnék egy pénzügyi részt, ahova a számlák és kifizetések kerülnek." A rendszerben volt szállítói számla a Beszerzésben (three-way match), de nem volt egységes pénzügyi otthon, kimenő (vevői) számla, sem kifizetés-követés.

**Mit csináltunk:**
- **Önálló `finance` világ** (Home-on, emerald akcent, `receipt` ikon) — al-menü: **Áttekintés / Kimenő számlák / Bejövő számlák / Kifizetések**. Felvéve: `WORLDS`, `WORLD_ORDER`, `enabledModules` default, `acc-internal.worlds`.
- **Egy közös számla-lista:** `sim.finInvoices[]` — `dir:"out"` (vevői, amit MI állítunk ki) | `dir:"in"` (szállítói, a Beszerzésből ide gyűjtve). A **kifizetések külön:** `sim.finPayments[]` (számlánként több → **részfizetés**), `amount` a számla pénznemében.
- **Kimenő számla FSM (`status`):** `draft → issued → partial → paid` (mellék: `void` = sztornó). A **`overdue` SZÁMÍTOTT** (`finIsOverdue`: dueDate < today ÉS van hátralék); a megjelenítendő státuszt `finEffectiveStatus` adja. A **partial/paid a kifizetésekből számítódik** (`addPayment` után automatikus). `FIN_INV_FLOW` az engedélyezett átmenetekhez.
- **Számla-fajták** (`FIN_KIND_META`): `normal` (végszámla) · `advance` (előleg-számla) · `proforma` (díjbekérő — nem ÁFA-bizonylat). **Pénznem** HUF/EUR (`fxRate` → HUF az áttekintőn, `finToHuf`). **ÁFA-bontás** kulcsonként + nettó/ÁFA/bruttó összesítő (`FinVatSummary`). **Fizetési módok** (`FIN_PAY_METHOD`): banki / készpénz / bankkártya.
- **Store-akciók (mind `finance.manage` joghoz kötve):** `createInvoiceFromOrder(orderId,{kind,advancePct})` (rendelésből draft — sorokból vagy előleg-%-ból), `issueInvoice`, `voidInvoice(id,reason)` (indok kötelező, fizetett nem sztornózható), `addPayment(invoiceId,{amount,method,date,ref})` (validált: pozitív, ≤ hátralék). Helperek: `finBalance`, `finPaidSum`, `finNet/finVat/finGross`. **Áttekintő:** `finStats()` → kintlévőség / fizetendő / lejárt / cashIn / cashOut / net.
- **Áttekintés** (`FinanceDashboard`): 4 KPI + cash-flow sávok (bevétel vs kiadás) + teendők (piszkozat / lejárt kintlévőség / nyitott fizetendő) + lejárt-kintlévőség és esedékes-fizetendő listák. **Kimenő/Bejövő** (`FinanceOutgoing`/`FinanceIncoming`): szűrők + kereső + sor→részlet SlideOver (`InvoiceDetailBody`: tételek, ÁFA, kifizetések, hátralék, akciók). **Kifizetések** (`FinancePayments`): pénzmozgás-lista be/ki iránnyal, mód-jelvény, összesítők.
- **Beszerzés-csökkentés:** a `procurement` világból **kivettük** a `invoices` + `match` screeneket; a teljes számlakezelés a Pénzügybe költözött. A PO-részletben (`page-procurement1.jsx`) csak egy **minimális „leszámlázva-e" jelzés** maradt (a `finInvoices` `dir:"in"` + `orderRef` alapján). A bejövő-számla részletben **minimális egyeztetés** is van („valóban rendeltek-e ilyet" — a `orderRef` PO megléte a `sim.pos`-ban).
- **Jog:** új `finance.manage` (`portal.jsx` PERM_CATALOG + `acc-internal.perms`). Jog hiányában a műveletek LEZÁRTAK (lock-jelzés), nem rejtettek.
- **Séma:** LS_KEY `jt_sim_v48`, seed `v: 31` (új mezők: `finInvoices`, `finPayments`, `finSeq:44`, `finPmtSeq:9`; `load()` null-check migrációval). Demó: 8 kimenő (köztük EUR díjbekérő `DB-2426-007`, sztornózott `SZ-2426-0035`, lejárt + részben fizetett), 5 bejövő (köztük EUR `SINV-2426-043`, lejárt `SINV-2426-041`), 5 seed-kifizetés.

**Állapotgép / store:** `finInvoices[].status` (FSM fent) · `finPayments[]` (részfizetés) · akciók a fenti listában · `FIN_INV_TONE` színek.

**Hátralévő (lehetséges):** számla PDF/nyomtatás-nézet; ismétlődő/ütemezett számlák; banki kivonat-import + automatikus párosítás; jóváírás (credit note) a sztornó helyett részleges visszavételhez.

---

## 3.28 ✅ Logisztika világ — Kiszállítás & Telepítés (+ beszállítás, felmérés)

> **Honnan jött:** a 4.6 gap-analízis #1 javaslata — „a logisztika a logikus következő lépés". A lánc eddig a `delivered`-nél megállt; bútornál a fizikai kiszállítás + **helyszíni telepítés** önálló, nehéz folyamat, és pont ez köti össze a Projektek `install` mérföldkövét a valósággal. A kérdőív szerint: **teljes helyszíni lánc** (felmérés + kiszállítás + telepítés), **kétirányú fuvar** (saját sofőr beszállításra is), **ütközés-figyelő ütemezés**, **sofőr-terminál**, **B2B kiadás**, **ügyfél-követés**.

**Fájlok:** `data-logistics.js` (típusok, FSM-folyamatok, tónusok, járművek/brigádok seed, fuvar-seed, `window.LogEngine` motor), `page-logistics.jsx` (diszpécser: Áttekintés + listák + heti Ütemezés + közös vizuális elemek), `page-logistics-2.jsx` (részlet-SlideOver + sofőr-terminál + erőforrások + „Új fuvar" sheet). Akcent: **sky** (`page-home.jsx` `ACCENT_MAP` + `truck` WorldIcon; `ui.jsx` új ikonok: `truck`, `pin`, `calendar`, `clock`, `route`, `signature`). **LS_KEY `jt_sim_v49`, seed `v: 32`.**

### Három fuvar-TÍPUS, közös erőforrás-réteg
A `sim.shipments[]` központi fuvar-tétel `type` szerint ágazik (`LOG_TYPE_META`/`LOG_TYPE_ORDER`):
- **`delivery` (Kiszállítás+telepítés)** — kész bútor az ügyfélhez (OUTBOUND); `install:true` → a beszerelés-lépés is aktív.
- **`pickup` (Beszállítás)** — saját fuvar áruért a beszállítóhoz (INBOUND); a beérkezés bevételezés-javaslatot posztol a Raktárba.
- **`survey` (Felmérés)** — helyszíni bemérés a gyártás előtt.
A jármű (`sim.vehicles[]`, rakodókapacitás m³/kg) és a brigád (`sim.crews[]`, tagok + `CREW_SKILLS`) **közös** mindhárom típusnak.

### Fuvar-FSM (típusonként, validált) — `LOG_FLOWS` + `LogEngine`
- **delivery:** `tervezett → berakodva → uton → kiszallitva → beszerelve → atadva` (mellék: `reklamacio` a kiszállítás után; `torolve`). **`install:false` esetén a `beszerelve` kimarad** (`LogEngine.steps`/`nextStates` szűri) → `kiszallitva → atadva`.
- **pickup:** `tervezett → uton → felveve → beerkezett`.
- **survey:** `tervezett → uton → helyszinen → kesz`.
- Átmenet: **`setShipmentStatus(id, to, {reason})`** — validált (`LogEngine.canGo`); a tiltott átmenet nincs felkínálva, `reklamacio`-hoz **indok kötelező**. Átgyűrűzés: `delivery` `atadva` → a kapcsolt **rendelés `delivered`**; `pickup` `beerkezett` → rendszerüzenet a Raktárnak (bevételezhető). Tónusok: `LOG_STATUS`.

### Ütemezés + ütközés-figyelés
- `scheduleShipment(id, {date, windowStart, windowEnd, vehicleId, crewId})`. **Ütközés** = ugyanaz a jármű VAGY brigád, ugyanaznap, **átfedő időablak** — tiszta számítás `LogEngine.conflicts()`/`conflictIdSet()` (idő-átfedés HH:MM). A diszpécser-Áttekintésen riasztó-sáv, a listában/részletben „ütközés" jelvény, az **Ütemezés** nézet **jármű-soros heti idővonal** (14 nap, fuvar-chipek a típus színével, ütköző fuvar piros kerettel; „Kiadva partnernek" és „Nincs jármű" sorok is).

### Belépési pontok (a fuvar onnan keletkezik)
`createDeliveryFromOrder(orderId,{install})` (rendelés ready/released/delivered), `createDeliveryFromProject(projectId)` (projekt install — átveszi az `installTarget`-et), `createPickupFromPO(poId)` (futó beszerzési PO → saját beszállítás), és kézi `createShipment(data)`. Mind az **„Új fuvar" sheetből** (`NewShipmentSheet`) választható: típus + (delivery) telepítés-kapcsoló + forrás-legördülő (kész rendelések / install-projektek / futó PO-k) + dátum + megjegyzés.

### Átadás-átvétel (delivery, kiszállítva után)
A fuvar `handover{}` mezője: **ügyfél aláírás** (`signedBy`/`signedAt`), **fotók** (számláló), **hiánylista** (`deficiencies[]`, `minor`/`major` súlyosság — `LOG_DEFECT_SEV`), **átadási jegyzőkönyv** (`generateHandoverProtocol` → rendszerüzenet). Akciók: `setShipmentHandover`, `addShipmentDefect`/`removeShipmentDefect`.

### Sofőr / szerelő terminál (mobil-első)
`DriverTerminal` — a mai túra (`date === today`, nem terminál, nem kiadott) jármű-szűrővel, sorszámozott megálló-kártyák nagy „Következő lépés" + „Hívás" gombbal (hüvelykujj-zóna), koppintásra a teljes részlet.

### B2B kiadás (kézfogás) + ügyfél-követés
- `delegateShipment(id, partnerId)` → `handshakes[]` `kind:"transport"` (a meglévő kézfogás-mintára) + a fuvarra `delegatedTo`; `recallShipment` visszavonja. A partnerek a platform `installer`/`supplier`/`manufacturer` fiókjai (pl. **Beépítő Csapat Kft.**). Seed-demó: `SH-2426-007` kiadva (`HS-SH-007`).
- **Webshop ügyfél-követés** (`webshop.jsx` `DeliveryTrack`): ha a rendeléshez tartozik delivery-fuvar, egyszerűsített **4 lépéses sáv** (Ütemezve → Úton → Kiszállítva → Átadva, `LOG_CUSTOMER_STEPS` + `LogEngine.customerStep`) az ETA-val — az ügyfél kevesebbet lát, mint a diszpécser.

### Erőforrások + fiók-aktiválás
- **Erőforrások** képernyő (`ResourcesPanel`): járművek (kapacitás) + brigádok (tagok, kompetenciák) lista + egyszerű hozzáadás/törlés (`addVehicle`/`removeVehicle`/`addCrew`/`removeCrew`).
- Új `logistics` világ (`data-worlds.js` WORLDS + WORLD_ORDER), al-menü: Áttekintés / Kiszállítások / Beszállítások / Ütemezés / Sofőr terminál / Erőforrások. `acc-internal.worlds` + `enabledModules` default + RootTweaks. Célközönség: A1 (összevont) → A3–A4 (külön beszerelő részleg), B3 koordinátor.

**Állapotgép / store:** `shipments[].status` (FSM fent, típusonként) · járművek/brigádok · akciók a fenti listában · `LOG_STATUS`/`LOG_TYPE_META`/`LOG_DEFECT_SEV` tónusok. Seed: 7 fuvar (lezárt átadás, ma beszerelve hiánnyal, úton, jövőbeli install, beszállítás úton, felmérés, kiadott) + 3 jármű + 3 brigád; beépített ütközés-demó (veh-2 két átfedő fuvar 2026-04-28).

**Hátralévő (lehetséges):** valódi térkép + útvonal-optimalizálás (most jármű-soros idővonal); rakomány-kapacitás vs. fuvar-térfogat ellenőrzés a beosztásnál; partner-oldali fuvar-elfogadás kibontása; fotó-feltöltés (image-slot) a számláló helyett; `pickup` `beerkezett` → automatikus bevételezés-előtöltés a Raktárban.

---

## 3.29 ✅ Kontrolling világ — projekt-jövedelmezőség, terv vs. tény (utókalkuláció)

> **Honnan jött:** a 4.6 gap-analízis #2 javaslata. A Pénzügy a számlákat kezeli, de nem volt **projekt-jövedelmezőség** — pedig asztalosnál ez dönti el, nyereséges-e a meló. **NEM új FSM**, hanem SZÁMÍTOTT réteg a meglévő adatokból (egy igazságforrás marad). Kérdőív szerint: **mindkét szint** (projekt + benne a rendelések), **automatikus alap + kézi korrekció**, minden költség-kategória, **bevétel a kimenő számlákból**, terv a kalkulált (MfgPrep) + ajánlat alapján, nézetek: portfólió-áttekintő + projekt-fedezeti lista + eltérés-elemzés.

**Fájlok:** `data-controlling.js` (kategória-meta `CTRL_CATEGORIES`, default config `CTRL_DEFAULTS`, fedezet/eltérés tónusok, fmt, seed korrekciók `CTRL_ADJ_SEED`), `app-store.jsx` (számító motor + CRUD + seed), `page-controlling.jsx` (Áttekintés / Projekt-fedezet / Eltérés-elemzés + projekt-detail SlideOver). Akcent: **slate** (`page-home.jsx` `ACCENT_MAP` + `chart` WorldIcon). **LS_KEY `jt_sim_v50`, seed `v: 33`** (új mezők: `ctrlConfig`, `ctrlAdjustments`, `ctrlAdjSeq`).

### Modell — „automatikus alap + kézi korrekció"
A **számítás a store-ban él** (state-hozzáférés kell). `controllingForProject(projectId)` projektenként összeveti a TERVET és a TÉNYT költség-kategóriánként (`CTRL_CAT_ORDER`: anyag · munka · bérmunka · szállítás · beszállító · rezsi):
- **TERV:** anyag+munka a **`MfgPrep.derive(project)`** kalkulált gyártás-előkészítésből (material+hardware / labor), szállítás a kapcsolt fuvarokból (becsült díj), bérmunka a kézfogásokból; fallback prep-snapshot ill. szerződéses érték × `targetCostRatio`. A **szerződéses érték** (Σ item.value) a terv-bevétel.
- **TÉNY (auto):** anyag = raktári **kivét** (`withdrawals` kiadva, a projekt rendeléseire) × katalógus-ár; bérmunka = a projekt **B2B kézfogásai** (accepted/done, payload-ár vagy becslés); szállítás = a kapcsolt **fuvarok** (legalább úton) díja; beszállító = a rendelésekhez kötött **bejövő számlák** (`finInvoices` dir:in). 
- **TÉNY (kézi):** `ctrlAdjustments[]` — terv és/vagy tény pót-tételek kategóriánként (pl. **munkaóra-napló**, ahol nincs automatikus időmérés; pótrendelés; korrekció). CRUD: `addCtrlAdjustment` / `updateCtrlAdjustment` / `removeCtrlAdjustment`.
- **Rezsi:** SZÁMÍTOTT — `overheadPct` (alap 12%, állítható) a direkt költségeken.
- **Bevétel:** a **kimenő számlák** (`finInvoices` dir:out, a projekt rendeléseire, EUR→HUF), fallback a szerződéses értékre („még nincs kiállított számla" jelzéssel).
- **Fedezet:** terv = (szerződéses − terv-össz)/szerződéses; tény = (tény-bevétel − tény-össz)/tény-bevétel. `ctrlMarginTone` (veszteséges/gyenge/közepes/jó), `ctrlVarianceTone` (túllépés rose / megtakarítás emerald — a tény−terv előjele).

### Nézetek (`page-controlling.jsx`)
- **Áttekintés** (`ControllingDashboard`): portfólió-KPI-k (szerződéses, számlázott, terv/tény összköltség, tény fedezet), top/flop fedezet-kártya, kompakt projekt-lista fedezet-sávval, gyors rezsi%-állító. `controllingPortfolio()` aggregál + top/flop rangsor.
- **Projekt-fedezet** (`ControllingProjects`): asztali táblázat (bevétel / terv ktg / tény ktg / eltérés / fedezet), mobil kártyák; rendezés fedezet/eltérés/bevétel szerint; sor → detail.
- **Eltérés-elemzés** (`ControllingVariance`): kategóriánkénti portfólió-aggregátum terv/tény sávpárral, és a költség-túllépő projektek listája.
- **Projekt-detail** (`ProjectControllingDetail`, SlideOver): bevétel+fedezet összegző, **kategória-bontás táblázat** (terv | tény | eltérés) + összesítő, rendelés-szintű roll-up (számlázott + költség-hányad), kézi korrekciók listája + „Új korrekció" űrlap.

### Fiók-aktiválás + állapot
Új `kontrolling` világ (`data-worlds.js` WORLDS + WORLD_ORDER a Pénzügy után), al-menü: Áttekintés / Projekt-fedezet / Eltérés-elemzés. `acc-internal.worlds` + `enabledModules` default + RootTweaks. **Nincs státuszgép** (számított nézet). Seed korrekciók: 6 tétel a PRJ-2026-014 és -013 projektre (munkaóra-napló, pótrendelés, bérmunka-, beszállítói-ráterhelés) — ezek adják a „tény" kézi részét a demóban. Célközönség: A3–A4 (mérhető fedezet), B2 iroda.

**Hátralévő (lehetséges):** rendelés-szintű önálló utókalkuláció (most projekt-roll-up + arányos hányad); cél-fedezet riasztás; idősoros költség-felhalmozás (burn) a projekt élettartamán; export (PDF/CSV); a PO→projekt link erősítése a beszállítói számlák pontosabb projekthez rendeléséhez.

---

## 3.30 ✅ Reklamáció világ — szerviz / garancia / hiánypótlás (átadás utáni hurok)

> **Honnan jött:** a 4.6 gap-analízis #3 javaslata. A fizikai lánc (Logisztika) az `átadva`-nál zárult; az átadás utáni utóélet (garanciális reklamáció, hiánypótlás, karbantartás) eddig nem volt kezelve. A kérdőív szerint: **3 jegytípus** (garancia + hiánypótlás + karbantartás), **4 csatorna**, hatlépéses FSM, **3 megoldási mód** (mind bekötve a Logisztikába/gyártásba/visszáruba), garancia-idő + lejárat, **B2B kiadás**, **prioritás + SLA**, webshop bejelentő + követés.

**Fájlok:** `data-service.js` (típusok, FSM, prioritás/SLA, garancia, tónusok, seed jegyek, `window.ServiceEngine`), `page-service.jsx` (diszpécser: Áttekintés + Bejelentések lista + Tábla + közös vizuális elemek), `page-service-2.jsx` (részlet-SlideOver + felvétel-sheet), `webshop.jsx` (ügyfél bejelentő + követés `MyService`/`CustomerTicketForm`). Akcent: **rose** (`page-home.jsx` `ACCENT_MAP` + `shield` WorldIcon; `ui.jsx` új `shield` Icon). **LS_KEY `jt_sim_v51`, seed `v: 34`** (új mezők: `serviceTickets`, `svcSeq`).

### Jegytípusok + FSM (a jegyen él)
A `sim.serviceTickets[]` központi jegy `type` szerint (`SVC_TYPE_META`): **`garancia`** (garanciális reklamáció) · **`hianypotlas`** (átadási hiánylistából) · **`karbantartas`** (utánállítás/beállítás).
- **FSM** (`SVC_FLOW`): `bejelentve → kivizsgalas → utemezve → javitas → ellenorzes → lezarva` (mellék: bármely fázisból `elutasitva` az `ellenorzes`/`javitas` előtt; `ellenorzes → javitas` rework-hurok; `elutasitva → bejelentve` újranyitás). Átmenet: **`setTicketStatus(id, to, {reason})`** — validált (`ServiceEngine.canGo`); `elutasitva`-hoz **indok kötelező**. Tónusok: `SVC_STATUS`.

### Csatornák (a jegy onnan keletkezik)
- **Webshop** (D1/D2 önkiszolgáló): `CustomerTicketForm` → `createTicket(channel:"webshop")`.
- **Belső felvétel** (diszpécser): `NewTicketSheet` → `createTicket(channel:"internal")`.
- **Logisztika `reklamáció` ág → auto-jegy:** a `setShipmentStatus(...,"reklamacio")` meghívja a **`createTicketFromShipment`**-et (garancia-jegy, magas prio, a fuvar ügyfelével/refjével; duplikáció-védett).
- **Átadási hiánylista-tétel → jegy:** `createTicketFromDefect(shipmentId, idx)` (hiánypótlás-jegy a hiba súlyossága szerinti prioval).

### Prioritás + SLA + garancia
- **Prioritás** (`SVC_PRIORITY`): alacsony/közepes/magas/sürgős, mindegyikhez **SLA-nap** (14/7/3/1). A `createTicket` a bejelentés dátumából + SLA-napból számítja a `dueDate`-et. `ServiceEngine.sla(ticket)` → hátralévő napok / lejárt; az Áttekintésen „SLA lejárt" riasztó.
- **Garancia:** az **átadás dátumától** (`installedAt`) + `warrantyMonths` (alap 24) → `ServiceEngine.warranty(ticket)` (garancián belül/kívül + lejárat + hátralévő napok). Jelvény a listában és a részletben.

### Megoldási módok (bekötés a többi világba)
`setTicketResolution(id, mode)` (`SVC_RESOLUTION`): **`helyszini`** (szerelő kimegy → `ticketCreateShipment` delivery-fuvar a Logisztikába) · **`csere`** (csere-alkatrész → `ticketCreateOrder` draft gyártási rendelés) · **`behuzas`** (visszáru → pickup-fuvar) · **`beallitas`** (no-op). A részletben a választott módhoz egy bekötés-gomb jelenik meg, ami létrehozza és linkeli a fuvart/rendelést (`linkedShipmentId`/`linkedOrderId`).

### B2B kiadás + ügyfél-követés
- `delegateTicket(id, partnerId)` → `handshakes[]` `kind:"service"` + jegyre `delegatedTo`; `recallTicket` visszavon (a Logisztika/bérmunka kézfogás-mintára).
- **Webshop követés** (`MyService`): a D1/D2 ügyfél saját jegyei, egyszerűsített **4 lépéses** állapot (`SVC_CUSTOMER_STEPS`: Bejelentve → Vizsgálat alatt → Javítás folyamatban → Megoldva, `ServiceEngine.customerStep`); elutasított jegynél udvarias üzenet. Új tab a webshop fejlécben (badge = nyitott jegyek).

### Nézetek + fiók-aktiválás
- **Áttekintés** (`ServiceDashboard`): KPI-k (nyitott / SLA lejárt / sürgős-magas / garanciális), SLA-riasztó, nyitott lista prioritás-rendezve.
- **Bejelentések** (`ServiceTickets`): szűrhető lista (típus + státusz + keresés).
- **Tábla** (`ServiceBoard`): státusz-oszlopok (kanban-szerű), kártyán típus/prioritás/SLA.
- Új `service` világ (`data-worlds.js` WORLDS + WORLD_ORDER a Logisztika után), al-menü: Áttekintés / Bejelentések / Tábla. `acc-internal.worlds` + `enabledModules` default + RootTweaks. Célközönség: A3–A4 (külön szerviz-részleg).

**Állapotgép / store:** `serviceTickets[].status` (FSM fent) · akciók: `createTicket` / `createTicketFromShipment` / `createTicketFromDefect` / `setTicketStatus` / `setTicketResolution` / `ticketCreateShipment` / `ticketCreateOrder` / `delegateTicket` / `recallTicket`. Seed: 5 jegy (Logisztika-hiánypótlás ütemezve, webshop garancia kivizsgálás, belső karbantartás bejelentve, lezárt helyszíni javítás, elutasított garancián kívüli).

**Hátralévő (lehetséges):** fotó-csatolmány a bejelentéshez (image-slot); fizetős (nem garanciális) javítás → ajánlat/számla a Pénzügybe; visszatérő karbantartás ütemezés; a Kontrollingba szerviz-költség kategória; partner-oldali szerviz-elfogadás kibontása.

---

## 3.31 ✅ HR / Munkaerő-kapacitás világ — dolgozók, kapacitás, jelenlét/távollét

> **Honnan jött:** a 4.6 gap-analízis #4 javaslata — a Logisztika brigádjai (`crews`) eddig string-névlisták voltak, igazi dolgozói törzs és kapacitás-tervezés nélkül. A kérdőív szerint: **kapacitás-tervezés + munkaidő/jelenlét + dolgozói törzs + bérköltség→Kontrolling + feladat-kiosztás**, a HR-dolgozó az **egy igazságforrás** (a brigád ebből áll össze), **mindkét** kapacitás-modell (számított túlterhelés + távollét-FSM), **hr.manage** perm, amber akcent.

**Fájlok:** `data-hr.js` (osztályok `HR_DEPTS`, készségek `HR_SKILLS` + szintek, bér `HR_PAY_GRADES`, távollét-típusok + FSM `ABS_FLOW`/`ABS_STATUS`, seed: 11 dolgozó / 5 távollét / 7 beosztás / 3 munkaóra-napló, `window.HrEngine` kapacitás-motor), `page-hr.jsx` (Áttekintés + Dolgozók + Kapacitás-naptár + közös pill-ek `Avatar`/`DeptPill`/`SkillChip`/`AbsStatusPill`/`UtilBar`/`HrDetailHost`), `page-hr-2.jsx` (`EmployeeDetail` SlideOver + `HrAbsence` + `HrSkills` + sheetek). Akcent: **amber** (`data-worlds.js` icon `user`). **LS_KEY `jt_sim_v52`, seed `v: 35`**.

### Dolgozói törzs = egy igazságforrás (a brigádok ebből)
A `sim.employees[]` az emberi erőforrás kanonikus otthona: `{ id, name, initials, role, dept, facilityId, payGrade, weeklyHours, employment, skills:[{key,level}], phone, email, startedAt, active, color }`. A Logisztika `crews[].memberIds` EZEKRE mutat (a régi `members[]` string-lista **vizuális fallback** marad); `crewMembersResolved(crew)` oldja fel. Így a fuvar-beosztás automatikusan terheli a HR-kapacitást — **közös erőforrás-réteg**, nem duplikált.

### Kapacitás — SZÁMÍTOTT (nincs rá külön státusz)
`HrEngine` tiszta számítás: `dayCapacity(emp)` = heti óra / 5; **napi terhelés** = projekt-/feladat-beosztás (`assignments[]`, napi `hoursPerDay` a `[start..end]` munkanapokon) + **fuvar-beosztás** (a dolgozó valamely crew tagja, amely aznap fuvarban van — a Logisztikából, az időablakból számolt óra). **Túlterhelés** = lekötött > kapacitás (`dayLoad().over`); `hrOverloadSet(days)` adja a (dolgozó, nap) halmazt. A **Kapacitás-naptár** dolgozó-soros 2 hetes rács — szabad (zöld) / közel tele &gt;85% (sárga) / túlterhelt (piros keret) / távollét cella. Heti összegzés: `weekSummary(empId, monday)`.

### Távollét-kérelem — FSM (a kérelmen él)
`absences[].status`: **`kert → jovahagyva → folyamatban → lezarva`** (mellék: `elutasitva`, abból `kert`-re újranyitható). Átmenet: **`setAbsenceStatus(id, to, {reason})`** — validált (`HrEngine.absCanGo`); **jóváhagyás / elutasítás `hr.manage` joghoz** kötött (jog nélkül LEZÁRT gomb + lakat-tooltip), `elutasitva`-hoz **indok kötelező**. A blokkoló státuszok (`ABS_BLOCKING`: jóváhagyva/folyamatban/lezárva) **kiveszik a kapacitásból** azt a napot (a naptárban „táv" cella, a jelenlétben „ma távol"). Típusok (`ABS_TYPE_META`): szabadság / betegszabadság / fizetés nélküli / egyéb.

### Bérköltség → Kontrolling tény (munkaóra-napló pótlása)
A `timeLogs[]` (`{empId, projectId, date, hours, note, pushedToCtrl}`) a projekt **tény-bérköltség** forrása. **`pushTimeLogToCtrl(logId)`** átküldi a Kontrollingba: `addCtrlAdjustment(scope:project, category:"munka", actual = óra × óradíj)` — pont a CLAUDE.md szerint „munka = kézi tételek (műhely-napló)". Az óradíj `HrEngine.rate(emp)` (emp.hourlyCost vagy a bér-kategória rate-je).

### Készség-mátrix + bér
Készségek szintezve (`HR_SKILL_LEVELS` 1 Alap / 2 Rutin / 3 Mester), a Logisztika `CREW_SKILLS` (szallit/szerel/felmer) ide olvad a gyártási készségekkel (szabás/élzárás/cnc/összeszerelés/felület/…) együtt. A **Készség-mátrix** dolgozó × készség rács; a profilban `hr.manage`-dzsel szerkeszthető (`setEmployeeSkill`). Bér-kategória óradíjjal (`HR_PAY_GRADES`).

### Nézetek + fiók-aktiválás
- **Áttekintés** (`HrDashboard`): KPI-k (létszám / heti kapacitás / lekötött / kihasználtság), mai jelenlét (bent/távol), túlterhelés-figyelmeztetés (2 hét), nyitott távollét-kérelmek gyors jóváhagyással.
- **Dolgozók** (`HrPeople`): szűrhető lista (részleg + keresés) heti terhelés-sávval → profil SlideOver (`EmployeeDetail`: adatok + kapacitás + beosztások + távollétek + készségek + munkaóra-napló → Kontrolling).
- **Kapacitás** (`HrCapacity`): a fenti naptár-rács. **Távollét** (`HrAbsence`): FSM-vezérelt kérelem-lista + új kérelem. **Készségek** (`HrSkills`): mátrix.
- Új `hr` világ (`data-worlds.js` WORLDS + WORLD_ORDER a Reklamáció után), `acc-internal.worlds` + `enabledModules` default + RootTweaks + nav-lista. Új **`hr.manage`** perm (`portal.jsx` PERM_CATALOG + acc-internal). Célközönség: A2–A4 (méret szerint nő a HR-igény).

**Állapotgép / store:** `absences[].status` (FSM fent) · akciók: `addEmployee`/`updateEmployee`/`setEmployeeSkill`/`removeEmployee`/`crewMembersResolved`, `addAssignment`/`removeAssignment`, `addAbsence`/`setAbsenceStatus`, `addTimeLog`/`removeTimeLog`/`pushTimeLogToCtrl`, kapacitás: `hrDayLoad`/`hrWeekSummary`/`hrPresenceToday`/`hrOverloadSet`/`hrRate`. Seed: 11 dolgozó (a Logisztika brigád-tagjai + Shop Floor operátorok = ugyanazok), túlterhelés-demó (Nagy János 4.28: projekt-beosztás + 2 fuvar), betegszabadság-demó (Tóth Kinga folyamatban), kérelem/jóváhagyva/elutasítva demók.

**Hátralévő (lehetséges):** műszak-beosztás (reggeli/délutáni) a kapacitásba; készség-alapú beosztás-ajánló (ki ér rá ÉS ért hozzá); a Gyártás/Shop Floor task → automatikus HR-beosztás; szabadság-keret (éves nap) követés; bér-zárás export a Pénzügybe.

---

## 3.32 ✅ Karbantartás / Eszközgazdálkodás világ — eszköz-törzs, megelőző karbantartás, állásidő

> **Honnan jött:** a 4.6 gap-analízis #5 javaslata — a géppark (`SHOPFLOOR_MACHINES`, géppark `WORKSTATIONS`, járművek a Logisztikából) statikus volt, nincs megelőző karbantartás, állásidő-napló, eszköz-előzmény. A kérdőív szerint: **kanonikus eszköz-törzs** (gép + jármű + szerszám + infra + IT + **helyiség/takarítási rend**), a Shop Floor + Gyártás onnan olvassa a státuszt, munkalap-FSM, üzemállapot számított, **mindhárom** preventív mód (időköz + üzemóra + korrektív), **öt bekötés** (HR / külső partner / Raktár / Kontrolling / Gyártás), `maintenance.manage`, cyan akcent. A takarítási rendet a helyiség-eszközök preventív (`takaritas`) tervei adják — belső dolgozó VAGY külsős cég (a nagytakarítást a Tiszta-Pro Kft.).

**Fájlok:** `data-maintenance.js` (eszköz-kategóriák `ASSET_KINDS`, üzemállapot `ASSET_STATUS`, munkalap-típus `WO_TYPE` + FSM `WO_FLOW`/`WO_STATUS`, prioritás `WO_PRIORITY`, `MAINT_DEFAULTS`, seed: 11 eszköz / 8 terv / 6 munkalap / 4 állásidő, `window.MaintEngine`), `page-maintenance.jsx` (Áttekintés + Eszközök + Munkalapok + közös `AssetKindBadge`/`AssetStatusPill`/`WoStatusPill`/`WoPriorityPill`/`PlanDueBadge`/`WoRow`/`AssetDetailHost`/`WoDetailHost`), `page-maintenance-2.jsx` (`AssetDetail` + `WoDetail` SlideOver + `MaintSchedule` + `DowntimeLog` + sheetek). Akcent: **cyan** (`data-worlds.js` icon `wrench`). **LS_KEY `jt_sim_v53`, seed `v: 36`**.

### Eszköz-törzs = egy igazságforrás (a Shop Floor + Gyártás innen olvas)
A `sim.assets[]` a fizikai eszközök kanonikus otthona: `{ id, code, name, kind, facilityId, location, vendor, model, serial, purchasedAt, value, operatingHours, machineId?(Shop Floor-link), vehicleId?(Logisztika-link), retired, note }`. `kind` ∈ gép / jármű / szerszám / infra / IT / **helyiség**. A Gyártás dashboard a `assetsUnderMaintenance()`-ből olvassa a „N karbantartás" jelzést (a `machineId` köti a `SHOPFLOOR_MACHINES`-hoz). A jármű-eszköz `vehicleId` a Logisztika járművére mutat — közös eszköz-réteg.

### Üzemállapot — SZÁMÍTOTT a nyitott munkalapokból (nem kézzel)
`MaintEngine.assetStatus(state, asset)`: `selejtezve` (retired) → `karbantartas` (van `folyamatban` + leállást igénylő WO) → `leallitva` (nyitott géptörés `breakdown` WO) → `uzemel`. Soha ne állítsd kézzel — a munkalap FSM hajtja. Állapotok: `ASSET_STATUS` (üzemel/karbantartás alatt/leállítva/selejtezve).

### Karbantartási munkalap — FSM (a munkalapon él)
`workOrders[].status`: **`bejelentve → utemezve → folyamatban → kesz`** (mellék: `halasztva`, `elutasitva` → újranyitható). Átmenet: **`setWorkOrderStatus(id, to, {reason})`** — validált (`MaintEngine.woCanGo`), **`maintenance.manage` joghoz** kötött (jog nélkül LEZÁRT gomb), `halasztva`/`elutasitva` indok-kötelező. Típus (`WO_TYPE`): korrektív (hibajavítás) / megelőző / takarítás. Prioritás + SLA-nap (`WO_PRIORITY`). `kesz`-re: költség (`woCost` = becsült óra × óradíj), terv `lastDone` frissül, állásidő zárul, HR-beosztás levesz. `folyamatban` + leállás → állásidő nyílik.

### Megelőző tervek — időköz + üzemóra + takarítási rend
`maintPlans[]`: `{ assetId, label, kind:"preventiv"|"takaritas", trigger:"interval"|"hours", intervalDays?/intervalHours?, lastDone, lastDoneHours?, assigneeType:"internal"|"external", assigneeEmpId?/partnerName?, estHours }`. `MaintEngine.planDue(plan, asset, today)` számítja az esedékességet (időköz → lastDone+nap; üzemóra → asset.operatingHours − lastDoneHours ≥ interval). `duePlans(withinDays)` az esedékes/közelgő tervek; **`createWorkOrderFromPlan(planId)`** generál belőle munkalapot. A **takarítási rend** a helyiség-eszközök `takaritas` tervei (műhely napi belső, heti nagytakarítás külsős Tiszta-Pro Kft.).

### Öt bekötés a meglévő világokba
- **HR (kapacitás):** belső szerelő ütemezése (`scheduleWorkOrder` / `createWorkOrderFromPlan`) egy `assignments` rekordot ír (`id: asg-wo-<woId>`, `source:"maintenance"`) → a HR kapacitás-naptár automatikusan terheli (demó: a folyamatban lévő CNC-szerviz Kiss Andrást 4.28-án túlterheltté teszi: 6 ó fuvar + 5 ó karbantartás). `kesz`/`elutasitva`/kiadás → leveszi.
- **Külső szerviz/takarító partner:** `delegateWorkOrder(id, partnerId)` → `handshakes[]` `kind:"maintenance"` (a Logisztika/Reklamáció kézfogás-mintára); `recallWorkOrder` visszavon.
- **Raktár/Beszerzés:** `woRequestParts(id)` a munkalap alkatrészeiből Draft `requisitions`-t hoz létre (a meglévő igénylés → PO láncba).
- **Kontrolling:** projekthez köthető munkalap (`setWorkOrderProject`) → `pushWorkOrderToCtrl` „rezsi" kategóriás tény-tétel (egyébként általános karbantartási költség).
- **Gyártás:** a leállás → a Production dashboard „Aktív gépek" KPI „N karbantartás" jelzése (`assetsUnderMaintenance`).

### Nézetek + fiók-aktiválás
- **Áttekintés** (`MaintDashboard`): KPI-k (eszközök / karbantartás alatt / esedékes megelőző / nyitott munkalap + állásidő), esedékes megelőző (egy-kattintásos munkalap-generálás), eszköz-állapot bontás, nyitott munkalapok prioritás-rendezve.
- **Eszközök** (`AssetRegistry`): szűrhető lista → kártya SlideOver (`AssetDetail`: adatok + megelőző tervek + munkalap-előzmény + állásidő + selejtezés).
- **Munkalapok** (`MaintWorkOrders`): lista + FSM detail (`WoDetail`: átmenetek + ütemezés/felelős + alkatrész → Beszerzés + költség → Kontrolling + kiadás külső partnernek + napló). **Ütemterv** (`MaintSchedule`): eszköz-soros 2 hetes rács. **Állásidő** (`DowntimeLog`): tervezett/nem tervezett, nyitott/zárt.
- Új `maintenance` világ (`data-worlds.js` WORLDS + WORLD_ORDER a HR után), `acc-internal.worlds` + `enabledModules` default + RootTweaks + nav-lista. Új **`maintenance.manage`** perm (`portal.jsx` PERM_CATALOG + acc-internal). Célközönség: A2–A4 (géppark-intenzív gyártók).

**Állapotgép / store:** `workOrders[].status` (FSM fent), `assets[]` (üzemállapot számított) · akciók: `addAsset`/`updateAsset`/`retireAsset`/`assetStatus`/`assetsUnderMaintenance`, `addMaintPlan`/`removeMaintPlan`/`duePlans`, `createWorkOrder`/`createWorkOrderFromPlan`/`setWorkOrderStatus`/`scheduleWorkOrder`/`delegateWorkOrder`/`recallWorkOrder`/`woRequestParts`/`setWorkOrderProject`/`pushWorkOrderToCtrl`/`woCost`/`woRate`, `addDowntime`/`downtimeForAsset`. Seed: 11 eszköz (5 gép = a Shop Floor gépek, 1 jármű, szerszám, 2 infra, 2 helyiség), 1 leállított géptörés (Holzma CNC), 1 folyamatban CNC-szerviz, üzemóra-esedékes élzáró, takarítási rend (belső + külsős).

**Hátralévő (lehetséges):** OEE / MTBF mutatók az állásidőből; alkatrész-készlet az eszközhöz kötve (min-szint figyelmeztetés); garanciális gép-szerviz a Reklamációhoz kötve; mobil sofőr/szerelő-terminál a munkalaphoz (mint a Logisztika `DriverTerminal`); ütemterv drag-átütemezés.

---

## 3.33 ✅ CRM / Lead-pipeline világ — pre-sales tölcsér az ajánlat-FSM elé

> **Honnan jött:** a 4.6 gap-analízis #6 — a vevők a Sales-ben élnek (`CUSTOMERS`), de nincs **pre-sales tölcsér**. A megkereséstől az ajánlatig tartó kereskedelmi pipeline, ami a meglévő `createQuote` ajánlat-FSM elé fűződik.

**Fájlok:** `data-crm.js` (forrás-meta `CRM_SOURCE_META`, LEAD-FSM `LEAD_FLOW`/`LEAD_STATUS`, OPP-FSM `OPP_FLOW`/`OPP_STATUS` fázis-valószínűséggel, tevékenység `CRM_ACT_META`, feladat-prioritás, seed: 6 lead / 6 lehetőség / 6 feladat, `window.CrmEngine`), `page-crm.jsx` (`CrmDashboard` + `CrmPipeline` lead→opp kanban egy vásznon + `CrmLeads` + `CrmOpps` + `CrmForecast` + közös pillek/badge-ek/`CrmStepper`/sorok/`CrmDetailHost`), `page-crm-2.jsx` (`LeadDetail` + `OppDetail` SlideOver + `NewCrmSheet` + `CrmTasks` + `ActivityComposer`/`QuickTaskAdd`). Akcent: **blue** (icon `route`). **LS_KEY `jt_sim_v54`, seed `v: 37`**.

### Két entitás, két FSM, egy konverziós kézfogás
- **LEAD (`leads[].status`):** `uj → kapcsolat → minosites → nurturing → konvertalva` (+ `elvetve`). A `konvertalva`-t a **`convertLeadToOpp(id)`** állítja (lehetőséget hoz létre, az ügyfél-nevet átviszi). `elvetve` indok-kötelező, újranyitható. `setLeadStatus(id, to, {reason})` — validált FSM. Hét forrás: telefon / ajánlás / email / kiállítás / weboldal / webshop / belsőépítész.
- **OPPORTUNITY (`opportunities[].status`):** `nyitott → igenyfelmeres → osszeallitas → ajanlat → targyalas → megnyert / elveszett` (minden fázis `prob` valószínűséggel). `osszeallitas` = „Összeállítás alatt" (a vázlat-ajánlat tételes összeállítása az Értékesítésben). `setOppStatus`; `elveszett` indok-kötelező; `megnyert` → **`winOpp`** (megnyert + ÚJ ügyfél a CUSTOMERS-be).

### Lánc-bekötések
- **Ajánlat:** **`oppCreateQuote(id)`** → meglévő **`createQuote`** (Sales) → **draft (vázlat) ajánlat** + `quoteId` link + a lehetőség `osszeallitas` fázisba lép + **CRM-feladat** („Ajánlat összeállítása az Értékesítésben", magas prio, +3 nap). A tételes összeállítás (ItemBuilder) a Sales világban; onnan lép `ajanlat` (kiküldve) fázisba. `quote.create` joghoz kötött.
- **Tevékenység-napló** (hívás/email/találkozó/megjegyzés) az entitáson (`activities[]`); **feladatok** külön (`crmTasks[]`) határidővel + **SLA** (lejárt = piros).
- **Webshop → auto-lead:** `createLeadFromWebshop(data)` (nincs perm-kapu) — a webshop „Ajánlatkérés" CTA → `WebshopInquiry` űrlap. **B2B kiadás:** `delegateOpp`/`recallOpp` → `handshakes[]` `kind:"crm"`.
- **SZÁMÍTOTT (nincs tárolt mező):** `CrmEngine.forecast` (pipeline / súlyozott / megnyert / fázis-bontás), `leadConversion`, `oppWinRate`, `oppWeighted` — mindig az Engine-ből.

### Nézetek + fiók-aktiválás
Áttekintés (KPI + forrás-bontás + SLA-veszély + súlyozott lehetőségek), Pipeline (lead-fázisok → lehetőség-fázisok egy vásznon, kanban), Leadek, Lehetőségek, Feladatok (SLA-val), Forecast (súlyozott érték fázisonként). Új `crm` világ (WORLDS + WORLD_ORDER a Sales után), `acc-internal` + `acc-reseller` (belsőépítész) `worlds` + `enabledModules` + nav-lista. Új **`crm.manage`** perm. Célközönség: sales-intenzív A3–A4, B2.

---

## 3.34 ✅ Beszállítói ajánlatkérés (RFQ) — a PO ELÉ fűzött versenyeztetés (4.8-A1)

> **Honnan jött:** a 4.8 operatív gap-analízis #1 — az `Approved` igény eddig EGYBŐL PO-vá alakult (`createPOsFromReqs`); hiányzott a **bekérünk több ajánlatot → összehasonlítjuk → odaítéljük** kör. A Beszerzés világ **új „Ajánlatkérés" képernyője** (nem új top-level világ — „hézag a láncban").

**Fájlok:** `data-rfq.js` (FSM `RFQ_FLOW`/`RFQ_STATUS`, seed 4 RFQ, `window.RfqEngine`), `page-rfq.jsx` (`RfqPage` KPI+lista + `RfqDetail` SlideOver ajánlat-mátrixszal + `NewRfqSheet`). Akcent: **amber** (a Beszerzés világé). **LS_KEY `jt_sim_v59`, seed `v: 42`** (közös bump az A1–A3-mal: `rfqs`/`rfqSeq`, `stocktakes`/`stkSeq`, `prodTasks`/`prodTaskSeq`).

### Állapotgép (élesben eszerint kezeld) — `rfqs[].status`
`osszeallitas → kikuldve → biralat → odaitelve` (mellék: `visszavonva`). `RfqEngine.canGo`. **Tiltott = nem felkínált.** `kikuldve`-hez legalább egy meghívott beszállító kell. Átmenet: **`setRfqStatus(id, to, {reason})`** — DE az `odaitelve` NEM ezen át megy (lásd lent), a `visszavonva` indok-opcionális.
- **Entitás:** `{ id, title, status, dueDate, lines:[{code,material,qty,unit}], suppliers:[{name, responded, bids:{lineIdx:{price,leadDays}}, note}], awardedTo, poRef }`. Egy RFQ több tétel-sor + több meghívott beszállító; minden beszállító **soronként** ad ajánlatot (ár + átfutás).
- **Odaítélés (a kulcs-lánc):** **`awardRfq(id, supplierName)`** — **`rfq.manage` joghoz** kötött (jog nélkül LEZÁRT gomb + jelzés); csak `biralat` állapotból; a nyertesnek **beérkezett ajánlattal** kell rendelkeznie. A nyertes soronkénti áraiból a meglévő **`createPOsFromReqs([{supplier, lines}])`** generál **PO-t** (szállítónkénti bontás) → `poRef` link + `odaitelve`. Egy igazságforrás, nincs duplikáció.
- **SZÁMÍTOTT (`RfqEngine`, soha ne tárold):** `supplierTotal` (Σ ár×menny.), `bestForLine` (legolcsóbb soronként), `ranking`, `recommended` (legjobb teljes ajánlat), `savings` (legdrágább − legolcsóbb = a verseny haszna).
- **Akciók:** `addRfq`/`addRfqLine`/`removeRfqLine`/`addRfqSupplier`/`removeRfqSupplier`/`setRfqBid`/`setRfqStatus`/`awardRfq`; `rfqSupplierOptions()` (beszállító-javaslatok a katalógus + procCatalog-források + partnerek alapján). Új RFQ tételei **beszerzési igényből** (`Draft`/`Approved`) is előtölthetők.
- **Belépő:** Beszerzés → Ajánlatkérés (`data-worlds.js` procurement.screens, a router `screen==="rfq"` → `RfqPage`). Új **`rfq.manage`** perm (`portal.jsx` PERM_CATALOG + acc-internal).

---

## 3.35 ✅ Leltár / készlet-revízió (cycle counting) — a lot-modellre ülő leltározás (4.8-A2)

> **Honnan jött:** a 4.8 operatív gap-analízis #2 — volt lot/zóna modell és `whAdjustLot`, de **nem volt leltározási folyamat**. A Raktár világ **új „Leltár" képernyője**.

**Fájlok:** `data-stocktake.js` (FSM `STK_FLOW`/`STK_STATUS`, hatókör `STK_SCOPE`, seed 2 ív, `window.StockEngine`), `page-stocktake.jsx` (`StocktakePage` + `StocktakeDetail` sor-számlálással + `NewStocktakeSheet`). Akcent: **teal** (a Raktár world stone palettáján). **LS_KEY `jt_sim_v59`** (közös bump).

### Állapotgép (élesben eszerint kezeld) — `stocktakes[].status`
`nyitott → szamlalas → egyeztetes → lezarva` (mellék: `megszakitva`). `StockEngine.canGo`. Átmenet: **`setStocktakeStatus(id, to, {reason})`**.
- **SNAPSHOT:** **`createStocktake({scope})`** a kiválasztott hatókör (`all` / `zone` / `location`) lotjairól pillanatképet készít — soronként `{ itemId, lotId, systemQty (a lot pillanatnyi qty-je), countedQty:null }`. A snapshot VALÓS lotokra mutat (a seed `lot-013a/b/c` stb.).
- **Számlálás:** `setStocktakeCount(id, idx, qty)` — soronként a fizikai mennyiség.
- **LEZÁRÁS (a kulcs-lánc):** `lezarva` állapotba lépéskor minden számolt, eltérő soron meghívja a meglévő **`whAdjustLot(itemId, lotId, countedQty, "Leltár <id>", who)`**-t → a korrekció a lot-ra könyvelődik + Mozgás (Korr./Selejt). Egy igazságforrás.
- **SZÁMÍTOTT (`StockEngine`, soha ne tárold):** `variance(line)` = `countedQty − systemQty`, `summary` (számolt/összes, eltérések száma, nettó egység, pontosság %).
- **Belépő:** Raktár → Leltár (`data-worlds.js` warehouse.screens, router `screen==="stocktake"` → `StocktakePage`). A warehouse világ perm-mentes — a leltár sincs perm-gate-elve (összhangban a meglévő raktári akciókkal).

---

## 3.36 ✅ Gyártásütemezés / véges kapacitás — heti ütemező-vászon (4.8-A3)

> **Honnan jött:** a 4.8 operatív gap-analízis #3 — volt job-FSM és gép-park (`SHOPFLOOR_MACHINES`), de **nem volt ütemező-vászon**. A Gyártás világ **új „Ütemezés" képernyője**.

**Fájlok:** `data-prodsched.js` (stációk `PROD_STATIONS` = Shop Floor gépek + szerelő/felületkezelő, művelet-típusok `PROD_KINDS`, FSM `PROD_FLOW`/`PROD_STATUS`, seed 8 task kapacitás-ütközéssel, `window.ProdSchedEngine`), `page-prodsched.jsx` (`ProductionSchedule` heti rács + várólista + `ProdTaskDetail` ütemezővel + `NewProdTaskSheet`). Akcent: **teal** (a Gyártás világé). **LS_KEY `jt_sim_v59`** (közös bump).

### Állapotgép (élesben eszerint kezeld) — `prodTasks[].status`
`varolista → utemezve → folyamatban → kesz` (mellék: `blokkolt`). `ProdSchedEngine.canGo`. Átmenet: **`setProdTaskStatus(id, to, {reason})`** (`blokkolt` indok-kötelező; `varolista`-ra váltáskor a gép/nap törlődik).
- **Entitás:** `{ id, title, order, customer, kind (szabaszat/elzaras/cnc/szereles/feluletkezeles), machineId, date, hours, status }`. A stációknak **napi kapacitása** van (`dailyHours`, alap 8; szerelő pad 16).
- **Ütemezés:** **`scheduleProdTask(id, {machineId, date, hours})`** (gép + nap + óra; `utemezve`-re lép), `unscheduleProdTask(id)` (vissza várólistára), `setProdTaskHours(id, h)`.
- **VÉGES KAPACITÁS — SZÁMÍTOTT (`ProdSchedEngine`, soha ne tárold):** `dayLoad(tasks, machineId, date)` = a gép-nap lekötött órái (csak `utemezve`/`folyamatban`); **ÜTKÖZÉS** = `isOverloaded` (terhelés > kapacitás); `conflicts(tasks, monday)` a heti gép-nap túlterhelés-halmaz; `utilization` heti kihasználtság; `weekDays(monday)` a hét 5 munkanapja.
- **UI:** stáció-sorok × nap-oszlopok rács, cellánként task-chip-ek + **kapacitás-sáv** (teal / borostyán >80% / **piros = túlterhelt**) + várólista-strip a be nem ütemezett taskokkal. A demó szándékos ütközése: két szabász-task ugyanaznap a Holzma HPP380-on (10 ó > 8 ó).
- **Belépő:** Gyártás → Ütemezés (`data-worlds.js` production.screens, router `screen==="schedule"` → `ProductionSchedule`). Perm-mentes (gyártás-belső). Új feladat rendeléshez köthető (`sim.orders`).

---

## 3.37 ✅ Gyártás-adatlap — elem-szintű műszaki dokumentáció (Tervezés világ)

> **Honnan jött:** „a műszaki tervezésből hogyan lehet minél több adatot begyűjteni és a belsőépítészeti tervvel együtt kész projektté alakítani?" — majd pontosítva: ez a részletmélység a műszaki tervezés asztala, nem a belsőépítészé („akkor jön jól, mikor a korpuszokból már összeállítást épít a műszaki tervezés").

- **Hol:** Tervezés → **Gyártás-adatlap** (`page-mfg-datasheet.jsx` + `-2.jsx`), a Műszaki tervezés menüpont után.
- **Mit tud:** a belsőépítészeti bútorsor átvett elemeiből elemenként feloldja a teljes gyártás-dokumentációt (alkatrész-+szabásjegyzék GV-jelöléssel, anyagnorma lap/tömörfa+segédanyag, szerelvény, per-alkatrész útvonal, munkaóra, kétszintű kalkuláció), és felgördíti a projekt-összesítőbe. Készültség-kapu elemenként + deep-link a sablon-műhelybe.
- **Engine-javítás:** a `MfgPrep.deriveItem` mostantól átvezeti a konfigurált CPQ-méreteket (`pickVars`) a feloldásba — korábban minden elem a sablon alapméreteivel derivált.
- **Minden számított** — nincs új tárolt mező, nincs LS-bump.

---

## 3.38 ✅ Térrendezés — tér-vászon + LOD + egyedi elem-kérés + 4D + szerelő nézet (Belsőépítészet)

> **Honnan jött:** „a belsőépítészetnek is kell egy felület, ahol alaprajzot tud kezelni, helyiségeket, falnézeteket, zónákat, a bútorok üres kontúrjait — minden szinten más részletesség kell; ugyanaz a grafikai motor hajtja, mint a műszaki tervezést" + „4D fogalma az idővel" + „a szerelő láthatná, melyik szekrénybe megy a beolvasott elem".

- **Hol:** Belsőépítészet → **Térrendezés** (`page-floorplan.jsx` + `-2.jsx`, a régi Alaprajz képernyő helyén).
- **Tér-vászon (SVG, mm):** helyiségek auto-elrendezve a koncepció m²-eiből, húzás + méretezés; zónák; bútor-kontúrok a **műszaki skeleton-registryből** (a kontúr a parametrikus váz befoglalója — ugyanaz a motor).
- **LOD-elv:** Tér-szint (kontúr+méret) → Elem-szint (kivitel+ár+szállítási idő a snapshotból) → Műszaki szint NEM töltődik be (deep-link). A panel `FpLodLadder`-rel mutatja a szintet.
- **Falnézet-kézfogás:** helyiség-oldalhoz (É/K/D/NY) bútorsor linkelhető/létrehozható (fal-hossz átmegy) — elemei kivetülnek a falra.
- **Egyedi elem-kérés:** ha nincs sablon → név+külső méret+megjegyzés → `requestCustomTemplate` (perm-mentes): sablon-vázlat a műszaki műhelyben + rajz-piszkozat a DMS-ben (új `template` link-típus). A paraméterek (vastagság/szín) a kiadott vázban élnek majd.
- **4D réteg:** szín = az elem helye az időben (terv→ajánlat→rendelés→gyártás→kész), számítva a meglévő FSM-láncból (`comp.quoteRef → quote → order → prodTasks`), nem tárolt.
- **Szerelő nézet:** elem-kód (QR) beolvasása → zöld pulzáló cél-kiemelés + „helyiség · fal · N. elem balról".
- **Store:** `floorplans[conceptId]` csak geometria; load-fallback, nincs LS-bump.
- **⚠️ Ismert teher:** az app betöltése a sok Babel-fájl miatt ~30 mp-re nőtt — előfordítás/összevonás jelölt következő lépés.

---

## 3.39 ✅ Projekt-összeállítás — koncepció + bútorsor + műszaki adat egy projektté (Belsőépítészet)

> **Honnan jött:** a 3.37 eredeti kérdésének lánc-zárása („…a belsőépítészeti tervvel együtt kész projektté alakítani") — a §16 cím-hierarchia mint gerinc.

- **Hol:** Belsőépítészet → **Projekt-összeállítás** (`page-proj-assembly.jsx`, a Térrendezés után).
- **Gerinc-fa (§16):** Projekt (koncepció) › Helyiség (koncepció ∪ térrendezés) › Csoport (bútorsor — horgony: fal-link, másodlagosan helyiség-név; ami egyik sem → „nem köthető" panel) › Elem (sablon-pirula + snapshot-ár + becsült alkatrész-szám) › Alkatrész (LOD: csak darabszám, részlet deep-link a Gyártás-adatlapra, ami most már fogadja a `_mdOpenCompo` hintet).
- **Projekt-készültség kapu (`paCompleteness`):** 7 blokkoló check + nem blokkoló jelzések; hiánynál a „Projekt létrehozása" gomb LEZÁRT (tooltip a hiánylistával).
- **Materializálás:** `assembleProjectFromConcept` — a meglévő `createProject`-en át (elemek a bútorsorokból, szakágak a koncepció trades-eiből, mérföldkő-váz a `tpl-konyha` sablonból); duplikátum-véd `concept.projectRef ↔ project.conceptRef` linkkel, utána deep-link a Projektek világba.
- **Minden számított** a nézetben — tárolt csak a két opcionális link-mező; nincs LS-bump.

---

## 3.40 ✅ Előfordított app — betöltés ~30s → ~2s

> **Honnan jött:** a sok Babel-fájl miatt az app betöltése ~30 mp-re nőtt (3.38 ismert teher).

- **Mi történt:** mind a 94 `.jsx` + a HTML inline App-router előfordítva `build/*.js`-be (Babel standalone a run_script sandboxban, react preset, fájlonként IIFE-wrapper a scope-izolációért). A fő `JoineryTech Portal.html` már sima `<script src="build/...">` tageket tölt, a Babel CDN kikerült.
- **App-router kiemelve:** `app-main.jsx` (App gyökér + világ-route-ok); a Tweaks `TWEAK_DEFAULTS` EDITMODE-blokkja a fő HTML-ben maradt (`window.TWEAK_DEFAULTS`) — a direct-edit változatlanul működik.
- **Dev változat:** `JoineryTech Portal -dev-.html` — Babel futásidőben, mindig friss forrásból (lassú, de build-mentes).
- **⚠️ Munkafolyamat-szabály:** .jsx szerkesztése után az érintett fájlokat ÚJRA KELL fordítani (recept: `build/README.md`, kiemelt szabály a CLAUDE.md tetején).

---

## 3.41 ✅ Értéklánc-végigjátszás — a FŐ lánc kézfogásainak auditja + 3 javítás

> **Honnan jött:** „a FŐ láncot egyben végigvinni a demó-adatokon, és ahol döccen a kézfogás, kisimítani."

A teljes lánc (CRM → koncepció → összeállítás → projekt → rendelés → gyártás → QA → logisztika → számla) headless végigjátszással verifikálva (lead-től a draft számláig, duplikátum-védekkel együtt). Talált és javított döccenők:

1. **CRM → Belsőépítészet HIÁNYZOTT:** új **`oppCreateConcept(oppId)`** (perm-mentes) — koncepció a lehetőségből, kétirányú link (`opp.conceptRef ↔ concept.oppRef`), CRM-napló; OppDetail „Belsőépítészet" blokk (CTA / deep-link a `interior/concepts`-re). (`app-store.jsx`, `page-crm-2.jsx`)
2. **Projekt-elem → rendelés design-vesztés:** az `assembleProjectFromConcept` items-ei mostantól `config` snapshotot hordoznak (`picks[{tplId,qty,vars}]` a bútorsor-elemből), a `createOrderFromProjectItem` pedig `lines[0].config`-on viszi tovább → az előkészítés `orderToPseudo`→`MfgPrep.deriveItem` a tényleges konfigurált méretekből derivál. (`app-store.jsx`; az `orderToPseudo` már olvasta az `l.config`-ot)
3. **Logisztika → Pénzügy HIÁNYZOTT:** új **`invoiceDraftFromDelivery(shId)`** perm-mentes auto-belépő (átadott kiszállítás → kimenő számla-piszkozat, duplikátum-véd az orderRef-en; kiállítás marad `finance.manage`); fuvar-detail „Számlázás" blokk + „számlázható" rendszerüzenet az átadva-átgyűrűzésben. (`app-store.jsx`, `page-logistics-2.jsx`)

---

## 3.42 ✅ Handoff-csomag — látványterv → kész projekt egy gombbal

> **Honnan jött:** a woodwork dokumentum-lánc gap-listája („munkaszám/QR egységes átfűzése felmérés→számla") + a vevő-élmény ígérete (látványterv, munkaszám/QR-követés).

- **Hol:** Belsőépítészet → Projekt-összeállítás, a létrehozott projekt alatt (`PaHandoffPanel`).
- **`handoffConceptPackage(conceptId)`** (app-store, perm-mentes, duplikátum-véd a `project.handoff`-on) — egy gombbal:
  1. **Teljes ajánlat** (`createQuote`): bútorsor-tételsorok elem-QR kóddal + config-snapshottal, + tervezési díj sor (`conceptFee`); a `concept.quoteRef`-et tölti, ha üres.
  2. **Dokumentum-csomag a DMS-be** (közvetlen írás, status piszkozat, linkType `project`): látványterv + térrendezés-alaprajz (rajz) + gyártás-adatlap köteg (utasitas) — „egy mappa"-elv; kiadás marad `docs.manage` alatt.
  3. **Munkaszám/QR:** `project.workNo = "MSZ-"+projektszám` (determinisztikus, nincs LS-bump); a panelen munkaszám-QR + elemenkénti QR-sáv (`MSZ-…/elemUid` — az FpScanPanel/címke-QR kódjával azonos).
- A panel a csomag után: munkaszám-kártya (QR), ajánlat-link (Értékesítés), Dokumentumtár-link + doklista.

---

## 3.43 ✅ Értéklánc-demó UI-ból — a FŐ lánc végigkattintva (webshop → számla → garancia)

> **Honnan jött:** a 3.41 headless audit nyitott pontja — „a FŐ lánc végigjátszása UI-ból, kattintva". QA-mód: valódi gomb-kattintások, lépésenkénti profilváltással; az adatok demó-adatként megmaradtak.

- **Eredmény:** a teljes lánc végigkattintható. Demó-futás entitásai: webshop-érdeklődés (Nagy Anna, B2C) → LEAD-2426-008 → OPP-2426-008 (+ KON-2026-018 koncepció-link) → Q-2426-068 (tétel + kiküldés + elfogadás) → PR-2426-108 igénylés (jóváhagyás) → JT-2426-0196 rendelés (számítás + kiadás gyártásba) → MfgPrep-kiadás 5 feladat (GT-2426-009…013, műveleti lépésekkel végigdolgozva a Feladataim-ból) → QA-2426-007 végellenőrzés (megfelelt) → SH-2426-008 fuvar (teljes FSM + átadás-átvétel) → SZ-2426-0044 számla (piszkozat → kiállítva) → REK-2426-006 garancia-jegy → SH-2426-009 szerviz-fuvar (visszakötés).
- **Javítva (2 deep-link hiba):** ① Logisztika fuvar-detail Számlázás-link `finance/"invoices"` → `"outgoing"` (eddig az áttekintőre esett); ② Beszerzés req-detail „Kapcsolódó rendelés" `navigateTo("orders")` → `navigateTo("sales","orders")` (nem létező világ — kattintásra TypeError lett volna). Build: `page-logistics-2.js?v=3`, `page-procurement2.js?v=2`.
- **Jegyzőkönyv + demó-forgatókönyv:** `qa/erteklanc-demo-jegyzokonyv.md` — 11 lépéses narratív forgatókönyv belső bemutatóhoz + megfigyelések (Beszerzés alapképernyő legacy „Megrendelések"; jóváhagyás bezárja a slideovert; `calc/ready` csak `window.orderFlow` UI-overlay, nem store-FSM; `createDeliveryFromQa` nem ad fuvar-dátumot → garancia-óra nem indul).

---

## 3.44 ✅ Linked-refs — kapcsolódó-adat panelek + művelet utáni navigációs kérdés

> **Honnan jött:** felhasználói igény a 3.43 UI-végigjátszás után — „minden ilyen helyzetben legyen navigációs kérdés (mint a webshopokban)” + „minden összefüggő adat-felület linkelje a hozzákötött aktív felületet; jog nélkül vendég-nézet”.

- **Új közös fájl: `linked-refs.jsx`** (build/linked-refs.js, mindkét HTML-be kötve, files.json-ban):
  - **`RefPanel {kind, id, onBeforeNav}`** — kapcsolódó entitás kártyája: ikon + típus + **hivatkozási szám** (mono) + státusz-pill + kulcsmezők. Jog-kapu: ha a fiók világai közt van a cél-világ (+ opcionális perm, pl. order → `order.track`) → „Megnyitás” (deep-link `_pendingOpen` + `navigateTo`); ha nincs → **vendég nézet** (adat látszik, lakat-jelvény, gomb nincs). Feloldók: `REF_KINDS` (order/quote/requisition/project/shipment/invoice/ticket/job) — új típushoz ide vegyél fel bejegyzést.
  - **`window.askNextStep({title, text, options})`** — webshop-stílusú „Hogyan folytatod?” alulról nyíló lap, saját React-rootban (bárhonnan hívható, app-main érintetlen). Opció: `{label, icon, hint, primary, onClick}` — az első a lánc következő lépése (primary + deep-link), az utolsó a „maradok”.
- **Bekötések (első kör):** ① Sales ajánlat-konvertálás után → „Ugrás az igénylésre / Maradok”; ② Beszerzés igénylés-jóváhagyás (order-req) → „Rendelés generálása most / További igények”, majd generálás után → „Rendelés megnyitása / További igények” (a korábbi UX-döccenő — jóváhagyás utáni újranyitás — ezzel megszűnt); ③ Projekt-detail „Kapcsolódó dokumentumok”: ajánlat/rendelés/gyártási feladat sorok → `RefPanel` (a rendelés-link korábban a legacy Beszerzés→Megrendelésekre mutatott — javítva sales/orders-re).
- **Dokumentáció: `ENTITY_LINKS.md`** — mező-szintű kapcsolat-regiszter + mermaid entitás-folyam + deep-link térkép + askNextStep-lelőhelyek; ábra-generálásra alkalmas. Új kapcsolatnál kötelező felvezetni (CLAUDE.md-ben jelölve).
- Build: `linked-refs.js?v=1`, `page-procurement2.js?v=3`, `page-sales-detail.js?v=3`, `page-projects.js?v=2`.

---

## 3.45 ✅ Ajánlat-konszolidáció — koncepció-díj/bútorsor a meglévő ajánlatba, vagy összevonható

> **Honnan jött:** felhasználói igény — ha a lehetőséghez van már ajánlat ÉS belsőépítészeti koncepció is, a tervezési díjak/tételek NE új ajánlatként szülessenek, hanem a meglévőbe generálódjanak vagy összevonhatók legyenek (több ajánlat is megengedett).

- **Új store-helperek (`app-store.jsx`, `createQuote` köré):**
  - **`quoteEditable(id)`** — csak `draft` ajánlathoz fűzhető/vonható.
  - **`addLinesToQuote(id, lines)`** — tételsorok HOZZÁFŰZÉSE meglévő draft ajánlathoz (value/items újraszámol, rendszerüzenet). Nem-draftnál hibatoast.
  - **`mergeQuotes(targetId, sourceId)`** — két ajánlat ÖSSZEVONÁSA: a forrás tételei a célba, a forrás `status:"archived" + mergedInto`; a forrásra mutató `concept.quoteRef`/`opp.quoteId` linkek átszállnak a célra. Konvertált/elfogadott forrás nem vonható.
- **Becsatlakoztatás (mindkét generáló útnak `targetQuoteId` opció):**
  - **`createQuoteFromConcept(conceptId, {targetQuoteId})`** + `conceptFeeLines(id)` kiemelve. `targetQuoteId` (draft) → a tervezési díj a meglévő ajánlatba fűződik, nem külön dok.
  - **`compositionToQuote(id, {customer, targetQuoteId})`** — a bútorsor tételei a meglévő ajánlatba fűzhetők.
- **UI:**
  - **Belsőépítészet → `ConceptQuoteButton`** és **Bútorsor → `makeQuote`**: ha van már draft ajánlat az ügyfélhez (a koncepció oppRef-jén vagy ügyfél-egyezéssel), `askNextStep` választ kínál: „Hozzáadás a meglévő ajánlathoz (Q-…)" / „Külön ajánlat".
  - **Értékesítés → ajánlat-detail `QuoteMergePanel`** (draft): azonos ügyfél többi draft ajánlatát egy gombbal beolvasztja ide (a forrás archiválódik).
- Build: `app-store.js?v=9`, `page-interior.js?v=4`, `page-sales-detail.js?v=4`, `page-composition.js?v=2`. Nincs LS-bump (csak akció + UI). ENTITY_LINKS.md frissítve (concept/composition `targetQuoteId`, `quote.mergedInto`).

---

## 3.46 ✅ Ajánlat tétel-hierarchia — altételek, sorrend, számított számozás, forrás-zár

> **Honnan jött:** felhasználói igény — tétel-sorrend változtatás; főtétel alá altételek/részletező sorok (pl. a belsőépítészet szekrényei a bútorsor-tétel altagjai); megjelenítési vezérlés (főtétel kumulált összege VAGY altagok saját árakkal); 10/20/30 számozás; navigáció az ajánlatból a Belsőépítészetbe, ahol a sor egyedül szerkeszthető.

- **Modell (tételsoron, `_normQuoteLine` normalizál):** `uid` (stabil), `parentUid` (altétel), `subMode` (`osszevont`/`reszletezett` — főtétel megjelenítési vezérlése), `source` (`{world, kind, ref, label}` — forrás-zárt sor). **Főtétel értéke = Σ altag** (saját ára nem számít, duplázás-védelem: `_quoteNet`). **Számozás SZÁMÍTOTT** (`quoteLineNumbers`): főtétel 10, 20, 30…, altag 10.1, 10.2… (a 11/12/13 helyett — nem téveszthető össze főtétellel és nincs 9-es korlát); átrendezésnél automatikusan újraszámoz.
- **UI (Sales ajánlat-detail, draft):** # oszlop · ↑↓ sor-mozgatás (főtétel = blokk-mozgatás altagokkal együtt) · ↳ altétellé (előző főtétel alá) / ↰ főtétellé · főtételen „Összevont/Részletezett" kapcsoló (összevontnál az altag-árak rejtve, csak a főtétel Σ-ja) · főtétel törlésekor az altagok előlépnek.
- **Forrás-zár:** a belsőépítészeti sorok (`source`) az ajánlatban NEM szerkeszthetők/törölhetők — rose lakat-chip „Belsőépítészet" → kattintásra deep-link a koncepcióhoz (`_interiorOpen`) vagy a Bútorsor képernyőre; ott egészíthetők ki. **Ajánlat-szintű vissza-link is van:** a detail „Kapcsolódó — Belsőépítészet" blokkja (RefPanel: concept/composition kind, `linked-refs.js?v=2`) minden olyan koncepciót/bútorsort kilistáz, ami a quote-ra hivatkozik (quoteRef, opp.conceptRef, sor-source) — a régi, source-jelölés előtti sorokhoz is. A **Belsőépítészet világ alapképernyője mostantól a Koncepciók** (data-worlds.js?v=13 — screens[0]).
- **Generálók:** `compositionToQuote` mostantól **főtétel (Bútorsor — név, price 0, osszevont) + elemenként altagok** szerkezetet ír, source-szal; `conceptFeeLines` díj-sora source-ot kap. `createQuote`/`addLinesToQuote`/`mergeQuotes`/`updateQuoteLines` mind normalizál (uid-megőrzés).
- ⚠️ A „Szerkesztés (mint új ajánlat)" ItemBuilder a hierarchiát nem ismeri — lapos listát ír vissza (ismert korlát).
- Build: `app-store.js?v=10`, `page-sales-detail.js?v=5`. Nincs LS-bump. Tesztelve élőben: számozás, Σ-érték (361 200 = altagok), kapcsoló, átrendezés, zár-chip.

---

## 3.47 ✅ Ajánlat al-ajánlatkérések — belső (belsőépítészet/műszaki) + külső (RFQ) + ajánlat-díj

> **Honnan jött:** felhasználói modell-pontosítás — az ajánlatból nem rendelés indul, hanem KÉRÉS: belső ajánlat a Belsőépítészettől (koncepció) és a Műszaki tervezéstől (műszaki megoldás/bútor — előfeltétel: koncepció), külső ajánlat RFQ-val; plusz az ajánlatnak lehet díja (külön kis díj-ajánlat előre, elfogadásáig a részletes ajánlat kiküldése zárt).

- **Új entitás: `quoteRequests[]`** (`{id: QR-…, quoteId, customer, kind: interior|technical|rfq, note, status, resultRef, imported}`), FSM `kert → folyamatban → kesz` (mellék: `elutasitva` indokkal, `_qrFlow`/`setQuoteRequestStatus`). Az rfq-kind státusza SZÁMÍTOTT a hivatkozott RFQ-ból (`quoteRequestsFor`). Nincs LS-bump (üres tömb fallback).
- **Akciók:** `requestQuoteSubOffer` (technical-nál `quoteHasConcept` előfeltétel-kapu + dupl-véd) · `startConceptFromQuoteRequest` (koncepció `forQuoteId`-vel) · `_autoFulfillInteriorReq` (a koncepció-díj/bútorsor target-ajánlatba írásakor a kérés automatikusan `kesz`) · `createRfqFromQuote` (meglévő RFQ-lánc, `rfq.sourceQuoteId`) · `importRfqResultToQuote` (odaítélt nyertes ár → forrás-zárt tételsor) · `createFeeQuoteForQuote` (`feeQuoteId ↔ detailFor`).
- **UI:** Sales detail **„Ajánlatkérések"** szekció (3 kérés-gomb — a műszaki LEZÁRT koncepció nélkül; kérés-lista státusz-pillel, koncepció-RefPanel, RFQ-link + „Nyertes ár beemelése"; díj-ajánlat blokk) + **Kiküldés-zár** (lakat-jelvény, amíg a díj-ajánlat nincs elfogadva). **Belsőépítészet → Koncepciók** teteje: „Beérkezett ajánlat-kérések" panel (Koncepció indítása / Elutasítás indokkal). **Tervezés → Műszaki tervezés** teteje: „Beérkezett műszaki kérések" panel (Folyamatba veszem / Teljesítve / Elutasítás). **Feladataim:** új `qreq` forrás (data-tasks.js?v=2) — a nyitott belső kérések feladatként látszanak.
- Build: `app-store.js?v=11`, `linked-refs.js?v=3` (QR_STATUS/QR_KIND_META), `page-sales-detail.js?v=7`, `page-interior.js?v=5`, `page-design-engineer.js?v=5`. Füstteszt zöld (store + 3 felület): koncepció nélkül a műszaki kérés blokkolt; kérésből koncepció `folyamatban`+`forQuoteId`; RFQ-link; díj-ajánlat link + kiküldés-zár; unifiedTasks 2 qreq-feladat.

---

## 3.48 ✅ Műszaki munkalap — strukturált info-gyűjtés az árazható ajánlathoz

> **Honnan jött:** felhasználói pontosítás a 3.47-re — a műszaki kérés „Folyamatba veszem/Teljesítve" csak az első lépés volt. Kell: terv-alap (belső koncepció VAGY külső design-csomag leírással+alaprajzzal+anyaghasználattal, minden helyiséghez és bútorhoz); bútor→parametrikus sablon megfeleltetés; egyedi elemekhez 2D/3D rajz + modell + minden áron kívüli árazási paraméter — a gyártás-adatlap info-gyűjtő mintájára.

- **Munkalap a kérésen (`quoteRequests[].plan`,** `updateQuoteRequestPlan`): `basis` (internal = belső koncepció az ajánlaton / external = külső design-csomag) · `rooms[]` (helyiség: név + leírás + alaprajz-fájl + anyaghasználat) · `items[]` (bútor: név + helyiség + kiosztási rajz + db + ár/db + `mode: template` (kiadott sablon-választó: műhely „kiadott" + gyári registry) VAGY `custom` (2D rajz kötelező, 3D/modell opcionális, árazási paraméterek kötelező)).
- **Készültség-kapu (`techReqCompleteness`, SZÁMÍTOTT):** terv-alap (internal: van koncepció; external: ≥1 helyiség, mindben leírás+alaprajz+anyaghasználat+≥1 bútor) · ≥1 bútor · minden bútorhoz kiosztási rajz · minden bútor sablonra mutat VAGY egyedi teljes adatokkal · minden bútornak van ára. **A `kesz` átmenet store-szinten blokkolt** (`setQuoteRequestStatus` hívja a kaput), a munkalap „Teljesítve — árazható" gombja LEZÁRT a hiánylistával.
- **Beemelés (`importTechResultToQuote`):** a teljesített munkalap bútorai → az ajánlatba **főtétel („Műszaki tervezés — bútorok") + bútoronként altag** (helyiség-prefix, „(egyedi)" jelölés), forrás-zárt (`source.kind: techreq`) sorokkal. A Sales detail kérés-sora „Műszaki bútor-tételek beemelése (N bútor)" gombot mutat `kesz` után.
- **UI:** `page-tech-request.jsx` (`TechReqSheet`, 680-as SlideOver) — készültség-checklist + terv-alap váltó (belső: koncepció-státusz; külső: helyiség-kártyák) + bútor-lista (sablon-select / egyedi blokk) — a Tervezés → Műszaki tervezés „Beérkezett műszaki kérések" paneljéből nyílik („Munkalap" gomb).
- Build: `page-tech-request.js?v=1` (új, files.json + mindkét HTML), `app-store.js?v=12`, `page-sales-detail.js?v=8`, `page-design-engineer.js?v=6`. Élő füstteszt zöld: üres munkalap 4 hiánnyal blokkolt → kitöltve (külső csomag, 1 helyiség, sablon+egyedi bútor) kész → teljesítés → beemelés főtétel+2 altag (850 eFt).

---

## 3.49 ✅ Ár-érettség az egyedi tételeken — irányár / kalkulált / fix (PS-minta)

> **Honnan jött:** árazási konfliktus — az egyedi elem ára ajánlat-fázisban csupasz kézi szám volt. Nagyvilági kutatás (`arazas-egyedi-kutatas.md`: AACE Class 5→1, ETO budgetary→firm, provisional/PC sum) + felhasználói döntés: **a kalkuláció NEM kötelező, de minél több infót be kell gyűjteni**, és az ár (ár, érettség, sáv) hármasként él.

- **`window.PRICE_CLASS_META`/`PRICE_CLASS_ORDER`** (app-store.jsx): `fix` (0%) · `kalkulalt` (±10%) · `iranyar` (±30%, PS-irányösszeg). A tétel `priceClass` (hiányzó = fix, backward compat) + opc. `rangePct` felülírás.
- **Store:** `quotePriceProfile(q)` (SZÁMÍTOTT — net/min/max/counts/hasNonFix, levél-tételekből); **`refineQuoteLine(quoteId, uid, {price, priceClass, note})`** — PS-pontosítás draft/sent/approved státuszban, NEM néma átírás: bejegyzés a **`q.priceChanges[]`** naplóba (from/to/osztály/indok/ki) + rendszerüzenet. `_normQuoteLine` átviszi a mezőket; `importTechResultToQuote` altagjai: egyedi → a munkalapon deklarált osztály (default `iranyar`), sablonos → `kalkulalt`.
- **Műszaki munkalap (page-tech-request.jsx):** az egyedi blokk info-gyűjtése bővült — MIND OPCIONÁLIS: becsült anyagköltség / munkaóra / külső munka / analógia (hasonló korábbi munka) / kockázatok + **ár-érettség chip-sor** (default irányár). **Kalkuláció-segéd** (nem kötelező): ha anyag/óra megvan → javasolt ár a `WW_PRICE_PARAMS`-ból (anyag + óra×shiftRate + külső, +rezsi%, +nyereség%), „Átveszem" gomb → ár + `kalkulalt` osztály. A készültség-kapu változatlan (ár > 0 kell).
- **Ajánlat-detail (page-sales-detail.jsx):** nem-fix tételen **osztály-jelvény** (±sáv%, kattintva pontosítás-panel: új ár + cél-osztály + indok + delta-előnézet); összesítőben **„Várható sáv (nettó)"** sor; **„Ár-pontosítások" módosítás-napló** delta-kijelzéssel; **PS-kapu a konvertáláson**: irányár/kalkulált tétellel a konvertálás LEZÁRT, amíg a „PS-záradék" checkboxot el nem fogadják.
- Build: `app-store.js?v=13`, `page-sales-detail.js?v=9`, `page-tech-request.js?v=2`. Nincs LS-bump (opcionális mezők, seed-kompatibilis).

### 3.50 ✅ Egyedi árazás UX-letisztítás + mobil-első SlideOver

> **Honnan jött:** felhasználói visszajelzés — „hagyd meg amit most használunk, ne legyen félrevezető; ne legyen sok adat egyszerre az ember előtt; mobil-első; ami húzható, ott legyen kis fül".

- **Mobil-első `SlideOver`** (`page-extras-2.jsx`): mobilon (≤640px) alulról jövő **bottom-sheet** lekerekített tetővel + tappolható **fogantyú-fül** (bezárás); desktopon változatlan jobbról csúszó panel. Pure-CSS (`.so-panel` + media query, `--so-w` változó), resize-re reaktív — a portál MINDEN detail-panelje örökli. Footer `flex-wrap` (mobil-gombok nem lógnak ki).
- **Egyedi blokk progresszív feltárása** (`page-tech-request.jsx`): a kötelező minimum (2D rajz · árazási paraméterek · ár-érettség · ár) mindig látszik; az **opcionális info-gyűjtés** (3D · modell · becsült anyag/óra/külső · analógia · kockázat · kalkuláció-segéd) egy **kinyitható fül** (`TrDisclosure`) mögé került — alapból csukva, a fülön a kitöltöttek száma. Minden belső rács `grid-cols-1 sm:grid-cols-2` (mobilon egymás alatt), a db/ár sor `flex-wrap`.
- Build: `page-extras-2.js?v=2` (új ?v), `page-tech-request.js?v=3`. Élő füstteszt zöld: panel + fogantyú renderel, ár-érettség chipek, fül alapból csukva → kinyílik.

### 3.51 ✅ Tervezési brief — hierarchikus igény-információ + Q&A hurok + projektbe vitel

> **Honnan jött:** „a tervezett bútor hozzáadásánál lehessen információt adni a belsőépítészet/műszaki tervezéshez; ezek tárolódjanak, jussanak el a tervezőkhöz, kérdés-válasz CIKLUSban gazdagodjanak, és menjenek tovább a projektbe." + „a brief HIERARCHIKUS: helyszín / tér / bútor / bútor elem szintek." **Megjegyzés:** a modell + komponensek + store + tasks egy korábbi, megszakadt menetben elkészültek, de **soha nem töltődtek be** (nincs script-tag, nincs `files.json`-bejegyzés, nincs wiring) és **2 szintaxishiba** miatt a `build/app-store.js` és `build/page-brief.js` nem épült. Most: hibák javítva, lefordítva, betöltve, bekötve, élőben tesztelve.

- **Adatmodell (`data-brief.js`):** `briefs[]`, HIERARCHIKUS fa — `scope ∈ quote→site→area→room→furniture→part` (`BRIEF_SCOPES`/`BRIEF_SCOPE_ORDER`/`briefChildScope`; az **új `part` = „bútor elem"** szint), minden szint ugyanaz a modell, `parentBriefId` köti. Strukturált mezők (`BRIEF_FIELDS`): funkció · helyszíni kötöttségek · stílus/anyag/szín · felhasználók/kontextus · speciális igények + költségkeret + határidő + hivatkozások (moodboard/rajz-jelkép). Q&A FSM `BRIEF_Q_FLOW` (`nyitott→megvalaszolt→lezart`). `BriefEngine` (completeness/minimumReady/openQuestions — SZÁMÍTOTT).
- **Store (`app-store.jsx`):** `ensureBrief` (létrehoz-ha-kell), `addChildBrief`/`renameBrief`/`removeBrief` (rekurzív), `updateBriefFields` (naplózva), `addBriefRef`/`removeBriefRef`, `addBriefQuestion`/`answerBriefQuestion`/`setBriefQuestionStatus`, lekérdezők (`findBrief`/`briefsForQuote`/`briefsForProject`/`quoteLevelBrief`/`lineBrief`/`briefChildren`). **Projekt-átvitel:** `createProjectFromQuote` a quote-briefeket a projektre fűzi (`projectId` = élő link + `history` handoff-snapshot = másolat). **Feladataim:** `unifiedTasks` `brief` forrás a nyitott kérdésekből.
- **UI (`page-brief.jsx`):** `BriefSheet` (640-es SlideOver — készültség + fülek: igény-brief mezők / Q&A / napló) **hierarchia-navigátorral** (szülő-morzsa + „Alsóbb szintek" gyermek-lista hozzáadással/megnyitással/törléssel); `BriefCard` (beágyazott összefoglaló) + `BriefButton`. **Wiring:** Sales-detail (ajánlat-szintű brief blokk), koncepció-detail (`page-interior.jsx` — a belsőépítész MEGKAPJA), műszaki munkalap (`page-tech-request.jsx` — a műszaki tervező MEGKAPJA), projekt-detail (`page-projects.jsx` — átvitt brief).
- **Hibajavítás (prior session):** `addToCart(productId)` függvény-fej visszaállítva (a brief-blokk beékelődött a törzsébe); `page-brief.jsx` placeholder-string idézőjel-hiba.
- Build: `app-store.js?v=14`, `page-brief.js?v=1` (új), `data-brief.js?v=1` (új), `page-sales-detail.js?v=10`, `page-tech-request.js?v=4`, `page-interior.js?v=6`, `page-projects.js?v=3`. Nincs LS-bump (minden olvasás `|| []`, seed-kompatibilis). Élő füstteszt zöld: 6 scope (part is), fa-lánc épül, Q&A + completeness + rekurzív törlés működik.

### 3.52 ✅ Műszaki kapu → brief-alapú + site/ügyfél-horgony + öröklés

> **Honnan jött:** „a műszaki tervezés az ajánlaton zárolt — fel lehet oldani, mert a brief kell hozzá, mint a belsőépítészetihez. A brief külön entitás; hova kapcsolódjon (ajánlat-elemek, tér-elemek, bútorsorok, bútor-elemek)? És ha egy projekt indul, egy másik rendelés ugyanoda megörökölhesse az infókat — hogy jó ezt kezelni?"

- **Kapu-feloldás:** a műszaki ajánlatkérés (`requestQuoteSubOffer(quoteId,"technical")`) előfeltétele már NEM `quoteHasConcept`, hanem **`quoteBriefReady(quoteId)`** (a quote-szintű brief `BriefEngine.minimumReady` = funkció + helyszín + stílus). A Sales-detail műszaki gombja a brief-készültségtől függ (lakat + tooltip, amíg nem ready). A koncepció már nem előfeltétel; a munkalap terv-alapja (`internal`/`external`) továbbra is a koncepció meglététől függ.
- **Site/ügyfél-horgony — az architektúra-válasz:** a brief a HELY + IGÉNY tartós igazsága, a kereskedelmi dokumentum (ajánlat/rendelés/projekt) csak HIVATKOZIK rá. A hierarchia-szintek a fizikai valóság: helyszín → terület → helyiség (tér) → bútor (bútorsor) → bútor elem. Az ügyfél a durable horgony.
- **Öröklés:** `briefCustomer(b)` (az ügyfél a quote/project-en át) · `briefsForCustomer(customer)` · `inheritableBriefsForQuote(quoteId)` (az ügyfél korábbi gyökér-briefjei a mostani kivételével) · **`inheritBriefForQuote(targetQuoteId, sourceRootId)`** — a cél quote-brief üres mezőit feltölti a forrásból + a teljes alszint-fát (helyszín…bútor elem) mély-klónozza a cél-gyökér alá, `inheritedFrom` élő linkkel; nem írja felül a már kitöltött mezőket. UI: Sales-detail brief-blokk „… öröklése" gomb, ha az ügyfélnek van korábbi briefje.
- Build: `app-store.js?v=15`, `page-sales-detail.js?v=11`. Nincs LS-bump. Élő füstteszt zöld: kapu üres briefen zárt → funkció+helyszín+stílus után nyílik; öröklés átklónozza a 3-mély térfát + feltölti a mezőket + `inheritedFrom`.
- **Ügyfél-360 + brief a Dokumentumtárban (3.52++):** a Sales → Ügyfelek → ügyfél-detail mostantól MINDENT mutat: **összes ajánlat** (nem csak 5) + **rendelések** (`ordersForCustomer`) + tervezési briefek (helyszín szerint) + **megjegyzések** (`customerNotes`/`addCustomerNote`/`removeCustomerNote`) + **kapcsolati profil** (`customerProfile`/`setCustomerProfile`: hangnem · csatorna · elvárások · speciális igények). A brief auto-rögzül a DMS-be (`registerBriefDoc`). **Cég-önkép** (`companyProfile`/`setCompanyProfile`) a Beállítások → Cégadatok alatt; az értékesítőnek a Sales-detail kapcsolati-profil blokk emlékeztetőként mutatja. Build: `app-store.js?v=19`, `page-sales-detail.js?v=16`, `page-rest.js?v=3`.

### 3.53 ✅ Márka / arculat + belső dokumentumok + RAG tudásbázis

> **Honnan jött:** „a belső dokumentumokat és brand-eket is lehessen rögzíteni; RAG tudásbázis-alapot is lehessen képezni; a tervet rögzítsd a dokumentumokban."

- **Márka fül** (`BrandingPanel`): küldetés/vízió/hangnem/„voice" + vizuális eszközök (logó-címke, színek, fontok) + **belső dokumentum-tár** (`branding.items[]`).
- **Belső dokumentum kindok:** `policy` · `internal` · `contract` · `template`. **`addBrandItem(kind, {title, note})`** egyből **DMS-dokumentumot** is létrehoz (`brandItemId`↔`docId`). `removeBrandItem`.
- **RAG tudásbázis-alap:** `rag` jelölő (alapból be), **`toggleBrandItemRag(id)`**, **`brandRagDocs()`** (SZÁMÍTOTT).
- Build: `page-branding.js?v=1`, `app-store.js?v=19`. Nincs LS-bump.

### 3.54 ✅ Branding bővítés — Stratégiai célok · Akcentus szín · Persona-k

> **Honnan jött:** „A Branding elemeket kell bővíteni vízió, cél, akcentus" + „ügyfél profilokat personákat, hogy tudják kiket céloznak"; a Szabályzat & dok szekció kikerült a panelből (az a DMS-é).

**Store modell bővítés** (`app-store.jsx`):
- `goal` — stratégiai célok szabad szöveges mező
- `accent` / `accentSecondary` — elsődleges + másodlagos akcentus szín (hex)
- `colors[].role` — márka-szín szerepkör: `primary | accent | neutral | support`
- `personas[]` — célközönség-profilok: `{ id, name, role, ageRange, goals, pains, channel, quote }`

**Akciók:** **`addPersona(data)`** / **`updatePersona(id, patch)`** / **`removePersona(id)`** — perm-mentes CRUD, nincs FSM.

**3 panel-szekció** (`page-branding.jsx`):
1. **Stratégia & identitás** — Küldetés · Vízió · Stratégiai célok (3 oszlop) + hangnem + márka-hang
2. **Vizuális eszközök** — Logó · Akcentus szín (elsődleges + másodlagos picker, élő előnézet-paletta) · Márka-színek szerepkör-badgel + select · Betűk
3. **Célközönség — Persona-k** — kártya-nézet (avatar, célok, fájdalompontok, csatorna, idézet), inline `PersonaEditor`, törlés confirm-mel

**⚠️ Szabályzat & dokumentumok szekció** kikerült a BrandingPanelből — az `items[]` és akciók megmaradtak a store-ban (DMS-kötés él), de a UI-belépő mostantól a Dokumentumtár.

- Build: `page-branding.js?v=3`, `app-store.js?v=23`. Nincs LS-bump (`personas` load-fallbackkel).

### 3.57 ✅ Kontrolling óradíj-bontás — HR bér-kategória / per-művelettípus

> **Honnan jött:** a Vezetői BI-cockpit (EAC + auto-munkaerő) fedezet-realizmus utáni nyitott pont: a `cfg.laborRate` egyetlen globális óradíj (7200 Ft/h) volt minden gyártási feladatra. A `data-attendance` már HR bér-kategóriás rátát használ (`AttEngine.rate` → `HR_PAY_GRADES[payGrade].rate`) — ugyanezt a mintát visszük a Kontrolling tény-munkaerőbe.

- **Resolver (`data-controlling.js`, PURE — `ctrlLaborRate(task, {cfg, empByName})`):** task-onként old fel egy Ft/h tény-óradíjat, KASZKÁDDAL:
  - **(1) `grade`** — ha a feladat `assignee`-je a HR-törzsben van (`sim.employees`, NÉV szerint): `HR_PAY_GRADES[payGrade].rate` (vagy `emp.hourlyCost`) **× `cfg.gradeLoadMult`** (alap **1,9** = nettó bér → bér+járulék+rezsi terhelt műhely-óradíj). Kalibrálva: szakmunkás 3800×1,9≈7200 → a régi átalány ≈ a szakmunkás-rátával, így a portfólió nem ugrik meg.
  - **(2) `kind`** — ha nincs törzsbeli dolgozó: a művelettípus terhelt rátája (**`CTRL_KIND_RATES`**): szabászat 7600 · élzárás 7400 · **cnc 9800** (gép-óradíj prémium) · szerelés 6800 · felületkezelés 7600.
  - **(3) `flat`** — végső fallback: `cfg.laborRate` (7200).
  - A `cfg.laborBasis` (`auto`|`grade`|`kind`|`flat`) force-olhatja az ágat (alap `auto` = kaszkád).
- **Store (`controllingForProject`):** a `laborActual` mostantól a resolverrel számol task-onként; a visszaadott objektum **`laborByBasis`** (grade/kind/flat összeg) + **`laborBreakdown[]`** (feladatonként: `who/assignee/basis/label/hours/rate/cost`) mezőkkel bővült. Az EAC + kézi-korrekció logika változatlan (az óradíj-bázis a kézi `ctrlAdjustments` munka-tételek alatt).
- **UI (`page-controlling.jsx`):** új **`CtrlLaborBreakdown`** panel a projekt-fedezet SlideOverben — **Személy / Bázis fül-váltó**: a Személy-nézet emberenként (avatar + bér-kategória + óra × óradíj = költség, `laborByPerson[]`), a Bázis-nézet bázisonkénti összeg színes pill-lel; + kinyitható feladatonkénti bontás. Csak akkor jelenik meg, ha van naplózott gyártási idő (`laborBreakdown.length > 0`).
- **HOZZÁADOTT ÉRTÉK (value added):** a store `valueAdded` = `revenueActual − külső input` (anyag + bérmunka + beszállítói + szállítás); a maradék a cég belül teremtett értéke (saját munka + rezsi + fedezet). Mezők: `valueAdded`/`valueAddedPct`/`valueAddedEAC`/`valueAddedEACPct`/`externalActual`; a portfólió-`totals` is összegzi. UI: a projekt-összegző alján csík — **Hozzáadott érték Ft+%** ↔ **Külső input Ft+%**. A `valueAddedPerHour` (termelékenység) számítva van, de a UI NEM mutatja: a prototípus idő-naplózása hézagos (csak néhány feladat logolt), ezért a Ft/munkaóra félrevezető — teljes időnaplózás mellett lenne értelmes.
- **A post-kalkuláció nézet (`page-controlling-2.jsx`) szándékosan érintetlen:** az külön tervezési ráta-bázist (`WW_PRICE_PARAMS.laborRate` 6500) használ szimmetrikus terv/tény órákkal — a terhelt kontrolling-rátával keverve a terv/tény szimmetria törne.
- **3.57.1 — Óradíj-beállító UI (`CtrlSettingsSheet`):** a Kontrolling → Áttekintés fejlécében **„Óradíjak"** gomb (settings ikon) egy SlideOvert nyit, ahol a `ctrlConfig` óradíj-mezői élőben állíthatók: **munkaerő ár-bázis** (Automatikus / Bér-kategória / Művelettípus / Átalány — segmented, leírással), **terhelési szorzó** (`gradeLoadMult` — slider + szám, élő nettó→terhelt előnézet az összes HR bér-kategóriára), **per-művelettípus óradíjak** (`kindRates`, minden PROD_KIND külön sor), **általános átalány** (`laborRate`), + **Alapértékek** reset (a `CTRL_DEFAULTS`/`CTRL_KIND_RATES`-re). Mind `setCtrlConfig`-on át megy → azonnal a tény-fedezeten. A `kindRates` patch a `CTRL_KIND_RATES` fölé íródik (load-fallback). **Additív → NINCS LS-bump.**
- **Verifikálva (élő):** szakmunkás-assignee → grade 7220 · nem-törzs assignee (Kiss Zoltán) → kind · üres+cnc → kind 9800; Petőfi projekt: Nagy János (mester) 110 p × 9880 = 18 113 Ft grade-bázis; EAC portfólió 35,1% megőrződött; 0 konzol-hiba.
- Build: `data-controlling.js?v=3`, `build/app-store.js?v=37`, `build/page-controlling.js?v=6`. **Additív → NINCS LS-bump.**

---

## 7. Állapot-összefoglaló

| Terület | Állapot |
|---|---|
| Mobil UX (táblázatok, navigáció, panelek) | ✅ kész, ellenőrzött |
| Comm Hub (üzenetek, integráció, melléklet, visszakérdés) | ✅ kész, ellenőrzött |
| Üzleti lánc (ajánlat→rendelés→gyártás→készlet) | ✅ kész, ellenőrzött |
| Jogosultság / B2B / B2C / B2B2C | ✅ kész, ellenőrzött |
| Webshop / ügyfélportál | ✅ kész, ellenőrzött |
| Tétel-összeállító (ajánlat + beszerzés) | ✅ kész, ellenőrzött |
| Tervezett bútor (tervezés→ajánlat, kétirányú katalógus) | ✅ kész |
| Specifikációk — moduláris stílus/műszaki sémák + ármotor | ✅ kész, ellenőrzött |
| Beszerzés szállítónkénti bontás | ✅ kész |
| Gyártás-előkészítés (anyag / szabászat / vasalat / munkaidő) | ✅ kész |
| Belsőépítészet — díjazás-modell + információs katalógus + láthatóság-megosztás | ✅ kész |
| Bérmunka — szerkeszthető típusok + összevont csomag-kiadás + részletes infócsomag | ✅ kész |
| **Központi katalógus refaktor** (3.17) — láthatóság + mezőszintű láthatóság + bridge-ek | ✅ kész |
| **Raktár lot+zóna modell + 5-szintű hely + kivét-FSM + bizonylat-vezérelt bevét** (3.19) | ✅ kész |
| **Beszállítói cikk-megfeleltetés** (3.20) — idegen cikkszám ↔ saját katalógus (1:1 / N:1 / 1:N + szett) | ✅ kész |
| **Katalógus-összeállítás (multi-level BOM)** (3.21) — `bom[]` + explode + fedezet + késztermék-gyártás | ✅ kész |
| **Variánskezelés** (3.22) — fő-tétel alatt méret/szín/anyag változatok, öröklés + felülírás, variánsonkénti készlet | ✅ kész |
| **Beszerzési katalógus** (3.23) — külön `procCatalog` (külső szállító / külső munka / belső egység + gyűjtő), `requisitionFromProc` → igénylés→PO→bevét | ✅ kész |
| **Cikkszám-életciklus** (3.25) — `draft→review→active` FSM (+incomplete/rejected/archived), Törzsadat világ, `catalog.approve`, eladhatóság-kapu (ajánlat/webshop csak active) | ✅ kész |
| **Pénzügy világ** (3.27) — `finance` világ, kimenő+bejövő számlák egy `finInvoices[]`-ban, FSM `draft→issued→partial→paid` (+void, számított overdue), részfizetés (`finPayments`), előleg/díjbekérő, HUF/EUR, ÁFA-bontás, cash-flow áttekintő, `finance.manage` jog; a Beszerzésből a számlakezelés megszűnt | ✅ kész, ellenőrzött |
| **Logisztika világ** (3.28) — `logistics` világ, 3 fuvar-típus (kiszállítás+telepítés / beszállítás / felmérés), típusonkénti FSM (`tervezett→…→atadva` stb.), `LogEngine` ütközés-figyelés, jármű-soros heti ütemezés, sofőr-terminál, átadás-átvétel (aláírás/fotó/hiánylista/jegyzőkönyv), B2B kiadás (`handshakes` transport), belépők (rendelés/projekt/PO/kézi), webshop ügyfél-követés | ✅ kész, ellenőrzött |
| **Kontrolling világ** (3.29) — `kontrolling` világ (számított, nincs FSM), projekt terv vs. tény utókalkuláció, kategória-bontás (anyag/munka/bérmunka/szállítás/beszállító/rezsi), auto-aggregálás (MfgPrep terv + kivét/kézfogás/fuvar/számla tény) + kézi korrekciók, bevétel a kimenő számlákból, portfólió + fedezeti lista + eltérés-elemzés | ✅ kész, ellenőrzött |
| **Kontrolling óradíj-bontás** (3.57) — a tény-munkaerő óradíja task-onként a `ctrlLaborRate` resolverrel: HR bér-kategória (terhelt, `gradeLoadMult`) → per-művelettípus (`CTRL_KIND_RATES`) → átalány kaszkád; `laborByBasis` + `laborBreakdown[]`; `CtrlLaborBreakdown` panel a projekt-fedezetben. Additív, nincs LS-bump | ✅ kész, ellenőrzött |
| **Reklamáció világ** (3.30) — `service` világ, 3 jegytípus (garancia/hiánypótlás/karbantartás), FSM `bejelentve→kivizsgálás→ütemezve→javítás→ellenőrzés→lezárva` (+elutas
| **HR / Kapacitás világ** (3.31) — `hr` világ (amber), dolgozói törzs = egy igazságforrás (Logisztika `crews.memberIds` erre mutat), SZÁMÍTOTT kapacitás (`HrEngine`: projekt+fuvar terhelés vs. napi óra, túlterhelés), távollét-FSM (`kért→jóváhagyva→folyamatban→lezárva`, +elutasítva, `hr.manage`), munkaóra-napló → Kontrolling „munka" tény, készség-mátrix, bér-kategória. Nézetek: Áttekintés/Dolgozók/Kapacitás-naptár/Távollét/Készségek. LS_KEY `jt_sim_v52`, seed `v: 35` | ✅ kész |
| **Karbantartás / Eszközgazdálkodás világ** (3.32) — `maintenance` világ (cyan), kanonikus eszköz-törzs (gép/jármű/szerszám/infra/IT/helyiség) = egy igazságforrás (Shop Floor + Gyártás innen olvas), SZÁMÍTOTT üzemállapot a munkalapokból, munkalap-FSM (`bejelentve→ütemezve→folyamatban→kész`, +halasztva/elutasítva, `maintenance.manage`), megelőző tervek (időköz + üzemóra + takarítási rend), öt bekötés (HR-kapacitás / külső partner B2B / Raktár-alkatrész / Kontrolling-rezsi / Gyártás-leállás), állásidő-napló. Nézetek: Áttekintés/Eszközök/Munkalapok/Ütemterv/Állásidő. LS_KEY `jt_sim_v53`, seed `v: 36` | ✅ kész |
| **CRM / Lead-pipeline világ** (3.33) — `crm` világ (blue), az ajánlat-FSM ELÉ fűzve. LEAD-FSM (`uj→kapcsolat→minosites→nurturing→konvertalva`, +elvetve) → `convertLeadToOpp` → OPPORTUNITY-FSM (`nyitott→igenyfelmeres→osszeallitas→ajanlat→targyalas→megnyert/elveszett`, fázis-valószínűséggel). Lánc vége: `oppCreateQuote`→`createQuote` (draft + CRM-feladat), `winOpp`→új ügyfél. Tevékenység-napló, feladatok SLA-val, súlyozott forecast, webshop→auto-lead, B2B kiadás. `crm.manage` perm. LS_KEY `jt_sim_v54`, seed `v: 37` | ✅ kész, ellenőrzött |
| **Minőségbiztosítás (`quality`)** (4.7-B) — lime akcent, átadás ELŐTTI minőség (bejövő / gyártásközi / végellenőrzés), ellenőrzés-FSM (`nyitott→folyamatban→megfelelt/javitasra/selejt`), checklist + hibajegyzőkönyv (NCR), bejövő selejt → jelzés a Beszerzésnek, `quality.manage`. Határ: a Reklamáció az átadás UTÁNI hurok. LS_KEY `jt_sim_v55`, seed `v: 38` | ✅ kész, ellenőrzött |
| **Dokumentumtár (`docs`)** (4.7-B) — violet akcent, verziózott dokumentum-regiszter (rajz/szerződés/tanúsítvány/utasítás), életciklus-FSM (`piszkozat→ellenorzes→kiadott→archivalt`), `newDocVersion` + előzmény, kapcsolat projekt/rendelés/cikkszám/ügyfél, `docs.manage`. Egy igazságforrás, minden modul hivatkozik. LS_KEY `jt_sim_v55`, seed `v: 38` | ✅ kész, ellenőrzött |
| **Idő & jelenlét (`attendance`)** (4.7-B) — orange akcent, be-/kijelentkezés (`clockIn`/`clockOut`) + jelenléti ív, FSM (`bejelentkezve→kijelentkezve→jovahagyva`), SZÁMÍTOTT óra/túlóra/bérköltség (`AttEngine`), tablet-first terminál, `attendance.manage` (jóváhagyás). Dolgozó = HR (csak hivatkozás); határ: HR `timeLogs` = projekt-allokáció, attendance = napi jelenlét. LS_KEY `jt_sim_v55`, seed `v: 38` | ✅ kész, ellenőrzött |ítva), 4 csatorna (webshop/belső/Logisztika reklamáció-ág/átadási hiánylista), prioritás+SLA, garancia-idő+lejárat, megoldási módok bekötve (helyszíni→fuvar, csere→rendelés, behúzás→visszáru), B2B kiadás (`handshakes` service), webshop bejelentő+követés, Áttekintés/Bejelentések/Tábla | ✅ kész, ellenőrzött |
| Termék-összeállítás / BOM | 🟡 első verzió (szerkezet még rögzített) |
| **Beszállítói ajánlatkérés (`rfq`)** (4.8-A1) — Beszerzés-képernyő (amber), a PO ELÉ fűzve. FSM (`osszeallitas→kikuldve→biralat→odaitelve`, +visszavonva), `awardRfq`→`createPOsFromReqs`→PO; SZÁMÍTOTT ranking/megtakarítás; `rfq.manage` perm | ✅ kész, ellenőrzött |
| **Leltár / készlet-revízió (`stocktake`)** (4.8-A2) — Raktár-képernyő (teal), lot-modellre ülő ciklikus leltár. FSM (`nyitott→szamlalas→egyeztetes→lezarva`, +megszakitva), `createStocktake` snapshot → számlálás → `whAdjustLot` könyvelés; SZÁMÍTOTT eltérés/pontosság | ✅ kész, ellenőrzött |
| **Gyártásütemezés / véges kapacitás (`prodsched`)** (4.8-A3) — Gyártás-képernyő (teal), heti ütemező-vászon (stáció × nap). Task-FSM (`varolista→utemezve→folyamatban→kesz`, +blokkolt), `scheduleProdTask`; SZÁMÍTOTT gép-nap terhelés/ütközés | ✅ kész, ellenőrzött |
| Valódi AI / backend / bejelentkezés | ⬜ tervezett |

---

## 6. Backlog-áttekintés — nyitott / lehetséges következő lépések (2026-06-15)

> **Honnan jött:** „Milyen más feladatok vannak még?" → teljes átfésülés. A rendszer funkcionálisan **érett**: mind a ~20+ világ és a fő értékláncok kész. A 4.7-C „fehér foltok" (EHS, Beszállítói portál, Vezetői BI-cockpit) **mind megépültek**, az AI munkaterület is él. Ami maradt, az **finomítás + konzisztencia**, nem új modul. Az alábbi a moduloknál szétszórt „Hátralévő (lehetséges) bővítés" sorok összegyűjtve, prioritás szerint.

### 6.1 Gyors UX-javítások (kis ráfordítás, kézzelfogható érték)
- ✅ **Kontrolling „Óradíjak" gomb kihelyezése — KÉSZ (3.57.2, 2026-06-15).** A `CtrlSettingsSheet` mostantól HÁROM helyről nyitható: (1) Kontrolling → **Portfólió** (`dash`) fejléc, (2) **Vezetői áttekintés** (`exec`) cockpit fejléc, (3) a projekt-fedezet detail **`CtrlLaborBreakdown`** panel fogaskerék-gombja. A `CtrlSettingsSheet` `window`-ra exportálva (az exec `window.CtrlSettingsSheet`-ként rendereli). Build: `page-controlling.js?v=7`, `page-execbi.js?v=4`. Élőben verifikálva, 0 konzol-hiba.
- ✅ **Exec/dash név-zavar feloldva — KÉSZ (3.57.2).** A `kontrolling.dash` képernyő „Áttekintés" → **„Portfólió"** (en „Portfolio", `data-worlds.js?v=17`); az exec fejléc gombja is „Portfólió". Így nem ütközik az `exec` „Vezetői áttekintés"-sel.
- **`valueAddedPerHour` UI** — a SZÁMÍTOTT mező megvan a store-ban, de a UI szándékosan nem mutatja (hézagos gyártási idő-naplózás miatt félrevezető lenne). Teljes idő-naplózás mellett aktiválható.

### 6.2 Lánc-záró érték (közepes ráfordítás)
- ✅ **Beszállítói számla-benyújtás — KÉSZ (4.12, 2026-06-15).** A beszállítói portálon (4.10) a beszállító a feladott megrendelésére **számlát nyújt be** (`submitSupplierInvoice`) → `dir:"in"` `finInvoices` **piszkozat** (`submittedVia:"supplier"`, befogadásra vár). Portál: új **„Számláim"** tab + **Számlázható** KPI + `SupplierInvoicePanel` (PO-ból előtöltött tételek). Belső **Pénzügy → Bejövő számla**: portál-badge + a draft-gomb **„Befogadás"** (issued = fizetésre vár), a kifizetés `finance.manage` alatt. Egy igazságforrás, NINCS új entitás. Élőben verifikálva (benyújt→befogad lánc), 0 konzol-hiba. Build: `app-store.js?v=38`, `page-supplier.js?v=2`, `page-finance.js?v=2`, `data-finance.js?v=2`.
- **Beszállítói önkiszolgáló árlista** — `procCatalog.sources` karbantartása a portálról (most a beszerző viszi fel).
- **Beszállítói reklamáció-válasz** — bejövő QA `selejt` → beszállítói válasz-hurok a portálon.
- **Bérmunka partner-oldali elfogadás/visszajelzés** — a csomag-kézfogás (`acceptDelegation` epik-szinten létezik) kibontása; bérmunka a **beszerzési PO-ágon** is (most csak B2BHandshake).

### 6.3 Iparági / jogszabályi bővítések
- **EHS SDS / veszélyesanyag-regiszter** (katalógus-horgony) — faiparban valós igény (fapor/ATEX, VOC); + **PPE/EVE-kiadás** dolgozónként; munkavédelmi **bejárás → CAPA** (Quality-checklist klón).
- **Raktár:** bevételezéskor **fotó/bizonylat csatolás** a lothoz; **lot-szintű lejárat/batch** követés; maradék/hulladék **variáns-alapú** nyilvántartás (m²/fm méret szerint).

### 6.4 Architektúra-konvergencia (nagyobb, óvatosan)
- **Katalógus-tábla kivezetés** — a régi `MATERIAL_PRICE` / `CATALOG_LOOKUP` / `MATERIALS` táblák teljes megszüntetése (most fallback); `props.t` / `props.lookupColor` katalógus-mezők szerkesztő-UI-ja.
- **BOM-konvergencia** — a spec-sablon `hardware[]` és az `assembly.jsx` egyesítése a **katalógus-BOM-ra**; a megtervezett bútor BOM-ja mentődjön a katalógusba (`saveDesignToCatalog → bom`); a MfgPrep szükséglet-forrása a katalógus-BOM legyen.
- **Milestone billing mélyítés** — a Projektek ↔ Pénzügy híd (`billMilestone`) bővítése.

### 6.5 Stratégiai (külön döntést igényel)
- **Valódi backend / auth / valódi AI** — a megállapodott irány: maradunk a `window.sim` szimuláción, amíg a folyamatokat/UX-et validáljuk; modell-hívás pontszerűen, ahol érdemi élmény-előnyt ad (az AI munkaterület Playground már használja a `window.claude.complete`-et).
- **⭐ Domén-független, többágazatú architektúra (verticalizálhatóság) — ÉSZAKI CSILLAG (2026-06-15, felhasználói irány).** A UI-t és az egész rendszert úgy kell modulokra vágni, hogy **más doménekre is használható** legyen, ne csak asztalos-/faipari gyártásra — pl. egy **pékség** üzemeltetésére (receptúra/BOM, sarzs-gyártás, lejárat/HACCP, sütés-ütemezés, bolti eladás) ugyanazokkal a magmodulokkal. **Három réteg:** (1) domén-független MAG (FSM-governance · CRM · pénzügyi gerinc · katalógus · raktár · beszerzés · portál · HR · kontrolling · DMS · EHS · `unifiedTasks` · BI-cockpit · AI) — a láncszem-primitívek; (2) domén-ADAPTER (asztalos = `woodwork_domain.md`; pékség = saját receptúra/sütés-adapter), amit a mag **adatként** fogyaszt; (3) MÁRKA-réteg (`branding`). **Ma tervezési elv, nem migráció:** új modulnál a domén-független utat válaszd, a szakma-szótárt adapter-dokumentumba vezesd, kerüld a hardcode-olt asztalos-címkéket a mag-UI-ban (műveletek a `PROD_KINDS`-szerű konfigból). Részletes elv: **CLAUDE.md → „ÉSZAKI CSILLAG — domén-független architektúra"**. Külön absztrakciós epik később, ha a magmodulok beérnek.

**Javasolt sorrend:** 6.1 (gyors UX) → 6.2 beszállítói számla (lánc-záró) → 6.3 EHS SDS (jogszabályi). A 6.4/6.5 nagyobb, külön egyeztetést kíván.

### 6.6 Ügyfél / végfelhasználói portál — 3 szekció + pénzügy — ✅ KÉSZ (4.13, 2026-06-15)
> **Honnan jött:** „Nagyon fontos és értékes felület az ügyfél, végfelhasználói portál. Ott a fizetési kötelezettségeket, ütemezéseket és információkat kell tudni kezelni. Szét kell bontani a Kereskedelmi, bolt, Egyedi megrendelés felületét."

A B2C/végfelhasználói portál (`WebshopPortal`, `webshop.jsx`) **3 fő-szekcióra** bontva + Reklamáció: **Bolt** (késztermék) · **Egyedi megrendelés** (konfigurátor + ajánlatkérés + cég által kurált projekt-haladás) · **Kereskedelmi** (pénzügy/fizetések hub) · Reklamáció.
- **Kereskedelmi hub** (`webshop-finance.jsx` → `window.FinanceHub`): lejárt-figyelmeztető + 4 KPI (fizetendő/lejárt/következő esedékesség/eddig fizetve) + **Fizetési ütemterv** (előleg/részszámla/végszámla mérföldkövek a szerződésből) + **Számláim** (számla/előleg/díjbekérő, kinyitható tételek+fizetések, **szimulált „Fizetés"** + **letöltés-szimuláció**).
- **Egyedi**: a `CustomerProjectCard` „Hol tartunk?" feedje a **cég által kurált `customerMilestones`** — hosszú folyamatnál is kap visszajelzést a vevő, de nem lát minden belső részletet. A belső gyártási (`kind:"manufacturing"`) gyerek-projekt KISZŰRVE a vevő nézetéből.
- **Store-réteg KÉSZ volt** (`customerInvoices`/`contractsForCustomer`/`customerFinanceSummary`/`customerPayInvoice`/`customerMilestones`) — csak az UI hiányzott; ⚠️ a `build/app-store.js` elavult volt rájuk nézve, **újrabuildelve** (`?v=39`). Demó: Nagy Anna (`acc-b2c`) — előleg fizetve · részszámla LEJÁRT · díjbekérő + 3/3 kurált mérföldkő. Élőben verifikálva (3 szekció + szimulált fizetés issued→paid), 0 konzol-hiba. **Additív → NINCS LS-bump.** Build: `app-store.js?v=39`, `webshop.js?v=3`, `webshop-finance.js?v=1`.

### 6.7 Ügyfél projekt-betekintő — moduláris adapter-architektúra — ✅ KÉSZ (4.14, 2026-06-15)
> **Honnan jött:** „Fontos, hogy a vevő lássa a projekteknél az elfogadott brifeket, tervrajzokat, látványterveket, anyaghasználatot, vasalat típusokat, ajánlatait, rendeléseket. A faipari gyártás külön felület legyen, a belsőépítészeti is — hogy megmaradjon a modularitás és több domén."

A vevő-portál Egyedi szekciójában a projekt-kártya megnyitja a **`ProjectDetail`** fülezett, gazdag betekintőt (`webshop-project.jsx` + `webshop-project-adapters.jsx`). **3 réteg az ÉSZAKI CSILLAG szerint:**
- **MAG (domén-semleges)** fülek: Áttekintés (haladás) · Brief (elfogadott, strukturált mezők) · Ajánlatok (elfogadás + letöltés) · Rendelések · Dokumentumok (kiadott rajzok, letöltés).
- **DOMÉN-ADAPTEREK** — `window.registerProjectAdapter` registrybe regisztrálják magukat, a MAG nem tud róluk: **Belsőépítészet** (látványterv + paletta + helyiségek + szakág-tervek) és **Gyártás/faipar** (anyaghasználat + vasalat + gyártási ütemezés). Egy **pékség-adapter** ugyanígy regisztrálna új fület, kódváltás nélkül — ez a verticalizálhatóság élő bizonyítéka.
- **Láthatóság:** csak megosztható, ár NÉLKÜLI tartalom. **Interakció:** letöltés-szimuláció, üzenet a tervezőnek (`customerMessage`), ajánlat-elfogadás (`customerAcceptQuote`).
- **Új store-helperek (additív):** `conceptForProject` · `customerProjectPhases` (HR-ből, név/óra nélkül) · `customerMessage`. Demó-adat (4.14) Nagy Annára már a seedben. Élőben verifikálva (mind a 7 fül renderel, ajánlat sent→approved, üzenet rögzül), 0 konzol-hiba. **Additív → NINCS LS-bump.** Build: `app-store.js?v=40`, `webshop.js?v=4`, `webshop-project.js?v=1`, `webshop-project-adapters.js?v=1`.
