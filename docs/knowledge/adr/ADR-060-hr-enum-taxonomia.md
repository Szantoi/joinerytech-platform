# ADR-060: HR enum-taxonómia ütközés — faipari vs. általános ipari készség-készlet

- **Státusz:** PROPOSED — döntésre vár (root + designer)
- **Dátum:** 2026-07-16
- **Felvetette:** HR-BE-HOST (1.) — „nemcsak a nyelv, hanem az **enum-készlet is más**"
- **Függ:** ADR-059 (wire-nyelv) — a nyelvi döntés után válaszolható meg, hogyan íródik a halmaz

---

## Kontextus

A HR-BE-HOST helyesen azonosította, hogy a HR eltérése **mélyebb a wire-nyelvnél**: nem
fordítási, hanem **fogalmi** eltérés. A kód ezt megerősíti — és megmutatja az okát is.

### A négy ütköző enum (kódból)

| Fogalom | Backend (`src/hr/src/Domain/Enums/`) | Portal (`modules/hr/services/employees.ts`) | Viszony |
|---|---|---|---|
| **SkillKey** | **8**: `CNCProgramming`, `ManualLathe`, `Welding`, `Painting`, `Assembly`, `QualityControl`, `ForkliftDriver`, `ElectricalMaintenance` (`SkillKey.cs:5-12`) | **10**: `szabas`, `elzaras`, `cnc`, `osszeszereles`, `felulet`, `szerel`, `szallit`, `felmer`, `tervezes`, `ertekesites` (`employees.ts:23-26`) | **nem bijektív** |
| **Department** | **6**: `Production`, `Logistics`, `Sales`, `Administration`, `IT`, `Maintenance` (`Department.cs:5-12`) | **6**: `gyartas`, `szereles`, `logisztika`, `tervezes`, `ertekesites`, `iroda` (`employees.ts:15-17`) | azonos elemszám, **más tengely** |
| **SkillLevel** | **4** fokozat (Beginner..Expert) | **3**: `1\|2\|3` = alap/rutin/mester (`employees.ts:29-31`) | lossy |
| **PayGrade** | szabad szöveg + órabér VO | **5 fix sáv**: `seged`, `szakmunkas`, `mester`, `mernok`, `vezeto` + külön `hourlyRate` (`employees.ts:20,46-47`) | eltérő modell |

### A döntő megfigyelés: a backend-készlet nem faipari — hanem általános ipari sablon

A `SkillKey` tagjai: **`ManualLathe`** (kézi eszterga), **`Welding`** (hegesztés),
**`ForkliftDriver`**, **`ElectricalMaintenance`**. Ezek **fémipari/általános gyártósori**
készségek. A `Department` tengelye szervezeti-funkcionális (`IT`, `Administration`), nem üzemi.

Ezzel szemben a platform identitása (`CLAUDE.md`): *„az **általános faipar** SaaS platform"* —
a portal `szabas` (szabászat), `elzaras` (élzárás), `felulet` (felületkezelés), `felmer`
(felmérés) készlete **pontosan a faipari munkafolyamat**, és **designer-APPROVED**.

**Következtetés:** a backend HR-enumok nem egy átgondolt, versengő taxonómia, hanem egy
**generikus scaffold**, ami sosem lett a faipari domainre szabva. A portal taxonómiája az
egyetlen, amit valaki szándékosan, a domainre tervezett. **A backendnek nincs érdemi
igénye a saját készletére.**

### A migrációs ablak nyitva van — de nem sokáig

A HR-nek **soha nem jött létre az adatbázis-sémája**: a `20260707_001_InitialCreate.cs` és
`20260707_002_EnableRLS.cs` **`[DbContext]`/`[Migration]` attribútum nélkül** íródott →
`Database.Migrate()` számára láthatatlanok (→ **ADR-062**; a DMS és a maintenance ezt a hibát
már javította, a HR kimaradt). **Nulla perzisztált sor létezik. A taxonómia-váltás ma
ingyenes; adat mellett migráció + adat-remap lenne.**

---

## Döntendő kérdés

**Melyik HR készség-/szervezeti taxonómia a kanonikus — és enum marad-e egyáltalán, vagy
per-tenant törzsadattá válik?**

---

## Opciók

### (a) A backend átveszi a portal faipari taxonómiáját

