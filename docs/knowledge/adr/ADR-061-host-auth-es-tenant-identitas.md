# ADR-061: Modul-host auth + tenant-identitás — közös platform-wiring

- **Státusz:** PROPOSED — döntésre vár (root)
- **Dátum:** 2026-07-16
- **Felvetette:** KONTROLLING-BE-HOST (2.) — „platform-szintű döntés hiányzik"
- **Kapcsolt lelet (ÚJ, ebben az auditban):** a tenant-azonosító **hitelesítetlen HTTP
  headerből** jön mind az 5 JT-modulban → tenant-hamisítás. Ld. lent.

---

## Kontextus

A KONTROLLING-BE-HOST állítása: *„egyetlen modul-host sem regisztrál sémát, és a kernel sem
szállít handlert — így az EHS host is ugyanígy elszállna."* Az audit ezt **részben cáfolta,
és közben súlyosabbat talált.**

### Host-auth állapot (kódból ellenőrizve)

| Modul | Futtatható host | Auth-séma | Use(Authn/Authz) | Endpoint gate | Éles állapot |
|---|---|---|---|---|---|
| **kernel** | ✅ | ✅ JwtBearer + Keycloak | ✅ `Program.cs:368-369` | ✅ policy-alapú | ✅ **teljes** |
| **hr** | ✅ `src/hr/src/Api/Program.cs` | ✅ **JwtBearer** (`:19-39`) | ✅ `:56-57` | ✅ | ✅ teljes (de másolat) |
| **kontrolling** | ✅ | ⚠️ **DevelopmentAuthentication** | ✅ `:36-37` | ✅ | csak Dev-ben indul |
| **crm** | ✅ `Lead.Api/Program.cs` | 💥 `AddAuthentication()` **séma nélkül** (`:17`) | ✅ `:31-32` | ✅ 5 endpoint | 💥 **futásidőben minden kérés elszáll** |
| **ehs** | ✅ `src/ehs/src/Api/Program.cs` | ❌ **semmi** | ❌ | ❌ | 🔓 **védtelen** |
| **dms** | ✅ `src/dms/host/Program.cs` | ❌ **semmi** | ❌ | ❌ | 🔓 **védtelen** |
| **qa** | ✅ (ma épült) | — | — | ✅ `RequireAuthorization` | ld. CRM-kockázat |
| **maintenance** | ✅ (ma épült) | — | — | ✅ `RequireAuthorization` | ld. CRM-kockázat |

**Az eredeti állítás elavult:** a HR **regisztrál** sémát (`src/hr/src/Api/Program.cs:24`).
**A mögöttes gap viszont megerősítve:** `AddSpaceOsAuth` / `AddSpaceOsModuleAuth` **nem
létezik** (0 találat az egész fában). A kernel a saját ~180 soros auth-blokkját
**inline** konfigurálja (`SpaceOS.Kernel.Api/Program.cs:79-98` + policy-k `:259`), **nincs
kiszervezve**.

**Következmény, ami már bekövetkezett:** a HR host **kézzel lemásolta a kernel felét** — és
a másolat **már driftel**: hiányzik belőle a `realm_access.roles` mapping és a ProblemDetails
401/403. **Két hostnál már két különböző auth van; hétnél hét lesz.**

### 💥 Két hiba, ami nem ADR-kérdés, hanem javítandó bug

1. **CRM: `AddAuthentication()` séma nélkül + `RequireAuthorization()` az endpointokon**
   (`src/SpaceOS.Modules.CRM/src/Lead.Api/Program.cs:17`) → **minden kérés**
   `InvalidOperationException: No authenticationScheme was specified` — **már Developmentben
   is**. A CRM host ma nem kiszolgálható. Nincs `Jwt` szekció az appsettings-ben.
2. **EHS és DMS host auth nélkül fut**, endpointjaik nem `RequireAuthorization`-öltek →
   **bárki hívhatja őket**. (Figyelem: a `spaceos-modules/spaceos-modules-dms/.../DmsEndpoints.cs:25`
   egy *másik fában* gate-elt — a futó host nem azt mappeli.)

### 🔴 A súlyosabb lelet: a tenant-azonosító hitelesítetlen

**Mind az 5 JT-modul a kliens által küldött `X-Tenant-Id` headerből veszi a tenantot:**

