# ROOT Terminal TODO

> **Frissítve:** 2026-07-23 05:30 Europe/Budapest  
> **Részletes állapot:**
> [`STATE.md`](STATE.md) és
> [`PROJECT_STATE_CHECKPOINT_2026-07-23.md`](../../docs/knowledge/architecture/PROJECT_STATE_CHECKPOINT_2026-07-23.md)  
> **Kanonikus task-státusz:** [`EPICS.yaml`](../../EPICS.yaml)

## P0 — folytatás előtt

- [ ] Friss `AGENT-CHANNEL.md` és `git status` ellenőrzés; másik agent
      fájlzárainak tiszteletben tartása.
- [ ] A portal vegyes dirty fáját path-scope szerint kettéválasztani:
      `RISKS-5X5-FE` APPROVED szelet és `EHS-WIZARD-HU` félkész szelet.
- [ ] Semmilyen tömeges stage/commit; csak bizonyított, taskonkénti fájllista.

## P0 — félkész EHS munka

- [ ] `EHS-WIZARD-HU`: az ingest-agent félbehagyott változtatásainak diff-reviewja.
- [ ] Reporter/eventId retry szerződés és „hiányzó reporter” véges, fail-closed
      működésének ellenőrzése.
- [ ] Wizard célzott tesztek, teljes EHS suite, ESLint, TypeScript/build.
- [ ] Mobil + desktop + dark vizuális QA, fókuszcsapda/Escape/fókusz-visszaadás.
- [ ] Fresh independent review; csak `APPROVED` után zárható vagy commitolható.
- [ ] Root fájlzár után a risk backend `ValidationBehavior` +
      create/update/add-control TestServer 400 contract + response metadata fix.
- [ ] EHS risk backend kapu után `RISKS-5X5-FE` végső integrált ellenőrzése.

## P0 — biztonság

- [ ] Nexus tokenfogyasztói leltár, emberileg jóváhagyott rotáció és secret-store.
- [ ] Nexus 58 policy nélküli tool és 27 REST mount explicit owner-döntése.
- [ ] Nexus production dependency migráció és listener/firewall/VPS rollout.
- [ ] Cutting trusted-proxy/tenant-host config + Nginx staging/production rollout.
- [ ] Cutting internal caller credential-rotáció és ExecutionHub `tid` döntés.
- [ ] Cutting public capability, quote ownership/PII, adapter activation és
      notification outbox külön taskok szerint.
- [ ] Legacy ASP.NET Core 2.2 RCE-lánc eltávolítása az öt fennmaradó modulból.
- [ ] Platform NuGet szeletek végrehajtása; cél: 0 critical/high release-hoston.

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
