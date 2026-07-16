# F2-DMS-REVIEW — DMS modul designer review (Fázis 2, 7. — UTOLSÓ modul)

> **Kiadta:** designer terminál — 2026-07-16
> **Epic:** `EPIC-UI-PORTAL-2026Q3` / F2-DMS-REVIEW
> **Kontraktus:** `docs/knowledge/architecture/UI_IMPLEMENTATION_PLAN_2026-07-14.md` (DMS: accent violet — 17. sor; dokumentum-életciklus FSM + verziózás + entitás-linkek — 43. sor; FSM: `piszkozat → ellenorzes → kiadott → archivalt` — 69. sor), `docs/knowledge/patterns/DESIGN_SYSTEM_SPEC_V1.md` (1.3 `[data-world="dms"]` — 182-194. sor; 1.5 `dmsDokumentum` — 314-317. sor), precedensek: EHS/CRM/Kontrolling/HR/Maintenance/QA review-k (`docs/knowledge/qa/`)
> **Vizsgált kód:** `src/joinerytech-portal` main@`449bf0c` (F2-DMS-FE: `f135f69` — `src/services/dms/`, `src/mocks/dmsApi/`, `src/pages/dms/`, `src/pages/DocsPage.tsx` + tesztek; F2-CROSSCUT-FIX: `449bf0c` — QueryGate-promótálás + HR-küszöb + dateUtils)
> **Módszer:** teljes DMS-diff átolvasás a terv + a hat korábbi modul-review érett szempontrendszere ellen, tesztfuttatás (DMS-scope-ú vitest: **6 fájl / 59 teszt — mind zöld**, bontás lent) + a QA-review 3 vállalt utóellenőrzése (a crosscut-fix igazolása). Portal-fájl nem módosult (read-only review).

---

## Összesített verdikt: ✅ APPROVED

Az F2-DMS a sablon **hetedik, utolsó iterációja — sorozatban a NEGYEDIK
fix-kör nélküli modul**, és ezzel a Fázis 2 modul-sora TELJES (7/7). A
review-szempont magja hiánytalan: a `DOCUMENT_FSM` az EGYETLEN
átmenet-forrás a UI és az MSW alatt (tiltott átmenet → 409 a közös
`guardTransition`-ön át), az FSM-en TÚLI guardok — `uploadVersionBlockReason`
(archiváltra nincs új verzió — AddVersion-tükör, UI-gomb ↔ MSW **409**),
`rejectReasonBlockReason` (kötelező visszautasítás-indok, UI-beküldés ↔ MSW
**400**), `versionFieldsBlockReason` (fájl-címke + változás-jegyzet, UI ↔
MSW **400**) — mind SZÓ SZERINT ugyanabból a függvényből adják a gomb
`disabledReason`-jét és a mock hibaválaszát. A modul megkülönböztető
domain-értéke, az **érvényes-kiadott-verzió tükör** (`releasedVersionInfo` =
a prototípus `DocsEngine.runtimeVersion()`-je) példásan él: a
`releasedVersion`/`expiry` mezőt a kliens SOSEM számolja, az MSW
kiszolgáláskor adja ugyanabból a calc-ból (a seed Omit-típussal kényszeríti
ki, hogy ne is tárolódhasson). A rule-6 (documents lista + document DETAIL
külön prefix) kontraktus- ÉS UI-tesztben fedett, a verzió-mutációra is.
A crosscut-fix (449bf0c) mindhárom vállalt tétele kódban igazolva — a DMS
már a promótált `components/ui` QueryGate-et importálja. **Blokkoló hiba
nincs, M-szintű sincs**; öt apró (N) tétel follow-upként rögzítve.

