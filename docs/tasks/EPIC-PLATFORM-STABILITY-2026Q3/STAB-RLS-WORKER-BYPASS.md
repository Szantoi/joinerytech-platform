# STAB-RLS-WORKER-BYPASS — két élő worker-szerep megkerüli a row-level security-t

- **Szerep:** backend-security / infra
- **Prioritás:** P1
- **Státusz:** `in_progress` — ⚠ **a KÓD kész és root-review-val mérve, de az ÉLES
  kockázat VÁLTOZATLAN.** Ld. a 2026-07-30-i root-mérést lent. A záró lépés
  (`ALTER ROLE` + migráció-telepítés) **Gábor-kapu.**
- **Forrás:** [`LIVE_AUTH_AND_RLS_ASSESSMENT_2026-07-25.md`](../../knowledge/architecture/LIVE_AUTH_AND_RLS_ASSESSMENT_2026-07-25.md) 3. pont
- **Mutációs határ:** a két érintett modul (`spaceos-modules-inventory`,
  `spaceos-modules-procurement`) worker-kódja és a VPS szerep-jogosultságai.
  **Jogosultság-módosítás az éles adatbázison CSAK Gábor jóváhagyásával.**

## A lelet (élő mérés, 2026-07-25)

```
spaceos_inventory_worker    rolsuper=f   rolbypassrls=t
spaceos_procurement_worker  rolsuper=f   rolbypassrls=t
```

A többi élő login-szerep (`spaceos`, `identity_app`, `spaceos_sales_app`,
`spaceos_sales_worker`, `spaceos_freetier`, `spaceos_keycloak_user`) helyesen
`NOSUPERUSER`/`NOBYPASSRLS`.

`BYPASSRLS` mellett a `FORCE ROW LEVEL SECURITY` policy **nem érvényesül** — a
szerep minden bérlő minden sorát látja. A repóban **sehol nincs dokumentálva**,
hogy ez szándékos-e: a szerepnevekre és a `BYPASSRLS`-re 0 találat van a
kódban/ADR-ekben (csak a proof-task és a teszt-kommentek említik az elvárt
`NOBYPASSRLS`-t).

## Miért most fontos

A közös SpaceOS-adatbázisba több cég adata kerül (ez a kimondott cél). Ott az
egyetlen elválasztó réteg a sor-szintű policy. Egy `BYPASSRLS` szerep bármely
hibája (hiányzó `WHERE`, SQL-injekció, elrontott háttérjob) **az összes bérlő
adatát** eléri. Amíg nincs tisztázva, hogy a két worker miért kapta meg ezt,
addig a „több cég egy adatbázisban" ígéret nem teljes.

## Amit el kell dönteni / tisztázni

1. **Szándékos-e?** Egy háttér-worker gyakran keresztbérlős feladatot végez
   (pl. összesítés, karbantartás). Ha igen: hol van ez kimondva, és milyen
   korlátok között fut?
2. **Kiváltható-e?** Alternatívák, csökkenő jogosultság szerint:
   - a worker bérlőnként futtat (bérlő-ciklus, `tid` beállításával) →
     `BYPASSRLS` nem kell;
   - dedikált, szűk `SECURITY DEFINER` függvények a keresztbérlős
     részfeladatra, a worker maga marad `NOBYPASSRLS`;
   - marad a `BYPASSRLS`, de **külön szerep** csak arra a néhány műveletre,
     és a fő worker-szerep visszaszorítva.
3. **Bizonyíték:** akármelyik irány, a végén ugyanaz a mérés fusson le, mint
   ebben a felmérésben, és kerüljön be egy visszatérő ellenőrzésbe.

## Elfogadási kritérium

- [ ] Kódból bizonyítva, MELYIK worker-művelet igényel keresztbérlős olvasást
      (fájl:sor), vagy hogy egyik sem.
- [x] Döntés rögzítve (Gábor, 2026-07-27): **2. irány** — mindkét worker-szerep
      `NOBYPASSRLS`-re áll, a bizonyítottan keresztbérlős részműveletek (outbox
      skip-locked claim, reservation cleanup, reorder-alert polling) szűk,
      dedikált `SECURITY DEFINER` függvényekbe kerülnek. Sorrend: előbb a
      függvények + tesztek a modul-repókban, UTÁNA az éles `ALTER ROLE`
      (külön Gábor-jóváhagyással az élesítés pillanatában), végül a záró mérés.
      Előfeltétel: a root szúrópróbás ellenőrzése az Antigravity
      bizonyíték-fázisán (még nyitott).
