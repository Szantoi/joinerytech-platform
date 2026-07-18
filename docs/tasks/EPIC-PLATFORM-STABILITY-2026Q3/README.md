# EPIC-PLATFORM-STABILITY-2026Q3 — post-merge biztonság és determinisztikus kapuk

Az ADR-061/062 implementáció `4a58e48` alatt merge-elve lett. Ez az epic nem
újabb hosting-refaktor: a production-biztonsági bizonyítékokat, stabil tesztelést
és reprodukálható release-kaput zárja le.

## Sorrend és kioszthatóság

| Task | Szerep | Prioritás | Függőség | Párhuzamosítható |
|---|---|---:|---|---|
| [`STAB-RLS-PROOF`](STAB-RLS-PROOF.md) | backend/security | P0 | ADR-IMPL-HOSTING done | csak modul-lockkal |
| [`STAB-EHS-INTEGRATION`](STAB-EHS-INTEGRATION.md) | backend | P0 | hosting merge | RLS-től külön, ha EHS persistence lock szabad |
| [`STAB-TESTCONTAINERS-HYGIENE`](STAB-TESTCONTAINERS-HYGIENE.md) | infra/backend | P0 | EHS fixture-döntés | FE-vel párhuzamos |
| [`STAB-FE-TEST-GATE`](STAB-FE-TEST-GATE.md) | frontend | P1 | portal lock | backend taskokkal párhuzamos |
| [`STAB-RELEASE-REPRO`](STAB-RELEASE-REPRO.md) | infra/monitor | P1 | előző négy | utolsó kapu |

## Epic stop condition

- nem-superuser RLS-bizonyíték a hét modern modulon;
- EHS integrációs suite legalább három egymást követő tiszta futása;
- megszakított és normál teszt után 0 új elárvult Testcontainers-konténer;
- gyors frontend PR-kapu és teljes suite dokumentált idő/memória-budgettel;
- tiszta clone/submodule, health és deploy-check reprodukálható scriptből.

