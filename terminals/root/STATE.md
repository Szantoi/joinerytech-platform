# ROOT Terminal State

> **Frissítve:** 2026-07-29 késő este Europe/Budapest
> **Állapotforrás:** [`EPICS.yaml`](../../EPICS.yaml) + [`AGENT-CHANNEL.md`](../../AGENT-CHANNEL.md)
> **Belépő:** a csatorna **eleje** („Nyitott szálak") és **vége**; a régebbi napok archívumban.

## ⛔ EGYETLEN BLOKKOLÓ: token-rotáció (Gábor-kapu)

**A platform-repó PUBLIKUS, és élő hitelesítő van kint.** Mérve, három ágens
által, többféle módszerrel.

**A rotáció öt eleme:**
1. env-értékek cseréje (12 token),
2. `bin/stdio-bridge.js` — `process.env.X || '<literál>'` **fallback-sor**
   (a legveszélyesebb alak: a default maga a titok),
3. `terminals/architect/CLAUDE.md` + `terminals/explorer/CLAUDE.md`,
4. **négy PUBLIKUS submodule** `CLAUDE.md`-je: cutting · inventory ·
   procurement · cabinet (külön repók, külön commit),
5. két privát submodule (joinery, kernel) — kisebb sürgősség.

⚠ **A submodule-okban lévő hitelesítő NEM a platform hatos listájának egyike** —
egy **leltározatlan** kulcs. Egy rotáció mind a 12 előfordulást lefedi.

**A push VISSZATARTVA (65+ commit):** a csatorna részletesen leírja a rést,
tehát pusholni annyi lenne, mint útmutatót publikálni hozzá. **A rotáció után
azonnal mehet.**

## A nap eredménye (2026-07-29)

Minden verdikt mögött **saját root-mérés** áll.

- **scheduling: M4 MÉRFÖLDKŐ APPROVED** (414/414), kontraktus-kör lezárva,
  `1.0.0-preview.2` kézbesítve. **Két root kontraktus-döntés**: a hash fedje a
  wire-tartalmat (alapérték-kihagyással); a proposal dátumosítása **pinelt
  naptár-revíziókból**. Következik: **M5**.
- **Collaboration: F1 + F2 MÉRFÖLDKŐ APPROVED** (126 unit + **25 integrációs
  valódi PostgreSQL-en**). A modul reggel még csak a munkafán létezett
  (verziókövetés alá helyezve), és a `B2B-02` „done/Security PASS"-a **hamis
  zöld** volt — a bizonyíték a saját LINQ-jét mérte.
- **DMS ACL (Codex P1): teljes lánc ZÁRVA** (108/108).
- **portál:** M3-bekötés · scheduling route · F4 · F5 · F6+F6/2 · world-gating ·
  smoke-kapu · WorkflowPage dark mode · TOUCH-44 — **mind APPROVED és
  commitolva**; a közös böngésző-kapu **először teljesen zöld**.
- **nexus security:** P0 (hitelesítetlen `/api/session` + shell-injekció)
  javítva, hardening APPROVED, szivárgás-kapu él (2517/2517 arány + a kimaradók
  nevesítve).
- **CRM:** lista SQL-lapozásra (123/123).
- **doc-capture: ÚJ TERMÉKVONAL** — három **publikus** repó (engine · modul ·
  goods-receipt), CI-vel és **semlegességi kapuval első naptól**. DC-00 kész.
- **A csatorna tömörítve** (4155 → ~560 sor + archívum).

## Root döntések (a részletek: `docs/knowledge/architecture/DONTESEK_2026-07-29.md`)

- **Grant NEM kerül vissza az RLS-policy-be**: az RLS a **részvételt** szűrje, a
  grant az **engedélyt** szabályozza. Indok: a régi `Status=0` predikátum a
  visszavonást tette lehetetlenné. ⚠ F3-ban **kötelező**: ma semmi nem szűri a
  visszavont grantot, és az `ExpiresAtUtc`-re nincs teszt.
- **`B2B-02` NYITVA MARAD** — három kritériuma nem teljesül; nem pipálunk ki
  semmit, amit nem mértünk.
- **doc-capture:** a négy bemenet **négy külön út** (Excel/digitális PDF =
  parse, modell nélkül); **LLM az olvasáshoz, determinisztikus szabály a
  könyveléshez**; a **jóváhagyási hurok** a termék magja, nem az OCR.
- **Doorstar:** kétirányú primitív-áramlás, de **leválasztható marad**
  (domain-mentes csomag + verziózás + a `portal-core` kimarad).

## Gábor-kapuk

1. **🔴 Token-rotáció** — mindent blokkol.
2. **Licenc** a három publikus doc-capture repóhoz (G5) — licenc nélkül a
   „publikus" nem jelent felhasználhatót.
3. **`npm publish`** a `@spaceos/portal-ui`-ra — a csomag kész, CI-lépéssel.
4. **G4 adatvédelem** — a doc-capture motor telepítési alakja ezen múlik.
5. scheduling-sandbox VPS-provisioning · Keycloak Postgres-migráció.

## Nyitott, kiosztatlan

- **Platform-task:** a `NonSuperuserRlsFixture` kapjon „valódi interceptor"
  változatot — ma **mind a hét modul RLS-bizonyítéka egy kézzel írt tükrön áll**,
  és a tükör zöld marad, ha az eredeti elromlik. Referencia: a Collaboration
  `InterceptorEndToEndTests`-e.
- P2-k: `/wake`,`/inject`,`/stop`,`/stop-all` megengedő teszt-alakja · CRM
  lapozás-metaadat a wire-en · `MaterialisationCode` wire-re emelése, ha a
  read-model kiterített terveket szolgál · Alpine/musl solver-mérés.

## Újraindítási védelem

1. Csatorna **eleje + vége**, `EPICS.yaml`, ez a state, `TODO.md`.
2. **A két Monitort újra kell élesíteni.**
3. Friss `git status` nélkül nincs mutáció; más sáv fájlhatárát tiszteld.
4. Nincs `git add -A` vegyes fán; **review-nként commitolj**.
5. Done/APPROVED kizárólag root-review, **saját méréssel**.
6. **Idegen repóban nincs destruktív parancs** (`revert`, nem `reset --hard`).
7. Termékdöntés **egy** csatornán megy fel; a választ ki kell hirdetni.
8. VPS/éles migráció/credential csak Gábor-jóváhagyással.
9. **„Mit bizonyít, ha átment?"** — és külön: **a „harap-e?" és a „mire lát?"
   két különböző kérdés.** Mutációs teszt az elsőre, visszamérés a tegnapon a
   másodikra.
10. **Hash mint csereeszköz csak megnevezett bemenettel bizonyíték**
    (`sha1(<mit>)`), különben a mérőeszköz konvenciója visz félre.
11. **A munkafa nem a publikált állapot** — publikált refet mérj.
12. Egy hiba megtalálása után **keresd meg a testvéreit**.
