# F1-A — Tokenek + dark mode + akcent-javítás + StatusPill/FSM_TONES

- **Szerep:** frontend · **Státusz:** ✅ done (2026-07-14) · **Fázis:** F1

## Feladat
A DESIGN_SYSTEM_SPEC_V1 token-rendszerének implementálása a portalban + világ-akcent javítás + közös StatusPill.

## Kivitelezés / Eredmény
- `src/index.css` újraírva: érvénytelen `@variant dark { @mixin dark }` → `@custom-variant dark`; @theme szemantikus tokenek (surface-0/1/2, ink, ink-muted, line, world-*) + `:root`/`.dark` értékek + mind a 7 `[data-world]` akcent-blokk (light+dark) a spec szerint; elavult tokenek törölve; dokumentált teal fallback.
- `src/mocks/worlds.ts`: akcentek javítva (crm indigo→blue, maintenance amber→cyan, quality emerald→lime, ehs rose→red, docs amber→violet).
- `src/theme/` (ÚJ): `worldAccents.ts` (data-attr térkép: quality→qa, docs→dms), `useTheme.ts` (jt-theme localStorage, 3-állapot, useSyncExternalStore), `statusTones.ts` (7 tónus light+dark), `fsmTones.ts` (8 FSM-készlet + FSM_STATUS_ALIASES + resolveFsmTone unknown→neutral+dev-warn), `README.md`.
- `index.html`: no-flash téma-script; `ThemeToggle.tsx` (ÚJ, radiogroup) a UserMenu-ben + mobil drawer-ben.
- `WorldShell.tsx`: `data-world` a shell-gyökéren, nav pillek token-osztályokra, surface/ink/line migráció; `HomeScreen.tsx`: világ-kártyák saját data-world.
- `StatusPill.tsx` refaktor (tone | fsm+status | legacy API); **7 duplikált pill-komponens törölve**, ~15 hívóhely migrálva (Lead/Opp/Abs/Ticket/Ncr/Incident/Doc/Project — AssetStatusPill szándékosan maradt: számított, nem FSM).

## Tesztek
42/42 zöld (statusTones-teljesség minden valós portal-kulcsra; useTheme perzisztencia+rendszerkövetés; StatusPill új API). ESLint tiszta a módosított fájlokon.
