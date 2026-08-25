---

_Updated: 2026-07-14_

## EPIC-UI-PORTAL-2026Q3 (2026-07-14, 6. mentés) — CRM FE KÉSZ
CRM frontend kész az EHS-sablonra: 6 képernyő, kanban validált stage-move, LEAD_FSM (nurturing a terv szerint — backend-gap follow-up), OPP_FSM stage-valószínűségekkel, új modul-agnosztikus services/fsmGuards.ts (a services/ehs/fsm.ts migrációja rá: kis follow-up task). 60/60 + 1201/1220, build zöld. TANULSÁG: agent-elakadás oka lemezhely volt (npm cache clean → 3.87 GB). Futó: F2-CRM-REVIEW (designer) + F2-KONTROLLING-FE (slate akcent, MSW-first a spaceos-modules-kontrolling domain-kontraktusára — EAC/variance kész backend, csak host nincs). EPICS.yaml-t Gábor is szerkeszti — szinkronban tartani!

---

_Updated: 2026-07-14_

## EPIC-UI-PORTAL-2026Q3 (2026-07-14 éjjel, 7-8. mentés — OFFLINE sorban)
CRM ✅ APPROVED (re-review: mind az 5 finding kódban igazolva, 68 teszt). modules_done: [ehs, crm] — 2/7 modul teljes minőségi körrel kész. Kontrolling FE épül. VPS SSH-blokker áll (Nexus offline, jelentések pending-nexus sorban). Dokumentáció teljes: docs/tasks/EPIC-UI-PORTAL-2026Q3/ + EPICS.yaml + qa/ review-jelentések.

---

_Updated: 2026-07-18_

## PROJECT-STATE-ASSESSMENT-2026-07-18 — tudástári baseline

A teljes programállapot bizonyíték-alapú pillanatképe elkészült:
`docs/knowledge/architecture/PROJECT_STATE_ASSESSMENT_2026-07-18.md`.
A stratégiai termékmag a program → projekt → mérföldkő → FlowEpic → task
hierarchia, actor-szűrt nézetekkel és B2BHandshake-del. Ajánlott sorrend:
hosting/auth/RLS kapu → API-first production és warehouse → valós API E2E →
projekt bounded-context ADR. A `docs/joinerytech` történeti design-korpusz; az
élő státusz forrása az `EPICS.yaml`, az aktuális kurált tudásé a
`docs/knowledge`, a kivitelezési bizonyítéké a `docs/tasks`. Friss ellenőrzés:
portal build PASS; a teljes frontend suite nem zárt 15 percen belül; lint
198 error + 17 warning; VPS 11/11 service active. Részletes task-mementó:
`docs/tasks/PROJECT-STATE-ASSESSMENT-2026-07-18.md`.

---

_Updated: 2026-07-18_

## PLATFORM-TASK-BACKLOG-2026-07-18 — agent-végrehajtható feladatbontás

A projektfelmérés 3 részletes végrehajtási sávra és 19 aktív task-kártyára lett
bontva: Platform Stability (5), UI Worlds production+warehouse (12), Project Core
(2). Központi belépési pont: `docs/tasks/README.md`; élő státusz és függőségek:
`EPICS.yaml`; lezárt mementó:
`docs/tasks/archive/PLATFORM-TASK-BACKLOG-2026-07-18.md`. Minden kártyán van
forrás- és mutációs határ, tiltott scope, tesztkapu, acceptance, stop/escalate és
átadási bizonyíték. A gráf validált: 85/85 egyedi ID, hiányzó függőség és ciklus
nincs, 19/19 aktív task-fájl és kötelező szakasz rendben, helyi linkek épek. A
Project Core implementáció audit+ADR előtt tiltott, mert a Kernelben már két
projekt-réteg és működő FlowEpic/StageChain/B2BHandshake képesség van.
Preflight HEAD: `4a58e48`; átadáskor a párhuzamos ADR-059 wire-task commit miatt
a HEAD `26f6f5d` volt, a dokumentációs változások staging és commit nélkül maradtak.

