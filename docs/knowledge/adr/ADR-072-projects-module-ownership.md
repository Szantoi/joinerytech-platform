# ADR-072 — A projekt-szint tulajdonosa: önálló `spaceos.projects` modul

> **Státusz:** **JAVASLAT** — Gábor irány-döntése megvan (2026-07-31), a **hatókör-kérdések
> (§7) nyitva**. Root-kiadásra és Gábor jóváhagyására vár.
> **Készítette:** backend terminál, 2026-07-31
> **Előzmény:** ADR-066 (`ProjectRef` = Kernel `FlowEpic`), ADR-067 (modul-katalógus és
> ModuleId-konvenció), **ADR-068 §5** (a projekt-burok szintnek *nincs tulajdonosa*,
> `decision_required Gábornak`), B2B-10 F5/3 mérés
> ([`KERNEL_ANCHOR_NEGATIVE_CONTROL_2026-07-31.md`](../architecture/KERNEL_ANCHOR_NEGATIVE_CONTROL_2026-07-31.md))

---

## 1. A kiváltó ok

**Gábor termékdöntése (2026-07-31):** *„A projekt az epikek felett egy összefogó egység."*

Ez lezárja az ADR-068 §5 `decision_required` tételét. A B2B-10 F5/3 mérés pedig kimutatta,
hogy a fogalomnak **ma nincs gazdája**: a Kernelben nincs `Project` entitás, nincs `ProjectId`
mező a doménben, és nincs `Projects` tábla — miközben **négy fogyasztó hivatkozik rá**.

## 2. Mért kiindulás — mit vár ma négy fogyasztó egy projekttől

| Fogyasztó | Mit vár | Forrás |
|---|---|---|
| **Portál Projects világ** — `/w/projects` **élő route**, `ProjectsWorldPage` | `id` (**`PRJ-2426-001` alakú kód**), `name`, `customer`, `designer`, `status` (5 érték), `installTarget`, `margin`, `items[]`, `dependencies[]` (más szakmák + `blocksInstall`), `note` | `src/mocks/projects.ts` — a világ **mockból él** |
| **Kontrolling** `IProjectPortfolioSource` | `Guid ProjectId` **+** `string ProjectCode`, `Name`, `Customer`, `Status` (5 érték), `ContractValue`, `Invoiced`, költségsorok | `IProjectPortfolioSource.cs` |
| **Kontrolling** `IIntegrationDataProvider` (**második, párhuzamos port**) | `ProjectId`, `ProjectName` | `IIntegrationDataProvider.cs` — *„convergence of the two ports is a documented follow-up"* |
| **Collaboration** `CollaborationWorkScope` | `ProjectId` (Guid, **kötelező**, ma opak) | B2B-10 F1 |
| **Scheduling** `KernelWorkScope` | `projectId` (uuid, kötelező) | kézbesített kontraktus, conformance-pinnel |

### Három tény, ami ebből kiolvasható

1. **A termék fejében a fogalom KÉSZ.** A portál mockjának öt életciklus-címkéje
   (`draft/active/install/done/on_hold`) és a Kontrolling `ProjectLifecycleStatus` enumja
   (`Draft/Active/Install/Done/OnHold`) **egymástól függetlenül ugyanaz**. Ez nem homályos
   ötlet, hanem letisztult fogalom, aminek csak a tárolása hiányzik.
2. **Kettős azonosság kell.** Belső `Guid` (a `WorkScope`-ok és a Kontrolling
   `CostAdjustment.ProjectId` ezt használják) **és** ember-olvasható üzleti kulcs
   (`PRJ-2026-014`) — a REST-kontraktus és a portál ezt címzi.
3. **A Kontrolling már kimondta, hogy nem ő a gazda:** *„it does NOT own projects. Project
   identity, customer, lifecycle label, contract value, invoiced amount and the cost lines all
   belong to other modules."* A varrat tehát deklarált, csak a másik oldala hiányzik.

### ⚠ Korrekció a saját korábbi állításomhoz

