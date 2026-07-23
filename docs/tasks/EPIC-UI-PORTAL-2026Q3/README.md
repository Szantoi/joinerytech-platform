# Task-fájlok — EPIC-UI-PORTAL-2026Q3

> **LEZÁRT EPIC — történeti végrehajtási jegyzőkönyv.** A portal v1.0.0 és a
> platform v0.2.0 release 2026-07-16-án elkészült. Az alábbi modul-státusz tábla
> a release-kori baseline; azóta az ADR-061/062 hosting-kör mind a hét modult
> futtatható, közös auth/tenant/RLS csomagra kötötte (`4a58e48`). Aktuális munka:
> [`docs/tasks/README.md`](../README.md), státusz: [`EPICS.yaml`](../../../EPICS.yaml).

> QUALITY.md 4. pont: „A kivitelezést rögzíteni kell a task-fájlba (mi készült, hogyan, mi az eredmény)."
> Egy task = egy fájl. A pillanatnyi ÁLLAPOT az `EPICS.yaml`-ban (repo-gyökér) él; itt a kivitelezés RÉSZLETEI.
> Elnevezés: `<task-id>.md`. Kötelező szakaszok: Feladat / Kivitelezés / Eredmény / Fájlok / Tesztek.
> Designer-review jelentések: `docs/knowledge/qa/`. Nexus-kiesés alatt a jelentések: `terminals/root/outbox/pending-nexus/`.
> **Archívum-konvenció (Gábor, 2026-07-18):** a KÉSZ taskok fájlja az epic `archive/` almappájába
> kerül — a nyitott taskok maradnak az epic-mappa gyökerében. Epic-független taskok: `docs/tasks/archive/`.

## Fázis 0 — Felmérés ✅
| Task | Szerep | Státusz | Fájl |
|---|---|---|---|
| MSG-FRONTEND-001 | frontend | ✅ done | [F0-gap-analizis.md](archive/F0-gap-analizis.md) |
| MSG-DESIGNER-002 | designer | ✅ done | [F0-design-system-spec.md](archive/F0-design-system-spec.md) |
| MSG-BACKEND-001 | backend | ✅ done | [F0-api-kontraktus-audit.md](archive/F0-api-kontraktus-audit.md) |

## Fázis 1 — Shell + primitívek ✅ (review-ciklussal zárva)
| Task | Szerep | Státusz | Fájl |
|---|---|---|---|
| F1-A | frontend | ✅ done | [F1-A-tokenek.md](archive/F1-A-tokenek.md) |
| F1-B | frontend | ✅ done | [F1-B-a11y-primitivek.md](archive/F1-B-a11y-primitivek.md) |
| F1-C | frontend | ✅ done | [F1-C-code-splitting-shell.md](archive/F1-C-code-splitting-shell.md) |
| F1-REVIEW | designer | ⚠️→✅ javítva | [F1-REVIEW.md](archive/F1-REVIEW.md) |
| F1-FIX | frontend | ✅ done | [F1-FIX.md](archive/F1-FIX.md) |

## Fázis 2 — Modulok (sorrend: EHS→CRM→Kontrolling→HR→Maintenance→QA→DMS)
| Task | Szerep | Státusz | Fájl |
|---|---|---|---|
| F2-EHS-BE | backend | ✅ done | [F2-EHS-BE.md](archive/F2-EHS-BE.md) |
| F2-EHS-FE | frontend | ✅ done | [F2-EHS-FE.md](archive/F2-EHS-FE.md) |
| F2-EHS-REVIEW(+RE) | designer | ✅ **APPROVED** (CLAUDE.md átbillentve) | [F2-EHS-REVIEW.md](archive/F2-EHS-REVIEW.md) |
| F2-EHS-FIX | frontend | ✅ done | [F2-EHS-FIX.md](archive/F2-EHS-FIX.md) |
| F2-CRM-FE | frontend | ✅ done | [F2-CRM-FE.md](archive/F2-CRM-FE.md) |
| F2-CRM-REVIEW(+RE) | designer | ✅ **APPROVED** | [F2-CRM-REVIEW.md](archive/F2-CRM-REVIEW.md) |
| F2-CRM-FIX | frontend | ✅ done | [F2-CRM-FIX.md](archive/F2-CRM-FIX.md) |
| F2-KONTROLLING-FE | frontend | ✅ done | [F2-KONTROLLING-FE.md](archive/F2-KONTROLLING-FE.md) |
| F2-KONTROLLING-REVIEW(+RE) | designer | ✅ **APPROVED** | [review-jelentés](../../knowledge/qa/F2_KONTROLLING_DESIGN_REVIEW_2026-07-15.md) |
| F2-KONTROLLING-FIX | frontend | ✅ done | [F2-KONTROLLING-FIX.md](archive/F2-KONTROLLING-FIX.md) |
| F2-HR-FE | frontend | ✅ done | [F2-HR-FE.md](archive/F2-HR-FE.md) |
| F2-HR-REVIEW | designer | ✅ **APPROVED** (fix-kör nélkül) | [review-jelentés](../../knowledge/qa/F2_HR_DESIGN_REVIEW_2026-07-15.md) |
| F2-MAINTENANCE-FE | frontend | ✅ done | [F2-MAINTENANCE-FE.md](archive/F2-MAINTENANCE-FE.md) |
| F2-MAINTENANCE-REVIEW | designer | ✅ **APPROVED** (fix-kör nélkül) | [review-jelentés](../../knowledge/qa/F2_MAINTENANCE_DESIGN_REVIEW_2026-07-15.md) |
| F2-QA-FE | frontend | ✅ done | [F2-QA-FE.md](archive/F2-QA-FE.md) |
| F2-QA-REVIEW | designer | ✅ **APPROVED** (fix-kör nélkül) | [review-jelentés](../../knowledge/qa/F2_QA_DESIGN_REVIEW_2026-07-15.md) |
| F2-DMS-FE | frontend | ✅ done | [F2-DMS-FE.md](archive/F2-DMS-FE.md) |
| F2-DMS-REVIEW | designer | ✅ **APPROVED** (fix-kör nélkül) | [review-jelentés](../../knowledge/qa/F2_DMS_DESIGN_REVIEW_2026-07-16.md) |

