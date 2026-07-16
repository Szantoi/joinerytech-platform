# ADR-063: QA rework / Conditional ág — backend-bővítés vs. spec-szűkítés

- **Státusz:** PROPOSED — döntésre vár (root + **designer**)
- **Dátum:** 2026-07-16
- **Felvetette:** QA-BE-ENDPOINTS (1.) — „szándékosan NEM implementáltuk; a döntés root/designer ADR"
- **Függ:** ADR-059 (wire-nyelv) — a végül elfogadott halmaz nyelvét az dönti el

---

## Kontextus

A design-spec ismer egy `qaEllenorzes.javitasra` (rework-hurok) ágat, a backend nem. A
QA-BE-ENDPOINTS ezt tudatosan nem implementálta, és az openapi `/conditional` fantom-útját
törölte — a döntést ide utalta.

### A tényleges eltérés mélyebb, mint egy hiányzó átmenet: **más a modell**

| | Portal | Backend |
|---|---|---|
| Státusz | **4 érték**: `'nyitott'`, `'folyamatban'`, `'megfelelt'`, `'selejt'` (`inspections.ts:23`) | **3 állapot**: `Planned`, `InProgress`, `Completed` (`qa/src/Domain/Enums/InspectionStatus.cs:8-10`) |
| Eredmény | — (a státuszba olvasztva) | **külön enum**: `Pending`, `Pass`, `Fail`, **`Conditional`** (`InspectionResult.cs:8-12`) |

**A portal összevonja a státuszt és a kimenetelt** (a `megfelelt`/`selejt` valójában
*eredmény*, nem állapot); **a backend szétválasztja** (állapot × eredmény).

**Két következmény, amit érdemes kimondani:**

1. **A backendben a `Conditional` MÁR LÉTEZIK — csak elérhetetlen.**
   `InspectionResult.cs:11`: `Conditional = 3  // Feltételesen megfelelt (kisebb hibákkal)`.
   Nincs `CompleteWithConditional()`, tehát **semmilyen átmenet nem állítja elő**. Az enum-érték
   a domainben maradt (nem törő), de holt kód — egy szándék nyoma, amit sosem fejeztek be.

2. **A portalnak nincs hova tennie a `Conditional`-t.** A 4 értékű státusz-enumban nincs
   slot: a `javitasra` az **5.** lenne. Vagyis nem arról van szó, hogy a portal többet tud —
   hanem hogy a két oldal **másképp tagolja ugyanazt a valóságot**.

### A kulcs-megfigyelés: a rework-hurok már létezik — csak a Ticketben

A QA-ban **két** aggregátum van, és a `Ticket` **teljes, reopen-nel bíró FSM-mel** rendelkezik:
`bejelentve → kiosztva → folyamatban → megoldva` + `elutasitva`, **`reopen`-nel**
(`Domain/FSM/TicketStatusTransitions.cs`, endpointok:
`Api/Endpoints/TicketEndpoints.cs` — `PUT /{id}/assign|start|resolve|reject|reopen`).

És a **Ticket már ma az Inspectionhöz kötődik**: a `GetTicketsQuery` szűrői közt ott az
**`inspectionId`** (QA-BE-ENDPOINTS §2).

**Vagyis a „hibát találtunk → kijavítjuk → újra megnézzük" hurok backend-oldalon már meg van
építve — csak nem az Inspectionben, hanem a Ticketben.** Az Inspection szándékosan
**megváltoztathatatlan pillanatkép** egy ellenőrzésről (`Completed` terminális, immutable
audit-trail — ADR-003 hash-lánc). A Ticket a **változó javítási munkafolyamat**.

---

## Döntendő kérdés

**Kell-e a QA-nak feltételes megfelelés + javítási hurok — és ha igen, az Inspection
FSM-jében vagy a Ticket-domainben modellezzük?**

---

## Opciók

### (a) Backend-bővítés: rework-átmenet az Inspectionben

`CompleteWithConditional()` + `Completed → InProgress` (vagy `Conditional → Reworked`) él.