A mérés előtt azt mondtam Gábornak, hogy a projekt-burok *„sokkal vékonyabb fogalom — id, név,
bérlő, státusz"*. **Ez téves volt.** A mért igény ennél gazdagabb: ügyfél, felelős tervező,
szerződéses érték, számlázott összeg, tételek, más szakmák függőségei, beépítési céldátum. Ez
**erősíti** a „ne a Kernelbe kerüljön" következtetést, de **megnöveli** a becsült méretet.

---

## 3. Döntés 1 — HOVA: önálló `spaceos.projects` modul

Az ADR-068 O1–O4 mérlegelése a projekt-szintre átvíve:

| Opció | Verdikt | Indoklás |
|---|---|---|
| **O1 — Kernel-bővítés** (`Project` aggregate a Kernelben) | **elutasítva** | A Kernel core (FlowEpic FSM, StageChain) az ADR-068 szerint **érinthetetlen**, és ezen a területen már **kétszer szivárgott be iparági szókincs**. A §2 mérés szerint a projekt ügyfelet, árrést, szakma-függőségeket hordoz — ez mély domain-tudás, nem globálisan értelmes absztrakció (ADR-065 elve). Kernel-módosítás ráadásul Gábor-kapu. |
| **O2 — JoineryTech-tulajdonú modul** | **elutasítva** | Rossz irányú csatolás: a Doorstarnak is kell projekt-fogalom, és egy ügyfél-instance nem függhet egy platform-oldali üzleti modultól úgy, hogy az legyen a kanonikus forrás. |
| **O3 — önálló, iparág-semleges SpaceOS bounded context** | **✅ VÁLASZTOTT** | A Kernellel és a 7 ERP-modullal egyenrangú modul: saját host, saját DB-séma, saját OpenAPI. Pontosan a Collaboration precedense. |
| **O4 — meglévő modulba rejteni** (scheduling / Kontrolling / CRM) | **elutasítva** | A scheduling `WorkScope`-jában van `projectId`, de attól még nem ő birtokolja; a Kontrolling **maga mondta ki**, hogy nem ő a gazda. Egy központi fogalom más célú modulba rejtése a duplikált-aggregate minta. |

**Fizikai hely:** `src/spaceos-modules-projects` — testvér a Kernel és a többi modul mellett.
**ModuleId:** `spaceos.projects` (ADR-067 konvenció: iparág-agnosztikus, horizontális képesség).

## 4. Döntés 2 — MEKKORA: a v1 az azonosság, semmi több

A §2 mért igénye több modul területére nyúlik. A v1 **kizárólag azt tartalmazza, ami a
`projectId`-t feloldhatóvá teszi**, minden mást referenciával:

| A v1-ben BENNE | A v1-ből KI, és kihez tartozik |
|---|---|
| `ProjectId` (Guid) + `ProjectCode` (üzleti kulcs, egyedi bérlőnként) | **Tételek/árak** → CRM (ADR-066: az Order/Quote/Customer aggregate a CRM-ben épül) |
| `Name`, `TenantId` | **Árrés, terv/tény költség** → Kontrolling (ő birtokolja a matematikát, csak adatot vár) |
| `Status` — az öt címke (Draft/Active/Install/Done/OnHold) | **Szakma-függőségek** (`dependencies`) → **§7.1 nyitott kérdés** |
| `CustomerRef` (semleges referencia, ADR-066 típusokkal) | **Mérföldkő / program-szint** → ADR-068 szerint továbbra is `decision_required` |
| **Epic-hozzárendelés** (project ↔ FlowEpic, 1:N) | **Task/Subtask** → nem MVP (ADR-068 §5) |

**Indoklás:** ez oldja meg az eredeti bajt (ellenőrizhetetlen `projectId`), kiszolgálja mind a
négy fogyasztót az azonosság szintjén, és **nem hoz létre második igazságot** semmiből, ami már
máshol létezik. A tételek, a pénz és a költségsorok a mai gazdájuknál maradnak.

## 5. Döntés 3 — a névadás szétválasztása (⛔ F4-blokkoló)

Az ADR-066 `ProjectRef`-je ma **FlowEpic-azonosítót hordoz `projectId` néven**. Amíg a projekt
= epic volt, ez pontos; Gábor döntése után **rossz nevet visel**.

