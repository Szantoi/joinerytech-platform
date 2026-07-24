# ROOT Terminal TODO

> **Frissítve:** 2026-07-24 21:10 Europe/Budapest
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
- [ ] `WORLDS-SHELL-FIX` (P0): S-holtpont a SlideOver fókuszcsapdában (minden
      világ!) + tablet-túlcsordulás + toast-inert + apiClient hibatest-parse;
      Playwright keyboard-smoke + teljes 7-világos regresszió-kör kötelező.
- [ ] `WORLDS-PRODUCTION-FIX` (P1): 12 modul-M a riport szerint; utána
      re-review (friss screenshot + fókusz-probe), csak APPROVED után nyílik
      a W2 (WORLDS-WAREHOUSE-FE).

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
