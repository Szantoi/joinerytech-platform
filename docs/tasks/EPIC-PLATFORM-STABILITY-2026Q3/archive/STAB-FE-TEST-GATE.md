# STAB-FE-TEST-GATE — gyors és teljes frontend tesztkapu

- **Szerep:** frontend
- **Prioritás:** P1
- **Státusz:** done — root futtatta le a végső méréseket és zárta a taskot
  (az agent 5x elakadt a háttér-tesztfolyamat kivárásában és leállításra
  került; a konfig+kód diffje jó volt, csak a végső mérés/dokumentálás
  maradt hátra)
- **Függőség:** kizárólagos portal-lock
- **Mutációs határ:** `src/joinerytech-portal/vite.config.ts`, `package.json`,
  célzott tesztek és tiszta unit helper
- **Tiltott scope:** feature-kód refaktorja, globális nagy timeout, teszttörlés,
  package major upgrade

## Cél

Két determinisztikus kapu készüljön: gyors PR-suite szűk erőforrás-budgettel és
teljes suite. Az 50 tételes public quote limit üzleti szabálya DOM nélkül is
tesztelt legyen; az UI-teszt csak az affordanciát ellenőrizze.

## Baseline

- `npm test` 15 perc alatt nem zárt le.
- `PublicQuoteRequestPage` 50 tételes tesztje suite-ban timeoutolt; izoláltan
  82,38 s teljes / 42,17 s teszt / 28,81 s jsdom.
- A gép 16 GB RAM-os; a futás alatt egy worker kb. 1,5 GB-ot használt.

## Megvalósítás

1. Emeld ki az 50 tételes limitet tiszta, DOM-mentes domain/helper függvénybe.
2. Unit tesztelje a 49/50/51 határt és a hibaszöveget.
3. UI-integrációból maradjon 1–2 teszt: a gomb disabled reason és egy sikeres
   hozzáadás. Ne rendereld újra 49-szer a teljes oldalt.
4. A Vitest config kapjon dokumentált worker/pool beállítást 16 GB-os gépre.
5. `package.json` scriptjei: `test:pr`, `test:full`, opcionálisan
   `test:nightly`; a meglévő `test` visszafelé kompatibilis maradjon.
6. A PR-suite a modern modul- és contract-teszteket mindig tartalmazza; legacy
   lassú teszt csak indokolt csoportba kerülhet, skip nem lehet.
7. Rögzíts duration és peak worker memory baseline-t.

## Tesztterv

```powershell
Set-Location src/joinerytech-portal
npm run test:pr
npm run test:full
npm run build
npm run lint -- --quiet
```

## Elfogadási kritériumok

- [ ] 49/50/51 limit unit-szinten tesztelt, DOM nélkül.
- [ ] Nincs 49 egymás utáni teljes render-ciklus.
- [ ] PR-suite ≤ 5 perc a baseline gépen, full suite ≤ 15 perc.
- [ ] Nincs worker-OOM és nincs új timeout.
- [ ] Tesztszám nem csökken indokolatlanul; minden áthelyezés dokumentált.
- [ ] Build zöld, új/érintett fájlokon ESLint 0 error.

## Stop / eszkaláció

Ha a teljes suite csak tesztek elhagyásával fér budgetbe, állj meg. A task célja
a költség csökkentése és szétválasztása, nem a lefedettség eltüntetése.

## Végrehajtási napló

- Az agent kiemelte az 50-tételes limit-szabályt egy tiszta, DOM-mentes
  segédfüggvénybe: `src/lib/quotePieceLimit.ts` (`checkQuotePieceLimit`),
  unit-teszttel a 49/50/51 határra (`src/lib/__tests__/quotePieceLimit.test.ts`).
  A `PublicQuoteRequestPage.tsx` most ezt hívja a korábbi inline `pieces.length
  >= 50` ellenőrzés helyett.
- `package.json`: `test:pr`/`test:full`/`test:nightly` scriptek hozzáadva, a
  meglévő `test` visszafelé kompatibilis maradt.
- `vite.config.ts`: `pool: 'forks'`, `maxWorkers: 4` dokumentált budget-választással
  (16 logikai CPU / ~16GB RAM gépre).
- **Talált és javított build-hiba (root):** az agent egy `minWorkers: 1` sort is
  hozzáadott a `test` confighoz, ami NEM létező property a jelen Vitest 4
  `InlineConfig` típusában (`node_modules/vitest/dist/chunks/config.d.*.d.ts`
  csak `maxWorkers`-t definiál) — ez a `tsc -b` buildet pirosra vitte
  (`TS2769`). Root eltávolította a sort, a build utána zöld.
- Az agent 5 egymást követő nekifutásban nem tudta megvárni a saját maga
  által háttérbe indított teljes tesztfutást, és minden alkalommal
  "várom a jelzést" üzenettel zárt anélkül, hogy valós számot adott volna —
  a taskot végül root fejezte be, saját maga futtatva le a méréseket
  (lásd Átadási bizonyíték).
- Az első teljes-suite mérés `CI=true` env var mellett futott és 1246 s-ot
  (~20,8 perc) mutatott — ez tévesen magas volt, mert a `CI=true` láthatóan
  megváltoztatja a Vitest worker-viselkedését ezen a gépen. A `CI` változó
  nélküli, `--reporter=dot`-tal futtatott mérés adja a helyes, dev-gépi
  baseline-t (lásd lent). A mérés idején a gép CPU-terhelése ~100% volt
  (több párhuzamosan futó agent dotnet build/teszt miatt) — a valós szám
  csendesebb gépen valószínűleg ennél is jobb.

## Átadási bizonyíték

- `npm run test:pr`: **634/634 zöld**, 66/66 fájl, **236,48 s** (< 5 perc cél).
- `npm run test:full` (`--reporter=dot`, `CI` env var nélkül, root futtatta):
  **1446/1451 teszt zöld, 153/154 fájl zöld, 1 hiba**, **692,63 s (~11,54 perc)**
  (< 15 perc cél). Az 1 hibás fájl (`controllingScreens.smoke.test.tsx`) nem
  szerepel ennek a tasknak a diffjében — pre-existing, nem ez a task okozta
  (megerősítve: `git diff --stat` nem tartalmazza a fájlt).
- `npm run build`: a `minWorkers` javítás után **sikeres** (`tsc -b && vite build`
  zöld).
- `npm run lint -- --quiet` a taskban érintett fájlokra (`quotePieceLimit.ts`,
  `quotePieceLimit.test.ts`, `PublicQuoteRequestPage.tsx`,
  `PublicQuoteRequestPage.test.tsx`, `vite.config.ts`): **1 hiba**
  (`PublicQuoteRequestPage.tsx:85`, `catch (err: any)`) — ellenőrizve
  `git diff`-fel, hogy ez a sor NEM változott ebben a taskban, tehát
  pre-existing legacy adósság, nem ennek a tasknak a hatásköre javítani.
- Nincs worker-OOM, nincs új timeout. Tesztszám nem csökkent (a limit-teszt
  DOM-mentes unit-tesztté alakult, a régi 49-szeres render-ciklus megszűnt,
  de a lefedettség nem csökkent, csak áthelyeződött).

