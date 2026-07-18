# WORLDS-PRODUCTION-FE — Production világ modernizálása (API-first)

**Epic:** EPIC-UI-WORLDS-2026Q3 · **Szerep:** frontend · **Kiadva:** 2026-07-18 (root)
**Kontraktus-forrás (kötelező, egyetlen igazság):**
`docs/knowledge/architecture/WORLDS_API_CONTRACTS_2026-07-18.md` — 1. (cutting) és 2. (joinery)
szekció + 0. közös wire-szabályok + 6. hiány-lista + 7. frontend-útmutató.

## Cél

A portál legacy **production** világa (szabászat/megmunkálás/workflow képernyők) a bevált
modul-sablonra áll át — `src/modules/production/{services,mocks,pages}` + publikus `index.ts` —
**API-first**: a zod-sémák, fetcherek és FSM-tükrök a VALÓS cutting+joinery kontraktusból
készülnek (a fenti doksi szerint), az MSW ennek tükre (409/400/422 szemantikával), nem előkép.

## Elvek (a 7 modul-világ bevált mintája + API-first kiegészítés)

1. **Adatréteg**: zod-sémák a doksi DTO-tábláiból — camelCase kulcsok, enum-wire a MAI alak
   szerint (szám vagy angol PascalCase string, DTO-nként dokumentálva). Az enum-szótárak
   **const map-ben** éljenek (egy helyen cserélhetők — ADR-059 magyar wire-kulcsok wave 2-ben
   jönnek EnumWireMap-pel). UI-címkék MAGYARUL a view-rétegben, a wire-alaktól elválasztva.
2. **Fetcherek a VALÓS útvonalakra** — a cutting kevert prefixeit (`/api/cutting/*` vs
   `/cutting/api/plans/*`) pontosan követve, ahogy a doksi rögzíti. Semmilyen út nem „szépíthető".
3. **FSM-tükrök** a közös `fsmGuards`-on: CuttingPlan `Draft→Published→Frozen→Closed`;
   CuttingExecution 6-állapotú lánc; DoorOrder `Draft→Submitted→Calculating→Calculated/Failed(+Revert)`.
   ⚠ A DoorOrder `InProduction/Completed` a backendben ELÉRHETETLEN — a UI ezt NE hazudja
   elérhetőnek: gap-jelölés (disabled + tooltip), follow-up a doksi hiány-listájában.
4. **MSW = kontraktus-tükör**: seed-adat a valós DTO-alakon, guardok (409 FSM-sértés, 400/422
   payload a végpontonként dokumentált szemantikával) UI-val KÖZÖS függvényből; kontraktus-teszt
   bizonyítja, hogy a mock a doksi alakját adja.
5. **Design**: DESIGN_SYSTEM_SPEC_V1 + dark mode token-réteg (data-theme, world-akcent generikus
   oklch-recept). A production világ meglévő akcent-hue-ja marad (egy világ = egy hue).
   A11y: WCAG-AA, S1 scroll-region, sr-only táblák, chip-affordanciák — a review-lecke-lista.
6. **Config-vezérelt** küszöbök/ablakok (pl. OEE-cél, ütemterv-ablak) — literál tilos.
7. **Rule-6 invalidáció**: lista+detail+kereszt-entitás (plan→execution→offcut-batch érintés).
8. **Őszinteség**: nem létező mezőt/végpontot NEM találunk ki — gap-jelölés + follow-up lista
   a task-doksi végére.

## Scope-döntések

- Képernyő-készlet: a legacy production képernyők funkcionális lefedése a modul-sablonnal
  (dashboard/tervek/végrehajtás/ajánlat-tracking a kontraktus adta kereteken belül) — a pontos
  vágást a gap-analízised dönti el, dokumentáld.
- A SignalR `/hubs/execution` élő-frissítés OPCIONÁLIS follow-up (dokumentáld, ne építsd most).
- A `/internal/*` és integrációs végpontok NEM portál-felület.
- Legacy production-fájlok: cserélődnek a `src/modules/production` alá; a régi route-ok
  a diszpécser-mintával állnak át (MODULE-FOLDERS precedens).

## Korlátok

- CSAK a portál-fát (`src/joinerytech-portal`) mutálod + ezt a task-doksit + az EPICS.yaml
  SAJÁT sorodat. A platform-repo backend-fái és a `terminals/` TILTOTTAK.
- Egyszerre EGY portál-mutáló agent — te vagy az.
- GIT COMMIT TILOS (a root commitol ellenőrzés után).
- Tesztek: célzott zöld + teljes suite nem romlik (1432 baseline); tsc+build+eslint tiszta
  az új fájlokon.

## Kész-kritérium

`src/modules/production` a sablon szerint, valós kontraktusú adatréteggel, FSM-guardokkal,
dark mode-kompatibilis képernyőkkel, kontraktus- és UI-tesztekkel; gap-lista a doksi végén;
EPICS-sor frissítve; a végső összefoglalód tartalmazza: képernyő-lista, teszt-számok,
gap-lista, follow-up javaslatok.
