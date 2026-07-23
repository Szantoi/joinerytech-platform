# EPIC-PLATFORM-STABILITY-2026Q3 — post-merge biztonság és determinisztikus kapuk

Az ADR-061/062 implementáció `4a58e48` alatt merge-elve lett. Ez az epic nem
újabb hosting-refaktor: a production-biztonsági bizonyítékokat, stabil tesztelést
és reprodukálható release-kaput zárja le.

> **Aktuális, working-tree-szintű állapot:**
> [`PROJECT_STATE_CHECKPOINT_2026-07-23.md`](../../knowledge/architecture/PROJECT_STATE_CHECKPOINT_2026-07-23.md).
> Az auditkapu vagy egy rész-szelet `APPROVED` állapota nem jelenti automatikusan
> a dependency-remediation, credential-rotáció vagy production rollout zárását.

## Sorrend és kioszthatóság

| Task | Szerep | Prioritás | Függőség | Párhuzamosítható |
|---|---|---:|---|---|
| [`STAB-CUTTING-EDGE-PROXY-INCIDENT`](STAB-CUTTING-EDGE-PROXY-INCIDENT.md) | infra + backend/security | **P0 incident** | nincs | elsőként; éles edge emberi kapuval |
| [`STAB-NEXUS-CREDENTIAL-RBAC`](STAB-NEXUS-CREDENTIAL-RBAC.md) | security + Nexus + infra | **P0 incident** | nincs | Cuttingtól külön repo-sáv; rotáció emberi kapuval |
| [`STAB-RLS-PROOF`](STAB-RLS-PROOF.md) | backend/security | P0 | ADR-IMPL-HOSTING done | csak modul-lockkal |
| [`STAB-CUTTING-TENANT-RESOLVER`](STAB-CUTTING-TENANT-RESOLVER.md) | backend/security | P0 | nincs | Cutting modul-lock alatt, EHS/portal sávoktól külön |
| [`STAB-CUTTING-SECURITY-HARDENING`](STAB-CUTTING-SECURITY-HARDENING.md) | backend/security + infra | P0 | nincs | első boundary-csomag review alatt; további alsávok csak külön lockkal |
| [`STAB-CUTTING-PUBLIC-CAPABILITY`](STAB-CUTTING-PUBLIC-CAPABILITY.md) | backend/security + domain | P0 | edge containment | quote persistence/API lock; outboxszal contract-egyeztetés |
| [`STAB-CUTTING-PUBLIC-QUOTE-OWNERSHIP`](STAB-CUTTING-PUBLIC-QUOTE-OWNERSHIP.md) | domain + backend/security + privacy | P0 | trusted host resolver | public quote schema/API kizárólagos lock |
| [`STAB-CUTTING-ADAPTER-ACTIVATION-GATE`](STAB-CUTTING-ADAPTER-ACTIVATION-GATE.md) | backend/security + infra | P0 | subprocess bounds + secret provider | adapter config/transport kizárólagos lock |
| [`STAB-CUTTING-CULTURE-INVARIANCE`](STAB-CUTTING-CULTURE-INVARIANCE.md) | backend/integration | P0 | nincs | Cutting modul-lock alatt, külön Pricing/OptiCut fájlok |
| [`STAB-CUTTING-SUBPROCESS-PORTABILITY`](STAB-CUTTING-SUBPROCESS-PORTABILITY.md) | backend/integration | P0 | nincs | Cutting tesztfájl, production sávtól külön |
| [`STAB-CUTTING-SUBPROCESS-BOUNDS`](STAB-CUTTING-SUBPROCESS-BOUNDS.md) | backend/security + infra | P0 | subprocess portability | ADR/spike után külön resilience lockkal |
| [`STAB-CUTTING-EMAIL-BOUNDARY`](STAB-CUTTING-EMAIL-BOUNDARY.md) | backend/integration | P0 | nincs | Cutting EmailService fájlok, más sávoktól külön |
| [`STAB-CUTTING-QUOTE-HARNESS`](STAB-CUTTING-QUOTE-HARNESS.md) | backend/security + integration | P0 | email boundary lokális | Quote API/command/repository + tesztfixture lock |
| [`STAB-CUTTING-QUOTE-NOTIFICATION-OUTBOX`](STAB-CUTTING-QUOTE-NOTIFICATION-OUTBOX.md) | backend/architecture + integration | P0 | quote harness | Quote/outbox kizárólagos lockkal |
| [`STAB-CUTTING-EMAIL-HARDENING`](STAB-CUTTING-EMAIL-HARDENING.md) | backend/security | P0 | email boundary | Outboxtól külön csomag/options/template sáv |
| [`STAB-EHS-INTEGRATION`](STAB-EHS-INTEGRATION.md) | backend | P0 | hosting merge | RLS-től külön, ha EHS persistence lock szabad |
| [`STAB-EHS-DEPENDENCY-ADVISORIES`](STAB-EHS-DEPENDENCY-ADVISORIES.md) | backend/security + platform | **P0 security** | nincs | S0 EHS-only; S1 shared Hosting lock; S2 EHS mapping lock |
| [`STAB-PLATFORM-ASPNET22-RCE-REMOVAL`](STAB-PLATFORM-ASPNET22-RCE-REMOVAL.md) | backend/security + federation | **P0 security** | EHS S0 minta kész | modulonként külön gitlink/repo lock |
| [`STAB-PLATFORM-NUGET-HIGH-ADVISORIES`](STAB-PLATFORM-NUGET-HIGH-ADVISORIES.md) | backend/security + federation | **P0 security** | audit-baseline kész | csomagcsaládonként és repo-owner lockkal |
| [`STAB-TESTCONTAINERS-HYGIENE`](STAB-TESTCONTAINERS-HYGIENE.md) | infra/backend | P0 | EHS fixture-döntés | FE-vel párhuzamos |
| [`STAB-FE-TEST-GATE`](STAB-FE-TEST-GATE.md) | frontend | P1 | portal lock | backend taskokkal párhuzamos |
| [`STAB-RELEASE-REPRO`](STAB-RELEASE-REPRO.md) | infra/monitor | P1 | előző négy | utolsó kapu |

