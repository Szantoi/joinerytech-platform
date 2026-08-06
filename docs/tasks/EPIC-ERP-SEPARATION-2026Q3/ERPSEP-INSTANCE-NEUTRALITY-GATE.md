# `ERPSEP-INSTANCE-NEUTRALITY-GATE` — Instance-szivárgás feloldása és semlegességi kapu

- **Epic:** `EPIC-ERP-SEPARATION-2026Q3` · **Milestone:** `E1-boundaries`
- **Szerep:** `backend` (1. fázis) + `infra` (2. fázis)
- **Prioritás:** `P1`
- **Státusz:** `pending`
- **Függőség:** nincs (a 2. fázis függ az 1.-től — ld. „Sorrend")
- **Mutációs határ:**
  - 1. fázis: `src/spaceos-modules-joinery/.../Pdf/ProductionSheetGenerator.cs` + a hozzá
    tartozó konfiguráció/teszt
  - 2. fázis: `build/` (új őr-szkript) + `.github/workflows/`
- **Tiltott scope:** **meglévő migrációt NEM írunk át** (a seed-sorok a történet részei; a
  szabály a *jövőbeli* seedre vonatkozik) · a Kernel FSM/projektkezelő mag érintetlen ·
  a `spaceos-modules-scheduling` `tests/Fixtures` hash-pinnelt packje **kivétel marad**

## Cél és üzleti eredmény

A platform egynél több faipari céget szolgál ki. Ma egy ügyfél cégneve **beégetve** fut egy
platform-modul produkciós kódjában, és nincs mechanizmus, ami a következőt megfogná. A task
(1) feloldja a meglévő szivárgást, (2) kapuval megakadályozza az újratermelődését.

## Kötelező források

- **ADR-069 §3 (D2)** — rétegvágás: `spaceos.*` (iparág-semleges) → `joinerytech.*` (faipar)
  → `doorstar.*` (instance)
- **ADR-067** — ModuleId-namespace és katalógus; a `FlowEpicScope`/`TenantHandshakeAllowlist`
  drift, ami miatt az ADR született
- **Működő minta:** `spaceos-modules-scheduling/build/check-core-vocabulary.sh` — a
  **CI első lépése**, két illesztési móddal és dokumentált téves-találat-kezeléssel
- Az epic `stop_condition`-je: „a hét ERP-modul **nem függ JoineryTech/Doorstar típustól**"

## Kiinduló mérés (root, 2026-08-06) — ez a task bizonyíték-alapja

```
"Doorstar" a platform src/-jeben : 100 elofordulas / 39 fajl
szetvalasztva                    :  25 PRODUKCIOS kod-sor (+19 komment) | 54 TESZT-sor

a 25 produkcios sor:
  8  kernel   Migration_0028_StageRegistry      SEED, berlo-szurt: WHERE "BrandSkinId"='doorstar'
  7  cutting  AddPricingTables                  SEED
  2  kernel   Migration_0032_AddTenantSubdomain SEED
  1  kernel   Migration_0025_TenantEnabledModules / 0026_TenantHandshakeAllowlist
             / 0029_EcosystemActorTypes         SEED
  2  joinery  Seeding/DoorRulesDataSeeder.cs    SEED (referencia-tablak)
  1  joinery  Seeding/DoorstarSeedData.cs       SEED
  2  joinery  Pdf/ProductionSheetGenerator.cs   <- NEM seed. EZ A HIBA.
```

⇒ a csatolódás **~92%-a migrációs/seed adat**, és a kernel-seedek **bérlő-szűrtek** — más
bérlő viselkedését nem érintik. Ez rétegvágási adósság, nem beépültség. **Egy tétel lóg ki.**

## 1. fázis — a beégetett cégnév feloldása (P1, backend)

```
src/spaceos-modules-joinery/.../Pdf/ProductionSheetGenerator.cs:252
   $"Doorstar Kft. — Gyártásilap — {DateTime.UtcNow:yyyy-MM-dd}"
                                              :270
   col.Item().Text("Doorstar Kft. — Gyártásilap")
```

**Elérhetőség mérve — nem holt kód:**

```
DependencyInjection.cs:52   AddSingleton<IProductionSheetGenerator, ProductionSheetGenerator>()
fogyasztok                  GetManufacturingSheetQueryHandler · GetHardwareListPdfQueryHandler
                            · GetMaterialReqPdfQueryHandler
API                         SpaceOS.Modules.Joinery.Api/Endpoints/GyartasilapEndpoints.cs
```

⇒ **minden** joinery-t használó bérlő gyártásilapján, anyaglistáján és vasalatlistáján a
Doorstar cégneve jelenne meg. Ez működési hiba, nem rendetlenség.

**Elvárás:** a fejléc a **bérlőtől** származzon (a hosting `TenantResolver` már ad
bérlő-azonosságot), config-fallback **nélkül beégetett ügyfélnévre**. Ha nincs bérlő-név,
a helyes viselkedés semleges felirat vagy hangos hiba — **nem** egy másik ügyfél neve.

## 2. fázis — semlegességi kapu (infra)

A scheduling-repó őre **iparági** szókincset néz. Ez **két külön kapu**, és a második új:

| Kapu | Mit néz | Hol van ma |
|---|---|---|
| iparági szókincs | `ajtó|szekrény|élzár|prés|door|joinery|…` a **semleges magban** | csak `spaceos-modules-scheduling` |
| **instance-név** | `Doorstar` (és minden jövőbeli ügyfélnév) **bármely platform-modul produkciós kódjában** | **NINCS** |

**Az instance-kapu szabályai (a meglévő őr tanulságaiból):**

- **hatókör:** produkciós kód. A `tests/` és a `Migrations/` **kivétel**, de a kivétel
  legyen **nevesített és indokolt** a szkriptben — ahogy a scheduling-őr teszi a
  hash-pinnelt fixture-rel.
- **az ügyfélnév-lista legyen adat, ne kód** — új instance felvételekor ne kelljen a
  szkriptet módosítani.
- **negatív kontroll kötelező:** a kapu bizonyítsa magát egy szándékosan szivárgó
  próba-fájlon, és a zöld futás **után** is (hogy ne csak „nem talált" legyen).

## Sorrend — kötelező, és ez a task lényege

```
1. fazis (a 2 sor feloldasa)   ->   2. fazis (a kapu bekapcsolasa)
```

⚠ **Fordítva TILOS.** A kapu az első percben pirosat adna a meglévő 25 soron, és a
kikapcsolás/whitelistelés mintáját tanítaná meg — pont azt a szokást, ami ellen készül.
*(Ugyanez a hiba, mint a lint-racsni küszöbének „ideiglenes" felemelése.)*

## Teszt- és bizonyítékterv

```text
# 1. fazis
dotnet test src/spaceos-modules-joinery/SpaceOS.Modules.Joinery.Tests
#   uj teszt: ket kulonbozo berlo -> ket kulonbozo fejlec a PDF-ben
#   mutacio:  a berlo-nev visszaallitasa literalra -> a tesztnek BUKNIA kell

# 2. fazis
bash build/check-instance-neutrality.sh          # zold a feloldott fan
echo 'var x = "Doorstar Kft.";' > src/<modul>/__probe.cs
bash build/check-instance-neutrality.sh          # PIROSNAK kell lennie  <- negativ kontroll
rm src/<modul>/__probe.cs
bash build/check-instance-neutrality.sh          # ujra zold
```

## Elfogadási kritériumok

- [ ] `ProductionSheetGenerator`-ben **nincs** beégetett ügyfélnév; a fejléc bérlő-vezérelt
- [ ] van teszt, ami **két különböző bérlőre két különböző fejlécet** követel, és a
      literálra visszaállítás **elbuktatja** (mutációval bizonyítva)
- [ ] `check-instance-neutrality.sh` létezik, a kivételek **nevesítve és indokolva**
- [ ] a kapu **negatív kontrollal bizonyított** (szándékos szivárgás → piros → eltávolítás → zöld)
- [ ] a kapu CI-ben **fut** — nem elég, hogy létezik *(„van workflow" ≠ „fut rá" ≠ „zöld")*
- [ ] a `docs/knowledge/adr/ADR-069` rétegvágása hivatkozva a szkript fejlécében

## Stop / eszkaláció

- **Ha a bérlő-név nem elérhető a PDF-generálás pontján**, az **scope-kérdés**: ne találj ki
  új kontraktust, hanem jelezd — lehet, hogy a query-handlernek kell bérlő-kontextust kapnia.
- **Migrációt ne írj át.** Ha úgy tűnik, hogy egy seed-sor élő viselkedést befolyásol
  (nem bérlő-szűrt), az **külön lelet**, és root-döntést kér.
- A `spaceos-modules-scheduling` **nem** ennek a tasknak a hatóköre (külön repó, gazda-döntés
  Gábornál).
