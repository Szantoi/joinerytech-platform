# DS-DARKMODE — Dark mode a portálon a design-system spec szerint

**Státusz:** DONE (2026-07-16) · **Szerep:** frontend · **Kanonikus spec:** `design-system/dark-mode.html` (+ `szinek.html` oklch-recept)

## Mi változott

### 1. Token-réteg (src/index.css — teljes újraírás)

- **Spec-tokenek** a `:root`-on: `--surface-app #f7f7f5`, `--surface-card #fff`, `--surface-sunken #fafaf9`, `--border #e7e5e4`, `--text-primary #1c1917`, `--text-secondary #78716c`, `--sidebar #0b1220`.
- **Dark értékek** (`#0d1117 / #151d2b / #111826 / #232a35 / #e6e9ee / #8b93a1 / #05070c`) két bejáraton, azonos készlettel:
  - kézi felülírás: `:root[data-theme="dark"]`
  - rendszer-preferencia alapértelmezésként: `@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){…} }`
- **Mechanizmus-váltás:** a korábbi `.dark` class (stone-950-es sötét paletta) → `data-theme` attribútum + a spec kékes-szén palettája. A Tailwind `dark:` variáns `@custom-variant`-ja is a data-theme + media párost követi, így a meglévő ~86 `dark:` escape-hatch változatlanul működik.
- **Legacy aliasok megmaradtak** (`--surface-0/1/2`, `--ink`, `--ink-muted`, `--line`) — a spec-tokenekre képződnek le, ezért a már tokenizált 7 modul-világ kód-változtatás NÉLKÜL váltott át az új sötét palettára. Új utility-k: `bg-surface-app/card/sunken`, `bg-sidebar`, `border-line-strong`, `text-ink-soft` (= spec `--text-secondary`), `acc-strong/mid/tint`, `chart-ref`.
- Szándékos eltérés: light `--ink-muted` marad stone-600 (a spec stone-500-a fehéren 4.5:1 alatt van — korábbi audit-döntés); a spec `--text-secondary` szerep `text-ink-soft` néven él.

### 2. World-akcentusok sötétben (oklch-recept)

- A 7 `[data-world]` light-blokk változatlan paletta-értékeken marad (light megjelenés érintetlen), és csak a `--hue`-t adja hozzá (crm 255, kontrolling 260, hr 75, maintenance 210, qa 130, ehs 27, dms 300; root fallback teal 183).
- Sötétben **egyetlen generikus recept** számol minden világot: `--world` = oklch(0.78 0.13 H) (acc-strong), `--world-soft` = oklch(0.27 0.05 H) (acc-tint), `--world-soft-fg` = oklch(0.82 0.10 H), ring = oklch(0.72 0.14 H) (acc-mid). Kontrolling (slate) csökkentett chromával fut (`--acc-c-*` bemenetek).
- **Primer gomb sötétben:** világosított akcentus-háttér + SÖTÉT szöveg (`--world-fg` = oklch(0.23 0.05 H)) — WCAG AA ≥4.5:1.
- **Pill/soft sötétben:** saturált, alacsony-lightness tint + világos akcentus-szöveg (nem a light-tint áttetszőn). A STATUS_TONES (-950 bg / -300 fg) már ezt a mintát követte — változatlan.

### 3. Kapcsoló + FOUC

- `useTheme` (rendszer/világos/sötét, `jt-theme` localStorage): explicit light/dark → `data-theme` attribútum; **system → nincs attribútum** (a CSS media-ág dönt, OS-váltásnál JS nélkül is él).
- `index.html` no-flash inline script: render előtt csak explicit light/dark-nál ír attribútumot.
- **Beállítások → Megjelenés** fül (új): ThemeToggle radiogroup.
- **ThemeQuickToggle** (új): gyors kapcsoló a shell headerben (WorldTopBar), a legacy TopBarFlat-ben és a Home headerben — nap/hold/monitor ikon (új Icon-nevek), aria-label a jelenlegi + következő állapottal, ciklus: rendszer→világos→sötét.

### 4. Csere-kör (hardolt osztályok → tokenek)

- **ui primitívek:** Card (`bg-surface-card` + `border-line`, sötétben teljes erejű border — a shadow-t a border váltja), Input (gray/emerald hibrid → token + world-ring fókusz + rose hiba), KpiCard, ProgressBar, SlideOver/drawer overlay (sötétben mélyebb scrim), Wordmark.
- **Shell/layout:** WorldShell (logo-box → `bg-sidebar`, chevron/fókusz-border → token), HomeScreen (teljes tokenizálás + dark-flat háttér, világ-rács kártyák), TopBarFlat, MiniKanbanStrip, SidebarDark (`bg-[#0b1220]` → `bg-sidebar`, sötétben #05070c — a fő-sidebar még mélyebb).
- **ACCENT_MAP** (WorldShell/Home világ-rács, 14 hue): minden tint/iconBg/fg/sideBg/sideAccent/sideHover kapott -950/-300-as dark párt.
- **Világok:** EHS (kockázat-mátrix cellák + cellaszöveg dark tintekkel), Kontrolling + CRM **Recharts**: minden hex → CSS-változó (`var(--acc-mid)`, `var(--border)`, `var(--text-secondary)`, `var(--chart-ref)`, tooltip `var(--surface-card)`); KpiCard sparkline default → `var(--acc-mid)`. HR/Maintenance/QA/DMS már token-tiszta volt (0 hardolt osztály).
- SettingsPage tab-sáv + Company/EndpointPending panelek tokenizálva.

## Minőség

- `tsc -b` ✓, `npm run build` ✓ (936 ms, chunk-szerkezet változatlan), célzott eslint a 21 érintett fájlra: 0 error.
- Teljes `npx vitest run`: **1418 passed / 19 failed (1437)** — a 19 PONTOSAN a dokumentált pre-existing készlet (fájlonként azonos darabszám, F3-riport tábla), új bukás nincs; +4 új teszt.
- Új/átírt tesztek: `useTheme` (data-theme attribútum-szemantika: explicit set, system → attribútum törlés, OS-követés), `ThemeToggle.test.tsx` (radiogroup + perzisztencia + QuickToggle ciklus/aria-label), Card token-smoke.
- Light mód: a megjelenés a korábbi maradt (a spec-tokenek light értékei a mai színek; kivétel-lista: app-háttér #fafaf9→#f7f7f5 spec-érték, Input fókusz emerald→world-ring, néhány stone-400 meta → ink-soft — mind spec-igazítás, vizuálisan minimális).

## Follow-up (nem része ennek a körnek)

- **DS-DARKMODE-LEGACY:** a nem-platform prototípus-képernyők (DesignPage ~60, SupplierPortalPage ~43, SalesPage/MasterdataPage/FinancePage stb. — összesen ~800 hardolt osztály 100+ legacy fájlban) világonkénti csere-köre. A token-réteg és a primitívek készen állnak hozzá.
- **DS-RECONCILE** (designer, pending): a LIGHT akcentusok egységes oklch-receptre állása (most paletta-hű light értékek maradtak, hogy a light megjelenés ne változzon).
- ShopFloor kiosk (szándékosan mindig-sötét felület) érintetlen.
