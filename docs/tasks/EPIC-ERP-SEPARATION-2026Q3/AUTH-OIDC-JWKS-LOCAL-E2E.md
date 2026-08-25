# AUTH-OIDC-JWKS-LOCAL-E2E — lokális P0 validátor-bizonyíték

**Dátum:** 2026-08-20
**Státusz:** lokális valós protokoll-bizonyíték kész; élő Keycloak/Kernel kapu nyitott
**Hatókör:** `SpaceOS.Modules.Hosting`, külső mutáció nélkül

## Cél és leállási feltétel

A közös modul-host auth-lánc fail-closed módon fogadja a verziózott, native,
egy-selected-tenant access-token profilt, és determinisztikus teszt igazolja a
kriptográfiai/JWKS negatív utakat, a két-tenant izolációt, valamint a friss online
membership/projection döntést. A munka itt megáll: élő Keycloak apply, felhasználó- vagy
tenant-módosítás, hálózati login, release-pin, deploy és aktiválás nem része.

## Implementált szerződés

- `JwtBearer` csak RS256-ot, pontos issuert, a host audience-ának pontosan egyszeri
  jelenlétét egy legfeljebb nyolcelemű egyedi `aud` halmazban, konfigurált `azp`-t és
  egy pontos JOSE `typ` fejlécet (`JWT` vagy explicit `at+jwt`) és ettől függetlenül
  pontos `typ=Bearer` Keycloak payload claimet fogad. Ez megtartja a mért Keycloak
  on-behalf-of profilt, ahol egy token több API-t is megcéloz.
- A token wire-alakja pontosan egy native `spaceos_tenants` tömb, benne pontosan egy
  entry. Kötelező mezők: `tenant_id`, `permissions`, `enabled_modules`; opcionális,
  bounded meta: `tenant_type`, `brand_skin`.
- `tid`, `tenant_id`, top-level permission/module, camelCase/string-wrapper, mixed és
  multi-entry authority fail-closed. Két tenant bizonyítéka két külön friss token.
- A permission/module lista rendezett, egyedi, legfeljebb tízelemű és az aktuális
  verziózott service-registryre szűkített. `spaceos_membership_version` és
  `spaceos_projection_version` native pozitív egész.
- Az aláírás után az `IOnlineIdentityAuthorityStateProvider` subject+tenant scope-ban
  ellenőrzi az aktív tenantot/membershipet, a két verzió pontos egyezését és a revoke
  időhatárt, valamint az online permissions/enabled_modules tartalom pontos egyezését.
  Hiányzó provider esetén a csomag defaultja deny-all.
- A fejlesztői szintetikus identitás is a native projectiont használja; nem tart fenn
  `tid`/flat kompatibilitási utat.
- A strict Keycloak token nem hordozhat legacy szerepkör-authorityt: top-level `role`,
  `roles`, ClaimTypes.Role URI és `realm_access` már a Kernel lookup előtt deny. Realm role
  nem képezhető át .NET role claimmé; DMS ACL-authority csak külön tenant-nested,
  Kernel-readbackelt szerződés után aktiválható.
- A production `JwtBearer` egy szigorú facade-on keresztül továbbra is a valódi
  IdentityModel `ConfigurationManager<OpenIdConnectConfiguration>`-t használja. Az issuer
  pontos, a discovery/JWKS csak a konfigurált HTTPS originről olvasható, redirect, proxy és
  cookie nélkül. A válaszméret, kulcsszám, timeout, refresh és konfiguráció-életkor
  forrásban korlátozott és konfigurációból csak review-zott tartományon belül állítható.
- A strict manager saját privát exact-origin transportot és `HttpClient` példányt birtokol;
  a publikus `JwtBearerOptions.Backchannel`/`BackchannelHttpHandler` nem kerülhet a trust útba.
  Az in-process fake csak internal friend-test markerrel, az exact tesztassemblyből és a
  source-pinned fake HTTPS issuerhez köthető. A source-owned bearer handler kérésenként új,
  private options/TVP/token-handler/sealed-event gráfot ad a base handlernek; a publikus cached
  options kizárólag composition-drift canary, semmilyen referenciája nem kerül validációba.
  A private TVP crypto factory nélkül, immutable RS256/JOSE-typ listákkal fut; minden deep-clone-olt
  signing key saját cache-tiltott factoryt kap. A sealed virtual eventek ignorálják a mutable
  publikus `On*` propertyket. Pre-request drift deny; mid-flight public mutáció nem változtatja meg
  az aktuális private snapshotot, a következő handler viszont fail-closed észleli.
