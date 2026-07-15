# F1-B — A11y primitívek: Button, SlideOver, Tabs, DataTable, Toast

- **Szerep:** frontend · **Státusz:** ✅ done (2026-07-14) · **Fázis:** F1

## Feladat
A spec §2 hat primitív-a11y-specjének implementálása a components/ui alatt.

## Kivitelezés / Eredmény (mind `src/joinerytech-portal/src/components/ui/`)
- `Button.tsx` újraírva: variánsok (primary/secondary/ghost/destructive/quiet), FSM-tiltás `disabledReason` proppal = `aria-disabled` (fókuszálható marad) + mindig-DOM-ban tooltip `aria-describedby`-jal; PrimaryBtn/GhostBtn kompat-wrapperek (20+ hívóhely miatt).
- `SlideOver.tsx` újraírva: fókusz-csapda (Tab-onkénti dinamikus re-query), fókusz-return, Esc/overlay/X zárás, role=dialog+aria-modal, háttér `inert` + scroll-lock, mobil bottom-sheet (85dvh, drag-handle, „Vissza", safe-area), motion-reduce.
- `Tabs.tsx` (ÚJ): roving tabindex, nyíl/Home/End wrap-pel, manuális aktiválás, disabled-skip, scroll-affordance.
- `DataTable.tsx` + `DataTableCards.tsx` + `dataTable.types.ts` (ÚJ): típusos oszlop-API, md+ szemantikus tábla (aria-sort ciklus + polite live-region) és <md kártya-lista UGYANABBÓL a row-modelből.
- `Toast.tsx` + `ToastItem.tsx` + `toastContext.ts`: live-region MINDIG a DOM-ban (null-render bug javítva), error=assertive + nem auto-dismiss, ≥5s + hover/focus pauza (WCAG 2.2.1), Esc.
- `hooks/useFocusTrap.ts`, `hooks/useInertBackground.ts` (ÚJ, újrafelhasználható); barrel frissítve.

## Tesztek
47/47 zöld (fókusz-csapda/return/Esc/inert; Tabs roving; DataTable aria-sort + kártya-paritás; Toast live-regionök). ESLint tiszta; tsc --noEmit 0. Megjegyzés: node_modules-hoz `npm ci --legacy-peer-deps` kellett (react-slider React 19 peer-konfliktus).
