# F2-CRM-REVIEW + F2-CRM-REREVIEW — CRM világ designer-review ciklus

- **Szerep:** designer · **Státusz:** ✅ APPROVED (re-review után, 2026-07-14) · **Fázis:** F2 (CRM)

## Feladat
A CRM-világ review-ja az EHS-nél bevált standardok szerint (spec-hűség, FSM-szigor, sablon-konformitás, tokenek/a11y/dark, mobil).

## Kivitelezés / Eredmény
**1. kör (CHANGES REQUESTED, szűk körű):** jelentés `docs/knowledge/qa/F2_CRM_DESIGN_REVIEW_2026-07-14.md`.
- Blokkolók: **S1** quote-gomb UI-guard hiánya lezárt lehetőségen (MSW-guard megvolt, UI nem tükrözte); **S2** detail query-kulcsok invalidációja hiányzott (a sablon-README 6. szabályának csapdája — az EHS M1-lecke fele); **S3** kanban spec §3.3 hiányok (edge-fade, fókuszálható konténer, 280px oszlop, snap, darabszám az aria-labelben).
- Kérve: M1 TasksScreen soronkénti mutation; M2 szűrő-chip nem-szín-alapú aktív jelzés + 44px hit area.
- **Jóváhagyva:** `fsmGuards.ts` tiszta generalizáció; adatréteg sablon-konform; mind a 6 képernyő terv-hű; token-fegyelem kiváló (az EHS S1-osztályú hiba NEM ismétlődött).

**Javítás:** F2-CRM-FIX (külön task-fájl) — mind az 5 finding javítva, 68 célzott teszt zöld (+8 új).

**2. kör (RE-REVIEW ✅ APPROVED):** mind az 5 finding kódban igazolva — S1: `isOppOpen()` guard + disabledReason + 3 új teszt; S2: singular detail-prefix invalidálás mindkét invalidálóban, 4 hook-teszt; S3: mind a 6 spec §3.3 követelmény (region+aria, edge-fade, snap, touch-pan-x, 280px, darabszám) tesztekkel asszertálva; M1 TaskRow soronkénti mutation; M2 check-ikon+44px hit area. 9 fájl / 68 teszt zöld (a re-review által újrafuttatva). A CRM-minta a következő modulok ajánlott sablonja.

## Tesztek
Review read-only; 60/60 CRM-teszt a review alatt újrafuttatva zöld.