- A real IdentityModel manager belső cache-referenciája teljesen private. Minden public manager
  hívás új, egymással és a cache-sel sem aliasoló deep configuration/JWKS/JWK/signing-key
  snapshotot kap; LKG mind a facade-ban, mind a belső managerben tiltott.
- A teljes JWKS 1..16 (konfigurálhatóan legfeljebb 32) nyers kulcsot tartalmazhat; minden
  `kid` nem üres és egyedi. Minden nyers kulcs public-only RSA, canonical base64url N/E,
  2048..8192 bites modulussal és pontos `e=65537` kitevővel; symmetric vagy private key az
  egész dokumentumot megtagadja. Token-trustba kizárólag az exact
  `kty=RSA,use=sig,alg=RS256` és absent vagy verify-only `key_ops` profil kerül. Hibás
  signing candidate az egész JWKS-t megtagadja. A Keycloak külön public RSA-OAEP encryption
  kulcsa megmaradhat a nyers JWKS-ben, de a `SigningKeys` halmazból ki van szűrve. A trust
  kulcs közvetlenül a validált canonical N/E-ből épül, nem certificate metadata vagy az
  IdentityModel általános JWK-konvertere választja ki. Duplikált/hiányzó `kid`, túl sok kulcs,
  túlméretes vagy hibás dokumentum fail-closed. A nyers UTF-8 JSON 32-es mélységkorláttal, comment és
  trailing comma nélkül, minden object-szinten escape-feloldás után is duplikált property
  nélkül kerülhet az IdentityModel parserhez. `UseLastKnownGoodConfiguration=false`, a tokenvalidator
  `ValidateWithLKG=false`, az ismeretlen `kid` viszont valódi manager-refresh-t kér.
- A freshness időbélyeget kizárólag egy hálózatról teljesen beolvasott, parse-olt és szigorúan
  validált discovery+JWKS frissíti; cache-hit nem. A default maximális életkor 600 másodperc.
  Cold állapot, az utolsó refresh hibája és stale konfiguráció readiness `Unhealthy`; sikeres
  újraolvasás után `Healthy`. A max-age után az auth is fail-closed.
- A source-owned hosted prewarm service hitelesített ingress nélkül tölti fel a cold cache-t,
  majd a max-age fele előtt valódi refresh-t kér. Hiba esetén 250 ms-ról induló, legfeljebb
  5 másodperces exponenciális backoffal újrapróbál; egy attempt a két bounded HTTP olvasásból
  számolt, legfeljebb 10 másodperces budgetet kap. Shutdown megszakítja a kérést és delayt.
  Nincs stale fallback: a hiba logolt és readiness `Unhealthy` marad a következő teljes sikerig.
  A freshness, readiness és prewarm saját source-owned órát használ; host által regisztrált
  globális/fagyasztott `TimeProvider` nem lehet trust input.

## Lokális bizonyíték

A `CanonicalOidcEndToEndTests` továbbra is gyors, statikus tokenkészítő/claims
szerződésteszt a valódi ASP.NET `JwtBearer` pipeline-on és tényleges RS256
aláírás-ellenőrzéssel. A korábbi publikus `StaticConfigurationManager`/signing-key resolver
tesztoverride megszűnt: ez a harness is az internal markerrel kötött source-owned fake HTTPS
discovery/JWKS transportot használja. Authorization Code/PKCE továbbra is a külön protokoll-
suite feladata.

A külön `CanonicalOidcProtocolEndToEndTests` három, processzen belüli `TestServer`-t
kapcsol össze, socket és külső hálózat nélkül:

1. fake OIDC authority valódi discovery/JWKS HTTP endpointtal, `/authorize` Authorization
   Code folyamattal és atomikusan egyszer használható `/token` endpointtal;
2. browser helper S256 PKCE-vel, pontos state-tel, valamint az ID token issuer/audience/
   signature/expiry/nonce ellenőrzésével;
3. fake Kernel HTTP authority a production provider pontos service-proof POST/echo
   szerződésével, plusz a valódi module API `AddSpaceOsModuleAuth` composition.

