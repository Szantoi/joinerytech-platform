# Design-System Spec v1 — JoineryTech Portal

> **Kiadta:** designer terminál — 2026-07-14
> **Epic:** `EPIC-UI-PORTAL-2026Q3` (Fázis 0 kimenet, ld. `docs/knowledge/architecture/UI_IMPLEMENTATION_PLAN_2026-07-14.md`)
> **Bemenetek:** root vezérelvek (világ-akcentek, FSM-szigor, a11y+dark alapból, mobil-első), `docs/joinerytech/DESIGN_FIX_SPEC_2026-07-02.md`, `docs/joinerytech/AUDIT_UI_PERFORMANCE_A11Y_2026-07-02.md`
> **Cél-alkalmazás:** `src/joinerytech-portal/` (React 19 + TS + Vite + **Tailwind 4**)
> **Státusz:** v1 — a frontend Fázis 1 közvetlenül ebből implementál.

---

## 0. Alapelvek és scope

1. **Semleges színcsalád:** a portal meglévő komponensei `stone` szürkéket használnak — ezt megtartjuk (additív munka, nem újraírás). A prototípus-spec `slate` javaslata helyett a `slate` a **Kontrolling világ akcentje** lesz.
2. **Szemantikus tokenek:** a komponensek NEM nyers palettát (`bg-white`, `text-stone-900`) használnak, hanem szemantikus utility-ket (`bg-surface-1`, `text-ink`, `bg-world`). A dark mode így tokenszinten dől el, nem `dark:` duplikációval. A `dark:` variáns csak escape hatch.
3. **Kontraszt-kötelezettség:** minden itt megadott pár WCAG 2.1 AA-t teljesít a saját használati felületén (szöveg ≥ 4.5:1, nagy szöveg / UI-elem ≥ 3:1). A kontraszt-bizonyíték az 1.6 pontban.
4. **Nem csak szín:** státusz/állapot soha nem közvetíthető kizárólag színnel (ld. StatusPill spec, 2.5).
5. **FSM-szigor a UI-ban:** tiltott státusz-átmenet = **látható, de letiltott** akció + tooltip a magyarázattal (root döntés). Implementációs következménye: `aria-disabled`, nem `disabled` (ld. 2.1).

---

## 1. TOKENS (Tailwind 4)

### 1.1 Regisztráció — `@theme inline` + runtime override minta

Tailwind 4-ben a témázható tokeneket **két rétegben** definiáljuk: a nyers CSS-változó `:root`/`.dark`/`[data-world]` alatt vált értéket, a `@theme inline` pedig utility-t generál belőle (`bg-surface-1`, `text-ink`, `bg-world` stb.). Az `inline` kulcsszó garantálja, hogy az utility a `var()`-láncot a **használat helyén** oldja fel, így a scope-alapú felülírás (`.dark`, `[data-world]`) működik.

**FONTOS — javítandó hiba:** a jelenlegi `src/index.css`-ben lévő dark-variáns blokk (`@variant dark { ... @mixin dark ... }`) érvénytelen Tailwind 4 szintaxis. Cserélendő az alábbi egyetlen sorra (`@custom-variant`).

Az alábbi blokk teljes egészében bemásolható a `src/index.css`-be (a meglévő `@theme` színek — `--color-bg-primary` stb. — kivezetendők, helyettük ez a készlet):

```css
@import "tailwindcss";

/* Dark mode: class-alapú, .dark a <html> elemen (ld. 4. fejezet) */
@custom-variant dark (&:where(.dark, .dark *));

/* ── Szemantikus tokenek → utility-k ─────────────────────────────── */
@theme inline {
  /* Felületek és tinta */
  --color-surface-0: var(--surface-0);   /* app háttér */
  --color-surface-1: var(--surface-1);   /* kártya, panel, SlideOver */
  --color-surface-2: var(--surface-2);   /* hover, táblafejléc, inset */
  --color-ink:        var(--ink);        /* elsődleges szöveg */
  --color-ink-muted:  var(--ink-muted);  /* másodlagos szöveg */
  --color-line:       var(--line);       /* border, elválasztó */

  /* Aktív világ akcent (data-world indirekció, ld. 1.3) */
  --color-world:         var(--world);          /* primary button bg, aktív elem */
  --color-world-fg:      var(--world-fg);       /* szöveg a --world felületen */
  --color-world-hover:   var(--world-hover);    /* primary button hover bg */
  --color-world-soft:    var(--world-soft);     /* nav pill / kijelölt fül bg */
  --color-world-soft-fg: var(--world-soft-fg);  /* nav pill szöveg */
  --color-world-ring:    var(--world-ring);     /* focus ring */
}

/* ── Alap (light) ────────────────────────────────────────────────── */
:root {
  color-scheme: light;
  --surface-0:  var(--color-stone-50);
  --surface-1:  #ffffff;
  --surface-2:  var(--color-stone-100);
  --ink:        var(--color-stone-900);
  --ink-muted:  var(--color-stone-600);   /* NEM stone-500/400 — audit: 4.5:1 alatt */
  --line:       var(--color-stone-200);
}

/* ── Dark ────────────────────────────────────────────────────────── */
.dark {
  color-scheme: dark;
  --surface-0:  var(--color-stone-950);
  --surface-1:  var(--color-stone-900);
  --surface-2:  var(--color-stone-800);
  --ink:        var(--color-stone-100);
  --ink-muted:  var(--color-stone-400);
  --line:       var(--color-stone-700);
}
```

