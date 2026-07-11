# Datahaven Planning UI — User Guide

> **Version:** 1.0
> **Last Updated:** 2026-06-24
> **Target Audience:** Conductor, Architect, Root terminals

---

## Introduction

### What is the Planning UI?

The Datahaven Planning UI is a web-based interface for managing the SpaceOS planning pipeline. It provides two key components:

1. **Focus Area Panel** — Select the active planning domain and edit focus criteria
2. **Flow/Workflow Editor** — Visualize and manage epic dependencies

These components help coordinate the autonomous planning process by making domain focus and epic dependencies visible and editable without SSH or terminal access.

### Who should use it?

- **Conductor** — Primary user for daily planning coordination
- **Architect** — Reviews epic dependencies and technical roadmap
- **Root** — Strategic planning decisions and domain shifts

### How to access it?

Navigate to: **https://datahaven.joinerytech.hu/planning.html**

**Authentication:** Automatic (bearer token handled by browser)

---

## Focus Area Panel

The Focus Area Panel allows you to change the active planning domain and edit the criteria list that guides the planning pipeline.

### Location

**Planning page** → **Top panel** (above the pipeline overview)

### How to change planning domain

**Step 1:** Locate the Focus Area Panel at the top of the Planning page

**Step 2:** Click the **domain dropdown** (shows current domain)

**Step 3:** Select a new domain from the list:
- `all` — All features across all modules (default)
- `joinery` — Joinery/carpentry features (ajtó, szekrény)
- `cutting` — Cutting/nesting module (lapszabászat)
- `manufacturing` — Manufacturing execution (gyártás)
- `ehs` — Environmental Health & Safety (munkavédelem)
- `catalog` — Product catalog features
- `sales` — Sales and CRM features

**Step 4:** Domain is saved automatically → Success toast notification appears

**Result:** The next `plan-scan.sh` run will use this domain to filter planning ideas.

**Example scenario:**
> You're preparing for Q3 Cutting module development. Change domain from `all` to `cutting` so the planning pipeline focuses on nesting, optimization, and CNC-related ideas.

---

### How to edit domain criteria

The criteria list provides guidance for evaluating and prioritizing planning ideas.

**Step 1:** Locate the **criteria display box** below the domain dropdown

**Step 2:** Click the **[Edit]** button

**Step 3:** A textarea appears with the current criteria in markdown format

**Step 4:** Modify the text using markdown syntax:
- Use `##` for headings
- Use `-` or `*` for bullet lists
- Use `**text**` for bold emphasis

**Step 5:** Click **[Save]** to persist changes → Success toast shown

**Step 6:** Click **[Cancel]** to discard changes (reverts to previous state)

**Result:** The updated criteria will guide the next planning debate cycle.

**Common markdown patterns:**
```markdown
## Focus Criteria

- **Felhasználói érték**: Milyen funkció segíti a felhasználót?
- **Backend kapcsolhatóság**: Van-e már meglévő API?
- **Iparági minták**: Mi az ami más ERP/MES rendszerben bevált?
```

**Example scenario:**
> The Cutting module roadmap shifts focus to mobile-first nesting. Add a new criterion:
>
> ```markdown
> - **Mobil támogatás**: A funkciónak működnie kell tableten és mobilon is
> ```

---

### Common tasks

**Task:** Change domain from "all" to "joinery"

1. Click domain dropdown
2. Select "joinery"
3. Wait for success toast
4. Criteria auto-updates to joinery-specific focus

**Task:** Add a new focus criterion

1. Click [Edit] button
2. Add new line: `- **New criterion**: Description...`
3. Click [Save]
4. Success toast confirms save

**Task:** Format criteria with markdown

1. Click [Edit]
2. Use `**bold**`, `##` headings, `-` lists
3. Preview (currently no live preview—see rendered version after save)
4. Click [Save]

---

## Flow/Workflow Editor

The Flow/Workflow Editor provides an interactive dependency graph for managing epics.

### Location

**Planning page** → **Workflow tab** (6th tab in the stage tabs row)

```
[Workflow] [Ideas] [Selected] [Debate] [Queue] [Pipeline Logs]
    ↑ Click here
```

---

### How to view epic dependencies

**Step 1:** Navigate to the **Planning page**

**Step 2:** Click the **Workflow** tab

**Step 3:** The epic dependency graph loads (Mermaid diagram)

