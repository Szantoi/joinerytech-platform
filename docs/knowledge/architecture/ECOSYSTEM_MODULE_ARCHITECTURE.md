# SpaceOS — Ecosystem Module Architecture
## T-Shape Strategy · Actor Taxonomy · Module Decomposition

> **Verzió:** v1.0 — 2026-04-11
> **Státusz:** TERVEZÉSI DÖNTÉS RÖGZÍTVE — arch-planner input
> **Döntéshozó:** Gábor (Architect & Founder)
> **Kontextus:** Design session 2026-04-11 — ökoszisztéma struktúra tervezése
> **Előzmények:** Modules.Joinery v1 DONE · Modules.Abstractions v1 (A+B) DONE · Phase 3C+ DONE · Doorstar Onboarding DONE
> **Következő lépés:** `/spaceos-arch-planner` — Ecosystem Actor Architecture tervezése

---

## 1. T-Shape fejlesztési stratégia

### A koncepció

A SpaceOS fejlesztése **T alakú** stratégiát követ:

- **Szélesség (horizontal):** Az ökoszisztéma összes aktor-típusának strukturális lefedése — gyártó, lapszabász, kereskedő, szállító, beszerelő, megrendelő. A cél: minden cégtípus regisztrálható, B2B kapcsolatot létesíthet, és szimulálható adat- és kapcsolatszinten.
- **Mélység (vertical):** Az ajtógyártó modul (Doorstar) mint referencia-mélység. A teljes vertikum: konfiguráció → számítás → szabászat → gyártás → PDF export → Escrow. Ez a mérce, amit minden aktor-típus végül megkap.

### Mérőszám

Egy aktor-típus érettségét az határozza meg, hogy a referencia-mélység hány rétegét valósítja meg. Az ajtó modul az etalon — 100%-os mélység.

### Fejlesztési sorrend

| Fázis | Mit | Miért |
|-------|-----|-------|
| **1. Struktúra (szélesség)** | Minden aktor-típus definiálása, ModuleRegistry, B2B gráf kiterjesztés | Enélkül minden trade-specifikus modul ad-hoc; a struktúra megalapozza a skálázhatóságot |
| **2. Közös modulok kiemelése** | Modules.Cutting, Modules.Spatial — a közös funkciók önálló modulba szervezése | A közös modulokat minden aktor használja; ha bent maradnak egy trade-specifikus modulban, duplikáció keletkezik |
| **3. Trade-specifikus mélység** | Cabinet v1, majd minden további trade | A struktúra és a közös modulok megvannak; csak a trade-specifikus réteg kell |

---

## 2. Ökoszisztéma aktor taxonómia

### ADR-018: Ecosystem Actor Types

**Kontextus:** A jelenlegi rendszer csak gyártókat (Manufacturer) kezel. A valós faiparos ökoszisztéma ennél lényegesen szélesebb — lapszabász szolgáltatók, kereskedők, szállítók, beszerelők, és megrendelők is részei a láncolatnak.

**Döntés:** A TenantType enum bővítése az összes releváns aktor-típussal. Minden aktor-típus saját modul-készletet kap, és B2B Handshake-en keresztül kapcsolódik a többi aktorhoz.

**Következmény:** A rendszer nem lineáris lánc, hanem **aktor-gráf** — bármelyik aktor-típus kezdeményezhet kapcsolatot bármelyik másikkal.

| Aktor típus | Angol azonosító | Leírás | Jellemző modulok | B2B szerep |
|---|---|---|---|---|
| **Gyártó** | `Manufacturer` | Terméket gyárt (ajtó, szekrény, ablak) | Door / Cabinet / Window + Cutting + Spatial | Producer ÉS Customer |
| **Lapszabász** | `PanelCutter` | CNC szabászat szolgáltatásként | Cutting | Producer (szolgáltatás) |
| **Kereskedő** | `Trader` | Anyagot, alapanyagot, terméket forgalmaz | Trading (katalógus, ár, készlet) | Supplier |
| **Szállító** | `Logistics` | Szállítást, logisztikát végez | Delivery (útvonal, időablak, szállítólevél) | Service provider |
| **Beszerelő** | `Installer` | Helyszíni telepítés, szerelés | Installation (FSM, checklist, fotó) | Service provider |
| **Megrendelő** | `EndCustomer` | Megrendel, elfogad, fizet | Orders (portál, Escrow, jóváhagyás) | Customer |

### B2B Relativity kiterjesztés

A B2B Relativity alapelv változatlan: **ugyanaz a cég egyszerre lehet producer és customer, kontextustól függően.** Ezt most kiterjesztjük a szolgáltatásokra:

