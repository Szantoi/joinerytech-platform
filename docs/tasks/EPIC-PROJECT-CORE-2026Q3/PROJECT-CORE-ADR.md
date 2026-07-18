# PROJECT-CORE-ADR — projekt-orchestration és B2B MVP döntése

- **Szerep:** architect/root
- **Prioritás:** P0
- **Státusz:** blocked (`PROJECT-BOUNDARY-AUDIT` eredményéig)
- **Függőség:** `PROJECT-BOUNDARY-AUDIT = done`
- **Mutációs határ:** `docs/knowledge/adr/`, ADR index, task/EPICS státusz
- **Tiltott scope:** implementáció, adatbázis-migráció, API vagy frontend kód

## Cél

Elfogadott ADR-ben dönteni arról, hogyan áll össze a JoineryTech Projects
élmény a meglévő Kernel FlowManagement, FlowEpic, StageChain és Handshake
képességeiből, és mi a B2BHandshake legkisebb biztonságos MVP-je.

## Kötelező döntési pontok

1. **Ownership:** Kernel/FlowManagement kiterjesztés, JoineryTech adapter/read
   context vagy új bounded context. A duplikált Project aggregate tiltott.
2. **Hierarchy:** Program/Project/Milestone/FlowEpic/Task ID-k és lifecycle
   tulajdonosa, referenciális szabályok.
3. **B2B MVP:** invite, accept, reject, revoke, delegated scope, proof/task
   láthatóság és audit. Minden állapothoz actor és authorization policy.
4. **Tenant boundary:** host/guest adatszelet, allowlist, RLS, JWT audience,
   cross-tenant query tilalmak.
5. **StageChain:** template ownership, tenant-config, versioning, futó FlowEpic
   migrációja template-váltáskor.
6. **Modulkapcsolat:** Sales, Kontrolling, Production, Warehouse, QA és DMS csak
   ID/port/event referencián; üzleti adat nem duplikálható.
7. **Read model:** actor-szűrt ugyanazon URL-es nézet, projekció rebuild és
   eventual consistency viselkedés.
8. **MVP stop condition:** mi fér az első vertical slice-ba, mi explicit későbbi.

## ADR kötelező szerkezete

- context és bizonyíték;
- döntési erők és nem-célok;
- legalább három opció;
- döntés és miért;
- domain/port/event ownership táblák;
- security/threat model;
- API és persistence magas szintű terv;
- migráció/kompatibilitás/rollback;
- tesztstratégia;
- következmények és elvetett alternatívák;
- implementációs task-bontás fájlhatárokkal.

## Elvárt implementációs task-kimenet

Elfogadás után, de nem ebben a taskban, legalább:

1. domain/adapter vertical slice;
2. B2B lifecycle + authorization;
3. actor-szűrt read projection;
4. API contract + OpenAPI;
5. Kontrolling project source adapter;
6. portal Projects API-first modul;
7. cross-tenant security és E2E kapu;
8. migration/deploy/observability.

## Elfogadási kritériumok

- [ ] Az ADR nem hoz létre duplikált Project/FlowEpic truth source-ot.
- [ ] B2B minden állapotához actor, guard és audit követelmény tartozik.
- [ ] Host és guest tenant láthatóság explicit, fail-closed.
- [ ] Moduladat ownership és port/event kapcsolat egyértelmű.
- [ ] MVP és non-goals mérhető.
- [ ] Root elfogadás után az implementációs taskok önállóan kiadhatók.

## Stop / eszkaláció

Ha az audit nem bizonyítja a meglévő modellek státuszát, az ADR nem fogadható
el. A bizonytalanságot új audit taskkal kell zárni, nem feltételezéssel.

## Végrehajtási napló

_Kitöltendő._

## Átadási bizonyíték

_Kitöltendő: ADR link, verdict, elutasított opciók, létrehozott taskok._