**Döntés:** a két fogalom két külön referencia-típus:

- `EpicRef(epicId)` — a Kernel `FlowEpic`-re mutat *(a mai `ProjectRef` tartalma)*,
- `ProjectRef(projectId)` — a `spaceos.projects` `Project`-re mutat *(a `WorkScope` mezője)*.

**Miért blokkoló:** az **F4** most publikálja a szerződést a Doorstarnak. Ha a `projectId` név
kimegy két különböző jelentéssel, a Doorstar kétértelműségre épít, és a javítás utána
**verziózott törő változás**. A szétválasztás most egy névadás.

**Amíg a modul nem áll:** az F4 szerződése mondja ki, hogy a `projectId` **opak korrelációs
azonosító, jövőbeli gazdája a `spaceos.projects`** — a PLAN-03 *„a platform validál"* ígéretét a
Project-mezőre **ma nem tartjuk be**, és ezt le kell írni, nem elhallgatni.

## 6. Következmények

- **Feloldódik két adósság:** a Kontrolling két párhuzamos, stubolt projekt-portja
  (`IProjectPortfolioSource` + `IIntegrationDataProvider`) egy valódi forrásra konvergálhat; a
  portál Projects világa kikerülhet a mockból.
- **Az F5/2 adapter mintája újrahasznosítható:** a `projectId` ugyanúgy feloldható lesz
  on-behalf-of HTTP-adapterrel, mint ma az `epicId` a Kernel felé. Ekkor a B2B create-út
  negatív kontrollja **már nem egyetlen idegen rétegen** áll (ld. F5/3 lelete).
- **Nem kicsi munka.** Az ADR-068 figyelmeztetése érvényes: a `FlowManagement.FlowProject`
  POCO-kból **nincs megtakarítás** — ugyanannyi migráció + API + RLS munka, mint egy új
  bounded context. A v1 (§4) a legkisebb értelmes szelet.
- A `FlowManagement.FlowProgram/FlowProject/FlowMilestone` **retire-jelölt marad** (ADR-068 §5);
  erre a modulra **nem épül** rájuk semmi.

## 7. ⛔ Nyitott kérdések — Gábor döntése kell

**7.1 — A szakma-függőségek (`dependencies`) hol laknak?**
A portál mockjában egy projekt függ más szakmáktól (víz/áram/szellőzés/gépészet/bútor), státusszal
és `blocksInstall` jelzővel. Ez **fogalmilag átfed** a Collaboration `DelegatedWorkPackage`-ével
(delegált munka egy másik félnek). Két út: (a) a függőség **Collaboration-munkacsomag** projekció,
egy forrással; (b) a projekt saját, könnyű `Dependency` listája, a Collaborationtól függetlenül.
**Javaslatom: (a)**, mert (b) egy második delegáció-fogalmat hozna — pontosan azt, amit az
ADR-068 tilt. De ez termékdöntés: nem minden szakma-függőség B2B-partner (lehet házon belüli is).

**7.2 — A projekt a CRM-rendelésből születik, vagy önállóan?**
A Kontrolling kommentje *„CRM order → project"*-et feltételez. Ha így van, a `spaceos.projects`
a CRM-rendelésre hivatkozik, és a create-út a CRM-ben indul. Ha nem, a projekt önállóan is
létrehozható és a rendelés opcionális.

**7.3 — A `ProjectCode` formátuma és kiosztása.** `PRJ-2426-001` (portál) vs `PRJ-2026-014`
(Kontrolling) — két különböző év-kódolás. Ki generálja, bérlőnként vagy globálisan egyedi?

## 8. Amit ez az ADR NEM tesz

Nem módosítja a Kernelt, nem törli a `FlowManagement` POCO-kat (kódmódosítás, külön döntés), nem
dönt mérföldkő/program szintről (ADR-068 §5 továbbra is nyitva), és nem ír elő migrációt a
meglévő opak `projectId`-kre — a mai értékek korrelációs azonosítók maradnak, amíg a §7.3
kiosztási szabály nincs eldöntve.
