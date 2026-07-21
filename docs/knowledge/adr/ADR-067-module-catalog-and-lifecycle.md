# ADR-067: Kanonikus ModuleId, aláírt modul-katalógus és modul-életciklus

- **Státusz:** JAVASOLT (Proposed) — **nem elfogadva**. Lásd „Nyitott kérdések Gábornak" —
  a trust root, a package registry és a kereskedelmi entitlement-tulajdonos döntése
  hiányzik, a task saját „Stop / eszkaláció" szabálya szerint ez az ADR emiatt marad
  Proposed, amíg Gábor explicit el nem fogadja.
- **Dátum:** 2026-07-21
- **Felvetette:** `ERPSEP-02` (EPIC-ERP-SEPARATION-2026Q3), ERPSEP-01 kimenetére építve
  (`docs/knowledge/architecture/ERP_CAPABILITY_BOUNDARY_AUDIT_2026-07-18.md`, különösen
  a 6. és 10.1 pont).
- **Szerep:** architect + security
- **Kötelező input (mind ellenőrizve, bizonyíték-alapú):**
  - `src/spaceos-kernel/SpaceOS.Kernel.Domain/Services/ModuleRegistryService.cs`
  - `src/spaceos-kernel/SpaceOS.Kernel.Domain/Enums/ModuleType.cs`
  - `src/spaceos-kernel/SpaceOS.Kernel.Domain/Entities/Tenant.cs`
  - `src/spaceos-kernel/SpaceOS.Infrastructure/Migrations/20260408100000_Migration_0025_TenantEnabledModules.cs`
  - `src/spaceos-kernel/SpaceOS.Infrastructure/Migrations/20260415054837_Migration_0029_EcosystemActorTypes.cs`
    (a `validate_enabled_modules_for_type()` DB-trigger, SEC-02)
  - `src/joinerytech-portal/src/auth/AuthContext.tsx`
  - `src/joinerytech-portal/src/auth/RequireAuth.tsx`
  - `src/joinerytech-portal/src/mocks/worlds.ts`
  - `src/joinerytech-portal/src/App.tsx`
  - `docs/knowledge/architecture/SPACEOS_MODULAR_PRODUCT_ARCHITECTURE_2026-07-18.md`, 6–7. fejezet
  - `docs/knowledge/architecture/ECOSYSTEM_MODULE_ARCHITECTURE.md`

---

## Kontextus

Az ERPSEP-01 audit (6. pont) bizonyította, hogy ma **két, egymástól diszjunkt, kódszintű
megfeleltetés nélküli modul-világ** él a platformon:

1. **Kernel statikus allowlist** (`ModuleRegistryService.cs` + `ModuleType.cs` +
   `validate_enabled_modules_for_type()` DB-trigger): `TenantType`-onkénti
   `door/cabinet/window/cutting/spatial/trading/delivery/installation/orders` halmaz. Ez
   egy **ökoszisztéma-aktor-szintű** (Manufacturer/PanelCutter/Trader/Logistics/Installer/
   EndCustomer) regiszter, nem a 7 ERP-modulra vonatkozik — a 7 ERP-modul **egyáltalán
   nincs benne** ebben az allowlistben.
2. **Portál `enabled_modules` világ** (`AuthContext.tsx` 42–47. sor: JWT-claim parse; 86.
   sor: a mock/dev útvonalon `['crm','kontrolling','hr','maintenance','qa','ehs','dms']`
   **hardcode-olva**): ez a 7 ERP-modul kulcsait olvassa, de a Kernel felé **semmilyen
   validáció vagy szinkron nincs** — nincs DB-oszlop, nincs Kernel-allowlist bejegyzés.

