# EHS-CAPA-WIRE-ROUNDTRIP — egységes CAPA source magyar wire-kapu

- **Epic:** EPIC-UI-PORTAL-2026Q3; ADR-059 follow-up
- **Szerep:** backend + frontend/platform
- **Prioritás:** P0, a `RISKS-5X5-FE` production CAPA-flow előfeltétele
- **Státusz:** done — root APPROVED (újra), a reopen-ben talált MSW/endpoint
  konzisztencia-rés javítva és megerősítve (2026-07-22, AGENT-CHANNEL.md)
- **Mutációs határ:** EHS corrective-action query binding, CAPA service/MSW/labels/tests
- **Tiltott scope:** más EHS enumok teljes portálmigrációja, risk UI, package/workspace,
  más modul, deploy

## Feladat és üzleti cél

Az incidensből, munkavédelmi bejárásból és kockázatértékelésből születő
intézkedések egyetlen CAPA-boardon jelennek meg. A `source` mező és query-filter
minden rétegben ugyanazt az ADR-059 magyar drótszótárat használja:

| Domain | Wire / portál |
|---|---|
| `Incident` | `esemeny` |
| `SafetyWalk` | `bejaras` |
| `RiskAssessment` | `kockazatertekeles` |

Nem maradhat olyan MSW-adapter, amely angol kulccsal zölddé teszi a demót,
miközben az API-mode Zod-hibára fut.

## Bizonyított kiinduló állapot — 2026-07-22

### Backend

- `EhsWire.CapaSource` és a JSON `WireEnumConverter` már a három magyar kulcsot
  kezeli; az `EhsWireTests` round-trip ezt rögzíti.
- Az OpenAPI `CapaSource` sémája magyar.
- A `CorrectiveActionEndpoints.ListCorrectiveActionsRequest.Source` ennek
  ellenére még `CapaSource?`. A minimal API query binding megkerüli a JSON
  convertert, ezért itt nem a dokumentált `WireQuery.TryParse` minta fut.
- Az `ADR-IMPL-WIRE.md` késznek írja le az EHS enum-queryk kézi parse-olását,
  de ez a corrective-action végpontnál kimaradt; a dokumentáció és a kód között
  bizonyított rés van.

### Portál

- `services/capa.ts` még `Incident | SafetyWalk | RiskAssessment` értékeket
  fogad és küld.
- Az EHS in-memory DB, seed, incident/walk handlerek és `CAPA_SOURCE_LABELS`
  ugyanezekre az angol értékekre épülnek.
- Emiatt a valódi magyar JSON-választ a `capaSchema` elutasítja, a magyar
  `source` queryt pedig a mock és a backend jelenleg nem bizonyítja végponttól
  végpontig.

## Kötelező kivitelezés

### 1. Backend query binding

`CorrectiveActionEndpoints`:

- `ListCorrectiveActionsRequest.Source` legyen `string?`;
- a handler `WireQuery.TryParse(EhsWire.CapaSource, request.Source, ...)`
  használatával állítsa elő a domain `CapaSource?` filtert;
- ismeretlen, angol vagy hibás kis-/nagybetűs kulcs `400 Bad Request`, ne üres
  listát vagy automatikus angol enum-bindot adjon;
- hiányzó query érték továbbra is `null`, tehát szűretlen lista.

Nem készül új szótár vagy kompatibilitási alias: az egyetlen forrás az
`EhsWire.CapaSource`.

### 2. Portál service

`modules/ehs/services/capa.ts`:

- `capaSourceSchema = z.enum(['esemeny', 'bejaras', 'kockazatertekeles'])`;
- `CapaFilters.source` a kanonikus magyar típust használja, ezért az
  `apiFetch` pontosan ezt küldi queryben;
- angol kulcsot a válaszséma elutasít;
- nem vezethető be dual-read, `.transform()` vagy English↔Hungarian adapter.

### 3. MSW és in-memory store

Atomikusan frissítendő:

- `mocks/seed.ts` CAPA seed source-értékei;
- `mocks/db.ts` incident-CAPA szerializáló szűrése;
- `handlers.incidents.ts` új CAPA source-értéke;
- `handlers.walks.ts` új CAPA source-értéke és `source` query-filtere;
- a risk `handlers.risks.ts`, ha addig létrejött: `kockazatertekeles`.

A CAPA list handler ismeretlen `source` queryre `400`-at adjon, és csak a
kanonikus három kulcsot fogadja. Az MSW store-ban is wire-alak él; nincs külön
angol mock-domain.

### 4. UI címkék és fogyasztók

`CAPA_SOURCE_LABELS` kulcsai magyarra váltanak, a látható címkék változatlanok:
`Esemény`, `Bejárás`, `Kockázat`. Teljes fogyasztókereséssel ellenőrizni kell,
hogy angol source literál nem marad az EHS portálfában tesztfixture-ben sem.

## Tesztek és kapuk

### Backend

- magyar `source=esemeny|bejaras|kockazatertekeles` helyesen szűr;
- angol `Incident|SafetyWalk|RiskAssessment`, hibás case és ismeretlen kulcs
  400-at ad a wire-kulcsokat felsoroló hibával;
- hiányzó source szűretlen listát ad;
- meglévő JSON round-trip és EHS build zöld.

### Frontend/MSW

- `capaSchema` elfogadja mindhárom magyar source-értéket és elutasítja az
  angol kulcsokat;
