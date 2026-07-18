# WORLDS-LOTS-ZONES-DECISION — warehouse domain scope-döntés

- **Szerep:** architect/product
- **Prioritás:** P2
- **Státusz:** pending
- **Függőség:** `WORLDS-INV-READ-API` eredménye
- **Mutációs határ:** architecture/ADR/task dokumentáció; read-only kódaudit
- **Tiltott scope:** domain/API/DB/portal implementáció

## Cél

Dönteni, hogy a lot és zone önálló inventory domainfogalom, más rendszerből
származó referencia vagy a JoineryTech MVP-n kívüli funkció.

## Kötelező vizsgálat

1. Prototípus `LotsPage`, esetleges zone képernyők és `mocks/warehouse.ts` intent.
2. Inventory domain: PanelStock, StockMovement, Offcut és persistence séma.
3. Procurement delivery/ASN és production traceability igények.
4. QA/DMS bizonyíték- és tételazonosítási kapcsolatok.
5. Tenant/RLS és B2B ownership: ki birtokolja a lotot/zone-t?

## Értékelendő opciók

- **A — MVP-ből kizárás:** a képernyők világos „nincs scope-ban” állapotot kapnak.
- **B — Read projection:** lot/zone külső vagy movement adatokból származó, nem
  birtokolt referencia.
- **C — Inventory domain-bővítés:** Lot és Zone aggregátum/entitás migrációval,
  API-val és RLS-sel.

Mindegyikhez: üzleti érték, ownership, események, migráció, API, UI, biztonság,
teszt és visszavonhatóság.

## Elfogadási kritériumok

- [ ] Egy ajánlott és legalább két elvetett opció indoklással.
- [ ] Ownership és source-of-truth egyértelmű.
- [ ] Nincs implementáció a döntésben.
- [ ] Elfogadott döntés után külön, becsülhető taskok készíthetők.

## Stop / eszkaláció

Ha üzleti döntés hiányzik, a kimenet `decision_required`, nem önkényes C opció.

## Végrehajtási napló

_Kitöltendő._

## Átadási bizonyíték

_Kitöltendő._

