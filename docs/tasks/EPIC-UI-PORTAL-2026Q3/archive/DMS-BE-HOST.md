# DMS-BE-HOST — Futtatható DMS host + Document endpoint-réteg + jóváhagyás-folyam

- **Szerep:** backend · **Státusz:** ✅ done (2026-07-16)
- **Előfeltétel:** F2-DMS-FE (rögzített MSW-kontraktus), QA-BE-ENDPOINTS + MAINT-BE-TRANSITIONS (bevált minták: TestServer-tesztek, transition-handler-base, kernel-út javítás, interceptor-fix)
- **Kontraktus-forrás (CSAK OLVASVA):** `src/joinerytech-portal/src/modules/dms/services/` (fsm.ts, calc.ts, documents.ts zod-sémák) + `mocks/` (handlers.documents.ts, db.ts, seed.ts)

## Feladat

A DMS modul legnagyobb gapjének zárása: a `src/dms` Document-magja domain-modell
+ openapi volt — futtatható host, handler, repository és jóváhagyás-folyam
NÉLKÜL (csak a DocumentCategory/Tag szelet volt handler-kész). A rögzített
kontraktus a portal MSW-előkép; a backend igazodik a portalhoz.

## Kivitelezés

### 1. Domain — jóváhagyás-FSM (portal DOCUMENT_FSM tükör)

- **`DocumentStatus`** újraírva: `Draft / UnderReview / Released / Archived / Deleted`.
  Régi készlet remapje (adatmegőrző szándék): `Active → Released`,
  `Archived → Archived`, `Deleted → Deleted` (admin-szintű soft-delete marad,
  az FSM-en KÍVÜL). Tárolt sor a régi értékekkel sosem létezett (a Document-magnak
  nem volt perzisztencia-rétege), így a remap szemantikai.
- **`Domain/FSM/DocumentStatusTransitions`** — az EGYETLEN átmenet-forrás,
  a portal-tábla 1:1: submit (Draft→UnderReview), approve (UnderReview→Released),
  reject (UnderReview→Draft, KÖTELEZŐ indok), recall (Released→UnderReview),
  archive (Draft|Released→Archived — ellenőrzés ALATT tiltott),
  reopen (Archived→Draft).
- **`Document` aggregátum** kibővítve/újrastrukturálva a portal-kontraktus mezőire
  (Name/Type/LinkType/LinkId/LinkLabel/Owner/Note/ReviewNote/FileLabel/ValidUntil)
  + `DocumentVersionEntry` gyerek-entitás (v/fileLabel/changeNote/**status-pillanatkép**/
  uploadedBy/uploadedAt/blobPath). A review-akciók az AKTUÁLIS verzió
  lánc-bejegyzésének státuszát is frissítik (MSW applyTransition tükör);
  archive/reopen a láncot nem érinti. Minden átmenet írja a ReviewNote-ot
  (null, ha nincs indok — MSW-tükör).
- **Verzió-lánc:** `AddVersion` = verziószám+1, korábbi verziók MEGŐRZÉSE, az új
  verzió Draft munkapéldány, a dokumentum Draft-ra esik vissza; guardok:
  Archived/Deleted → `InvalidStatusTransitionException` (409), hiányzó
  fileLabel/changeNote → `DomainException` (400).
- **Számított vetületek az aggregátumon** (calc.ts tükör — kiszolgáláskor, sosem
  tárolt): `GetReleasedVersion()` (kiadott → aktuális; különben legmagasabb
  kiadott lánc-bejegyzés; null = blocked) és `GetExpiryState(today, warnDays)`
  (múlt → Lejart; ablakon belül → Lejaro; a validUntil napja még érvényes).
- **Guard-üzenetek** (`DocumentGuardMessages`): a portal MSW-guardok szó szerinti
  magyar tükrei (409 érvénytelen átmenet, archivált verzió-feltöltés, kötelező
  reject-indok, kötelező verzió-mezők) — a UI-toast szövege azonos mockon és élesben.
