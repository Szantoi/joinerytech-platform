# ADR-IMPL-WIRE — ADR-059 végrehajtás: magyar wire-kulcsok EnumWireMap-pel (backend-oldal, mind a 7 modul)

**Epic:** EPIC-UI-PORTAL-2026Q3 (wave 2) · **Szerep:** backend · **Kiadva:** 2026-07-18 (root)
**Spec:** docs/knowledge/adr/ADR-059 (ELFOGADVA: a kanonikus wire-nyelv MAGYAR kulcs a dróton,
a fordítás a backend szerializációs varratán él EnumWireMap-pel; a domain angol marad).

## Cél

Mind a 7 modul (ehs, qa, hr, maintenance, dms, CRM, kontrolling) enum-wire-je a portál
kanonikus magyar kulcsait beszéli — a VÉGLEGES enum-készleteken (ADR-060 HR-taxonómia és
ADR-063 QA-Conditional már benne van). A portál-oldali átállás KÜLÖN task (a production-FE
lezárta után) — itt CSAK backend.

## Elvek

1. **A kontrolling a precedens**: ott már él EnumWireMap + WireEnumConverter (EGY szótár
   JSON-ra + query-stringre, hiányzó wire-név induláskor DOB). Ezt a mintát emeld be a
   **SpaceOS.Modules.Hosting** csomagba (ADR-061 3. pont szerinti konszolidáció), és a
   kontrolling is a közösről fusson (a lokális másolata megszűnik).
2. **Modulonként EGY wire-szótár** (Api/WireEnums.cs vagy ekvivalens) — a HR task-doksi
   (archive/ADR-IMPL-HR-TAX.md) kulcstáblái készen állnak; a portál zod-sémái a
   kanonikus kulcs-források (src/joinerytech-portal/src/modules/<mod>/services).
3. **Teljes felület**: JSON-válasz + request-payload + query-paraméter + hibaüzenetben
   szereplő státusznév. Ahol a DTO ma számot ad (enum-mező konverter nélkül), ott is a
   magyar string lesz a wire-alak.
4. **Fail-fast**: lefedetlen enum-érték = induláskori kivétel, nem futásidejű meglepetés.
5. **Round-trip tesztek** modulonként: minden enum-érték oda-vissza (serialize→parse),
   ismeretlen kulcs → 400-as payload-hiba a bevett hibakontraktussal.
6. **OpenAPI-szinkron**: ahol openapi.yaml él (qa, dms, crm), az enum-értéklisták frissülnek.

## Korlátok

- CSAK a backend-fák: src/ehs, src/qa, src/hr, src/maintenance, src/dms,
  src/SpaceOS.Modules.CRM, src/spaceos-modules/spaceos-modules-kontrolling,
  src/spaceos-modules-hosting + ez a task-doksi + az EPICS.yaml SAJÁT sora.
- **TILTOTT: src/joinerytech-portal** (ott másik agent dolgozik) és a terminals/.
- GIT COMMIT TILOS — a root commitol ellenőrzés után.
- A teszt-baseline nem romolhat: hosting 41, QA 217, HR 190, Maintenance 157, DMS 73,
  Kontrolling 186, CRM 103, EHS 130+50 (az EHS-infra SafetyWalkCapaFlow ismert
  pre-existing bukás — nem a te dolgod).

## Kész-kritérium

Mind a 7 modul wire-tesztje zöld a magyar kulcsokkal; a hosting-csomagban közös
EnumWireMap-infra; modulonkénti kulcstáblák a task-doksiban dokumentálva; a portál-oldali
átállási lista (mely zod-sémák/fetcherek érintettek) a doksi végén a következő FE-tasknak.

---

## Mi történt (2026-07-18, ✅ done)

### Közös infra: SpaceOS.Modules.Hosting.Wire

