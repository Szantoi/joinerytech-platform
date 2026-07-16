---

_Updated: 2026-07-14_

## EPIC-UI-PORTAL-2026Q3 — UI terv megvalósítás (root, 2026-07-14)

A docs/joinerytech prototípus UI-tervét ültetjük át a src/joinerytech-portal éles appra (React 19+TS+Vite+Tailwind4+Zustand+TanStack Query, MSW).
Teljes terv: docs/knowledge/architecture/UI_IMPLEMENTATION_PLAN_2026-07-14.md (repo, main).

Root döntések:
- Egy navigációs rendszer: worlds→screens (Home világ-rács + világon belüli fülek); a prototípus A/B layout-kettősség NEM kerül át.
- Világ-akcentek: CRM=blue, Kontrolling=slate, HR=amber, Maintenance=cyan, QA=lime, EHS=red, DMS=violet.
- FSM-szigor: státusz-átmenet csak validált akción át; tiltott átmenet = disabled+tooltip. FSM-készletek a tervdokumentumban.
- A11y (WCAG-AA, fókusz-csapda, ARIA) + dark mode tokenszinten, alapból. Mobil-első: táblázat→kártya, bottom sheet, ≤5 fülű alsó nav.
- Additív: a meglévő ~45 portal-oldal + components/ui a kiindulás, gap-alapú fejlesztés.

Fázisok: F0 felmérés (frontend: gap-analízis MSG-FRONTEND-001; designer: design-system spec MSG-DESIGNER-002; backend: API kontraktus-audit MSG-BACKEND-001) → F1 shell+primitívek → F2 modulok sorrendben: EHS→CRM→Kontrolling→HR→Maintenance→QA→DMS → F3 minőségkapu (designer APPROVED ×7, monitor zöld build) → root release-döntés.
Koordinátor: conductor (MSG-CONDUCTOR-002). Monitor: build/health őrzés (MSG-MONITOR-001).

---

_Updated: 2026-07-14_

## EPIC-UI-PORTAL-2026Q3 státusz-mentés (2026-07-14 este)
F0 KÉSZ: UI_GAP_ANALYSIS.md + DESIGN_SYSTEM_SPEC_V1.md + API_CONTRACT_AUDIT_2026-07-14.md (docs/knowledge/). F1 folyamatban: F1-A tokenek/akcentek/StatusPill, F1-B a11y primitívek; F1-C (code-splitting+shell) következik, utána F2 EHS-sel indul. Igazságforrás: EPICS.yaml (repo-gyökér). QUALITY.md kötelező minden munkára.

---

_Updated: 2026-07-14_

## EPIC-UI-PORTAL-2026Q3 haladás (2026-07-14, 2. mentés)
F1-A KÉSZ (42/42 teszt): src/index.css @theme tokenek + [data-world] akcentek (érvénytelen @variant/@mixin cserélve), akcent-javítás a worlds configban (crm=blue, maintenance=cyan, quality=lime, ehs=red, docs=violet), dark mode (index.html no-flash + useTheme + ThemeToggle), src/theme/statusTones.ts + fsmTones.ts, StatusPill refaktor + 7 duplikált pill törölve. F1-B KÉSZ (47/47 teszt): Button (disabledReason=aria-disabled+tooltip), SlideOver (fókusz-csapda+return+inert+bottom-sheet), új Tabs/DataTable(+kártya-render)/Toast(állandó live-region), useFocusTrap/useInertBackground hookok. F1-C FUT: lazy() code-splitting, MobileBottomNav mount, teljes build+teszt, bundle-riport. F2-EHS-BE FUT: src/ehs bővítés (EhsLocation, HazardousMaterial+SDS, PpeIssuance FSM, SafetyWalk FSM+CAPA). Állapot: EPICS.yaml.

---

_Updated: 2026-07-14_

