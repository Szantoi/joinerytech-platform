# Portal világ-leltár és adósság-térkép — 2026-07-16

> Kutatás Gábor kérdésére: a tervanyag ~28 csempéjéből mi valósult meg.
> Állapot: portal `ad50ce9` (v1.0.0 után), platform `72bc44c`.

## Összkép

A portál világ-rácsában **~23 világ (csempe)** él. Ebből az EPIC-UI-PORTAL-2026Q3
**7 modul-világot** vitt végig teljes minőségi körrel (típusos adatréteg + FSM +
designer-APPROVED); a maradék **~16 világ a prototípusból örökölt, legacy minőségű**.

## 1. Modernizált világok (7) — a JoineryTech sziget felelősségi köre

| Világ (kulcs) | Modul | Állapot |
|---|---|---|
| crm | CRM | ✅ APPROVED, `src/modules/crm` |
| kontrolling | Kontrolling | ✅ APPROVED, `src/modules/controlling` |
| hr | HR | ✅ APPROVED, `src/modules/hr` |
| maintenance | Maintenance | ✅ APPROVED, `src/modules/maintenance` |
| quality | QA | ✅ APPROVED, `src/modules/qa` |
| ehs | EHS | ✅ APPROVED, `src/modules/ehs` |
| docs | DMS | ✅ APPROVED, `src/modules/dms` |

Minta: `src/modules/<mod>/{services,mocks,pages}` + publikus `index.ts`;
FSM-guard UI+MSW közös forrásból (409/400), calc.ts backend-tükör, config-vezérelt
küszöbök, rule-6 invalidáció, dark mode token-rétegen. Baseline: 1418 zöld teszt.

## 2. Legacy világok (~16) — prototípus-minőség

Renderelnek, mock-adattal kattinthatók, de: nincs típusos adatréteg, nincs
FSM-guard, hardolt stílusok, lint-adósság.

**a) Van hozzájuk backend a spaceos-modulokban** (a bevált FE-minta átvezetése elég):
- **production** (szabászat/megmunkálás/workflow) ← spaceos-modules-cutting + joinery
- **warehouse** (készlet/beszerzés/mozgások) ← spaceos-modules-inventory + procurement
- **sales** (rendelések/árajánlatok/ügyfelek) ← spaceos-modules-contracts (+ cabinet)
- **shopfloor** (üzemi kiosk — tudatosan érintetlen a dark mode-ban is)

**b) Vékony vagy hiányzó backend** (scope-döntés is kell):
design, finance, projects, logistics, mfgprep, supervisor, masterdata, trade,
interior, attendance, tasks, ai, execbi (+ settings mint horizontális felület).

Javasolt folytatás: **EPIC-UI-WORLDS-2026Q3** a bevált gyártósorral (FE → review →
APPROVED), kezdésnek a (a) csoporttal — a sorrend Gábor üzleti döntése.

## 3. Adósság-térkép (nem blokkoló, de számon tartott)

**Frontend:**
- ~16 legacy világ a fenti listában (nincs adatréteg/FSM)
- 205 eslint-hiba + 16 warning, 94 fájl — mind legacy kód, a 7 modul-világban 0
- ~100 legacy fájl (~800 hardolt Tailwind-osztály) a dark mode csere-körből kimaradt
- 19 pre-existing tesztbukás (FIX-PREEXISTING-TESTS: BOMPreviewCard, configurator,
  catalogFilterPersistence, ProcurementPage, WorkOrderSummary)
- `src/mocks/worlds.ts` világ-regiszter a mocks alatt él és részben elavult
  (hr/kontrolling saját route-on fut) — regiszter-egyeztetés szükséges
- 1 kereszt-modul import (controlling → ehs formFields) — @joinerytech/ui-jelölt
- MODULE-PACKAGES (npm workspace bontás) pending; EHS fsm.ts → fsmGuards migráció;
  EHS-WIZARD-HU; DS-RECONCILE (light oklch-akcentusok); CRM/DMS N-nitek

**Backend:**
- DMS: nincs futtatható host (a legnagyobb gap — MSW a kontraktus-előkép)
- HR, CRM, Kontrolling: domain kész, host hiányzik
- QA: inspection-lista GetFailedInspectionsQuery-hack; 26 pre-existing integrációs
  tesztbukás (QA-INTEGRATION-FIX)
- MediatR ValidationBehavior (EHS): validátorok nincsenek pipeline-ba kötve
- **ADR-döntések várnak:** QA rework/Conditional ág; assign-identitás (assigneeName
  vs Guid); wire-nyelv (magyar kulcsok vs angol enum); Maintenance Reported→InProgress;
  DMS archive/reopen ↔ backend megfeleltetés

**Infra:**
- Keycloak `portal-app` kliens: localhost redirect URI hiányzik (dev-bypass:
  `VITE_AUTH_MODE=mock` a `.env.local`-ban — csak DEV buildben aktív)
- 3 törött gitlink (joinerytech-keycloak-theme, spaceos-modules-identity, -sales)
- VPS-csapat develop branch-eken dolgozik (kernel/orchestrator main = baseline-reset)
- `agents.yaml` master token a git-történetben (rotáció-jelölt)

_Részletek: EPICS.yaml backlog_f2 + docs/tasks/EPIC-UI-PORTAL-2026Q3/ task-fájlok._
