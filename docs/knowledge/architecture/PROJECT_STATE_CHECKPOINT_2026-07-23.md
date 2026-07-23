# JoineryTech projektállapot-checkpoint — 2026-07-23

> **Pillanatkép:** 2026-07-23 04:41–04:59, Europe/Budapest
> **Kanonikus élő státusz:** [`EPICS.yaml`](../../../EPICS.yaml)
> **Következő feladatok:** [`terminals/root/TODO.md`](../../../terminals/root/TODO.md)
> **Előző teljes felmérés:**
> [`PROJECT_STATE_ASSESSMENT_2026-07-18.md`](PROJECT_STATE_ASSESSMENT_2026-07-18.md)

Ez a dokumentum nem váltja le az `EPICS.yaml`-t. Azért készült, hogy a következő
root/Claude/Codex munkamenet a lokális working tree, a bizonyított eredmények és
a még nyitott kapuk szétválasztásával tudjon biztonságosan folytatódni.

## 1. Repozitórium- és futási állapot

| Terület | Pillanatkép | Következmény |
|---|---|---|
| Platform root | `main@15fcb24`, dirty working tree | `git add -A`, tömeges commit és formázás tilos |
| Portal | `main@1787e0b`, dirty | Két külön munkaszelet keveredik: APPROVED risk UI és félkész EHS wizard |
| Cutting | `4341390`, dirty | Csak a trusted-proxy/tenant-host rész-szelet APPROVED; a teljes dirty fa nem az |
| Nexus | a root repository része, lokális dirty diff | Auth/RBAC rész-szelet tesztelt; rotáció és rollout nem történt |
| Gitlinkek | a teljes `git submodule status` nem fut le | A mapping nélküli `joinerytech-keycloak-theme` továbbra is release-adósság |
| Fejlesztői futás | 4174 zárva; nincs JoineryTech Vite/Vitest háttérfolyamat | A munka szándékosan leállított állapotban van |

A 2026-07-23-i Codex munkakör végén nem történt commit, push vagy deploy. Ezt
követően Root önállóan ellenőrizte és `a0be291` alatt commitolta a NuGet
auditkaput, `46c1f70` alatt az EPICS state-sweepet, `91c3446` alatt a checkpoint
és EHS taskdokumentációkat, majd `15fcb24` alatt a fennmaradó tervezési
taskdokumentumokat. EHS portálkódot, Nexus runtime-diffet vagy Cutting
runtime-diffet Root sem commitolt. Minden lokális diff megőrzendő; idegen
változtatást tilos resetelni vagy „tisztítás” címén törölni.

## 2. Bizonyított, merge-elt alap

- A portal `v1.0.0` és platform `v0.2.0` release, valamint a hét modern ERP
  modul 7/7 designer-APPROVED alapja változatlan.
- Az ADR-061/062 hosting/auth/tenant/RLS csomag és az ADR-059 magyar wire-kapu
  merge-elt alap.
- 2026-07-22-én merge-elt fontos szeletek:
  - ERP package-boundary preflight, Controlling→EHS import megszüntetése és a
    CRM/HR/Kontrolling mock-seed ownership rendezése;
  - production API gate, inventory read API és procurement FSM;
  - EHS CAPA magyar wire roundtrip, a reopen utáni valós TestServer-kapuval;
  - release-reprodukálhatósági felmérés és read-only VPS health-smoke.
- A Cutting `/cutting/internal/*` Internet felőli containmentje és a
  `4341390` backend rollout élesben bizonyított; ez nem jelenti a teljes
  Cutting security epic lezárását.

## 3. Lokális, még nem merge-elt munkaszeletek

### 3.1 RISKS-5X5-FE

**Állapot:** frontend service/MSW/UI `APPROVED`, de a task `in_progress`.

Bizonyíték: 15 tesztfájl / 145 teszt PASS, célzott konkurens állapot 2/15 PASS,
ESLint és portal build PASS, boundary 18/18 + valós scan 15/15, 0 frontend
finding és 0 regresszió. A részletes napló:
[`RISKS-5X5-FE.md`](../../tasks/EPIC-UI-PORTAL-2026Q3/RISKS-5X5-FE.md).

**Nyitott P1:** az EHS backend regisztrál validatorokat, de a MediatR
`ValidationBehavior` production bekötése nincs bizonyítva. Valós TestServer
create/update/add-control 400-as kontraktusteszt és a create response metadata
javítása kell. Root 2026-07-23-án megadta a szűk backend fájlzár-ACK-ját; a
feladat végrehajtható, de még nem indult el.

### 3.2 EHS-WIZARD-HU

**Állapot:** `paused`, félkész, nem reviewzott.

A working tree-ben részleges magyar copy, helyi dátumhelper, a11y/dialog,
photo fail-closed és event-ingest/idempotencia változtatások vannak. Az
`ehs_wizard_ingest` agentet Gábor kérésére megszakítottuk. A legutóbbi wizard
teszt-átírás óta nem futott teljes célzott kapu, teljes EHS suite, lint, build,
vizuális QA vagy független review. Késznek vagy commitolhatónak nem tekinthető.

