# F2-CRM-FIX — F2-CRM review-javítások (S1–S3, M1–M2)

- **Szerep:** frontend · **Státusz:** ✅ done (2026-07-14) · **Fázis:** F2
- **Kontraktus:** `docs/knowledge/qa/F2_CRM_DESIGN_REVIEW_2026-07-14.md` + `docs/knowledge/patterns/DESIGN_SYSTEM_SPEC_V1.md` §3.3

## Feladat
Az F2-CRM-REVIEW három blokkoló (S1, S2, S3) és a két kért, nem blokkoló (M1, M2)
findingjának javítása egy körben.

## Kivitelezés / Eredmény

1. **S1** — `src/pages/crm/OppDetailSlideOver.tsx`: az „Ajánlat-piszkozat létrehozása"
   gomb lezárt (megnyert/elveszett) lehetőségen mostantól `disabledReason`-t kap
   („Lezárt lehetőséghez nem hozható létre ajánlat.") — aria-disabled + tooltip,
   nem „engedélyezett, aztán 409-toast". A guard-feltétel új, nevesített helperbe
   került (`services/crm/fsm.ts` → `isOppOpen(status)`), az MSW kontraktus-guard
   (`mocks/crmApi/handlers.opps.ts:97-99`) UI-tükreként. Új teszt:
   `src/pages/crm/__tests__/OppDetailSlideOver.test.tsx` (3 teszt: lezárt oppon
   aria-disabled + tooltip-szöveg, elnyelt kattintás, nyitott oppon végrehajt).
2. **S2** — detail-kulcs invalidálás (EHS README 6. szabály, `incidents.ts` minta):
   - `src/services/crm/leads.ts` (`useInvalidateLeads`): a `leads` lista-prefix
     mellett a `lead` (egyes számú detail) prefixet is invalidálja;
   - `src/services/crm/opportunities.ts` (`useInvalidateOpps`): az `opps` mellett
     az `opp` detail prefixet is invalidálja.
   409-rollback után így a nyitva lévő SlideOver is újraszinkronizál a szerverrel
   (a `useConvertLead` kereszt-domain `opps`-invalidálása már megvolt). Új teszt:
   `src/services/crm/__tests__/detailInvalidation.test.tsx` (4 teszt: opp-átmenet
   409, lead-átmenet 409, ajánlat-csonk 409 és sikeres átmenet után is invalidált
   a detail kulcs).
3. **S3** — `src/pages/crm/PipelineScreen.tsx` kanban-sáv a spec §3.3 szerint:
   - edge-fade maszk (`mask-image` — a `components/ui/Tabs.tsx` receptje);
   - `snap-x snap-mandatory` a sávon + `snap-start` az oszlopokon;
   - fókuszálható görgetési konténer: `role="region"`
     `aria-label="Pipeline fázis-oszlopok"` + `tabIndex={0}` + fókusz-ring
     (üres oszlop is képernyőre hozható billentyűzettel);
   - oszlop-szélesség `w-60` (240 px) → `w-[280px]` (spec-minimum);
   - oszlop `aria-label` mostantól darabszámmal: „Nyitott, 1 elem";
   - `touch-pan-x` a sávon (nem lopja el a függőleges swipe-ot).
   A `pipelineStageMove.test.tsx` region-nevei frissítve + új teszt a §3.3
   affordanciákra; a smoke-teszt region-query-jei regexre igazítva.
4. **M1** — `src/pages/crm/TasksScreen.tsx`: a lista-szintű közös `useCompleteTask`
   példány helyett soronkénti mutation-példány (`TaskRow` komponens, az EHS
   `PpeScreen` `IssuanceActions` mintája) — egy teljesítés már csak a saját
   sorát tiltja „Folyamatban…"-ra.
5. **M2** — szűrő-chipek (`LeadsScreen.tsx`, `OppsScreen.tsx`): az aktív chip
   nem csak színnel jelöl (pipa-ikon + `font-semibold`), és a 28 px-es pill
   `before:` pszeudó-elemmel 44 px-es touch-célfelületet kap (a vizuális méret
   változatlan).

## Nem érintett
Kontrolling-fájlok (`src/services/controlling`, `src/mocks/controllingApi`,
`src/pages/controlling`, `ControllingPage.tsx`) és EHS-fájlok (párhuzamos
fejlesztés / APPROVED állapot), MSW CRM-handlerek (APPROVED — a guard ott már
helyes volt), teljes build/teszt-suite — csak célzott futtatás. Az N1–N5
megjegyzések tracked backlog / opcionális tételek, ebben a körben nem készültek.

## Tesztek
Célzott vitest: `src/services/crm` + `src/pages/crm` + `CrmPage.test.tsx` —
**9 fájl / 68 teszt zöld** (a review-kori 60 + 8 új: 3 quote-gomb guard,
4 detail-invalidálás, 1 kanban §3.3). `npx tsc -b --noEmit` tiszta, eslint a
12 módosított/új fájlra tiszta.

## Re-review
Designer mailboxba jelzendő: az S1–S3 célzott re-review után a CRM-minta a
következő modulokra (HR, Maintenance…) sablonként ajánlott.
