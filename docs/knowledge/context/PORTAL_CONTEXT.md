# PORTAL (Frontend) Terminál Kontextusa

> **Source:** Portal memory sync 2026-06-17 + Design Principles feedback

---

## Szerepkör

Az FE terminál **SpaceOS Frontend (React 18)** fejlesztő. Feladata:
- Portal UI komponensek (data binding, event handling)
- RBAC alapú renderelés (Need-to-Know)
- UX/designpozíciót (design system, Layout, styling)
- E2E tesztek integrációja

---

## 5 Golden Rule alkalmazása a Frontendon

### #1: Data → Rules → Geometry

**Frontend csak renderel, nem számol vagy validál.**

```jsx
// ❌ HIBÁS: frontendon üzleti logika
const validatePrice = (price) => {
  return price > 0 && price < 100000 && price % 10 === 0;
};

// ✅ HELYES: backend API dönt
const [errors, setErrors] = useState([]);
const submitOrder = async (formData) => {
  const res = await fetch('/api/orders', { body: formData });
  if (!res.ok) setErrors(res.validation_errors);
};
```

**How to apply:**
- API válasz: `{ success: true, order: {...} }` vagy `{ success: false, errors: [...] }`
- Frontend: display error, re-render, nem "hitelesítés"
- Ha validáció kell, az API-t bővítsd, nem a frontendet

---

### #2: Modular Monolith — IParametricProduct

A Kernel nem tudja mi az "ajtó" vagy "szekrény" — csak `IParametricProduct`-ot lát.

**Frontend szintjén:** Közös komponensek (ProductCard, BOM Viewer, PriceDisplay) generikusak maradjanak. Joinery-specifikus UI (DoorProfile selector, HingeType picker) saját mappában.

```
src/components/
  ├── common/                  ← generic, minden modulhoz
  │   ├── ProductCard.tsx
  │   ├── PriceDisplay.tsx
  │   └── BOMViewer.tsx
  └── modules/
      ├── joinery/             ← Joinery-specifikus
      │   ├── DoorProfileEditor.tsx
      │   └── HingeTypeSelector.tsx
      └── cutting/             ← Cutting-specifikus
          └── ...
```

---

### #4: Need-to-Know RBAC

Megrendelő ne lássa a gyártó belső anyaglistáját. Minden view/oldal role-alapú.

**How to apply:**

```jsx
// Frontend: role-based conditional render
import { useAuth } from '@hooks/useAuth';

const BOMViewer = ({ order }) => {
  const { user } = useAuth();

  if (user.role === 'manufacturer') {
    return <DetailedBOM items={order.bom} costs={order.costs} />;
  }
  if (user.role === 'customer') {
    return <SimpleBOM items={order.publicBOM} />;
  }
  return <AccessDenied />;
};
```

**Tervezés:** Új view/oldal után ellenőrizd: ki láthatja ezt? Role-alapú feltételes renderelés kötelező.

---

## Frontend Stack

- **React 18** — functional components, hooks
- **TypeScript** — type safety
- **Styling:** TBD (Tailwind, CSS-in-JS?)
- **Build:** Vite vagy Next.js (TBD)
- **E2E:** Playwright (portal interaction testing)

---

## Portal specifikus design minták

### Inbox READ státusz kezelés

**Feladat feldolgozás után az inbox fájl frontmatter-jét azonnal frissíteni:**

```yaml
# BEFORE
status: UNREAD

# AFTER
status: READ
```

**Why:** Rendszer tracking — képi legyen melyik üzenet feldolgozva.

---

## Kommunikációs preferenciák

- **Magyarul ír** — konkrét kérdések, kontextus fontos
- **Bash tool:** Frontend dev (npm install, build, test) közvetlenül futható
- **Design döntések:** `/spaceos-frontend-arch-planner` skill használata ajánlott
- **UI feedback:** Gábor gyakorlati, actionable javaslatokat vár

---

## Doorstar Soft Launch prioritás

- **UX stabilitás** — Doorstar customer-happy flow
- **Performance** — no spinners, fast render (target: <1s page load)
- **Mobile-friendly** — ajtógyártó site: munkahelyi tablet + desktop

---

## Források

- `/opt/spaceos/frontend/joinerytech-portal/CLAUDE.md` — Portal terminál full doc
- `docs/knowledge/architecture/DESIGN_MEMORY.md` — Design principles & Golden Rules
- `/spaceos-frontend-arch-planner` skill — UX/arch döntésekhez
