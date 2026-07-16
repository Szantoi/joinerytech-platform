# ADR-064: Kontraktus-részletek gyűjtő — assign-identitás, FSM-élek, `AppliesTo`, pénznem

- **Státusz:** PROPOSED — döntésre vár (root)
- **Dátum:** 2026-07-16
- **Felvetette:** MAINT-BE-TRANSITIONS (2., 1.), QA-BE-ENDPOINTS (2.), KONTROLLING-BE-HOST
  (1., 3., 9.), CRM-BE-HOST (5.), F2-DMS-FE (2.)
- **Függ:** ADR-059 (wire-nyelv), ADR-061 (auth — az 1. tétel előfeltétele)

> Öt kisebb, önmagában nem ADR-méretű kérdés, de mind **igen/nem döntést kíván**, és mind
> blokkol valamit. Egy fájlban, hogy egy körben átfuthatók legyenek.

---

## 1. Assign-identitás és `createdBy` audit-név — **egy kérdés, nem kettő**

### Kontextus

Négy modul jelezte ugyanazt, külön néven:

| Modul | Portal küld/vár | Backend | Forrás |
|---|---|---|---|
| Maintenance | `assigneeName` ("Kovács P.") | `assignedTo: Guid` | MAINT-BE-TRANSITIONS 2. |
| QA | `assigneeName` string | `AssigneeId: Guid` | QA-BE-ENDPOINTS 2. |
| Kontrolling | `createdBy: string` | `CreatedBy: Guid` | KONTROLLING-BE-HOST 3. |
| CRM | `owner` név | `Guid` | CRM-BE-HOST 5. |

**Közös gyökér: nincs user-címtár a platformon.** Mindegyik modul-agent ugyanazt a helyes
döntést hozta: **nem talált ki nevet** — a `*Name` mezőket kivették a DTO-kból, ahelyett hogy
hazug placeholdert adtak volna (HR-BE-HOST 5., CRM-BE-HOST 5.). A kontrolling a hitelesített
hívó Guidját adja vissza, és **nem fogadja el a kliens által küldött nevet** — helyesen: *„audit-
rekordként úgysem hihető"* (KONTROLLING-BE-HOST 3.). Következmény: **a UI ma Guidot mutatna.**

### Opciók

- **(1a) Guid az identitás + a backend denormalizálja a nevet írás-időben** — a DTO
  `assigneeId: Guid` **és** `assigneeName: string` is; a név a művelet **pillanatában**
  rögzül. Munka: ≈1 nap/modul a lookup bekötése után. Kockázat: a név „befagy" (de ld. lent).
- **(1b) A backend futásidőben oldja fel** (join a címtárra minden olvasáskor). Munka: hasonló
  + N+1/cache-kérdés. Kockázat: a régi audit-sorok **visszamenőleg átíródnak** névváltozáskor.
- **(1c) A portal old fel** (külön user-lista lekérés + kliens-oldali join). Munka: ≈0,5
  nap/modul. Kockázat: minden fogyasztónak újra kell implementálnia; az OpenAPI hiányos marad.
- **(1d) Marad Guid a felületen** — a UI Guidot mutat. Nem opció, csak a mai állapot.

**Címtár-forrás (al-kérdés):** Keycloak user-profil (ADR-061 bekötése után) **vagy** a HR
`Employee` aggregátum (belső dolgozókra) — vagy mindkettő (belső = HR, külső = Keycloak).

### Ajánlás

> **(1a) — Guid az identitás, a megjelenítendő név írás-időben denormalizálva; belső
> dolgozókra a HR `Employee` a címtár, a hitelesített hívó neve a Keycloak-tokenből.**

