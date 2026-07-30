# Token-rotációs runbook — 2026-07-30

> **Státusz:** ✅ **VÉGREHAJTVA 2026-07-30** (Gábor jóváhagyásával) — a
> végrehajtási napló és a maradék tételek az 5. szakaszban.
> **Készítette:** root (Claude), 2026-07-30.
> **Kiváltó ok:** élő hitelesítők a **PUBLIKUS** `joinerytech-platform` repóban.
> **Mérés:** `node scripts/secret-scan.mjs origin/main` — 2517/2517 fájl,
> **72 találat**, majd literálonkénti osztályozás (`sha1(a soron talált
> leghosszabb titok-gyanús literál)` első 10 hex jegye alapján).

---

## 0. Amit ez a runbook helyesbít a tegnapi képhez képest

A `terminals/root/STATE.md` és a `2613106` commit azt rögzítette:
**„EGY hitelesítő, 12 előfordulás, nem három halmaz."**

**Ez a mai méréssel nem áll meg.** A mai mérés szerint a publikált
`origin/main`-en **legalább négy, egymástól független titok-osztály** van kint,
összesen ~44 valódi előfordulással. A tegnapi „egy hitelesítő" megállapítás
**az MCP master tokenre igaz**, de a leltár nem terjedt ki a többi osztályra.

⚠ **Két osztály tegnap egyáltalán nem szerepelt a leltárban:**
a **beégetett, kitalálható alapértelmezett jelszavak** és a **Google API-kulcs**.

Ezért a rotáció **nem** 12 érték cseréje. A pontos lista alább.

---

## 1. A leltár — mit kell rotálni

### A osztály — MCP master token (1 db, 5 helyen)

`sha1(literál) = 8a9d691f9f` · 44 karakter · base64-szerű

| Fájl | Sor | Szerep |
|---|---|---|
| `src/joinerytech-nexus/knowledge-service/config/agents.yaml` | 19 | `master_token:` — a forrás |
| `src/joinerytech-nexus/knowledge-service/docs/MCP_AUTH_TOKENS.md` | 52 | dokumentáció-példa **valódi értékkel** |
| `src/joinerytech-nexus/knowledge-service/bin/stdio-bridge.js` | 14 | ⚠ **`process.env.MCP_AUTH_TOKEN \|\| '<literál>'` fallback** |
| `terminals/architect/.mcp.json` | 7 | `Bearer` fejléc |
| `terminals/explorer/.mcp.json` | 7 | `Bearer` fejléc |

**Root/admin jogosultság minden MCP-eszközhöz.** Ez a legmagasabb tétű érték.

### B osztály — agent (terminál) tokenek (~10 db, egyenként 2 helyen)

`agents.yaml` `agents:` térkép + a `MCP_AUTH_TOKENS.md` **ugyanazokat az
értékeket** megismétli. Érintett identitások:

`conductor` · `architect` · `librarian` · `explorer` · `backend` · `frontend` ·
`designer` · `cabinet-bridge` · `marketing-content` · `marketing-analyst`

> A `marketing-pm` értéke (`mkt-pm-token-abc123`) láthatóan **példa**, nem élő
> titok — de a rotációval együtt ki kell venni, mert ma **működő** bejegyzés.

> A `cabinet-bridge` sorhoz a fájl saját megjegyzése: *„ROTATED 2026-07-11
> (security incident)"* — **ez már a második kör ugyanabban a fájlban.**

### C osztály — beégetett, KITALÁLHATÓ alapértelmezések (4 db) ⚠ ÚJ

Ez a **legveszélyesebb** osztály, és tegnap nem volt a leltárban.

| Érték-minta | Env-változó | Hol | Mit nyit |
|---|---|---|---|
| `dev-token-…-dashboard-<ev>` (a teljes érték a git-történetben) | `DASHBOARD_AUTH_TOKEN` | `auth.routes.ts:11`, `server.legacy.ts:2051`, `missionControl.ts:103` (`DATAHAVEN_TOKEN`), `agent.config.ts:15`, `api.config.ts:8` | dashboard-hozzáférés |
| `spaceos-terminal-secret-<ev>` | `TERMINAL_TOKEN_SECRET` | `epic-router.routes.ts:55` | ⚠ **terminál-tokent ÍR ALÁ** → tetszőleges terminál-identitás hamisítható |
| `spaceos-admin-<ev>` | `ADMIN_SECRET` | `epic-router.routes.ts:126` | ⚠ **admin-művelet** |
| `spaceos-webhook-secret-<ev>` | `TELEGRAM_WEBHOOK_SECRET` | `telegramBot.ts:96` | Telegram webhook-hitelesítés |

