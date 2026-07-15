# F1-REVIEW — Fázis 1 UI/a11y designer review

> **Kiadta:** designer terminál — 2026-07-14
> **Epic:** `EPIC-UI-PORTAL-2026Q3` / F1-REVIEW
> **Kontraktus:** `docs/knowledge/patterns/DESIGN_SYSTEM_SPEC_V1.md`
> **Vizsgált kód:** `src/joinerytech-portal` — nem committolt working tree (git diff + új fájlok)
> **Módszer:** teljes diff-átolvasás a spec acceptance checklistjei ellen + tesztfuttatás (vitest)

---

## Összesített verdikt: ⚠️ CHANGES REQUESTED (szűk körű)

A Fázis 1 munka **magas minőségű** — a tokenréteg, a téma-infrastruktúra és mind az 5 primitív
lényegében spec-hű, a hozzájuk tartozó tesztek zöldek. **Két érdemi hiba** miatt kérünk
javítást, mindkettő a shell rétegben (`WorldShell.tsx`): a mobil drawer a11y-hibája (S1) és az
`ACCENT_MAP` dark módú kontraszt-bukása (S2). A többi terület APPROVED, részben megjegyzésekkel.

| Terület | Verdikt |
|---|---|
| 1. Tokens (`src/index.css`) | ✅ APPROVED |
| 2. Téma (`src/theme/`, no-flash, ThemeToggle) | ✅ APPROVED (megjegyzésekkel) |
| 3a. Button | ✅ APPROVED |
| 3b. SlideOver | ✅ APPROVED |
| 3c. Tabs | ✅ APPROVED (megjegyzéssel) |
| 3d. DataTable | ✅ APPROVED (megjegyzésekkel) |
| 3e. Toast | ✅ APPROVED (megjegyzésekkel) |
| 4. Shell (WorldShell / MobileBottomNav / RouteFallback) | ⚠️ **CHANGES REQUESTED** (S1, S2, M1) |
| 5. Modul-oldalak StatusPill migráció (CRM, EHS, DMS szúrópróba) | ✅ APPROVED |

---

## 1. Tokens — `src/index.css` ✅ APPROVED

- A `@theme inline` blokk (36–49. sor) a spec 1.1 készletét pontosan hozza (surface-0/1/2,
  ink, ink-muted, line + a 6 world-token).
- `@custom-variant dark (&:where(.dark, .dark *))` a 17. sorban — a korábbi érvénytelen
  `@variant dark { @mixin dark }` blokk eltűnt. ✔
- **Mind a 7 `[data-world]` blokk (light + dark) sorról sorra egyezik a spec 1.3
  copy-paste blokkjával** — CRM=blue-600/400, Kontrolling=slate-700/400 (soft: 200/800 lépcsők
  a spec szerinti eltéréssel), HR=amber-700/400, Maintenance=cyan-700/400, QA=lime-700/400,
  EHS=red-600/400, DMS=violet-600/400. A kontraszt-vezérelt lépcsők (amber/cyan/lime/slate → -700
  light primary) helyesek.
- Deprecated tokenek (`--color-bg-primary`, `--color-accent-*`) **kivezetve** — grep-pel sem
  találhatók a css-ben.
- `color-scheme: light` / `dark` beállítva (54., 72. sor). ✔
- **Spec-en túli, jóváhagyott addíció:** `:root`/`.dark` fallback world-akcent (brand teal,
  64–67. és 80–83. sor), hogy a world-* utility-k a nem-platform világokban is feloldódjanak.
  Dokumentált, a lépcső-logika konzisztens — rendben.

## 2. Téma-réteg ✅ APPROVED (megjegyzésekkel)

- `src/theme/statusTones.ts`: a 7 tónus **pontosan** a spec 1.4 táblázata (sky-100/800,
  rose a danger-re, terminal üreges dot). `resolveLegacyTone`: ismeretlen kulcs → neutral +
  dev-warning ✔. A `LEGACY_STATUS_TONES` kompat-térkép dokumentált átmenet.
- `src/theme/fsmTones.ts`: **mind a 8 FSM-készlet** kulcsra pontosan egyezik a spec 1.5-tel.
  A `FSM_STATUS_ALIASES` (átmeneti angol enum → kanonikus kulcs) és `FSM_EXTRA_TONES`
  (qa `rejected` → terminal) jól dokumentált, feloldási sorrend helyes, ismeretlen → neutral + warn ✔.
