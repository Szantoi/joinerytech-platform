# Doorstar-lánc integrációs terv — 2026-08-10

> **Cél (Gábor, 2026-08-10):** a három Doorstar-repó (instance, calculation-lab, flow-lab) adatlánca
> **egy egységgé** álljon össze, amiből **több-bérlős rendszer** válhat, a JoineryTech platform keretében.
> A calc és a flow **általános értékei a platformra emelendők**, hogy a kódtárban megőrződjenek.
> A Doorstar leválasztható marad (ADR-2026-07-29 platform-boundary elv).
>
> Forrás: 9 ügynökös feltérképezés 2026-08-10-én (3 repó + platform-kontextus + 3 határvizsgálat +
> platform-lift elemzés + teljességi kritika), minden állítás fájl-bizonyítékkal mérve.

---

## 1. Gábor-döntések (2026-08-10)

| # | Döntés | Következmény |
|---|--------|--------------|
| D1 | **A publikus régi pilot (doorstar.asztalostech.hu) megy a kukába.** Az adata szintetikus, újra előállítható. | VPS-en a `doorstar` nginx-site + `doorstar-production-service` leállítása/visszavonása; új telepítés CSAK a DSORD-18/DSCONV-03 auth-kapuk után. |
| D2 | **Fő cél: egy egység + több-bérlős rendszer.** | A konvergencia iránya a platform multi-tenant mintái (RLS, Keycloak, instance-context); az instance single-tenant Prisma-sémája tenant-dimenziót a platform-mintából kap, nem sajátot. |
| D3 | **A calc és a flow általános értékei a platformra emelendők** (kódtár-megőrzés). | A 6. szakasz lift-listája végrehajtandó sávvá lép elő. FIGYELEM: a lift az általános kódot menti — a Doorstar-specifikus törzs biztosításához a 0. fázis (commit + privát remote) továbbra is kötelező. |
| D4 | **Calc UI/UX fejlesztés kell**, hogy a calculator jól működjön. | Új sáv (7. szakasz): a sablon-/szabályszerkesztő és -alkalmazó UX a workbenchben. |
| D5 | **Szabály- és sablonkönyvtár építendő** → erre épül egy **árazó folyamat**: a sales könnyen tud árat adni, a gyártás-előkészítés könnyen használja. | Új sáv (8. szakasz): a könyvtár a calc-lab sablon-capture + az instance TechnicalProductRuleLibrary + a cutting ár-táblák egyesítése; az árazás ma SEHOL nem létezik a láncban (a calc-labben explicit tiltott hatókör volt). |

Korábbi, érvényben lévő keret-döntések: a calculator sablonokat+szabályokat ad (nem végeredményt),
a flow ebből számol munkaidőt; **a flow-t az Excelről a calculatorral választjuk le**, golden-master
kapuval (5. szakasz).

---

## 2. Mért kiindulóállapot (tömör)

### A lánc állomásai

| Állomás | Gazda | Állapot | Kulcs-bizonyíték |
|---|---|---|---|
| Sales (megrendelés) | instance | KÉSZ lokálisan; élesítés auth-blokkolt | `src/production-service/src/services/salesOrderLifecycle.ts`, állapotgép: SALES_DRAFT→…→APPROVED, v16 content-hash |
| Felmérés | instance | KÉSZ lokálisan (7 szakasz, mezőszintű evidencia, szerver-kapu) | `surveyWorkspace.ts`, ADR-2026-07-31-survey-source-verification-gate |
| Műszaki előkészítés | instance + calc-lab | KÉSZ; a sablon-tudás gazdája már a calc-lab (pinelt capture-ök, EXTERNAL_CAPTURED) | `technicalPreparationWorkspace.ts` (v5 séma), calc-lab `contracts/technical-template-capture.v1` |
| Kalkuláció | calc-lab | Fejlesztés alatt; motorok készek (v1–v6), be-/kimeneti kapuk szándékosan zárva (501, `previewOnly:true`) | `Program.cs:117-125`, `contracts/` 16 séma |
| Munkafolyamat + munkaidő | flow-lab | Mag KÉSZ (49 műveletes terv + ütemező); ma Excelből dolgozik | `ProcessPlanGenerator.cs`, `PrecedenceProductionScheduler.cs` |
| Üzemi tábla | instance | Fut (régi pilot builddel — D1: visszavonandó); flow-lab-bekötés MINDKÉT oldalon implementált, szintetikus demó lefutott | `flowLabMaterialization.ts:226,238` (Epic/EpicStep-írás), ADR-0019 |