**Miért ez a legrosszabb alak** (a `beegetett-fallback-titok` tanulság):

1. **Néma visszaesés.** Ha az env-változó nincs beállítva, a szolgáltatás
   **hiba nélkül** elfogadja a publikus alapértéket. Semmi nem jelzi.
2. **Kitalálható a repó nélkül is.** A minta `spaceos-<szerep>-2026` —
   ehhez nem kell megtalálni a szivárgást, elég megtippelni.
3. **A rotáció önmagában nem elég**: ha csak az env-értéket cseréljük és a
   `|| '<literál>'` sor bent marad, egy elfelejtett env-változó bármikor
   visszaállítja a rést. **A sort ki kell venni.**

> ✅ **MEGMÉRVE — ld. 3.0.** A négyből **három nincs beállítva** az élesen,
> tehát a publikus alapértékek **hatályban vannak**. A szolgáltatás viszont
> **nem érhető el az internetről** — a súlyosság ezért **P1, nem aktív rés**.

### D osztály — Google Gemini API-kulcs (1 db, 3 helyen) ⚠ ÚJ

`sha1(literál) = 425f4852f4` · 39 karakter · `AIzaSy…` alak

`test-gemini.js:3` · `test-gemini-raw.js:1` · `test-google-embed-v2.js:2`

**Nem MCP-token: külső szolgáltatói kulcs, ami pénzbe kerül.** A Google Cloud
konzoljában kell visszavonni — a repó-takarítás önmagában nem rotáció.

### Nem titok, de kint van (4 találat)

`CLAUDE.md:116-117` és `SCHEDULING_SANDBOX_PLAN.md:31,99` — VPS-IP és
tailnet-cím. **Nem hitelesítő**, rotálni nem kell; a rotációs körben viszont
érdemes eldönteni, publikus repóban akarjuk-e tartani őket.

---

## 2. A kapu zaja — amit NEM kell rotálni

A 72 találatból **28 fals pozitív**. Ezeket megnéztem soronként:

| Minta | Db | Miért nem titok |
|---|---|---|
| `const token = authHeader.substring(7)` / `.slice(7)` | 18 | maga a **kód**; a szabály a `substring(7)`-et vette literálnak |
| `const token = tokenHandler.CreateToken(...)` | 1 | kód |
| `const token = generateTerminalToken(terminal)` | 1 | kód |
| `Password = request.Password` | 1 | mezőértékadás |
| `localStorage.getItem('accessToken')` | 1 | doksi-kódrészlet |
| `test-master-token-abc123`, `invalid-token-xyz` | 2 | teszt-fixture, szándékosan érvénytelen |
| VPS/tailnet cím | 4 | nem hitelesítő |

⚠ **Ez a kapura nézve lelet, nem mellékes:** a `token-kulcs literál értékkel`
szabály **egyetlen kódmintára 18 találatot ad — a zaj 25%**. A kapu saját
tervezői kikötése az volt, hogy *„egy hangos kapu egy héten belül ki lesz
kapcsolva"*. **Külön teendő** (nem blokkolja a rotációt): a szabály zárja ki a
`= <azonosító>.<metódus>(` alakot. A negatív kontrollt előbb kell megírni,
mint a kivételt (`kapu-epites-precedencia`).

---

## 3. Végrehajtás

### 3.0 A kihasználhatóság mérése — ✅ ELVÉGEZVE 2026-07-30

Olvasó SSH-hívások, maszkolt kimenettel, semmi mutáció. **Hitelesítést nem
kíséreltem meg** a kitalálható értékekkel: a kötöttség és az elérhetőség
együtt eldönti a kérdést, exploit nélkül.

**1. Melyik unit futtatja a szivárgó kódot?**

