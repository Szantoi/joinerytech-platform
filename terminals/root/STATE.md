# ROOT Terminal State

> **Frissítve:** 2026-07-30 délelőtt Europe/Budapest
> **Állapotforrás:** [`EPICS.yaml`](../../EPICS.yaml) + [`AGENT-CHANNEL.md`](../../AGENT-CHANNEL.md)
> **Belépő:** a csatorna **eleje** („Nyitott szálak") és **vége**; a régebbi napok archívumban.

## ⛔ EGYETLEN BLOKKOLÓ: token-rotáció (Gábor-kapu)

**A runbook KÉSZ** (2026-07-30): `docs/knowledge/deployment/TOKEN_ROTATION_RUNBOOK_2026-07-30.md`
(`052c55c` + `b111f5d`). Végrehajtásra kész, Gábor szavára vár.

**⚠ A 2026-07-29-i leltár HELYESBÍTVE — a mai mérés mást mond.**
A `2613106` commit „EGY hitelesítő, 12 előfordulás" képe **csak az MCP master
tokenre igaz**. `secret-scan origin/main` (2517/2517 fájl) → **72 találat**,
literálonként osztályozva: **négy független titok-osztály, ~44 valódi
előfordulás**, és **28 fals pozitív**.

| Osztály | Db | Megjegyzés |
|---|---|---|
| **A** MCP master token | 1 (5 helyen) | erre igaz a tegnapi állítás |
| **B** agent tokenek | ~10 (2-2 helyen) | **kiesés nélkül rotálható** (agents.yaml 30 s auto-reload, több bejegyzés/név) |
| **C** beégetett, KITALÁLHATÓ alapértelmezések | 4 | ⚠ **tegnap nem volt a leltárban** |
| **D** Google Gemini API-kulcs | 1 (3 fájlban) | ⚠ **tegnap nem volt a leltárban**; Google-konzolban kell visszavonni |

**A C osztály kihasználhatósága MEGMÉRVE (runbook 3.0):** a négy env-változóból
**három hiányzik** az élesen → a publikus alapértékek (`spaceos-admin-2026`,
`spaceos-terminal-secret-2026`, `spaceos-webhook-secret-2026`) **hatályban**.
**DE a szolgáltatás nem érhető el az internetről** (127.0.0.1-en figyel + ufw
INPUT DROP) → **P1, nem aktív rés.** A védelem viszont **kizárólag hálózati**:
bármilyen láb (tailnet, lokális shell, SSRF, egy kényelmi `ufw allow`) besétál,
és a `TERMINAL_TOKEN_SECRET` **aláíró** kulcs hamisíthatóságát a hálózati gát
nem gyengíti.

**A kapuról is van lelet:** a 72-ből 28 fals pozitív, ebből **18 egyetlen
kódmintára** (`const token = authHeader.substring(7)`) — **25% zaj**, ami a
kapu saját tervezői kikötése szerint kikapcsoláshoz vezet. Külön teendő.

**A push VISSZATARTVA (70 commit):** a csatorna részletesen leírja a rést,
tehát pusholni annyi lenne, mint útmutatót publikálni hozzá. **A rotáció után
azonnal mehet.**

## 2026-07-30 — eddig

- **Token-rotációs runbook kész** + a leltár helyesbítve (ld. fent).
- **B2B-10 F3/1 APPROVED** — saját mérés: 144/144 + **két saját mutáció**
  (M-A lejárat → 2 bukó, M-B visszavonás → 3 bukó), a fa visszaállítva.
  Az F2 két nyitva hagyott tétele ezzel lezárva. A lejárat tétele `[~]`:
  a kikötés **integrációs** tesztet kért, a mai bizonyíték InMemory → **F3/5**.
- Root-megerősítés: a megállapodás **részvétel**-alapú, a hordozott tartalom
  **grant**-köteles (az F2 döntésének egyenes alkalmazása).

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
