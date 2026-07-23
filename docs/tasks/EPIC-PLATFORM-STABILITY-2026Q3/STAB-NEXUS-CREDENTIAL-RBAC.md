# STAB-NEXUS-CREDENTIAL-RBAC — tokenrotáció és default-deny MCP jogosultság

- **Szerep:** security + Nexus backend + infra
- **Prioritás:** P0
- **Státusz:** open — aktív credential exposure és túl széles alapjog
- **Függőség:** nincs; a rotáció koordinált emberi kapu
- **Mutációs határ:** Nexus Knowledge Service auth/config, token deployment,
  `tool-permissions.yaml`, auth tesztek, secret-scan és VPS bind/runbook
- **Tiltott scope:** tokenérték dokumentálása, régi token kipróbálása, koordinálatlan
  history rewrite, éles rotáció fogyasztói leltár nélkül, jogosultságok globális lazítása

## Bizonyított helyzet — 2026-07-22

| Tény | Bizonyíték | Kockázat |
|---|---|---|
| A követett `config/agents.yaml` nem üres master tokent tartalmaz | lokális kulcsjelenlét-vizsgálat; érték nem került kiírásra | repo-hozzáférésből root/admin MCP hozzáférés |
| A fájl legalább két commit történetében szerepel | `git log -- config/agents.yaml` | a tipből törlés önmagában nem vonja vissza |
| A követett `bin/stdio-bridge.js` beégetett bearer fallbacket tartalmazott | érték nélküli statikus audit; a lokális hardening eltávolította | a bridge-kliens külön credential-exposure és rotációs fogyasztó |
| Az éles `.env` nem tartalmaz `MCP_AUTH_TOKEN`/`MCP_TOKEN_*` override-ot | csak kulcsnév-jelenlét vizsgálva | az éles service a követett YAML credentialjeire támaszkodik |
| A service `*:3458` címen figyel | VPS `ss` | a firewall a fő külső védelem; feleslegesen széles bind |
| UFW alapértelmezésben tiltja a bejövő forgalmat, 3458 nincs engedélyezve | read-only firewall audit | Internet-kitettség csökkentett, de repo/tailnet kockázat megmarad |
| A korábbi `tool-permissions.yaml` defaultja `all` volt; a lokális hardeningben már `none` | konfiguráció és regressziós teszt | deploy előtt független review szükséges |
| 112 deklarált MCP toolból 58-nak még nincs explicit szabálya | gépi név-összevetés | lokálisan mind az 58 tiltott; szerepkördöntésig rollout-blokkoló |
| A korábbi auth token-konfiguráció hiányában rootként továbbengedett; a lokális hardening ezt megszüntette | `mcp.ts` és auth regressziós teszt | a javítás deployjáig a futó környezet külön ellenőrzendő |

## Célállapot

1. Productionben minden credential kizárólag root által olvasható secret source-ból
   érkezik; a repóban csak token nélküli séma/példa marad.
2. A master és minden agent token rotált, a régi értékek visszavonva.
3. Productionben hiányzó auth-config startup-failure, soha nem root dev fallback.
4. Az authorization default `none`; minden mutáló tool explicit, least-privilege
   szabályt kap.
5. A service csak a szükséges interfészen figyel: loopback vagy explicit tailnet
   bind, nem wildcard.

## Végrehajtási munkacsomagok

### NEXUS-SEC-01 — fogyasztói leltár és rotációs terv

1. Leltározd a master és agent token fogyasztókat: systemd env, Codex/MCP config,
   terminálok, CI, monitor, tunnel és operátori kliensek.
2. Készíts tokenenként owner, scope, utolsó ismert használat és átállási sorrend
   táblát; tokenérték nem kerülhet bele.
3. Határozz meg rövid dual-read átmenetet vagy atomi váltást. A master tokennél
   a dual-read csak explicit időablakkal engedett.
4. Készíts rollbacket, amely az új credentialt tartja meg, és a klienskonfigot
   állítja vissza; régi kompromittált token visszaengedése nem rollback.

### NEXUS-SEC-02 — credential source és fail-closed startup

1. Válaszd külön az agent identity mappinget a credentialtől. A követett YAML
   token helyett stabil agent ID/role leírást tartalmazzon.
2. Credential csak `MCP_AUTH_TOKEN`, név szerinti `MCP_TOKEN_*`, systemd credential
   vagy támogatott secret provider útján tölthető.
3. Productionben üres master+agent készlet dobjon startup config hibát.
4. A root dev fallback csak explicit `NODE_ENV=development` **és** külön
   `MCP_ALLOW_INSECURE_DEV_AUTH=true` mellett legyen elérhető; induláskor warning.
5. Sem token, sem hash, sem Authorization header ne kerüljön logba.

### NEXUS-SEC-03 — default-deny RBAC

1. `default: none`; config-load hiba productionben tartsa meg az utolsó valid
   snapshotot, első load hibája pedig állítsa le a service-t.
2. Generálj gépi ellenőrzést a deklarált MCP toolok és permission-szabályok
   halmazára. Hiányzó tool production build/deploy kaput bukjon.