Ehhez jön egy **harmadik, kódban élő, de a fenti kettőhöz nem kötött** réteg: a portál
`mocks/worlds.ts` 27 „világ"-kulcsa (`WORLD_ORDER`), amelyből csak 8-nak (7 ERP + a
`production` világ, ami ténylegesen a Cutting+Joinery backendeket fedi) van futó
backendje. A `RequireAuth.tsx` **kizárólag `isAuthenticated`-et ellenőriz** — az
`enabledModules` értéket a route-rendszer sehol nem használja gate-elésre; az `App.tsx`
minden világ route-ját feltétel nélkül regisztrálja. Tehát a célarchitektúra 6.2
öt-állapotú modellje (`known → installed → entitled → enabled → usable`) ma **egyetlen
állapotra zsugorodik a frontend oldalán** (a route létezik, ha a fájl létezik — nincs
`known`/`entitled`/`enabled`/`usable` megkülönböztetés), miközben a Kernel oldalán van
egy defense-in-depth pár (`ModuleRegistryService` + trigger), de az **más modulkészletre
vonatkozik**, mint amit a portál mutat.

Nincs a repóban aláírás-infrastruktúra (nincs cosign/sigstore/SBOM-eszköz, nincs package
registry), és nincs kereskedelmi entitlement-rendszer (licenc/billing) sem — ez
**zöldmezős döntés**, nem meglévő minta módosítása.

---

## Döntendő kérdések és döntések

### 1. ModuleId namespace: `spaceos.*`, `joinerytech.*`, `<instance>.*`

**Döntés:** a célarchitektúra 6.1 javaslatát vesszük át, és **a namespace szemantikáját
explicit hozzárendeljük a mai rétegleltárhoz** (ERPSEP-01 §3):

| Namespace | Jelentés | Ki publikálhat bele | Példák (ma) |
|---|---|---|---|
| `spaceos.*` | Iparág-agnosztikus, horizontális ERP capability — a `ERP_CAPABILITY_BOUNDARY_AUDIT` 7.6 pontja szerint bizonyítottan mentes faipari terminológiától | platform release (root jóváhagyással) | `spaceos.kernel`, `spaceos.crm`, `spaceos.controlling`, `spaceos.hr`, `spaceos.maintenance`, `spaceos.qa`, `spaceos.ehs`, `spaceos.dms` |
| `joinerytech.*` | Faipari/ökoszisztéma-specifikus kapacitás — a wire- és domainszinten is magyar faipari szótárat hordozó modulok (ERPSEP-01 §8 táblázat) | platform release, de faipari doménszakértői jóváhagyással | `joinerytech.door`, `joinerytech.cabinet`, `joinerytech.window`, `joinerytech.cutting`, `joinerytech.spatial`, `joinerytech.joinery`, `joinerytech.inventory`, `joinerytech.procurement`, `joinerytech.production`, `joinerytech.trading`, `joinerytech.delivery`, `joinerytech.installation`, `joinerytech.orders` |
| `<instance>.*` | Egyetlen ügyfél-instance-hoz kötött, nem publikus, nem portolható kiegészítés | az adott instance operátora, platform-jóváhagyással a katalógusba kerüléshez | `doorstar.workshop`, `doorstar.import-adapter` (ma egyik sincs bevezetve — reserved namespace-példa a célarchitektúrából) |

**Fontos kiegészítő döntés — world ≠ module:** a portál `mocks/worlds.ts` „világ"
fogalma **kompozíciós, nem katalógus-fogalom**. Egy világ 0, 1 vagy több ModuleId-t
komponálhat (pl. a `production` világ ma ténylegesen `joinerytech.cutting` +
`joinerytech.joinery` két különálló ModuleId-t fed le egy portál-nézetben; a
`warehouse` világ `joinerytech.inventory` + `joinerytech.procurement`-et). A katalógus
**ModuleId-eket ír le, nem világ-kulcsokat** — a világ→ModuleId leképezés a portál
composition-rétegének (ERPSEP-06 / Instance Context) felelőssége, ezen ADR csak a
leképezés tényét rögzíti, a UI-kompozíciós szabályt nem.

A 16 legacy portál-világ (`sales, shopfloor, projects, logistics, mfgprep, supervisor,
masterdata, trade, interior, attendance, tasks, docs, ai, execbi, shop, service,
finance, design, settings` — a `PORTAL_WORLDS_INVENTORY_2026-07-16.md` szerint), amely
mögött **nincs futó backend-modul**, **nem kap kanonikus ModuleId-t ebben az ADR-ben**.
Ezek scope-döntése az EPIC-UI-WORLDS hatásköre; amíg nincs mögöttük valódi
modul-implementáció, a fail-closed elv (7. döntés) szerint a signed katalógusban
**nem szerepelhetnek**, tehát a `known` állapotot sem érhetik el.

