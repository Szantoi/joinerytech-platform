# Sales modul — Phase 2 Design Spec
**Projekt:** JoineryTech Portal  
**Modul:** `/w/sales`  
**Státusz:** Design szükséges — implementáció blokkolva  
**Létrehozva:** 2026-05-28  
**Szerző:** FE terminál

---

## Kontextus

A Phase 1 (FE-038) bekötötte az olvasó API-kat: customer lista, quote lista, dashboard KPI-ok,
`CreateCustomerSlideOver`. A Sales modul backendje **24 endpointtal, 102 teszttel kész** (5009-es port).

Ebből az alábbi funkcionalitások **nincs frontenden** — csak ezek implementálásával lesz a
rendszer az értékesítők számára élesbe vehető.

---

## Prioritás 1 — Soft Launch-hoz kötelező

### 1.1 `QuoteDetailSlideOver`

**Miért kritikus:** Nélküle ajánlatot küldeni, elfogadni, elutasítani, gyártásba konvertálni
csak API-n keresztül lehet. Az értékesítők nem tudják végigvinni a sales flow-t.

**Megnyitás:** `SalesQuotes` táblázatban sor kattintása.

**Méret:** `width={680}`  
**Title:** `q.quoteNumber` (pl. `"AJ-2026-0042"`)  
**Subtitle:** `q.customerName`

#### Layout (px-5 py-4 space-y-6)

```
┌─────────────────────────────────────────────────────────────┐
│  AJ-2026-0042          [Kiküldve]                           │
│  Bognár Bútor Kft.     Felelős: Szabó A.                    │
│  Létrehozva: 2026-05-01   Lejár: 2026-05-15                 │
├─────────────────────────────────────────────────────────────┤
│  TÉTELEK                                              [+ Tétel hozzáadása] │
│  ┌──────────────────┬──────┬──────────┬──────────┬──┐       │
│  │ Megnevezés       │ Qty  │ Egységár │ Összeg   │  │       │
│  ├──────────────────┼──────┼──────────┼──────────┼──┤       │
│  │ Belső ajtó 90cm  │  12  │ 85 000   │ 1 020 000│ ✕│       │
│  │ Tok szett        │  12  │  18 000  │   216 000│ ✕│       │
│  └──────────────────┴──────┴──────────┴──────────┴──┘       │
│                                         Nettó:  1 236 000 Ft │
│                                         ÁFA 27%:  333 720 Ft │
│                                         Bruttó: 1 569 720 Ft │
├─────────────────────────────────────────────────────────────┤
│  AKCIÓK                                                     │
│  [🔑 Szerkesztés]  [📤 Küldés]  [🗄 Archiválás]            │
└─────────────────────────────────────────────────────────────┘
```

#### Fejléc szekció

```tsx
// Section label stílus (minden szekcióhoz)
"text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-2"

// Státusz badge → STATUS_MAP-ből (Draft/Sent/Accepted/Rejected/Archived/ConversionPending/Converted)
// Összefoglaló sorok: key-value, dt text-stone-500 w-32, dd text-stone-900
```

| Mező | Forrás |
|---|---|
| Ajánlatszám | `q.quoteNumber` |
| Státusz badge | `STATUS_MAP[q.status]` |
| Ügyfél | `q.customerName` |
| Felelős | `q.ownerName` |
| Létrehozva | `q.createdAt` |
| Lejár | `q.expiresAt ?? "—"` |

#### Tételek szekció

API hívás: `GET /sales/api/quotes/{id}` — a lista-nézet nem tartalmazza a tételeket.

```typescript
interface QuoteDto {
  id: string
  quoteNumber: string
  customerName: string
  status: QuoteStatus
  createdAt: string
  expiresAt: string | null
  lineCount: number
  totalValue: number
  ownerName: string
  lines: QuoteLineDto[]   // ← csak detail endpoint adja vissza
  subtotal: number
  vatAmount: number
  total: number
}

interface QuoteLineDto {
  id: string
  description: string
  quantity: number
  unitPrice: number
  lineTotal: number
}
```

**Táblázat:**
- Fejléc: `text-[10.5px] uppercase tracking-wide text-stone-500`
- Sor: hover `bg-stone-50/40`, szegély `border-b border-stone-100`
- Mennyiség és ár inline szerkeszthető ha `status === 'Draft'`
  - `PUT /sales/api/quotes/{id}/lines/{lineId}` — `{ quantity, unitPrice }`
  - Szerkesztés közben: disabled egyéb akciók
- Sor törlés `✕` gomb (csak Draft-ban): `DELETE /sales/api/quotes/{id}/lines/{lineId}` → refetch

**"+ Tétel hozzáadása" sor** (csak `Draft` státuszban látható):
```
[Megnevezés____________] [Qty] [Egységár____] [Hozzáadás]
```
`POST /sales/api/quotes/{id}/lines` — `{ description, quantity, unitPrice }` → refetch