| Példa | Aktor A | Aktor B | Kapcsolat |
|---|---|---|---|
| Doorstar ajtót gyárt | Doorstar (Manufacturer) | Megrendelő (EndCustomer) | Doorstar = Producer |
| Doorstar szekrényt rendel | Doorstar (Manufacturer) | Szekrénygyártó (Manufacturer) | Doorstar = Customer |
| Gyártó szabászatot rendel | Gyártó (Manufacturer) | Lapszabász (PanelCutter) | Gyártó = Customer |
| Gyártó belső szabászata | Gyártó (Manufacturer) | — (belső részleg) | Self-task, Cutting modul |
| Kereskedő szállítást rendel | Kereskedő (Trader) | Szállító (Logistics) | Kereskedő = Customer |
| Beszerelő ajtót rendel | Beszerelő (Installer) | Doorstar (Manufacturer) | Beszerelő = Customer |

**Kulcs felismerés:** Egy szabászat (Cutting) modul ugyanúgy működik, akár a gyártó belső részlege csinálja, akár egy külső lapszabász cég. A szakmai szükségletek azonosak — csak a B2B kontextus különbözik. Ez igaz minden közös modulra.

---

## 3. Modul dekompozíció

### ADR-019: Module Decomposition — Közös vs. Trade-Specifikus

**Kontextus:** A jelenlegi Modules.Joinery v1 vegyesen tartalmaz közös (szabászat, anyagszükséglet) és trade-specifikus (DoorOrder, DoorDimensions) kódot. Ha a Cabinet modult is így építjük, duplikáció keletkezik.

**Döntés:** A modulokat két kategóriába soroljuk:
- **Közös modulok:** Minden trade-type és aktor-típus használja. Önálló modul, önálló repo.
- **Trade-specifikus modulok:** Csak az adott szakterület domain logikáját tartalmazza. A közös modulokra épít.

**Következmény:** A Joinery v1 közös részeit ki kell emelni. A Cabinet v1 már a tiszta struktúrára épül.

#### Közös modulok

| Modul | Felelősség | Ki használja | Megjegyzés |
|---|---|---|---|
| **Modules.Abstractions** | Graph Engine, ProductTemplate, parametrikus számítás | Minden gyártó + lapszabász | ✅ Létezik (Phase A+B DONE) |
| **Modules.Cutting** *(ÚJ)* | Szabászlista generálás, CNC utasítás, anyagszükséglet számítás, ProcessTask | Minden gyártó + lapszabász (belső vagy külső) | Kiemelendő a Joinery v1-ből |
| **Modules.Spatial** *(ÚJ)* | Térelrendezés, falak, nyílások, 3D megjelenítés (Three.js backend) | Minden trade-type tervezési fázisában | Közös alap: tér → benne ajtó VAGY szekrény |

#### Trade-specifikus modulok

| Modul | Felelősség | Aktor-típus | Állapot |
|---|---|---|---|
| **Modules.Door** *(Joinery átnevezése)* | DoorOrder aggregate, ajtó-specifikus domain szabályok, Doorstar seed | Manufacturer (door) | Létezik — átnevezés + közös kód kiemelése |
| **Modules.Cabinet** *(ÚJ)* | CabinetOrder aggregate, korpusz-specifikus domain (fiókok, polcok, frontok, vasalatok) | Manufacturer (cabinet) | Tervezendő |
| **Modules.Window** *(placeholder)* | Ablak-specifikus domain | Manufacturer (window) | Horizon 3 |
| **Modules.Trading** *(jövő)* | Katalógus, árképzés, készletkezelés | Trader | Struktúrában definiált, nem implementált |
| **Modules.Delivery** *(jövő)* | Útvonaltervezés, időablak, szállítólevél | Logistics | Struktúrában definiált, nem implementált |
| **Modules.Installation** *(jövő)* | Helyszíni FSM, checklist, fotódokumentáció | Installer | Struktúrában definiált, nem implementált |

### A szétválás logikája — Modules.Joinery v1 → Door + Cutting

| Jelenlegi Joinery v1 elem | Célmodul | Indoklás |
|---|---|---|
| `CuttingListItem`, `FinishedDimension` | → **Modules.Cutting** | Szabászat = közös, nem ajtó-specifikus |
| `HardwareListItem`, `MaterialRequirement` | → **Modules.Cutting** | Anyagszükséglet = közös |
| `ProcessTask`, `ProcessTaskTemplate` | → **Modules.Cutting** | Gyártási folyamatlépés = közös |
| `DoorCalculationService` | → **Modules.Cutting** (generikus) + **Modules.Door** (ajtó-specifikus szabályok) | A számítás logikája közös; az input paraméterek trade-specifikusak |
| `DoorOrder`, `DoorItem`, `DoorDimensions` | → **Modules.Door** | Ajtó domain |
| `DoorType`, `OpeningDirection`, `SurfaceType` | → **Modules.Door** | Ajtó domain enumok |
| `DoorTypeRule`, `PartDimensionRule` | → **Modules.Door** (de ADR-014 szerint elavul → Graph Engine) | Átmeneti — a Graph Engine váltja ki |

