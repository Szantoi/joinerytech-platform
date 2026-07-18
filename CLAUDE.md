# CLAUDE.md — JoineryTech Sziget (Platform)

> A JoineryTech sziget az **általános faipar SaaS platform**.
> 7 modul (CRM, Kontrolling, HR, Maintenance, QA, EHS, DMS) fejlesztése és karbantartása.

---

## SZIGET IDENTITY

**Név:** JoineryTech
**Szerep:** Faipar SaaS Platform Development
**Port range:** 3458-3459
**tmux prefix:** jt-

---

## FELELŐSSÉGI KÖR

| Modul | Leírás |
|-------|--------|
| CRM | Lead → Opportunity → Quote → Order pipeline |
| Kontrolling | Cost tracking, EAC, Variance analysis |
| HR | Training, Competency, Certification |
| Maintenance | Asset management, Work orders |
| QA | Inspection, Defect tracking |
| EHS | Incident reporting, Risk assessment |
| DMS | Document management, Versioning |

---

## TERMINÁLOK

| Terminál | Szerep |
|----------|--------|
| **root** | Platform stratégia, modul prioritizálás |
| **conductor** | Feladatkiosztás, sprint koordináció |
| **monitor** | Health-monitoring, eszkaláció-figyelés |
| **backend** | .NET 8 + Node.js backend fejlesztés |
| **frontend** | React 18 + TypeScript UI fejlesztés |
| **designer** | UI/UX review, design system |

---

## TECH STACK

**Backend:**
- .NET 8 (Kernel, Modules)
- Node.js 22 (Orchestrator)
- PostgreSQL + RLS

**Frontend:**
- React 18
- TypeScript 5.x
- TailwindCSS
- Orval (OpenAPI codegen)

---

## KAPCSOLAT MÁS SZIGETEKKEL

```
Nexus (infra)
    │
    │ stable release
    ▼
JoineryTech (platform) ◄─── általános modulok
    │
    │ platform release
    ▼
Doorstar (ügyfél) ◄─── specifikus testreszabás
```

**Federation inbox:** `terminals/federation/inbox/`
**Federation outbox:** `terminals/federation/outbox/`

---

## SERVICES

| Service | Port | Leírás |
|---------|------|--------|
| Knowledge Service | 3458 | MCP API (frozen) |
| Datahaven Web | 3459 | Dashboard |

---

## 7 MODUL STÁTUSZ

| Modul | Backend | Frontend | UI Review |
|-------|---------|----------|-----------|
| CRM | ✅ | ✅ | ✅ APPROVED |
| Kontrolling | ✅ | ✅ | ✅ APPROVED |
| HR | ✅ | ✅ | ✅ APPROVED |
| Maintenance | ✅ | ✅ | ✅ APPROVED |
| QA | ✅ | ✅ | ✅ APPROVED |
| EHS | ✅ | ✅ | ✅ APPROVED |
| DMS | ✅ | ✅ | ✅ APPROVED |

Release: portal **v1.0.0** + platform **v0.2.0** (2026-07-16, EPIC-UI-PORTAL-2026Q3 CLOSED).

---

## VPS-HOZZÁFÉRÉS (deploy)

SSH-alias: `joinerytech-vps` (a `~/.ssh/config`-ban), kulcs: `~/.ssh/joinerytech_deploy_key`
(dedikált deploy-kulcs, külön visszavonható). VPS: 109.122.222.198 (Debian 13), user `gabor`,
passwordless sudo. Tailnet: 100.82.133.87. Távoli parancs: `ssh joinerytech-vps '<parancs>'`.

**Nexus MCP tunnel** (a 3458 innen jön): `ssh -N -f -L 3458:localhost:3458 joinerytech-vps`

**Deploy-célok:** platform `/opt/joinerytech`, portal `/opt/joinerytech/src/joinerytech-portal`
(a VPS-nek van GitHub SSH-hozzáférése → `git pull` közvetlenül megy).

Deploy után **mindig** ellenőrizd, hogy az új kód fut: `ssh joinerytech-vps 'sudo ss -tlnp | grep <port>'`
— a PID egyezzen a service MainPID-jével (bennragadt régi processz csendben tovább szolgálhat ki).