`src/dms/src/Api/HttpTenantContext.cs:19,36-40` (azonos: `ehs`, `hr`, `kontrolling`):
```csharp
public const string HeaderName = "X-Tenant-Id";
...
if (!httpContext.Request.Headers.TryGetValue(HeaderName, out var tenantIdHeader))
    return Guid.Empty;
```

**Ez a header nem hitelesített.** Bármely érvényes tokennel rendelkező hívó **tetszőleges
tenant adatát elérheti** — a header átírásával. Az RLS (ADR-062) ezt **nem védi ki**, mert
épp ezt a hamisított értéket kapja meg session-kontextusnak. **Az auth és az RLS együtt sem
izolál, ha a tenant-állítás a támadótól jön.**

**A kernel ezt tudatosan elkerüli:** a tenantot a **JWT `tid` claimből** oldja fel
(`spaceos_tenants` → `tenant_id`), és ahol headert fogad
(`X-SpaceOS-Active-Tenant`), ott **a token tenant-listája ellen validálja**
(`TenantSessionInterceptor.cs:155-167`), egyezés hiányában `UnauthorizedAccessException`.
Kritikus részlet: `MapInboundClaims = false` (`Program.cs:88`) — enélkül a `tid` claim
átnevezésre kerül és a resolver eltörik.

### Sürgősség-kontextus (2026-07-16 este)

A VPS-en **mind a 11 spaceos-service fut** (`VPS_SERVICE_STATE_2026-07-16.md:47-64`) — de ezek
a **spaceos-világ** moduljai (kernel, inventory, cutting, procurement, identity, sales…), nem a
7 JoineryTech modul-host. **Az EHS/DMS auth-hiánya ma tehát nem éles kitettség** (nincsenek
deployolva), de **a JT-hostok VPS-deployja előtt rendezni kell** — ez a deploy a következő
sarokkő.

⚠️ **Módszertani figyelmeztetés a mintavételhez:** a futó VPS-modulok forrása **lokálisan nem
elérhető** (inicializálatlan submodule-ok: a `.git/modules/src/` alatt csak `spaceos-kernel`
és `joinerytech-portal` van; a `sales` repo GitHubon nem is létezik —
`VPS_SERVICE_STATE_2026-07-16.md:90`). **Ezért a „nézzük meg, hogyan oldják meg a futó modulok"
kérdésre ma nem lehet kódból válaszolni.** Az egyetlen ellenőrizhető, futó referencia a
**kernel** — az alábbi ajánlás erre épül. *(Ha a döntés előtt kell a többi modul mintája:
`git submodule update --init src/spaceos-modules-{inventory,cutting,procurement,joinery,abstractions}`
vagy VPS-olvasás `/opt/joinerytech/src/` alatt.)*

---

## Döntendő kérdés

**Hol lakik a modul-hostok közös auth- és tenant-wiringje — és honnan jön a tenant-azonosító?**

---

## Opciók

### (a) Közös **kernel**-extension (`AddSpaceOsAuth`) — a kernel szállítja

- **Következmény:** egy hely a JWKS-nek, role-mappingnek, ProblemDetails-nek.
- **Munkaigény:** kiszervezés ≈1 nap + 6 host bekötése ≈1 nap.
- **Kockázat:** ⚠️ **a kernel másik csapat submodule-ja**, `main` = baseline-reset, a VPS-csapat
  develop-branchen dolgozik, és a VPS-checkout **ma sem fordult** (9 uncommitted fájl,
  CS1929 — `VPS_SERVICE_STATE_2026-07-16.md:118`). A 7 JT-modul-host kritikus útját egy
  ilyen komponenshez kötni **átnyúlik a sziget-határon** és idegen release-ciklusra ültet.

### (b) Közös **platform-csomag** a JoineryTech-szigeten (`SpaceOS.Modules.Hosting`)

A kernel auth-blokkjának **mintáját** átvevő, de a szigeten belül karbantartott,
modul-hostoknak szánt csomag.

- **Következmény:** `AddSpaceOsModuleAuth(config)` + `AddSpaceOsModuleTenancy()` — egy hely,
  a sziget saját release-ciklusában. **A kernel referencia-implementáció, nem függőség.**
- **Munkaigény:** csomag ≈2 nap + 7 host ≈1,5 nap ≈ **3,5 nap**. Terjesztés: a bevált
  modulonkénti `nupkg/` + `NuGet.Config` minta (a központi `src/local-nuget/` ma **egyetlen**
  csomagot tartalmaz: `SpaceOS.Nesting.Algorithms.1.1.0.nupkg` — nem közös-infra csatorna).
