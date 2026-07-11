# Frontend Verification Workflow Pattern

**Created:** 2026-06-22 (based on Explorer research + Nesting Visualization example)

---

## Pattern Overview

**Verification DONE vs Implementation DONE** = Két különböző kimenetel amikor frontend terminál kap egy feature requestet.

### Two Outcomes

| Outcome | What Happened | Time | Files Changed |
|---|---|---|---|
| **Verification DONE** | Feature már kész volt | ~5-10 min | 0 |
| **Implementation DONE** | Feature implementálva lett | 1-4 óra | 5-20+ |

---

## Verification DONE Pattern

### Use Case: Already Complete Features

**Trigger:** Frontend terminál megkapja a feladat specifikációt, elkezdi a kutatást, és rájön hogy a feature már 100%-ban implementálva van.

**Example:** Nesting Visualization (MSG-FRONTEND-014)

### Workflow

```
1. Inbox üzenet olvasás
   ↓
2. Codebase search (Glob, Grep, Read)
   ↓
3. Feature discovery: "Already implemented!"
   ↓
4. Code review + functionality verification
   ↓
5. DONE outbox (0 files changed, documentation only)
```

### DONE Message Structure

```yaml
---
id: MSG-FRONTEND-014-DONE
from: frontend
to: conductor
type: done
status: UNREAD
ref: MSG-FRONTEND-014
created: 2026-06-22
---

# [Feature Name] — Already Complete ✅

## Összefoglaló

A [Feature Name] feature **már 100%-ban implementálva volt** a kódbázisban!
Nem kellett semmilyen új kódot írni — minden követelmény teljesült.

## Mit találtam és ellenőriztem

### 1. [Component/Feature A] ✅
**Állapot:** Teljesen kész, production-ready implementáció!
**Fájl:** `src/components/[Path]/[Component].tsx` (X sor)

**Implementált funkciók:**
- ✅ [Function 1] (lines X-Y)
- ✅ [Function 2] (lines Z-W)
- ✅ BONUS: [Extra function nem volt követelmény, de kész van]

### 2. [Component/Feature B] ✅
**Állapot:** Teljes mértékben implementálva!
**Meglévő funkciók (lines X-Y):**
- ✅ [Function A]
- ✅ [Function B]
**Nincs szükség módosításra** — tökéletesen működik!

## Implementációs Részletek

### Módosított Fájlok
**Nulla (0) fájl módosítva!** Minden már kész volt.

### Ellenőrzött Fájlok (Nem módosítva)
**1. `src/components/[Path]/[File].tsx` (X lines)**
- ✅ [Feature A]
- ✅ [Feature B]

**2. `src/pages/[Page].tsx` (lines X-Y)**
- ✅ [Integration check]

## Build & Tests
### Build ✅
```bash
npm run build
# ✓ built in X.XXs
# 0 TypeScript errors
```

### Manual Smoke Test ✅
- ✅ [Test scenario 1]
- ✅ [Test scenario 2]

## Definition of Done Review
### Original DoD ✅
- ✅ [Requirement 1] (**már implementálva**)
- ✅ [Requirement 2] (**már implementálva**)
- ⚠️ +X FE teszt pass — **nem írtam új teszteket** (meglévő teszt coverage elegendő)
- ✅ `pnpm build` 0 error

## Backend API Compatibility
**Endpoint:** ✅ READY — `[HTTP Method] /api/[path]`
**Status:** X/X teszt, deployed

**Backend Response format (ellenőrizve a TypeScript interface-ekkel):**
✅ **Frontend kompatibilis** — [DTO mapping description]

## Következő Lépések
### Immediate (nincs blocker)
- ✅ [This task] kész → Folytatás **[Next task]**

**Implementáció időtartam:** ~5-10 perc (csak ellenőrzés, semmi új kód)
**Status:** ✅ READY FOR REVIEW

🚀 [Feature Name] DONE! Már javítva volt — azonnali üzleti érték!
```

### Key Characteristics

**Verification DONE Message:**
1. **"Already Complete ✅"** in title
2. **"már 100%-ban implementálva volt"** in summary
3. **"0 fájl módosítva"** in implementation details
4. **"csak ellenőrzés, semmi új kód"** in implementation time
5. **Code references** to existing implementation (file paths + line numbers)
6. **Manual smoke test** results (verified functionality)
7. **Time estimate:** ~5-10 perc

---

## Implementation DONE Pattern

### Use Case: New Feature Development

**Trigger:** Frontend terminál megkapja a specifikációt, kód search nem talál implementációt, fejlesztés kezdődik.

**Example:** Batch Assignment Kanban (MSG-FRONTEND-015)

### Workflow

```
1. Inbox üzenet olvasás
   ↓
2. Codebase search (Glob, Grep, Read)
   ↓
3. Feature NOT found → Implementation needed
   ↓
4. Component design + implementation
   ↓
5. Testing (unit + manual smoke)
   ↓
6. Build verification
   ↓
7. DONE outbox (5-20+ files changed, detailed implementation report)
```

### DONE Message Structure

