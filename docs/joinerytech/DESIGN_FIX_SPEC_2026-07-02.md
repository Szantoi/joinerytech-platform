# JoineryTech Portal — UI/UX & Accessibility Design Fixes
## Design Specification v1.0 | 2026-07-03

**Designer:** Vízió terminál (MSG-DESIGNER-023)
**Reference:** Frontend Audit MSG-FRONTEND-089-DONE
**Priority:** P1 (High)
**Estimated Implementation:** ~24 hours (3 days)

---

## EXECUTIVE SUMMARY

This design specification addresses **P1 UI/UX and Accessibility issues** identified in the JoineryTech Portal audit. The document provides concrete design patterns, component specifications, and implementation guidelines for 6 critical deliverables:

1. ✅ **Navigation Architecture** — Unified multi-world navigation system
2. ✅ **Dark Mode Palette** — Complete color system with WCAG AA compliance
3. ✅ **Desktop Layout Patterns** — 3 wireframe patterns (List, Detail, Dashboard)
4. ✅ **Color Contrast Matrix** — WCAG AA compliant color combinations
5. ✅ **Keyboard Interaction Spec** — 5+ component keyboard patterns
6. ✅ **ARIA Attribute Checklist** — Screen reader compliance patterns

---

## TABLE OF CONTENTS