## Epic stop condition

- az Internet felől a Cutting internal namespace upstream nélkül zárt, a backend
  pedig rotált service credentialdel fail-closed;
- Nexusban nincs követett működő credential, az összes régi token rotált, az MCP
  jogosultsági default `none`, és nincs policy nélküli tool;
- nem-superuser RLS-bizonyíték a hét modern modulon;
- publikus Cutting subdomain tenantfeloldás célzott suite-ja zöld;
- Cutting pricing és vendor wire decimális formátuma hostkultúrától független;
- Cutting subprocess tesztkapu hordozható; output-, cancellation- és memória-cap
  szerződése bizonyított, nem csak deklarált;
- Cutting quote admin műveletek canonical claimmel és tenant + quote predikátummal
  fail-closed működnek; a teljes Cutting suite 0 hibás;
- Cutting internal API csak rotált secrettel hívható; traversal, SignalR claim drift,
  production default credential és runtime dependency advisory nincs;
- publikus tenantot kliens-header nem választhat; read/action capability és
  digitális acceptance evidence külön, replaybiztos szerződés;
- külső Cutting adapter csak teljes config/secret/CLI/REST/file conformance után
  engedélyezhető; tenant input nem választ executable-t vagy hostot;
- EHS integrációs suite legalább három egymást követő tiszta futása;
- EHS API/Application és shared Hosting NuGet gráfban 0 critical/high advisory;
- minden release-elt platform-host runtime NuGet gráfjában 0 critical/high
  advisory; tesztgráfban magas finding csak dokumentált, időkorlátos upstream
  kivétellel maradhat;
- megszakított és normál teszt után 0 új elárvult Testcontainers-konténer;
- gyors frontend PR-kapu és teljes suite dokumentált idő/memória-budgettel;
- tiszta clone/submodule, health és deploy-check reprodukálható scriptből.
