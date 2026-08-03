# ERP CORE DOMAIN CONTRACT — Order / Quote / Customer (spaceos-erp-core)

> **Kiadta:** root terminál — 2026-07-25 · **Task:** `ERPSEP-04` 1. fázis
> **Döntés-alap:** ADR-066 **ACCEPTED** (Gábor, 2026-07-25): Order/Quote/Customer
> aggregate épül; a CRM a futásidejű tulajdonos; az elhelyezés **külön repó**
> (`spaceos-erp-core`), GitHub Packages-en fogyasztva.
> **Módszer:** 4 párhuzamos olvasó-lencse a teljes platformon + minden
> kulcs-állítás független adversarial verify (**24/24 megerősítve, 0 cáfolt**).
> Ez a dokumentum DESIGN — kód ebben a fázisban nem változott.

---

## 0. Vezetői összefoglaló

A platformon ma **nincs egyetlen kanonikus Order-, Quote- vagy Customer-fogalom
sem** — ehelyett:

- a **rendelés** háromszor van megépítve, három iparági modulban, három
  különböző célra (kereskedelmi ajtórendelés / beszerzési rendelés / gyártási
  job);
- a **Quote** négy párhuzamos alakban él, ebből a "hivatalos" (sales) forrása
  **elveszett** (üres, nem trackelt könyvtár, a repo GitHubon nem létezik);
