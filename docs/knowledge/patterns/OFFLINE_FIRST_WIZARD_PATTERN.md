# Offline-First Wizard Pattern — React Implementation

**Created:** 2026-06-22 (based on EHS Incident Report Wizard)

---

## Pattern Overview

**Offline-First Wizard** = Multi-step form flow with local draft persistence, auto-retry on failure, and seamless online/offline transitions.

### Use Case: Compliance-Critical Mobile Forms

**Problem:** Field workers need to report incidents immediately, even without internet connection. Data loss is unacceptable.

**Solution:** Client-side draft persistence + background retry service + optimistic UI updates.

---

## Architecture Pattern

### Component Hierarchy

```
<IncidentReportFAB />              ← Floating Action Button trigger
  └─ <IncidentReportWizard />      ← Modal/fullscreen container
       ├─ Progress indicator
       ├─ <StepIncidentType />     ← Step 1: Radio selection
       ├─ <StepDetails />          ← Step 2: Form inputs + photo upload
       └─ <StepReview />           ← Step 3: Summary before submit
```

### State Management (Zustand + LocalForage)

```typescript
// stores/incidentDraftStore.ts
import create from 'zustand'
import { persist } from 'zustand/middleware'
import localforage from 'localforage'

interface IncidentDraft {
  id: string
  incidentType: 'near-miss' | 'injury' | 'property'
  location: string
  timestamp: string
  description: string
  photoMetadata?: { name: string; size: number; type: string }
  retryCount: number
  status: 'draft' | 'submitting' | 'failed' | 'submitted'
}

interface IncidentDraftStore {
  drafts: IncidentDraft[]
  currentDraft: IncidentDraft | null

  startNewDraft: () => void
  updateDraft: (updates: Partial<IncidentDraft>) => void
  submitDraft: (draftId: string) => Promise<void>
  deleteDraft: (draftId: string) => void
  clearCurrentDraft: () => void
}

export const useIncidentDraftStore = create<IncidentDraftStore>()(
  persist(
    (set, get) => ({
      drafts: [],
      currentDraft: null,

      startNewDraft: () => {
        const newDraft: IncidentDraft = {
          id: crypto.randomUUID(),
          incidentType: 'near-miss',
          location: '',
          timestamp: new Date().toISOString(),
          description: '',
          retryCount: 0,
          status: 'draft'
        }
        set({ currentDraft: newDraft })
      },

      updateDraft: (updates) => {
        set((state) => ({
          currentDraft: state.currentDraft
            ? { ...state.currentDraft, ...updates }
            : null
        }))
      },

      submitDraft: async (draftId) => {
        const draft = get().drafts.find(d => d.id === draftId)
        if (!draft) return

        try {
          set((state) => ({
            drafts: state.drafts.map(d =>
              d.id === draftId ? { ...d, status: 'submitting' } : d
            )
          }))

          // API call (will be retried by offlineRetryService if fails)
          await fetch('/api/ehs/events', {
            method: 'POST',
            body: JSON.stringify(draft)
          })

          // Success: remove from drafts
          set((state) => ({
            drafts: state.drafts.filter(d => d.id !== draftId)
          }))
        } catch (error) {
          // Failure: mark as failed, increment retry count
          set((state) => ({
            drafts: state.drafts.map(d =>
              d.id === draftId
                ? { ...d, status: 'failed', retryCount: d.retryCount + 1 }
                : d
            )
          }))
        }
      },

      deleteDraft: (draftId) => {
        set((state) => ({
          drafts: state.drafts.filter(d => d.id !== draftId)
        }))
      },

      clearCurrentDraft: () => {
        set({ currentDraft: null })
      }
    }),
    {
      name: 'incident-drafts',
      storage: {
        getItem: (name) => localforage.getItem(name),
        setItem: (name, value) => localforage.setItem(name, value),
        removeItem: (name) => localforage.removeItem(name)
      }
    }
  )
)
```

**Key Points:**
- **LocalForage:** Async storage wrapper (IndexedDB/WebSQL/localStorage fallback)
- **Persist middleware:** Auto-save state to storage
- **Photo NOT persisted:** Only metadata (name, size, type) to avoid storage quota
- **Retry count:** Track failed attempts (max 3, then manual intervention)

---

## Background Retry Service

### iOS Safari Compatible (No Background Sync API)