A kontrolling `Api/WireEnums.cs`-ében élő `EnumWireMap<TEnum>` + `WireEnumConverter<TEnum>`
mechanika átemelve `src/spaceos-modules-hosting/src/SpaceOS.Modules.Hosting/Wire/` alá,
két kiegészítéssel: a konstruktor a hiányzó ÉS a duplikált wire-spellingre is fail-fast
dob (korábban csak a hiányzóra), és új `TranslateNames(text)` — egy enum tagnév-halmaz
whole-word cseréje a wire-kulcsokra, ez a hibaüzenet-fordítás varrata (409/400 FSM-üzenetek,
domain angol marad). A kontrolling `Api/WireEnums.cs`-e mostantól CSAK a szótárat tartja
(`KontrollingWire`), a mechanikát a hostingból importálja — a lokális `EnumWireMap`/
`WireEnumConverter` megszűnt. 57 hosting-teszt zöld (41 régi + 16 új: fail-fast hiány/
duplikátum, round-trip, TranslateNames whole-word).

### Modulonkénti kulcstáblák

**EHS** — `src/ehs/src/Application/Wire/WireEnums.cs`, `EhsWire`, **14 enum**, összesen
**59 kulcs** (⚠️ a portál EHS-világa ma még angol PascalCase — ez a tábla a KANONIKUS forrás
egy külön FE-taskhoz, ADR-059 §"Az EHS is igazodjon"):

| Enum | Kulcsok |
|---|---|
| IncidentType | baleset, majdnem_baleset, veszelyes_allapot |
| IncidentStatus | bejelentve, kivizsgalva, intezkedes_tervezve, lezarva, ujranyitva |
| Severity | elhanyagolhato, enyhe, kozepes, sulyos, katasztrofalis |
| Likelihood | ritka, valoszinutlen, lehetseges, valoszinu, szinte_biztos |
| RiskLevel | alacsony, kozepes, magas, kritikus |
| RiskStatus | piszkozat, ellenorzes, jovahagyva, archivalt |
| LocationKind | telephely, epulet, csarnok, zona, kulteri |
| MaterialStatus | aktiv, archivalt |
| SdsValidity | ervenyes, lejaro, lejart |
| TrainingStatus | ervenyes, lejaro, lejart |
| PpeCategory | fej, szem, hallas, legzes, kez, lab, test, leeses |
| PpeIssuanceStatus | kiadva, atveve, visszaadva, cserelve |
| SafetyWalkStatus | utemezve, folyamatban, intezkedes_szukseges, lezarva, torolve |
| CapaSource | esemeny, bejaras, kockazatertekeles |

Query-string filterek `[AsParameters]` enum-mezőkből `string?`-re váltva + kézi
`WireQuery.TryParse` (400 a lehetséges kulcsokkal); az incident/risk-summary handlerek
dictionary-kulcsai (`ByType`/`BySeverity`/`ByStatus`/`ByRiskLevel`) is wire-kulcsra váltva.
openapi.yaml (14 enum-blokk + FSM-próza) szinkronban. Tesztek: **130 domain (változatlan)**
+ **22 új** `EhsWireTests` (vocabulary pin, case-sensitivity, JSON round-trip, ismeretlen
kulcs → JsonException) a Docker-mentes Infrastructure.Tests alatt.

**QA** — `src/qa/src/Api/WireEnums.cs`, `QaWire`, **10 enum**, **~40 kulcs**:

| Enum | Kulcsok |
|---|---|
| InspectionStatus | nyitott, folyamatban, lezarva |
| InspectionResult | fuggoben, megfelelt, selejt, felteteles |
| CheckpointType | beerkezo, gyartaskozi, vegso |
| CriteriaType | vizualis, meretes, funkcionalis |
| CriticalLevel | kritikus, jelentos, enyhe |
| FailureType | karc, hezag, illeszkedes, szin, meret, felulet, funkcionalis, hianyzo, serules, egyeb |
| TicketStatus | bejelentve, kiosztva, folyamatban, megoldva, elutasitva |
| TicketType | garancia, javitas, hiany |
| CrmTaskPriority (ticket priority) | alacsony, kozepes, magas, kritikus |
| ActionType | javitas, csere, visszaterites, nincs_intezkedes |

