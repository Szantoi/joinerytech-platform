# `<TASK-ID>` — `<rövid, eredmény-alapú cím>`

- **Epic:** `<EPIC-ID>`
- **Szerep:** `<backend|frontend|designer|infra|architect|monitor>`
- **Prioritás:** `<P0|P1|P2>`
- **Státusz:** `pending`
- **Függőség:** `<task-id-k vagy nincs>`
- **Mutációs határ:** `<konkrét mappák/fájlok>`
- **Tiltott scope:** `<amit nem szabad érinteni>`

## Cél és üzleti eredmény

Egy mondatban a létrejövő, felhasználó vagy platform számára ellenőrizhető eredmény.

## Kötelező források

- ADR / architektúra / valós API-forrás / design-spec hivatkozások.

## Preflight

1. HEAD-ek és dirty state rögzítése.
2. Függőségek és baseline teszt ellenőrzése.
3. Fájltulajdon és párhuzamos agentek ellenőrzése.

## Megvalósítási lépések

1. A legkisebb bukó regressziós teszt.
2. Domain/application/infrastructure/API sorrend, ha backend.
3. Schema/service/mock/page sorrend, ha frontend.
4. Dokumentáció és task-mementó.

## Teszt- és bizonyítékterv

```text
<pontos parancsok>
```

## Elfogadási kritériumok

- [ ] Mérhető, bináris feltételek.

## Stop / eszkaláció

- Döntést vagy scope-bővítést igénylő helyzetek; ilyenkor az agent nem talál ki
  új domaint vagy kontraktust.

## Végrehajtási napló

_Az agent tölti ki: döntések, eltérések, fájlok._

## Átadási bizonyíték

_Az agent tölti ki: parancs, tesztszám, log/részlet, maradék gap._