### 2. Legacy alias és migrációs szabály

Lásd a külön „Legacy ID → kanonikus ID migrációs tábla" szakaszt lent. Szabály: **új kód
kizárólag a kanonikus azonosítót használja**; a legacy rövid nevek (`door`, `crm`, stb.)
egy **egyirányú, verziózott alias-táblán** (`docs/knowledge/contracts/module-id-legacy-aliases.json`
— a schema draft mellékleteként, ld. lent) keresztül fordulnak kanonikus ID-re a Kernel
API határán. Az alias-tábla **nem futásidejű, hanem build/deploy-idejű** bemenet: a
Kernel a saját DB-oszlopában (`Tenants.EnabledModules`) **átmenetileg még a legacy rövid
neveket tárolja** (nincs itt migrációs kódváltás bejelentve — az egy külön, DB-migrációt
igénylő végrehajtási task, ami ezen ADR mutációs határán kívül esik), de minden **új**
API-válasz és JWT-claim a kanonikus ID-t adja vissza, az alias-táblán átfordítva. A
tényleges DB-oszlop-átnevezés/adatmigráció végrehajtása egy külön ERPSEP-05-höz kötött
implementációs task, nem ez az ADR.

### 3. `known → installed → entitled → enabled → usable` állapotok tulajdonosa

| Állapot | Tulajdonos (döntés) | Indoklás |
|---|---|---|
| **known** | Platform release-folyamat (aláírt katalógus publikálása) | A katalógus-aláírás ténye definiálja a "known"-t — nincs DB-sorból felvehető, tetszőleges plugin-lista (Elfogadási kritérium #2). |
| **installed** | Instance operátor (deploy-pipeline) | A bundle és migrációi jelenléte az adott instance-on — ez nem tenant-, hanem instance-szintű tény. |
| **entitled** | **Kernel `Tenant` aggregate — új mező, elkülönítve az `enabled`-től** | Ma az `EnabledModules` egyetlen tömb **összemossa** az entitled és enabled állapotot (nincs "licencelt, de kikapcsolt" köztes állapot). Döntés: a `Tenant` két, egymást tartalmazó listát kap: `EntitledModules ⊇ EnabledModules`, mindkettő a Kernel `TenantType`-allowlist (a katalógusból generált) részhalmaza kell legyen. A tényleges kereskedelmi/licenc-forrás (ki jogosít fel egy tenantot egy modulra) **nyitott kérdés** — ld. lent. |
| **enabled** | Kernel `Tenant` aggregate (tenant admin, a mai `UpdateEnabledModules` mintája) | Változatlan felelősség, csak a bemenet validációja kanonikus ID-re és az `entitled` halmazra szűkül. |
| **visible/usable** | Authz + célmodul | A permission-ellenőrzés a célmodulban marad (pl. `maintenance.read`), nem a Kernel felelőssége. |

Egy UI-csempe/route **csak akkor jelenhet meg**, ha mind az öt feltétel teljesül — ma
egyik sem érvényesül route-gate szinten (`RequireAuth.tsx` csak `isAuthenticated`-et néz).
Ez a defense-in-depth gap explicit `decision_required`-ből `implementation_required`-dé
válik ezen ADR elfogadása után, végrehajtás: ERPSEP-06.

### 4. Manifest schema, dependency constraint és platform compatibility

A célarchitektúra §7.2 YAML-vázlatát vesszük át gépi validálható JSON Schema formában:
**`docs/knowledge/contracts/spaceos-module-v1.schema.json`** (draft 2020-12, lásd külön
fájl). Kulcsdöntések:

- `id`: kötelező, regex `^(spaceos|joinerytech|[a-z][a-z0-9-]*)\.[a-z][a-z0-9-]*$` —
  a namespace-prefix vagy a két platform-namespace egyike, vagy egy instance-slug.
- `version`: kötelező, teljes SemVer 2.0.0 (`MAJOR.MINOR.PATCH[-prerelease][+build]`).
- Dependency- és platform-kompatibilitás-szintaxis: **egységesen node-semver-stílusú
  komparátor-range** (`>=0.3.0 <1.0.0`), technológia-függetlenül — a manifest YAML/JSON
  jellegű, nem NuGet vagy npm natív fájl, ezért egyetlen, mindkét stack számára
  értelmezhető range-nyelvtant használ. A build-időben generált NuGet/npm
  csomag-metaadat ebből fordul le, nem fordítva.
- `dependencies[].id` csak kanonikus ModuleId lehet — legacy alias manifestben tilos.
- `signature` (új, kötelező, a §7.1 `signature/` könyvtárnak megfelelő mező): digest
  algoritmus, a manifest+bundle-tartalom kanonikus hash-e és a detached aláírás
  hivatkozása — ld. az 5. döntést.

### 5. Katalógus- és bundle-aláírás, trust root, visszavonás

**Ajánlott irány (nem véglegesített — ld. Stop-szakasz):**

- **Aláírási mechanizmus:** detached digitális aláírás (Ed25519) a manifest kanonikus
  (kulcs szerint rendezett, whitespace-mentes) JSON-reprezentációjának SHA-256
  digestjén, plusz a bundle-tartalom (backend image digest, frontend asset-fák digestje)
  ugyanabban az aláírt struktúrában — így egy aláírás fedi a manifestet ÉS a
  tartalom-integritást (nem csak a metaadatot).
- **Trust root (nyitott, `decision_required`):** két életképes modell:
  - **A) Egyszerű, egykulcsos modell** — egyetlen "platform signing key" (privát kulcs
    kizárólag a CI release-pipeline-ban, publikus kulcs a Kernel build-jébe égetve
    konfigurációként). Alacsony komplexitás, de kulcs-kompromittálódás esetén teljes
    katalógus-újraaláírást és Kernel-redeploy-t igényel.
  - **B) TUF-szerű, root+intermediate modell** — offline "root key" (Gábornál, HSM vagy
    air-gapped tárolás), amely csak signing-kulcs-rotációt ír alá; a napi
    release-aláírás egy rövidebb élettartamú "intermediate/release key"-vel történik,
    amit a root visszavonhat kompromittálódás esetén anélkül, hogy a root kulcsot
    érintené. Magasabb biztonság, magasabb üzemeltetési komplexitás.
  - **Ajánlás:** kezdésnek A) modell, explicit migrációs úttal B) felé, ha a katalógus
    mérete/kockázata indokolja — de **ez üzleti/biztonsági kockázatvállalási döntés**,
    amit Gábornak kell meghoznia, nem architektúra-kérdés.
