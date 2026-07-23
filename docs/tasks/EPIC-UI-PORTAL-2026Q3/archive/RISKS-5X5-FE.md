# RISKS-5X5-FE — EHS kockázatértékelés 5×5 API-migráció

- **Epic:** EPIC-UI-PORTAL-2026Q3; ERP-szétválasztási follow-up
- **Szerep:** frontend/platform
- **Prioritás:** P0
- **Státusz:** done (2026-07-23) — frontend APPROVED, backend validációs P1
  ZÁRVA, portál-szelet mergelve `joinerytech-portal@1f3ca31` (az EHS-WIZARD-HU
  szelettel atomikusan, az entanglement feloldása után), végső integrált
  ellenőrzés zöld (lásd végrehajtási napló)
- **Függőség:** `RISKS-5X5-BE` kész; `ERPSEP-FE-MOCK-SEED-OWNERSHIP`
  review + integrált build-kapu
- **Mutációs határ:** EHS risk service/FSM/MSW/UI/test, a root `mocks/ehs.ts`
  risk-blokkja, theme risk-FSM készlet, boundary baseline
- **Tiltott scope:** más EHS aggregate-ek wire-migrációja, backend, package/workspace,
  ADR-067 döntések, Doorstar, production/data-mode, deploy

### Integrációs kapu — CAPA source wire

A risk `add-control` opcionálisan egységes CAPA-rekordot hoz létre. A backend és
az OpenAPI ADR-059 szerint ennek `source` értéke `kockazatertekeles`, miközben a
portál jelenlegi `services/capa.ts`, MSW store és címkekészlet még az angol
`RiskAssessment` kulcsot használja. Ugyanez az eltérés az `esemeny`/`Incident`
és `bejaras`/`SafetyWalk` párokra is fennáll.

Ezért az MSW nem írhat csendben angol `RiskAssessment` rekordot csak azért,
hogy a jelenlegi CAPA-képernyő zöld legyen: az elrejtené az API-mode valós
schemahibáját. Az MSW/UI szelet előtt Root-döntés kell az alábbi atomikus
függőségről:

1. a háromelemű `CapaSource` portál/MSW wire-migrációja e task előfeltételeként
   vagy jóváhagyott kiegészítő scope-jaként; vagy
2. külön `EHS-CAPA-WIRE-FE` task, amelynek lezárásáig a risk+CAPA integráció és
   az API-mode elfogadási pont nyitva marad.

A Root 2026-07-22 22:10-kor a külön atomikus előfeltételt jóváhagyta. Az
`EHS-CAPA-WIRE-ROUNDTRIP.md` implementációja elkészült. Az első approval után
egy második reviewer üres-query eltérést és valódi endpointteszt-hiányt talált;
mindkettő javítva, a teljes frontend/backend kapu ismét zöld, a megújított
fresh-context review pedig `APPROVED`. Az `add-control` 201-es sémája és a
magyar `kockazatertekeles` store-út elkészült, de a unified CAPA boardon való
production megjelenés wire-kapuja ezzel feloldva; a tényleges risk MSW/UI és
integrációs teszt továbbra is e task nyitott része.

### Integrációs kapu — backend validációs pipeline (P1, 2026-07-23)

Fresh-context review bizonyította, hogy az EHS DI ugyan regisztrálja a
FluentValidation validatorokat, de nem regisztrál MediatR
`IPipelineBehavior<,>` validációs behaviort. Emiatt a risk command validatorok
runtime-ban inertek lehetnek: a max-hossz, future-date és CAPA assignee/due pár
dokumentált 400-as szerződése nem bizonyított. Különösen veszélyes a féloldalas
CAPA payload: a handler controlt hozhat létre CAPA nélkül, 201 válasszal.

A mock továbbra is a dokumentált, célzott backend-kontraktust követi és 400-at
ad; nem másolja le a production hibát. Az API-paritás és a teljes UI gate csak
akkor zárható, ha külön atomikus backend-fix:

