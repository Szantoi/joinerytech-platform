# ROOT Terminal TODO

> **Frissítve:** 2026-07-31 este (napzárás) · **Részletes állapot:** [`STATE.md`](STATE.md)
> **Kanonikus státusz:** [`EPICS.yaml`](../../EPICS.yaml) — a task-doksik státusz-sora **nem hiteles**.

---

## P0 — minden session elején

- [ ] A két **Monitor** újraélesítése (a sessionnel együtt halnak).
- [ ] Csatorna **eleje + vége**, `git status` mindkét repóban, terminál-outboxok.
- [ ] **`gh run list`** — ma derült ki, hogy a `secret-scan` a létrehozása óta
      piros volt, és 20+ commiton át senki (én sem) nem nézte meg.

---

## 🔴 Gábor előtt — sürgősségi sorrendben

- [x] ~~**`ADR-072` elfogadása**~~ **ELFOGADVA 2026-07-31 (Gábor: „ADR-072 az legyen
      független").** A root rögzítette az **ADR-066 §9.1 felülírását** is (a `ProjectRef`
      tulajdonosa már nem a Kernel `FlowEpic`) — mindkét ADR frissítve.
- [ ] ~~ÚJ, 2026-07-31: `ADR-072` elfogadása~~ (lezárva, ld. fent) — a projekt-szint tulajdonosa (`spaceos.projects`
      önálló modul). A Te mai termékdöntésed („a projekt az epikek felett egy összefogó
      egység") végrehajtási artefaktuma; a root átnézte és a teherhordó állításait mérte.
      ⚠ **Az elfogadással együtt ki kell mondani, hogy az ADR-066 §9.1 döntése (2026-07-21:
      „a `ProjectRef` tulajdonosa a Kernel `FlowEpic`") FELÜLÍRT** — különben két ADR két
      tulajdonost nevez meg ugyanarra a fogalomra.
- [x] ~~**az ADR-072 §7 három kérdéséből kettő**~~ **ELDŐLT** — §7.1 (2026-07-31) és
      **§7.2 (2026-08-03, Gábor: „Igen a CRM-ből IS születhet")**. Kihirdetve a csatornán.
      ⚠ A döntő szó az **„IS"**: mindkét származás jogos, a create-út rendelést NEM
      követelhet — aki szigorúbban adja tovább, más szabályt csinál belőle.
- [x] ~~**MARAD EGY: az ADR-072 §7.3**~~ **ELDŐLT 2026-08-03 este (Gábor):
      `PRJ-<négyjegyű év>-<sorszám>`** — a Kontrolling alakja, a portál `2426`-os
      kódolása elvetve; bérlőnkénti számláló, évfordulón újraindul, a kódot a **modul**
      adja ki. ⇒ **AZ ADR-072-NEK NINCS TÖBB NYITOTT KÉRDÉSE.** Leszállítva: `a4d255c`.
      ⚠ Két korlát, ami később ÚJ döntést kérhet: az év **UTC** szerint dől el
      (nincs bérlőnkénti időzóna), és a sorszám **hézagos** lehet.
- [ ] ~~a `ProjectCode` formátuma és egyediségi köre~~ (lezárva, ld. fent)
      (a portál `PRJ-2426-001`, a Kontrolling `PRJ-2026-014` — ma **kétféle** van a fában).
      A „ki generálja" felét a §7.2 már eldöntötte: két független hívó ⇒ **szerver-oldali
      kiadás**; a formátum viszont Gáboré. **A PROJ-06 create-végpontnál blokkoló.**
      (A backend kísérőlevele „kettő"-t írt, a saját ADR-je „egy"-et — a mért szám: **egy**.)
- [x] ~~⚠ **GAZDA-DÖNTÉS: 58 fájlnyi gazdátlan, commitolatlan Codex-munka**~~
      **ELDŐLT 2026-08-03 este (Gábor): „Bárki átveheti a codex munkát meg javítani is
      kell."** = blokkoló feloldva + a javítás KÖTELEZŐ; de **nem kiosztás** és **nem
      review-mentesség**. Root-kiosztás: **BACKEND** (kompetencia + a hosting-csomag
      az övék; a frontend indoklással visszautasította). Öt szeletre bontva,
      **kitettség szerinti sorrendben** (S1 hibaüzenet-redakció → S2 health-anonimizálás
      → S3 EnabledModules → S4 portfolio-index → S5 audit-identity).
      ⭐ A kiosztás előtti mérés hozadéka: az **S5 nincs is kész** — a `review`
      önstátusz ellenére 0 CRM-fájl és 0 audit-mező; a segéd a főágon, a munka sehol
      → új kiírás lesz, nem átvétel.
      ⚠ Csapda a végrehajtónak: a munkafa **már nem tiszta Codex-munkatest** (a backend
      élő PROJ-06 munkája is benne van) → fájl-szintű pathspec, `git add -A` tilos.
      _(A régi tétel szövege alább, hivatkozásnak.)_
- [ ] ~~⚠ **2026-08-03 — GAZDA-DÖNTÉS: 58 fájlnyi gazdátlan, commitolatlan Codex-munka.**~~
      A Codex 07-28-án a Doorstar-szigetre váltott, és a platform-fán hagyott egy
      összefüggő munkatestet, amit **egyetlen státusz-forrás sem látott** (3 task-doksi
      untracked volt). **Biztonsági tartalma van, és a főágon MA a rossz alak fut:**
      a hibaleképezők nyers handler-hibát tesznek a wire-re, a modul-health pedig kiadja
      a `migrationsAssembly`/`moduleId`-t. A javítás megvan — csak nincs commitolva.
      **Kérdés:** ki veszi át **egyben** (a három szelet ugyanazokra a hosting-fájlokra
      rakódik)? A backend a B2B-10 után, vagy vissza a Codexhez? Amíg nincs gazda,
      **nem review-zom és nem commitolom** — idegen sáv kódja.
      Patch mentve lokálisan: `artifacts/orphaned-codex-worktree-2026-08-03/` (sha1
      `06e026b6`) + scratchpad-másolat; a publikus repóba szándékosan nem megy.

- [ ] ⛔ **ÚJ, 2026-08-03 — a portál CI-je 07-30 ÓTA PIROS, és a `Tranche B` törlése oldja fel.**
      A frontend döntési anyagából indult, root-méréssel megerősítve:
      - a `react-slider@2.0.6` **`dependencies`-ben** van (nem dev!), peer-igénye
        `react@^16||^17||^18`, a fán **React 19.2.7** → **`npm install` ÉS `npm ci`
        is ERESOLVE-val bukik** egy friss klónon;
      - a **`portal-ui` munkafolyamat** (a Doorstar felé publikált csomag kapuja)
        emiatt **2026-07-30 óta piros**, pontosan ezen a hibán;
      - ma **nem futott le**, mert `paths:`-szűrője csak a `packages/portal-ui/**`-ra
        figyel — a mai két commitom nem érintette. **Vagyis nem „zöld" volt, hanem
        nem is volt kapu alatt.**
      - ⚠ **A portálnak NINCS általános CI-je**: a `portal-ui` az EGYETLEN munkafolyamat,
        és egy csomagra szűkített. Minden más (app-`src/`, a többi csomag) **kapu nélkül** él.
      - a két fogyasztó (`PriceRangeSlider`, `VersionSlider`) **mindkettő a Tranche B-ben**
        → a törlés a blokkolót nyom nélkül megszünteti.
      **Kérdés Neked:** mehet-e a Tranche B törlése? (A prior art nem vész el: a
      Tranche A-ban törölt kód `git show`-val ma is előhívható.)
- [ ] **ÚJ: az „`EditableDataTable`-átvétel" tétel ROSSZUL VAN FELTÉVE — mérve.**
      A lista úgy hordozta, mintha egy kész komponens átvételére várna a jóváhagyásod.
      Root-mérés: **`EditableDataTable` és `SheetTable` 0 commit-találat a teljes
      git-történetben, minden ágon** — nem létezik és nem is létezett (a `SheetTable`
      a **Doorstar** komponense). A blokkoló feltétele („CSAK ha az M4
      revízió-szerkesztés bekerül") a `docs/` alatt **négy helyen fordul elő, mind a
      négy magában a PLAN-05-ben** — önhivatkozás; a platformon definiált egyetlen `M4`
      a PLAN-03/ADR-069 scheduler-mérföldköve, aminek semmi köze hozzá.
      ⇒ Ez **nem elmaradt döntés, hanem meg nem specifikált fejlesztés** egy
      kiértékelhetetlen feltételen. Vagy új kiírást kap, vagy lekerül a listáról.

- [ ] **`/shopfloor` PIN-backdoor.** A `PIN=1234` ág eltávolítása authorizált; a
      kérdés az, hogy **egy nem működő világ mit keres publikus route-on**
      (se backend, se MSW-mock → a PIN az egyetlen működő belépő). A frontend
      készen áll, a végrehajtás a route-döntés után indul.
- [ ] ⛔⛔ **ÚJ, 2026-08-03 — 48 KÖNYV-OLDAL SZKENN A PUBLIKUS REPÓBAN.**
      A doccapture `.gitignore`-leletét a saját sávomra alkalmazva került elő:
      - `docs/joinerytech/uploads/` alatt **48 db `szega_book_*_oldal_*.jpg`**
        (+11 png, 4 md) — **követett fájlok, és `origin/main`-en is bent vannak**;
      - a platform `.gitignore`-ja **egyetlen bináris alakot sem fog**: mérve a
        `.ttf`/`.zip`/`.dll`/`.exe`/`.xlsx`/átnevezett `.dat`/`.png` **mind bemehet**.
        Felsorolás, nem szabály — pontosan az a rés, amit a doccapture ma a saját
        repójában megmért és bezárt.
      **Miért más ez, mint egy token:** harmadik fél szerzői joga alá eső anyag, amit
      **nem lehet „rotálni"**. A publikus történetből való eltávolítás **history-rewrite**,
      és a repó publikus volta miatt a fork/cache másolatok akkor sem szűnnek meg.
      **A döntés a Tiéd, én nem nyúlok hozzá.** Amit javaslok eldönteni:
      (1) törlés + history-rewrite, vagy a repó priváttá tétele; (2) a hiányzó
      bináris-kapu megépítése (a doccapture `binary_artifacts.json` + `binary_guard.py`
      mintája kész és működik — átvehető); (3) a maradék 405 kép (`screenshots/`,
      `docs/knowledge/qa/assets/`) átnézése: ERP-képernyőképek **ügyféladatot**
      mutathatnak — ezt **nem mértem**, csak a kockázatot nevezem meg.
- [ ] **Négy kulcs visszavonása:** Google Gemini · **két** Brave Search
      (`061ddd503f`, `cefeb3edee`) · a forrás-prototípus **két
      modell-szolgáltatói kulcsa** (egyikük a **futó app** `settings.json`-jában).
- [ ] ⚠ **`NOBYPASSRLS` — A TÉTEL ÁTMINŐSÍTVE (root-mérés, 2026-07-31 este):
      ez NEM egy `ALTER ROLE`, hanem KÉT MODUL ÚJRATELEPÍTÉSE.** A VPS-felhatalmazásod
      után megmértem, mielőtt hozzányúltam volna — és jó, hogy megmértem:
      - a két worker **ma is `rolbypassrls=t`**, és mindkét service **FUT**;
      - a `SECURITY DEFINER` függvények az éles DB-ben **NINCSENEK TELEPÍTVE**
        (a 8-ból 0; egyetlen függvény van a sémákban, az sem definer);
      - a VPS-checkoutok **2026-07-22**-iek, a migrációk **07-27**-iek → a kint futó
        worker-kód **nem ismeri** az új függvényeket.
      **Ha csak az `ALTER ROLE`-t futtatom, mindkét háttér-worker NÉMÁN leáll**
      (az RLS 0 sort adna nekik). Helyes sorrend: worker-kód deploy → migráció →
      `ALTER ROLE` → záró mérés. Ez saját, tervezett deploy-ablakot kér.
- [ ] **CI-hatókör:** PAT a privát `spaceos-kernel`-hez (a build-kapu ma 6/15
      projektet mér) · teszt-kapu (Docker; a collaboration suite **13 m 19 s**).
- [ ] **`npm publish`** a `@spaceos/portal-ui`-ra · **VPS-IP** maradhat-e a
      publikus repóban · a **3 platform-submodule pushja**.
- [ ] **ÚJ (DC-01 tervből, 2026-07-31): licenc-blokkoló** — a `SpaceOS.Modules.Hosting`
      (+`.RlsFixtures`) `PackageLicenseExpression`-je és a platform-repó gyökér-`LICENSE`
      (+ `RepositoryUrl` kettősség). PUBLIKUS repó licenc nélkül = minden jog fenntartva
      minden fogyasztónak; a DC-01c ezen blokkolt.
- [x] ~~**ÚJ (DC-01): betűtípus-politika** a DC-01b előtt~~ **ELDŐLT 2026-08-03 (Gábor):
      LiberationSans OFL-1.1 alatt szállítva + konfigurálható felülírás; hiányzó vagy
      nem fedő betűtípusnál fail-closed (`FontUnusableError`) a kimeneti fájl
      létrehozása ELŐTT.** Az indoklás eladási érv is: az OFL engedi a beágyazást, és
      a vevő PDF-je ettől nem lesz OFL-es. A DC-01b utolsó Gábor-kapuja ezzel nyitva.
- [ ] **ÚJ (DC-01): PyMuPDF a goods-receipt repóban** — AGPL/kereskedelmi kettős licenc,
      a repó MIT-státusza érintett; 4 fájl `fitz` → pypdfium2 csere (külön task).
- [ ] **ÚJ (DC-01): objektum-tár (DC-01c)** — S3/MinIO döntés (a Minio-kliens Apache-2.0,
      licenc-oldalról nem blokkolt).
- [ ] **ÚJ (triázs): a Codex-sáv gazdátlan platform-taskjai** — 6 cutting + 3
      platform-security (NuGet/ASPNET22/EHS-advisories) a Codex Doorstar-váltása óta
      gazdátlan: visszakerül a Codexhez, vagy a backend kapja a B2B-10 után?
- [ ] **ÚJ (triázs): EHS-WIZARD-HU manuális QA** — a fejlesztés kész és mergelt
      (portál `1f3ca31`), kizárólag a mobil+desktop+dark vizuális átnézés hiányzik.
      **EGY ülésben elvégezhető vele:** a toast live-region felolvasó-szúrópróba
      (NVDA/VO — headless környezetben nem mérhető) és a `<title>jt-temp</title>`
      névdöntés.
- [ ] **ÚJ (F5/2): deploy-előfeltétel** — az éles collaboration-hostnak mostantól
      KELL a `Collaboration:Kernel:BaseUrl` config, különben el sem indul (szándékos
      fail-fast, a néma localhost-fallback tiltása miatt). Élesítés előtt VPS-config.

---

## Rám váró review

- [x] ~~**backend S1** (hibaüzenet-redakció, `6919666`)~~ **APPROVED 2026-08-04**
      (verdikt: backend/inbox `2026-08-04_001`). Saját mérés: **710/710** zöld
      (a backend 580-a részhalmaz), M-ROOT mutáció + pozitív kontroll.
      ⇒ Két lelet ment tovább: **S1a** (Kontrolling, ld. lent) és a **2/8 fedezet**.
- [x] ~~**backend PROJ-05** + a kód-kiadó (`dc3dc28` + `a4d255c`)~~ **APPROVED 2026-08-04**
      (verdikt: inbox `2026-08-04_002`). Saját mérés **64/64**; M-ROOT mutáció **túlélt**
      (a 3. tábla RLS-e őrizetlen), pozitív kontroll 4 bukás.
- [x] ~~**backend S2** (health-anonimizálás, `89da08e`)~~ **APPROVED 2026-08-04**
      (verdikt: inbox `2026-08-04_003`). 82→85, M-ROOT harap. ⚠ A ⛔ besorolás **az én
      kiírásom hibája** volt (nem mértem a „van-e hívó" premisszát).
- [x] ~~**frontend: Tranche B törlés** (portál `76bc647`)~~ **APPROVED 2026-08-04**
      (verdikt: frontend/inbox `2026-08-04_001`). **Pusholva + pin-bump `581322a`.**
      Saját mérés negatív kontrollal: `npm ci` az előző commiton BUKIK, ezen **0** —
      a 07-30 óta piros telepítés feloldva.
- [x] ~~**backend S3** (`EnabledModules`, `4e880f6`)~~ **APPROVED 2026-08-04**
      (verdikt: inbox `2026-08-04_005`). Saját mérés **90/90**; M-ROOT (a környezet-őr
      kivéve) **pontosan 1 bukás** → a tulajdonság rögzítve. **Ma először nem találtam rést.**
      Külön mérve: a `Jwt:Development` szekció kizárólag `appsettings.Development.json`-okban
      van → az új fail-fast őr nem dönt le éles hostot.
      ⇒ **A Codex-munkatest S1–S4 + S1-kieg mind APPROVED.** Hátra: S5 (új kiírás), S1b
      (triázs után), ERPSEP-05 csomagolási diffek.
- [x] ~~**backend S4 + S1-kiegészítés** (`46e3fdc` + `21c603b`)~~ **APPROVED 2026-08-04**
      (verdikt: inbox `2026-08-04_004`). Saját mérés izolált HEAD-másolaton **194/194**.
      ⭐ M-ROOT: a **mapper megkerülése** egy bekötött hívási helyen **túlélt** (pozitív
      kontroll a mapperben: 1 bukás) → **a kapu-lelet ma harmadszor**, három modulban.
      ⚠ A backend „nincs élő `Result.Error` handler" állítása **mérve nem áll**: két
      bekötött végpont (`POST`/`DELETE /overhead-config/rules`) vezet oda → a reggeli
      verdiktem („ma szivárog") **áll**.
- [ ] **doccapture: DC-01b-write** (2026-08-04, `review_requested` + egy megerősítendő
      terv-eltérés) — sorban.
- [ ] **doccapture: a CI 6 oka rendezve** (2026-08-03 20:00) — felterjesztve, nem bíráltam.
      *(Függetlenül ellenőrizve: a hivatkozott futás `30839170389` valóban `success`, és az
      utána jött 2 commit CI-je is zöld — a tartalmi review még hátravan.)*
- [ ] **doccapture: DC-01b írás-oldal + betűtípus-kapu részszállítás** (2026-08-04) — sorban.
- [ ] **doccapture: betűtípus leszállítva** (`dda051b`, 2026-08-03 21:50) — a bináris-kapu
      (`binary_artifacts.json` + `binary_guard.py`) **átvehető mintája** a platformra is.
- [x] ~~**Semmi.**~~ ⛔ **EZ TÉVEDÉS VOLT (2026-08-03).** A frontend `_009` felterjesztése
      07-31 **16:04**-kor befutott az outboxába — a napzárásom (18:06) mégis „semmi"-t írt,
      és **három napig állt egy sáv** miatta. **Lezárva 2026-08-03: APPROVED** (portál
      `ee2cf04`, saját méréssel + saját mutációval + pozitív kontrollal).
      **A szerkezeti ok:** a review-sorom a csatornán és a saját listámon állt, és
      **egyik sem nézte a terminál-outboxokat** — pont azt, ahová a felterjesztések mennek.
      A P0-listám 2. sora („terminál-outboxok") ezt előírja; a napzáráskor nem futott le.
      **Ellenintézkedés:** a Monitor újraélesítve (ma 19:32), és a napzárás előtt is
      kötelező outbox-szemle, nem csak a session elején.

- [x] ~~**doccapture: faipari RAG 1. fázis**~~ **APPROVED 2026-07-31** saját VPS-méréssel
      (manifest-hash 5/5 · dry-run 1963 chunk · Chroma count=1998 · MCP-próbák).
      ⚠ Mért csapda: a 3460 `/health` 35-öt mond — a fájl-figyelő száma, nem a vektor-tár.

## Root-task (triázsból, 2026-07-31)

- [x] ~~**B2B-01..08 tételes megfeleltetés**~~ **KÉSZ 2026-07-31**: 3 zárva bizonyítékkal
      (B2B-01/02/04), 5 nevesített maradékkal (B2B-05→F6 · B2B-06 adapter-scope ·
      B2B-07/08→F4 · B2B-09→F7). A megfeleltetés soronként az `EPICS.yaml`-ban.
- [x] ~~**ERPSEP triázs-kör** az 5 státusz-eltérésre (yaml↔doksi)~~ **KÉSZ 2026-08-03**
      (`21ec995`): mind az 5 feloldva — a doksinak **2**-ben volt igaza, a yaml-nek **3**-ban
      (az eltérés mindkét irányban jön). ERPSEP-05 → `in_progress` · ERPSEP-06 `blocked`, de
      **átminősített blokkolóval** (nem a függőség, hanem a gazda hiánya) · ERPSEP-07 és
      MODULE-PACKAGES doksi-státusza javítva · STAB-ASPNET22 „ready" → `pending`, **újramérve
      a helyes műszerrel** (4 csproj / 5 élő `Http.Abstractions 2.2.0`; az első mérésem
      érvénytelen volt: a `Encodings.Web`-lánc tranzitív, csprojban elvileg sem látszik).
      ⭐ **A triázs valódi hozadéka nem a státuszok, hanem az ok:** a gazdátlan, commitolatlan
      Codex-munkatest (ld. a Gábor-listán). A sáv **gazda-kérdése továbbra is nyitva.**
- [x] ~~**4 task-doksi archiválása**~~ **KÉSZ 2026-07-31** (`B2B-01`, `B2B-02`,
      `B2B-04`, `B2B-10-F5` → `archive/`, az `EPICS.yaml` útvonalai igazítva).
- [ ] **Az F7 R2-tétele:** Kernel-függés-nyilatkozat a release-jegyzetbe (az F5/3 lelete:
      a cross-tenant vonalat a Kernel tartja egyedül, és ha elromlik, a suite zöld marad).

## ÚJ leletek (2026-08-04, a review-körből)

- [ ] ⛔ **A PIN-BUMP A REVIEW RÉSZE — az én mulasztásom.** A platform portál-pinje
      **három commitot késett** (`f5f44b7` → `76bc647`): benne ült a már **APPROVED**
      `ee2cf04` és `f8829aa` is. A review lezárult, a pin nem követte → a platform által
      rögzített portál-verzió **nem tartalmazta a jóváhagyott munkát**. ⇒ napzárási sor:
      *APPROVED portál-szelet után a pin-bump nem külön feladat.*
- [ ] **Gábor elé: a parkolt B2B-08 portál-csomag** (`packages/module-collaboration`,
      17 fájl, 07-29 óta követetlen). Befejezés (F4 után) vagy dokumentált törlés — a
      `workspaces`-kizárás **nem** helyes irány. *(Ma három mérésbe is belógott.)*
- [ ] **Négy árva függőség a portálon** (`react-window`, `diff`, `html2canvas`,
      `react-zoom-pan-pinch`) — 0 import, pozitív kontrollal validált mérés. Kis task.
- [ ] ⛔ **Mérési szabály (ma 3 sávban bukott el): a felterjesztett számot csak-követett
      fán kell mérni**, ha a munkafán parkolt vagy idegen munka van — vagy ki kell mondani,
      hogy munkafa-szám.

## ÚJ leletek (2026-08-04 reggel, az S1-review mérése közben)

- [ ] ⛔ **S1a — a Kontrolling MA szivárog a főágon.** A HEAD-en
      `_ => BadRequest(FirstMessage(...))`, és két handler `Result<Guid>.Error(ex.Message)`-et
      ad (AddOverheadRule, RemoveOverheadRule). Az S1 hatókör-táblája „már javított"-ként
      zárta ki — **mert a piszkos munkafára mért**, ahol a Codex-patch javítása benne ül
      commitolatlanul. **Kiadva a backendnek.**
- [ ] **Fedezet-tétel:** az S1 redakciója 8 EHS Api-fájlban él, HTTP-határ-teszt **2**-t
      rögzít (M-ROOT mutáció a Ppe-ben **túlélt**, pozitív kontroll a fedettben 1 bukás).
      Az S1b kapu-sorába kerüljön be a **fájlonkénti** határ-teszt.
- [ ] ⛔ **Az engedélyező-listás kapu osztálya (PROJ-05-ből, de nem csak ott).** A projects
      RLS-kapuja 2 táblát sorol fel, a modulnak 3 van — a harmadikról az RLS **teljes**
      eltávolítása is **28/28 zölden** ment át (pozitív kontroll a listázott táblán: 4 bukás).
      **Tiltó alapértelmezésre kell váltani** (a séma összes tábláját a katalógusból).
      ⚠ Ugyanez az alak a HR `…_on_every_documented_table`-jében is — **az összes modulban
      át kell nézni**, nem csak a projectsben.
- [ ] ⛔ **Docker-függés program-szinten (Gábor-tétel).** Az S1-nél az első futásom **112**
      bukást adott, a backend S2-alapmérése **4**-et — mindkettő puszta Docker-hiány. A
      tesztek fail-closed buknak (helyes), de ebből következik, hogy a **„zöld suite"
      kizárólag futó Dockerrel jelent bármit**, és **nincs CI-kapu** rá. Ez már nem egy
      modul ügye.
- [ ] **AutoMapper 13.0.2 pin nem tart** — a feloldott verzió **14.0.0**
      (`GHSA-rvv3-g6hj-g44x`, MAGAS), a modul fut és a repó publikus.
- [ ] **@frontend: `packages/module-collaboration/` a portálon — 17 fájl, 07-29 óta
      követetlen.** Az appból semmi nem hivatkozik rá, a **követett `package-lock.json`
      viszont igen. Mérve: nem telepítés-blokkoló** (`npm ci --dry-run` a csak-követett fán
      lefut). Kész munka a főágon kívül — a döntés (befejezni / commitolni / törölni) a
      frontendé.
- [x] ~~**5 pusholatlan commit a platformon**~~ (köztük maga az S1 biztonsági javítás; a CI
      el sem indult rájuk) — **pusholva 2026-08-04**. A P0-listára: a napzárás **push**-sal
      záruljon, ne commit-tal.

## Futó sávok (2026-07-31 este)

- [ ] **backend `PROJ-01`** — a `spaceos.projects` v1 azonosság-magja (Gábor mai
      termékdöntése). Kötelező: hosting-csomag a kezdetektől · interceptor-E2E a
      CRM-pilot mintájára · valódi PostgreSQL · mutáció minden új kapura.
      ⚠ NE égesse be a `ProjectCode` formátumát és a wire-enum alakját.
- [ ] **backend: a 6 maradék modul interceptor-átállása** (`STAB-RLS-INTERCEPTOR-E2E`) —
      a **CRM-pilotot ma magam implementáltam** (`6f1ef5f`), az a minta.
      ⚠ Modulonként nézni: hol megengedő az EF-szűrő tenant nélkül (a CRM-é az volt).
- [ ] **doccapture: a motor CI 6. oka** (a zárvány-teszt a `reportlab`-ra mér, ami itt
      nincs telepítve) — **tervezői döntés, szándékosan náluk hagytam**. Utána DC-01b.
- [ ] **designer `WORLDS-WAREHOUSE-REVIEW`** — 07-28 óta állt, ma kiadva.
- [x] **B2B-10 F5 mind a 4 szelete APPROVED** — az F5 LEZÁRVA; az F7 üresnek mérve.
- [x] **DC-01a APPROVED** (9/9 szám újramérve) · **PORTAL-DEADTREE-A APPROVED** (8001 sor).

---

## Root-tételek, amiket ma átvettem

- [x] ~~**`ClaimsPrincipalUserIdExtensions.cs` untracked**~~ **MEGOLDVA 2026-07-31**
      (`3468fe4`): a besorolás volt hibás — nem idegen sáv folyamatban lévő munkája,
      hanem **szállított függőség hiánya** (a fogyasztó 07-29-én kiment a főágra).
      Tiszta `origin/main` kicsomagoláson bizonyítva (2 hiba → 0 hiba/0 warning).
      **A `dotnet-build-gate` azóta ZÖLD — a létrehozása óta először.**
- [ ] **Orphan `spaceos-modules-ehs` fa**: törlés vagy javítás? Mérve: nem fut,
      **nem is fordul**, és a `Program.cs` az **interceptor nélküli** DI-t hívja.
- [ ] **Kontrolling**: az `AddSpaceOsModuleTenancy()` az API-rétegben van, nem az
      Infrastructure-ben. Fail-loud, tehát nem hiba — de **döntés kell**, és ha
      marad, az előfeltétel a metódus doksijába.
- [ ] **ADR-070 D4**: a Python doc-capture motorban **nincs lockfile**. Publikus,
      telepíthető csomagnál a supply-chain rögzítés nem stílus-kérdés — a **G4
      telepítési alak** eldőlése előtt meg kell lennie.
- [ ] **`Invoke-DbRolePrivilegeGuard.ps1` bekötése** ütemezett futásba. ⚠ **Nem
      GitHub Actions**: SSH kell a VPS-hez.
- [x] ~~**A 3 árva gitlink** rendezése~~ **KÉSZ 2026-07-31** (`d6e647e`): mindhárom az
      initial commitból jött, `.gitmodules`-bejegyzés nélkül, a GitHub-repók nem léteznek.
      A `git submodule status` azóta **ad kimenetet** — a repó létrehozása óta először.
- [ ] **`Production.Tests`**: kereszt-repó kontraktus-sodródás a `contracts`
      submodule pinjén — semmi nem őrzi (a doc-capture hash-pinje a saját
      szerződésén igen).

---

## Kiadható / kiosztatlan

- [x] ~~**Platform-task 2. szelet, CRM-pilot**~~ **KÉSZ 2026-07-31** (`6f1ef5f`, root):
      5 interceptor-E2E teszt; a mutáció (interceptor-bekötés kivétele a DI-ből) pontosan
      a 3 kulcs-állító tesztet buktatja, míg a régi tükör-suite teljesen zöld maradna.
      **A maradék 6 modul a backend sávjában** (ld. Futó sávok).
- [ ] **`/mcp` hitelesítetlen discovery-manifest** (eszközlista, titok nélkül) — P2.
- [x] ~~**`/quote-request` testvér-lelet:** a megerősítő dialógus írja ki a gép
      **státuszát** is (XS, frontend).~~ **KÉSZ 2026-07-31** (portál `1ee7510`).
      A „most indítsd / tervezd be" művelet kérdése és a „nem szabad gépre ejtés:
      sorba állítás vagy tiltás" termékdöntés továbbra is Gáboré.
- [ ] P2-k: a `/wake`,`/inject`,`/stop`,`/stop-all` megengedő teszt-alakja ·
      CRM lapozás-metaadat a wire-en · `MaterialisationCode` wire-re emelése ·
      Alpine/musl solver-mérés · az EHS Infrastructure 10 warningja.

---

## ⚠ Fel NEM oldott státusz-eltérések (gazdát kérnek, nem találgatom)

| Task | `EPICS.yaml` | task-doksi |
|---|---|---|
| `ERPSEP-05-BACKEND-PACKAGING-CONTRACT` | pending | in_progress |
| `ERPSEP-06-INSTANCE-CONTEXT` | blocked | in_progress |
| `ERPSEP-07-EXTENSION-PACK-CONTRACT` | pending | blocked |
| `MODULE-PACKAGES` | in_progress | blocked |
| `STAB-PLATFORM-ASPNET22-RCE-REMOVAL` | pending | „ready" |

- [x] ~~Három Codex-task-doksi **untracked** és nincs az `EPICS.yaml`-ban~~
      **RENDEZVE 2026-08-03** (`21ec995`): mindhárom commitolva és regisztrálva
      (`blocked`, a blokkoló a gazda hiánya). ⚠ **De a jelzés a Codexnek NEM elég**, mert
      a mérés kihozta, hogy **a hozzájuk tartozó kód sincs a főágon** — ez már nem
      adminisztráció, hanem a fenti gazda-döntés tárgya.
- [x] ~~**Az EPIC-DOC-CAPTURE sincs az `EPICS.yaml`-ban**~~ **REGISZTRÁLVA 2026-07-31**
      (DC-00/DC-EXCEL/DC-06/DC-02 done · DC-01a in_progress · DC-01c blocked · DC-04 blocked),
      a 'DC-01b' név-ütközés kimondva (Excel-betöltő vs. PDF-írás szelet).

---

## Ma lezárva (2026-07-31) — részletek a `STATE.md`-ben

**12 review APPROVED, mind saját méréssel.** B2B-10 **F5 mind a 4 szelete** (az F5
LEZÁRVA) · **DC-01 terv + DC-01a** (9/9 szám újramérve) · **faipari RAG 1. fázis**
(saját VPS-mérés) · **frontend 7 szelet** (gép-státusz · PieceInputRow ·
designer-verifikáció · workflow read-only · lang+ThemeToggle · axe-kör · 3 axe-javítás)
· **PORTAL-DEADTREE-A** (59 fájl / **8001 sor**).

**Két main-ágat érintő lelet, mindkettő javítva:** a platform buildje **két napja
törött volt** (szállított függőség hiánya — a kapu azóta **ZÖLD**) · a doc-capture
motor CI-je **a DC-02 óta piros**, hat okból (ötöt javítottam).

**Root-munka:** CRM interceptor-E2E pilot · 3 árva gitlink · **F7 hatókör-elemzés**
(üresnek mérve, átdefiniálva) · B2B-01..08 megfeleltetés · befejezetlen-epic triázs ·
EPIC-DOC-CAPTURE + EPIC-PROJECTS-MODULE regisztrálva · **Gábor projekt-döntése
kihirdetve**, `PROJ-01` kiadva.

**Előrehaladás:** `EPICS.yaml` **80/124 → 90/133** kész.

---

## Állandó szabályok

0. **A munkafa nem a publikált állapot.** Ha egy kapu piros, a diagnózist **tiszta
   `origin/main` kicsomagoláson** mérd — ma ez kétszer hozott elő main-ágat érintő hibát.
0b. **A negatív eredmény érvényességét külön igazold** (futott-e le · illik-e a műszer ·
   van-e pozitív kontroll) — ma háromszor látszott hiánynak egy érvénytelen mérés.
0c. **Kiadás előtt mérd a task hatókörét** — egy 90%-ban kész task kiadva hamis munkát
   könyvel el és elrejti a valódi rést.

1. Done/APPROVED **kizárólag root-review, saját méréssel** — és a
   **warning-szám is mért tétel**, nem csak a Passed/Failed sor.
2. **`gh run list` push után.** Egy kapu, aminek az eredményét senki nem olvassa,
   nem kapu.
3. **Review-nként commitolj**; nincs `git add -A` vegyes fán, taskonkénti fájllista.
4. **Idegen repóban nincs destruktív parancs** — `revert`, nem `reset --hard`.
   Ütközésnél **a bent lévő író fejezze be**.
5. Termékdöntés **egy** csatornán megy fel; a választ ki kell hirdetni.
6. **Federation-üzenetre válaszolni kell** — a feldolgozás nem válasz.
7. VPS/éles migráció/credential csak **Gábor-jóváhagyással**.
8. **„Mit bizonyít, ha átment?"** — és a **„harap-e?" ≠ „mire lát?"**.
9. **Hash csak megnevezett bemenettel** bizonyíték: `sha1(<mit>)`.
10. **Biztonsági dokumentációban alakot írj le, ne értéket idézz** — ma négyszer
    gyártottam új találatot azzal, hogy egy szivárgást dokumentáltam.
11. **A mutáció a produkciós oldalt rontsa el** (a tesztet mutálni önigazolás),
    **alkalmazva-bizonyítással ÉS build-cache törléssel**.
12. **A munkafa nem a publikált állapot**, és a **lokális baseline nem érvényes
    CI-re**.
13. Egy hiba után **keresd meg a testvéreit** — és más ágens **mérőeszköz-hibáját**
    alkalmazd a sajátodra is.
14. **Egy ponton a további mérés maga válik halogatássá** — ezt a vezetőnek kell
    kimondania, nem a mérőnek.
