# A Kernel-hívás token-útja — mérés (B2B-10 F5/0)

> **Dátum:** 2026-07-30 · **Mérte:** backend terminál · **Státusz:** mérési jegyzőkönyv
> **Miért:** az F5 (`HttpProjectAdapter`) egyetlen méretlen előfeltétele az volt, hogy a
> Collaboration-hostból egyáltalán **elérhető és hitelesíthető-e** a Kernel API. A tudástárunk
> csapdája szerint *audience-mapper nélkül minden modul-API 401-et ad*.

## A mérőkörnyezet

Eldobható konténerek + lokálisan futtatott hostok, éles rendszer **nem érintve**:

| Elem | Beállítás |
|---|---|
| Keycloak | `quay.io/keycloak/keycloak:24.0.0`, `start-dev`, port **8081**, realm `spaceos` |
| Kernel API | `dotnet run`, port **5099**, `ASPNETCORE_ENVIRONMENT=Development` → **SQLite** |
| Collaboration host | a build-kimenet **másolatából** futtatva (a repót nem módosítottam), port **5098**, PostgreSQL |
| Kliens | `portal` (public, direct access grant) — **két audience-mapper**: `kernel-api` + `collaboration-api` |
| Felhasználó | `test.user`, `tid` = A bérlő, `spaceos_tenants` = `[{tenant_id, enabled_modules}]`, szerep `Joiner` |
| Gép-gép | `collaboration-service` (client_credentials), audience-mapper `kernel-api` |

## 1. A Kernel elérhető és hitelesíthető — mérve

| Eset | Válasz |
|---|---|
| token nélkül · `GET /api/flow-epics/{id}` | **401** |
| **friss** felhasználói token (`Joiner` + `tid`) · ismeretlen id | **404** → *jogosult, csak nincs ilyen* |
| gép-gép token (client_credentials) | **403** → hitelesült, de a `ReadPolicy` elutasítja |

⚠ Első futásra a felhasználói token 401-et kapott: **lejárt** token volt (a KC alapértelmezett
5 perces élettartama). A friss token 404-et ad. Ezt azért írom le, mert a 401 pont úgy néz ki,
mint az audience-hiba.

## 2. On-behalf-of: EGY token, KÉT API — mérve

A `portal` kliensre tett két audience-mapper után a token `aud`-ja:
`['kernel-api', 'collaboration-api', 'account']`.

| Ugyanaz a token | Válasz |
|---|---|
| **Kernel** `GET /api/flow-epics/{saját epic}` | **200** + DTO |
| **Collaboration** `GET /api/collaboration/v1/agreements/{ismeretlen}` | **404** (jogosult) |
| Collaboration, token nélkül | **401** |

**Vagyis a továbbadott felhasználói token út járható**, és nem kell hozzá kernel-módosítás.

## 3. A Kernel bérlő-izolációját a hívó tokenje hajtja — mérve

Egy flow-epic **A** bérlőnek, ugyanaz az id, két különböző `tid`-ű token:

| Hívó | Válasz |
|---|---|
| **A** bérlő tokenje (övé a sor) | **200** |
| **B** bérlő tokenje (idegen) | **404** |

Ez pontosan az a fail-closed tulajdonság, amit az adapternek bizonyítania kell — és **a Kernel
tartja**, nem az adapter. Az F5 negatív kontrollja tehát a kernel 404-je lesz.

## 4. A gép-gép identitás strukturálisan NEM tud bérlőt hordozni — mérve

A `client_credentials` token claimjei: `aud=['kernel-api','account']`, **`tid` nincs**,
`realm_access.roles` = csak az alapértelmezettek.

Következmény, kimondva: service-identitással hívva (a) a `ReadPolicy` miatt **403** jön, amíg
szerepet nem osztunk neki, és (b) még szereppel is **elveszne a bérlő-szűkítés**, mert a Kernel a
tenantot kizárólag a token `tid` claimjéből ismeri. Az adapter mai egyetlen biztonsági
tulajdonsága így **csendben** tűnne el.

## 5. A `ProjectOwnerTenantId` a drótról nem tölthető ki — élőben is

A 200-as válasz teljes törzse:

```json
{"id":"aaaaaaaa-…","title":"Doorstar pilot epic","targetFacilityId":"bbbbbbbb-…",
 "phase":"Delivery","isDelegated":false}
```

**Nincs benne tenantId.** Ez eddig kód-olvasásból volt tudott; most élő válaszon is mérve.
Az on-behalf-of úttal viszont a mező **redundánssá válik**: a bérlő-bizonyíték maga a kernel 404-je.

