# ROOT Terminal TODO

> **Frissítve:** 2026-07-29 késő este
> **Részletes állapot:** [`STATE.md`](STATE.md) · **Döntések:** `docs/knowledge/architecture/DONTESEK_2026-07-29.md`

## 🔴 P0 — az egyetlen blokkoló

- [ ] **TOKEN-ROTÁCIÓ (Gábor-kapu).** Öt eleme a `STATE.md`-ben. Amíg nincs meg:
      **nem pusholok** (65+ commit áll), mert a csatorna leírja a rést.
      A rotáció után **azonnal push**, majd a fájl-szintű takarítás.

## P0 — minden session elején

- [ ] A két **Monitor** újraélesítése (a sessionnel együtt halnak).
- [ ] Csatorna **eleje + vége**, `git status` mindkét repóban, terminál-outboxok.

## Rám váró review

- [ ] **backend M5** (írási irány: import/foglalás/publikálás), ha elindult.
- [ ] **backend B2B-10 F3** — ⚠ a kiírásába **kötelezően** bekerül: visszavont
      **és** lejárt grant szűrése, mindkettő teszttel (ma egyik sincs).
- [ ] **doccapture DC-01b** (Excel/CSV betöltő) — a G4 után.

## Kiadható / kiosztatlan

- [ ] **Platform-task:** „valódi interceptor" változat a `NonSuperuserRlsFixture`-ben,
      és mind a hét modul RLS-suite-ja arra álljon át. Ma a bizonyíték egy
      kézzel írt **tükrön** áll — a tükör zöld marad, ha az eredeti elromlik.
      Referencia: a Collaboration `InterceptorEndToEndTests`-e.
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
