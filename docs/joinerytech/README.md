# JoineryTech legacy és prototípus korpusz

Ez a mappa megőrzött termékterveket, korai prototípusokat, screenshotokat, importált anyagokat és történeti implementációs jegyzeteket tartalmaz. Hasznos a szándék, a vizuális referencia és a korábbi döntések megértéséhez, de **nem a futó rendszer elsődleges specifikációja**.

## Mi az elsődleges helyette?

| Kérdés | Elsődleges forrás |
|---|---|
| Mit futtat ma a portál? | [`src/joinerytech-portal/`](../../src/joinerytech-portal/) és annak [README-je](../../src/joinerytech-portal/README.md) |
| Mi a jelenlegi architektúra? | [docs/ARCHITECTURE.md](../ARCHITECTURE.md) és [technikai tudásindex](../knowledge/INDEX.md) |
| Mi a jelenlegi teendő? | [`EPICS.yaml`](../../EPICS.yaml) és [task-protokoll](../tasks/README.md) |
| Milyen domain- vagy wire-szerződés kötelező? | [domain dokumentáció](../knowledge/domain/) és [kontraktus-index](../knowledge/contracts/README.md) |

## Mit találsz itt?

- `screenshots/`, képek és designanyagok — vizuális, termék- és UX-referencia.
- `uploads/` — beérkezett anyagok, amelyek nem automatikusan kanonikus specifikációk.
- `build/`, korai store- és UI-anyagok — történeti implementációs referencia.
- Korábbi állapot-, backend- és phase-jegyzőkönyvek — a készítéskori kontextus bizonyítékai.

## Használati szabály

Ha egy legacy dokumentum és a jelenlegi kód, ADR vagy kontraktus eltér, a jelenlegi, kanonikus forrás nyer. A különbséget ne csendes másolással „javítsd”; szükség esetén írd le, milyen döntés vagy migráció oldja fel.

A [gyökérszintű portal diagnózis-hivatkozás](../PORTAL_DIAGNOSIS_AND_GUIDE.md) és az [eredeti, dátumozott Portal-diagnózis](../../src/joinerytech-portal/docs/PORTAL_DIAGNOSIS_AND_GUIDE.md) történeti evidence; egyik sem aktuális fejlesztői útmutató.
