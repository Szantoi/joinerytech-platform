# ADR-068: Projekt-orchestration és B2B kézfogás — ownership, két életciklus és MVP-határ

- **Státusz:** PROPOSED — döntésre vár (Gábor). Nem önelfogadva: 8 pont üzleti/jogi/
  ütemezési döntést igényel, ami nem architektúra-kérdés (lásd 15. fejezet). Minden
  architektúra-jellegű döntési pont (a task 11 kötelező pontja) meg van hozva ebben
  a dokumentumban, evidence-alapú.
- **Dátum:** 2026-07-21
- **Szerep:** architect · **Epic:** EPIC-PROJECT-CORE-2026Q3 · **Task:** PROJECT-CORE-ADR
- **Függőség:** `PROJECT-BOUNDARY-AUDIT = done` (bemenet, idézve, nem duplikálva)
- **Kapcsolódó, már elfogadott/javasolt ADR-ek:**
  ADR-065 (Kernel domain-mentesség elve — ez az ADR ennek a legszigorúbb
  alkalmazása eddig, mert a B2B-kézfogás pontosan az a terület, ahol a Kernelbe
  már kétszer is beszivárgott iparági szókincs, lásd 2.4–2.5);
  ADR-066 (`ProjectRef` tulajdonosa ELDÖNTVE: Kernel `FlowEpic` — ez az ADR erre
  épít, nem mondja újra és nem vonja vissza, lásd 4. fejezet);
  ADR-067 (ModuleId-namespace-konvenció — a `spaceos.*`/`joinerytech.*` elhatárolást
  ez az ADR átveszi az új Collaboration-modulra, lásd 5. fejezet).
- **Kötelező célforrás:**
  [`SPACEOS_B2B_HANDSHAKE_ARCHITECTURE_2026-07-21.md`](../architecture/SPACEOS_B2B_HANDSHAKE_ARCHITECTURE_2026-07-21.md)
  — ezt az ADR-t a task kifejezetten erre a dokumentumra építve kéri; a dokumentum
  modelljét ez az ADR nagyrészt elfogadja, de kritikusan felülvizsgálva, két ponton
  pontosítva (5.3, 8. fejezet), és minden ponton a tényleges elfogadó döntést itt
  mondjuk ki, nem ott.
- **Mutációs határ ebben a taskban:** ez az ADR + `B2B-01-DOMAIN-CONTRACT.md` és
  `B2B-06-MODULE-ADAPTERS.md` célzott pontosítása (lásd 14. fejezet) + a saját
  task-fájl (`PROJECT-CORE-ADR.md`) végrehajtási naplója. **Alkalmazáskód,
  migráció, endpoint és `EPICS.yaml` nem módosult.**

---

## 1. Cél és bizonyíték-alap

A cél: eldönteni, hogyan áll össze a JoineryTech Projects élmény a Kernel
FlowManagement/FlowEpic/StageChain képességeiből, és hol él a B2B kézfogás mint
iparágsemleges platformképesség — a task saját 11 kötelező döntési pontja szerint.

Ez az ADR **nem ismétli meg** a `PROJECT_CORE_BOUNDARY_AUDIT_2026-07-18.md` teljes
tartalmát — azt bemenetként idézi. Ehelyett:

1. **Megerősítette forrásból** az audit legkritikusabb állításait (2. fejezet),
2. **talált három, az auditban és a célarchitektúra-dokumentumban nem
   dokumentált, döntést befolyásoló új tényt** egy célzott kiegészítő
   kódvizsgálattal (2.4–2.6 — a task „Stop / eszkaláció" szabálya szerint: ha egy
   ownership-kérdést a bemenet nem bizonyít elég mélyen, célzott kiegészítő
   ellenőrzést kell futtatni, nem feltételezést),
3. **meghozta mind a 11 kötelező döntést** (4–13. fejezet),
4. **ellenőrizte és két ponton pontosította** a már megírt `B2B-01..09`
   task-határokat (14. fejezet),
5. **explicit különválasztotta**, mely pontok igényelnek Gábor üzleti/jogi/
   ütemezési döntését (15. fejezet) — ezekben nem hozott önkényes döntést.

### 1.1 Vizsgált HEAD-ek (ez az ADR, kiegészítő ellenőrzés)

| Repo | Állapot |
|---|---|
| `src/spaceos-kernel` | `6b470ba1d0556db183a6bcb73145b793a9fe2deb` (a `develop`-ba mergelt ADR-065 utáni állapot), tiszta munkafa |
| `src/spaceos-modules-procurement` | a platform gitlinkje szerinti pin, csak olvasva |
| `src/joinerytech-portal` | a platform gitlinkje szerinti pin, csak olvasva |

Nem futtattam új build/tesztet ebben a taskban — a `PROJECT_CORE_BOUNDARY_AUDIT`
971/971 zöld eredménye a FlowEpic/FlowManagement rétegre elfogadott bemenet; az
itt talált új fájlok (TenantHandshakeAllowlist, `Modules.Abstractions.Handshake`,
Procurement `SubcontractOrder`/`Supplier`) mind read-only forráshivatkozással
ellenőrzött, konkrét `fájl:sor` szinten.

---

## 2. Bizonyíték-összefoglaló

### 2.1 Az audit fő állításai — megerősítve forrásból

- `FlowEpic.cs` (`src/spaceos-kernel/SpaceOS.Kernel.Domain/Entities/FlowEpic.cs`):
  teljes aggregate, `DelegateTo` az egyetlen B2B-metódus, csak `Discovery`
  fázisban hívható, nincs `Accept/Reject/Revoke`. Sorról sorra megegyezik az
  audit leírásával.
- `AppDbContext.cs:159-160`: `FlowEpic` query filter kizárólag
  `fe.TenantId == CurrentTenantGuid` (vagy `null` = admin-bypass) — nincs
  `Handshake.GuestTenantId` ág. Megerősítve.
- `scripts/db/init-query-rls.sql:9-17`: a `tenant_isolation_flow_epics` policy
  kizárólag `"TenantId" = current_setting(...)` — nincs guest-ág. Megerősítve.