## EPIC-UI-PORTAL-2026Q3 (2026-07-14, 3. mentés) — F1 LEZÁRVA, F2-EHS-BE KÉSZ
F1 KÉSZ a review-ciklussal együtt (F1-A/B/C + F1-REVIEW changes_requested → F1-FIX zöld). F2-EHS-BE KÉSZ: src/ehs 27 új endpoint (EhsLocation, HazardousMaterial/SDS, PpeIssuance FSM, SafetyWalk FSM, egységes CAPA), 92/92 domain-teszt, kernel-submodule HTTPS-en inicializálva + csproj-út javítva. FONTOS: hr/dms/qa/maintenance moduloknál ugyanaz a törött backend/ csproj-út; Docker nincs a gépen → EHS integrációs tesztek CI/VPS-re várnak. F2-EHS-FE indítva. Task-fájlok (QUALITY.md 4. pont): docs/tasks/EPIC-UI-PORTAL-2026Q3/.

---

_Updated: 2026-07-14_

## EPIC-UI-PORTAL-2026Q3 (2026-07-14, 4. mentés) — F2-EHS-FE KÉSZ
EHS frontend kész: src/services/ehs/ az ADATRÉTEG-MINTA (zod+TanStack Query+MSW-tükör közös FSM-táblával, 409-guardok) — a CRM/HR/stb. ezt másolja. 64 új teszt, 1157/1176 zöld, build zöld. ROOT ADR: EHS elutasitva ág törölve a tervből — backend Closed→Reopened kanonikus. Backlog: RISKS-5X5-BE (5×5 mátrix), EHS-WIZARD-HU. Futó: F2-EHS-REVIEW (designer, cél a sziget-CLAUDE.md EHS CHANGES REQUESTED feloldása APPROVED-ra) + F2-CRM-FE (kanban+lead/opp FSM, MSW-first mert a CRM backendnek nincs hostja).

---

_Updated: 2026-07-14_

## design-system/ mappa (Gábor, 2026-07-14)
Repo-gyökérben új böngészhető styleguide (index/szinek/tipografia/komponensek/mintak.html + ds.css/ds-icons.js/ds-shell.js). Elvei egybevágnak a DESIGN_SYSTEM_SPEC_V1-gyel (STATUS_TONES a törvény, tiltott gomb=disabled+tooltip, egy világ=egy hue, mobil-első). DE: forrás-igazságként a PROTOTÍPUST hivatkozza (ui.jsx, page-home.jsx ACCENT_MAP) és régi akcentek (CRM=indigo, emerald, rose) is szerepelnek benne → DS-RECONCILE backlog-task (designer): egyeztetés a spec+portal-tokenekkel. Rangsor design-kérdésben: EPICS.yaml ADR → DESIGN_SYSTEM_SPEC_V1 → design-system/ styleguide.

---

_Updated: 2026-07-14_

## EPIC-UI-PORTAL-2026Q3 (2026-07-14, 5. mentés) — EHS MODUL LEZÁRVA ✅
EHS teljes kör kész: backend (27 endpoint, 92/92 domain-teszt) + frontend (5 képernyő, adatréteg-SABLON) + review-ciklus (CHANGES REQUESTED → FIX → RE-REVIEW APPROVED). Gyökér CLAUDE.md EHS sora: ✅ APPROVED. F2 következő: CRM (F2-CRM-FE fut — kanban, lead/opp FSM nurturing-gal MSW-first, mert a CRM backendnek nincs hostja). Utána: Kontrolling→HR→Maintenance→QA→DMS. Backlog: DS-RECONCILE (Gábor styleguide-ja vs spec), RISKS-5X5-BE, EHS-WIZARD-HU, FIX-PREEXISTING-TESTS.

---

_Updated: 2026-07-15_

## EPIC-UI-PORTAL-2026Q3 (2026-07-14, 6. mentés) — CRM FE KÉSZ
CRM frontend kész az EHS-sablonra: 6 képernyő, kanban validált stage-move, LEAD_FSM (nurturing a terv szerint — backend-gap follow-up), OPP_FSM stage-valószínűségekkel, új modul-agnosztikus services/fsmGuards.ts (a services/ehs/fsm.ts migrációja rá: kis follow-up task). 60/60 + 1201/1220, build zöld. TANULSÁG: agent-elakadás oka lemezhely volt (npm cache clean → 3.87 GB). EPICS.yaml-t Gábor is szerkeszti — szinkronban tartani!