- **`InvalidStatusTransitionException`** (QA-precedens): 409 vs 400 elkülönítés.
- Törölt obszolét elemek: régi `DocumentVersion`/`DocumentVersionId`/`DocumentMetadata`
  VO-k, `IBlobStorageService`/`IDocumentVersioningService`/`IDocumentExpiryService`
  (funkciójuk az aggregátumba/list-query-be került), `MimeTypeCategory`,
  Uploaded/Unarchived/MetadataUpdated eventek → helyettük approval-eventek
  (Created/SubmittedForReview/Approved/Rejected/Recalled/Reopened).
- **Megőrzött Phase-2 mag:** EntityLink/Permission/Tag listák + metódusok + eventek
  az aggregátumon maradtak, EF-ben `Ignore` (perzisztencia follow-up).

### 2. Application — CQRS

- Parancsok friss `DocumentDto`-val (a portal optimista-frissítés kontraktusa):
  `CreateDocumentCommand` (backend-extra — az MSW seedelt, éles rendszernek kell
  belépési pont), 6 átmenet-command, `UploadDocumentVersionCommand`.
- **`DocumentTransitionHandlerBase`** (Maintenance-minta): load →
  domain-akció → mentés → friss DTO; hiányzó dokumentum →
  `KeyNotFoundException` (→404). Minden handler logol (QUALITY 3.).
- **`DocumentDtoMapper`**: a zod `documentSchema` mező-tükre + a számított
  `releasedVersion`/`expiry` kiszolgáláskor (egy igazságforrás: az aggregátum).
- **`DmsExpiryOptions`** — CONFIG-VEZÉRELT (`Dms:Expiry:WarnDays`, fallback 30 =
  portal `EXPIRY_WARN_DAYS`; EHS RiskBandConfiguration-minta). A lejáró-lista
  cutoffját (`today + WarnDays`) a handler számítja, így a repository-szűrő
  SQL-re fordítható.
- Query-k: `ListDocumentsQuery` (status/type/linkType/q/expiring) +
  `GetDocumentQuery` (null → 404).

### 3. Infrastructure

- **`DocumentEntityTypeConfiguration`**: `dms.documents` + owned
  `dms.document_versions` (FK + (document_id, version_number) unique index),
  státusz/lejárat-indexek. `ValueGeneratedNever` a verzió-kulcson (enélkül az
  EF a beállított kulcsú ÚJ lánc-bejegyzést Modified-nak vette → fantom UPDATE
  → DbUpdateConcurrencyException).
- **`DocumentRepository`**: RLS-konvenció (nincs TenantId a szignatúrában),
  soft-deleted sosem látszik, ILike-keresés (name/linkLabel/fileLabel),
  expiring-ablak DB-szinten (validUntil ≤ cutoff, archivált kizárva, legkorábbi
  érvényesség elöl), egyébként updatedAt desc. `UpdateAsync` trackelt entitásnál
  csak SaveChanges (Update() kényszerítése okozta a fantom UPDATE-et).
- **Migráció `20260716100000_DocumentApprovalWorkflow`**: documents +
  document_versions táblák + RLS enable/policy.
- **`IDocumentBlobStore` port + `FileSystemDocumentBlobStore` stub**: layout
  `{root}/{tenant}/{doc}/v{n}_{sanitized}`, root CONFIG-BÓL
  (`Dms:Blob:RootPath`), root-escape guard, idempotens delete. A valódi tároló
  (S3/MinIO/Azure) infra-döntés — follow-up; a jelen API-felület fileLabel-t hord
  (multipart a follow-up bekötési pontja).

### 4. Api + Host

