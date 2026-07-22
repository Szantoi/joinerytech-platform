# WORLDS-PROC-PO-FSM — Purchase Order átmenet-végpontok

- **Szerep:** backend
- **Prioritás:** P1
- **Státusz:** done — root önállóan újraépítette+futtatta (build 0/0, 237/237),
  mergelve spaceos-modules-procurement@9a2cc31
- **Függőség:** `WORLDS-PROC-BUILDFIX`
- **Mutációs határ:** `src/spaceos-modules-procurement/` és ez a task-fájl
- **Tiltott scope:** portal magyar címkék, új PO státusz, többsoros PO redesign

## Cél

A meglévő domain FSM minden portálon használható átmenetéhez legyen HTTP endpoint:
`Draft→Submitted→Confirmed→Shipped→Delivered`, valamint a domain által
engedélyezett cancel ág. Minden siker friss DTO-t adjon.

## Megvalósítás

1. A `PurchaseOrder` aggregátum legyen az egyetlen átmenet-igazságforrás; endpoint
   és handler ne duplikáljon FSM-táblát.
2. Application command/handler: submit, confirm, mark-shipped; delivery meglévő
   tranzakciós logikáját ne duplikáld.
3. HTTP útvonalak a `/api/procurement/orders/{id}/...` csoportban, konzisztens
   igével. Pontos path az OpenAPI-ban rögzítendő.
4. Siker: 200 + friss order DTO; invalid state: 409; payload/Guid: 400; hiányzó:
   404; auth: 401/403.
5. Idempotencia: ugyanazon transition ismétlése ne okozzon dupla eventet vagy
   inventory inbound könyvelést.
6. Unit domain transition matrix + handler + TestServer endpoint teszt.
7. A frontend majd ezt az FSM-et tükrözi; `Approved/Shipping` UI-elnevezés nem
   írhatja át a wire `Confirmed/Shipped` kulcsokat.

## Tesztterv

```powershell
dotnet test src/spaceos-modules-procurement/tests/SpaceOS.Modules.Procurement.Tests/SpaceOS.Modules.Procurement.Tests.csproj --filter "FullyQualifiedName~PurchaseOrder|FullyQualifiedName~ProcurementEndpoints"
dotnet test src/spaceos-modules-procurement/tests/SpaceOS.Modules.Procurement.Tests/SpaceOS.Modules.Procurement.Tests.csproj
dotnet build src/spaceos-modules-procurement/SpaceOS.Modules.Procurement.sln
```

## Elfogadási kritériumok

- [x] Submit/confirm/ship HTTP endpoint létezik és friss DTO-t ad (plusz deliver/cancel).
- [x] Teljes megengedett és tiltott átmenetmátrix tesztelt (6×5 domain-mátrix).
- [x] 400/401/404/409 hibaszemantika bizonyított; 403 tudatosan kihagyva — a
      `PurchaseOrder`-hez ma nincs finomabb RBAC-fogalom, lásd `PO_FSM_API.md` 7. szakasz.
- [x] Ismételt kérés nem okoz dupla mellékhatást (domain-guard idempotencia, tesztelve).
- [x] OpenAPI és contract-doksi friss (`PO_FSM_API.md`, modul-lokális — a mutációs határ
      miatt a `docs/knowledge/architecture/WORLDS_API_CONTRACTS_2026-07-18.md` külső
      kontraktus-doksit ez a task nem érintette).
- [x] Teljes procurement suite zöld (237/237, baseline 162-ről).

## Stop / eszkaláció

Ha a cancel vagy delivery szemantika ellentmond a domainnek, ne bővíts állapotot;
ADR-jelölt és UI-disabled gap szükséges.

## Végrehajtási napló

**2026-07-22** — implementáció + tesztelés végig lefutott, a `src/spaceos-modules-procurement/`
határon belül, a task-fájl kivételével más submodule/portal nem lett érintve.