1. beköti az egyetlen közös EHS validation behaviort duplikált regisztráció
   nélkül;
2. valódi TestServer endpointteszttel bizonyítja create/update/add-control
   blank/max-length/future-date/CAPA-pár 400 válaszait és a handler előtti
   rövidzárat;
3. javítja a create endpoint hibás `.Produces<Guid>` metadatáját a runtime
   `{ riskAssessmentId }` válaszra;
4. build + teljes EHS regresszió + OpenAPI diff review zöld.

Root 2026-07-23-án megadta a fájlzár-ACK-ot az EHS API/behavior/test
fájlokra. Az atomikus backend-fix a Codex leállása után root-végrehajtásban
elkészült és independent review után ZÁRVA — részletek a végrehajtási napló
„2026-07-23 — backend validációs pipeline P1 KÉSZ" bejegyzésében.

## Üzleti cél

A portál kockázati képernyője és dashboardja a kész EHS backend
`/api/ehs/risk-assessments` kontraktusát használja. A jelenlegi 3×3 statikus
prototípus helyett 5×5, szerver által besorolt mátrix, teljes kockázati
életciklus és intézkedés/CAPA-kapcsolat jelenjen meg.

Ez egyben megszünteti az ERP boundary scanner utolsó két frontend
`module → legacy shell mock` findingjét:

1. `modules/ehs/pages/RisksScreen.tsx → ../../../mocks/ehs`;
2. `modules/ehs/pages/EhsDashboard.tsx → ../../../mocks/ehs`.

A feladat akkor kész, ha a portál EHS modulja nulla root-mock importtal működik,
a boundary eredmény 17-ről 15 findingre csökken (mind a 15 backend
repo-relatív referencia), és az MSW/API/UI ugyanazt a magyar wire-kontraktust
és FSM-et bizonyítja.

## Bizonyított kiinduló állapot — 2026-07-22

### Portál

- A `RisksScreen.tsx` közvetlenül a root `RISKS` tömböt rendereli.
- A mátrix 3×3, a `probability` és `impact` típusa `1 | 2 | 3`.
- A cellaszínt a kliens hardcode-olt `score >= 6 / >= 3` küszöbbel számolja.
- Nincs loading/error/empty state, query cache, create/update, FSM vagy control
  measure kezelés.
- Az `EhsDashboard.tsx` ugyanebből a statikus tömbből számolja a magas
  kockázatok KPI-ját és listáját.
- A root `mocks/ehs.ts` risk része: `RiskLevel`, `EhsRisk`,
  `RISK_LEVEL_META`, `RISKS`; az `EhsAction.riskId` mező nem teszi szükségessé
  a statikus risk-tömb megtartását.

### Backend — kész, futtatható kontraktus

- **10 végpont:** list, detail, create, update, matrix summary, négy FSM-akció
  (`submit-for-review`, `approve`, `return-to-draft`, `archive`) és
  `add-control`.
- **FSM:** `piszkozat → ellenorzes → jovahagyva → archivalt`, továbbá
  `ellenorzes → piszkozat`.
- **5×5 tengelyek, ADR-059 magyar wire-kulcsok:**
  - súlyosság: `elhanyagolhato`, `enyhe`, `kozepes`, `sulyos`,
    `katasztrofalis`;
  - valószínűség: `ritka`, `valoszinutlen`, `lehetseges`, `valoszinu`,
    `szinte_biztos`.
- **Kockázati sáv:** `alacsony`, `kozepes`, `magas`, `kritikus`.
- A sávhatár backend-configból jön (`LowMax=4`, `MediumMax=9`, `HighMax=16`
  csak default). A UI-nak a DTO `riskLevel` mezőjét kell megjelenítenie; nem
  másolhatja át saját production besorolási algoritmusba a default számokat.
- A matrix endpoint mind a 25 cellát visszaadja counttal és szerver által
  számolt `riskLevel`-lel; csak nem archivált rekordokat aggregál.
