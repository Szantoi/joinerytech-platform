# RLS (Row Level Security) Policy Template — ADR-062 baseline

**Use case:** tenant isolation — a request only ever sees its own tenant's rows.

> ⚠️ Ez a sablon az **ADR-062** döntést tükrözi. A kanonikus implementáció a
> `src/spaceos-modules-hosting` csomag (`RlsMigrationSql` + `SpaceOsTenantSessionInterceptor`)
> — modul-kódban NE kézzel írd, hanem a csomagot használd. Session-kulcs:
> **`app.current_tenant_id`** (egyetlen kulcs, kernel-interoperábilis; a korábbi
> `app.tenant_id` és `app.current_tenant` változatok HIBÁSAK voltak).

## 1. SQL policy (a `RlsMigrationSql.EnableTenantRls` kimenete)

```sql
ALTER TABLE ehs."incidents" ENABLE ROW LEVEL SECURITY;
-- FORCE nélkül a tábla TULAJDONOSÁRA nem érvényes a policy → csendben dísz marad:
ALTER TABLE ehs."incidents" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "incidents_tenant_isolation" ON ehs."incidents";
CREATE POLICY "incidents_tenant_isolation" ON ehs."incidents"
    USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
```

- `current_setting(..., true)`: hiányzó kulcsnál NULL, nem hiba.
- `NULLIF(..., '')`: az interceptor pool-reset `''` értéke is NULL-lá válik →
  a összehasonlítás hamis → **nulla sor** (fail-closed), nem cast-hiba.
- ⚠️ A **superuser mindig átlépi** az RLS-t (FORCE-szal együtt is) — a deploy-szerep
  nem lehet superuser.

Gyerek-táblára (nincs saját tenant-oszlop): `RlsMigrationSql.EnableChildTenantRls` —
EXISTS-szubquery a szülő tenant-oszlopára az FK-n keresztül.

## 2. Session-kontextus beállítása (a közös interceptor)

A modul-hostok a `SpaceOS.Modules.Hosting.Persistence.SpaceOsTenantSessionInterceptor`-t
regisztrálják (DbConnectionInterceptor, **ConnectionOpened** fázis):

```csharp
// paraméterezett — SOHA nem string-interpolált — set_config, session-szintű (is_local=false):
cmd.CommandText = "SELECT set_config(@key, @value, false)";
```

- `SET LOCAL` itt **no-op** lenne (nincs nyitott tranzakció a ConnectionOpened-ben) — kernel BE-P15-03.
- Kapcsolat-zárásnál `''`-re reset (pool-szennyezés ellen).
- **A hibát SOHA nem nyeli el** — nem létező függvény/policy = elszálló kérés, nem néma szivárgás.

## 3. Regisztráció (modul-DI)

```csharp
services.AddSpaceOsModuleTenancy(); // ITenantContext (JWT-claimből) + interceptor
services.AddDbContext<MyDbContext>((sp, options) =>
    options.UseNpgsql(connectionString)
           .AddInterceptors(sp.GetRequiredService<SpaceOsTenantSessionInterceptor>()));
```

**Második réteg:** minden tenant-scoped aggregátum-gyökérre `HasQueryFilter`
(`CurrentTenantId == null || e.TenantId == CurrentTenantId` — kernel-minta).

**See also:** [ADR-062](../adr/ADR-062-rls-tenant-izolacio.md) ·
`src/spaceos-modules-hosting/README.md` ·
[MULTI_TENANT_RLS_ARCHITECTURE_2026.md](../architecture/MULTI_TENANT_RLS_ARCHITECTURE_2026.md)
(⚠️ a 2026-06-22-es kutatási doksi mintakódja elavult — a kernel/hosting-csomag a mérvadó)
