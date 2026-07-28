# B2B_COLLABORATION_REAUDIT — a B2B-01..07 valós állapota (root, 2026-07-28)

- **Kiváltó ok:** a B2B-08 review keresztlelete (B2B-07 done hamis) + Gábor
  döntése: a Doorstar a kézfogásokon át integrálódjon az epic/task/projekt-
  rendszerbe (B2B-10) — ehhez ground truth kellett.
- **Módszer:** read-only kód-audit + a 30 teszt saját futtatása (mind zöld,
  1 s) az archivált task-ígéretek ellen. A modul 2731 sor C# (~1700 prod).
- **Egymondatos összkép:** jól megírt, zöld DOMAIN-MAG (a B2B-03 kifogástalan,
  a B2B-04 szolid), de application-réteg, API, host és valós integráció
  nélkül — és a B2B-02 biztonsági állítása technikailag mérésképtelen
  teszten alapult.

## Verdikt-tábla

| Task | Verdikt | Kulcs-bizonyíték |
|---|---|---|
| B2B-01 domain-kontraktus | RÉSZBEN | a doksi §3.2 a host/guest szerepeket FORDÍTVA írja, mint a kód és az ADR-068 §13; az Agreement-FSM kódban NEM létezik (CollaborationAgreement.cs: csak Create+AddGrant, a Status örökre Draft) |
| B2B-02 participant-RLS | **HAMIS** | a policy csak Host/GuestTenantId-t néz, a GRANT-tábla kimarad → visszavont grant után a guest DB-szinten továbbra is lát; a „proof" EF InMemory + kézi LINQ (RLS-t mérni képtelen); SEMMI nem állítja be app.current_tenant_id-t C#-ból; nincs collaboration séma |
| B2B-03 evidence | **IGAZ** | TermsCanonicalizer SHA-256 + tamper-guard + golden-tesztek; szépséghiba: egyetlen fél elfogadása Accepted-be billent (a doksi két felet ír) |
| B2B-04 work-state FSM | RÉSZBEN | a 7 átmenet + actor-guardok valósak; de RowVersion nem concurrency token, nincs ETag/idempotency (nincs application-réteg); Disputed állapothoz nincs átmenet |
| B2B-05 data-exchange | RÉSZBEN | envelope/outbox/inbox entitások + migráció valós (checksum, backoff, dedup-constraint); NINCS dispatcher, handler, reconciliation read-model, sequence-gap őr, replay |
| B2B-06 module-adapters | **HAMIS** | 4×8 soros interfész + 4 Dictionary-stub; nulla HTTP-kliens, nulla kernel-referencia; az „end-to-end adapterteszt" Dictionary round-trip |
| B2B-07 API/read-models | **HAMIS** (megerősítve) | 0 endpoint/OpenAPI/host; a read-model+policy fele él (AllowedActionsPolicy, ProjectionService attacker→null), de AgreementReadModel halott record |

## Kritikus szerkezeti hiány a kézfogás→projekt integrációhoz

- A DelegatedWorkPackage-en NINCS ProjectRef/FlowEpicId mező (táblában sem) —
  az ADR-068 §13 MVP 1. lépése („host FlowEpic-referenciájú munkacsomagot
  ajánl") a mai modellel strukturálisan megvalósíthatatlan.
- IProjectAdapter-t a domain sosem hívja; a kernel-oldalon a releváns
  végpontok készen állnak (GET /api/flow-epics/{id} a feloldáshoz; close/proof/
  advance-stage a visszavetítéshez; a PUT .../delegate deprecated shim — NEM
  ezt kell hívni).

## Eldöntendő ellentmondások (F0)

1. URL-prefix: ADR-068 `/api/collaborations/…` vs portál `/api/collaboration/…`.
2. `/dispute` + `/resolve-dispute`: a portál hívja, a domain nem tudja, az
   ADR MVP non-goal — ki vagy be.
3. B2B-01 doksi host/guest javítás a kód/ADR szerint.

## Fázisterv a Doorstar-pilotig (B2B-10 normatív terve)

| Fázis | Tartalom | Méret |
|---|---|---|
| F0 | contract-igazítás (3 döntés) + done-flagek rendezése | S |
| F1 | application-réteg: repository + MediatR handler-ek minden FSM-átmenetre + Agreement-FSM implementáció + DI | L |
| F2 | tenant-context interceptor + grant-alapú RLS-policy (migráció) + RowVersion concurrency + collaboration séma | M |
| F3 | SpaceOS.Collaboration.Api host (hosting-minta + RequireEnabledModule) + endpointok + Contracts-DTO-k + ETag/Idempotency | M |
| F4 | OpenAPI 3.1 artifact + drift-gate + Orval-kliens + portál mock→valós | M |
| F5 | ProjectRef mező+migráció + HttpProjectAdapter a kernel flow-epics-re | M |
| F6 | exchange-futómű: dispatcher, inbox-handler, reconciliation, replay | L |
| F7 | proof-suite: Testcontainers + non-superuser + 3-tenant + revoked-grant negatív + FSM Theory-mátrix + két-tenant e2e | M |
| F8 | hosting/infra: compose, port, migration-runner, health, CI | S |

**Kritikus út a pilotig: F0 → F1 → F2 → F3 → F5 → F7** (F4/F6 párhuzamos, F8 bármikor).

## Tanulság (a review-rezsimhez)

A 30 zöld teszt önmagában semmit nem mond a fedettségi körről — a B2B-02
„non-superuser 3-tenant RLS suite zöld" állítás úgy került archivált done-ba,
hogy a teszt-infrastruktúra (EF InMemory) elvileg képtelen RLS-t mérni. A
done-t kizárólag root-review állíthat szabály pont az ilyen ellen véd.
