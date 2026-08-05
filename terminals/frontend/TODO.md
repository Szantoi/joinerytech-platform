# FRONTEND Terminal TODO

> **Frissítve:** 2026-07-31 este, Europe/Budapest
> **Részletes állapot + a mérési tanulságok:** [`STATE.md`](STATE.md)
> **Kanonikus task-státusz:** `EPICS.yaml` + `docs/tasks/<EPIC>/<TASK>.md`
> **Munkarend:** [`CLAUDE.md`](CLAUDE.md) — done/APPROVED KIZÁRÓLAG root-review

---

## P0 — minden munkakezdés előtt

- [ ] **Inbox + `AGENT-CHANNEL.md` + `git status`** a portálon.
- [ ] **Mailbox-Monitor élesítése** (persistent: `terminals/frontend/inbox` +
      csatorna `@frontend`/`@all`) — **session-váltáskor ÚJRA kell**.
- [ ] **Közös fájl előtt időbélyeg-ellenőrzés**, nem csak `git status` — a
      csatornás sáv-deklaráció önmagában nem véd az ütközéstől (07-29).
- [ ] Fájlhatár-deklaráció a csatornára portál-szintű közös fájl előtt
      (`App.tsx`, `src/index.css`, barrel-ek).

## A sávom állapota: ÜRES (2026-08-05) — a Tranche B APPROVED (08-04)

### Root által a listámra tett tételek (2026-08-04 verdikt)

- [ ] **Négy árva függőség** (`react-window`, `diff`, `html2canvas`,
      `react-zoom-pan-pinch`) — 0 import, pozitív kontrollal validált mérés.
      **Root külön, kicsi taskot csinál belőle** — kiosztásra vár, nem indítom.
- [ ] **A parkolt `packages/module-collaboration/`** (17 fájl, követetlen, B2B-08
      `changes_requested` 07-29 óta) — **alacsony prio**, és a döntés
      (befejezés F4 után **vagy** dokumentált törlés) **Gáboré**. A
      `"!packages/module-collaboration"` kizárás **nem** a helyes irány (root).
- [ ] **Névtelen baseline-flake** — ma nem lelet, nyitott kérdés. Ha újra
      előjön: a futás **teljes kimenetét** el kell menteni.

### 2026-08-05 leszállítva, `review_requested`

- [x] **A suite-recept rése** (`outbox/2026-08-05_001`, portál `2987761`). A
      `test:nightly` 166/179-et futtatott; három fájlt **egyetlen nevesített kapu
      sem** ért el, kettő közülük hozzáférés-vezérlés. Javítás: `--dir` alapú
      felosztás. Teljes suite **179 fájl / 1651 teszt zöld**.
- [x] **Általános portál-kapu** (`outbox/2026-08-05_002`, portál `51d5484`).
      Eddig **egyetlen** workflow volt, mindkét triggere `paths:`-szűrt →
      egy `src/` változás **0 CI-futást** váltott ki. Új `portal-gate.yml`:
      nem szűrt, `gate` + `smoke` job, **lint-racsni** (küszöb 102) a
      `continue-on-error` helyett.
      ⚠ **A racsni első változata csendben átengedett mindent** (üres `COUNT`
      + bash összehasonlítás) — a **negatív** kontroll fogta meg, a pozitív
      ugyanazt a kimenetet adta volna. → [[meres-es-dontes-kulon-merendo]]
      ⚠ **A kapu csak pusholva lép életbe; az első futás az igazi bizonyíték** —
      azt innen nem tudom előállítani. A push root sávja.

## Korábbi kiosztás (2026-08-03, inbox 001) — lezárva

A 2026-07-31-i nap mind a **9 szelete APPROVED** (a 9. ma, portál `ee2cf04`).

### MODULE-PACKAGES maradék follow-upjai — kiadva, MÉRVE

⚠ **A kiadott 3-ból KETTŐ már 2026-07-28 óta kész volt** (`50753ba` — ugyanaz a
commit, amelyikben az eslint-őr is). A lista ma reggel **részben** lett helyesbítve
(egy tétel), a maradék hármat senki nem mérte újra. → [[reszben-helyesbitett-lista]]

