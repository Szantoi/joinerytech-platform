# ADR-IMPL-WIRE — ADR-059 végrehajtás: magyar wire-kulcsok EnumWireMap-pel (backend-oldal, mind a 7 modul)

**Epic:** EPIC-UI-PORTAL-2026Q3 (wave 2) · **Szerep:** backend · **Kiadva:** 2026-07-18 (root)
**Spec:** docs/knowledge/adr/ADR-059 (ELFOGADVA: a kanonikus wire-nyelv MAGYAR kulcs a dróton,
a fordítás a backend szerializációs varratán él EnumWireMap-pel; a domain angol marad).

## Cél

Mind a 7 modul (ehs, qa, hr, maintenance, dms, CRM, kontrolling) enum-wire-je a portál
kanonikus magyar kulcsait beszéli — a VÉGLEGES enum-készleteken (ADR-060 HR-taxonómia és
ADR-063 QA-Conditional már benne van). A portál-oldali átállás KÜLÖN task (a production-FE
lezárta után) — itt CSAK backend.

## Elvek

1. **A kontrolling a precedens**: ott már él EnumWireMap + WireEnumConverter (EGY szótár
   JSON-ra + query-stringre, hiányzó wire-név induláskor DOB). Ezt a mintát emeld be a
   **SpaceOS.Modules.Hosting** csomagba (ADR-061 3. pont szerinti konszolidáció), és a
   kontrolling is a közösről fusson (a lokális másolata megszűnik).
2. **Modulonként EGY wire-szótár** (Api/WireEnums.cs vagy ekvivalens) — a HR task-doksi
   (archive/ADR-IMPL-HR-TAX.md) kulcstáblái készen állnak; a portál zod-sémái a
   kanonikus kulcs-források (src/joinerytech-portal/src/modules/<mod>/services).
3. **Teljes felület**: JSON-válasz + request-payload + query-paraméter + hibaüzenetben
   szereplő státusznév. Ahol a DTO ma számot ad (enum-mező konverter nélkül), ott is a
   magyar string lesz a wire-alak.
4. **Fail-fast**: lefedetlen enum-érték = induláskori kivétel, nem futásidejű meglepetés.
5. **Round-trip tesztek** modulonként: minden enum-érték oda-vissza (serialize→parse),
   ismeretlen kulcs → 400-as payload-hiba a bevett hibakontraktussal.
6. **OpenAPI-szinkron**: ahol openapi.yaml él (qa, dms, crm), az enum-értéklisták frissülnek.

## Korlátok

- CSAK a backend-fák: src/ehs, src/qa, src/hr, src/maintenance, src/dms,
  src/SpaceOS.Modules.CRM, src/spaceos-modules/spaceos-modules-kontrolling,
  src/spaceos-modules-hosting + ez a task-doksi + az EPICS.yaml SAJÁT sora.
- **TILTOTT: src/joinerytech-portal** (ott másik agent dolgozik) és a terminals/.
- GIT COMMIT TILOS — a root commitol ellenőrzés után.
- A teszt-baseline nem romolhat: hosting 41, QA 217, HR 190, Maintenance 157, DMS 73,
  Kontrolling 186, CRM 103, EHS 130+50 (az EHS-infra SafetyWalkCapaFlow ismert
  pre-existing bukás — nem a te dolgod).

## Kész-kritérium

Mind a 7 modul wire-tesztje zöld a magyar kulcsokkal; a hosting-csomagban közös
EnumWireMap-infra; modulonkénti kulcstáblák a task-doksiban dokumentálva; a portál-oldali
átállási lista (mely zod-sémák/fetcherek érintettek) a doksi végén a következő FE-tasknak.
