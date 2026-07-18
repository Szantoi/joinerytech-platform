# F2-DMS-FE — DMS modul-képernyők + adatréteg (Fázis 2, 7. — UTOLSÓ modul)

- **Szerep:** frontend · **Státusz:** ✅ done (2026-07-15) · **Fázis:** F2
- **Előfeltétel:** F2-QA-FE (érett adatréteg-sablon, 6. iteráció), F2-MAINTENANCE/HR-FE (calc-tükör + M1 config-lecke), F2-EHS/CRM-FE (`services/fsmGuards`), F1 primitívek
- **Akcent:** violet — a portál `docs` világ-kulcsa a `worldAccents.ts`-ben a spec kanonikus `dms` nevére képződik (`[data-world="dms"]`, light+dark tokenek az index.css-ben készen álltak)

## Feladat

A DMS (dokumentumkezelés: verziózott dokumentum-regiszter + jóváhagyás-folyam
+ lejárat-figyelés) modul portál-oldali kiépítése a bevált adatréteg-mintára —
ezzel MIND A 7 platform-modul a típusos mintán fut. **F0-előzmény:** a portál
docs-oldala statikus mockból (`mocks/docs.ts`) renderelt, FSM-átmenetek,
adatréteg és MSW-kontraktus nélkül.

1. **Adatréteg** (`src/services/dms/`): zod + TanStack Query + dokumentum-FSM
   a közös `services/fsmGuards`-szal; SZÁMÍTOTT `releasedVersion`/`expiry`
   mezők + állomány-statisztika calc-tükörrel.
2. **Képernyők:** Áttekintés (KPI-k + státusz-eloszlás + lejáró/ellenőrzésre
   váró listák), Könyvtár (kereső + státusz/típus-mappa chipek +
   kapcsolat-mappa + detail-SlideOver verziótörténettel és
   jóváhagyás-folyammal), Lejáró/felülvizsgálat (config-vezérelt ablak).
3. **Tesztek** + teljes suite + build + tsc + lint.

### ⚠️ Backend-gap (follow-up a backend terminálnak)

A backend `src/dms` Document-magja **domain-modell + OpenAPI-kontraktus** —
futtatható endpoint-rétege NINCS (F2-DMS-FE felmérés):

- **Nincs API-host/handler a Document aggregátumhoz.** A domain gazdag
  (Document aggregátum, DocumentVersion value object SHA-256 hash-sel,
  EntityLink/Permission, 17 domain event) és az `openapi.yaml` teljes
  endpoint-felületet definiál (`/api/dms/documents` + versions/links/
  permissions/search), de nincs `Program.cs`/`*Endpoints.cs`, nincs
  `IDocumentRepository`-implementáció, és az öt domain-service interfész
  (IBlobStorageService, IDocumentVersioningService, …) implementálatlan.
  Kizárólag a **DocumentCategory + Tag** szelet handler-kész (host nélkül).
- **Jóváhagyás-folyam NINCS a backendben:** a `DocumentStatus` enum
  Active/Archived/Deleted — review/kiadás állapot, Approval entitás sehol.
  A prototípus (`docs/joinerytech/data-docs.js` DOC_FLOW) és a spec fsmTones
  `dmsDokumentum` készlete viszont a `piszkozat → ellenorzes → kiadott →
  archivalt` jóváhagyás-kaput definiálja. A kiírás szerint futtatható
  DMS-backend híján **a prototípus az irányadó, az MSW-kontraktus a
  rögzítendő előkép** — a kliens-FSM a DOC_FLOW 1:1 tükre; a backend
  `archive/unarchive/restore` ↔ kliens `archive/reopen` megfeleltetése és a
  review-státuszok backend-bevezetése ADR-döntés.
- **Fájl-tartalom:** blob-feltöltés nincs — a prototípus mintájára a
  `fileLabel` jelképezi a fájlt; valódi multipart/presigned-url folyam a
  backend-bekötéskor.