A module oldal nem statikus konfigurációmanagert és nem signing-key resolvert kap: a szigorú
facade belseje a valódi IdentityModel `ConfigurationManager`, valós discovery/JWKS HTTP
olvasással és unknown-`kid` refresh-sel. Ez valós lokális protokoll-E2E, de nem állít élő
Keycloak-, DNS-, TLS-ingress- vagy credential-bizonyítékot.

Lefedett utak:

- Authorization Code + PKCE S256 read-back kontrakt; implicit/password/service-account
  browser fallback tiltása;
- külön Tenant A és Tenant B token, keresztfeloldás nélkül;
- hibás issuer/audience/`azp`, duplikált audience, nem RS256, ismeretlen `kid`
  megtagadása; bounded egyedi multi-audience token elfogadása;
- új kulcs elfogadása, eltávolított régi kulcs megtagadása;
- hiányzó, duplikált vagy hibás JOSE `typ`, illetve külön hiányzó/duplikált/hibás
  Keycloak payload `typ` megtagadása;
- stale membership/projection, downgrade utáni régi token, revoke és deactivate deny;
- azonos verziójú, de eltérő/widened projection tartalom deny;
- verzióváltás után friss token elfogadása;
- rossz subject+tenant online lookup, flat/mixed/multi-entry/raw-object wire token deny;
- hiányzó online provider default-deny.
- hibás PKCE verifier, authorization-code replay, eltérő client/redirect, state és nonce;
- discovery timeout/malformed/substituted issuer, JWKS timeout/malformed, hiányzó vagy
  duplikált `kid`, 8-as tesztlimitet meghaladó kulcskészlet és túlméretes dokumentum;
- duplikált nyers discovery `issuer`/`jwks_uri`, valamint JWK-n belüli duplikált `kid`/`n`;
- hibás `use`/`alg`, gyenge RSA-modulus, hibás exponent, private/symmetric kulcs teljes deny;
  vegyes exact RS256 signing + RSA-OAEP encryption JWKS elfogadása úgy, hogy az encryption
  kulccsal készített RS256 token Kernel-hívás előtt 401;
- valódi A → A+B → B kulcsrotáció, unknown-`kid` refresh és az eltávolított A megtagadása;
- cold/readiness, outage azonnali readiness-deny, cache-hit freshness-nem-hosszabbítás,
  max-age auth-deny, óra-visszaállítás fail-closed és sikeres recovery.
- cold host ingress nélküli prewarm→healthy, kezdeti outage utáni automatikus recovery auth
  traffic nélkül, bounded attempt budget és in-flight shutdown cancellation;
- a production `SocketsHttpHandler` közvetlen policy-tesztje: redirect/proxy/cookie/
  decompression tiltás, connect/header bound és cross-origin deny hálózati hívás előtt.
- az auth-regisztráció után beállított publikus backchannel handler/client hívásszáma nulla,
  attacker JWKS nem válhat source trusttá; internal marker nélkül a fake transport fail-fast;
- késői fabricated configuration manager, signing key(s), resolver, signature validator,
  algoritmus, JOSE `typ`, issuer, audience, lifetime vagy LKG mutáció 401/Kernel-call=0;
- az `Events`/`EventsType`, ugyanazon source eventpéldány callbackjei, token handler/map,
  crypto factory/custom always-valid provider, valamint minden jelenlegi IdentityModel
  validator/retriever/transform delegate késői mutációja 401/Kernel-call=0; a hamis aláírás
  az attacker crypto providerig sem jut el.
- cold/JWKS-gate közbeni egyidejű public alg/type/crypto/token-handler/event/Save* mutáció
  nem érinti a request-private snapshotot: valid current request biztonságosan lefuthat,
  forged token Kernel előtt deny, a következő handler pedig detektálja a tartós driftet;
- raw `role`, `roles`, ClaimTypes.Role URI és `realm_access` GUID ACL authority tokenek
  kriptográfiai elfogadás után is 401/Kernel-call=0 eredményt adnak.

Parancsok:

```powershell
dotnet test tests/SpaceOS.Modules.Hosting.Tests/SpaceOS.Modules.Hosting.Tests.csproj -c Release --no-restore --filter FullyQualifiedName~CanonicalOidcEndToEndTests
dotnet test tests/SpaceOS.Modules.Hosting.Tests/SpaceOS.Modules.Hosting.Tests.csproj -c Release --no-restore --filter FullyQualifiedName~CanonicalOidcProtocolEndToEndTests
dotnet test tests/SpaceOS.Modules.Hosting.Tests/SpaceOS.Modules.Hosting.Tests.csproj -c Release --no-restore --filter FullyQualifiedName~OidcAuthoritySecurityOptionsTests
dotnet test tests/SpaceOS.Modules.Hosting.Tests/SpaceOS.Modules.Hosting.Tests.csproj -c Release --no-restore --filter "FullyQualifiedName~OidcAuthorityPrewarmTests|FullyQualifiedName~OidcBackchannelSecurityTests"
dotnet test tests/SpaceOS.Modules.Hosting.Tests/SpaceOS.Modules.Hosting.Tests.csproj -c Release --no-restore --filter FullyQualifiedName~OidcJwtBearerMutationSafetyTests
dotnet test tests/SpaceOS.Modules.Hosting.Tests/SpaceOS.Modules.Hosting.Tests.csproj -c Release --no-restore --filter FullyQualifiedName!~InterceptorMirrorConformanceTests
```

Eredmény: **34/34** statikus canonical validator teszt, **50/50** valós protokoll-E2E,
**14/14** OIDC security-option/bounds teszt, **7/7** prewarm/backchannel policy teszt,
**53/53** runtime mutation-safety teszt, és összesen **367/367** Docker nélküli
hosting teszt zöld. A teljes,
szűrés nélküli futás további négy meglévő PostgreSQL
interceptor-konformancia tesztje ezen a gépen nem indult el, mert a Testcontainers nem
talált Docker endpointot; ez nem auth regresszió és nem minősül zöld RLS-bizonyítéknak.

Mind a hét modul-host production konfigurációja pontos `Jwt:AuthorizedParty=portal-app`
értéket kapott. A korábban ezen hiány miatt induláskor leálló hostok izolált loopback
smoke-ja **7/7 PASS** (CRM, Kontrolling, HR, Maintenance, QA, EHS, DMS), majd minden
tesztfolyamat leállt és a tesztportok bezárultak. A business route-ok külső modulcsoportja
method-aware authorityt kér: `GET`/`HEAD`/`OPTIONS` esetén `.view|.edit|.admin`, minden
más HTTP metódusnál `.edit|.admin`; a health endpointok a kapun kívül maradnak. Ez
production-composition bizonyíték, de tokenelfogadási bizonyíték még nem, mert az online
provider szándékosan deny-all defaulton marad.

## Ami továbbra sem bizonyított, ezért aktiválási blokkoló

- a Portal valódi böngészőjének deployolt redirect/callback útja és session/cookie viselkedése;
- élő Keycloak discovery/JWKS DNS+TLS hálózati út, outage és valódi kulcsrotáció;
- két valódi tenant/user provisionálás, mapper exact-replace+readback és friss token
  kibocsátása jogosultságváltozás után;
- a human kliens audience-mappereinek readbackje és annak termékdöntése, hogy a
  bounded multi-audience on-behalf-of marad-e, vagy resource-specific/token-exchange
  váltja; ezt a lokális validator nem provisionálja;
- a Kernel-backed `IOnlineIdentityAuthorityStateProvider` hét hostban történő explicit
  bekötése, trust pinje, élő rendelkezésre állási/timeout/cache és audit bizonyítéka; a
  production provider lokális protokolltesztje nem jelent host-aktiválást;
- a Doorstar és Plant lokális fogyasztói szerződése már native nested-only human,
  verziózott online state-re állt át, a Plant Office út pedig külön scoped service-
  principal profilt használ; ezekhez azonban még nincs élő Keycloak/Kernel registry,
  credential-custody vagy közös golden-token integrációs bizonyíték;
- a hét hostban valódi Kernel-backed provider konfiguráció; a csomag bekötés nélkül
  helyesen minden tokent megtagad;
- a DMS/egyéb role-ACL authority tenant-nested, verziózott Kernel projection/readback
  szerződése; addig a strict production profil szándékosan minden legacy role claimet tilt;
- a böngészős hostolás jelenlegi invariánsa same-origin/trusted ingress. Általános CORS
  nincs bekötve, ezért cross-origin használat külön allowlistes middleware-t és preflight
  tesztet igényel;
- TLS ingress, deploy, immutable artifact és aláírt release.

**Verdikt:** a lokális validátor és negatív kontrollok zöld kaput adhatnak a következő
integrációs lépéshez, de önmagukban nem aktiválási bizonyítékok; a rendszer továbbra NO-GO.