- `src/theme/useTheme.ts`: `light|dark|system`, `jt-theme` kulcs, `.dark` a `<html>`-en,
  `system` módban élő `matchMedia('change')` követés module-szinten (akkor is él, ha a Toggle
  nincs mountolva), `useSyncExternalStore` — spec 4.1 szerint ✔.
- `index.html` (10–18. sor): a no-flash script **karakterre** a spec 4.1 scriptje, a bundle előtt ✔.
- `ThemeToggle.tsx`: `role="radiogroup"` + `aria-label`, `role="radio"` + `aria-checked`,
  aktív állapot felirat + súly + shadow (nem csak szín) ✔.

**Megjegyzések (nem blokkoló):**
- **N1** — `ThemeToggle.tsx:35-47`: a WAI-ARIA radio-group mintához roving tabindex +
  nyíl-navigáció tartozik; jelenleg mindhárom radio külön tab stop. Működőképes (Tab + Space),
  de screen reader „radio, 1/3”-ként jelenti be, miközben a billentyűzet-viselkedés checkbox-szerű.
  Javasolt: roving tabindex + ArrowLeft/Right, vagy egyszerűbben `aria-pressed` toggle-csoport.
- **N2** — `index.html:2`: `lang="en"`, miközben a UI magyar. Screen reader kiejtést ront —
  `lang="hu"` javasolt (apró, egysoros fix; a `<title>jt-temp</title>` is frissítendő egyszer).

## 3. Primitívek — `src/components/ui/`

### 3a. Button ✅ APPROVED

`Button.tsx` a 2.1 checklist minden pontját hozza:
- natív `<button>`, `type` default `"button"` (57. sor) ✔
- `FOCUS_RING` (18–19. sor): `focus-visible:ring-2 ring-world-ring ring-offset-2 ring-offset-surface-1`,
  light+dark a token-lépcsőkből ✔
- **FSM-tiltott minta** (`disabledReason`, 62–121. sor): `aria-disabled` (NEM natív `disabled`),
  fókuszálható marad, kattintás-elnyelés, tooltip **állandóan a DOM-ban** + `aria-describedby`,
  hover ÉS `group-focus-within` is megjeleníti — a spec 2.1 mintájának teljes implementációja ✔
- ikon `aria-hidden` (98. sor), icon-only + hiányzó `aria-label` → dev-warning (65–67. sor) ✔
- `touch` méret h-11 (44 px), `active:scale` + `motion-reduce:active:scale-100` (86. sor) ✔
- variánsok szemantikus tokenekből; destructive rose-600 / dark rose-400+rose-950 a spec szerint ✔
- Nit: blokkolt állapotban a hívó saját `aria-describedby`-át felülírja a tooltip-id
  (82. sor) — összefűzés lenne az ideális; gyakorlati hatása minimális.

### 3b. SlideOver ✅ APPROVED

`SlideOver.tsx` + `hooks/useFocusTrap.ts` + `hooks/useInertBackground.ts` — a 2.2 checklist zöld:
- fókusz nyitáskor az első fókuszálható elemre (fallback: panel, `tabIndex={-1}`), a lista
  **minden Tab-leütéskor újrakérdezve** (useFocusTrap.ts:40–64) — dinamikus tartalom a csapdában marad ✔
- fókusz-visszaadás a megnyitó elemre a trap cleanupjában; a hook-deklarációs sorrend
  (inert előbb, trap utána — SlideOver.tsx:34–37) biztosítja, hogy záráskor előbb szűnik meg
  az inert, aztán tér vissza a fókusz — helyes és kommentált ✔
- háttér `inert` + body scroll-lock (useInertBackground) ✔
- zárás: Esc (40–47. sor), overlay-klikk, X (`aria-label="Bezárás"`), mobilon **explicit
  „Vissza" gomb** chevronnal (74–83. sor) ✔
- < md bottom sheet: `max-md:inset-x-0 max-md:bottom-0 max-md:max-h-[85dvh] max-md:rounded-t-2xl`,
  drag-handle `aria-hidden`, safe-area padding a footeren és a tartalmon (105., 110. sor) ✔
