# Ügyfél-onboarding runbook — Keycloak realm + bérlő-rekord

> **Task:** STAB-TENANT-ONBOARDING-RUNBOOK (EPIC-PLATFORM-STABILITY-2026Q3)
> **Készítette:** backend terminál — 2026-07-28
> **Script:** `scripts/Invoke-KeycloakTenantOnboarding.ps1` (+ `scripts/KeycloakOnboarding.psm1`)
> **Előzmény:** a 2026-07-27-i **kézi** provisionálás
> (`docs/knowledge/architecture/LIVE_AUTH_AND_RLS_ASSESSMENT_2026-07-25.md`,
> „Elvégzett provisioning + bizonyíték" szakasz) — ez a runbook azt emeli scriptbe.

> ⚠️ **RETIRED — P0 identity safety hold (2026-08-20).** Ez a runbook és az
> `Invoke-KeycloakTenantOnboarding.ps1` a régi `portal-app` + `tid` + generikus
> realm-role modellt írja le. Nem tartalmaz autoritatív `spaceos_tenants`
> projectiont, membership/projection verziót és revoke-ellenőrzést, scoped
> service-principal registryt vagy exact `azp` kaput. A script minden online és
> `-Apply` módját a profil, hitelesítő adat és hálózat elérése előtt letiltja;
> kizárólag a hálózatmentes `-Offline` történeti elemzés használható. **Sem ezt a
> runbookot, sem az offline eredményét nem szabad tenant-aktiválási bizonyítéknak
> vagy éles/teljes tesztüzemi végrehajtási eljárásnak tekinteni.**

> **Új lokális successor szerződés:**
> `scripts/provision_keycloak_tenant_projection.py` és
> `docs/knowledge/architecture/KEYCLOAK_AUTHORITY_PROJECTION_AND_SERVICE_PRINCIPAL_2026-08-20.md`.
> Ez már nested-only projectiont, verzió/lifecycle kaput és külön Office→Plant
> registryt ír le, de élő apply/readback/token bizonyíték még nincs, ezért az
> alábbi aktiválási tiltást nem oldja fel.

Ez a lépéssor a **világ-gating (ERPSEP-FE-WORLD-GATING) kemény előfeltétele**:
provisionálás nélkül a bejelentkező felhasználó `tenantId = null`, `roles = []`,
`enabledModules = []` értékkel fut, és fail-closed módon üres világ-rácsot lát.

---

## 1. Mit állít be az onboarding (és miért)

| # | Lépés | Nélküle mi történik | Forrás |
|---|---|---|---|
| 1 | `unmanagedAttributePolicy = ADMIN_EDIT` a realm user-profile-ján | a `tid`/`enabled_modules` attribútum **el sem tárolható** (KC24 deklaratív user profile) | LIVE_AUTH §Elvégzett provisioning |
| 2 | `Admin` / `Designer` / `Joiner` realm-szerepek | `HomeScreen.tsx` szerep-alapú rács → **üres képernyő** minden usernek | `src/joinerytech-portal/src/components/layout/HomeScreen.tsx` |
| 3 | `tid` protocol mapper a `portal-app` kliensen | `tenantId = null`, a bérlő-kötött adathívások kontextus nélkül futnak | `AuthContext.tsx` `parseUserClaims` |
| 4 | `enabled_modules` protocol mapper (**multivalued**) | `enabledModules = []` → fail-closed, csak az alap-csempék | `worldAccess.ts` `isWorldEnabled` |
| 5 | Felhasználó + `tid` és `enabled_modules` attribútum + szerep-hozzárendelés | ld. fent | — |
| 6 | Kernel `Tenants` rekord (**külön kapu**, ld. 6. fejezet) | a bérlő nem létezik a Kernelben; az RLS/tenant-kontextus nem old fel | `Migration_0029` |

---

## 2. Előfeltételek

- Windows PowerShell 5.1 (a script `#requires -Version 5.1`, PS7-en is fut).
- A `spaceos` realm és a `portal-app` kliens **már létezik** (a script nem hoz létre
  realmet és klienst — az instance-telepítés dolga).
- Admin-hitelesítés **kizárólag** környezeti változóból vagy `-AdminCredential`-ből:

```powershell
$env:KEYCLOAK_ADMIN_USER = 'admin'
$env:KEYCLOAK_ADMIN_PASSWORD = '<jelszó — soha nem kerül fájlba/gitre>'
```

- **Élő realm base URL-je `/auth` prefixszel megy** (KC24 relatív úttal fut a VPS-en):
  `https://joinerytech.hu/auth`. Prefix nélkül minden hívás 404/AUTH_FAIL.

---

## 3. Onboarding-profil (config)

Minta: `config/tenant-onboarding.sample.json`. A profil **nem tartalmaz titkot**.
Ügyféladatot hordozó profilt ne commitolj — a repóban csak a minta él.

```jsonc
{
  "keycloak": { "baseUrl": "https://joinerytech.hu/auth", "realm": "spaceos",
                "clientId": "portal-app", "adminRealm": "master", "adminClientId": "admin-cli" },
  "claims":   { "tenantIdAttribute": "tid", "modulesAttribute": "enabled_modules",
                "moduleIdFormat": "canonical",     // canonical | legacy | both
                "audiences": ["kernel-api"] },     // 0..n, ld. a záró kiegészítést
  "userProfile": { "unmanagedAttributePolicy": "ADMIN_EDIT" },
  "realmRoles": ["Admin", "Designer", "Joiner"],
  "tenant": { "id": "<GUID>", "name": "...", "tenantType": "Manufacturer",
              "modules": ["joinerytech.cutting", "spaceos.crm"] },
  "users":  [{ "username": "...", "email": "...", "firstName": "...", "lastName": "...",
               "realmRoles": ["Admin"] }]
}
```

- `tenant.modules`: **kanonikus ADR-067 ModuleId** ajánlott; a legacy rövid név
  (`crm`, `cutting`) is elfogadott bemenet, a script normalizálja.
- `users[].emailVerified`: opcionális, alapértelmezés `true`. Admin-provisionált fiók
  ismert céges címmel indul, és egy nem verifikált e-mail `VERIFY_EMAIL` required
  actiont hoz — ugyanaz a belépés-blokkoló osztály, mint a `VERIFY_PROFILE`. A mező
  megjelenik a tervben is, tehát az apply nem mutál olyat, amit a terv nem jelentett be.
- `moduleIdFormat`: a claimbe kerülő formátum. Alap: `canonical` (ADR-067 2. döntés).
  A portál `worldAccess.ts` mindkettőt érti (`LEGACY_TO_CANONICAL` normalizálás),
  így az átállás nem töri a frontendet; `both` az átmeneti, legóvatosabb beállítás.

---

## 4. Történeti offline elemzés (az élő futtatás letiltva)

```powershell
# Az egyetlen engedélyezett mód: profil-ellenőrzés Keycloak nélkül.
# Nem generál futtatható tenant-SQL-t és nem aktiválási bizonyíték.
powershell -File scripts/Invoke-KeycloakTenantOnboarding.ps1 -ProfilePath <profil>.json -Offline

# A következő korábbi élő módok kötelezően exit 2-vel leállnak:
#   <script> -ProfilePath <profil>.json
#   <script> -ProfilePath <profil>.json -VerifyOnly
#   <script> -ProfilePath <profil>.json -Apply
```

Kilépési kódok: **0** = sikeres offline történeti elemzés, **2** = élő/mutációs
mód, használati vagy validációs hiba. A `0` **nem** konvergencia- vagy
aktiválási bizonyíték.

A kapcsoló-kombinációk továbbra is fail-closed: `-Apply`+`-VerifyOnly`,
`-Apply`+`-Offline` és `-VerifyOnly`+`-Offline` hibával áll le. Az egyetlen
érvényes offline futás admin-hitelesítő adatot és ideiglenes jelszót sem fogad el.

Az stdout egy géppel feldolgozható, történeti JSON-elemzést tartalmaz. A
`kernelTenantSql` mező kötelezően `NOT EMITTED` jelzést hordoz; nem DML-artefaktum.

Az offline futás megismételhető, de **nem** konvergencia-ellenőrzés és nem változtat
semmilyen külső állapotot.

---

## 5. [RETIRED] Ideiglenes jelszó

Az `-Apply` út nem érhető el, az offline mód pedig minden `-TemporaryPassword`
paramétert hibával elutasít. Jelszó- vagy meghívó-kezelés csak az új, review-zott
identity provider/projection megvalósítás részeként térhet vissza.

---

## 6. [RETIRED] Kernel bérlő-rekord — külön kapu

Az offline script **nem ír adatbázisba és nem generál SQL-t**. `-KernelSqlPath`
esetén is csak egy `NOT EMITTED` jelzés kerül a fájlba. A korábbi minta alább
történeti magyarázat, nem végrehajtási recept.

```sql
-- NOT EMITTED: legacy tenant identity is not an authoritative projection.
```

### ⚠ A modulkulcs-csapda (ADR-067, élő adaton igazolva)

A Kernel `validate_enabled_modules_for_type()` DB-triggere **kizárólag iparági
modulkulcsokat** ismer TenantType-onként:

| TenantType | Engedett `EnabledModules` | Kötelező |
|---|---|---|
| Manufacturer | door, cabinet, window, cutting, spatial | — |
| PanelCutter | cutting | cutting |
| Trader | trading, delivery | trading |
| Logistics | delivery | delivery |
| Installer | installation | installation |
| EndCustomer | orders | orders |

A **7 ERP-modul** (`spaceos.crm`, `spaceos.hr`, …) **egyike sem szerepel** benne —
beszúrásuk `RAISE EXCEPTION`-nel elhasal. Ezért a script:

- a megvásárolt modulokat a **JWT-claimbe** teszi (UI-hint, ADR-067 7. döntés),
- a Kernel-rekordba **csak a trigger által elfogadott részhalmazt** írja,
- a kimaradó modulokat **`notRepresentableInKernel` néven, indoklással jelenti**
  (nem csendben eldobja).

Ez **ismert, dokumentált rés**, nem script-hiba: a végleges megoldás a Kernel
`EntitledModules`/`EnabledModules` szétválasztása (ADR-067 3. döntés, ERPSEP-05/06).
Amíg az nincs kész, a szerver-oldali jogosultság-kikényszerítés az endpoint-authz +
RLS felelőssége — a claim **nem** jogosultsági forrás.

A `scripts/KeycloakOnboarding.psm1` allowlist-tükre és az ADR-067 alias-tábla
(`docs/knowledge/contracts/module-id-legacy-aliases.json`) szét-csúszását a script
**fail-closed** módon ellenőrzi minden futás elején (ADR-067 6. döntés szerint ezt
később kódgenerátor váltja ki).

---

## 7. Buktatók (mind élő tapasztalatból)

1. **`VERIFY_PROFILE` / „Account is not fully set up".** `firstName`/`lastName`
   nélkül a KC24 required actiont tesz a fiókra, és a belépés megáll. A script ezt
   **validációs Error**-ként kezeli (a fiók létre sem jön hiányos profillal), és egy
   már ráragadt `VERIFY_PROFILE`-t a profilmezők kiírásakor **letakarít**.
2. **`unmanagedAttributePolicy` hiánya.** Enélkül a `tid`/`enabled_modules`
   attribútum írása némán elveszik. Ez az onboarding **első** lépése.
3. **A `multivalued` flag elvesztése** az `enabled_modules` mapperen: a claim egyetlen
   értékre csonkul, a világ-rács hiányosan jelenik meg. A script driftként javítja.
4. **A világ-kompozíció ÉS-kapcsolat.** `worldAccess.ts`: egy világ csak akkor
   látszik, ha **minden** hozzárendelt modul engedélyezett — `production` =
   cutting **+** joinery, `warehouse` = inventory **+** procurement. Fél készlet =
   nem látszó világ. Onboardingkor a világ-igényt modul-párra kell fordítani.
5. **`/auth` prefix** az éles Keycloakon (2. fejezet).
6. **Windows PowerShell 5.1 specifikumok** (a scriptben megoldva, ne írd vissza):
   üres tömb indexelése `Set-StrictMode Latest` alatt dob; `@(<List of PSCustomObject>)`
   `ArgumentException`-t dob; `return Invoke-RestMethod ...` a tömböt nem sorolja ki;
   egyelemű tömb `ConvertTo-Json`-je objektummá lapul (Keycloak 400).
7. **A realm igazságforrása a futó Admin API**, nem a `spaceos_keycloak` DB — az
   éles Keycloak ma **beágyazott H2-n** fut (LIVE_AUTH §ÚJ SÚLYOS LELET), a Postgres
   DB egy korábbi telepítés maradványa. Onboarding előtt/után **mentsd** a
   `/opt/keycloak-app/data/h2/` tartalmát, mert nincs benne a rendszeres Postgres-mentésben.

---

## 8. Éles onboarding — BLOKKOLVA

Ez a runbook nem végrehajtási sorrend többé. Új tenant vagy teljes tesztüzemi
aktiválás csak a P0 identity lánc elkészülte után indulhat: autoritatív
`spaceos_tenants`/permissions/enabled_modules projection exact-replace+readbackkal,
membership-verzió és revoke/deactivate, scoped service-principal registry,
valódi OIDC/JWKS token- és `azp`-ellenőrzés, valamint külön jóváhagyott release
artifact. Addig nincs Keycloak-apply, nincs tenant-DB DML és nincs modul-host
aktiválás ebből a dokumentumból.

### 8.1 Új native projection — lokálisan elkészült, élőben még tiltott

A successor profile exact human claimje
`spaceos_tenants:[{tenant_id,permissions,enabled_modules}]`, egyszerre legfeljebb
egy kiválasztott tenanttal. A többes membership registry nem jelent több
authorityt ugyanabban a tokenben. A natív claim mellett flat `tid`, top-level
`tenant_id`, `permissions` vagy `enabled_modules` tilos. A külön
`spaceos_membership_version` és `spaceos_projection_version` pozitív natív JSON
integer, és csak exact online registry-egyezés engedhet kérést.

A `joinerytech-office-to-plant` gépi identitás külön nested
`spaceos_service_principal` claimet kap exact Plant audience-szel és
tenant/project/station/DPEX scope-pal. A minta disabled és nem tartalmaz
kulcsanyagot. A `keyRotation` kizárólag metaadat + külön custody-evidence hash;
a script nem rotál vagy ad át kulcsot, így ez nem live key-rotation proof.

Biztonságos lokális ellenőrzés:

```powershell
python scripts/provision_keycloak_tenant_projection.py `
  --profile config/keycloak-tenant-projection.sample.json --offline
python -m unittest scripts/test_provision_keycloak_tenant_projection.py -v
```

Nincs implicit online dry-run: `--verify-only` külön explicit választás. A
`--apply` jelenleg safety-disabled és profil-, credential- vagy hálózatolvasás
előtt `exit 2`; nem oldható fel pusztán operátori jóváhagyással. Előbb CAS/ETag
vagy egyenértékű single-writer guard, immutable client-adoption/custody receipt,
teljes realm-client reverse-binding inventory, disposable Keycloak próba és
két-tenant OIDC/JWKS E2E kell. A Plant ADR-0005 és a Doorstar
`v2.0.0-candidate.1` flat/mixed profilja addig külön contract-drift blokk.

---

## 9. Tesztek

- `scripts/test_provision_keycloak_tenant_projection.py` — standard-library
  offline suite: nested-only/selected-tenant wire shape, mixed-claim tiltás,
  monoton verzió, revoke/deactivate/reactivate, exact service scope, key-
  metadata határ, bounded retry és credential/network előtti CLI guard.

- `scripts/Invoke-KeycloakTenantOnboarding.Tests.ps1` — Pester 5.x, 48 teszt
  (alias-tábla, allowlist-tükör, modul-terv, profil-validáció, idempotencia-tervek,
  SQL-emit + injekció-védelem, script-kontraktus). Keycloak nem kell hozzá.

```powershell
Import-Module Pester -MinimumVersion 5.0
Invoke-Pester -Path scripts/Invoke-KeycloakTenantOnboarding.Tests.ps1 -Output Detailed
```

- Végponttól végpontig bizonyíték eldobható Keycloak 24.0.0 konténerrel:
  ld. `docs/tasks/EPIC-PLATFORM-STABILITY-2026Q3/STAB-TENANT-ONBOARDING-RUNBOOK.md`
  („Átadási bizonyíték").

---

## Kiegészítés (2026-07-28, root): kliens-szintű audience-mapper

Élő lelet: a modul-hostok `JWT_AUDIENCE=kernel-api`-t validálnak, de a
`portal-app` kliens tokenje alapból NEM tartalmazza ezt az audience-t →
érvényes token mellett is 401. A fix (kézzel felvéve az élő realmben):
`portal-app` → protocol mapper `kernel-api-audience`
(oidc-audience-mapper, included.custom.audience=kernel-api, access token
claim=true).

### ✅ A script ezt már kezeli (backend, 2026-07-28)

A bővítés elkészült: az audience **config-vezérelt**, mert instance-onként más lehet.
A profilban:

```jsonc
"claims": { "tenantIdAttribute": "tid", "modulesAttribute": "enabled_modules",
            "moduleIdFormat": "canonical",
            "audiences": ["kernel-api"] }     // 0..n; audience-onként külön mapper
```

- Audience-onként **külön mapper** (`<audience>-audience` néven), így egy második
  modul-API felvétele additív változás, nem írja felül az elsőt.
- A mapper **csak az access tokenbe** teszi az audience-t (`id.token.claim=false`):
  a böngészőnek nem mond semmit, viszont fölöslegesen tágítaná a token deklarált célját.
- A terv/apply/verify ugyanazon az úton megy, mint a user-mapperek: hiányzó mapper →
  `Create`, **rossz audience-re mutató** mapper → `Update` (drift-javítás), egyező →
  `NoChange`. Ha a profil nem deklarál audience-t, a script **nem hoz létre** ilyen mappert.
- Bizonyíték (valódi Keycloak 24.0.0, eldobható konténer): apply után a
  password-granttal lekért access token `aud` claimje **`kernel-api, account`** —
  vagyis pontosan az az érték, amit a modul-hostok `JWT_AUDIENCE`-ként validálnak.
  A konténer a mérés után törölve.
