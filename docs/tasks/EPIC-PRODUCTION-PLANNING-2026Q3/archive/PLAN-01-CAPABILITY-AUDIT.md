# PLAN-01 — Planning capability-boundary audit (read-only)

- **Epic:** EPIC-PRODUCTION-PLANNING-2026Q3 · **Mérföldkő:** PL0-boundary
- **Szerep:** architect · **Státusz:** open
- **Kiírva:** 2026-07-27 (root), a Doorstar handoff elfogadásával
- **Bemenet:** doorstar-instance: docs/projects/doorstar-production-planning/PLATFORM_HANDOFF_EPIC.md
  (+ a platform válasza: PLATFORM_HANDOFF_RESPONSE.md ugyanott)
- **Minta:** PROJECT-BOUNDARY-AUDIT / ERPSEP-01 (bizonyíték-alapú, fájl:sor)
- **Mutációs határ:** KIZÁRÓLAG az audit-kimenet doksi
  (docs/knowledge/architecture/PLANNING_CAPABILITY_AUDIT_<dátum>.md) + ez a
  task-fájl naplója. Kód, konfig, Doorstar-forrás NEM érinthető.

## Kötelező keret (Doorstar-oldali pontosítás, Gábor közvetítette, 2026-07-27)

A Doorstar-oldal olvasata a termékesítési döntésekről — az audit ezt kötelező
keretként kezeli:
- A Planning felület **világ/kompozíció, nem maga a modul** (world≠module) —
  az audit a világ-összerakást és a mögöttes modul(oka)t KÜLÖN térképezze.
- A `spaceos.planning` név CSAK teljesen iparágsemleges magra jár; a faipari
  standardok, a Doorstar-import és az instance-adapter `joinerytech.*` ill.
  `doorstar.*` határon marad — az audit namespace-javaslata ezt a vágást
  tegye explicitté (mi a mag, mi az iparági réteg, mi az instance-réteg).
- A JWT `enabled_modules` **UI-hint, nem jogosultsági forrás** — a szerver-
  oldali authz a mérvadó; az audit mérje fel, mi kell a Planning szerver-oldali
  entitled/enabled ellenőrzéséhez a meglévő hosting-mintában.
- A Doorstar a termékmagot nem másolja: publikált kontraktus + manifest +
  verzió + hash a fogyasztási felület.

## Kérdések, amiket kódból kell megválaszolni

1. **Mi létezik már ütemezés/tervezés címén a platformon?** Tételes térkép
   fájl:sorral: Production modul (ProductionJob/WorkflowStep), cutting
   (vágás-tervezés/optimalizálás, kapacitás-fogalmak), Kernel FlowEpic +
   StageChain (mennyiben fed le plan-revízió/álltapot-szemantikát), inventory
   foglalások (reservation ≈ a kért "reservations"?), Maintenance ütemterv-rács.
   Mindegyikről: hostolt-e, migrált-e, van-e endpointja, ki fogyasztja.
2. **Ownership + namespace javaslat:** a finite-capacity mag iparágsemleges
   (spaceos.planning), a product/component/finish minősítős standard-import
   iparági (joinerytech.*)? Hol a határ? ADR-066/067 rezsimmel konzisztensen,
   a world≠module elvvel.
3. **Gap-lista a 6 Doorstar-követelmény ellen** (versioned standards import;
   elapsed duration + labour demand szétválasztás; FS/SS/FF/SF + partial
   release + fixed-date override + extra days; proposal/shadow/publish;
   overload + calendar slots OpenAPI; legacy-képlet baseline): melyikhez van
   már építőelem, melyik zöldmezős.
4. **Ütközés-térkép:** hol fedne át a Planning a meglévő aggregátumokkal
   (pl. ProductionJob státuszgép), és mi a duplikáció-mentes irány (referencia
   vs. átvétel vs. retire) — döntést NEM hoz, opciókat ad a PLAN-02 ADR-nek.
5. **RLS/tenant-minta:** melyik meglévő hosting-mintát követi a modul
   (ADR-061/062 + RlsFixtures proof), és mi kell a "tenant/RLS proof"
   gate-deliverable-höz.

## Elfogadási kritérium

- [ ] Audit-doksi a docs/knowledge/architecture/ alatt, minden állítás
      fájl:sorral.
- [ ] Namespace/ownership opciók indoklással (döntés: PLAN-02 ADR / Gábor).
- [ ] Gap-lista a 6 követelményre, becsült relatív mérettel.
- [ ] A Doorstartól kért 4 bemenet (response-doksi) státusza: mi érkezett meg,
      mi hiányzik még.

## Stop / eszkaláció

Ha az audit azt találja, hogy a Planning csak Kernel-módosítással építhető meg
értelmesen (FlowEpic/StageChain-bővítés), az AZONNALI stop + Gábor-döntés — a
kernel-érinthetetlenség szabálya szerint.