## EPIC-UI-PORTAL-2026Q3 (2026-07-14 éjjel, 7-8. mentés — OFFLINE sorban)
CRM ✅ APPROVED (re-review: mind az 5 finding kódban igazolva, 68 teszt). modules_done: [ehs, crm] — 2/7 modul teljes minőségi körrel kész. Kontrolling FE épült. VPS SSH-blokker állt (Nexus offline, jelentések pending-nexus sorban). Dokumentáció teljes: docs/tasks/EPIC-UI-PORTAL-2026Q3/ + EPICS.yaml + qa/ review-jelentések.

## EPIC-UI-PORTAL-2026Q3 (2026-07-15, 9-12. mentés — NEXUS VISSZATÉRT, GITHUB PUSH KÉSZ)
Kontrolling FE KÉSZ (35/35 új teszt, calc.ts = backend ProjectCostCalculation tükör, tudatosan FSM nélkül) → designer review CHANGES REQUESTED (S1 tábla-görgetés affordancia, S2 chip hit-area) → F2-KONTROLLING-FIX KÉSZ (S1/S2 + M1-M3, 35/35 célzott, teljes suite 1231/1251, build+eslint zöld). GITHUB PUSH: platform f011725 + a0b6a22 (EPICS.yaml, docs, design-system/, EHS fázis-2 backend, .gitignore-tisztítás: 5884 bin/obj artifact + Nexus runtime DB untrackelve) és portal 9a54a30 (F1 + EHS/CRM/Kontrolling + HR WIP) — submodule-bump kész. NEXUS-DIAGNÓZIS: a service a VPS-en fut, SSH-tunnel adja a localhost:3458-at; a 07-14-i leállás után 07-15-én visszajött, de a root-memória az 5. mentésnél állt → offline sor MCP-n újrakézbesítve (3 submit_done + ez az append). FUT: F2-KONTROLLING-REREVIEW (designer) + F2-HR-FE (frontend, amber, ABSENCE_FSM, services/hr+mocks/hrApi alapokon). Utána: Maintenance → QA → DMS, majd F3 minőségkapu + release-döntés.

---

_Updated: 2026-07-15_

## 13. mentés (2026-07-15) — Kontrolling ✅ APPROVED

- F2-KONTROLLING-REREVIEW verdikt: ✅ APPROVED (main@9a54a30) — S1/S2 + M1-M3 + N2 mind kódban igazolva, 35/35 Kontrolling-teszt zöld (S2/M2/M3 új asszertekkel). MSG-DESIGNER-004-DONE beküldve.
- EPICS.yaml: F2-KONTROLLING-REVIEW → done, F2-KONTROLLING-FIX → done, `modules_done: [ehs, crm, kontrolling]` — **3/7 modul teljes minőségi körrel kész**.
- Platform-push: f75bdad (EPICS + F2_KONTROLLING_DESIGN_REVIEW re-review szekció + docs/tasks README + F2-KONTROLLING-FIX.md).
- Backlog-nit: ProjectDetailSlideOver-nek nincs saját tesztfájlja (régió-asszert oda való); N1 + N3-N6 tracked.
- Fut: F2-HR-FE (frontend). Maintenance-FE csak a HR-FE lezárta után indul — a portal tree-t egyszerre egy FE-agent mutálhatja.
- Sorrend hátra: HR (review-ciklussal) → Maintenance → QA → DMS → F3 minőségkapu.

---

_Updated: 2026-07-15_

## 15. mentés (2026-07-15) — HR-FE pusholva, HR-review + Maintenance-FE fut