**Indoklás:** az **audit-rekordnak azt kell mutatnia, ki volt az akkor** — nem azt, hogy ki ő
ma. Ha valaki férjhez megy, kilép, vagy átnevezik, a 2026-07-14-i jóváhagyás **továbbra is
azon a néven történt**. Ez nem a denormalizáció szokásos „teljesítmény vs. frissesség"
kompromisszuma: **itt a befagyott név a helyes érték**, a friss név a hibás. Ezért (1b)
kifejezetten rossz az audit-mezőkre (`createdBy`, `approvedBy`), és ezért illeszkedik az
ADR-003 immutable audit-trail elvéhez. *(A `assigneeName` „élő" mezőnél — ki a felelős **most** —
gyengébb az érv; ott a Guid a forrás, és a név frissíthető. De egy szabályt tartani olcsóbb,
mint kettőt.)*
A kontrolling döntése — a kliens által küldött nevet nem fogadjuk el — **maradjon érvényben**:
a nevet a szerver oldja fel a tokenből, nem a hívó állítja magáról.

**Blokkolja:** ADR-061 (auth) — a token nélkül nincs honnan feloldani. **Munka:** ≈3-4 nap
(4 modul, a címtár-varrat után).

**Döntés:** _(Gábor tölti ki)_ — (1a) ☐ *ajánlott* · (1b) ☐ · (1c) ☐ · (1d) ☐ ·
Címtár: HR Employee ☐ / Keycloak ☐ / mindkettő ☐

---

## 2. Maintenance `Reported → InProgress` ág

### Kontextus

