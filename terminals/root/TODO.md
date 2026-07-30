# ROOT Terminal TODO

> **Frissítve:** 2026-07-30 délelőtt
> **Részletes állapot:** [`STATE.md`](STATE.md) · **Döntések:** `docs/knowledge/architecture/DONTESEK_2026-07-29.md`

## ✅ A P0 BLOKKOLÓ LEZÁRVA (2026-07-30)

- [x] **TOKEN-ROTÁCIÓ végrehajtva**, 79 commit kipusholva. Öt titok-osztály,
      füstpróba három elkülönülő státusszal, `secret-scan`: 72 → 28.
      Napló: `docs/knowledge/deployment/TOKEN_ROTATION_RUNBOOK_2026-07-30.md`.

## 🔴 Ami Gáborra vár a rotációból

- [ ] **Google Gemini API-kulcs** visszavonása (konzol) — a kód már env-et olvas.
- [ ] **Brave Search API-kulcs** visszavonása (**E osztály**, ma találtam;
      `sha1(BRAVE_API_KEY értéke) = 061ddd503f`).
- [ ] **VPS-IP / tailnet-cím** maradhat-e a publikus repóban?
- [ ] A **3 submodule pushja** — idegen pusholatlan commitok miatt visszatartva.

## Ma zárt review-k (2026-07-30, mind saját méréssel)

- [x] **B2B-10 F3/1** — 144/144 + 2 mutáció (lejárat 2, visszavonás 3 bukó).
- [x] **B2B-10 F3/2 + F3/3** — 175/175 + **34/34 valódi PostgreSQL**.
      ⚠ Kötelező az F3/4-be: negatív teszt a **megállapodás**-úton (nem-részes
      hibás `If-Match`-csel is **404**, ne 412 — verzió-orákulum). Az MC3
      mutációm ott **túlélte**.
- [x] **doccapture DC-01b** — 154/154 · **141/141 függőség nélkül, 0 kihagyás** ·
      semlegességi kapu TISZTA · saját R-G4 mutáció 4 bukó. Commitolva
      mind a 3 repóban (MIT licenc a G5 szerint).
- [x] **szivárgás-kapu zaj-hangolás** — 0 FAIL önteszt, minden pozitív/negatív
      kontroll helyes. A frontend **javította a javaslatomat** (zárójel, nem
      pont — a pont a JWT-kre vakított volna).
- [x] **CatalogPanel lint-szelet** — 28/28 + saját R-M1 mutáció 5/5 bukó.
      Három valódi defekt egy lint-figyelmeztetés mögött.
- [x] **portál submodule pusholva** (11 APPROVED commit) + pointer-bump.

## Ma zárt, 2. kör (2026-07-30 délután)

- [x] **B2B-10 F3/4 + F3/5 APPROVED** — 226/226 unit + **46/46 valódi
      PostgreSQL**. **Az F3 öt szelete kész.**
- [x] **szivárgás-kapu — a két vak pont bezárva** (frontend): önteszt 40/40,
      **10/10 saját kontroll**, fa-diff **+3/−0**, a naiv alak ugyanott **84**-et
      adna. A `ENTERPRISE_GOVERNANCE_PATTERNS.md:705`-öt átnéztem: `abc123...xyz789==`,
      **szó szerinti pontokkal írt helykitöltő** — nem szivárgás.
- [x] **RLS-tükör konformancia** (root önmérés) — `InterceptorMirrorConformanceTests`.
- [ ] **`B2B-10-F3X-ORDERING-PROOF`** (XS, backend, **kiadva**) — a háromszor
      átvitt tétel saját taskot kapott. Az `R-MC3/agreement` mutáció az F3/5
      utáni fán is **túlélte** (226/226 és 46/46 zöld); az ok mérve: **egyetlen
      E2E teszt sem küld ÍRÁST nem-részesként.**
- [ ] **Idempotencia-rekordok takarítása** — üzemeltetési feladat, a pilot előtt
      ütemezés kell (a szelet szándékosan nem telepíti).

## Ma zárt, 3. kör (2026-07-30 este)