```typescript
// services/offlineRetryService.ts
import { useIncidentDraftStore } from '../stores/incidentDraftStore'

class OfflineRetryService {
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false

  start() {
    if (this.isRunning) return

    this.isRunning = true
    this.intervalId = setInterval(() => {
      this.retryFailedDrafts()
    }, 5 * 60 * 1000) // 5 minutes

    // Immediate first run
    this.retryFailedDrafts()
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isRunning = false
  }

  private async retryFailedDrafts() {
    const { drafts, submitDraft } = useIncidentDraftStore.getState()
    const failedDrafts = drafts.filter(d => d.status === 'failed' && d.retryCount < 3)

    for (const draft of failedDrafts) {
      if (!navigator.onLine) break // Skip if offline

      try {
        await submitDraft(draft.id)
      } catch (error) {
        console.error(`Retry failed for draft ${draft.id}:`, error)
      }
    }
  }
}

export const offlineRetryService = new OfflineRetryService()
```

**Why not Background Sync API?**
- Safari (iOS + macOS) does **NOT** support `navigator.serviceWorker.sync`
- Polling is Safari-compatible and reliable for 5-minute intervals

---

## Photo Upload Pattern (Compression + S3 Presigned URL)

### Client-Side Compression

```typescript
// utils/imageCompression.ts
import imageCompression from 'browser-image-compression'

export async function compressAndStripEXIF(
  file: File
): Promise<{ blob: Blob; metadata: { name: string; size: number; type: string } }> {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 800,
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.8,
    preserveExif: false // CRITICAL: strip EXIF for privacy (GPS coords, camera model)
  }

  const compressedBlob = await imageCompression(file, options)

  return {
    blob: compressedBlob,
    metadata: {
      name: file.name,
      size: compressedBlob.size,
      type: compressedBlob.type
    }
  }
}
```

**Key Points:**
- **Max 800px:** Mobile photos don't need high resolution for incident reports
- **EXIF stripping:** Privacy compliance (remove GPS, camera serial, timestamp)
- **Web Worker:** Non-blocking compression

### S3 Presigned URL Upload

```typescript
// services/ehsPhotoService.ts
export async function uploadPhoto(file: File): Promise<string> {
  // 1. Compress + strip EXIF
  const { blob, metadata } = await compressAndStripEXIF(file)

  // 2. Get presigned URL from backend
  const presignedResponse = await fetch('/api/ehs/photos/presigned-url', {
    method: 'POST',
    body: JSON.stringify({
      fileName: metadata.name,
      fileSize: metadata.size,
      contentType: metadata.type
    })
  })

  const { uploadUrl, s3Key } = await presignedResponse.json()

  // 3. Upload directly to S3 (no backend proxy)
  await fetch(uploadUrl, {
    method: 'PUT',
    body: blob,
    headers: {
      'Content-Type': metadata.type
    }
  })

  // 4. Return S3 key for backend reference
  return s3Key
}
```

**Why Presigned URL?**
- Backend doesn't handle file upload (no multipart/form-data parsing)
- Client uploads directly to S3 (faster, cheaper)
- Backend validates file size/type before issuing URL (security)

---

## Wizard Navigation Pattern

### Step Validation + Conditional Next

```typescript
// components/EHS/IncidentReportWizard.tsx
const [currentStep, setCurrentStep] = useState(0)
const [canProceed, setCanProceed] = useState(false)

// Step 1: Incident type required
useEffect(() => {
  if (currentStep === 0) {
    setCanProceed(!!currentDraft?.incidentType)
  }
}, [currentStep, currentDraft?.incidentType])

// Step 2: Location + description required
useEffect(() => {
  if (currentStep === 1) {
    setCanProceed(
      !!currentDraft?.location &&
      currentDraft?.description.length >= 10
    )
  }
}, [currentStep, currentDraft?.location, currentDraft?.description])

// Step 3: Review (always can proceed)
useEffect(() => {
  if (currentStep === 2) {
    setCanProceed(true)
  }
}, [currentStep])

return (
  <div>
    {currentStep === 0 && <StepIncidentType />}
    {currentStep === 1 && <StepDetails />}
    {currentStep === 2 && <StepReview />}

    <button
      onClick={() => setCurrentStep(prev => prev + 1)}
      disabled={!canProceed}
    >
      Next
    </button>
  </div>
)
```

---

## Mobile UX Patterns

### Floating Action Button (FAB)

