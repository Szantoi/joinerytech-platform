# WORLDS-PROC-PO-FSM — Purchase Order átmenet-végpontok

- **Szerep:** backend
- **Prioritás:** P1
- **Státusz:** pending
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

- [ ] Submit/confirm/ship HTTP endpoint létezik és friss DTO-t ad.
- [ ] Teljes megengedett és tiltott átmenetmátrix tesztelt.
- [ ] 400/401/403/404/409 hibaszemantika bizonyított.
- [ ] Ismételt kérés nem okoz dupla mellékhatást.
- [ ] OpenAPI és contract-doksi friss.
- [ ] Teljes procurement suite zöld.

## Stop / eszkaláció

Ha a cancel vagy delivery szemantika ellentmond a domainnek, ne bővíts állapotot;
ADR-jelölt és UI-disabled gap szükséges.

## Végrehajtási napló

_Kitöltendő._

## Átadási bizonyíték

_Kitöltendő._

