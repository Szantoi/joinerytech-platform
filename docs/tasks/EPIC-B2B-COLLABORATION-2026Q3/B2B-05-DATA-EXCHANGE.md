# B2B-05 — verziózott vállalatközi információcsere

- **Szerep:** backend
- **Prioritás:** P0
- **Státusz:** blocked
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

- [ ] Domain mutation és outbox írás atomikus.
- [ ] Duplicate delivery nem okoz második state change-et vagy auditot.
- [ ] Gap/out-of-order esemény quarantine/reconciliation állapotba kerül.
- [ ] Ismeretlen schema fail-closed, megfigyelhető hibával.
- [ ] Receiver csak participant policy szerint fér a payloadhoz/referenciához.
- [ ] Replay eredménye determinisztikus és auditált.
- [ ] Delivery/reconciliation metrics és runbook elkészült.
- [ ] Event contract compatibility suite zöld.

## Validáció

- outbox/inbox Testcontainers integration;
- process-kill/transaction rollback teszt;
- duplicate/out-of-order property teszt;
- schema downgrade és checksum tamper negatív teszt;
- telemetry smoke érzékeny adat nélküli loggal.

## Stop / eszkaláció

At-most-once feltételezés, payload logolása, néma schema-ignore vagy manuális DB
állapotjavítás elfogadhatatlan. Broker-választás csak akkor igényel ADR-t, ha a
meglévő outbox/inbox contracttal nem cserélhető adapterként.

## Végrehajtási napló

_Kitöltendő: schema, retry policy, fault-injection eredmény, metrics._

## Átadási bizonyíték

_Kitöltendő: event schema hash, replay verdict, tesztparancs/szám._