### 1.2 A 7 világ-akcent — szerep szerinti lépcsők

Root döntés: CRM=blue, Kontrolling=slate, HR=amber, Maintenance=cyan, QA=lime, EHS=red, DMS=violet.

A lépcsőválasztás szabálya (a kontraszt-bizonyíték az 1.6-ban):

| Szerep | Light | Dark |
|---|---|---|
| **Primary button bg / fg** | `-600` + fehér (blue, red, violet); `-700` + fehér (slate, amber, cyan, lime — a 600 fehérrel AA-t bukik) | `-400` bg + `-950` fg (minden hue; élénk, ≥ 5.7:1) |
| **Primary button hover** | egy lépcsővel sötétebb (`-700` / `-800`) | egy lépcsővel világosabb (`-300`) |
| **Nav pill / aktív fül bg / fg** | `-100` bg + `-800` fg (slate: `-200` + `-800`, hogy elváljon a stone felületektől) | `-950` bg + `-300` fg (slate: `-800` + `-200`) |
| **Focus ring** | `-600` (≥ 3:1 fehéren mind a 7 hue-nál) | `-400` (≥ 3:1 stone-900-on) |

### 1.3 Világ-akcent tokenek — copy-paste blokk

A világ gyökér-elemére (world layout wrapper, Home-rácson az egyes világkártyákra) `data-world="…"` attribútum kerül. A komponensek csak a `world-*` utility-ket használják — világfüggetlenek maradnak.

```css
/* ── Világ-akcentek ──────────────────────────────────────────────── */
/* CRM = blue */
[data-world="crm"] {
  --world: var(--color-blue-600);      --world-fg: #ffffff;
  --world-hover: var(--color-blue-700);
  --world-soft: var(--color-blue-100); --world-soft-fg: var(--color-blue-800);
  --world-ring: var(--color-blue-600);
}
.dark [data-world="crm"] {
  --world: var(--color-blue-400);      --world-fg: var(--color-blue-950);
  --world-hover: var(--color-blue-300);
  --world-soft: var(--color-blue-950); --world-soft-fg: var(--color-blue-300);
  --world-ring: var(--color-blue-400);
}

/* Kontrolling = slate */
[data-world="kontrolling"] {
  --world: var(--color-slate-700);      --world-fg: #ffffff;
  --world-hover: var(--color-slate-800);
  --world-soft: var(--color-slate-200); --world-soft-fg: var(--color-slate-800);
  --world-ring: var(--color-slate-600);
}
.dark [data-world="kontrolling"] {
  --world: var(--color-slate-400);      --world-fg: var(--color-slate-950);
  --world-hover: var(--color-slate-300);
  --world-soft: var(--color-slate-800); --world-soft-fg: var(--color-slate-200);
  --world-ring: var(--color-slate-400);
}

/* HR = amber */
[data-world="hr"] {
  --world: var(--color-amber-700);      --world-fg: #ffffff;
  --world-hover: var(--color-amber-800);
  --world-soft: var(--color-amber-100); --world-soft-fg: var(--color-amber-800);
  --world-ring: var(--color-amber-600);
}
.dark [data-world="hr"] {
  --world: var(--color-amber-400);      --world-fg: var(--color-amber-950);
  --world-hover: var(--color-amber-300);
  --world-soft: var(--color-amber-950); --world-soft-fg: var(--color-amber-300);
  --world-ring: var(--color-amber-400);
}

/* Maintenance = cyan */
[data-world="maintenance"] {
  --world: var(--color-cyan-700);      --world-fg: #ffffff;
  --world-hover: var(--color-cyan-800);
  --world-soft: var(--color-cyan-100); --world-soft-fg: var(--color-cyan-800);
  --world-ring: var(--color-cyan-600);
}
.dark [data-world="maintenance"] {
  --world: var(--color-cyan-400);      --world-fg: var(--color-cyan-950);
  --world-hover: var(--color-cyan-300);
  --world-soft: var(--color-cyan-950); --world-soft-fg: var(--color-cyan-300);
  --world-ring: var(--color-cyan-400);
}

/* QA = lime */
[data-world="qa"] {
  --world: var(--color-lime-700);      --world-fg: #ffffff;
  --world-hover: var(--color-lime-800);
  --world-soft: var(--color-lime-100); --world-soft-fg: var(--color-lime-800);
  --world-ring: var(--color-lime-600);
}
.dark [data-world="qa"] {
  --world: var(--color-lime-400);      --world-fg: var(--color-lime-950);
  --world-hover: var(--color-lime-300);
  --world-soft: var(--color-lime-950); --world-soft-fg: var(--color-lime-300);
  --world-ring: var(--color-lime-400);
}

/* EHS = red */
[data-world="ehs"] {
  --world: var(--color-red-600);      --world-fg: #ffffff;
  --world-hover: var(--color-red-700);
  --world-soft: var(--color-red-100); --world-soft-fg: var(--color-red-800);
  --world-ring: var(--color-red-600);
}
.dark [data-world="ehs"] {
  --world: var(--color-red-400);      --world-fg: var(--color-red-950);
  --world-hover: var(--color-red-300);
  --world-soft: var(--color-red-950); --world-soft-fg: var(--color-red-300);
  --world-ring: var(--color-red-400);
}

/* DMS = violet */
[data-world="dms"] {
  --world: var(--color-violet-600);      --world-fg: #ffffff;
  --world-hover: var(--color-violet-700);
  --world-soft: var(--color-violet-100); --world-soft-fg: var(--color-violet-800);
  --world-ring: var(--color-violet-600);
}
.dark [data-world="dms"] {
  --world: var(--color-violet-400);      --world-fg: var(--color-violet-950);
  --world-hover: var(--color-violet-300);
  --world-soft: var(--color-violet-950); --world-soft-fg: var(--color-violet-300);
  --world-ring: var(--color-violet-400);
}
```

