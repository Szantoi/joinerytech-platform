# WORLDS-PRODUCTION-REREVIEW — a production világ újravizsgálata a fix-körök után

- **Szerep:** designer
- **Prioritás:** P1
- **Státusz:** pending
- **Függőség:** `WORLDS-SHELL-FIX` (done), `WORLDS-PRODUCTION-FIX` (done)
- **Forrás:** [`WORLDS_PRODUCTION_DESIGN_REVIEW_2026-07-24.md`](../../knowledge/qa/WORLDS_PRODUCTION_DESIGN_REVIEW_2026-07-24.md)
  „Re-review feltétel" szekciója
- **Mutációs határ:** KIZÁRÓLAG a riport (verdikt-frissítés + re-review napló),
  az asseteket tartalmazó `docs/knowledge/qa/assets/` és ez a task-fájl.
  **Kódhoz nem nyúl** — ha új finding születik, az külön fix-task.

## Miért kell

A `W1-production` mérföldkő `done_when`-je „designer APPROVED". A 2026-07-24-i
review verdikt **CHANGES REQUESTED** volt (1 S + 15 M). A két fix-kör lezárult
(portal `WORLDS-SHELL-FIX` és `WORLDS-PRODUCTION-FIX`), de a verdikt csak friss
bizonyítékok alapján fordítható APPROVED-ra. Amíg ez nem történik meg, a
**W2-warehouse sáv blokkolt** (`WORLDS-WAREHOUSE-FE`).

## Mit kell elvégezni

1. **Friss screenshot-kör** ugyanazon a mátrixon, mint az eredeti review:
   6 route × light/dark × 3 szélesség (360 / 768 / 1440). Az eredeti assetek
   `docs/knowledge/qa/assets/worlds-production-review-2026-07-24/` alatt vannak —
   az újak külön, dátumozott mappába kerüljenek, hogy az ELŐTTE/UTÁNA
   összevethető maradjon.
2. **Élő probe-ok újrafuttatása:** tab-walk (fókuszcsapda), dokumentum-szintű
   overflow mérés, toast-inert próba, touch-zóna mérés. A `npm run test:smoke:keyboard`
   ezekből 16 ellenőrzést már automatizál — a re-review ezen felül a NEM
   automatizált területeket nézze (kontraszt, tipográfia, dark-párok, üres/hiba
   állapotok vizuális minősége).
3. **Tételes visszaellenőrzés** a riport S/M táblája szerint: findingonként
   „javítva / részben / nem" + bizonyíték (screenshot vagy probe-kimenet).
4. **Adatőszinteségi újramérés**: a M-3/M-4/M-5/M-6 gap-affordanciák tényleg
   láthatók-e a felületen, és nem keletkezett-e ÚJ, szépítő állítás.
5. **Verdikt** a riport tetején frissítve (APPROVED vagy CHANGES REQUESTED a
   megmaradt tételekkel), és az `EPICS.yaml` `W1-production` állapotának
   megfelelő léptetése.

## Elfogadási kritérium

- [ ] Friss screenshot-készlet + probe-kimenetek a repóban, hivatkozva a riportból.
- [ ] Findingonkénti visszaellenőrzés-tábla (16 tétel: 1 S + 15 M).
- [ ] A riport verdiktje frissítve, dátumozott re-review bejegyzéssel.
- [ ] Ha APPROVED: `W1-production` done, és a `WORLDS-WAREHOUSE-FE` felszabadul.
- [ ] Ha nem: az új/megmaradt tételek külön fix-taskba, ugyanazzal a szigorral.

## Stop / eszkaláció

A re-review NEM javíthat kódot. Ha a fix-körök bármelyik findingot csak
látszólag oldották meg (elrejtés, szépítés, hamis állítás), az ÖNÁLLÓ,
S-szintű lelet — a verdikt nem fordítható APPROVED-ra.
