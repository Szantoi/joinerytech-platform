# EHS-WIZARD-HU — gyors balesetbejelentő honosítás és ingest-kapu

- **Epic:** EPIC-UI-PORTAL-2026Q3 backlog follow-up
- **Szerep:** frontend/platform
- **Prioritás:** P1
- **Státusz:** in_progress — a root 2026-07-23-án átvette, befejezte és
  fresh review után mergelte (`joinerytech-portal@1f3ca31`); a done-hoz
  kizárólag a manuális mobil+desktop+dark vizuális QA hiányzik (Gábor)
- **Cél:** a mobil EHS gyorsbejelentő teljesen magyar, akadálymentes és a valós
  `/api/ehs/events` szerződéssel idempotens legyen, félrevezető adatvédelmi
  állítás nélkül.
- **Stop:** API/wire enum, domain vagy `property → HazardousCondition` mapping
  átnevezése; backend/submodule módosítás; deploy; az APPROVED
  `RISKS-5X5-FE` komponenseinek megváltoztatása.

## Kiinduló audit — 2026-07-23

### P1 — a valós ingest és az offline idempotencia törött

A portál `incidentDraftStore` kérése nem küldi a draft stabil UUID-ját
`eventId` mezőként. A kanonikus legacy EHS host `ReportIncidentRequest.EventId`
mezője kötelező, non-empty GUID, és erre épül a duplikált retry idempotens 200-as
válasza. A jelenlegi MSW ezt nem validálja, ezért a mock mód zöld, miközben a
valós host 400-at adhat.

További kontraktusrés: a payload `reporterId` mezője backend `Guid`, a portál
jelenleg a nem GUID `user-mock-id-001` sztringet hardcode-olja. A store nem
találhat ki felhasználót: az OIDC `sub` claimet a UI-határon kell átadni, UUID-
ként fail-closed validálva és a draftban megőrizve, hogy az offline retry is
ugyanazt a reportert és `eventId`-t használja.

### P1 — az EXIF adatvédelmi ígéret nem igaz

A UI azt ígéri, hogy az EXIF metaadat automatikusan eltűnik, miközben a
`compressPhoto` hiba esetén az eredeti fájlt adja vissza, amelyet az upload
feltölt. Az adatvédelmi határ fail-closed lesz: sikertelen újrakódolásnál nincs
eredeti-fájl fallback és nincs upload. A wizard egységes, magyar, technikai
részletet nem szivárogtató hibát mutat. A fájlválasztó a ténylegesen támogatott
JPEG/PNG és 10 MB klienskorlátot is érvényesíti, nem csak kiírja.

### P2 — UX, idő és akadálymentesség

- 40+ felhasználói szöveg angol a wizard négy komponensében.
- A `datetime-local` érték UTC ISO-sztring `slice(0, 16)` eredménye, ezért
  Budapest szerint 1–2 órával eltérhet; a review `en-US` formázást használ.
- Nincs `role=dialog`, `aria-modal`, címkapcsolat, Escape, fókuszcsapda és a
  mobil bezárógombnak nincs accessible neve.
- A felület raw `white/gray/rose/sky/amber/green` palettája nem követi a portál
  semantic token/dark-mode szerződését.

### Külön döntést igénylő, tiltott scope

Az MSW `property` eseményt `HazardousCondition` incidenttípusra fordítja. Az
„anyagi kár” és „veszélyes állapot” nem azonos üzleti fogalom; ezt a copy-task
nem rejtheti el. Külön backend/domain contract döntés szükséges. Ugyancsak
külön teljes ADR-059 migráció a fő `/api/ehs/incidents` angol PascalCase wire-
készlete; ebben a taskban nincs dual-read és nincs opportunista átnevezés.

## Design és megvalósítási szerződés

### 1. Egy típusos megjelenítési szótár

Új `components/EHS/incidentWizardCopy.ts` legyen az egyetlen megjelenítési
forrás a három legacy ingest-típus magyar címkéjéhez és leírásához. A kulcsok
változatlanok: `near-miss`, `injury`, `property`. Ugyanezt a mapet használja a
kiválasztó és az összegző lépés; duplikált címkeszótár nem marad.

Nem fordítható wire/perzisztencia:

- `INCIDENT_REPORTED`;
- `near-miss`, `injury`, `property`;
- `draft`, `uploading`, `submitted`, `failed`;
- JSON mezők, endpointok, `incident-drafts`, `device-id`.

### 2. Idempotens submit és reporter ownership