| Terület | Verdikt |
|---|---|
| 1. FSM egy igazságforrásból (`fsm.ts` + közös `fsmGuards`; UI ÉS MSW 409) | ✅ APPROVED |
| 2. Payload/státusz-guardok: reject-indok + verzió-mezők + archivált-tiltás UI ↔ MSW közös fv. | ✅ APPROVED |
| 3. `calc.ts` tükör (runtimeVersion + expiry + docStats — számított mezők, kliens sosem számol) | ✅ APPROVED |
| 4. Verzió-lánc: léptetés + megőrzés, új verzió piszkozat munkapéldány, recall-fallback | ✅ APPROVED |
| 5. Rule-6 invalidálás: `documents` lista + `document` DETAIL (külön él), verzió-mutációra is | ✅ APPROVED |
| 6. MSW kontraktus-tükör (`mocks/dmsApi/`): 409 FSM + 409 archivált-verzió, 400 payload, 404 | ✅ APPROVED |
| 7. Képernyők vs terv (3 képernyő + detail-SlideOver, violet akcent, `docs`→`dms` leképezés) | ✅ APPROVED |
| 8. S1-osztály: DataTable saját scroll-régió (primitívben); eloszlás sr-only összefoglalóval | ✅ APPROVED |
| 9. S2-osztály: chip-affordanciák (pipa + font-semibold + 44 px touch-cél, 2 chip-sor) | ✅ APPROVED |
| 10. Verziótörténet-idővonal + SlideOver a11y (ul/li aria-label, dialog, aria-busy, role=alert) | ✅ APPROVED |
| 11. Tokenek / violet / dark / nyerspaletta-fegyelem (minden rose-osztály dark-páros) | ✅ APPROVED |
| 12. Config-küszöbök (`EXPIRY_WARN_DAYS`, `RECENT_DOCS_LIMIT`) — nincs literál a UI-ban | ✅ APPROVED |
| 13. Loading/empty/error + magyar címkék (labels.ts), badge egyezik a seeddel („2 ellenőrzés") | ✅ APPROVED |
| 14. Tesztek | ✅ 59/59 zöld (6 fájl) |

---

## Blokkoló hibák

**Nincs.** (Negyedszer egymás után a Fázis 2-ben — a sablon lezárható.)

---

## Jóváhagyott területek (részletek)

### 1. FSM-integritás ✅ — a DOCUMENT_FSM az EGYETLEN átmenet-forrás

`src/services/dms/fsm.ts:32-40` — a prototípus DOC_FLOW 1:1 tükre a közös
`services/fsmGuards`-on: `submit` (piszkozat→ellenorzes), `approve`
(ellenorzes→kiadott), `reject` (ellenorzes→piszkozat), `recall`
(kiadott→ellenorzes), `archive` (piszkozat|kiadott→archivalt — ellenőrzés
ALATT tudatosan tiltott, kommentelve), `reopen` (archivalt→piszkozat).

- **Backend-gap dokumentált ADR-follow-uppal** (`fsm.ts:17-22` +
  `services/dms/README.md` 60-77. sor): a backend `src/dms` Document-magja
  Active/Archived/Deleted életciklusú, jóváhagyás-folyama és futtatható
  endpoint-rétege NINCS — a kiírás szerint a prototípus az irányadó, az
  MSW-kontraktus a rögzítendő előkép. A QA-review ADR-gyakorlata folytatódik.
- **UI:** a detail gombsor indok-lánca pending → `dms.manage` →
  `transitionBlockReason` (`DocumentDetailSlideOver.tsx:79-82`); mind a
  6 FSM-gomb + a verzió-feltöltés MINDIG látszik, a tiltott `disabledReason`-t
  kap (aria-disabled + tooltip a Button primitívvel) — UI-tesztben az elnyelt
  kattintás is asszertált (`dmsFlow.test.tsx:62-64`).
- **MSW:** minden átmenet-handler a közös `guardTransition`-ön megy át
  (`mocks/dmsApi/db.ts:60-71`) → tiltott átmenet 409 a szabálysértést leíró
  üzenettel; kontraktus-tesztben 4 tiltott út fedett (`dmsApi.test.ts:136-144`).
- **Nevesített guardok** (isTicketOpen-minta):
  `DOCUMENT_WORKFLOW_OPEN_STATUSES`/`isDocumentWorkflowOpen` és
  `isDocumentInReview` (`fsm.ts:53-64`) — a dashboard KPI-k közös feltételei.

### 2. A review-szempont magja: guardok UI ↔ MSW közös forrásból ✅

- **`uploadVersionBlockReason`** (`fsm.ts:71-75`, a backend `AddVersion()`
  Deleted-tiltásának tükre): a „Új verzió feltöltése" gomb `disabledReason`-je
  (`DocumentDetailSlideOver.tsx:128`) ÉS az MSW **409**-e
  (`handlers.documents.ts:169-170`) — ugyanaz a függvény. UI-tesztelt
  (archivált CE-n tiltott gomb + tooltip, `dmsFlow.test.tsx:161-170`) és
  kontraktus-tesztelt (409, `dmsApi.test.ts:166-170`).
- **`rejectReasonBlockReason`** (`fsm.ts:82-86`, QA reject-precedens): a
  visszautasítás-űrlap beküldés-gombja (`DocumentDetailSlideOver.tsx:167`)
  ↔ MSW **400** (`handlers.documents.ts:122-123`). Mindkét rétegben tesztelt
  (üres indok → aria-disabled + elnyelt kattintás; MSW 400 üzenet-egyezés).
- **`versionFieldsBlockReason`** (`fsm.ts:93-97`, DocumentVersion.ChangeNotes
  tükör): a verzió-űrlap gombja (`DocumentDetailSlideOver.tsx:227`) ↔ MSW
  **400** (`handlers.documents.ts:173-174`) — mező-sorrendben is egyező
  hibaüzenetek, mindkét rétegben tesztelt.

### 3. `calc.ts` tükör ✅ — számított mezők, a kliens sosem számol

- `releasedVersionInfo` (`calc.ts:50-67`): a műhely a legutolsó KIADOTT
  verziót használja; pending (kiadásra váró munkapéldány) és blocked (sosem
  volt kiadás → gyártásban nem használható) ágakkal. Az MSW kiszolgáláskor
  adja (`db.ts:38-44` `serveDocument`), a seed a `releasedVersion`/`expiry`
  mezőt NEM tartalmazhatja (`seed.ts:36` — `Omit`-típussal kikényszerítve,
  a QA `blocking`/`openTickets` minta) ✔
- `expiryState`/`daysUntilExpiry` (`calc.ts:79-94`): a lejárat-ablak
  KIZÁRÓLAG configból (`EXPIRY_WARN_DAYS` default-paraméter); a validUntil
  napja még 'lejaro', nem 'lejart' (aznap érvényes — tesztelt határeset) ✔
- A dátum-helperek a KÖZÖS `services/dateUtils`-ból re-exportálva
  (`calc.ts:29` — a crosscut-fix után az első modul, amely már eleve a
  közös helyi-idejű helperekre épül; UTC-csapda kizárva) ✔
- Seed: 8 dokumentum stabil `DMS_SEED_IDS`-szel, relatív nap-eltolással —
  minden státusz, mindkét lejárat-eset + ablakon kívüli ellenpróba + sosem
  kiadott (blocked) eset determinisztikusan előáll (`seed.ts:21-30`) ✔

### 4. Verzió-lánc ✅ — a modul domain-magja hibátlan

- `POST /:id/versions`: verziószám-léptetés, a korábbi verziók MEGŐRZÉSÉVEL;
  az új verzió `piszkozat` munkapéldányként indul (újra jóváhagyandó), a
  dokumentum státusza is visszaáll (`handlers.documents.ts:165-192`) ✔
- A review-akciók (submit/approve/reject/recall) az AKTUÁLIS verzió
  lánc-bejegyzésének státuszát is frissítik (`applyTransition`
  `trackCurrentVersion` ága, `handlers.documents.ts:37-50`) — ebből
  számítódik az érvényes kiadott verzió; az archive/reopen NEM nyúl a
  lánchoz (a kiadás ténye megőrzött történet — kontraktus-tesztelt:
  `dmsApi.test.ts:127-134`) ✔
- **Recall-fallback** (a runtimeVersion-tükör legszebb esete): kiadott v3
  felülvizsgálatba vonása után a műhely a korábbi kiadott v2-re esik vissza —
  kontraktus-tesztben asszertált (`dmsApi.test.ts:119-125`), a UI-ban az
  érvényes-verzió sáv + a lista „érvényes: vN" alsora jeleníti meg
  (`ReleasedVersionBanner`, `LibraryScreen.tsx:96-100`) ✔

### 5. Rule-6 kereszt-invalidálás ✅

`documents.ts:169-175` (`useInvalidateDocuments`): a `documents` lista-prefix
ÉS a `document` DETAIL-prefix (külön él — a kulcs-gyár fejkommentje a CRM
S2-leckére explicit figyelmeztet, `keys.ts:6-8`) egyaránt invalidálódik;
MINDKÉT mutáció-hook (transition + verzió-feltöltés) ezt használja. A
verziószám/státusz/releasedVersion a lista nézetben IS derivált → a
keresztkötés kontraktus-tesztben (`dmsApi.test.ts:159-163` — a lista a
feltöltés után az új verziót adja) ÉS UI-tesztben (`dmsFlow.test.tsx:103-107`
reject után lista-pill; `:154-158` verzió-feltöltés után „érvényes: v3" a
sorban) fedett. Kereszt-MODUL derivált adat nincs — az invalidálás helyesen
modulon belüli (a QA aszimmetria-precedens analógiája). Az optimista átmenet
a bevált minta: onMutate célállapot, onError rollback + szerver-üzenet
toastban, onSettled invalidálás (`documents.ts:198-222`) ✔

### 6. MSW kontraktus-tükör ✅

- Állapottartó store + `resetDmsDb()` (`db.ts`); szerver-oldali szűrők:
  status/type/linkType/q + `expiring=true` (lejárt + ablakon belüli, archivált
  NÉLKÜL, legkorábbi érvényesség elöl — a backend `GET /search/expiring`
  előképe, `handlers.documents.ts:72-79`); rendezettség dokumentált ✔
- Invariánsok: tiltott FSM-átmenet → **409**, archivált verzió-feltöltés →
  **409**, indok/mező-hiány → **400**, ismeretlen id → **404**; a reject
  indoka a `reviewNote`-ba kerül; az approve opcionális megjegyzése szintén ✔

### 7. Képernyők vs terv ✅ (dash + library + expiring + detail-SlideOver)

- **Worlds-config:** dash / library / expiring (`mocks/worlds.ts:244-254`),
  `accent: violet`; a `DocsPage` 36 soros vékony diszpécser route-tesztekkel
  (fallback-ág is tesztelt); a világ-kulcs (`docs`) → spec-név (`dms`)
  leképezés a `worldAccents.ts:19`-ben dokumentált ✔. A világ-kártya badge
  („2 ellenőrzés") a seeddel EGYEZIK (2 ellenorzes státuszú dokumentum) —
  a Kontrolling N2 hiba nem ismétlődött ✔
- **Áttekintés:** 4 KPI kizárólag hookokból (a lejáró-KPI alcíme a
  config-ablakból SZÁMÍTOTT — sosem literál); státusz-eloszlás sáv-lista
  `aria-hidden` + sr-only szöveges összefoglaló; ellenőrzésre váró + lejáró
  listák sor-kattintásra SlideOverrel, képernyő-linkekkel ✔
- **Könyvtár:** DataTable kettős render, SZERVER-oldali szűrés (q + státusz-
  és típus-chipek + kapcsolat-mappa select — a prototípus DOC_LINK_META
  tengelye); az „Verzió" oszlop a runtimeVersion-tükröt hordozza ✔
- **Dokumentum-részletek:** FsmStepper a fő úton (archivalt mellékág
  `sideLabel`-lel), érvényes-verzió sáv HÁROM ággal (kiadott / pending a
  korábbi kiadottal / blocked `role="note"` figyelmeztetés), verziótörténet-
  idővonal (ul+li soronkénti `aria-label`, kiadott-verzió jelöléssel,
  legfrissebb elöl), 6 FSM-gomb + verzió-feltöltés indok-lánccal, 4 űrlapos
  akció (approve opcionális megjegyzés, reject KÖTELEZŐ indok, recall
  magyarázó szöveggel, verzió két kötelező mezővel) ✔
- **Lejáró / felülvizsgálat:** szerver-szűrt (`expiring=true`) DataTable,
  lejárat-pillek + hátralévő-napok szöveg; az alcím ÉS a darabszám-sor
  felirata a configból számított (`EXPIRY_WINDOW_LABEL`) ✔

### 8-10. A korábbi review-k hibaosztályai — mind megelőzve ✅

- **S1-osztály:** a DMS minden táblázata a közös DataTable-ben él, amely a
  scroll-régiót primitív-szinten hordozza (`DataTable.tsx:114-121` —
  role="region" + aria-label + tabIndex + fókusz-ring + sr-only caption);
  modul-szintű egyedi görgethető rács nincs — az S1-recept a primitívben ✔
- **S2-osztály:** mindkét chip-sor (státusz + típus-mappák,
  `LibraryScreen.tsx:30-49`) pipa-ikon (`aria-hidden`) + `font-semibold`
  nem-szín jelzést kap, `before:-inset-y-2` pszeudó adja a 44 px touch-célt,
  `aria-pressed` + `role="group"` — smoke-tesztben asszertált ✔
- **Eloszlás:** a vizuális sáv-lista `aria-hidden`, előtte sr-only szöveges
  összefoglaló (`DmsDashboard.tsx:129-135`); a darabszám minden soron
  látható szövegként ✔
- **SlideOver a11y:** F1 primitív (dialog), loading `aria-busy`, hiba
  `role="alert"`, a verziótörténet lista-szemantikával + soronkénti
  aria-labellel — route-tesztben és smoke-ban is fedett ✔

### 11. Tokenek / violet / dark ✅

- `[data-world="dms"]` light+dark változó-készlet (`index.css:174-185`) —
  **karakterre egyezik a spec 1.3 készletével** (DESIGN_SYSTEM_SPEC_V1
  182-194. sor); a képernyők KIZÁRÓLAG `world-*` tokent használnak akcentre,
  nyers violet-osztály SEHOL ✔
- A `pages/dms` fa ÖSSZES nyers paletta-osztálya szemantikus jelzőszín ÉS
  dark-páros (blocked-sáv `DocumentDetailSlideOver.tsx:55`, KPI-riasztás
  `DmsDashboard.tsx:109` — rose light/dark párokkal). A QA N2 (dark-pár
  nélküli grafikus kitöltés) hibaminta NEM ismétlődött ✔
- `dmsDokumentum` tónuskészlet a spec 1.5-tel egyező (`fsmTones.ts:56-59`);
  a típus/kapcsolat/lejárat lokális Tone-térképek a QA CHECKPOINT_TYPE_META
  precedens szerint a `labels.ts`-ben ✔
- Magyar címkék központi `labels.ts`-ben; a formázók a helyi idejű
  `parseDay`-jel (a közös dateUtils-ból) — UTC-csapda kizárva ✔

### 12. Config-küszöbök ✅

`config.ts`: `EXPIRY_WARN_DAYS=30`, `RECENT_DOCS_LIMIT=5` — a dashboard
KPI-alcím, az expiring-képernyő alcíme és a jelmagyarázat mind a configból
SZÁMÍTOTT sablon-string; számliterál-küszöb a `pages/dms` fában nincs ✔

---

## A QA-review 3 vállalt utóellenőrzése — MIND TELJESÜLT ✅ (crosscut-fix 449bf0c)

1. **M1 — QueryGate promótálás `components/ui`-ba: VÉGREHAJTVA.** A
   `QueryGate.tsx` git mv-vel a `components/ui`-ba került és a barrelből
   exportált (`components/ui/index.ts`); mind a 35 importáló fájl (7 modul,
   a DMS-sel együtt) a közös útvonalról importál — a `pages/ehs/QueryGate`
   útvonalra **0 hivatkozás** maradt (grep-pel igazolva). A DMS-review
   már a promótált importot ellenőrizte — a vállalás szerint a 7. importőr
   már NEM a régi útvonalon született.
2. **HR-M1-THRESHOLD: JAVÍTVA.** A `HrDashboard.tsx`-ben nincs többé
   küszöb-literál (grep: se `85`, se `pct >`); a terhelés-sáv tónusa a
   config-vezérelt `loadBand`-ből dől el (`HrDashboard.tsx:195-197` →
   `services/hr/calc.ts:178-181` → `UTILIZATION_WARN_THRESHOLD`,
   `services/hr/config.ts:20`) — a Dolgozók-képernyő pilljeivel közös
   küszöb-forrás, calc-tesztben fedve.
3. **Maintenance-M1 (UTC-parse): JAVÍTVA.** Az új közös
   `services/dateUtils.ts` (helyi idejű `parseDay`/`formatDay`/`addDays`/
   `diffDays`, magyarázó fejkommenttel) kiváltotta a 4 modul-calc
   duplikátumát (re-exporttal — modul-API változatlan); a
   maintenance/hr/crm/controlling `labels.ts` nap-szintű formázói mind
   `parseDay`-t használnak, `new Date(iso)` nap-kulcsra e négy modulban
   nem maradt. *Státusz-megjegyzés:* a QA `labels.ts:144,150` továbbra is
   `new Date(iso)`-val parszol — ott datetime-stringek érkeznek
   (`YYYY-MM-DDTHH:mm` → helyi parse, jelenleg NEM hibás), de a QA-review
   vállalt dateUtils-átállása még nyitott backlog-tétel (nem DMS-hiba).

---

## Kért javítások (nem blokkoló) és megjegyzések

- **N1 — Űrlap-inputok kézi stílussal, `aria-required` nélkül**
  (`DocumentDetailSlideOver.tsx:30-33` közös `inputCls` + 4 űrlap): a HR N2 /
  Maintenance N2 / QA N3 nit NEGYEDIK ismétlődése — címkézett (`htmlFor`),
  fókusz-ringes, működik, és a beküldés-gombok disabledReason-je kompenzál,
  de a kötelező-jelölő `*` `aria-hidden` és nincs `aria-required`. A
  formFields-re állás (EHS primitívek) immár 4 modult érintő közös
  kiemelés-jelölt — a QueryGate/dateUtils-hoz hasonló crosscut-mini-task.
- **N2 — S2 chip-implementáció modulonként duplikált**
  (`LibraryScreen.tsx:30-49` `chipCls`+`Chip` ≈ QA `InspectionsScreen`/
  `TicketsScreen` inline chipjei ≈ Kontrolling chipek): a minta érett és
  konzisztens — pont ezért promótálható `components/ui` Chip primitívvé
  (a QueryGate-precedens szerint). Következő crosscut-körre ajánlott.
- **N3 — A lejáró-kizárás szabálya két helyen él:** a dashboard kliens-oldalt
  szűr (`DmsDashboard.tsx:31` — `expiry !== null && status !== 'archivalt'`),
  ami az MSW `expiring=true` ágának (`handlers.documents.ts:76`) kézi
  tükre. A dashboardnak a teljes lista amúgy is kell (KPI-k), így az egy
  fetch indokolt — de az „archivált nem akció-tétel" üzleti szabály egy
  nevesített calc-guardba (pl. `isExpiryActionable`) kiemelve lenne egy
  igazságforrás. Apró sorrend-eltérés is: a dashboard-lista updatedAt-,
  az Expiring-képernyő validUntil-rendezésű.
- **N4 — `DOCUMENT_MAIN_PATH` kulcslista kétszer** (`labels.ts:34-38`
  újra-felsorolja a fő út kulcsait a `fsm.ts:45-47`
  `DOCUMENT_MAIN_PATH_STATUSES` helyett): map-pel származtatva
  (`DOCUMENT_MAIN_PATH_STATUSES.map(...)`) a drift-kockázat nulla lenne — nit.
- **N5 — Optimista átmenetnél a verzió-lánc pillanatnyi elcsúszása**
  (`documents.ts:198-208`: az onMutate csak a `status`-t billenti, a
  verziótörténet aktuális bejegyzésének pillje a szerver-DTO-ig a régi
  státuszt mutathatja): a QA/HR-precedenssel azonos, elfogadott minta
  (onSuccess a friss DTO-t cache-eli) — megjegyzés, nem hiba.

---

## Tesztek

DMS-scope-ú futtatás (`npx vitest run src/services/dms src/pages/dms
src/pages/__tests__/DmsPage.test.tsx`): **6 fájl / 59 teszt — mind zöld**
(egyezik az F2-DMS-FE task-jelentés 59/59-ével). Bontás:

| Fájl | Teszt | Fókusz |
|---|---|---|
| `services/dms/__tests__/documentFsm.test.ts` | 12 | átmenet-tábla (fő út + reject/recall/archive/reopen ágak, archivált-tiltások, jóváhagyás-kapu), transitionBlockReason, nevesített guardok + mindhárom payload/státusz-guard |
| `services/dms/__tests__/calc.test.ts` | 14 | helyi idejű dátum-helperek, expiry-ablak határesetei (aznap, határ+1, config-default), releasedVersionInfo mind a 4 ága (clear/pending/blocked/archivált-lánc + legmagasabb kiadott), docStats |
| `services/dms/__tests__/dmsApi.test.ts` | 17 | MSW-kontraktus: szűrők (+expiring sorrenddel), SZÁMÍTOTT releasedVersion/expiry, FSM-láncok + lánc-követés, 409/400/404, recall-fallback, verzió-lánc léptetés+megőrzés, RULE-6 a kontraktusban |
| `pages/dms/__tests__/dmsFlow.test.tsx` | 7 | tiltott gombok aria-disabled+tooltip+elnyelt kattintás, submit/reject/approve folyamok, reject-indok guard + rule-6 lista-frissülés, verzió-feltöltés guard + léptetés + lista-frissülés, archivált-tiltás, dms.manage-tiltás |
| `pages/dms/__tests__/dmsScreens.smoke.test.tsx` | 4 | 3 képernyő + detail; sr-only eloszlás, S2 chipek, szerver-szűrők, verziótörténet + érvényes-verzió sáv, config-ablak felirat |
| `pages/__tests__/DmsPage.test.tsx` | 5 | route-diszpécser + SlideOver-nyitás + fallback-ág |

A lefedés a precedens-szerinti (calc tiszta függvények + MSW-kontraktus +
UI-folyamok), és a mindhárom guard (FSM 409, archivált-verzió 409, payload
400) MINDHÁROM rétegben (fsm-teszt, MSW, UI-tooltip) asszertált; a rule-6
kontraktus- ÉS UI-szinten is.

---

## Findings összefoglalva

| # | Fájl | Mi | Súly |
|---|---|---|---|
| N1 | `DocumentDetailSlideOver.tsx:30-33` + 4 űrlap | Kézi input-stílus a formFields primitívek helyett; `aria-required` hiánya (HR N2 4. ismétlődés — crosscut-kiemelés-jelölt) | opcionális |
| N2 | `LibraryScreen.tsx:30-49` | S2 Chip modulonként duplikált — `components/ui` promótálás-jelölt (QueryGate-precedens) | opcionális |
| N3 | `DmsDashboard.tsx:31` ↔ `handlers.documents.ts:76` | A lejáró-kizárás szabálya két helyen — nevesített calc-guard kiemelendő; sorrend-eltérés a két lejáró-lista közt | megjegyzés |
| N4 | `labels.ts:34-38` ↔ `fsm.ts:45-47` | DOCUMENT_MAIN_PATH kulcslista duplikálva a DOCUMENT_MAIN_PATH_STATUSES helyett | opcionális |
| N5 | `documents.ts:198-208` | Optimista átmenetnél a verzió-lánc-pill pillanatnyi elcsúszása (precedens-konform) | megjegyzés |
| — | `pages/qa/labels.ts:144,150` | QA formázók dateUtils-átállása még nyitva (datetime-string — jelenleg nem hibás; utóellenőrzés, nem DMS-hiba) | backlog nyitva |

**Döntés: ✅ APPROVED.** Blokkoló és M-szintű hiba nincs — a DMS a negyedik
egymást követő fix-kör nélküli modul, és ezzel **mind a 7 platform-modul
designer-review APPROVED (7/7)**. A hat korábbi review minden leckéje
(S1-primitívesítés, S2 chipek, CRM S2 detail-kulcs, rule-6, FSM/guard-egy-
igazságforrás, config-küszöbök, dark-páros nyerspaletta, UTC-mentes dátumok)
beépült; a QA-review mindhárom utóellenőrzése (QueryGate-promótálás,
HR-küszöb, dateUtils) a crosscut-fixben lezárva és kódban igazolva. A `dms`
felkerül a `modules_done` listára — a Fázis 2 modul-sora TELJES, jöhet az
F3 minőségkapu (build+test+bundle-riport + root release-döntés). Az F3-hoz
ajánlott crosscut-backlog: formFields-átállás (N1, 4 modul), Chip-promótálás
(N2), QA dateUtils-átállás.

---

_Designer terminál — JoineryTech sziget. F2-DMS review lezárva: ✅ APPROVED — modules_done 7/7._
