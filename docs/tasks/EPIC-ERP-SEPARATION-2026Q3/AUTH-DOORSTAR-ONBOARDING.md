# AUTH-DOORSTAR-ONBOARDING — a Doorstar bevonása a SpaceOS-autentikáció alá

**Kiírva:** 2026-08-07 (root) · **Gábor döntése:** *„egy ügyfél van és biztonságosan akarok
növekedni"* → **(A) üzemeltetői onboarding**, NEM önkiszolgáló regisztráció.
**Státusz:** pending · **Sáv:** backend-security-infra (**csak platform-oldal**)

> ⚠ **HATÓKÖR-SZŰKÍTÉS 2026-08-07 (root, mérés után).** Az instance-oldali munkát **már**
> lefedi a `doorstar-instance/docs/projects/doorstar-spaceos-convergence/DSCONV-03-AUTH-TENANT-POLICY.md`
> (**P0**), és részletesebben, mint ahogy én megírtam: kimondja, hogy az `X-Role`/`X-Station`
> ne legyen jogosultsági forrás, hogy **az állomás-tagság szerveroldali, tenant-scope-os adat**
> legyen, és a tesztterve tartalmazza a *„valid user, hiányzó station membership → 403"* kaput,
> amit én kötelezőnek neveztem. **Nem duplikálom.**
>
> **Ez a task ezért CSAK a platform tartozását fedi**, amit a DSCONV-03 fogyaszt:
> *„Fogyaszd a platform gate-ben rögzített auth/tenant contractot."* Azaz: a **szerződés**,
> az **audience-mapper**, az **identity-modul gazdába vétele** és a **Doorstar onboarding**
> lefuttatása. Az F3/F4 alább **referencia**, nem kiírás — a végrehajtás a DSCONV-03-é.
>
> A `DSCONV-03` **`DSCONV-GATE-SECURITY`-n blokkolt**, azt pedig **kizárólag root/conductor**
> zárhatja (ld. `PLATFORM-GATES.md`). **A platform tehát nem a Doorstar mellett dolgozik,
> hanem előtte áll.**

---

## Miért most, és miért nem sürgősségi

**Mérve 2026-08-07:**

```
doorstar-instance:  JWT 0 fajl | jelszo-hash 0 | cookie 0 | localStorage 3
a tenyleges auth :  X-Role + X-Station HEADEREK, amiket a frontend kuld
audit-identitas  :  X-Principal header, fallback "legacy-role:<szerep>"
szerepkorok      :  9 stabil + 2 legacy (vezeto, allomas)
telepitve a VPS-en: NINCS (11 spaceos-service fut, egyik sem doorstar)
```

A `production-service/src/middleware/requester.ts` **maga mondja ki**, hogy ez ideiglenes:
*„Temporary role guard for the login-less shop-floor UI … until real authentication replaces
these headers."* ⇒ **nem architektúra-fordítás, hanem egy vállalt ígéret beváltása.**

**Ez ugyanaz a hibaosztály, amit a platformon már megjavítottunk:** az `X-Tenant-Id`
hitelesítetlen header volt; az ADR-061/062 a JWT `tid` claimjére cserélte, hamisított header →
403. **A minta kész, csak át kell hozni egy másik futtatókörnyezetbe.**