**Használat (kanonikus receptek):**

```tsx
// Primary button (világ-akcentes)
className="bg-world text-world-fg hover:bg-world-hover
           focus-visible:ring-2 focus-visible:ring-world-ring
           focus-visible:ring-offset-2 focus-visible:ring-offset-surface-1"

// Nav pill / aktív képernyő-fül
className="bg-world-soft text-world-soft-fg"

// Home világ-rács kártya akcent-csík (kártyánként saját data-world)
<div data-world="ehs" className="border-l-4 border-world ...">
```

### 1.4 STATUS_TONES — generikus tónus-skála

A pill-ek NEM modulonként kapnak színt, hanem egy 7 elemű, szemantikus tónus-skálából. A tónus-kulcs a rendering, a modul-FSM → tónus térkép (1.5) a jelentés.

| Tone | Jelentés | Light: bg / fg / dot | Dark: bg / fg / dot |
|---|---|---|---|
| `neutral` | kiinduló / inaktív | `stone-100` / `stone-700` / `stone-400` | `stone-800` / `stone-300` / `stone-500` |
| `info` | várakozó, informatív | `sky-100` / `sky-800` / `sky-500` | `sky-950` / `sky-300` / `sky-400` |
| `progress` | aktívan folyamatban | `teal-100` / `teal-800` / `teal-500` | `teal-950` / `teal-300` / `teal-400` |
| `success` | pozitív kimenet | `emerald-100` / `emerald-800` / `emerald-500` | `emerald-950` / `emerald-300` / `emerald-400` |
| `warn` | figyelmet igényel / parkolt | `amber-100` / `amber-800` / `amber-500` | `amber-950` / `amber-300` / `amber-400` |
| `danger` | negatív / kritikus | `rose-100` / `rose-800` / `rose-500` | `rose-950` / `rose-300` / `rose-400` |
| `terminal` | lezárt végállapot | `stone-200` / `stone-600` / üreges dot | `stone-800` / `stone-400` / üreges dot |

Megjegyzések:
- Az audit által bukónak mért `sky-50 + sky-700` (3.1:1) pár **tilos** — helyette `sky-100 + sky-800` (≈ 6.7:1).
- `danger` tónus **rose**, hogy vizuálisan elváljon az EHS világ-akcent **red**-jétől.
- `terminal` dot-ja **üreges** (border, nincs kitöltés) — forma-alapú extra jelzés, nem csak szín.

**Copy-paste TS (a `StatusPill.tsx` meglévő `STATUS_TONES`-át váltja):**

```ts
export type Tone =
  | 'neutral' | 'info' | 'progress' | 'success' | 'warn' | 'danger' | 'terminal'

export interface ToneStyle { bg: string; fg: string; dot: string }

export const STATUS_TONES: Record<Tone, ToneStyle> = {
  neutral: {
    bg: 'bg-stone-100 dark:bg-stone-800',
    fg: 'text-stone-700 dark:text-stone-300',
    dot: 'bg-stone-400 dark:bg-stone-500',
  },
  info: {
    bg: 'bg-sky-100 dark:bg-sky-950',
    fg: 'text-sky-800 dark:text-sky-300',
    dot: 'bg-sky-500 dark:bg-sky-400',
  },
  progress: {
    bg: 'bg-teal-100 dark:bg-teal-950',
    fg: 'text-teal-800 dark:text-teal-300',
    dot: 'bg-teal-500 dark:bg-teal-400',
  },
  success: {
    bg: 'bg-emerald-100 dark:bg-emerald-950',
    fg: 'text-emerald-800 dark:text-emerald-300',
    dot: 'bg-emerald-500 dark:bg-emerald-400',
  },
  warn: {
    bg: 'bg-amber-100 dark:bg-amber-950',
    fg: 'text-amber-800 dark:text-amber-300',
    dot: 'bg-amber-500 dark:bg-amber-400',
  },
  danger: {
    bg: 'bg-rose-100 dark:bg-rose-950',
    fg: 'text-rose-800 dark:text-rose-300',
    dot: 'bg-rose-500 dark:bg-rose-400',
  },
  terminal: {
    bg: 'bg-stone-200 dark:bg-stone-800',
    fg: 'text-stone-600 dark:text-stone-400',
    // üreges dot: border-alapú, forma-jelzés
    dot: 'bg-transparent border-2 border-stone-500 dark:border-stone-400',
  },
}
```

### 1.5 Modul-FSM státusz → tónus térkép

A státusz-készletek a master plan 5. pontjából (kötelező készlet). A frontend ezt a térképet importálja; ismeretlen státusz → `neutral` + dev-warning.