**Összesítő sor** (jobb oldal):
```tsx
<dl className="text-right space-y-1 text-[12px]">
  <dt className="text-stone-500">Nettó</dt><dd>{subtotal} Ft</dd>
  <dt className="text-stone-500">ÁFA 27%</dt><dd>{vatAmount} Ft</dd>
  <dt className="text-stone-900 font-semibold text-[13px]">Bruttó</dt>
  <dd className="font-semibold">{total} Ft</dd>
</dl>
```

#### Akciók szekció — FSM alapú

Csak az aktuális státuszhoz illő gombok jelennek meg:

| Aktuális státusz | Elérhető akciók | API |
|---|---|---|
| `Draft` | Küldés (+ validUntil mező), Archiválás | POST /send, DELETE |
| `Sent` | Elfogadás, Elutasítás (+ reason mező), Archiválás | POST /accept, /reject, DELETE |
| `Accepted` | Gyártásba konvertálás | POST /convert → 202 Accepted |
| `Rejected` | Archiválás | DELETE |
| `ConversionPending` | — (csak olvasható, folyamatban) | — |
| `Converted` | — (lezárt) | — |
| `Archived` | — (lezárt) | — |

**Küldés modal** (inline, a SlideOver-ben, nem külön ablak):
```
Érvényesség *  [datepicker: YYYY-MM-DD]
               [Mégse]  [Küldés →]
```
- POST body: `{ validUntil: "YYYY-MM-DD" }`
- Success: státusz badge frissül Sent-re (refetch)

**Elutasítás inline form:**
```
Indoklás (opcionális)  [________________________]
                       [Mégse]  [Elutasítás ⛔]
```
- POST body: `{ reason?: string }`

**Gyártásba konvertálás gomb:**
- Szín: `bg-teal-600 hover:bg-teal-700`
- Kattintás után: `disabled + spinner` amíg a 202 válasz megérkezik
- Success toast: `"✓ Ajánlat gyártásba adva — rendelésszám hamarosan megjelenik"`

**Footer:**
```tsx
<GhostBtn onClick={onClose}>Bezárás</GhostBtn>
```

---

### 1.2 `CreateQuoteSlideOver`

**Miért kritikus:** Az "Új ajánlat" gomb ma `disabled`. Enélkül az értékesítők nem tudnak
új ajánlatot létrehozni a UI-ból.

**Megnyitás:** `SalesQuotes` oldal jobb felső sarok "Új ajánlat" gomb (jelenleg disabled → engedélyezni)

**Méret:** `width={500}`  
**Title:** `"Új ajánlat"`  
**Subtitle:** `"Az ajánlat vázlatként jön létre, majd szerkeszthető."`

#### Form

```
Ügyfél *          [typeahead search ________________ ▼]
                  (GET /sales/api/customers?search=... 300ms debounce)
                  Legördülő: max 6 találat, kártyaszerű
                  Ha nincs találat: "Új ügyfél létrehozása →" link

Érvényesség *     [datepicker: YYYY-MM-DD]
                  Min: ma + 1 nap

Megjegyzés        [textarea, 3 sor, opcionális]
                  placeholder: "Belső megjegyzés (nem látja az ügyfél)"

              [Mégse]  [Ajánlat létrehozása →]
```

**Submit:** `POST /sales/api/quotes`

```typescript
// Request body
{
  customerId: string     // kötelező
  validUntil: string     // kötelező, ISO date
  notes?: string         // opcionális
}
// Response: 201 Created → QuoteDto (id, quoteNumber)
```

**Success:** SlideOver bezárul → `QuoteDetailSlideOver` automatikusan megnyílik az új ajánlattal
(inline szerkesztés azonnal lehetséges).

**Validáció:**
- Ügyfél: kötelező, piros border + "Válassz ügyfelet" ha üres submit
- Érvényesség: kötelező, jövőbeli dátum kell
- API hiba: footer felett `text-red-500`

---

## Prioritás 2 — Soft Launch előtt javasolt

### 2.1 `CustomerDetailSlideOver`

**Megnyitás:** `SalesCustomers` ügyfélkártyán kattintás (ma nincs kattintható elem)

**Méret:** `width={500}`  
**Title:** `c.name`  
**Subtitle:** `c.city · ${c.type === 'Lead' ? 'Lead' : 'Aktív ügyfél'}`

#### Layout (px-5 py-4 space-y-5)

