---
name: testing-frontend-react
description: 'React component testing patterns with Vitest and React Testing Library. Use when writing component tests, user-event simulations, mocks, or snapshot tests.'
domain: engineering
last_updated: 2026-02-24
---

# ?? Testing - Frontend (React) Skill

**Summary:** Ez a skill biztosítja a React komponens tesztelési mintázatait és best practice-eit a Vitest és React Testing Library használatával.

## ?? Mikor töltsd be?

- **React Komponens Teszt**: Modal, Form, Button tesztelése.
- **Hook Teszt**: Custom hook logika (pl. `useConfirm`) ellenõrzése.
- **Validáció**: Zod sémák tesztelése.
- **Interakció**: User eventek (kattintás, gépelés) szimulálása.

---

## ??? Architektúra és Szabályok

A projekt a **Vitest**-et használja test runnerként és a **React Testing Library**-t a komponensek tesztelésére.

### ??? Technológiai Stack

- **Runner**: Vitest (Jest kompatibilis, gyors).
- **DOM**: jsdom (böngészõ környezet szimulálása).
- **Utils**: `@testing-library/react` (render, screen), `@testing-library/user-event` (interakciók).

### ?? Tesztelési Konvenciók

- **Behavior Driven**: Nem az implementációt, hanem a viselkedést teszteljük (pl. "Gombnyomásra meghívódik a függvény" vs "A state értéke true lesz").
- **User-Centric**: `getByRole`, `getByLabelText` szelektorok preferálása a `querySelector` helyett.
- **AAA Pattern**: Arrange (Elõkészítés), Act (Cselekvés), Assert (Ellenõrzés).
- **Naming**: `[Action]_[Condition]_[Result]` (pl. `renders_error_when_input_is_invalid`).

---

## ?? Kód Minták (N-shot Patterns)

### 1. Komponens Teszt Minta (Modal)

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal';

describe('Modal Component', () => {
    //  Renderelés ellenõrzése
    it('renders content when open is true', () => {
        render(
            <Modal open={true} onClose={vi.fn()} title="Test Modal">
                <p>Test Content</p>
            </Modal>
        );
        expect(screen.getByText('Test Content')).toBeInTheDocument();
        expect(screen.getByText('Test Modal')).toBeInTheDocument();
    });

    // ?? Interakció ellenõrzése
    it('calls onClose when close button is clicked', async () => {
        const onClose = vi.fn();
        const user = userEvent.setup();

        render(
            <Modal open={true} onClose={onClose} title="Test">
                <p>Content</p>
            </Modal>
        );

        const closeButton = screen.getByLabelText('Bezárás');
        await user.click(closeButton);
        expect(onClose).toHaveBeenCalled();
    });
});
```

### 2. FormField Component Test (React Hook Form Integration)

**Fájl**: `src/features/shared/components/FormField.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField } from './FormField';

