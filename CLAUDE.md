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
| EHS | ✅ | ✅ | ⚠️ CHANGES REQUESTED |
| DMS | ✅ | ✅ | ✅ APPROVED |

---

_JoineryTech Sziget — Faipar SaaS Platform_