---

## 4. Portal UI szétválás

### ADR-020: Kontextus-alapú UI szétválás

**Kontextus — Gábor döntése:** *"Ha sok a menüpont egy felületen, akkor elveszik a felhasználó."*

**Döntés:** A Portal UI kontextus-alapú nézeteket használ. Egy felhasználó adott pillanatban egyetlen kontextusban dolgozik. A menüpontok az aktív kontextushoz igazodnak.

**Következmény:** A moduleRouter már implementált (`enabledModules` alapú routing). A következő lépés a kontextus-váltás UX tervezése.

| UI kontextus | Amit lát a felhasználó | Amit NEM lát | Trade-független? |
|---|---|---|---|
| **Tértervezés** (Spatial) | Falak, nyílások, méretek, 3D nézet (Three.js) | Szabászlista, konfigurálás | ✅ Igen — minden trade-nek kell |
| **Ajtó konfigurátor** (Door) | Ajtó méretek, felületek, vasalat, ajtótípus | Szekrény opciók, tér részletei | ❌ Trade-specifikus |
| **Szekrény konfigurátor** (Cabinet) | Korpusz, fiókok, polcok, frontok, vasalatok | Ajtó opciók, tér részletei | ❌ Trade-specifikus |
| **Szabászat** (Cutting) | Alkatrészlista, CNC utasítások, anyagszükséglet | Tértervezés, konfiguráció | ✅ Igen — belső vagy külső |
| **Megrendelések** (Orders) | B2B Handshake-ek, rendelés státusz, jóváhagyás | Gyártási részletek | ✅ Igen — minden aktor |
| **Szállítás** (Delivery) | Útvonal, időablak, szállítólevél | Gyártás, konfiguráció | ❌ Aktor-specifikus |

### A térelrendezés és a trade-specifikus konfigurátor viszonya

A tértervezés (Spatial) **közös kiindulópont**: falak, nyílások, méretek meghatározása. Ebből a kontextusból lép be a felhasználó a trade-specifikus konfigurátorba:

```
Spatial (3D tér)
  → Nyílás kiválasztása → Door konfigurátor (ajtó méretezés)
  → Fal szakasz kiválasztása → Cabinet konfigurátor (szekrény méretezés)
  → Padló terület → [jövő: konyha, fürdőszoba layout]
```

Ez a Three.js szint — a Modules.Spatial modul felelőssége.

---

## 5. ModuleRegistry koncepció

### Tenant → Module mapping

A jelenlegi `EnabledModules varchar[]` (Kernel Tenants tábla, Migration 0025) már támogatja a modul-készlet konfigurálást. A ModuleRegistry ezt formalizálja:

| TenantType | Kötelező modulok | Opcionális modulok |
|---|---|---|
| `Manufacturer` | Cutting, Spatial | Door, Cabinet, Window (trade-függő) |
| `PanelCutter` | Cutting | — |
| `Trader` | Trading | Delivery (ha saját szállítás) |
| `Logistics` | Delivery | — |
| `Installer` | Installation | — |
| `EndCustomer` | Orders | — |

### Példa tenant konfigurációk

```
Doorstar Kft. (Manufacturer)
  enabledModules: ['door', 'cutting', 'spatial']
  → Ajtógyártó, saját szabászattal

Nagy Asztalos Kft. (Manufacturer)
  enabledModules: ['door', 'cabinet', 'cutting', 'spatial']
  → Ajtó ÉS szekrénygyártó

Kis Szekrénygyártó Bt. (Manufacturer)
  enabledModules: ['cabinet', 'spatial']
  → Szekrénygyártó, külső szabászattal (B2B Handshake → PanelCutter)

Profi Lapszabász Kft. (PanelCutter)
  enabledModules: ['cutting']
  → Csak szabászat szolgáltatás

Anyag-Pont Kft. (Trader)
  enabledModules: ['trading']
  → Anyagkereskedő

Szállító Expressz Kft. (Logistics)
  enabledModules: ['delivery']
  → Szállítási szolgáltatás

Mester Beszerelő Kft. (Installer)
  enabledModules: ['installation']
  → Helyszíni beszerelés
```

---

## 6. Kapcsolat a Mathematical Furniture Theory-vel

A modul dekompozíció összhangban van a gravitáció-vezérelt ekvivalencia-osztályokkal:

| Halmaz | Gravitációs reláció | Trade-specifikus modul | Közös modul |
|---|---|---|---|
| 1. halmaz (függőlegesek) | n⃗ · g⃗ = 0 | Door (oldalfal, tok) · Cabinet (oldallapok) | Cutting, Spatial |
| 2. halmaz (vízszintesek) | n⃗ · g⃗ ≠ 0 | Cabinet (polcok, fenéklap, tetőlap) | Cutting, Spatial |
| 3. halmaz (ferdék) | 0 < |n⃗ · g⃗| < 1 | Cabinet (döntött cipőtartó) · Window (tetőablak) | Cutting, Spatial |

A Modules.Abstractions Graph Engine a `DimensionAxis` enum-on keresztül kezeli ezeket a halmazokat — a trade-specifikus modul csak a gravitációs kontextust adja meg.

---

## 7. Implementációs sorrend (roadmap)

| # | Fázis | Tartalom | Blokkoló | Becsült effort |
|---|---|---|---|---|
| 0 | **Stage Registry tesztek** | MSG-057 DoD lezárás — ≥45 teszt | — | ~3 nap |
| 1 | **Ecosystem Actor Architecture** | TenantType bővítés, ModuleRegistry, B2B gráf kiterjesztés, seed data | Stage Registry DoD | ~8-10 nap (tervezés + implementáció) |
| 2 | **Modules.Cutting kiemelés** | Szabászat kiemelése Joinery v1-ből önálló modulba | Ecosystem Architecture DoD | ~10-12 nap |
| 3 | **Modules.Door átnevezés** | Joinery → Door, közös kód eltávolítása | Modules.Cutting DoD | ~3-5 nap |
| 4 | **Modules.Cabinet v1** | Szekrény-specifikus domain, Graph Engine seed | Modules.Cutting DoD | ~12-16 nap |
| 5 | **Modules.Spatial v1** | Tértervezés, Three.js backend | Ecosystem Architecture DoD | ~20-25 nap |
| 6 | **Modules.Trading v1** | Kereskedő modul (katalógus, ár) | Ecosystem Architecture DoD | TBD |
| 7 | **Modules.Delivery v1** | Szállítás modul | Ecosystem Architecture DoD | TBD |
| 8 | **Modules.Installation v1** | Beszerelő modul | Ecosystem Architecture DoD | TBD |

---

## 8. Nyitott döntések (arch-planner input)

| # | Kérdés | Opciók | Döntés állapota |
|---|---|---|---|
| OD-01 | A Modules.Cutting külön PostgreSQL schema-t kap (`spaceos_cutting`) vagy az `spaceos_modules`-ben marad? | A) Külön schema (izolált) · B) Közös `spaceos_modules` | NYITOTT |
| OD-02 | A Modules.Cutting külön polyrepo vagy az Abstractions repo-ban él? | A) Külön repo · B) Abstractions-ben | NYITOTT |
| OD-03 | A Joinery → Door átnevezés breaking change-e a deployed Doorstar pilot-ban? | Migráció szükséges a schema nevére | NYITOTT |
| OD-04 | Az EndCustomer aktor-típus portálja a joinerytech.hu-n fut vagy külön domain? | A) Subpath · B) Külön domain | NYITOTT |
| OD-05 | A ModuleRegistry Kernel-szintű konfiguráció (DB) vagy Orchestrator-szintű (config file)? | A) Kernel DB · B) Orchestrator config | NYITOTT |

---

## 9. Összefoglaló táblázat

| Dimenzió | Jelenlegi állapot | Cél állapot |
|---|---|---|
| Aktor-típusok | 1 (Manufacturer) | 6 (Manufacturer, PanelCutter, Trader, Logistics, Installer, EndCustomer) |
| Trade-modulok | 1 (Joinery — vegyes) | 3+ (Door, Cabinet, Window — tiszta szeparáció) |
| Közös modulok | 1 (Abstractions) | 3 (Abstractions, Cutting, Spatial) |
| B2B kapcsolat-típusok | Gyártó ↔ Gyártó | Bármely aktor ↔ Bármely aktor |
| Referencia mélység | Ajtó modul: 4/6 réteg | Ajtó modul: 6/6 réteg (etalon) |
| UI kontextusok | 2 (Door, Cabinet placeholder) | 6 (Spatial, Door, Cabinet, Cutting, Orders, Delivery) |

---

*SpaceOS — Ecosystem Module Architecture v1.0 · 2026-04-11*
*Döntéshozó: Gábor · Rögzítette: Architect session*
*Státusz: TERVEZÉSI DÖNTÉS — következő lépés: `/spaceos-arch-planner` Ecosystem Actor Architecture*
