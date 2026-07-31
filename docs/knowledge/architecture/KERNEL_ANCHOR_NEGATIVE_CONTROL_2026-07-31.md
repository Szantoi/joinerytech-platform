# A horgony-feloldás negatív kontrollja — mérés (B2B-10 F5/3)

> **Dátum:** 2026-07-31 · **Mérte:** backend terminál · **Státusz:** mérési jegyzőkönyv
> **Miért:** az F5/2 `HttpProjectAdapter` fail-closed viselkedése eddig **stubbal** volt mérve.
> Az F5/3 kérdése: idegen bérlő tokenjével a feloldás valóban semmit nem ad-e **élő Kernellel**,
> és **melyik réteg tartja** a vonalat.
> **Előzmény:** [`KERNEL_TOKEN_PATH_MEASUREMENT_2026-07-30.md`](KERNEL_TOKEN_PATH_MEASUREMENT_2026-07-30.md)

## A mérőkörnyezet

Eldobható konténerek + lokálisan futtatott hostok, éles rendszer **nem érintve**:

| Elem | Beállítás |
|---|---|
| Keycloak | `quay.io/keycloak/keycloak:24.0.0`, `start-dev`, port **8081**, realm `spaceos` |
| Kernel API | `dotnet run`, port **5099**, `ASPNETCORE_ENVIRONMENT=Development` → SQLite |
| Collaboration host | a `dotnet publish` **másolatából** futtatva (a repót nem módosítottam), port **5098** |
| Collaboration DB | `postgres:16-alpine`, port **5433**, migrációk a hoston át felhúzva |
| Kliens | `portal` (public, direct access grant), **két audience-mapper**: `kernel-api` + `collaboration-api` |
| Felhasználók | `user.a` (`tid`=A bérlő) és `user.b` (`tid`=B bérlő), mindkettő `Admin` szereppel |

**A runbook három csapdáját előre elolvastam** (`TENANT_ONBOARDING_RUNBOOK.md` + a saját
memóriám), és mind a hármat elkerültem: `unmanagedAttributePolicy=ADMIN_EDIT` a realmen (enélkül
a `tid`/`spaceos_tenants` attribútum el sem tárolódik), a user egy POST-tal jött létre
attribútumostul (nincs `PUT`-os teljes csere), és **minden mérés friss tokennel** ment (a lejárt
token 401-e pont úgy néz ki, mint az audience-hiba).

## 1. Kernel A/B mátrix — a bérlő-szűkítés élőben

Két flow-epic, egy-egy bérlőé, ugyanaz a végpont, két különböző `tid`-ű token:

| Kérés | Válasz |
|---|---|
| `GET /api/flow-epics/{epicA}` **A** tokennel (övé a sor) | **200** |
| `GET /api/flow-epics/{epicA}` **B** tokennel (idegen) | **404** |
| `GET /api/flow-epics/{epicB}` **B** tokennel (övé a sor) | **200** |
| `GET /api/flow-epics/{epicB}` **A** tokennel (idegen) | **404** |

A mátrix **mindkét irányban** zár, tehát nem egy epic véletlen tulajdonsága.

## 2. A teljes vermen: pozitív és negatív kontroll

A Collaboration hosthoz két megállapodás (A-host/B-guest és B-host/A-guest), a create-út
`POST /api/collaboration/v1/agreements/{id}/work-packages` végponton:

| Mérés | Kérés | Válasz | DB |
|---|---|---|---|
| **M-POZITÍV** | A token, **saját** epicA, A-host megállapodás | **201 Created** | 1 sor, `work_scope_epic_id` = epicA |
| **M-NEGATÍV** | B token, **idegen** epicA, B saját megállapodása | **422** | **0 sor** |
| **SZIMMETRIA** | A token, **idegen** epicB, A saját megállapodása | **422** | **0 sor** |
| **FANTOM** | B token, **sosem létezett** epic-id | **422** | **0 sor** |

A 422 törzse (a hívó saját inputját mondja vissza, semmi mást):

```json
{"type":"https://httpstatuses.io/422","title":"Work scope does not resolve","status":422,
 "detail":"The work scope names flow-epic e51ca000-…, which the Kernel does not know for this caller.",
 "correlationId":"00-4af29e80…"}
```

**A pozitív kontroll a lényeg:** enélkül a négy 422 üresen zöld lenne — bármi eltörhetett volna a
láncban (rossz base-URL, hiányzó audience, elrontott route), és a „semmit nem ad vissza"
ugyanígy nézne ki. A 201 bizonyítja, hogy a lánc végig **működik**, és a 422-t a bérlő-szűkítés
okozza, nem egy szakadás.