- **Kockázat:** kódduplikáció a kernellel (két JWT-wiring a platformon) — vállalható ár a
  függetlenségért; ha a kernel valaha kiadja a magáét, ez rá cserélhető.

### (c) Modulonként (a mai állapot)

- **Következmény:** a drift **már megtörtént** (HR-másolat role-mapping és ProblemDetails
  nélkül). Biztonság-kritikus kód 7 példányban.
- **Munkaigény:** ≈0,5 nap/host × 6 ≈ 3 nap — **nem olcsóbb**, mint (b), és minden jövőbeli
  változás (kulcsrotáció, Authority-váltás) újra 7 hely.
- **Kockázat:** **magas.** Elvetendő.

### (d) BFF/gateway terminálja az auth-ot, a modulok belső hálón bíznak

- **Következmény:** a modulok védtelenek maradnak, ha a hálózat sérül; és **az RLS-hez
  úgyis kérésenkénti tenant-claim kell** → a gateway-nek akkor is hitelesített tenantot kell
  továbbadnia. Ma nincs ilyen gateway.
- **Kockázat:** egyrétegű védelem. **Nem elsődleges** — de gateway + modul-szintű validáció
  együtt (defense in depth) később értelmes.

### Külön al-döntés: a tenant-azonosító forrása

- **(T1) JWT-claim** (kernel-minta): a tenant a tokenből jön; header csak allowlist-validációval.
- **(T2) `X-Tenant-Id` header marad** (mai állapot): **hitelesítetlen → tenant-hamisítás.**

---

## Ajánlás

> **(b) — közös platform-csomag a JoineryTech-szigeten (`SpaceOS.Modules.Hosting`), a kernel
> mint referencia-implementáció, NEM mint függőség.**
> **+ (T1) — a tenant-azonosító a JWT-claimből jön; a `X-Tenant-Id` header csak a token
> tenant-listája ellen validálva fogadható el.**
> **+ a csomag ne csak auth legyen: `AddSpaceOsModuleAuth` + `AddSpaceOsModuleTenancy`.**

**Indoklás:**

1. **A csomag helye a kockázat-kérdés, nem a léte.** Hogy közös wiring kell, azt a **drift
   bizonyítja**: a HR másolata már hiányos. A kérdés csak az, hogy a kernel adja-e — és a
   kernel ma **nem fordul a VPS-en**, `main`-je baseline-reset, másik csapat aktív
   develop-branchével. **A 7 JT-host kritikus útját ehhez kötni ma szervezeti kockázat, nem
   technikai előny.** A sziget saját csomagja ugyanazt a mintát adja, saját ütemben.

2. **(T1) nélkül az egész auth-munka hiábavaló — és ez a csomag legfontosabb tartalma.**
   Hitelesített hívó + hitelesítetlen tenant-header = **bármely user bármely tenant adatát
   olvashatja**, és az RLS ezt **nem fogja meg** (épp a hamisított értéket kapja
   session-kontextusnak). A kernel a helyes mintát már megírta és futtatja
   (`TenantSessionInterceptor.cs:155-167`) — **ezt kell átvenni, nem kitalálni.**
   ⚠️ Az átvételnél a `MapInboundClaims = false` (`Program.cs:88`) nem opcionális részlet:
   enélkül a `tid` claim átnevezésre kerül és a resolver némán eltörik.

3. **A csomag határa legyen tágabb az auth-nál — a bizonyíték egyértelmű.** Ma **minden modul
   újraírja ugyanazt az öt dolgot**:
   - `ITenantContext` — **négy különböző namespace**, ugyanaz a fogalom
     (`qa/…/Persistence/ITenantContext.cs`, `maintenance/…/Persistence/`,
     `hr/…/Application/Contracts/`, `ehs/…/Infrastructure/Data/`);
   - `HttpTenantContext` — 4 másolat (mind a hibás header-mintával);
   - `TenantDbConnectionInterceptor` — 5 másolat, **három különböző viselkedéssel** (dob /
     némán elnyel / közvetlen `set_config`) → **ADR-062**;
   - `*EndpointResults` Ardalis→HTTP mapper — 3 másolat (`Qa`, `Hr`, `Kontrolling`);
   - `*ApiJsonOptions` — 4 másolat.

   **Az auth önmagában megoldva is ott marad 4 másolat.** Egy „modul-host baseline" csomag
   ugyanannyi munkával mind az ötöt lezárja, és ez a természetes hely az ADR-059
   `EnumWireMap`-jének és az ADR-062 interceptorának is. *(Az ADR csak az auth+tenancy magot
   dönti el; a többi négy konszolidáció olcsó follow-up, ha a csomag létezik.)*

