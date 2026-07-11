# Explorer Terminal Memory — Updated 2026-07-08

## ROLE & IDENTITY

**Primary Mission:** SpaceOS Knowledge Miner — Codebase exploration, pattern discovery, onboarding support

### Telegram Aliases
- explorer, felfedező, scout

### Responsibilities
- Codebase mapping (structure, dependencies, patterns)
- Chat history mining (solutions, problems, patterns)
- Daily summaries (terminal activity, git log analysis)
- Onboarding support (new terminal/session context)

---

## RESEARCH SOURCES

| Source | Location |
|--------|----------|
| Git history | `/opt/spaceos/.git` |
| Chat history | `~/.claude/projects/-opt-spaceos/*.jsonl` (~330 MB) |
| Codebase | `/opt/spaceos/` (7 terminals, 8 backend modules) |
| Mailbox | `/opt/spaceos/terminals/*/inbox/` and `.../outbox/` |
| Documentation | `/opt/spaceos/docs/knowledge/` |

---

## COMPLETED RESEARCH (2026-07)

### MSG-EXPLORER-013: Prototype → Production Gap Analysis
- **Output:** JoineryTech 8 world gap analysis
- **Findings:** 23 weeks, 1520 hours, €150k estimate
- **3 Migration Waves:** CRM/HR/Kontrolling → Maintenance/QA/EHS → DMS/AI

### MSG-EXPLORER-014: Memory & Task Audit
- **Output:** 21 memory files, 173 task files, 583 outbox messages audited
- **3-Phase Archival Plan:** Template cleanup → Inbox archival → Orphan cleanup
- **Created:** MSG-LIBRARIAN-001 for coordination

### MSG-EXPLORER-005: Skill Factory
- **Created Skills:**
  - `tmux-session-management` (340 lines, 8 patterns)
  - `mcp-tool-patterns` (380 lines, 6 categories)
  - `inbox-outbox-format` (420 lines, 5 message types)

### MSG-EXPLORER-008: Memory Discovery
- **Found:** 97 memory files across 4 storage levels
- **Indexing:** HOT/WARM/COLD tier recommendations

### MSG-EXPLORER-009: Design Tools Research
- **Findings:** Figma MCP, Playwright, Style Dictionary, Lighthouse

### MSG-EXPLORER-010: UX Pattern Research
- **Created Ideas:** KPI Card System, Kanban Real-Time, Bento Grid Layout

---

## SPACEOS ARCHITECTURE (2026-06-21)

- **7 terminals:** root, conductor, architect, librarian, explorer, backend, frontend, designer
- **Mailbox system:** Inbox/Outbox per terminal
- **Pipeline:** Nightwatch (*/2 min) → Plan-Scan (*/30 min) → Debate → Consensus
- **Dashboard:** `https://datahaven.joinerytech.hu`

---

## MCP API ENDPOINTS

- Session: `http://localhost:3456/api/session/*`
- Epic router: `http://localhost:3456/api/epic-router/*`
- Sessions: `http://localhost:3456/api/sessions/all`

---

## ANTI-PATTERNS (AVOID!)

**DO NOT add to this memory:**
- Full research reports (store in outbox)
- Session-by-session logs
- Detailed findings (summarize only)

**Memory should stay <25KB** — only research context and findings.

---

_Last Updated: 2026-07-08_
_Compressed by Librarian: Removed ~700 lines of session logs_

## DONE: MSG-EXPLORER-019 (2026-07-11T07:55:54.363Z)

4-sziget tudástár felfedezés kész — 150+ dokumentum kategorizálva (NEXUS, JOINERYTECH, DOORSTAR, SPACEOS szigetekhez)

---
