# B2B-10 F5 — a projekt-horgony feloldása a Kernel felé

> **Epic:** EPIC-B2B-COLLABORATION-2026Q3 · **Szülő:** B2B-10 · **Szerep:** backend
> **Státusz:** **TERVEZET — root-kiadásra vár** (backend készítette, 2026-07-30)
> **Előzmény:** F3 + F3X mind APPROVED. A REAUDIT szerint az F5 a kritikus úton van.

## Miért van szüksége ennek a fázisnak saját doksira

A REAUDIT teljes normatív tartalma az F5-re **egy táblasor**
([`B2B_COLLABORATION_REAUDIT_2026-07-28.md:51`](../../knowledge/architecture/B2B_COLLABORATION_REAUDIT_2026-07-28.md)):

> F5 | ProjectRef mező+migráció + HttpProjectAdapter a kernel flow-epics-re | M

Átvételi feltétel, mérési kapu, negatív kontroll, szeletelés **sehol**. Ez a doksi ezt pótolja —
de a benne lévő **hatókör-kimondások root-döntést igényelnek**, ezért tervezet.

## 1. Mért kiindulás (2026-07-30, felderítés)

### a) A ProjectRef-mező már megvan — az F1-ben szállt le

`CollaborationWorkScope` (ProjectId + EpicId kötelező, TaskId opcionális), EF owned-konfiguráció,
migráció (`20260729230000_AddWorkPackageWorkScope`), modell↔séma konformancia valódi Postgresen.
**Az F5 táblasorának első fele tehát le van tudva** — csak ezt **egyetlen dokumentum sem mondja ki**
(a REAUDIT táblája változatlan, az `EPICS.yaml`-ben nincs F5 sor).

### b) ⚠ A horgony ma HALOTT TÁR

- **Nincs create-parancs és nincs create-végpont** munkacsomagra.
- `IWorkPackageRepository.AddAsync` — **nulla hívó** az egész modulban, tesztben sem.
- A `WorkScope` a read-modelben sincs benne, tehát **ki sem olvasható**; wire-alakja nincs.

### c) ⚠ Az `IProjectAdapter` szállított halott kód

`GetProjectRefAsync(flowEpicId, requestingTenantId)` → `ProjectReference(FlowEpicId, Title,
ProjectOwnerTenantId)`. Az implementáció Dictionary-lookup; **nulla produkciós hívó, nulla
DI-regisztráció**. Egyetlen biztonsági tulajdonsága a `ProjectOwnerTenantId == requestingTenantId`
összevetés.

### d) Kernel-oldal — van HTTP, de nem olyan, amilyet az adapter szerződése feltételez

| Mért tény | Következmény |
|---|---|
| `GET /api/flow-epics/{id}` létezik (`FlowEpicEndpoints.cs:22`) | a feloldás technikailag lehetséges |
| `.RequireAuthorization("ReadPolicy")`, a policy = `RequireRole("Joiner","Designer","Admin")` | **emberi** szerepekre kötve; gép-gép identitásra nincs policy |
| a handler **nem lát tenantot**; az izoláció az EF query filterből jön, a JWT `tid` claimje hajtja | a `requestingTenantId` HTTP-n **csak a token claimjén át** érvényesíthető |
| `FlowEpicDto` = `Id, Title, TargetFacilityId, Phase, IsDelegated` — **TenantId nincs benne** | a `ProjectOwnerTenantId` a drótról **nem tölthető ki** |
| a create/list a facility alá fészkelve (`/api/facilities/{id}/flow-epics`) | a feloldáshoz nem kell, de a szerződés nem szimmetrikus |
| becommitolt OpenAPI: `docs/openapi/kernel-v1.json`, **2026-04-17 óta nem frissült** | kontraktusnak használható, de nem naprakész — az `/internal` útvonalak hiányoznak belőle |

### e) Kimenő HTTP-infrastruktúra a platformon: **nulla**

Nulla `HttpClient` a hosting-csomagban és a 7 modul éles kódjában; nulla Polly/resilience;
**nulla precedens tokentovábbításra** (DelegatingHandler / header-propagation / client_credentials).
Öt kézzel írt, egymástól független precedens van a fában, ebből **három néma
`?? "http://127.0.0.1:500x"` fallbackkel** — ezt a mintát **nem** követjük.

