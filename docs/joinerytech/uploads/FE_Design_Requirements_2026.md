# Frontend Design Igények — 2026

> **Cél:** Ez a dokumentum összegyűjti az összes olyan frontend területet, ahol
> tervezési munkára van szükség mielőtt a FE terminál implementálni tudja.
>
> **Státusz szerinti csoportosítás:**
> - 🔴 **Backend kész, design hiányzik** — implementálható, amint terv megvan
> - 🟡 **Backend folyamatban** — tervezés előre elindítható, implementáció blokkolva
> - ⚪ **Backend nincs** — terv és backend spec is kell előbb
>
> **Utolsó frissítés:** 2026-05-29

---

## 1. Procurement v2 — Teljes új UI modul 🟡

**Backend státusz:** Implementáció folyamatban (Track A–H, MSG-PROCUREMENT-012)

A Procurement v2 backend négy teljesen új aggregate-et vezet be. Ezekhez nincs frontend — sem terv, sem implementáció.

### 1a. Beszerzési igénylés (PurchaseRequisition)

| Elem | Leírás |
|---|---|
| Igénylés lista | Táblázatos nézet: igénylésszám, anyag, mennyiség, státusz (Draft / Approved / ConvertedToPO / Rejected), benyújtó, dátum |
| Igénylés létrehozása | Drawer/SlideOver: anyagkód, mennyiség, egység, preferált szállító (opcionális), megjegyzés |
| Igénylés részletek | SlideOver: teljes adatlap + FSM akciók (Approve / Reject) |
| Jóváhagyás flow | Approve / Reject akciógomb — csak `procurement.approver` role-lal látható |
| SoD jelzés | Ha a jóváhagyó = igénylő → figyelmeztető badge, akció tiltva |

**FSM státuszok:** `Draft → Approved → ConvertedToPO / Rejected`

### 1b. Szállítói számla (SupplierInvoice)

| Elem | Leírás |
|---|---|
| Számla lista | Számlaszám, szállító, összeg, státusz (Received / Matched / Exception / Approved / Disputed), dátum |
| Számla rögzítése | Form: szállító, PO hivatkozás, tételsorok (anyag, mennyiség, egységár, ÁFA), összegek automatikus számítása |
| Számla részletek | SlideOver: fejléc + tételsorok + Three-Way Match eredmény |
| Variance jóváhagyás | `ApproveWithVariance` akció — emelt jogkör (`procurement.approver`) + összeg-küszöb jelzése |
| SoD jelzés | Ha variance jóváhagyó = rögzítő → tiltva |

**FSM státuszok:** `Received → Matched / Exception → Approved / Disputed`

### 1c. Three-Way Match eredmény nézet

| Elem | Leírás |
|---|---|
| Match összesítő | PO qty vs. Delivered qty vs. Invoiced qty — soronkénti összehasonlítás |
| Tolerancia jelzés | Zöld (OK) / Sárga (tolerancián belül) / Piros (Exception) soronként |
| Exception részletek | Mi okozta az eltérést, mekkora a varianciaszázalék |
| Akciók | Approve / Dispute / ApproveWithVariance — jogkör alapján |

### 1d. Árlista (PriceList)

| Elem | Leírás |
|---|---|
| Árlista lista | Szállítónkénti árlista táblázat: anyag, egységár, deviza, érvényesség |
| Új árlista | Form: szállító, tételek tömeges feltöltése, érvényességi időszak |
| Aktiválás / lejárat | `Draft → Active → Expired` FSM akciók |
| Best-price kiemelés | Adott anyaghoz melyik szállító adja a legjobb árat — vizuális jelzés |

---

## 2. Procurement v1 — Meglévő oldal mock-only területei 🔴

**Backend státusz:** Fut (5006), `GET /procurement/api/orders` és `GET /procurement/api/suppliers` már bekötve

A `ProcurementPage` jelenleg részben API-ból tölt, de az alábbi funkciók mock adaton futnak:

| Terület | Jelenlegi állapot | Szükséges |
|---|---|---|
| Aktív PO (ACTIVE_PO mock) | Mock lista | `GET /procurement/api/purchase-orders` bekötés |
| PO részletek | Nincs SlideOver | PO részlet SlideOver (státusz, szállítási állapot, tételek) |
| Szállítás rögzítése | Nincs UI | `POST /procurement/api/deliveries` form |
| Szállítói adatlap | Nincs | Supplier SlideOver (kontakt, aktív PO-k, teljesítési mutató) |

---

## 3. WorkflowPage — Kanban oszlopok mock-only 🔴

**Backend státusz:** `GET /api/facilities/{id}/flow-epics` bekötve (FlowEpic lista él)

A kanban kártyák megjelennek API-ból, de a **kanban oszlopok** (`STAGES` mock) statikusak.

