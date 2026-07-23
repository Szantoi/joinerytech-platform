# ERPSEP-FE-CROSS-MODULE-DEBT-01 — generikus űrlapmezők leválasztása az EHS-ről

- **Epic:** EPIC-ERP-SEPARATION-2026Q3
- **Szerep:** frontend/platform
- **Prioritás:** P0
- **Státusz:** done — root APPROVED (2026-07-22, lásd AGENT-CHANNEL.md)
- **Függőség:** ERPSEP-PACKAGE-BOUNDARY-PREFLIGHT
- **Mutációs határ:** portal shared UI + EHS/Controlling fogyasztók + boundary baseline
- **Tiltott scope:** npm workspace/csomagnév, ModuleId, manifest, runtime composition,
  backend/API, Doorstar, deploy

## Cél és leállási feltétel

A Controlling ne importáljon EHS-belső fájlt pusztán generikus űrlapmezőkért.
A szelet akkor kész, ha a generikus elemek a már engedélyezett shared UI-határban
élnek, az EHS-specifikus elem az EHS bounded contextben marad, a portál build és
célzott tesztkör zöld, a dependency scanner pedig nulla frontend keresztmodul-
importot és nulla regressziót mutat.

Ez az ADR-067-től független adósságcsökkentés: nem hoz létre végleges package-
nevet vagy workspace-szerkezetet, és nem indítja el a blokkolt `MODULE-PACKAGES`
teljes végrehajtását.

## Kiinduló állapot

- `AdjustmentForm.tsx` közvetlenül importálta az EHS
  `pages/formFields.tsx` belső fájlját.
- A fájl három általános UI-primitívet és egy EHS-specifikus alkalmazottlista-
  adaptert vegyített.
- Boundary baseline: 21 finding, ebből 1 frontend cross-module és 5 legacy mock.
- A korábbi komponens a hívó által adott `id`-t a kontrollon felülírhatta úgy,
  hogy a címke még a generált azonosítóra mutatott.

## Megvalósítás

1. `components/ui/FormFields.tsx` lett a `SelectField`, `TextAreaField` és
   `DateField` tulajdonosa.
2. A shared mezők megőrzik a meglévő API-t és token-osztályokat, támogatják a
   refet, valamint ugyanazt az explicit/fallback ID-t használják a címkén és a
   kontrollon.
3. Az EHS-specifikus `EmployeeOptions` külön, az EHS modulon belül maradt.
4. Az EHS és Controlling fogyasztók a shared UI barrelből importálják a generikus
   mezőket; az EHS régi `pages/formFields.tsx` fájlja megszűnt.
5. A pontosan megszűnt finding kikerült a baseline-ból. Az öt legacy mock-él
   változatlanul és külön kategóriában maradt látható.

## Bizonyíték — 2026-07-22

```text
npm test -- --maxWorkers=2 src/components/ui/__tests__/FormFields.test.tsx
1 fájl · 3 teszt · 3 pass

npm test -- --maxWorkers=2 \
  src/modules/ehs/pages/__tests__/ehsScreens.smoke.test.tsx \
  src/modules/ehs/pages/__tests__/IncidentDetailSlideOver.test.tsx \
  src/modules/controlling/pages/__tests__/adjustmentFlow.test.tsx \
  src/modules/controlling/pages/__tests__/controllingScreens.smoke.test.tsx
4 fájl · 18 teszt · 18 pass

npx eslint <12 érintett portal fájl>
exit 0

npm run build
tsc -b + vite build · exit 0 · 1043 modul transzformálva

node --test scripts/tests/check-erp-module-boundaries.test.mjs
18 teszt · 18 pass

node scripts/check-erp-module-boundaries.mjs --fail-on-regression --format text
7 modul · findings 20 · baseline 20 · regresszió 0
frontendCrossModuleImports: current 0 · baseline 0 · new 0
frontendLegacyShellImports: current 5 · baseline 5 · new 0
```

Az első UI-tesztfutásban a teszt hibásan az `aria-hidden` csillagot is az
accessible name részének várta. A DOM helyesen `Hatály` néven tette elérhetővé a
selectet; a tesztelvárás javítása után a kör zöld.

## Elfogadási kritériumok

- [x] Nincs Controlling → EHS import.
- [x] A generikus UI és az EHS-specifikus adapter tulajdonosa különválik.
- [x] Címke/ID kapcsolat explicit `id` mellett is helyes.
- [x] Célzott unit és képernyő/folyamat tesztek zöldek.
- [x] Érintett fájlok ESLintje és a production build zöld.
- [x] Boundary scanner: 0 cross-module, 0 regresszió, pontos baseline.
- [x] Független Root/frontend review lezárva — APPROVED (root, 2026-07-22).

## Következő, külön szelet

Az öt legacy mock-függőséget nem szabad adatduplikációval eltüntetni. A következő
feladat előbb fogyasztói gráfot és ownership-döntést készít a Controlling
`mocks/controlling`, CRM `mocks/worlds`, HR `mocks/hr` és EHS `mocks/ehs`
adatokról; csak ezután mozgatható a modul-fixture vagy a shell adapter.

## Rollback

A shared `FormFields.tsx` és `EmployeeOptions.tsx` hozzáadásának, az importoknak
és a baseline egy findingjének együttes visszaállítása szükséges. Részleges
rollback tilos, mert vagy fordítási hibát, vagy pontatlan baseline-t hagyna.

## Review-kérés

@root Ellenőrizd adversarial módon:

1. a shared UI-határ valóban semleges-e, és nem rejt-e EHS domainfüggést;
2. az explicit/generált ID, required jelölés és kontroll API kompatibilis-e;
3. a baseline-csökkentés pontosan a bizonyítottan megszűnt egyetlen findinget
   távolította-e el;
4. nem csúszott-e be ADR-067 által blokkolt package/runtime döntés.
