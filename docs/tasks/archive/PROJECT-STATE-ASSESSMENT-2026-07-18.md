# PROJECT-STATE-ASSESSMENT-2026-07-18 — tudástári állapotfelmérés

- **Szerep:** root
- **Státusz:** ✅ done
- **Dátum:** 2026-07-18
- **Cél:** a JoineryTech program tényleges termék-, UI-, backend-, runtime-,
  tudástár- és minőségi állapotának bizonyíték-alapú rögzítése, lehetőségekkel és
  mérhető következő kapukkal.

## Scope

- `QUALITY.md` megfelelés
- `docs/joinerytech` UI/design korpusz
- projektmenedzsment és B2BHandshake design intent
- tényleges React-portál és modern/legacy világok
- backend hosting/auth/tenant/RLS állapot
- frontend build, teszt és lint
- VPS szolgáltatások
- tudástár és repository reprodukálhatóság

## Kimenet

[`docs/knowledge/architecture/PROJECT_STATE_ASSESSMENT_2026-07-18.md`](../../knowledge/architecture/PROJECT_STATE_ASSESSMENT_2026-07-18.md)

## Végrehajtás

1. A forrásdokumentumok, goal-config, ADR-ek és task-jegyzőkönyvek leltározva.
2. A prototípus és a valódi portál böngészőben összevetve.
3. A portal build, teszt-ergonómia és lint frissen ellenőrizve.
4. A VPS 11 service-e és várt portjai read-only módon ellenőrizve.
5. A cél, kockázatok, opciók és ajánlott programkapuk tudástári dokumentumba
   rendezve.
6. A Knowledge Base index aktuális belépési ponttal és technológiai állapottal
   frissítve.
7. A lezárt felmérés rövid mementója a root projektmemóriába mentve.

## Bizonyíték

- `npm run build` → PASS, 60 lazy chunk
- teljes `npm test` → 15 perc után nincs összesítés; 1 timeout; diagnosztikusan megszakítva
- izolált limit-teszt → 1/1 PASS, 82,38 s teljes idő
- ESLint → 198 error, 17 warning, 93 fájl
- VPS → 11/11 service active, 0 failed unit
- portal submodule → tiszta `main@b711549`

## Eredmény

A program célja egyértelműen rögzítve: a hét általános platformmodul mellett a
stratégiai termékmag a céghatárokon átívelő, actor-szűrt projekt/FlowEpic/
B2BHandshake működés. A következő ajánlott sorrend: hosting–auth–RLS kapu →
API-first production/warehouse → valós API E2E → projekt bounded-context ADR.

## Nem történt

- alkalmazáskód-módosítás;
- deploy vagy service restart;
- más folyamatban lévő hosting/RLS munka módosítása;
- commit vagy push.
