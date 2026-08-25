# SpaceOS.Modules.Hosting

A JoineryTech-sziget **közös modul-host csomagja** (ADR-061 + ADR-062). A kernel a
referencia-implementáció — **nem függőség**: a mintáit (KC-T1 auth-blokk,
`TenantSessionInterceptor`) a sziget saját release-ciklusában tartjuk karban itt.

## Mit ad

| API | Mit csinál |
|---|---|
| `AddSpaceOsModuleAuth(config, env)` | Keycloak JWT bearer: RS256, pontos issuer, a host audience-ának pontosan egyszeri jelenléte egy bounded/unique `aud` tömbben, pontos `azp`, JOSE `typ` és külön payload `typ=Bearer`. Az aláírás után kötelező native projection- és online membership/version-check fut. Hiányzó online provider esetén a beépített default minden tokent megtagad. |
| `AddSpaceOsModuleTenancy()` | `ITenantContext` (claims-alapú) + a közös RLS session-interceptor regisztrációja. |
| `UseSpaceOsModuleTenancy()` | Kérésenkénti tenant-feloldás kizárólag egy native `spaceos_tenants` entryből. `tid`, `tenant_id`, top-level `permissions`/`enabled_modules`, camelCase/string wrapper, mixed vagy multi-entry profil → **403**. A tenant-header csak az egy aláírt selected tenanttal egyezhet. |
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

ERPSEP-06 interim modul-gate egy modul saját route-csoportján:

```csharp
builder.Services.AddRequiredEnabledModulePolicy("spaceos.maintenance");

app.MapGroup("/api/maintenance")
    .RequireAuthorization()
    .RequireEnabledModule("spaceos.maintenance");
```

A gate a pontosan egy `spaceos_tenants[]` entry `enabled_modules` és `permissions`
értékeit a feloldott tenanttal együtt ellenőrzi. `GET`/`HEAD`/`OPTIONS` kéréshez az
adott modul `.view`, `.edit` vagy `.admin` joga kell; minden író metódushoz `.edit`
vagy `.admin`. Így egy `.view` token nem hívhat `POST`/`PUT`/`PATCH`/`DELETE`
végpontot. A két lista modulhalmazának egyeznie kell; mindkettő rendezett, egyedi,
legfeljebb tízelemű és a verziózott service-registryre korlátozott. Bármely hiányos
vagy hibás input 403.

`appsettings.json` (éles alap):

```json
{ "Jwt": { "Authority": "https://joinerytech.hu/auth/realms/spaceos", "Audience": "<modul>-api", "AuthorizedParty": "portal-app", "TokenType": "JWT", "AccessTokenPayloadType": "Bearer" } }
```

A production OIDC metadata/JWKS út a valódi IdentityModel configuration managert használja,
de szigorú facade mögött: exact HTTPS origin, redirect/proxy/cookie tiltás, 1500 ms backchannel
timeout, 30 s explicit refresh, 5 perc automatikus refresh, 600 s maximális konfiguráció-életkor,
64 KiB dokumentumlimit és legfeljebb 16 egyedi, nem üres `kid` értékű nyers JWK. A limitek a
`Jwt:OidcAuthority` szekcióban csak a forrásban ellenőrzött tartományokon belül módosíthatók.
Az OIDC manager a saját privát exact-origin handlerét és `HttpClient` példányát birtokolja;
a publikus `JwtBearerOptions.Backchannel` és `BackchannelHttpHandler` nem része a discovery/JWKS
trust útnak. Processzen belüli transport kizárólag az internal friend-test markerrel, az exact
tesztassemblyből és a forrásban rögzített fake HTTPS issuerhez köthető. Minden bearer kéréshez
új, private `JwtBearerOptions`/validation/token-handler/sealed-event gráf készül a source
profilból; a publikus cached options csak composition-drift canary, egyetlen referenciája sem
kerül a base `JwtBearerHandler` validációs útjába. A private TVP crypto factory nélkül fut,
az egyenként deep-clone-olt JWKS kulcsok saját cache-tiltott factoryt kapnak. A sealed virtual
event metódusok nem hívják a publikus `On*` delegate propertyket. A kérés eleje előtt fennálló
manager-, event-, handler-, crypto- vagy validator drift 401; a private snapshot után történő
mutáció nem befolyásolja az aktuális kérést, a következő handler viszont fail-closed detektálja.
A strict manager belső IdentityModel cache-e teljesen private, minden visszaadott konfiguráció,
JWKS és signing key hívásonként új deep defensive snapshot.
Az UTF-8 JSON legfeljebb 32 szint mély lehet, comment/trailing comma és bármely objektumszinten
duplikált (escape-feloldás után azonos) property-név tiltott, még az IdentityModel parse előtt.
Minden nyers kulcs public-only RSA, canonical base64url `n`/`e`, 2048..8192 bites modulus és
`e=65537`; symmetric vagy private key az egész dokumentumot megtagadja. Token-trustba csak a
pontos `kty=RSA,use=sig,alg=RS256` és absent vagy verify-only `key_ops` profil kerül. Egy hibás
signing candidate az egész JWKS-t megtagadja. A Keycloak külön `use=enc`, `alg=RSA-OAEP`
vagy `alg=RSA-OAEP-256`
public kulcsa a nyers JWKS-ben megmaradhat, de a `SigningKeys` halmazból ki van szűrve. A trust
kulcs közvetlenül a validált canonical N/E-ből épül, ezért certificate metadata sem válhat
alternatív aláírás-ellenőrzési forrássá.
`UseLastKnownGoodConfiguration` és tokenoldali LKG tiltott; ismeretlen `kid` valódi refresh-t
indít. Csak a teljesen letöltött és validált discovery+JWKS frissíti a freshness időpontját,
cache-hit nem. Az `oidc-authority` readiness check cold, legutóbb hibás vagy stale állapotban
`Unhealthy`, és a max-age után maga az autentikáció is fail-closed.
A source-owned hosted service ingress nélkül elindítja a cold discovery/JWKS prewarmot,
hiba esetén 250 ms-ról induló, legfeljebb 5 másodperces exponenciális backoffal újrapróbál,
és a konfiguráció maximális életkorának fele előtt periodikus valódi refresh-t kér. Egy
kísérlet teljes budgetje a két bounded HTTP olvasásból származik, legfeljebb 10 másodperc;
shutdown azonnal megszakítja a kérést és a várakozást. A service nem használ stale/LKG
fallbackot: a hiba logban és `Unhealthy` readinessben marad a következő teljes sikerig.
A freshness/prewarm/readiness source-owned órát használ; host által előre regisztrált globális
`TimeProvider` nem hosszabbíthatja meg a konfiguráció bizalmi életkorát.

