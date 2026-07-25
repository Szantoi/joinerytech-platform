# ERPSEP-04 — ERP-mag: Order / Quote / Customer KÜLÖN REPÓBAN, a CRM mint futásidejű tulajdonos

- **Szerep:** backend (domain) + architect
- **Prioritás:** P1
- **Státusz:** pending
- **Döntés-alap:** **ADR-066 ACCEPTED (2026-07-25)** — Gábor döntése:
  *„kell hogy legyen. Megéri, mert újra felhasználható lesz a kód."*
  Ezzel a CRM az `OrderRef` és a külső `PartyRef` **kizárólagos tulajdonosa**.
- **Függőség:** ERPSEP-03 (ADR-066, done). **NEM függ** az ADR-067-től
  (katalógus/aláírás) — az a csomagolási sáv (E2), ez domain-építés (E1).
- **Elhelyezés — ELDÖNTVE (Gábor, 2026-07-25): KÜLÖN REPÓ.** Indoklás szó
  szerint: *„Azért is fontos kitenni külön repóba, hogy ott kisebb kontextussal,
  specializáltan tudjam fejleszteni az LLM-mel."* Ez **nem** csak
  csomag-határ (ERPSEP-05 hatásköre), hanem **repository-határ**: az ERP-mag
  saját repóban él, saját CI-vel, és a platform GitHub Packages-en keresztül
  fogyasztja (a registry ELDÖNTVE, ADR-067: GitHub Packages).
- **Mutációs határ:** az ÚJ ERP-mag repó, valamint a platform oldalán a
  fogyasztói átállás. **A Kernelhez NEM nyúl** (ADR-065: a Kernel
  domain-mentes). Az iparági modulok (`Joinery`, `Procurement`, `Production`,
  `Cutting`) ebben a taskban **csak olvasott bizonyítékok**, nem módosulnak.
- **Tiltott scope:** a három iparági rendelés-modell összevonása vagy
  megszüntetése; Kernel-módosítás; a `Doorstar` repo bármely fájlja.

## Miért ez a legfontosabb szelet

A hét ERP-modul (CRM, Kontrolling, HR, Maintenance, QA, EHS, DMS)
architektúrálisan MA is kiszervezhető: nincs köztük kereszthivatkozás, a
hosting-csomagnak nulla `ProjectReference`-e van. **De amit „ERP alapfunkciónak"
hívunk — rendelés, ajánlat, ügyfél — az ma nem létezik**: a kanonikus CRM-ben
egyetlen `Order`/`Quote`/`Customer` aggregate sincs, csak nyers, típusjelző
nélküli `Guid` mezők mutatnak meg nem épített fogalmakra
(`Opportunity.CustomerId`, `.OrderId`, `.QuoteId`). A valódi rendelés-fogalom
ma háromszor van megépítve, iparági modulokban (`Joinery.DoorOrder`,
`Procurement.PurchaseOrder`, `Production.ProductionJob`).

Ez a task építi meg azt a magot, amire **más telephely/cég is építhet**, és
amire a kézfogás (B2B) is hivatkozhat.

## Fázisok

### 1. fázis — domain-szerződés (design, kód nélkül)

Kimenet: `docs/knowledge/domain/ERP_CORE_DOMAIN_CONTRACT.md`.

1. **Fogalmi határ:** mit jelent az `Order`, `Quote`, `Customer`/`Party` a
   platform szintjén, iparágtól függetlenül. Mi tartozik a maghoz és mi marad
   iparági (pl. ajtó-tétel geometria, beszerzési szállítási feltétel).
2. **Viszony a három MAI rendelés-modellhez** — ez a fázis legfontosabb pontja.
   Mindháromra tételesen: hivatkozik-e a magra (`OrderRef`), a mag hivatkozik-e
   rá, vagy független marad; melyik a forrás-igazság melyik mezőre. Bizonyíték:
   a mai mezők tételes listája fájl:sor hivatkozással.
