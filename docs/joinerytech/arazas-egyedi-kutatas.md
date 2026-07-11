# Egyedi tételek árazása — nagyvilági folyamatok + alkalmazási javaslat (2026-06-12, forrásokkal megerősítve)

> **A konfliktus:** az ajánlat-fázisban az egyedi (sablonnal le nem fedhető) elemhez
> még NINCS meg az az adat (szabásjegyzék, normák, útvonal), amiből a meglévő
> részletes kalkuláció (`MfgPrep.priceCalc`) árat tudna számolni — a műszaki
> munkalapon ezért ma egy **csupasz, kézzel beírt „ár/db"** áll, költség-alap,
> kockázat-kezelés és revízió nélkül. Ez ütközik a rendszer többi árazási
> filozófiájával (sablon→kalkulált önköltség+nyereség; kereskedelem→markup-motor;
> belsőépítész→díj-módszerek) és a „Teljesítve — árazható" kapu ígéretével.

---

## 1. Nagyvilági minták (kutatás — 2026-06-12-én forrásokkal ellenőrizve)

### A) AACE becslés-osztályok (Class 5 → Class 1) — az ár ÉRETTSÉGE deklarált
- AACE 17R-97/18R-97: öt osztály a **projekt-definíció érettsége** (0–100%) szerint,
  nem a becslés célja szerint. Class 5 (koncepció, 0–2% definíció) tipikusan
  **−50%…+100%** pontosságú; Class 4 (megvalósíthatóság) −30%…+50%;
  Class 1 (teljes terv) **−3..10% / +3..15%**.