```
┌─────────────────────────────────────────────────────────┐
│  [Avatar 48×48]  Bognár Bútor Kft.                      │
│                  Budapest · Lead                        │
│                  [Lead]  [3 nyitott ajánlat]            │
├─────────────────────────────────────────────────────────┤
│  KAPCSOLATTARTÓ                              [Szerkesztés] │
│  Név        Bognár István                              │
│  Email      bognar@bognarbutor.hu                      │
│  Telefon    +36 72 412 333                             │
├─────────────────────────────────────────────────────────┤
│  AJÁNLATOK (utolsó 5)                                  │
│  AJ-2026-0052  Kiküldve  2026-04-18  3.8M Ft  →       │
│  AJ-2026-0041  Elfogadva 2026-04-10  1.2M Ft  →       │
├─────────────────────────────────────────────────────────┤
│  AKCIÓK                                                │
│  [Promóció → Aktív]   [Deaktiválás]                    │
│  (csak Lead esetén)   (csak Active esetén)             │
└─────────────────────────────────────────────────────────┘
```

#### API hívások

```typescript
// Megnyitáskor:
GET /sales/api/customers/{id}         // Teljes customer adat
GET /sales/api/quotes?customerId={id}&pageSize=5  // Utolsó ajánlatok

// Szerkesztés (Kapcsolattartó inline edit mód):
PUT /sales/api/customers/{id}/contact
// Body: { contactName, contactEmail, contactPhone }

// FSM akciók:
POST /sales/api/customers/{id}/promote      // Lead → Active
POST /sales/api/customers/{id}/deactivate   // Active → Inactive
```

#### Kapcsolattartó szerkesztés

A `[Szerkesztés]` gombra a key-value sorok input mezőkké alakulnak:
```
Név     [Bognár István__________]
Email   [bognar@bognarbutor.hu__]
Telefon [+36 72 412 333__________]

[Mégse]  [Mentés]
```
`PUT /sales/api/customers/{id}/contact` → success: read-only nézet vissza

#### Avatar

- 48×48, `bg-gradient-to-br`
- `Lead`: `from-amber-300 to-amber-500`
- `Active`: `from-indigo-400 to-indigo-600`
- `Inactive`: `from-stone-300 to-stone-400`
- Initials: cégnév első 2 szavának kezdőbetűje, fehér, `font-semibold text-[13px]`

#### Ajánlatok mini-lista

- Kattintható sorok → `QuoteDetailSlideOver` nyílik (egymás fölé stackelve nem kell, zárd be CustomerDetail-t)
- Ha nincs ajánlat: `"Még nincs ajánlat — Új ajánlat →"` link (nyitja CreateQuoteSlideOver-t azzal az ügyféllel előtöltve)

#### FSM akció gombok

| Státusz | Gomb | Szín | Megerősítés |
|---|---|---|---|
| `Lead` | "Promóció → Aktív ügyfél" | `bg-indigo-600` | inline confirm: "Biztos? Az ügyfél aktívba kerül." |
| `Active` | "Deaktiválás" | `border text-red-600 hover:bg-red-50` | inline confirm: "Biztos? Az ügyfél inaktívba kerül." |
| `Inactive` | — | — | — |

**Footer:** `<GhostBtn>Bezárás</GhostBtn>`

---

### 2.2 Cím kezelés (CustomerDetail alszekció)

A `CustomerDetailSlideOver`-be collapsible szekció:

```
▶ SZÁLLÍTÁSI CÍM           [Szerkesztés]
  1139 Budapest, Váci út 99.

▶ SZÁMLÁZÁSI CÍM           [Szerkesztés]
  1139 Budapest, Váci út 99.
```

`PUT /sales/api/customers/{id}/addresses`

```typescript
// Body
{
  billing?: { street, city, zip, country }
  shipping?: { street, city, zip, country }
}
```

Inline szerkesztés ugyanúgy mint a kapcsolattartónál.

---

## Prioritás 3 — Dashboard pontosítás (triviális csere)

### 3.1 Pipeline funnel valódi adatból

**Jelenlegi:** `FUNNEL` konstans hardcoded a `SalesPage.tsx`-ben.

**Cél:** `GET /sales/api/pipeline/funnel` → adatok cseréje.

```typescript
// Válasz (feltételezett shape)
interface FunnelStage {
  stage: string       // "Draft" | "Sent" | "Accepted" | "ConversionPending" | "Converted"
  count: number
  totalValue: number
}
// GET /sales/api/pipeline/funnel → FunnelStage[]
```

**Megvalósítás:** Csak adat-csere, layout nem változik. Ha API nem elérhető → `FUNNEL` konstans marad fallbackként. Nincs design munka, csak adat-bekötés.

### 3.2 Konverziós ráta dedikált endpoint

**Jelenlegi:** Kliensoldali számítás a quotes listából.

**Cél:** `GET /sales/api/pipeline/conversion-rate` visszaad egy pontos számot.

```typescript
// Válasz (feltételezett shape)
{ rate: number }  // pl. 0.62 → "62%"
```