- A list item nem tartalmaz tulajdonosnevet, csak `locationId`-t. A területnév
  a meglévő location-queryből oldható fel. `assessedBy` csak a detail DTO-ban
  érhető el; listanézetben tilos kitalált ownernevet mutatni vagy N+1 detail
  lekérést indítani.

## Kötelező architektúra

### 1. Service és kontraktus

Új `modules/ehs/services/riskAssessments.ts`:

- Zod sémák és kanonikus TypeScript típusok:
  `RiskSeverity`, `RiskLikelihood`, `RiskLevel`, `RiskStatus`,
  `RiskAssessmentListItem`, `RiskAssessment`, `RiskControl`,
  `RiskMatrixCell`, `RiskMatrixSummary`;
- payloadok: create, update, add-control;
- filterek: `riskLevel`, `status`, `locationId`, `reviewDueBefore`;
- fetcherek és hookok mind a 10 végponthoz;
- a 204-es végpontokhoz ne adj response-sémát; a két 201-es válasz legyen
  sémával ellenőrzött (`riskAssessmentId`, illetve
  `riskControlId` + nullable `correctiveActionId`).

A service az ADR-059 magyar wire-kulcsokat használja. Az EHS régebbi,
angol kulcsú service-eit ez a task nem migrálja és nem használja precedensként
a risk enumokhoz.

### 2. Query-key és invalidáció

Az `ehsKeys` kapjon külön családot:

- `risks(filters)`;
- `risk(id)`;
- `riskMatrix()`.

Minden create/update/FSM mutáció invalidálja a listát, detailt és matrixot.
Az `add-control` ezen felül a `capas` családot is invalidálja, mert opcionálisan
egységes CAPA-t hoz létre. Ez a rule-6 cache-kontraktus automatikus teszttel
bizonyítandó.

### 3. Egy FSM-forrás

A `services/fsm.ts` kapjon `RISK_ASSESSMENT_FSM` táblát és `RiskAction` típust.
Ugyanezt használja:

- a UI a gombok tiltásához és indoklásához;
- az MSW a tiltott átmenetek 409 válaszához.

Külön UI címke-map kerüljön `pages/labels.ts` alá. A theme
`FSM_TONES` készlete új, kanonikus EHS risk készletet kapjon; állapotjelzés nem
lehet kizárólag színalapú.

### 4. Mock-runtime

Az EHS modul saját mock-rétegében készüljön:

- kanonikus 5×5 risk seed legalább egy rekorddal mind a négy státuszhoz és
  minden kockázati sávhoz;
- `EhsDb.risks` store;
- detail/list/matrix szerializálók;
- `handlers.risks.ts`, amely mind a 10 végpontot tükrözi;
- listafilterek és rendezés;
- create/update input guardok (1–5 enumkészlet, nem üres leírás, jövőbeli
  review-dátum, létező location);
- 404 ismeretlen ID-re, 409 tiltott FSM/missing location/archivált control
  esetén, 400 hibás inputra;
- matrix: pontosan 25 cella, az archivált rekordok nélkül;
- add-control opcionális CAPA-val, a közös CAPA store-ba írva.

A mock besorolási algoritmus config-vezérelt, tiszta függvény legyen; a
production UI azonban mindig a szerver/MSW által küldött `riskLevel`-t használja.

Tervezett fájlhatárok a nagy, többfelelősségű komponens elkerülésére:

- `mocks/riskMatrix.ts`: kizárólag a mock config + tiszta score/band/matrix
  függvények;
- `mocks/handlers.risks.ts`: HTTP parsing, validáció, FSM és store-mutáció;
- `pages/RiskMatrix.tsx`: 5×5 megjelenítés, cella-hozzárendelés és
  akadálymentes cellacímke;
