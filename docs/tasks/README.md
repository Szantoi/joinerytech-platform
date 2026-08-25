# JoineryTech végrehajtási backlog és task-protokoll

Ez a mappa fejlesztői/agent végrehajtási dokumentáció. Nem termékbemutató és nem önálló állapotforrás: az aktuális program- és epic-státusz egyetlen forrása az [`EPICS.yaml`](../../EPICS.yaml).

## Mielőtt munkát kezdesz

1. Olvasd el az [`AGENTS.md`](../../AGENTS.md) és [`QUALITY.md`](../../QUALITY.md) fájlt.
2. Keresd meg az epicet az [`EPICS.yaml`](../../EPICS.yaml)-ban, és ellenőrizd a függőségeit.
3. Ha létezik, olvasd el az epic saját `README.md`-jét; különben az `EPICS.yaml`-ban jelölt `plan_doc` vagy task-hivatkozást. Ezután olvasd el a kiosztott task teljes tartalmát.
4. Rögzítsd a preflightot: HEAD, érintett submodule HEAD, munkafa-státusz, baseline és ismert pre-existing hiba.
5. Módosíts kizárólag a task mutációs határán belül. Idegen dirty diffet ne formázz és ne javíts mellékesen.

## A task-fájl szerepe

Egy végrehajtási tasknak meg kell mondania:

- a célt és üzleti okot;
- az előfeltételeket és függőségeket;
- az engedélyezett forrás- és mutációs határt;
- a mérhető elfogadási kritériumot;
- a futtatandó teszt- és ellenőrző parancsot;
- a stop/escalate feltételt;
- az átadási bizonyítékot és a következő biztonságos lépést.

## Definition of Ready

Task csak akkor indítható, ha a cél, a tulajdonos, a függőségek, a fájlhatár és a bizonyítási mód egyértelmű. Ha egy döntés, kontraktus vagy külső jogosultság hiányzik, a taskot ne implementációval próbáld feloldani; jelöld a blokkolót és eszkaláld.

## Definition of Done

Egy task akkor kész, ha:

- minden elfogadási kritérium bizonyított;
- a célzott és előírt regressziós kapu lefutott, vagy a dokumentált környezeti korlát világos;
- nincs új, elhallgatott warning vagy ismert regresszió;
- a task tartalmazza a módosított fájlokat, futtatott parancsokat, eredményt és megmaradt gapet;
- a szükséges független review megtörtént.

## Archívum és történet

A lezárt taskok az adott epic `archive/` mappájába kerülnek. Ezek bizonyítékok és mementók: visszaolvasásra valók, nem az aktuális nyitott backlog megállapítására.

## Kapcsolódó dokumentumok

- [Projekt README](../../README.md)
- [Állapot és tervezés](../STATUS.md)
- [Architektúra áttekintés](../ARCHITECTURE.md)
- [ADR-index](../knowledge/adr/README.md)
- [Fejlesztői útmutató](../DEVELOPMENT.md)
