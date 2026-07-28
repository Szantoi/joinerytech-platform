# ADR-069: Planning — ütemezés-domain, termékcsomag és API-kontraktus

- **Státusz:** **ELFOGADVA (Accepted) — 2026-07-28 (Gábor).** Mind a 7 döntési
  pont (G1-G7, 12. fejezet) az ajánlás szerint elfogadva, PLUSZ névdöntés
  (G8): a mag ModuleId-ja **`spaceos.scheduling`** — a „planning" túl általános;
  a scheduling pontosan fedi a véges kapacitású műveletütemezést, amire a
  Doorstarnak szüksége van (rétegnevek követik: `joinerytech.scheduling-
  standards`, `doorstar.scheduling-import`; repo: `src/spaceos-modules-
  scheduling`; séma: `scheduling`; API: `/api/scheduling/v1`). A portál-VILÁG
  neve ettől függetlenül maradhat „Tervezés/Planning" (world ≠ module). Az
  epic (EPIC-PRODUCTION-PLANNING-2026Q3) és a PLAN-* task-ID-k nem változnak.
- **Dátum:** 2026-07-28
- **Szerep:** architect (root) · **Epic:** EPIC-PRODUCTION-PLANNING-2026Q3 · **Task:** PLAN-02
- **Függőség:** `PLAN-01 = done` — minden képesség-állítás forrása a
  [`PLANNING_CAPABILITY_AUDIT_2026-07-27.md`](../architecture/PLANNING_CAPABILITY_AUDIT_2026-07-27.md)
  (fájl:sor bizonyítékokkal; itt nem duplikáljuk, csak hivatkozzuk: „audit §N").
- **Normatív bemenet:** a Doorstar API-igény (2026-07-28, Gábor közvetítette) —
  rögzítve: `docs/tasks/EPIC-PRODUCTION-PLANNING-2026Q3/PLAN-02-SCHEDULING-ADR.md`;
  plusz a Doorstar input-pack v1 (13 vektor + calendarDraft + 3 standard-minta).
- **Kapcsolódó ADR-ek:** ADR-065 (Kernel domain-mentesség), ADR-066 (tipizált
  referenciák, `ProjectRef`/`OrderRef`), ADR-067 (ModuleId-namespace, katalógus,
  entitled a Kernel Tenant-mezőben, GitHub Packages), ADR-068 (O3 önálló-modul
  precedens, terms-revision + hash minta).
- **Felelősségi határ (2026-07-28-án mindkét fél által megerősítve):**
  platform/O-A viszi a C# termékmagot + OpenAPI-t + tenant/RLS/entitlement +
  foglalás/jóváhagyási policyt; a Doorstar a generált TS-klienst, saját UI-t,
  instance-adaptert, import-előkészítést, fixture-öket és kontraktus-review-t.
  A Doorstar Planning UI a publikált kontraktusig szerződésváró, mock ütemezés
  nélkül.
- **Mutációs határ a PLAN-02-ben:** ez az ADR + a task-fájl + EPICS-státusz.
  Alkalmazáskód, migráció, endpoint nem módosul.

---

## 1. Kontextus (röviden)

A Doorstar read-only Planning nézethez kér publikált, verziózott OpenAPI 3.1-et,
stabil sandbox URL-t és egy „tervezési javaslat" végpontot; második fázisban
import- és foglalás/jóváhagyás-irányt. Az audit verdiktje: **nincs Kernel-STOP**
(audit §0), a számítási/naptár/függőség-mag **zöldmezős** (a 13 vektorból ma 0
számolható — audit §3.2), a platform hozadéka a kész hosting/RLS/proof/
kontraktus-rezsim és a bevált FSM/snapshot/idempotencia-minták.

## 2. D1 — Ownership és fizikai hely: **O-A, új önálló modul** (ajánlott)

Új `src/spaceos-modules-scheduling` repo/modul, saját host, saját `scheduling`
Postgres-séma, saját OpenAPI — az ADR-068 O3 (Collaboration) precedens
megismétlése. Az O-B (cutting-általánosítás) és O-C (production-bővítés)
elvetésének indokai: audit §2.2 (a cutting élő, hardening alatt álló,
egy-erőforrású és iparági namespace-ű; a production tenant-vak, nem hostolt,
fogyasztó nélküli csontváz).

- Kernel-kapcsolat KIZÁRÓLAG: `ProjectRef(FlowEpic.Id)` opak referencia +
  opcionális egyirányú StageChain-projekció (audit §4.2). Kernel-kód nem módosul.
- A `Tenant.EntitledModules` Kernel-mező ERPSEP-05/06 munka marad — a Planning
  nem várja be (ld. D6 köztes gate).

## 3. D2 — Namespace-rétegvágás (ajánlott, audit §2.1 szerint)

| Réteg | ModuleId | Tartalom |
|---|---|---|
| Mag | `spaceos.scheduling` | naptárak (műszak/szünet/kivétel), finite-capacity scheduler, FS/SS/FF/SF+lag+partial release+fix-override, elapsed↔labour szétválasztás, plan-revíziók + proposal/shadow/publish, erőforrás-idő foglalás, standard-import MECHANIZMUS (nyílt qualifier-kulcsok), audit-események |
| Iparági | `joinerytech.scheduling-standards` | faipari művelet-taxonómia és standard-TARTALOM (a production 6-lépéses taxonómiája ide menekítve), cutting/joinery-integrációs adapterek |
| Instance | `doorstar.scheduling-import` (reserved) | Excel-import adapter (`GyV-*` kulcsok, sourceLookup-qualifierek, sha256-provenance), naptár-jóváhagyás Doorstar-oldala, legacy-vektor karbantartás |

Szigorú szabály: a magban egyetlen faipari szó sem lehet (ADR-067 regex-őr).
A domain-szintű product/component/finish minősítő-KULCSOK a `joinerytech.*`
rétegben normalizálódnak; a mag csak a kulcs-érték mechanizmust adja.

## 4. D3 — Domain-modell: aggregátumok és életciklus

**Aggregátumok** (a `scheduling` sémában, mind tenant-scoped + FORCE RLS):

- `ScheduleRun` + `ScheduleRevision` — egy futtatás és annak immutábilis
  revízió-lánca (revision-hash az ADR-068 §8 terms-revision mintájára).
- `OperationPlan` — ütemezett művelet: művelet-azonosító, név, állomás/erőforrás,
  tervezett kezdés/befejezés, státusz, figyelmeztetések, kapacitás-ütközések.
  **Horgonyzás (Gábor-döntés, 2026-07-28): kétszintű — projekt → epicek →
  műveletek.** A `ProjectRef` mellett minden művelet KÖTELEZŐ opak `EpicRef`-et
  hordoz (a modul csak az azonosítót rögzíti; a Kernel `FlowEpicScope`-ját nem
  olvassa — ADR-065); az `EpicRef` a revision-hash része (ugyanaz az időpont
  más epic alatt más terv). Az epic szerinti lekérdezés az M3 read-only nézet
  elsődleges olvasási mintája.
- `DependencyEdge` — előd/utód + típus (FS/SS/FF/SF) + lag (perc) + partial
  release küszöb + fix-dátum override forrás-attribúcióval.
- `Resource` + `ResourceCalendar` + `CalendarException` — heti műszak-minta +
  szünetek + zárás/karbantartás/túlóra-kivételek; **naptár-revízióval**
  (a válaszban a használt naptár-revízió visszaadandó — Doorstar-mező).
- `CapacityReservation` — erőforrás-IDŐ foglalás (a név szándékosan NEM
  „Reservation": az Inventory anyag-foglalásától kontraktus-szinten is
  elválasztva — audit §4.4). Állapotgép + TTL az Inventory-minta szerint.
- `OperationStandard` + `StandardRevision` — verziózott normaidő-standard
  (unitSeconds/unitMinutes + workforce + dep-default + qualifier-készlet),
  import-karantén állapotokkal (a Doorstar preflight 9+11 karantén-oka
  mint referencia-szemantika).
- Append-only `SchedulingAuditLog` + transactional outbox.

**Terv-életciklus FSM:** `Proposal → Shadow → Published → Superseded`
(+ `Discarded`). A shadow-számítás az aktív publikált tervet nem érinti;
publikáció explicit, revision-hash-sel; diff read-model a shadow↔published
összehasonlításra. (Minta: CuttingPlan FSM + snapshot — audit §1.3, R4.)

**Számítási szemantika (a Doorstar-baseline normatív):** elapsed = volume ×
unitMinutes; labour = elapsed × workforce; days = ceil(elapsed /
workingMinutesPerDay) + extraDays; hiányos standard → 0 + `eligibleFor
AutomaticPlanning:false` + `missingFields` (fail-safe, nem elutasítás).
Függőség-precedencia: fixed override > partial release > FS/SS (start-ág);
fixed finish > FF/SF (finish-ág) — forrás-attribúcióval (`startSource`).
A 13 input-pack vektor **hash-pinnelt C# kompatibilitási CI-kapu** lesz (R6, S).

## 5. D4 — Idő és naptár-policy

- Tárolás UTC-ben; minden naptár tenant-szintű IANA timezone-nal
  (`Europe/Budapest` default a Doorstar-tenantnál); DST-átmenetnél a műszak
  lokál-időben értelmezett, a konverzió a mag felelőssége (a Doorstar-referencia
  ezt explicit a C# oldalra hárítja — audit §6 jegyzet ii).
- Kapacitás-policy naptáranként: integer vagy tört (a calendarDraft
  `capacityPolicy` alakja); overload = igény > elérhető kapacitás egy
  slot-ablakban, a read-modelben számszerűsítve.
- Naptár-módosítás jóváhagyás-köteles (draft → approved revízió) — a 2. fázis
  jóváhagyási workflow-jának előkészítése, de már az MVP-sémában revízióval.

## 6. D5 — API-kontraktus (OpenAPI 3.1) — erőforrás-vázlat

Bázis: `/api/scheduling/v1`. Read-only 1. fázis:

| Endpoint | Tartalom |
|---|---|
| `GET /runs` · `GET /runs/{runId}` | planning run ID, állapot (FSM), létrehozás/publikálás metaadat, plan-revision hash |
| `GET /runs/{runId}/proposal` | **a Doorstar fő végpontja**: műveletek (ID, név, állomás/erőforrás, tervezett kezdés/befejezés, státusz, figyelmeztetések, kapacitás-ütközések) + függőségek (előd/utód ID, FS/SS/FF/SF, lag, partial release küszöb, forrás-attribúció) + a használt naptár- és erőforrásprofil-revízió |
| `GET /resources` · `GET /resources/{id}/calendar` | erőforrások + naptár-revíziók, slot-nézet |
| `GET /resources/{id}/overload` | overload-ablakok (R5) |
| `GET /standards` · `GET /standards/{id}/revisions` | verziózott standardok (read) |

2. fázis (irány, nem MVP): `POST /standards/import` (idempotency-key kötelező),
`POST /calendars/{id}/revisions` + `POST .../approve`, `POST /reservations`,
`POST /runs/{runId}/publish` külső jóváhagyással. Minden írás idempotens
(Idempotency-Key header + kulcstábla), a jóváhagyások FSM-esek.

**Kontraktus-rezsim:** semver + OpenAPI-fájl hash a manifestben
(spaceos-module-v1.schema.json, `id: spaceos.scheduling`), GitHub Packages
publikáció (ADR-067). **Generált-kliens kapu:** a CI a spec-ből TS-klienst
generál (openapi-typescript/orval), a generálás hibája = spec-hiba, build-bukás;
breaking change csak major verzióval. Hibaformátum: RFC 9457 ProblemDetails
(a hosting-minta 401/403-a már ez), minden válaszban `correlationId`
(W3C traceparent-ből származtatva), audit-eseményben ugyanaz az ID.

## 7. D6 — Biztonsági szerződés

1. **Hosting-minta kötelező** (audit §5.1): `AddSpaceOsModuleAuth` +
   `AddSpaceOsModuleTenancy` + GUC-interceptor + `RlsMigrationSql` FORCE RLS +
   EF query filter; `ModuleDescriptor.moduleId = spaceos.scheduling`.
- 2. **Entitled/enabled gate, fail-closed, KÉT lépcsőben:** (a) MOST: a Planning
   endpoint-filterként a JWT `enabled_modules` claimet ellenőrzi a saját
   ModuleId-jára — hiányzó/üres claim → 403; ehhez a hosting `TenantClaimEntry`
   bővítése kell (a claim ma eldobódik + snake_case parse-bug — audit §5.3;
   **ERPSEP-05/06 sávval közös munka, a Planning az első fogyasztó**);
   (b) KÉSŐBB: Kernel `Tenant.EntitledModules` + Instance Context API mint
   hitelesített forrás (stale-claim threat ellen).
3. **RLS-proof gate-artefakt:** `RlsFixtures`/`NonSuperuserRlsFixture` +
   QA-minta teszt-osztály a `scheduling` séma MINDEN tábláján (4 fact: role,
   FORCE RLS, A/B/üres-GUC izoláció, gyerek-tábla EXISTS) — a publikációs
   csomag része a manifest+OpenAPI+hash mellett.
4. **Worker-szabály:** minden Planning-háttérjob (shadow-számítás,
   slot-regeneráció) NOBYPASSRLS; bizonyítottan keresztbérlős részművelet csak
   szűk SECURITY DEFINER függvényben (STAB-RLS-WORKER-BYPASS döntött minta).

## 8. D7 — A `spaceos-modules-production` sorsa: **P-A, retire + taxonómia-mentés** (ajánlott)

A modul nem fordul, tenant-vak, fogyasztója nincs (audit §1.2) — formális
retire; a 6-lépéses `WorkflowStepName` taxonómia a `joinerytech.scheduling-
standards` rétegbe menekül. A gyártás-KÖVETÉS (checklist/fotó-proof) igénye
külön termék-kérdés — ha később kell, az ADR-066 2. típusú `WorkItemRef`-fel
épül újra (P-B tartalék), és a lépés-TÉNY időbélyegeket a Planning variancia-
számítása külön tényként olvassa. A `joinerytech.production` ModuleId ezzel
**retire** (a katalógusból kivezetve).

## 9. D8 — Cutting-viszony: **C-B most, C-A célkép** (ajánlott)

Rövid táv: párhuzamos futás, a Planning nem nyúl a cutting élő service-éhez.
Hosszú táv: a cutting a mag naptár/slot-képességének FOGYASZTÓJA lesz adapteren
át; a nesting (geometria) a cuttingban marad. Tilos a cutting general-purpose
tervezővé hizlalása.

## 10. D9 — Sandbox-környezet (javaslat)

- Cél: **stabil URL** a Doorstar TS-kliens fejlesztéséhez. Javaslat:
  `https://scheduling-sandbox.joinerytech.hu` (VPS, külön systemd-service,
  `scheduling_sandbox` DB), seedelt demo-tenanttal és a 13 vektor fixture-ével.
- Auth: a meglévő Keycloak realm külön sandbox-klienssel; **előfeltétel a
  STAB-KEYCLOAK-POSTGRES-MIGRATION** (a H2-s éles Keycloak sandbox-terhelést
  se kapjon) és a STAB-TENANT-ONBOARDING-RUNBOOK scriptje (a sandbox-tenant
  provisionálásához — már fut a backend terminálnál).
- A sandbox a publikált spec-verziót szolgálja ki; spec-verzió a válasz-headerben.

## 11. Ütemezés-vázlat (PLAN-03 fázisai — a backend terminál sávja)

1. **M1 — kalkulációs mag + kompatibilitási kapu (S):** elapsed/labour/days +
   függőség-bound feloldás; a 13 vektor C# CI-kapu zölden.
2. **M2 — domain + perzisztencia + RLS-proof (M):** aggregátumok, migrációk,
   proof-suite, hosting-host.
3. **M3 — read-only OpenAPI + generált-kliens kapu (M):** D5 read-endpointok,
   spec-publikáció sandbox-on → **itt nyílik a Doorstar-fogyasztás**.
4. **M4 — naptár-tudatos scheduler + overload (L):** finite-capacity, slot-
   generálás, shadow/diff.
5. **M5 — 2. fázis írási irány (L):** import + jóváhagyás + foglalás.

## 12. Döntési pontok Gábornak

| # | Kérdés | Ajánlás |
|---|---|---|
| G1 | Ownership: O-A új modul / O-B cutting / O-C production | **O-A** |
| G2 | Namespace-hármas a 3. fejezet szerint | **igen** |
| G3 | Production-modul: P-A retire+mentés / P-B execution-tracker újraépítés | **P-A** (P-B külön termék-döntésként later) |
| G4 | `CapacityReservation` név + Inventory-allowlist bővítés ha anyagfoglalás kell | **igen** |
| G5 | Sandbox: scheduling-sandbox.joinerytech.hu a 10. fejezet előfeltételeivel | **igen** |
| G6 | Timezone-policy (UTC tárolás + tenant-IANA naptár) | **igen** |
| G7 | A PLAN-03 M1-M5 fázisolás a backend terminálnak | **igen** |

Elfogadás után: PLAN-03 kiírható (M1-M2 azonnal indul), a Doorstar felé a
visszajelzés-lista megy (reviewer-nominálás, verzióváltás-példa, overload-példa,
naptár-jóváhagyás — audit §6).

---

## Végrehajtási napló

- 2026-07-28, root: ADR-tervezet megírva a PLAN-01 audit + a Doorstar-igény +
  a megerősített felelősségi határ alapján. Státusz: Proposed, Gábor döntésére vár.