`spaceos-knowledge.service` → `/opt/joinerytech/src/joinerytech-nexus/knowledge-service`,
`EnvironmentFile=…/.env`. *(A `nexus-ks.service` egy **másik** kódbázis
— `/opt/nexus/src/nexus-core/…` —, az nem a mi szivárgásunk.)*

**2. Be van-e állítva a négy env-változó?** (kulcsnevek olvasva, értékek nem)

| Változó | Éles `.env` | Következmény |
|---|---|---|
| `DASHBOARD_AUTH_TOKEN` | ✅ beállítva | a publikus alapérték **nincs** hatályban |
| `TERMINAL_TOKEN_SECRET` | ❌ **hiányzik** | ⚠ a terminál-tokenek **publikus konstanssal vannak aláírva** |
| `ADMIN_SECRET` | ❌ **hiányzik** | ⚠ a kitalálható admin-alapérték **hatályban** |
| `TELEGRAM_WEBHOOK_SECRET` | ❌ **hiányzik** | a kitalálható webhook-alapérték hatályban |
| `MCP_AUTH_TOKEN` | ❌ hiányzik | a master token a **publikus** `agents.yaml`-ból jön |

**3. Elérhető-e a szolgáltatás kívülről?** — **NEM.** Két független gát:

- `spaceos-knowledge` (3458) **`127.0.0.1`-en figyel**, nem `0.0.0.0`-n;
- `ufw` aktív, `INPUT policy DROP`, és **sem a 3456-ra, sem a 3458-ra nincs
  allow-szabály** (a nyitott portok: 22, 80, 443, 5050, 19132, 25565).

### 3.0/b Amit ez a mérés jelent — és amit NEM

**NEM jelenti**, hogy „aktív, kihasználható rés az interneten". Az nincs.
Ha ezt írtam volna a mérés előtt, túlállítás lett volna.

**Azt jelenti**, hogy a védelem **kizárólag hálózati szintű**. Alkalmazás-
szinten a beléptetés három ponton egy **publikus, kitalálható konstans**.
Ezért ez **P1** — a rotációval egy körben javítandó, de nem előzi meg:

- bárki, aki **bármilyen** lábat betesz — tailnet-hozzáférés, egy kompromittált
  tailnet-eszköz, lokális shell, SSRF a gép bármely másik szolgáltatásában —
  a kitalálható admin-alapértékkel **egyenesen besétál**;
- a `TERMINAL_TOKEN_SECRET` **aláíró** kulcs: publikus konstanssal aláírt
  terminál-token **hamisítható**, és ezt a hálózati gát nem gyengíti;
- egyetlen kényelmi `ufw allow 3458` bármikor eltünteti az egyetlen gátat —
  és aki azt beírja, nem fogja tudni, hogy közben ezt is kinyitotta.

> **A hálózati gát nem helyettesíti az alkalmazás-szintű hitelesítést** —
> csak elhalasztja a következményt.

### 3.1 Sorrend és miért

A **fallback-sorok kivétele ELŐBB vagy EGYSZERRE** megy a csere mellett.
Indok: ha a `|| '<literál>'` bent marad, a rotáció **sikeresnek látszik**, míg
a régi token továbbra is működik — a fallback **elrejti a hibát**.

| # | Lépés | Leáll-e valami? |
|---|---|---|
| 1 | **C osztály:** 4 fallback-sor `|| '<literál>'` → hiba dobása hiányzó env esetén; új értékek az élő env-be | Nexus újraindul |
| 2 | **D osztály:** Google-kulcs **visszavonása a konzolban**, új kulcs env-be, a 3 teszt-fájl literáljának kivétele | csak a 3 teszt-szkript |
| 3 | **B osztály:** agent tokenek — **duplázva** (ld. 3.2) | **semmi** |
| 4 | **A osztály:** master token (ld. 3.3) | rövid MCP-kiesés minden terminálon |
| 5 | `MCP_AUTH_TOKENS.md`: valódi értékek → `<TOKEN>` helyőrző | — |
| 6 | `terminals/{architect,explorer}/{CLAUDE.md,.mcp.json}`: env-hivatkozás | az a két terminál |
| 7 | **Push** (67 commit) — a rotáció után **azonnal** | — |
| 8 | **4 publikus submodule** `CLAUDE.md`-je (cutting · inventory · procurement · cabinet) — külön repó, külön commit | — |