---

_Updated: 2026-07-23_

## PROJECT-STATE-CHECKPOINT-2026-07-23 — leállított, visszaállítható állapot

A 2026-07-22/23-i többagent-es munka lezáró pillanatképe elkészült:
`docs/knowledge/architecture/PROJECT_STATE_CHECKPOINT_2026-07-23.md`.
A kanonikus élő státusz továbbra is `EPICS.yaml`; a rövid operátori állapot
`terminals/root/STATE.md`, a következő végrehajtási sorrend
`terminals/root/TODO.md`.

Legfontosabb folytatási védelem: a portal `1787e0b` dirty munkafája két eltérő
érettségű szeletet kever. A `RISKS-5X5-FE` frontend APPROVED (15 fájl /
145 teszt, build/lint/boundary zöld), de a backend `ValidationBehavior`
P1 miatt nem zárható; Root a szűk backend fájlzár-ACK-ot később megadta, a
végrehajtás még nem indult. Az `EHS-WIZARD-HU` félkész és szüneteltetett; az ingest
agent megszakadt, a legutóbbi tesztátírás óta nincs teljes kapu vagy review.
Tömeges stage/commit tilos.

Biztonsági állapot: Nexus auth/RBAC lokálisan 22/22 + build APPROVED, de token-
rotáció/policy/rollout nyitott. Cutting trusted-proxy/tenant-host lokálisan
76/76 + 9/9 és clean build APPROVED, de nincs deploy, a teljes dirty fa nem
approved. A platform NuGet auditkapu APPROVED és `a0be291` alatt merge-elt, de
a teljes discoverben 117 blokkoló finding és három hiányzó runtime-forrás
maradt.

Minden Codex-agent és JoineryTech Vite/Vitest folyamat leállt, a 4174-es port
zárva. A Codex leállításakor nem történt commit, push vagy deploy; Root később
csak a külön NuGet audit- és dokumentációs szeleteket commitolta (`a0be291`,
`46c1f70`, `91c3446`, `15fcb24`). EHS portálkód, Nexus/Cutting runtime-diff
vagy deploy nem került commitba.

---

_Updated: 2026-07-23_

## EHS-VALIDATION-P1 — root-végrehajtás Codex leállása után

A `RISKS-5X5-FE` utolsó backend-blokkolója (inert FluentValidation validatorok:
regisztrálva, de `IPipelineBehavior` nélkül soha nem futottak) root
többagentes workflow-ban zárva: recon (validator-szabályok + modul-szintű
500-leak sweep + kontraktus-paritás + baseline) → implementáció → 3-lencsés
adverzariális review → javító kör. Kulcslelet: a recon 13 endpointot talált,
ahol a behavior bekötése után a ValidationException 500-ként szivárgott volna
— mind explicit 404 mappinget kapott az MSW-kontraktus szerint. A mutációs
review P0-t fogott (a pipeline-teszthost inline wiringje miatt a tesztek nem
pinelték a production DI regisztrációt) → `EhsModuleRegistrationTests` DI-pin
tesztek. TANULSÁG: valódi-pipeline teszthost önmagában nem elég, a production
composition rootot külön kell pinelni. Kapuk (root-újrafuttatás): build 0
hiba, Domain 130/130, Infrastructure 121/121. Hátra a taskból: portál-szelet
commit (WIZARD-HU entanglement) + végső integrált ellenőrzés.

---

_Updated: 2026-07-23_

## EHS-WIZARD-HU átvétel + entanglement-feloldás — mindkét szelet mergelve

