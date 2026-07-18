# ERPSEP-07 — brand, terminology, template, policy és adapter pack szerződés

- **Epic:** EPIC-ERP-SEPARATION-2026Q3
- **Szerep:** architect/designer/backend/frontend
- **Prioritás:** P1
- **Státusz:** blocked
- **Függőség:** ERPSEP-02, ERPSEP-03; production extensionhöz PROJECT-CORE-ADR
- **Mutációs határ:** schema/ADR/reference fixture; üzleti implementáció tiltott
- **Tiltott scope:** Doorstar konkrét asset, stationlista, seed vagy policy-kód

## Cél és üzleti eredmény

Az instance saját képre formálható legyen platformfork nélkül, miközben világos
marad, mi konfiguráció, mi template, mi cserélhető policy, mi adapter és mi új
domainmodul.

## Kötelező kimenet

- `brand-pack-v1.schema.json` és design-token contract;
- terminology key registry;
- workflow/form/reference-data template schema és verziózás;
- policy interface, sandbox/trust és lifecycle szabály;
- integration adapter convention;
- döntési tábla: config vs template vs policy vs domain module;
- semleges reference fixture, nem Doorstar implementáció.

## Elfogadási kritériumok

- [ ] Ismeretlen token/template/policy fail-fast validációt kap.
- [ ] API/domain azonosítók nem nevezhetők át terminology packkal.
- [ ] Tranzakciós invariáns nem tehető sima JSON-konfigurációba.
- [ ] Policy és adapter verziózott, tesztelhető és permission-korlátozott.
- [ ] A Doorstar saját repositoryjában képes lesz kitölteni a sémákat platformfork nélkül.
- [ ] Designer és security reviewer elfogadta a contractot.

## Teszt- és bizonyítékterv

Schema validatorral kötelező positive és negative fixture: minimális brand,
ismeretlen token, hibás workflow, inkompatibilis policy és tiltott secret mező.

## Stop / eszkaláció

Ha a hatlépcsős workflow generikus/template mivolta még nyitott, annak sémája
csak draft lehet a Project Core ADR-ig.

## Végrehajtási napló

_Az agent tölti ki._

## Átadási bizonyíték

_Schema-k, fixture-validáció, decision table és reviewer verdict._