- [x] **1. wizard-MSW költöztetés — KÉSZ volt.** A shell `src/` egészében 0 db
      `presigned`/`mock-s3` (pozitív kontrollal), a végpontok a csomagban, és a
      regisztráció-lánc ép (`handlers.ts:6` → `:19` → `browser.ts`) — a némán halott
      végpont esetét külön kizártam.
- [x] **2. wildcard-alias szűkítés — KÉSZ volt.** `tsconfig.app.json`: 0 wildcard,
      mind a 21 alias explicit `index.ts`-re mutat.
- [ ] **3. lockfile-frissítés a collaboration visszavételekor** — ⚠ **NEM indul.**
      A `packages/module-collaboration/` untracked, a B2B-08 review **7 P0-val
      CHANGES REQUESTED**, és a visszavétel a B2B-10 **F4** valódi OpenAPI-jából
      generált kliensre vár. Nem az én döntésem; ha belefutok, jelzem és otthagyom.

*(A negyedik tétel, az „eslint tiltott-import őr" NEM teendő volt, hanem már megvolt
— a root helyesbítette az EPICS-jegyzetet a mérésem alapján.)*

### P2 — LESZÁLLÍTVA, `review_requested` (`outbox/2026-08-03_001`)

- [x] **`PUBLIC_SUBPATHS` olvasása a `package.json` `exports`-ból.** A beégetett
      `{mocks, wizard}` halmaz **uniója** ma helyes, de **per-csomag vak**: mérve a
      12 csomagon a `./wizard`-ot **egyedül a `module-ehs`** exportálja, a
      `portal-core`/`portal-ui` pedig **csak `.`-ot** → az őr átengedne egy
      `@spaceos/portal-ui/mocks` vagy `@spaceos/module-crm/wizard` importot. Drift
      a másik irányban is: új publikus alútra **hamis riasztást** adna.
- [ ] **M3 — `CapacityConflictPanel` ág: BLOKKOLT.** A panelnek nincs
      fogyasztója a portálon → terhelés-képernyő scope-döntés kell. A
      scheduling `openapi.yaml` sincs a platform-repóban (a federation-
      kézbesítés a Doorstarnak ment), generált kliensre ma nem tudok építeni.
- [ ] **P2 (root nyilvántartja):** `LeadDetailSlideOver` terhelés-flake — ha
      újra bukik, bő timeouttal rendezendő (a controlling-tesztek mintájára).

## Emberi kapun áll — NEM az én lépésem

| Tétel | Mire vár |
|---|---|
| ~~**Tranche B**~~ | ✅ **LEZÁRVA 2026-08-04.** Gábor döntött (*„nem lesz szerkeszthető rács"*) → törlés + `react-slider` ki; portál `76bc647`, **root-APPROVED** (inbox `2026-08-04_001`), pin-bump `581322a`. A 07-30 óta piros `npm ci` **feloldva**, root negatív kontrolljával igazolva |
| ~~**`SheetTable` → `EditableDataTable`**~~ (PLAN-05 F3 maradék) | **NEM „átvétel"** — egyik sem létezik ebben a repóban (fa + teljes git-történet: 0 találat); a `SheetTable` a Doorstaré. A blokkoló feltétel („M4 revízió-szerkesztés") a `docs/` alatt **csak a PLAN-05-ben** él, önhivatkozásként → **nem értékelhető**. Ha kell, ez **új, specifikálandó fejlesztés** |
| **PIN-backdoor** (`/shopfloor`) | a route sorsa (marad? DEV mögé? eltűnik?) — az ág eltávolítása authorizált, a helyettesítő viselkedés nem |
| **Nem szabad gépre ejtés** | termékdöntés: sorba állítás vagy tiltás. Ha tiltás lesz, a `Busy`-teszt „nem tiltott" kikötését a döntéssel EGYÜTT kell átírni |
| **Toast SR-szúrópróba** (`display:contents`) | manuális QA-kör, az EHS-WIZARD-HU QA-jával egy ülésben |
| **`<title>jt-temp</title>`** | névválasztás (Gábor-lista apró tételei) |
| **Trade-világ élesítése** | ha valaha: a `usePricingRules:67` ál-siker PUT az ELSŐ tétel |

