# EPIC-B2B-COLLABORATION-2026Q3 — vállalatközi kézfogás és munkamegosztás

> **Stratégiai alap:**
> [`SPACEOS_B2B_HANDSHAKE_ARCHITECTURE_2026-07-21.md`](../../knowledge/architecture/SPACEOS_B2B_HANDSHAKE_ARCHITECTURE_2026-07-21.md)  
> **Előfeltétel:** a `PROJECT-CORE-ADR` elfogadott ownership-döntése  
> **Cél:** két vállalat között biztonságosan kezelhető, auditálható megállapodás,
> delegált munkacsomag és verziózott információcsere.

## Végrehajtási elv

A kézfogás platformprotokoll. JoineryTech/SpaceOS birtokolja a domén-, security-,
API-, event- és UI-contractot; a Doorstar csak publikált verziót fogyaszt és
pilotban bizonyítja az instance-szintű alkalmazhatóságot.

Az első implementáció előtt kötelező feloldani a jelenlegi eltérést a Kernelbe
ágyazott `B2BHandshake`, a nem használt Handshake absztrakciók, a guestet kizáró
RLS és a Procurement `SubcontractOrder` között. Újabb párhuzamos lifecycle vagy
globális tenant-filter kivétel nem készülhet.

## Feladatok

| Task | Szerep | Függőség | Eredmény |
|---|---|---|---|
| [`B2B-01`](B2B-01-DOMAIN-CONTRACT.md) | architect/backend | PROJECT-CORE-ADR | normatív domén- és actor/FSM szerződés |
| [`B2B-02`](B2B-02-PARTICIPANT-RLS.md) | backend/security | B2B-01, STAB-RLS-PROOF | participant grant + fail-closed RLS |
| [`B2B-03`](B2B-03-AGREEMENT-EVIDENCE.md) | backend/security | B2B-01 | immutable terms, hash, elfogadási audit |
| [`B2B-04`](B2B-04-WORK-STATE-PROTOCOL.md) | backend | B2B-01 | delegált munkacsomag FSM és actor policy |
| [`B2B-05`](B2B-05-DATA-EXCHANGE.md) | backend | B2B-02/03/04 | envelope, outbox/inbox, replay/idempotencia |
| [`B2B-06`](B2B-06-MODULE-ADAPTERS.md) | backend/architect | B2B-01/03/04, ERPSEP-03 | Project, Procurement, CRM, DMS, QA adapterek |
| [`B2B-07`](B2B-07-API-READMODELS.md) | backend | B2B-02..06 | OpenAPI, actor-nézet, inbox/outbox API |
| [`B2B-08`](B2B-08-PORTAL-UI.md) | frontend/designer | B2B-07, MODULE-PACKAGES | kétoldalú Collaboration UI |
| [`B2B-09`](B2B-09-CONFORMANCE.md) | QA/security | B2B-07/08 | security, contract és E2E release-kapu |

## Függőségi térkép

```text
PROJECT-CORE-ADR
       |
       v
     B2B-01
     / | \
    v  v  v
B2B-02 B2B-03 B2B-04
    \    |    /
       B2B-05
    \    |    /
       B2B-06 <── ERPSEP-03
          |
          v
        B2B-07
          |
          v
        B2B-08 <── MODULE-PACKAGES
          |
          v
        B2B-09 ──> Doorstar DSCONV-GATE-HANDSHAKE
```

## Közös, nem tárgyalható követelmények

- `QUALITY.md`, DDD, config-driven policy, strukturált log és memento.
- Tenant ID request bodyból/headerből nem válhat bizalmi gyökérré.
- RLS-bizonyíték nem-superuser DB-szereppel és legalább három tenanttal fut.
- Minden mutation actor-, state-, revision- és concurrency-guardolt.
- Elfogadott terms revision nem módosítható; amendment új revision.
- OpenAPI és event schema a source of truth; frontend generált klienst használ.
- Cross-module kapcsolat semleges referencián/porton/eventen történik.
- Ismeretlen schema, state vagy capability fail-closed.
- Nincs minősített elektronikus aláírásra vagy jogi kikényszeríthetőségre vonatkozó
  termékállítás külön compliance döntés nélkül.

## Közös stop / eszkaláció

- Ha a `PROJECT-CORE-ADR` nem Accepted, B2B implementáció nem indulhat.
- Ha a participant RLS csak globális tenant-filter kikapcsolásával oldható meg,
  a task megáll és új security ADR szükséges.
- Ha a Procurement vagy CRM második source of truthot igényelne, ownership
  döntésre kell eszkalálni.
- Ha a terms canonicalization nem determinisztikus két független futtatásban,
  elfogadás és release tilos.
- Külső signing/timestamp provider, éles partner vagy valós szerződés tesztelése
  külön emberi és jogi kapu.

## Epic Definition of Done

- B2B-01..09 minden acceptance criteriona bizonyított;
- host, guest és támadó tenant end-to-end tesztje zöld;
- revision hash és eseménysorrend mindkét fél nézetében egyezik;
- OpenAPI/event schema, package version és artifact hash publikált;
- Doorstar gate pontos contract-verzióval feloldható;
- rollback, replay, reconciliation és observability runbook elkészült.

