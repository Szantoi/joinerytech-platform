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
- [ ] **ÚJ: az ADR-072 §7 három kérdése** (a v1 magját nem blokkolják): a szakma-függőségek
      a Collaboration projekciói legyenek-e · a projekt CRM-rendelésből születik-e ·
      a `ProjectCode` formátuma és kiosztása (a portál `PRJ-2426-001`, a Kontrolling
      `PRJ-2026-014` alakot használ — ma **kétféle** van a fában).

- [ ] **`/shopfloor` PIN-backdoor.** A `PIN=1234` ág eltávolítása authorizált; a
      kérdés az, hogy **egy nem működő világ mit keres publikus route-on**
      (se backend, se MSW-mock → a PIN az egyetlen működő belépő). A frontend
      készen áll, a végrehajtás a route-döntés után indul.
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
- [ ] **ÚJ (DC-01): betűtípus-politika** a DC-01b előtt — javaslat: OFL-1.1 Liberation
      Sans, kiadás + ellenőrző-összeg rögzítéssel; a Monotype/MS EULA-s rendszerfont kizárva.
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

- [ ] **Semmi.** A nap mind a 12 befutott review-ja lezárva (mind APPROVED, saját méréssel).

- [x] ~~**doccapture: faipari RAG 1. fázis**~~ **APPROVED 2026-07-31** saját VPS-méréssel
      (manifest-hash 5/5 · dry-run 1963 chunk · Chroma count=1998 · MCP-próbák).
      ⚠ Mért csapda: a 3460 `/health` 35-öt mond — a fájl-figyelő száma, nem a vektor-tár.

## Root-task (triázsból, 2026-07-31)

- [x] ~~**B2B-01..08 tételes megfeleltetés**~~ **KÉSZ 2026-07-31**: 3 zárva bizonyítékkal
      (B2B-01/02/04), 5 nevesített maradékkal (B2B-05→F6 · B2B-06 adapter-scope ·
      B2B-07/08→F4 · B2B-09→F7). A megfeleltetés soronként az `EPICS.yaml`-ban.
- [ ] **ERPSEP triázs-kör** az 5 státusz-eltérésre (yaml↔doksi) — gazda-kérdéssel együtt.
      ⚠ A sáv **egész nap nem mozdult** (7/14), és **nincs gazdája**.
- [x] ~~**4 task-doksi archiválása**~~ **KÉSZ 2026-07-31** (`B2B-01`, `B2B-02`,
      `B2B-04`, `B2B-10-F5` → `archive/`, az `EPICS.yaml` útvonalai igazítva).
- [ ] **Az F7 R2-tétele:** Kernel-függés-nyilatkozat a release-jegyzetbe (az F5/3 lelete:
      a cross-tenant vonalat a Kernel tartja egyedül, és ha elromlik, a suite zöld marad).

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

- [ ] Három Codex-task-doksi (`STAB-HTTP-ERROR-REDACTION`,
      `STAB-KONTROLLING-PORTFOLIO-INDEX`, `STAB-MODULE-AUDIT-IDENTITY`)
      **untracked** és nincs az `EPICS.yaml`-ban → **nem létező munkaként
      viselkednek**. Jelzés a Codexnek.
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