3. **FSM:** a mag `Order`/`Quote` állapotgépe, és hogyan viszonyul az iparági
   FSM-ekhez (a DoorOrder saját lánca NEM szűnik meg).
4. **Referenciatípusok:** `OrderRef`, `PartyRef` pontos alakja az ADR-066
   5. fejezete szerint, és a csomag, ahová kerülnek
   (`SpaceOS.Modules.Erp.References` — Kernelen KÍVÜL).
5. **Migrációs terv** a mai nyers `Guid`/string mezőkre: `Opportunity`,
   QA `Inspection.OrderId`, Kontrolling `ControllingProjectData.Customer`.

### 2. fázis — repó-alapozás + referencia-csomag

Új repó (javasolt név: `spaceos-erp-core`), **minimális kontextussal**: csak az
ERP-mag domain, a referencia-csomag, a tesztek és a saját CI. Nincs benne
portál, nincs benne iparági modul, nincs benne Kernel-forrás.

- `SpaceOS.Modules.Erp.References`: a hét semleges referenciatípus (ADR-066
  5. fejezet), **nulla modul-függőséggel**, saját unit-tesztekkel.
- Kiadás GitHub Packages-re, verziózva; a platform NuGet-ként fogyasztja
  (a `Cutting.Contracts`/`Inventory.Contracts` mintája szerint, ami MA is
  működik local feeddel).
- **Kockázat, amit előre kezelni kell:** a platformban ma **3 törött gitlink**
  van (sales/identity/keycloak-theme). Az új repó NEM lehet submodule-lánc
  vége — csomag-fogyasztás legyen, ne forrás-submodule, különben ugyanezt a
  hibaosztályt szaporítjuk.

### 3. fázis — ERP-mag aggregátumok (az új repóban)

`Customer`/`Party`, `Quote`, `Order`: domain + perzisztencia (saját séma,
RLS-baseline a hosting-csomag mintájára) + publikus kontraktus (olvasó API a
resolverhez) + integration event-ek. A kanonikus CRM ezután **fogyasztója** a
magnak, nem tulajdonosa a kódnak — az ADR-066 szerinti *ownership* (CRM mint
`OrderRef`/`PartyRef` resolver) a **futásidejű** felelősséget jelenti, a kód
helye ettől független.

### 4. fázis — fogyasztók átállítása

Az `Opportunity` és a többi mai nyers `Guid` mező tipizált referenciára; a QA
és Kontrolling érintett mezői ugyanígy. **Adatmigráció kötelező, nem
törlés-újraírás.**

## Elfogadási kritérium

- [ ] 1. fázis doksija elfogadva (root review), a három iparági modellel való
      viszony tételesen, bizonyítékkal rögzítve.
- [ ] Az ERP-mag **külön repóban** áll, saját CI-vel; a platform NuGet-csomagként
      fogyasztja (nem forrás-submodule-ként).
- [ ] `SpaceOS.Modules.Erp.References` build + unit-tesztek zöldek, **nulla**
      modul-`ProjectReference`.
- [ ] CRM aggregátumok: domain-tesztek, RLS-baseline bizonyítva
      nem-superuser szereppel (a `STAB-RLS-PROOF` mintája szerint).
- [ ] A boundary-gate (`scripts/check-erp-module-boundaries.mjs`) **0 új
      finding**; az új csomag felvéve a hatókörébe.
- [ ] Fogyasztó-migráció után egyetlen nyers `Guid OrderId`/`CustomerId`/
      `QuoteId` sem marad az ERP-modulokban (grep-bizonyíték).
- [ ] Fresh adversarial review a diffre.

## Stop / eszkaláció

- Ha a domain-szerződés bármely pontja **termék-döntést** igényel (pl. az
  ajánlat-árazás melyik modulé), az NEM dönthető el a taskon belül — külön
  kérdésként Gáborhoz.
- Ha kiderül, hogy a mag megépítése egy iparági modell megszüntetését
  igényelné, a task **megáll**: az összevonás külön döntés és külön task.