- `role="dialog"`, `aria-modal`, `aria-labelledby`, subtitle → `aria-describedby` ✔
- Nit (nem spec-követelmény): záráskor azonnali unmount, nincs kifelé-animáció — kozmetikai.

### 3c. Tabs ✅ APPROVED (megjegyzéssel)

`Tabs.tsx` — 2.3 checklist zöld: roving tabindex (`focusedId`, blur-nél visszaáll az aktívra →
egyetlen tab stop), **manuális aktiválás** (nyíl csak fókuszt mozgat, Enter/Space a natív button
click-en aktivál), ArrowLeft/Right ciklikus + Home/End, `aria-selected`/`aria-controls`/tablist
`aria-label`, aktív fül bg-pill + `font-semibold` (nem csak szín), mobil fade-mask +
`scrollIntoView` aktiváláskor, `TabPanel` `aria-labelledby` + `tabIndex={0}` ✔.

- **N3** — `Tabs.tsx:123`: kattintással egy `disabled` fül is megkaphatja a roving fókuszt
  (`onFocus` → `setFocusedId`), így átmenetileg az lesz a tablist tab stopja. Szélsőséges eset,
  nem blokkoló — de az `onFocus`-ban érdemes a disabled fület kihagyni.

### 3d. DataTable ✅ APPROVED (megjegyzésekkel)

`DataTable.tsx` + `DataTableCards.tsx` + `dataTable.types.ts` — 2.4 checklist zöld:
- `<table>` + `sr-only <caption>`, `th[scope="col"]`, `aria-sort` a rendezhető oszlopokon,
  ciklus none → ascending → descending → none (81–86. sor) ✔
