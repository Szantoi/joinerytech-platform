# MSG-DESIGNER-002 — Design-system spec v1

- **Szerep:** designer · **Státusz:** ✅ done (2026-07-14) · **Fázis:** F0

## Feladat
Implementálható design-system spec: tokenek, STATUS_TONES, a11y komponens-specek, dark mode, mobil minták — a prototípus design-adósságai (DESIGN_FIX_SPEC, A11Y-audit) alapján.

## Kivitelezés
Prototípus-auditok + a portal meglévő ui-készletének elemzése, Tailwind 4 @theme formátumú spec írása AA-kontraszt ellenőrzéssel.

## Eredmény
`docs/knowledge/patterns/DESIGN_SYSTEM_SPEC_V1.md`:
- Copy-paste @theme tokenblokk: surface-0/1/2, ink, ink-muted, line (stone-alap) + 7 világ-akcent `[data-world]` indirekcióval; kontraszt-lépcsők AA-bizonyíték-táblázattal (light primary -600 vs -700; dark -400 + -950 fg).
- STATUS_TONES: 7 tónus (neutral/info/progress/success/warn/danger/terminal) light+dark + FSM_TONES mind a 8 státusz-készletre.
- 6 primitív a11y-spec (Button, SlideOver, Tabs, DataTable, StatusPill, Toast): billentyűzet-térkép + ARIA + acceptance checklist. Kulcsdöntés: FSM-tiltott gomb = aria-disabled + tooltip (nem rejtett).
- Mobil minták (58px bottom nav + safe-area + „Több", FAB, snap-scroll) + class-alapú dark mode (jt-theme localStorage, no-flash script).

## Tesztek
n/a (spec). Lejelentve: MSG-DESIGNER-001-DONE.
