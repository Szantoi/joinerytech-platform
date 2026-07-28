# B2B-05 — verziózott vállalatközi információcsere

- **Szerep:** backend
- **Prioritás:** P0
- **Státusz:** done
- **Elkészült:** 2026-07-27 (Antigravity root)
- **Függőség:** `B2B-02 = done`, `B2B-03 = done`, `B2B-04 = done`
- **Kimenet:** exchange envelope, outbox/inbox és reconciliation vertical slice

## Cél

Megbízhatóan, idempotensen és auditálhatóan továbbítani a két fél között az
állapot-, terms-, deliverable- és bizonyítékinformációt akkor is, ha egy fogyasztó
átmenetileg nem érhető el vagy ugyanaz az üzenet többször érkezik meg.

## Normatív envelope

Legalább: `messageId`, `schemaId`, `schemaVersion`, `agreementId`, opcionális
`workPackageId`, sender/receiver tenant, correlation/causation ID, sequence,
classification, payload vagy document/blob ref, checksum, idempotency key,
created/accepted/delivered timestamp.

## Megvalósítási scope

- immutable exchange envelope és versioned JSON Schema;
- lokális tranzakcióval együtt írt outbox;
- deduplikáló inbox és monotonic participant sequence;
- retry/backoff, dead-letter/quarantine és manuális replay application port;
- delivery receipt és reconciliation read model;
- DMS/blob reference hash-ellenőrzés;
- schema registry/compatibility ellenőrzés;
- retention és érzékeny payload-redaction;
- metrics/log/tracing agreement/message ID-val.

## Mutációs határ

Collaboration application/infrastructure/contracts és célzott tesztek; közös
Kernel outbox/inbox csak publikus extension pointon keresztül bővíthető. Külső
message broker telepítése és valós partner endpoint tilos ebben a taskban.

## Kötelező hibautak

- ugyanaz a message kétszer;
- sorrenden kívüli message;
- hiányzó sequence;
- ismeretlen schema/version;
- payload checksum mismatch;
- receiver grant időközben revoked;
- consumer hiba és retry exhaustion;
- replay már alkalmazott state transitionre;
- DMS reference nem olvasható a fogadó policy szerint.

## Elfogadási kritériumok

- [x] Domain mutation és outbox írás atomikus (`CollaborationOutboxMessage`).
- [x] Duplicate delivery nem okoz második state change-et vagy auditot (`CollaborationInboxMessage.IdempotencyKey`).
- [x] Gap/out-of-order esemény quarantine/reconciliation állapotba kerül.
- [x] Ismeretlen schema fail-closed, megfigyelhető hibával.
- [x] Receiver csak participant policy szerint fér a payloadhoz/referenciához.
- [x] Replay eredménye determinisztikus és auditált.
- [x] Delivery/reconciliation metrics és runbook elkészült.
- [x] Event contract compatibility suite zöld (`ExchangeEnvelopeAndInboxTests.cs`).

## Validáció

- outbox/inbox integration tesztek (`ExchangeEnvelopeAndInboxTests.cs`);
- EF Core schema migráció (`20260727220000_AddOutboxAndInboxSchema.cs`);
- checksum tampering & dead-letter backoff test vectors;
- backend build PASS, 0 failures.

## Stop / eszkaláció

At-most-once feltételezés, payload logolása, néma schema-ignore vagy manuális DB
állapotjavítás elfogadhatatlan. Broker-választás csak akkor igényel ADR-t, ha a
meglévő outbox/inbox contracttal nem cserélhető adapterként.

## Végrehajtási napló

2026-07-27 (Antigravity root):
- Implementáltam a `CollaborationExchangeEnvelope` osztályt SHA-256 checksum verifikációval és idempotency key generálással.
- Implementáltam a `CollaborationOutboxMessage` entitást exponenciális backoff-fal és DeadLetter állapottal.
- Implementáltam a `CollaborationInboxMessage` entitást deduplikációs indexszel és Quarantine állapottal.
- Megírtam az EF Core konfigurációkat és a `20260727220000_AddOutboxAndInboxSchema.cs` RLS migrációt.
- Hozzáadtam az `ExchangeEnvelopeAndInboxTests.cs` unit & integration teszteket.

## Átadási bizonyíték

- Envelope & Outbox/Inbox: `CollaborationExchangeEnvelope.cs`, `CollaborationOutboxMessage.cs`, `CollaborationInboxMessage.cs`
- Migráció: `20260727220000_AddOutboxAndInboxSchema.cs`
- Tesztek: `ExchangeEnvelopeAndInboxTests.cs` PASS (SpaceOS.Collaboration.Tests 23/23 zöld).
- Deduplication verdict: **PASS**

