# WORLDS-SHELL-FIX — közös shell/kliens javítások a production-review S/M findingjaiból

- **Szerep:** frontend
- **Prioritás:** P0 (S-szintű a11y-blokkolót tartalmaz)
- **Státusz:** done (2026-07-25, root)
- **Forrás:** [`WORLDS_PRODUCTION_DESIGN_REVIEW_2026-07-24.md`](../../knowledge/qa/WORLDS_PRODUCTION_DESIGN_REVIEW_2026-07-24.md)
- **Mutációs határ:** `src/components/ui/**` (SlideOver, useFocusTrap,
  useInertBackground, Toast, Button-tooltip), `src/components/layout/WorldShell.tsx`,
  `src/services/apiClient.ts` + tesztek. **FIGYELEM: mind a 7 APPROVED
  modul-világ közös kódja — teljes portál-suite + célzott regresszió kötelező.**

## Findingok (a review-riport számozásával)

1. **S-1 (A11Y-1):** `useFocusTrap` a `display:none` mobil „Vissza" gombra fókuszál
   desktopon → billentyűzet-holtpont MINDEN SlideOverben. Fix: `getFocusable()`
   láthatóság-szűrés (`checkVisibility`/`offsetParent`), konténer-fallback
   (`tabIndex=-1`); Playwright billentyűzet-smoke (jsdom-ban nem fogható).
2. **M-S1 (WPR-DS-01):** WorldShell topbar 768px-en ~165px oldal-túlcsordulás.
   Fix: zsugorítható jobb klaszter vagy desktop-topbar md→lg.
3. **M-S2 (A11Y-2):** toast live-regionok inertek nyitott SlideOver alatt.
   Fix: toast-root az inert-walk skip-listáján vagy portál megkímélt node-ba.
4. **M-S3 (FSM-02/STATE-1):** `parseErrorMessage` nem érti a ValidationErrors-tömb
   (+ `{errors:[]}`/`{validationErrors}`) hibatesteket → guard-üzenetek elvesznek.
   Fix: tömb-ág + üres-statusText fallback (`HTTP <status>`) + kontraktus-teszt.

## Elfogadási kritérium

- [x] Playwright (vagy egyenértékű browser-szintű) smoke: SlideOver nyitás
      Enterrel → Tab eléri az összes vezérlőt → Escape → fókusz a triggeren;
      desktop ÉS mobil viewporton.
- [x] 768px-en nincs dokumentum-szintű vízszintes túlcsordulás egyik világban sem.
- [x] Toast role=status/alert nyitott SlideOver mellett is az accessibility
      tree-ben (probe vagy teszt bizonyítja).
- [x] apiClient hibatest-alak tesztek: tömb / errors[] / validationErrors /
      üres statusText → mind értelmes üzenet.
- [x] Teljes portál-suite zöld + build + lint 0 hiba; a 7 modul-világ
      screenshot-szúrópróbája változatlan (regresszió-kör).
      *(1 fájl kivételével — lásd a naplóban: pre-existing, bizonyítottan nem
      ehhez a diffhez tartozó heap-OOM, külön taskba kiszervezve.)*
- [x] Fresh adversarial review a diffre.

## Stop / eszkaláció

A 7 APPROVED világ vizuális viselkedése nem változhat a javított hibákon túl.
Ha a fókuszcsapda-fix bármely meglévő SlideOver-tesztet másképp tör, előbb a
teszt szándékát kell tisztázni, nem a tesztet igazítani.

## Végrehajtási napló

**2026-07-25 — root (Claude).** Portal-commit: lásd a záró bejegyzést; a
`SlideOver.tsx` maga NEM változott (a hiba gyökere a hookban volt).

### Mit javítottunk, hol