### Tranche B — amit 2026-08-03-án előre kimértem (a végrehajtás előtt)

- ⛔ **A parkolás ára ma is folyik:** `npm install --dry-run` → **ERESOLVE**
      (`react-slider@2.0.6` peer: `react@"^16 || ^17 || ^18"` vs a fán **19.2.7**).
      Sima `npm install` **elbukik**; mindkét fogyasztó a Tranche B-ben van.
      A `react-slider` **`dependencies`** (nem dev — a 07-31-i jelentésem tévedett).
- ⚠ **KÉT `CatalogPanel`:** `components/catalog/` halott (törlendő),
      `components/settings/` **ÉLŐ** (`SettingsPage.tsx:5`). Név-alapú törlés az
      élőt vinné → fájl-szintű pathspec. → [[ket-parhuzamos-modul-fa]]
- ⚠ **Árva teszt a klaszteren kívül:** `src/__tests__/ProductCard.test.tsx` —
      a mappából induló lista kihagyja, tehát a **fájlszám nő**. Ez buktatta volna
      a Tranche A-t is (58 → 59). → [[torles-ellenorzese-a-megmarado-fan]]
- ✅ **A „prior art elvész" érv nem áll:** a Tranche A-ban törölt fájl tartalma ma
      is előhívható (`git show f5f44b7^:<fájl>` — kimérve).

## Állandó mérési fegyelem (a saját leckéimből)

- **Mutáció:** `--no-cache` + `rm -rf node_modules/.vite`, ÉS bizonyítsd, hogy a
  csere lefutott (diff/tartalom-kiírás). Visszaállítás **mentett bájt-másolatból**
  — `sed -i` Windows-fán sorvég-hamis sha1-t ad.
- **A mutáció a produkciót rontsa**, ne a tesztet.
- **Bukó közös kapu:** előbb bizonyítsd, hogy nem a te diffed (egyedül-futtatás ·
  újrafuttatás · a diff gépi érintettsége · a szomszéd darab változatlansága).
- **A kapu léte ≠ hatása:** öntesztelj, pozitív ÉS zaj-kontrollal; a „0 találat"
  csak akkor bizonyíték, ha a mérőeszköz lát (bejáró-kontroll).
- **Töröléskor** az árva-importot a MEGMARADÓ fáról mérd, ne a lista
  teljességét szemlézd; a lint-számot ELŐRE számold ki, aztán mérd.
- **Lint-lelet triázsa:** mindig route-elérhetőséggel (kozmetikai `err: any` és
  egy biztonsági backdoor ugyanazt a sort adja).
- **Suite KÉT előtér-darabban:** `npm run test:src` (91) + `npm run test:packages`
  (88) = **179**, átfedés és rés nélkül. A régi 3 darabos recept **hibás volt**
  (2026-08-05-i mérés): 47 fájl duplán futott, 3 pedig **sehol** — köztük az
  `src/auth/RequireAuth` és a `src/config/worldAccess`.
- ⚠ **A vitest pozicionális argumentuma RÉSZLÁNC-szűrő, nem könyvtár.** A
  `src/components` illeszkedik a `packages/portal-ui/src/components/...`-ra is.
  Könyvtárra szűkíteni **csak `--dir`** tud. Ugyanez húzta be a parkolt,
  követetlen `module-collaboration`-t a felterjesztett számaimba.
- **Ha a munkafádon parkolt/idegen munka van:** a felterjesztett számot
  csak-követett fán mérd, vagy **mondd ki, hogy munkafa-szám** (root, 08-04).

---

_A lezárt munka és a mérési tanulságok: [`STATE.md`](STATE.md)._