3. Író, task-létrehozó, worker-spawn, skill/codegen és külső üzenetküldő toolok
   kizárólag explicit szerepköröknek járjanak.
4. A read-only szerepkörök kapjanak külön golden-path tesztet; ismeretlen agent és
   ismeretlen tool fail-closed.
5. A `tools/list` és `tools/call` ugyanazt a döntési függvényt használja, és a
   közvetlen call nem kerülheti meg a listaszűrést.

### NEXUS-SEC-04 — rotáció, bind és történeti ellenőrzés

1. Generálj CSPRNG-vel új credentialeket; érték csak secret store-ba kerül.
2. Állítsd át a fogyasztókat, restartold a Knowledge Service-t, majd auth smoke.
3. Vond vissza az összes repóban szerepelt értéket.
4. A service bind legyen `127.0.0.1:3458` vagy dokumentált tailnet cím; `ss` és
   firewall evidence kötelező.
5. Futtass támogatott secret-scannert a teljes history minden refjén. A leletből
   csak fájl, commit és secret-típus kerülhet riportba, érték nem.
6. History rewrite csak akkor, ha a rotáció után is szükséges, és minden clone/
   fork koordinációja megvan.

### NEXUS-SEC-05 — REST route-leltár és explicit authorization kapu

**Állapot: BLOCKED — üzleti tulajdonos és route-onkénti hozzáférési döntés kell.**

A bootstrapban jelenleg kizárólag az MCP, a mailbox és a kompatibilitási
`/api/tasks/status` útvonal kap központi hitelesítést/jogosultságvizsgálatot. A
következő router-mountok teljes route-leltára és döntési mátrixa kötelező:

- `/api/telegram`, `/api/metrics`, `/api/autonomous`, `/api/monitor`, `/api/ideas`,
  `/api/graph`, `/api/planning`, `/api/phase`;
- `/`, `/api/pipeline`, `/api/control`, `/api/task`;
- `/api/session`, `/api/sessions`, `/api/terminal`, `/api/terminals`,
  `/api/knowledge`, `/api/memories`, `/api/digest`, `/api/subscriptions`,
  `/api/escalation`, `/api/auth`;
- `/api/dashboard`, `/api/registry`, `/api/kanban`, `/api/projects`,
  `/api/agent-messages`, `/api/channels`, `/api/epic-router`,
  `/api/monitoring/cost`.

Végrehajtás:

1. Generálj `HTTP_ROUTE_AUTH_MATRIX.md` fájlt minden konkrét HTTP method + path
   párral, handlerrel, adatérzékenységgel és mutációs jelzővel.
2. Minden sor kapjon pontosan egy döntést: `public`, `authenticated`, szerepkörös,
   saját terminál/tenant, vagy `disabled`. A `/health` jellegű kivételek legyenek
   név szerintiek; a router-prefix önmagában nem jogosultsági szabály.
3. Az ismeretlen/nem osztályozott route legyen default-deny. Mutáló route nem
   maradhat implicit publikus.
4. Minden döntéshez legyen anonim, hibás tokenes, tiltott szerepkörös negatív
   HTTP teszt és legalább egy engedélyezett golden path.
5. CI/deploy kapu hasonlítsa össze az Express route-leltárt a mátrixszal; hiányzó
   vagy duplikált döntés bukjon.

Elfogadási kritérium: a fenti mountok minden konkrét route-ja leltározott, owner
által jóváhagyott és gépileg kikényszerített; addig élesítés blokkolt.

### NEXUS-SEC-06 — embedding runtime dependency-migráció

**Állapot: BLOCKED — kompatibilitási migráció kell; automatikus downgrade tilos.**

Az `npm audit --omit=dev` eredménye: **6 production finding**
(`1 critical / 4 high / 1 low`). A kritikus/magas lánc:
`@xenova/transformers@2.17.2 → onnxruntime-web@1.14.0 → onnx-proto@4.0.4 →
protobufjs@6.11.6`, továbbá a láncban `sharp@0.32.6`. A low finding az
`isomorphic-dompurify@3.18.0 → dompurify@3.4.11` ágon van.

Végrehajtás és kapu:

1. Készíts kompatibilitási spike-ot támogatott transformers/ONNX runtime
   verzióval vagy csereszabatos embedding adapterrel; `npm audit fix --force`
   nem elfogadott megoldás.
2. Rögzíts modellbetöltési, embedding-dimenzió, determinisztikus fixture,
   memória- és indulásiidő-baseline-t a váltás előtt.
3. Upgrade után fusson szemantikus keresési golden suite, modellletöltés nélküli
   offline smoke, Windows és Linux natív `sharp`/runtime indulási teszt.
4. Frissüljön lockfile és SBOM; `npm audit --omit=dev` ne tartalmazzon critical/
   high findingot, vagy legyen időkorlátos, ownerrel és kompenzáló kontrollal
   elfogadott kivétel.
5. Külön reviewer igazolja, hogy az embedding eredmény és a production startup
   nem regresszált.

## Tesztkapu