- `fetchCapas` mindhárom source filterrel csak megfelelő rekordot ad;
- az egységes seed lista incidens-, bejárás- és risk-forrást is tartalmaz;
- incident/walk/risk CAPA-létrehozás után ugyanazon boardon megjelenik a rekord;
- ismeretlen source query 400;
- `CapaBoard`, incident FSM, walk FSM és risk contract/screen regresszióteszt zöld.

```powershell
dotnet build src/ehs/src/Api/SpaceOS.Modules.Ehs.Api.csproj --no-restore
dotnet test src/ehs/tests/Infrastructure.Tests/SpaceOS.Modules.Ehs.Infrastructure.Tests.csproj --no-restore

cd src/joinerytech-portal
npx vitest run --maxWorkers=2 src/modules/ehs
npx eslint <érintett CAPA/EHS fájlok>
npm run build
```

Bundle-kapu: az EHS MSW seed/handler nem kerülhet production chunkba.

## Kivitelezés és eredmény — 2026-07-22

- A corrective-action lista `Source` request-mezője nyers string lett, és az
  endpoint `WireQuery.TryParse(EhsWire.CapaSource, ...)` hívással készíti a
  domain filtert. Így az angol enum-nevet a minimal API binder már nem fogadja
  el kerülőúton.
- A portál `CapaSource` kanonikus készlete `esemeny | bejaras |
  kockazatertekeles`; service filter, Zod response-schema, MSW store, seed,
  incident/walk CAPA-létrehozás és UI-label ugyanazt a készletet használja.
- A CAPA MSW lista üres, ismeretlen, hibás case-ű vagy angol source queryre
  400-at és az elfogadott magyar értékeket tartalmazó hibát ad. A hiányzó
  query-paraméter az egyetlen szűretlen eset.
- A determinisztikus seed mindhárom forrást tartalmazza; a későbbi risk MSW a
  lefoglalt `SEED_IDS.riskWithCapa` / `capaRiskOpen` azonosítókat használhatja.
- Új `capaWire.test.ts`: mindhárom magyar filter happy path; üres, angol,
  hibás case-ű és ismeretlen query fail-fast. A meglévő incident/walk FSM
  tesztek magyar source-ra álltak.
- A friss review által feltárt query-binder bizonyítási résre valódi
  `TestServer` endpoint-contract teszt készült. Ez nem csak az enumtérképet,
  hanem az `[AsParameters] string?` → `WireQuery.TryParse` teljes útvonalat
  ellenőrzi, beleértve a hiányzó paramétert és minden tiltott alakot.

### Bizonyíték

- Portál teljes EHS suite: **7 fájl / 57 teszt zöld**.
- Külön screen/SlideOver smoke: **2 fájl / 10 teszt zöld**.
- Érintett frontend ESLint és közvetlen TypeScript: **exit 0**.
- Teljes `npm run build`: **zöld**; a mock-only seed szöveg kizárólag a nem
  hivatkozott `browser-*.js` artifactban található, az EHS production chunkban
  nincs.
- EHS API build: **0 hiba**. Docker-mentes `EhsWireTests` és valódi endpoint-
  contract tesztek együtt: **37/37 zöld**.
- Pre-existing, nem e taskból eredő build-riasztás: `NU1603` feed-drift és
  `NU1903` magas súlyosságú AutoMapper advisory. Külön security task szükséges;
  a warning nem lett elhallgatva vagy e kontraktus-szeletbe keverve.
- Minden érintett diff-check tiszta.

## Elfogadási kritériumok

- [x] A backend JSON és query ugyanazt az `EhsWire.CapaSource` szótárat használja.
- [x] A portál service, MSW DB/seed/handlerek és labels magyar source-kulcsúak.
- [x] Angol és hibás kulcs backend- és frontend-oldalon is fail-fast.
- [x] Mindhárom forrás ugyanazon CAPA-boardon, szűrhetően megjelenik.
- [x] A risk add-control + CAPA folyamat API-mode-ban is schema-kompatibilis.
- [x] Célzott backend/frontend teszt, lint, build és bundle-kapu zöld.
- [x] `ADR-IMPL-WIRE.md` EHS állítása a kóddal ismét összhangban van.
- [x] Független review APPROVED (root, 2026-07-22) — a reopenben talált 2 rés
      javítva és megerősítve: `if (source !== null)` fail-fast üres string
      esetén is (`handlers.walks.ts`), valódi `Microsoft.AspNetCore.TestHost`
      endpoint-contract suite (`EhsEndpointTestHost` + `CorrectiveActionEndpointWireTests`,
      mocked mediator, valós routing/auth). Önállóan újrafuttatva: 37/37 zöld.

## Stop / eszkaláció

- Ha a backend query binding továbbra is közvetlen `CapaSource?`, a frontend
  átállás nem minősíthető round-trip késznek.
- Ha bármely fogyasztó angol alias megtartását kéri, állj meg: ADR-059 szerint
  a wire kanonikus, kompatibilitási dual-read külön döntés.
- Más EHS enum angol/magyar eltérése külön task; e scope nem terjeszthető ki
  opportunista teljes EHS-migrációvá.
- Deploy csak külön Root jóváhagyással.

## Rollback

A backend query parse, portál schema, MSW seed/store/handlerek, labels és tesztek
egy atomikus változás. Részleges rollback tilos, mert JSON/query/mock nyelvi
eltérést állítana vissza.