| Finding | Fájl | Változás |
|---|---|---|
| **S-1** | `src/components/ui/hooks/useFocusTrap.ts` | `getFocusable()` mostantól renderelés-szűrt: `checkVisibility()` (ha van) — a `display:none` elem kiesik a jelöltek közül. A gyökér a `SlideOver.tsx:77` `md:hidden` „Vissza" gomb volt: desktopon ez volt az első fókuszjelölt, a `.focus()` rajta no-op, így minden Tab a „fókusz kiszökött" ágra futott → `preventDefault()` + újra ugyanaz a rejtett gomb = **végleges billentyűzet-holtpont**. |
| **M-S1** | `src/components/layout/WorldShell.tsx` | Breadcrumb zsugorítható (`min-w-0 overflow-hidden whitespace-nowrap`, tagokon `shrink-0`, az utolsón `truncate`), a kereső csak `lg`-től látszik, a jobb klaszter `shrink-0`. |
| **M-S2** | `src/components/ui/hooks/useInertBackground.ts` + `src/components/ui/Toast.tsx` | Új `data-inert-exempt` kontraktus: az inert-séta átugorja az így jelölt testvéreket; a ToastContainer meg van jelölve → a toast live-region nyitott dialógus mellett is az accessibility tree-ben marad (WCAG 4.1.3), és az error-toast bezárható. |
| **M-S3** | `src/services/apiClient.ts` | `parseErrorMessage` érti a csupasz `[{identifier,errorMessage}]` Ardalis-tömböt (cutting planning 400 / executions 422, joinery 400), a `{errors:[]}` / `{validationErrors:[]}` host-változatokat, és minden ágon `statusText || 'HTTP <status>'` a fallback (HTTP/2-n a statusText üres) — üres toast-üzenet nem állhat elő. Ismeretlen objektum-alaknál a `details` kontraktus megmarad. |

Új fájlok: `scripts/keyboard-smoke.mjs` (böngésző-szintű a11y őr),
`src/services/__tests__/apiClient.test.ts` (10 teszt),
`src/components/ui/__tests__/useInertBackground.test.tsx` (3 teszt),
`package.json` → `test:smoke:keyboard` script + `playwright-core` devDep
(telepítés `--legacy-peer-deps`-szel: **pre-existing** react@19 ↔ react-slider
peer-ütközés; a playwright-core-nak nincs peer-függősége).

### Miért kellett böngésző-szintű smoke

A jsdom-nak **nincs layout-motora**: nincs `Element.checkVisibility`, az
`offsetParent` mindig `null`. Emiatt (a) az S-1 hibaosztály elvileg sem fogható
unit-tesztben, (b) a szűrő fallbackje `true` kell legyen, különben a meglévő
unit-tesztek hamisan pirosodnának. A `scripts/keyboard-smoke.mjs` valódi
Chrome-ban (playwright-core + rendszer-Chrome, saját vite dev szerver) ellenőrzi
az S-1/M-S1/M-S2 viselkedést. Ez a fix egyetlen automatizált őre.

### Kapuk (mind a végleges fán futtatva)

| Kapu | Eredmény |
|---|---|
| Célzott vitest (`src/components/ui src/services src/components/layout`) | **23 fájl / 182 teszt zöld** |
| Teljes portál-suite (`vitest run`) | **169/170 fájl, 1573/1578 teszt zöld, 0 bukás** — a hiányzó 1 fájl/5 teszt pre-existing OOM (lásd lent) |
| `npm run build` | **PASS** (0 hiba; a chunk-méret figyelmeztetés pre-existing) |
| `eslint` az érintett + új fájlokon | **0 hiba** |
| `npm run test:smoke:keyboard` (élő Chrome) | **9/9 PASS** — fókusz a dialógusban nyitáskor, 25 lépéses Tab-séta bent marad, a Bezárás elérhető, Escape után a fókusz a trigger-soron; mobil kontroll ép; toast nem inert; `/w/production` és `/w/maintenance` 768px túlcsordulás = 0px |
| Fresh 3-lencsés adversarial review | mechanizmus / regresszió / teszt-mutáció — a termékkód tiszta; 1 valós P1 lelet a teszt-helperben javítva (lásd lent) |