- **`Api/Endpoints/DocumentEndpoints`** (QA/Maintenance minta — endpoint-réteg a
  modul-libraryben): `GET /api/dms/documents` (szűrők), `GET /{id}`, `POST ""`
  (create), `POST /{id}/submit|approve|reject|recall|archive|reopen`,
  `POST /{id}/versions`. Hibakontraktus = MSW `jsonError` tükör
  (`{error, message}`): 404 ismeretlen id · 409 FSM-guard · 400 payload-guard;
  érvénytelen enum-szűrő → 400. Guard-elutasítás Warning-loggal.
- **`AddDmsApiJsonOptions`**: `JsonStringEnumConverter(CamelCase)` — a
  type/linkType/expiry wire-értékek PONTOSAN a portal kanonikus kulcsai
  ("rajz", "project", "lejart"); a státusz angol FSM-név camelCase-ben
  ("draft"/"underReview"/"released"/"archived").
- **`HttpTenantContext`**: X-Tenant-Id fejléc; kérésen kívül (startup-migráció)
  Guid.Empty → az interceptor kihagyja a set_configot; create fejléc nélkül → 400.
- **Futtatható host: `src/dms/host/SpaceOS.Modules.DMS.Api.csproj`**
  (EHS Program-minta: Swagger, enum-string JSON, AddDmsModule, endpoint-mapping,
  `/health`). A host a `src/` MELLETT él, mert a modul egyetlen csproj
  (QA/Maintenance-layout) és a default compile-glob elnyelné a Program.cs-t.
  Opcionális startup-migráció configból (`Dms:Database:MigrateOnStartup`,
  default false; Development-ben true).

### 5. Örökölt hibák javítva (a modul EDDIG SEM működött volna)

1. **csproj kernel-út**: `backend/spaceos-kernel` → `spaceos-kernel`
   (ehs/qa-minta) + a stale `Microsoft.AspNetCore.Http.Abstractions 2.2.0`
   helyett FrameworkReference.
2. **Migrációk láthatatlanok voltak**: a kézi migrációkról hiányzott a
   `[DbContext]`/`[Migration]` attribútum → a `Database.Migrate()` SEMMIT nem
   alkalmazott (Maintenance-precedens szerint pótolva).
3. **EnableRLS sosem futhatott le**: a `dms.documents` táblára hivatkozott, amit
   az InitialCreate nem hozott létre → a documents-RLS az új migrációba került.
4. **EF-modell validálhatatlan volt**: a kernel `TenantId` strong idnek nem volt
   konvertere a Category/Tag configban + a configok nem adtak snake_case
   oszlopnevet (a kézi migráció viszont snake_case-t írt) → konverter +
   `HasColumnName` pótolva.
5. **`TenantDbConnectionInterceptor`**: ConnectionOpening-ben futott (a kapcsolat
   még nincs nyitva → dobott) és a `dms.set_tenant_context` függvényt hívta
   (ami friss DB-n még nem létezik) → Maintenance-minta: `ConnectionOpened` +
   paraméteres `set_config` (SQL-injection-mentes is).
6. **Integrációs fixture**: sima `HttpClient` mutatott a http://localhostra
   (semmi sem figyelt ott) JWT-vel — sosem zöldülhetett; átírva scope-olt
   DI-fixture-ré, a nem létező category/tag endpointokat célzó HTTP-tesztek
   repository-szintre igazítva.

## Döntési pontok (ADR-jegyzetek)

1. **archive/reopen ↔ backend megfeleltetés (ADR-jelölt volt):** a
   portal-konform irány implementálva — a régi `Archive/Unarchive/Restore`
   hármas helyett a portal-tábla: `archive` Draft|Released→Archived,
   `reopen` Archived→**Draft** (munkapéldány, újra jóváhagyandó). A kiírás
   szövege recall-t Released→Draft-nak, reopent Archived→Released-nek
   parafrazálta — a RÖGZÍTETT kontraktus (portal fsm.ts) szerint recall →
   UnderReview, reopen → Draft; ez került a backendbe.