## 6. ⛔ PLATFORM-LELET: a `spaceos_tenants` claim egy valós alakon elhasal

**Mérve:** a Collaboration API **403**-at adott olyan tokenre, amiben a modul **benne volt**.
A host naplója:

> `Failed to deserialize the spaceos_tenants claim …; treating it as absent.`
> `Cannot get the value of a token type 'StartObject' as a string.`

**A pontos ok.** A `TenantResolver.ParseTenantListClaim` **két** alakot ismer: a `[`-gyel kezdődő
tömböt, és a JSON-stringbe csomagolt tömböt (a Script-Mapper double-serialization őre). Van egy
**harmadik**: ha a Keycloak a `spaceos_tenants`-t **tömb**-attribútumként adja ki
(`jsonType.label=JSON`), a .NET JWT-kezelő **elemenként külön claimre bontja** — így a claim értéke
egyetlen **objektum** (`{…`), ami a `Deserialize<string>` ágra fut és dob.

**Igazolás mindkét irányban:**

| A mapper `jsonType`-ja | A claim alakja | Collaboration válasz |
|---|---|---|
| `JSON` | objektum (`{…}`) | **403** — a jogosultság csendben eltűnik |
| `String` | JSON-string (`"[{…}]"`) | **404** — jogosult |

**Miért súlyos:** a tenant-**feloldás** közben végig működik (a `tid` claim az 1. prioritás), tehát
a kérés hitelesül, a bérlő feloldódik, és **csak az entitlement tűnik el**. A válasz egy 403, ami
megkülönböztethetetlen attól, hogy a modul tényleg nincs engedélyezve. **Mind a 7 modult érinti**,
amelyik a `RequireEnabledModule` kaput használja.

Kerülő megoldás realm-oldalon: `jsonType.label=String`.

**A kód-oldali javítás megtörtént, és végponttól végpontig bizonyítva** — a törött claim-alakot
visszaállítottam a Keycloakban, és **ugyanazzal a tokennel, egyszerre** mértem a két hostot:

| Host | Válasz |
|---|---|
| a javítás **nélküli** build (`:5098`) | **403** — az entitlement csendben elveszik |
| a javított build (`:5097`) | **404** — jogosult |

A parser mostantól három alakot ismer (`[…`, `"…`, `{…`); a harmadikat egy elemű listává csomagolja,
mert a hívó amúgy is végigjárja az összes `spaceos_tenants` claimet. Négy új teszt, köztük negatív
kontroll (a két korábban működő alak **továbbra is** parseol) és fail-closed kontroll (értelmezhetetlen
claim **nem** lesz entitlement). Mutáció: a `{` ág eltávolítása **2 tesztet buktat**.

## 7. Amit NEM minősítek terméki hibának

- `GET /api/tools/flow-epics` → **500**: `SQLite does not support expressions of type
  'DateTimeOffset' in ORDER BY`. Ez a **mérőkörnyezetem** műterméke (Development → SQLite);
  élesben PostgreSQL fut. Ugyanez okozza az `OutboxBackgroundWorker` ciklikus kivételeit is.
- A kernel friss klónon **nem fordul**, amíg a `SpaceOS.Kernel.Api/keys/dev-private-key.pem`
  nem létezik (a csproj `CopyToOutputDirectory`-val hivatkozza azt a fájlt, amit a
  `DevRsaKeyManager` csak **futásidőben** hozna létre, és amit a `.gitignore` kizár). Ez a
  **Kernel csapatának szóló jelzés** — hozzá nem nyúltam (Kernel-kapu).

## 8. Saját mérési hiba, kimondva

Az első kernel-buildet `| tail`-en át futtattam, és a pipeline exit-kódja a `tail`-é lett: **0-t
láttam, miközben a build hibára futott**. Ezt „build rendben"-ként jelentettem, tévesen.
Tanulság: kimenetet fájlba, exit-kódot külön.

## Következtetés az F5-re

1. **Kernel-módosítás nem kell** a fő úthoz — most már működésre is mérve, nem csak kódra.
2. **Az on-behalf-of út a javasolt**: egy token, két audience; a bérlő-szűkítés a `tid`-en át valós.
3. Ezzel a `ProjectOwnerTenantId` **elhagyható** (a kernel 404-je a bizonyíték) → a kernel-kaput
   nyitó ág **elkerülve**.
4. **Blokkoló előfeltétel az F5/2-höz:** a 6. pont platform-hibája — amíg a claim-alak nincs
   kezelve, a Collaboration API valós Keycloak-realmmel 403-at adhat mindenre.
