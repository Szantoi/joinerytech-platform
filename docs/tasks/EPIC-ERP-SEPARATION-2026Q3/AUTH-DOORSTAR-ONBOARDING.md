# AUTH-DOORSTAR-ONBOARDING — a Doorstar bevonása a SpaceOS-autentikáció alá

**Kiírva:** 2026-08-07 (root) · **Gábor döntése:** *„egy ügyfél van és biztonságosan akarok
növekedni"* → **(A) üzemeltetői onboarding**, NEM önkiszolgáló regisztráció.
**Státusz:** pending · **Sáv:** backend-security-infra + doorstar-instance + frontend

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

Mivel a Doorstar **nincs kitéve**, ez **nem incidens**. A „biztonságos növekedés" azt jelenti,
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
A `roles.ts` szerep-választója helyett valódi belépés. A capability-függvények
(`canCreateSalesOrder`, …) **maradnak** — csak a szerep forrása változik.
⚠ A műhely-UI-nak **megosztott állomásgépei** vannak: a belépés alakja (állomás-fiók vs.
személyes fiók + állomás-kontextus) **termékdöntés**, nem technikai.

### F5 — Doorstar bérlő-rekord + onboarding lefuttatása *(a meglévő runbookkal)*
Dry-run → végrehajtás → konvergencia-ellenőrzés.

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
