# SpaceOS — Database & Migration Patterns

> Fejlesztés közben és production deployban megfigyelt minta és anti-pattern-ek.

---

## 1. EF Core Migration `suppressTransaction: true` — Partial-Apply Kockázat

### Pattern: Mikor szükséges

A `suppressTransaction: true` **csak akkor** használandó, ha a PostgreSQL DDL parancs
nem futhat tranzacción belül. Tipikus eset:

```csharp
// ✅ HELYES: CREATE INDEX CONCURRENTLY tranzakción kívül
migrationBuilder.Sql(@"
    CREATE INDEX CONCURRENTLY idx_orders_customer 
    ON orders(customer_id);
", suppressTransaction: true);
```

### Kockázat: Partial-apply scenario

Ha egy migration több `suppressTransaction: true` SQL-et tartalmaz és a közepén megáll:

```
1. SQL #1 (nyitott transaction nélkül) → **COMMITTED**
2. SQL #2 (fails) → **ROLLBACK / STOP**
3. SQL #3 (nem fut)
4. __EFMigrationsHistory INSERT (nem fut!) → **HISTORY NEM FRISSÜL**

Eredmény: Kernel/service startup az EF-nek újra pending-nek látszik.
```

### Tünet & Diagnózis

| Tünet | OK Oka |
|---|---|
| `42710 constraint X already exists` startup | Partial apply — DB-ben van, de history-ban nem. |
| `42703 column X does not exist` runtime | Migration nincs history-ban, de a model várja. |
| `No migrations were applied. The database is already up to date.` log, DE kernel crash | Migration DLL-ből hiányzik — `.Designer.cs` nem jött be build-be. |

**Verifikáció:**

```bash
# 1. DLL-ben mi van?
strings /opt/spaceos/spaceos-kernel/publish/SpaceOS.Infrastructure.dll \
  | grep -E "Migration_[0-9]{4}|^20[0-9]+"
#    Ha csak class név látszik, de timestamp prefix NEM → .Designer.cs hiányzik

# 2. DB history
sudo -u postgres psql -p 5433 -d spaceos \
  -c "SELECT \"MigrationId\" FROM \"__EFMigrationsHistory\" ORDER BY \"MigrationId\" DESC LIMIT 5;"

# 3. Actual schema — mely táblák / oszlopok léteznek?
sudo -u postgres psql -p 5433 -d spaceos -c "\d \"Tenants\""
```

### Manual Fix Recipe

Egy tranzakcióban: hiányzó SQL operáció-k pótlása + history INSERT.

```sql
BEGIN;

-- Hiányzó seed / DDL amit a partial apply-nál maradt ki
INSERT INTO "X" (...) VALUES (...)
  ON CONFLICT (...) DO UPDATE SET ...;

-- Kulcsmozzanat: MigrationId pontosan a migration DLL assembly nevével
INSERT INTO "__EFMigrationsHistory" ("MigrationId","ProductVersion")
VALUES ('20260615120000_AddColumnX_Migration_0042','8.0.11');

COMMIT;
```

Utána systemd auto-restart (`Restart=always`) felveszi — NEM kell `systemctl restart`.

### Prevention: Tervezett Migration szétválasztás

```csharp
// ❌ ROSSZ — több suppressTransaction egy migrationban
migrationBuilder.Sql(@"CREATE INDEX CONCURRENTLY idx1 ON ...", suppressTransaction: true);
migrationBuilder.Sql(@"CREATE INDEX CONCURRENTLY idx2 ON ...", suppressTransaction: true);

// ✅ HELYES — saját migration fájlonként
// 20260615_AddIndex1.cs
migrationBuilder.Sql(@"CREATE INDEX CONCURRENTLY idx1 ON ...", suppressTransaction: true);

// 20260616_AddIndex2.cs
migrationBuilder.Sql(@"CREATE INDEX CONCURRENTLY idx2 ON ...", suppressTransaction: true);
```

---

## 2. RLS (Row-Level Security) & EF Core — ADR-062 baseline

> ♻️ **2026-07-18 (ADR-IMPL-HOSTING):** ez a szekció korábban HÁROM hibát tartalmazott —
> rossz session-kulcs (`app.current_tenant`), string-interpolált `SET`, és érvénytelen
> `DISABLE ROW LEVEL SECURITY ON` SQL-példa. A kanonikus implementáció:
> `src/spaceos-modules-hosting` (`RlsMigrationSql` + `SpaceOsTenantSessionInterceptor`)
> és a kernel `TenantSessionInterceptor`. Session-kulcs mindenhol:
> **`app.current_tenant_id`** (ADR-062 K1).

### Pattern: Tenant-scoped queries

```sql
-- RLS policy PostgreSQL-ben (a RlsMigrationSql.EnableTenantRls kimenete):
ALTER TABLE ehs."incidents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehs."incidents" FORCE ROW LEVEL SECURITY;  -- enélkül a tábla-tulajdonosra NEM érvényes!
CREATE POLICY "incidents_tenant_isolation" ON ehs."incidents"
    USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
```

