# ADR-IMPL-HR-TAX — ADR-060 végrehajtás: HR enum-taxonómia a faipari készletre

- **Szerep:** backend · **Státusz:** ✅ done (2026-07-16)
- **Spec:** [ADR-060](../../../knowledge/adr/ADR-060-hr-enum-taxonomia.md) (ELFOGADVA — (a) opció
  + PayGrade-kivétel), előfeltétel-döntés: [ADR-059](../../../knowledge/adr/ADR-059-wire-nyelv.md)
  (magyar wire, `EnumWireMap` varrat, **a domain angol marad**)
- **Terület:** `src/hr` Domain + Application (+ kényszerített minimál-diff: EmployeeEndpoints,
  EmployeeEntityTypeConfiguration) — host/Program/DI/appsettings és meglévő migrációk érintetlenek
- **Portal-forrás (csak olvasva):** `src/joinerytech-portal/src/modules/hr/services/employees.ts`
  (zod-sémák), `src/mocks/hr.ts` (HR_PAY_GRADE_META ráták, címkék)

## Mi történt

A backend átvette a portal designer-APPROVED faipari taxonómiáját (ADR-060 (a) opció).
A domain-tagnevek ADR-059 szerint **angolok** — a magyar portal-kulcsok a wire-szótár
(EnumWireMap) dolga, ami a **külön ADR-059-implementációs körben** kerül a `src/Api` varratra
(ld. lentebb, „Amit ez a task NEM csinált meg").

### Enum-készletek: előtte → utána (+ portal wire-kulcs)

**`Department`** (6 → 6, más tengely — szervezeti-funkcionális → üzemi):

| Régi (scaffold) | Új (domain) | Portal wire-kulcs |
|---|---|---|
| Production | Production | `gyartas` |
| Logistics | Logistics | `logisztika` |
| Sales | Sales | `ertekesites` |
| Administration | Office | `iroda` |
| IT | Office | `iroda` |
| Maintenance | Production | `gyartas` |
| — | Installation | `szereles` |
| — | Design | `tervezes` |

**`SkillKey`** (8 általános ipari → 10 faipari):

| Régi (scaffold) | Új (domain) | Portal wire-kulcs | Remap-megjegyzés |
|---|---|---|---|
| CNCProgramming | Cnc | `cnc` | 1:1 |
| ManualLathe | Cutting | `szabas` | legközelebbi megmunkáló készség |
| Welding | Assembly | `osszeszereles` | kötéstechnika → szerkezet-összeállítás |
| Painting | SurfaceFinishing | `felulet` | 1:1 |
| Assembly | Assembly | `osszeszereles` | 1:1 |
| QualityControl | SiteSurvey | `felmer` | mérés/ellenőrzés — legközelebbi |
| ForkliftDriver | Delivery | `szallit` | anyagmozgatás → szállítás |
| ElectricalMaintenance | Installation | `szerel` | helyszíni szerelés |
| — | EdgeBanding | `elzaras` | új |
| — | Design | `tervezes` | új |
| — | Sales | `ertekesites` | új |

**`SkillLevel`** (4 → 3, lossy — ADR-060 §5 szerint vállalt):

| Régi | Új (domain) | Wire-érték (SZÁM!) |
|---|---|---|
| Beginner | Basic | `1` |
| Intermediate | Proficient | `2` |
| Advanced | Proficient | `2` (lossy) |
| Expert | Master | `3` |

⚠️ A SkillLevel az EGYETLEN enum, ami **számként** megy a dróton (portal:
`z.union([z.literal(1), z.literal(2), z.literal(3)])`). Az enum numerikus értékei = a
wire-értékek (Basic=1..Master=3); az **ÚJ**
`Application/Serialization/SkillLevelWireConverter.cs` property-szintű attribútumként ül az
`EmployeeSkillDto.Level`-en, így felülüti a host globális JsonStringEnumConverter-ét
(Program.cs-hez nem kellett nyúlni).

**`PayGrade`** — a (c) minta már most (ADR-060 kivétel):

| Előtte | Utána |
|---|---|
| `PayGrade` VO: szabad szöveg `Name` + perzisztált `HourlyRate` (dolgozónként!) | **ÚJ** `PayGradeBand` enum (5 sáv-kulcs) az aggregátumon; **órabér NEM perzisztált** — tenant-config |

| Sáv (domain) | Portal wire-kulcs | Default ráta (Ft/ó, portal-seed tükör) |
|---|---|---|
| Helper | `seged` | 2600 |
| SkilledWorker | `szakmunkas` | 3800 |
| Master | `mester` | 5200 |
| Engineer | `mernok` | 6400 |
| Lead | `vezeto` | 8000 |

### PayGrade-ráta config — A ROOT/HOSTING TEENDŐJE (pontos kulcsok)

- **Szekció:** `Hr:PayGrades` — kulcsok = sáv-nevek, értékek = órabér (Ft/ó, pozitív decimal).
  `appsettings.json` bejegyzés (hiányzó szekció/kulcs → domain-default, a fenti portal-seed):

```json
"Hr": {
  "PayGrades": {
    "Helper": 2600,
    "SkilledWorker": 3800,
    "Master": 5200,
    "Engineer": 6400,
    "Lead": 8000
  }
}
```

- **DI-bekötés** (options-minta, a handler-oldal már ezt olvassa — a sor a
  `HrServiceCollectionExtensions.AddHrModule`-ba való, amihez ez a task nem nyúlhatott):

```csharp
services.Configure<HrPayGradesOptions>(configuration.GetSection(HrPayGradesOptions.SectionName));
```

- Bekötés NÉLKÜL is működik: az `IOptions<HrPayGradesOptions>` a keretrendszer default
  options-infrastruktúrájából feloldódik, és a property-initializer defaultok (portal-seed)
  élnek. Érvénytelen érték (≤ 0) → `DomainException` az első handler-feloldásnál
  (`HrPayGradesOptions.ToConfiguration()` → `HrPayGradeConfiguration` fail-fast ctor, EHS
  RiskBandConfiguration precedens). Startup-szintű fail-fast a DI-bekötéskor
  `ValidateOnStart`-tal érhető el — hosting-döntés.

### Kontraktus-változások (wire)

- `EmployeeDto`: `payGrade: {name, hourlyRate}` beágyazott objektum → **két lapos mező**:
  `payGrade` (sáv-kulcs string) + `hourlyRate` (szám, configból) — a portal
  `employeeSchema` pontos alakja. `PayGradeDto` törölve.
- `skills[].level`: string (`"Advanced"`) → **szám** (1|2|3).
- `PUT /employees/{id}/skills` request: `level` string → **int** (1..3, azon kívül 400);
  a kivezetett ipari kulcsok (`Welding`, `ManualLathe`, …) szűrőként/payloadként → 400.
- `CreateEmployeeCommand`: `PayGradeName`+`HourlyRate` → `PayGrade` (sáv-enum); validátor:
  `IsInEnum` (rátát a kliens NEM küldhet — tenant-config).
- A magyar kulcsok (`gyartas`, `szabas`, `seged`, …) a dróton az ADR-059 EnumWireMap-pel
  jönnek — addig a wire az angol PascalCase tagneveket beszéli (a meglévő modul-minta).

### Migráció / perzisztencia

- **Nincs új migráció** — ADR-060 szerint: a HR-séma **soha nem jött létre** (a
  `20260707_001/002` migrációk `[DbContext]`/`[Migration]` attribútum nélkül íródtak →
  `Database.Migrate()` no-op, nulla perzisztált sor). Az ADR-062 végrehajtásakor a
  séma-előállítás a MÁR HELYES modellből történik, remap nélkül — a két ADR együtt fut.
- `EmployeeEntityTypeConfiguration`: `OwnsOne(PayGrade)` (PayGrade_Name +
  PayGrade_HourlyRate oszlopok) → `Property(PayGrade)` string-konverzióval (1 oszlop).
- `HRDbContextModelSnapshot` **szándékosan érintetlen** (Migrations-mappa = ADR-062 hatáskör;
  string-alapú, fordul) — az ADR-062 körben újragenerálandó a friss modellből.
- **Adatmegőrző remap** (ha bárhol kézzel létrejött volna a régi séma — dokumentálva, nem futtatva):
  ```sql
  -- hr.employees
  ALTER TABLE hr.employees RENAME COLUMN "PayGrade_Name" TO "PayGrade";
  ALTER TABLE hr.employees DROP COLUMN "PayGrade_HourlyRate"; -- ráta → tenant-config
  UPDATE hr.employees SET "PayGrade" = 'SkilledWorker'; -- szabad szövegből nincs vesztes leképezés: default sáv, kézi utóbesorolás
  UPDATE hr.employees SET "Department" = CASE "Department"
    WHEN 'Administration' THEN 'Office' WHEN 'IT' THEN 'Office'
    WHEN 'Maintenance' THEN 'Production' ELSE "Department" END;
  -- hr.employee_skills (Key/Level a fenti táblázatok szerint)
  UPDATE hr.employee_skills SET "Key" = CASE "Key"
    WHEN 'CNCProgramming' THEN 'Cnc' WHEN 'ManualLathe' THEN 'Cutting'
    WHEN 'Welding' THEN 'Assembly' WHEN 'Painting' THEN 'SurfaceFinishing'
    WHEN 'QualityControl' THEN 'SiteSurvey' WHEN 'ForkliftDriver' THEN 'Delivery'
    WHEN 'ElectricalMaintenance' THEN 'Installation' ELSE "Key" END;
  UPDATE hr.employee_skills SET "Level" = CASE "Level"
    WHEN 'Beginner' THEN 'Basic' WHEN 'Intermediate' THEN 'Proficient'
    WHEN 'Advanced' THEN 'Proficient' WHEN 'Expert' THEN 'Master' ELSE "Level" END;
  ```

## Hogyan ellenőrizve

- `dotnet build` (modul + Api host + tesztek, Rebuild): **zöld, 0 warning**.
- Tesztek: **167/167 zöld** (baseline **133** → **+34**),
  `--filter FullyQualifiedName!~Integration`:
  - **ÚJ** `tests/Domain/HrTaxonomyTests.cs` (4): a 6/10/3/5-ös készletek portal-tükör
    őrei + a SkillLevel numerikus wire-értékei (1/2/3).
  - **ÚJ** `tests/Domain/HrPayGradeConfigurationTests.cs` (12): default = portal-seed ráták
    sávonként, tenant-felülírás, fail-fast ≤ 0 rátára, `Hr:PayGrades` szekció-név,
    options→konfiguráció konverzió.
  - **ÚJ** `tests/Application/EmployeePayGradeProjectionTests.cs` (8): a DTO sávonként a
    config-rátát hordozza; a Get(-s)QueryHandler a kötött tenant-rátával vetít (Moq repo +
    `Options.Create`); érvénytelen config → handler-feloldási DomainException.
  - `tests/Api/EmployeeEndpointsTests.cs` (+9 új): payGrade/hourlyRate lapos wire-alak,
    skills.level **számként** a válaszban, kivezetett ipari kulcsok (dept=IT/Administration/
    Maintenance, skill=Welding/ManualLathe/ForkliftDriver) → 400, level 0/4 → 400, string
    level → 400.
  - `tests/Domain/EmployeeTests.cs` (+1): PromoteToPayGrade azonos sávra → DomainException.
  - Igazítva (taxonómia-váltás jogosan érinti): EmployeeTests, EmployeeEndpointsTests,
    WeekCapacityGridTests, CapacityCalculationServiceTests, VacationEntitlementServiceTests,
    BasicRepositoryTests (Integration — csak fordítás, a készlet Docker-függése pre-existing).

## Amit ez a task NEM csinált meg (szándékosan)

1. **`Api/WireEnums.cs` (magyar wire-szótár + regisztráció)** — ADR-059 implementációs kör
   (Program.cs/DI-hez nem nyúlhattunk). A wire-kulcs táblázatok fent készen állnak hozzá.
   A két `ListEmployees_Invalid*Filter_Returns400` teszt akkor fordul át (a `gyartas`/`szabas`
   érvényes kulccsá válik).
2. **`Hr:PayGrades` appsettings-bejegyzés + `Configure<HrPayGradesOptions>` DI-sor** — root/
   hosting (pontos tartalom fent).
3. **Aggregátum-bővítés** (`phone`/`startedAt`/`employment`/`color`) — az ADR-060 döntési
   checkboxa nem lett bejelölve; marad HR-BE-HOST follow-up 6.
4. **ADR-062** (migráció-attribútumok + snapshot-újragenerálás) — külön kör, a modell már
   a helyes taxonómiát adja neki.

## Fájlok

**ÚJ:** `src/Domain/Enums/PayGradeBand.cs` · `src/Domain/Services/HrPayGradeConfiguration.cs` ·
`src/Application/Configuration/HrPayGradesOptions.cs` ·
`src/Application/Serialization/SkillLevelWireConverter.cs` ·
`tests/Domain/{HrTaxonomyTests,HrPayGradeConfigurationTests}.cs` ·
`tests/Application/EmployeePayGradeProjectionTests.cs`

**MÓDOSÍTVA:** `src/Domain/Enums/{Department,SkillKey,SkillLevel}.cs` (taxonómia + remap-doksi) ·
`src/Domain/Aggregates/Employee.cs` (PayGrade → PayGradeBand; Promote same-band guard) ·
`src/Domain/Events/EmployeePromotedEvent.cs` (sáv-kulcs, ráta kikerült) ·
`src/Application/DTOs/{EmployeeDto,HrDtoMapper}.cs` (lapos payGrade+hourlyRate; rate-feloldás) ·
`src/Application/Queries/{GetEmployeeQueryHandler,GetEmployeesQueryHandler}.cs` (options-minta) ·
`src/Application/Commands/{CreateEmployeeCommand,CreateEmployeeCommandHandler}.cs` ·
`src/Application/Validators/CreateEmployeeValidator.cs` ·
`src/Api/Endpoints/EmployeeEndpoints.cs` (kényszerített minimál-diff: level int) ·
`src/Infrastructure/Persistence/Configurations/EmployeeEntityTypeConfiguration.cs`
(PayGrade owned→scalar) ·
tesztek: `tests/Domain/{EmployeeTests,WeekCapacityGridTests,CapacityCalculationServiceTests,VacationEntitlementServiceTests}.cs`,
`tests/Api/EmployeeEndpointsTests.cs`, `tests/Integration/BasicRepositoryTests.cs`

**TÖRÖLVE:** `src/Domain/ValueObjects/PayGrade.cs` (→ PayGradeBand enum + config-ráta)

**VÁLTOZATLAN:** Program.cs, HrServiceCollectionExtensions, appsettings, interceptorok,
meglévő migrációk + snapshot, portal fa (csak olvasott kontraktus)