- F2-HR-FE kész és PUSHOLVA: portal main@8831603 (6 HR-képernyő, ABSENCE_FSM a közös fsmGuards-szal, HrPage 533→38 soros diszpécser, 57/57 HR-teszt, teljes 1272/1292 a 20 ismert pre-existinggel, build+tsc+eslint zöld); platform e0ab052 (EPICS + F2-HR-FE.md + submodule-bump). MSG-FRONTEND-007-DONE beküldve.
- Backend-gapek follow-up: G4.1 nincs HR API-host (MSW /api/hr/* a rögzítendő előkép), kapacitás-endpoint, timelog→Kontrolling push-stub, hr.manage Keycloak-claim, training/cert hiányzik a portálból.
- Párhuzamosan fut: F2-HR-REVIEW (designer, read-only a portalban) + F2-MAINTENANCE-FE (frontend, cyan akcent, asset+work-order FSM). Konfliktus-szabály: portal-fájlt csak a Maintenance-agent ír; közös fájl (handlers.ts, worlds.ts) csak bővíthető.
- Állapot: 3/7 modul APPROVED (EHS, CRM, Kontrolling), HR review alatt, hátra: Maintenance → QA → DMS → F3 minőségkapu.

---

_Updated: 2026-07-15_

## 16. mentés (2026-07-15) — HR ✅ APPROVED fix-kör nélkül, 4/7 modul kész

- F2-HR-REVIEW: ✅ APPROVED (main@8831603) — az ELSŐ modul javítási kör nélkül; a korábbi review-leckék (S1 scroll-régió, S2 chip-affordancia, rule-6 detail-invalidáció) bizonyítottan átöröklődtek. 57/57 teszt.
- Findings: 0×S; 1×M backlogba (HR-M1-THRESHOLD: HrDashboard.tsx:212 hardcode 85 → UTILIZATION_WARN_THRESHOLD configból; a Maintenance-review ellenőrzi); 4×N (QueryGate-promótálás a visszatérő közös tétel).
- EPICS: modules_done [ehs, crm, kontrolling, hr]. Platform-push: 7152ccb. Nexus: MSG-DESIGNER-005-DONE.
- Fut: F2-MAINTENANCE-FE. Hátra: Maintenance review-ciklus → QA → DMS → F3 minőségkapu.

---

_Updated: 2026-07-15_

## 17. mentés (2026-07-15) — Maintenance-FE pusholva, Maintenance-review + QA-FE fut, VPS-bump kész

- F2-MAINTENANCE-FE kész és PUSHOLVA: portal main@03a3b0c (WORK_ORDER_FSM a közös fsmGuards-on — backend WorkOrder-aggregátum tükör; calc.ts = AssetStatusCalculationService + PreventiveMaintenanceScheduler; 4 képernyő + 14 napos ütemterv-rács; MaintenancePage 330→34 diszpécser; rule-6 + assets kereszt-invalidáció). 56/56 célzott, teljes 1315/1334 (19 pre-existing). Platform 06011d4 (bump). MSG-FRONTEND-008-DONE.
- Backend-gapek: 5 hiányzó munkalap-átmenet-endpoint (schedule/assign/postpone/reject/reopen), 204→WorkOrderDto, RequiresDowntime-inkonzisztencia, FSM-tábla↔aggregátum eltérés (Reported→InProgress).
- VPS-fejlesztések feldolgozva (Gábor kérésére): 6 spaceos-submodule pin-bump a 07-12-i HEAD-ekre (platform 4d8c463, GitHub compare API-val ancestry-ellenőrzés, klónozás nélkül update-index-szel). ⚠ spaceos-orchestrator NEM bumpolva: a távoli main 31 commit-tal a pin MÖGÖTT (force-push/újrakreálás) — Gábor-flag. 3 törött gitlink (keycloak-theme, identity, sales): nincs mapping + nincs GitHub-repo.
- Fut: F2-MAINTENANCE-REVIEW (designer, HR-M1-THRESHOLD mintaismétlés-ellenőrzéssel) + F2-QA-FE (frontend). Utána: DMS → F3.
- Állás: 4/7 APPROVED (EHS, CRM, Kontrolling, HR) + Maintenance review alatt + QA épül.

---

_Updated: 2026-07-15_

## 18. mentés (2026-07-15) — Maintenance ✅ APPROVED fix-kör nélkül, 5/7 modul kész

- F2-MAINTENANCE-REVIEW: ✅ APPROVED (main@03a3b0c), 2. egymást követő fix-kör nélküli modul; 56/56 teszt. A felelős-guard (startAssignmentBlockReason) ugyanaz a függvény UI-tooltip és MSW 409 alatt — mindhárom rétegben tesztelt.
- Findings backlogba: M1 labels.ts new Date(iso) UTC-parse (TZ-elcsúszás kockázat, közös dateUtils-kiemeléssel javítandó); N1 QueryGate-promótálás 5 modul után ESEDÉKES a QA előtt; N2-N4 kisebb.
- HR-M1 utóellenőrzés: a Maintenance NEM ismételte; HrDashboard.tsx:212 literál még javítatlan.
- EPICS: modules_done [ehs, crm, kontrolling, hr, maintenance]. Platform-push: c66265f. Nexus: MSG-DESIGNER-006-DONE.
- Fut: F2-QA-FE (frontend) + RISKS-5X5-BE (backend, src/ehs). Hátra: QA-review → DMS → F3.

---

_Updated: 2026-07-16_

## EPIC-UI-PORTAL-2026Q3 — konszolidált állapot (2026-07-16, root; a szerver-memória a 07-14-i állapotból jött vissza, ez a 6→23. lokális mentések összefoglalója)

**MIND A 7 MODUL MEGÉPÜLT a típusos adatréteg-mintán, 6/7 APPROVED, a DMS-review fut.**

- F1 LEZÁRVA (shell+primitívek, bundle -80%). F2 modul-sorrend teljesítve: EHS✅ CRM✅ Kontrolling✅ HR✅ Maintenance✅ QA✅ (mind APPROVED; HR/Maintenance/QA fix-kör nélkül) + DMS megépült (review fut). modules_done: [ehs, crm, kontrolling, hr, maintenance, qa].
- Modul-sablon: services/<modul> (zod + fetchers + TanStack hooks + fsm.ts a közös fsmGuards-on + calc.ts backend-tükör + config.ts) / mocks/<modul>Api (stateful, 409 illegális FSM-átmenetre) / pages diszpécser-minta. Rule-6 + kereszt-invalidáció kontraktus- ÉS UI-tesztben.
- F2-CROSSCUT-FIX kész (portal 449bf0c): QueryGate → components/ui (35 importáló, 7 modul), HR-M1 config-küszöb, közös services/dateUtils.ts (helyi idejű parseDay — UTC-parse csapdák javítva).
- Backend: RISKS-5X5-BE kész (src/ehs, RiskAssessment FSM + konfig-vezérelt 5×5 sávok, 130 domain-teszt); follow-up RISKS-5X5-FE.
- Tesztbázis: 1414 passed / 19 pre-existing failed (1433); build+tsc zöld. Platform HEAD: 043deb1, portal HEAD: 449bf0c.
- VPS-csapat develop branch-eken dolgozik (kernel c1f6dd6 Tenant.Subdomain, orchestrator 2fd47ed knowledge/proxy route-ok) — pinek bumpolva (9557185). Jelzett hiba az orchestrator env-configban: IDENTITY=5003 ütközik ABSTRACTIONS-szel, CUTTING 5004 ütközik INVENTORY-val.
- Következik: F2-DMS-REVIEW verdikt → ha APPROVED 7/7 → F3 minőségkapu (7×APPROVED, build+teszt zöld, bundle-riport, root release-döntés Gáborral).
- Backlog: DS-RECONCILE, EHS-WIZARD-HU, RISKS-5X5-FE, FIX-PREEXISTING-TESTS (19), CRM N1-N5, DMS archive/reopen ADR, QA Ticket REST endpointok, 5 Maintenance átmenet-endpoint, MediatR ValidationBehavior.