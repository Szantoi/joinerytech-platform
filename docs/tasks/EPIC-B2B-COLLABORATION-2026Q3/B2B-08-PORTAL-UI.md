# B2B-08 — SpaceOS Collaboration portálmodul

- **Szerep:** frontend/designer
- **Prioritás:** P0
- **Státusz:** blocked
- **Függőség:** `B2B-07 = done`, `MODULE-PACKAGES = done`
- **Kimenet:** generált klienst használó, actor-specifikus B2B UI

## Cél

Mindkét vállalat számára világosan kezelhetővé tenni a beérkező és kimenő
megállapodásokat, a delegált munka állapotait, a feltételverziót és a teljesítési
bizonyítékokat a SpaceOS design system részeként.

## Kötelező felületek

- Beérkező feladatok és Kimenő együttműködések lista;
- agreement/work package detail és timeline;
- partner, role, scope, due/SLA, current owner és state;
- terms revision viewer és változásdiff elfogadás előtt;
- accept/reject/withdraw/amend és work-state actionok;
- deliverable/document/evidence referenciák;
- changes requested és completion review;
- delivery/reconciliation hibaállapot és biztonságos retry;
- actor/policy alapján kapott `allowedActions`, nem kliensoldali jogosultságtipp.

## UX-követelmények

- Minden destruktív vagy joghatást sugalló akció előtt pontos revision és fél
  látható.
- A felület „digitális megállapodás” és „elfogadási bizonyíték” nyelvet használ;
  nem állít minősített elektronikus aláírást.
- Stale ETag/revision esetén az akció megáll, a diff újratöltődik.
- Host és guest terminológia felhasználóbarát, instance terminology packkel
  felülírható, de a wire enum nem fordul.
- Keyboard, focus, screen-reader, kontraszt, dark mode és 200%-os zoom megfelel.

## Mutációs határ

A MODULE-PACKAGES által kijelölt publikus Collaboration frontend package,
composition registry és saját teszt/mocks fái. `ProjectsPage` csak elfogadott
route/migrációs terv szerint váltható le. Kézi API DTO és platformforrás-másolat
tilos.

## Elfogadási kritériumok

- [ ] Kizárólag a B2B-07 OpenAPI-ból generált kliens és query keys használatos.
- [ ] Host és guest fixture külön nézetet, azonos event sequence-et mutat.
- [ ] Terms diff és revision hash elfogadás előtt elérhető.
- [ ] Nem engedett action nem jelenik meg és direkt hívása API-n is tiltott.
- [ ] Loading/empty/error/offline/stale/reconciliation állapot elkészült.
- [ ] A11y és dark mode review PASS.
- [ ] Component/integration és két-tenant Playwright flow zöld.
- [ ] Designer és külön reviewer verdict PASS.

## Validáció

- lint, TypeScript build, unit/component teszt;
- MSW contract fixture csak generált típusból;
- Playwright host és guest browser contexttel;
- axe/a11y, responsive és visual review;
- bundle/package public API check.

## Stop / eszkaláció

Ha az API nem ad `allowedActions`, revision hash-t vagy actor-szűrt mezőket, a UI
nem találhatja ki ezeket. OpenAPI-eltérés a B2B-07-hez kerül vissza.

## Végrehajtási napló

_Kitöltendő: képernyők, contract version, teszt/build/a11y eredmény._

## Átadási bizonyíték

_Kitöltendő: screenshot/video, Playwright verdict, reviewer és package version._