## Modul-státusz összefoglaló
| Modul | Backend | Frontend | Review |
|---|---|---|---|
| EHS | ✅ 27 endpoint, 92/92 teszt | ✅ 5 képernyő + adatréteg-SABLON | ✅ APPROVED |
| CRM | ⏸ nincs host (G0.1) — MSW-first | ✅ 6 képernyő, 68 teszt | ✅ APPROVED |
| Kontrolling | ⏸ kész domain, nincs host — MSW-first | ✅ 5 képernyő, 35 teszt (calc.ts-tükör) | ✅ APPROVED |
| HR | ⏸ kész domain (Absence FSM), nincs host — MSW-first | ✅ 6 képernyő, 57 teszt (calc.ts kapacitás-tükör) | ✅ APPROVED (M1 follow-up) |
| Maintenance | ⏸ kész domain, 5 hiányzó WO-endpoint — MSW-first | ✅ 4 képernyő + 2 SlideOver, 56 teszt (calc.ts kettős tükör) | ✅ APPROVED (M1 follow-up) |
| QA | ⏸ kész domain, Ticket REST-endpointok HIÁNYOZNAK — MSW-first | ✅ 4 képernyő + 2 SlideOver, 65 teszt (KÉT FSM + payload-guardok, calc.ts metrika-tükör) | ✅ APPROVED (M1: QueryGate-promótálás) |
| DMS | ⏸ kész domain (Document-mag), NINCS futtatható endpoint + jóváhagyás-folyam — MSW-first | ✅ 3 képernyő + detail-SlideOver, 59 teszt (calc.ts runtimeVersion/expiry-tükör, verzió-lánc) | ✅ APPROVED (fix-kör nélkül) |

**Fázis 2 modul-sora TELJES: 7/7 APPROVED → jöhet az F3 minőségkapu.**

## Backlog

FIX-PREEXISTING-TESTS (19 örökölt tesztbukás) · DS-RECONCILE (Gábor
styleguide-ja ↔ spec) · ~~[`EHS-CAPA-WIRE-ROUNDTRIP`](archive/EHS-CAPA-WIRE-ROUNDTRIP.md)~~
**done, reopen utáni TestServer reviewval** ·
~~[`RISKS-5X5-FE`](archive/RISKS-5X5-FE.md)~~ **done 2026-07-23: backend P1 +
portál-szelet mergelve (`joinerytech-portal@1f3ca31`)** ·
[`EHS-WIZARD-HU`](EHS-WIZARD-HU.md) **in_progress: mergelve, done-hoz manuális
vizuális QA kell (Gábor)** · fsm.ts→fsmGuards.ts migráció (EHS) · CRM N1-N5 nitek · Kontrolling
N1+N3-N6 nitek · ~~HR-M1-THRESHOLD~~ + ~~Maintenance M1 (UTC-parse)~~ +
~~QUERYGATE-PROMOTE~~ — **mindhárom ZÁRVA az F2-CROSSCUT-FIX-szel (449bf0c),
a DMS-review-ban kódban igazolva** · HR N1-N4 / Maintenance N2-N4 nitek · QA
N1-N4 nitek (pass-rate nevező kanonizálás, trend rose dark-pár, formFields,
eszkaláció elutasítotton — backend-tisztázás; + QA labels dateUtils-átállás) ·
DMS N1-N5 nitek (formFields 4. ismétlődés + Chip-promótálás `components/ui`-ba
— F3 crosscut-jelöltek; expiring-guard kiemelés, MAIN_PATH-származtatás) ·
qaHibajegy tónuskészlet a spec 1.5-be (designer) ·
Forecast+MarginTrend dark-chart-hexek (közös token-epic)
