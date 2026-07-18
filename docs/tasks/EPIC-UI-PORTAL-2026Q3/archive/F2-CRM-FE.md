# F2-CRM-FE — CRM modul-képernyők + adatréteg (Fázis 2, 2. modul)

- **Szerep:** frontend · **Státusz:** ✅ done (2026-07-14) · **Fázis:** F2
- **Előfeltétel:** F2-EHS-FE (adatréteg-minta: `src/services/ehs/README.md`) · F1 primitívek (Button disabledReason, SlideOver, FsmStepper, DataTable, StatusPill+FSM_TONES, Toast)
- **Akcent:** blue (worlds-config + `[data-world="crm"]` tokenek — F1-A óta készen)

## Feladat

A CRM modul portál-oldali kiépítése az EHS-ben rögzített adatréteg-mintára:
1. **Adatréteg** (`src/services/crm/`): zod sémák + fetcherek + TanStack Query hookok + FSM-átmenet táblák + MSW kontraktus-tükör (állapottartó store, guard → 409).
2. **Képernyők** (terv szerint): Áttekintés, Pipeline (kanban), Leadek, Lehetőségek, Feladatok (SLA), Forecast.
3. **FSM-szigor**: lead- és opportunity-átmenet CSAK validált akción keresztül (tiltott = aria-disabled + tooltip, nem rejtett); `convertLeadToOpp` + `oppCreateQuote` handoff-csonkok.
4. Tesztek az EHS-precedens szerint + teljes suite + build + lint.

### ⚠️ Backend-gap (follow-up a backend terminálnak)

- **Nincs futtatható CRM host/OpenAPI** (F0 API-kontraktus-audit blocker **G0.1**) — ezért a kontraktus **MSW-FIRST** definiált (`src/mocks/crmApi/`), a terv-FSM-ek szerint.
- **A backend Lead-FSM-ből hiányzik a `nurturing`**: a `src/SpaceOS.Modules.CRM/src/Lead.Domain` (ADR-054 §2.1) készlete `New → Contacted → Qualified → Opportunity` (+`Disqualified`), a terv 5. pontja szerint viszont `uj → kapcsolat → minosites → nurturing → konvertalva` (+`elvetve`) a kanonikus. **A UI a TERVET követi** (root-döntés: a plan a kanonikus) — a backend follow-up feladata a `Nurturing` állapot + átmenetek felvétele és a magyar↔angol enum-térkép rögzítése a leendő OpenAPI-ban.
- Backend Opportunity/Task/Activity aggregátumokra ugyanez: a `mocks/crmApi` route-készlete és a `services/crm` zod-sémái adják a rögzítendő kontraktus-előképet.

## Kivitelezés

### 1. Adatréteg (`src/services/crm/` — az EHS-minta másolata, ld. `services/crm/README.md`)
- `config.ts`: API base (`/api/crm`), SLA-ablak (`TASK_SLA_SOON_DAYS=2`), lista-limit.
- `fsm.ts`: **LEAD_FSM** (contact/qualify/nurture/convert/discard — konvertálás `minosites`+`nurturing`-ból, elvetés bármely nyitott állapotból) és **OPP_FSM** (startDiscovery/startProposal/sendQuote/negotiate/win/lose — win csak `targyalas`-ból, lose bármely nyitott fázisból) + **fázis-valószínűségek** (10/25/40/55/80/100/0%) + `weightedValue`, `nextOppAction` (kanban-léptetés). A guard helperek a `src/services/fsmGuards.ts`-be (ÚJ, modul-független) kerültek kiemelésre — az EHS saját példánya érintetlen (a modul időközben ✅ APPROVED, fájljai stabilak), átállása follow-up.
- `sla.ts`: SZÁMÍTOTT feladat-SLA (`ok`/`soon`/`overdue`) tiszta függvényekkel (a határidő napja még `soon`, nem késés).
- `activities.ts`: napló-séma (`hivas`/`email`/`talalkozo`/`megjegyzes`) + kereszt-entitás „legutóbbiak" lekérdezés.
- `leads.ts` / `opportunities.ts` / `tasks.ts`: sémák + fetcherek + hookok; FSM-mutációk **optimista frissítéssel** (onMutate cache-átírás → onError rollback + 409-toast → onSettled invalidálás); `useConvertLead` (lehetőség-csonk + toast + opps-invalidálás), `useCreateQuoteFromOpp` (draft ajánlat-csonk + toast), `useCompleteTask`, napló-rögzítő mutációk.
- `keys.ts`: hierarchikus query-kulcs gyár (`crmKeys.all` → domain → szűrők).