**Graph elements:**
- **Nodes** — Epic boxes (e.g., `EPIC-CUTTING-Q3`)
- **Arrows** — Dependencies (A → B means "B depends on A")
- **Colors** — Status indication:
  - **Gray** — `pending` (not started)
  - **Blue** — `active` (in progress)
  - **Green** — `done` (completed)
  - **Red** — `blocked` (waiting on external dependency)

**Navigation:**
- **Zoom:** Mouse wheel scroll
- **Pan:** Click and drag on empty space
- **Select:** Click any epic node

**Example:**
> `EPIC-KERNEL-STABLE → EPIC-CUTTING-Q3` means Cutting Q3 depends on Kernel stability being done first.

---

### How to view epic details

**Step 1:** Click any epic node in the graph

**Step 2:** The **Epic Details Panel** slides in from the right

**Details shown:**
- **Name** — Human-readable epic name
- **Status** — Current status (dropdown, editable)
- **Dependencies** — List of `depends_on` epics
- **Parallel With** — Epics that can run concurrently
- **Target Date** — Planned completion date
- **Description** — Epic summary (markdown)

**Step 3:** Click **[Close]** button or click the backdrop to close the panel

**Example scenario:**
> You want to know when `EPIC-PORTAL-V2` is planned to be done. Click the `EPIC-PORTAL-V2` node, view the **Target Date** field.

---

### How to change epic status

**Step 1:** Click an epic node to open the details panel

**Step 2:** Locate the **Status dropdown**

**Step 3:** Click the dropdown to see available statuses:
- `pending` — Not started
- `active` — Work in progress
- `done` — Completed
- `blocked` — Waiting on external dependency

**Step 4:** Select a new status

**Step 5:** Status change is saved automatically → Graph updates immediately (node color changes)

**Valid transitions:**
```
pending → active → done
pending → blocked
active → blocked
blocked → active (retry)
```

**Invalid transitions (will be rejected):**
```
done → pending  ❌ Cannot un-complete an epic
done → active   ❌
```

**Example scenario:**
> `EPIC-CUTTING-Q3` development is complete. Change status from `active` to `done`. The node turns green in the graph.

---

### How to add/remove dependencies

#### Add a dependency

**Step 1:** Click an epic node to open the details panel

**Step 2:** Scroll to the **Dependencies** section

**Step 3:** Click **[+ Add Dependency]** button

**Step 4:** A modal appears with a dropdown of all epics

**Step 5:** Select the dependency epic from the dropdown

**Step 6:** Click **[Add]**

**Step 7:** The graph updates with a new arrow showing the dependency

**Result:** The EPICS.yaml file is updated with the new dependency.

**Example scenario:**
> `EPIC-PORTAL-V2` now requires `EPIC-IDENTITY-V1` to be done first. Add `EPIC-IDENTITY-V1` to the dependencies list.

#### Remove a dependency

**Step 1:** Click an epic node to open the details panel

**Step 2:** Locate the dependency you want to remove in the **Dependencies** section

**Step 3:** Click the **[X]** button next to the dependency

**Step 4:** A confirmation dialog appears: "Remove dependency EPIC-X from EPIC-Y?"

**Step 5:** Click **[Confirm]** to remove

**Step 6:** The graph updates (arrow disappears)

**Result:** The EPICS.yaml file is updated.

---

### How to add/remove parallel epics

Parallel epics can run concurrently (no dependency between them).

#### Add a parallel epic

**Step 1:** Click an epic node to open the details panel

**Step 2:** Scroll to the **Parallel With** section

**Step 3:** Click **[+ Add Parallel Epic]**

**Step 4:** Select an epic from the dropdown

**Step 5:** Click **[Add]**

**Step 6:** The graph updates with a dashed arrow showing the parallel relationship

#### Remove a parallel epic

**Step 1:** Click the **[X]** next to the parallel epic in the list

**Step 2:** Confirm removal

**Step 3:** The graph updates (dashed arrow disappears)

---

### Common error messages

**"Cycle detected: A → B → C → A"**

**Meaning:** You tried to add a dependency that creates a circular loop.

**Example:** EPIC-A depends on EPIC-B, EPIC-B depends on EPIC-C, and you tried to make EPIC-C depend on EPIC-A.

**Solution:** Remove one of the dependencies to break the cycle.

---

**"Invalid status transition"**

**Meaning:** You tried to change status in an invalid way (e.g., `done` → `pending`).