describe('FormField Component', () => {
    // ? LABEL: Label megjelenik
    it('renders label when provided', () => {
        render(
            <FormField
                label="Project Name"
                placeholder="Enter name"
            />
        );
        expect(screen.getByText('Project Name')).toBeInTheDocument();
    });

    // ?? REQUIRED: Required indicator (*) megjelenik
    it('displays required indicator when required=true', () => {
        render(
            <FormField
                label="Project Name"
                required
            />
        );
        const requiredIndicator = screen.getByText('*');
        expect(requiredIndicator).toBeInTheDocument();
        expect(requiredIndicator).toHaveClass('form-field-required');
    });

    // ? ERROR: Error message piros felirat
    it('displays error message when error prop is provided', () => {
        render(
            <FormField
                label="Project Name"
                error="Project name is required"
            />
        );
        expect(screen.getByText('Project name is required')).toBeInTheDocument();
    });

    // ?? ERROR STYLING: Input error class-t kap
    it('adds error class to input when error exists', () => {
        render(
            <FormField
                label="Project Name"
                error="This field is required"
            />
        );
        const input = screen.getByRole('textbox');
        expect(input).toHaveClass('error');
    });

    // ?? HELPER TEXT: Helper text (támogató szöveg) megjelenik
    it('displays helper text when provided and no error', () => {
        render(
            <FormField
                label="Project Name"
                helperText="Name must be unique"
            />
        );
        expect(screen.getByText('Name must be unique')).toBeInTheDocument();
    });

    // ?? HELPER TEXT HIDDEN: Helper text REJTETT, ha error van
    it('hides helper text when error exists', () => {
        const { rerender } = render(
            <FormField
                label="Project Name"
                helperText="Name must be unique"
            />
        );
        expect(screen.getByText('Name must be unique')).toBeInTheDocument();

        // Re-render with error
        rerender(
            <FormField
                label="Project Name"
                error="Name is required"
                helperText="Name must be unique"
            />
        );
        expect(screen.queryByText('Name must be unique')).not.toBeInTheDocument();
        expect(screen.getByText('Name is required')).toBeInTheDocument();
    });

    // ?? REF FORWARDING: Ref-el elérhetõ az input
    it('forwards ref to input element', () => {
        const ref = { current: null };
        render(
            <FormField
                ref={ref}
                label="Project Name"
            />
        );
        expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    // ?? useId INTEGRATION: Stabil ID generálódik
    it('generates stable ID for input-label linking', () => {
        render(
            <FormField
                label="Project Name"
            />
        );
        const label = screen.getByText('Project Name');
        const input = screen.getByRole('textbox');

        expect(label).toHaveAttribute('for', input.id);
        expect(input.id).toMatch(/:[0-9]+:/) // useId format
    });

    // ?? DISABLED STATE: Letiltott input
    it('renders disabled input when disabled=true', () => {
        render(
            <FormField
                label="Project Name"
                disabled
            />
        );
        const input = screen.getByRole('textbox');
        expect(input).toBeDisabled();
        expect(input).toHaveClass('disabled');
    });

    // ?? REACT HOOK FORM: {...register()} register props mûködik
    it('accepts and merges React Hook Form register props', () => {
        const registerProps = {
            name: 'projectName',
            onChange: vi.fn(),
        };

        render(
            <FormField
                label="Project Name"
                {...registerProps}
            />
        );

        const input = screen.getByRole('textbox') as HTMLInputElement;
        expect(input.name).toBe('projectName');

        // onChange mock hívódik
        fireEvent.change(input, { target: { value: 'Test' } });
        expect(registerProps.onChange).toHaveBeenCalled();
    });
});
```

### 3. ConfirmDialog Component Test (Async + Loading)

**Fájl**: `src/features/shared/components/ConfirmDialog.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog Component', () => {
    // ?? TITLE & MESSAGE: Cím és üzenet megjelenik
    it('displays title and message', () => {
        render(
            <ConfirmDialog
                open={true}
                onClose={vi.fn()}
                title="Delete Project?"
                message="Are you sure? This action cannot be undone."
            />
        );

        expect(screen.getByText('Delete Project?')).toBeInTheDocument();
        expect(screen.getByText('Are you sure? This action cannot be undone.')).toBeInTheDocument();
    });

    // ? CONFIRM BUTTON: Confirm gomb hívja onConfirm-ot
    it('calls onConfirm when confirm button is clicked', async () => {
        const onConfirm = vi.fn();
        const user = userEvent.setup();

        render(
            <ConfirmDialog
                open={true}
                onClose={vi.fn()}
                title="Delete?"
                message="Sure?"
                onConfirm={onConfirm}
                confirmLabel="Delete"
            />
        );

        const confirmBtn = screen.getByRole('button', { name: 'Delete' });
        await user.click(confirmBtn);

        expect(onConfirm).toHaveBeenCalled();
    });

    // ? CANCEL BUTTON: Cancel gomb hívja onClose-t
    it('calls onClose when cancel button is clicked', async () => {
        const onClose = vi.fn();
        const user = userEvent.setup();

        render(
            <ConfirmDialog
                open={true}
                onClose={onClose}
                message="Sure?"
                onConfirm={vi.fn()}
                cancelLabel="No"
            />
        );

        const cancelBtn = screen.getByRole('button', { name: 'No' });
        await user.click(cancelBtn);

        expect(onClose).toHaveBeenCalled();
    });

    // ? ASYNC HANDLER: Async onConfirm vár befejezõdésére
    it('waits for async onConfirm to complete', async () => {
        const onConfirm = vi.fn().mockImplementation(
            async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
                return Promise.resolve();
            }
        );
        const onClose = vi.fn();
        const user = userEvent.setup();

        render(
            <ConfirmDialog
                open={true}
                onClose={onClose}
                message="Delete?"
                onConfirm={onConfirm}
            />
        );

        const confirmBtn = screen.getByRole('button', { name: 'Igen' });
        await user.click(confirmBtn);

        // Wait for async handler
        await waitFor(() => {
            expect(onConfirm).toHaveBeenCalled();
        });

        expect(onClose).toHaveBeenCalled();
    });

    // ?? LOADING SPINNER: Loading state alatt spinner látható
    it('displays loading spinner during async operation', async () => {
        const onConfirm = vi.fn(async () => {
            await new Promise(resolve => setTimeout(resolve, 500));
        });

        render(
            <ConfirmDialog
                open={true}
                onClose={vi.fn()}
                message="Delete?"
                onConfirm={onConfirm}
                isLoading={true}
            />
        );

        // Loading spinner megjelenik
        expect(screen.getByRole('status')).toBeInTheDocument(); // spinner
    });

    // ?? DANGER VARIANT: Danger gomb piros/warning stílus
    it('applies danger variant styling', () => {
        render(
            <ConfirmDialog
                open={true}
                onClose={vi.fn()}
                message="Delete?"
                onConfirm={vi.fn()}
                confirmVariant="danger"
            />
        );

        const confirmBtn = screen.getByRole('button', { name: /Igen/i });
        expect(confirmBtn).toHaveClass('btn-danger');
    });

    // ?? BUTTON LABELS: Custom gomb feliratok mûködnek
    it('uses custom button labels', () => {
        render(
            <ConfirmDialog
                open={true}
                onClose={vi.fn()}
                message="Confirm action?"
                onConfirm={vi.fn()}
                confirmLabel="Proceed"
                cancelLabel="Abort"
            />
        );

        expect(screen.getByRole('button', { name: 'Proceed' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Abort' })).toBeInTheDocument();
    });

    // ?? ERROR HANDLING: Hiba bekövetkezése nem csapódik össze
    it('handles error in onConfirm gracefully', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const onConfirm = vi.fn().mockRejectedValueOnce(new Error('Delete failed'));
        const onClose = vi.fn();
        const user = userEvent.setup();

        render(
            <ConfirmDialog
                open={true}
                onClose={onClose}
                message="Delete?"
                onConfirm={onConfirm}
            />
        );

        const confirmBtn = screen.getByRole('button', { name: /Igen/i });
        await user.click(confirmBtn);

        await waitFor(() => {
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining('ConfirmDialog error')
            );
        });

        consoleErrorSpy.mockRestore();
    });
});
```

---

## ?? Hook Test Mintázat

### useConfirm Hook Test

**Fájl**: `src/features/shared/hooks/useConfirm.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConfirm } from './useConfirm';