### A négy valódi blokkoló (nem kód)

1. **Verziókezelés:** calc-lab **0 commit, nincs remote**; flow-lab: nincs remote, 98 dirty path;
   instance: ~397 commitolatlan fájl (utolsó commit 82f336b, 2026-08-01), benne a teljes
   flow-lab-bekötő kód és a v1.1 kontraktusok — untracked.
2. **Két el nem fogadott kontraktus:** CALC-002 (bemeneti snapshot, revízió-hatókörrel) és
   CALC-004/005 (visszaút- és projekciós adapter).
3. **Auth:** DSORD-18 (OIDC/RBAC) + DSCONV-03 (JWT/tenant/station) — az X-Role header nem
   hitelesítés; minden élesítés közös kapuja.
4. **Emberi szabály-review:** a legacy-26133 profil minden szabályán `axisSemanticsUnreviewed:true`.

### A három határ állapota

- **intake→kalkuláció:** ma csak sablon-metaadat folyik (calc→instance, fájl-pin); a műszaki adat
  átadásához a CALC-002 séma + kulcstér-map + fájl-transzport kell. Az instance FOGADÓ oldala
  (ComponentSnapshot + VERIFIED review-kapu) már létezik. Séma-rés: a fogadó zod-séma a `ruleKey`-t
  és a kalkulátor-lineage-et némán eldobná — bővítendő.
- **kalkuláció→flow:** NEM közvetlen cső — a flow-lab cellaszintű Excel-evidenciát követel, amit JSON
  igazul nem elégít ki. Az út: calc candidate → CALC-004 review → instance ComponentSnapshot →
  flow-lab kiegészítő Derived evidence. Közös horgony: mindkét labor bájtra ugyanazt a
  Kalkulátor.xlsm-et olvassa (SHA-256 `c3231fe1…` mindkét repóban rögzítve).
- **flow→tábla:** kontraktus és kód KÉSZ mindkét oldalon (plan-materialization v1.1 + append-only
  deviation feed, fájlnév betűre egyezik); hiányzik: commit, közös G0-döntés, egy valós artefakt-kör,
  auth az élesítéshez.

---

## 3. Célkép: egy egység, több bérlő

- **Kompozíció:** az instance-context kontraktus (ERPSEP-06 draft) a portál/instance-láthatóság
  gerince; a Doorstar-modulok az ADR-067 `doorstar.*` namespace-en lépnek a katalógusba.
- **Tenancy:** a platform RLS + Keycloak mintája a mérce (spaceos-modules-hosting). Az instance
  Node-stackjén az OIDC/JWT-validálás kivitelezése NYITOTT TERVEZÉSI KÉRDÉS (a platform kész
  csomagja .NET-only) — a DSCONV-03 tervezésekor eldöntendő; zöldmezős saját auth TILOS.
- **Adat-topológia:** nyitott (közös cluster vs külön DB; tenant-dimenzió az instance-sémában;
  objektumtár + backup) — a 2. fázis végéig döntendő.
- **Ütemezés-gazdaság:** a platform spaceos.scheduling veszi át (a flow-lab solver a pack zöld
  átvételéig ideiglenes — flow-lab EPICS `next_decisions`).

---

## 4. Fázisterv

### 0. fázis — biztosítás és alapozás (AZONNAL, kód nélkül)
- **0a.** Privát remote + első commit: calc-lab, flow-lab. A doorstar-repók ügyféladat-közeliek —
  a platform publikus GitHub-mintája itt NEM alkalmazható.
- **0b.** Az instance ~397 dirty fájljának szerzőség-tisztázása (Codex?) → commit. A board-oldali
  flowLab* kód + a v1.1 kontraktusok mindkét repóban verziókezelésbe.
