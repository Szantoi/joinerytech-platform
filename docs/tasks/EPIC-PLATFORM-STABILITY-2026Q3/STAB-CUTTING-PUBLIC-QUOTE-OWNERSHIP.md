# STAB-CUTTING-PUBLIC-QUOTE-OWNERSHIP — egyetlen owner-aware publikus beérkezési modell

- **Szerep:** domain architect + backend/security + privacy
- **Prioritás:** P0 publikus B2C ajánlat élesítése előtt
- **Státusz:** pending — ownership ADR-rész és adatmigráció kell
- **Függőség:** trusted host/tenant resolver; RLS proof kész
- **Mutációs határ:** két public quote API/aggregate konszolidációja, tenant/space
  ownership, validation/persistence schema, attachment ingestion és retention
- **Tiltott scope:** owner nélküli PII, hostname első labeljéből implicit tenant,
  attachment tartalmának extension-only bizalma, törvényes alap/retention kitalálása

## Kutatási eredmény

A modul két párhuzamos publikus ajánlatutat tart fenn:

| Út | Modell | Ownership | Funkció |
|---|---|---|---|
| `/public/cutting/quote-request` | `CuttingQuoteRequest` | tenant | több tétel, tracking/approve/accept/email |
| `/api/public/cutting/quote-request` | `PublicQuoteRequest` | **nincs tenant/space** | egy tétel, külön státusz string, tracking URL mögött nincs azonosított teljes flow |

A második út nevet, emailt, telefont és céget tárol owner nélkül. Emiatt nem
definiálható, melyik tenant adminja férhet hozzá, melyik RLS/retention/törlési
policy vonatkozik rá, és hogyan lesz belőle üzleti ajánlat.

További contract drift:

- telefon validator max 50, DB max 20;
- edge/surface validator max 100, DB max 50;
- attachment darabszám nincs limitálva;
- az elfogadott attachment payloadot a handler nem perzisztálja és nem jelzi;
- endpoint nyers email címet logol warning/error/info szinten.

## Döntési pont

Minden publikus beérkezésnek explicit owner kell:

- `TenantOwned`: exact host/ingress channel egy tenant/space ID-ra oldódik;
- `PlatformOwnedLead`: külön platform-operator tenant/space, explicit triage és
  későbbi auditált átruházás;
- `Unknown`: fail-closed vagy karantén **PII perzisztálása nélkül**.

Az owner resolution nem kerülhet domain aggregate-be. A hosting/ingress boundary
hitelesített `PublicIngressContext` értéket ad az application commandnak.

## Megvalósítási feladatok

1. ADR-részben válaszd ki a fenti ownership módot minden publikus host/channelre.
2. Vezess be `PublicIngressContext` portot: canonical host/channel ID, owner tenant/
   space, locale, brand és notification policy; user body nem írhatja felül.
3. Konszolidáld az application flow-t egy canonical quote aggregate-re. A single-
   item DTO adapterezzen line item listára, ne tartson külön FSM-et/adattáblát.
4. Minden PII rekord kapjon owner ID-t, RLS-t, query-filtert, retention state-et és
   auditált export/törlés útvonalat.
5. Igazítsd egy forrásból a DTO/domain/DB maxhosszokat; generálj contract tesztet,
   amely a validator és EF metadata határértékeit összeveti.
6. Attachmenthez külön object-storage/quarantine port: darabszám-, összméret-,
   MIME magic-, vírusvizsgálat, opaque object key, retention és delete-on-failure.
   Amíg nincs implementálva, az API utasítsa el az `Attachments` mezőt, ne dobja el.
7. PII log helyett quote/correlation ID, outcome és redaktált diagnosztika.
8. Készíts idempotency keyt a public create útra; retry ne hozzon duplikált PII sort.
9. Migráld a meglévő owner nélküli rekordokat csak bizonyítható ingress metadata
   alapján; bizonytalan rekord karanténba kerül, nem tetszőleges tenantba.
10. Vezesd ki a duplikált endpointot deprecation headerrel és időablakkal.

## Kötelező tesztmátrix

- valid tenant-owned és platform-owned ingress;
- unknown/spoofolt host PII írás nélkül elutasított;
- más tenant list/read/update/delete `404` + DB RLS deny;
- validator max pontosan DB max, max+1 kontrollált `400`, nem `500`;
- attachment unsupported állapotban explicit `422`; támogatott állapotban count,
  aggregate size, MIME mismatch, malware és cleanup tesztek;
- public create idempotency és konkurens duplikáció;
- retention/export/delete audit más tenant adata nélkül;
- legacy endpoint deprecation és canonical flow equivalence.

## Elfogadási kritériumok

- [ ] Nincs owner nélküli publikus PII rekord.
- [ ] Egy canonical quote domain/FSM marad; a DTO-k csak ingress adapterek.
- [ ] Host/header/body nem írhatja felül a hiteles ingress ownershipot.
- [ ] Validator/domain/DB határok géppel konzisztensen ellenőrzöttek.
- [ ] Attachment soha nem vész el csendben és nem kerül vizsgálatlanul aktív tárba.
- [ ] RLS, retention, export és delete owner-szinten bizonyított.
- [ ] PII nincs alkalmazáslogban; idempotent create bizonyított.

## Stop / eszkaláció

- Ha nincs elfogadott platform-owned lead tulajdonos, az owner nélküli endpoint
  maradjon disabled.
- Ha attachment scanning/storage nincs kész, az API ne hirdessen attachment
  támogatást és ne fogadjon adatot.