```ts
export const FSM_TONES: Record<string, Record<string, Tone>> = {
  crmLead: {
    uj: 'neutral', kapcsolat: 'info', minosites: 'progress',
    nurturing: 'warn', konvertalva: 'success', elvetve: 'terminal',
  },
  crmOpportunity: {
    nyitott: 'neutral', igenyfelmeres: 'info', osszeallitas: 'progress',
    ajanlat: 'progress', targyalas: 'warn',
    megnyert: 'success', elveszett: 'terminal',
  },
  hrTavollet: {
    kert: 'warn',            // döntésre vár
    jovahagyva: 'info', folyamatban: 'progress',
    lezarva: 'terminal', elutasitva: 'danger',
  },
  maintenanceMunkalap: {
    bejelentve: 'neutral', utemezve: 'info', folyamatban: 'progress',
    kesz: 'success', halasztva: 'warn', elutasitva: 'terminal',
    // eszköz-státusz SZÁMÍTOTT — a munkalapokból derivált, külön pill nem kap FSM-akciót
  },
  qaEllenorzes: {
    nyitott: 'neutral', folyamatban: 'progress', megfelelt: 'success',
    javitasra: 'warn',       // rework-hurok
    selejt: 'danger',        // terminális, de danger tónus — kiemelt negatív
  },
  ehsBaleset: {
    bejelentve: 'danger',    // friss incidens = azonnali figyelem
    kivizsgalas: 'warn', intezkedes: 'progress',
    lezarva: 'success', elutasitva: 'terminal',
  },
  dmsDokumentum: {
    piszkozat: 'neutral', ellenorzes: 'warn',
    kiadott: 'success', archivalt: 'terminal',
  },
  kontrollingProjekt: {    // címkék, nem szigorú FSM
    draft: 'neutral', active: 'progress', install: 'info',
    done: 'success', on_hold: 'warn',
  },
}
```

### 1.6 Kontraszt-bizonyíték (WCAG 2.1, kerekített értékek)

| Pár | Felület | Arány | AA |
|---|---|---|---|
| fehér szöveg `blue-600`-on | CRM primary btn (light) | 5.2:1 | ✅ |
| fehér szöveg `slate-700`-on | Kontrolling primary btn (light) | 10.4:1 | ✅ |
| fehér szöveg `amber-700`-on | HR primary btn (light) | 5.0:1 | ✅ (`amber-600` 2.9:1 ❌ — ezért -700) |
| fehér szöveg `cyan-700`-on | Maintenance primary btn (light) | 5.3:1 | ✅ |
| fehér szöveg `lime-700`-on | QA primary btn (light) | 5.0:1 | ✅ |
| fehér szöveg `red-600`-on | EHS primary btn (light) | 4.8:1 | ✅ |
| fehér szöveg `violet-600`-on | DMS primary btn (light) | 5.7:1 | ✅ |
| `-950` szöveg `-400`-on | primary btn (dark), mind a 7 hue | ≥ 5.7:1 | ✅ |
| `-800` szöveg `-100`-on | nav pill (light), mind a 7 | ≥ 6.4:1 | ✅ |
| `-300` szöveg `-950`-en | nav pill (dark), mind a 7 | ≥ 7:1 | ✅ |
| `-600` ring fehér felületen | focus ring (light), mind a 7 | ≥ 3.1:1 | ✅ (UI-elem, 3:1 küszöb) |
| `-400` ring `stone-900`-on | focus ring (dark), mind a 7 | ≥ 5:1 | ✅ |
| `sky-800` szöveg `sky-100`-on | info pill (light) | 6.7:1 | ✅ (a régi `sky-700/sky-50` 3.1:1 ❌) |
| `stone-600` szöveg fehéren | `ink-muted` (light) | 7.3:1 | ✅ (`stone-500` határeset, `stone-400` ❌ — tilos folyószövegre) |

---

## 2. A11Y KOMPONENS-SPECEK

Közös szabályok mind a 6 primitívre:
- **Fókusz-stílus:** `focus-visible:ring-2 ring-world-ring ring-offset-2 ring-offset-surface-1` (soha `outline-none` csere nélkül).
- **Hit target:** touch-elérésű interaktív elem min. 44×44 px (mobil gomb: `h-11`; desktop `h-9` megengedett pointer: fine mellett).
- **Ikonok:** dekoratív `Icon` mindig `aria-hidden="true"`; ikon-only gombon kötelező `aria-label`.
- **Animáció:** minden tranzíció tisztelje a `prefers-reduced-motion: reduce`-t (`motion-reduce:transition-none`).

### 2.1 Button

Jelenlegi gap (`components/ui/Button.tsx`): nincs `type`, `disabled`, `aria-*`, fókusz-ring, variánsok hardcode `teal`.

**Variánsok:** `primary` (bg-world), `secondary/ghost` (surface-1 + line border), `destructive` (rose-600 / dark rose-400+rose-950), `quiet` (csak hover-bg). Méretek: `sm` h-8, `md` h-9, touch h-11.

**FSM-tiltott akció (root döntés — látható + letiltott + tooltip):**
`disabled` HTML-attribútum helyett `aria-disabled="true"` + kattintás-elnyelés, mert a natív `disabled` kivesz a tab-sorrendből és nem jelenik meg rajta tooltip:

```tsx
<button
  type="button"
  aria-disabled={!canTransition}
  aria-describedby={!canTransition ? reasonTooltipId : undefined}
  onClick={(e) => { if (!canTransition) { e.preventDefault(); return } doTransition() }}
  className={!canTransition ? 'opacity-50 cursor-not-allowed' : ''}
>
```

**Billentyűzet:** `Tab` fókusz, `Enter`/`Space` aktivál (natív `<button>` adja — SOHA nem `<div onClick>`).

**Kötelező ARIA:** `type="button"` (form-on belüli véletlen submit ellen); ikon-only: `aria-label`; toggle jellegű: `aria-pressed`; menüt/panelt nyitó: `aria-haspopup` + `aria-expanded`.

**Acceptance checklist:**
- [ ] Natív `<button>` elem, `type` explicit
- [ ] `focus-visible` ring látható light+dark módban (≥ 3:1 a háttérrel)
- [ ] FSM-tiltott átmenet: `aria-disabled` + tooltip (`aria-describedby`), fókuszálható marad
- [ ] Ikon-only gombon `aria-label`, ikon `aria-hidden`
- [ ] Touch méret ≥ 44 px mobilon; `active:scale` tranzíció `motion-reduce` alatt kikapcsol

### 2.2 SlideOver (+ mobil bottom sheet)

Jelenlegi állapot (`components/ui/SlideOver.tsx`): van Esc, alap fókusz-csapda, `role="dialog"`. **Hiányzik:** fókusz-visszaadás, háttér inertté tétele, scroll-lock, dinamikus fókusz-lista, mobil bottom-sheet variáns, vissza-gomb mobilon (audit-találat).

**Viselkedés-spec:**
1. **Nyitás:** a megnyitó elem (`document.activeElement`) referenciáját elmentjük. Fókusz az első fókuszálható elemre, ha nincs: a panel gyökerére (`tabIndex={-1}`).
2. **Fókusz-csapda:** a fókuszálható elemek listáját **minden `Tab` leütéskor** újra kell kérdezni (a panel tartalma dinamikus) — nem elég mountkor egyszer.
3. **Háttér:** a fő app-konténer `inert` attribútumot kap (React 19 támogatja natívan), a `<body>` `overflow: hidden` (scroll-lock).
4. **Zárás:** `Esc`, overlay-klikk, X gomb, mobilon vissza-gomb → fókusz **visszaadása** az elmentett megnyitó elemre.
5. **Mobil (< `md`) bottom-sheet variáns:** a panel nem jobbról, hanem alulról nyílik:
   - `inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl`
   - drag-handle sáv felül (dekoratív, `aria-hidden`)
   - `padding-bottom: env(safe-area-inset-bottom)` a footer/action soron
   - fejlécben explicit **„Vissza"** gomb (chevron-left + felirat), nem csak X
6. **Animáció:** slide-in 200ms; `motion-reduce:` azonnali megjelenés.

**Billentyűzet-térkép:**

| Billentyű | Akció |
|---|---|
| `Esc` | bezárás + fókusz-visszaadás |
| `Tab` / `Shift+Tab` | ciklikus fókusz a panelen belül (csapda) |
| `Enter` | fókuszált akció aktiválása |

**Kötelező ARIA:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby={titleId}`, `aria-describedby` (ha van subtitle); X gomb `aria-label="Bezárás"`; háttér-overlay `aria-hidden="true"`.

**Acceptance checklist:**
- [ ] Fókusz nyitáskor belép, `Tab` nem szökik ki, záráskor visszatér a megnyitó elemre
- [ ] Háttér `inert` + scroll-lock aktív, amíg nyitva van
- [ ] `Esc` és overlay-klikk zár; mobilon vissza-gomb is
- [ ] < `md`: bottom sheet, `max-h-[85dvh]`, safe-area padding, lekerekített felső él
- [ ] VoiceOver/NVDA: dialógusként jelenti be, címmel
- [ ] Dinamikusan hozzáadott gombok is a csapdában maradnak

### 2.3 Tabs (új primitív — jelenleg nem létezik `components/ui/`-ban)

A világon belüli képernyő-fülek és minden lapon belüli szub-tab EZT a komponenst használja (audit: a prototípusban 3 különböző, inkonzisztens tab-minta volt).

**Szerkezet:** WAI-ARIA Tabs minta, **roving tabindex**, **manuális aktiválás** (nyíl = fókusz mozog, `Enter`/`Space` = aktivál) — mert a füleink route-váltást / lazy-load panelt triggerelnek, az automatikus aktiválás felesleges betöltéseket indítana.

```tsx
<div role="tablist" aria-label="EHS képernyők" className="overflow-x-auto">
  <button role="tab" id="tab-incidents" aria-selected={active === 'incidents'}
          aria-controls="panel-incidents" tabIndex={active === 'incidents' ? 0 : -1}>
    Balesetek
  </button>
  ...