A szüneteltetett wizard-szeletet a root vette át és fejezte be (workflow:
diff-audit szerződés ellen → implementáció → 3-lencsés fresh review, első
körben APPROVED). Kulcsleletek: valódi wizard-bug (siker után onClose sosem
futott — handleClose no-op isSubmitting alatt); a mock nem tükrözte a backend
kötelező locationId/max-hossz minimumát (mock-only zöld veszély); a félkész
teszt a hibás locationId:null→201 szerződést kodifikálta. A kanonikus ingest
backend a src/spaceos-modules-ehs EventsController (api/ehs/events) — NEM a
src/ehs (ott a risk-assessments él). Mindkét EHS szelet atomikusan mergelve:
joinerytech-portal@1f3ca31 (45 fájl), pin-bump kész. RISKS-5X5-FE done +
archiválva. TANULSÁG (entanglement-feloldás mintája): a blokkolt APPROVED
szelet leggyorsabb feloldása a másik félkész szelet TELJES befejezése volt,
nem a diff-szétvágás. EHS-WIZARD-HU done-hoz: Gábor vizuális QA.

---

## Plant több-bérlős és termék-routing invariánsok — 2026-08-14

- `joinerytech.plant` önálló customer product. Nem `joinerytech.door` alias és
  nem Doorstar membership-handoff cél. A human authority kizárólag az exact
  `joinerytech.plant.view|edit|admin` grant és `joinerytech.plant` modul;
  az Office adapter külön, jövőbeli service-principal boundary.
- A termék landinget csak az exact, hitelesített permission/module halmaz
  határozhatja meg. `preferred_product`, realm role, URL, query, fragment vagy
  browser storage nem authority. Több jogosult termék explicit választót kér.
- A Plant cél URL-je csak külön validált HTTPS root origin lehet, token/tenant/
  grant átadása nélkül. Üres konfiguráció vagy hiányzó allowlist fail-closed;
  a forrás elkészülte önmagában nem jelent kiszolgálást vagy aktiválást.
- Plant DB-runtime csak közvetlen, non-owner, NOINHERIT credential lehet. Sem a
  runtime role nem lehet más role tagja, sem más login nem lehet a runtime role
  tagja; a védett táblákon kizárólag owner + exact runtime direct ACL maradhat.
- “Source-ready” nem “activation-ready”: live PG/RLS, identity/JWKS/readback,
  browser session, PoP, recovery és rollback bizonyíték nélkül minden külső
  Plant-belépés és DPEX-v2 fogadás alapértelmezetten OFF marad.

## Plant élő adatbázis-bizonyíték — 2026-08-14

- A Plant három-credentiales PostgreSQL/RLS és backup/restore kapuja már élő,
  izolált PostgreSQL 16-on zöld; ezt a régi „nem futott live DB” bejegyzések
  fölé író új állapotként kell olvasni. A Kernel 0038 Up/Down policy is valódi
  PostgreSQLön bizonyított.
- Az `aclexplode` rekord sorrendje `grantor, grantee, privilege_type,
  is_grantable`; ezt explicit teszt pineli. Az exact ACL fogalma a táblaszintű
  és oszlopszintű ACL-ek együttes, fail-closed allowlistjét jelenti.
- A zöld DB nem jelent identity-aktiválást. A Plant cél URL, receiver mount,
  Office worker és parancsvégrehajtás maradjon OFF, amíg a friss-tokenes
  mapper/readback/revoke, tartós lifecycle, browser OIDC/BFF és operator PoP
  külön el nem készül és jóváhagyást nem kap.
- Az „exact ACL” bizonyított jelentése két katalógus együtt: table
  `pg_class.relacl` és direct column `pg_attribute.attacl`. A migration csak az
  explicit PUBLIC/runtime column grantot vonhatja vissza atomikusan; idegen role
  grantjánál módosítás nélkül kell leállnia, a runtime startupnak pedig minden
  nem-owner direct column ACL-t tiltania kell.

## Identity- és supply-chain invariánsok — 2026-08-20