| Terület | Jelenlegi állapot | Szükséges |
|---|---|---|
| Kanban oszlopok (Stage-ek) | `STAGES` mock tömb (extra.ts) | Stage-ek API-ból vagy konfig alapján dinamikusan |
| Új rendelés gomb (`NewOrderDrawer`) | Teljes mock, nincs `POST` hívás | `POST /joinery/api/orders` bekötés — NewOrderDrawer form |
| Epic státusz frissítés | Nincs drag-and-drop / akció | FSM akció gombok az epic kártyákon |

---

## 4. DesignPage — Paraméter wizard mock-only 🔴

**Backend státusz:** Template count stat él (`GET /abstractions/api/modules/templates`), de a wizard teljesen mock

| Terület | Jelenlegi állapot | Szükséges |
|---|---|---|
| Sablon választó | `PARAM_TEMPLATES` mock | `GET /abstractions/api/modules/templates` teljes bekötés |
| Paraméter wizard | Mock template paraméterek | Dinamikus paraméterek a template definícióból |
| Renderelés / előnézet | Mock | Abstractions render API bekötés (ha kész) |

---

## 5. ShopFloorPage — Kiosk UI teljes újratervezés ⚪

**Backend státusz:** Nincs ShopFloor modul — backend spec sem létezik

A ShopFloor kiosk (`/w/shopfloor`) teljesen mock adaton fut. Ez egyedi UX igényeket támaszt — operátori kiosk, nagy érintőképernyős gombok, PIN bejelentkezés.

| Terület | Leírás |
|---|---|
| Operátor PIN bejelentkezés | 4-6 jegyű PIN pad — gép hozzárendelés |
| Gép kiválasztó | Kártyás gép lista (aktív / szabad / karbantartás alatt) |
| Feladat queue | Az adott géphez rendelt gyártási feladatok sorban |
| Feladat elvégzése | "Kész" / "Probléma jelzése" — nagy, egyértelmű gombok |
| Operátor váltás | Kijelentkezés + új PIN |

**Megjegyzés:** Backend spec szükséges a ShopFloor modulhoz mielőtt a design elkészülhet.

---

## 6. Settings — Hiányzó panelek ⚪ / 🔴

### 6a. TemplatesPanel 🔴
**Backend:** Abstractions `GET /api/modules/templates` él — bekötés designja szükséges
| Elem | Leírás |
|---|---|
| Sablon lista | Név, típus, paraméterszám, aktív/inaktív |
| Sablon részletek | Paraméter lista, előnézet gomb |
| Új sablon | Ha az Abstractions API támogat létrehozást |

### 6b. RolesPanel ⚪
**Backend:** Nincs Kernel RBAC management API
| Elem | Leírás |
|---|---|
| Szerepkör lista | Meglévő role-ok, hozzárendelt userek száma |
| Jogosultságmátrix | Modul × akció × role — checkbox grid |
| Szerepkör szerkesztő | Jogosultságok fel/levételezése |

### 6c. PartnersPanel ⚪
**Backend:** Nincs partner modul
| Elem | Leírás |
|---|---|
| Partner lista | Státusz (aktív/meghívott/felfüggesztett), típus |
| Partner meghívás | Email + szerepkör — B2B meghívó flow |
| Partner adatlap | Kapcsolattartó, megrendelés előzmények |

### 6d. CatalogPanel ⚪
**Backend:** Nincs Catalog API
| Elem | Leírás |
|---|---|
| Anyagjegyzék lista | Kód, leírás, egység, kategória, ár |
| Anyag CRUD | Létrehozás / szerkesztés / archiválás |
| Import | Tömeges feltöltés (CSV/Excel) |

### 6e. StageChainEditor ⚪
**Backend:** Nincs Stage API
| Elem | Leírás |
|---|---|
| Gyártási fázis lista | Fázisok sorrendben (drag reorder) |
| Fázis szerkesztő | Név, szín, SLA, felelős szerepkör |
| Lánc vizualizáció | Nyilakkal összekötött folyamat ábra |

---

## Prioritási sorrend (javaslat)

| # | Terület | Miért most | Előfeltétel |
|---|---|---|---|
| 1 | **Procurement v2 UI** (1a–1d) | Backend Track C hamarosan kész | Procurement DONE |
| 2 | **Procurement v1 kiegészítések** (2) | Backend él, mock váltható | Design |
| 3 | **WorkflowPage NewOrderDrawer** (3) | Joinery API él | Design |
| 4 | **TemplatesPanel** (6a) | Abstractions API él | Design |
| 5 | **DesignPage wizard** (4) | Abstractions template API bővítés kell | Abstractions spec |
| 6 | **ShopFloorPage** (5) | Kiosk UX egyedi igény | Backend spec + design |
| 7 | **RolesPanel / PartnersPanel / CatalogPanel / StageChainEditor** (6b–6e) | Backend nem létezik | Backend spec + design |
