# UI Gap-analízis — Portal vs. prototípus-spec

> **Készítette:** frontend terminál — 2026-07-14
> **Epic:** `EPIC-UI-PORTAL-2026Q3` · Fázis 0 kimenet
> **Referencia:** `docs/knowledge/architecture/UI_IMPLEMENTATION_PLAN_2026-07-14.md`
> **Vizsgált app:** `src/joinerytech-portal/` (React 19 + TS + Vite + Tailwind 4 + Zustand + TanStack Query + MSW)

Jelmagyarázat: ✅ KÉSZ · ❌ HIÁNYZIK · ⚠️ ELTÉR (a spec-től) · Erőfeszítés: **S** (<1 nap) / **M** (1–3 nap) / **L** (>3 nap)

---

## 1. SHELL — navigáció, akcentek, SlideOver, Comm Hub

| Terület | Állapot | Részletek | Fájl | Erő |
|---|---|---|---|---|
| Worlds → screens modell | ✅ KÉSZ | Home világ-rács + `/w/:world/:screen` route-ok, `WorldShell` (sidebar + topbar + breadcrumb + mobil drawer). Egyetlen nav-rendszer, nincs A/B kettősség. | `src/App.tsx`, `src/components/layout/HomeScreen.tsx`, `WorldShell.tsx` | — |
| Világ-akcent tokenek | ⚠️ ELTÉR | `ACCENT_MAP` létezik (`WorldShell.tsx:10`), de a 7 modul színei NEM a root-döntés szerintiek: CRM=**indigo** (spec: blue), Maintenance=**amber** (spec: cyan), QA=**emerald** (spec: lime), EHS=**rose** (spec: red), DMS=**amber** (spec: violet). Kontrolling=slate ✅, HR=amber ✅. Ráadásul HR/Maintenance/Docs mind amber → ütközés. A `blue`, `lime`, `red` kulcs egyáltalán nincs az ACCENT_MAP-ben. Csak light-mode osztályok, dark variáns nincs. | `src/components/layout/WorldShell.tsx:10-31`, `src/mocks/worlds.ts` (accent mezők) | **S** (térkép-csere) + **M** (dark tokenek) |
| Mobil alsó nav (≤5 fül + „Több") | ❌ HIÁNYZIK | `MobileBottomNav.tsx` létezik, de **sehol nincs bekötve**, és 4 fix (dashboard/workflow/production/settings) fület tartalmaz — nem a világ-modellt követi, nincs „Több" fül. Mobilon jelenleg hamburger-drawer van (`WorldMobileDrawer`). | `src/components/layout/MobileBottomNav.tsx` (árva) | **M** |
| SlideOver | ⚠️ ELTÉR | Van: ESC, `role="dialog"` + `aria-modal` + `aria-labelledby`, alap fókusz-csapda, dark: osztályok. Hiányzik: **bottom sheet mód mobilon** (safe-area), fókusz-visszaadás a trigger elemre, body scroll-lock, a fókusz-csapda csak mountkor kérdezi le a fókuszálható elemeket (dinamikus tartalomnál törik). | `src/components/ui/SlideOver.tsx` | **M** |
| Comm Hub | ✅ KÉSZ (alap) | `ChatBubble` + `ChatPanel` minden világban mountolva a `WorldShell`-ből. A11y-hiányos (nincs aria a bubble gombon). | `src/components/chat/ChatBubble.tsx`, `WorldShell.tsx:321` | **S** (a11y) |
| Route-alapú code-splitting | ❌ HIÁNYZIK | Az `App.tsx` az összes (~40) oldalt statikusan importálja; nincs `lazy()`/`Suspense` sehol → monolit bundle (a prototípus ismert adóssága átjött). | `src/App.tsx:10-51` | **M** |
| Dark mode | ⚠️ ELTÉR | Tailwind 4 `@variant dark` konfigurálva (`index.css:4`, prefers-color-scheme + `.dark` osztály), de **nincs téma-kapcsoló** sehol, és csak 4 primitív (Button, Card, Input, SlideOver) használ `dark:` osztályt — a shell és az összes oldal light-only. | `src/index.css`, `src/components/ui/*` | **L** (tokenszintű bevezetés) |
| Route-védelem, auth | ✅ KÉSZ | Keycloak OIDC + `RequireAuth` + szerep-alapú világ-szűrés (`ROLE_WORLDS`). | `src/auth/`, `HomeScreen.tsx:9` | — |

---

## 2. A 7 MODUL — képernyők és FSM-ek

### 2.1 CRM — `src/pages/CrmPage.tsx` (547 sor)

| Elem | Állapot | Megjegyzés |
|---|---|---|
| Dashboard (KPI + mini-pipeline) | ✅ KÉSZ | `CrmDashboard` |
| Pipeline kanban | ⚠️ ELTÉR | `PipelineKanban` — oszlopok a lead-FSM szerint, de **nincs drag&drop / státusz-léptetés**, csak kattintás → detail |
| Lead lista + szűrők | ✅ KÉSZ | `LeadList` (chip-szűrő + kereső) |
| Opportunity lista | ⚠️ ELTÉR | `OppList` — `<table>`, mobilon csak overflow-scroll, nincs kártya-render |
| Forecast | ✅ KÉSZ | `CrmForecast` (súlyozott, fázis szerinti bontás) |
| Detail SlideOver (lead + opp) | ⚠️ ELTÉR | Read-only; **nincs FSM-akció gomb** (konvertálás, elvetés, fázis-léptetés), nincs új lead/opp létrehozás |
| **FSM státuszkészlet** | ✅ EGYEZIK | `LeadStatus` = `uj→kapcsolat→minosites→nurturing→konvertalva` +`elvetve`; `OppStatus` = `nyitott→igenyfelmeres→osszeallitas→ajanlat→targyalas→megnyert/elveszett` (`src/mocks/worlds.ts:474-475`) — pontosan a plan 5. pontja |
| Adatréteg | ❌ HIÁNYZIK | `LEADS`/`OPPS` statikus import a `mocks/worlds.ts`-ből — nincs MSW endpoint, nincs TanStack Query, mutáció lehetetlen |

**CRM hátralék: M** — FSM-akciók + create-flow + MSW réteg.

### 2.2 Kontrolling — `src/pages/ControllingPage.tsx` (296 sor)

| Elem | Állapot | Megjegyzés |
|---|---|---|
| Vezetői áttekintés (portfólió KPI + tábla + top/flop) | ✅ KÉSZ | `ControllingDashboard` |
| Projekt-fedezet lista | ✅ KÉSZ | `CtrlProjectList` + `MarginBar`/`MarginPill` |
| Detail SlideOver (kategória-bontás, terv vs. tény) | ✅ KÉSZ | `ProjectDetailSlideOver` |
| Eltérés-elemzés önálló képernyő | ⚠️ ELTÉR | Az eltérés a detailben és a `VarPill`-ben él; nincs dedikált variance-nézet/trend. Csak 2 screen (`dash`, `projects`) van a worlds-defben |
| Projekt-címkék | ✅ EGYEZIK | `draft/active/install/done/on_hold` (`src/mocks/controlling.ts:4`) — plan szerint nem szigorú FSM |
| Adatréteg | ❌ HIÁNYZIK | statikus `CTRL_PROJECTS` + kliens-oldali `calcProject` — MSW/Query nincs |

**Kontrolling hátralék: S–M** — eltérés-képernyő + adatréteg.

### 2.3 HR — `src/pages/HrPage.tsx` (540 sor)

| Elem | Állapot | Megjegyzés |
|---|---|---|
| Dashboard (létszám, jelenlét, nyitott kérelmek) | ✅ KÉSZ | `HrDashboard` |
| Kapacitás-rács (14 napos naptár) | ✅ KÉSZ | `HrCapacity` — túlterhelés-jelzés, távollét-cellák |
| Dolgozó-lista + detail SlideOver | ✅ KÉSZ | `HrPeople`, `EmployeeDetailSlideOver` (skill-chipek, bérkategória) |
| Távollét-lista | ⚠️ ELTÉR | `HrAbsences` read-only — **nincs jóváhagyás/elutasítás akció** (a `kert→jovahagyva` átmenet nem kattintható) |
| Készség-mátrix képernyő | ❌ HIÁNYZIK | Skillek csak chipként a dolgozó-kártyán; nincs mátrix-nézet (plan Fázis 2/4) |
| Training / Certification (platform HR-scope) | ❌ HIÁNYZIK | Semmilyen képzés/tanúsítvány entitás nincs a portálban |
| **FSM státuszkészlet** | ✅ EGYEZIK | `AbsStatus` = `kert→jovahagyva→folyamatban→lezarva` +`elutasitva` (`src/mocks/hr.ts:7`) |
| Adatréteg | ❌ HIÁNYZIK | statikus `EMPLOYEES`/`ABSENCES` import |

**HR hátralék: M** — távollét-FSM akciók + készség-mátrix (+L, ha training/cert is scope).

### 2.4 Maintenance — `src/pages/MaintenancePage.tsx` (337 sor)

| Elem | Állapot | Megjegyzés |
|---|---|---|
| Dashboard (gép-státusz KPI + aktív jegyek) | ✅ KÉSZ | `MaintenanceDashboard` |
| Eszköz-törzs + detail | ✅ KÉSZ | `AssetList`, `AssetDetailSlideOver` (kapcsolt jegyekkel) |
| Jegy-lista + detail | ⚠️ ELTÉR | Read-only; **nincs FSM-léptetés** (ütemezés, indítás, lezárás gombok) és nincs új jegy felvétel |
| Ütemterv | ⚠️ ELTÉR | `ScheduleView` sima lista — nincs naptár/idővonal nézet |
| Állásidő (downtime) követés | ❌ HIÁNYZIK | Semmilyen downtime-metrika |
| **FSM státuszkészlet** | ⚠️ ELTÉR | `TicketStatus` = `open/scheduled/in_progress/done/deferred` (`src/mocks/maintenance.ts:3`) — szemantikailag fedi a `bejelentve→utemezve→folyamatban→kesz` +`halasztva` láncot, de **hiányzik az `elutasitva`** állapot. Az eszköz-státusz (`AssetStatus`) **tárolt mező**, a plan szerint SZÁMÍTOTTNAK kell lennie a nyitott jegyekből |
| Adatréteg | ❌ HIÁNYZIK | statikus import |

**Maintenance hátralék: M** — FSM-akciók + elutasitva + számított eszköz-státusz + állásidő.

### 2.5 QA — `src/pages/QualityPage.tsx` (228 sor) — **a legüresebb modul**

| Elem | Állapot | Megjegyzés |
|---|---|---|
| Dashboard | ⚠️ ELTÉR | KPI-k fixen 0-ra kötve (`openNcrs = 0` stb.), listák „endpoint fejlesztés alatt" |
| NCR-lista | ❌ HIÁNYZIK | `NcrList` = `EndpointPending` placeholder (`GET /quality/api/ncrs`) |
| Ellenőrzőlista/sablonok | ❌ HIÁNYZIK | placeholder (`GET /quality/api/templates`) |
| Audit napló | ❌ HIÁNYZIK | placeholder (`GET /quality/api/audits`) |
| Ellenőrzés-lista + státusz-tábla (plan 2/6) | ❌ HIÁNYZIK | Inspection entitás egyáltalán nincs |
| NCR detail SlideOver | ⚠️ ELTÉR | `NcrDetailSlideOver` létezik átmenet-gombokkal (`open→under_review→closed`), de **csak lokális useState**, és sehonnan nem hívódik (a lista placeholder) |
| **FSM státuszkészlet** | ⚠️ ELTÉR | `NcrStatus` = `open/under_review/closed/rejected` (`src/mocks/quality.ts:1`) — a plan szerint QA Ellenőrzés: `nyitott→folyamatban→megfelelt` +`javitasra` rework-hurok +`selejt` terminális. **Nincs rework-hurok, nincs selejt** |
| Adatréteg | ❌ HIÁNYZIK | mock adat sincs (csak META-k), MSW sincs |

**QA hátralék: L** — gyakorlatilag teljes modul-építés mock-adattal.

### 2.6 EHS — `src/pages/EhsPage.tsx` (391 sor) — ld. részletesen a 4. fejezetben

### 2.7 DMS — `src/pages/DocsPage.tsx` (199 sor)

| Elem | Állapot | Megjegyzés |
|---|---|---|
| Dashboard (KPI + legutóbbiak) | ✅ KÉSZ | `DocsDashboard` |
| Dokumentum-lista + detail | ✅ KÉSZ | `DocsList`, `DocDetailSlideOver` **verziótörténettel** |
| Életciklus FSM-akciók | ❌ HIÁNYZIK | Nincs `piszkozat→ellenorzes→kiadott→archivalt` léptetés a UI-ban; az „archiválás → új munkapéldány" szabály nincs implementálva |
| Entitás-linkek | ⚠️ ELTÉR | Csak `linkLabel` szöveg — nincs kattintható kereszt-világ link |
| Feltöltés / új verzió | ❌ HIÁNYZIK | Nincs upload-flow |
| Mappa/típus szerinti szűrés | ❌ HIÁNYZIK | Csak 2 screen (`dash`, `files`), szűrő nincs |
| **FSM státuszkészlet** | ✅ EGYEZIK | `DocStatus` = `piszkozat/ellenorzes/kiadott/archivalt` (`src/mocks/docs.ts:2`) |
| Adatréteg | ❌ HIÁNYZIK | statikus `DOCS` import |

**DMS hátralék: M** — FSM-akciók + verzió-flow + entitás-linkek.

---

## 3. PRIMITÍVEK — `src/components/ui/` leltár

**Van (12):** Avatar, Button (Primary/Ghost), Card, Icon, Input, KpiCard, ProgressBar, SlideOver, Sparkline, StatusPill, Toast, Wordmark.

| Követelmény | Állapot | Részletek | Erő |
|---|---|---|---|
| Button variánsok + a11y | ⚠️ ELTÉR | `PrimaryBtn`/`GhostBtn` — nincs `disabled`, `loading`, `size`, `type`, `aria-*` prop; a modul-oldalak emiatt kézzel írt `<button>`-okat használnak mindenhol | **S** |
| StatusPill tone-map | ⚠️ ELTÉR | `STATUS_TONES` (`StatusPill.tsx:1`) csak generikus kulcsokat fed (draft/running/done/critical…) — a 7 modul FSM-státuszait NEM. Minden modul saját `*_STATUS_META`-t + saját pill-komponenst duplikál (LeadStatusPill, OppStatusPill, AbsStatusPill, TicketStatusPill, NcrStatusPill, IncidentStatusPill, DocStatusPill, ProjectStatusPill — 8 másolat) | **M** (központi FSM-tone-map + egy generikus pill) |
| Tabs primitív | ❌ HIÁNYZIK | Screen-váltás a sidebarból megy; a prototípus világon-belüli fül-sávjához nincs komponens (ARIA `tablist` sincs) | **S–M** |
| DataTable (tábla→kártya) | ❌ HIÁNYZIK | Nincs közös táblakomponens; `OppList`, Kontrolling-portfólió stb. natív `<table>` + `overflow-x-auto` — mobilon nincs kártya-render, nincs rendezés/oszlop-ARIA | **M–L** |
| Modal / ConfirmDialog | ❌ HIÁNYZIK | FSM-átmenetek megerősítéséhez kell majd | **S** |
| SlideOver bottom sheet + fókusz-restore | ⚠️ ELTÉR | ld. Shell tábla | **M** |
| Toast a11y | ⚠️ ELTÉR | Működő provider, de nincs `role="status"` / `aria-live`, nincs fókuszkezelés | **S** |
| Dark mode a primitíveken | ⚠️ ELTÉR | Csak Button/Card/Input/SlideOver; StatusPill, Toast, KpiCard stb. light-only | **M** |
| FSM-stepper / átmenet-gomb komponens | ❌ HIÁNYZIK | A plan 3. vezérelve (tiltott átmenet = disabled + tooltip) még sehol sincs komponensként | **M** |
| Route code-splitting | ❌ HIÁNYZIK | ld. Shell tábla | **M** |

---

## 4. EHS RÉSZLETESEN (Fázis 2 első prioritás, ⚠️ CHANGES REQUESTED)

### Ami van
- **Dashboard** (`EhsDashboard`): 4 KPI (esemény YTD, nyitott intézkedés, magas kockázat, baleset-mentes nap — utóbbi hardcode `= 3`), legutóbbi események, kockázat-kivonat.
- **Esemény-lista + detail SlideOver** (`IncidentList`, `IncidentDetailSlideOver`) — read-only.
- **Kockázati 3×3 mátrix** (`RiskMatrix`) + kockázat-detail.
- **Intézkedés-lista** (`ActionsList`) — checkbox-toggle, de **csak lokális state**, nem perzisztál.
- **Baleset-bejelentő varázsló**: `components/EHS/IncidentReportWizard.tsx` (3 lépés: típus → részletek → összegzés), `IncidentReportFAB.tsx`, Zustand `incidentDraftStore` (offline draft), MSW `POST /api/ehs/events` + fotó presigned-url flow (`mocks/handlers.ts:48-84`). **DE: a FAB/wizard sehova sincs bekötve** — az `EhsPage` nem importálja, egyetlen route sem rendereli.

### FSM-egyezés
`IncidentStatus` = `reported→investigating→action→closed` (`src/mocks/ehs.ts:3`) — megfelel a plan `bejelentve→kivizsgalas→intezkedes→lezarva` láncának, **de hiányzik az `elutasitva`** ág, és a UI-ban **egyetlen átmenet-akció sincs** (a detail read-only).

### Hiányzó scope-elemek (plan Fázis 2/1)

| Elem | Állapot | Teendő | Erő |
|---|---|---|---|
| **SDS / veszélyesanyag-törzs** | ❌ HIÁNYZIK — semmilyen SDS-nyom nincs a kódbázisban | Új screen (`/w/ehs/sds`): anyaglista (megnevezés, CAS, H-mondatok, lejárat), SDS-lap link/verzió, lejárat-figyelmeztetés. Mock: `mocks/ehs.ts` bővítés + MSW GET | **M** |
| **EVE/PPE-kiadás dolgozónként** | ❌ HIÁNYZIK | Új screen (`/w/ehs/ppe`): dolgozó × eszköztípus mátrix vagy lista, kiadás dátum/méret/lejárat, „kiadás rögzítése" akció. HR `EMPLOYEES` mockra köthető | **M** |
| **Munkavédelmi bejárás → CAPA** | ❌ HIÁNYZIK — a mostani `ACTIONS` csak incidens/kockázat-linkkel bír (`incidentId`/`riskId`), bejárás-entitás nincs | Új screen (`/w/ehs/walks`): bejárás-lista + checklist, megállapításból egy-kattintásos CAPA-intézkedés generálás (`EhsAction` bővítés `walkId`-val), határidő + felelős + státusz-FSM | **M–L** |
| **Locations endpoint** | ⚠️ MOCK-TODO | `components/EHS/StepDetails.tsx:4`: „Mock locations (TODO: replace with API call when backend is ready)" — hardcode-olt lista a wizardban; az `EhsIncident.location` is szabad szöveg. MSW `GET /api/ehs/locations` kell + backend-kontraktus (backend-előfeltétel a plan szerint) | **S** (mock) |
| **Wizard bekötése** | ❌ HIÁNYZIK | `IncidentReportFAB` mount az EHS világba (vagy globálisan), sikeres beküldés után lista-frissítés (ehhez az incidens-listát is MSW-re kell kötni) | **S** |
| **CAPA a plan FSM-referenciában** | ⚠️ ELTÉR | Incidens + CAPA kapcsolat: az intézkedés-toggle helyett CAPA-státusz (nyitott→folyamatban→kész→ellenőrizve) és incidens-lezárás-blokkolás nyitott CAPA mellett | **M** |

---

## 5. MSW MOCKOK — FSM-lefedettség

| Modul | Mock adat | MSW handler | FSM-átmenet endpoint |
|---|---|---|---|
| CRM | ✅ `mocks/worlds.ts` (LEADS/OPPS/CRM_TASKS) | ❌ | ❌ |
| Kontrolling | ✅ `mocks/controlling.ts` | ❌ | ❌ |
| HR | ✅ `mocks/hr.ts` | ❌ | ❌ |
| Maintenance | ✅ `mocks/maintenance.ts` | ❌ | ❌ |
| QA | ⚠️ csak META-k, adat nincs (`mocks/quality.ts`) | ❌ | ❌ |
| EHS | ✅ `mocks/ehs.ts` | ⚠️ csak `POST /api/ehs/events` + fotó-upload | ❌ |
| DMS | ✅ `mocks/docs.ts` | ❌ | ❌ |

A `mocks/handlers.ts` csak a konfigurátort, az EHS-bejelentést és az assembly-sequence PATCH-et fedi. **A 7 modul oldalai közvetlen ES-importtal olvassák a mock-tömböket** — nincs HTTP-réteg, nincs TanStack Query használat ezeken az oldalakon, ezért státusz-átmenetet perzisztálni jelenleg lehetetlen (minden mutáció lokális `useState`). Ez a plan 7. vezérelvének (MSW a spec-FSM-ekhez igazítva, szerver-oldali validáció előképe) a legnagyobb strukturális hiánya: **L** összességében, modulonként **S–M**.

---

## 6. JAVASOLT FÁZIS 1 MUNKABONTÁS (sorrendben)

**1. Akcent-térkép igazítás** (S) — `ACCENT_MAP` bővítése `blue`/`cyan`/`lime`/`red`/`violet` kulcsokkal; `mocks/worlds.ts` accent mezők átállítása: crm→blue, maintenance→cyan, quality→lime, ehs→red, docs→violet (HR=amber, kontrolling=slate marad). Ütközés-ellenőrzés a nem-platform világokkal.

**2. Központi STATUS_TONES + generikus StatusPill** (M) — a 8 duplikált pill-komponens kiváltása: FSM-státusz→tone térkép egy helyen (`components/ui/StatusPill.tsx`), a plan 5. pontjának összes státuszkulcsával (magyar kulcsok kanonizálása: maintenance/quality/ehs enum-átnevezés VAGY label-térkép — root-döntést igényel).

**3. Route-alapú code-splitting** (M) — `App.tsx` világ-oldalak `lazy()` + `Suspense` (skeleton fallback); bundle-mérés a monitor terminálnak.

**4. SlideOver v2** (M) — mobilon bottom sheet (breakpoint alapján, `env(safe-area-inset-bottom)`), fókusz-restore a triggerre, body scroll-lock, MutationObserver-es vagy eseménykori fókusz-lekérdezés; `SlideOver.test.tsx` bővítés.

**5. Mobil alsó nav** (M) — `MobileBottomNav` újraírása world-screen modellre (aktív világ képernyői, ≤5 fül + „Több" → drawer), bekötés a `WorldShell`-be a hamburger-drawer mellé/helyére (designer-döntés), thumb-zóna + safe-area.

**6. Button/Toast/Tabs a11y-kör** (S+S+M) — Button: `disabled`/`loading`/`size`/`type`/aria propok; Toast: `role="status"`, `aria-live="polite"`; új Tabs primitív (`role="tablist"`, nyíl-navigáció).

**7. DataTable primitív, tábla→kártya mintával** (M–L) — közös komponens rendezéssel, `<th scope>`, mobil kártya-renderrel; első fogyasztók: CRM `OppList`, Kontrolling portfólió-tábla.

**8. Dark mode alapozás** (M, designerrel közösen) — téma-kapcsoló (`.dark` class + localStorage), a 12 primitív + `WorldShell`/`HomeScreen` dark-tokenei; az oldalak Fázis 2-ben modulonként.

**9. MSW modul-API réteg** (M — Fázis 2 előfeltétele, érdemes Fázis 1 végén elkezdeni) — `GET /api/{crm|hr|maintenance|quality|ehs|docs|controlling}/...` list+detail handlerek a meglévő mock-tömbökből + `POST .../:id/transition` endpointok, amelyek a plan FSM-referenciája szerint validálnak (tiltott átmenet → 409); oldalak átkötése TanStack Query-re. Ezzel együtt: EHS `GET /api/ehs/locations` (a StepDetails TODO kiváltása) és a bejelentő-wizard FAB mountolása.

**FSM-stepper komponens** (M) — a 9. pontra épülve, disabled+tooltip mintával; ez már átvezet Fázis 2 EHS-be.

---

## 7. Összefoglaló kockázatok

1. **QA modul üres** — a státusztábla „✅ Frontend" jelölése ellenére a portál-oldal placeholder; a Fázis 2/6 valójában zöldmezős.
2. **Enum-nyelvi kettősség** — CRM/HR/DMS magyar, Maintenance/QA/EHS/Kontrolling angol státusz-kulcsokat használ; a backend-kontraktus előtt kanonizálni kell (root-döntés).
3. **Adatréteg-hiány** — közvetlen mock-import miatt minden FSM-munka blokkolt, amíg a 9. pont el nem készül.
4. **EHS backend-előfeltétel** — locations + SDS/PPE kontraktus a backend terminálnál; a mock-first megközelítés feloldja, de a kontraktust korán rögzíteni kell.

---

_Frontend terminál — JoineryTech sziget. Kérdés/eszkaláció: Nexus mailbox → conductor/root._