**A FANTOM-eset külön tétel:** egy idegen bérlő létező epicje és egy sosem létezett id
**megkülönböztethetetlen** (mindkettő 422, azonos törzs-alakkal). Így a végpont nem lesz orákulum
arra, hogy „létezik-e X epic a másik cégnél".

## 3. ⭐ MELYIK RÉTEG TARTJA A VONALAT — mérve, nem következtetve

**A Kernel tartja. Egyedül.** Két, egymástól független bizonyíték:

1. **Viselkedés (1. fejezet mátrixa):** a 404 magától a Kerneltől jön, a saját EF query
   filterén át, amit a token `tid` claimje hajt. A Collaboration-oldal ezt csak **továbbadja**.
2. **Szerkezet:** az `IProjectAdapter.ResolveFlowEpicAsync(flowEpicId)` szignatúrájában
   **nincs tenant-paraméter** (az F5/2 root-döntés törölte). Az adapter tehát *elvileg sem*
   tud szűrni — nincs mihez hasonlítania. A handler ugyanígy: a `null`-t 422-vé alakítja, de
   nem dönt bérlőről.

**Amit ez kimond, és amit a jelentésnek hordoznia kell:** ez **nem védelem mélységben**. Egyetlen
réteg tartja, és az a réteg **nem a miénk**. Ha a Kernel `FlowEpics` query filtere elromlik vagy
kikapcsolják, a mi 422-nk **csendben 201-re fordul**, és a Collaboration-suite végig zöld marad —
a mi tesztjeink közül egy sem tudná elkapni, mert stubbal mérnek. A negatív kontroll tehát a
**Kernel tulajdonsága**, és a valódi őre a **kernel-suite**. Ez a mérés ezt a függést szögezi le.

⚠ A kernel query filter kikapcsolásával nem mértem (Kernel-kapu: a Kernelhez nem nyúlok) — a
fenti állítás a mátrixból és a szignatúrából következik, nem mutációból.

## 4. Az epic↔projekt viszony: nem ellenőrizhető — de ez SZÁNDÉKOS, nem hiányosság

A kiírás 4. pontja: *ha bármi mérhetőt találsz, nevesítsd — de NE építsd meg.*

### A mért tények

| Mért tény | Következmény |
|---|---|
| A `FlowEpicDto` mezői: `id`, `title`, `targetFacilityId`, `phase`, `isDelegated` | projekt-azonosító **nincs** benne |
| A Kernel domén-entitásai (15 fájl): `Tenant`, `Facility`, `FlowEpic`, `SpaceLayer`, `WorkStation`, `StageChain*`, … | **`Project` entitás nem létezik**, és a `ProjectId` név **egyetlen** kernel-domain fájlban sem fordul elő |
| A futó kernel SQLite-sémája: 24 tábla | **nincs `Projects` tábla** |

### ⚠ Az első megfogalmazásom félrevezető volt — javítva

Ezt a szakaszt eredetileg „a helyzet rosszabb, mint hittük" felütéssel írtam, mintha hiányt
találtam volna. **Nem az.** A mérés után elolvasott ADR-ek kimondják:

- **ADR-066** (ACCEPTED, Gábor döntése 2026-07-21): a `ProjectRef` tulajdonosa a Kernel `FlowEpic`.
- **ADR-068 §5** (ACCEPTED): *„ma a gyakorlatban nincs ilyen felső szint"* — a FlowEpic **de facto
  a legkisebb és egyben az egyetlen ténylegesen referálható »projekt-egység«**; a FlowEpic fölötti
  projekt-buroknak **nincs tulajdonosa**, `decision_required` Gábornak. Az ADR kifejezetten
  **retire-jelöltnek** minősíti a `FlowManagement.FlowProject` POCO-kat, mert egy felépített
  projekt-réteg *„egy második, redundáns »projekt« fogalom"* lenne.

Vagyis a Kernelben azért nincs `Project`, mert az elfogadott ownership-tábla szerint **ma a
FlowEpic AZ a projekt**. Tanulság a sajátomra: a mérés ELŐTT kellett volna elolvasnom a témába
vágó ADR-eket — ugyanaz a hiba, mint a Keycloak-runbooknál.

### ⭐ Gábor termékdöntése (2026-07-31), ami ezt lezárja

> **„A projekt az epikek felett egy összefogó egység."**

Ez az ADR-068 §5 `decision_required` tételére adott válasz. Három következménye:

1. **A `ProjectId` mező helyes, nem redundáns.** A `CollaborationWorkScope` három mezője
   (Project + Epic + Task) a termékmodellt tükrözi; a scheduling modul azonos alakja szintén.