- fail-closed: hiányzó/üres kulcs → NULL → nulla sor (nem hiba, nem teljes olvasás);
- ⚠️ a superuser MINDIG átlépi az RLS-t — a deploy-szerep nem lehet superuser;
- gyerek-táblák (saját tenant-oszlop nélkül): FK-követő EXISTS-policy
  (`RlsMigrationSql.EnableChildTenantRls`).

### Gotcha: helyes ALTER-szintaxis

A `DISABLE ROW LEVEL SECURITY ON "Orders";` alak **érvénytelen PostgreSQL** — helyesen:
`ALTER TABLE "Orders" DISABLE ROW LEVEL SECURITY;`. Migrációban jellemzően nincs is rá
szükség: a migrációt futtató szerep vagy bypass-ol (superuser), vagy a DDL nem esik RLS alá;
seed-INSERT-nél a tenant-kontextust kell beállítani, nem az RLS-t kikapcsolni.

---

## 3. DbConnectionInterceptor — Connection Pool & tenant-kontextus

### Pattern: Spoof-proof connection initialization

A közös `SpaceOsTenantSessionInterceptor` (`src/spaceos-modules-hosting`) minta —
**ConnectionOpened** (nem Opening: ott a kapcsolat még nincs nyitva), **paraméterezett**
`set_config` (nem interpolált `SET` — a claim-manipulációs SQL-injektálás ellen),
session-szint (`is_local=false` — a `SET LOCAL` a ConnectionOpened-ben tranzakció híján
no-op, kernel BE-P15-03):

```csharp
public override async Task ConnectionOpenedAsync(
    DbConnection connection, ConnectionEndEventData eventData, CancellationToken ct)
{
    // A tenant a JWT-ből feloldott ITenantContext-ből jön (ADR-061 T1) — SOHA nem
    // hitelesítetlen headerből vagy env-változóból.
    await using var cmd = connection.CreateCommand();
    cmd.CommandText = "SELECT set_config(@key, @value, false)";
    // @key = "app.current_tenant_id", @value = tenantId — paraméterként!
    await cmd.ExecuteNonQueryAsync(ct);
}
```

Kötelező viselkedés (ADR-062):
- **hibát SOHA nem nyel el** — a `catch (Exception) {}` az EHS/QA-ban néma
  tenant-szivárgást okozott;
- hitelesített kérés feloldott tenant nélkül → kivétel (fail-loud);
- kapcsolat-zárásnál reset `''`-re (pool-szennyezés ellen);
- csak PostgreSQL providerrel regisztrálandó (SQLite/InMemory alatt nincs `set_config`).

---

## 4. Testcontainers & EF Core Migrations

### Pattern: Test Database Isolation

```csharp
[Collection("Database collection")]
public class OrderRepositoryTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder()
        .WithDatabase("spaceos_test")
        .WithUsername("spaceos_app")
        .WithPassword("test-pwd-123")
        .Build();

    public async Task InitializeAsync()
    {
        await _container.StartAsync();
        var connStr = _container.GetConnectionString();
        
        // Migrate test DB
        var options = new DbContextOptionsBuilder<SalesDbContext>()
            .UseNpgsql(connStr)
            .Options;
        
        using (var ctx = new SalesDbContext(options))
        {
            await ctx.Database.MigrateAsync();
        }
    }

    public async Task DisposeAsync() => await _container.StopAsync();
}
```

---

## 5. Connection String Konvenciók — Port 5433

**Natív (systemd) szolgáltatások:**
```
Host=localhost;Port=5433;Database=spaceos;Username=spaceos_kernel_app;Password=...
```

**Docker (pgAdmin test access):**
```
Host=localhost;Port=5432;Database=spaceos;Username=spaceos_admin;Password=...
```

---

## 6. Constraint & Index naming — `IF NOT EXISTS` idiom

```csharp
// ✅ IDEMPOTENT — biztonságos újra futtatásra
migrationBuilder.Sql(@"
    CREATE INDEX IF NOT EXISTS idx_orders_tenant_created 
    ON ""Orders"" (""TenantId"", ""CreatedAt"");
");

// ✅ IDEMPOTENT — constraint
migrationBuilder.Sql(@"
    ALTER TABLE ""Orders"" 
    ADD CONSTRAINT fk_order_tenant 
    FOREIGN KEY (""TenantId"") REFERENCES ""Tenants"" (""Id"");
", suppressTransaction: false); // Ha az FK van már, constraint duplicate error

// ❌ HIBÁS — nem idempotent
migrationBuilder.CreateIndex(name: "idx_orders_tenant", ...);
// Ha 2x futtatódik → duplicate key error
```

---

## Referencia: EF Core Version Konfliktusx

Lásd: `docs/knowledge/deployment/KNOWN_GOTCHAS.md` — pont #1 (dotnet-ef version).