1. **Feltárás:** a `PurchaseOrder` aggregátum (`Domain/Aggregates/PurchaseOrder.cs`) FSM-je
   már teljes volt (`Submit/Confirm/MarkShipped/RecordDelivery/Cancel`, kivétel-alapú guard),
   de **egyik átmenethez sem volt HTTP-végpont** — ez pontosan megegyezett a
   `WORLDS_API_CONTRACTS_2026-07-18.md` W6-gap-jével ("a Submit/Confirm/MarkShipped
   átmenetekhez nincs HTTP-végpont"). A meglévő `RecordDeliveryCommandHandler` a
   Confirmed→Shipped→Delivered utat egyetlen hívásban intézte (nem volt önálló
   "mark shipped" lépés), és **feltétel nélkül** hívta `MarkShipped()`-et.
2. **Application-réteg:** 4 új command+handler (`SubmitPurchaseOrder`, `ConfirmPurchaseOrder`,
   `MarkPurchaseOrderShipped`, `CancelPurchaseOrder`) — mindegyik kizárólag az aggregátum
   megfelelő metódusát hívja, try/catch(`InvalidOperationException`) fordítja `Result.Conflict`-ra
   (409), friss `OrderStatusResponse` DTO-t ad vissza sikeren (ugyanaz a DTO-alak, mint a
   meglévő `GET /orders/{id}`; közös `OrderStatusResponseFactory` a duplikáció elkerülésére).
   A Delivered-átmenethez **nem** készült új command — a meglévő `RecordDeliveryCommandHandler`
   lett újrahasznosítva, egyetlen célzott javítással: a belső `MarkShipped()`-hívás mostantól
   csak `Confirmed` állapotból fut le (feltétel), különben a már explicit módon Shipped-re
   állított rendelésen hibázna; emellett a handler mostantól try/catch-csel 409-et ad
   illegális állapotú delivery-kérésre (korábban kezeletlen kivétel volt).
3. **API-réteg:** 5 új route a meglévő `ProcurementEndpoints.cs`-ben, a `GetOrderStatus`
   szomszédos endpoint mintáját követve (`string id` + manuális `Guid.TryParse` → 400 rossz
   guid-ra, nem route-constraint). A `/deliver` végpont a meglévő `RecordDeliveryCommand`-ot
   küldi, majd sikeren egy második `GetOrderStatusQuery`-t a friss DTO-ért — a delivery
   tranzakciós logikája (outbox + inventory-inbound) NEM lett duplikálva.
4. **Cancel-ág:** a Stop-klózt megvizsgáltam — a domain már tisztán támogatja a
   Draft/Submitted/Confirmed/Shipped→Cancelled ágat (Delivered-ből és már Cancelled-ből
   helyesen tiltva, nincs kompenzálandó mellékhatás) → **nem kellett ADR-gap-et nyitni**,
   a cancel végpont ugyanazzal a mintával exponálható volt.
5. **Tesztek:** teljes 6×5 (állapot × akció) legális/illegális domain-mátrix
   (`PurchaseOrderTests.TransitionMatrix_ShouldMatchAggregateGuards`) + 2 explicit
   "duplikált hívás nem duplikál eseményt" teszt; handler-szintű tesztek mind a négy új
   parancsra (siker, 404, 409, cross-tenant 404, ismételt hívás) + a Deliver-újrahasznosítás
   (ship-endpoint utáni delivery, ismételt delivery, illegális állapotú delivery — mindhárom
   új eset, mert korábban nem léteztek); TestServer-alapú HTTP-tesztek mind az 5 végpontra
   (200+DTO, 400 mind az 5 route-ra, 401 mind az 5 route-ra, 404, 409).
6. **Dokumentáció:** `PO_FSM_API.md` (modul-lokális OpenAPI/contract-doksi, az `ASN_TRACKING_API.md`
   stílusát követve) — pontos route-táblázat, DTO-alak, idempotencia-mechanizmus, a feltárt és
   javított gap részletes leírása, tudatosan ki nem terjesztett scope. `MEMORY.md` frissítve.

## Átadási bizonyíték

**Épített végpontok** (mind `/api/procurement/orders/{id}/...`, auth: `ManufacturerOnly`):

| Verb | Path | Siker |
|---|---|---|
| POST | `/api/procurement/orders/{id}/submit` | 200 `OrderStatusResponse` (Status=`Submitted`) |
| POST | `/api/procurement/orders/{id}/confirm` | 200 `OrderStatusResponse` (Status=`Confirmed`) |
| POST | `/api/procurement/orders/{id}/ship` | 200 `OrderStatusResponse` (Status=`Shipped`) |
| POST | `/api/procurement/orders/{id}/deliver` | 200 `OrderStatusResponse` (Status=`Delivered`) — újrahasznosítja `RecordDeliveryCommand`-ot |
| POST | `/api/procurement/orders/{id}/cancel` | 200 `OrderStatusResponse` (Status=`Cancelled`) |

Hibaszemantika mind az 5 végpontra bizonyítva teszttel: 400 (rossz guid — `Transition_MalformedGuid_Returns400`,
5× Theory), 401 (`Transition_WithoutAuth_Returns401`, 5× Theory), 404 (ismeretlen/más-tenant ID),
409 (illegális állapot — az aggregátum guard-ja fordítva). 403-teszt tudatosan **nincs**: a
`PurchaseOrder`-hez ma nincs finomabb RBAC-fogalom (ellentétben a requisition-jóváhagyás
SoD-szabályával) — ezt a `PO_FSM_API.md` 7. szakasza dokumentálja.

**Idempotencia-mechanizmus:** a domain-state-guard maga (nem külön idempotencia-kulcs/tábla) —
ismételt kérés a második hívásnál elakad az aggregátum guard-ján (`InvalidOperationException`
→ 409), mielőtt bármilyen `SaveChangesAsync` lefutna, tehát nincs dupla domain-esemény, dupla
`Delivery`-sor vagy dupla `ProcurementOutboxMessage`. Bizonyítva:
`Submit_CalledTwice_SecondCallIsConflict_NoDuplicateSideEffect`,
`Cancel_CalledTwice_SecondCallIsConflict`,
`Deliver_CalledTwice_SecondCallIsConflict_NoDuplicateOutboxOrDelivery` (utóbbi explicit
számolja: `Deliveries.Count`==1, `OutboxMessages.Count`==1 két hívás után is).

**Feltárt és javított domain-gap** (nem Stop-klóz eset, mert javítható volt fabrikálás nélkül):
`RecordDeliveryCommandHandler` feltétel nélkül hívta `MarkShipped()`-et minden delivery-kérésnél;
az új dedikált ship-végpont miatt ez most feltételes (`if (order.Status == Confirmed)`) — lásd
`Deliver_AfterExplicitShipEndpoint_ShouldStillSucceed`. Ugyanitt egy másodlagos, korábban is
létező hiba is javult: illegális állapotú delivery-kérés korábban kezeletlen kivételt dobott
(feltehetően 500), most 409-et ad — lásd `Deliver_FromDraft_ShouldReturnConflictNotThrow`.

**Teszteredmények (ténylegesen lefuttatva, 2026-07-22):**

```
dotnet test src/spaceos-modules-procurement/tests/SpaceOS.Modules.Procurement.Tests/SpaceOS.Modules.Procurement.Tests.csproj --filter "FullyQualifiedName~PurchaseOrder|FullyQualifiedName~ProcurementEndpoints"
→ Passed! - Failed: 0, Passed: 111, Skipped: 0, Total: 111

dotnet test src/spaceos-modules-procurement/tests/SpaceOS.Modules.Procurement.Tests/SpaceOS.Modules.Procurement.Tests.csproj
→ Passed! - Failed: 0, Passed: 237, Skipped: 0, Total: 237
  (baseline a munka előtt: 162 zöld, 0 piros — 75 új teszt, 0 regresszió)

dotnet build src/spaceos-modules-procurement/SpaceOS.Modules.Procurement.sln
→ Build succeeded. 0 Warning(s), 0 Error(s)
```

**Módosított/új fájlok:**
- Új: `src/SpaceOS.Modules.Procurement.Application/Commands/SubmitPurchaseOrder/*`,
  `.../ConfirmPurchaseOrder/*`, `.../MarkPurchaseOrderShipped/*`, `.../CancelPurchaseOrder/*`
- Módosított: `.../Commands/RecordDelivery/RecordDeliveryCommandHandler.cs` (idempotencia-guard),
  `.../Queries/GetOrderStatus/GetOrderStatusQuery.cs` (+`OrderStatusResponseFactory`),
  `.../Queries/GetOrderStatus/GetOrderStatusQueryHandler.cs` (factory-újrahasznosítás),
  `src/SpaceOS.Modules.Procurement.Api/Endpoints/ProcurementEndpoints.cs` (5 új route)
- Új tesztek: `tests/.../Handlers/PurchaseOrderTransitionHandlerTests.cs`,
  `tests/.../Api/PurchaseOrderTransitionEndpointsTests.cs`; bővítve:
  `tests/.../Domain/PurchaseOrderTests.cs`
- Új doksi: `PO_FSM_API.md` (modul-lokális); frissítve: `MEMORY.md`
- Nem érintve: domain-aggregátum (`PurchaseOrder.cs`), portál, más submodule.

A submodule munkakezdéskor tiszta volt (`git status` → "nothing to commit, working tree
clean", 1 commit-tel előzve az originhoz képest, ami nem ehhez a taskhoz tartozik) — a fenti
változtatások commit nélkül, a working tree-ben maradtak, a review-lépésre bízva a mergét.

