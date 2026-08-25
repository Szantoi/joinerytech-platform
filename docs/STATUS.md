# Állapot és tervezés

## Egyetlen élő státuszforrás

A JoineryTech program és epic állapota az [`EPICS.yaml`](../EPICS.yaml) fájlban él. Egy README, dated audit vagy chat-összefoglaló nem írhatja felül.

Az `EPICS.yaml` alapján válaszd ki az epicet. Ha létezik hozzá `docs/tasks/<EPIC>/README.md`, azt és az adott task végrehajtási szerződését olvasd el; ha nincs külön epic-mappa, az `EPICS.yaml` `plan_doc` vagy task-hivatkozása a belépési pont.

## Hogyan értelmezd a többi állapotdokumentumot?

| Dokumentumtípus | Mire jó? | Mire nem? |
|---|---|---|
| Dátumozott assessment vagy checkpoint | A megjelölt időpontban ismert tények és kockázatok | Élő backlog vagy release-engedély |
| QA/review report | Egy konkrét vizsgálat bizonyítéka | Általános production minősítés |
| Release-artefaktum | Rögzített verzió és integritási szerződés | Módosítható „latest” specifikáció |
| Task archive | Lezárt munka oka és bizonyítéka | Nyitott feladatlista |
| Local auth/provisioning contract | Implementációs és biztonsági korlát | Live activation vagy deploy jóváhagyás |

## Kapcsolódó források

- [Task-protokoll és végrehajtási backlog](tasks/README.md)
- [Architekturális dokumentumtérkép](knowledge/architecture/README.md)
- [Döntési rekordok](knowledge/adr/README.md)
- [Üzemeltetési dokumentumok](knowledge/deployment/README.md)

## Release és élesítés

Élesítési, tenant-mutatációs, credential- vagy release-pin művelethez mindig külön, jogosult jóváhagyás és a megfelelő runbook szerinti bizonyíték kell. A repositoryban szereplő terv, teszt vagy helyi konfiguráció önmagában nem felhatalmazás.