- **Következmény:** **töri az immutable audit-trailt** — egy lezárt ellenőrzés újranyitása azt
  jelenti, hogy „mit mondott a QA 07-14-én?" kérdésre **nincs stabil válasz**. Faipari
  QA-ban (tanúsítványok, reklamáció, szavatosság) ez üzleti kockázat, nem csak elvi szépséghiba.
- **Munkaigény:** ≈2 nap + a hash-lánc/audit felülvizsgálata.
- **Kockázat:** **magas** — ADR-003 (SHA-256 audit-lánc) ellen dolgozik.

### (b) Spec-szűkítés: `javitasra` törlése a portalból + `InspectionResult.Conditional` törlése

- **Következmény:** a QA nem tudja kifejezni azt, hogy *„megfelelt, de kisebb hibákkal —
  javítsd és nézd meg újra"*. Ez a **faipar egyik leggyakoribb QA-kimenete** (felületi hiba →
  javítás → újraellenőrzés): nem selejt, de nem is tiszta megfelelés. A `Conditional` enum
  léte azt mutatja, hogy **valaki már azonosította ezt az igényt**.
- **Munkaigény:** ≈0,5 nap mindkét oldalon.
- **Kockázat:** üzleti funkció-vesztés. **Egy „nem tudom kimondani" a QA-ban minőségügyi
  adósság** — a felhasználó `selejt`-et fog nyomni, vagy hazudik a `megfelelt`-tel.

### (c) A hurok a Ticket-domainben; az Inspection immutable marad

- `CompleteWithConditional()` **elérhetővé válik** (az eredmény `Conditional` lesz) →
  **automatikusan Ticketet nyit** az inspectionhöz kötve.
- A javítás a **Ticket** FSM-jében fut (már kész, reopennel).
- Az újraellenőrzés **új Inspection**, `ReworkOfInspectionId`-vel az eredetire mutatva —
  az audit-lánc sértetlen, a történet visszakereshető.
- A portal `javitasra` **származtatott nézet-állapot** lesz: *Completed + Conditional + van
  nyitott ticket* — nem 5. státusz-érték.
- **Következmény:** az immutabilitás megmarad, a hurok létrejön, a Ticket-beruházás
  hasznosul. A portal FSM-je **változik** (a `javitasra` derivált lesz) → **designer-döntés kell**.
- **Munkaigény:** backend ≈2-3 nap (`CompleteWithConditional` + auto-ticket +
  `ReworkOfInspectionId` + tesztek); portal ≈2 nap (állapot-derivációs logika + „újraellenőrzés"
  akció). **≈4-5 nap.**
- **Kockázat:** közepes — a portal QA-világa APPROVED, a `javitasra` szemantikájának
  átértelmezése designer-újrakört igényel. Az auto-ticket-nyitás termék-döntés (akarunk-e
  automatikus ticketet, vagy a QA-s nyissa kézzel?).

---

## Ajánlás

> **(c) — a `Conditional` legyen elérhető eredmény, a javítási hurok a Ticket-domainben
> fusson, az újraellenőrzés új Inspection (`ReworkOfInspectionId`); a portal `javitasra`
> származtatott nézet-állapot.**

**Indoklás:**

1. **Ez az egyetlen opció, ami nem áldoz fel semmit.** (a) az auditot, (b) az üzleti funkciót
   adja fel. (c) mindkettőt megtartja, mert **a két fogalmat oda teszi, ahova valók**:
   az Inspection *„mit láttunk 07-14-én"* — ez **soha nem változhat**; a Ticket
   *„mit csinálunk vele"* — ez **természetesen változik**.

2. **A munka nagy része már megvan.** A Ticket FSM reopennel kész, az `inspectionId`-kötés
   kész, a `Conditional` enum-érték kész. **Nem új domaint építünk — egy meglévő varratot
   kötünk össze.** Ezért olcsóbb, mint amilyennek elsőre hangzik.

3. **Az immutabilitás nem elvi luxus itt.** A faipari QA kimenete tanúsítvány-,
   reklamáció- és szavatossági bizonyíték. Az ADR-003 hash-láncolt audit épp ezért létezik.
   Egy újranyitható `Completed` ellenőrzés azt jelenti, hogy a lánc mögötti állítás
   visszamenőleg átírható — **ez pont az, ami ellen a lánc szól.**