- **Lejárat a szerverről:** `GET /search/expiring|expired` az openapi-ban
  definiált — a kliens `expiring=true` szűrője ennek előképe.
- **`dms.manage` jogosultság UI-STUB** (`permissions.ts`): auth-bekötéskor
  csak a `useDmsPermissions` belseje cserélendő.
- **Scope-on kívül maradt:** DocumentCategory-fa és Tag-kezelés (a backend
  egyetlen kész szelete — törzsadat-képernyő külön task; a könyvtár
  mappa-tengelye addig a prototípus `linkType` kapcsolat-mappája),
  EntityLink-kezelés UI, Permission-mátrix, Folder aggregátum (backend Phase 2).

## Kivitelezés

### 1. Adatréteg (`src/services/dms/` — ld. `services/dms/README.md`)
- `fsm.ts`: **DOCUMENT_FSM** — a prototípus DOC_FLOW tükre, az EGYETLEN
  átmenet-forrás UI és MSW alá (közös `services/fsmGuards`):
  `submit` (piszkozat→ellenorzes), `approve` (ellenorzes→kiadott), `reject`
  (ellenorzes→piszkozat — visszautasítás-ág), `recall` (kiadott→ellenorzes —
  felülvizsgálat), `archive` (piszkozat|kiadott→archivalt; ellenőrzés ALATT
  nem archiválható), `reopen` (archivalt→piszkozat). Nevesített guardok:
  `DOCUMENT_WORKFLOW_OPEN_STATUSES`/`isDocumentInReview` (KPI-k),
  `uploadVersionBlockReason` (archiváltra nincs új verzió — a backend
  `AddVersion()`/Deleted-tiltás tükre; UI-gomb + MSW 409 közös feltétele),
  `rejectReasonBlockReason` (visszautasítás csak indokkal — UI-beküldés +
  MSW 400), `versionFieldsBlockReason` (fájl-címke + változás-jegyzet
  kötelező — DocumentVersion.ChangeNotes tükör).
- `calc.ts`: `releasedVersionInfo` = a prototípus `DocsEngine.runtimeVersion()`
  tükre — a műhely/CNC a legutolsó KIADOTT verziót használja (clear/pending/
  blocked ágak); `expiryState`/`daysUntilExpiry` (lejárat a config-ablakkal);
  `docStats` (`DocsEngine.stats()`). A `releasedVersion` és `expiry` mezők
  SZÁMÍTOTTAK: az MSW kiszolgáláskor adja, a kliens csak megjeleníti.
  **Ugyanezt futtatja a UI és az MSW.** Dátum-helperek helyi idővel
  (`parseDay` — nincs UTC-csapda; a Maintenance-M1 lecke már beépítve:
  a `labels.ts` formázói is parseDay-en át bontanak).
- `documents.ts`: zod-sémák + fetcherek + hookok; az átmenet **optimista**
  (detail-cache azonnal, 409-nél rollback + hiba-toast); `useUploadVersion`
  külön mutáció (nem optimista — a verziószámot a szerver lépteti),
  siker-toast a rögzített verziószámmal.
- **Rule-6 invalidálás:** a verziószám/státusz a lista ÉS a detail nézetben
  is derivált → a verzió-mutáció ÉS az FSM-átmenet a `documents` +
  `document` (detail — KÜLÖN prefix!) kulcsokat egyaránt invalidálja.
- `keys.ts` (hierarchikus kulcs-gyár, detail-csapda dokumentálva),
  `permissions.ts` (`dms.manage` stub), `config.ts` (`DMS_API_BASE`,
  `EXPIRY_WARN_DAYS`, `RECENT_DOCS_LIMIT` — QUALITY.md 3. + HR-review
  M1-lecke: a küszöb sosem literál a UI-ban).

### 2. MSW kontraktus-tükör (`src/mocks/dmsApi/`)
- Állapottartó store (`db.ts`, `resetDmsDb()`), közös `guardTransition` →
  tiltott FSM-átmenet **409**; visszautasítás indok nélkül / hiányos
  verzió-mezők **400**; archivált dokumentum verzió-feltöltése **409**
  (AddVersion-tükör); ismeretlen id **404**.