- `pages/RiskAssessmentForm.tsx`: create/draft-update űrlap;
- `pages/RiskDetailSlideOver.tsx`: detail, FSM és control/CAPA flow;
- `pages/RisksScreen.tsx`: query/filter/orchestration, domainlogika nélkül.

### 5. UI

**RisksScreen**

- QueryGate loading/error/retry/empty kezelés.
- 5×5 mátrix, mobilon vízszintesen görgethető; tengelyek teljes magyar címkével
  és 1–5 számmal.
- A 25 cella háttérsávja a matrix DTO `riskLevel` mezőjéből jön.
- A cella számértéket és kockázati címkét is mutat; nem color-only.
- A tényleges rekord-chipek a list-queryből kerülnek a megfelelő cellába.
- Lista-szűrés státusz, kockázati sáv és terület szerint.
- Területnév a `useEhsLocations` adataiból; hiányzó/null location esetén `—`.
- Create form, detail SlideOver, draft update, FSM-akciók és add-control form.
- A listában nincs kitalált owner. A detailben az `assessedBy` az EHS employee
  directoryból oldható fel; ismeretlen ID esetén az ID jelenik meg.
- Dátumok a közös/meglevő helyi formázóval; UTC-nap csapda nem vezethető be.

**EhsDashboard**

- A magas+kritikus KPI a matrix `byRiskLevel` adataiból épül.
- A kivonat a list-query magas/kritikus, nem archivált elemeit mutatja.
- Pending/error esetén őszinte állapot, nem `0` vagy statikus fallback.

### 6. Legacy kivezetés és boundary

Teljes fogyasztói keresés után törlendő a root `mocks/ehs.ts` risk-blokkja:
`RiskLevel`, `EhsRisk`, `RISK_LEVEL_META`, `RISKS`. Az incident/action legacy
részek más scope-hoz tartoznak, változatlanul maradnak.

A boundary baseline-ból csak a két EHS frontend-finding törölhető. Elvárt
végeredmény: 15/15 finding, 0 frontend finding, 15 backend repo-relatív
`ProjectReference`, 0 regresszió.

## Teszt- és bizonyítékterv

### Service/FSM/calc

- minden magyar wire-kulcs elfogadott, angol vagy ismeretlen kulcs elutasított;
- mind a 25 severity×likelihood kombináció kezelhető;
- FSM legal/illegal átmenetek;
- matrix schema pontosan 25 egyedi cellát fogad el;
- a kliens nem számolja újra a production `riskLevel` mezőt.

### MSW contract

- list + mind a négy filter;
- detail 200/404;
- create 201/400/409;
- update csak draftból, 204/400/404/409;
- négy FSM út happy-path + tiltott 409;
- add-control egyszerűen és CAPA-val, archiváltra 409;
- matrix 25 cella, archivált kizárva, count/breakdown konzisztens;
- minden mutáció után list/detail/matrix, CAPA esetén capas invalidáció.

### UI

- 5×5 tengelyek és legalább egy üres/több rekordos cella;
- loading/error/retry/empty;
- location feloldás és null fallback;
- detail megnyitás, FSM-gomb disabled reason;
- create/update/control payload;
- dashboard API-alapú KPI, root mock nélkül.

### Kapuk

```powershell
cd src/joinerytech-portal
npx vitest run --maxWorkers=2 src/modules/ehs src/theme/__tests__/statusTones.test.ts
npm run build
npx eslint <érintett fájlok>

cd ../..
node --test scripts/tests/check-erp-module-boundaries.test.mjs
node scripts/check-erp-module-boundaries.mjs --fail-on-regression --format text
```

Bundle-kapu: a risk service/UI kerülhet az EHS lazy világchunkba; a
`handlers.risks.ts`, seed és mock DB nem kerülhet a shell vagy EHS production
világchunkba. A korábbi `browser-*.js` tree-shaking findinget a párhuzamos
`WORLDS-PRODUCTION-API-GATE` rendezi; e task nem használhatja azt a saját
regressziója elfedésére.

## Végrehajtási napló

