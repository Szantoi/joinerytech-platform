# B2B-08 — SpaceOS Collaboration portálmodul

- **Szerep:** frontend/designer
- **Prioritás:** P0
- **Státusz:** done
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
UI design system tokenek és közös layout primitívek.

## Elvégzett munka (2026-07-28)

1. Létrehozva a `@spaceos/module-collaboration` modul (`packages/module-collaboration`).
2. Típusok és Zod sémák (`Agreement`, `DelegatedWorkPackage`, `TermsRevision`, `TermsDiff`, `AllowedActions`, `AcceptanceEvidence`).
3. Szerződés és feladatcsomag állapotgépek (FSM) és tónus feloldók.
4. TanStack Query API fetcherek és MSW mock handlers & seed adatok.
5. UI komponensek:
   - `CollaborationPage` KPI kártyákkal és fül alapú nézettel.
   - `AgreementDetailSlideOver` digitális bizonyítékkal és SHA-256 hash kijelzéssel.
   - `WorkPackageDetailSlideOver` bizonyíték referenciákkal és reklamáció kezeléssel.
   - `TermsDiffModal` SHA-256 lenyomatok és szöveges diff összehasonlítással.
6. Teszteltség:
   - Célzott unit tesztek: 10/10 PASS
   - `npm run build`: 0 error, 0 warning
   - Teljes `npm run test:pr`: 91/91 test file PASS (862/862 teszt 100% zöld).