- `seed.ts`: a prototípus DOCUMENTS_SEED faipari törzse (kiviteli rajzok,
  keretszerződés, FSC/CE tanúsítványok, élzárás-SOP) KANONIKUS kulcsokkal —
  8 dokumentum: státuszonként legalább egy + lejárat-esetek (lejárt kiadott
  tanúsítvány, ablakon belül lejáró szerződés, ablakon KÍVÜLI SOP a
  küszöb-ellenpróbához, archivált lejárt CE a kizárás-teszthez) + runtime-
  esetek (v2 ellenőrzés alatt kiadott v1-gyel; sosem kiadott v1 → blocked);
  dátumok a „mához" képest relatív eltolással (`seedDay`), stabil
  `DMS_SEED_IDS`.
- **Verzió-lánc kezelés:** `POST /:id/versions` → verziószám-léptetés
  (`version+1`), a korábbi verziók MEGŐRZÉSE, az új verzió `piszkozat`
  munkapéldány (újra jóváhagyandó — a kiadott korábbi verzió marad az
  érvényes). A review-akciók (submit/approve/reject/recall) az AKTUÁLIS
  verzió lánc-bejegyzésének státuszát is frissítik — recall után a műhely a
  KORÁBBI kiadottra esik vissza; archive/reopen a láncot nem érinti (a
  kiadás ténye megőrzött történet).
- A `releasedVersion`/`expiry` kiszolgáláskor számítódik (`serveDocument` —
  `services/dms/calc`, egy igazságforrás); `expiring=true` szűrő = lejárt +
  ablakon belül lejáró, archivált NÉLKÜL, legkorábbi érvényesség elöl.

### 3. Képernyők (`src/pages/dms/`; `DocsPage.tsx` 193 soros statikus-mock oldal → 36 soros diszpécser; worlds-config: `dash/files` fülök → **dash/library/expiring**, sub frissítve — csak a saját világ-sor)
- **Áttekintés** (`DmsDashboard`): 4 KPI (összes dokumentum, kiadott,
  ellenőrzésre vár, lejáró/lejárt — alcím a config-küszöbből) +
  státusz-eloszlás sáv-vizualizáció (szín+szöveg, sr-only összefoglalóval),
  ellenőrzésre váró és lejáró dokumentumok listái, legutóbbi dokumentumok
  (`RECENT_DOCS_LIMIT`) — minden érték a hookokból.
- **Könyvtár** (`LibraryScreen` + `DocumentDetailSlideOver`): DataTable
  kettős render, SZERVER-oldali kereső (q) + státusz-chipek + típus-mappa
  chipek (S2-minta: pipa + font-semibold + 44 px touch-cél) +
  kapcsolat-mappa választó (a prototípus DOC_LINK_META tengelye); „Érvényes
  verzió" oszlop a számított releasedVersion-nel; detail: **FsmStepper**
  (piszkozat → ellenőrzés → kiadott; archivált mellékállapot),
  **érvényes-verzió sáv** (runtimeVersion-tükör: clear/pending/blocked
  ágak), metaadat-rács (kapcsolat, érvényesség hátralévő napokkal, fájl),
  **verziótörténet-idővonal** (soronkénti aria-label, verziónkénti
  státusz-pill, az érvényes kiadott verzió jelölve), átmenet-gombsor —
  tiltott akció `disabledReason`-nel (aria-disabled + tooltip, SOSEM
  rejtett), indok-lánc: folyamatban → `dms.manage` → FSM-guard; űrlapos
  akciók: jóváhagyás (opcionális megjegyzés), **visszautasítás (kötelező
  indok** — a beküldés-guard és az MSW 400 ugyanabból a függvényből),
  felülvizsgálat (opcionális indok), **új verzió feltöltése** (fájl-címke +
  változás-jegyzet kötelező; archiváltnál 409-tükör gomb-tiltás).
