# PLAN-02 — Ütemezés-domain + termékcsomag ADR

> ## ✅ LEZÁRVA ÉS ARCHIVÁLVA — 2026-07-30 (root)
>
> **DONE** — **ADR-069 ELFOGADVA (Gábor, 2026-07-28)**, G1–G7 az ajánlás szerint + G8 névdöntés. ⚠ A task-doksi státusza „pending"-en maradt, miközben az `EPICS.yaml` már `done`-t mondott — a 2026-07-30-i root task-átvizsgálás javította és archiválta.
>
> *A lenti eredeti szöveg „Státusz" sora a munka közbeni állapot, nem a végső verdikt.*

- **Szerep:** architect
- **Prioritás:** P0 (a Doorstar kimondott következő kapuja)
- **Státusz:** pending
- **Függőség:** `PLAN-01 = done` (capability-audit:
  `docs/knowledge/architecture/PLANNING_CAPABILITY_AUDIT_2026-07-27.md`)
- **Kimenet:** elfogadott ADR a Planning domainről ÉS a termékcsomagról
  (modulazonosítók, entitlement, world-kompozíció, manifest, instance-adapter
  határ), plusz az API-kontraktus irányvonala (OpenAPI-first)

## Cél

Dönteni az ütemezés-domain modelljéről (naptár, függőségek FS/SS/FF/SF,
proposal/shadow/publish életciklus, revíziók) és a Planning TERMÉKCSOMAGRÓL —
úgy, hogy a Doorstar alább rögzített API-igénye kielégíthető legyen egy
verziózott, publikált kontraktussal.

## NORMATÍV BEMENET — Doorstar API-igény (2026-07-28, Gábor közvetítette)

### 1. fázis: read-only Planning nézet (frontend első változata)

- **Verziózott, publikált OpenAPI 3.1 specifikáció** és **stabil teszt/sandbox
  URL**.
- **„Tervezési javaslat lekérése" végpont**, amely visszaadja:
  - planning run ID és állapot;
  - művelet ID, név, állomás/erőforrás;
  - tervezett kezdés és befejezés;
  - státusz, figyelmeztetések, kapacitásütközések;
  - függőségek: előd/utód ID, FS / SS / FF / SF, késleltetés (lag),
    részleges kiadási küszöb (partial release);
  - a használt naptár- és erőforrásprofil revíziója.
- A Doorstar-frontend **generált TypeScript klienst** készít az OpenAPI-ból —
  kézzel karbantartott API-típusok nélkül. (Ez a spec minőségi kapuja is:
  a generátorbarát, teljes sémájú OpenAPI kötelező.)

### Platformoldali biztonsági szerződés (a read-only fázishoz is KÖTELEZŐ)

- JWT claim-ek és tenant-feloldás (kontraktusban rögzítve);
- szerveroldali tenant/RLS bizonyíték;
- moduljogosultság (entitled/enabled) kezelése;
- szabványos hibaformátum, audit/correlation ID.

### 2. fázis: írási irány (Doorstar-adat beküldés, kapacitásfoglalás)

- normaidő- és erőforrás-import séma;
- naptárprofil jóváhagyási folyamat;
- idempotens import és publikálás;
- erőforrás-foglalás / terv-jóváhagyás végpontok.

## Platform-oldali kontextus (az ADR-nek ezekre KELL válaszolnia)

1. **A mag zöldmezős** (PLAN-01): a 13 Doorstar-vektorból ma 0 számolható;
   nincs Kernel-STOP; ownership-javaslat O-A (új önálló modul, ADR-068 O3).
2. **A biztonsági szerződés ma NEM teljesíthető a hosting-rétegből:** a
   TenantResolver ELDOBJA az enabled_modules claimet (+ snake_case/camelCase
   claim-parse bug) → a szerver-oldali entitled/enabled gate hiányzik. Ez
   ERPSEP-05/06 munka — az ADR-ben függőségként rögzítendő, és a Doorstar felé
   a biztonsági szerződés csak ezek zárása után publikálható „bizonyítékkal".
   RLS-bizonyíték minta: STAB-RLS-PROOF (Testcontainers) + élő mérés
   (LIVE_AUTH_AND_RLS_ASSESSMENT_2026-07-25.md).
