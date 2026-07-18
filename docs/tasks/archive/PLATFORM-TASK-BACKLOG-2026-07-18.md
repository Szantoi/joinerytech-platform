# PLATFORM-TASK-BACKLOG-2026-07-18 — végrehajtható platform-backlog

**Státusz:** DONE  
**Dátum:** 2026-07-18  
**Preflight baseline:** `main@4a58e48`  
**Átadási HEAD:** `main@26f6f5d` (párhuzamos ADR-059 wire-task commit)  
**Hatókör:** dokumentáció és feladatvezérlés; alkalmazáskód, deploy és commit nélkül

## Cél

A projektfelmérés következtetéseit olyan részletes, fájlalapú feladatokra bontani,
amelyeket backend, frontend, infra, designer és architect agent önállóan is végre
tud hajtani, egyértelmű függőségekkel, mutációs határral, tesztkapuval és
elfogadási kritériumokkal.

## Elkészült eredmény

- Létrejött a központi agent-belépési pont: [`docs/tasks/README.md`](../README.md).
- Létrejött az egységes feladatkártya-sablon: [`TASK_TEMPLATE.md`](../TASK_TEMPLATE.md).
- Három végrehajtási sáv kapott saját indexet és részletes kártyákat:
  - [`EPIC-PLATFORM-STABILITY-2026Q3`](../EPIC-PLATFORM-STABILITY-2026Q3/README.md):
    5 task az RLS-bizonyítékhoz, EHS/Testcontainers-stabilitáshoz, frontend
    tesztkapuhoz és release-reprodukálhatósághoz;
  - [`EPIC-UI-WORLDS-2026Q3`](../EPIC-UI-WORLDS-2026Q3/README.md): 12 task a
    production és warehouse API-first megvalósításához, backend blokkolókkal és
    valós API-gate-ekkel;
  - [`EPIC-PROJECT-CORE-2026Q3`](../EPIC-PROJECT-CORE-2026Q3/README.md): 2 task a
    meglévő FlowManagement/FlowEpic/StageChain/B2BHandshake képességek auditjához
    és az ezt követő ADR-hez.
- Az [`EPICS.yaml`](../../../EPICS.yaml) 19 aktív task-fájlt, explicit
  `depends_on` kapcsolatokat és a lezárt portal-release valós állapotát tartalmazza.
- A Project Core sáv előbb read-only boundary auditot követel, ezért az agent nem
  hozhat létre véletlenül egy harmadik, duplikált projektmodell-forrást.

## Minőségi ellenőrzés

- YAML betöltés: PASS, 4 epic.
- Azonosítók: PASS, 85/85 egyedi.
- Aktív task-kártyák: PASS, 19/19 fájl létezik.
- Függőségek: PASS, minden hivatkozott ID létezik.
- Gráf: PASS, nincs függőségi kör.
- Kötelező szakaszok: PASS, 19/19 kártyán cél, elfogadási kritérium,
  stop/eszkaláció és bizonyíték/napló rész található.
- Helyi Markdown-linkek: PASS.
- `git diff --check`: PASS; csak a Windows LF→CRLF figyelmeztetések jelentek meg.

## Végrehajtási napló

1. A meglévő EPICS-, ADR-, hosting- és worlds-kontraktusállapot felmérése.
2. Külön, párhuzamosítható platform-, UI- és architektúra-sávok kijelölése.
3. Feladatkártyák készítése konkrét forrásfákkal, tiltott hatókörrel,
   tesztparancsokkal, acceptance és stop feltételekkel.
4. `EPICS.yaml`, tudásindex és lezárt portal-epic összhangba hozása.
5. Sémához igazított automatikus gráf-, metadata- és linkellenőrzés.

## Átadási bizonyíték

Az agentek elsődleges belépési pontja a [`docs/tasks/README.md`](../README.md), az
élő státusz forrása továbbra is az [`EPICS.yaml`](../../../EPICS.yaml). Kiadás előtt
a root vagy conductor a kártya `depends_on`, mutációs határ és lock szabályait
ellenőrzi. A task teljesítése után az agent ugyanabban a fájlban tölti ki a
végrehajtási naplót és az átadási bizonyítékot.