- [~] A végállapot mérve: **MEGMÉRVE 2026-07-30 (root)** — de a végállapot
      **nincs elérve**: mindkét worker **ma is `rolbypassrls=t`**. Ld. lent.
- [x] A `STAB-RLS-PROOF` bizonyítéka kiegészítve az ÉLŐ szerepekkel:
      `scripts/Invoke-DbRolePrivilegeGuard.ps1` a **futó** cluster `pg_roles`
      katalógusát olvassa (2026-07-30, root).

## 2026-07-27 — Codex végrehajtási memento

- A két worker migrációja dedikált, NOLOGIN `BYPASSRLS` routine-owner szerepkört használ; a futtatható worker szerepkörök `NOBYPASSRLS` beállítást kapnak. A definer szerepkör csak a felsorolt táblákra kap jogot, a függvények rögzített `search_path`-tal és `PUBLIC` execute-visszavonással készülnek.
- Az inventory reorder outbox most `ENABLE` + `FORCE RLS` és fail-closed `app.current_tenant_id` policy alatt áll. A claim utáni közvetlen completion írás tranzakción belül állít tenant GUC-ot.
- A procurement worker a claimelt entitásokat használja újraolvasás helyett, completion és failure előtt tranzakciós tenant-scope-ot állít. A retention job a szűk definer cleanup függvényt hívja, így RLS mellett nem marad néma no-op.
- A procurement forrás-policyk egységesen `app.current_tenant_id` kulcsot használnak; a migráció a korábban telepített régi kulcsos policykat is normalizálja.
- Bizonyíték: valódi PostgreSQL/Testcontainers teszt zöld inventory oldalon (1/1) és procurement oldalon (3/3): NOBYPASSRLS, tenant-A/B izoláció, claim/finalize és retention cleanup. Az infrastructure build mindkét modulban zöld (2026-07-27); éles szerep-átállítás és VPS-művelet nem történt.
- [x] Visszatérő ellenőrzés: **KÉSZ (root, 2026-07-30)** —
      `scripts/Invoke-DbRolePrivilegeGuard.ps1` + `config/db-role-privileges.json`
      + `scripts/Invoke-DbRolePrivilegeGuard.Tests.ps1`. Ld. lent.

## Stop / eszkaláció

Éles jogosultság-módosítás (`ALTER ROLE … NOBYPASSRLS`) **csak Gábor
jóváhagyásával** — ha egy worker valóban keresztbérlős olvasásra épül, a
visszavonás leállíthatja a háttérfolyamatot.

## Végrehajtási napló (2026-07-25 — Antigravity)

### 1. Kódszintű bizonyítékok (fájl:sor)

A kódbázis auditja alapján a `spaceos_inventory_worker` és `spaceos_procurement_worker` szerepek `BYPASSRLS` használata és feladatai a következők:

#### A. Inventory Modul (`src/spaceos-modules-inventory`)
1. **`ReservationCleanupWorker.cs`**
   - **Fájl & sor:** [`src/spaceos-modules-inventory/src/SpaceOS.Modules.Inventory.Infrastructure/Services/ReservationCleanupWorker.cs:88-112`](./src/spaceos-modules-inventory/src/SpaceOS.Modules.Inventory.Infrastructure/Services/ReservationCleanupWorker.cs#L88-L112)
   - **Művelet:** Periodikus (15 perces) háttérfolyamat. Az `InventoryWorkerDbContext`-en keresztül futtatja:
     `db.Reservations.Where(r => r.Status == ReservationStatus.Active && r.ExpiresAt < DateTimeOffset.UtcNow).Take(_batchSize).ToListAsync(ct)`, majd a lejárt elemeket `Expired`-re állítja és menti.
   - **Keresztbérlős jelleg:** A lekérdezés nem tartalmaz bérlői szűrést (`TenantId`). Az összes bérlő lejárt foglalását egyetlen bérlő-független batchben dolgozza fel.
   - **DbContext / Interceptor:** A háttérjob által használt `InventoryWorkerDbContext` ([Persistence/InventoryWorkerDbContext.cs:8-13](./src/spaceos-modules-inventory/src/SpaceOS.Modules.Inventory.Infrastructure/Persistence/InventoryWorkerDbContext.cs#L8-L13)) szándékosan nem regisztrál `TenantSessionInterceptor`-t, és a `spaceos_inventory_worker` kapcsolattal fut.

2. **`ReorderAlertWorker.cs`**
   - **Fájl & sor:** [`src/spaceos-modules-inventory/src/SpaceOS.Modules.Inventory.Infrastructure/Services/ReorderAlertWorker.cs:104-110`](./src/spaceos-modules-inventory/src/SpaceOS.Modules.Inventory.Infrastructure/Services/ReorderAlertWorker.cs#L104-L110)
   - **Művelet:** Outbox tábla polling (`db.InventoryReorderOutboxes.Where(o => (o.Status == "Pending" && o.NextAttemptAt <= now) || (o.Status == "InFlight" && o.LeaseUntil < now))`), majd HTTP kérés küldése a Procurement felé (`X-SpaceOS-TenantId` fejléccel, [L140](./src/spaceos-modules-inventory/src/SpaceOS.Modules.Inventory.Infrastructure/Services/ReorderAlertWorker.cs#L140)).
   - **Keresztbérlős jelleg:** Az outbox polling bérlőszűrő nélkül történik a teljes globális outbox soron.

#### B. Procurement Modul (`src/spaceos-modules-procurement`)
1. **`ProcurementIntegrationWorker.cs`**
   - **Fájl & sor:** [`src/spaceos-modules-procurement/src/SpaceOS.Modules.Procurement.Infrastructure/Workers/ProcurementIntegrationWorker.cs:97-105`](./src/spaceos-modules-procurement/src/SpaceOS.Modules.Procurement.Infrastructure/Workers/ProcurementIntegrationWorker.cs#L97-L105)
   - **Művelet (CLAIM):** Nyers SQL-alapú outbox polling:
     `SELECT * FROM spaceos_procurement.procurement_outbox WHERE ("Status" = 'Pending' AND "NextAttemptAt" <= NOW()) OR ("Status" = 'InFlight' AND "LeaseUntil" < NOW()) ORDER BY "NextAttemptAt" ASC FOR UPDATE SKIP LOCKED LIMIT 10`
   - **Keresztbérlős jelleg:** Az outbox lekérdezés bérlőszűrő nélkül, az összes bérlő kimenő üzenetére fut.
   - **Per-üzenet bérlői izoláció (COMPLETE):** A [L171-L176](./src/spaceos-modules-procurement/src/SpaceOS.Modules.Procurement.Infrastructure/Workers/ProcurementIntegrationWorker.cs#L171-L176) sorokban az üzenet feldolgozása után a worker explicit módon beállítja a bérlői kontextust:
     `SELECT set_config('app.current_tenant_id', {0}, true)` (`msg.TenantId`), és ezután frissíti a `spaceos_procurement."Deliveries"` táblát (`InventorySyncStatus`).
   - **DbContext / Factory:** `ProcurementWorkerDbContextFactory` ([Workers/IProcurementWorkerDbContextFactory.cs:18-22](./src/spaceos-modules-procurement/src/SpaceOS.Modules.Procurement.Infrastructure/Workers/IProcurementWorkerDbContextFactory.cs#L18-L22)) BYPASSRLS kapcsolati sztringet használ a kezdeti outbox claimhez.

### 2. A két szerep keletkezési helye a kódbázisban

1. **`spaceos_inventory_worker`**:
   - **Fájl & sor:** [`src/spaceos-modules-inventory/src/SpaceOS.Modules.Inventory.Infrastructure/Migrations/20260418000003_CreateInventoryWorkerRole.cs:13-31`](./src/spaceos-modules-inventory/src/SpaceOS.Modules.Inventory.Infrastructure/Migrations/20260418000003_CreateInventoryWorkerRole.cs#L13-L31)
   - **SQL kód:** EF Core Migration futtatja:
     ```sql
     CREATE ROLE spaceos_inventory_worker WITH LOGIN BYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD NULL;
     GRANT USAGE ON SCHEMA spaceos_inventory TO spaceos_inventory_worker;
     GRANT SELECT, UPDATE ON spaceos_inventory.reservations TO spaceos_inventory_worker;
     GRANT SELECT ON spaceos_inventory.reservation_items TO spaceos_inventory_worker;
     REVOKE ALL ON spaceos_inventory.panel_stocks FROM spaceos_inventory_worker;
     REVOKE ALL ON spaceos_inventory.material_catalog FROM spaceos_inventory_worker;
     REVOKE ALL ON spaceos_inventory.stock_movements FROM spaceos_inventory_worker;
     ```
   - Megjegyzés: A migráció `REVOKE ALL`-al korlátozza a hozzáférést a törzsadat táblákra, de megadja a `BYPASSRLS`-t a `reservations` és `reservation_items` tisztításához.

2. **`spaceos_procurement_worker`**:
   - **Fájl & sor:** [`src/spaceos-modules-procurement/src/SpaceOS.Modules.Procurement.Infrastructure/ManualMigrations/PR-M1_worker_role.sql:3-7`](./src/spaceos-modules-procurement/src/SpaceOS.Modules.Procurement.Infrastructure/ManualMigrations/PR-M1_worker_role.sql#L3-L7)
   - **SQL kód:** Manuális migrációs script:
     ```sql
     CREATE ROLE spaceos_procurement_worker LOGIN BYPASSRLS;
     ```

### 3. Válthatósági alternatívák & Elemzés

- **Outbox Polling (`procurement_outbox` & `inventory_reorder_outbox`)**:
  A bérlők átelemzése bérlő-ciklussal nem hatékony a gyakori polling (2 másodperc) miatt.
  *Alternatíva:* Szűk PostgreSQL `SECURITY DEFINER` függvények (pl. `spaceos_procurement.claim_outbox_batch()`) bevezetése az outbox claim lépéshez. Ezzel a worker DB szerepe maga visszaszorítható `NOBYPASSRLS`-re.
- **Lejárt foglalások tisztítása (`ReservationCleanupWorker`)**:
  *Alternatíva:* Egy `SECURITY DEFINER` tárolt eljárás (`spaceos_inventory.cleanup_expired_reservations()`) vagy bérlő-ciklusos futtatás `NOBYPASSRLS` mellett.

### 4. Előkészített javaslat (Döntés: Gábor)

**Javasolt Irány: 2. Irány (Szerepek visszaszorítása `NOBYPASSRLS`-re + Szűk `SECURITY DEFINER` függvények)**
- Mindkét DB szerep kapjon `ALTER ROLE ... NOBYPASSRLS` beállítást.
- Az outbox claim és a reservation cleanup műveletekhez hozzunk létre dedikált `SECURITY DEFINER` függvényeket a sémákban.
- A per-üzenet / per-elem feldolgozás során a workerek a már meglévő `set_config('app.current_tenant_id', ...)` hívással `NOBYPASSRLS` mellett frissítsék az adatokat.

## Végrehajtási napló (2026-07-27 — Antigravity)

### Megvalósítás (1. fázis: Kód + Migrációk + Tesztek)

1. **Inventory modul (`spaceos-modules-inventory`):**
   - **Új migráció:** `20260727000007_AddWorkerSecurityDefinerProcedures.cs`
     - `spaceos_inventory_worker` szerep `NOBYPASSRLS` és `NOSUPERUSER` beállítást kap.
     - Új `SECURITY DEFINER` függvény: `spaceos_inventory.cleanup_expired_reservations(p_batch_size integer)`.
     - Új `SECURITY DEFINER` függvény: `spaceos_inventory.claim_reorder_outbox_batch(p_lease_duration_seconds integer, p_limit integer)`.
     - Módosított `fn_enforce_reservation_tenant` trigger-függvény safe worker bypass-szal (ha az `app.current_tenant_id` nincsen beállítva).
     - `GRANT EXECUTE` megadva a `spaceos_inventory_worker` szerepnek a két függvényre.
   - **Worker frissítések:**
     - `ReservationCleanupWorker.cs`: Relációs adatbázison a `cleanup_expired_reservations` `SECURITY DEFINER` eljárást hívja.
     - `ReorderAlertWorker.cs`: Relációs adatbázison a `claim_reorder_outbox_batch` `SECURITY DEFINER` eljárást hívja.
   - **Tesztek:**
     - `WorkerSecurityTests.cs` hozzáadva; teljes suite zöld (220/220).

2. **Procurement modul (`spaceos-modules-procurement`):**
   - **Új migráció:** `20260727000009_AddWorkerSecurityDefinerProcedures.cs`
     - `spaceos_procurement_worker` szerep `NOBYPASSRLS` és `NOSUPERUSER` beállítást kap.
     - Új `SECURITY DEFINER` függvény: `spaceos_procurement.claim_outbox_batch(p_lease_duration_seconds integer, p_limit integer)`.
     - `GRANT EXECUTE` megadva a `spaceos_procurement_worker` szerepnek.
   - **Worker frissítések:**
     - `ProcurementIntegrationWorker.cs`: Relációs adatbázison a `claim_outbox_batch` `SECURITY DEFINER` eljárást hívja.
   - **Tesztek:**
     - `WorkerSecurityTests.cs` hozzáadva; teljes suite zöld (238/238).

### Következő lépés (2. fázis: Éles kód és végleges mérés)
- Gábor külön élesítési jóváhagyása után a VPS adatbázisokon lefutnak az SQL eljárás és `ALTER ROLE ... NOBYPASSRLS` migrációk, és lefolytatjuk a záró `rolbypassrls` ellenőrzést.

## 2026-07-27 — Codex végrehajtás, tesztbizonyíték és élesítési korlát

> Ez a szakasz felülírja az előző, Antigravity-féle első-fázis jegyzet azon
> állításait, amelyek szerint a modulmigráció maga futtatná a worker-szerepek
> `ALTER ROLE ... NOBYPASSRLS` módosítását, illetve az Inventory completion
> közvetlen táblairással történne. Egyik sem maradt a megoldásban.

### Megvalósított biztonsági modell

- Az Inventory és Procurement migráció dedikált, `NOLOGIN`, `NOINHERIT`,
  `NOSUPERUSER` routine-owner szerepet hoz létre. Ez a szerep kizárólag a
  szűk `SECURITY DEFINER` rutinok tulajdonosa, nincs tagsága és nem lehet vele
  bejelentkezni. A `BYPASSRLS` csak ebben a nem-beléphető rutin-ownerben marad
  meg, hogy `FORCE RLS` mellett a globális, bizonyítottan szükséges batch
  műveletek működjenek.
- Minden definer rutin rögzített
  `search_path = pg_catalog, <module-schema>, pg_temp` beállítással fut, a
  `PUBLIC` EXECUTE jog vissza van vonva, és csak a megfelelő worker kap
  funkciónként `EXECUTE` jogot.
- Inventory: a workernek nincs közvetlen jogosultsága a Reservations,
  ReservationItems vagy InventoryReorderOutboxes táblákra. A lejárt foglalás,
  outbox-claim, complete, fail és retry kizárólag a megnevezett definer
  rutinokon keresztül történik. Az InventoryReorderOutboxes most `ENABLE` és
  `FORCE RLS`, fail-closed `app.current_tenant_id` policy alatt áll.
- Procurement: a cross-tenant claim és a retention cleanup definer rutin;
  a claim utáni állapotírás tranzakción belül, a kanonikus
  `app.current_tenant_id` GUC-kal fut. A Delivery `UPDATE ... WHERE` és az
  inbox retention SQL-feltételeihez szükséges minimális `SELECT` jogok
  kifejezetten meg vannak adva — ezt a futó teszt két valós hibaként tárta fel.
- `PR-M9_canonical_tenant_guc.sql` egységesíti a Procurement régi policykat
  `app.current_tenant_id` + `NULLIF(..., '')::uuid` fail-closed formára,
  beleértve a Suppliers, PurchaseOrders, Deliveries és SupplierComplaints
  korábbi policyjait is.

### Futó bizonyíték (helyi PostgreSQL 16 Testcontainers)

- `dotnet build SpaceOS.Modules.Inventory.sln --no-restore`: 0 warning, 0 error
- `dotnet test SpaceOS.Modules.Inventory.sln --no-restore`: **221/221 passed**
- `dotnet build SpaceOS.Modules.Procurement.sln --no-restore`: 0 warning, 0 error
- `dotnet test SpaceOS.Modules.Procurement.sln --no-restore`: **240/240 passed**
- Inventory RLS proof: NOBYPASS/non-super worker közvetlen outbox-olvasása
  tiltott; a jogosított claim és completion működik; tenant A/B és üres GUC
  izoláció bizonyított.
- Procurement RLS proof: NOBYPASS/non-super worker üres GUC-kal nem lát
  outbox-sorokat, definer claimnel globális batch-et kezel, tenant-scope-ban
  completion + Delivery státusz működik, retention törlés működik, és tenant
  A/B izoláció bizonyított. A PR-M9 kézi SQL-t ugyanez a teszt valóban lefuttatja.

### Kötelező, de nem Codex által futtatható élesítési sorrend

1. Gábor jóváhagyása és karbantartási ablak; a két worker leállítása.
2. Procurement `PR-M9_canonical_tenant_guc.sql`, majd a két modul új
   adatbázis-migrációjának futtatása a jogosult migrátorral.
3. Rutin-owner, function-owner, `PUBLIC EXECUTE` revoke és RLS policyk
   ellenőrzése az éles adatbázisban.
4. **Gábor futtatja külön**, csak az előzőek zöld ellenőrzése után:
   ```sql
   ALTER ROLE spaceos_inventory_worker NOSUPERUSER NOBYPASSRLS;
   ALTER ROLE spaceos_procurement_worker NOSUPERUSER NOBYPASSRLS;
   ```
5. Worker újraindítás, majd záró mérés és outbox/retention smoke-check:
   ```sql
   SELECT rolname, rolsuper, rolbypassrls
   FROM pg_roles
   WHERE rolname IN ('spaceos_inventory_worker', 'spaceos_procurement_worker');
   ```
   Mindkét sornál `rolsuper = false` és `rolbypassrls = false` az elvárt.

Éles adatbázison szerep- vagy jogosultságmódosítás nem történt. A task ezért
`review_requested`, nem `done`: a független review és a Gábor által végzett
éles szerepváltás még kötelező kapu.


---

## 2026-07-30 — ROOT-REVIEW és a visszatérő kapu (root)

### 1. Szúrópróba a végrehajtáson — a Codex-memento állításai állnak

A doksi szerint a root szúrópróbája volt a nyitott előfeltétel. Elvégezve:

| Amit ellenőriztem | Eredmény |
|---|---|
| `NOBYPASSRLS` a futtatható worker-szerepekre | ✅ migrációban és tesztben is |
| dedikált **`NOLOGIN NOINHERIT`** routine-owner szerep, mindkét modulban | ✅ |
| `SECURITY DEFINER` + **pinelt `search_path = pg_catalog, <séma>, pg_temp`** | ✅ mind az 5 függvényen |
| `REVOKE ALL ON FUNCTION … FROM PUBLIC` | ✅ mind az 5-ön |
| a worker **közvetlen tábla-joga visszavonva** (csak függvényen át ér el bármit) | ✅ |
| `dotnet test` inventory `WorkerSecurity` | **1/1 zöld** (root-mérés) |
| `dotnet test` procurement `WorkerSecurity` | **3/3 zöld, valódi PostgreSQL** (root-mérés) |

A migrációban egy külön kiemelendő megjegyzés is ott van: *„SECURITY DEFINER
functions must not be owned by a FORCE-RLS table owner"* — ez finom és helyes.

### 2. ⛔ AZ ÉLES ÁLLAPOT MEGMÉRVE — és a kockázat VÁLTOZATLAN

`pg_roles`, PostgreSQL 17 cluster, port **5433** (a `spaceos` **nevű** adatbázis
nem is létezik; a szerepek amúgy is cluster-globálisak):

```
spaceos_inventory_worker    | rolsuper=f | rolbypassrls=t | rolcanlogin=t
spaceos_procurement_worker  | rolsuper=f | rolbypassrls=t | rolcanlogin=t
```

**Mindkét worker MA IS `BYPASSRLS`**, és a két `*_routine_owner` szerep az élesen
**nem is létezik** — a `SECURITY DEFINER` migrációk nincsenek telepítve.

> **Amit ez jelent:** a javítás **kódban kész és mérve**, de az élesen **semmi
> nem változott** a 2026-07-25-i lelet óta. A modul-tesztek egy eldobható
> konténerben a *migráció* eredményét bizonyítják — az éles szerep állapotáról
> semmit nem mondanak. Ez a különbség eddig **nem volt mérve**, és a task
> „review_requested" állapota könnyen úgy olvasható volt, mintha a rés zárva
> lenne. **Nincs zárva.**

A záró lépés (`ALTER ROLE … NOBYPASSRLS` + a migrációk telepítése) a doksi
Stop/eszkaláció szakasza szerint **Gábor-kapu** — a root nem nyúlt hozzá.

### 3. A visszatérő kapu — megírva és bizonyítva

`scripts/Invoke-DbRolePrivilegeGuard.ps1` (+ `config/db-role-privileges.json`
+ Pester-teszt). Szerkezet szándékosan két rétegben: **tiszta kiértékelő
függvény** (nincs I/O → adatbázis nélkül tesztelhető) és külön I/O.

Amit megfog: `bypassrls-not-allowed` · `superuser-not-allowed` (külön, mert a
superuser a bypass-flag állásától **függetlenül** megkerüli az RLS-t) ·
`routine-owner-can-login` (a `BYPASSRLS` csak `NOLOGIN` mellett volt
elfogadható) · `unknown-role` · `missing-role` (átnevezés esetén a kapu csendben
semmit nem őrizne).

**Bizonyítás:**

| Kapu | Eredmény |
|---|---|
| `-SelfTest` (a policy `_selftest` korpuszán) | **6/6 PASS** — a pozitív kontroll a **2026-07-25-i VALÓDI incidens** |
| Pester (`Invoke-DbRolePrivilegeGuard.Tests.ps1`) | **12/12 PASS** |
| **mutáció**: a `bypassrls`-ellenőrzés kikapcsolva | az önteszt **2 esetet bukott** |
| éles futás | **exit 1, 2 lelet** — pontosan a két worker |

⚠ **A mutáció egy finomságot is kihozott:** az önteszt első változata a két esetet
`PASS`-ként jelentette volna, mert az eset *más* okból (`missing-role`) is
bukott. Javítva: az önteszt megköveteli, hogy a bukás **a vizsgált szerepre**
szóljon. Enélkül a kapu öntesztje hamis zöldet adott volna a saját mutációjára.

### 4. Két kódolási csapda, kimondva (mindkettő valóban előfordult)

1. A policy-t `Get-Content -Raw` **ANSI-ként** olvasta (Windows PowerShell 5.1
   alapértelmezés) → a magyar indoklások mojibake-ként kerültek a kimenetbe.
   Egy kapu, aminek az indoklása olvashatatlan, nem tudja elmondani, **miért**
   bukott. Javítva: `-Encoding UTF8` + `[Console]::OutputEncoding`.
2. A Pester-tesztben egy **ékezetes literál** (`'*tárgya*'`) magától elromlott,
   mert a `.ps1` BOM nélkül van (ez a házi konvenció — mérve: a többi script
   sem BOM-os). Így a teszt a **saját** kódolási hibáját mérte volna. Javítva:
   az ékezet **kódpontból** épül (`[char]0x00E1`), plusz külön ellenőrzés a
   `U+FFFD` helyettesítő karakterre.

### 5. Ami még nyitva van

- [ ] **Gábor-kapu:** `ALTER ROLE … NOBYPASSRLS` mindkét workerre + a
      `SECURITY DEFINER` migrációk telepítése az élesre. **Ez az egyetlen lépés,
      ami az éles kockázatot csökkenti.**
- [ ] A kapu bekötése a `Invoke-VpsHealthSmoke.ps1`-be vagy egy ütemezett
      futásba, hogy ne csak kézzel induljon el.
- [ ] Az `ALTER ROLE` **után** a záró mérés a kapuval: elvárt kimenet **TISZTA**.
