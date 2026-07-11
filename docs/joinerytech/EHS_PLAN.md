# EHS / Munkavédelem világ — build-jegyzet (2026-06-14)

> Mit építek és miért. A 4.7-C „fehér folt" hármasából a **Munkavédelem / EHS**.
> Forrás-egyeztetés: CLAUDE.md (FSM + build-szabályok), PROJECT_STATUS.md 4.7-C,
> woodwork_domain.md (faipari veszélyprofil). A megvalósítás a meglévő
> `quality` / `service` világ mintáját követi (FSM az entitáson + tiszta engine
> + seed + page + Object.assign(window)).

## Cél + felelősségi határ (egy igazságforrás, nincs duplikáció)
Önálló top-level világ: **`ehs`** (accent **red**, ikon **alert**). HORGONY-elven
köt a meglévő törzsekbe, NEM másolja őket:
- **Ember-törzs = HR** (`sim.employees`) — az EHS csak hivatkozik (oktatás dolgozóra).
- **Gép-törzs = Karbantartás** (`sim.assets`) — gép-kockázat csak `assetLabel`/`assetId` hivatkozással.
- **Intézkedés (CAPA) → Feladataim** (`unifiedTasks()`) — nem új inbox.
- **Reklamáció (`service`) az átadás UTÁNI** hurok; az EHS az **üzemi** munkavédelem — nem keverednek.

A magyar **Mvt. (1993. évi XCIII. tv.)** kötelezettségeire húzva (kockázatértékelés,
munkavédelmi oktatás, baleset-kivizsgálás), ISO 45001 PDCA-szemlélettel.

## Faipar-specifikus seed (woodwork_domain.md)
Fapor (keményfa = rákkeltő + ATEX porrobbanás), gépbaleset (körfűrész/gyalu/CNC),
zaj (>85 dB), VOC/oldószer (felületkezelés), kézi anyagmozgatás.

## Entitások + FSM-ek (a projekt mintájára)

### 1) Baleset / kvázibaleset — `ehsIncidents[].status` (FSM)
`bejelentve → kivizsgalas → intezkedes → lezarva` (+ mellék `elutasitva`).
- **Típus** (`EHS_INC_TYPE`): `baleset` (munkabaleset) · `kvazi` (kvázibaleset/near-miss) · `kornyezeti`.
- **Súlyosság** (`EHS_INC_SEV`): `konnyu` (elsősegély) · `munkakieso` (munkaidő-kieséssel) · `sulyos`.
- **CAPA** (`actions[]`): `{id,text,owner,due,done}` — korrekciós intézkedések; a nyitottak a Feladataimban.
- **Bejelentés PERM-MENTES** (bárki rögzíthet near-misst, mint `createTicket`); a **státuszváltás `ehs.manage` joghoz** kötött. `elutasitva`/súlyos záráshoz indok.
- Akciók: `addEhsIncident` (perm-mentes) · `setEhsIncidentStatus(id,to,{reason})` (`ehs.manage`) · `addEhsAction`/`toggleEhsAction`/`removeEhsAction`.

### 2) Kockázatértékelés — `ehsRisks[]` (SZÁMÍTOTT pontszám, nem FSM)
Munkahely/gép/tevékenység szerint, **5×5 valószínűség×súlyosság mátrix**.
- `likelihood` (1–5) × `severity` (1–5) → **`EhsEngine.score`** → **`band`** (`EHS_RISK_BAND`: alacsony/közepes/magas/kiemelt).
- `controls[]` védőintézkedések + `resL`/`resS` maradék-kockázat (a kontroll utáni pont).
- `reviewDue` éves felülvizsgálat — `EhsEngine.isReviewDue` (lejárt = piros).
- Akciók (`ehs.manage`): `addEhsRisk` · `updateEhsRisk` · `addEhsRiskControl`/`removeEhsRiskControl` · `reviewEhsRisk` (+12 hó).

### 3) Oktatás & kompetencia — `ehsTrainings[]` (lejárat-figyelés)
Dolgozónkénti oktatás-rekord (HR-horgony, `empId`).
- **Fajta** (`EHS_TRAIN_KIND`): `munkavedelmi` · `gepkezeloi` · `tuzvedelmi` · `elsosegely` · `veszelyesanyag` (mind alap-érvényesség hónapban).
- `completedAt` + `validMonths` → `expiresAt`; `EhsEngine.trainStatus` (érvényes / hamarosan lejár / lejárt).
- Akciók (perm-mentes rögzítés / `ehs.manage` nélkül is, mint a jelenlét): `addEhsTraining` · `renewEhsTraining` · `removeEhsTraining`.

## Képernyők (`data-worlds.js` → `ehs`, 4 db)
- **dash** — Áttekintés: KPI (nyitott baleset · lejárt CAPA · lejárt oktatás · nyitott kiemelt kockázat) + LTIFR-szerű ráta + lejáró-oktatás riasztás + nyitott incidens-lista.
- **incidents** — Balesetek & kvázibalesetek: szűrhető lista + FSM-detail (CAPA + napló) + új bejelentés sheet.
- **risks** — Kockázatértékelés: mátrix-kártyák (pont + band), detail (kontrollok + maradék-kockázat + felülvizsgálat).
- **training** — Oktatás: dolgozónkénti lejárat-tábla + új rekord.

## Bekötések (store)
- **Feladataim**: `unifiedTasks()` += nyitott incidensek (felelős = vizsgáló) + nyitott CAPA-akciók (owner). Új `TASK_SOURCES.ehs`.
- **Karbantartás**: a kockázat `assetId`/`assetLabel` a `sim.assets`-re mutat (csak hivatkozás).
- **HR**: az oktatás `empId` a `sim.employees`-re (személy-választó az ott élő törzsből).

## Jog + séma
- Új **`ehs.manage`** perm (`portal.jsx` PERM_CATALOG + `acc-internal.perms`).
- **Additív → NINCS LS-bump**: az új store-mezők (`ehsIncidents`/`ehsIncSeq`/`ehsRisks`/`ehsRiskSeq`/`ehsTrainings`/`ehsTrainSeq`) `load()`-fallbackkel pótlódnak (mint az `ai`/`attendance`).

## Fájlok
- ÚJ: `data-ehs.js` (consts + `EhsEngine` + seed), `page-ehs.jsx` (dashboard + 3 lista-képernyő), `page-ehs-2.jsx` (detail SlideOverök + sheetek).
- MÓDOSÍT: `app-store.jsx` (seed + load-fallback + akciók + unifiedTasks), `data-worlds.js` (world + WORLD_ORDER + WORLD_THEMES production-csoport), `data-tasks.js` (TASK_SOURCES.ehs), `portal.jsx` (perm), `app-main.jsx` (router-ág), mindkét HTML (script-tag + enabledModules), `build/files.json`.
- BUILD: `page-ehs.jsx`/`page-ehs-2.jsx`/`app-store.jsx`/`data-worlds.js`(plain)/`data-tasks.js`(plain)/`portal.jsx`/`app-main.jsx` → `build/*.js` + `?v` bump.

## Build-sorrend
1. `data-ehs.js` (plain) → 2. store-edit → 3. world/perm/task/router-edit → 4. page-ehs(.2) → 5. compile jsx → 6. HTML script-tag + enabledModules + ?v → 7. verify → 8. STATUS/CLAUDE frissítés.