### 3.2 Agent tokenek — kiesés NÉLKÜL

Mérve az `agents.yaml` fejlécéből: **„Changes are auto-reloaded every 30
seconds (no restart needed)"**, és a térkép **több bejegyzést** enged
ugyanahhoz a névhez. Ezért:

1. Új token **hozzáadása** a régi mellé, ugyanazzal az agent-névvel.
2. ~30 s várakozás (auto-reload), majd a fogyasztó átállítása az újra.
3. Ellenőrzés: az új tokennel megy egy hívás.
4. **Csak ezután** a régi sor törlése.

Így egyetlen futó ágens sem szakad meg — ez a tegnapi „12 token cseréje futó
ágenseket szakít meg" aggály **feloldva** a B osztályra.

### 3.3 Master token — a rövid kiesés kezelése

A fájl saját megjegyzése: *„This must match the `MCP_AUTH_TOKEN` in
`~/.claude/settings.json`."* Tehát a master token cseréje **minden terminál**
MCP-kapcsolatát érinti, és a `settings.json` **nincs** verziókövetve.

Sorrend:
1. Előkészítés: az új érték **legyen már a kézben** minden gépen/terminálon.
2. `agents.yaml` `master_token:` csere → 30 s auto-reload.
3. `~/.claude/settings.json` `MCP_AUTH_TOKEN` csere **minden** terminálnál.
4. `bin/stdio-bridge.js:14` fallback **kivétele** (hiányzó env → hangos hiba).
5. Füst: egy `search_knowledge` hívás terminálonként.

**Visszaút:** a régi master token **ne kerüljön törlésre a jegyzetből**, amíg a
4. lépés füstpróbája le nem futott mindenhol. Ha egy terminál kiesik, a
visszaút a régi érték visszaírása az `agents.yaml`-ba (30 s), **nem** a
fallback visszatétele.

### 3.4 A rotáció után — a bizonyítás

```bash
node scripts/secret-scan.mjs origin/main   # push UTÁN: a publikált állapoton
```

**Elvárt eredmény:** a 44 valódi találat eltűnik; a ~28 fals pozitív **marad**,
amíg a kapu-szabály zaja külön nem javul. **Ne a találatszám csökkenése legyen
a siker mércéje** — tételesen a négy osztály eltűnése.

⚠ **Amit a takarítás NEM old meg:** a git-történet publikus marad. A régi
értékek bárki számára visszanyerhetők a korábbi commitokból. **Ezért a
rotáció (= a régi érték érvénytelenítése) az egyetlen valódi javítás**, a
fájl-takarítás csak azt akadályozza meg, hogy újra kiszivárogjon.

---

## 4. Nyitott kérdések Gábornak

1. **Végrehajtjuk-e ma?** A runbook kész; a 3.0 mérés 5 perc, és az dönti el a
   sorrendet.
2. **Google Cloud konzol-hozzáférés** — a D osztály kulcsát csak ott lehet
   visszavonni; ez nálam nincs.
3. **A 4 publikus submodule** külön repó — ott is commitolhatok, vagy csak
   jelezzem?
4. **VPS-IP és tailnet-cím** maradhat-e a publikus repóban?


---

## 5. Végrehajtási napló — 2026-07-30

Gábor jóváhagyta a teljes kört. **Minden új titok a VPS-en generálva**
(`openssl rand -base64 33`), tehát egyetlen új érték sem került az ágens
kontextusába, sem parancssorba, sem naplóba.

### Ami elkészült

| # | Lépés | Bizonyíték |
|---|---|---|
| 1 | **C osztály** — 3 hiányzó env beállítva | `PID = MainPID`, port figyel, mind a 3 érték a `/proc/<pid>/environ`-ban |
| 2 | **A osztály** — új master token `MCP_AUTH_TOKEN`-ként | füstpróba lent |
| 3 | **`agents.yaml` kivezetve** hitelesítő-forrásként (élesen és a repóból) | `git rm --cached` + `.gitignore` |
| 4 | **Repó-takarítás** 20 fájlban | `secret-scan origin/main`: **72 → 28** |
| 5 | **Push** — 78 + 1 commit | `301424c..eb22407` |
| 6 | **3 publikus submodule** `CLAUDE.md` javítva, commitolva | ld. „Nem pusholtam" |