- A tagsági registry és a JWT wire projection két külön adatmodell. A registry
  tarthat több membershipet, lifecycle/metaadatot és több product grantot; egy
  konkrét consumer tokenje csak az adott `azp`/audience számára szükséges exact
  claim-alakot és minimális product grantot kaphatja.
- A flat `tid`/top-level permission vagy realm-role authorityt kibocsátani képes
  régi provisioner veszély akkor is, ha az új consumer már megtagadja: egy későbbi
  operator visszaírhatná a régi mappereket. Ilyen CLI-t profile/credential/network
  előtt kell hard-retire-olni, nem pusztán dokumentációban elavultnak jelölni.
- Audit-zöld nem lehet támogatás nélküli tranzitív major override eredménye. A
  szülőcsomagot támogatott gráfra kell emelni, majd compile/load/runtime határig
  bizonyítani; a Docker nélküli create/start és DB/RLS út külön nyílt gate marad.
- Production-only dependency audit nem elég biztonságos tesztüzemhez: a test/dev
  toolchain critical/high találatait is zárni kell. Ugyanakkor vak `audit fix
  --force` helyett minimális pin/override, teljes suite és build szükséges.
- A csomagcsere utáni `--no-restore` audit elavult `project.assets.json` alapján
  hamis maradékot mutathat. A helyes sorrend: tulajdonos csomag azonosítása
  (`dotnet nuget why`), célzott módosítás, friss restore, build/teszt, majd az
  egész érintett solution vagy harness-leltár transzitív újraauditja.
- Source-ready és local-signer-E2E nem aktiválási evidencia. Valós Keycloak JWKS,
  friss token, online registry, revoke/rotation, PoP, ingress/recovery és aláírt
  immutable release nélkül a deny-all/default-off állapotot meg kell tartani.
- Frozen/released hash driftet nem szabad a jelenlegi dirty fához repinelni. Új,
  breaking szerződéshez új verzió, tiszta provenance és új evidence kell; a régi
  receiptet történeti bizonyítékként változatlanul kell hagyni.

## Keycloak mutációs invariánsok — 2026-08-20

- Egy nem nulla digest önmagában nem ownership vagy custody evidence. A receipt
  csak source-pinned public trust anchorral, exact realm/resource/internal UUID/
  owned-state/config/change-id kötéssel és rövid időablakkal jelent bizonyítékot.
- Két egymással azonos teljes read-only inventory passz csökkenti a driftet, de
  nem atomikus CAS. A classic Admin REST observe→PUT versenyét csak szerveroldali
  serialized writer/lock/SPI zárhatja; addig az apply kódút legyen fizikailag
  raise-only, ne egy módosítható feature flag mögötti latent scaffold.
- A reverse inventory teljes csak akkor, ha minden kliens és scope paginálva,
  minden direct/attached mapper és default/optional edge exact immutable ID–név
  párral szerepel. Azonos ID alias néven vagy identikus duplikátum is hiba.
- Secret-szűrésnél a kulcsnév-részletre épülő denylist veszélyes: a legitim
  `access.token.claim` mapper flag nem secret. Exact/path-aware secret schema és
  canonical mapper round-trip teszt szükséges.
- Nem létező browser runtime-hoz nem szabad callbacket kitalálni. A Plant kliens
  maradjon disabled és explicit activation Block, amíg külön review-zott frontend,
  origin és PKCE redirect contract nincs.

## Online authority és JWKS invariánsok — 2026-08-20

- A konfigurált HTTPS URL nem source pin. A tényleges abszolút URI-t a legbelső
  transport-boundaryn, minden késői HttpClientFactory handler/default-header/
  primary módosítás után újra kell attestálni. TestServer-kivétel csak internal
  friend markerrel élhet; publikus Development flag nem bizalmi bizonyíték.
- A service-auth adapter nem birtokolhat ellenőrizetlenül mutálható kérést és nem
  bízhatjuk rá a teljes timeoutot. Method/URI/content/header/proof lenyomat,
  független teljes budget és exception-normalizálás szükséges; adapter-hibára nincs
  retry vagy token-claim fallback.