3. **Termékcsomag-oldal (Doorstar-pontosítással):** modulazonosító(k) az
   ADR-067 namespace-rezsimben (mag = `spaceos.planning` CSAK ha teljesen
   iparágsemleges; faipari standardok/Doorstar-import → `joinerytech.*` /
   `doorstar.*`), entitlement a Kernel Tenant-mezőből, a Planning felület
   VILÁG (world→module kompozíció), kiadási manifest
   (spaceos-module-v1.schema.json) verzióval+hash-sel; a Doorstar UI a
   termékmagot nem másolja, publikált kontraktust fogyaszt.
4. **Sandbox URL:** a stabil teszt-URL ops-kérdés (VPS/joinerytech.hu alatti
   kiajánlás, Keycloak-realm) — az ADR-ben a célkörnyezet és az auth-mód
   döntendő (a STAB-KEYCLOAK-POSTGRES-MIGRATION érintett előfeltétel lehet).

## Scope-jegyzetek

- Az 1. fázis végpontja read-only: proposal-lekérés — a proposal/shadow/publish
  életciklus ADR-döntése határozza meg a run-állapotgépet, amit a válasz
  `state` mezője tükröz.
- A 2. fázis (import/foglalás/jóváhagyás) végpontjai ebben az ADR-ben csak
  kontraktus-IRÁNYKÉNT szerepelnek (idempotencia-kulcs, jóváhagyási FSM);
  implementációjuk PLAN-03+.
- Doorstar-oldali nyitottság (PLAN-01-ből): kontraktus-reviewer nominálása
  pending; standard-minta verzióváltás-példa + naptár-jóváhagyás/overload-példa
  kérve.

## FELELŐSSÉGI HATÁR — MEGERŐSÍTVE (Doorstar-oldal, 2026-07-28, Gábor közvetítette)

A Doorstar kimondottan elfogadta a határt:

- **Platform (O-A):** `spaceos.planning` C# termékmag, OpenAPI, tenant/RLS/
  entitlement, foglalás és jóváhagyási policy.
- **Doorstar:** generált TypeScript-kliens, saját UI, instance-adapter,
  normaidő/Excel import-előkészítés, fixture-ök és kontraktus-review.
- A Doorstar nem API-fejlesztést kér, hanem a **publikált, verziózott OpenAPI
  és a platform security/entitlement artifactok átvételét**, és erre köti rá
  a fogyasztói oldalt. A Doorstar Planning UI addig **szerződésváró állapotban**
  áll — mock ütemezés NÉLKÜL (nem épül látszat-kontraktus).

Ez az ADR-ben normatívan rögzítendő ownership-kiindulás.

## Done-kritérium

ADR-tervezet (ACCEPTED-ig vive Gábor döntésével), amely: domain-modell +
termékcsomag + API-irány (OpenAPI 3.1 vázlat-szintű erőforrás-lista a fenti
mezőkkel) + biztonsági szerződés függőség-térképe (ERPSEP-05/06, STAB-tételek)
+ sandbox-célkörnyezet javaslat. A Doorstar felé kommunikálható ütemezéssel.

---

## Végrehajtási napló

- 2026-07-28, root: **ADR-069 tervezet megírva** —
  `docs/knowledge/adr/ADR-069-planning-domain-and-product-package.md` (Proposed).
  Tartalma: O-A ownership-ajánlás, namespace-hármas, aggregátum-készlet +
  proposal/shadow/publish FSM, függőség-precedencia a Doorstar-baseline szerint,
  OpenAPI 3.1 erőforrás-vázlat a kért mezőkkel, kétlépcsős fail-closed
  entitled-gate (ERPSEP-05/06 határfelület), RLS-proof gate-artefakt,
  P-A production-retire ajánlás, sandbox-javaslat, PLAN-03 M1-M5 fázisolás.
  7 döntési pont (G1-G7) Gábor asztalán.
