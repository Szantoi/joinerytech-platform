# MSG-FRONTEND-001 — Gap-analízis: portal vs prototípus UI-spec

- **Szerep:** frontend · **Státusz:** ✅ done (2026-07-14) · **Fázis:** F0

## Feladat
A src/joinerytech-portal meglévő állapotának összevetése a docs/joinerytech prototípus UI-tervével (shell, 7 modul, primitívek, MSW mockok).

## Kivitelezés
Explore + elemzés a portal forrásán (pages/, components/, mocks/), a terv FSM-referenciája ellen.

## Eredmény
`docs/knowledge/architecture/UI_GAP_ANALYSIS.md`. Fő hiányok:
1. **Nincs adatréteg** — a modul-oldalak mock-tömböket importálnak, 0 GET/FSM endpoint az MSW-ben, nincs TanStack Query az oldalakon.
2. **FSM-ek csak enumok** — egyetlen validált átmenet-akció sincs a UI-ban; QA enum hibás (nincs `javitasra`/`selejt`).
3. **QA modul üres** (KPI=0, placeholder képernyők).
4. **EHS:** IncidentReportWizard+FAB+draft-store kész, de NINCS mountolva; locations hardcoded TODO (StepDetails.tsx); SDS/PPE/bejárás hiányzik.
5. **Shell:** akcent-eltérések (CRM=indigo→blue kell; HR/Maint/DMS amber-ütközés), nincs code-splitting, SlideOver fókusz-hiányok, MobileBottomNav árva.

## Tesztek
n/a (elemző task). Lejelentve: MSG-FRONTEND-001-DONE (Nexus outbox).