### 2026-07-22 — service/FSM szelet kész

- Elkészült a `services/riskAssessments.ts` a 10 backend végpont fetchereivel,
  hookjaival, magyar ADR-059 enum-sémáival és célzott cache-invalidációjával.
- A matrix séma pontosan 25 egyedi severity×likelihood cellát, teljes
  kombináció-lefedettséget, a `totalAssessments`-tel egyező cella- és
  breakdown-darabszámot követel; pozitív archivált státuszdarabot elutasít.
- A production kliens a DTO `riskLevel` értékét fogadja el; besorolási küszöböt
  nem tartalmaz és nem számol újra.
- A kanonikus risk FSM bekerült a közös EHS `fsm.ts`-be: submit, approve,
  return-to-draft és archive legal/illegal átmenetekkel.
- A query-key gyár list/detail/matrix kulcsokkal bővült; add-control esetén a
  CAPA query is invalidálódik.
- Célzott bizonyíték: `riskAssessments.test.ts` **9/9 zöld**; az új és a két
  meglévő EHS FSM-suite együtt **28/28 zöld**; az érintett service/FSM/key/export
  fájlok közvetlen TypeScript-ellenőrzése és ESLintje **exit 0**.
- Root az előző ownership-szeletet függetlenül **APPROVED** státuszra tette és az
  EHS fájlzárat ACK-olta. A `WORLDS-PRODUCTION-API-GATE` utáni közös build
  zöld lett, Root a production/ownership szeleteket `b798645` alatt merge-elte,
  az EHS diffet érintetlenül hagyta. Az MSW/UI utolsó nyitott kapuja a külön
  CAPA-wire review.

### 2026-07-23 — MSW/store + matrix-contract szelet APPROVED

- Külön `mocks/riskMatrix.ts` tartalmazza a config-vezérelt mock score/sáv és
  25-cellás matrix aggregációt. Production service/UI továbbra sem tartalmaz
  küszöböt és nem számolja újra a szerver `riskLevel` mezőjét.
- Az EHS store `risks` kollekciót kapott. A determinisztikus seed minden FSM-
  státuszt és sávot lefed, aktív low/medium/high/critical rekorddal, üres és
  több rekordos cellával. A korábbi rezervált `riskWithCapa` valódi rekord lett;
  control ↔ CAPA linkje kétirányú és azonos ID-jú.
- `handlers.risks.ts` tükrözi mind a 10 végpontot: négy listafilter/rendezés,
  detail, create/update, közös FSM, add-control/CAPA és 25-cellás matrix.
  Ismeretlen/üres/angol query enum 400, valid ismeretlen location filter üres
  lista, create/update hiányzó location 409, tiltott FSM/archivált control 409.
- Create/update/control input Zod guardja a dokumentált backend validator-
  szerződést követi; féloldalas CAPA-pár atomikusan 400, control sem marad a
  store-ban. A fent dokumentált backend P1 miatt ezt még nem nevezzük API-
  parity késznek.
- A matrix response schema már nem csak total összeget ellenőriz: minden
  `byRiskLevel` kulcsot az adott sávú cellák count-összegéhez köt.
- A cache contract külön QueryClient spy tesztet kapott: minden mutáció
  list/detail/matrix, control esetén CAPA invalidációt is indít.
- A fresh review négy contract-rést talált és a javításukat újra ellenőrizte:
  `Guid.Empty` request/response kezelés, szigorú RFC 3339 dátumok, conditional
  CAPA-description validáció és a list-query külön `Guid.Empty → 200/[]`
  backend-paritása. Hibás CAPA-kérésnél a control- és CAPA-store is változatlan.
- Végső független eredmény: **APPROVED, P0–P3 finding nélkül**. Saját célzott
  kapu **3 fájl / 42 teszt**, reviewer-kapu **2 fájl / 33 teszt**, releváns
  ESLint és TypeScript zöld. A teljes EHS regresszió **8 fájl / 79 teszt**,
  a teljes `npm run build` PASS (1330 modul; csak a már ismert >500 kB warning).