2. **Wire-nyelv (közös ADR-jelölt a QA/Maintenance-szel):** a státusz angol
   FSM-név camelCase-ben; a type/linkType/expiry viszont a portal kanonikus
   (magyar) kulcsaival 1:1 azonos, mert az enum-tagnevek maguk a kanonikus
   kulcsok. Portal-integrációkor csak a státusz-készlethez kell térkép
   (draft=piszkozat, underReview=ellenorzes, kiadott=released, archivalt=archived).
3. **Identitás-gap:** owner/uploadedBy display-név stringként (portal-kontraktus);
   auth-bekötéskor cserélendő UserId-forrásra. `uploadVersion.uploadedBy`
   opcionális payload-mező, fallback a tulajdonos.
4. **Deleted/Restore:** a Deleted az FSM-en kívüli admin-állapot, minden
   olvasási útvonalon láthatatlan; `Restore` → Draft (újra jóváhagyandó).
   Endpoint nincs hozzá (admin-felület follow-up).
5. **Kereső id-tengelye:** a portal `q` az id-re is szűr (mock-id 'DOC-401'
   ember-olvasható); a backend Guid-id ILike-olása értelmetlen → kihagyva.
6. **„Ma" forrása:** a lejárat-számítás UTC-napot használ (szerver-konzisztencia);
   a portal helyi nappal renderel — az eltérés legfeljebb az UTC-offset napja.

## Eredmény / bizonyíték

- **Build:** modul + host + tesztek `dotnet build` **0 warning, 0 error**.
- **Tesztek: 70/70 zöld** (a kiinduló állapot 5/5 FAIL volt):
  - Domain (`DocumentApprovalFsmTests`, 26): portal-tükör átmenet-tábla
    (engedett Theory + tiltott teljes-söprés a guard-üzenettel), jóváhagyás-kapu,
    reject-indok 400-vs-409 elkülönítés, verzió-lánc (léptetés+megőrzés+
    munkapéldány), recall-visszaesés a korábbi kiadottra, blocked-ág,
    lejárat-Theory (határnapok + paraméterezhető küszöb), soft-delete.
  - Endpoint (`DocumentEndpointsTests`, 15, TestServer + mock IMediator,
    QA-minta): route-készlet, szűrő-parszolás, camelCase wire-formátum
    ("rajz"/"underReview"/"lejaro"), 201+Location, {error,message} törzsek
    (400/404/409), guard-üzenet szó szerinti egyezés.
  - Application (7, Moq repo): transition-base (load→apply→persist→friss DTO),
    404-kontraktus, config-vezérelt expiring-cutoff, számított mezők mappelése.
  - Blob-store (5): round-trip, sanitizálás, idempotens delete, root-escape guard.
  - Integráció (Testcontainers PostgreSQL, 7): migrációk + Document round-trip
    friss contexteken át (lánc-megőrzés, released-fallback), lista-szűrők
    (ILike case-insensitive), expiring-ablak (archivált kizárva, rendezés),
    soft-delete láthatatlanság, category/tag repository.
- **Élő smoke** (Postgres konténer + futó host): `/health` OK; create → 201 a
  portal-konform JSON-nal; submit→approve→(approve újra: **409** MSW-üzenettel)
  → v2 feltöltés (releasedVersion **visszaesik 1-re**, lánc ['released','draft'])
  → hiányzó jegyzet **400** MSW-üzenettel → expiring-lista → ismeretlen id **404**.
- **openapi.yaml** teljesen újraírva a tényleges kontraktusra (10 path, 8 séma,
  YAML-validált); a Phase-2 felület „Planned"-ként dokumentálva.

## Follow-upok

1. **Valódi blob-tároló** (infra-döntés: S3/MinIO/Azure) + multipart feltöltés /
   letöltés / presigned URL — az `IDocumentBlobStore` port + filesystem-stub kész.
2. **DocumentCategory/Tag endpoint-réteg** (handler kész, route nincs) — a
   törzsadat-képernyő taskkal együtt.