`appsettings.Development.json` (Keycloak nélküli lokál futás):

```json
{ "Jwt": { "Mode": "Development", "Development": { "TenantId": "11111111-1111-1111-1111-111111111111", "Roles": [ "Admin" ], "EnabledModules": [ "spaceos.maintenance" ] } } }
```

`Development:EnabledModules` is a local synthetic-identity input only. It defaults to
an empty list (module-gated routes return 403). A felsorolt modulokra a kizárólag
Development környezetben engedett synthetic identity `.admin` jogot kap, hogy az író
végpontok is ugyanazon method-aware policyt járják. A beállítás jelenléte Keycloak
módban fail-fast hibát okoz, így helyi grant nem keveredhet valós autentikációval.

## Fontos részletek

- **`MapInboundClaims = false` nem opcionális** — különben a .NET claim-aliasok miatt
  eltérhet a szerver által látott név a kanonikus wire-profiltól.
- A strict native tokenben a legacy `role`, `roles`, `realm_access` és ClaimTypes.Role URI
  authority tiltott és még az online Kernel lookup előtt 401. DMS ACL-szerepkör csak külön,
  tenant-nested és Kernel-readbackelt szerződéssel aktiválható; realm-role fallback nincs.
- A két `typ` önálló szerződés: a JOSE fejléc pontosan `JWT` (vagy explicit RFC 9068
  `at+jwt`), a Keycloak access-token payload claim pontosan `Bearer`. Bármelyik hiányzó,
  duplikált vagy eltérő értéke 401.
- Éles hostnak saját `IOnlineIdentityAuthorityStateProvider` implementációt kell
  regisztrálnia. Az állapotforrás subject+tenant scope-ban ellenőrzi az aktív tenantot,
  membershipet, a `spaceos_membership_version` és `spaceos_projection_version` pontos
  egyezését, az online permission/module tartalom exact readbackját, valamint a revoke
  időhatárt. A válasznak az exact subjectet és tenantot is vissza kell kötnie; eltérő
  scope akkor is deny, ha egy hibás adapter rossz rekordot adott vissza. A csomag default
  providere deny-all.
- A modul-hostok same-origin/trusted-ingress API-k: a csomag szándékosan nem kapcsol be
  általános CORS-t. Az `OPTIONS` read-besorolása csak hitelesített endpoint-kérésre
  vonatkozik; anonymous cross-origin preflight külön, review-zott origin allowlist és
  proxy-trust nélkül fail-closed marad.
- Az interceptor **csak PostgreSQL** providerrel regisztrálandó (`set_config` nincs
  SQLite/InMemory alatt).
- A `FORCE RLS` a tábla tulajdonosára is érvényes, de a **superuser mindig átlépi** —
  a deploy-szerep nem lehet superuser, különben a policy dísz (ADR-062).
- Második védelmi réteg: minden modul-DbContext tenant-`HasQueryFilter`-t hord az
  aggregátum-gyökereken (kernel-minta) — az RLS és a query-filter együtt izolál.
- A 401/403 `application/problem+json` válasz `correlationId` mezőt is ad; ezt a kliens
  hibajelentésnél meg kell őrizni.

## Tesztek

`tests/SpaceOS.Modules.Hosting.Tests` — Docker-mentes TestServer-lánc: 401/403 kontraktus,
tenant-hamisítás elutasítása, dev-séma env-fék, interceptor fail-loud + pool-reset,
RLS-sablon tartalmi assertek.