- A production-ready lezárást továbbra is a fent dokumentált backend
  `ValidationBehavior` + TestServer + OpenAPI metadata P1 kapu blokkolja.

### 2026-07-23 — 5×5 UI-integráció APPROVED

- A korábbi statikus `RisksScreen` teljes API/MSW orchestrationre cserélődött:
  három szűrő, 25 cellás szerver-besorolású matrix, lista, create, detail,
  draft-update, négy FSM-akció és control/opcionális CAPA flow működik.
- Az új `RiskMatrix`, `RiskAssessmentForm` és `RiskDetailSlideOver` külön
  felelősségű komponensek. A matrix mobilon saját vízszintes scroll-régióban
  marad; a 25 cella szöveges szintet, darabszámot és akadálymentes címkét is ad.
- Az `EhsDashboard` KPI-ja a matrix `byRiskLevel` adataiból, kivonata a
  list-queryből épül. A lista, matrix és helyszíntörzs egyetlen őszinte
  pending/error/ready kaput alkot; részleges hiba alatt nincs stale/félrevezető
  risk-sor, az `Újra` mindhárom queryt újratölti.
- A helyszínnév minden risk UI-ban a location-törzsből oldódik fel; null vagy
  a törzsből hiányzó azonosító egységesen `—`. A listában nincs kitalált owner.
- A közös `addDays` helper fix milliszekundumos léptetés helyett naptári
  `setDate` műveletet használ. Külön Europe/Budapest tavaszi és őszi DST-
  regresszióteszt védi a „holnap” és +30 nap form-dátumokat.
- A mobil vizuális QA talált és lezárt egy rétegzési hibát: a balesetbejelentő
  FAB `z-30`, ezért a `z-40` SlideOver mögött marad; az incident wizard saját
  `z-50` rétege változatlan. A rétegzést teszt is rögzíti.
- A fresh reviewer első köre négy javítandó pontot talált: DST-napléptetés,
  dashboard részleges query-hiba, hiányzó loading/error/retry/empty tesztek és
  a location fallback. Mind javítva és re-review-ban igazolva.
- A második review-kör egy konkurens query-állapotot talált: egy már hibás
  request mellett egy beragadt testvér pendingje elrejthette a retry-t. A
  caller aggregációban az error elsőbbséget kapott, a loading/error ágak
  kölcsönösen kizárók. Kontrolláltan fel nem oldott locations request mellett
  a matrix-hiba azonnal látszik, nincs loading/table/stale sor; retry után a
  feloldott requesttel teljes recovery történik.
- Friss frontend bizonyíték: **15 tesztfájl / 145 teszt PASS**, releváns ESLint
  PASS, `npm run build` PASS (**1332 modul**, EHS chunk 164.05 kB / gzip
  49.45 kB; csak az ismert browser chunk warning). A bundle keresésben a risk
  seed/handler tokenek kizárólag a `browser-*.js` mock chunkban vannak, az EHS
  production chunkban nem.
- Boundary scanner-suite **18/18**, preflight **15/15**, frontend finding 0,
  regresszió 0; `git diff --check` tiszta. A root `mocks/ehs.ts` risk blokkja
  eltűnt, a más EHS legacy aggregate-ek változatlanok.
- A végső fresh-context re-review eredménye **APPROVED, P0–P3 frontend finding
  nélkül**. A reviewer a konkurens error+pending állapotot és a promise/timer
  teszthigiéniát is külön újrafuttatta (**2 fájl / 15 teszt PASS**, ESLint PASS).
- A frontend szelet re-review-ja nem oldja fel automatikusan a külön backend
  `ValidationBehavior` P1 rollout-blokkot. Root a lock-ACK-ot később megadta,
  de az implementáció és a független backend review továbbra is nyitott.

### 2026-07-23 — leállítás és backend lock