- JWKS-frissességet nem mérhet cache-hit. Csak teljes, hálózatról beolvasott,
  strict JSON-ként parse-olt és exact issuer/key-setként validált konfiguráció
  mozdíthatja a success időpontot. LKG legyen explicit tiltva; max-age után auth
  fail-closed, refresh-hibán readiness azonnal unhealthy.
- A duplikált kid tiltása nem azonos a duplicate-safe JSON-nal. Discovery és JWKS
  minden objektumszintjén a nyers, dekódolt property-nevek duplikációját még az
  upstream parser előtt el kell utasítani.
- Readiness-gated ingress mellett a hideg, passzív JWKS cache holtpontot okozhat.
  Source-owned bounded prewarm/retry szükséges, amely nem hosszabbít cache-időt,
  shutdownot tisztel, és kiesést nem rejt el stale konfigurációval.

- A `JwtBearerOptions` pre-request attestációja önmagában nem elég: a framework
  később shallow-clone-olja a TVP-t és await közben a public events/handler/
  crypto-factory referenciák mutálhatók. A validációhoz minden kérésen külön,
  forrástulajdonú options, TVP, token-handler és sealed events snapshot kell;
  a public config csak drift-detektálási input lehet.
- A JWKS `kid` egyezése nem jelent signing jogosultságot. A trustot közvetlenül
  validált, public RSA `n`/`e` anyagból kell építeni; `use=enc`, idegen `alg`,
  x5c/alternatív key-material, privát/szimmetrikus mező, hibás exponent vagy
  gyenge modulus nem válhat access-token validációs kulccsá.

---

## Kernel–Doorstar tesztüzemi checkpoint — 2026-08-21 (mára befagyasztva)

- A kontrollált migration rehearsal kizárólag helyi Docker Desktoptal, eldobható
  PostgreSQL-lel, explicit opt-innel, lokális endpoint-ellenőrzéssel és pull nélküli
  konténerpolitikával futhat. Ez nem deploy- és nem production-adatbázis-út.
- A valós rehearsal az EF relációs modell és PostgreSQL között 23 eltérést hozott
  felszínre. A helyes reakció a tárolási szerződés tisztázása, nem history-stamp,
  snapshot-hamisítás vagy vak adatkonverzió.
- A történeti SprintC TEXT tárolás marad modelloldali explicit text mappinggal;
  FlowEpics.CurrentStageCode varchar(30), ExternalAuthTokenRef varchar(512).
  Az IntentDataJson text marad: jsonb-re alakítása megváltoztathatja a raw JSON
  alapú LastStateHash integritását.
- A nem discoverelt történeti 0013 RefreshTokens migrationt nem szabad utólag
  discoverable-é tenni. A biztonságos út egy új, forward-only 0037: hiányzó
  táblát pontosan létrehoz, meglévőt csak teljesen kanonikus shape, owner, ACL,
  index és függőségi felület mellett adoptál, minden más állapotnál fail-closed.
- Folytatási sorrend: 0037 catalog/negatív rehearsal lezárása → független review
  és statikus kapuk → kontrollált Docker újrafutás → snapshot-paritás döntése →
  Doorstar service-token adapter. Sem emberi bearer továbbítás, sem Keycloak/Doorstar/
  VPS/éles DB művelet nem engedett e kapuk előtt.

---

## Több-repós publikálási invariáns — 2026-08-25

- A fő repo és minden tényleges forrásmódosítást tartalmazó inicializált alrepo
  külön commitot kapott és a távoli SHA read-only ellenőrzéssel igazolt. A parent
  main csak már távolról elérhető submodule commitokra mutathat.
- Nem kerülhet repóba helyi agent-hitelesítő, böngésző-pillanatkép vagy generált
  build-artefakt. A helyi Codex-konfiguráció, Playwright állapot és Maven target
  ezért ignore alatt marad; a maradó Contracts/Nesting bin/obj módosítás nem
  forrásdrift és nem része a kiadásnak.
