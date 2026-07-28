# STAB-TENANT-ONBOARDING-RUNBOOK — ügyfél-onboarding scriptbe és runbookba

- **Epic:** EPIC-PLATFORM-STABILITY-2026Q3 · **Mérföldkő:** S2-security-hardening
- **Szerep:** infra-security · **Prioritás:** P1
- **Státusz:** **root-review APPROVED** (2026-07-28) — a kötelező P1-utókövetés és
  mind az 5 opcionális P2 javítva, ld. „Root-review utókövetés". A `done`-t az EPICS-ben
  a root állítja.
- **Kiosztva:** `terminals/backend/inbox/2026-07-28_001_root-kickoff.md` (root)
- **Forrás:** [`LIVE_AUTH_AND_RLS_ASSESSMENT_2026-07-25.md`](../../knowledge/architecture/LIVE_AUTH_AND_RLS_ASSESSMENT_2026-07-25.md)
  („Elvégzett provisioning + bizonyíték", 2026-07-27) + [ADR-067](../../knowledge/adr/ADR-067-module-catalog-and-lifecycle.md)
- **Mutációs határ:** `scripts/`, `config/`, `docs/knowledge/deployment/`.
  Kernel-kód, modul-repók, portál: **nem érintve**. Éles realm/DB: **nem érintve**.

## A feladat

A 2026-07-27-i kézi Keycloak-provisionálást (realm-szerepek, `tid` +
`enabled_modules` mapper, bérlő-rekord, profil-mezők) idempotens scriptbe és
runbookba emelni. Ez az ERPSEP-FE-WORLD-GATING kemény előfeltétele.

## Amit leszállítottam

| Fájl | Mi ez |
|---|---|
| `scripts/KeycloakOnboarding.psm1` | tiszta döntési logika (hálózat és mutáció nélkül): ADR-067 alias-tábla betöltés, Kernel-allowlist tükör + drift-őr, profil-validáció, modul-terv, SQL-emit, desired-vs-observed terv-függvények |
| `scripts/Invoke-KeycloakTenantOnboarding.ps1` | Keycloak Admin API orchestráció: `-Offline` / dry-run (alap) / `-Apply` / `-VerifyOnly`, JSON-summary, kilépési kódok |
| `scripts/Invoke-KeycloakTenantOnboarding.Tests.ps1` | Pester 5.x, **34 teszt**, Keycloak nélkül futtatható |
| `config/tenant-onboarding.sample.json` | config-vezérelt onboarding-profil (titok nélkül) |
| `docs/knowledge/deployment/TENANT_ONBOARDING_RUNBOOK.md` | a runbook: lépések, kapuk, buktatók, éles sorrend |
| `scripts/README.md` | script-szekció a repo-konvenció szerint |

### Tervezési döntések (indoklással)

1. **Dry-run az alapértelmezés**, mutációhoz explicit `-Apply` kell; az éles realm
   ellen ezen felül Gábor-kapu (a runbook 8. fejezete rögzíti a sorrendet).
2. **A Kernel bérlő-rekordot a script NEM írja.** DB-mutáció külön kapu, ezért
   allowlist-validált, idempotens (`ON CONFLICT DO NOTHING`) SQL-t emit-el
   `-KernelSqlPath`-ra. Így a runbook DB-lépése emberi jóváhagyás mögött marad.
3. **Tiszta logika külön modulban** (`.psm1`) — ugyanaz a minta, mint a
   `TestcontainersHygiene.psm1`-nél: a teljes döntési felület unit-tesztelhető
   Keycloak nélkül (készítő ≠ ellenőr elv, QUALITY §8).
4. **Idempotencia mint alapelv:** minden lépés *megfigyel → összehasonlít → csak
   eltérésre hat*; a futás végén automatikus visszaellenőrzés (újratervezés),
   `PendingCount = 0` a konvergencia bizonyítéka.
5. **Titkok:** admin-hitelesítés csak env-ből/`-AdminCredential`-ből; a jelszó,
   a token és az ideiglenes jelszó soha nem kerül konzolra, summarybe, fájlba.

### A legacy→kanonikus modul-térkép (a task kifejezett elvárása)

A modul-térkép **nem másolat**: a script az ADR-067 szerződésfájlt
(`docs/knowledge/contracts/module-id-legacy-aliases.json`) tölti be, és a Kernel
`validate_enabled_modules_for_type()` allowlist-tükrét minden futás elején
**fail-closed** összeveti vele (drift → futás megáll, mutáció nélkül).

A modul-terv szétválasztja a két világot:

- **JWT-claim** (`enabled_modules`): a megvásárolt modulok, kanonikus ID-vel
  (`moduleIdFormat: canonical | legacy | both` configból — a portál
  `worldAccess.ts` mindkét formát normalizálja, így az átállás nem törik).
- **Kernel `Tenants.EnabledModules`**: csak a trigger által elfogadott iparági
  részhalmaz. A kimaradó ERP-modulokat a script `notRepresentableInKernel`
  néven, tételes indoklással jelenti — **nem** dobja el csendben.

Ez az ADR-067-ben rögzített, élő adaton igazolt rés; a végleges megoldás az
`EntitledModules`/`EnabledModules` szétválasztása (ERPSEP-05/06). A runbook 6.
fejezete ezt kimondja, hogy az onboardingot végző ne script-hibának higgye.

### A dokumentált buktatók kezelése

| Buktató | Kezelés | Bizonyíték |
|---|---|---|
| `VERIFY_PROFILE` — hiányzó `firstName`/`lastName` → „Account is not fully set up" | validációs **Error** (a fiók létre sem jön hiányosan) + a ráragadt required action **letakarítása** | Pester + élő KC24 (lent, 3. blokk) |
| `unmanagedAttributePolicy` hiánya → az attribútum némán elveszik | az onboarding **első** lépése, driftként is javítva | élő KC24 (1. blokk) |
| Kernel-trigger modulkulcs-restrikció | legacy→kanonikus térkép + `notRepresentableInKernel` jelentés | Pester + élő futás |
| `multivalued` flag elvesztése az `enabled_modules` mapperen | drift-észlelés és javítás | élő KC24 (3. blokk) |
| Világ-kompozíció ÉS-kapcsolat (`production` = cutting+joinery) | runbook 7.4 — a világ-igényt modul-párra kell fordítani | `worldAccess.ts:29` |

---

## Átadási bizonyíték

### 1. Unit/logikai tesztek — 34/34 zöld

```
Invoke-Pester -Path scripts/Invoke-KeycloakTenantOnboarding.Tests.ps1
Tests Passed: 34, Failed: 0, Skipped: 0    (Pester 5.6.1, Windows PowerShell 5.1.26100)
```

Lefedve: alias-tábla mindkét iránya, allowlist-tükör drift-őre, modul-terv
(ERP-modul a claimben de nem a Kernel-rekordban, legacy bemenet normalizálása,
`legacy`/`both` claim-formátum, TenantType-kötelező modul hiánya, ismeretlen
modul), profil-validáció (VERIFY_PROFILE, TenantType, GUID, nem deklarált szerep,
üres modulkészlet, plain-http figyelmeztetés), idempotencia-tervek (második futás
= 0 teendő), SQL-emit (aposztróf-escape, injekció-alakú kulcs elutasítása),
script-kontraktus (`-Apply` + `-Offline` kizárás, offline futás exit 0,
validációs bukás exit 2 **Keycloak-hívás nélkül**).

### 2. Végponttól végpontig — valódi Keycloak 24.0.0 (eldobható konténer)

`quay.io/keycloak/keycloak:24.0.0`, `localhost:8081`, friss `spaceos` realm +
`portal-app` kliens. **A kiinduló állapot megegyezett az éles 2026-07-27-ivel:**

```json
{ "realmRoles": ["default-roles-spaceos","offline_access","uma_authorization"],
  "portalAppMapperCount": 1, "unmanagedAttributePolicy": "<none>" }
```

**Dry-run (exit 1 — van függő eltérés, mutáció nélkül):** pontosan a kézi
lépéssort tervezte — policy `'' -> 'ADMIN_EDIT'`, 3 realm-szerep, `tid` és
`enabled_modules` mapper, user + 2 attribútum + szerep-hozzárendelés.

**`-Apply` (exit 0):** minden lépés végrehajtva, majd
`[+] Verification: realm converged (a re-run would change nothing).`

**Idempotencia (újrafuttatott dry-run, exit 0):** mind a 10 terv-elem `NoChange`.

**Valódi token a provisionált fiókkal** (a harness szimulálta az első belépéskori
jelszócserét, majd password-grant + JWT-dekódolás):

```json
{ "preferred_username": "anna.kovacs",
  "tid": "11111111-2222-4333-8444-555555555555",
  "enabled_modules": ["spaceos.crm","joinerytech.door","spaceos.dms","joinerytech.cutting"],
  "portal_roles": ["Admin"] }
```

Ez pontosan az, amit az `AuthContext.parseUserClaims` elvár
(`tid` → `tenantId`, `enabled_modules` → `enabledModules`, `realm_access.roles`
szűrve Admin/Designer/Joiner-re).

### 3. Drift-javítás — három szándékosan elrontott állapot

A realmet elrontottam (`VERIFY_PROFILE` a fiókra, az `enabled_modules` mapper
`multivalued: false`-ra, a `Designer` szerep törölve), és a profil
modulkészletét is módosítottam (`spaceos.dms` → `spaceos.hr`). Egyetlen `-Apply`:

```
[ ] Create   realm-role/Designer
[ ] Update   protocol-mapper/enabled_modules -- config.multivalued: 'false' -> 'true'
[ ] Update   user-attribute/anna.kovacs/enabled_modules -- [...spaceos.dms] -> [...spaceos.hr]
[ ] Update   required-action/anna.kovacs/VERIFY_PROFILE -- Stale VERIFY_PROFILE blocks login...
[+] Verification: realm converged (a re-run would change nothing).
```

Utólagos realm-állapot: `requiredActions: []`, `multivalued: "true"`,
`designerRoleExists: true`, a claim az új modulkészlettel — a token újra lekérve
`spaceos.hr`-t tartalmazott, `spaceos.dms`-t nem. **A többi elem érintetlen maradt**
(a nem-drift lépések `NoChange`-ként futottak át).

### 4. Kernel-SQL artefaktum (emit-elve, NEM futtatva)

```sql
INSERT INTO "Tenants" ("Id","Name","TenantType","EnabledModules","IsArchived")
VALUES ('11111111-2222-4333-8444-555555555555','JoineryTech Kft. (demo)','Manufacturer',ARRAY['cutting','door'],false)
ON CONFLICT ("Id") DO NOTHING;
```

Summary-kivonat: `kernelEnabledModules = cutting,door`,
`notRepresentableInKernel = spaceos.crm, spaceos.hr` (indoklással),
`pendingCount = 0`.

**A konténer a mérés után törölve** (`docker rm -f jt-kc-onboarding-test`);
`doorstar-production-db` és minden más konténer érintetlen.

### Menet közben javított saját hibák (Windows PowerShell 5.1)

Négy PS 5.1-specifikus hiba derült ki a valódi futáson, mind javítva és
kommentben rögzítve, hogy ne írja vissza senki:
üres tömb indexelése `Set-StrictMode Latest` alatt dob (`Select-Object -First 1`);
`@(<List of PSCustomObject>)` `ArgumentException`-t dob (`.ToArray()`);
`return Invoke-RestMethod ...` a tömböt nem sorolja ki (előbb változóba);
egyelemű tömb `ConvertTo-Json`-je objektummá lapul → Keycloak 400 (`-AsArray` nincs PS5.1-en).

---

---

## Root-review utókövetés (2026-07-28, verdikt: APPROVED)

A verdikt P0-leletet nem talált. A kötelező P1-et és — saját mérlegelésből — mind az
5 opcionális P2-t javítottam. **Teszt: 34 → 42/42 zöld**, és mivel az apply-ág is
változott, a végponttól végpontig mérést újra lefuttattam friss KC 24.0.0 konténeren
(utána törölve).

### P1 (kötelező) — `-VerifyOnly -Offline` együtt nem volt tiltott

Az Offline ág nyert, és exit 0 jött **Keycloak-érintés nélkül** — egy CI-verify hívó
ezt hamis konvergenciának olvasta volna. Kizáró guard pótolva a meglévő két pár
mintájára (`ps1:411-414`), külön Pester-teszttel (exit 2 + „mutually exclusive").

### P2-k (mind javítva)

| # | Lelet | Javítás | Bizonyíték |
|---|---|---|---|
| 1 | strukturálisan hiányzó profil-property → nyers StrictMode-kivétel a validátorban | új `Get-ProfileValue` (biztonságos, pontozott útvonalú olvasás); a validátor minden olvasása ezen megy | teszt: hiányzó `tenant.id` + `users[].lastName` → **finding**, nem kivétel |
| 2 | a user-PUT mindig `emailVerified=$true`-t írt, de a terv nem detektálta driftként | `Get-DesiredEmailVerified` (config-vezérelt, `users[].emailVerified`, alap `true`) + drift-detektálás a tervben | élő: `emailVerified=false` beállítva → terv: `Update user/... emailVerified: 'False' -> 'True'` → apply javította |
| 3 | `MissingKernelRequired` esetén is futtatható SQL emit-elődött, amit a trigger elutasítana | az artefaktum ilyenkor **nem futtatható**: indoklást tartalmazó, `INSERT` nélküli blokk + `Warn` a konzolon | élő: `PanelCutter` `cutting` nélkül → `NOT EMITTED` fájl |
| 4 | role-mapping-only pendingnél is lefutott a teljes user-PUT (terven kívüli mutáció) | a pending akciók szétválasztva profil- és szerep-ágra; a PUT csak profil-eltérésre fut | élő: csak a szerep-hozzárendelés törölve → **nincs „user updated"**, és a user-reprezentáció JSON-ja bájtazonos maradt |
| 5 | halott `ADMIN_VIEW` listaelem + pontatlan komment | `ADMIN_VIEW` kivéve (csak olvasást enged, írást nem — tehát elégtelen); a komment a verbose stream tényét mondja | teszt: `ADMIN_VIEW` → `Update` |

Egy meglévő teszt-fixture elavult a P2-2 miatt (a „teljesen provisionált user" mintából
hiányzott az `emailVerified`, amit valódi Keycloak-user mindig hordoz) — a fixture
pótolva, nem a detektálás gyengítve.

### Az újramérés eredménye (friss KC 24.0.0)

Zöldmezős `-Apply` (exit 0, önellenőrzött konvergencia) → `-VerifyOnly` (exit 0) →
role-mapping-only javítás (P2-4 bizonyíték) → `emailVerified` drift javítás (P2-2) →
SQL-megtagadás (P2-3). Konténer törölve, `doorstar-production-db` érintetlen.

---

## Elfogadási kritérium

- [x] Idempotens provisioning-script Keycloak Admin API-ra, **kötelező dry-run
      móddal** (alapértelmezés a dry-run; mutáció csak `-Apply`-jal).
- [x] `VERIFY_PROFILE` buktató kezelve (validációs Error + stale required action
      takarítás), élő KC24-en bizonyítva.
- [x] Kernel DB-trigger modulkulcs-restrikció kezelve: legacy→kanonikus térkép az
      ADR-067 szerződésfájlból, fail-closed drift-őrrel, tételes
      `notRepresentableInKernel` jelentéssel.
- [x] Runbook-doksi a `docs/knowledge/` alá (`deployment/TENANT_ONBOARDING_RUNBOOK.md`).
- [x] Teszt-bizonyíték: **42/42** Pester + végponttól végpontig valódi Keycloak 24.0.0
      dry-run/apply/verify/drift-javítás + dekódolt token.
- [x] Root-review APPROVED; a kötelező P1-guard + teszt és mind az 5 P2 landolt.
- [ ] **ÉLES realm elleni futtatás — Gábor-kapu, nem történt meg** (szándékosan).
- [ ] **Kernel-SQL éles futtatása — Gábor-kapu, nem történt meg** (szándékosan).
- [ ] `done` / `APPROVED`: kizárólag root-review állíthatja.

## Nyitott / root-döntést igénylő pontok

1. **Éles claim-formátum:** a script alapból kanonikus ID-t ír a claimbe
   (ADR-067 2. döntés). A portál `worldAccess.ts` mindkettőt normalizálja, de az
   éles fiókokon ma **kanonikus** értékek vannak-e vagy legacyk — ezt az első éles
   futás dry-runja fogja megmutatni. Ha óvatosabb átállás kell: `moduleIdFormat: both`.
2. **JoineryTech demo-bérlő modulkészlete:** ma `{door,cabinet,window,cutting,spatial}`
   közül választható a Kernel-rekordban; a 7 ERP-modul csak claimben él. Ha a
   tulajdonosi fióknak ERP-világokat is látnia kell, az a claimből meglesz, de a
   Kernel-oldali entitlement-igazság az ERPSEP-05/06-ig hiányzik.
3. **Keycloak H2 → Postgres migráció** (STAB-KEYCLOAK-POSTGRES-MIGRATION jelölt):
   amíg fennáll, minden onboarding előtt kézi H2-mentés kell (runbook 7.7).