- Root megadta a szűk fájlzár-ACK-ot a MediatR `ValidationBehavior`, valós
  TestServer create/update/add-control 400 contract és create response metadata
  backend szeletre. Az implementáció a leállításig nem indult.
- Root bizonyította, hogy az APPROVED risk szelet és a félkész
  `EHS-WIZARD-HU` ugyanazokat a mock substrate fájlokat is érinti. Emiatt a
  risk szelet sem commitolható biztonságosan vak path-staginggel, amíg a wizard
  nincs lezárva vagy a két diff nincs bizonyítottan atomikus egységekre bontva.
- EHS portál commit, push vagy deploy nem történt.

### 2026-07-23 — backend validációs pipeline P1 KÉSZ (root)

- Codex leállása után a root átvette a fájlzárat (AGENT-CHANNEL.md-ben
  bejelentve) és többagentes workflow-ban végrehajtotta az atomikus fixet:
  3 párhuzamos recon → implementáció → 3-lencsés adverzariális review →
  javító kör → újra-review.
- **ValidationBehavior:** új
  `src/ehs/src/Application/Common/Behaviors/ValidationBehavior.cs` a repo
  kanonikus (maintenance/CRM) mintája szerint; egyetlen regisztráció az
  `AddEhsModule` `AddMediatR` configjában (`cfg.AddBehavior`). A korábban
  inert FluentValidation validatorok mostantól minden EHS command előtt
  futnak.
- **500-leak megelőzés modul-szinten:** a recon 13 endpointot azonosított,
  ahol a ValidationException 500-ként szivárgott volna (risk FSM ×4,
  safety-walk ×4, CAPA complete, PPE ×3, hazmat archive, location
  deactivate). Mind a 11 érintett catch-hely explicit
  `catch (ValidationException) → 404` mappinget kapott — az id-only route-ok
  dokumentált (MSW-vel egyező) 204/404/409 kontraktusa szerint, mert üres id
  sosem találhat erőforrást. Body-hordozó route-okon a meglévő generikus
  catch adja a 400-at.
- **Create metadata fix:** `.Produces<Guid>` →
  `.Produces<CreateRiskAssessmentResponse>`; új typed record, a wire-alak
  byte-azonos (`{"riskAssessmentId": uuid}`). Az openapi.yaml már eddig is
  helyesen dokumentálta; csak 2 leíró sor került bele (future-date + CAPA-pár).
- **Tesztek:** új `EhsValidationPipelineTestHost` (VALÓDI MediatR pipeline az
  Application assembly-ből + validatorok + behavior, spy-repository-kkal) és
  `RiskAssessmentValidationEndpointTests` — 28 teszt: blank/max-hossz
  (1000 határ: max átmegy, max+1 400)/múltbeli dátum → 400 create-en és
  update-en; féloldalas CAPA-pár mindkét irányban → 400 és a spy bizonyítja,
  hogy semmi nem perzisztálódott; minden 400-esetnél a handler-rövidzár
  spy-hívásszámmal bizonyítva; FSM ismeretlen id → 404, nem 500.
- **Review-kör lelete és javítása:** az 1. mutációs review P0-t talált — a
  pipeline-teszthost inline wiringje miatt a tesztek a production regisztráció
  eltávolítása után is zöldek maradtak (vakteszt a DI-re nézve). Javítás: új
  `EhsModuleRegistrationTests` — a VALÓDI `AddEhsModule` composition rootot
  hívja és a ServiceDescriptorokat ellenőrzi (behavior pontosan egyszer +
  validatorok regisztrálva). Mutációs újrafuttatás igazolta: a regisztráció
  kivétele buktatja a pin-tesztet; a behavior-throw kilövése 17/28
  pipeline-tesztet buktat.