4. **A sürgősség valós, de nem mai.** A JT-hostok nincsenek VPS-en; az EHS/DMS auth-hiánya ma
   **nem éles kitettség**. **De a deploy a következő sarokkő**, és auth nélkül nem mehet ki —
   a csomag ~3,5 napja a deploy kritikus útján van.

**Az ADR-től függetlenül, azonnal javítandó (nem döntés-kérdés):**
- **CRM `AddAuthentication()` séma nélkül** → a host ma használhatatlan. *(A séma-nélküli
  `AddAuthentication()` pontosan az a hiba, amit a `DevelopmentAuthentication.cs:14-19`
  komment leír — a CRM belefutott.)*
- **EHS + DMS**: `RequireAuthorization` az endpointokra.
- **Authority-drift**: `spaceos-modules-ehs/Ehs.Api/appsettings.json:17-19` →
  `https://auth.spaceos.local`, míg kernel + hr → `https://joinerytech.hu/auth/realms/spaceos`.
  **Egy Authority, audience modulonként** (`kernel-api`, `hr-api`, …).

**A `DevelopmentAuthentication` sorsa:** a kontrolling megoldása
(`spaceos-modules-kontrolling/host/DevelopmentAuthentication.cs`) **jó, és tartsuk meg** — de
a csomagba emelve. A `!IsDevelopment() → throw` fék (`:65-71`) pontosan a helyes minta: a
dev-kényelem nem szivároghat élesbe. Ma 81 sor egyetlen host magántulajdonában.

---

## Hatás

**Új:** `SpaceOS.Modules.Hosting` (vagy `src/spaceos-modules-abstractions` alá) —
`AddSpaceOsModuleAuth`, `AddSpaceOsModuleTenancy`, `ClaimsTenantContext`,
`DevelopmentAuthentication` (áthelyezve).

**Érintett:** mind a 7 host `Program.cs` · 4× `HttpTenantContext` (törlendő) · 4×
`ITenantContext` (egyesítendő) · appsettings `Jwt` szekciók (CRM/kontrolling/dms/ehs: **hiányzik**).

**Migráció:** DB-migráció nincs. **Keycloak-oldali munka van:** audience/kliens modulonként.
Kapcsolódó infra-adósság: `portal-app` localhost redirect URI (dev-bypass ma
`VITE_AUTH_MODE=mock`).

**Munka:** ≈3,5 nap (csomag 2 + hostok 1,5) + azonnali bugfixek ≈0,5 nap.

**Blokkol-e élesítést?** **Igen** — a 7 JT-modul-host VPS-deployja előtt kötelező. Ma nem éles
kitettség (nincs deploy). **A tenant-claim rész (T1) az ADR-062-vel együtt a valódi
tenant-izoláció feltétele — külön-külön egyik sem elég.**

---

## Döntés

_(Gábor tölti ki)_

- [ ] (a) Kernel-extension
- [ ] (b) Sziget-szintű platform-csomag, kernel = referencia — *ajánlott*
- [ ] (c) Modulonként / (d) BFF-terminálás
- [ ] Tenant-forrás: **(T1) JWT-claim** — *ajánlott* ☐ / (T2) marad a header ☐
- [ ] A csomag hatóköre: csak auth+tenancy ☐ / + interceptor/EndpointResults/JsonOptions ☐
- [ ] Azonnali bugfixek (CRM séma, EHS/DMS gate, Authority-drift) jóváhagyva? ☐

**Indoklás:**

---

## Kapcsolódó ADR-ek

- **ADR-062** (RLS) — **testvér-döntés**: (T1) adja a hitelesített tenantot, az RLS érvényesíti.
  **Egyik sem izolál a másik nélkül.**
- **ADR-064** (gyűjtő) — az assign-identitás/`createdBy` a Keycloak-bekötéstől függ.
- **ADR-001** (JWT RS256 + Key Vault), **ADR-004** (RBAC need-to-know) — a keret.
- Referencia: `spaceos-kernel/SpaceOS.Kernel.Api/Program.cs:79-98`,
  `SpaceOS.Infrastructure/Persistence/TenantSessionInterceptor.cs:155-167`.
</content>
</invoke>