describe('useConfirm Hook', () => {
    // ?? STATE INIT: Hook inicializálódik
    it('initializes with correct default state', () => {
        const { result } = renderHook(() => useConfirm());

        expect(result.current.state.open).toBe(false);
        expect(result.current.state.message).toBe('');
    });

    // ?? CONFIRM DIALOG: confirm() hívása nyit egy dialógust
    it('opens confirm dialog when confirm() is called', async () => {
        const { result } = renderHook(() => useConfirm());

        act(() => {
            result.current.confirm({
                title: 'Delete?',
                message: 'Sure?',
            });
        });

        expect(result.current.state.open).toBe(true);
        expect(result.current.state.title).toBe('Delete?');
        expect(result.current.state.message).toBe('Sure?');
    });

    // ? RESOLVE TRUE: handleConfirm() resolve-el true értékkel
    it('resolves with true when handleConfirm is called', async () => {
        const { result } = renderHook(() => useConfirm());

        let resolvedValue: boolean | undefined;

        act(() => {
            result.current.confirm({
                message: 'Sure?',
            }).then(value => {
                resolvedValue = value;
            });
        });

        act(() => {
            result.current.handleConfirm();
        });

        await new Promise(r => setTimeout(r, 0));

        expect(resolvedValue).toBe(true);
        expect(result.current.state.open).toBe(false);
    });

    // ? RESOLVE FALSE: handleCancel() resolve-el false értékkel
    it('resolves with false when handleCancel is called', async () => {
        const { result } = renderHook(() => useConfirm());

        let resolvedValue: boolean | undefined;

        act(() => {
            result.current.confirm({
                message: 'Sure?',
            }).then(value => {
                resolvedValue = value;
            });
        });

        act(() => {
            result.current.handleCancel();
        });

        await new Promise(r => setTimeout(r, 0));

        expect(resolvedValue).toBe(false);
        expect(result.current.state.open).toBe(false);
    });

    // ?? MULTIPLE CALLS: Több confirm() hívás egymás után mûködik
    it('handles multiple sequential confirm() calls', async () => {
        const { result } = renderHook(() => useConfirm());

        // First confirm
        const promise1 = result.current.confirm({
            message: 'First?',
        });

        act(() => {
            result.current.handleConfirm();
        });

        const value1 = await promise1;
        expect(value1).toBe(true);

        // Second confirm
        const promise2 = result.current.confirm({
            message: 'Second?',
        });

        act(() => {
            result.current.handleCancel();
        });

        const value2 = await promise2;
        expect(value2).toBe(false);
    });
});
```

---

## ?? Validation Schema Test Mintázat

### Zod Schema Test

**Fájl**: `src/features/shared/validation/schemas.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import {
    ProjectFormSchema,
    WorkTaskFormSchema,
} from './schemas';