- `FlowManagement/Domain/FlowProject.cs`, `FlowTask.cs`: egyszerű POCO-k,
  `FlowTask.EpicKernelId` UUID-only ref (nincs FK). Megerősítve — az audit
  „nincs Postgres-migráció, nincs endpoint" állítása a forrásban is stimmel
  (`Program.cs:349`: a `MigrateAsync()` csak az `AppDbContext`-re fut,
  megjegyzés szerint is „one-time operational fix", nem a `ModulesDbContext`-re).
- Portál `ProjectsPage.tsx`: kizárólag `../mocks/projects`-ből importál, nincs
  `fetch`/service-hívás a fájlban. Megerősítve.

### 2.2 `B2BHandshake` VO — megerősítve, egy ponttal kiegészítve

`SpaceOS.Kernel.Domain/ValueObjects/B2BHandshake.cs`: `sealed record`,
`GuestTenantId`/`DelegatedOn` + Sprint C nullable mezők
(`InitiatorAnchorJson`/`ResponsibleAnchorJson`/`VisibilityScope`/`ContractHash`).
A doc-comment explicit indoklást ad, amiért ezek nyers JSON stringek: **„to avoid
a Domain dependency on `SpaceOS.Modules.Abstractions`"** — azaz a Kernel Domain
réteg már ma is tudatosan elkerüli a függőséget a gazdagabb `Handshake`-absztrakcióra
(lásd 2.3). Ez megerősíti, hogy bármilyen jövőbeli B2B-gazdagítás a Kernelben
**új Kernel-függőséget** hozna létre, amit a Kernel máig tudatosan elkerült.

### 2.3 Új lelet — `SpaceOS.Modules.Abstractions.Handshake`: gazdag, de holt és iparág-terhelt absztrakció

`SpaceOS.Modules.Abstractions/Handshake/{IHandshake,HandshakeType,HandshakeState,
HandshakeAnchor,AnchorType,HandshakeVisibilityScope}.cs`. Teljes szövegkeresés
(`IHandshake`, `HandshakeType`, `HandshakeState` a teljes `spaceos-kernel`
fastruktúrán, a saját mappájukon kívül): **nulla fogyasztó** — ezek a típusok
sehol nem vannak implementálva vagy hivatkozva a futó kódban. Ez megerősíti a
célforrás-dokumentum (2. fejezet) állítását („létezik gazdagabb, de nem
használt absztrakció"), és **kiegészíti** egy konkrét, korábban nem dokumentált
ténnyel: a `HandshakeType` enum **nem semleges**, hanem a JoineryTech-ökoszisztéma
szereplő-szótárát kódolja zárt enumként:

```csharp
public enum HandshakeType
{
    DesignToManufacturer = 1, ManufacturerToSupplier = 2, DesignToInstaller = 3,
    ClientToDesigner = 4, DealerToManufacturer = 5, SupplierToManufacturer = 6,
    InstallerToSupplier = 7, SelfTask = 8,
}
```

Ez pontosan az a mintázat, amit ADR-065 a `FlowEpicScope`-ban orvosolt (zárt enum,
konkrét iparági/ökoszisztéma-szereplő szótárral) — csak itt egy „Abstractions"
néven futó, állítólag cross-module-semleges csomagban. **Ez az ADR ezt a leletet
a döntésbe beépíti (4., 6. fejezet): ez az absztrakció nem használható a
Collaboration bounded context alapjaként, retire-jelölt.**

### 2.4 Új lelet — `TenantHandshakeAllowlist` (ADR-039): létező, migrált, DE más célú és szintén iparág-terhelt

A célforrás-dokumentum (2. fejezet) megemlíti a `TenantHandshakeAllowlist`-et
mint „kapcsolatellenőrzési alapot", de nem tárja fel a tényleges kódot. Célzott
kiegészítő vizsgálat (`grep TenantHandshakeAllowlist`, `IB2BHandshakeVerifier`):

- **`TenantHandshakeAllowlist`** (`SpaceOS.Kernel.Domain/Entities/
  TenantHandshakeAllowlist.cs`) egy **valódi, migrált** (`Migration_0026_
  TenantHandshakeAllowlist.cs`) entitás `(GuestTenantId, HostTenantId)`
  kompozit kulccsal és `AllowedTradeTypes` listával. A `Create` metódus **zárt
  szótár ellen validál**: `valid = new[] { "door", "cabinet", "window" }` —
  ez **egy második, ADR-065-höz hasonló Kernel domain-mentesség sérülés**, amit
  sem az audit, sem a célforrás-dokumentum nem nevezett meg konkrétan.
- Ezt egy **teljesen más mechanizmus fogyasztja**, mint a `FlowEpic.DelegateTo`:
  `B2BHandshakeVerifier` (`SpaceOS.Infrastructure/Internal/
  B2BHandshakeVerifier.cs`) → `IB2BHandshakeVerifier` port →
  `GetTenantActorQueryHandler` (`SpaceOS.Kernel.Application/Internal/Queries/
  GetTenantActorQueryHandler.cs`) → `GET /api/internal/tenants/{id}`
  **belső, header-alapú, JWT nélküli** endpoint (`Program.cs:363` megjegyzés:
  „ADR-039: Internal endpoint guard — header-based auth, JWT is not involved"),
  ami egy `HasVerifiedHandshakeWithRequester: bool` mezőt ad vissza egy
  **ökoszisztéma-aktor-directory lekérdezéshez** (más ökoszisztéma-modulok,
  pl. Sales/Trading, kérdezik le, van-e igazolt kereskedelmi kapcsolat két
  tenant között).
- **Következtetés, amit sem az audit, sem a célforrás-dokumentum nem mondott ki
  explicit: két, egymástól teljesen független „handshake/allowlist" fogalom él
  ma a Kernelben** — (a) a `FlowEpic.Handshake` VO (projekt-delegáció, nincs
  allowlist-ellenőrzés, lásd `DelegateFlowEpicCommandHandler.cs:58-61` —
  ezt megerősítettem: **csak a guest tenant létezését ellenőrzi, a
  `TenantHandshakeAllowlist`-et egyáltalán nem hívja**), és (b) a
  `TenantHandshakeAllowlist`/`B2BHandshakeVerifier` (ökoszisztéma-aktor
  bizalmi-kapcsolat directory, ADR-039, iparág-specifikus trade type-okkal).
  **Ez az ADR mindkettőt explicit kezeli, és nem engedi összemosni őket** (lásd
  6. fejezet és a B2B-01 pontosítás, 14. fejezet) — a `TenantHandshakeAllowlist`
  **nem** a Collaboration `CollaborationParticipantGrant`-jának előzménye vagy
  helyettesítője, egy szűkebb, más rétegbeli mechanizmus.

### 2.5 Új lelet — Procurement `SubcontractOrder`/`Supplier`: ma nincs valódi cross-tenant identitás mögötte

A célforrás-dokumentum (9. fejezet) és a `B2B-06` task nyitva hagyja, hogy a
`SubcontractOrder` „kereskedelmi/forrás szerepe" mit jelent pontosan. Célzott
vizsgálat (`SubcontractOrder.cs`, `Supplier.cs`,
`AcceptSubcontractOrderCommandHandler.cs`):

- `Supplier` (`SpaceOS.Modules.Procurement.Domain/Aggregates/Supplier.cs`) egy
  **tenant-belső törzsadat-rekord**: `Supplier.Create(tenantId, name, ...)` a
  **megrendelő** tenant saját `TenantId`-jával jön létre — a beszállító **nem**
  egy másik, valódi platform-tenant identitása, hanem a megrendelő saját
  nyilvántartásának egy sora.
- `SubcontractOrder.Accept()`/`Reject()`
  (`AcceptSubcontractOrderCommandHandler.cs`) a megrendelő tenant saját
  hívásán keresztül fut le (nincs guest-tenant-hitelesítés, nincs
  cross-tenant RLS-kérdés) — azaz a `Pending → Accepted/Rejected → InProgress
  → Completed` állapotgép ma **egyetlen tenant belső ügyintézését** modellezi
  (pl. „a beszállító telefonon/emailben visszaigazolta, ezt rögzítjük"), **nem
  egy második, önállóan hitelesített fél döntését**.
- **Következtetés, ami pontosítja a célforrás-dokumentum és a B2B-06 nyitott
  kérdését:** a `SubcontractOrder` ma **nem versenyez** a `CollaborationAgreement`/
  `DelegatedWorkPackage`-dzsel mint valódi cross-tenant aggregate, mert **ma
  nincs mögötte cross-tenant identitás** — a látszólagos átfedés (hasonló
  elnevezésű állapotok) félrevezető, de a mögöttes tenant-modell más. Ez
  konkrétan befolyásolja a 6. fejezet döntését (adapter vs. retire).

### 2.6 `StageChainTemplate` és a Kernel Outbox — megerősítve, nincs új lelet

`StageChainTemplate.cs` (`TenantScopedAggregateRoot`, max 20 lépés, `IsDefault`
egyedi tenantonként) és a Kernel `Outbox/` mappa
(`OutboxMessage`/`ICrossModuleOutboxDispatcher`/`IOutboxRepository`) pontosan az
audit és az ADR-066 leírása szerint néznek ki — nincs eltérés, nincs új lelet.

---

## 3. Döntési erők és nem-célok

**Döntési erők:**

- A Kernel core (FlowEpic FSM, StageChain, projekt-adatkezelés) érinthetetlen
  Gábor explicit jóváhagyása nélkül (MEMORY.md, ADR-065) — ez a legszigorúbb
  kényszer, és pontosan ez a terület az, ahol eddig **kétszer** szivárgott be
  iparági szókincs a Kernelbe (`FlowEpicScope`, és az itt talált
  `TenantHandshakeAllowlist.AllowedTradeTypes`).
- A kézfogás iparágsemleges platformprotokoll kell legyen, amit JoineryTech ÉS
  Doorstar (és jövőbeli iparágak) ugyanúgy fogyaszthatnak — egy JoineryTech-be
  vagy egy ERP-modulba zárt megvalósítás ezt strukturálisan kizárná.
- `ProjectRef` tulajdonosa már eldöntött (ADR-066: Kernel `FlowEpic`) — ez nem
  vitatható újra, csak erre kell épülni.
- Pontosan egy agreement és egy delegated-work source of truth kötelező (a
  task elfogadási kritériuma) — a ma létező három-négy párhuzamos „delegáció"
  fogalom (FlowEpic.Handshake, Modules.Abstractions.Handshake,
  TenantHandshakeAllowlist, CRM Opportunity.DelegateToPartner) egyike sem
  alkalmas erre a szerepre változtatás nélkül.
- Fail-closed tenant-izoláció nem sérülhet — guest-láthatóság csak explicit
  participant-granttal, sosem globális query-filter lazítással.

**Nem-célok (ebben az ADR-ben és az MVP-ben):**

- Nem célja a Program/Projekt/Mérföldkő teljes hierarchia megépítése (lásd
  11. fejezet — ez explicit nyitott kérdés Gábornak, nem ennek az ADR-nek a
  hatásköre eldönteni, hogy épüljön-e).
- Nem célja a `FlowEpicScope`-hoz vagy a `TenantHandshakeAllowlist`
  trade-type-jaihoz hasonló, már létező Kernel-hibák kódszintű javítása (csak
  jegyzése, lásd 15.7).
- Nem célja jogi/minősített-aláírási garancia adása (lásd 9. fejezet és 15.4).
- Nem célja a CRM `Order`/`Quote`/`Customer` aggregate megépítése vagy az
  `OrderRef`/külső `PartyRef` tulajdonos kijelölése — ez ADR-066 nyitva hagyott,
  Gábornak címzett kérdése, ezt az ADR nem oldja fel.

---

## 4. Opciók — Ownership (1. döntési pont)

**O1 — Kernel FlowManagement/FlowEpic közvetlen kiterjesztése.**
Accept/Reject/Revoke metódusok, agreement/terms/participant táblák közvetlenül
a Kernel `AppDbContext`-ben. *Elutasítva:* a 2.2–2.4 fejezet bizonyítja, hogy a
Kernel Domain réteg már ma is tudatosan kerüli a gazdagabb Handshake-függőséget,
és hogy pontosan ez a terület (B2B/handshake) az, ahol eddig kétszer szivárgott
be iparági szókincs a Kernelbe. Egy teljes agreement/evidence/exchange modell
mélyebb domain-tudás, mint egy globálisan értelmes absztrakció — ez direkt
ellentmond Gábor ADR-065-ös elvének. Kernel-módosítást igényelne Gábor explicit
jóváhagyásával, jóval nagyobb kockázattal, mint az ADR-065 egyetlen enumja.

**O2 — JoineryTech-szintű adapter/read context.**
A B2B/Projects UX egy JoineryTech-tulajdonú modulban (portál + saját backend)
épül, a meglévő (kiterjesztett) Kernel `DelegateFlowEpic` API-ra hívva, saját
agreement/participant táblákkal, csak JoineryTech-instance-ra. *Elutasítva mint
egyedüli válasz:* a célforrás-dokumentum explicit kimondja, hogy a protokollnak
JoineryTech, Doorstar és jövőbeli iparági platformok között meg kell egyeznie
(§1, §13). Egy JoineryTech-tulajdonú megvalósítás vagy Doorstart kényszerítené
JoineryTech-függőségre (rossz irányú csatolás — egy ügyfél-instance nem
függhet egy platform-oldali üzleti modultól úgy, hogy az legyen a kanonikus
forrás), vagy Doorstar egy párhuzamos, saját B2B-stacket építene — pontosan az
a duplikált-aggregate helyzet, amit a CRM `Opportunity.DelegateToPartner` már
ma is mutat egy kisebb léptékben (holt, nem integrált harmadik „delegáció"
fogalom).

**O3 — Új, önálló, iparágsemleges SpaceOS Collaboration bounded context
(VÁLASZTOTT).**
Kernel-lel és a 7 ERP-modullal egyenrangú, önálló modul (saját host, saját DB
schema, saját OpenAPI), amely a `CollaborationAgreement`,
`DelegatedWorkPackage`, `CollaborationParticipantGrant` és `ExchangeEnvelope`
aggregate-eket birtokolja, és a Project/FlowEpic-et, CRM-et, Procurementet,
DMS-t, QA-t kizárólag az ADR-066-ban eldöntött semleges referenciatípusokon
keresztül éri el. **Ez az egyetlen opció, ami egyszerre tartja be a Kernel
érinthetetlenségét és a protokoll iparágsemleges, több-instance
újrafelhasználhatóságát.**

**O4 — A kézfogás elrejtése Procurement vagy CRM alá (pl. a `SubcontractOrder`
kiterjesztése cross-tenant agreementté).** *Explicit tiltott* a task saját
„Stop / eszkaláció" szakasza szerint is; emellett a 2.5 fejezet bizonyítja,
hogy a `SubcontractOrder` ma nem is rendelkezik valódi cross-tenant
identitással, tehát technikailag sem alkalmas erre a szerepre módosítás nélkül.

**Döntés: O3.** A Collaboration bounded context egy új, önálló modul —
munkanév és javasolt fizikai hely: `src/spaceos-modules-collaboration`
(sibling a Kernel és a 7 ERP-modul mellett, nem azok egyike és nem a Kernel
része), ModuleId-namespace `spaceos.collaboration` (ADR-067 konvenció szerint:
iparág-agnosztikus, horizontális platform-képesség).

---

## 5. Hierarchy — Program/Project/Milestone/FlowEpic/Task (2. döntési pont)

**A `ProjectRef` tulajdonosa már eldöntött (ADR-066): Kernel `FlowEpic`.** Ez az
ADR erre épít. A design-intent dokumentum (`PROJECT_MANAGEMENT_MODEL-frontend-
designes-v3.md`) egy ötszintű hierarchiát ír le (Program → Projekt → Mérföldkő
→ Almérföldkő → Epik(=FlowEpic) → Task → Subtask), amelyben a „Projekt" egy
FlowEpic FÖLÖTTI, több epicet összefogó szint lenne. **Ma a gyakorlatban nincs
ilyen felső szint** — az audit bizonyítja, hogy Program/Project/Milestone
sosem kapott migrációt vagy API-t, ezért a rendszerben **egy FlowEpic-instancia
ma facto a legkisebb, egyben az egyetlen ténylegesen referálható „projekt-
egység"** — ez az, amire az ADR-066 `ProjectRef`-je is mutat.

**Döntés — ownership-tábla:**

| Szint | Tulajdonos | Döntés | Indoklás |
|---|---|---|---|
| **Epic (FlowEpic)** | Kernel `FlowEpic` | **reuse** | Egyetlen production-hostolt, migrált, RLS-védett, ADR-066 által megerősített `ProjectRef`-forrás. |
| **StageChain (tenant-config)** | Kernel `StageChainTemplate/StageDefinition/StageHandoff` | **reuse** | Érett, jól tesztelt, nincs változtatási igény. |
| **Task** | `FlowManagement.FlowTask` mintája (`EpicKernelId` UUID-only ref) | **adapt, ha valaha épül Task-szintű UI** — **nem MVP-rész** | A minta jó (ugyanaz, mint az ADR-066 `WorkItemRef`-elve), de production-migráció és API nélkül ma nem hostolt; ennek az ADR-nek nem feladata a migrációt elrendelni. |
| **Subtask** | nincs owner | **new, ha valaha kell** — nem MVP-rész | Design-intent-only, sehol nincs modellezve. |
| **Milestone / Almérföldkő** | nincs owner | **decision_required Gábornak (15.1)** | Nincs production-modell; építése új aggregate + migráció, ami önmagában külön döntést igényel. |
| **Program / Projekt-burok (több epicet összefogó szint)** | nincs owner | **decision_required Gábornak (15.1)** | `FlowManagement.FlowProgram/FlowProject` a legközelebbi kódolt kiindulópont, de **nem ajánlott automatikusan felépíteni** — lásd lent. |

**A `FlowManagement.FlowProgram/FlowProject/FlowMilestone` POCO-k sorsa —
pontosítás az audit „adapt" ajánlásához képest:** az audit még nyitva hagyta,
hogy ezek legyenek-e a jövőbeli Projekt-hierarchia kiindulópontja. Ez az ADR
**retire-jelöltnek minősíti** őket (nem „adapt"), mert:

1. ADR-066 már eldöntötte, hogy a cross-module `ProjectRef` a Kernel
   `FlowEpic`-re mutat — egy felépített `FlowManagement.FlowProject` réteg
   emellett **egy második, redundáns „projekt" fogalom** lenne, ami pont az
   elfogadási kritérium által tiltott duplikációt hozná létre, ha valaha API-t
   kapna.
2. Nincs valós „megtakarítás" az adapt-ban: a réteg pontosan ugyanannyi
   migráció+API+RLS munkát igényelne, mint egy vadonatúj Program/Milestone
   bounded context — a „regisztrálva van a DI-ben" tény nem jelent érdemi
   előnyt, ha a tábla-, endpoint- és teszt-réteg nulla.
3. A `FlowTask.EpicKernelId` minta (UUID-only ref a Kernel FlowEpicre) viszont
   **külön ítélendő meg és megtartandó** — ez nem egy második „projekt"
   fogalom, hanem pontosan az ADR-066 `WorkItemRef`-mintájának előfutára, ha
   valaha Task-szintű UI épül.

**Ez nem jelenti a fájlok azonnali törlését** (az kódmódosítás, ezen ADR
tiltott scope-ja) — csak azt mondja ki, hogy **ne épüljön rájuk új funkció**, és
hogy formálisan deprecated-nek tekintendők a Program/Project/Milestone
hármasra nézve, amíg Gábor másképp nem dönt (15.1).

---

## 6. B2B ownership — pontosan egy agreement és egy delegated-work forrás (3. döntési pont)

| Meglévő elem | Ma | Döntés | Indoklás |
|---|---|---|---|
| `FlowEpic.Handshake` (VO) + `DelegateTo` | Egyetlen aktív B2B-mechanizmus, csak delegáció-jelzés | **Deprecated, mint B2B source of truth.** Rövid távon megmarad legacy shimként (adatvesztés nélkül — a production-állomány ma üres, lásd audit), de **nem bővül** új lifecycle-metódussal. A `CollaborationAgreement`/`DelegatedWorkPackage` veszi át a szerepét. | Az audit bizonyítja, hogy nincs éles adat rajta (üres `Handshake` mező minden production sorban) — a cutover kockázatmentes, pont úgy, mint az ADR-065 `FlowEpicScope` visszamenőleges kompatibilitása. |
| `SpaceOS.Modules.Abstractions.Handshake` (`IHandshake` stb.) | Nulla fogyasztó, iparág-terhelt `HandshakeType` (2.3) | **Retire.** Nem alap a Collaboration contracthoz — a `HandshakeState` FSM-alakja (Proposed/Accepted/InProgress/AwaitingApproval/Completed/Rejected/Cancelled) inspirációként átvehető a `DelegatedWorkPackage` állapotgéphez, de a típus (`HandshakeType`) és a fájlok maguk nem öröklődnek át. | Zéró blast radius (nincs hívó), ezért a retire kockázatmentes; az iparági `HandshakeType` átvétele pont azt a hibát ismételné meg, amit ADR-065 orvosolt. |
| `TenantHandshakeAllowlist` / `B2BHandshakeVerifier` (ADR-039) | Éles, migrált, de **más célú**: ökoszisztéma-aktor bizalmi-directory (2.4) | **Megmarad a jelenlegi, szűkebb szerepében** (nem törlés, nem retire). **Nem lesz a `CollaborationParticipantGrant` helyettesítője vagy előzménye** — külön mechanizmus marad. Opcionálisan, JoineryTech-instance-szinten, később **bemenetként** szolgálhat a participant-grant kiadás politikájához (pl. „csak allowlistelt kereskedelmi kapcsolattal rendelkező tenantnak ajánlható fel agreement") — ez **decision_required** (15.3), nem architektúra-döntés. | A meglévő mechanizmus élesben használt (ADR-039 internal actor directory), nem bontható meg vagy vonható össze felelőtlenül a Collaboration-nal — de a két fogalom (kereskedelmi bizalmi-kapcsolat vs. konkrét agreement/work package hozzáférés) explicit különböző, és a task célforrás-dokumentuma is ezt mondja ki (§2: „kapcsolatellenőrzési alap, de nem helyettesíti… a résztvevői grantot"). |
| Procurement `SubcontractOrder`/`Supplier` | Éles, migrált, tenant-belső kereskedelmi lifecycle; **ma nincs mögötte valódi cross-tenant identitás** (2.5) | **Marad Procurement kizárólagos kereskedelmi/pénzügyi source of truth-ja** (cost, currency, deadline, supplier törzsadat) — **nem lép be a Collaboration aggregate-ek közé**. Ha/amikor a beszállító valódi platform-tenanttá válik (saját belépéssel), a Procurement **opcionális adapterként** egy semleges `WorkItemRef`/(jövőbeli) `AgreementRef` mezőn keresztül **hivatkozhat** egy `DelegatedWorkPackage`-re — a `SubcontractOrder` saját FSM-je nem cserélődik le. | A 2.5 fejezet bizonyítéka szerint a mai átfedés csak névbeli (hasonló státusznevek), nem strukturális — nincs valódi második cross-tenant aggregate, amit ki kellene váltani; a kereskedelmi/pénzügyi adat (cost, currency) a célforrás-dokumentum §6 szerint sem duplikálható a Collaboration aggregate-be. |
| CRM `Opportunity.DelegateToPartner` | Holt kód, nincs hívó (audit D3) | **Retire-jelölt, integráció nélkül.** Ha a CRM valaha B2B-indítási pontot akar adni (pl. „ajánlatból induljon agreement"), az egy jövőbeli CRM-adapter a Collaboration felé (`B2B-06`), **nem** a meglévő `DelegateToPartner`/`OpportunityDelegatedToPartnerEvent` felélesztése — azok `B2BHandshakeId` mezője opak és sosem kötődött semmilyen valódi Kernel-azonosítóhoz. | Az audit szerint nincs hívó, nincs Kernel-integráció; felélesztése egy negyedik párhuzamos „delegáció" fogalmat hozna vissza. |

**Eredmény: pontosan egy agreement source of truth (`CollaborationAgreement`,
új) és pontosan egy delegated-work source of truth (`DelegatedWorkPackage`,
új)** — mindkettő a Collaboration bounded contextben, mindkettő 0 átfedéssel a
fent felsorolt öt meglévő elemmel, amelyek mindegyike explicit reuse/adapt/
retire/decision_required döntést kapott.

---

## 7. Két lifecycle (4. döntési pont)

A célforrás-dokumentum (§4) modelljét **elfogadjuk**, mert kódbizonyítékkal
konzisztens (a `HandshakeState` FSM-alak és a `SubcontractOrder` FSM-alak is
ugyanazt az „ajánlat → elfogadás → végrehajtás → lezárás" mintát mutatja, csak
más granularitáson) és megfelel az elfogadási kritériumnak (minden átmenethez
actor+guard+event+audit).

### 7.1 CollaborationAgreement (megállapodás)

```text
Draft -> Offered -> CounterProposed -> Accepted -> Active -> Completed
             ├──────────────> Rejected
             └──────────────> Withdrawn / Expired
Accepted vagy Active ───────> Terminated / Disputed
```

**MVP-ben kiadható:** `Draft → Offered → Accepted → Active → Completed`, plusz
`Rejected`/`Withdrawn`. **MVP-ben NEM kötelező, de a kontraktus/eseményverziózás
nem zárhatja ki:** `CounterProposed`, `Terminated`, `Disputed`, `Expired`. Ez a
`B2B-01`/`B2B-03` normatív feladata a pontos guard/actor mátrix elkészítésére —
ez az ADR a keretet dönti el, a részletes tranzíciós táblát a B2B-01 kimenete
adja (14. fejezet).

### 7.2 DelegatedWorkPackage (delegált munkacsomag)

```text
Offered -> Accepted -> InProgress -> Submitted -> Completed
    ├────────> Rejected                 └─> ChangesRequested -> InProgress
    └────────> Cancelled
bármely aktív állapot -> Disputed (policy szerint, MVP-ben opcionális)
```

Actor-mátrix minimum (a célforrás-dokumentum §4.2 táblájának megerősítése):

| Tranzíció | Kezdeményező | Fogadó | Kötelező adat |
|---|---:|---:|---|
| offer | host | — | terms revision, scope, határidő |
| accept/reject | — | guest | elfogadó vagy indok |
| start | policy szerint | guest | tényleges kezdés |
| submit | — | guest | deliverable/evidence referencia |
| request changes | host | — | indok, új elvárás |
| complete/approve | host | — | elfogadási bizonyíték |
| cancel | policy szerint | policy szerint | ok, hatály, értesítés |

Minden tranzíció command+guard+versioned event+audit mezővel — ez a `B2B-04`
kötelező kimenete, amit ez az ADR normatívnak jelöl ki.

---

## 8. Digitális megállapodás és bizonyíték (5. döntési pont)

A célforrás-dokumentum §6 modelljét **elfogadjuk változtatás nélkül**:
immutable terms revision (verziózott JSON Schema), determinisztikus
kanonizáció + SHA-256 hash, elfogadási rekord (tenant/user/UTC/revision
hash/auth context/event sequence), append-only audit, amendment = új revision
(sosem in-place módosítás). A `DocumentRef` (ADR-066 által már eldöntött típus,
DMS a resolver) hordozza az ember-olvasható változatot.

**Jogi határ — kötelezően rögzítendő UI/API szöveg szinten (B2B-08/B2B-03):**
ez a képesség erős operatív bizonyítékot ad, de **nem állítható róla, hogy
minősített elektronikus aláírás vagy minden joghatóságban kikényszeríthető
szerződés** — ez explicit nem-cél (3. fejezet), és jogi/compliance döntés
nélkül nem bővíthető (15.4).

---

## 9. Tenant boundary — host/guest, fail-closed (6. döntési pont)

**Kulcsfontosságú architekturális döntés, ami a Kernelt teljesen érintetlenül
hagyja:** mivel a `CollaborationAgreement`/`DelegatedWorkPackage` **új
aggregate-ek egy új bounded contextben, saját séma/táblákkal**, az RLS-elv
(„owner VAGY aktív participant grant") **a Collaboration modul saját, vadonatúj
tábláira** vonatkozik — **nem** a Kernel `FlowEpics` táblájára és nem a meglévő
`tenant_isolation_flow_epics` policy-ra.

```text
Collaboration.agreements / work_packages RLS:
  engedélyezett, ha
    current_tenant_id = owner_tenant_id
    VAGY EXISTS aktív CollaborationParticipantGrant,
         ugyanarra az agreement/work-package ID-ra,
         a current_tenant_id-re és a kért capabilityre szól
```

**A guest tenant sosem olvassa közvetlenül a host `FlowEpic` sorát.** A guest a
Collaboration saját, actor-szűrt read modelljét olvassa, ami a delegálás
pillanatában (vagy egy determinisztikus projekció-frissítéskor) egy **másolt/
denormalizált pillanatképet** hordoz a releváns scope-ról és terms-ről, a
`ProjectRef(projectId=FlowEpic.Id)`-t **opak azonosítóként/címkeként**, nem
élő join-ként. Ez azt jelenti:

- **A Kernel `AppDbContext.cs:159-160` és `init-query-rls.sql:9-17` NEM
  módosul** — a host `FlowEpic` RLS-je pontosan olyan marad, mint ma (kizárólag
  a tulajdonos tenant olvashatja). Ez teljesíti a task „Kernel core
  érinthetetlen" kényszerét, méghozzá anélkül, hogy a guest-láthatóság
  design-intent problémáját nyitva hagyná — a probléma a Collaboration
  rétegben oldódik meg, nem a Kernelben.
- A `ProjectRef` feloldása (a FlowEpic tényleges, élő állapotának
  lekérdezése) továbbra is **kizárólag a host tenant kontextusában**, a
  Project/FlowEpic adapteren (`B2B-06`) keresztül történik, amely a
  tenant/participant authorizationt saját maga ellenőrzi minden feloldásnál —
  pont az ADR-066 7. fejezetének elve szerint.

**Kötelező biztonsági tulajdonságok** (a célforrás-dokumentum §8-ból átvéve,
megerősítve): deny-by-default RLS + alkalmazásréteg authz együtt; participant
grant capability- és erőforrás-szintű; host nem olvas guest-belső adatot és
fordítva; allowlist (ide értve a `TenantHandshakeAllowlist`-et is, ha 15.3
szerint bevonásra kerül) csak partnerkapcsolati előfeltétel, sosem
adat-hozzáférési grant; minden mutation ETag/row version + idempotency key;
non-superuser RLS-bizonyíték kötelező (superuser teszt nem elfogadható).

**Threat model minimum** (a `B2B-02`/`B2B-09` kötelező lefedettsége): tenant ID
csere, agreement/work-package ID találgatás, stale revision elfogadása,
replay, dupla submit, jogosulatlan state transition, visszavont grant,
séma-downgrade, dokumentumhash-eltérés, eseménysorrend-hiba — mindegyikhez
automata negatív teszt kötelező.

---

## 10. Információcsere (7. döntési pont)

A célforrás-dokumentum §7 modelljét elfogadjuk: séma/verzió-azonosított
envelope, outbox→inbox kézbesítés, idempotency key + participantonkénti
monoton sequence, fail-closed ismeretlen schema-verzióra, DMS/blob-referencia
nagy payloadhoz, correlation ID minden parancson és delivery státuszon,
retry/dead-letter/replay/reconciliation külön operációs felület.

**Döntés a Kernel Outbox újrafelhasználásáról:** a Kernel
`OutboxMessage`/`ICrossModuleOutboxDispatcher`/`ModuleSubscription` mechanizmus
valódi, migrált, HMAC-aláírt és tesztelt (ADR-066 3.4 megerősítve), **de ma
egyetlen ERP-modul sem fogyasztja**, és az ADR-066 explicit `decision_required`-
ként hagyta, hogy legyen-e ez a szabvány ERP cross-module csatorna. **Ez az ADR
azt javasolja, hogy a Collaboration bounded context saját, önálló
outbox/inbox táblákat építsen a saját sémájában** (nem közvetlen függőségként a
Kernel Outbox infrastruktúrájára), mert:

1. a Collaboration envelope-jának mezői (`schemaId`/`schemaVersion`/
   `agreementId`/participant-sequence) gazdagabbak, mint a generikus
   `OutboxMessage.Type`/payload alak;
2. a Kernel Outboxra való közvetlen épülés egy **új, validálatlan függőségi
   élt** hozna létre a Kernel felé egy nem-Kernel bounded contextből, még
   mielőtt bármelyik ERP-modul bebizonyította volna, hogy ez a csatorna
   éles terhelés alatt jól működik (ADR-066 8.6 szerint ez még
   proof-of-concept szintű);
3. a HMAC-aláírt kézbesítési **minta** (nem a konkrét Kernel-tábla) jó
   precedens, amit a Collaboration saját implementációja átvehet.

Ez **javaslat, nem lezárt architektúra-tény** — ha Gábor úgy dönt, hogy a
Kernel Outboxot mégis szabvánnyá teszi (ADR-066 9.3 nyitott kérdése), a
Collaboration bounded context ettől függetlenül is működne, csak a szállítási
réteget cserélné.

---

## 11. StageChain (8. döntési pont)

**Nincs változás a Kernel StageChain-en.** A `StageChainTemplate`/
`StageDefinition`/`StageHandoff` és a hozzá tartozó `AdvanceFlowEpicStageCommand
Handler` + `IStageChainValidator` pár **kizárólag a host tenant belső**
munkafolyamat-eszköze — a guest tenant **sosem** rendel hozzá vagy léptet
stage-et a host `FlowEpic`-jén. A `DelegatedWorkPackage` állapotgépe (7.2)
**explicit különálló** a host StageChain-jétől — ez a 4. döntési pont „két
lifecycle" elvének kiterjesztése: a work package státusza (`InProgress`,
`Submitted` stb.) NEM egy StageChain-lépés, hanem egy másik bounded context
másik aggregate-jének állapota.

Ha a host a `DelegatedWorkPackage` előrehaladását saját StageChain-jében is meg
akarja jeleníteni (pl. „alvállalkozóra vár" mint egyik lépés), az a
Project/FlowEpic adapter (`B2B-06`) feladata: **egyirányú projekció** a
Collaboration eseményeiből a host FlowEpic státuszába, nem a két állapotgép
összeolvasztása. Template ownership, tenant-config, versioning és futó
FlowEpic migrációja template-váltáskor: **ezek meglévő, már jól tesztelt Kernel-
viselkedések** (audit 5.4 fejezet), amiket ez az ADR nem módosít és nem is kell
módosítania a B2B-célhoz.

---

## 12. Modulkapcsolat — domain/port/event ownership táblák (9. döntési pont)

### 12.1 Aggregate ownership

| Aggregate | Tulajdonos modul | Séma |
|---|---|---|
| `FlowEpic`, `StageChainTemplate`, `StageDefinition`, `StageHandoff` | Kernel | Kernel `AppDbContext` (változatlan) |
| `CollaborationAgreement`, `DelegatedWorkPackage`, `CollaborationParticipantGrant`, `ExchangeEnvelope` (+ outbox/inbox) | **Collaboration (új)** | saját, új séma |
| `SubcontractOrder`, `Supplier` | Procurement | változatlan |
| `Opportunity` | CRM | változatlan |
| `Document` | DMS | változatlan |
| `Inspection`/`Ticket` | QA | változatlan |
| `ControllingProjectData` (read-model, nem aggregate) | Kontrolling (port only) | nincs saját tábla |

### 12.2 Referencia-feloldás (ADR-066 típusaira építve + két új Collaboration-saját típus)

| Referencia | Resolver | Forrás |
|---|---|---|
| `ProjectRef(projectId)` | Kernel `FlowEpic` | ADR-066, változatlan |
| `WorkItemRef(moduleId, workItemType, workItemId)` | célmodul (QA Ticket, Maintenance WorkOrder stb.) | ADR-066 |
| `DocumentRef(documentId)` | DMS | ADR-066 |
| `PartyRef(partyId, kind)` | belső: HR; külső: **decision_required** (ADR-066 9.2) | ADR-066 |
| **`AgreementRef(agreementId)`** (új) | **Collaboration** | ez az ADR — más modul (pl. Kontrolling projekció) így hivatkozhat egy agreementre |
| **`WorkPackageRef(workPackageId)`** (új) | **Collaboration** | ez az ADR |

A két új típus (`AgreementRef`/`WorkPackageRef`) **a Collaboration modul saját,
publikus, DTO-only contract-csomagjában** él (pl.
`SpaceOS.Modules.Collaboration.Contracts`), ugyanazzal a „csak azonosító,
viselkedés nélkül" elvvel, mint az ADR-066 `SpaceOS.Modules.Erp.References`
csomagja — **nem** kerül bele az `Erp.References` csomagba, mert azoknak a
típusoknak a Collaboration nem tulajdonosa, hanem fogyasztója (a Collaboration
maga NuGet-függőségként fogyasztja az `Erp.References` csomagot a `ProjectRef`/
`WorkItemRef`/`DocumentRef`/`PartyRef` feloldásához).

*Apró, nem blokkoló észrevétel:* az `Erp.References` csomagnév szó szerint
„Erp"-et mond, miközben a Collaboration (nem ERP-modul) is fogyasztja —
érdemes lehet egy jövőbeli, tisztán kozmetikai átnevezésen gondolkodni (pl.
`SpaceOS.Modules.PlatformReferences`), de ez nem ennek az ADR-nek a döntése és
nem blokkol semmit.

### 12.3 Modul-adapter táblázat (a célforrás-dokumentum §9-ét megerősítve)

| Modul | Tulajdon | Collaboration-kapcsolat |
|---|---|---|
| Project/FlowEpic | epik-hierarchia, StageChain | `ProjectRef` anchor + státusz-projekció (első vertical slice) |
| Procurement | `SubcontractOrder` kereskedelmi folyamat | **opcionális** adapter, csak ha a beszállító valódi platform-tenant lesz (15.2); addig nincs kapcsolat |
| CRM | `Opportunity`/partnerkapcsolat | jövőbeli agreement-indítási port; a mai holt `DelegateToPartner` NEM éled újra |
| DMS | dokumentum/verzió | terms/deliverable/proof `DocumentRef` (első vertical slice) |
| QA | inspection/defect/acceptance | teljesítési bizonyíték/elfogadási port (későbbi szelet) |
| Kontrolling | költség/EAC | `AgreementRef`/`WorkPackageRef` alapú projekció, nem aggregate-birtoklás |
| Doorstar | instance workflow | platformprotokoll-fogyasztó, saját repóban; ez az ADR csak a kontraktust rögzíti, Doorstar-kódot nem érint (federációs modell, CLAUDE.md) |

---

## 13. Read model és MVP stop condition (10–11. döntési pont)

**Read model (10. pont):** ugyanaz a resource-URL (`/api/collaborations/
agreements/{id}`, `/work-packages/{id}`) ad actor-szűrt mezőprojekciót és
szerveroldalon számított `allowedActions`-t — nincs külön host/guest endpoint-
család. Projekció-rebuild: determinisztikus replay az eseménytörténetből,
azonos logikai eredménnyel. Konzisztencia: a mutáló actor saját nézete azonnal
konzisztens (ugyanabban a tranzakcióban vagy dokumentált, rövid lag-gal
frissül); a másik fél nézete outbox/inbox-on át, korlátos, **megfigyelhető**
késleltetéssel (nem néma) frissül.

**MVP stop condition (11. pont)** — a célforrás-dokumentum §11 „első bizonyító
vertical slice"-át fogadjuk el MVP-határnak:

1. Host FlowEpic-referenciájú munkacsomagot ajánl guestnek.
2. Guest csak a neki engedett terms/scope adatot látja.
3. Guest a pontos revision hash-re hivatkozva elfogad/elutasít.
4. Elfogadás participant grantet és actor-specifikus read modelt aktivál.
5. Guest `InProgress` → `Submitted`, DMS/proof referenciával.
6. Host módosítást kér vagy teljesítettnek jelöl.
7. Mindkét tenant ugyanazt az eseménysorrendet/revision hash-t igazolja.
8. Harmadik tenant, visszavont grant, replay, stale revision minden esetben
   elutasítást kap.

**Explicit MVP non-goals** (kontraktus/eseményverziózás nem zárhatja ki őket,
de nem kell megépíteni most): `CounterProposed`, `Terminated`, `Disputed`
agreement-állapotok; work package `Disputed`; Procurement/CRM/QA/Kontrolling
adapterek a Project+DMS első szeleten túl; Program/Projekt-burok/Milestone
hierarchia; külső minősített aláírás/trust provider; Doorstar-specifikus
sablonok.

**Doorstar pilothoz szükséges platformartifactok:** publikált OpenAPI 3.1 +
event schema + terms schema hash; package verzió/digest
(`spaceos.collaboration@x.y.z`); `B2B-09` conformance-artifact PASS-szal;
Project/FlowEpic + DMS/proof adapter működő vertical slice-ként.

---

## 14. B2B-01..09 task-határok — ellenőrzés és pontosítás

A `B2B-01..09` task-bontás (`docs/tasks/EPIC-B2B-COLLABORATION-2026Q3/`) **nagy
részben már ezt az irányt anticipálta** — ugyanaz a koncepció-kör írta, mint a
célforrás-dokumentumot. **A legtöbb task-határ változtatás nélkül kiadható.**
Két ponton pontosítottam a fájlokat (mindkettő ténylegesen módosítva, nem csak
itt leírva):

1. **`B2B-01-DOMAIN-CONTRACT.md`** — kiegészítve egy explicit figyelmeztetéssel,
   hogy a Kernelben **két, egymástól különböző** „handshake/allowlist" fogalom
   létezik (`FlowEpic.Handshake` VO — deprecated B2B-forrás — kontra
   `TenantHandshakeAllowlist`/ADR-039 ökoszisztéma-directory — megmarad, más
   célra), és hogy a `B2B-01` szerzőjének **nem szabad** a kettőt összemosnia
   vagy a `TenantHandshakeAllowlist`-et a `CollaborationParticipantGrant`
   automatikus előzményének tekintenie (lásd 2.4, 6. fejezet). Ez azért
   szükséges pontosítás, mert a task eredeti szövege csak annyit mondott,
   hogy „allowlist és Handshake abstraction típusok" — ez összemosható lett
   volna a most feltárt, ténylegesen élő ADR-039-mechanizmussal.
2. **`B2B-06-MODULE-ADAPTERS.md`** — a Procurement sorhoz kiegészítve, hogy a
   `Supplier` ma tenant-belső törzsadat (nincs valódi cross-tenant identitás
   mögötte, lásd 2.5), ezért a Procurement-adapter **opcionális és jövőre
   halasztható**, nem az első vertical slice része, és nem igényel
   „adatvesztés nélküli migrációt" a jelenlegi `SubcontractOrder`-ből, mert
   nincs mit migrálni — a két aggregate ma nem fedi át egymást strukturálisan,
   csak névben hasonlítanak.

**Minden más task-határ (B2B-02..05, 07..09) változatlanul, ellenőrzés után
helytállónak bizonyult** — a participant-grant/RLS modell (B2B-02), a
terms/hash/evidence modell (B2B-03), a work-package FSM (B2B-04), az envelope/
outbox (B2B-05), az API/read-model (B2B-07), a portál UX (B2B-08) és a
conformance-kapu (B2B-09) mind pontosan az ebben az ADR-ben meghozott
döntéseket tükrözik, korrekció nélkül kiadhatók.

---

## 15. Nyitott kérdések Gábornak (nem eldöntve itt)

Ezek üzleti/jogi/ütemezési döntések, nem architekturális kérdések — ezért az
ADR összesített **Státusza PROPOSED marad**, amíg Gábor nem válaszol rájuk
(pontosan úgy, mint ADR-066/067 esetében).

1. **Épüljön-e valaha egy valódi Program/Projekt-burok/Milestone hierarchia** a
   FlowEpic fölé (több epicet összefogó szint), vagy marad tartósan úgy, hogy
   „egy referálható projekt-egység = egy FlowEpic"? Ez határozza meg, hogy a
   `FlowManagement.FlowProgram/FlowProject/FlowMilestone` fájlok formálisan
   törlésre kerüljenek-e most, vagy maradjanak érintetlen, nem-fogyasztott
   kódként egy jövőbeli döntésig.
2. **Váljon-e valaha a Procurement beszállító valódi platform-tenanttá**
   (saját belépéssel), ami miatt a `SubcontractOrder` ténylegesen a
   Collaboration `DelegatedWorkPackage`-re hivatkozhatna? Amíg ez nem
   termék-döntés, a Procurement-adapter (`B2B-06`) opcionális marad.
3. **A `TenantHandshakeAllowlist` (ADR-039 ökoszisztéma-directory) legyen-e
   formális bemenete a Collaboration `CollaborationParticipantGrant` kiadási
   politikájának** JoineryTech-instance-szinten (pl. „csak allowlistelt
   kereskedelmi kapcsolattal ajánlható fel agreement"), vagy maradjon a két
   mechanizmus teljesen független? Ez biztonsági/termékpolitika, nem
   architektúra.
4. **Jogi/compliance határ:** elfogadható-e a Doorstar pilot tényleges
   kereskedelmi használatára a „digitális megállapodás, nem minősített
   elektronikus aláírás" keret változatlanul, vagy szükséges-e már a pilot
   előtt valódi jogi kikényszeríthetőség (minősített aláírás, bizalmi
   időbélyeg, megőrzési idő)? Ez jogi kérdés, nem architektúra.
5. **A Kernel meglévő `CrossModuleOutboxDispatcher`/`ModuleSubscription`
   mechanizmusa legyen-e a Collaboration szállítási rétege**, vagy — ahogy ez
   az ADR javasolja (10. fejezet) — építsen a Collaboration saját, önálló
   outbox/inbox táblákat? Ez érinti, hogy a Collaboration kapjon-e egy új,
   validálatlan függőségi élt a Kernel felé, vagy külön infrastruktúrát
   építsen — kockázat-vállalási döntés, amit érdemes Gábornak megerősítenie.
6. **Ütemezés/scope-tradeoff:** a Doorstar pilot ütemezése megköveteli-e a
   teljes `B2B-01..09` láncot az első használható értékig, vagy elfogadható-e
   egy még szűkebb belső szelet (pl. csak Project+DMS, egyirányú „ajánlat
   látható a guestnek, counter-offer nélkül") előbb kiadni? Ez termék-/
   ütemezés-döntés.
7. **Prioritás a most talált második Kernel domain-mentesség sérülésre**
   (`TenantHandshakeAllowlist.AllowedTradeTypes` zárt `"door"/"cabinet"/
   "window"` szótár, 2.4 fejezet): kapjon-e ez ugyanolyan sürgősségű
   javítást, mint az ADR-065 `FlowEpicScope`-ja, vagy alacsonyabb prioritású,
   mert egy más célú, jelenleg nem a Projects/B2B-vertical-slice útjában álló
   funkcióban van? Ez a döntés nem blokkolja ezt az ADR-t, csak jegyzésre
   került.
8. **`WorkflowPhase` (kód: `Discovery/Delivery/ClosedDone`) vs. a design-doc
   FSM-je** (`BACKLOG_READY/IN_DEV/IN_REVIEW/CLOSED_DONE/CLOSED_BLOCKED`,
   audit D6 pont): a design-doc tekintendő elavultnak/túlhaladottnak, vagy a
   platform még tartozik egy `WorkflowPhase`-bővítéssel/átnevezéssel? Ez
   UX/termék-döntés, ami befolyásolja, hogy a JoineryTech Projects UX a kód
   vagy egy lefordított szótárt beszéljen — nem ennek az ADR-nek kell
   eldöntenie.

---

## 16. API és persistence — magas szintű terv

- **Modul:** `spaceos-modules-collaboration` (új submodule/repo, Kernel és a 7
  ERP-modul mellett, saját host, saját port — a konkrét port-hozzárendelés
  infra/ops döntés, nem architektúra).
- **Séma:** saját Postgres séma (`collaboration`), táblák: `agreements`,
  `terms_revisions`, `acceptance_records`, `work_packages`,
  `work_package_events`, `participant_grants`, `exchange_envelopes`,
  `outbox`, `inbox`.
- **API:** OpenAPI 3.1, contract-first, generált Orval-kliens a portálnak
  (`B2B-07`), tenant nem bizalmi bemenet az URL-ben/headerben.
- **RLS:** `owner OR active participant grant`, `FORCE ROW LEVEL SECURITY`,
  non-superuser DB-role a tesztekhez, a Kernel `FlowEpics` RLS-je változatlan
  (9. fejezet).
- **Contract-csomagok:** `SpaceOS.Modules.Collaboration.Contracts` (saját
  `AgreementRef`/`WorkPackageRef`, DTO-only) + NuGet-függőség
  `SpaceOS.Modules.Erp.References`-re (ADR-066 típusai).

---

## 17. Migráció / kompatibilitás / rollback

- **Kockázatmentes cutover:** a `FlowEpic.Handshake` production-állománya ma
  üres (audit) — a deprecation nem igényel adatmigrációt vagy visszafelé-
  kompatibilitási hidat.
- **`FlowEpic.DelegateTo` API:** rövid távon megmarad (backward-compat shim),
  de dokumentáltan deprecated; tényleges eltávolítása/átalakítása **külön,
  Gábor jóváhagyását igénylő Kernel-ADR** tárgya (a kernel-érinthetetlenség
  szabálya szerint), nem ezen ADR vagy a B2B-epic hatásköre.
- **`SpaceOS.Modules.Abstractions.Handshake` retire:** zéró blast radius,
  külön, kicsi, alacsony kockázatú törlési task (nem blokkolja a B2B-epicet).
- **Rollback:** a Collaboration séma és migrációi teljesen additívak és
  elkülönítettek — visszaállás esetén a séma eldobható anélkül, hogy bármely
  meglévő Kernel/ERP-adat sérülne.

---

## 18. Tesztstratégia

A `B2B-01..09` már meglévő, részletes validációs szakaszai (state-transition
mátrix lefedettség, non-superuser 3+ tenant RLS suite, canonicalization golden
vektorok, outbox/inbox fault-injection + replay, OpenAPI drift + generált
kliens build, kétoldalú Playwright + a11y) **a normatív tesztterv** — ez az ADR
nem ismétli meg, csak kötelezővé teszi mind a kilenc taskra, korrekció nélkül
(14. fejezet).

---

## 19. Következmények és elvetett alternatívák

**Pozitív:** a Kernel core-t egyáltalán nem kell módosítani ehhez az egész
epichez (9., 11., 17. fejezet) — ez a legszigorúbb lehetséges értelmezése
Gábor „a core érinthetetlen" elvének. Pontosan egy agreement és egy
delegated-work forrás jön létre, minden meglévő párhuzamos „delegáció"
fogalom (FlowEpic VO, Modules.Abstractions.Handshake, CRM holt kód) explicit
reuse/adapt/retire döntést kapott, egyik sem marad tisztázatlan lebegésben.

**Semleges:** két, korábban a Collaboration-nal összetéveszthető meglévő
mechanizmus (`TenantHandshakeAllowlist`/ADR-039, `SubcontractOrder`) megmarad
a saját, szűkebb szerepében — ez több munkát jelent later (két külön
integrációs döntés Gábornak), de elkerüli egy elhamarkodott összemosás
kockázatát.

**Elvetett alternatívák:** O1 (Kernel-bővítés) — a domain-mentesség elvét
sértené, és pont ez a terület már kétszer megsértette azt korábban. O2
(JoineryTech-tulajdonú modul) — Doorstar-t rossz irányú függőségre
kényszerítené vagy párhuzamos stacket eredményezne. O4 (Procurement/CRM alá
rejtés) — explicit tiltott a task stop-klózában, és technikailag sem
indokolt (2.5).

---

## 20. Elfogadási kritériumok — önellenőrzés

- [x] Nincs duplikált Project/FlowEpic truth source (5. fejezet — `ProjectRef`
      változatlanul Kernel FlowEpic; FlowManagement retire-jelölt, nem épül rá).
- [x] Agreement és delegated-work source of truth egyértelmű; `SubcontractOrder`
      adapter/retire döntése egyértelmű (6. fejezet).
- [x] Minden B2B-állapothoz actor+guard+audit-követelmény (7. fejezet + B2B-04).
- [x] Host/guest láthatóság explicit, fail-closed, Kernel RLS érintetlen (9. fejezet).
- [x] Participant grant és allowlist (`TenantHandshakeAllowlist`) felelőssége
      explicit szétválasztva (6., 9. fejezet).
- [x] Immutable terms revision, hash, acceptance evidence, amendment szabály (8. fejezet).
- [x] Adatcsere verziózás, idempotencia, replay rögzítve (10. fejezet).
- [x] Moduladat ownership és port/event kapcsolat egyértelmű (12. fejezet).
- [x] MVP és non-goals mérhető (13. fejezet).
- [x] `B2B-01..09` taskhatárok ellenőrizve, két ponton pontosítva, önállóan kiadhatók (14. fejezet).

---

## 21. Végrehajtási napló

Ezt az ADR-t egy önálló agent készítette (2026-07-21), a `PROJECT-CORE-ADR` task
alapján:

1. Elolvasta a kötelező bemeneteket: `PROJECT-BOUNDARY-AUDIT.md` + kimenete
   (`PROJECT_CORE_BOUNDARY_AUDIT_2026-07-18.md`, teljes egészében),
   `SPACEOS_B2B_HANDSHAKE_ARCHITECTURE_2026-07-21.md` (teljes egészében),
   ADR-065, ADR-066, ADR-067 (mind teljes egészében), az `EPIC-B2B-
   COLLABORATION-2026Q3/README.md` és `B2B-01..09` mind a kilenc task-fájlja.
2. Ellenőrizte az ADR-számozást: `docs/knowledge/adr/` listázva, ADR-059..067
   foglalt, **ADR-068 szabad és pontosan e task kötelező kimenete**.
3. Forrásból megerősítette az audit fő állításait: `FlowEpic.cs` (teljes
   fájl), `AppDbContext.cs:145-181` (query filterek), `init-query-rls.sql`
   (első 40 sor), `FlowManagement/Domain/{FlowProject,FlowTask}.cs`,
   `B2BHandshake.cs` (VO).
4. **Célzott kiegészítő vizsgálatot** végzett három, a bemenetekben nem
   (vagy nem elég mélyen) feltárt területen — a task „Stop / eszkaláció"
   szabálya szerint ("ha az audit egy konkrét ownership-kérdést nem bizonyít,
   célzott kiegészítő audittal kell zárni, nem feltételezéssel"):
   - `SpaceOS.Modules.Abstractions/Handshake/*.cs` (mind a 6 fájl) — nulla
     fogyasztó, iparág-terhelt `HandshakeType` enum feltárva (2.3).
   - `TenantHandshakeAllowlist.cs`, `B2BHandshakeVerifier.cs`,
     `GetAllowedHostsQueryHandler.cs`, `HandshakeEndpoints.cs`,
     `GetTenantActorQueryHandler.cs` — feltárva, hogy ez egy **teljesen más,
     élő, migrált, de más célú** (ADR-039 ökoszisztéma-directory) mechanizmus,
     ami sosem kerül meghívásra a `DelegateFlowEpicCommandHandler`-ből (2.4).
   - Procurement `SubcontractOrder.cs`, `Supplier.cs`,
     `AcceptSubcontractOrderCommandHandler.cs` — feltárva, hogy a `Supplier`
     tenant-belső törzsadat, nincs mögötte valódi cross-tenant identitás (2.5).
5. Meghozta mind a 11 kötelező döntési pontot (4–13. fejezet), evidence-
   alapú indoklással, legalább három opció mérlegelésével az ownership-
   kérdésre (4. fejezet).
6. Ellenőrizte és két ponton pontosította a `B2B-01`/`B2B-06` task-fájlokat
   (14. fejezet; a tényleges szerkesztés a task-fájlokban történt, nem csak
   itt leírva).
7. Nyolc, architektúrán túlmutató (üzleti/jogi/ütemezési) nyitott kérdést
   különített el Gábornak (15. fejezet), és **nem fogadta el önmagát** — a
   Státusz PROPOSED marad, a task saját konvenciója szerint (Gábor fogadja el
   az ADR-eket, pont úgy, mint ADR-066/067 esetében).
8. Alkalmazáskód, migráció, endpoint és `EPICS.yaml` nem módosult — kizárólag
   ez az ADR-fájl, a `B2B-01`/`B2B-06` célzott pontosítása és a saját
   task-fájl (`PROJECT-CORE-ADR.md`) „Végrehajtási napló"/„Átadási bizonyíték"
   szakasza íródott.

## 22. Átadási bizonyíték

- **ADR:** `docs/knowledge/adr/ADR-068-project-core-and-b2b-collaboration-ownership.md`
  (ez a fájl), **Státusz: PROPOSED** — Gábor jóváhagyására vár; 8 nyitott
  kérdés explicit jelölve (15. fejezet).
- **Mind a 11 kötelező döntési pont** megválaszolva (4–13. fejezet), evidence-
  alapú indoklással és `fájl:sor` hivatkozásokkal.
- **B2B-01..09 ellenőrzés:** `B2B-01-DOMAIN-CONTRACT.md` és
  `B2B-06-MODULE-ADAPTERS.md` célzottan pontosítva; a többi hét task-fájl
  változtatás nélkül helytállónak bizonyult (14. fejezet).
- **Három új, korábban nem dokumentált lelet** ebbe az ADR-be beépítve:
  `SpaceOS.Modules.Abstractions.Handshake` (holt, iparág-terhelt), a
  `TenantHandshakeAllowlist`/ADR-039 mechanizmus (élő, de más célú, szintén
  iparág-terhelt trade-type szótárral — második, korábban nem nevesített
  Kernel domain-mentesség sérülés), és a Procurement `SubcontractOrder`
  tenant-belső (nem cross-tenant) jellege (2.3–2.5 fejezet).
- **Reviewer verdict:** _Gábor tölti ki elfogadáskor._ Amíg nincs kitöltve, a
  Státusz PROPOSED marad, és az `EPICS.yaml`-beli `PROJECT-CORE-ADR` sor
  státuszát a root terminál frissíti a felülvizsgálat után (ezt az agent
  explicit nem módosította, a feladat-instrukció szerint).