`SkillKey` → 10 faipari kulcs, `Department` → 6 üzemi, `SkillLevel` → 3, `PayGrade` → 5 sáv
enum + a sávhoz tartozó órabér tenant-configból.

- **Következmény:** a HR endpointok a designer-APPROVED faipari fogalmakat szolgálják ki;
  a portal-oldal érintetlen. A domain a platform identitását tükrözi.
- **Munkaigény:** enum-átírás + a `CapacityCalculationService`/DTO-k igazítása + tesztek
  ≈ **2-3 nap**. **Migráció: nincs** (nincs séma, nincs adat).
- **Kockázat:** a faipari taxonómia beégetése a platform-enumba → egy más profilú tenant
  (vagy a Doorstar-instans eltérő üzeme) nem tud saját készség-készletet. **Ez a (c) opció
  halasztása** — de olcsón visszavonható (az enum-értékek lesznek a seed-sorok).

### (b) A portal átveszi a backend általános ipari taxonómiáját

- **Következmény:** egy **faipari** termék UI-ján `ManualLathe` (eszterga) és `Welding`
  (hegesztés) jelenik meg, `szabas`/`elzaras` nélkül. Az APPROVED HR-világ újranyitása.
- **Munkaigény:** ≈ 3-4 nap + designer-újrakör.
- **Kockázat:** **üzletileg védhetetlen** — a termék elveszti a domain-hitelességét egy
  scaffold kedvéért. Csak a teljesség kedvéért szerepel.

### (c) Törzsadat: készség/részleg/bérsáv referencia-táblába, nem enum

- **Következmény:** **hosszú távon ez a helyes válasz.** Egy *általános faipar SaaS platform*,
  amit több asztalosüzem használ (+ a Doorstar-instans), elkerülhetetlenül **per-tenant
  készség-készletet** fog igényelni. Az órabér-sávok pedig eleve tenant-specifikus üzleti adat.
- **Munkaigény:** referencia-táblák + seed + FK-migrációk + törzsadat-admin UI + a portal zod
  `z.enum` → `z.string()` (a típusbiztonság elvesztése az UI-ban, ahol ma skill-kulcs szerinti
  színek/ikonok vannak) ≈ **2-3 hét**.
- **Kockázat:** 2-3 hetes kitérő egy **nulla adatú, nulla felhasználójú** modulon, miközben a
  fetcher-átállás áll. Túl korai absztrakció: ma **egy** tenant van, és annak a taxonómiája
  ismert és jóváhagyott.

### (d) Kétirányú mapping-réteg

- **Következmény:** **matematikailag lehetetlen** — a halmazok nem bijektívek (`IT`/`Maintenance`
  ↔ `szereles`/`tervezes` nem feleltethető meg; 8↔10 skill részleges átfedéssel; 4↔3 szint
  lossy). Egy mapping vagy adatot veszít, vagy hazudik.
- **Elvetendő** — a teljesség kedvéért nevesítve, mert a wire-nyelv ADR-ből (ADR-059) adódó
  reflex lenne ezt is szótárral megoldani. **Nem megy.**

---

## Ajánlás

> **(a) most — a backend átveszi a portal faipari taxonómiáját; (c) rögzítve, mint a ismert
> továbbfejlesztési irány, a Doorstar/több-tenant trigger mentén.**
>
> **Kivétel: a `PayGrade` már most (c) szerint épüljön** — sáv-kulcs enum (5 érték), de az
> **órabér tenant-configból**, nem az enumból.

**Indoklás:**

1. **A backendnek nincs igénye a saját készletére.** `ManualLathe` és `Welding` egy faipari
   platformon nem versengő álláspont, hanem **maradék scaffold**. A portal taxonómiája az
   egyetlen, amit a domainre terveztek és jóváhagytak. Ez nem kompromisszum-kérdés.

2. **Az ablak most ingyenes, és záródni fog.** Nincs séma, nincs adat (a migráció inert). Ma
   enum-átírás; az első éles tenant után adat-remap + migráció + állásidő.

3. **A (c) nem sürget, mert olcsón elérhető marad.** Az enum→referencia-tábla átmenet
   **contained**: az enum-értékek lesznek a seed-sorok, a wire-kulcsok változatlanok maradnak.
   Fordítva viszont a 2-3 hetes törzsadat-építés most **egy hipotetikus második tenantért**
   szólna, miközben a valódi, ma ismert tenant taxonómiája kész és APPROVED. **A (c)-t akkor
   kell megcsinálni, amikor az első tenant tényleg mást kér — nem előbb.**