Részletes scope és acceptance:
[`EHS-WIZARD-HU.md`](../../tasks/EPIC-UI-PORTAL-2026Q3/EHS-WIZARD-HU.md).

### 3.3 Nexus credential/RBAC

**Állapot:** lokális hardening-szelet APPROVED; az incident nem lezárt.

Kész: env-only credential, production fail-fast, constant-time ellenőrzés,
default-deny, hiányzó MCP identity tiltása, mailbox route-auth és hitelesített
read-only task-status. Bizonyíték: 22/22 célzott teszt és TypeScript build.

Nyitott:

- a valódi és történeti tokenek fogyasztói leltára, rotációja és secret-store;
- 112 toolból 58 explicit üzleti policy nélkül default-denied;
- a 27 REST mount route-onkénti authorization döntése;
- listener/firewall/VPS rollout;
- 1 critical + 4 high + 1 low production dependency migráció.

### 3.4 Cutting security

**Állapot:** több külön szelet, vegyes dirty working tree.

A trusted-proxy/tenant-host szelet független reviewja APPROVED: 76/76 fő +
9/9 legacy teszt, clean build 0 warning/0 error. Lokális, még nincs új
`ReverseProxy:*`, `TenantResolution:*` és Nginx rollout.

Nyitva marad az internal caller credential-rotáció, ExecutionHub legacy `tid`
döntés, adapter activation gate, public capability, quote ownership/PII,
notification outbox, email hardening, test supply-chain és publish artifact
higiénia. A teljes Cutting dirty diffet tilos egyetlen approved egységként
kezelni.

### 3.5 Platform NuGet és runtime-lefedettség

**Állapot:** az auditkapu APPROVED és `a0be291` alatt merge-elt; a
sérülékenységek nincsenek kijavítva.

- Pester 22/22 és adversarial process-tree/parser/fail-closed review zöld.
- Checkout baseline: 15 host, 25 finding, 3 elérhetetlen runtime-forrás.
- Teljes `-Discover`: 97 projekt, 130 finding, ebből 117 blokkoló
  (9 critical + 108 high).
- Külön nyitott a legacy ASP.NET Core 2.2 RCE-lánc öt további modulban,
  az EF/Npgsql/cache alignment, AutoMapper-migráció, SQLite, xUnit,
  WireMock/Scriban és Testcontainers/test-host csomagcsalád.

Az audit eszköz kész; a dependency-javításokat owner- és repo-lockonként,
külön build/teszt/security review-val kell végrehajtani.

## 4. Döntési és rollout-blokkolók

1. **EHS risk backend:** a root fájlzár megadva; az API
   DI/behavior/TestServer/response metadata szelet végrehajtása és reviewja vár.
2. **Nexus:** emberi jóváhagyás a tokenrotációhoz, route/tool policy owner és
   production rollout.
3. **Cutting:** production proxy/host config és Nginx rollout; public quote
   capability/ownership domain-döntések.
4. **ERP separation:** ADR-067 trust-root és entitlement owner; ADR-066
   Order/Quote/Customer tulajdon. Ezek nélkül nincs `MODULE-PACKAGES`.
5. **Release source:** három elérhetetlen VPS runtime-forrás, mapping nélküli
   gitlinkek, a Contracts hiányzó MediatR referencia és a sales service
   hiányzó publish-forrása.

## 5. Biztonságos folytatási sorrend

1. Újraolvasni: `AGENT-CHANNEL.md`, `EPICS.yaml`, ez a checkpoint és a kijelölt
   task teljes tartalma; utána friss `git status`.
2. A portal két szeletét path-scope szerint külön kezelni. Előbb az
   `EHS-WIZARD-HU` félkész diffjét befejezni vagy explicit rollback-tervvel
   elkülöníteni; tömeges stage tilos.
3. A wizard célzott tesztjei → teljes EHS suite → ESLint → TypeScript/build →
   mobil/dark vizuális QA → fresh independent review.
4. A már megadott Root ACK alapján az EHS risk backend P1 atomikus javítása és
   TestServer/OpenAPI kapuja; csak ezután zárható a `RISKS-5X5-FE`.
5. Biztonsági sorrend: Nexus rotáció/policy → Cutting proxy rollout és
   capability/ownership → platform dependency-szeletek.
6. ERP csomagolás csak az ADR-066/067 döntések elfogadása után.

## 6. Leállási feltétel ehhez a checkpointhoz

Ez a dokumentációs checkpoint akkor kész, ha az `EPICS.yaml`, a root
`STATE.md`, `TODO.md`, `MEMORY.md`, a tudástári index és az érintett taskok
ugyanazt a kész/félkész/blokkolt állapotot mondják. Nem része kódteszt,
commit, push vagy deploy.
