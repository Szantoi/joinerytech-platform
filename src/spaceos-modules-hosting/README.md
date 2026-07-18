# SpaceOS.Modules.Hosting

A JoineryTech-sziget **közös modul-host csomagja** (ADR-061 + ADR-062). A kernel a
referencia-implementáció — **nem függőség**: a mintáit (KC-T1 auth-blokk,
`TenantSessionInterceptor`) a sziget saját release-ciklusában tartjuk karban itt.

## Mit ad

| API | Mit csinál |
|---|---|
| `AddSpaceOsModuleAuth(config, env)` | Keycloak JWT bearer a kernel-minta szerint: `MapInboundClaims=false`, ProblemDetails 401/403, `realm_access.roles` → `ClaimTypes.Role`. Konfig fail-fast (`Jwt:Authority` + `Jwt:Audience` kötelező). `Jwt:Mode=Development` → engedékeny dev-séma, ami Development környezeten kívül **induláskor dob**. |
| `AddSpaceOsModuleTenancy()` | `ITenantContext` (claims-alapú) + a közös RLS session-interceptor regisztrációja. |
| `UseSpaceOsModuleTenancy()` | Kérésenkénti tenant-feloldás middleware: a tenant a **JWT-ből** jön (`tid` → `spaceos_tenants` → legacy `tenant_id`); az `X-Tenant-Id` / `X-SpaceOS-Active-Tenant` header **csak a token tenant-listája ellen validálva** fogadható el, különben **403**. Tenant nélküli token → **403**. (ADR-061 T1 — a hitelesítetlen header-átvétel megszűnt.) |
| `SpaceOsTenantSessionInterceptor` | Paraméterezett `set_config('app.current_tenant_id', …, false)` minden megnyitott kapcsolaton + pool-reset záráskor. **Hibát SOHA nem nyel el**; hitelesített kérés feloldott tenant nélkül → kivétel (ADR-062 fail-loud szabály). |
| `RlsMigrationSql` | Migrációs SQL-sablon: `set_tenant_context` függvény + `ENABLE` + **`FORCE ROW LEVEL SECURITY`** + fail-closed policy (`NULLIF(current_setting('app.current_tenant_id', true), '')::uuid`). Gyerek-táblákra FK-követő (EXISTS) policy. |
| `FixedTenantContext` | Rögzített tenant tesztekhez / háttérmunkához. |

## Host-recept

```csharp
builder.Services.AddSpaceOsModuleAuth(builder.Configuration, builder.Environment);
builder.Services.AddSpaceOsModuleTenancy();
// … AddMyModule(builder.Configuration) — a modul-DI az interceptort így köti be:
//    options.UseNpgsql(cs).AddInterceptors(sp.GetRequiredService<SpaceOsTenantSessionInterceptor>())

app.UseAuthentication();
app.UseAuthorization();
app.UseSpaceOsModuleTenancy();   // ⚠️ mindig az UseAuthentication() UTÁN
app.MapMyEndpoints();            // minden üzleti endpoint RequireAuthorization()-nel
```

`appsettings.json` (éles alap):

```json
{ "Jwt": { "Authority": "https://joinerytech.hu/auth/realms/spaceos", "Audience": "<modul>-api" } }
```

`appsettings.Development.json` (Keycloak nélküli lokál futás):

```json
{ "Jwt": { "Mode": "Development", "Development": { "TenantId": "11111111-1111-1111-1111-111111111111", "Roles": [ "Admin" ] } } }
```

## Fontos részletek

- **`MapInboundClaims = false` nem opcionális** — enélkül a `tid` claim átnevezésre kerül
  és a tenant-feloldás némán eltörik (kernel Program.cs:88).
- Az interceptor **csak PostgreSQL** providerrel regisztrálandó (`set_config` nincs
  SQLite/InMemory alatt).
- A `FORCE RLS` a tábla tulajdonosára is érvényes, de a **superuser mindig átlépi** —
  a deploy-szerep nem lehet superuser, különben a policy dísz (ADR-062).
- Második védelmi réteg: minden modul-DbContext tenant-`HasQueryFilter`-t hord az
  aggregátum-gyökereken (kernel-minta) — az RLS és a query-filter együtt izolál.

## Tesztek

`tests/SpaceOS.Modules.Hosting.Tests` — Docker-mentes TestServer-lánc: 401/403 kontraktus,
tenant-hamisítás elutasítása, dev-séma env-fék, interceptor fail-loud + pool-reset,
RLS-sablon tartalmi assertek.
