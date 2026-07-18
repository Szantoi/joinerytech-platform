# F2-EHS-REVIEW + F2-EHS-REREVIEW — EHS világ designer-review ciklus

- **Szerep:** designer · **Státusz:** ✅ APPROVED (re-review után, 2026-07-14) · **Fázis:** F2 (EHS)

## Feladat
Az újjáépített EHS-világ review-ja a DESIGN_SYSTEM_SPEC_V1 acceptance-checklistjei ellen; cél a sziget CLAUDE.md „⚠️ CHANGES REQUESTED" státuszának feloldása.

## Kivitelezés / Eredmény
**1. kör (CHANGES REQUESTED):** jelentés `docs/knowledge/qa/F2_EHS_DESIGN_REVIEW_2026-07-14.md`.
- Blokkolók: S1 dashboard nyerspaletta dark-pár nélkül; S2 FAB↔MobileBottomNav átfedés (spec §3.2 sértés).
- Nem-blokkoló: M1 egységes-CAPA cache-invalidáció keresztkötések; N1 KPI-link; N2/N3 nitek.
- **Kiemelt:** az adatréteg (`services/apiClient.ts` + `services/ehs/`) **sablonként APPROVED** a többi 6 modulnak; FsmStepper a11y helyes; aria-disabled+tooltip minden tiltott átmeneten.

**Javítás:** F2-EHS-FIX (külön task-fájl) — mind a 6 finding javítva.

**2. kör (RE-REVIEW ✅ APPROVED):** S1/S2/M1/N1/N2/N3 igazoltan javítva; stone/rose grep nem talált dark-pár nélküli regressziót a többi EHS-képernyőn (RisksScreen kivétel → RISKS-5X5-BE backlog); 90/90 célzott teszt zöld.
**Akció:** a gyökér `CLAUDE.md` EHS sora ⚠️ CHANGES REQUESTED → **✅ APPROVED** (átbillentve).

## Tesztek
Review read-only; a re-review 90/90 célzott tesztet futtatott újra.
