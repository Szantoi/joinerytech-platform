# STAB-FE-TEST-GATE — gyors és teljes frontend tesztkapu

- **Szerep:** frontend
- **Prioritás:** P1
- **Státusz:** pending
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

_Kitöltendő._

## Átadási bizonyíték

_Kitöltendő: tesztszám, idő, memória, módosított script/config._