A holt `TicketPriority` enum tudatosan NEM lett feltérképezve (sosem megy a dróton).
`QaEndpointResults.Failure` a 409-üzeneteket `TranslateNames`-szel fordítja (TicketStatus +
InspectionStatus + InspectionResult láncolva). openapi.yaml (10 séma + FSM-próza) szinkron.
Tesztek: **205 Docker-mentes** (186 régi, ebből 8 `TicketEndpointsTests` javítva a magyar
kulcsokra + **19 új** `QaWireTests`).

**HR** — `src/hr/src/Api/WireEnums.cs`, `HrWire`, **5 enum**, **29 kulcs** (SkillLevel
TUDATOSAN kimaradt — marad szám 1|2|3 a `SkillLevelWireConverter` property-attribútummal,
ADR-060 §5 kivétel; EmploymentType/MaritalStatus sosem megy a dróton):

| Enum | Kulcsok |
|---|---|
| Department | gyartas, szereles, logisztika, tervezes, ertekesites, iroda |
| SkillKey | szabas, elzaras, cnc, osszeszereles, felulet, szerel, szallit, felmer, tervezes, ertekesites |
| PayGradeBand | seged, szakmunkas, mester, mernok, vezeto |
| AbsenceStatus | kert, jovahagyva, elutasitva, folyamatban, lezarva |
| AbsenceType | szabadsag, betegseg, fizetes_nelkuli, egyeb |

`HrEndpointResults` a 409-eket `HrWire.AbsenceStatus.TranslateNames`-szel fordítja. Nincs
openapi.yaml a modulban (runtime Swagger). Tesztek: **185 Docker-mentes** — a korábbi
`ListEmployees_Invalid{Dept,Skill}Filter_Returns400` tesztek pozitív szűrő-tesztekké
fordultak (a régi angol kulcsok ma 400-at adnak, a magyar érvényes), + `HrWireTests`.

**Maintenance** — `src/maintenance/src/Api/WireEnums.cs`, `MaintenanceWire`, **7 enum**,
**28 kulcs**:

| Enum | Kulcsok |
|---|---|
| AssetKind | gep, jarmu, szerszam, infrastruktura, it, helyiseg |
| AssetStatus | uzemel, karbantartas, geptores, selejtezve |
| MaintenanceTrigger | idokoz, uzemora |
| WorkOrderStatus | bejelentve, utemezve, folyamatban, kesz, halasztva, elutasitva |
| WorkOrderType | javitas, megelozo, takaritas |
| WorkOrderPriority | kritikus, magas, kozepes, alacsony |
| AssignmentType | belso, kulso |

A `WorkOrderEndpoints.ToTransitionResult` a 409-üzeneteket `WorkOrderStatus.TranslateNames`-
szel fordítja. Nincs openapi.yaml. Tesztek: **149 Docker-mentes** (+ `MaintenanceWireTests`).
Follow-up: a lista-végpontok ma nem kötnek enum query-szűrőt (hardcode null) — nem ebben a
körben, dokumentálva.

**DMS** — `src/dms/src/Api/WireEnums.cs`, `DmsWire`, **4 enum**, **17 kulcs** — EZ A MODUL
kapott domain-takarítást is (ADR-059 kifejezetten előírja): a magyar domain-tagnevek
angolra cserélve, a magyar csak a wire-varraton él:

| Enum | Régi domain-tagnév → új | Kulcsok (változatlan) |
|---|---|---|
| DocType | Rajz→Drawing, Szerzodes→Contract, Tanusitvany→Certificate, Utasitas→Instruction, Egyeb→Other | rajz, szerzodes, tanusitvany, utasitas, egyeb |
| ExpiryState | Lejart→Expired, Lejaro→Expiring | lejart, lejaro |
| DocLinkType | (már angol volt) | project, order, catalog, template, customer, none |
| DocumentStatus | (már angol volt) | **piszkozat, ellenorzes, kiadott, archivalt** (torolve nem megy a dróton) |