## 2. ⛔ Amit a kód nem dönt el (root/Gábor)

1. **Hatókör-kimondás:** elfogadja-e a root, hogy az F5 első fele az F1-gyel le van tudva, és a
   maradék kizárólag a feloldó adapter?
2. **A `ProjectOwnerTenantId` sorsa** — ez a **kernel-kapu billenő pontja**:
   (a) töröljük a mezőt · (b) a `requestingTenantId`-val töltjük (**tautológia lesz**) ·
   (c) kernel-DTO bővítés → **Gábor-jóváhagyás kell**.
3. **Hitelesítési út:** a hívó **felhasználó tokenjét** visszük tovább (on-behalf-of), vagy
   **service-identitással** hívunk? ⚠ Service-identitás esetén az adapter **egyetlen mai biztonsági
   tulajdonsága elvész**, mert a kernel a hívó tenantját csak a token `tid` claimjéből ismeri.
4. **Visszavetítés** (close/proof/advance-stage a host FlowEpic felé) az F5-be tartozik-e? Az
   ADR-068 §11 az egyirányú projekciót a B2B-06-hoz utalja.
5. **Halott kód:** az F5 hozza-e a DI-bekötést **és legalább egy valós hívási pontot**? Enélkül az
   eredmény *halott HTTP-adapter halott InMemory helyett*. Kapcsolódó, meg nem válaszolt kérdés:
   a work-package-létrehozás hiánya **szándékos**-e (az F6 exchange-inbox hozná létre) vagy kimaradás?
6. **B2B-06 könyvelése:** a doksiban mind a nyolc kritérium ki van pipálva, miközben a státusz
   `changes_requested`. Melyiket állítja igazra az F5?

## 3. Méretlen előfeltétel — enélkül az F5 nem indítható

**Elérhető-e a Kernel API a Collaboration-host környezetéből, és kapható-e hozzá érvényes token?**
Ezt **senki nem mérte**. A saját tudástárunk csapdája: *audience-mapper nélkül minden modul-API
401-et ad*. Amíg ez nincs megmérve, a „nem kell kernel-módosítás" verdikt a **kód** szintjére
érvényes, a **működésre nem**.

## 4. Javasolt szeletelés (a döntések után)

| Szelet | Tartalom | Kernel-kapu? |
|---|---|---|
| **F5/0** | **Mérési szelet**: elérhetőség + token-út bizonyítása eldobható Keycloak-konténerrel és a kernel-hosttal. Ha csak kernel-változtatással megy, a munka **itt megáll** és felmegy Gáborhoz. | mérés: nem |
| **F5/1** | A **create-út**: munkacsomag-létrehozás parancs + végpont, ami **feltölti a horgonyt** — ezzel a horgony és az adapter is valós hívót kap. | nem |
| **F5/2** | `HttpProjectAdapter` a porton: typed `HttpClient`, **fail-fast** base-URL options (`ValidateOnStart`, üres alapérték — nem néma fallback), explicit hibatérkép (404 → nincs ilyen projekt; 401/403 → **fail-closed**; timeout → külön), per-hívás timeout. | a 2. döntéstől függ |
| **F5/3** | Negatív kontroll **mérve**: idegen tenant tokenjével a feloldás **semmit** nem ad vissza — és kimondva, **melyik réteg** tartja (a kernel 404-je vagy az adapter ellenőrzése). | nem |

**Teszt-eszköz:** kézzel írt `HttpMessageHandler`-dublőr (a repó bevált mintája), **új NuGet nélkül**
— a WireMock.Net egyetlen használója egy árva projekt, ami egyetlen `.sln`-ben sincs benne.

## 5. Amit ez a task NEM csinál

- **Nem módosítja a Kernelt.** Ha bármelyik ág oda vezet, a munka megáll és felmegy Gáborhoz
  (ADR-066, ADR-068 §17: *„A SpaceOS Kernel módosítása alapszabály szerint tilos agent-feladatként
  Gábor jóváhagyása nélkül"*).
- Nem hívja a `PUT /api/flow-epics/{id}/delegate` végpontot — a REAUDIT szerint deprecated shim.
- Nem publikál kontraktust a Doorstarnak (az az F4).