4. **A `PayGrade` viszont már ma is más eset, és a portal maga is így látja.** Az órabér
   **tenant-specifikus üzleti adat**, nem taxonómia — enumba égetni hiba lenne. A portal
   `employees.ts:46-47` már ma **külön mezőn** hordozza (`payGrade: payGradeSchema` +
   `hourlyRate: z.number()`), vagyis a két oldal ebben **egyetért**: a sáv kulcs, a bér adat.
   A backend `PayGrade{Name, HourlyRate}` VO-ja ehhez közel áll — csak a `Name` szabad szövegét
   kell az 5 kulcsra szűkíteni, a rátát pedig tenant-configba emelni.

5. **A `SkillLevel` 4→3 szűkítés vállalható**, mert nincs adat, és a portal 3 szintje
   (alap/rutin/mester) a mesterségbeli valóság. ⚠️ **Technikai figyelmeztetés:** a portal
   `z.union([z.literal(1), z.literal(2), z.literal(3)])` — vagyis a `SkillLevel` az egyetlen
   enum, ami **számként** megy a dróton, nem stringként. Ez ADR-059 alóli tudatos kivétel,
   dedikált `JsonConverter`-t igényel.

---

## Hatás

**Modulok / fájlok:**
- `src/hr/src/Domain/Enums/{SkillKey,Department,SkillLevel}.cs` — átírás.
- `src/hr/src/Domain/ValueObjects/PayGrade` — `Name` → sáv-kulcs enum; a ráta
  `Hr:PayGrades:<band>` configba (EHS `RiskBandConfiguration` fail-fast precedens,
  HR-BE-HOST §3 minta).
- `src/hr/src/Application/DTOs/{EmployeeDto,HrDtoMapper}.cs`, `CapacityCalculationService`.
- `src/hr/src/Api/WireEnums.cs` (**új**, ADR-059 szerint) + `SkillLevel` int-konverter.
- Tesztek: `tests/Domain/*`, `tests/Api/EmployeeEndpointsTests.cs` (ma `"Production"`,
  `"CNCProgramming"` stringeket assertál).
- **Portal: nincs változás.**

**Érdemes egy körben csinálni** (ugyanaz a migráció, HR-BE-HOST follow-up 6.): az `Employee`
aggregátum hiányzó mezői — `phone`, `startedAt` (HireDate), `employment` (az `EmploymentType`
enum **létezik, de nincs mező az aggregátumon**), `color`. A portal mind a négyet mutatja.

**Migráció:** a séma-létrehozás **most történik először** (ADR-062 attribútum-javítás után) —
tehát a helyes taxonómia **azonnal** a helyére kerülhet, remap nélkül. **A két ADR-t
együtt kell végrehajtani.**

**Munka:** ≈ 2-3 nap (+ ~1 nap, ha az aggregátum-bővítés is belefér).

**Blokkol-e élesítést?** A HR élesítését igen — a mai enumokkal a HR-portal fetcher-átállás
nem lehet „MSW-lekapcsolás", ahogy a HR-BE-HOST is írja.

---

## Döntés

_(Gábor tölti ki)_

- [ ] (a) Backend átveszi a faipari taxonómiát, (c) későbbre jegyezve — *ajánlott*
- [ ] (b) Portal átveszi a backend készletét
- [ ] (c) Törzsadat/referencia-tábla már most
- [ ] `PayGrade`: sáv-enum + config-ráta ☐ / marad szabad szöveg ☐
- [ ] Aggregátum-bővítés (phone/startedAt/employment/color) ugyanebben a körben? ☐

**Indoklás:**

---

## Kapcsolódó ADR-ek

- **ADR-059** (wire-nyelv) — **előfeltétel**: milyen nyelven íródik az itt elfogadott halmaz.
- **ADR-062** (RLS) — a HR migráció-attribútum hibája; **együtt végrehajtandó** (ugyanaz a
  séma-létrehozás).
- **ADR-063** (QA rework) — a párhuzamos eset: ott is halmaz-eltérés, nem nyelv.
</content>
</invoke>
