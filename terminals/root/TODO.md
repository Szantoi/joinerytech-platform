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

- [ ] **backend M5** (írási irány: import/foglalás/publikálás), ha elindult.
- [x] ~~**backend B2B-10 F3/1**~~ — **APPROVED** 2026-07-30 (144/144 + 2 saját
      mutáció). A visszavont/lejárt grant kikötése **teljesült és mérve**.
- [ ] **backend B2B-10 F3/2** (API-host + `RequireEnabledModule`) — jön.
      ⚠ Kérve: magyarázó sor a `HasActiveGrantFor`-hoz (3+ fél esetén kinyílna).
- [ ] **backend B2B-10 F3/5** — a végpont-szintű bizonyíték **valódi
      PostgreSQL-en**. ⚠ Ne csússzon el: az F3/1 lejárat-bizonyítéka InMemory.
- [ ] **doccapture DC-01b** (Excel/CSV betöltő) — a G4 után.

## Kiadható / kiosztatlan

- [ ] **Platform-task:** „valódi interceptor" változat a `NonSuperuserRlsFixture`-ben,
      és mind a hét modul RLS-suite-ja arra álljon át. Ma a bizonyíték egy
      kézzel írt **tükrön** áll — a tükör zöld marad, ha az eredeti elromlik.
      Referencia: a Collaboration `InterceptorEndToEndTests`-e.
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
   elfogadása nem review.
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