> ✅ **VPS megjavítva (2026-07-16): mind a 11 spaceos-service fut** — történet + repair-log:
> [docs/knowledge/architecture/VPS_SERVICE_STATE_2026-07-16.md](docs/knowledge/architecture/VPS_SERVICE_STATE_2026-07-16.md)
> Ismert maradvány: a futó inventory-publish régebbi a develop-pinnél (redeploy-jelölt, WORLDS_API_CONTRACTS).

---

## ÁLLAPOT (2026-07-18) + ADÓSSÁGOK

**Az „első kör" lezárva:** 7/7 modul APPROVED, portal v1.0.0 + platform v0.2.0 release,
dark mode a design-system spec szerint, **mind a 7 modul mögött futtatható backend-host**,
0 tesztbukás (1432 zöld). **ADR-059..064 ELFOGADVA** (docs/knowledge/adr/).
Végrehajtás: ADR-060 (HR-taxonómia), ADR-063 (QA-rework) és **ADR-061/062 (hosting-csomag:
src/spaceos-modules-hosting — közös Keycloak-auth + tenant a JWT-ből + RLS-baseline mind a
7 modulon, qa.tickets migráció pótolva) KÉSZ**; következik: ADR-059 EnumWireMap →
portál MSW→API élesítés (wave 2) → ADR-064 részletek.
**EPIC-UI-WORLDS-2026Q3 fut (API-first):** WORLDS-API-AUDIT kész
(WORLDS_API_CONTRACTS_2026-07-18.md), production/warehouse FE következik.
**VPS: mind a 11 spaceos-service fut** (VPS_SERVICE_STATE_2026-07-16.md).
**Program-pillanatkép:** PROJECT_STATE_ASSESSMENT_2026-07-18.md (Codex-felmérés — G0-G6
programkapuk, projekt/B2BHandshake bounded-context irány).
**Task-archívum konvenció (Gábor):** kész taskok → `docs/tasks/<EPIC>/archive/`.

Teljes térkép: **[docs/knowledge/architecture/PORTAL_WORLDS_INVENTORY_2026-07-16.md](docs/knowledge/architecture/PORTAL_WORLDS_INVENTORY_2026-07-16.md)**
(élő státusz: `EPICS.yaml` backlog_f2). Nyitott adósságok:

- **~16 legacy világ** a portál rácsában (a tervanyag ~28 csempéjéből 7 modernizált):
  production/warehouse/sales/shopfloor-hoz VAN spaceos-backend, a többihez scope-döntés kell
  → javasolt következő epic: EPIC-UI-WORLDS
- **Frontend:** 205 lint-hiba legacy kódban (7 modul-világban 0); ~100 legacy fájl dark-mode
  csere nélkül; mocks/worlds.ts regiszter-egyeztetés; MODULE-PACKAGES (npm workspace) pending
- **Backend:** deploy-blokkolók a hosting-körben zárulnak (X-Tenant-Id hitelesítetlen header,
  EHS/QA néma RLS-catch, CRM-host auth) — élesítés CSAK utána; qa.tickets migráció pótlása fut
- **Infra:** Keycloak localhost redirect URI (dev-bypass: `VITE_AUTH_MODE=mock` a .env.local-ban);
  3 törött gitlink (sales repo GitHubon nem létezik → NuGet-fixe csak VPS-lokális);
  agents.yaml token a git-történetben (rotáció-jelölt); kernel/orchestrator /health route hiánya
- **Tudás:** a SpaceOS-alapminták kötelező forrás backend-infra munkához —
  docs/knowledge/patterns/DATABASE_PATTERNS.md + architecture/ADR_CATALOGUE.md + Nexus RAG
  (`search_knowledge`); VPS terminál-memóriák pillanatképe: docs/knowledge/vps-terminal-tudastar/

---

_JoineryTech Sziget — Faipar SaaS Platform_

## MINŐSÉGI ELVÁRÁSOK

Kötelező: **[QUALITY.md](QUALITY.md)** — Gábor minőségi elvárásai minden munkára
(clean code + DDD, config-vezérelt, logolás, tesztek, goal-fókusz, token-tudatosság,
memento minden nagyobb lépés végén).