- **Visszavonás (revocation):** a katalógus tartalmaz egy **revocation listát**
  (visszavont `ModuleId@version` + visszavont signing-kulcs-azonosítók párokat). A
  Kernel minden aktiválás előtt ellenőrzi, hogy sem a bundle verziója, sem az aláíró
  kulcs nincs a revocation listán. A revocation lista maga is aláírt, és a betöltéskor
  a **legfrissebb ismert revocation-generációnál korábbi generációjú lista elutasítva**
  (replay-védelem — ld. threat model, "downgrade").
- **Package registry (nyitott, `decision_required`):** a repóban ma nincs privát
  csomag-registry beállítva sem NuGet-re, sem npm-re a modul-bundle-ök tárolására. Három
  opció (self-hosted OCI/Verdaccio-jellegű regisztry, GitHub Packages, vagy a jelenlegi
  git-submodule-mintát megőrző fájlrendszer-alapú megoldás) mind életképes technikailag,
  de a választás VPS-üzemeltetési és költség-döntés, amit **nem lehet architektúra-oldalról
  eldönteni** — ez a második ok, amiért ez az ADR Proposed marad.

### 6. Kernel allowlist és PostgreSQL trigger generálása ugyanabból a forrásból

**Döntés:** a mai kézzel karbantartott páros (`ModuleRegistryService.cs` `Registry`
dictionary + a `validate_enabled_modules_for_type()` trigger `CASE WHEN` ága, ld.
`Migration_0029_EcosystemActorTypes.cs` 99–129. sor) **egyetlen forrásból generálódik**:
a signed katalógus `TenantType → allowed ModuleId[]` szakaszából egy build-idejű
kódgenerátor (pl. egy kis `dotnet run` eszköz vagy Roslyn source generator) állítja elő:

