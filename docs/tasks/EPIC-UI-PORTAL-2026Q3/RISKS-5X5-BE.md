# RISKS-5X5-BE — EHS 5×5 kockázati mátrix backend (RiskAssessment FSM + config-sávok + CAPA)

- **Szerep:** backend · **Státusz:** ✅ done (2026-07-15) · **Fázis:** F2 backlog (EHS)

## Feladat
A portal RisksScreen (még statikus mockon fut) backend-kontraktusának megteremtése a kanonikus
`src/ehs` modulban: RiskAssessment aggregátum a meglévő EHS DDD/FSM-minták szerint, konfigurálható
kockázati sávokkal, lokáció-referenciával, egységes CAPA-csatolással és 5×5 mátrix-összesítővel.
A portal-migráció NEM része a tasknak (külön follow-up).

## Kivitelezés / Eredmény

### Domain (a meglévő fázis-1 RiskAssessment kibővítése)
- **FSM:** `Draft (vazlat) → UnderReview (felulvizsgalat) → Approved (jovahagyva) → Archived (archivalva)`,
  + `UnderReview → Draft` (return-to-draft). Illegális átmenet = `InvalidOperationException` → **409**.
  Időbélyegek: `SubmittedAt/ApprovedAt/ArchivedAt`. A régi `Active/Archived` életciklust váltja.
- **Config-vezérelt sávok — NINCS hardcode:** új `RiskBandConfiguration` value object
  (`LowMax/MediumMax/HighMax`, validált: emelkedő, 1–25-öt lefedő, nem-üres Critical sáv).
  Forrás: `Ehs:RiskMatrix:Bands` config-szekció (DI-singleton, hiányzó kulcs → domain-default **4/9/16**,
  érvénytelen érték → induláskori fail-fast). A régi kód 3 sávos volt és **rést hagyott 13–14-nél** — javítva:
  4 összefüggő sáv: `Low 1-4 / Medium 5-9 / High 10-16 / Critical 17-25` (default).
- **`RiskLevel` enum:** +`Critical` (a portal-mock 4 szintet vár: critical/high/medium/low).
- **Lokáció:** opcionális `LocationId` (EhsLocation-referencia); create/update-kor tenant-en belüli
  létezés-guard (nem létező lokáció → 409, a SafetyWalk-minta szerint).
- **Egységes CAPA:** `CorrectiveAction.CreateForRiskAssessment` factory (`CapaSource.RiskAssessment`
  eddig "reserved" volt); `RiskControl.CorrectiveActionId` link + `LinkControlCorrectiveAction` guard
  (a safety walk finding mintája). Az add-control opcionális CAPA-mezőkkel spawnol.
- **Mátrix-aggregáció domain-logikaként:** `RiskMatrix.BuildCells` — pure függvény, mind a 25 cella
  (üresek is, count=0), cellánkénti sáv-besorolás a config-sávokból. A repository csak lapos projekciót ad.
- Új domain-eventek: `RiskAssessmentUpdated/SubmittedForReview/Approved/ReturnedToDraft`.
- Szerkesztés csak Draft-ban (`UpdateDetails` — score/sáv újraszámítás); `AddControl` archivált
  állapotban tiltott (Draft/UnderReview/Approved-ban megengedett).

### Application + Api (10 endpoint, `/api/ehs/risk-assessments`)
| Endpoint | Leírás |
|---|---|
| `GET /` | lista — szűrés: `riskLevel`, `status`, `locationId`, `reviewDueBefore` (SQL-oldali) |
| `POST /` | create (FSM entry: Draft) → 201; 400 validáció; 409 nem létező lokáció |
| `GET /{id}` | detail (control-okkal + CAPA-linkekkel); 404 |
| `PUT /{id}` | update (csak Draft; score/sáv újraszámítás) → 204; 400/404/409 |
| `POST /{id}/submit-for-review` | FSM: Draft → UnderReview → 204; 404/409 |
| `POST /{id}/approve` | FSM: UnderReview → Approved → 204; 404/409 |
| `POST /{id}/return-to-draft` | FSM: UnderReview → Draft → 204; 404/409 |
| `POST /{id}/archive` | FSM: Approved → Archived → 204; 404/409 |
| `POST /{id}/add-control` | intézkedés + opcionális egységes-CAPA spawn → 201 (controlId + capaId); 400/404/409 |
| `GET /risk-matrix` | 5×5 mátrix-összesítő a dashboardnak: total, byRiskLevel, byStatus + mind a 25 cella darabszámmal (nem-archivált állomány) |