- Detached alrepónál új, távoli codex ág kell; force-push, history-rewrite és
  kézi submodule-SHA hamisítás nem elfogadható.

---

## Kernel kontrollált adatbázis-próba — 2026-08-25

- A `spaceos-kernel` `codex/kernel-identity-authority` ágán a
  `9fa208e` commit lezárta a 0037 RefreshTokens forward-only rehearsal kapuit;
  az ág normál push-sal távolra került. Ez még nem merge/deploy és nem módosítja
  a publikus Kernel `develop` vagy a parent submodule SHA-ját.
- A friss forrásból futó, explicit opt-in helyi Docker/PostgreSQL próba teljesen
  zöld: Identity Authority 8, SpatialTaskLinks 2, Ecosystem Actor Types 2,
  SprintC 4 és RefreshTokens 6 teszt. A RefreshTokens-kör valós deferred-slot
  logical subscriptiont, aktív publisher slotot és ténylegesen replikált sort
  bizonyított; minden tesztkonténer eldobható volt.
- A rehearsal történetét a teljes EF-discoverable lánchoz kötjük, nem rövidített
  history-hoz. A standalone 0037 script-verifier kötelező friss Release buildet
  végez a `--no-build` EF generálás előtt, így nem minősíthet elavult artefaktot.
- Kapuk: Release build 0 warning/0 error, offline Kernel tesztek 1123/1123,
  verifier és PowerShell parser zöld, független diff-review P0 nélkül.
- **Továbbra activation NO-GO:** a globális AppDbContext snapshot-paritás nincs
  megoldva; Doorstarban még nincs M2M `private_key_jwt`/`client_credentials`
  adapter, helyi trusted-TLS Keycloak realm és dedikált, nem perzisztens teljes
  technikai próbastack. Emberi bearer továbbítása, VPS/éles DB/Keycloak módosítás
  továbbra tiltott.

---

## Doorstar M0 + Kernel snapshot checkpoint — 2026-08-25

- A fenti „nincs adapter” állítás a mostani állapotban már csak a futó
  integrációra igaz: a Doorstar `6589fb7`
  (`codex/doorstar-identity-authority-m2m`) ágán elkészült a tiszta baseline-os,
  default-off, source-only M2M kliens. Nincs route/BFF/Prisma/OpenAPI/runtime
  bekötés, ezért ez nem tesztüzem és nem DSCONV-03-zárás.
- A kliens kizárólag `client_credentials + private_key_jwt` service tokent küld
  a fix Kernel resolvernek; humán bearer mezőt elutasít. Konfiguráció-hiánynál
  disabled, részleges/inkanonikus config, insecure TLS/proxy és szerződéssértő
  válasz esetén fail-closed. Fókuszált teszt 48/48, build és OpenAPI 85/85 zöld;
  két független review P0/P1 nélkül.
- A Doorstar teljes unit suite 122/124: a két régi, nem M0-hoz tartozó hiba a
  planning fixture SHA pin és a RAG candidate dry-run validator drift. Ezeket
  nem szabad auth-slice-ban átírni.
- A Kernel `ab68d43`
  (`codex/kernel-appdbcontext-snapshot-reconciliation`) ág dokumentálja és
  pineli az EF 8.0.11 toolingot. A 9fa208e candidate helyi migration rehearsal
  zöld, de `has-pending-model-changes` exit 1 miatt a teljes snapshot-paritás
  továbbra activation NO-GO; az ág nem végez DB/Keycloak/VPS/deploy műveletet.
- Próbaüzem következő sorrendje: Doorstar M1 tiszta control-plane/evidence/session
  alap → M2 BFF → Kernel snapshot reconciliation és release-attestation →
  külön jóváhagyott, eldobható local Keycloak–Kernel–Doorstar E2E.