1. a C# statikus dictionary-t (felváltva a mai kézzel írt `Registry`-t), és
2. az EF-migráció SQL-sablonját (a `CASE WHEN ... allowed_modules := ARRAY[...]` blokkot).

Ez **megőrzi a defense-in-depth szándékot** (két, egymástól függetlenül kiértékelt
réteg — Application-kód és DB-trigger — ugyanazon invariánst ellenőrzi), de
**megszünteti a kézi szinkron-drift kockázatát**: mindkét kimenet ugyanabból az aláírt
katalógus-fájlból generálódik, egy commit-ban, CI-ellenőrzéssel arra, hogy a generált
kód és a becheckelt kód megegyezik (nincs "elfelejtett újragenerálás"). A generálás
implementációja **nem** ezen ADR mutációs határa — külön, ERPSEP-05-höz kötött
végrehajtási task.

### 7. Ismeretlen, inkompatibilis vagy sérült modul fail-closed viselkedése

**Döntés — minden réteg explicit fail-closed:**

- **Katalógus-tagság:** ha egy `ModuleId` nincs a jelenleg betöltött, érvényesen aláírt
  katalógusban → `known` állapot hiányzik → a Kernel API 404-et ad (nem 200-at üres
  adattal), a DB-trigger elutasítja az INSERT/UPDATE-et (ez már ma is így működik a
  `validate_enabled_modules_for_type()` `ELSE RAISE EXCEPTION` ágán — ezt a mintát
  visszük át kanonikus ID-kre).
- **Inkompatibilis platform-verzió:** a `requiresPlatform` range-nek nem megfelelő
  bundle-t a telepítési tranzakció (§7.4) **preflight lépésben** elutasítja, aktiválás
  meg sem kezdődik.
- **Sérült/aláírás nélküli bundle:** hash-mismatch vagy hiányzó/érvénytelen aláírás →
  a telepítési tranzakció azonnal megszakad, **nincs részleges aktiválás**.
- **Frontend oldal — ez ma bizonyítottan hiányzik:** a `RequireAuth.tsx` és az `App.tsx`
  ma **nem** implementálja az 5-állapotú gate-et (3. döntés). Ez az ADR kimondja, hogy
  amíg ez a gate nincs implementálva (ERPSEP-06 hatásköre), az `enabledModules`
  JWT-claim **kizárólag UI-hint**, nem tekinthető authorization-forrásnak — minden
  API-mutáló hívásnak a Kernel/modul oldalán **függetlenül** kell ellenőriznie az
  entitled+enabled állapotot (ez már ma is deklarált elv a célarchitektúra §6.2 utolsó
  mondatában: „Az API-nak ettől függetlenül minden hívásnál ellenőriznie kell az
  entitlementet" — ezen ADR ezt megerősíti és kötelezővé teszi minden 7 ERP-modulra és
  minden industry-modulra egyaránt, beleértve azokat is, amelyek ma nem fogyasztják a
  Hosting-csomagot, ld. ERPSEP-01 §7.7).
- **Downgrade-kísérlet:** verzió-monotonitás kötelező — alacsonyabb verziójú, érvényesen
  aláírt bundle telepítése ugyanarra a ModuleId-ra **elutasított**, hacsak az instance
  operátor explicit `allowDowngrade` flaget nem ad meg, ami friss aláírás-ellenőrzést és
  dokumentált rollback-tervet igényel (ld. célarchitektúra §7.4 utolsó mondata).

---

## Threat model