```typescript
// components/EHS/IncidentReportFAB.tsx
<button
  className="fixed bottom-4 right-4 w-14 h-14 bg-rose-600 rounded-full shadow-lg hover:shadow-xl"
  style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} // iOS safe area
  onClick={handleOpenWizard}
>
  {failedDraftsCount > 0 && (
    <span className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full w-5 h-5 text-xs">
      {failedDraftsCount}
    </span>
  )}
  <Icon name="alert-triangle" />
</button>
```

**Key Points:**
- `env(safe-area-inset-bottom)` — iOS notch/home indicator spacing
- Badge indicator for failed drafts (amber = warning, needs retry)
- Always visible (z-index: 50)

### Fullscreen Modal on Mobile

```typescript
<div
  className={`
    fixed inset-0 bg-white z-50
    md:relative md:inset-auto md:max-w-2xl md:mx-auto md:rounded-lg
  `}
>
  {/* Mobile: fullscreen takeover */}
  {/* Desktop: centered modal */}
</div>
```

---

## Testing Strategy

### Unit Tests (Zustand Store)

```typescript
// __tests__/incidentDraftStore.test.ts
import { renderHook, act } from '@testing-library/react-hooks'
import { useIncidentDraftStore } from '../stores/incidentDraftStore'

test('startNewDraft creates draft with UUID', () => {
  const { result } = renderHook(() => useIncidentDraftStore())

  act(() => {
    result.current.startNewDraft()
  })

  expect(result.current.currentDraft).toMatchObject({
    id: expect.any(String),
    incidentType: 'near-miss',
    status: 'draft',
    retryCount: 0
  })
})

test('submitDraft increments retryCount on failure', async () => {
  const { result } = renderHook(() => useIncidentDraftStore())

  // Mock fetch to fail
  global.fetch = jest.fn(() => Promise.reject(new Error('Network error')))

  act(() => {
    result.current.startNewDraft()
  })

  const draftId = result.current.currentDraft!.id

  await act(async () => {
    await result.current.submitDraft(draftId)
  })

  const draft = result.current.drafts.find(d => d.id === draftId)
  expect(draft?.retryCount).toBe(1)
  expect(draft?.status).toBe('failed')
})
```

### Integration Tests (Wizard Flow)

```typescript
// __tests__/IncidentReportWizard.test.tsx
test('wizard navigation: step 1 → 2 → 3 → submit', async () => {
  const { getByText, getByLabelText } = render(<IncidentReportWizard open />)

  // Step 1: Select incident type
  fireEvent.click(getByLabelText('Injury'))
  fireEvent.click(getByText('Next'))

  // Step 2: Fill details
  fireEvent.change(getByLabelText('Location'), { target: { value: 'Workshop A' } })
  fireEvent.change(getByLabelText('Description'), { target: { value: 'Test incident description' } })
  fireEvent.click(getByText('Next'))

  // Step 3: Review and submit
  expect(getByText('Injury')).toBeInTheDocument()
  expect(getByText('Workshop A')).toBeInTheDocument()

  fireEvent.click(getByText('Submit'))

  await waitFor(() => {
    expect(fetch).toHaveBeenCalledWith('/api/ehs/events', expect.any(Object))
  })
})
```

---

## Common Pitfalls

### 1. Storing large files in localStorage
**Problem:** Photo Blob in localStorage → quota exceeded
**Fix:** Store only metadata, keep Blob in memory or File API

### 2. Background Sync API not supported in Safari
**Problem:** ServiceWorker sync doesn't fire on iOS
**Fix:** Polling with setInterval (5 min)

### 3. Photo EXIF data leaking GPS coords
**Problem:** Privacy breach, compliance violation
**Fix:** `browser-image-compression` with `preserveExif: false`

### 4. Wizard validation race condition
**Problem:** Next button enabled before async validation completes
**Fix:** `useEffect` dependencies + `canProceed` state

---

## Performance Considerations

- **LocalForage over localStorage:** Async API prevents main thread blocking
- **Web Worker compression:** Large photos (5MB+) compressed without UI freeze
- **Lazy wizard steps:** Only render current step component (not all 3 simultaneously)
- **Retry exponential backoff:** 5 min → 10 min → 20 min (future enhancement)

---

## References

- Implementation: `portal/src/components/EHS/` (15 files, 13 tests pass)
- DONE message: `terminals/frontend/outbox/2026-06-22_019_ehs-incident-report-wizard-done.md`
- Dependencies: `browser-image-compression`, `localforage`, `zustand`
- Compliance: GDPR (EXIF stripping), 72h sync deadline (ADR-046)