describe('Zod Validation Schemas', () => {
    describe('ProjectFormSchema', () => {
        // ? VALID DATA: Jó adat validálódik
        it('validates correct project data', () => {
            const data = {
                name: 'Test Project',
                description: 'A test project',
                startDate: '2026-02-01',
                dueDate: '2026-03-01',
            };

            const result = ProjectFormSchema.safeParse(data);
            expect(result.success).toBe(true);
        });

        // ?? MINIMUM LENGTH: Túl rövid név nem validálódik
        it('fails when name is too short', () => {
            const data = { name: 'ab' }; // < 3 chars

            const result = ProjectFormSchema.safeParse(data);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain('legalább 3');
            }
        });

        // ?? MAXIMUM LENGTH: Túl hosszú név nem validálódik
        it('fails when name is too long', () => {
            const data = { name: 'a'.repeat(101) }; // > 100 chars

            const result = ProjectFormSchema.safeParse(data);
            expect(result.success).toBe(false);
        });

        // ?? EMPTY: Üres név nem validálódik
        it('fails when name is empty', () => {
            const data = { name: '' };

            const result = ProjectFormSchema.safeParse(data);
            expect(result.success).toBe(false);
        });

        // ?? OPTIONAL: Opcionális mezõk kihagyhatók
        it('validates with optional fields', () => {
            const data = {
                name: 'Test Project',
                description: undefined,
                startDate: undefined,
            };

            const result = ProjectFormSchema.safeParse(data);
            expect(result.success).toBe(true);
        });

        // ?? INVALID DATE: Érvénytelen dátum nem validálódik
        it('fails with invalid date format', () => {
            const data = {
                name: 'Test',
                dueDate: 'not-a-date',
            };

            const result = ProjectFormSchema.safeParse(data);
            expect(result.success).toBe(false);
        });

        // ?? TYPE INFERENCE: Zod type inference mûködik
        it('infers correct TypeScript types', () => {
            const data = {
                name: 'Test Project',
            };

            const result = ProjectFormSchema.safeParse(data);

            if (result.success) {
                // result.data típusa ProjectFormData
                const typed: typeof ProjectFormSchema._type = result.data;
                expect(typed.name).toBe('Test Project');
            }
        });
    });

    describe('WorkTaskFormSchema', () => {
        // ? VALID TASK: Task validálódik
        it('validates correct task data', () => {
            const data = {
                title: 'Implement feature',
                description: 'Add new dialog',
                projectId: 'proj-123',
                dueDate: '2026-02-15',
                priority: 'High',
            };

            const result = WorkTaskFormSchema.safeParse(data);
            expect(result.success).toBe(true);
        });

        // ?? MISSING PROJECT: Projekt nélkül nem validálódik
        it('fails when projectId is missing', () => {
            const data = {
                title: 'My Task',
                // projectId missing
            };

            const result = WorkTaskFormSchema.safeParse(data);
            expect(result.success).toBe(false);
        });

        // ?? ENUM: Priority enum validálódik
        it('validates priority enum values', () => {
            const validData = {
                title: 'Task',
                projectId: 'proj-1',
                priority: 'High',
            };

            const result = WorkTaskFormSchema.safeParse(validData);
            expect(result.success).toBe(true);

            // Invalid priority
            const invalidData = {
                title: 'Task',
                projectId: 'proj-1',
                priority: 'URGENT', // not in enum
            };

            const invalidResult = WorkTaskFormSchema.safeParse(invalidData);
            expect(invalidResult.success).toBe(false);
        });
    });
});
```

---

## ?? Test Naming Konvenciók

### Pattern

```
renders|calls|displays|validates|[action]_[condition]_[expected]
```

**Példák:**

| Test Neve | Leírás |
|-----------|--------|
| `renders_nothing_when_open_is_false` | Renders, Condition: open=false, Result: nothing |
| `calls_onClose_when_close_button_clicked` | Calls, Condition: close btn click, Result: onClose() |
| `displays_error_when_validation_fails` | Displays, Condition: validation fails, Result: error msg |
| `validates_correct_data` | Validates, Condition: good data, Result: passes |

---

## ??? Build / Run Parancsok

### Unit Tesztek futtatása

```bash
# Összes test
npm test