| Fenyegetés | Támadási felület | Mitigáció (ezen ADR döntéseiből) | Maradék kockázat |
|---|---|---|---|
| **Supply chain** | Kompromittált CI/release-pipeline vagy publikáló identitás rosszindulatú bundle-t ad ki a valós ModuleId névre | Aláírt katalógus + aláírt bundle (5. döntés); a signing-kulcs elkülönítve a fejlesztői gépektől, csak a release-pipeline-ban él | A trust root modell (A vs B) még nyitott — amíg csak egykulcsos (A), egyetlen CI-kompromittálódás elég a teljes katalógushoz. Ez konkrét ok a Proposed státuszra. |
| **Downgrade** | Régebbi, sebezhető, de érvényesen aláírt bundle-verzió visszajátszása | Verzió-monotonitás kötelező telepítéskor (7. döntés) + revocation lista, ami a régi verziót is felveheti, ha sebezhetőnek minősül | Revocation lista frissítési SLA-ja és disztribúciós csatornája még nincs meghatározva (kereskedelmi/ops döntés). |
| **Tamper** | Aláírás utáni módosítás a bundle tartalmán (backend image, frontend asset, migráció) | Az aláírás a manifest ÉS a tartalom-digestek felett fut (5. döntés) — bármely fájl módosítása digest-mismatchet okoz, a telepítési tranzakció megszakad (7. döntés) | Az image-digest-pin (`backend.image: registry.example/...@sha256:...`) csak akkor ér valamit, ha a registry maga is véd a tag-újraírás ellen — ez registry-választás-függő (nyitott). |
| **Unknown module** | Tetszőleges string ModuleId-ként való beküldése API-n vagy DB-írásban, remélve, hogy valamelyik réteg elfogadja | Defense-in-depth: Kernel allowlist ÉS DB-trigger ÉS (frontend gate, ha kész) mind ugyanabból a generált forrásból (6. döntés) — egyiknek sem kell "hinnie" a másiknak | Amíg a frontend gate (3/7. döntés) nincs implementálva, a UI oldalon egy ismeretlen modul route-ja **megjelenhet** (bár az API-hívásai elutasításra kerülnek) — ez UX-szintű, nem adat-szintű kockázat, de zavaró és jegyzett. |
| **Stale entitlement** | Tenant licence visszavonása után a JWT-ben vagy kliens-cache-ben tovább élő `enabled_modules` állítás miatt a felhasználó továbbra is hozzáfér | A célarchitektúra §6.2 elve kötelezővé téve (7. döntés): a JWT-claim csak UI-hint, minden API-hívás szerveroldalon újra-ellenőrzi az `entitled`+`enabled` állapotot a Kernel/Tenant aggregate aktuális állapotából, nem a tokenből | A JWT TTL-je és a refresh-ciklus hossza ma nincs ezen ADR hatáskörében rögzítve — ha a TTL hosszú és egy mutáló endpoint mégis csak a claimre hagyatkozna (ellentétben az elvvel), a staleness ablak nyitva marad. Ez implementációs conformance-tesztet igényel (ERPSEP-09), nem csak elvet. |

---

## Legacy ID → kanonikus ID migrációs tábla

