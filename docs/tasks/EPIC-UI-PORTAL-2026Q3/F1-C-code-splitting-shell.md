# F1-C — Code-splitting + MobileBottomNav + shell-integráció + build-verify

- **Szerep:** frontend · **Státusz:** ✅ done (2026-07-14) · **Fázis:** F1

## Feladat
Route-alapú code-splitting, az árva MobileBottomNav bekötése a world-screen modellre, teljes integráció-ellenőrzés, bundle-riport.

## Kivitelezés / Eredmény
- `App.tsx`: ~41 oldal `React.lazy()` (típusos `lazyPage()` helper), gyökér+beágyazott `Suspense` (`RouteFallback` token-vezérelt spinner, role=status); halott kód törölve.
- `vite.config.ts`: manualChunks (recharts+d3, dnd-kit).
- `bottomNav.ts` (ÚJ): tiszta `selectBottomNavItems()` (≤5 fül; >5 → 4+„Több", moreActive) + config-vezérelt ikon-térkép; `MobileBottomNav.tsx` újraírva (<md, 58px+safe-area, aria-current, „Több"=aria-haspopup); `WorldShell.tsx` mountolja + main bottom-padding; `ChatBubble.tsx` a nav fölé + aria.
- `BUNDLE_REPORT_F1.md` (docs/knowledge/architecture/).

## Tesztek / Build
- **1113 zöld / 19 bukás — mind pre-existing** (HEAD db57ae3-en stash-sel igazolva: BOMPreviewCard, configurator HU számformátum, catalogFilterPersistence, ProcurementPage Router-hiány) → backlog: FIX-PREEXISTING-TESTS.
- Build PASS (tsc -b + vite, 891 modul). ESLint tiszta.
- **Bundle: kezdeti JS 462 kB → ~111 kB gzip (-80%)**; legnagyobb lazy chunkok: recharts 373 kB, ProductionPage 285 kB (további bontásra jelölt).