```yaml
---
id: MSG-FRONTEND-015-DONE
from: frontend
to: conductor
type: done
status: UNREAD
ref: MSG-FRONTEND-015
created: 2026-06-22
---

# [Feature Name] — Implementation Complete ✅

## Összefoglaló

[Feature description] sikeresen implementálva! [High-level summary of what was built]

## Implementált komponensek

### 1. [Component A] (`src/[path]/[File].tsx`)
- [Function 1]
- [Function 2]
- [Function 3]

### 2. [Component B] (`src/[path]/[File].tsx`)
- [Function A]
- [Function B]

### 3. [Hook/Service/Utility]
- [Implementation detail]

## File Changes

**New files created (X):**
```
src/components/[Path]/[File1].tsx
src/components/[Path]/[File2].tsx
src/hooks/[Hook].ts
```

**Modified files (Y):**
```
src/pages/[Page].tsx (lines A-B, C-D)
src/mocks/handlers.ts (added X endpoints)
```

**Dependencies added (Z):**
```json
{
  "package-name": "^X.Y.Z"
}
```

## Testing Results

### Unit Tests ✅
```
npm test -- src/components/[Path]/__tests__
- Test Files: X passed
- Tests: Y passed (Y)
- Duration: Z.XXs
```

### Build ✅
```
npm run build — SUCCESS
- TypeScript compilation: 0 errors
- Bundle size: X.XX MB (gzip: Y.YY MB)
```

## Definition of Done — Status

- ✅ [Requirement 1] (**implementálva**)
- ✅ [Requirement 2] (**implementálva**)
- ✅ Unit tests (X+ passed)
- ✅ Build: 0 TypeScript errors

## Next Steps (Sprint N)

- Backend integration (swap mock → real API)
- E2E tests (Playwright)
- Additional feature enhancements

**Implementáció időtartam:** ~X óra (component + integration + testing)
**Status:** ✅ READY FOR REVIEW

🚀 [Feature Name] DONE! Azonnali üzleti érték!
```

### Key Characteristics

**Implementation DONE Message:**
1. **No "Already Complete"** in title
2. **"Implementált komponensek"** section with NEW code
3. **"X fájl módosítva, Y sor hozzáadva"** in file changes
4. **"Dependencies added"** if applicable
5. **Unit test results** (new tests written and passing)
6. **Time estimate:** 1-4 óra (sometimes more for complex features)

---

## Decision Tree: Verification vs Implementation

```
Inbox üzenet érkezik
  ↓
Codebase search (Glob, Grep, Read)
  ↓
Feature found? ───┬─── YES → Verification workflow
                  │           ↓
                  │         Code review
                  │           ↓
                  │         100% complete?
                  │           ├─── YES → Verification DONE (0 files changed)
                  │           └─── NO → Partial implementation → Continue as Implementation
                  │
                  └─── NO → Implementation workflow
                             ↓
                           Design + Develop
                             ↓
                           Test + Build
                             ↓
                           Implementation DONE (X files changed)
```

---

## Time Estimation Matrix

| Complexity | Verification | Implementation |
|---|---|---|
| **Simple** (1 component, mock data) | 5 min | 1-2 óra |
| **Medium** (2-3 components, API integration) | 10 min | 2-4 óra |
| **Complex** (5+ components, new state management, dependencies) | 15 min | 4-8 óra |

**Verification always faster** because no code is written, only reviewed.

---

## Statistics (2026-06-22 snapshot)

**Frontend DONE messages analyzed:** 5

| Type | Count | Percentage | Example |
|---|---|---|---|
| **Verification** | 2 | 40% | Nesting Visualization, [Other] |
| **Implementation** | 3 | 60% | Batch Assignment Kanban, EHS Wizard, Catalog KPI |

**Pattern:** ~40% of frontend tasks are already complete when spec arrives (good code coverage!).

---

## Benefits of Verification Workflow

### Developer Productivity
- **No duplicate work** — Feature already exists
- **Fast turnaround** — 5-10 min instead of hours
- **Confidence boost** — "We already built this!"

### Business Value
- **Immediate delivery** — Feature can be demoed right away
- **Quality signal** — Proactive implementation (ahead of requirements)
- **Resource optimization** — Dev time saved for new features

### Technical Debt Prevention
- **Code reuse** — Existing implementation is documented
- **Test coverage** — Existing tests verified
- **API compatibility** — Backend alignment confirmed

---

## Common Pitfalls

### 1. Assuming feature is complete without thorough review
**Symptom:** Verification DONE sent, but feature has gaps
**Fix:** Always test **all** requirements in DoD before marking as "100% complete"

### 2. Not documenting why feature was already complete
**Symptom:** Stakeholders confused ("Did frontend do any work?")
**Fix:** Include detailed code review section with file paths + line numbers

### 3. Missing manual smoke test
**Symptom:** Feature exists in code but doesn't work
**Fix:** Always include "Manual Smoke Test ✅" section with test scenarios

### 4. Not updating README or documentation
**Symptom:** Other devs don't know feature exists
**Fix:** Verification DONE should still update README if feature is undocumented

---

## References

- Verification example: `terminals/frontend/outbox/2026-06-22_017_top2-nesting-visualization-done.md`
- Implementation example: `terminals/frontend/outbox/2026-06-22_018_top3-machine-scheduling-ui-done.md`
- Explorer research: `terminals/explorer/outbox/2026-06-22_002_deep-dive-patterns-research-done.md`
- Statistics: 5 frontend DONE messages analyzed (2 verification, 3 implementation)