| Legacy azonosító (forrás) | Kanonikus `ModuleId` | Réteg | Megjegyzés |
|---|---|---|---|
| `door` (Kernel `ModuleType.Door` / allowlist, Manufacturer opcionális) | `joinerytech.door` | industry | nincs önálló futó backend ma; részben a `joinery` modul fedi |
| `cabinet` (Kernel allowlist, Manufacturer opcionális) | `joinerytech.cabinet` | industry | backend nem fut, `spaceos-modules-cabinet` submodule checkoutolatlan |
| `window` (Kernel allowlist, Manufacturer opcionális) | `joinerytech.window` | industry | nincs implementáció |
| `cutting` (Kernel allowlist + PanelCutter kötelező) | `joinerytech.cutting` | industry | fut (port 5005), saját auth-mix (`WORLDS_API_CONTRACTS` §1.6) |
| `spatial` (Kernel allowlist, Manufacturer opcionális) | `joinerytech.spatial` | industry | ECOSYSTEM-doksi szerint „Horizon 3" / TBD, nincs implementáció |
| `trading` (Trader kötelező) | `joinerytech.trading` | industry | nincs implementáció |
| `delivery` (Logistics kötelező, Trader opcionális) | `joinerytech.delivery` | industry | nincs implementáció |
| `installation` (Installer kötelező) | `joinerytech.installation` | industry | nincs implementáció |
| `orders` (EndCustomer kötelező) | `joinerytech.orders` | industry | nincs implementáció, portál OD-04 nyitott |
| `crm` (portál `enabled_modules`) | `spaceos.crm` | erp | fut, kanonikus `src/SpaceOS.Modules.CRM` |
| `kontrolling` (portál `enabled_modules`) | `spaceos.controlling` | erp | angol kanonikus ID (célarchitektúra 6.1 mintája); a magyar `Kontrolling` csak UI-címke marad |
| `hr` (portál `enabled_modules`) | `spaceos.hr` | erp | fut |
| `maintenance` (portál `enabled_modules`) | `spaceos.maintenance` | erp | fut |
| `qa` (portál `enabled_modules`) | `spaceos.qa` | erp | fut; DB schema-név ellenőrzése ERPSEP-01 nyitott pontja |
| `ehs` (portál `enabled_modules`) | `spaceos.ehs` | erp | fut, friss Hosting-migráció (`HostingTenantContextAdapter.cs`) |
| `dms` (portál `enabled_modules`) | `spaceos.dms` | erp | fut |
| `joinery` (backend könyvtár, nincs saját portál `enabled_modules` kulcs ma) | `joinerytech.joinery` | industry | ma a portál `production` világ alá sorolva; önálló ModuleId szükséges, mert a világ ≠ modul (1. döntés) |
| `inventory` (backend könyvtár) | `joinerytech.inventory` | industry | ma a portál `warehouse` világ alá sorolva |
| `procurement` (backend könyvtár) | `joinerytech.procurement` | industry | ma a portál `warehouse` világ alá sorolva |
| `production` (backend `Production.*`) | `joinerytech.production` | industry/kernel határ | ownership `decision_required`, közös a PROJECT-BOUNDARY-AUDIT-tal (`ProductionJob`/`WorkflowStep`) — ezen ADR csak a namespace-t rögzíti, az ownershipet nem |
| portál `production` világ-kulcs (`mocks/worlds.ts`) | **nem modul** — kompozíció: `joinerytech.cutting` + `joinerytech.joinery` | composition | world ≠ module (1. döntés) |
| portál `warehouse` világ-kulcs | **nem modul** — kompozíció: `joinerytech.inventory` + `joinerytech.procurement` | composition | ua. |
| 16 legacy portál-világ (`sales, shopfloor, projects, logistics, mfgprep, supervisor, masterdata, trade, interior, attendance, tasks, docs, ai, execbi, shop, service, finance, design, settings`) | **nincs kanonikus ModuleId** | unclassified/prototype | nincs mögöttük futó backend-modul; EPIC-UI-WORLDS hatáskör; fail-closed elv szerint amíg nincs backend, a signed katalógusba nem kerülhetnek be, tehát a `known` állapotot sem érhetik el |
| `src/spaceos-modules/spaceos-modules-{crm,hr,dms}`, `src/spaceos-modules-ehs` (orphan duplikátumok) | **nincs ModuleId (retire)** | orphan | ERPSEP-01 §7.1–7.4 szerint törlésre jelölve; tilos ModuleId-t rendelni élő hivatkozás nélküli kódhoz |
| `src/spaceos-modules-joinerytech` (legacy Tenant/User/Catalog) | **nincs ModuleId (retire)** | orphan | ERPSEP-01 §7.9, Kernel-felelősség-duplikátum |
| `doorstar` (`Tenant.BrandSkinId`) | `doorstar.workshop`, `doorstar.import-adapter` (jövőbeli) | instance | ma nincs bevezetve; a célarchitektúra 6.1 példájából átvett, reserved namespace-jelölés, tényleges tartalom a DSCONV-01 hatásköre |

---

## Manifest schema draft