- **Customer/Party aggregate SEHOL nincs** — csak nyers, nem validált `Guid`
  mezők és free-text nevek (a CRM kódja ki is mondja: *„this module has no
  customer directory and does not invent one"*).

Az ERP-mag ezt a hiányt tölti be: **egy** ügyfél-, **egy** ajánlat- és **egy**
(kereskedelmi) rendelés-fogalom, iparág-független alakban, amire minden modul
tipizált referenciával (`OrderRef`, `QuoteRef`, `PartyRef`) hivatkozik — és
amit a jövőben más telephely/cég (tenant) is használ, kézfogásokon keresztül
összekötve.

**A legfontosabb elhatárolás:** a mag a **kereskedelmi igazság** tulajdonosa
(ki, mit, mennyiért), az iparági modulok a **teljesítés** tulajdonosai maradnak
(hogyan gyártjuk/szállítjuk). Egyik iparági modell sem szűnik meg.

---

## 1. Fogalmi határ — mi MAG és mi IPARÁGI

### 1.1 A mag fogalmai

| Fogalom | Mit jelent (iparág-függetlenül) | Mai legjobb minta a platformon |
|---|---|---|
| **Party (Customer)** | Jogi/természetes személy, akivel üzleti kapcsolatban állunk. Első körben a VEVŐ-oldal (Customer szerep); a szállító-oldal (Supplier szerep) kérdését ld. D-1. | **nincs** — ez az építendő új fogalom |
| **Quote** | Ajánlat egy Party felé: tétel-sorok, összegek, érvényesség, elfogadás-követés | cutting `CuttingQuoteRequest` FSM-mintája (4 állapot, perzisztált aggregate) — `src/spaceos-modules-cutting` |
| **Order** | Elfogadott kereskedelmi megrendelés: Party + tétel-sorok + összegek + durva kereskedelmi státusz | a joinery **`DoorOrderConvertedLine`** sor-mintája és a DoorOrder összeg-mintája (ld. 1.3) |
| **OrderLine / QuoteLine** | Kereskedelmi tétel-sor: megnevezés, mennyiség, nettó egységár, ÁFA-kulcs, kedvezmény | `DoorOrderConvertedLine.cs:7-15` — *bizonyítottan* iparág-független: `Description (1..500), Quantity>0, UnitPriceNet>=0, VatRate 0..1, DiscountPercent? 0..100, SortOrder` |
| **Money** | Összeg + ISO-4217 deviza — ÚJ value object (ma sehol nincs: mindenhol csupasz `decimal` + `string` pár) | oszlop-alak kompatibilis a joinery-vel: `decimal(18,4)` + 3 karakteres validált currency (`DoorOrder.cs:195-196`) |

### 1.2 Ami IPARÁGI marad (tételesen, bizonyítékkal)

| Modell | Miért NEM mag | Bizonyíték |
|---|---|---|
| `Joinery.DoorOrder` **gyártási fele** | a `DoorItem` tisztán iparági: DoorType, OpeningDirection, DoorDimensions (préselési max 2600×3000 mm!), Surface/Glazing/Hardware/MaterialSpec — ár nincs rajta | `DoorItem.cs:10-21`, `DoorDimensions.cs:32-35` |
| `Procurement.PurchaseOrder` | ez BESZERZÉSI (szállító-oldali) rendelés, nem vevői: SupplierId + MaterialType + Quantity + UnitPrice, tétel-kollekció nélkül — a mag Order a VEVŐI oldalt fedi | `PurchaseOrder.cs:9-18` |
| `Production.ProductionJob` | NEM kereskedelmi fogalom: nincs benne ár/összeg/currency, még TenantId sincs; a "tételei" 6 fix magyar nevű gyártási lépés, a státusza a lépésekből DERIVÁLT | lencse-1 verify-zott tényei |
| cutting `PublicQuoteRequest` | B2C beérkező kérelem, tenant nélkül perzisztált, string-státuszú — modul-lokális intake marad, nem a mag Quote | lencse-2 |
| Procurement `Supplier` | az egyetlen ma létező párt-szerű aggregate — de beszerzési törzsadat; a Party alá vonása D-1 döntés | lencse-2 |

### 1.3 A sor- és összeg-minta átvétele

A mag a **bizonyítottan működő** joinery kereskedelmi mintát veszi át (nem újat
talál ki):

- sorok: a `DoorOrderConvertedLine` validációs szabályai változatlanul;
- összegek: `TotalNet / TotalVat / TotalGross` `decimal(18,4)`-ben,
  ISO-4217 currency-vel;
- az egyetlen tudatos újítás a **`Money` value object** (Amount + Currency
  egyben) — az oszlop-leképezés marad a fenti alak, tehát a meglévő
  konverziós DTO-kkal (`OrderConversionRequestDto.cs:5-15`) bináris-kompatibilis.

---

## 2. Viszony a három iparági rendelés-modellhez ⭐

**Irány-szabály (ADR-066-ból következik):** az iparági modul hivatkozik a magra
(`OrderRef`), a mag SOHA nem hivatkozik iparági típusra. A mag a kereskedelmi
állapot forrás-igazsága; a teljesítési állapot az iparági modulé.

### 2.1 `Joinery.DoorOrder` — a LEGSZOROSABB kapcsolat

A DoorOrder **már ma is** egy elveszett külső rendszertől (sales) kapja a
kereskedelmi adatait: `CreateFromConversion` → `ConfirmedFromSales` állapot,
`SourceQuoteId`, `CustomerId`, `Currency`, `TotalNet/Vat/Gross`, `Lines[]`
(`DoorOrder.cs:29-37, 230`; `OrderConversionRequestDto.cs`). **A mag pontosan
ebbe a már létező nyílásba illeszkedik:** a sales helyét az erp-core veszi át.

| Mező ma | Jövőben |
|---|---|
| `SourceQuoteId Guid?` | `QuoteRef` (a mag Quote-jára) |
| `CustomerId Guid?` (típus/FK nélkül) | `PartyRef` |
| `Currency/TotalNet/Vat/Gross` + `_convertedLines` | a mag Order a forrás-igazság; a DoorOrder-ben DENORMALIZÁLT másolat marad (offline gyártás-műveleti okból), a mag `OrderRef`-fel |
| `ConfirmedFromSalesAt` | `ConfirmedFromOrderAt` (szemantika azonos) |

A DoorOrder 9-állapotú FSM-je **változatlan marad** — a 3 elérhetetlen állapot
(`InProduction/Completed/Cancelled`, `DoorOrderFsmTests.cs:294`) bekötése
KÜLÖN, joinery-oldali döntés, nem e szerződés dolga.

### 2.2 `Procurement.PurchaseOrder` — NINCS közvetlen kapcsolat

A vevői Order és a beszerzési PurchaseOrder különböző fogalmak. A mag első
üteme NEM nyúl a procurementhez. Kapcsolódási pont később kettő lehet:
(a) Supplier → Party (D-1 döntés), (b) vevői rendelés → beszerzési igény
lánc — mindkettő külön task, e szerződés csak rögzíti, hogy tudatosan maradt ki.

### 2.3 `Production.ProductionJob` — laza, opcionális referencia

A ProductionJob nyers `Guid CustomerId`-t hordoz ma. Jövőben: **opcionális**
`OrderRef` + `PartyRef` (nullable) — a gyártási job létezhet rendelés nélkül is
(belső gyártás). A job derivált státusz-modellje érintetlen.

---

## 3. A mag aggregátumai és FSM-jei

### 3.1 `Party` (Customer-szerep)

```
Party: Id, TenantId, Kind (Organization|Person), DisplayName (1..200),
       TaxId?, Email?, Phone?, BillingAddress?, Status (Active|Archived),
       CreatedAt, Version
```
FSM-je minimális: `Active ⇄ Archived` (archivált Party-ra új Quote/Order nem
vehető fel; a meglévők olvashatók). Nincs törlés — csak archiválás (audit).

### 3.2 `Quote`

```
Quote: Id, TenantId, PartyId, QuoteNumber (tenant-egyedi), Lines[],
       TotalNet/TotalVat/TotalGross (Money), ValidUntil?,
       Status, CreatedAt, Version
FSM:  Draft → Sent → Accepted → ConvertedToOrder
              Sent → Rejected | Expired
      (Draft-ból: Withdrawn)
```
A cutting `CuttingQuoteRequest` 4-állapotú mintájának általánosítása. A
`ConvertedToOrder` átmenet hozza létre a mag `Order`-t (tranzakcionálisan,
a Quote soraiból másolva — a Quote ezután immutábilis).

### 3.3 `Order`

```
Order: Id, TenantId, PartyId, OrderNumber (tenant-egyedi), SourceQuoteId?,
       Lines[], TotalNet/TotalVat/TotalGross (Money),
       Status, ConfirmedAt?, CreatedAt, Version
FSM:  Draft → Confirmed → Fulfilled
      Draft|Confirmed → Cancelled
```
**Szándékosan durva FSM.** A finom teljesítési állapot (gyártás alatt,
szállításra kész…) az iparági modulé; az iparági modul integration eventtel
jelez vissza (`OrderFulfilmentReported`), amiből a mag a `Fulfilled` átmenetet
hajtja végre. A mag nem másolja le a DoorOrder 9 állapotát — az a hiba lenne,
amit az ADR-066 8.x pontjai dokumentálnak (duplikált FSM-táblák driftje).

### 3.4 Integration eventek (kontraktus-csomag)

`Erp.Contracts`: `QuoteAccepted`, `OrderConfirmed`, `OrderCancelled`,
`OrderFulfilmentReported` (bejövő), `PartyArchived`. **Transzport:** a Kernel
Outbox kódszinten teljes, de élő fogadója ma nincs (lencse-4) — a mag ezért
saját outbox-táblával indul, a transzport-döntés (Kernel Outbox PoC — ADR-066
9.3) NEM blokkolja ezt a taskot.

---

## 4. Referenciatípusok — `SpaceOS.Modules.Erp.References`

Az ADR-066 5. fejezete szerint, az új repóban, **nulla függőséggel**:

```csharp
public readonly record struct OrderRef(Guid OrderId);
public readonly record struct QuoteRef(Guid QuoteId);
public enum PartyKind { Internal, External }
public readonly record struct PartyRef(Guid PartyId, PartyKind Kind);
```

(A további öt semleges típus — `SubjectRef`, `WorkItemRef`, `AssetRef`,
`DocumentRef`, belső `PartyRef`-resolver HR-nél — az ADR-066 mátrixa szerint;
egyetlen csomagban, hogy az ERP-modulok EGY helyről kapják.)

---

## 5. Migrációs terv — a nyers referenciák tételes leltára

A lencse-3 a teljes 7-modulos leltárt elkészítette; az ADR-066 5 mezője mellett
**további hármat talált**:

| # | Mező ma | Terv | Megjegyzés |
|---|---|---|---|
| 1 | `crm.opportunities.customer_id` (NOT NULL uuid, nincs FK/index) | `PartyRef` + FK a mag Party-jára | a wire már ma `orderRef`/`quoteRef` néven ad ki — a portál-kontraktus előre kompatibilis |
| 2 | `crm.opportunities.order_id` (nullable) | `OrderRef` | |
| 3 | `crm.opportunities.quote_id` (nullable) | `QuoteRef` | ⚠ élesítés előtti adat-audit: kerülhetett-e `Guid.Empty` egy korábbi kódállapotban |
| 4 | `qa.inspections.order_id` | `OrderRef` + **(TenantId, OrderId) index** | 3 WHERE-alapú olvasó út fut rá ma index nélkül |
| 5 | **`qa.tickets.order_id`** | `OrderRef` | **az ADR-066-ból HIÁNYZÓ mező** — e leltár új lelete |
| 6 | Kontrolling `ControllingProjectData.Customer` (string név) | `PartyRef` + denormalizált `displayName` | nem perzisztált (config-seed) — de a REST DTO + portál-séma breaking change |
| 7 | EHS `hazardous_materials.supplier` (string(200) név) | marad név + később opcionális `PartyRef` | nincs beszállító-törzs, amiből backfillelhető lenne — őszinte korlát |
| 8 | DMS `link_id` (string(100)!) | marad display-kulcs; Order/Customer linkType mellé OPCIONÁLIS tipizált ref | a repository ma csak LinkType-ra szűr + ILIKE — nem Guid-alapú |

Sorrend: 1–3 (CRM, a tulajdonos) → 4–5 (QA, indexszel) → 6 (Kontrolling,
DTO-verzióval) → 7–8 (opportunisztikus). **Mindenhol adatmigráció, nem
törlés-újraírás** (task-szabály).

## 6. Az új repó váza és előfeltételei

```
spaceos-erp-core/
  src/Erp.References/      (nulla függőség — 2. fázis)
  src/Erp.Contracts/       (DTO-k + integration eventek)
  src/Erp.Domain/          (Party, Quote, Order — a CRM Domain mintájára)
  src/Erp.Infrastructure/  (EF Core, saját `erp` séma, RLS-baseline)
  src/Erp.Api/             (host — hosting-csomag fogyasztóként)
  tests/                   (domain + NonSuperuserRlsFixture-mintájú RLS-proof)
```

**Bizonyított minta-döntések (lencse-4):**

- **Domain-függőség:** a kanonikus **CRM Domain a sablon** — nulla
  `ProjectReference`, csak `Ardalis.Result` + `MediatR.Contracts` csomag. Az
  EHS-minta (kernel-submodule-ra hivatkozó Domain) külön repóban NEM járható.
- **DB:** közös `spaceos` DB (natív, 5433) + saját `erp` séma + dedikált
  `spaceos_erp_app` szerep (`NOSUPERUSER NOBYPASSRLS` — a
  `scripts/db/init-module-app-roles.sql` scripttel). Ez az élőben mért,
  domináns modell; a 3-DB-modell konszolidáció (D-2) ettől független.
- **Csomag-minta:** `Inventory.Contracts` az etalon (minimál csproj,
  PackageId+Version+IsPackable, pin-elt fogyasztás).

**Előfeltétel-leletek (a 2–3. fázis előtt rendezendők):**

1. ⚠ A **hosting-csomag ma NEM NuGet-csomag** (nincs PackageId/IsPackable,
   egyik feedben sincs .nupkg) — külön repóból csak csomagként fogyasztható.
   → kis task: hosting NuGet-metaadat + kiadás (az `ERPSEP-05` előszelete).
2. ⚠ **GitHub Packages registry nincs bekonfigurálva** (ADR-067 kimondja) —
   az első kiadás előtt kell a feed + token (Gábor GitHub-fiókja alatt).
3. A kontraktus-verziók ma driftelnek a fogyasztóknál (Cutting: contracts
   1.3.0, Inventory: 1.2.0) — az erp-core kiadási fegyelme legyen szigorúbb:
   a platform-pin EGY helyen (Directory.Packages.props jelölt, külön döntés).

## 7. Gábor döntését igénylő pontok (nem blokkolják a 2. fázist)

| # | Kérdés | Ajánlás |
|---|---|---|
| **D-1** | A Procurement `Supplier` beolvad-e a Party-ba (Supplier-szereppel)? | **később** — az első ütem a vevő-oldal; a Supplier ma működik, a beolvasztás külön migráció |
| **D-2** | A 3 együtt élő DB-modell konszolidációja (HR/DMS külön DB-k sorsa) | a mag mindenképp a közös `spaceos` DB-be megy; a HR/DMS kérdés független |
| **D-3** | A cutting publikus quote-accept (12-hex token, email-megerősítés nélkül) kapjon-e Party-kapcsolatot az Order-konverziónál? | igen, de csak a cutting→mag integrációs ütemben — most nem blokkoló |

## 8. Nyitott kérdések (a 3. fázis tervezéséhez, nem döntés-igényűek)

- CRM `SendProposal`: az endpoint `Guid.Empty`-t küld, ha a portál nem ad
  QuoteId-t, miközben a validátor `NotEmpty`-t követel (`OpportunityEndpoints.cs:224`
  vs `OpportunityCommandValidators.cs:96-97`) — élő wire-törésveszély, a mag
  bekötésekor rendezendő.
- A portál lead-konverziója üres bodyval hívja a backendet, ami kötelező
  `CustomerId`-t vár (`leads.ts:104-109` vs `LeadEndpoints.cs:414`) — a Party
  megépülése után a portál-flow-nak Party-választót kell adnia.
- QA `GetTicketsByOrderQuery`: handler + repository út van, REST route nincs —
  szándékos-e, tisztázandó a QA-oldali bekötésnél.
