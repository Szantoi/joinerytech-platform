# B2B-07 — Collaboration OpenAPI és actor-szűrt read modellek

- **Szerep:** backend
- **Prioritás:** P0
- **Státusz:** blocked
- **Függőség:** `B2B-02 = done`, `B2B-03 = done`, `B2B-04 = done`,
  `B2B-05 = done`, `B2B-06 = done`
- **Kimenet:** versioned OpenAPI 3.1, endpointok, projections és generált kliens input

## Cél

Egy stabil, contract-first API-t adni, amely ugyanahhoz az agreementhez host és
guest számára jogosultság szerint eltérő, de eseménysorrendben konzisztens nézetet
szolgáltat.

## Minimum endpoint capability

- draft/revision create és detail;
- offer, accept, reject, withdraw és amendment/counter;
- work package accept/start/submit/request-changes/complete/cancel;
- incoming inbox, outgoing outbox és szűrés/paging;
- actor-filtered agreement/work-package detail;
- timeline és terms revision diff input;
- document/evidence attach reference;
- delivery/reconciliation állapot;
- capability/allowed-actions projection.

Az URL tenantazonosítót nem fogad bizalmi bemenetként. Minden mutation
`Idempotency-Key`, `If-Match`/ETag és pontos revision ID/hash szerződést kap.

## Megvalósítási scope

- OpenAPI 3.1 és hibakód-katalógus;
- endpoint/handler/validator;
- participant-scoped projections és projection rebuild;
- cursor pagination és stabil rendezés;
- event-to-read-model lag/consistency contract;
- Orval-generálhatóság és API drift gate;
- rate-limit/abuse és audit telemetry;
- migration/rollback és readiness.

## Mutációs határ

Collaboration API/application/read-model/contracts, generált kliens input és
célzott tesztek. A portál kézi DTO-ja nem hozható létre; UI a B2B-08.

## Elfogadási kritériumok

- [ ] OpenAPI minden command/state/hiba és concurrency header contractját leírja.
- [ ] Host és guest ugyanazon ID-n csak engedélyezett mezőket lát.
- [ ] `allowedActions` szerveroldali policyből származik, nem UI-találgatás.
- [ ] Attacker tenant nem tud existence-, count- vagy timing-szivárgást bizonyítani.
- [ ] Stale ETag/revision 409/412 szerződés szerint; duplicate idempotens.
- [ ] Projection rebuild azonos logikai eredményt ad.
- [ ] OpenAPI snapshot/drift és generált kliens build zöld.
- [ ] Endpoint integration, authz és paging tesztek zöldek.

## Validáció

- OpenAPI schema validation és breaking-change check;
- host/guest/attacker API integration;
- mutation concurrency/idempotency suite;
- projection rebuild/replay test;
- performance smoke reprezentatív inbox mérettel.

## Stop / eszkaláció

Kézzel kitalált frontend DTO, implicit tenant header, RLS-t megkerülő projection
vagy aktorfüggetlen teljes payload nem fogadható el.

## Végrehajtási napló

_Kitöltendő: endpointlista, contract diff, tesztek, performance eredmény._

## Átadási bizonyíték

_Kitöltendő: OpenAPI version/hash, generated client build, security verdict._

