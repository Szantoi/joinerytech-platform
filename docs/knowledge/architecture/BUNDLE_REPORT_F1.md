# Bundle Report — F1-C route code-splitting

> **Készítette:** frontend terminál — 2026-07-14
> **Epic:** `EPIC-UI-PORTAL-2026Q3` · Fázis 1 / F1-C
> **App:** `src/joinerytech-portal` · Vite 8 (Rolldown) production build (`npm run build`)

## Baseline (F1-C előtt, HEAD `db57ae3` + F1-A/F1-B nélkül)

Egyetlen monolit JS chunk — nincs code-splitting:

| Asset | Méret | gzip |
|---|---:|---:|
| `assets/index-*.js` | **1 890.15 kB** | **462.23 kB** |
| `assets/index-*.css` | 111.05 kB | 17.45 kB |

## F1-C után (React.lazy route-splitting + manualChunks)

54 JS chunk; az induláskor letöltött JS a shell chunk + runtime (~383 kB, gzip ~111.5 kB). Top chunkok:

| Chunk | Méret | gzip | Megjegyzés |
|---|---:|---:|---|
| `index-*.js` (shell: auth, layout, providers, router) | 381.65 kB | 110.78 kB | egyedüli eager JS a runtime-okon túl |
| `recharts-*.js` | 372.77 kB | 109.46 kB | manualChunks — csak chart-os oldalak töltik |
| `ProductionPage-*.js` | 284.59 kB | 69.94 kB | legnagyobb lazy oldal-chunk |
| `ProcurementPage-*.js` | 105.94 kB | 22.04 kB | lazy |
| `SettingsPage-*.js` | 71.14 kB | 15.46 kB | lazy |
| `configurator.types-*.js` | 67.33 kB | 18.42 kB | konfigurátor-flow megosztott chunk |
| `SalesPage-*.js` | 47.22 kB | 10.14 kB | lazy |
| `chunk-4ZMWKKQ3-*.js` | 42.58 kB | 15.24 kB | megosztott vendor/util chunk |
| `DesignPage-*.js` | 34.92 kB | 7.66 kB | lazy |
| `HrPage-*.js` | 29.17 kB | 7.12 kB | lazy |
| … további ~44 oldal-chunk (0.4–28 kB) | ~430 kB össz. | | mind lazy, route-onként töltődik |
| `index-*.css` | 123.87 kB | 19.55 kB | változatlanul egy fájl |

**Teljes JS (minden chunk együtt):** ~2 190 kB (a splitting overhead + F1-A/B új primitívek miatt nagyobb az összeg, de sosem töltődik egyben).

## Eredmény

- **Induló JS: 1 890 kB → ~383 kB** (gzip 462 kB → ~111 kB) — **~80% csökkenés** az első betöltésen.
- A ~40 oldal mind saját `React.lazy()` chunk; a Suspense fallback token-alapú (`RouteFallback`, surface/ink/world tokenek).
- `recharts` külön manualChunks vendor-chunk (csak a chart-os oldalak hivatkozzák; oldal-chunk változás nem invalidálja).
- `@dnd-kit/*`-ra is van manualChunks szabály, de jelenleg tree-shakelve van (egyetlen fogyasztója, az `AssemblyOperationsList`, árva komponens — egyetlen route sem éri el), így nem kerül a bundle-be.
- Következő jelölt (Fázis 2): a shell chunk 381 kB-jának bontása (oidc-client-ts, msw dev-only ellenőrzés, TanStack Query), és a `ProductionPage` 284 kB-os chunkjának belső bontása.