⛔ **HELYESBÍTÉS 2026-08-07 este: a Doorstar KI VAN TÉVE.** A korábbi állításom
(*„nincs telepítve a VPS-en"*) **hibás volt** — a `systemctl | grep spaceos` szűrőm zárta ki,
mert a service neve `doorstar-production-service.service`. Mérve:

```
doorstar-production-service.service   ACTIVE (running) 2026-07-22 ota -- 2 HETE
  /usr/bin/node dist/server.js   *:4610   nginx: https://doorstar.asztalostech.hu (TLS)
  /api/production/orders  ->  HTTP 200 HITELESITES NELKUL a nyilt internetrol
     (418 bajt, mezok: done/id/label/position -> munkafolyamat-szerkezet, NEM ugyfeladat)
```

**Személyesadat-szivárgás ezen az úton nincs bizonyítva.** A súlyos rész az **írási út**:
az `X-Role`/`X-Station` kliens-oldali header, és a `tasks.ts` **négy helyen 403-mal kapuz**
rájuk — egy hamisított `X-Role: administrator` az internetről **elfogadódna**.
**Ezt NEM teszteltem**, mert éles adatot módosítana.

### ⚠ ÚJRA-HELYESBÍTVE — Gábor, ugyanaznap

> *„Nincs telepítve a Doorstar, az egy **régi pilot**, amiben megmutattam, mi lehet majd.”*

**A mérés tényei állnak** (fut, publikus, `/api/production/orders` 200 auth nélkül), **a
következtetésem viszont túlzott volt**: ez **demó, nem éles rendszer** → **nem incidens**,
és a határidő **nem most**. Mérve: `/opt/doorstar/src/production-service`, commit
`1ba2647` (2026-07-22) = **16 napos pilot**, külön fában, nem a termék. Az adat tesztadat.

⇒ **A `DSCONV-03` sürgőssége marad a korábbi: a valódi telepítés előtt.**

**Ami nyitott kérdés marad (Gábor-döntés):** egy 16 napos, felügyelet nélküli pilot ül egy
publikus hostnéven TLS-sel, auth nélkül, header-alapú szerepkörrel. **Maradjon** (demó,
amit mutatsz), **kapjon védelmet** (basic auth / IP-lista / demók között leállítva), vagy
**vonuljon vissza**?

> ⚠ **Önkritika:** ma **kétszer lőttem túl** — reggel visszavontam egy **igaz** leletet, este
> egy **demót** minősítettem élesnek. A helyes lépés mindkétszer ugyanaz lett volna:
> **a mért tényt tartani, a következtetést szűkíteni.** A „biztonságos növekedés" azt jelenti,
hogy a **második ügyfél előtt** legyen kész — mert a header-alapú szerepkör egy bérlős
környezetben még elviselhető, kettőnél már **kereszt-bérlős** kockázat.

## Ami a platformon KÉSZ és átvehető

```
SpaceOS.Modules.Hosting : AddSpaceOsModuleAuth + AddSpaceOsModuleTenancy
bekotve                 : hr · ehs · dms · qa · maintenance · kontrolling · scheduling
onboarding              : docs/knowledge/deployment/TENANT_ONBOARDING_RUNBOOK.md
                          Keycloak realm + berlo-rekord, config-profil, dry-run,
                          konvergencia-ellenorzes, ideiglenes jelszo, modulkulcs-csapda
```

## ⛔ Négy akadály — ezek a task valódi tartalma

| # | Akadály | Miért nem triviális |
|---|---|---|
| 1 | **Nyelvi határ** | a platform auth-csomagja **.NET**, a Doorstar `production-service`-e **Node/Express/TS** → az `AddSpaceOsModuleAuth` **nem húzható be**; Node-oldali JWT-validáló middleware kell, ami **ugyanazt a szerződést** teljesíti |
| 2 | **Audience-mapper hiánya** | már mérve: password-grant működik, de **audience-mapper nélkül minden modul-API 401** — ez a Doorstart az első napon fejbe vágná |
| 3 | **Szerepkör-réteg** | a 9 Doorstar-szerep **instance-szintű** (ADR-069 D2, 3. réteg) → **nem mehet a platform-magba**; a platform hitelesített identitást + bérlőt ad, a leképezés Doorstar-oldalon marad |
| 4 | **`spaceos-modules-identity` gazdátlan** | fut a VPS-en service-ként, de a platform-fában **nincs követve** (üres mappa, nincs a `.gitmodules`-ban) — ugyanaz a helyzet, amit a schedulingnél 2026-08-07-en lezártunk |

## Fázisok — kötelező sorrenddel

### F0 — az identity-modul gazdába vétele *(előfeltétel, kicsi)*
A `spaceos-modules-identity` bekapcsolása a sziget-fába (gitlink), vagy kimondása, hogy
retire-jelölt. **Amíg gazdátlan, nem építünk rá.**

### F1 — a szerződés kimondása *(ADR, root)*
Egy rövid ADR, ami rögzíti: issuer, audience, a `tid` claim → bérlő leképezés, a fail-closed
viselkedés, a hibaformátum, és hogy **a szerepkör-leképezés az instance-rétegé**.
**Nyelv-független szerződés**, hogy .NET és Node is teljesíthesse.

### F2 — audience-mapper az éles realmban *(infra, Gábor-kapu)*
A 2. akadály feloldása. **Enélkül az F3 az első kérésnél 401-et ad.**

### F3 — Node-oldali JWT-middleware *(doorstar-instance)*
A `requester.ts` lecserélése: `X-Role`/`X-Station`/`X-Principal` helyett **validált JWT**.
- **Átmenet:** a header-út **konfigból** kapcsolható, alapértelmezésben **KI**, és
  Developmenten kívül **indulásnál dob** (a kontrolling `DevelopmentAuthentication`-precedens).
- **Kapu:** teszt, ami bizonyítja, hogy **hamisított header → 403**, nem „szerep=reader".

### F4 — a frontend belépés *(uzemi-tabla-web)*

**GÁBOR DÖNTÉSE 2026-08-07: mindenkinek SZEMÉLYES fiókja legyen** — *„a valódi audit
nyomvonal"*. Az állomás-fiók (a gép lép be) elvetve.

A `roles.ts` szerep-választója helyett valódi belépés. A capability-függvények
(`canCreateSalesOrder`, …) **maradnak** — csak a szerep **forrása** változik.
Az `X-Principal` fallback (`legacy-role:<szerep>`) megszűnik: minden audit-sor **valódi
személyt** kap.

#### ⛔ A döntés helyes, de ÖNMAGÁBAN NEM ELÉG — mérve

```
tasks.ts:186 / 190 / 221 / 224   ->  403 "not_your_station"
                                     (a 221/224 ZAROLT tranzakcion belul)
```

**Az állomás nem szűrő, hanem JOGOSULTSÁG.** Az `X-Station` — amit szintén a frontend küld —
ma **kapu** írási műveletek felett. Személyes fiókkal a *„ki"* megoldódik, de a *„hol"*
nyitva marad: a header átírásával bárki **más állomás feladatát zárhatná le a saját nevén**.

> **Ez rontaná az audit-nyomvonalat, nem javítaná:** igaz nevet rögzítene hamis állomáshoz —
> ami rosszabb, mint a mai őszintén névtelen `legacy-role:` bejegyzés, mert **hihető**.

**Ezért az állomásnak is hitelesítettnek kell lennie.** Három út, ajánlással:

| út | alak | értékelés |
|---|---|---|
| **(1) állomás mint aláírt claim** ⭐ | a felhasználó belépéskor **állomást választ**, a session ezt **aláírt claimként** hordozza | **Ajánlott.** Kérésenként nem cserélhető; illik a személyes fiókhoz; a választás naplózható. Kis Keycloak-munka. |
| (2) állomás-hozzárendelés a felhasználóhoz | a jogosultság mondja meg, mely állomás(oko)n dolgozhat | Merev: a műhelyben a dolgozók váltanak állomást; adminisztrációs terhet ad. |
| (3) eszköz-identitás | a gépnek saját hitelesítője van (kliens-tanúsítvány/eszköz-token) | A legerősebb, de eszközparkot és tanúsítvány-életciklust kér. **Későbbre.** |

**Kötelező kapu az F4-hez:** teszt, ami bizonyítja, hogy egy **érvényes tokennel**, de
**idegen állomásra** küldött írás **403** — ne csak az legyen tesztelve, hogy token nélkül 403.

#### Műhely-ergonómia — a döntés ára, amit kezelni kell

Megosztott gépen a személyes belépés súrlódást hoz (kesztyű, piszkos kéz, gyakori váltás).
Enélkül a dolgozók **egyetlen közös fiókot** fognak használni, és az audit-nyomvonal
**papíron** lesz meg, a valóságban nem. Kezelendő:
- **rövid, tétlenség-alapú automatikus kiléptetés** (az állomás ne maradjon nyitva);
- **gyors újrabelépés** (személyes PIN vagy NFC-kártya a jelszó helyett — **személyenként**,
  nem állomásonként);
- a belépés **ne szakítsa meg** a folyamatban lévő munkát.

✅ **Platform `/shopfloor` P0 biztonsági kapu (2026-08-20):** a korábbi közös
`PIN=1234` kliensoldali mock út kikerült a kanonikus route/import láncból. A
`/shopfloor` és az autentikált `/w/shopfloor` is explicit fail-closed képernyőt
mutat. Újraaktiválás csak személyes OIDC, szerveroldali operátor–munkaállomás
jogosultság és regisztrált eszközhöz kötés után lehetséges; ez a task F4
személyes identitás-követelményével így nem kerül ellentmondásba.

### F5 — Doorstar bérlő-rekord + onboarding *(BLOKKOLVA a kanonikus providerig)*

A régi `Invoke-KeycloakTenantOnboarding.ps1` runbook `portal-app` + `tid` +
realm-role modellje 2026-08-20-tól retired és csak hálózatmentes történeti
elemzésre használható. Nem futtatható vele dry-run, apply vagy konvergencia-
ellenőrzés. Az új végrehajtási kapu: autoritatív `spaceos_tenants`/permissions/
enabled_modules projection exact-replace+readbackkal, membership-verzió és
revoke/deactivate, scoped service principal registry, valamint valódi OIDC/JWKS
E2E bizonyíték. Addig nincs tenant-aktiválás vagy DB-művelet.

2026-08-20-án elkészült ennek a providernek a lokális, config-vezérelt
successor szerződése (`provision_keycloak_tenant_projection.py`): native
nested-only selected-tenant projection, monoton membership/projection verzió,
revoke/deactivate/reactivate kapu és külön Office→Plant registry. Ez nem oldja
fel az F5 blokkot: élő Keycloak readback/apply, friss token, online Kernel
version-check, key-custody/rotation proof és a Plant/Doorstar flat-profile drift
lezárása továbbra is hiányzik.

## Végrehajtási napló

| Dátum | Szelet | Artefaktum | Ellenőrzés | Tudatosan nem végzett művelet |
|---|---|---|---|---|
| 2026-08-11 | Keycloak kliens- és JWT-mapper előkészítés | `scripts/provision_doormanufacturing_keycloak_clients.py`, `config/doormanufacturing-keycloak-clients.sample.json` | offline profile-validáció + 25 Python unit teszt; publikus issuer, loopback-only admin API és Keycloak brief-válasz false-normalizáció külön validálva | nincs élő Keycloak-hívás, apply, user-, tenant-, szerep- vagy DB-művelet; a confidential secretet a script nem kéri le és nem írja ki |
| 2026-08-20 | Portal/shopfloor P0 fail-closed + legacy onboarding hold | `src/joinerytech-portal/src/App.tsx`, `ShopFloorAccessUnavailablePage.tsx`, `OperatorLoginScreen.tsx`, `scripts/Invoke-KeycloakTenantOnboarding.ps1` | 92 célzott Portal Vitest + 32 provisioning Python teszt zöld; friss Portal production build és artifact-szintű kiosk/import scan zöld | nincs Keycloak-hívás/apply, tenant- vagy DB-művelet, deploy, commit, aláírás vagy aktiválás |
| 2026-08-20 | Immutable auth-release kapu audit | `scripts/test_verify_doormanufacturing_auth_contract.py` | **NEM ZÖLD:** 1 failure + 1 error, közös ok: `Doorstar validator hash drift` | nincs checksum-átírás, intake- vagy release-módosítás; a pin frissítése és aláírt artifact kiadása release-owner jóváhagyást kér |
| 2026-08-20 | Native Keycloak authority projection + Office→Plant registry lokális, fail-closed szerződés | `scripts/keycloak_provisioning_transport.py`, `scripts/provision_keycloak_tenant_projection.py`, `config/keycloak-tenant-projection.sample.json`, `KEYCLOAK_AUTHORITY_PROJECTION_AND_SERVICE_PRINCIPAL_2026-08-20.md` | 55 célzott és 87/87 összes provisioning Python teszt; nested-only selected tenant, strict JSON, no-proxy/no-redirect exact loopback és admin-response secret stripping. Adverzariális review után `--apply` profil/credential/network előtt hard-disabled, verify mindig reverse-inventory blokkos | nincs Keycloak/VPS/DB/network/apply, tokenkiadás, kulcsrotáció vagy release-pin módosítás; CAS/adoption/custody/reverse-binding hiány miatt `mutationSafetyEvidence=false`, továbbra NO-GO |
| 2026-08-20 | Portal + közös Hosting native OIDC/JWKS fogyasztói szerződés | `AuthContext.tsx`, `CanonicalOidcAccessTokenValidator.cs`, `CanonicalOidcEndToEndTests.cs`, `AUTH-OIDC-JWKS-LOCAL-E2E.md` | Portal claim-mátrix 29/29; valódi ASP.NET JwtBearer + lokális RS256/JWKS kulcsgyűrű 26/26; teljes Docker nélküli Hosting 118/118. Exact issuer/aud/azp, JOSE `typ`, Keycloak payload `typ=Bearer`, egy native tenant, két pozitív verzió és online status/content/revoke check | nincs élő browser Code+PKCE, Keycloak discovery/JWKS/rotation, hostonkénti online provider/config, deploy vagy aktiválás; a négy Docker/Testcontainers RLS teszt nem futott, ezért ez nem live RLS-bizonyíték |

## Átvételi feltételek

- **Hamisított/hiányzó token → 403**, teszttel bizonyítva, **nem** csendes visszaesés szerepre.
- A header-út **mérve** ki van kapcsolva élesben (nem „a config szerint", hanem futó
  viselkedésből).
- A 9 Doorstar-szerep **nem jelenik meg** a platform-magban — a semlegességi kapu
  (`ERPSEP-INSTANCE-NEUTRALITY-GATE`) erre is álljon.
- Az onboarding **dry-run + konvergencia-ellenőrzése** zölden fut a Doorstar profillal.

## Amit ez a task NEM tartalmaz

**Önkiszolgáló regisztráció (B).** Gábor döntése szerint most **(A)**. A (B) külön ADR-t kér:
realm-politika, e-mail-visszaigazolás, jóváhagyási folyamat, bérlő-hozzárendelés.
