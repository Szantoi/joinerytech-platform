# ROOT Terminal TODO

> **Frissítve:** 2026-07-25 10:00 Europe/Budapest
> **Részletes állapot:**
> [`STATE.md`](STATE.md) és
> [`PROJECT_STATE_CHECKPOINT_2026-07-23.md`](../../docs/knowledge/architecture/PROJECT_STATE_CHECKPOINT_2026-07-23.md)
> **Kanonikus task-státusz:** [`EPICS.yaml`](../../EPICS.yaml)

## P0 — folytatás előtt

- [ ] Friss `AGENT-CHANNEL.md` és `git status` ellenőrzés; másik agent
      fájlzárainak tiszteletben tartása.
- [x] A portal vegyes dirty fája feloldva (2026-07-23: mindkét EHS szelet
      mergelve `1f3ca31`-ben; a portal azóta CLEAN).
- [ ] Semmilyen tömeges stage/commit; csak bizonyított, taskonkénti fájllista.

## P0/P1 — EPIC-UI-WORLDS (production kapu)

- [x] `WORLDS-PRODUCTION-REVIEW` végrehajtva (2026-07-24 root, designer szerep,
      5 lencse + 17/17 adversarial verify): verdikt **CHANGES REQUESTED** —
      riport: `docs/knowledge/qa/WORLDS_PRODUCTION_DESIGN_REVIEW_2026-07-24.md`.
- [x] `WORLDS-SHELL-FIX` (P0) **KÉSZ** (2026-07-25 root, portal@b9ad407): S-1
      fókuszcsapda-holtpont (a gyökér a hookban volt, `SlideOver.tsx`
      változatlan), M-S1 tablet-túlcsordulás, M-S2 toast-inert
      (`data-inert-exempt`), M-S3 apiClient hibatest-parse. Új böngésző-szintű
      őr: `scripts/keyboard-smoke.mjs` (9/9 PASS élő Chrome-ban) — jsdom-ban ez
      a hibaosztály elvileg sem fogható.
- [x] `WORLDS-PRODUCTION-FIX` (P1) **KÉSZ** (2026-07-25 root, portal@cafca79):
      mind a 12 M javítva; 4-lencsés friss review 15 leletét (0 megcáfolt) egy
      második kör javította.
- [x] `WORLDS-PRODUCTION-REREVIEW` **KÉSZ** (2026-07-25): verdikt **APPROVED**,
      mind a 16 finding tételesen visszaellenőrizve, 36 friss screenshot.
      **`W1-production` done → a W2-warehouse sáv felszabadult.**
- [ ] `WORLDS-WAREHOUSE-FE`: a következő végrehajtható frontend-szelet (minden
      függősége teljesült).
- [ ] `WORLDS-SHELL-H1` (P2): duplikált oldalcím a WorldShellben, két route-on
      ellentmondó szöveggel — mind a 7 világ; a terminológia-ütközés feloldása
      tartalmi döntés (Gábor).

## P1 — frontend tesztkapu

- [ ] `STAB-FE-PROCUREMENT-OOM`: `src/pages/__tests__/ProcurementPage.test.tsx`
      heap-OOM-mal öli a vitest workert (izoláltan és tiszta HEAD forrásokon is
      reprodukálva 2026-07-25-én) → a teljes suite `EXIT=1`, a `test:nightly`
      kapu piros. 5 teszt sosem fut le. Nem a WORLDS-SHELL-FIX okozta.

## P0 — félkész EHS munka

- [x] `EHS-WIZARD-HU`: diff-review + befejezés + fresh review (2026-07-23 root,
      3-lencsés adversarial review APPROVED; mergelve portal@1f3ca31).
- [x] Reporter/eventId retry szerződés és „hiányzó reporter” fail-closed
      működés ellenőrizve (ingest-contract lencse, edge-inputokkal).
- [x] Wizard célzott tesztek (30/30), teljes EHS suite (141/141), ESLint,
      TypeScript/build zöld.
- [ ] Mobil + desktop + dark vizuális QA böngészőben (Gábor) — az egyetlen
      nyitott acceptance-tétel az `EHS-WIZARD-HU` done-jához; a
      fókuszcsapda/Escape/fókusz-visszaadás teszt-szinten bizonyított.
- [x] A már megadott Root fájlzár alapján a risk backend `ValidationBehavior` +
      create/update/add-control TestServer 400 contract + response metadata fix
      (2026-07-23 root, adversarial review APPROVED, kapuk zöldek).
- [x] `RISKS-5X5-FE` végső integrált ellenőrzés: portál 141/141 + 30/30,
      backend 130/130 + 121/121, boundary 15/15 — task done, archiválva.

## P0 — biztonság

- [ ] Nexus tokenfogyasztói leltár, emberileg jóváhagyott rotáció és secret-store.
- [ ] Nexus 58 policy nélküli tool és 27 REST mount explicit owner-döntése.
- [ ] Nexus production dependency migráció és listener/firewall/VPS rollout.
- [ ] Cutting trusted-proxy/tenant-host config + Nginx staging/production rollout.
- [ ] Cutting internal caller credential-rotáció és ExecutionHub `tid` döntés.
- [ ] Cutting public capability, quote ownership/PII, adapter activation és
      notification outbox külön taskok szerint.
- [ ] Legacy ASP.NET Core 2.2 RCE-lánc eltávolítása az öt fennmaradó modulból.
- [x] A fail-closed NuGet auditkapu merge-elve (`a0be291`, Pester 22/22).
- [ ] Platform NuGet remediation-szeletek végrehajtása; cél: 0 critical/high
      release-hoston.

## P0 — release reprodukálhatóság

- [ ] A három elérhetetlen runtime-forrás visszaállítása vagy kanonikus repohoz
      kötése (`abstractions`, `identity`, `sales`).
- [ ] Mapping nélküli gitlinkek rendezése.
- [ ] `spaceos-modules-contracts` MediatR referencia/build hiba javítása.
- [ ] Sales publish-forrás helyreállítása; restart csak külön emberi kapuval.

## P1 — ERP és SpaceOS szétválasztás

- [ ] ADR-067: trust-root modell és entitlement owner döntés, majd `Accepted`.
- [ ] ADR-066: Order/Quote/Customer ownership döntés, majd `Accepted`.
- [ ] Csak ezután `MODULE-PACKAGES`, ERPSEP-05/06/07 végrehajtása.
- [ ] Maintenance bundle pilot → composer/conformance → Doorstar átadási kapu.

## P1 — B2B kézfogás

- [ ] B2B-01 contract/ownership lezárása.
- [ ] Participant-RLS, agreement evidence és work-state protocol párhuzamos
      végrehajtása explicit Collaboration domain lockkal.
- [ ] Data exchange, module adapterek, read model/API, portal UI és Doorstar
      conformance pilot a dokumentált függőségi sorrendben.

## Leállási feltétel

Egy tétel csak akkor pipálható ki, ha az egyedi task acceptance és regressziós
kapuja zöld, a tasknapló friss, fresh review megtörtént, és az `EPICS.yaml`
ugyanazt az állapotot mutatja.
