# WORLDS-PRODUCTION-REREVIEW — a production világ újravizsgálata a fix-körök után

- **Szerep:** designer
- **Prioritás:** P1
- **Státusz:** done (2026-07-25, root) — verdikt: **APPROVED**
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

- [x] Friss screenshot-készlet (36 kép) + probe-kimenetek, hivatkozva a riportból.
- [x] Findingonkénti visszaellenőrzés-tábla (16 tétel: 1 S + 15 M) — mind javítva.
- [x] A riport verdiktje frissítve, dátumozott re-review bejegyzéssel.
- [x] APPROVED → `W1-production` done, a `WORLDS-WAREHOUSE-FE` felszabadul.
- [x] Az ÚJ lelet külön taskba: `WORLDS-SHELL-H1` (M, pre-existing, mind a 7 világ).

## Végrehajtási napló

**2026-07-25 — root (Claude).** Verdikt: **APPROVED** (riport frissítve).

- **Módszer:** az eredetivel azonos 36-képes mátrix (6 route × light/dark ×
  1440/768/360) friss felvétele + findingonkénti élő probe-ok + a repóba kötött
  `npm run test:smoke:keyboard` (16/16). Kód NEM módosult.
- **Objektív bizonyíték:** a `fullPage` felvétel vászonszélessége = a dokumentum
  `scrollWidth`-je, ezért az előtte/utána képméret önmagában méri a
  túlcsordulást: `quotes-*-desktop` **1538 → 1440 px** (a jelentett 98px h-scroll),
  `quotes-*-mobile` 478 → 360 px, `dash-dark-tablet` 927 → 768 px (az M-S1
  topbar-túlcsordulás). Mind a 36 kombinációra mért túlcsordulás **0 px**,
  konzol- és page-error **0**.
- **Élő megerősítés a legkényesebb tételekre:** M-5 toast a GENERÁLT
  szabásjegyzék-úton „24 szabásjegyzék-sor (8 ajtótétel)"; M-1 mind a négy
  dash-link valós route-ra visz; M-4 sehol nem szivárog a `0001-…` sentinel;
  M-9 nincs nyers wire-kulcs; M-10 az `elementFromPoint` a szövegdobozon
  ±10 px-re is a linket adja.
- **Nyíltan jelölt korlát:** az M-11/M-12 hibaágát böngészőben NEM lehetett
  provokálni, mert mock módban az MSW service worker a hálózati réteg előtt
  válaszol (a Playwright route-interception nem tud 500-at injektálni) — ott a
  bizonyíték a 6 jsdom-teszt.
- **ÚJ lelet:** duplikált `<h1>` minden képernyőn (shell + képernyő), két
  route-on egymásnak ellentmondó szöveggel („Szabászat"/„Vágótervezés",
  „Megmunkálás"/„Végrehajtás"). Pre-existing, mind a 7 világot érinti →
  `WORLDS-SHELL-H1`. Nem blokkolja az APPROVED-ot, mert a másik 6 világ
  ugyanezzel a mintával kapott APPROVED-ot; a következetlenség feloldása
  világfüggetlen task.

## Stop / eszkaláció

A re-review NEM javíthat kódot. Ha a fix-körök bármelyik findingot csak
látszólag oldották meg (elrejtés, szépítés, hamis állítás), az ÖNÁLLÓ,
S-szintű lelet — a verdikt nem fordítható APPROVED-ra.