- **Lejáró / felülvizsgálat** (`ExpiringScreen`): a szerver-oldali
  `expiring=true` szűrő (backend /search/expiring előkép); DataTable
  érvényességi dátummal + hátralévő napokkal („12 nap múlva" / „10 napja
  lejárt"), lejárat-pillek; az alcím és a jelmagyarázat a configból
  számított (sosem literál).

## Eredmény

- A DMS a **hetedik — utolsó — modul** a típusos adatréteg-mintán: mind a
  7 platform-modul (CRM, Kontrolling, HR, Maintenance, QA, EHS, DMS) élő,
  MSW+Query vezérelt világ. Először modellez a kliens **verzió-láncot**
  (léptetés + megőrzés + a kiadott verzió mint számított „futtatható"
  állapot) és **lejárat-figyelést** config-ablakkal.
- A jóváhagyás-folyam (submit/approve/reject/recall) a payload-guardokkal
  (kötelező visszautasítás-indok, kötelező verzió-mezők) a QA-ban bevált
  „UI-beküldés ↔ MSW 400 közös függvényből" mintát követi.
- Build zöld; a DMS lazy chunk 28,42 kB raw / 7,35 kB gzip.

## Fájlok

**ÚJ** — adatréteg: `src/services/dms/{config,keys,fsm,calc,permissions,documents,index}.ts` + `README.md`
**ÚJ** — MSW: `src/mocks/dmsApi/{seed,db,handlers.documents,index}.ts`
**ÚJ** — képernyők: `src/pages/dms/{labels.ts,DmsDashboard,LibraryScreen,ExpiringScreen,DocumentDetailSlideOver}.tsx`
**MÓDOSÍTVA:** `src/pages/DocsPage.tsx` (193→36 sor diszpécser), `src/mocks/handlers.ts` (+dmsApiHandlers, csak bővítés), `src/mocks/worlds.ts` (docs képernyők: dash/files→dash/library/expiring, sub — csak a saját világ-sor)
**TESZT:** ÚJ `src/services/dms/__tests__/{documentFsm,calc,dmsApi}.test.ts`, `src/pages/dms/__tests__/{dmsTestUtils.tsx,dmsScreens.smoke.test.tsx,dmsFlow.test.tsx}`; ÚJRAÍRVA `src/pages/__tests__/DocsPage.test.tsx` → `DmsPage.test.tsx` (statikus-mock asszertek helyett MSW + route-diszpécser)
**VÁLTOZATLAN:** `src/mocks/docs.ts` (a theme/statusTones-teszt alias-forrása — csak a régi oldal importja szűnt meg) · QA/Maintenance/HR/CRM/EHS/Kontrolling fájlok (zároltak — csak import irányban használva: fsmGuards, QueryGate, ui-primitívek) · `App.tsx` (a `/w/docs` route már élt, nem kellett hozzányúlni)

## Tesztek

- **DMS-scope: 59/59 zöld** (6 fájl):
  - `documentFsm.test.ts` (12): fő út (piszkozat→ellenorzes→kiadott) +
    visszautasítás-ág (csak ellenőrzésből, vissza piszkozatba) + recall +
    archive (ellenőrzés alatt tiltott) + reopen (archiváltból csak ez) +
    jóváhagyás-kapu (piszkozatból nincs közvetlen kiadás) +
    blockReason-szöveg + nevesített guardok (workflowOpen/inReview/
    uploadVersion/rejectReason/versionFields).
  - `calc.test.ts` (14): dátum-helperek (helyi parseDay — nincs UTC-csapda,
    hónap-határ, előjeles nap-diff), lejárat-állapot (null/lejárt/aznap/
    ablak-határ/ablak+1, paraméterezhető küszöb), runtimeVersion-tükör
    (clear/pending/blocked/archivált-lánc/legmagasabb-kiadott), docStats.
  - `dmsApi.test.ts` (17, msw/node + `resetDmsDb`): lista-szűrők
    (status/type/linkType/q/expiring — archivált-kizárás + rendezés) + 404;
    SZÁMÍTOTT releasedVersion (pending/blocked) és expiry
    (lejárt/lejáró/ablakon kívül); FSM-lánc (submit/approve/reject/recall/
    archive/reopen + lánc-követés, reviewNote-tükör, **reject indok nélkül
    400**, recall után visszaesés a korábbi kiadottra) + 409 guardok;
    **verzió-lánc** (léptetés + megőrzés + piszkozat munkapéldány +
    releasedVersion változatlan + **rule-6 a kontraktusban**: a lista is az
    új verziót adja; archiváltra 409; hiányos mezők 400).
  - UI (16): smoke mind a 3 képernyőre (KPI-k + sr-only eloszlás,
    szerver-szűrők + S2-chipek + kereső, SlideOver stepper+verziótörténet+
    érvényes-verzió sáv, lejáró-nézet archivált-kizárással és config-
    felirattal); **FSM-folyam** (tiltott gomb aria-disabled + tooltip +
    elnyelt kattintás; submit-átbillenés; visszautasítás kötelező indokkal +
    rule-6 lista-pill; jóváhagyás → érvényes-verzió sáv átáll;
    verzió-feltöltés mező-guard + verziószám-léptetés + rule-6
    lista-frissülés; archiváltnál tiltott feltöltés + engedélyezett
    újranyitás; `dms.manage` letiltva → jogosultsági indok); DmsPage
    route-teszt (5 eset, SlideOver-nyitással + fallback).
- **Teljes suite:** `npx vitest run` → **1414 passed / 19 failed (1433)** — a
  19 bukás a dokumentált, DMS-től független pre-existing készlet
  (BOMPreviewCard×2, configurator/wizard×3, catalogFilterPersistence,
  ProcurementPage, WorkOrderSummary); DMS-fájl nincs köztük, új bukás nincs
  (baseline: 1370/19 — a delta +44 = 59 új teszt − 15 törölt régi
  DocsPage-teszt).
- **Build:** `npm run build` ✅ (DMS chunk 28,42 kB / 7,35 kB gzip) ·
  **tsc -b** tiszta · **ESLint** az érintett fájlokra tiszta.

## Nyitott kérdések / follow-up

1. **Document endpoint-réteg (G-DMS):** host + handler + repository +
   blob-implementáció a `mocks/dmsApi/handlers.documents.ts` route-készlet
   és a `services/dms` zod-sémák kontraktus-előképe szerint.
2. **Jóváhagyás-folyam ADR:** a backend Active/Archived/Deleted ↔ a spec/
   prototípus piszkozat/ellenorzes/kiadott/archivalt készletének feloldása
   (backend-bővítés review-státuszokkal vagy külön Approval-workflow).
3. **QueryGate-promótálás** (QA-review M1, „DMS-review előtt zárandó"): a
   DMS már a 7. importőr a `pages/ehs/QueryGate`-re — `components/ui`-ba
   emelés külön mini-task (az EHS-fájlok zárolása miatt nem itt történt).
4. **Közös date-utils kiemelés:** immár NÉGY modul (hr, maintenance, qa,
   dms) hordoz azonos dátum-helpereket → `services/dateUtils.ts`
   (F2-QA-FE 8. follow-up megerősítve).
5. **DocumentCategory/Tag törzsadat-képernyő** (a backend kész szelete) +
   a könyvtár mappa-tengelyének átállítása kategória-fára.
6. **EntityLink-navigáció:** a kapcsolat (projekt/rendelés/cikkszám) most
   címke — kereszt-világ link a cél-világok detail-nézeteire külön task.
7. **`dms.manage` claim-forrás:** auth-bekötés (a `useDmsPermissions` belseje).
8. **Valódi fájl-folyam:** presigned-url/multipart feltöltés + letöltés a
   blob-réteg implementálása után (`fileLabel` kivezetése).