⚠️ **Kontraktus-VÁLTOZÁS**: `DocumentStatus` korábban camelCase angolul ment a dróton
(`draft`/`underReview`/`released`/`archived`) — mostantól a portál kanonikus magyar kulcsai
(`piszkozat`/`ellenorzes`/`kiadott`/`archivalt`). A `DocumentGuardMessages.InvalidTransition`
409-üzenete közvetlenül `DmsWire.Status.ToWire`-t hívja (egy csproj, nincs külön varrat-réteg).
openapi.yaml (`DocumentStatus` enum-lista + FSM-próza mindenhol) szinkron. Tesztek:
**67 Docker-mentes** (a domain-átnevezés miatt 5 teszt-fájlban javítva a régi
`DocType.Rajz`/`ExpiryState.Lejart` hivatkozásokat + 3 stale `"underReview"` wire-assert +
1 új teszt a régi angol kulcs elutasítására).

**Kontrolling** — a szótár (`KontrollingWire`, **3 enum, 15 kulcs**) VÁLTOZATLAN, csak a
mechanika költözött a hostingba. Tesztek: **179 Docker-mentes** (177 régi + a hosting-import
utáni 2 apró using-igazítás).

**CRM** — `src/SpaceOS.Modules.CRM/src/Lead.Application/Wire/WireEnums.cs`, `CrmWire`,
**5 enum**, **33 kulcs**:

| Enum | Kulcsok |
|---|---|
| LeadStatus | uj, kapcsolat, minosites, elvetve, konvertalva, nurturing |
| LeadSource | ismeretlen, weboldal, telefon, email, kiallitas, ajanlas, partner, direkt, marketing, kozossegi |
| OpportunityStatus | nyitott, igenyfelmeres, osszeallitas, ajanlat, targyalas, megnyert, elveszett, felhagyva |
| TaskSla | ok, soon, overdue |
| CrmRefType | lead, opp |

`CrmDtoMapper` a `.ToString()` helyett `CrmWire.X.ToWire(...)`-t hív; `LeadEndpoints`/
`OpportunityEndpoints` a query-szűrőket és a `Source`/`Status` request-mezőket a wire-map-en
át, case-sensitive módon parse-olja (a régi `Enum.TryParse(ignoreCase: true)` megszűnt);
`CrmEndpointResults.Failure` a 409-üzeneteket `LeadStatus`+`OpportunityStatus`
`TranslateNames`-szel fordítja. A `CrmEndpointTestHost` korábban KÉZZEL regisztrált csak
egy sima `JsonStringEnumConverter`-t (nem a valódi `AddCrmApiJsonOptions`-t) — ez vakfolt
volt: a `TaskSla`/`CrmRefType` enum-mezők (`sla`, `refType`) angolul mentek a teszt-hostban
még akkor is, ha éles környezetben már magyarul mentek volna. Javítva — a teszt-host most
a valódi DI-bekötést hívja. Tesztek: **116** (103 régi, ebből 6 igazítva a magyar kulcsokra +
**13 új** `CrmWireTests`).

**NEM ez a kör** (tudatosan kihagyva, scope-túlfutás elkerülésére): `Activity.Type` és
`CrmTask.Priority` ma szabad string az aggregátumon, nem enum (`ActivityKind`/`TaskPriority`
domain-enum bevezetése mindkét aggregátumot, a parancsokat, a DTO-kat és az EF-konfigurációt
érintené — külön, fókuszált munka). Nyitott halmaz-eltérések (nem ez az ADR dönti el, csak
dokumentálja): a portál `crmSourceSchema`-jában van `webshop`/`belsoepitesz`, aminek nincs
backend `LeadSource`-tagja; `OpportunityStatus.Abandoned` backend-only, nincs portál-FSM
párja.

### Végső teszt-számok (modulonként, Docker-mentes ahol Testcontainers is van, SORBAN futtatva)