### 2. MSW kontraktus-tükör (`src/mocks/crmApi/`)
- Állapottartó store (`db.ts`, `resetCrmDb()`), guard → **409** a `services/crm/fsm.ts` tábláiból (egy igazságforrás a UI-jal).
- `seed.ts`: a meglévő statikus mockokat (`mocks/worlds.ts` LEADS/OPPS/CRM_TASKS) **újrahasznosítja** seed-forrásként (nem másolat); a feladat-határidők „most"-hoz relatívak → determinisztikus SLA-mix (2 késés / 1 soon / 2 ok); stabil `CRM_SEED_IDS`.
- Handlerek: lead lista(+`status`/`q` szűrő)/detail/4 átmenet/convert(→ új opp `nyitott` fázisban, `fromLead`+`oppId` linkkel)/napló; opp lista(+`status`/`open`)/detail/6 átmenet(win→`wonAt`, lose→kötelező indok+`lostAt`)/quote-csonk (lezárt vagy már-ajánlatos opp → 409)/napló; task lista(határidő-rendezés)/complete; `GET /activities/recent`. Minden átmenet napló-bejegyzést ír.
- Bekötve a globális `mocks/handlers.ts`-be → a dev-szerver és a tesztek ugyanazt a kontraktust futtatják.

### 3. Képernyők (`src/pages/crm/`, `CrmPage.tsx` vékony diszpécser; worlds-config: dash / pipeline / leads / opps / **tasks (ÚJ fül)** / forecast)
- **Áttekintés** (`CrmDashboard`): 4 KPI a hookokból — pipeline érték, súlyozott forecast, nyitott feladatok (+SLA-sértés szám, danger-kiemelés), lead-konverzió — + nyitott lehetőségek kivonat + „Legutóbbi tevékenységek" az API-ból.
- **Pipeline** (`PipelineScreen`): kanban a lehetőség-fázisok szerint (vízszintesen görgethető oszlopok — mobil spec), kártya-koppintás → detail SlideOver, **fázis-léptetés validált FSM-átmenettel** („következő fázis" gomb). @dnd-kit tudatosan kihagyva (gomb elegendő, chunk nem nő).
- **Leadek** (`LeadsScreen`): DataTable (≥md tábla / <md kártya kettős render), státusz-chip szűrő + kereső (szerver-oldali szűrés), detail SlideOver: **FsmStepper** (nurturing a fő láncban, elvetve mellékág), validált átmenet-gombok (tiltott → `disabledReason`), elvetés kötelező indokkal, **konvertálás** akció, napló + bejegyzés-rögzítés.
- **Lehetőségek** (`OppsScreen`): DataTable súlyozott-érték oszloppal, nyitott/mind/fázis szűrő; detail SlideOver: stepper, érték/valószínűség/súlyozott csempék, átmenet-gombok (lose kötelező indokkal), **„Ajánlat-piszkozat létrehozása"** gomb (→ quote-csonk + toast; meglévő ajánlatnál a kapcsolat jelenik meg).
- **Feladatok** (`TasksScreen`): határidő-rendezett lista **SLA-jelvényekkel** (StatusPill tónusok: ok=success / soon=warn / overdue=danger — SZÁMÍTOTT), prioritás-pill, Teljesítés akció, „teljesítettek is" kapcsoló.
- **Forecast** (`ForecastScreen`): súlyozott pipeline fázisonként — recharts oszlopdiagram (egy adatsor → nincs jelmagyarázat; világ-akcent kék, lekerekített oszlopvég, visszafogott rács, tooltip; a recharts a meglévő külön lazy chunkban marad) + hozzáférhető táblázat-nézet (darab/érték/valószínűség/súlyozott).
- Közös: `labels.ts` (magyar címke-térképek + formázók), `ActivityLog.tsx`; a `QueryGate` az EHS-ből importált (promótálása `components/ui`-ba follow-up — az EHS fájlokat a stabil APPROVED állapot miatt nem érintettük).

## Eredmény

- A CRM a **második modul** a típusos, FSM-guardos adatréteg-mintán — a minta bizonyítottan másolható (a `fsmGuards` kiemelésével a következő modul még olcsóbb).
- A gap-analízis CRM-hiányai lezárva: adatréteg ✅ (MSW+Query, mutáció perzisztál), FSM-akciók a UI-ban ✅ (lead+opp, tiltott átmenet látható+indokolt), konvertálás ✅, quote-handoff ✅, kanban-léptetés ✅, SLA-feladatok ✅ (új fül), forecast-diagram ✅, OppList kártya-render ✅ (DataTable).
- Build zöld; a CRM saját lazy chunkja ~39 kB raw / ~9,4 kB gzip; a recharts külön (megosztott) lazy chunk maradt.

## Fájlok

**ÚJ** — adatréteg: `src/services/fsmGuards.ts`, `src/services/crm/{README.md,index.ts,config.ts,keys.ts,fsm.ts,sla.ts,activities.ts,leads.ts,opportunities.ts,tasks.ts}`
**ÚJ** — MSW: `src/mocks/crmApi/{index.ts,db.ts,seed.ts,handlers.leads.ts,handlers.opps.ts,handlers.tasks.ts}`
**ÚJ** — UI: `src/pages/crm/{labels.ts,ActivityLog.tsx,CrmDashboard.tsx,PipelineScreen.tsx,LeadsScreen.tsx,OppsScreen.tsx,TasksScreen.tsx,ForecastScreen.tsx,LeadDetailSlideOver.tsx,OppDetailSlideOver.tsx}`
**MÓDOSÍTVA:** `src/pages/CrmPage.tsx` (530→~38 sor diszpécser), `src/mocks/handlers.ts` (crmApiHandlers bekötés), `src/mocks/worlds.ts` (crm `tasks` képernyő-fül + seed-forrás megjegyzés)
**TESZT:** ÚJ `src/services/crm/__tests__/{leadFsm,oppFsm,taskSla}.test.ts`, `src/pages/crm/__tests__/{crmTestUtils.tsx,crmScreens.smoke.test.tsx,LeadDetailSlideOver.test.tsx,pipelineStageMove.test.tsx}`; ÚJRAÍRVA `src/pages/__tests__/CrmPage.test.tsx` (statikus-mock helyett MSW + route-diszpécser)

## Tesztek

- **Új/frissített CRM-tesztek: 60/60 zöld** (7 fájl):
  - adatréteg (msw/node + `resetCrmDb`): lead-FSM guard-táblák + teljes legális lánc + 409 utak + 409-után-változatlan + discard-indok 400 + convert (opp-csonk, fromLead/oppId link, dupla-convert 409) + szűrők + napló + 404; opp-FSM fő lánc `megnyert`-ig + fázis-ugrás 409 + lose (indok, terminálisból 409) + `nextOppAction` + súlyozott-érték számítás + quote-csonk (létrehozás, dupla → 409, lezárton → 409) + `open` szűrő; SLA tiszta függvények (overdue/soon/ok határértékek, nap-vége szabály) + task API (szűrő, rendezés, determinisztikus SLA-mix, teljesítés) + recent activities (rendezés, limit).
  - UI: átmenet-gomb logika (engedélyezett vs. aria-disabled + tooltip-indok, lenyelt kattintás, átmenet utáni állapotváltás, elvetés-űrlap, konvertálás, terminális lead minden gombja tiltott); **kanban fázis-léptetés** (kártya oszlop-váltása a szerver-státusszal együtt, terminális kártyán nincs gomb, koppintás → SlideOver); smoke render mind a 6 képernyőre; CrmPage route-teszt (9 eset).
- **Teljes suite:** `npx vitest run` → **1201 passed / 19 failed** — a 19 hiba a dokumentált, CRM-től független pre-existing készlet (BOMPreviewCard, configurator, catalogFilterPersistence, ProcurementPage, hooks…); CRM-fájl nincs köztük. (Kiindulás a task előtt: 1156 passed / 20 failed — a +45 zöld az új tesztkészlet, a −1 hiba egy flaky configurator-eset.)
- **Build:** `npm run build` ✅ (tsc -b + vite) · **ESLint:** módosított/új fájlok tiszták.

## Nyitott kérdések / follow-up

1. **Backend CRM host + OpenAPI (G0.1)**: a `mocks/crmApi` route-készlet + `services/crm` zod-sémák a rögzítendő kontraktus-előkép; a Lead-FSM-be a **`nurturing`** állapot felveendő (ld. Backend-gap fent).
2. **`fsmGuards` adoptálás az EHS-ben**: a `services/ehs/fsm.ts` saját guard-helper példánya kiváltható a közös `services/fsmGuards.ts`-szel — az EHS review időközben ✅ APPROVED, a csere külön kis taskként elvégezhető.
3. **`QueryGate` promótálás** `components/ui`-ba (jelenleg a CRM az EHS-ből importálja).
4. **Forecast dark-mode finomhangolás**: a diagram rács/tengely színei egyelőre light-tokenek (a projekt oldalai többségében light-only — a tokenszintű dark bevezetés külön epic-elem).
5. Új lead/lehetőség **felvétel-űrlap** nincs scope-ban (a gap-analízis említi) — külön mini-task.
