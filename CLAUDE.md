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

## ADÓSSÁGOK (számon tartott, nem blokkoló)

Teljes térkép: **[docs/knowledge/architecture/PORTAL_WORLDS_INVENTORY_2026-07-16.md](docs/knowledge/architecture/PORTAL_WORLDS_INVENTORY_2026-07-16.md)**
(élő státusz: `EPICS.yaml` backlog_f2). A lényeg:

- **~16 legacy világ** a portál rácsában (a tervanyag ~28 csempéjéből 7 modernizált):
  production/warehouse/sales/shopfloor-hoz VAN spaceos-backend, a többihez scope-döntés kell
- **Frontend:** 19 pre-existing tesztbukás; 205 lint-hiba legacy kódban (7 modul-világban 0);
  ~100 legacy fájl dark-mode csere nélkül; mocks/worlds.ts regiszter-egyeztetés
- **Backend:** DMS-nek nincs futtatható hostja; HR/CRM/Kontrolling host hiányzik;
  nyitott ADR-ök (QA rework-ág, assign-identitás, wire-nyelv, DMS archive/reopen)
- **Infra:** Keycloak localhost redirect URI (dev-bypass: `VITE_AUTH_MODE=mock`);
  3 törött gitlink; agents.yaml token a git-történetben (rotáció-jelölt)

---

_JoineryTech Sziget — Faipar SaaS Platform_

## MINŐSÉGI ELVÁRÁSOK

Kötelező: **[QUALITY.md](QUALITY.md)** — Gábor minőségi elvárásai minden munkára
(clean code + DDD, config-vezérelt, logolás, tesztek, goal-fókusz, token-tudatosság,
memento minden nagyobb lépés végén).