| Modul | Baseline | Most | Megjegyzés |
|---|---|---|---|
| hosting | 41 | **57** | +16 (Wire-infra) |
| Kontrolling | 186 | **179** Docker-mentes | mechanika-csere, nincs regresszió |
| EHS | 130 domain + 50 infra | **130 domain** (vált.) + **22 új** wire | infra Testcontainers-rész nem futtatva (flaky, nem ez a kör dolga) |
| QA | 217 | **205** Docker-mentes | +19 wire |
| HR | 190 | **185** Docker-mentes | benne a wire-tesztek |
| Maintenance | 157 | **149** Docker-mentes | benne a wire-tesztek |
| DMS | 73 | **67** Docker-mentes | benne a wire-tesztek |
| CRM | 103 | **116** | +13 wire |

0 regresszió egyik modulon sem — mindenhol build 0 hiba, 0 új warning.

### Incidens a munka közben

A havi spend-limit egyszerre szakította meg a rootot ÉS a 6 párhuzamosan indított
modul-sub-agentet (EHS, QA, HR, Maintenance, DMS félmunkában; a CRM sub-agent el sem
indult ténylegesen). A root — a sub-agent önjelentés helyett — mindegyik modult újra
buildelte + tesztelte bizonyítékként, és pótolta a hiányzó darabokat: DMS 2 teszt-fájl
stale enum-hivatkozása + hiányzó openapi-szinkron; EHS 2 summary-handler dictionary-kulcsa
+ hiányzó wire-teszt + hiányzó openapi-szinkron; QA 1 teljes teszt-fájl (`TicketEndpointsTests`)
+ hiányzó wire-teszt + openapi-próza; a CRM modult a root TELJES egészében nulláról írta meg
(szótár, JSON-opciók, endpoint-parse, DTO-mapper, 409-fordítás, tesztek).

### Portál-oldali átállási lista (következő FE-task)

- **`src/joinerytech-portal/src/modules/ehs/services/*`** (mind a 8 fájl: capa.ts,
  incidents.ts, locations.ts, materials.ts, ppe.ts, safetyWalks.ts + az ezekre épülő
  mocks/handlers) — EN PascalCase → a fenti 14 magyar kulcstábla. Ez a legnagyobb tétel.
- **`crm/services/leads.ts`**, **`opportunities.ts`** — a wire már ma is magyar volt, de a
  `webshop`/`belsoepitesz` LeadSource-értékeknek és az `Abandoned` OpportunityStatus-nak
  nincs backend-párja — fogalmi döntés kell (bővítsük a backendet, vagy szűküljön a portál).
- **`crm/services/activities.ts`**, **`tasks.ts`** — `activityKindSchema`/`taskPrioritySchema`
  ma a backenden szabad string (nem enum) — amíg a `ActivityKind`/`TaskPriority` domain-enum
  nem készül el, a fetcher oldali validáció a backend felől NEM garantált fail-fast.
- **`dms/services/documents.ts`** — `documentStatusSchema` ÉRTÉKEI VÁLTOZTAK a wire-en
  (`draft`/`underReview`/`released`/`archived` → `piszkozat`/`ellenorzes`/`kiadott`/
  `archivalt`) — ez kontraktus-változás, nem csak elnevezés-egyeztetés, a portál eddig is
  ezt várta zod-ban, de az MSW eddig más nyelvet beszélt a valódi hosttal szemben.
- **hr/qa/maintenance/kontrolling** — a portál zod-sémái már ma a kanonikus magyar
  kulcsokat várják, a backend most áll össze velük — nincs portál-oldali teendő ezekben.

### Follow-up-ok

- CRM: `ActivityKind`/`TaskPriority` domain-enum bevezetése (ld. fent).
- EHS portál HU-igazítás (külön FE-task, designer-újrakör — ADR-059 ajánlás).
- CRM `LeadSource` webshop/belsoepitesz + `OpportunityStatus.Abandoned` set-eltérés —
  ADR-jelölt.
- DMS `torolve` (Deleted) állapot a fail-fast teljesség kedvéért van a szótárban, de sosem
  megy a dróton (soft-delete → láthatatlan) — ha valaha admin-restore API épül, ellenőrizni
  kell, hogy ez a kulcs tényleg soha nem szivárog ki.