**Megvalósítás:** Triviális, design nem szükséges.

---

## Prioritás 4 — Admin funkció (nem Soft Launch scope)

### 4.1 Customer ↔ Keycloak tenant link

Összeköti az ügyfelet egy Keycloak tenanttal (B2B actor integráció).

**Elhelyezés:** `CustomerDetailSlideOver` alján, collapsible "Integráció" szekció.

```
▶ INTEGRÁCIÓ
  Státusz: Nem linkelt
  [Link tenanthoz]
```

`POST /sales/api/customers/{id}/link` — `{ tenantId: string }`

**Megjegyzés:** Ez a funkció a Settings > Partnerek logikájával is átfed.
Elég a Settings-ben kezelni, ne duplikálódjon.

---

## UI mintaminták (meglévő komponensek újrahasználata)

| Pattern | Meglévő referencia |
|---|---|
| SlideOver alap | `src/components/ui/SlideOver.tsx` (width, title, subtitle, footer) |
| Section label | `src/components/settings/UsersPanel.tsx` — `SECTION_LABEL` konstans |
| Key-value dl sorok | `src/components/settings/UsersPanel.tsx` — `UserDetailSlideOver` |
| Inline szerkesztés toggle | `src/components/settings/SettingsPage.tsx` — CompanyTab |
| FSM akciógomb | `src/components/settings/UsersPanel.tsx` — disable/enable gombok |
| Typeahead search input | `src/pages/SalesPage.tsx` — SalesCustomers keresőmező (kiegészíteni kell dropdown-nal) |
| Loading skeleton | `src/components/settings/UsersPanel.tsx` — animate-pulse mintázat |
| Toast / inline visszajelzés | `src/components/settings/UsersPanel.tsx` — `"✓ Jelszó reset elküldve"` |
| Disabled gomb + tooltip | `src/pages/SalesPage.tsx` — "Új ajánlat" gomb |

---

## API hivatkozások (teljes Sales backend)

```
GET    /sales/api/customers?search=&status=&page=&pageSize=
POST   /sales/api/customers
GET    /sales/api/customers/{id}
PUT    /sales/api/customers/{id}/contact
PUT    /sales/api/customers/{id}/addresses
POST   /sales/api/customers/{id}/promote
POST   /sales/api/customers/{id}/deactivate
DELETE /sales/api/customers/{id}
POST   /sales/api/customers/{id}/link
POST   /sales/api/customers/{id}/link/refresh
DELETE /sales/api/customers/{id}/link

GET    /sales/api/quotes?status=&customerId=&page=&pageSize=
POST   /sales/api/quotes
GET    /sales/api/quotes/{id}
POST   /sales/api/quotes/{id}/lines
PUT    /sales/api/quotes/{id}/lines/{lineId}
DELETE /sales/api/quotes/{id}/lines/{lineId}
POST   /sales/api/quotes/{id}/send
POST   /sales/api/quotes/{id}/accept
POST   /sales/api/quotes/{id}/reject
POST   /sales/api/quotes/{id}/convert
DELETE /sales/api/quotes/{id}

GET    /sales/api/pipeline/funnel
GET    /sales/api/pipeline/conversion-rate
```

---

## Definition of Done — Phase 2

### P1 (Soft Launch blokkol)
- [ ] `QuoteDetailSlideOver` — fejléc, tételek tábla (szerkesztés Draft-ban), összesítő, FSM akciók
- [ ] `CreateQuoteSlideOver` — ügyfélválasztó typeahead, érvényesség dátum, POST
- [ ] "Új ajánlat" gomb enabled (CreateQuoteSlideOver-t nyit)
- [ ] SalesQuotes sor kattintható (QuoteDetailSlideOver nyílik)

### P2 (Javasolt Soft Launch előtt)
- [ ] `CustomerDetailSlideOver` — adatok, mini ajánlatlista, FSM akciók
- [ ] SalesCustomers kártya kattintható (CustomerDetailSlideOver nyílik)
- [ ] Kapcsolattartó inline szerkesztés (PUT /contact)
- [ ] Cím kezelés collapsible szekció (PUT /addresses)

### P3 (Post Launch sprint)
- [ ] Pipeline funnel valódi API-ból (`GET /pipeline/funnel`)
- [ ] Konverziós ráta dedikált endpointról (`GET /pipeline/conversion-rate`)

### P4 (Roadmap)
- [ ] Customer ↔ tenant link UI

---

*Kapcsolódó fájlok:*  
- `src/pages/SalesPage.tsx` — Phase 1 implementáció  
- `src/components/ui/SlideOver.tsx` — alap SlideOver komponens  
- `src/components/settings/UsersPanel.tsx` — UI minta referencia  
- `docs/mailbox/fe/inbox/2026-05-28_038_sales-api-phase1.md` — Phase 1 spec  
