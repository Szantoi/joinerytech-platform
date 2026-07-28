# Ügyfél-onboarding runbook — Keycloak realm + bérlő-rekord

> **Task:** STAB-TENANT-ONBOARDING-RUNBOOK (EPIC-PLATFORM-STABILITY-2026Q3)
> **Készítette:** backend terminál — 2026-07-28
> **Script:** `scripts/Invoke-KeycloakTenantOnboarding.ps1` (+ `scripts/KeycloakOnboarding.psm1`)
> **Előzmény:** a 2026-07-27-i **kézi** provisionálás
> (`docs/knowledge/architecture/LIVE_AUTH_AND_RLS_ASSESSMENT_2026-07-25.md`,
> „Elvégzett provisioning + bizonyíték" szakasz) — ez a runbook azt emeli scriptbe.

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

## 4. Futtatás

```powershell
# 0) Profil-ellenőrzés Keycloak nélkül (CI-ben is futtatható)
powershell -File scripts/Invoke-KeycloakTenantOnboarding.ps1 -ProfilePath <profil>.json -Offline

# 1) Dry-run: mit CSINÁLNA (alapértelmezés — mutáció nélkül)
powershell -File scripts/Invoke-KeycloakTenantOnboarding.ps1 -ProfilePath <profil>.json `
  -SummaryPath artifacts/onboarding-dryrun.json -KernelSqlPath artifacts/kernel-tenant.sql

# 2) Végrehajtás (a futás végén automatikus visszaellenőrzés)
powershell -File scripts/Invoke-KeycloakTenantOnboarding.ps1 -ProfilePath <profil>.json -Apply

# 3) Konvergencia-ellenőrzés bármikor (read-only)
powershell -File scripts/Invoke-KeycloakTenantOnboarding.ps1 -ProfilePath <profil>.json -VerifyOnly
```

Kilépési kódok: **0** = konvergált (nincs teendő / az `-Apply` sikeres és
visszaellenőrzött), **1** = van függő eltérés (dry-run) vagy a verify bukott,
**2** = használati/validációs/eszköz-hiba (ilyenkor **egyetlen Keycloak-mutáció sem** történt).

A három kapcsoló-pár kizárja egymást: `-Apply`+`-VerifyOnly`, `-Apply`+`-Offline`,
`-VerifyOnly`+`-Offline`. Az utolsó azért, mert egy offline futás nem tud realmet
ellenőrizni — enélkül a `-VerifyOnly -Offline` exit 0-t adna Keycloak-érintés nélkül,
amit egy CI-hívó konvergenciának olvasna.

Az stdout mindig pontosan egy JSON-dokumentumot is tartalmaz (terv, claim-értékek,
Kernel-SQL, validációs findingek) — géppel feldolgozható, `-SummaryPath`-tal fájlba is megy.

**Idempotencia:** minden lépés *megfigyel → összehasonlít → csak eltérésre hat*.
Egy megszakadt futás egyszerűen újrafuttatható; a második futás `PendingCount = 0`.

---

## 5. Ideiglenes jelszó

```powershell
$p = Read-Host -AsSecureString 'Ideiglenes jelszó'
powershell -File ... -Apply -TemporaryPassword $p
```

Csak az **ebben a futásban létrehozott** felhasználókra kerül rá, `temporary = true`
(a KC az első belépéskor cserét kényszerít). A jelszó soha nem kerül logba, summarybe
vagy fájlba. Meglévő fiók jelszavát a script **nem** írja felül.

---

## 6. Kernel bérlő-rekord — külön kapu

A script **nem ír adatbázisba**. Helyette allowlist-validált, idempotens SQL-t emit-el
(`-KernelSqlPath`), amit **csak Gábor kimondott jóváhagyásával** szabad lefuttatni.
Ha a TenantType kötelező modulja hiányzik a megvásárolt készletből, az artefaktum
**szándékosan nem futtatható** (indoklást tartalmazó, `INSERT` nélküli blokk) — a
trigger úgyis elutasítaná, és egy biztosan elhasaló SQL a jóváhagyási kapu mögött
csak félrevezető éles hibát okozna. Ilyenkor a profil `tenant.modules` mezőjét kell
javítani, nem a fájlt átírni.

```sql
INSERT INTO "Tenants" ("Id","Name","TenantType","EnabledModules","IsArchived")
VALUES ('<GUID>','<Név>','Manufacturer',ARRAY['cutting','door'],false)
ON CONFLICT ("Id") DO NOTHING;
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

## 8. Éles onboarding — sorrend és kapuk

1. Profil elkészítése (ügyféladat, nem repóba) → `-Offline` ellenőrzés.
2. **Keycloak H2 adatfájl mentése** (7.7 pont).
3. `-SummaryPath` + `-KernelSqlPath` dry-run az éles realm ellen (read-only) →
   a terv bemutatása.
4. **Gábor-kapu** → `-Apply`.
5. A verify automatikusan lefut; ha bukik, a hiányzó lépések tételesen kiírásra kerülnek.
6. **Modul-host policy csak ezután kapcsolható be.** A kiadott access tokenben a
   kiválasztott tenant `spaceos_tenants` entryjének `enabled_modules` listája kizárólag
   kanonikus ADR-067 ModuleId-ket tartalmazhat (pl. `spaceos.maintenance`). A legacy
   rövid kulcsos Kernel-entry vagy claim szándékosan **403** a
   `RequireEnabledModule` policy alatt; előbb a Keycloak-claimet kell kanonizálni,
   utána lehet endpoint-policyt élesíteni.
7. **Gábor-kapu** → a Kernel-SQL futtatása a `spaceos` DB-n (port 5433).
8. Belépés-ellenőrzés: a token tartalmazza a `tid`-et, az `enabled_modules`-t és a
   `realm_access.roles`-ban a portál-szerepet.

---

## 9. Tesztek

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