**Solution:** Review the valid transitions above. Contact Architect if you need to un-complete an epic.

---

**"Epic not found"**

**Meaning:** The epic you're trying to edit doesn't exist in EPICS.yaml.

**Solution:** Refresh the page. If the problem persists, the epic may have been deleted—contact Root or Conductor.

---

**"Rate limit exceeded"**

**Meaning:** You made too many changes in a short time (10 writes/minute limit on domain focus).

**Solution:** Wait 60 seconds and try again.

---

## Troubleshooting

### Focus Area Panel not loading

**Symptoms:** Panel shows "Loading..." indefinitely or shows an error.

**Possible causes:**
1. Backend API is down
2. File permissions issue on `docs/planning/domain-focus.md`
3. Network connectivity issue

**Solutions:**
1. Check Datahaven Dashboard → "Health" indicator (top-right)
2. Open browser console (F12) → look for API errors
3. Contact Backend terminal if API returns 500 error

---

### Workflow graph not rendering

**Symptoms:** Workflow tab is blank or shows "Loading graph..." forever.

**Possible causes:**
1. EPICS.yaml syntax error
2. Mermaid.js library failed to load
3. Graph too large (>100 nodes)

**Solutions:**
1. Validate EPICS.yaml syntax: `cd /opt/spaceos && yamllint docs/projects/EPICS.yaml`
2. Refresh the page (Ctrl+Shift+R to bypass cache)
3. Check browser console for JavaScript errors

---

### Changes not persisting

**Symptoms:** You save changes, but they revert after page reload.

**Possible causes:**
1. File write permissions issue
2. Git conflict (if someone else edited the same file)
3. Rate limiting (domain focus only)

**Solutions:**
1. Check file permissions: `ls -la /opt/spaceos/docs/planning/domain-focus.md`
2. Pull latest changes: `cd /opt/spaceos && git pull`
3. Wait 60 seconds (rate limit cooldown)

---

### Epic details panel stuck open

**Symptoms:** You can't close the epic details panel.

**Possible causes:**
1. JavaScript event handler not firing
2. Browser compatibility issue

**Solutions:**
1. Press **Esc** key (keyboard shortcut to close)
2. Refresh the page
3. Try a different browser (Chrome, Firefox, Safari supported)

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Esc` | Close epic details panel |
| `Ctrl+Shift+R` | Hard refresh (bypass cache) |
| `Tab` | Navigate between form fields |

---

## Mobile Support

**Focus Area Panel:**
- ✅ Fully supported on tablets (iPad, Android tablets)
- ✅ Partially supported on phones (narrow screen, vertical scrolling)

**Flow/Workflow Editor:**
- ❌ Not supported on mobile (requires desktop screen ≥1024px width)
- A message will appear: "Workflow editor requires desktop screen (min 1024px width)"

**Recommendation:** Use a desktop or laptop for workflow graph editing. Use a tablet for domain focus changes.

---

## Tips & Best Practices

**Tip 1: Check the graph before adding dependencies**

Before adding a dependency, zoom out and view the full graph to ensure you're not creating unintended chains.

**Tip 2: Use descriptive criteria**

When editing domain criteria, use concrete, measurable criteria:
- ❌ Bad: "Make it better"
- ✅ Good: "Reduce click count from 5 to 3 for quote creation"

**Tip 3: Document epic status changes**

When changing an epic status to `blocked`, add a note in the description field explaining why.

**Tip 4: Sync with Git before large changes**

If you're planning to update many epics, run `git pull` first to avoid conflicts:
```bash
cd /opt/spaceos && git pull
```

**Tip 5: Export the graph for documentation**

Click **[Export Mermaid]** button (top-right of Workflow tab) to download a `.mmd` file. Use this in Slack, GitHub, or Notion for sharing the roadmap.

---

## Related Documentation

- **API Documentation:** [DATAHAVEN_PLANNING_API.md](../api/DATAHAVEN_PLANNING_API.md)
- **Architecture:** [ADR-048-Datahaven-UI-Planning-Components.md](../architecture/ADR-048-Datahaven-UI-Planning-Components.md)
- **Graph Workflow:** [ADR-041-graph-based-workflow-architecture.md](../architecture/ADR-041-graph-based-workflow-architecture.md)

---

## Changelog

### 2026-06-24 — v1.0 (Initial)
- Focus Area Panel user guide
- Flow/Workflow Editor user guide
- Common tasks and troubleshooting