- **0c.** D1 végrehajtása: pilot-visszavonás a VPS-en (nginx site + systemd service le; DB-dump
  archiválás opcionális — az adat szintetikus).
- **0d.** Doksi-szinkron: calc-lab leltár v4→v5 (a kód v5 — mérve: `technicalPreparationWorkspace.ts:49`);
  CALC-002 státusz-eltérés rendezése (task-doksi „planned" vs EPICS „in_progress").

### 1. fázis — a lánc alja (flow↔tábla, majdnem kész)
Közös G0-döntés a v1.1 csomagról (FL-EXT-01) → DSFLB-08 harness PASS (helyi PostgreSQL-lel) →
szintetikus golden-fixture kétoldali kör (import → creator≠reviewer VERIFIED → materializáció →
1 eltérés → dispatch → #/elteresek fold). Élesítés NÉLKÜL — az a 3. fázis.

### 2. fázis — Excel-leválasztás (calculator-sáv, részletek: 5. szakasz)
Rekonsiliációs eszköz → emberi szabály-review → CALC-002 kontraktus → CALC-004 adapter
(+ instance fogadó-séma bővítés: `ruleKey` + calculatorLineage) → flow-fogyasztás Derived
evidence-ként → forrás-váltás a golden-master egyezés után.

### 3. fázis — auth és élesítés
DSORD-18 + DSCONV-03 a platform AUTH-DOORSTAR-ONBOARDING keretében (személyes fiók mindenkinek,
állomás mint aláírt claim). Utána: DSFLB-04 go-live, production mutation, valós ügyféladat.

### 4. fázis — platform-keret rákötés
(a) projekt-azonosság: doorstar projectKey ↔ spaceos.projects `OriginSystem/OriginExternalId`;
(b) scheduling pack-átvétel zöldre → flow-lab solver kivonul;
(c) instance-context élesítés (gazda-kérdés!) + `doorstar.*` katalógus-beléptetés.
**Ellenjavallt:** párhuzamos üzemi tábla a platformon; HTTP-transport az auth-kapuk előtt.

---

## 5. Excel-leválasztás részterv (golden master)

1. **Rekonsiliációs mérés MOST** (nem igényel blokkolt kaput): read-only összevető — a calc-lab
   legacy-26133 candidate sorai vs a flow-lab SourceSetPreview cuttingRows/finishedSizeRows sorai,
   ugyanarra a forrás-hash-re (`c3231fe1…`) kötve, 66/66 sor, darab+méret egyezés.
2. **Emberi szabály-review:** a rekonsiliáció eredménye a bemenete; az `axisSemanticsUnreviewed`
   feloldása nélkül a calculator kimenete nem hiteles.
3. **Adatút:** calc candidate → CALC-004 review (instance) → ComponentSnapshot VERIFIED →
   flow-lab kiegészítő Derived evidence (1. opció a calc-lab discovery-ből: nem igényel új
   SourceSetPreview schemaVersion-t; az Excel marad hiteles a review lezártáig).
4. **DoorLeaves-lyuk:** a flow-katalógus 49 mennyiség-szabályából 13 kétoldali ajtólap-tényt
   igényel — CALC-002-02 (fix/mozgó felület typed rögzítése) a teljes leválasztás előfeltétele.
5. **Váltási kapu:** ugyanarra a bemenetre az Excel-út és a calculator-út soronként egyezik
   (determinisztikus replay, drift=0) → csak ezután fordul a hitelesség.

---

## 6. Platform-lift sáv (D3 — általános értékek a kódtárba)

Prioritási sorrendben; mindegyiknél MÉRVE, hogy a platformon nincs (vagy csak részben van) átfedés:

| # | Elem | Forrás | Cél a platformon | Megjegyzés |
|---|------|--------|------------------|------------|
| L1 | `find-personal-data.py` PII-kapu (alak-alapú, self-testes, fail-closed) | flow-lab | spaceos-doccapture-engine (DC-PII-IMPORT-GATE referencia-implementáció) | platformon 0 találat PII-implementációra |
| L2 | Canonical-hash / determinisztikus lineage közös csomag | calc-lab + flow-lab | közös spaceos-csomag | 3→1 konszolidáció (ma: calc DeterministicArtifactHasher, platform TermsCanonicalizer, scheduling RevisionHasher) |
| L3 | OpenAPI-artefakt + route-drift kapu tooling | instance | Collaboration F4 + projects OpenAPI | pont ez a B2B-pilot blokkolója (F4 hiányzik) |
| L4 | ImportRun/ImportCandidate kontrollált import-pipeline minta | instance | spaceos-modules-doccapture | preview-mode, forrás-hash, karantén, emberi kapu |
| L5 | Strukturált mennyiség-szabály modell (SumField/filterek, cella-provenance) | flow-lab | doccapture-engine tabular réteg | a flow-lab ADR-0017 maga mondja ki |
| L6 | Parametrikus sablonmotorok (v3–v6, zárt formula-AST) + 9 konyhasablon | calc-lab | új `joinerytech.*` sablon-/kalkulációs modul | a D5 könyvtár magja; tech-döntés: .NET 10 vs 8 |
| L7 | component-requirement-candidate v1 kontraktus | calc-lab | docs/knowledge/contracts/ + cutting intake | tengely-mapping döntéssel EGYSZER |
| L8 | Folyamatkatalógus SÉMA (process-catalog/v2) | flow-lab | scheduling standard-import kiterjesztés | a tartalom (26133) instance-adat marad |
| L9 | OrderRevision + approval content-hash lánc MINTA | instance | spaceos-erp-core (ERPSEP-04) | Node→.NET, mintaként |
| L10 | Mezőszintű forrásbizonyíték-kapu mechanizmus | instance | leendő felmérés-képesség / doc-capture evidencia | a mezőkészlet ajtós, marad |
| L11 | SHA-256-os objektumtár-minta | instance | DMS blob-store kiegészítés | DMS-ben ma 0 hash-találat |
| L12 | SharePoint Graph read-only konnektor | instance | doc-capture forrás-konnektor | platformon 0 találat |

**Ajtós marad (nem lift):** legacy-26133 és door-leaf profilok, a folyamatkatalógus tartalma,
PLAN-03 baseline-ok, survey-mezőkészlet, RAG-csomag, tábla-deployment.

---

## 7. Calc UI/UX sáv (D4)

A calc-lab workbench (React 19/Vite, 4631) ma fejlesztői eszköz. A cél-UX a D5 könyvtárral együtt
tervezendő: (1) sablon-szerkesztés (v3–v6 szerkesztők egységes felületen, editor-metadata sémák már
léteznek); (2) sablon-ALKALMAZÁS projektre (a műszaki előkészítés nézőpontja — JIT, blank-only
ajánlás mintájára); (3) eredmény-review (candidate sorok → emberi jóváhagyás). Bevonandó: designer
terminál (design-system spec). Előfeltétel: 0a (repo-biztosítás), különben a UI-munka is
verziókezeletlen fára épül.

## 8. Szabály- és sablonkönyvtár + árazó folyamat (D5)

**Mi van ma (mérve):** calc-lab sablon-capture katalógusok (fingerprintelt, read-only) + parametrikus
motorok; instance TechnicalProductRuleLibrary (DB-authoritatív, admin UI); platform cutting:
PricingRule/PriceList/MaterialPricing táblák (Doorstar-seeddel). **Árazás a láncban SEHOL nincs**
(a calc-labben eddig explicit tiltott hatókör — a D5 ezt a határt tudatosan oldja fel: az árazás
NEM a calc-motorba kerül, hanem KÜLÖN árazó rétegbe, amely a calc kimenetét fogyasztja).

**Cél-architektúra (javaslat):**
1. **Könyvtár** = verziózott, fingerprintelt sablon- és szabálytár, bérlő-szintű tartalommal,
   platform-szintű mechanizmussal (a calc-lab capture-minta általánosítása; L6 lift a magja).
2. **Árazó folyamat** = sablon+szabály → mennyiség/anyag (calc) + munkaidő (flow) → árszabályok
   (anyagár + műveleti idő × órabér + felárak) → ajánlati ár. Fogyasztói: (a) **sales** — gyors
   ajánlatadás a CRM-ből (a Quote-oldal ma üres: az Opportunity opak quoteId-t tárol; a valódi
   Quote a spaceos-erp-core-ba tartozik — ERPSEP-04); (b) **gyártás-előkészítés** — a műszaki
   munkatérből ugyanazon könyvtárból dolgozik (ez már ma így van a capture-pin révén).
3. **Sorrend:** a könyvtár-mechanizmus tervezése (ADR) → L6 lift → árszabály-réteg a cutting
   ár-tábláinak általánosításával → sales-oldali ajánlat-út az erp-core Quote-tal.

**Őrszabály:** az árazó réteg a calc candidate-jeit és a flow munkaidő-számait fogyasztja —
nem számol újra se méretet, se időt (single source of truth).

---

## 9. Duplikátum-őrszabályok (minden sávra kötelező)

1. Új ütemezés-funkció KIZÁRÓLAG a platform scheduling moduljába (ma 3 párhuzamos szemantika él).
2. Negyedik OOXML/Excel-olvasó TILOS (ADR-0017) — minden intake a doccapture-engine-be.
3. Zöldmezős auth TILOS az instance-ben — platform Keycloak-minta (DSCONV-03/AUTH-DOORSTAR-ONBOARDING).
4. Tengely-mapping (width/height vs length/width) döntés EGYSZER, az L7 kontraktus-emeléssel együtt.
5. Canonical-hash: új implementáció helyett az L2 közös csomag.
6. Projekt-azonosság: az instance projekt-fogalma nem bővül OriginRef-mapping döntés nélkül
   (spaceos.projects az egyedüli ProjectCode-kibocsátó, ADR-072).
7. Dokumentumtár: az instance objektumtára nem bővül — a hash-integritás a DMS-be emelendő (L11).

---

## 10. Nyitott kérdések

- **N1:** Az instance ~397 dirty fájljának szerzősége (Codex?) — 0b előfeltétele.
- **N2:** Sales-forrás hosszú távon: platform CRM+erp-core vs instance Sales-munkatér megfeleltetés
  (az integrált láncban ki a rendelés-forrás; ERPSEP-04 ütemezése).
- **N3:** Felmérés: instance-lokális marad vagy platform-képesség lesz (L10 csak a mechanizmust emeli).
- **N4:** DSFLB-DEC-01 supersede-szabály (terv-iteráció a táblán; ma 1 aktív materializáció/projekt).
- **N5:** Adat-topológia a több-bérlős célhoz (közös cluster vs külön DB; tenant-dimenzió az
  instance-sémában).
- **N6:** Deploy-topológia a laboknak (.NET 10 runtime a VPS-en; a fájl-transzport kontraktusok ma
  implicit közös fájlrendszert feltételeznek).
- **N7:** Naptár-hármas keresztellenőrzés (480 perces nap: instance preflight + flow-lab naptár +
  platform WorkingTimeline — közös fixture-ön még nem futott).
- **N8:** ERPSEP-06 instance-context gazda-kérdés (a kód nincs a főágon).

## 11. Kockázatok (top 5)

1. **Teljes kódvesztés-kockázat a calc-labben** (0 commit, nincs remote) — 0a azonnal.
2. **Élő idegen munka felülírása** az instance dirty fáján — N1 tisztázás commit előtt.
3. **Szabály-szemantika hibás legitimálása**: a legacy-26133 review nélküli üzembe emelése rossz
   szabásméreteket hitelesítene — az 5. szakasz kapuit nem szabad megkerülni.
4. **Zöld-állítások önbevallása**: sehol nincs CI — minden „kész és tesztelt" kiindulópont előtt
   az adott repó suite-jának tényleges futtatása kötelező.
5. **PII a valós adatra állás előtt**: import-kapuk vannak, de a lánc élő végpontjain (RAG-rekordok,
   brief-csatolmányok, IMPORT_PREVIEW artefaktok) PII-leltár még nincs.

---

_Készítette: Claude (root terminál), a 2026-08-10-i 9 ügynökös feltérképezés alapján._
_A részletes mérési eredmények a session-scratchpadben (map/boundary/lift/critic JSON-ok)._