A MAINT-BE-TRANSITIONS **törölte** a `WorkOrderStatusTransitions` táblából a
`Reported → InProgress` élt („if assigned"), mert a `WorkOrder.StartWork()` **mindig is csak
`Scheduled`-ből futott**, és a portal `WORK_ORDER_FSM` az aggregátumot tükrözi. A tábla és az
aggregátum azóta **egy igazságforrás** (`EnsureTransition` → `IsValidTransition`), így nem tud
szétcsúszni. **A tábla korábbi éle sosem volt működő funkció — deklarált, de nem implementált.**

**Ma tehát:** munkalap indítása előtt **kötelező az ütemezés** (`schedule` → `start`).

### Opciók

- **(2a) Marad törölve** — a portal + az aggregátum egyetért, a szigorúbb modell él.
  Munka: 0. Kockázat: ha az üzem valóban indít ütemezés nélkül (vészjavítás), az UI-folyamat
  kényelmetlen.
- **(2b) Visszavezetés** mint valódi FSM-él + endpoint + portal-FSM bővítés. Munka: ≈1,5 nap
  + designer. Kockázat: gyengébb adat (ütemezés nélküli munkalapok → a kapacitástervezés és a
  `scheduledAt`-alapú riportok lyukasak lesznek).
- **(2c) UI-rövidítés**: „azonnali indítás" gomb = **két hívás** (`schedule(most)` + `start`),
  FSM-változtatás nélkül. Munka: ≈0,5 nap FE. Az adat teljes marad (van `scheduledAt`).

### Ajánlás

> **(2a) most; ha az üzemi valóság kéri, (2c) — nem (2b).**

**Indoklás:** ez **üzleti kérdés, nem technikai**: van-e olyan eset, hogy a szerelő ütemezés
nélkül kezd (vészjavítás, gép áll)? Ha **nincs** → (2a), kész. Ha **van** → (2c) ugyanazt az
UX-et adja **az adat feláldozása nélkül**: a munkalap kap egy „most"-ra ütemezést, és a
riportok épek maradnak. A (2b) FSM-élt ad hozzá azért, hogy egy mezőt üresen hagyhassunk —
rossz csere. **Additív marad:** ha később mégis kell, bármikor bevezethető.

**Blokkol:** semmit. **Munka:** 0 vagy ≈0,5 nap.

**Döntés:** _(Gábor tölti ki)_ — (2a) marad törölve ☐ *ajánlott* · (2b) FSM-él vissza ☐ ·
(2c) UI-rövidítés ☐
**Üzleti kérdés Gábornak:** *indít-e az üzem munkalapot ütemezés nélkül?*

---

## 3. DMS `archive` / `reopen` ↔ backend megfeleltetés — ✅ **LEZÁRVA, nincs mit dönteni**

### Kontextus

Az F2-DMS-FE (2.) még nyitott ADR-jelöltként írta le: *„a backend Active/Archived/Deleted ↔ a
spec piszkozat/ellenorzes/kiadott/archivalt készletének feloldása"*. **A DMS-BE-HOST
(`760349a`) ezt azóta a portal-konform irányban lezárta.** Kódból ellenőrizve:

- `dms/src/Domain/Enums/DocumentStatus.cs:22-38` — `Draft`, `UnderReview`, `Released`,
  `Archived` (+ `Deleted` mint FSM-en kívüli admin soft-delete). A doc-comment (`:11-14`)
  rögzíti a remapet: `Active → Released`, `Archived → Archived`, és hogy **adat nem sérült**
  (*„No document rows were ever persisted with the legacy values"*).
- `dms/src/Domain/Aggregates/Document/Document.cs:145-189` — **mind a hat átmenet megvan**:
  `SubmitForReview()`, `Approve()`, `Reject()`, `Recall()`, **`Archive()`**, **`Reopen()`**.
- `dms/src/Api/Endpoints/DocumentEndpoints.cs:58-94` — mind a hat ki van vezetve
  (`/submit`, `/approve`, `/reject`, `/recall`, `/archive`, `/reopen`).

**A portal `DOCUMENT_FSM` (`services/dms/fsm.ts`) és a backend 1:1 egyezik.**

### Teendő

**Nincs döntés — csak két adminisztratív tétel:**
1. Az F2-DMS-FE 2. pontja **elavult** → jelölendő lezártként (a doksi félrevezet).
2. **Az egyetlen maradék eltérés a nyelv** (`"draft"` vs `piszkozat`) → **ADR-059 hatálya**.
   ⚠️ Kapcsolódó: a DMS `DocType`/`ExpiryState`/`DocLinkType` **magyar tagneveket** használ a
   domainben (`DocType.cs:11-24`: `Rajz`, `Szerzodes`…) — ez az ADR-059 által **elkerülendőnek
   jelölt minta** (fordítás a domainbe égetve), a takarítás ott van beütemezve.

**Döntés:** _(Gábor tölti ki)_ — Tudomásul véve, lezárva ☐

---

## 4. Kontrolling `AppliesTo` szemantika-ütközés

### Kontextus

Két, egymásnak ellentmondó olvasat él **ugyanabban a modulban**:

- **Domain** (`ProjectCostCalculationService`): egy **portfólió-hatályú** korrekció **MINDEN**
  projekt költségéhez hozzáadódik.
- **Kontraktus / read model** (`Application/Portfolio/PortfolioCostView`): a portfólió-korrekció
  **egyszer**, portfólió-szinten számít, projektre soha. A read model a kontraktust követi
  (scope szerint particionál), a natív szolgáltatás a régi olvasatot.

### Opciók

- **(4a) A kontraktus nyer** — a `ProjectCostCalculationService` javítása/kivezetése.
  Munka: ≈1 nap. Kockázat: alacsony.
- **(4b) A domain nyer** — a read model + a portal átírása. Munka: ≈2 nap + FE. Kockázat:
  ld. lent.

### Ajánlás

> **(4a) — a kontraktus olvasata nyer, a natív szolgáltatás konvergál vagy törlődik.**

**Indoklás — ez nem ízlés-kérdés, hanem hiba:** ha egy 100 e Ft-os portfólió-rezsit
**mind a 6 projekthez** hozzáadunk, akkor a portfólió-szintű összegzés `Σ(projekt)` **600 e
Ft-ot** lát — **(N−1)× túlszámolás**. Az EAC és a fedezet ezzel **rossz**. A domain olvasata
csak akkor lenne védhető, ha *arányos felosztást* jelentene (mindegyik projekt a **részét**
kapja) — de a leírás szerint **hozzáadja** minden projekt költségéhez, nem feloszt.
Két másodlagos érv is (4a) felé mutat: a natív cost-DTO-k **már nincsenek publikálva**
(KONTROLLING-BE-HOST 7. — nincs fogyasztójuk), és a read model **tesztelt** (28 teszt,
köztük „portfólió-korrekció **egyszer** számít").

**Munka:** ≈1 nap. **Blokkol:** semmit, de **rossz számokat ad**, ha valaha bekötik a natív ágat.

**Döntés:** _(Gábor tölti ki)_ — (4a) kontraktus nyer ☐ *ajánlott* · (4b) domain nyer ☐ ·
A natív szolgáltatás: javítás ☐ / törlés ☐

---

## 5. Multi-currency

### Kontextus

A wire-DTO-k **lapos számok**; a pénznem nincs mezőnként hordozva. A modul HUF-ot feltételez
(`Money.FromHUF`; a natív szolgáltatásban `var currency = "HUF"; // TODO`).
A domain **`Money` value objectje viszont ismeri a pénznemet** — az információ a wire-en vész el.

### Opciók

- **(5a) HUF-only, explicit módon kimondva** — a `Money` VO marad, a wire lapos szám; a
  feltevés **dokumentált**, nem véletlen. Munka: ≈0,5 nap (a `// TODO` lezárása + a kontraktus-
  doksi kiegészítése).
- **(5b) Pénznem a wire-re** (`{amount, currency}` mindenhol) — a portal zod + UI-formázás +
  árfolyam-kérdés (mikori árfolyammal számol az EAC?). Munka: ≈1 hét + termék-döntések.

### Ajánlás

> **(5a) — HUF-only, kimondva; (5b) akkor, ha az első deviza-igény megjelenik.**

**Indoklás:** a magyar faipari ügyfélkör HUF-ban számláz; a deviza **ma hipotetikus**. A (5b)
nem technikai munka, hanem **termék-döntések sorozata** (melyik árfolyam, mikori, ki tartja
karban, hogyan összegzünk vegyes portfóliót) — ezeket megválaszolatlanul implementálni rosszabb,
mint nem implementálni. **A fontos most az, hogy a HUF-feltevés tudatos legyen, ne néma
`// TODO`.** A domain `Money` VO-ja megtartja az opciót: a bővítés a wire-en additív.

**Blokkol:** semmit. **Munka:** ≈0,5 nap.

**Döntés:** _(Gábor tölti ki)_ — (5a) HUF-only, dokumentálva ☐ *ajánlott* · (5b) multi-currency most ☐

---

## Összesített hatás

| # | Tétel | Ajánlás | Munka | Blokkol? |
|---|---|---|---|---|
| 1 | Assign-identitás + `createdBy` | Guid + írás-idejű név-denormalizáció | ≈3-4 nap | ADR-061 után; a UI ma Guidot mutatna |
| 2 | Maint `Reported→InProgress` | marad törölve (v. UI-rövidítés) | 0-0,5 nap | nem |
| 3 | DMS archive/reopen | **lezárva** — csak nyelv marad (ADR-059) | 0 | nem |
| 4 | Kontrolling `AppliesTo` | kontraktus nyer | ≈1 nap | nem (de rossz számok) |
| 5 | Multi-currency | HUF-only, kimondva | ≈0,5 nap | nem |

**Együtt:** ≈5-6 nap, döntés után. **Egyik sem élesítés-blokkoló** — az 1. tétel az ADR-061-re
vár, a többi önállóan végrehajtható.

---

## Kapcsolódó ADR-ek

- **ADR-061** (auth) — az **1. tétel előfeltétele** (a címtár/token nélkül nincs név).
- **ADR-059** (wire-nyelv) — a **3. tétel** maradék nyelvi kérdése ott dől el.
- **ADR-003** (immutable audit trail) — az **1. tétel** indoklásának alapja.
- **ADR-063** (QA rework) — az assign-identitás a Ticket `AssigneeId`-t is érinti.
</content>
</invoke>
