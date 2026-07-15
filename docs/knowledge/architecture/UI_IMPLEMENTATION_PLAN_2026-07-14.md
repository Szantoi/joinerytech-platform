# JoineryTech UI terv → Portal megvalósítási terv

> **Kiadta:** root terminál — 2026-07-14
> **Epic:** `EPIC-UI-PORTAL-2026Q3`
> **Forrás-terv:** `docs/joinerytech/` prototípus (PROJECT_STATUS.md, DESIGN_FIX_SPEC_2026-07-02.md, AUDIT_UI_PERFORMANCE_A11Y_2026-07-02.md, PORTAL_DIAGNOSIS_AND_GUIDE_2026-07-12.md)
> **Cél-alkalmazás:** `src/joinerytech-portal/` (React 19 + TS + Vite + Tailwind 4 + Zustand + TanStack Query, MSW mockok, Keycloak OIDC)

---

## 1. Cél

A `docs/joinerytech` kattintható prototípus UI-tervének átültetése az éles portálra, a 7 platform-modul (CRM, Kontrolling, HR, Maintenance, QA, EHS, DMS) képernyőivel, a prototípusban validált navigációs modellel és mobil-első UX-mintákkal — de a prototípus ismert design-adósságai (a11y, dark mode, kettős navigáció, monolit bundle) NÉLKÜL.

## 2. Vezérelvek (root döntések)

1. **Egy navigációs rendszer:** worlds → screens modell (Home világ-rács → világon belüli képernyő-fülek). A prototípus A/B layout kettőssége NEM kerül át — a "B" (világ-alapú) modell a kanonikus.
2. **Világ-akcentek:** CRM=blue, Kontrolling=slate, HR=amber, Maintenance=cyan, QA=lime, EHS=red, DMS=violet. Tailwind tokenként, központi térképben.
3. **FSM-szigor:** státusz-átmenet CSAK validált akción keresztül (UI: tiltott átmenet = disabled gomb + tooltip, nem rejtett). A státusz-készletek a prototípus-spec szerint (ld. 5. pont).
4. **A11y + dark mode alapból:** minden új/átdolgozott primitív billentyűzet-navigálható, ARIA-helyes, fókusz-csapdás (SlideOver), WCAG-AA kontraszt, világos+sötét téma tokenszinten.
5. **Mobil-első:** táblázat→kártya kettős render, SlideOver mobilon bottom sheet (safe-area), alsó nav ≤5 fül + "Több", hüvelykujj-zóna.
6. **Additív munka:** a meglévő ~45 portal-oldal és `components/ui/` készlet a kiindulás — gap-alapú fejlesztés, nem újraírás.
7. **API-kontraktus:** rövid távon MSW mockok a spec-FSM-ekhez igazítva; a backend modul-API-k (Clean Architecture) az FSM-átmeneteket szerver-oldalon validálják.

## 3. Fázisok és felelősök

### Fázis 0 — Felmérés + alapozás (párhuzamos)
| Feladat | Felelős | Kimenet |
|---|---|---|
| **Gap-analízis**: portal oldalak vs prototípus-spec modulonként + shell (nav, SlideOver, Comm Hub, bottom nav) | frontend | `docs/knowledge/architecture/UI_GAP_ANALYSIS.md` |
| **Design-system spec v1**: tokenek (akcentek, STATUS_TONES térkép), dark palette, a11y komponens-specek (Button, SlideOver, Tabs, DataTable, StatusPill, Toast) | designer | Design token + komponens-spec doksi |

### Fázis 1 — Shell + primitívek (frontend, designer review)
Egységes világ-navigáció, mobil alsó nav, SlideOver (fókusz-csapda + bottom sheet), StatusPill tone-map, táblázat→kártya minta, dark mode kapcsoló, route-alapú code-splitting (`lazy()`/`Suspense`).

### Fázis 2 — Modul-képernyők (frontend módszeresen, backend kontraktus, designer review)
Prioritási sorrend:
1. **EHS** (⚠️ CHANGES REQUESTED + nyitott scope: SDS/veszélyesanyag-törzs, EVE/PPE-kiadás dolgozónként, munkavédelmi bejárás→CAPA; locations-endpoint mock-TODO)
2. **CRM** (pipeline kanban, lead+opportunity kettős FSM, forecast)
3. **Kontrolling** (vezetői áttekintés, projekt-fedezet, eltérés-elemzés)
4. **HR** (kapacitás-rács, távollét-FSM, készség-mátrix)
5. **Maintenance** (eszköz-törzs, munkalap-FSM, ütemterv, állásidő)
6. **QA** (ellenőrzés-lista, státusz-tábla, checklist+NCR)
7. **DMS** (dokumentum-életciklus FSM, verziózás, entitás-linkek)

### Fázis 3 — Minőségkapu
Designer UI-review modulonként (APPROVED cél mind a 7-re); monitor: build/lint/test zöld + bundle-méret figyelés; root: release-döntés + submodule bump.

## 4. Workflow (terminál-koordináció)

```
root ──(epic + tasks, Nexus MCP)──► conductor ──► backend / frontend / designer
  ▲                                      │
  └──(submit_done / eszkaláció)──────────┘        monitor: health + build watch
```

- Feladatok a **Nexus MCP mailboxon** (`create_task` / `submit_done`), epic: `EPIC-UI-PORTAL-2026Q3`.
- A conductor szekvenálja a fázisokat, gyűjti a kész-jelentéseket, eszkalál a rootnak.
- Modulonként: frontend implementál → designer review-zik → conductor zárja. EHS-nél backend-előfeltétel (locations + SDS/PPE kontraktus).
- Tudásmegosztás: minden fázis-kimenet a `docs/knowledge/` alá kerül (a Nexus indexeli, `search_knowledge`-dzsel kereshető).

## 5. FSM-referencia (státusz-készletek, a prototípusból — kötelező)

- **CRM Lead:** `uj → kapcsolat → minosites → nurturing → konvertalva` (+`elvetve`)
- **CRM Opportunity:** `nyitott → igenyfelmeres → osszeallitas → ajanlat → targyalas → megnyert/elveszett`
- **HR Távollét:** `kert → jovahagyva → folyamatban → lezarva` (+`elutasitva`)
- **Maintenance Munkalap:** `bejelentve → utemezve → folyamatban → kesz` (+`halasztva`, `elutasitva`); eszköz-státusz SZÁMÍTOTT
- **QA Ellenőrzés:** `nyitott → folyamatban → megfelelt` (+`javitasra` rework-hurok, `selejt` terminális)
- **EHS Baleset:** `bejelentve → kivizsgalas → intezkedes → lezarva` + CAPA. _ADR (root, 2026-07-14): a prototípus `elutasitva` ága HELYETT a valós backend-kontraktus `Closed → Reopened` átmenete a kanonikus — a UI a kontraktust követi._
- **DMS Dokumentum:** `piszkozat → ellenorzes → kiadott → archivalt` (archiválás → új munkapéldány)
- **Kontrolling projekt-címkék:** `draft/active/install/done/on_hold` (nem szigorú FSM)

---

_Root terminál — JoineryTech sziget. Kérdés/eszkaláció: Nexus mailbox → root._
