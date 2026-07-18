# MODULE-PACKAGES — frontend workspace, ERP-modulcsomagok és composition appok

- **Epic:** EPIC-ERP-SEPARATION-2026Q3
- **Szerep:** frontend
- **Prioritás:** P0
- **Státusz:** blocked
- **Függőség:** MODULE-FOLDERS, ERPSEP-02
- **Mutációs határ:** `src/joinerytech-portal/` workspace/package/app szerkezet
- **Tiltott scope:** backend, Doorstar repository, runtime Module Federation,
  vizuális redesign, API-kontraktus módosítás

## Cél és üzleti eredmény

A jelenlegi hét modul külön publikus frontend-csomagként fogyasztható, miközben a
JoineryTech portál csak composition root. A csomagneveket az elfogadott ModuleId
ADR határozza meg; ügyfélspecifikus alkalmazáskód nem kerül ebbe a repositoryba.

## Kötelező források

- `docs/tasks/EPIC-UI-PORTAL-2026Q3/archive/MODULE-FOLDERS.md`
- ERPSEP-02 ADR és package-név konvenció
- portal `App.tsx`, `mocks/worlds.ts`, `mocks/handlers.ts`, `auth/`, `theme/`
- jelenlegi package-lock és build/chunk baseline

## Megvalósítási lépések

1. Rögzítsd a dependency- és bundle-baseline-t.
2. Hozd létre a workspace-et és a közös UI/core package-eket.
3. Emeld ki a hét modult publikus `index`, `routes`, `manifest`, `mocks` entrypointtal.
4. Szüntesd meg a Controlling→EHS deep importot és a legacy mock seed függőségeket.
5. Döntsd el az EHS wizard ownershipját a taskban dokumentált két opció közül.
6. A JoineryTech app kizárólag modul-listát és instance-defaultot adjon.
7. Készíts dependency-boundary tesztet tiltott deep importokra.

## Teszt- és bizonyítékterv

```powershell
cd src/joinerytech-portal
npm run build
npm test
npm run lint
```

Emellett kötelező a workspace csomagok külön buildje és a production output
ellenőrzése, hogy MSW handler ne kerüljön modul production entrypointba.

## Elfogadási kritériumok

- [ ] Minden ERP-modulnak dokumentált publikus frontend API-ja van.
- [ ] Más modul csak publikus entrypointról importálhat.
- [ ] A shell nem importál modulbelső oldalt vagy service-t.
- [ ] Mockok külön subpath exportban vannak, production bundle-be nem szivárognak.
- [ ] Build, teszt és lint nem romlik a rögzített baseline-hoz képest.
- [ ] Doorstar app helye csak későbbi fogyasztói contractként szerepel; Doorstar
      forrás nem kerül a JoineryTech munkafába.

## Stop / eszkaláció

React/Router/Vite peer dependency policy vagy package-név ADR nélkül ne hozz
létre végleges csomagnevet. A portált más agenttel párhuzamosan ne mutáld.

## Végrehajtási napló

_Az agent tölti ki._

## Átadási bizonyíték

_Workspace gráf, build/test/lint, chunk diff és tiltott-import teszt._

