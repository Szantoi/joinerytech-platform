# ROOT Terminal TODO

> **Frissítve:** 2026-08-07 este (napzárás) · **Részletes állapot:** [`STATE.md`](STATE.md)
> **Kanonikus státusz:** [`EPICS.yaml`](../../EPICS.yaml) — a task-doksik státusz-sora **nem hiteles**.
> ⚠ **2026-08-06: a yaml is ALUL-jelentett** (PROJ-05/06 hiányzott belőle) — az eltérés
> **mindkét irányban** jön, ld. „Fel NEM oldott státusz-eltérések".

---

## P0 — minden session elején

- [ ] A két **Monitor** újraélesítése (a sessionnel együtt halnak).
- [ ] Csatorna **eleje + vége**, `git status` mindkét repóban, terminál-outboxok.
- [ ] **`gh run list`** — ma derült ki, hogy a `secret-scan` a létrehozása óta
      piros volt, és 20+ commiton át senki (én sem) nem nézte meg.

---

## 🔴 Gábor előtt — sürgősségi sorrendben

- [x] ~~⛔ **a `spaceos-modules-scheduling` repónak nincs gazdája**~~ **LEZÁRVA
      2026-08-07 — Gábor: a gazda a JoineryTech platform (root + csapat).** Bekapcsolva
      **12. gitlinkként** (`.gitmodules` +3 −0), pin **`d63f317` (M4/4), nem a HEAD**.
      ⚠ A kérdés **két indoklása téves volt** (újramérve, csatornában visszavonva):
      `terminals/` mappája **egyetlen** modul-submodule-nak sincs, a sáv a platform
      backend-terminálja (M1..M4 root-APPROVED bizonyítja); az M4/3+M4/4 push-kapu pedig
      **fel van oldva** (mindkettő `origin/main`-en, CI 5/5 success). A valódi hiány
      **kizárólag a gitlink** volt → 16. újraindítási szabály: a hiány-verdiktet a
      **társakon** kell mérni, nem magában.

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

- [x] ~~⛔ **a portál CI-je 07-30 óta piros, a `Tranche B` törlése oldja fel**~~
      **LEZÁRVA 2026-08-07 — a törlés MÁR MEGTÖRTÉNT** (portal `76bc647`, pusholva), és a
      platform-pin **már rajta áll**. Gábortól döntést kértem arra, ami el volt intézve —
      **mérnem kellett volna, mielőtt elé teszem.** ⚠ A CI **továbbra is piros**, de **más
      okból**: `Missing: @emnapi/core@1.11.3 from lock file` = a nyilvántartott
      **platform-függő lockfile** (Windowson generált lock, hiányzó Linux-only opcionális
      függőségek). Frontend-sáv. **A portál-pint nem bumpolom.**
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