- Kulcs-elv: a pontosságot a **rendelkezésre álló definíció érettsége** határozza meg
  („nem lehet Class 2 pontosságot Class 5 matekkal elérni"). Nem szégyen a ±40%-os
  szám — szégyen fixnek hazudni.
- Módszertan osztályonként változik: alacsony osztály = **sztochasztikus/parametrikus**
  (hasonló múltbeli munkák fajlagosai, kapacitás-görbék); magas osztály =
  **determinisztikus tételes** kalkuláció.
- Minden osztályhoz **kontingencia** (tartalék) tartozik — és a kontingencia NEM
  azonos az allowance-szal (a kontingencia a nem-specifikus bizonytalanságot fedi).
  A pontossági sávot mindig a konkrét projekt kockázat-elemzése adja, sosem
  előre rögzített; jól megválasztott kontingenciával a projektek ~80%-a a sávon
  belül végez.

### B) Kétlépcsős ETO-ajánlatadás: irányár (budgetary) → fix ár (firm)
- Bevett gyakorlat: **„budgetary/ROM" irányár gyorsan, rövidített átvilágítással**;
  **fix, garantált ár** csak teljes műszaki átvilágítás után — és a ráfordított
  mérnöki munkát óradíjjal kiszámlázzák, **az első megrendelésben jóváírva**.
  ⟵ ez PONT a már megépített **ajánlat-készítési díj** (feeQuote) mintánk!
- Ismert csapda: ha az irányár szisztematikusan alacsony („lowball"), a fix ár
  felugrik → az ügyfél-bizalom elvész. Ezért az irányár↔fix eltérést érdemes
  **mérni** (utókalkulációs visszacsatolás).
- **Estimate ≠ quotation**: az *estimate* a BELSŐ kalkulációs dokumentum (anyag,
  munka, külső szolgáltatás, árrés), a *quotation* az ügyfél-oldali ár. Összekötve,
  de külön él.
- **Cost-Based Quoting (CBQ)**: ETO-ban a CPQ (előre beárazott opciók) nem működik —
  a CPQ azt feltételezi, hogy minden opció már fel van találva, költségelve, árazva.
  A CBQ három fázisa: (1) a termék „feltalálása" (vázlat-BOM + vázlat-útvonal),
  (2) teljes költségelés + árazás (NRE/szerszám/mérnöki költség amortizálva,
  rezsi + profit rárakva), (3) ajánlat-prezentálás + elemzés.
  Két gyorsító út: eseti kalkuláció **hasonló korábbi munka klónozásával**, VAGY
  előre kalkulált **komponens-könyvtár** fix időközű (éves/negyedéves) frissítéssel
  (Bühler-minta).
- Fontos ETO-tanulság: a PLM/ERP merevsége (minden anyagnak léteznie kell érvényes
  árral, kész cikkszámmal) **akadályozza az ajánlat-fázist** — ajánlatkor vázlat-
  tételekkel kell tudni dolgozni. ⟵ nálunk ez már így van (catalog draft
  belül használható, eladásba nem).

### C) Irányösszeg / keretösszeg az ajánlatban (provisional sum / PC sum, építőipar)
- **Provisional sum (PS):** becsült keretösszeg olyan MUNKARÉSZRE (anyag+munka
  együtt), ami a szerződéskötéskor nem definiálható elég pontosan az árazáshoz —
  matematikailag benne van a szerződéses végösszegben, de a felek tudják, hogy a
  tényleges érték váltja majd ki (a végösszeg fel-le mozoghat). Lehet **defined**
  (ütemezésben/előkészítésben már figyelembe vehető) és **undefined**.
- **Prime cost (PC) tétel:** konkrét, de még ki nem választott TERMÉKRE (csap,
  front, munkalap — csak a szállítás/beszerzés, a beépítés munkadíja a fő árban van)
  keretösszeg — az ügyfél később választ; az eltérés **variáció/módosítás**
  (change order) formájában könyvelődik, a kivitelező árrése a növekményre rámegy
  (csökkenésnél az árrést nem írják jóvá — aszimmetria).
- Jogi védőkorlát több piacon: a keretösszeg **nem lehet irreálisan alacsony**
  („reasonable allowance", alulbecsülni tilos) — és záráskor számlával igazolandó.
- Lényeg: az ismeretlen NEM blokkolja az ajánlatot/szerződést, hanem **címkézett,
  szabályozott helyet kap** benne; mindkét felet védi.

---

## 2. Alkalmazási javaslat a JoineryTechre (a konfliktus feloldása)

A feloldás kulcsa: az egyedi tétel ára ne EGY szám legyen, hanem **(ár, érettség,
tartalék)** hármas, és az ajánlat-FSM tudjon róla.

1. **Ár-érettség minden ajánlat-tételen** (`priceClass`): `iranyar` (≈Class 5/4,
   ±sáv) · `kalkulalt` (≈Class 3, mini-kalkulációból) · `fix` (≈Class 1,
   katalógus/sablon/RFQ-nyertes). A forrás determinálja az alapértéket: sellable
   katalógus → fix; SpecEngine-feloldott sablon → kalkulált; egyedi
   mini-kalkulációval → kalkulált; egyedi csupasz szám → irányár.
   Az ajánlat-összesítő **sávot** mutat, ha van nem-fix tétel.
2. **Irányösszeg-tétel (PS-minta):** egyedi elem fix ár nélkül is bekerülhet a
   kiküldött ajánlatba — „**irányösszeg, pontosítás a műszaki tervezés után**"
   jelvénnyel; a végösszegben benne van. Pontosításkor nem felülírjuk némán:
   **módosítás-bejegyzés** (change order-csíra) váltja ki, delta-kijelzéssel.
   Anyag-keret (PC-minta) ugyanígy: „ügyfél-választásra váró front, keret: X Ft".
   Védőkorlát: az irányösszeg nem lehet nyilvánvalóan alulbecsült (a
   mini-kalkuláció alsó értéke alá ne mehessen figyelmeztetés nélkül).
3. **Mini-kalkuláció az egyedi elemen (CBQ estimate):** a munkalap „ár/db" mezője
   helyett kis belső kalkulációs blokk — anyag-becslés + munkaóra × óradíj +
   külső munka + rezsi% + nyereség% + **kontingencia% az érettség szerint** —
   a meglévő `WW_PRICE_PARAMS`-ból (egy igazságforrás). Aki tud, tételesen tölt;
   aki nem, az **analógia-klónnal** indul: hasonló korábbi egyedi tétel /
   utókalkulált munka átemelése kiindulásnak.
4. **Kétlépcsős ár-szint az ajánlaton:** `priceLevel: iranyar | fix`. Az irányár-
   ajánlat szabadon kiküldhető (gyors, olcsó); a **konvertálás** (rendelés/szerződés)
   csak fix szintű ajánlatból — VAGY irányösszeg-tételekkel, de akkor a szerződés
   PS-záradékot hordoz. A díj-ajánlat (feeQuote) = a fizetett mérnöki munka, ami
   az irányárat fixszé érleli (a nagyvilági „engineering fee, jóváírjuk" minta —
   a jóváírás a feeQuote összegének levonása a részletes ajánlatból/rendelésből).
5. **Visszacsatolás:** az Utókalkuláció (terv vs. tény) tény-adatai táplálják az
   analógia-könyvtárat — az irányárak sávja idővel szűkül („idővel pontosabb
   ajánlat" — már kimondott cél), és mérhető az irányár→fix→tény eltérés
   (lowball-csapda elkerülése).

**Mit old fel ez konkrétan?** Nem kell hazudni: az egyedi tétel ára ajánlat-fázisban
őszintén irányár; a kapu nem „van-e szám", hanem „van-e szám + deklarált érettség +
tartalék"; a pontosítás szabályozott módosítás, nem néma átírás; és a kézi szám
helyett van levezethető költség-alap, ami a többi árazási motorral közös
paraméterekből él.