- [x] **B2B-10 F3X APPROVED** — az F3 utolsó `[~]` tétele `[x]`-re, F3X archiválva.
- [x] **DC-02 APPROVED** (a `.NET` oldal először mérve) + **ADR-071 APPROVED**
      (23/23 mutáció, élő kereszt-repó hash bájtra) — mindkettő pusholva.
- [x] **scheduling lint APPROVED**, pusholva.
- [x] **lint élő/halott térkép elfogadva** (31 halott fájl, **0/31 cáfolva**).
- [x] **Szerep-jogosultság kapu** megírva + az **éles állapot megmérve**.
- [x] **ADR-index javítva**: hét elfogadott ADR (065–071) nem szerepelt egyetlen
      indexben sem; mind a 13 link ellenőrizve, hogy létező fájlra oldódik.

## 🔴 Gábor előtt — sürgősségi sorrendben

- [ ] **`/quote-request` hamis „elküldve"** — a javítás **kiadva** (nem
      termékdöntés), de tudnod kell: **valódi backend van mögötte** (mérve), tehát
      eddig **minden hibás beküldés némán elveszett** a publikus ügyfél-felületen.
- [ ] **`/shopfloor`**: a beégetett `PIN=1234` ág **ki** (nem kérdés). A kérdés:
      **egy nem működő világ mit keres publikus route-on?** (Mérve: se backend,
      se MSW-mock → a PIN az egyetlen működő belépő minden környezetben.)
- [ ] **CI-hatókör** (`STAB-CI-DOTNET-GATE`): mind a 27 projekt vs. előbb a
      Docker-mentes rész · PR-kapu vs. éjszakai. Kapu-költség mérve: a
      collaboration integrációs suite **13 m 19 s** szerializálva.
- [ ] A korábbi négy kulcs-visszavonás + VPS-IP + a 3 submodule pushja + `npm publish`.

## Root-tételek, amiket ma átvettem

- [ ] **ADR-070 D4**: a Python doc-capture motorban **nincs lockfile**. Publikus,
      telepíthető csomagnál a supply-chain rögzítés nem stílus-kérdés — a **G4
      telepítési alak** eldőlése előtt meg kell lennie.
- [ ] **Orphan `spaceos-modules-ehs` fa**: törlés vagy fenntartott build-cél?
      (Mérve: nem fut, nincs unit, nincs `bin/` — **halott kód lappangó
      csapdával**: a `Program.cs` az interceptor nélküli DI-t hívja.)
- [ ] **Kontrolling**: az `AddSpaceOsModuleTenancy()` az **API-rétegben** van,
      nem az Infrastructure-ben. Nem hiba (fail-loud), de **döntés kell**, és ha
      marad, az előfeltétel a metódus doksijába.
- [ ] **`Invoke-DbRolePrivilegeGuard.ps1` bekötése** ütemezett futásba — ma
      kézi indításra vár, mint minden más mai kapu.

## Task-átvizsgálás — 2026-07-30 (root)

**9 task archiválva** (mind root-review-val igazolva, `docs/tasks/<EPIC>/archive/`):
`STAB-NEXUS-SHELL-HARDENING` · `STAB-CRM-LIST-PAGING` ·
`PLAN-02-SCHEDULING-ADR` · `PLAN-05-SCHEDULING-UI-GENERALIZATION` ·
`PLAN-05-F5-SCHEDULING-DATE-PICKER` · `PLAN-05-F6-SZEREP-SZOTAR-BOVITES` ·
`ERPSEP-FE-WORLD-GATING` · `B2B-10-F1-…-APPLICATION-LAYER` ·
`B2B-10-F3-…-API-AUTHORIZATION`.

### ⚠ 6 task `done`-t mutatott, ami BIZONYÍTOTTAN HAMIS — nem archiválva, javítva

A `B2B-01/02/04/05/06/07` task-doksija `done`-on állt, miközben az **`EPICS.yaml`
`changes_requested`-et** mondott, és a
[REAUDIT](../../docs/knowledge/architecture/B2B_COLLABORATION_REAUDIT_2026-07-28.md)
verdiktje: **B2B-02 · B2B-06 · B2B-07 = HAMIS**, **B2B-01 · B2B-04 · B2B-05 = RÉSZBEN**.
**Ezek archiválása egy bizonyított adósságot temetett volna el.** Mind a hat
státusza javítva, a verdikttel és a forrás megnevezésével.