</div>
<div role="tabpanel" id="panel-incidents" aria-labelledby="tab-incidents" tabIndex={0}>
```

**Billentyűzet-térkép:**

| Billentyű | Akció |
|---|---|
| `Tab` | a tablist-be egy tab stop (az aktív fülre), tovább a panelbe |
| `ArrowRight` / `ArrowLeft` | fókusz a köv./előző fülre (ciklikus, két végén átfordul) |
| `Home` / `End` | első / utolsó fül |
| `Enter` / `Space` | fókuszált fül aktiválása |

**Kötelező ARIA:** `role="tablist"` + `aria-label`; fülenként `role="tab"`, `aria-selected`, `aria-controls`, roving `tabIndex`; panel: `role="tabpanel"`, `aria-labelledby`, `tabIndex={0}` (ha nincs benne fókuszálható elem).

**Vizuál:** aktív fül `bg-world-soft text-world-soft-fg`; inaktív `text-ink-muted`; mobilon horizontális scroll (3.3) fade-maszkkal.

**Acceptance checklist:**
- [ ] Egyetlen tab stop a tablist-en (roving tabindex)
- [ ] Nyilak + Home/End működnek, aktiválás Enter/Space
- [ ] `aria-selected` szinkronban a vizuális állapottal
- [ ] Aktív fül jelzése nem csak szín: bg-pill + font-weight
- [ ] Mobilon túlcsorduló fülek görgethetők, az aktív fül aktiváláskor `scrollIntoView`

### 2.4 DataTable (új primitív — tábla→kártya kettős render)

Egyetlen oszlop-definícióból két render (root döntés, mobil-első):
- **≥ `md`:** valódi `<table>` szemantika
- **< `md`:** kártya-lista (a sor címe + kulcs-mezők + StatusPill + akciók)

```tsx
interface Column<T> {
  key: string
  header: string
  sortable?: boolean
  render: (row: T) => ReactNode
  mobile?: 'title' | 'meta' | 'hidden'   // kártya-renderben betöltött szerep
}
```

**Tábla-render szemantika:**
- `<table>` + `<caption class="sr-only">` (vagy `aria-label`): mit listáz a tábla
- Rendezhető fejléc: `<th scope="col" aria-sort="ascending|descending|none">`, benne **teljes szélességű `<button>`** („Rendezés: {oszlop}" accessible name-mel), nyíl-ikon `aria-hidden`
- Rendezés-ciklus kattintásra/Enterre: none → ascending → descending → none
- Rendezés-változás bejelentése aria-live régióban: „Rendezve: Határidő, növekvő"
- Sor-akció: a sor **nem** kattintható `<tr>` — a címcella tartalmaz `<a>`/`<button>`-t (a teljes-soros klikk pointer-felhasználóknak CSS-sel kiterjeszthető, de a fókuszálható elem a link marad)

**Kártya-render szemantika:**
- `<ul>` + `<li>`; kártyánként a cím a link (`aria-label` a teljes kontextussal, pl. „WO-2041 munkalap megnyitása")
- `mobile: 'title'` oszlop = kártya címsora; `'meta'` = label–érték párok; `'hidden'` kimarad
- Rendezés mobilon: külön „Rendezés" select/chip-sor a lista felett (a `<th>` gombok nem léteznek kártya-nézetben)

**Billentyűzet-térkép:**

| Billentyű | Akció |
|---|---|
| `Tab` | fejléc-rendező gombok → sor-linkek/akciók sorban |
| `Enter` / `Space` | rendezés váltása (fejléc-gombon) / sor megnyitása (linken) |

**Acceptance checklist:**
- [ ] `<table>` + `caption`, `th[scope="col"]`, `aria-sort` a rendezett oszlopon
- [ ] Rendezés billentyűzettel elérhető és aria-live bejelentett
- [ ] < `md`: kártya-lista, azonos adat-forrás, azonos akciók elérhetők
- [ ] Üres állapot: értelmes szöveg + (ha releváns) elsődleges akció
- [ ] Vízszintesen túlcsorduló tábla saját `overflow-x-auto` konténerben görög, `tabIndex={0}` + `role="region"` + `aria-label` a konténeren

### 2.5 StatusPill

Jelenlegi gap (`components/ui/StatusPill.tsx`): nincs dark variáns, ad-hoc státusz-kulcsok, szín-only jelzés.

**Render-szabályok:**
- Bemenet: `tone` (a `FSM_TONES`-ból feloldva) + `label` (lokalizált státusznév). **A label mindig látható** — ikon/dot-only pill tilos.
- Dot: `aria-hidden="true"` (dekoratív); `terminal` tónusnál üreges (forma-jelzés), `danger` tónusnál opcionális `alert` ikon a dot helyett.
- A pill nem interaktív elem — ha kattintható (szűrő-chip), akkor `<button>`-ba csomagolva, saját fókusz-ringgel.
- Szemantika: sima `<span>`; táblázat-cellában a cella accessible name-je maga a label szöveg — külön ARIA nem kell.

```tsx
export function StatusPill({ tone, label }: { tone: Tone; label: string }) {
  const t = STATUS_TONES[tone]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full
                      text-[11px] font-medium ${t.bg} ${t.fg}`}>
      <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
      {label}
    </span>
  )
}
```

**Acceptance checklist:**
- [ ] Minden tónus AA-kontrasztos light+dark módban (1.4 táblázat szerinti lépcsők)
- [ ] Label mindig renderelt szövegként jelen van (nem title/tooltip-only)
- [ ] `terminal` üreges dot, `danger` opcionális ikon — színen túli jelzés
- [ ] Ismeretlen státusz → `neutral` tónus + console.warn (dev)
- [ ] Windows High Contrast / forced-colors módban a szöveg olvasható marad (nem háttérkép hordozza az információt)

### 2.6 Toast

Jelenlegi gap (`components/ui/Toast.tsx`): **nincs aria-live régió**, a konténer üresen `null`-t renderel (így a live region sosem tud bejelenteni), nincs dark variáns, timer nem pausol.

**Viselkedés-spec:**
1. **A live-region konténer MINDIG a DOM-ban van** (üresen is) — a screen reader csak a már létező live regionbe érkező változást jelenti be:

```tsx
<div aria-live="polite" role="status" className="fixed ... pointer-events-none">
  {/* toastok ide */}
</div>
{/* külön assertive régió a hibáknak */}
<div aria-live="assertive" role="alert" className="sr-only" />
```

2. `success` / `info` / `warning` → polite régió; `error` → alert régió, és **nem tűnik el automatikusan** (csak kézi bezárás).
3. Auto-dismiss min. 5000 ms; hover és fókusz **pauzálja** a timert (WCAG 2.2.1).
4. A toast **soha nem kap automatikus fókuszt** (nem szakítja meg a munkát); a bezárás gomb `aria-label="Értesítés bezárása"`.
5. Pozíció: desktop jobb-alul; mobilon a bottom nav FÖLÖTT: `bottom: calc(58px + env(safe-area-inset-bottom) + 8px)`.
6. Dark variánsok a `TOAST_STYLES`-ba (a STATUS_TONES lépcső-logikájával: `-100`/`-800` light, `-950`/`-300` dark).

**Billentyűzet-térkép:**

| Billentyű | Akció |
|---|---|
| `Tab` | bezárás gomb elérhető a normál sorrendben |
| `Enter` / `Space` | fókuszált bezárás gomb aktiválása |
| `Esc` | fókuszban lévő toast bezárása |

**Acceptance checklist:**
- [ ] Live region üresen is a DOM-ban van; új toast szövegét NVDA/VO bejelenti
- [ ] `error` típus `role="alert"` + csak kézi bezárás
- [ ] Hover/fókusz pauzálja az auto-dismiss-t; minimum 5 s
- [ ] Mobilon nem takarja a bottom nav-ot és a safe-area-t
- [ ] Fókuszt nem rabol; bezárás gomb címkézett

---

## 3. MOBIL MINTÁK

### 3.1 Bottom nav

A meglévő `components/layout/MobileBottomNav.tsx`-ből fejlesztendő tovább:

- **Magasság: 58 px** + `padding-bottom: env(safe-area-inset-bottom)`; a tartalom-konténer alsó paddingje: `calc(58px + env(safe-area-inset-bottom))`, hogy semmi ne csússzon a nav alá.
- **Max 5 fül:** 4 leggyakoribb világ/cél + 5. **„Több"** — a „Több" bottom-sheet-et nyit (SlideOver bottom-sheet variáns) a maradék világokkal. „Több" gomb: `aria-haspopup="dialog"` + `aria-expanded`.
- Csak `< md` látszik (`md:hidden`), desktopon a világ-navigáció veszi át.
- **Szemantika:** `<nav aria-label="Fő navigáció">`, elemek linkek (router `<Link>`), aktív elemen `aria-current="page"`.
- **Aktív állapot:** világ-akcent `text-world-soft-fg` + pill-háttér az ikon mögött (`bg-world-soft`) — nem csak színváltás (inaktív: `text-ink-muted`; az auditban kifogásolt `text-stone-400` tilos, min. `stone-600`/dark `stone-400`).
- Hit target: a teljes fül-cella tappolható (58 px magas > 44 px küszöb), ikon 20–22 px, felirat 10–11 px, mindig látható (nem icon-only).
- Háttér: `bg-surface-1` + `border-t border-line` (dark-ban is tokenből).

### 3.2 FAB (Floating Action Button)

- Világonként **egy** elsődleges létrehozó akció (pl. CRM: „+ Lead", EHS: „+ Bejelentés"). Ha nincs egyértelmű elsődleges akció, NINCS FAB.
- Méret: **56 px** kör, ikon 24 px; `bg-world text-world-fg shadow-lg`.
- Pozíció: jobb-alul, a bottom nav fölött: `right: 16px; bottom: calc(58px + env(safe-area-inset-bottom) + 16px)`; desktopon nem jelenik meg (ott a lista-fejléc primary buttonja a helye).
- **Accessible name kötelező:** `aria-label="Új lead"` (icon-only), vagy extended FAB felirattal.
- Görgetésre elrejtés opcionális (scroll-down hide, scroll-up show), de fókusz-navigációnál mindig elérhető marad.
- Nem takarhat tartalmat véglegesen: a lista aljára extra `padding-bottom` (FAB-magasság + 16 px).

### 3.3 Horizontális görgetés — stepper / kanban / chip-sor

Közös szabályok minden vízszintesen görgő sávra (FSM-stepper, CRM-kanban, szűrő-chipek):

```tsx
<div role="region" aria-label="Pipeline szakaszok" tabIndex={0}
     className="overflow-x-auto snap-x snap-mandatory scroll-px-4
                flex gap-3 px-4 [scrollbar-width:none]">
  <section className="snap-start shrink-0 w-[280px] ...">...</section>
</div>
```

- **Konténer:** `overflow-x-auto`, `tabIndex={0}` + `role="region"` + `aria-label` — így billentyűzettel (nyilakkal) is görgethető, ha a belső elemek nem fókuszálhatók.
- **Snap:** `snap-x snap-mandatory`, elemeken `snap-start`; `scroll-px-4` a szélső paddinghez.
- **Affordancia:** a levágott tartalom jelzése edge-fade maszkkal (CSS `mask-image: linear-gradient(...)`) — a felhasználó lássa, hogy van még tartalom; scrollbar mobilon rejthető.
- **Kanban:** oszlop min-szélesség 280 px, oszlop-fejlécben darabszám (`aria-label="Ajánlat, 4 elem"`); kártya-mozgatás mobilon NEM drag-and-drop, hanem kártya-akció („Áthelyezés…" → FSM-validált célok listája) — ez az FSM-szigorral is konzisztens.
- **FSM-stepper:** a szakaszok sorrendje vizuális; az aktuális szakasz `aria-current="step"`; jövőbeli/tiltott szakasz nem kattintható (2.1 aria-disabled minta).
- **Chip-sor:** chipek `<button aria-pressed>` (szűrő-toggle); az aktív chip nem csak színnel jelöl (pl. pipa-ikon).
- A sáv **nem lophatja el a függőleges görgetést**: csak `touch-pan-x` a sávon, az oldal görgetése működjön a sáv fölött indított függőleges swipe-nál.

---

## 4. DARK MODE STRATÉGIA

### 4.1 Döntés: class-alapú (`.dark`), három-állapotú preferenciával

- **Mechanizmus:** `.dark` class a `<html>` elemen. NEM tiszta `prefers-color-scheme` — kell a kézi kapcsoló (audit-igény: esti műszak, gyártócsarnok).
- **Preferencia:** `light | dark | system`, `localStorage` kulcs: `jt-theme`. `system` esetén a `prefers-color-scheme` media query dönt, és `change` eseményre élőben követi az OS-t.
- **Tailwind 4 regisztráció** (a jelenlegi érvénytelen `@variant dark { @mixin dark }` blokk CSERÉJE):

```css
@custom-variant dark (&:where(.dark, .dark *));
```

- **No-flash script** az `index.html` `<head>`-jébe, a bundle előtt (FOUC/villanás ellen):

```html
<script>
  (function () {
    var t = localStorage.getItem('jt-theme');
    var dark = t === 'dark' ||
      ((!t || t === 'system') &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  })();
</script>
```

- `color-scheme: light` / `dark` a tokenblokkban (1.1) — a natív form-elemek, scrollbarok is váltanak.
- **Kapcsoló UI:** háromállású (Világos / Sötét / Rendszer) a felhasználói menüben; `aria-pressed`/radiogroup szemantika, aktuális állapot felirattal is jelezve.

### 4.2 Token-elnevezési konvenció

| Réteg | Minta | Példa | Ki használja |
|---|---|---|---|
| Nyers paletta | `--color-{hue}-{step}` | `--color-blue-600` | csak a token-definíciók, komponens SOHA |
| Szemantikus felület | `--surface-{0,1,2}`, `--ink`, `--ink-muted`, `--line` | `bg-surface-1 text-ink` | minden komponens |
| Világ-akcent | `--world`, `--world-fg`, `--world-hover`, `--world-soft`, `--world-soft-fg`, `--world-ring` | `bg-world text-world-fg` | világ-scope-ú komponensek |
| Státusz-tónus | `STATUS_TONES[tone]` (TS, `dark:` variánsokkal) | `STATUS_TONES.success.bg` | StatusPill, Toast |

Szabályok:
1. A szemantikus token light+dark értéket a `:root` / `.dark` blokk adja — a komponensben **nem** jelenik meg `dark:` a felület-színekre.
2. `dark:` variáns közvetlenül csak ott megengedett, ahol nincs (még) szemantikus token (escape hatch) — Fázis 1 review-n jelölendő és tokenesítendő.
3. Új szín bevezetése = új szemantikus token ebben a doksiban, nem inline hex/paletta-osztály.
4. A meglévő `--color-bg-primary` / `--color-accent-*` tokenek (jelenlegi `index.css`) **deprecated** — az érintett helyek `surface-*`/`ink`/`world`-re migrálandók Fázis 1-ben.

---

## 5. Fázis 1 Definition of Done (designer review-kapu)

- [ ] `index.css`: új tokenblokk (1.1 + 1.3) él, érvénytelen `@variant` blokk törölve, no-flash script bekötve
- [ ] Mind a 7 világ nav pillje, primary buttonja, focus ringje az előírt lépcsőkkel renderel light+dark módban (szúrópróba: axe DevTools / Lighthouse a11y ≥ 95 az érintett oldalakon)
- [ ] `StatusPill` az új `Tone` API-t használja, `FSM_TONES` térképpel; régi ad-hoc kulcsok kivezetve
- [ ] Button / SlideOver / Tabs / DataTable / Toast a 2. fejezet acceptance checklistjei szerint zöld (billentyűzet-only végigjárás + NVDA vagy VoiceOver szúrópróba)
- [ ] Bottom nav + FAB + horizontális sávok a 3. fejezet szerint, valós eszközön (iOS safe-area) ellenőrizve
- [ ] Théma-kapcsoló mindhárom állapota működik, reload után is megmarad, nincs FOUC

---

_Designer terminál — JoineryTech sziget. Kérdés/eltérés-igény: Nexus mailbox → designer, cc: root._
