# Task-fájlok — EPIC-UI-PORTAL-2026Q3

> QUALITY.md 4. pont: „A kivitelezést rögzíteni kell a task-fájlba (mi készült, hogyan, mi az eredmény)."
> Egy task = egy fájl. A pillanatnyi ÁLLAPOT az `EPICS.yaml`-ban (repo-gyökér) él; itt a kivitelezés RÉSZLETEI.
> Elnevezés: `<task-id>.md`. Kötelező szakaszok: Feladat / Kivitelezés / Eredmény / Fájlok / Tesztek.
> Designer-review jelentések: `docs/knowledge/qa/`. Nexus-kiesés alatt a jelentések: `terminals/root/outbox/pending-nexus/`.

## Fázis 0 — Felmérés ✅
| Task | Szerep | Státusz | Fájl |
|---|---|---|---|
| MSG-FRONTEND-001 | frontend | ✅ done | [F0-gap-analizis.md](F0-gap-analizis.md) |
| MSG-DESIGNER-002 | designer | ✅ done | [F0-design-system-spec.md](F0-design-system-spec.md) |
| MSG-BACKEND-001 | backend | ✅ done | [F0-api-kontraktus-audit.md](F0-api-kontraktus-audit.md) |

## Fázis 1 — Shell + primitívek ✅ (review-ciklussal zárva)
| Task | Szerep | Státusz | Fájl |
|---|---|---|---|
| F1-A | frontend | ✅ done | [F1-A-tokenek.md](F1-A-tokenek.md) |
| F1-B | frontend | ✅ done | [F1-B-a11y-primitivek.md](F1-B-a11y-primitivek.md) |
| F1-C | frontend | ✅ done | [F1-C-code-splitting-shell.md](F1-C-code-splitting-shell.md) |
| F1-REVIEW | designer | ⚠️→✅ javítva | [F1-REVIEW.md](F1-REVIEW.md) |
| F1-FIX | frontend | ✅ done | [F1-FIX.md](F1-FIX.md) |

## Fázis 2 — Modulok (sorrend: EHS→CRM→Kontrolling→HR→Maintenance→QA→DMS)
| Task | Szerep | Státusz | Fájl |
|---|---|---|---|
| F2-EHS-BE | backend | ✅ done | [F2-EHS-BE.md](F2-EHS-BE.md) |
| F2-EHS-FE | frontend | ✅ done | [F2-EHS-FE.md](F2-EHS-FE.md) |
| F2-EHS-REVIEW(+RE) | designer | ✅ **APPROVED** (CLAUDE.md átbillentve) | [F2-EHS-REVIEW.md](F2-EHS-REVIEW.md) |
| F2-EHS-FIX | frontend | ✅ done | [F2-EHS-FIX.md](F2-EHS-FIX.md) |
| F2-CRM-FE | frontend | ✅ done | [F2-CRM-FE.md](F2-CRM-FE.md) |
| F2-CRM-REVIEW(+RE) | designer | ✅ **APPROVED** | [F2-CRM-REVIEW.md](F2-CRM-REVIEW.md) |
| F2-CRM-FIX | frontend | ✅ done | [F2-CRM-FIX.md](F2-CRM-FIX.md) |
| F2-KONTROLLING-FE | frontend | ✅ done | [F2-KONTROLLING-FE.md](F2-KONTROLLING-FE.md) |
| F2-KONTROLLING-REVIEW(+RE) | designer | ✅ **APPROVED** | [review-jelentés](../../knowledge/qa/F2_KONTROLLING_DESIGN_REVIEW_2026-07-15.md) |
| F2-KONTROLLING-FIX | frontend | ✅ done | [F2-KONTROLLING-FIX.md](F2-KONTROLLING-FIX.md) |

## Modul-státusz összefoglaló
| Modul | Backend | Frontend | Review |
|---|---|---|---|
| EHS | ✅ 27 endpoint, 92/92 teszt | ✅ 5 képernyő + adatréteg-SABLON | ✅ APPROVED |
| CRM | ⏸ nincs host (G0.1) — MSW-first | ✅ 6 képernyő, 68 teszt | ✅ APPROVED |
| Kontrolling | ⏸ kész domain, nincs host — MSW-first | ✅ 5 képernyő, 35 teszt (calc.ts-tükör) | ✅ APPROVED |
| HR / Maintenance / QA / DMS | — | ⏭ várólistán | — |

## Backlog
FIX-PREEXISTING-TESTS (19 örökölt tesztbukás) · DS-RECONCILE (Gábor styleguide-ja ↔ spec) · RISKS-5X5-BE (EHS mátrix backend) · EHS-WIZARD-HU · fsm.ts→fsmGuards.ts migráció (EHS) · CRM N1-N5 nitek · Kontrolling N1+N3-N6 nitek · Forecast+MarginTrend dark-chart-hexek (közös token-epic)