- hiányzó token productionben startup failure;
- invalid/missing Bearer `401/403`, soha nem root;
- régi token elutasított, új token megfelelő identityt ad;
- minden deklarált toolhoz pontosan egy explicit policy döntés tartozik;
- low-privilege token nem hívhat író, spawn, codegen vagy broadcast műveletet;
- reload hibája nem vált `default=all` állapotra;
- auth és permission log nem tartalmaz credentialt.

## Elfogadási kritériumok

- [ ] Minden repóban szerepelt master/agent token visszavonva és rotálva.
- [ ] A követett fájlokban nincs működő credential; CI secret-scan zöld.
- [x] Production auth-config hiányában a lokális service build nem indul.
- [ ] Permission default `none`, unlisted toolok száma `0`.
- [ ] Szerepkör-mátrix és negatív authorization suite zöld.
- [ ] A 3458 listener nem wildcard; firewall és tunnel működés bizonyított.
- [ ] Maker/reviewer külön; deploy és rotáció emberileg jóváhagyott.

## Stop / eszkaláció

- Ne töröld a működő credentialt addig, amíg nincs minden fogyasztóhoz új érték és
  visszaellenőrzött átállási út.
- Ne közöld a régi vagy új tokent issue-ban, taskban, diffben, logban vagy chatben.
- Ha a history scan további production secretet talál, a munka incidenskezeléssé
  bővül; minden érintett credential külön rotálandó.

## Megvalósítási checkpoint — 2026-07-22

**Állapot:** részleges hardening elkészült lokálisan; deploy/rotáció nem történt.

Elkészült:

- a Knowledge Service credentialt csak `MCP_AUTH_TOKEN` és `MCP_TOKEN_*`
  környezeti/secret-provider forrásból vesz fel;
- productionben üres credential-készlet startup hibát okoz;
- az insecure root fallback kizárólag `NODE_ENV=development` és
  `MCP_ALLOW_INSECURE_DEV_AUTH=true` együttes beállításával aktív;
- a közös Bearer-döntési függvényt használja az MCP és REST auth;
- az MCP információs GET végpont is hitelesített, és csak az identitás számára
  engedélyezett tool-neveket listázza;
- a permission alapértelmezés `none`; ismeretlen tool és explicit `none`
  root számára is tiltott;
- hibás/olvashatatlan első permission-load productionben fail-fast; reload
  hibánál az utolsó valid snapshot marad aktív;
- determinisztikus tool-policy coverage riport készül, az incomplete policy nem
  nyit jogosultságot;
- tokenmentes identity/credential-env példa készült
  `config/agents.example.yaml` néven;
- a token- és permission-mapek prototype-biztosak; `toString`, `constructor` és
  `__proto__` regressziók tesztelve.
- a stdio bridge kizárólag környezeti credentialt fogad; hiány esetén generic
  üzenettel, fail-closed módon leáll;
- a token-összehasonlítás fix hosszúságú digesten, constant-time primitívvel
  történik, eltérő hossz és Unicode input mellett is biztonságosan;
- hiányzó MCP identitás a `tools/list` és `tools/call` ágakon sem válik roottá;
- a mailbox authorization a validált, már illesztett route-paraméterből dönt,
  ismeretlen route-ot tilt, és más terminál postaládáját nem engedi olvasni;
- az `/api/tasks/status` kompatibilitási alias hitelesített, dokumentáltan
  read-only útvonal.

Bizonyíték:

- `npx vitest run src/__tests__/unit/mcpAuth.test.ts src/__tests__/unit/stdioBridge.test.ts
  --pool=threads --maxWorkers=1` → **19/19 zöld**;
- `npx vitest run src/__tests__/integration/mcpMailboxAuth.integration.test.ts
  --pool=threads --maxWorkers=1` → **3/3 zöld**;
- `npm run build` → **TypeScript build zöld**;
- coverage snapshot: **112 deklarált tool / 54 explicit szabály / 58 hiányzó
  szabály / 0 stale / 0 duplicate**.

**BLOCKED / rollout-kapu:** az 58 hiányzó tool least-privilege szerepköre üzleti
döntést igényel; addig mind tiltott. A valódi `config/agents.yaml` változatlan,
a credential-rotáció, fogyasztói leltár, secret-store átállás, listener-bind,
VPS smoke és független reviewer továbbra is nyitott. A lokális `npm ci` további
dependency-audit triage-ra **1 low / 4 high / 1 critical** jelzést adott; ebben a
szeletben automatikus dependency-upgrade nem történt. A széles REST router-kör
explicit route-döntései és a dependency-migráció a `NEXUS-SEC-05`/`06` kapukban
agent-ready bontásban maradnak nyitva.

**Független review:** a lokális rész-szelet `APPROVED`, P0–P3 finding nélkül.
A reviewer 22/22 unit/subprocess/HTTP tesztet és zöld TypeScript buildet futtatott,
külön production credential-hiány, bridge exit `78`, anonim MCP `401`, unlisted
root call `403`, mailbox cross-read tiltás és authenticated task-status smoke
bizonyítékkal. A teljes task továbbra is `open`: az 58 explicit policy-döntés,
rotáció és fogyasztói átállás, history scan, listener-bind, VPS rollout, REST
route-mátrix és dependency-migráció nincs kész.