# Watch mode (dev alatt)
npm test -- --watch

# Konkrét test file
npm test Modal.test.tsx

# Konkrét test
npm test -- --reporter=verbose Modal

# UI mode (Vitest szép UI)
npm run test:ui

# Coverage report
npm run test:coverage
```

### CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: React Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test -- --run
      - run: npm run lint
      - run: npm run build
```

---

## ?? Gyakori Hibák

| Hiba | Oka | Megoldás |
|------|-----|----------|
| `"not wrapped in act(...)"` | State update assert elõtt | `await waitFor()` vagy `act()` |
| `"Cannot find module"` | Vitest setup hiányzik | `src/test/setup.ts` létrehozása |
| `"test timeout"` | Async test nem vár | `await waitFor()` helyett helyes await |
| `"Element not found"` | Async render elõtt assert | `await screen.findBy*()` |
| `Mock not working` | vi.fn() nem Vitest mock | `import { vi } from 'vitest'` |

---

## ?? Best Practices

### ? DO

- ? **User-centric tests**: `userEvent.click()` helyett `fireEvent`
- ? **Accessibility queries**: `getByRole()`, `getByLabelText()`
- ? **One behavior per test**: 1 describe = 1 komponens szegment
- ? **Async: waitFor()**: Ez explicit, olvasható, slow operations vár
- ? **Mock external deps**: API, storage, timers
- ? **Snapshot tests**: UI komponensekre (nem gyakran, csak stabil UI-hez)

### ? DON'T

- ? **Implementation details**: `querySelector('.modal-content')` › `getByRole()` jobb
- ? **Query selectors**: `querySelector()` › React Testing Library query
- ? **Testing internals**: Hook state tesztelése helyett output tesztelése
- ? **Mocking too much**: Csak external deps mock-oljunk
- ? **Hardcoded waits**: `await new Promise(r => setTimeout(r, 1000))` ? › `waitFor()` ?

---

## ?? Referenciák

- **Vitest**: [Vitest Documentation](https://vitest.dev/)
- **React Testing Library**: [Testing Library](https://testing-library.com/react)
- **User Event**: [User Event API](https://testing-library.com/user-event)
- **Zod**: [Zod Validation](https://zod.dev/)
- **Repository**: `JoineryTech.Flow.Web/src/features/shared/**/*.test.tsx`

---

**Utolsó frissítés**: 2026-02-01