> **A tanulság a konvencióhoz:** a task-doksi „Státusz" sora **nem** hiteles
> forrás — az `EPICS.yaml` az. Ahol a kettő ütközik, **mindig mérni kell**, és a
> mai átvizsgálásban **mindkét irányban** volt tévedés: hat doksi hamis `done`-t
> mutatott, négy másik pedig lemaradt egy megtörtént APPROVED mögött.

### Nem archiválható: két task Gábor-kapun áll (a fejlesztés kész)

- **`EHS-WIZARD-HU`** → `blocked`: csak a **manuális mobil+desktop+dark vizuális
  QA** hiányzik (Gábor). Nem „folyamatban", hanem emberi ellenőrzésre vár.
- **`PORTALUI-PUBLISH-DOORSTAR`** → `blocked`: a végrehajtás APPROVED, de a
  „kész" definíciója a **fogyasztói átvétel**, és az `npm publish` Gábor-kapu.
  *(Felvéve az `EPICS.yaml`-ba — addig hiányzott onnan.)*

### ⚠ 5 fel NEM oldott státusz-eltérés (nem találgatom — gazdát kér)

| Task | `EPICS.yaml` | task-doksi |
|---|---|---|
| `ERPSEP-05-BACKEND-PACKAGING-CONTRACT` | pending | in_progress |
| `ERPSEP-06-INSTANCE-CONTEXT` | blocked | in_progress |
| `ERPSEP-07-EXTENSION-PACK-CONTRACT` | pending | blocked |
| `MODULE-PACKAGES` | in_progress | blocked |
| `STAB-PLATFORM-ASPNET22-RCE-REMOVAL` | pending | „ready" |

- [ ] Ezek az ERP-szeparációs / Codex-sáv tételei — a gazdájuk mondja meg, melyik
      a helyes; addig **egyik sem** tekinthető késznek.

### ⚠ 3 task-doksi nincs a kanonikus forrásban (és nincs is commitolva)

`STAB-HTTP-ERROR-REDACTION` · `STAB-KONTROLLING-PORTFOLIO-INDEX` ·
`STAB-MODULE-AUDIT-IDENTITY` — mindhárom **untracked**, státuszuk `review`.
Codex friss kiírásai; nem az én sávom, de **amíg nincsenek commitolva és az
`EPICS.yaml`-ban, addig nem létező munkaként viselkednek.**

- [ ] Jelzés a Codexnek: commit + `EPICS.yaml`-bejegyzés, különben elveszik.

### Új tétel az `EPICS.yaml`-ban

A **`B2B-10-F3` és `B2B-10-F3X` egyáltalán nem szerepelt** a kanonikus
státusz-forrásban, pedig az F3 öt szelete a mai nap legnagyobb backend-munkája
volt. Felvéve (`F3` = `done`, `F3X` = `open`).

## ⚠ MÉRT LELET: a `git submodule status` NEM MŰKÖDIK ebben a repóban

Mérve 2026-07-30: **14 gitlink** az indexben, **11 deklarálva** a
`.gitmodules`-ban → **3 árva**: `src/joinerytech-keycloak-theme` ·
`src/spaceos-modules-identity` · `src/spaceos-modules-sales`.

A `git submodule status` **az első árván elhasal** (`fatal: no submodule mapping
found`) és **semmit nem ír ki** — tehát aki így ellenőrzi az állapotot, üres
választ kap, és „nincs submodule"-ra következtethet. **Engem is majdnem
félrevitt ma.** Az adósság tehát nem „3 útvonal törött", hanem **a submodule-
eszköz jelentése használhatatlan**.

- [ ] A 3 árva gitlink rendezése: deklaráció a `.gitmodules`-ba **vagy**
      `git rm --cached` az indexből. ⚠ A `sales` repó a jegyzetek szerint
      GitHubon nem létezik → ott a törlés a valószínű helyes válasz, de ez
      **scope-döntés**, nem karbantartás.
- [ ] A `secret-scan` ezt megkerüli (a `.gitmodules`-t és az indexet olvassa) —
      **ne** álljunk át `git submodule`-alapú ellenőrzésre, amíg ez nyitva van.