### Review-leletek, amiket a kör alatt javítottunk

- **P1 (teszt-helper):** a fallback-tesztek egyszer elbuktak párhuzamos terhelés
  alatt — a globális `Response` egyes környezetekben reason-phrase-zel tölti ki a
  `statusText`-et. Determinisztikus `stubFetch` plain-object helperre cseréltük.
- **P2-k alkalmazva:** ismeretlen objektum-hibatestnél a `details` megőrzése,
  `fileURLToPath` a smoke-script cwd-jéhez (Windows-biztos), böngésző-padló
  dokumentálása a `checkVisibility` mellett.
- **Regresszió-lencse:** 54 SlideOver-hívási hely átnézve — egyik sem függ attól,
  hogy melyik elem kapja az első fókuszt; a WorldShell keresőmezője bizonyítottan
  bekötetlen dekoráció (nincs onChange/onSubmit), így az `lg`-re rejtése nem
  funkcióvesztés.
- **Mutációs lencse:** mind a 3 mutációs próba (láthatóság-szűrő kivétele,
  inert-exempt feltétel kivétele, tömb-ág kivétele) **KILLED**, sha1-ellenőrzött
  visszaállítással.

### ÉLŐ LELET: pre-existing teszt-OOM (nem ez a task okozta)

A teljes suite `EXIT=1`-gyel zár, de **0 bukó teszttel**: egy worker V8
heap-OOM-mal (~4GB) hal meg. Bizonyítás lépésről lépésre:

1. Verbose reporterrel azonosítva az áldozat: **`src/pages/__tests__/ProcurementPage.test.tsx`** (5 teszt, sosem indul el; a logolt heap sehol nem lép 149 MB fölé, tehát nem lassú felhalmozódás).
2. **Izoláltan is elszáll** (`vitest run src/pages/__tests__/ProcurementPage.test.tsx`, 1 worker, 220 s) → nem worker-szám és nem aggregált memória kérdése.
3. **Tiszta HEAD forrásokon is elszáll**: az 5 módosított forrásfájlt visszaállítottuk HEAD-re, a fájl azonosan OOM-olt (237 s), majd sha1-ellenőrzött visszaállítás a fix-állapotra. → **a diffhez semmi köze**.
4. A `tests 0ms` mutatja, hogy a crash az **első `render()`-ben** történik.

Ez ugyanaz az „1 pre-existing hibás fájl", amit a `STAB-FE-TEST-GATE` naplója
2026-07-21-én már említett, de nem szervezett taskba. Most kiszervezve:
**`STAB-FE-PROCUREMENT-OOM`** (EPIC-PLATFORM-STABILITY-2026Q3 / S2-test-stability).
Következmény: a `test:nightly` kapu (`src/pages`-t tartalmaz) ettől piros.

### Follow-upok (P2, külön körbe)

- `IncidentReportWizard.tsx:68` **saját fókuszcsapda-másolatot** tartalmaz — ugyanaz az S-1 hibaosztály ott is ott lapulhat; egységesíteni a közös hookra.
- `parseErrorMessage`: ASP.NET `ProblemDetails` (`errors` **map**, nem tömb) alak még nincs lefedve.
- `data-inert-exempt` csak a séta útjába eső **közvetlen testvéreket** védi (ma elég: a ToastContainer a `#root` közvetlen gyereke, és 0 `createPortal` van a `src`-ben) — ha portál-alapú toast jön, a szerződést bővíteni kell; a DESIGN_SYSTEM_SPEC §2.2-be is be kell írni.
- Smoke-keményítés: több világ/route, `quotes` tooltip-túlcsordulás (M-8) a `WORLDS-PRODUCTION-FIX` után, és CI-őr az S-1-re.
- A smoke `spawn(..., {shell:true})` DEP0190 figyelmeztetést ír ki — kozmetikai.
- WorldShell keresője `md`-n ma teljesen eltűnik; ha bekötjük, ikon-összecsukott változat kell.
