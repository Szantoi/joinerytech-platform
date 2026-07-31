# ROOT Terminal TODO

> **Frissítve:** 2026-07-31 délelőtt · **Részletes állapot:** [`STATE.md`](STATE.md)
> **Kanonikus státusz:** [`EPICS.yaml`](../../EPICS.yaml) — a task-doksik státusz-sora **nem hiteles**.

---

## P0 — minden session elején

- [ ] A két **Monitor** újraélesítése (a sessionnel együtt halnak).
- [ ] Csatorna **eleje + vége**, `git status` mindkét repóban, terminál-outboxok.
- [ ] **`gh run list`** — ma derült ki, hogy a `secret-scan` a létrehozása óta
      piros volt, és 20+ commiton át senki (én sem) nem nézte meg.

---

## 🔴 Gábor előtt — sürgősségi sorrendben

- [ ] **`/shopfloor` PIN-backdoor.** A `PIN=1234` ág eltávolítása authorizált; a
      kérdés az, hogy **egy nem működő világ mit keres publikus route-on**
      (se backend, se MSW-mock → a PIN az egyetlen működő belépő). A frontend
      készen áll, a végrehajtás a route-döntés után indul.
- [ ] **Négy kulcs visszavonása:** Google Gemini · **két** Brave Search
      (`061ddd503f`, `cefeb3edee`) · a forrás-prototípus **két
      modell-szolgáltatói kulcsa** (egyikük a **futó app** `settings.json`-jában).
- [ ] **`ALTER ROLE … NOBYPASSRLS`** a két workerre + a `SECURITY DEFINER`
      migrációk telepítése. ⚠ **Mérve: az éles kockázat ma is fennáll.**
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

---

## Futó sávok (2026-07-31 délelőtt kiadva)

- [ ] **backend `B2B-10 F5/1`** — create-út (kiadva a 3 F5-döntéssel:
      on-behalf-of kérés-hatókörű korláttal · `ProjectOwnerTenantId` törölve ·
      hatókör elfogadva). F5/0 **APPROVED** saját méréssel (89/89 + mutáció).
- [ ] **doccapture `DC-01a`** — szövegréteg-olvasó (a terv elfogadva; a 8 kérdésből
      4 root-döntés meghozva, 4 a Gábor-listán). Review-nál a 9 leállási szám újramérése.
- [x] **frontend gép-státusz XS** — APPROVED, portál `1ee7510` + pin-bump `dd7f1da`.

---

## Root-tételek, amiket ma átvettem

- [ ] **`ClaimsPrincipalUserIdExtensions.cs` untracked** → a CRM buildje függ tőle,
      ezért a `dotnet-build-gate` pirosan áll. **@codex sávja**, jelezve — amíg nincs
      bent, egy tartósan piros kapunk van, ami pontosan az, amit ma ostoroztunk.
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
- [ ] **A 3 árva gitlink** rendezése — ez a `submodules: recursive` előfeltétele,
      és amíg nyitva van, a `git submodule status` **semmit nem ír ki**.
- [ ] **`Production.Tests`**: kereszt-repó kontraktus-sodródás a `contracts`
      submodule pinjén — semmi nem őrzi (a doc-capture hash-pinje a saját
      szerződésén igen).

---

## Kiadható / kiosztatlan

- [ ] **Platform-task 2. szelet:** a hét modul RLS-suite-ja álljon át a valódi
      interceptorra. ⚠ **Mérve: NEM biztonsági javítás** — mind a hét modul
      bekötí az interceptort (7/7 megdöntési kísérlet magas bizalommal
      fenntartotta). A rés szűk és modul-specifikus; a **pilot: CRM** (tiszta fa,
      publikus connection-string konstans).
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

## Ma lezárva (2026-07-30) — részletek a `STATE.md`-ben

Token-rotáció (5 titok-osztály) · a platform **első két CI-kapuja** ·
**B2B-10 F3 mind a hat szelete** · doccapture **DC-01b · DC-06 · DC-02 ·
ADR-071** · szivárgás-kapu **zaj + a két vak pont** · CatalogPanel- és
scheduling-lint · **a két élő-publikus hiba** · STAB-RLS-WORKER-BYPASS szúrópróba
+ szerep-kapu · **task-átvizsgálás** (9 archiválva, **6 hamis `done` javítva**) ·
**ADR-index** (7 elfogadott ADR nem szerepelt egyetlen indexben sem).

---

## Állandó szabályok

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