- [ ] ⛔ **`/shopfloor` PIN-backdoor — ÚJ SÚLY 2026-08-07.** A `PIN=1234` **közös**
      belépő, ami **szembemegy** a mai Gábor-döntéssel (*„mindenkinek személyes fiókja
      legyen — a valódi audit nyomvonal"*). **A két tételt EGYÜTT kell eldönteni**,
      különben a platform és az instance **ellentétes mintát tanít**. A régi kérdés
      változatlan: egy nem működő világ mit keres publikus route-on (se backend, se
      MSW-mock). A frontend készen áll.
- [x] ~~⛔⛔ **48 könyv-oldal szkenn a publikus repóban**~~ **LEZÁRVA 2026-08-07**
      (Gábor: *„a szerzői jog fontos, törölni kell"* + *„igen, írjuk át a történetet"*).
      `ef16466` a fából · `78c4802` a **teljes történetből** (`filter-repo`, külön
      mirror-klón, 85 MB bundle-mentés + `verify`). **Friss GitHub-klónnal igazolva:**
      0 találat, pozitív kontroll 1, 394 commit, **HEAD-fa bájtra azonos**. A 15 saját
      fájl megvan. VPS-en is törölve, 11/11 service fut.
      ⚠ **Nyitva:** a VPS `/opt/joinerytech` a **régi** történeten áll (`b123146`) → ott a
      következő `git pull` **elszáll**. Friss klón vagy `fetch --force` + reset —
      **telepítési döntés.** *(Opcionális: GitHub Support a szerver-oldali objektumokra.)*
      ⚠ **A bináris-kapu továbbra sem épült meg** (a `.gitignore` egyetlen bináris alakot
      sem fog) — a doccapture `binary_guard.py` mintája átvehető, **döntést kér.**
      ⚠ A maradék **405 kép** (`screenshots/`, qa assets) átnézése **NEM történt meg.**
- [ ] **Négy kulcs visszavonása:** Google Gemini · **két** Brave Search
      (`061ddd503f`, `cefeb3edee`) · a forrás-prototípus **két
      modell-szolgáltatói kulcsa** (egyikük a **futó app** `settings.json`-jában).
- [x] ~~⚠ **`NOBYPASSRLS` — két modul újratelepítése kell**~~ **ÉLESÍTVE 2026-08-07**
      (Gábor: *„most is mehet"*, majd *„maradjon"*). Mind a **három** worker-szerep
      `bypassrls=false`; mérés utána: mindkét service `active`, **0** permission-denied /
      42501 / row-level hiba, a hibatípusok előtte/utána azonosak.
      ⚠ **A 07-31-i saját felmérésem megdőlt:** a `SECURITY DEFINER` függvények hiányát
      vettem előfeltételnek, de ezek a modulok **nem azt használják** — a telepített
      (07-22) kódban a `TenantSessionInterceptor` **megvan és be van kötve**, az élő
      DB-ken **áll az RLS** (inventory 6 tábla FORCE + 6 policy, procurement 14+14).
      **Rossz műszert néztem, és egy nem létező deploy-igényt tettem Gábor asztalára.**
      ⚠ **Eltérés a 07-27-i sorrendtől, kimondva:** a 2. lépés (**szűk SECURITY DEFINER
      függvények**) **nem készült el**, és én a 3.-at hajtottam végre. Latens kockázat: a
      keresztbérlős háttérműveletek GUC nélkül **néma no-op**-pá válhatnak (mért enyhítő:
      `procurement_outbox` 0 sor). **A definer-függvények Gábor döntésével előre sorolva.**
- [ ] **CI-hatókör:** PAT a privát `spaceos-kernel`-hez (a build-kapu ma 6/15
      projektet mér) · teszt-kapu (Docker; a collaboration suite **13 m 19 s**).
- [ ] **`npm publish`** a `@spaceos/portal-ui`-ra · **VPS-IP** maradhat-e a
      publikus repóban · a **3 platform-submodule pushja**.
- [x] ~~**licenc-blokkoló**~~ **LEZÁRVA 2026-08-07 (Gábor: „ne legyen blokkoló").**
      ⚠ A `DC-01c` **`blocked` MARAD**: a licenc a **három** blokkolójából csak az egyik
      volt; a (2) NuGet-fogyasztási út és a (3) hiányzó .NET projektek **műszaki**
      hiányok. Amit a döntés nem old fel: publikus repó licenc nélkül = „minden jog
      fenntartva" **minden fogyasztónak**, a Doorstarra is.
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

## ⭐ 2026-08-07 — a nap tétele: a platform-munka NEM háttér

Gábor: *„most a Doorstarnak kell terméket szállítani, a platform-fejlesztés háttér."*
**Mérve az ellenkezője:** a `DSCONV-02…09` **mind `dependency-blocked`**, és **négy
platform-kapun** állnak (`PLATFORM-GATES.md`: *„ezeket kizárólag conductor vagy root
zárhatja"*). A kapuk az **ERPSEP**-sávon → **amit háttérnek hívtunk, az a szűk
keresztmetszet.**

- [ ] ⭐ **`ERPSEP-04` F1 — domain-szerződés doksi. AZ ENÉM, INDUL.**
      Gábor kimondta a döntést (*„szét kell választani az ERP-t, a SpaceOS-t és a
      JoineryTech-et, hogy tudjak szolgáltatni"*) — de **a döntés 2026-07-25 óta megvan**
      (külön repó: `spaceos-erp-core`, GitHub Packages, **nem** forrás-submodule), a 4 fázis
      kiírva, és az epic `owner: root`. **13 napja `pending`, és én „gazdátlan sávnak"
      neveztem a saját epicemet.**
      A fizikai ok, újramérve: a kanonikus CRM-ben **0** Order/Quote/Customer aggregátum,
      a rendelés-fogalom viszont `Joinery/DoorOrder.cs` és `Procurement/PurchaseOrder.cs`.
      **Nincs ERP-mag** → egy második ügyfélhez ma a `DoorOrder`-t is vinni kellene.
      **Gábor döntése: (a) — a `DoorOrder` MARAD és hivatkozik** a semleges `Order`-re;
      a szétválasztás nem vehet el a működő terméktől. Később (b), migrációval.
- [ ] **`GATE-INSTANCE` zárása — a legolcsóbb első kapu.** 5-ből 3 bemenet kész
      (ERPSEP-02 ✓, ERPSEP-03 ✓, ADR-072 ✓); hiányzik az **`ERPSEP-07`** (architect,
      pending) és egy **kompatibilitási/breaking-change policy**. Ez bizonyítja, hogy a
      kapu-mechanizmus egyáltalán működik.
- [ ] **A scheduling 9 review nélküli commitja** → gitlink-bump → **v4-befogadás** → a Flow
      Lab solverének leépítése. *(A v3 elavult 8 tagcsoportban; a Flow Lab a v4-et
      leszállította, a burkot **a platform** rakja össze.)*
- [ ] **`AUTH-DOORSTAR-ONBOARDING`** — **hatókör-szűkítve**: az instance-oldalt már lefedi a
      `DSCONV-03` (P0, és részletesebben). Ez a task **csak a platform tartozása**:
      auth/tenant **szerződés** + **audience-mapper** + **identity-modul gazdába vétele**.

### Ma lezárva (2026-08-07)

- [x] **A scheduling-repó gazdája a platform** (`ddbaf15`) — 12. gitlink, pin `d63f317`
      (**nem** a HEAD: 9 commit áll review nélkül).
- [x] **Történet-átírás** (`78c4802`) · **NOBYPASSRLS** (`a0dcc51`) · **demóadat
      fertőtlenítés** (`6d35d35`) · **`DC-PII-IMPORT-GATE`** kiírva a doccapture-nek
      (`f766ff9`).
- [x] **A tegnapi visszavonásom volt téves** (`5fd8dcf`) — az adatvédelmi lelet **ÁLLT**;
      a már redaktált fán mértem nullát.
- [x] **Flow Lab:** 4 üzenet (`008`–`011`), a **termékesítési blokkolójuk feloldva**;
      a képesség helye a **doc-capture termékvonal** (saját terminál).

### ⚠ 5 review-kérés áll 2026-08-05 óta

backend **PROJ-06 API-host** · backend **ERPSEP-05 helyesbítés** · doccapture **DC-03a** ·
frontend **suite-recept** · frontend **általános portál-kapu**.
**Kettő közülük (PROJ-06, ERPSEP-05) a kritikus úton van.**

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
- [x] ~~**doccapture: DC-01b-write + a CI-kör + a betűtípus-kapu**~~ **2026-08-05: a TARTALOM
      APPROVED, a COMMIT BLOKKOLT** (verdikt: doccapture/inbox `2026-08-05_001`).
      Saját mérés: **405 zöld**, körök 324/13/68 `KIHAGYVA=0`, mutáció **53/53**, 4 kapu tiszta,
      pin egyezik. CI: **3 egymás utáni success** a `master`-en.
      M-ROOT (a *termelő*, nem a fogyasztó: `_uncovered_characters` → `frozenset()`):
      **2 bukás** → a varrat fedve, **negatív eredmény, kimondva**.
      ⛔ **A commitot nem adtam ki:** a fa túlnőtt a felterjesztésen (`ports.py` +30/−8 helyett
      **+74/−12**, `config.py` a listában nincs, de **+41**), és a deklarált fájlok **egy be nem
      jelentett szeletre** (DC-03a) hivatkoznak → a hatókör rekonstruálva **18 ImportError**.
      ⚠ A fa **mozgott a bírálat közben** (mtime 18:49–19:00), és egy percre **piros** volt egy
      **abszolút útvonallal egy PUBLIKUS repó forrásában**. Fagyasztott másolaton 445 zöld.
      ✅ **A terv-eltérés (nincs `reportlab`) RATIFIKÁLVA** — a `pypdfium2<5` felső korlát
      indoklással megvan, tehát a `raw` ctypes-felület verzió-driftje fedett.
      ⇒ **Kérve: a DC-03a saját `review_requested`-je**, utána két külön commit.
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

- [x] ~~**backend: ERPSEP-05 helyesbítés** (`c81950a`)~~ **RATIFIKÁLVA 2026-08-05**
      (verdikt: backend/inbox `2026-08-05_001`). A „82"-t megmértem (Fact/Theory 75→78,
      állandó +7 eltérés → koherens; a „73" ~68-at kívánna). A **negyedik `.Error`-termelő**
      megerősítve halottként; a törlés **hatóköre zárt** (mind a 3 függősége él máshol is),
      **de** eltüntet egy 10 perces cache-t, ami az élő úton **nincs** → ez magyarázza az S4-et.
- [x] ~~**frontend: suite-recept rése + általános portál-kapu**~~ **APPROVED 2026-08-05, PUSHOLVA**
      (`2987761` + `51d5484`; verdikt: frontend/inbox `2026-08-05_001`).
      Saját mérés: `--dir src` **91** + `--dir packages` **88** = bare **179** (teljes, diszjunkt);
      eslint **718 fájl / 102 probléma** — egyezik a 08-04-i független mérésemmel.
      A racsni két „üresen zöld" megkerülését próbáltam — **mindkettő helyesen bukik** (negatív eredmény).
      ⭐ **M-ROOT lelet:** a racsni a SZÁMOT méri, a HATÓKÖRT nem — a 102 probléma mind a
      275 `src/`-fájlban ül, a 443 `packages/`-fájl 0-t ad ⇒ egy hatókör-szűkülés `COUNT=0`-t
      adna, ami **átmegy**, és a figyelmeztetés jó hírnek olvasható. Kérve: a lintelt fájlszám kikötése.
- [ ] ⛔ **portál lockfile platform-függő — a kapu ELSŐ futása fogta meg** (`31032910804` PIROS).
      `npm ci` Linuxon: `Missing @emnapi/core@1.11.3, @emnapi/runtime@1.11.3`. Gyökér-ok mérve:
      a `@emnapi/*` a wasm32-wasi ág **peer**-függősége (`package-lock.json:983-984`), amit a
      Windowson generált lockfile nem old fel.
      ⚠ **SAJÁT HELYESBÍTÉS:** a 08-04-i „a 07-30 óta piros telepítés feloldva" **túlzás volt** —
      a `portal-ui` a Tranche B óta **egyszer sem futott**. Az ERESOLVE megszűnését bizonyítottam
      (Windowson), a CI-telepítést **nem**.
      **Feladat a frontendnek**; elfogadás **csak zöld CI-futással**. Két mért csapda: a
      `--package-lock-only` beírja a parkolt `@spaceos/module-collaboration`-t; a VPS npm-je 10.9.4
      a CI 11.6.2-je helyett.
      ⇒ **A portál-pint addig NEM bumpolom.**
- [x] ~~**doccapture: DC-03a**~~ **APPROVED 2026-08-05** (verdikt: doccapture/inbox `2026-08-05_002`).
      Saját mérés fagyasztva: **447 zöld**, 366/13/68 `KIHAGYVA=0`, mutáció **68/68**, 4 kapu tiszta.
      ⭐ **M-ROOT TÚLÉLT:** az átfedésnek KÉT előállító útja van, és csak az egyik fedett
      (`chunking.py:382` akkumuláció → túlélt; pozitív kontroll `:311` ablakozás → 1 bukás).
      **A negyedik ugyanilyen alakú lelet két nap alatt.**
      A célpont-leletük bizonyítéka **halott fából** jött (`server.legacy.ts` nincs bekötve),
      de az élő úton ugyanaz (`knowledge.routes.ts:48`) → **a következtetés áll**.
      ⭐ **DC-03b DÖNTÉS: export-átadás** — mérve (`indexer.ts:18` `KNOWLEDGE_BASE_PATH`) ma is
      van befogadó út, nulla Nexus-változtatással.
- [ ] ⛔ **doccapture: a commit MÁSODSZOR visszatartva** — 19:37-kor egy **harmadik** szelet
      (`neutrality_guard` +149, új tesztfájl) ült a fára, mire a DC-03a-verdiktet lezártam.
      **Sávszabály kiadva:** a fa áll; a neutrality-szelet felterjesztendő; utána EGY mérés,
      EGY commit mindhárom szeletre. Két saját helyesbítés a `2026-08-05_003`-ban.
- [ ] **nexus-dev felé:** a KS `/health` a `KNOWLEDGE_PATH`-t jelenti, az indexelő a
      `KNOWLEDGE_BASE_PATH`-t olvassa — két név ugyanarra, a health `(default)`-ot mondhat
      egy egészen más fa indexelése közben.
- [ ] **root-sáv:** a három doccapture doksi-hiba (EPICS.yaml DC-03 címke-ütközés az
      `DC-01-TERV` 146. sorával · az epic-README „Markdown-export már megvan" sora · a
      `VectorStorePort`/`SearchIndex` névkettősség) — az enyém, átvettem.

- [x] ~~**backend PROJ-06 (Api + host) + RLS-kapu-szelet**~~ **APPROVED 2026-08-05**
      (`855c6a1` + `9b8ce1b`; verdikt: backend/inbox `2026-08-05_002`). Saját mérés futó
      Dockerrel: **unit 51/51**, **integráció 33/33**, 0 warning. A PROJ-05-leletem lezárva
      (katalógus-alapú, tiltó alapértelmezésű RLS-kapu, pozitív kontrollal a felfedezésre).
      M-ROOT (az elavult `If-Match` elfogadása, a 428-as ág érintetlenül): **2 bukás**,
      handleren ÉS dróton → nem találtam rést.
      ⚠ **SAJÁT HIBA elfogadva:** a PROJ-05-verdiktemben egy tesztre a **neve alapján**
      hivatkoztam, és a törzse mást mért — a query-filter oldal fedetlen volt.
- [ ] **Gábor-listára (deploy-előfeltétel):** `Projects:Kernel:BaseUrl` +
      `ConnectionStrings:ProjectsDatabase` (nincs fallback, `ValidateOnStart`) · a
      `projects-api` **audience-mapper** az éles realmban (mapper nélkül minden modul-API 401).
- [ ] **frontendnek jelezni:** a portál `/w/projects` mockból él; a PROJ-06 wire-alakja **már
      ehhez az API-hoz igazodik** — a bekötésnél nem alakot kell egyeztetni, csak forrást cserélni.

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

## ÚJ leletek (2026-08-06) — a „beépüljön-e a Doorstar?" mérésből

- [ ] ⛔ **VALÓDI HIBA: ügyfélnév beégetve platform-produkciós kódba.**
      `spaceos-modules-joinery/.../Pdf/ProductionSheetGenerator.cs:252` és `:270`:
      `"Doorstar Kft. — Gyártásilap"` — **interpolált string-literál**, nem konfiguráció.
      ⇒ **minden** joinery-t használó bérlő gyártásilapján a Doorstar neve jelenne meg.
      Ez nem rendetlenség, hanem működési hiba. Javítás: bérlő-/config-vezérelt fejléc.
- [ ] **Instance-adat platform-migrációkban** (a csatolódás zöme, 23 kódsor):
      kernel `Migration_0028_StageRegistry` (8), cutting `AddPricingTables` (7), kernel
      `AddTenantSubdomain`/`TenantEnabledModules`/`TenantHandshakeAllowlist`/
      `EcosystemActorTypes` (1-2 db), joinery seeder-ek. A kernel-seedek **bérlő-szűrtek**
      (`WHERE "BrandSkinId" = 'doorstar'`), tehát más bérlő viselkedését nem rontják —
      ez **rétegvágási** adósság (ADR-069 D2), nem hiba. Migrációt **nem** írunk át:
      a jövőbeli seed menjen az instance-rétegbe.
- [x] ~~Javaslat: az instance-semlegességi őr kiterjesztése~~ **KIADVA TASKKÉNT 2026-08-06**
      (Gábor: „jegyezd fel mint feladatot") →
      **[`ERPSEP-INSTANCE-NEUTRALITY-GATE`](../../docs/tasks/EPIC-ERP-SEPARATION-2026Q3/ERPSEP-INSTANCE-NEUTRALITY-GATE.md)**,
      `EPICS.yaml` → `EPIC-ERP-SEPARATION-2026Q3` / `E1-boundaries`, `status: pending`.
      Két fázis (cégnév feloldása → kapu), **kötelező sorrenddel**, negatív kontrollal és
      route-elérhetőségi bizonyítékkal. **A fenti két lelet ennek a taskja — a
      státusz-forrás mostantól az `EPICS.yaml`, ne itt vezessük.**

## ⛔ ÚJ tételek (2026-08-07) — a Flow Lab sávból

- [x] ~~**a `raw/` adatvédelmi lelet HAMIS**~~ **A VISSZAVONÁSOM volt téves — a lelet
      ÁLLT** (`5fd8dcf`). A `7e352dc`-vel alaptalanul vontam vissza: a **már redaktált**
      fán mértem (a `d6bfc3c`-t 20:40-kor amend-del átírták `4be3711`-re, én 20:46-kor
      „helyesbítettem”). Bizonyíték: a redakció nyoma (`ProjektNev`) fájlonként pontosan
      ott áll, ahol az ügyfélnév volt — 98/1057/1001/5 = **2161** —, és a mai **53 üres
      cella** épp az a 34+19, amit ők ürítettek ki. **A `python -c` karakter-osztály-hibát
      ÉN találtam ki** — a 13. újraindítási szabály és a mintázat 4. példánya
      visszavonva. Flow Lab értesítve: `inbox/2026-08-07_007`.
- [ ] **ADR-0016 (Flow Lab) — a közös fájlra vonatkozó rész JAVASLAT hozzám.** Ma
      elfogadták náluk (`83ab900`): a pack-export termék-funkcióvá válik a `src/`-ben, a
      641 soros outbox-beli `build_pack.py` helyett. **Helyesen szűkítették a hatályt:**
      kimondják, hogy 2026-08-07 óta a **platform** birtokolja az ütemezést, a
      pack-**szerződést** és a **review-t** → a közös fájlról szóló rész **javaslat**.
      Root-teendő: a javaslati rész átnézése (a lokális deríváció az ő döntésük).
- [ ] **A `raw/` 4 maradék ügyfélnév-előfordulása** (2 fájl) — a mai méréstől független
      tétel; **távoli hozzáadása előtt** zárandó. (A fa ma még lokális: távoli **nincs**.)


## ÚJ tételek (2026-08-06) — a Flow Lab ütemezés-döntéséből

Döntés: **az ütemezés gazdája a `spaceos.scheduling`** (verdikt a flow-lab root inboxában,
csatorna-bejegyzés `+68 −0`). Mérve: ADR-069 §4 szó szerint · joinery 41 sor / 9 családkulcs ·
kernel FlowManagement 0 migráció 0 route · scheduling Domain.Tests **263/263 zöld**.

- [ ] ⚠ **Joinery rétegvágás-adósság:** a `spaceos-modules-joinery` **Doorstar-specifikus
      adatot seedel egy PLATFORM-modulban** (`DoorstarSeedData.cs`, 41 `ProcessTaskTemplate`,
      9 családkulcs). Az ADR-069 D2 szerint ez az **instance-rétegé**. Nem törlöm, amíg a
      41 ↔ 4 leképezési tábla nincs meg — a seed lehet az egyetlen példány.
- [ ] **A 41 ↔ 4 folyamatdefiníció-ütközés** (`GyI-*` seed vs. `PREPARATION`/`DOOR_LEAF`/
      `JAMB_CORE`/`CASING` munkafüzet-olvasat). Szállítmány a Flow Labtől: explicit
      leképezési tábla, a lefedetlen sorok nevesítve. **Addig egyik sem kanonikus, és
      egyik sem törölhető.** A döntés utána az enyém.
- [x] ~~**input-pack v3 elfogadási előfeltétele:** a hash-pin kapu bizonyítottan harapjon~~
      **KÉSZ 2026-08-06, két mutációval.** M-ROOT-1 (pack romlik, `.sha256` marad) → 5 bukás,
      **és a teljes szám 263→246**: a pin dob, 17 teszt el sem indul. M-ROOT-2 (a **dokumentált**
      frissítési út: pack + `.sha256` együtt) → a hash-kapu átengedi, mind a 263 fut, és
      **1 bukás** a `Dependency_vector_reproduces(ss-positive-lag)`-on. ⇒ **negatív eredmény:
      a frissítési út NEM hatástalanítja a kaput** — tartalmat mér, nem csak integritást.
      sha1 `59dd6aab`→`009812bb`→vissza `59dd6aab`, `git status` üres, újra 263/263 zöld.
- [ ] ⛔ **ÚJ 2026-08-07 — 9 COMMIT ROOT-REVIEW NÉLKÜL a scheduling-repóban. Ez most az
      én sávom** (a gazda-döntéssel a kapu hozzám került). A `d63f317` (M4/4, utolsó
      APPROVED) után: `7cd7276` m4-5 solver DI-bekötés · `5cf9e7a` m4-6 shadow-diff
      read-model · `8da898a..e22687a` kontraktus/1..7. Az utolsó commit egy
      **1.0.0-preview.2 — kézbesítésre kész** verzió-emelés: **önjelentett készültség,
      ami a Doorstar felé kézbesítési jelzés** — a review-kapu szerint érvénytelen.
      Sorrend: **review → gitlink-bump → v3-befogadás → Flow Lab solver leépítése.**
- [x] ~~⚠ **A v3 BEFOGADÁSA gazdátlan**~~ **FELOLDVA 2026-08-07** — a mérő fél a platform.
      A befogadás a fenti 9-commit-review **után** jön.
- [ ] **ADR-069-kiegészítés: indítási késleltetés ≠ `extraDays`.** A Flow Lab
      `startDelayWorkingDays`-ként hozza, és **helyesen NEM képezi rá** az `extraDays`-re:
      a képlet (`days = ceil(elapsed / workingMinutesPerDay) + extraDays`) a **tartamhoz**
      ad, a késleltetés a **kezdést** tolja. Összemosásuk csendben rossz tervet adna.
      **Ez az ADR-069 hiánya, az én sávom.**
- [ ] **A 3 „törött gitlink" doksi-hivatkozás elavult** — mérve: `identity`/`keycloak-theme`/
      `sales` **nincs az indexben** (11 gitlink, egyik sem ez). A `PORTAL_WORLDS_INVENTORY`,
      `PROJECT_STATE_ASSESSMENT`, `ERP_CAPABILITY_BOUNDARY_AUDIT` és a gyökér `CLAUDE.md`
      máig „kicsekkolatlan almodulként" írja le őket — ez küldött téves kérést a Flow Labtől.
      Root-sáv: a leírás igazítása a mért állapothoz.

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

## Futó sávok (2026-08-06 este)

| Sáv | Mi fut | Blokk |
|---|---|---|
| **Flow Lab** (doorstar) | katalógus-ADR (1%-os javítás, hash-rotáció) — **engedélyeztem**; a `raw/` 4 maradék ügyfélnév-előfordulása | a **solver leépítése BLOKKOLT** a v3-befogadásig |
| backend | `PROJ-01`/`PROJ-02`, `STAB-RLS-INTERCEPTOR-E2E` (6 modul, a CRM a minta) | — |
| doccapture | a neutrality-szelet felterjesztésére vár | **a fa hold alatt**, 3 szelet egy commitban zárul |
| frontend | a portál lockfile platform-függősége | a CI-kapu **piros**; a portál-pint **nem bumpolom** |
| **platform (root)** | `ERPSEP-INSTANCE-NEUTRALITY-GATE` kiadva, kiosztásra vár | a 2. fázis függ az 1.-től |

<details><summary>Korábbi pillanatkép (2026-07-31 este)</summary>



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

</details>

---

## Root-tételek, amiket 2026-07-31-én átvettem

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

## Ma lezárva (2026-08-06) — részletek a `STATE.md`-ben

- [x] **Az ütemezés gazdája: `spaceos.scheduling`** (`3763a0b`) — a döntő lelet, hogy az
      FS-normalizálás **az importban** történik, tehát az ADR-069 §4 bemenetét pusztítja el.
- [x] **A fogyasztás NEM NuGet** (`179c5ab`) — a scheduling nem publikál csomagot; a
      szerződés a `docs/openapi.yaml`. NuGet a **hostingra** kell, nem az ütemezőre.
- [x] **Munkamegosztás** (`e571f5d`) — a v3-at a Flow Lab **állítja elő**, a platform
      **veszi be**: egy kapu, aminek a bemenetét a mért fél állítja be, sosem bukhat el.
- [x] **v3-átadás APPROVED** (`832567f`) + **a `raw/` lelet lezárva** (`cdf9bd2`).
- [x] ⭐ **A hash-pin kapu mutációval bizonyítva** — a v3-befogadás előfeltétele **teljesült**.
- [x] ⚠ **Két saját helyesbítés publikálva** (`832567f`, `7e352dc`): a családkulcs-bontásom
      mind a 9 családon rossz volt, és egy **adatvédelmi vádam alaptalan** volt (ékezetes
      minta a shellen → megromlott karakter-osztály → 2165 hamis „találat" 4 helyett).
- [x] **`ERPSEP-INSTANCE-NEUTRALITY-GATE` kiadva** (`64c1054`) — beégetett ügyfél-cégnév
      egy platform-modul PDF-generátorában, route-elérhetőséggel triázsolva.
- [x] **PROJ-05/06 retroaktívan bejegyezve** az `EPICS.yaml`-ba (93/143).

---

## ⚠ Fel NEM oldott státusz-eltérések (gazdát kérnek, nem találgatom)

- [ ] ⛔ **ÚJ 2026-08-06 — `PROJ-NUMBERING-GAP` (`EPICS.yaml`, open).** A
      `docs/tasks/EPIC-PROJECTS-MODULE-2026Q3/` mappa **ÜRES** (0 task-doksi), a git-log
      **PROJ-01 után egyből PROJ-05-re ugrik**, és a **PROJ-01 `in_progress`, miközben a rá
      épülő PROJ-05/06 `done`**. Belsőleg ellentmondásos. **A backend mondja meg**, hogy a
      PROJ-02/03/04 (a) beolvadt, (b) elmaradt, vagy (c) más néven készült el — és hogy a
      PROJ-01 valójában zárt-e. Amíg nyitva, **ennek az epicnek a done-aránya nem hiteles**.
- [ ] **`DC-01b-write` és `DC-03` `pending` a yaml-ban, pedig APPROVED** — a commit
      szándékosan visszatartva a doccapture-sávban (hold). A yaml akkor javul, ha a három
      szelet egy commitban zárul.

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

## Korábban lezárva (2026-07-31)

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