- **Kapuk (root által függetlenül újrafuttatva):** Api build 0 hiba;
  Domain 130/130; Infrastructure 121/121 (baseline 91 + 28 pipeline + 2 pin),
  Testcontainers Dockerrel futott. Scope-ellenőrzés: pontosan a lockolt
  fájlok változtak (8 módosított + 4 új), semmi más.
- **Elfogadott maradvány-P3-ak (nem blokkolók):** PUT/add-control
  `Guid.Empty` + valid body → 400 (MSW: 404) — portálból elérhetetlen
  degenerált input, a 400 mindkét route-on dokumentált; MSW `.strict()` vs
  System.Text.Json unknown-key tolerancia — pre-existing; hibatest-alak
  (`{error}` vs `{error,message}`) — pre-existing, a portal parser mindkettőt
  kezeli; incident id-only route-ok 400-a (más aggregate-eknél 404) —
  pre-existing generikus catch, degenerált inputra.

### 2026-07-23 — lezárás: entanglement feloldva, atomikus merge

- A root átvette és befejezte a szüneteltetett `EHS-WIZARD-HU` szeletet
  (külön 3-lencsés adverzariális review APPROVED), így a megosztott
  mock-substrate entanglement feloldódott.
- Mindkét szelet atomikusan mergelve: `joinerytech-portal@1f3ca31`
  (45 fájl, 3788+/478-), platform-pin frissítve.
- Végső integrált ellenőrzés (root által futtatva): portál EHS suite
  **141/141**, wizard/store/utils **30/30**, `npm run build` PASS
  (csak az ismert >500 kB warning), boundary **15/15, 0 új**; backend
  Domain **130/130** + Infrastructure **121/121**.
- A slice-A őrző reviewer diff-szinten igazolta, hogy az APPROVED risk
  funkcionalitás érintetlen maradt a wizard-befejezés alatt.

## Elfogadási kritériumok

- [x] A 3×3 statikus prototípus helyett API/MSW-alapú 5×5 UI működik.
- [x] A 10 backend végpont típusosan elérhető, magyar wire-kulcsokkal.
- [x] UI és MSW ugyanazt a risk FSM táblát használja.
- [x] Production besorolás a DTO-ból jön; nincs hardcode-olt UI sávküszöb.
- [x] Matrix/list/detail/count és location-feloldás konzisztens.
- [x] Create/update/FSM/control és opcionális CAPA flow tesztelt.
- [x] Dashboard nem használ root EHS mockot és pendinget nem mutat nullának.
- [x] Root `mocks/ehs.ts` risk-blokk nulla fogyasztó után törölve.
- [x] Célzott teszt, TypeScript, build, lint és bundle-kapu zöld.
- [x] Boundary 15/15, frontend finding 0, regresszió 0.
- [x] Független review APPROVED.

## Stop / eszkaláció

- Ha a valós backend wire-output eltér az `openapi.yaml` magyar kulcsaitól,
  ne épüljön kompatibilitási hazugság: backend contract-fix szükséges.
- Ha ownernév kell a listába, az backend DTO-döntés; N+1 detail-query vagy
  hardcode-olt név tilos.
- Ha a matrix endpoint nem ad 25 cellát vagy a breakdown nem egyezik a listával,
  a UI ne korrigálja csendben; schema/contract hiba legyen.
- Ha a CAPA service még angol `Incident`/`SafetyWalk`/`RiskAssessment` source
  kulcsokat vár, az MSW nem fordíthatja le a magyar backend-wire-t. A háromelemű
  CAPA wire-migráció külön jóváhagyott atomikus függőség.
- Package/workspace/export-map, ModuleId vagy runtime composition változás
  ADR-067 elfogadásáig tilos.
- Deploy és API-mode élesítés csak külön Root jóváhagyással.

## Rollback

A risk service + FSM + handlers/seed/DB + UI/dashboard + theme készlet + root
risk-blokk + boundary baseline egyetlen atomikus szelet. Rollbackkor a teljes
szelet együtt áll vissza; részleges 3×3/5×5 kompatibilitási adapter nem maradhat.