- fejléc-gomb `aria-label="Rendezés: {oszlop}"`, teljes szélességű, nyíl `aria-hidden` ✔
- rendezés-változás **perzisztens polite live regionben** bejelentve („Rendezve: …, növekvő") ✔
- görgethető konténer: `role="region"` + `aria-label` + `tabIndex={0}` + fókusz-ring ✔
- sor nem kattintható `<tr>` — akció a cella renderjében (kommentálva, 152–154. sor) ✔
- < md: `<ul>`/`<li>` kártya-render **ugyanabból az oszlop-definícióból** (`mobile: title/meta/hidden`),
  rendezés címkézett `<select>`-tel a lista felett ✔; üres állapot szöveg + opcionális akció ✔
- **N4** — kártya-nézetben a cím-link/aria-label kialakítása a fogyasztó `render`-jére van bízva
  (a spec példája szerint „WO-2041 munkalap megnyitása" kontextusú label). Az első éles
  felhasználásnál (F2) ellenőrizendő, hogy a title-oszlop renderje valóban linket ad.
- **N5** — `sortable: true` + hiányzó `sortValue` + nincs `onSortChange`: a kattintás bejelenti a
  rendezést, de a sorrend nem változik. Dev-warning javasolt erre a konzisztencia-hibára.

### 3e. Toast ✅ APPROVED (megjegyzésekkel)

`Toast.tsx` + `ToastItem.tsx` + `toastContext.ts` — 2.6 checklist zöld:
- a konténer és **mindkét live region üresen is a DOM-ban van** (ToastContainer soha nem
  `null` — kommentálva, 50–52. sor); polite: `role="status"`, assertive: `role="alert"` ✔
- `error` → assertive régió + `duration: null` = **csak kézi bezárás** (Toast.tsx:31–32) ✔
- auto-dismiss `Math.max(duration, 5000)`; hover ÉS fókusz pauzál, a hátralévő idő
  bankolva folytatódik (`useDismissTimer`, ToastItem.tsx:42–60) — WCAG 2.2.1 ✔
- fókuszt nem rabol; bezárás `aria-label="Értesítés bezárása"`; Esc a fókuszált toastot zárja ✔
- mobil pozíció: `bottom-[calc(58px+env(safe-area-inset-bottom)+8px)] md:bottom-4` — a bottom
  nav fölött ✔; TOAST_STYLES -100/-800 light, -950/-300 dark lépcsőkkel ✔
- **N6** — `Toast.tsx:54,59`: a live regionök `className="contents"` (display: contents).
  Régebbi Safari/Firefox verziókban a display:contents elem kieshetett az accessibility tree-ből.
  A DoD-ben amúgy is előírt NVDA/VoiceOver szúrópróbánál kifejezetten ellenőrizendő, hogy a
  bejelentés megtörténik; ha nem, `contents` helyett normál blokk + `pointer-events-none`.
- **N7** — a mobil offset akkor is 58 px-szel emel, ha az adott képernyőn nincs bottom nav
  (pl. standalone shopfloor) — kozmetikai.

## 4. Shell ⚠️ CHANGES REQUESTED

**Ami jó:**
- `WorldShell.tsx:356`: `data-world={WORLD_DATA_ATTR[worldKey]}` a világ-gyökéren;
  `theme/worldAccents.ts` a 7 platform-modult képezi (quality→qa, docs→dms), a többi világ a
  teal fallbacket örökli ✔. `mocks/worlds.ts` akcent-kulcsai a root-döntésre igazítva
  (crm=blue, maintenance=cyan, quality=lime, ehs=red, docs=violet; hr=amber, kontrolling=slate) ✔
- Nav pill (ScreenNavButton, 61–83. sor): aktív = `bg-world-soft text-world-soft-fg` + súly +
  akcent-csík — token-alapú, nem csak szín ✔
- Tartalom alsó padding `calc(58px+env(safe-area-inset-bottom))` bottom nav esetén (359. sor) ✔
- `MobileBottomNav.tsx`: 58 px + safe-area (82–84. sor), max 5 fül a tesztelhető
  `selectBottomNavItems` logikával (`bottomNav.ts`), „Több" `aria-haspopup="dialog"` +
  `aria-expanded`, aktív fülön `aria-current="page"` + pill + `font-semibold` (nem csak szín),
  felirat mindig látható, `md:hidden`, `bg-surface-1 border-line` ✔
- `RouteFallback.tsx`: `role="status"` + `aria-live="polite"`, token-vezérelt, spinner
  `motion-reduce:animate-none`, fullscreen/inline variáns ✔
- `ChatBubble`: bottom nav fölé emelve + `aria-label`/`aria-expanded` kapott ✔

### S1 (blokkoló) — WorldMobileDrawer: fókuszálható aria-hidden tartalom + hiányzó dialógus-szemantika

`WorldShell.tsx:238-310`

1. A drawer **zárva is mountolva marad** `aria-hidden={!open}` + `pointer-events-none`-nal,
   de a benne lévő gombok (Bezárás, Vissza a Home-ra, képernyő-nav, ThemeToggle) **billentyűzettel
   zárt állapotban is elérhetők**: a Tab egy láthatatlan, AT elől elrejtett gombra lép
   (axe: `aria-hidden-focus`, WCAG 4.1.2 / 2.4.3 bukás **minden világ-oldalon, mobil nézetben**).
   Fix: `inert` attribútum a zárt drawerre (React 19 natívan támogatja) vagy feltételes render.
2. Nyitva: **nincs `role="dialog"`, `aria-modal`, fókusz-csapda, háttér-inert, fókusz-visszaadás** —
   miközben a bottom nav „Több" gombja `aria-haspopup="dialog"`-ot ígér. A spec §3.1 szerint a
   „Több" a SlideOver bottom-sheet variánsát nyitja; a kész `useFocusTrap` + `useInertBackground`
   hookok bekötése a drawerre minimális munka (Esc már kezelt).

### S2 (blokkoló) — ACCENT_MAP: nincs dark variáns → kontraszt-bukás dark módban

`WorldShell.tsx:21-45` (`ACCENT_MAP`), használat: `WorldTopBar` 196. sor (mobil világ-címke) és
202. sor (breadcrumb világ-név) — `accent.fg` (pl. `text-red-700`, `text-blue-700`) **dark módban
a sötét `surface-1` fejlécen 4.5:1 alatti** (pl. red-700 a stone-900-on ≈ 2,5:1). A spec 4.2/2.
szabálya szerint a `dark:` nélküli nyers paletta-osztály a felületszínekre Fázis 1-ben jelölendő
és tokenesítendő. Fix-javaslat: az `accent.fg` felhasználási helyein `text-world-soft-fg`
(a data-world scope-ban pontosan a jó lépcsőt adja), vagy dark párok az ACCENT_MAP-be
(`text-red-700 dark:text-red-300` minta). A `sideBg` `bg-*-50/30` tintjei dark módban szintén
felülvizsgálandók (kozmetikai).

### M1 (kis javítás, a fenti körrel együtt kérjük) — címkézetlen icon-only vezérlők a TopBarban

- `WorldShell.tsx:219-222`: harang-gomb icon-only, **nincs `aria-label`** (spec 2.1 kötelező);
  az értesítés-pötty szín-only jelzés.
- `WorldShell.tsx:213-217`: kereső input címkéje csak placeholder — `aria-label="Keresés"` javasolt.

**Shell-megjegyzések (nem blokkoló):**
- **N8** — a spec §3.1 a bottom nav elemeit router-`<Link>`-ként írja elő; az implementáció
  `<button>` + `onScreen` callback (router-agnosztikus shell). Az `aria-current="page"` így is
  jelen van; elfogadható eltérés, de SR-felhasználónak a link szemantika informatívabb lenne —
  F2-ben megfontolandó.
- **N9** — a sidebar `ScreenNavButton`-jain nincs `aria-current` (a bottom nav-on van) —
  egységesítés javasolt.
- **N10** — `HomeScreen.tsx`: a világkártyák megkapták a `data-world`-öt (169. sor) ✔, de a
  kártya maga `bg-white border-stone-200/80` — dark módban változatlanul világos. A modul-oldalak
  (CRM/EHS/Docs…) törzse is nyers stone-palettán van még. A spec 4.2/2 szerint ezek a
  review-n jelölendő escape-hatch területek → **Fázis 2 token-migrációs backlog**.

## 5. Modul-oldal szúrópróba (CRM, EHS, DMS) ✅ APPROVED

- `CrmPage.tsx`: a duplikált `LeadStatusPill`/`OppStatusPill` **törölve**, minden előfordulás
  (dashboard, lista, tábla, forecast, SlideOver-ek) a közös `StatusPill`-t használja
  `fsm="crmLead"` / `fsm="crmOpportunity"` + lokalizált `label`-lel ✔
- `EhsPage.tsx`: `IncidentStatusPill` kivezetve → `StatusPill fsm="ehsBaleset"`; a mock angol
  státusz-kulcsait (reported/investigating/action/closed) a `FSM_STATUS_ALIASES` fedi ✔
- `DocsPage.tsx`: `DocStatusPill` kivezetve → `StatusPill fsm="dmsDokumentum"` ✔
- `StatusPill.tsx`: label mindig renderelt szöveg, dot `aria-hidden`, terminal üreges dot,
  tónus-feloldási prioritás (tone → fsm+status → legacy) + neutral+warn fallback — 2.5 checklist ✔

## Tesztek

`vitest run`: **1111 passed / 21 failed** — a bukó 21 mind Fázis 1-en kívüli, **előzetesen is
bukó** terület (ProcurementPage: hiányzó `<Router>` a teszt-harnessben; BOMPreviewCard,
catalogFilterPersistence, configurator-integration, ProductionPage). A Fázis 1 fájlok tesztjei
(Button, SlideOver, Tabs, DataTable, Toast, StatusPill, MobileBottomNav, bottomNav, statusTones,
useTheme, App) **mind zöldek**.

## Kért javítások összefoglalva (re-review scope)

| # | Fájl | Mi | Súly |
|---|---|---|---|
| S1 | `src/components/layout/WorldShell.tsx:238-310` | Zárt drawer `inert` (vagy feltételes render); nyitva `role="dialog"` + `aria-modal` + `useFocusTrap` + `useInertBackground` + fókusz-visszaadás | blokkoló |
| S2 | `src/components/layout/WorldShell.tsx:21-45,196,202` | `accent.fg` dark kontraszt: tokenesítés (`text-world-soft-fg`) vagy dark párok az ACCENT_MAP-be | blokkoló |
| M1 | `src/components/layout/WorldShell.tsx:213-222` | Harang-gomb `aria-label`; kereső input `aria-label` | kicsi |

A DoD hátralévő, eszközös ellenőrzései (axe/Lighthouse ≥ 95 szúrópróba, NVDA/VO bejárás,
iOS safe-area valós eszközön) az S1–S2 javítás utáni re-review-n futnak le.

---

_Designer terminál — JoineryTech sziget. Re-review: az S1/S2 fix után jelezz a designer mailboxba._