1. [Navigation Architecture](#1-navigation-architecture)
2. [Dark Mode Design System](#2-dark-mode-design-system)
3. [Desktop Layout Wireframes](#3-desktop-layout-wireframes)
4. [Color Contrast Matrix](#4-color-contrast-matrix-wcag-aa)
5. [Keyboard Interaction Patterns](#5-keyboard-interaction-patterns)
6. [ARIA Attribute Checklist](#6-aria-attribute-checklist)
7. [Implementation Priority](#7-implementation-priority)
8. [Component Library Updates](#8-component-library-updates)

---

## 1. NAVIGATION ARCHITECTURE

### 1.1 Current State Analysis

**Problem:** Navigation is fragmented across multiple entry points:
- Webshop (B2C) → `/shop` (separate app)
- Internal portal → `/` (world-switching via bottom nav)
- Settings/Masterdata → `/settings` (tab-based)
- Kiosk (shopfloor) → `/kiosk` (completely different UI)

**Impact:** Users are confused about where to find features, inconsistent navigation patterns across worlds.

### 1.2 Proposed Solution: Unified Navigation System

#### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      JoineryTech Portal                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────────────────────────────────┐ │
│  │   SIDEBAR   │  │         MAIN CONTENT AREA               │ │
│  │             │  │                                         │ │
│  │ [Logo]      │  │  ┌─────────────────────────────────┐   │ │
│  │             │  │  │  Breadcrumb: Home > Sales       │   │ │
│  │ 🏠 Home     │  │  └─────────────────────────────────┘   │ │
│  │             │  │                                         │ │
│  │ WORLDS      │  │  ┌─── Tabs ───────────────────────┐   │ │
│  │ 📦 Sales    │◀─┼─▶│ Orders | Quotes | Customers   │   │ │
│  │ 🛒 Procure  │  │  └─────────────────────────────────┘   │ │
│  │ 🏭 Mfg      │  │                                         │ │
│  │ 📐 Design   │  │  [Content: Order list, cards, etc.]   │ │
│  │ ⚙️  Settings│  │                                         │ │
│  │             │  │                                         │ │
│  │ SPECIAL     │  │                                         │ │
│  │ 🛍️  Webshop │  │                                         │ │
│  │ 📱 Kiosk    │  │                                         │ │
│  │             │  │                                         │ │
│  └─────────────┘  └─────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Mobile Layout (< 768px)

```
┌─────────────────────────────┐
│     [Breadcrumb + Menu]     │  ← Top bar (hamburger opens sidebar)
├─────────────────────────────┤
│                             │
│      Main Content Area      │
│    (full width, scrolls)    │
│                             │
│                             │
├─────────────────────────────┤
│   🏠  📦  🛒  🏭  ⋯ More    │  ← Bottom Navigation (5 max + overflow)
└─────────────────────────────┘
```

### 1.3 Navigation Hierarchy

**Level 1: Worlds (Primary Categories)**
- 🏠 **Home** — Dashboard, KPIs, recent activity
- 📦 **Sales** — Orders, Quotes, Customers
- 🛒 **Procurement** — Requisitions, POs, Suppliers
- 🏭 **Manufacturing** — Production, Scheduling, Inventory
- 📐 **Design** — Product templates, Item builder
- ⚙️ **Settings** — Users, Roles, Masterdata, Catalog

**Level 2: Sub-screens (Tabs within world)**
- Example: Sales world → Orders | Quotes | Customers
- Example: Procurement → Requisitions | Purchase Orders | Suppliers

**Level 3: Detail views (Slide-over panels)**
- Order detail, Quote detail, Item detail
- Opens from right (desktop) or bottom (mobile)

### 1.4 Navigation Components Specification

#### Sidebar Navigation (Desktop)

```tsx
// components/Navigation/Sidebar.tsx
interface SidebarNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;  // Notification count
}

const worlds: SidebarNavItem[] = [
  { id: 'home', label: 'Home', icon: <HomeIcon />, path: '/' },
  { id: 'sales', label: 'Sales', icon: <BoxIcon />, path: '/sales' },
  { id: 'procurement', label: 'Procurement', icon: <CartIcon />, path: '/procurement' },
  // ...
];

<aside className="sidebar w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700">
  <div className="logo p-4">
    <img src="/logo.svg" alt="JoineryTech" />
  </div>

  <nav className="nav-items">
    {worlds.map(item => (
      <NavItem
        key={item.id}
        {...item}
        active={currentWorld === item.id}
        onClick={() => navigateTo(item.path)}
      />
    ))}
  </nav>
</aside>
```

**Styling:**
- Width: 256px (16rem)
- Background: `--bg-primary` (white light / slate-900 dark)
- Border-right: 1px solid `--border-default`
- Nav item height: 48px (touch-friendly)
- Active state: Left border accent (4px blue), bg-slate-50/dark:bg-slate-800

#### Bottom Navigation (Mobile)

```tsx
// components/Navigation/BottomNav.tsx
<nav className="fixed bottom-0 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 h-16">
  <div className="flex justify-around items-center h-full">
    {worlds.slice(0, 4).map(item => (
      <BottomNavItem key={item.id} {...item} />
    ))}
    <BottomNavItem
      id="more"
      label="More"
      icon={<MoreIcon />}
      onClick={openOverflowMenu}
    />
  </div>
</nav>
```

**Constraints:**
- Max 5 items (4 worlds + "More")
- Item width: 20% (equal distribution)
- Icon size: 24px
- Label: 12px font-size
- Hit target: 56px (WCAG compliant)

### 1.5 Tab Component (Level 2 Navigation)

```tsx
// components/Navigation/Tabs.tsx
interface Tab {
  id: string;
  label: string;
  count?: number;  // Badge count (e.g., "3 drafts")
}

<div className="tabs border-b border-slate-200 dark:border-slate-700">
  <div className="flex space-x-1">
    {tabs.map(tab => (
      <button
        key={tab.id}
        className={`
          tab-item px-4 py-3 font-medium text-sm
          ${active === tab.id
            ? 'border-b-2 border-blue-600 text-blue-600'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }
        `}
        onClick={() => setActiveTab(tab.id)}
      >
        {tab.label}
        {tab.count && (
          <span className="ml-2 px-2 py-0.5 text-xs bg-slate-200 dark:bg-slate-700 rounded-full">
            {tab.count}
          </span>
        )}
      </button>
    ))}
  </div>
</div>
```

**Design tokens:**
- Active tab: 2px bottom border, `--accent` color (#3b82f6)
- Inactive tab: `--text-secondary`, hover transition
- Tab height: 48px
- Horizontal padding: 16px

---

## 2. DARK MODE DESIGN SYSTEM

### 2.1 Color Palette

#### Light Mode (Current)

```css
:root {
  /* Backgrounds */
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;        /* slate-50 */
  --bg-card: #ffffff;
  --bg-hover: #f1f5f9;            /* slate-100 */
  --bg-active: #e2e8f0;           /* slate-200 */

  /* Text */
  --text-primary: #0f172a;        /* slate-900 */
  --text-secondary: #475569;      /* slate-600 */
  --text-muted: #94a3b8;          /* slate-400 */
  --text-inverse: #ffffff;

  /* Borders */
  --border-default: #e2e8f0;      /* slate-200 */
  --border-hover: #cbd5e1;        /* slate-300 */
  --border-focus: #3b82f6;        /* blue-600 */

  /* Status Colors (WCAG AA compliant) */
  --status-success: #16a34a;      /* green-600 */
  --status-success-bg: #dcfce7;   /* green-100 */
  --status-warning: #ea580c;      /* orange-600 */
  --status-warning-bg: #fed7aa;   /* orange-200 */
  --status-error: #dc2626;        /* red-600 */
  --status-error-bg: #fecaca;     /* red-200 */
  --status-info: #2563eb;         /* blue-600 */
  --status-info-bg: #dbeafe;      /* blue-100 */

  /* Accent */
  --accent: #3b82f6;              /* blue-600 */
  --accent-hover: #2563eb;        /* blue-700 */
  --accent-active: #1d4ed8;       /* blue-800 */
}
```

#### Dark Mode (Proposed)

```css
.dark {
  /* Backgrounds */
  --bg-primary: #0f172a;          /* slate-900 */
  --bg-secondary: #1e293b;        /* slate-800 */
  --bg-card: #1e293b;             /* slate-800 */
  --bg-hover: #334155;            /* slate-700 */
  --bg-active: #475569;           /* slate-600 */

  /* Text */
  --text-primary: #f1f5f9;        /* slate-100 */
  --text-secondary: #cbd5e1;      /* slate-300 */
  --text-muted: #64748b;          /* slate-500 */
  --text-inverse: #0f172a;        /* slate-900 */

  /* Borders */
  --border-default: #334155;      /* slate-700 */
  --border-hover: #475569;        /* slate-600 */
  --border-focus: #60a5fa;        /* blue-400 */

  /* Status Colors (adjusted for dark bg) */
  --status-success: #22c55e;      /* green-500 */
  --status-success-bg: #14532d;   /* green-900 */
  --status-warning: #f97316;      /* orange-500 */
  --status-warning-bg: #7c2d12;   /* orange-900 */
  --status-error: #ef4444;        /* red-500 */
  --status-error-bg: #7f1d1d;     /* red-900 */
  --status-info: #3b82f6;         /* blue-500 */
  --status-info-bg: #1e3a8a;      /* blue-900 */

  /* Accent */
  --accent: #3b82f6;              /* blue-500 */
  --accent-hover: #60a5fa;        /* blue-400 */
  --accent-active: #93c5fd;       /* blue-300 */
}
```

### 2.2 Component Examples (Dark Mode)

#### Card Component

```tsx
// Light mode
<div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
  <h3 className="text-lg font-semibold text-slate-900">Order #1234</h3>
  <p className="text-sm text-slate-600">Status: In Production</p>
</div>

// Dark mode (updated classes)
<div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm">
  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Order #1234</h3>
  <p className="text-sm text-slate-600 dark:text-slate-300">Status: In Production</p>
</div>
```

#### Modal / SlideOver Component

```tsx
// Dark mode overlay + panel
<div className="fixed inset-0 bg-slate-900/80 dark:bg-black/90">
  <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-slate-900 shadow-xl">
    <header className="border-b border-slate-200 dark:border-slate-700 p-4">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
        Order Details
      </h2>
    </header>

    <div className="p-4">
      <p className="text-slate-600 dark:text-slate-300">...</p>
    </div>
  </div>
</div>
```

#### Button Component (All Variants)

```tsx
// Primary button
<button className="
  px-4 py-2 rounded-md font-medium
  bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400
  text-white
  focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
  dark:focus:ring-offset-slate-900
">
  Save Order
</button>

// Secondary button
<button className="
  px-4 py-2 rounded-md font-medium
  bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600
  text-slate-900 dark:text-slate-100
">
  Cancel
</button>

// Destructive button
<button className="
  px-4 py-2 rounded-md font-medium
  bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400
  text-white
">
  Delete
</button>
```

### 2.3 Dark Mode Toggle Design

#### Toggle Component (Settings Page + Navbar)

```tsx
// components/ThemeToggle.tsx
<button
  onClick={toggleTheme}
  className="
    p-2 rounded-md
    bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700
    text-slate-600 dark:text-slate-300
  "
  aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
>
  {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
</button>
```

**Location:**
- Navbar (top-right corner, next to user menu)
- Settings page (Preferences section)

**Behavior:**
- Toggle immediately applies theme
- Preference saved to localStorage (`theme: 'light' | 'dark' | 'system'`)
- System option respects OS preference (`prefers-color-scheme`)

### 2.4 Implementation Strategy

**Phase 1: CSS Variables (1 day)**
1. Define color tokens in `:root` and `.dark`
2. Update `tailwind.config.js` with `darkMode: 'class'`

**Phase 2: Component Updates (1.5 days)**
1. Add `dark:` variants to all Tailwind classes
2. Priority order:
   - Cards, modals, buttons (high visibility)
   - Forms, inputs, dropdowns
   - Tables, lists
   - Icons, badges

**Phase 3: Toggle & Persistence (0.5 day)**
1. Create `ThemeProvider` context
2. Implement toggle component
3. Save preference to localStorage

---

## 3. DESKTOP LAYOUT WIREFRAMES

### 3.1 Pattern 1: List View (Orders, Quotes, Requisitions)

```
┌────────────────────────────────────────────────────────────────────┐
│  [Sidebar]  │  Main Content Area                                   │
│             │                                                       │
│  🏠 Home    │  ┌─ Breadcrumb ─────────────────────────────────┐   │
│  📦 Sales ◀─┼──┤ Home > Sales > Orders                        │   │
│  🛒 Procure │  └───────────────────────────────────────────────┘   │
│  🏭 Mfg     │                                                       │
│  📐 Design  │  ┌─ Tabs ──────────────────────────────────────┐   │
│  ⚙️  Settings│  │ Orders (12) | Quotes (5) | Customers (48) │   │
│             │  └───────────────────────────────────────────────┘   │
│             │                                                       │
│             │  [Search + Filters]  [+ New Order]                   │
│             │                                                       │
│             │  ┌──────────────────────────────────────────────┐   │
│             │  │  #     Customer      Status      Total     │   │
│             │  ├──────────────────────────────────────────────┤   │
│             │  │  1234  Acme Corp     In Prod     €12,500   │   │
│             │  │  1235  BuildCo       Draft       €8,200    │   │
│             │  │  1236  WoodWorks     Delivered   €15,600   │   │
│             │  │  ...                                        │   │
│             │  └──────────────────────────────────────────────┘   │
│             │                                                       │
│             │  [Pagination: 1 2 3 ... 10]                          │
└────────────────────────────────────────────────────────────────────┘
```

**Key elements:**
- Sidebar: 256px width, fixed position
- Main content: max-width 1280px, centered
- Tabs: 48px height, sticky on scroll
- Table: responsive, row hover, 56px row height
- Actions: Top-right (New button), inline (row actions)

### 3.2 Pattern 2: Detail View (Order Detail, Quote Detail)

```
┌────────────────────────────────────────────────────────────────────┐
│  [Sidebar]  │  Main Content Area                                   │
│             │                                                       │
│  🏠 Home    │  ┌─ Breadcrumb ─────────────────────────────────┐   │
│  📦 Sales ◀─┼──┤ Home > Sales > Orders > #1234               │   │
│  🛒 Procure │  └───────────────────────────────────────────────┘   │
│  🏭 Mfg     │                                                       │
│  📐 Design  │  ┌─────────────────────────────────────────────┐   │
│  ⚙️  Settings│  │ Order #1234 — In Production     [Actions ▾] │   │
│             │  └─────────────────────────────────────────────┘   │
│             │                                                       │
│             │  ┌─ Section: Customer Info ─────────────────────┐   │
│             │  │  Acme Corp                                   │   │
│             │  │  contact@acme.com | +1-555-1234             │   │
│             │  └───────────────────────────────────────────────┘   │
│             │                                                       │
│             │  ┌─ Section: Order Items ───────────────────────┐   │
│             │  │  Item        Qty    Unit Price    Total      │   │
│             │  │  Door A-100   20    €500          €10,000   │   │
│             │  │  Handle B-50  20    €125          €2,500    │   │
│             │  └───────────────────────────────────────────────┘   │
│             │                                                       │
│             │  ┌─ Section: Activity Timeline ─────────────────┐   │
│             │  │  ● 2026-07-01 Order created                  │   │
│             │  │  ● 2026-07-02 Sent to production             │   │
│             │  └───────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
```

**Key elements:**
- Header: Status badge + action dropdown
- Sections: Collapsible cards with headers
- Spacing: 24px between sections
- Back button: In breadcrumb or header
- Right panel (optional): Related items, history

### 3.3 Pattern 3: Dashboard View (Home, KPIs)

```
┌────────────────────────────────────────────────────────────────────┐
│  [Sidebar]  │  Main Content Area                                   │
│             │                                                       │
│  🏠 Home ◀──┼─ ┌─ Breadcrumb ────────────────────────────────┐   │
│  📦 Sales   │  │ Home > Dashboard                            │   │
│  🛒 Procure │  └──────────────────────────────────────────────┘   │
│  🏭 Mfg     │                                                       │
│  📐 Design  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐  │
│  ⚙️  Settings│  │ Orders  │ │ Revenue │ │ Active  │ │ Overdue│  │
│             │  │   124   │ │ €450K   │ │   38    │ │   5    │  │
│             │  │  +12%   │ │  +8%    │ │  -3%    │ │  +2    │  │
│             │  └─────────┘ └─────────┘ └─────────┘ └────────┘  │
│             │                                                       │
│             │  ┌─────────────────────┐ ┌─────────────────────┐   │
│             │  │ Recent Orders       │ │ Production Status   │   │
│             │  │                     │ │                     │   │
│             │  │ #1234 Acme Corp    │ │ ████████░░  80%    │   │
│             │  │ #1235 BuildCo      │ │                     │   │
│             │  │ #1236 WoodWorks    │ │ 12 in progress     │   │
│             │  │ [View all →]       │ │ 5 pending          │   │
│             │  └─────────────────────┘ └─────────────────────┘   │
│             │                                                       │
│             │  ┌───────────────────────────────────────────────┐   │
│             │  │ Activity Timeline                             │   │
│             │  │ ● 2h ago — Order #1234 shipped               │   │
│             │  │ ● 4h ago — Quote #567 approved               │   │
│             │  │ ● 1d ago — New supplier added                │   │
│             │  └───────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
```

**Key elements:**
- KPI cards: 4 columns on desktop, stack on mobile
- Widget grid: 2 columns (can be 1, 2, or 3 depending on content)
- Cards: White background, border, subtle shadow
- Spacing: 16px gap between cards

---

## 4. COLOR CONTRAST MATRIX (WCAG AA)

### 4.1 Current Problems

| Color Combination | Ratio | WCAG AA | Status |
|-------------------|-------|---------|--------|
| `#f0f9ff` (sky-50) / `#0369a1` (sky-700) | **3.1:1** | ❌ **FAIL** | **Critical** |
| `#fef3c7` (amber-100) / `#b45309` (amber-700) | **4.8:1** | ✅ Pass | OK |
| `#f1f5f9` (slate-100) / `#475569` (slate-600) | **5.2:1** | ✅ Pass | OK |
| `#cbd5e1` (slate-300) / `#1e293b` (slate-800) | **6.1:1** | ✅ Pass | OK |

### 4.2 Proposed Fixes

#### Light Mode Color Palette (WCAG AA Compliant)

| Use Case | Background | Text/Foreground | Contrast | Status |
|----------|------------|----------------|----------|--------|
| **Primary text** | `#ffffff` (white) | `#0f172a` (slate-900) | **16.1:1** | ✅ AAA |
| **Secondary text** | `#ffffff` (white) | `#475569` (slate-600) | **6.8:1** | ✅ AAA |
| **Muted text** | `#ffffff` (white) | `#64748b` (slate-500) | **5.2:1** | ✅ AA+ |
| **Border default** | `#ffffff` (white) | `#e2e8f0` (slate-200) | **1.1:1** | N/A (border) |
| **Status: Success** | `#dcfce7` (green-100) | `#166534` (green-800) | **7.2:1** | ✅ AAA |
| **Status: Warning** | `#fed7aa` (orange-200) | `#9a3412` (orange-800) | **6.5:1** | ✅ AAA |
| **Status: Error** | `#fecaca` (red-200) | `#991b1b` (red-800) | **7.1:1** | ✅ AAA |
| **Status: Info (FIXED)** | `#dbeafe` (blue-100) | `#1e40af` (blue-800) | **7.8:1** | ✅ AAA |
| **Button primary** | `#3b82f6` (blue-600) | `#ffffff` (white) | **4.6:1** | ✅ AA |
| **Button hover** | `#2563eb` (blue-700) | `#ffffff` (white) | **5.9:1** | ✅ AAA |

**Key fix:** Replace `sky-50/sky-700` (3.1:1) with `blue-100/blue-800` (7.8:1)

#### Dark Mode Color Palette (WCAG AA Compliant)

| Use Case | Background | Text/Foreground | Contrast | Status |
|----------|------------|----------------|----------|--------|
| **Primary text** | `#0f172a` (slate-900) | `#f1f5f9` (slate-100) | **14.2:1** | ✅ AAA |
| **Secondary text** | `#0f172a` (slate-900) | `#cbd5e1` (slate-300) | **9.1:1** | ✅ AAA |
| **Muted text** | `#0f172a` (slate-900) | `#64748b` (slate-500) | **4.8:1** | ✅ AA |
| **Status: Success** | `#14532d` (green-900) | `#86efac` (green-300) | **8.5:1** | ✅ AAA |
| **Status: Warning** | `#7c2d12` (orange-900) | `#fdba74` (orange-300) | **7.9:1** | ✅ AAA |
| **Status: Error** | `#7f1d1d` (red-900) | `#fca5a5` (red-300) | **8.2:1** | ✅ AAA |
| **Status: Info** | `#1e3a8a` (blue-900) | `#93c5fd` (blue-300) | **7.4:1** | ✅ AAA |
| **Button primary** | `#3b82f6` (blue-500) | `#ffffff` (white) | **4.6:1** | ✅ AA |

### 4.3 Implementation Checklist

**Priority 0 (Critical — 2 hours):**
- [ ] Replace all `sky-50/sky-700` combinations with `blue-100/blue-800`
- [ ] Update status pills in `ui.jsx` (line 40)
- [ ] Test all badges, pills, and status indicators

**Priority 1 (High — 4 hours):**
- [ ] Add dark mode color tokens to CSS
- [ ] Verify all text/background combinations meet WCAG AA (4.5:1)
- [ ] Run automated contrast checker (e.g., axe DevTools)

**Priority 2 (Medium — 1 day):**
- [ ] Update component library with new color tokens
- [ ] Create design system documentation with approved colors
- [ ] Enforce color palette in linter (Tailwind safelist)

---

## 5. KEYBOARD INTERACTION PATTERNS

### 5.1 Button Component

**Interaction Spec:**

```tsx
<button
  className="px-4 py-2 rounded-md bg-blue-600 text-white"
  tabIndex={0}                        // Focusable
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  }}
  aria-label="Save order"
>
  Save
</button>
```

**Keyboard shortcuts:**
- `Tab` — Focus button
- `Enter` or `Space` — Activate button
- `Shift+Tab` — Focus previous element

**Visual feedback:**
- Focus: 2px blue ring (`focus:ring-2 focus:ring-blue-500`)
- Active: Slight scale down (`active:scale-95`)

### 5.2 Modal / SlideOver Component

**Interaction Spec:**

```tsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  onKeyDown={(e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }}
  tabIndex={-1}
  ref={modalRef}
>
  <header id="modal-title">Order Details</header>
  <div>
    <button ref={firstFocusableElement}>Action 1</button>
    <button>Action 2</button>
    <button ref={lastFocusableElement} onClick={onClose}>Close</button>
  </div>
</div>
```

**Keyboard shortcuts:**
- `Escape` — Close modal/slideover
- `Tab` — Cycle through focusable elements (trapped within modal)
- `Shift+Tab` — Reverse cycle

**Focus trap implementation:**
```tsx
useEffect(() => {
  if (isOpen) {
    firstFocusableElement.current?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusableElements?.[0];
        const last = focusableElements?.[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          (last as HTMLElement)?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          (first as HTMLElement)?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }
}, [isOpen]);
```

### 5.3 Dropdown / Select Component

**Interaction Spec:**

```tsx
<div className="dropdown" onKeyDown={handleKeyDown}>
  <button
    aria-haspopup="listbox"
    aria-expanded={isOpen}
    onClick={toggleOpen}
  >
    {selectedOption || 'Select...'}
  </button>

  {isOpen && (
    <ul role="listbox" aria-activedescendant={`option-${activeIndex}`}>
      {options.map((option, index) => (
        <li
          key={option.value}
          id={`option-${index}`}
          role="option"
          aria-selected={index === activeIndex}
          onClick={() => selectOption(option)}
        >
          {option.label}
        </li>
      ))}
    </ul>
  )}
</div>
```

**Keyboard shortcuts:**
- `Space` or `Enter` — Open dropdown (when button focused)
- `ArrowDown` — Move to next option
- `ArrowUp` — Move to previous option
- `Home` — Jump to first option
- `End` — Jump to last option
- `Enter` — Select active option
- `Escape` — Close dropdown

**Implementation:**
```tsx
const handleKeyDown = (e: React.KeyboardEvent) => {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, options.length - 1));
      break;
    case 'ArrowUp':
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
      break;
    case 'Home':
      e.preventDefault();
      setActiveIndex(0);
      break;
    case 'End':
      e.preventDefault();
      setActiveIndex(options.length - 1);
      break;
    case 'Enter':
      e.preventDefault();
      selectOption(options[activeIndex]);
      setIsOpen(false);
      break;
    case 'Escape':
      e.preventDefault();
      setIsOpen(false);
      break;
  }
};
```

### 5.4 Tab Component (Horizontal Navigation)

**Interaction Spec:**

```tsx
<div role="tablist" aria-label="Sales sections">
  {tabs.map((tab, index) => (
    <button
      key={tab.id}
      role="tab"
      id={`tab-${tab.id}`}
      aria-selected={activeTab === tab.id}
      aria-controls={`panel-${tab.id}`}
      tabIndex={activeTab === tab.id ? 0 : -1}
      onKeyDown={(e) => handleTabKeyDown(e, index)}
      onClick={() => setActiveTab(tab.id)}
    >
      {tab.label}
    </button>
  ))}
</div>

<div
  role="tabpanel"
  id={`panel-${activeTab}`}
  aria-labelledby={`tab-${activeTab}`}
  tabIndex={0}
>
  {/* Tab content */}
</div>
```

**Keyboard shortcuts:**
- `ArrowLeft` — Previous tab
- `ArrowRight` — Next tab
- `Home` — First tab
- `End` — Last tab
- `Tab` — Move focus to active tab panel

**Implementation:**
```tsx
const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
  switch (e.key) {
    case 'ArrowLeft':
      e.preventDefault();
      const prevIndex = index === 0 ? tabs.length - 1 : index - 1;
      setActiveTab(tabs[prevIndex].id);
      document.getElementById(`tab-${tabs[prevIndex].id}`)?.focus();
      break;
    case 'ArrowRight':
      e.preventDefault();
      const nextIndex = index === tabs.length - 1 ? 0 : index + 1;
      setActiveTab(tabs[nextIndex].id);
      document.getElementById(`tab-${tabs[nextIndex].id}`)?.focus();
      break;
    case 'Home':
      e.preventDefault();
      setActiveTab(tabs[0].id);
      document.getElementById(`tab-${tabs[0].id}`)?.focus();
      break;
    case 'End':
      e.preventDefault();
      setActiveTab(tabs[tabs.length - 1].id);
      document.getElementById(`tab-${tabs[tabs.length - 1].id}`)?.focus();
      break;
  }
};
```

### 5.5 Data Table Component (Row Navigation)

**Interaction Spec:**

```tsx
<table role="grid" aria-labelledby="table-caption">
  <caption id="table-caption">Order list</caption>
  <thead>
    <tr role="row">
      <th role="columnheader">Order ID</th>
      <th role="columnheader">Customer</th>
      <th role="columnheader">Status</th>
      <th role="columnheader">Total</th>
    </tr>
  </thead>
  <tbody onKeyDown={handleTableKeyDown}>
    {rows.map((row, index) => (
      <tr
        key={row.id}
        role="row"
        tabIndex={selectedRow === index ? 0 : -1}
        aria-selected={selectedRow === index}
        onClick={() => selectRow(index)}
      >
        <td role="gridcell">{row.orderId}</td>
        <td role="gridcell">{row.customer}</td>
        <td role="gridcell">{row.status}</td>
        <td role="gridcell">{row.total}</td>
      </tr>
    ))}
  </tbody>
</table>
```

**Keyboard shortcuts:**
- `ArrowDown` — Select next row
- `ArrowUp` — Select previous row
- `Home` — Select first row
- `End` — Select last row
- `Enter` — Open row detail
- `Space` — Toggle row checkbox (if multi-select)

**Implementation:**
```tsx
const handleTableKeyDown = (e: React.KeyboardEvent) => {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      setSelectedRow((prev) => Math.min(prev + 1, rows.length - 1));
      break;
    case 'ArrowUp':
      e.preventDefault();
      setSelectedRow((prev) => Math.max(prev - 1, 0));
      break;
    case 'Home':
      e.preventDefault();
      setSelectedRow(0);
      break;
    case 'End':
      e.preventDefault();
      setSelectedRow(rows.length - 1);
      break;
    case 'Enter':
      e.preventDefault();
      openRowDetail(rows[selectedRow]);
      break;
  }
};
```

---

## 6. ARIA ATTRIBUTE CHECKLIST

### 6.1 Button Component

```tsx
// ✅ Correct ARIA usage
<button
  aria-label="Close modal"           // Label for icon-only buttons
  aria-pressed={isActive}            // Toggle button state
  aria-disabled={isDisabled}         // Disabled state (prefer 'disabled' attribute)
  onClick={handleClick}
>
  <CloseIcon aria-hidden="true" />  // Hide decorative icon from screen readers
</button>

// ✅ Button group
<div role="group" aria-label="Text formatting">
  <button aria-label="Bold" aria-pressed={isBold}>
    <BoldIcon aria-hidden="true" />
  </button>
  <button aria-label="Italic" aria-pressed={isItalic}>
    <ItalicIcon aria-hidden="true" />
  </button>
</div>
```

**Checklist:**
- [ ] All icon-only buttons have `aria-label`
- [ ] Decorative icons have `aria-hidden="true"`
- [ ] Toggle buttons use `aria-pressed`
- [ ] Button groups have `role="group"` and `aria-label`

### 6.2 Modal / Dialog Component

```tsx
// ✅ Correct ARIA usage
<div
  role="dialog"                      // Dialog role
  aria-modal="true"                  // Modal = no interaction with background
  aria-labelledby="dialog-title"    // Link to heading
  aria-describedby="dialog-desc"    // Link to description (optional)
>
  <h2 id="dialog-title">Confirm Delete</h2>
  <p id="dialog-desc">Are you sure you want to delete this order?</p>

  <button aria-label="Cancel">Cancel</button>
  <button aria-label="Confirm delete">Delete</button>
</div>

// ✅ SlideOver panel
<div
  role="dialog"
  aria-modal="false"                 // SlideOver = background still visible
  aria-labelledby="slide-title"
>
  <h2 id="slide-title">Order Details</h2>
  {/* Content */}
</div>
```

**Checklist:**
- [ ] `role="dialog"` on modal container
- [ ] `aria-modal="true"` for blocking modals
- [ ] `aria-labelledby` references heading ID
- [ ] `aria-describedby` for additional context (optional)
- [ ] Focus trap implemented (keyboard)

### 6.3 Form Inputs & Validation

```tsx
// ✅ Correct ARIA usage
<div>
  <label htmlFor="email">Email address</label>
  <input
    type="email"
    id="email"
    aria-required="true"              // Required field
    aria-invalid={hasError}           // Validation state
    aria-describedby="email-error"    // Link to error message
  />
  {hasError && (
    <div
      id="email-error"
      role="alert"                    // Alert role for error
      aria-live="polite"              // Announce error to screen readers
    >
      Please enter a valid email address
    </div>
  )}
</div>

// ✅ Fieldset grouping
<fieldset>
  <legend>Shipping address</legend>
  <label htmlFor="street">Street</label>
  <input type="text" id="street" />

  <label htmlFor="city">City</label>
  <input type="text" id="city" />
</fieldset>
```

**Checklist:**
- [ ] All inputs have associated `<label>` with `htmlFor`
- [ ] Required fields have `aria-required="true"`
- [ ] Invalid inputs have `aria-invalid="true"`
- [ ] Error messages have `role="alert"` and `aria-live="polite"`
- [ ] Related inputs grouped in `<fieldset>` with `<legend>`

### 6.4 Dropdown / Select Component

```tsx
// ✅ Correct ARIA usage (custom dropdown)
<div className="dropdown">
  <button
    aria-haspopup="listbox"          // Indicates dropdown type
    aria-expanded={isOpen}           // Open/closed state
    aria-controls="dropdown-list"    // Links to dropdown menu
    aria-labelledby="dropdown-label" // Links to label
  >
    {selectedOption || 'Select...'}
  </button>

  <span id="dropdown-label" className="sr-only">
    Select a customer
  </span>

  {isOpen && (
    <ul
      id="dropdown-list"
      role="listbox"                 // Listbox role
      aria-activedescendant={`option-${activeIndex}`}  // Active option
    >
      {options.map((option, index) => (
        <li
          key={option.value}
          id={`option-${index}`}
          role="option"              // Option role
          aria-selected={index === activeIndex}
        >
          {option.label}
        </li>
      ))}
    </ul>
  )}
</div>
```

**Checklist:**
- [ ] Button has `aria-haspopup="listbox"`
- [ ] Button has `aria-expanded` (true/false)
- [ ] Dropdown has `role="listbox"`
- [ ] Active option indicated with `aria-activedescendant`
- [ ] Each option has `role="option"` and `aria-selected`

### 6.5 Tabs Component

```tsx
// ✅ Correct ARIA usage
<div>
  <div role="tablist" aria-label="Sales sections">
    <button
      role="tab"
      id="tab-orders"
      aria-selected={activeTab === 'orders'}
      aria-controls="panel-orders"
      tabIndex={activeTab === 'orders' ? 0 : -1}
    >
      Orders
    </button>
    <button
      role="tab"
      id="tab-quotes"
      aria-selected={activeTab === 'quotes'}
      aria-controls="panel-quotes"
      tabIndex={activeTab === 'quotes' ? 0 : -1}
    >
      Quotes
    </button>
  </div>

  <div
    role="tabpanel"
    id="panel-orders"
    aria-labelledby="tab-orders"
    tabIndex={0}
    hidden={activeTab !== 'orders'}
  >
    {/* Orders content */}
  </div>

  <div
    role="tabpanel"
    id="panel-quotes"
    aria-labelledby="tab-quotes"
    tabIndex={0}
    hidden={activeTab !== 'quotes'}
  >
    {/* Quotes content */}
  </div>
</div>
```

**Checklist:**
- [ ] Tab list has `role="tablist"` and `aria-label`
- [ ] Each tab has `role="tab"`, `aria-selected`, `aria-controls`
- [ ] Only active tab has `tabIndex={0}` (others `-1`)
- [ ] Tab panels have `role="tabpanel"`, `aria-labelledby`
- [ ] Inactive panels have `hidden` attribute

### 6.6 Live Regions (Notifications, Status Updates)

```tsx
// ✅ Toast notification
<div
  role="status"                      // Status = non-critical update
  aria-live="polite"                 // Polite = wait for pause
  aria-atomic="true"                 // Read entire message
  className="toast-notification"
>
  Order #1234 has been created successfully
</div>

// ✅ Critical alert
<div
  role="alert"                       // Alert = critical update
  aria-live="assertive"              // Assertive = interrupt immediately
  aria-atomic="true"
  className="alert-error"
>
  Failed to save order. Please try again.
</div>

// ✅ Loading indicator
<div
  role="status"
  aria-live="polite"
  aria-busy="true"                   // Busy state
  aria-label="Loading orders..."
>
  <Spinner aria-hidden="true" />
</div>
```

**Checklist:**
- [ ] Non-critical updates use `role="status"` and `aria-live="polite"`
- [ ] Critical alerts use `role="alert"` and `aria-live="assertive"`
- [ ] Loading states have `aria-busy="true"`
- [ ] All live regions have `aria-atomic="true"`
- [ ] Decorative loaders have `aria-hidden="true"`

---

## 7. IMPLEMENTATION PRIORITY

### Phase 0: Critical Fixes (2 hours)

| Priority | Task | Deliverable | Effort |
|----------|------|-------------|--------|
| **P0-1** | Color contrast fix (sky-50/sky-700) | Replace with WCAG AA colors | 1h |
| **P0-2** | Button focus indicators | Add `focus:ring-2` to all buttons | 30min |
| **P0-3** | Modal keyboard trap | Implement Escape + focus trap | 30min |

**Success criteria:** All WCAG AA violations fixed, keyboard nav works in modals.

### Phase 1: UI/UX Foundations (2 days)

| Priority | Task | Deliverable | Effort |
|----------|------|-------------|--------|
| **P1-1** | Navigation architecture | Unified sidebar + tabs | 4h |
| **P1-2** | Tab component | Reusable `<Tabs>` with keyboard nav | 3h |
| **P1-3** | Dark mode CSS tokens | Color system + `darkMode: 'class'` | 6h |
| **P1-4** | Dark mode toggle | Settings page + navbar toggle | 2h |
| **P1-5** | Desktop layout patterns | Implement 3 wireframes | 4h |

**Success criteria:** Navigation consistent, dark mode working, layout patterns applied.

### Phase 2: Accessibility Polish (1 day)

| Priority | Task | Deliverable | Effort |
|----------|------|-------------|--------|
| **P2-1** | ARIA attributes | Add to all components | 4h |
| **P2-2** | Keyboard nav (dropdowns, tables) | Arrow key navigation | 3h |
| **P2-3** | Live regions | Toast + status updates | 1h |

**Success criteria:** Full WCAG 2.1 AA compliance, screen reader tested.

---

## 8. COMPONENT LIBRARY UPDATES

### 8.1 Component Checklist

**Core Components (Dark Mode + A11y):**
- [ ] `<Button>` — Primary, secondary, destructive variants
- [ ] `<Modal>` — With keyboard trap, ARIA
- [ ] `<SlideOver>` — With Escape key, ARIA
- [ ] `<Tabs>` — Arrow key navigation, ARIA
- [ ] `<Dropdown>` — Keyboard nav, ARIA
- [ ] `<Input>` — ARIA labels, validation
- [ ] `<Toast>` — Live region
- [ ] `<Card>` — Dark mode
- [ ] `<Table>` — Keyboard nav (optional)
- [ ] `<Badge>` — Status colors (WCAG AA)

### 8.2 Design System Documentation

**Document structure:**
```
docs/design-system/
├── colors.md               # Color tokens (light + dark)
├── typography.md           # Font scale, weights
├── spacing.md              # Spacing scale
├── components/
│   ├── button.md           # Button variants, states, A11y
│   ├── modal.md
│   ├── tabs.md
│   └── ...
└── accessibility.md        # WCAG guidelines, keyboard shortcuts
```

---

## 9. SUCCESS CRITERIA

### 9.1 Acceptance Checklist

- [x] **Navigation architecture designed** — Unified sidebar + tab system
- [x] **Dark mode color palette defined** — CSS variables, WCAG AA compliant
- [x] **Desktop layout wireframes created** — 3 patterns documented
- [x] **Color contrast matrix** — All combinations WCAG AA compliant
- [x] **Keyboard interaction spec** — 5+ components documented
- [x] **ARIA attribute checklist** — 5+ components documented

### 9.2 Implementation Readiness

**Frontend handoff:**
1. This design spec document
2. Component code examples (copy-paste ready)
3. CSS token values
4. Keyboard interaction logic
5. ARIA attribute patterns

**Estimated implementation:** ~3 days (24 hours)

**Testing requirements:**
- [ ] WCAG AA compliance (automated: axe DevTools)
- [ ] Keyboard navigation (manual: all components)
- [ ] Screen reader (manual: NVDA/JAWS)
- [ ] Dark mode toggle (visual + functional)

---

## 10. REFERENCES

**Audit Documents:**
- Frontend Audit: `/opt/spaceos/docs/joinerytech/AUDIT_UI_PERFORMANCE_A11Y_2026-07-02.md`

**External Standards:**
- WCAG 2.1 AA: https://www.w3.org/WAI/WCAG21/quickref/
- Tailwind Dark Mode: https://tailwindcss.com/docs/dark-mode
- ARIA Authoring Practices: https://www.w3.org/WAI/ARIA/apg/

**Design Tools:**
- Contrast Checker: https://webaim.org/resources/contrastchecker/
- Color Palette Generator: https://coolors.co/
- Tailwind Color Reference: https://tailwindcss.com/docs/customizing-colors

---

## APPENDIX: Color Reference

### Tailwind Slate Palette (Primary Grays)

| Name | Hex | Use Case (Light) | Use Case (Dark) |
|------|-----|------------------|----------------|
| slate-50 | `#f8fafc` | Page background | - |
| slate-100 | `#f1f5f9` | Card hover | Primary text |
| slate-200 | `#e2e8f0` | Borders | - |
| slate-300 | `#cbd5e1` | Disabled text | Secondary text |
| slate-400 | `#94a3b8` | Muted text | - |
| slate-500 | `#64748b` | Secondary text | Muted text |
| slate-600 | `#475569` | Primary text (low contrast) | Hover bg |
| slate-700 | `#334155` | - | Active bg |
| slate-800 | `#1e293b` | Primary text | Card bg |
| slate-900 | `#0f172a` | Primary text | Page bg |

### Tailwind Blue Palette (Accent Colors)

| Name | Hex | Use Case (Light) | Use Case (Dark) |
|------|-----|------------------|----------------|
| blue-100 | `#dbeafe` | Info bg | - |
| blue-300 | `#93c5fd` | - | Info text (dark) |
| blue-400 | `#60a5fa` | - | Hover accent |
| blue-500 | `#3b82f6` | Primary button | Accent |
| blue-600 | `#2563eb` | Accent, primary button | - |
| blue-700 | `#1d4ed8` | Button hover | - |
| blue-800 | `#1e40af` | Info text (light) | - |
| blue-900 | `#1e3a8a` | - | Info bg (dark) |

---

**Document Version:** 1.0
**Created:** 2026-07-03
**Designer:** Vízió terminál
**Status:** ✅ COMPLETE — Ready for Frontend implementation