4. **A `selejt` vs. `javitasra` különbség pénz.** Ha a QA nem tudja kimondani a „feltételes"
   kimenetet, a felhasználó vagy selejtez (anyagveszteség), vagy átengedi (reklamáció). A
   `Conditional` enum léte a domainben azt jelzi: **ezt már valaki egyszer felismerte, csak
   nem fejezte be.**

**Amit a döntéshez tudni kell (ezért kell designer is):**
- A `javitasra` **megszűnik státusz-értéknek lenni**, és származtatott lesz → a portal QA-világ
  FSM-je és `fsm.ts`-e változik, APPROVED munkát nyitunk újra.
- **Termék-kérdés:** a `Conditional` **automatikusan** nyisson ticketet, vagy a QA-s nyissa
  kézzel? *(Ajánlás: automatikusan — különben a „feltételes" kimenet nyom nélkül elveszhet;
  de ez üzleti preferencia.)*
- **Ha (b) mellett dönt:** akkor az `InspectionResult.Conditional` enum-értéket **törölni
  kell** a domainből is — a holt, elérhetetlen érték ma hazudik az OpenAPI-ban és
  félrevezeti a következő fejlesztőt.

---

## Hatás

**Backend (`src/qa`):**
- `Domain/Aggregates/Inspection.cs` — `CompleteWithConditional()`; `ReworkOfInspectionId` mező.
- Auto-ticket: domain-esemény → handler (`Ticket` létrehozás `inspectionId`-vel).
- `Application/DTOs/InspectionDto.cs` — `Result` + `ReworkOfInspectionId` + (opcionális)
  `openTicketId`.
- **Migráció:** igen (`ReworkOfInspectionId` oszlop) — **adat nincs, kockázatmentes**.
- `docs/openapi.yaml` — a törölt `/conditional` út **más alakban** tér vissza
  (`/complete/conditional`).

**Portal (`modules/qa`):**
- `services/qa/fsm.ts` + `inspections.ts` — a `javitasra` derivált állapottá; „újraellenőrzés"
  akció (új inspection indítása az előző hivatkozásával).
- MSW-handlerek + tesztek. **Designer-újrakör.**

**Munka:** ≈4-5 nap (BE 2-3 + FE 2) + designer-review.

**Blokkol-e élesítést?** **Nem** — a QA a mai (szűkebb) modellel is élesíthető. **De blokkolja
a QA-portal fetcher-átállását**, mert a `javitasra` állapotnak nincs backend-megfelelője, és a
zod-séma 4 státusza nem illeszkedik a backend 3+eredmény modelljére. **A halmaz-kérdés
(3↔4) az ADR-059 nyelvi döntése UTÁN is nyitva marad — ezt itt kell lezárni.**

---

## Döntés

_(Gábor tölti ki)_

- [ ] (a) Rework-átmenet az Inspectionben (immutabilitás feladása)
- [ ] (b) Spec-szűkítés — `javitasra` + `Conditional` törlése
- [ ] (c) Hurok a Ticketben, új Inspection az újraellenőrzésre — *ajánlott*
- [ ] Auto-ticket a `Conditional`-ra? igen ☐ / kézi ☐
- [ ] Designer jóváhagyta a `javitasra` → származtatott állapot váltást? ☐

**Indoklás:**

---

## Kapcsolódó ADR-ek

- **ADR-059** (wire-nyelv) — **előfeltétel**: a QA 3↔4 státusz-eltérés a legélesebb példa arra,
  hogy a nyelvi döntés önmagában nem elég.
- **ADR-060** (HR taxonómia) — a párhuzamos eset: halmaz-eltérés, nem nyelv.
- **ADR-003** (immutability & audit trail — SHA-256) — **az (a) opció ezzel ütközik.**
- **ADR-064** (gyűjtő) — az assign-identitás a Ticket `AssigneeId`-t is érinti.
</content>
</invoke>
