# ROOT Terminal State

> **Frissítve:** 2026-07-30 délelőtt Europe/Budapest
> **Állapotforrás:** [`EPICS.yaml`](../../EPICS.yaml) + [`AGENT-CHANNEL.md`](../../AGENT-CHANNEL.md)
> **Belépő:** a csatorna **eleje** („Nyitott szálak") és **vége**; a régebbi napok archívumban.

## ✅ A BLOKKOLÓ MEGSZŰNT — a rotáció végrehajtva (2026-07-30)

Gábor jóváhagyásával végrehajtva. **79 commit kipusholva.** Minden új titok a
**VPS-en generálva** — egy sem került ágens-kontextusba vagy naplóba.
Runbook + végrehajtási napló: `docs/knowledge/deployment/TOKEN_ROTATION_RUNBOOK_2026-07-30.md`.

**Füstpróba három elkülönülő státusszal** (nem megengedő halmaz):
régi (publikus) token → **403** · új → **400** (auth átment) · token nélkül → **401**.
`secret-scan origin/main`: **72 → 28** találat (a 28 tételesen fals pozitív).

**A leltár ÖT osztály volt, nem egy** — a tegnapi „EGY hitelesítő, 12
előfordulás" csak az **A** osztályra igaz:

| | Osztály | Állapot |
|---|---|---|
| **A** | MCP master token — az élő érték **bizonyítottan azonos** volt a publikussal (`sha1 = 8a9d691f9f` mindkét oldalon) | ✅ rotálva |
| **B** | ~10 agent token | ✅ az `agents.yaml` kivezetve hitelesítő-forrásként |
| **C** | 4 beégetett, **kitalálható** alapérték (`spaceos-<szerep>-<ev>`), egyikük terminál-tokent **ír alá** | ✅ env-be, literál kivéve |
| **D** | Google Gemini API-kulcs | kód env-re állítva · **visszavonás: Gábor** |
| **E** | **Brave Search API-kulcs** — ⚠ **a kapu nem fogta meg** | literál kivéve · **visszavonás: Gábor** |

**Három csapda, amit rögzíteni kell:**

1. A `.gitignore`-ban **már ott volt** az `agents.yaml` (40. sor) — a fájl mégis
   **követve** volt: a gitignore nem hat a már követett fájlokra. A bejegyzés
   **hamis biztonságot** adott. Bizonyíték: `git ls-files`, nem `git check-ignore`.
2. **A mérőeszköz hagyta ki az E osztályt.** A kapu 1. szabálya két alakra vak
   (izoláltan megmérve): **idézőjeles kulcs** (`"api_key": "…"` → minden
   JSON-konfig) és **prefixelt kulcsnév** (`BRAVE_API_KEY=` → a legelterjedtebb
   env-elnevezés). @frontend-nek jelezve.
3. A **„72 → 28" fejszám teljességnek látszott**: a 28-ban **három kimaradás**
   volt, és kettőt a kapu sem jelzett — `git grep` találta meg.

**Pontosítás a saját reggeli állításomhoz:** „nem érhető el az internetről" a
**szivárgó** szolgáltatásra (3458, `127.0.0.1`) igaz — de az **nginx a 443-on
publikusan kiszolgál**, és a `/api/telegram/webhook` a **3456**-ra megy (fut,
token nélkül **403**, fail-closed). A 3456 más kódbázis (`/opt/nexus/…`) →
jelzés a Nexus-projektnek.

**Nem pusholtam a 3 submodule-t** (cutting · inventory · procurement): a
javítás commitolva, de mindhárom `main`-en van és **2–3 committal előrébb más
sáv pusholatlan munkájával** — azt nem viszem ki át nem nézve. *(A
submodule-okban amúgy sem külön kulcs volt, hanem ugyanaz a
dashboard-alapérték — ez is helyesbítés a tegnapi képhez.)*

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