## Új teendők a mai review-kból

- [ ] **@frontend — a kapu LEFEDETTSÉGE** (új szelet, nem a zaj javítása):
      JSON-idézőjeles kulcs (`"api_key": "…"`) és prefixelt kulcsnév
      (`BRAVE_API_KEY=`) → mérve **vak** a hangolás után is. ⚠ A naiv javítás
      **37 hamis pozitívot** ad (doccapture mérése), köztük a
      `credential_env: MCP_TOKEN_CONDUCTOR`-t — vagyis a helyes referencia-fájlt.
      **A negatív kontroll a valódi kódbázison fusson**, ne szintetikus eseteken.
- [ ] **G2-ADR kiosztatlan** (LLM az olvasáshoz, szabály a könyveléshez).
      A döntés megvan, az írásba foglalás nincs — ADR nélkül hat hónap múlva
      vitatható.
- [ ] **`EditableDataTable` átvételi feltétel:** a zár-ütközés mintájának
      `portal-ui`-ba emelésekor a demo-fa **törlésre kerül** (**3346 sor** halott
      felület, amit ma csak tesztek tartanak zölden). Vele megy a `catalog/` fa
      négy senkinek-nem-kellő eleme is (`CatalogFilterBar`,
      `CatalogVersionView`, `VirtualizedCatalogGrid`, `ProductCard`).
- [ ] **DC-04 root-kötelező:** a lépésszámot a mai Excel-úthoz képest **MEG KELL
      MÉRNI** — enélkül a G3 (portál-UI) kockázata nem mérhető, csak vitatható.
- [ ] **doccapture CI-javaslat:** az 1. kör végén egy sor, ami **elbukik, ha a
      kihagyás nem nulla** — ma a „0 kihagyva" az explicit modul-listán múlik,
      és egy `discover`-re csere csendben elrontja.

## 🔴 A rotációból eredő új teendők

- [ ] **@frontend — a kapu LEFEDETTSÉGE** (nem a zaja, az kész): két vak pont
      megmérve — idézőjeles kulcs (`"api_key": "…"` → **minden JSON-konfig**) és
      prefixelt kulcsnév (`BRAVE_API_KEY=` → a legelterjedtebb env-elnevezés).
      A negatív kontroll a **szabályba** menjen, ne a zaj-szűrőbe.
- [ ] **@codex — jelzés a Nexus-projektnek**: az nginx a 3456-ot kivezeti a
      netre; a mi C-osztályú mintánk ott is előfordulhat.
- [ ] `/mcp` **hitelesítetlen** discovery-manifestet ad (eszközlista, titok
      nélkül) — P2 információ-szivárgás.

## P0 — minden session elején

- [ ] A két **Monitor** újraélesítése (a sessionnel együtt halnak).
- [ ] Csatorna **eleje + vége**, `git status` mindkét repóban, terminál-outboxok.

## Rám váró review

