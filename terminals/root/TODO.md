# ROOT Terminal TODO

> **Frissítve:** 2026-07-30 délelőtt
> **Részletes állapot:** [`STATE.md`](STATE.md) · **Döntések:** `docs/knowledge/architecture/DONTESEK_2026-07-29.md`

## 🔴 P0 — az egyetlen blokkoló

- [ ] **TOKEN-ROTÁCIÓ (Gábor-kapu).** **A runbook KÉSZ**, végrehajtásra vár:
      `docs/knowledge/deployment/TOKEN_ROTATION_RUNBOOK_2026-07-30.md`.
      **Négy** titok-osztály (nem egy): A master · B ~10 agent token ·
      **C 4 beégetett kitalálható alapértelmezés** · **D Google API-kulcs**.
      A C osztály **hatályban van** az élesen (3 env hiányzik), de a
      szolgáltatás **nem érhető el kívülről** → P1, nem aktív rés.
      Amíg nincs rotáció: **nem pusholok** (70 commit áll).
- [ ] **Gábornak eldöntendő** (runbook §4): végrehajtsuk-e ma · a Google-kulcsot
      ki vonja vissza (konzol-hozzáférés kell) · a 4 publikus submodule-ban
      commitolhatok-e · maradhat-e a VPS-IP a publikus repóban.

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