- Hibakontraktus a meglévő EHS-konvenció szerint: 404 = `KeyNotFoundException`,
  **409 = illegális FSM-átmenet / hiányzó referencia**, 400 = validáció/domain-guard
  (1-5 tartomány `Enum.IsDefined` guarddal, kötelező mezők, jövőbeli review-dátum).
- Handlerek `ILogger`-rel logolnak (create/update score+szint, FSM-átmenetek, CAPA-spawn) —
  ehhez `Microsoft.Extensions.Logging.Abstractions` került az Application csproj-ba.
- **Enum-serializáció igazítva a kontraktushoz:** `JsonStringEnumConverter` a Programban —
  az enumok stringként utaznak (`"Draft"`, `"Major"`), az openapi.yaml string-enumjaival összhangban
  (int input továbbra is elfogadott).
- DTO-k bővítve: `LocationId`, `RiskScore`, FSM-időbélyegek, `ControlMeasureDto.CorrectiveActionId`.

### Infrastructure
- Migráció: `20260715204959_RiskAssessment5x5Fsm` — `location_id` (+index), FSM-időbélyegek,
  `risk_controls.corrective_action_id`; **kézi, adatmegőrző státusz-remap** (`Active` → `Approved`,
  string-tárolás miatt SQL-lel; reverzibilis Down).
- Repository: `locationId` szűrő; a mátrix-összesítés kikerült a repóból (hardcode-olt sáv-switch törölve) —
  helyette `GetMatrixProjectionAsync` lapos projekció, az aggregálást a query handler végzi a domain
  `RiskMatrix`-szal. A redundáns `GetRiskMatrixAsync`/`RiskMatrixData` törölve.
- `docs/openapi.yaml` frissítve: a risk-szekció a tényleges implementációhoz igazítva
  (a régi aspirációs `/controls`, `/matrix`, PUT-archive útvonalak cserélve), +`Severity`/`Likelihood`
  közös string-enum sémák; 46 → **49 path**, YAML + `$ref`-integritás validálva (python-yaml szkripttel).

## Tesztek
- **Domain unit: 130/130 zöld** (korábban 92) — a RiskAssessmentTests újraírva: 52 risk-teszteset:
  score/sáv-számítás **sávhatár-éleken** (1, 4|5, 9|10, 16|17, 25), custom-config sáv-bizonyíték,
  érvénytelen band-config elutasítás, minden FSM legális + illegális átmenet, Draft-only update,
  control + CAPA-link guardok, `CreateForRiskAssessment` source-teszt, mátrix: 25 cella / darabszámok /
  sáv-besorolás. A többi 78 meglévő teszt érintetlen és zöld.
- Integrációs (Testcontainers): RiskAssessmentRepositoryTests az új szignatúrákra igazítva
  (+lokáció-szűrő, +projekció, +FSM-perzisztencia teszt) — **fordul**, de Docker nincs a gépen →
  CI/VPS futtatás (pre-existing korlát, F2-EHS-BE óta ismert).
- Runtime smoke: Api elindult, Swagger 200, mind a 10 risk-route kiszolgálva.
- Build: Api teljes lánc 0 error (AutoMapper NU1603/NU1903 warningok pre-existing).
- A `risks-tests.log` a futtatás után törölve (task-előírás).

## Fájlok
Domain: 6 új (RiskBandConfiguration, RiskMatrix, 4 event) + 4 módosított (RiskAssessment, RiskControl,
RiskLevel, RiskStatus, CorrectiveAction, CapaSource); Application: 12 új (Update + 4 FSM-parancs
triókban) + 6 módosított; Infrastructure: migráció + repo + EF-config; Api: endpoints + DI + Program;
tesztek: RiskAssessmentTests (52 eset) + infra-teszt igazítás; docs: openapi.yaml, README.md.

## Follow-upok
1. **RISKS-5X5-FE** (frontend): portal RisksScreen migráció mockról API-ra — a mock 3×3-as
   (probability/impact 1-3), a backend 5×5-ös; UI-átállás + Orval-kliens + `RISK_LEVEL_META`
   ráköthető a 4 sávra. A `src/joinerytech-portal`-hoz e task NEM nyúlt.
2. FluentValidation-validátorok regisztrálva vannak, de **nincs MediatR pipeline-behavior**, ami
   futtatná őket (modul-szintű, pre-existing) — a 400-akat ma a domain-guardok adják; javasolt egy
   közös `ValidationBehavior` bevezetése külön körben.
3. Swashbuckle a Swagger UI-ban az enumokat még számként jeleníti meg (a runtime string-konvertert
   nem látja) — kozmetikai; a kanonikus kontraktus a `docs/openapi.yaml`. Igény esetén
   `SwaggerGen` enum-mapping külön körben.
4. Integrációs tesztek futtatása CI/VPS-en (Docker-hiány a fejlesztő gépen).