### A füstpróba — három elkülönülő státusz

Nem státuszkód-**halmazt** fogadtam el (`megengedo-teszt-elrejti-a-rest`):

| Bemenet | `/api/knowledge/search` | Jelentés |
|---|---|---|
| **régi** (publikus) master token | **403** | ✅ visszavonva |
| **új** master token | **400** | ✅ auth átment, a kérés-paraméter bukott |
| token nélkül | **401** | ✅ fail-closed |

### ⚠ Amit a végrehajtás közben találtam — új tételek

**E osztály — Brave Search API-kulcs.** `sha1(BRAVE_API_KEY értéke) =
061ddd503f`, 31 karakter, **mindkét** `.mcp.json`-ban, kint az `origin/main`-en.
**A kapu ezt nem fogta meg**, ezért három ágens három leltárából is kimaradt.
A literál kivezetve; a **visszavonás Gábor-kapu** (Brave-konzol).

**A kapunak két vak pontja van** — izoláltan megmérve, nem feltételezve:

| Alak | Példa | Kapu |
|---|---|---|
| idézőjeles **kulcs** (JSON) | `"api_key": "…"` | ❌ **VAK** |
| **prefixelt** kulcsnév | `BRAVE_API_KEY=…`, `GITHUB_TOKEN=…`, `DB_PASSWORD=…` | ❌ **VAK** |
| csupasz kulcs | `api_key=…`, `apiKey: '…'` | ✅ fog |

Ok: a szabály `(…|api_?key|…)\s*[:=]` — (1) a záró `"` beékelődik a kulcs
és a `:` közé; (2) a `` elbukik a `_`-on, mert az szóalkotó karakter. Ez a
**legelterjedtebb env-elnevezést** hagyja ki.

**Az nginx kivezet a netre.** A 3.0-ban azt mértem, hogy a **szivárgó**
szolgáltatás (3458) csak `127.0.0.1`-en figyel — **ez igaz, de nem jelenti, hogy
semmi nincs kint.** Az nginx a 443-on publikusan kiszolgál:
`datahaven.joinerytech.hu` → `127.0.0.1:3457` (**ma nem fut** → 502) és
`/api/telegram/webhook` → `127.0.0.1:3456` (**fut**, és token nélkül **403** —
fail-closed). A 3456 egy **másik** kódbázis (`/opt/nexus/…`), nem a mi
szivárgásunk — **jelezni kell a Nexus-projektnek**.

**A saját takarításom nem volt teljes.** A „72 → 28" után a 28-at tételesen
átnézve **három** olyan maradt, ami nem fals pozitív, hanem kimaradás
(`server.legacy.ts:2051`, `ADR-048`, `planningRoutes.test.ts`). Kettőt a
**kapu sem** jelzett erre a literálra — `git grep` találta meg. Javítva
(`eb22407`).

### Nem pusholtam — és miért

A három publikus submodule (`cutting` · `inventory` · `procurement`) mind
`main`-en van és **2–3 committal előrébb** más sáv pusholatlan munkájával. A
push azokat is kivinné, át nem nézve — **nem az én döntésem.** A javításom
commitolva, a push a sávok gazdáira vár. *(Az érték amúgy is halott: a
submodule-okban ugyanaz a dashboard-alapértelmezés volt, nem külön kulcs.)*

### Ami Gáborra vár

1. **Google Gemini API-kulcs** visszavonása (konzol) — a kód már env-et olvas,
   hangos hibával.
2. **Brave Search API-kulcs** visszavonása (E osztály, ma találtam).
3. **VPS-IP / tailnet-cím**: maradhat a publikus repóban?
4. A **3 submodule** pushja (idegen commitok miatt visszatartva).

### Amit a rotáció NEM oldott meg

A **git-történet publikus marad** — minden régi érték visszanyerhető a korábbi
commitokból. Ezért volt a rotáció (az érvénytelenítés) az egyetlen valódi
javítás, és ezért nem elég a fájl-takarítás. A publikált történetben az
átmeneti commitjaim (`052c55c`) még idézték a C-osztályú literálokat — azok
**rotálva, halottak**.