3. **Auth-bekötés**: X-Tenant-Id → JWT claim; owner/uploadedBy → UserId.
4. **Admin soft-delete/restore endpointok** (domain-metódusok készen).
5. **EntityLink/Permission perzisztencia + endpointok** (Phase 2 — az aggregátum
   viselkedése megvan, EF Ignore).
6. **Portal státusz-térkép**: MSW → éles API átálláskor a magyar↔angol
   státusz-kulcsok mappelése (2. ADR-jegyzet).
7. **RLS-izolációs próba** nem-owner DB-szerepkörrel (a tesztek postgres
   ownerrel futnak, ahol az RLS bypassolt).

## Fájlok

**ÚJ — Domain:** `Enums/{DocType,DocLinkType,ExpiryState}.cs`,
`FSM/{DocumentAction,DocumentStatusTransitions}.cs`,
`Exceptions/InvalidStatusTransitionException.cs`,
`Aggregates/Document/{DocumentVersionEntry,DocumentGuardMessages}.cs`,
`Events/DocumentApprovalEvents.cs`, `Services/IDocumentBlobStore.cs`
**ÚJRAÍRVA — Domain:** `Aggregates/Document/Document.cs`, `Enums/DocumentStatus.cs`,
`Repositories/IDocumentRepository.cs`
**ÚJ — Application:** `Configuration/DmsExpiryOptions.cs`, `DTOs/DocumentDto.cs`,
`Mapping/{DocumentDtoMapper,ServeDay}.cs`, `Commands/DocumentCommands.cs`,
`Queries/DocumentQueries.cs`, `Handlers/Commands/{DocumentTransitionHandlers,
CreateDocumentHandler,UploadDocumentVersionHandler}.cs`,
`Handlers/Queries/DocumentQueryHandlers.cs`
**ÚJ — Infrastructure:** `Persistence/Configurations/DocumentEntityTypeConfiguration.cs`,
`Persistence/Repositories/DocumentRepository.cs`,
`Persistence/Migrations/20260716100000_DocumentApprovalWorkflow.cs`,
`Blob/FileSystemDocumentBlobStore.cs`
**ÚJ — Api + Host:** `Api/{HttpTenantContext,DmsServiceCollectionExtensions}.cs`,
`Api/Endpoints/DocumentEndpoints.cs`, `host/{SpaceOS.Modules.DMS.Api.csproj,
Program.cs,appsettings.json,appsettings.Development.json}`
**JAVÍTVA:** `SpaceOS.Modules.DMS.csproj` (kernel-út + FrameworkReference),
`DMSDbContext.cs`, `DependencyInjection.cs`, `TenantDbConnectionInterceptor.cs`,
`Configurations/{DocumentCategory,Tag}EntityTypeConfiguration.cs`,
`Migrations/20260707080000_InitialCreate.cs` + `20260707080001_EnableRLS.cs`
(attribútumok + documents-RLS áthelyezés)
**TÖRÖLVE:** `ValueObjects/{DocumentVersion,DocumentVersionId,DocumentMetadata}.cs`,
`Services/{IBlobStorageService,IDocumentVersioningService,IDocumentExpiryService}.cs`,
`Enums/MimeTypeCategory.cs`, `Events/{DocumentUploaded,DocumentUnarchived,
DocumentMetadataUpdated}Event.cs`
**TESZT:** ÚJ `tests/Domain/DocumentApprovalFsmTests.cs`,
`tests/Api/{DmsEndpointTestHost,DocumentEndpointsTests}.cs`,
`tests/Application/DocumentHandlerTests.cs`,
`tests/Infrastructure/FileSystemDocumentBlobStoreTests.cs`,
`tests/Integration/Persistence/DocumentPersistenceTests.cs`;
ÚJRAÍRVA `tests/Integration/Api/{ApiTestFixture,DocumentCategoryApiTests}.cs`
**DOKS:** `src/dms/docs/openapi.yaml` (teljes újraírás)
