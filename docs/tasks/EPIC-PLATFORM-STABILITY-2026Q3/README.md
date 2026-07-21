# EPIC-PLATFORM-STABILITY-2026Q3 — post-merge biztonság és determinisztikus kapuk

Az ADR-061/062 implementáció `4a58e48` alatt merge-elve lett. Ez az epic nem
újabb hosting-refaktor: a production-biztonsági bizonyítékokat, stabil tesztelést
és reprodukálható release-kaput zárja le.

## Sorrend és kioszthatóság

| Task | Szerep | Prioritás | Függőség | Párhuzamosítható |
|---|---|---:|---|---|
| [`STAB-RLS-PROOF`](STAB-RLS-PROOF.md) | backend/security | P0 | ADR-IMPL-HOSTING done | csak modul-lockkal |
| [`STAB-CUTTING-TENANT-RESOLVER`](STAB-CUTTING-TENANT-RESOLVER.md) | backend/security | P0 | nincs | Cutting modul-lock alatt, EHS/portal sávoktól külön |
| [`STAB-CUTTING-SECURITY-HARDENING`](STAB-CUTTING-SECURITY-HARDENING.md) | backend/security + infra | P0 | nincs | első boundary-csomag review alatt; további alsávok csak külön lockkal |
| [`STAB-CUTTING-CULTURE-INVARIANCE`](STAB-CUTTING-CULTURE-INVARIANCE.md) | backend/integration | P0 | nincs | Cutting modul-lock alatt, külön Pricing/OptiCut fájlok |
| [`STAB-CUTTING-SUBPROCESS-PORTABILITY`](STAB-CUTTING-SUBPROCESS-PORTABILITY.md) | backend/integration | P0 | nincs | Cutting tesztfájl, production sávtól külön |
| [`STAB-CUTTING-SUBPROCESS-BOUNDS`](STAB-CUTTING-SUBPROCESS-BOUNDS.md) | backend/security + infra | P0 | subprocess portability | ADR/spike után külön resilience lockkal |
| [`STAB-CUTTING-EMAIL-BOUNDARY`](STAB-CUTTING-EMAIL-BOUNDARY.md) | backend/integration | P0 | nincs | Cutting EmailService fájlok, más sávoktól külön |
| [`STAB-CUTTING-QUOTE-HARNESS`](STAB-CUTTING-QUOTE-HARNESS.md) | backend/security + integration | P0 | email boundary lokális | Quote API/command/repository + tesztfixture lock |
| [`STAB-CUTTING-QUOTE-NOTIFICATION-OUTBOX`](STAB-CUTTING-QUOTE-NOTIFICATION-OUTBOX.md) | backend/architecture + integration | P0 | quote harness | Quote/outbox kizárólagos lockkal |
| [`STAB-CUTTING-EMAIL-HARDENING`](STAB-CUTTING-EMAIL-HARDENING.md) | backend/security | P0 | email boundary | Outboxtól külön csomag/options/template sáv |
| [`STAB-EHS-INTEGRATION`](STAB-EHS-INTEGRATION.md) | backend | P0 | hosting merge | RLS-től külön, ha EHS persistence lock szabad |
| [`STAB-TESTCONTAINERS-HYGIENE`](STAB-TESTCONTAINERS-HYGIENE.md) | infra/backend | P0 | EHS fixture-döntés | FE-vel párhuzamos |
| [`STAB-FE-TEST-GATE`](STAB-FE-TEST-GATE.md) | frontend | P1 | portal lock | backend taskokkal párhuzamos |
| [`STAB-RELEASE-REPRO`](STAB-RELEASE-REPRO.md) | infra/monitor | P1 | előző négy | utolsó kapu |

## Epic stop condition

- nem-superuser RLS-bizonyíték a hét modern modulon;
- publikus Cutting subdomain tenantfeloldás célzott suite-ja zöld;
- Cutting pricing és vendor wire decimális formátuma hostkultúrától független;
- Cutting subprocess tesztkapu hordozható; output-, cancellation- és memória-cap
  szerződése bizonyított, nem csak deklarált;
- Cutting quote admin műveletek canonical claimmel és tenant + quote predikátummal
  fail-closed működnek; a teljes Cutting suite 0 hibás;
- Cutting internal API csak rotált secrettel hívható; traversal, SignalR claim drift,
  production default credential és runtime dependency advisory nincs;
- EHS integrációs suite legalább három egymást követő tiszta futása;
- megszakított és normál teszt után 0 új elárvult Testcontainers-konténer;
- gyors frontend PR-kapu és teljes suite dokumentált idő/memória-budgettel;
- tiszta clone/submodule, health és deploy-check reprodukálható scriptből.