- A request top-level `eventId` mezője mindig a draft `id`.
- A reporter az OIDC `profile.sub` UUID; hiányzó/hibás claimnél nincs hálózati
  kérés, érthető magyar hiba jelenik meg.
- Az első submit a reporter ID-t a draftba menti; háttér-retry ugyanazt használja.
- Retry azonos `eventId`-vel nem hozhat második MSW incidenst; 200-as idempotens
  válasz megengedett, első létrehozás 201.
- A mock ugyanazt a kötelező top-level/type/payload minimumot ellenőrzi, így
  `eventId` vagy GUID-rés nem lehet mock-only zöld.

### 3. Adatvédelmi photo pipeline

- A feltöltés kizárólag sikeresen újrakódolt/compressed fájlt kaphat.
- Compression-hibánál fail-closed exception; az S3 PUT nem indul.
- JPEG/PNG, legfeljebb 10 MB kliensoldali guard; a hiba magyar toast.
- A felhasználói szöveg csak bizonyított viselkedést ígér.

### 4. Helyi idő és a11y

- ISO timestamp → `datetime-local` helyi év/hó/nap/óra/perc komponensekből,
  nem UTC-szeleteléssel; visszaalakítás a helyi input `Date` értelmezéséből.
- Összegzés `hu-HU`; tavaszi/őszi Europe/Budapest regresszióteszt.
- A modal named dialog: `role=dialog`, `aria-modal`, `aria-labelledby`.
- Escape bezár, Tab/Shift+Tab a dialógus fókuszolható elemei között marad,
  nyitáskor fókuszt kap és bezáráskor visszaadja az előző fókuszt.
- Beküldés közben bezárás továbbra is tiltott.
- Semantic surface/ink/line/world tokenek és szükséges dark-párok; a wizard
  `z-50`, az APPROVED FAB `z-30`, a risk SlideOver `z-40` marad.

## Fájlhatár

Tervezett portálfájlok:

- `components/EHS/incidentWizardCopy.ts` (új);
- `components/EHS/incidentWizardDate.ts` + teszt (új, tiszta helper);
- `components/EHS/IncidentReportWizard.tsx`;
- `components/EHS/StepIncidentType.tsx`;
- `components/EHS/StepDetails.tsx`;
- `components/EHS/StepReview.tsx`;
- `stores/incidentDraftStore.ts`;
- `services/ehsPhotoService.ts`, `utils/imageCompression.ts`;
- `modules/ehs/mocks/handlers.incidents.ts`;
- célzott wizard/store/photo/MSW tesztek;
- `auth/AuthContext.tsx` kizárólag a dev-mock érvényes `sub` claimjéhez.

`IncidentReportFAB.tsx`, risk komponensek, backend és `EPICS.yaml` review előtt
nem módosulnak.

## Teszt- és elfogadási kapu

- [ ] Mindhárom lépés és hiba/offline ág teljes magyar copyval működik; nincs
  user-facing `en-US` vagy nyers angol technikai hiba.
- [ ] A magyar választás az eredeti három wire-értéket tárolja.
- [ ] Request snapshot: stabil draft `eventId`, `INCIDENT_REPORTED`, OIDC reporter
  UUID; retry ugyanazt az ID-t használja és idempotens.
- [ ] Hiányzó/hibás reporter claim, eventId/type/payload mock guard tesztelt.
- [ ] Compression-hiba esetén nincs eredeti-fájl upload; JPEG/PNG/10 MB guard.
- [ ] Helyi input és `hu-HU` review tavaszi/őszi DST körül helyes.
- [ ] Named modal, mobil close név, Escape, fókuszcsapda és fókusz-visszaadás.
- [ ] Mobil + desktop + dark vizuális QA; z-index regresszió nélkül.
- [ ] Célzott tesztek, teljes EHS suite, ESLint, TypeScript/build zöld.
- [ ] Független fresh-context review `APPROVED`, P0–P3 finding nélkül.

## Rollback

A copy/date/dialog változás, idempotens event payload, reporter-persistencia,
photo fail-closed guard és MSW mirror egyetlen atomikus szelet. Részleges
rollback nem hagyhat magyar, de productionben továbbra is 400-as vagy
adatvédelmileg félrevezető wizardot.

## Végrehajtási napló

### 2026-07-23 — audit és design

- Fresh read-only reviewer elkészítette a teljes user-facing string inventoryt,
  szétválasztotta a copyt a tiltott wire/domain kulcsoktól, és bizonyította az
  `eventId`, EXIF fallback, helyi idő, a11y és dark-mode réseket.