`docs/knowledge/contracts/spaceos-module-v1.schema.json` — JSON Schema (2020-12 draft),
a célarchitektúra §7.2 YAML-vázlatának gépi validálható formája, kiegészítve a
`signature` és `dependencies[].version` mezőkkel (ld. 4–5. döntés). A schema **tervezet**,
nem véglegesített kontraktus — implementáció előtt security reviewer jóváhagyása
szükséges (Elfogadási kritérium #6).

---

## Következmények

- **Pozitív:** egyetlen ModuleId egyértelműen ugyanazt jelenti DB-ben, JWT/claim-ben,
  API-ban és frontendben (Elfogadási kritérium #1) — feltéve, hogy az alias-fordítás
  (2. döntés) és a frontend gate (3/7. döntés) végrehajtásra kerül egy külön
  implementációs taskban.
- **Pozitív:** a katalógus egyetlen aláírt forrás, nem DB-ből felvehető tetszőleges lista
  (Elfogadási kritérium #2), és a defense-in-depth (Kernel + DB-trigger) szándéka
  megmarad, sőt erősödik (egy forrásból generált, nem kézzel szinkronizált — 6. döntés).
- **Semleges:** ez az ADR **nem** ír kódot, nem hoz létre migrációt, nem publikál
  registry-t — kizárólag a döntési keretet rögzíti. A tényleges DB-oszlop-bővítés
  (entitled/enabled szétválasztás), a kódgenerátor, a frontend gate és a
  signing-infrastruktúra mind külön, ezen ADR-re hivatkozó végrehajtási taskok
  (elsősorban ERPSEP-05, ERPSEP-06, ERPSEP-09).
- **Negatív / kockázat, ha figyelmen kívül marad:** amíg a trust root és a package
  registry döntése nyitott, **semmilyen implementáció nem indulhat** (ld. Stop-szakasz
  és a task saját „Tiltott scope"-ja) — ez szándékosan blokkoló, nem hanyagság.

---

## Nyitott kérdések Gábornak (ezért Proposed, nem Accepted)

1. **Trust root modell:** A) egykulcsos platform signing key, vagy B) TUF-szerű
   root+intermediate séma? (5. döntés) — üzemeltetési komplexitás vs. kompromittálódási
   kockázat közötti választás, amit nem lehet tisztán architektúra-oldalról eldönteni.
2. **Package/bundle registry:** self-hosted OCI/Verdaccio-jellegű megoldás, GitHub
   Packages, vagy a jelenlegi git-submodule-mintát követő fájlrendszer-alapú tárolás?
   Ez VPS-üzemeltetési és költségdöntés.
3. **Licenc/entitlement tulajdonos:** lesz-e valódi kereskedelmi entitlement-rendszer
   (billing-integráció), vagy az `entitled` állapot tartósan a Kernel `Tenant`
   aggregate-jén belüli, kézzel/admin-API-val karbantartott mező marad? Ez határozza meg,
   hogy a 3. döntésben vázolt `EntitledModules` mező honnan kapja az adatát.
4. **Revocation-terjesztési csatorna és SLA:** ha egy modul-verziót vagy signing-kulcsot
   vissza kell vonni, milyen gyorsan és milyen csatornán kell ennek elérnie minden
   futó instance-ot? (Ez különösen releváns, mert a VPS-hozzáférés ma SSH-alapú, nincs
   automatizált push-csatorna a running instance-ok felé.)

Amíg ezek nyitottak, ez az ADR **Proposed** marad — Gábor jóváhagyása (vagy tételes
blokkolólistája) szükséges az Accepted státuszhoz és bármilyen implementáció
elindításához.

## Kapcsolódó ADR-ek és források

- ERPSEP-01: `docs/knowledge/architecture/ERP_CAPABILITY_BOUNDARY_AUDIT_2026-07-18.md`
- Célarchitektúra: `docs/knowledge/architecture/SPACEOS_MODULAR_PRODUCT_ARCHITECTURE_2026-07-18.md`
  (6–7. fejezet)
- `docs/knowledge/architecture/ECOSYSTEM_MODULE_ARCHITECTURE.md` (ADR-018/019, aktor-taxonómia)
- ADR-061/062 (host-auth + RLS) — a jelen ADR entitled/enabled szétválasztása illeszkedik
  a Kernel-tier auth-csomag irányához, de nem előfeltétele annak.
- ERPSEP-03 (cross-module contract ADR, `ADR-066`) — párhuzamos, más tárgykör (event/DTO
  kontraktus, nem ModuleId-katalógus); a két ADR nem függ egymástól tartalmilag, csak az
  epic ütemezésében.