2. **Visszamenőleg igazolja az F0/F1 tervezést.** Az `EnsureSameProject` invariáns így nyer
   értelmet: egy megállapodás **egy projektet** delegál, de **több epicet is hordozhat** ugyanabból
   a projektből. Ha a projekt = epic lenne, ez „egy megállapodás egy epic"-re zsugorodna.
3. **A `ProjectRef` név-adóssága most nevesíthető:** az ADR-066 `ProjectRef`-je ma egy
   **FlowEpic-azonosítót hordoz `projectId` néven**. Amíg projekt = epic, ez pontos; ha a projekt
   egy szinttel feljebb van, a mező **rossz nevet visel**, és pontosan akkor fog félrevezetni,
   amikor a valódi projekt-szint megérkezik.

### Ami ebből az F4-re és a Doorstarra tartozik

- Az **EpicId** ellenőrizhető és ellenőrzött (F5/2 adapter, F5/3 mérés).
- A **ProjectId** hívó-állította marad, mert a fogalom létezik, de **az adat nem** — nincs
  tulajdonos, tábla, API.
- Az `EnsureSameProject` **belső** konzisztenciát véd, nem külső igazságot.
- ⛔ **Kiadott ígéret, amit ma nem tudunk betartani:** a PLAN-03 kontraktus-követelménye szó
  szerint *„Project–Epic–Task hivatkozások publikus mezőként — a Doorstar opak értékként adja át,
  **a platform validál**"*. A Project-mezőre ez ma **nem igaz**. Ha az F4 ezt nem mondja ki, a
  Doorstar joggal hiszi, hogy a `projectId`-jét valaki ellenőrzi.

**Nem építettem meg semmit** — a projekt-szint tulajdonosának kijelölése önálló döntés
(Kernel-kapu / új bounded context), az F4-kontraktus dolga pedig kimondani, hogy a `projectId` ma
opak korrelációs azonosító.

## 5. A mérőkörnyezet műtermékei — nem termékhiba

- A kernel `POST /api/tenants` **500**-at ad Development/SQLite alatt: `no such table:
  AuditEvents` — az `EnsureCreated` séma nem tartalmazza az audit-táblát (élesben PostgreSQL +
  migrációk). Emiatt a kernel-oldali seedelést **közvetlenül a SQLite-fájlba** írtam
  (`Tenants`/`Facilities`/`FlowEpics`), nem az API-n át. A **mért** út (a `GET /api/flow-epics`)
  ettől független és végig az API-n ment.
- `OutboxBackgroundWorker` ciklikus kivétele: `SQLite does not support … DateTimeOffset in
  ORDER BY` — ugyanaz a Development-műtermék, amit az F5/0 is rögzített.
- Mindkettő **jelzés a Kernel csapatának**, nem javítás (Kernel-kapu).

## 6. Takarítás — és amit közben találtam

- `f53-keycloak` és `f53-collab-db` **törölve**, mindkét host-processz leállítva, az eldobható
  SQLite-fájl és a publish-másolat törölve.
- **Leszakadt Testcontainer:** a takarítás-ellenőrzés egy 12:38 óta futó, `org.testcontainers`
  címkéjű `postgres:16-alpine` konténert talált — a **saját** délelőtti integrációs futásomból
  maradt ott (a reaper nem vitte el). Futó teszt-processz nem volt, ezért eltávolítottam. Ezt
  azért írom le, mert a P0-listám „mérés után takaríts" pontja **eddig is** ott volt, és a
  konténer mégis három órán át élt: a `docker ps` (csak futók) önmagában nem elég, a
  `--filter label=org.testcontainers=true` **`-a`-val** kell.
- **Fantom-bejegyzés:** egy 2026-07-29-i, `Exited (137)` konténert a daemon egyszerre listáz
  (`docker ps -a`) és tagad (`docker rm` → *No such container*). Nem futó processz, nem
  takarítható — kimondom, nem állítom tisztának.
- A **`doorstar-production-db` konténerhez nem nyúltam** — fut, érintetlen.

## Következtetés

1. **A negatív kontroll teljesül**: idegen bérlő tokenjével a horgony-feloldás semmit nem ad, a
   create 422-t kap, és **0 sor** íródik — élő Kernellel, mindkét irányban, fantom-esettel együtt.
2. **A vonalat a Kernel tartja, egyedül** — a mi oldalunk továbbít. Ez a függés kimondva, és a
   valódi őr a kernel-suite.
3. **Az epic↔projekt viszony ma nem ellenőrizhető**, mert a Kernel nem ismer projektet. F4-anyag.