- A kanonikus legacy EHS `ReportIncidentRequest`/validator/idempotency handler
  forrásból visszaellenőrizve: `EventId` és GUID `ReporterId` kötelező;
  duplikált `EventId` 200-zal ugyanazt az eventet adja vissza.
- Implementáció a fenti fájlzár és stop-klauzulák mellett indul; commit/deploy
  nincs, végső review nélkül `done` státusz nem adható.

### 2026-07-23 — leállítási checkpoint

- Gábor kérésére az aktív `ehs_wizard_ingest` agent megszakítva; Vite/Vitest
  háttérfolyamat és 4174-es listener nem maradt.
- Részleges módosítás van a wizard/copy/date/dialog, reporter/eventId ingest,
  incident MSW, photo service és image compression fájlokban.
- A legutóbbi `IncidentReportWizard.test.tsx` átírás óta nem futott teljes
  célzott teszt, teljes EHS suite, ESLint, TypeScript/build vagy vizuális QA.
- A slice **nem reviewzott és nem commitolható kész állapotként**. Folytatáskor
  először diff-review és a fenti acceptance teljes újrafuttatása szükséges.
- Commit, push és deploy nem történt.

### 2026-07-23 — root-átvétel, befejezés és merge

- Codex leállása után a root átvette a szeletet (AGENT-CHANNEL.md-ben
  bejelentve) és többagentes workflow-ban fejezte be: 3 párhuzamos recon
  (tételes diff-audit a szerződés ellen / élő kapu-állapot / backend
  wire-igazság forrásból) → implementáció → 3-lencsés adverzariális review
  (ingest-kontraktus, a11y+copy+design, privacy+slice-A-őrzés) — **APPROVED
  első körben**.
- **Recon-baseline:** wizard-suite PIROS (2 bukó teszt), 2 TS-hiba,
  1 ESLint-hiba+1 warning; az EHS modul-suite zöld volt. A kanonikus ingest
  backend forrásból azonosítva: `src/spaceos-modules-ehs` `EventsController`
  (`api/ehs/events`) — nincs legacy másolat, nincs kétértelműség.
- **Codex kész részei igazolva:** magyar copy-szótár (incidentWizardCopy.ts
  egyetlen forrás, wire-kulcsok érintetlenek), idempotens top-level `eventId`
  + OIDC `sub` reporter fail-closed + draft-persistencia, EXIF fail-closed
  photo pipeline (JPEG/PNG + 10 MB guard), DST-biztos `incidentWizardDate`
  helper + tesztek, dialog a11y, semantic tokenek.
- **Root által befejezett/javított:** MSW backend-minimum tükrözés
  (locationId kötelező + max-hosszak: 500/2000/100 — a mock nem lehet zöld,
  ahol a valós host 400-at ad); az ingest-teszt nem kodifikálja többé a
  `locationId:null→201` hibás szerződést; **valódi wizard-bug**: sikeres
  beküldés után a `handleClose()` `isSubmitting` alatt némán no-op volt, így
  az `onClose` sosem futott le — most közvetlen `onClose()` hívás; 2 piros
  teszt javítva (focus-restore stabil fával, toast-alert ütközés); TS-hibák
  a store-tesztben; exhaustive-deps warning; offline notice copy csak
  bizonyított viselkedést ígér (a sosem hívott `startRetryService`
  automatikus-retry ígérete és a hamis `/3` számláló eltávolítva).
- **Kapuk (root által függetlenül is újrafuttatva):** wizard/store/utils
  **30/30**, EHS suite **141/141** (slice-A tesztszám nem csökkent), ESLint
  0 hiba/0 warning az érintett fájlokon, `npm run build` PASS (wizard/mock
  kód csak a dinamikus MSW chunkban), boundary **15/15, 0 új**.
- **Merge:** mindkét szelet atomikusan `joinerytech-portal@1f3ca31`
  (a megosztott mock-substrate miatt), platform-pin frissítve.
- **Nyitva a done-hoz:** manuális mobil+desktop+dark vizuális QA (Gábor).
- **Külön követendő maradványok (nem e task scope-ja):**
  `property→HazardousCondition` contract-döntés (tiltott scope volt);
  Authorization header hiánya platform-szintű (MSW→API élesítés wave-2);
  `AuthContext` pre-existing ESLint-hiba (129. sor, facility-bootstrap
  effect); presign name/size/mime vs. tömörített fájl eltérés (valós S3
  presign-nál rendezendő); MSW timestamp-parse és clock-skew tükrözés.