- [ ] **backend B2B-10 F3/5** — ⚠ **BEFUTOTT** (`07c0323`, „a végpont valódi
      PostgreSQL-en"). Ebben kell lennie az **átvitt kötelező tételnek**:
      nem-részes hívó hibás `If-Match`-csel is **404**, ne 412.
- [ ] **backend M5** (írási irány: import/foglalás/publikálás), ha elindult.
- [x] ~~**backend B2B-10 F3/1**~~ — **APPROVED** 2026-07-30 (144/144 + 2 saját
      mutáció). A visszavont/lejárt grant kikötése **teljesült és mérve**.
- [ ] **backend B2B-10 F3/2** (API-host + `RequireEnabledModule`) — jön.
      ⚠ Kérve: magyarázó sor a `HasActiveGrantFor`-hoz (3+ fél esetén kinyílna).
- [ ] **backend B2B-10 F3/5** — a végpont-szintű bizonyíték **valódi
      PostgreSQL-en**. ⚠ Ne csússzon el: az F3/1 lejárat-bizonyítéka InMemory.
      ⚠ **ÁTVITT KÖTELEZŐ TÉTEL (F3/2→F3/4→F3/5):** negatív teszt a
      **megállapodás**-úton — nem-részes hívó hibás `If-Match`-csel is **404**-et
      kapjon, ne 412-t. Az `R-MC3/agreement` mutációm **az F3/4 utáni fán is
      túlélte** (218/218 zöld). Egy teszt, egy sor — ne csússzon tovább.
- [ ] **doccapture DC-01b** (Excel/CSV betöltő) — a G4 után.

## Kiadható / kiosztatlan

- [x] **Platform-task, 1. szelet KÉSZ (root, 2026-07-30):** a tükör **hozzákötve
      az igazi interceptorhoz** — `InterceptorMirrorConformanceTests` a hosting
      teszt-projektben (`5c464fe`). 85/85 zöld (81→+4), 0 warning.
      **Érzékenység mérve:** M1 (kulcs-paraméter) 5 bukó · M2 (scope-flag) 4 bukó ·
      **M3 (a `PgSessionKey` KONSTANS érvénytelen GUC-névre) → mind a 4 új teszt
      bukik, és NULLA meglévő** — ezt csak ez a fájl fogja, mert a unit-teszt és
      minden modul-tükör **ugyanahhoz a konstanshoz** mér.
      ⚠ **Ez root-önmérés, nem független review** — a mutáció-bizonyíték a
      helyettesítője. Ha valaki átnézi, szívesen fogadom.
      ⚠ **NEM pusholva:** a hosting `main` a backend át nem nézett **F3/5**
      commitját is tartalmazza (`07c0323`).
- [ ] **Platform-task, 2. szelet:** a hét modul RLS-suite-ja **álljon át** a
      valódi interceptorra (ma a konformancia-teszt őrzi a tükröt, de a modulok
      továbbra is a tükrön mérnek). Modulonkénti szelet, referencia: a
      Collaboration `InterceptorEndToEndTests`-e.
- [ ] **Szivárgás-kapu zaj-hangolás** (@frontend): a `token-kulcs literál
      értékkel` szabály **18 találatot ad egyetlen kódmintára**
      (`= <azonosító>.<metódus>(`) — a zaj 25%. A negatív kontroll ELŐBB.
- [ ] P2-k: a `/wake`,`/inject`,`/stop`,`/stop-all` megengedő teszt-alakja ·
      CRM lapozás-metaadat a wire-en · `MaterialisationCode` wire-re emelése,
      ha a read-model kiterített terveket szolgál · Alpine/musl solver-mérés.

## Gábor-kapuk

- [ ] **Token-rotáció** (ld. fent).
- [ ] **Licenc** a három publikus doc-capture repóhoz (G5).
- [ ] **`npm publish`** a `@spaceos/portal-ui`-ra (kész, CI-lépéssel).
- [ ] **G4 adatvédelem** — a doc-capture motor telepítési alakja.
- [ ] scheduling-sandbox VPS-provisioning · Keycloak Postgres-migráció ·
      a két üzemi szerep éles realmbe vitele.

## Állandó szabályok

1. Done/APPROVED **kizárólag root-review, saját méréssel** — a jelentés
   elfogadása nem review. ⚠ **2026-07-30: a WARNING-SZÁM is mért tétel**, nem
   csak a Passed/Failed sor. A backend helyesbítette, hogy az F3/2–F3/3
   „0 warning"-ja hamis volt (`CS0108`) — a hiba az övé volt, de **át kellett
   volna mennie a kapumon, és nem ment át.**
2. **Review-nként commitolj**, ne nap végén.
3. Nincs `git add -A` vegyes fán; taskonkénti fájllista.
4. **Idegen repóban nincs destruktív parancs** — `revert`, nem `reset --hard`.
5. Termékdöntés **egy** csatornán megy fel; a választ ki kell hirdetni.
6. **Federation-üzenetre válaszolni kell** — a feldolgozás nem válasz.
7. VPS/éles migráció/credential csak Gábor-jóváhagyással.
8. **„Mit bizonyít, ha átment?"** — és a **„harap-e?" ≠ „mire lát?"**.
9. **Hash csak megnevezett bemenettel** bizonyíték: `sha1(<mit>)`.
10. **A munkafa nem a publikált állapot.**
11. Egy hiba után **keresd meg a testvéreit**.
12. **Egy ponton a további mérés maga válik halogatássá** — ezt a vezetőnek
    kell kimondania, nem a mérőnek.
