# woodwork_domain.md — Asztalos / faipari SZAKMAI tudás

> A JoineryTech prototípus **gyártástechnológiai domén-tudásának** otthona.
> Ide gyűjtjük a felhasználótól, könyvekből, ábrákból érkező SZAKMAI inputot — NEM a
> `CLAUDE.md`-be. A gyártás-előkészítés / útvonal-modell / anyagmodell / kalkuláció
> tervezésénél INNEN dolgozz. Élő jegyzet, folyamatosan bővül.
>
> Jelölés: ✅ a rendszerben modellezve · 🔨 részben · ⏳ még nincs · 💡 irány/ötlet
> Források + referencia-ábrák a fájl végén (`woodwork/`).

_Utolsó frissítés: 2026-06-09_

---

## 0. A LEGFONTOSABB ELV — az anyagtípus vezérli a folyamatot

A gyártás-előkészítés **NEM egyféle**. Az alapanyag típusa dönti el a teljes
folyamat-modellt, az alkatrész-fogalmat, az útvonalat ÉS a dokumentáció minden
számítását.

| | **Modern lapanyag** (MDF, laminált, faforgácslap, rétegelt) | **Tömörfa** (deszka, palló, fűrészáru) |
|---|---|---|
| **Mikortól „alkatrész"?** | **Már a szabásnál alkatrészben gondolkozunk** — a táblából nesting-gel közvetlenül a kész alkatrész jön ki. | A deszka **nyersáru**; az alkatrész több lépésen át, fokozatosan áll elő (darabolás → szélezés → egyengetés → vastagolás → táblásítás → szabás). |
| **Szelektálás** | Homogén → **nincs (vagy ritka) válogatás**, nincs csomó/repedés. | **Folyamatos szelektálás** darabolás/hasítás/egyengetés közben: csomó, repedés, szálirány, szín → **nem minden mehet mindenhová**, hibakiejtés. |
| **Kihozatal (yield)** | Magas, kiszámítható (nesting %); a hulladék = maradékanyag (offcut). | Alacsonyabb, **bizonytalan** — a hibakiejtés miatt a bemenő fűrészáru jóval több a nettónál (hulladékszázalék 110–300%, lásd 2.4). |
| **Mértékegység** | Felület (m² / tábla). | **Térfogat (m³)** fűrészárunál; furnér/lemez m². |
| **Anyagnorma forrása** | **Szabásjegyzék** (az élzárt készméret csak szabás után ismert). | **Alkatrészjegyzék** (a tömörfa-térfogatból). |
| **Útvonal** | Rövidebb, uniformizált: szabászat → élzárás → CNC → szerelés → felület. | **Hosszú, alkatrészenként ELTÉRŐ**; sok összevezető (ragasztási) csomópont. |

**Következmény a modellre:** az útvonal nem köthető fixen a „termékhez" — az
**anyagtípus** + az **alkatrész** együtt határozza meg. A jelenlegi rendszer
egyszerűsített, lapanyag-közeli, *per-rendelés* állomáslistát használ; a tömörfa
*per-alkatrész* útvonal-modellje és a tömörfa-specifikus anyag/segédanyag-norma
még hiányzik (lásd 13. pont).

---

## 1. A gyártásdokumentáció 10 része (a tömörfa-dok kanonikus váza)

Forrás: „Faipar műszaki dokumentáció" tankönyv, 2. fejezet (Tömörfa bútorok).
A dokumentáció logikus sorrendben, **egymásra épülve** készül, és a termelés
**minden szakaszában** használható. A kidolgozott példa végig egy **kétfiókos
íróasztal** (befoglaló 1300×750×770 mm).

| # | Rész | Mit tartalmaz | Rendszer |
|---|---|---|---|
| 1 | **Műszaki leírás** | név, befoglaló méret, anyagok fafajonként, szerkezeti felépítés, felületkezelés | 🔨 |
| 2 | **Alkatrészjegyzék** | minden alkatrész: db, méret, térfogat/felület, anyag | ✅ (BOM/parts) |
| 3 | **Szabásjegyzék** | alkatrész keresztmetszeti, **ráhagyásokkal növelt** méretei | ✅ (nesting) |
| 4 | **Alapanyagnorma** | melyik anyagból mennyi kell (+ hulladék%) | ✅ (MfgPrep anyag) |
| 5 | **Segédanyagnorma** | ragasztó, felületkezelő, csiszoló mennyisége | ⏳ |
| 6 | **Szerelvényjegyzék** | kötőelemek, vasalatok (név, méret, db, anyag) | ✅ (MfgPrep vasalat) |
| 7 | **Ütemterv** | készítés menete foglalkozásokra (munkanapokra) bontva | 🔨 (munkaidő) |
| 8 | **Részletes műveletterv** | EGY alkatrész teljes megmunkálása, mondatokban | ⏳ |
| 9 | **Vonalas folyamatábra** | per-alkatrész × per-művelet útvonal-mátrix | ⏳ (lásd 11.) |
| 10 | **Árkalkuláció** | bekerülési ár + eladási ár | ✅ (SpecEngine) |

---

## 2. Műszaki leírás (1)

Rövid, tömör összefoglaló a termék fő tulajdonságairól:
- **Termék neve** — világos, egyértelmű (később is beazonosítható).
- **Befoglaló méret** = a minimális helyszükséglet: **H × SZ × M** (egymásra
  merőleges legtávolabbi pontok). Speciális esetek:
  - Felépítményes asztal: munkamagasság ÉS tényleges magasság (pl. 1200×600×760/900).
  - **Korpuszbútor: front-felület előbb, majd mélység** (pl. 800×780×480).
- **Felhasznált anyagok** fafajonként: tömörfa + helyettesítő (faforgácslap, MDF,
  rétegelt lemez), furnér, svartni. (Segéd-/ragasztóanyag NEM itt.)
- **Szerkezeti felépítés** — bútortípus, kötések. Fiókos: fiók működtetése +
  szerkezet + záródás. Ajtós: ajtó típusa + záródás.
- **Felületkezelés** — itt csak a felhasznált anyag (pl. olaj).

Példa (kétfiókos íróasztal): állványszerkezet; tömörfa lábakhoz a kávák szakállas
vésett csappal, a lábösszekötők vésett csappal; tetőlap éllécezett, furnérozott
faforgácslap; fiókok csúszó- és támasztókeret között, ráütődő záródás, fecskefarkú
fogazás; felület: **olaj**.

---

## 3. Alkatrészjegyzék (2) — `fig-2.5`

Táblázat: `# · Alkatrésznév · Darab · H/Sz/V [mm] · V[m³]/A[m²] · Anyag · Megjegyzés`.
Csoportosítás: anyag+vastagság szerint, VAGY alapszerkezetenként (szekrénytest, fiók,
lábazat). **A sorszámok a későbbi táblázatokban sem változnak!** Méret mm-ben.

- **Tömörfa-elemek:** térfogat **m³, 4 tizedesre** kerekítve; végül fafaj+vastagság
  szerint összesítve (3 tizedes).
- **Lap- és lemezanyagok:** NEM összesítjük itt (a készméret csak élzárás után ismert)
  → mennyiségük a **szabásjegyzékből**.
- **Furnér:** m²-ben; **mindig KÉT oldalról furnérozunk!**
- **Élzáró (T-léc):** egy sorban, az összes élléc **összeadott hosszával**.

Példa-összesítés (kétfiókos asztal, 20 alkatrész): Cseresznye fűrészáru 52 mm
**0,006 m³**, 25 mm **0,029 m³**; Bükk fűrészáru 25 mm **0,001 m³**; Cseresznye furnér
**1,950 m²**; Nyír rétegelt lemez 4 mm **0,634 m²**. (A tetőlap faforgácslapja itt
NEM összesül.)

---

## 4. Szabásjegyzék (3) — `fig-2.7`

Az alkatrészek **keresztmetszeti megmunkálás előtti, ráhagyásokkal növelt** méretei.

- **Tömörfa ráhagyás:** hossz **+10–15 mm**, kereszt **+5–8 mm**. A vastagsági méret =
  az alapanyag **gyalulatlan** mérete (deszka **25 mm**, palló **52 mm**).
- **Rövid alkatrészek (350–400 mm alatt):** darabolás után géppel nem foghatók →
  összeadva, **egy darabban** szabjuk. Először a keresztmetszet, majd a hosszak.
- **Lap-/lemez (élzárt):** **magméret** (élzárás nélküli hossz/szél, ráhagyás NÉLKÜL,
  mert a parts-list már az élzárt adatot hozza); vastagság = agglomerált névleges méret.
- **Élzárás nélküli furnérozott lap** (pl. rétegelt hátfal): hordozólap +**10–10 mm**.
- **Tömörfa-élzáró (élléc):** összeadott hossz **+50 mm** (a 45°-os illesztéshez).

⚠️ **Norma-forrás kettős:** tömörfa-alkatrész → az **alkatrészjegyzék** térfogata
(itt vannak benne a ráhagyások a térfogatban? — NEM: a tömörfánál az anyagnorma az
alkatrészjegyzék térfogatából + hulladék%; a szabásjegyzék ráhagyásai a darabszintű
megmunkáláshoz kellenek). **Agglomerált lap → a szabásjegyzék** összesítését használjuk
(itt jelenik meg a faforgácslap 18 mm **0,895 m²**). A szabásjegyzék összesít:
Cseresznye 52 mm 0,008 · 25 mm 0,045 · Bükk 25 mm 0,001 · Faforgácslap 18 mm 0,895 m²
· Nyír rétegelt 4 mm 0,634 m².

---

## 5. Alapanyagnorma (4) — `fig-2.9` + hulladékszázalék-tábla `fig-2.1-hulladekszazalek`

„Melyik anyagból mennyi kell." **Szükséges mennyiség + hulladék% = összes mennyiség**
(mindhárom 3 tizedesre). Forrás: tömörfa → alkatrészjegyzék; agglomerált → szabásjegyzék.

### Hulladékszázalék-értékek (tapasztalati, 2.1. táblázat)
| Alapanyag | % | | Alapanyag | % |
|---|---|---|---|---|
| Lombos fűrészáru — tölgy | 150% | | Fenyő fűrészáru — szélezetlen | 75% |
| bükk | 130% | | szélezett | 65% |
| dió | 150% | | Furnér — teríték | 130% |
| juhar | 150% | | intarziás teríték | 200% |
| egyéb keménylombos | 120–150% | | intarzia kép | 300% |
| egyéb lágylombos | 110–130% | | **Lap- és lemeztermékek** | **10–15%** |

> A **>100% nem hiba**: a tömörfánál a hulladék gyakran több, mint a nettó (a
> bemenő fűrészáru többszöröse a kész alkatrésznek). A megvett fűrészáru térfogata
> legyen NAGYOBB a számítottnál, de ne túl sokkal (felesleges költség).
> Lap-/lemez: 18 mm faforgácslapból általában csak egész/fél tábla, 16 mm-t m²-re is.

Példa-norma (kétfiókos asztal): Cseresznye 52 mm 0,006+0,008(130%)=**0,014 m³**;
25 mm 0,029+0,038=**0,067 m³**; Bükk 25 mm 0,001+0,0013=**0,0023 m³**; Faforgácslap
18 mm 0,895+0,09(10%)=**0,985 m² (fél tábla)**; Nyír rétegelt 4 mm 0,634+0,063=
**0,697 m² (fél tábla)**; Cseresznye furnér 1,95+2,535(130%)=**4,485 m²**.

---

## 6. Segédanyagnorma (5) — `fig-2.11`

Ragasztó, felületelőkészítő, felületkezelő + egyéb (pl. bőr/filc írólap-betét).
Két adat kell: **(a) a kezelendő/ragasztandó felület**, **(b) a fajlagos felhordás**
(g/m², a biztonsági adatlapról) VAGY a **kiadósság** (adott mennyiség hány m²-re elég).

- **Ragasztási felület** bonyolult kötésnél egyszerűsített számítással közelíthető.
  Szakállas vésett csap: mint vésett csap (két él szorzata). Fecskefarkú: mint egyenes
  fogazás. Félig takart: a csap élhossza a réses alkatrész vastagságának **²⁄₃-a**.
- **Felületkezelő rétegek:** több réteg esetén a 2./3. réteg fajlagos felhordása
  **kisebb**, mint az elsőé (kevesebb anyag tapad meg).
- **Csiszolóanyag:** elég szemcsefinomság szerint felsorolni (pl. P100, P120, P180, P240).
- **Veszteség** általában a felhasználandó mennyiség **10%-a**.

Példa (kétfiókos asztal): PVAc vízbázisú diszperziós ragasztó 0,2154 m² × 130 g/m² =
28 g +10% = **31 g**; Karbamid-formaldehid (furnérozás) 1,95 m² × 120 g/m² = 234 g +10%
= **257 g**; Keményolaj (A.Nr.123) 6 m², 1. réteg 40 g/m² = 240 g, 2. réteg 25 g/m² =
150 g, +10% (39 g) = **429 g**; Csiszoló: P100, P120, P180, P240.

---

## 7. Szerelvényjegyzék (6) — `fig-2.13`

Kötőelemek, vasalatok: `Név · Méret · Darab · Anyag · Megjegyzés`. A cél a
**reprodukálhatóság** → pontos megnevezés + méret.

- **Tömörfa kötőelem** (köldökcsap, dominó, lamelló): anyagot is megadni.
- **Szeg mérete (tört/szorzat):** első tag = átmérő ×10, második = fejjel mért hossz.
  Pl. **14/25 → ø1,4 mm, hossz 25 mm**.
- **Csavar (szorzat):** első = fej alatti átmérő, második = fejjel mért hossz.
  Pl. **3,5×30 → ø3,5 mm, hossz 30 mm**.
- **Kivetőpánt:** rázáródó/közézáródó + nyitási szög számít.
- **Fiókvasalat / fiókrendszer:** katalógus szerinti név + névleges hosszméret.
- **Fogantyúk:** forma + méret + anyag (esetleg cikkszám).

Példa: Köldökcsap 8×35 mm 7 db (bükk); Huzalszeg 14×25 mm 12 db; Huzalszeg 12×16 mm
16 db; Faforgácslap csavar 3×30 mm 16 db; Fiókhúzó gomb 25×22 mm 2 db (fenyő).

---

## 8. Ütemterv (7) — `fig-2.15`

A készítés menete **foglalkozásokra (munkanapokra)** bontva, címszavakban. Előfeltétel:
ismerni és előre tervezni az alkatrészek gyártási folyamatát. Ne tervezzük se alul,
se túl magunkat.

Példa (kétfiókos asztal, 8 foglalkozás):
1. Válogatás, darabolás, hibakiejtés, szélezés.
2. Láb/káva/összekötő egyengetése, szelvényméretek, szerkezeti kötések, keretek ragasztása.
3. Csúszó-/támasztókeret egyengetése, szelvényméretek, kötések, keretek ragasztása.
4. Állványszerkezet összeépítése, fiókanyag egyengetése, szelvényméretek.
5. Fiók kötések, száraz összeépítés, fenékárkok kimarása, fiókfenék szabás, fiók ragasztás.
6. Tetőlap szabás, élléc egyengetés/vastagolás, éllécezés, furnérteríték, tetőlap furnérozás.
7. Összeépítés, felületelőkészítő csiszolás, felületkezelés 1. réteg.
8. Felületkezelés 2. réteg.

---

## 9. Részletes műveletterv (8) — `fig-2.16a` + `fig-2.16b`

EGY (jellemzően bonyolult/egyedi/speciális) alkatrész **teljes** megmunkálása a
válogatástól a felületkezelésig, **összefüggő mondatokban** (nem címszó). Betanításhoz,
minőséghez kulcs. (Piaci gyakorlatban ritkán készül.)

Példa-lépések (fiókhát készítése): **Alapanyag-választás** (legkisebb veszteség,
rajzolat) → **Darabolás/vágás** (karos leszabó körfűrész, stabil ütköztetés) →
**Szélezés** (asztalos szalagfűrész, kézi előtolás, biztonság) → **Bázisfelületek**
(egyengető gyalu: a **homorú lapot** a gépasztalra; az előtolás iránya a
**rostkifutással ellentétes**; bázislap → bázisél) → **Vastagság** (vastagoló gyalu,
fogásvétel beállítás, egyengetett lap alulra) → **Élek** (azonos szélességűeket élükre
állítva, párba fogva az elfordulás ellen) → **Hosszméret** (oldalanként +1–1 mm
ráhagyás, asztalos körfűrész, szegmensvonalzó-ütköző) → **Csaprés** (fecskefarkú; a
csapkiosztást **műhelyrajzról** viszi át a bütüre; keretes/japán fűrész + kézi véső;
ráhagyás a vállazásnál) → **Felületkezelés** (a bütü szintbe csiszolása, felület-
előkészítő csiszolás és kezelés a fiók összeépítése UTÁN).

---

> **➕ Egyedi tételek ÁRAZÁSI FOLYAMATA (becslés-osztály, irányár→fix, irányösszeg/PS,
> mini-kalkuláció):** lásd `arazas-egyedi-kutatas.md` — AACE Class 5→1, kétlépcsős
> ETO-ajánlat (budgetary→firm + fizetett mérnöki díj), provisional/PC sum minták
> + alkalmazási javaslat. Az ajánlat-fázisú egyedi árazásnál ONNAN dolgozz.

## 10. Árkalkuláció (10) — `fig-2.20` (egyszerűsített) + `fig-2.21` (összetett)

A bekerülési árat a korábbi részek (szabásjegyzék, alap-/segédanyagnorma,
szerelvényjegyzék, technológiai sorrend) nélkül nem lehet kiszámolni.

### Egyszerűsített (tanuló, BRUTTÓ értékek) — `fig-2.20`
- **(1) Anyagköltség** = összes alap- + segédanyag + szerelvény bruttó bekerülési ára.
- **(2) Bérköltség + rezsi** = (műszak teljes óra × **műszakkihasználtság**) × bruttó óradíj.
  Pl. 8 nap × 8 h = 64 h, kihasználtság 55% → (64×0,55) × 2500 = **88 000 Ft**.
- **(3) Gépköltség** = műszakkihasználtsággal csökkentett gépidő × gép-óradíj.
  Pl. [(64×0,55)/4] × 3000 = **26 400 Ft** (÷4: a telepített gépen a munkaórák ¼-ét töltik).
- **Kalkulált bruttó termékár** = (1)+(2)+(3). Példa: 85 834 + 88 000 + 26 400 = **200 234 Ft**.

### Összetett (vállalkozó, NETTÓ árak) — `fig-2.21`
1. **Anyagköltség** (nettó). 2. **Bérköltség** = tapasztalati idő × bruttó órabér
(pl. 16 h × 5000 = 80 000). 3. **Bérköltség járulékai** (2023: **13% szocho**) = 10 400.
4. **Egyéb költségek** (pl. külső cég bérmunkája: felület/kárpit/üveg). 5. **Közvetlen
költségek** (1+2+3+4) = 157 986. 6. **Általános költségek** (rezsi/raktár/szállítás/
admin, a közvetlen %-ában, pl. 20%) = 31 597. 7. **Önköltség** (5+6) = 189 583.
8. **Nyereség** (%, pl. 15%) = 28 437. 9. **Kalkulált ár** (7+8) = 218 020.
10. **Nettó eladási ár** (kerekítés, akár lefelé is) = 218 000. 11. **Bruttó eladási ár**
= nettó + **27% áfa (2023)** = **276 860 Ft**.

> A %-os értékek (járulék, áfa) a mindenkori jogszabály szerint változnak — ne
> drótozd be; konfigurálható paraméter legyen (vö. a meglévő margin-util / SpecEngine).

---

## 11. Vonalas folyamatábra (9) — `fig-2.18`

A dokumentáció **legösszetettebb** táblázata. Mátrix: **oszlop = alkatrész**,
**sor = művelet**; ahol az alkatrész átesik a műveleten → pont; az alkatrész pontjait
függőleges vonal köti össze. **Összevezetés:** ha a végösszeépítés előtt több
alkatrészt összeragasztottunk, azokat **vízszintes vonal** köti egy egységgé a
megfelelő sorban → onnantól egységként haladnak. A végén minden a *Kész termék* sorában,
egy pontba fut össze.

**Kulcs:** ez **DAG, nem lineáris lánc** — az alkatrészek kihagynak műveleteket, és a
ragasztási/szerelési pontokon rész-egységekké olvadnak (mint a BOM összeállítás,
gyártás-irányban).

### Műveletek (sorok, tömörfa technológiai sorrend)
Válogatás · Darabolás+hibakiejtés · Szélezés · Egyengetés · Vastagolás · Táblásítás ·
Szabás · Aljazások marása · Szerk. kötések kialakítása · Kétlábra ragasztás · Száraz
összeépítés · Fiókfenékárok marása · Előcsiszolás · Szerk. egységek ragasztása ·
Éllécezés · Furnérteríték készítés · Furnérozás · Csiszolás · Felületelőkészítő csiszolás ·
Felületkezelés · Bútor összeállítása · Kész termék.

### Alkatrész-taxonómia (kétfiókos asztal, az oszlopok)
Tetőlap · Élléc · Láb · Hátsó káva · Oldalsó káva · Oldalsó összekötő · Hátsó összekötő ·
Csúszókeret (első/hátsó/összekötő) · Támasztókeret (első/hátsó/összekötő) · Fiókház osztó ·
Fiókelő · Fiókhát · Fiókoldal · Fiókfenék · Vezetőléc · Csúszóléc.

> A **modern lapanyag** útvonala ennek rövid metszete: ~ Szabás (nesting) → (Aljazás/
> kötés = CNC) → Élzárás → Csiszolás → Felületkezelés → Összeállítás. A front-end
> (1–6.) és a táblásítás/furnérozás zöme kimarad.

---

## 12. Jellegrajz + szerkezeti kötés-szótár

A dokumentáció a **jellegrajzból** indul (`fig-2.1`: elöl/homlok/függőleges/vízszintes
metszetek + befoglaló méretek). Visszatérő tömörfa-kötések (a rendszer modellezéséhez
fontos szerkezeti vokabulár):
- **Szakállas vésett csap**, **vésett csap** (káva–láb, lábösszekötő).
- **Fecskefarkú csap / fogazás** (nyílt, félig takart) — fiók sarok-kötés.
- **Csapozás**, **aljazás** (horony, amibe keret/fenék ül), **köldökcsap/dominó/lamelló**.
- **Táblásítás** (élragasztott szélesített tábla), **éllécezés** (látszó élre tömör léc),
  **furnérozás** (két oldalról).
- Fiók: **csúszó működtetésű**, **ráütődő záródás**, csúszó-/támasztókeret között.

---

## 13. Implikációk a JoineryTech modellre

**Mi van ma (✅/🔨):** `MfgPrep.derive` (anyag/szabászat/vasalat/munkaidő levezetés),
`MfgPrep.routingPlan` per-rendelés állomáslista (`OP_TO_KIND`), `releaseToWorkshop`
→ várólistás `prodTasks`. **ÚJ (4.x):** `data-woodwork.js` (`WW_MATERIAL_KINDS`,
`WW_OPS`, `wwMaterialKind`/`wwPartOps`) + `MfgPrep.partRoutes` + `PrepFlowMatrix`
(„Folyamatábra" fül) → **anyagtípus-vezérelt per-alkatrész vonalas folyamatábra**
(lap = rövid / tömörfa = hosszú útvonal, egy mátrixban). Az alábbi két pont (anyagtípus
mint vezérlő, per-alkatrész útvonal) ezzel **🔨 részben kész** (vizualizáció + osztályozás;
a release még per-rendelés állomásból dolgozik).

**Fejlesztési irány (⏳/💡) — a fejezet alapján:**
- **✅ ÚJ — Anyagtípus-vezérelt anyagnorma (§0/§4/§5):** a `MfgPrep.derive` az anyag-sorokat anyagtípus szerint normázza — **lapanyag** m² → tábla (`WW_SHEET_WASTE_PCT` 12% hulladék), **tömörfa** m³ (terület × vastagság) + **fafaj-függő hulladékszázalék** (`WW_WOOD_WASTE`/`wwWoodWaste`: tölgy 150%, bükk 130%, dió/juhar 150%, fenyő 65%…; a >100% normális). Az Anyag fül két blokkra bomlik (Lapanyag/Tömörfa), a hulladék% és a bruttó m³/tábla láthatóan. `prep.totals.volumeM3`.
- **✅ ÚJ — Segédanyagnorma (§6, doc 5. rész):** új „Segédanyag" fül + `MfgPrep.computeAux` — **ragasztó** (élzáró hot-melt: élhossz × élmagasság × 220 g/m²; tömörfa táblásító 150 g/m²), **felületkezelő** (tömörfa felület két oldal × 1. réteg 40 / 2. réteg 25 g/m²), **csiszoló** (P100→P240 szemcse-lista) — mind +10% veszteséggel (`WW_AUX_DEFAULTS`/`WW_AUX_LOSS`). A laminált lap NEM kap felületkezelőt (kész felület); a szerkezeti kötőelem-ragasztás a Vasalat tételeknél marad.
- **✅ ÚJ — Lapanyag szabászati ráhagyások (§18):** új szabásjegyzék a Szabászat fülön + `wwCutSize(part, {mode})` — készméret → szabásméret: élzáró-marófej kompenzáció (+0,5/élzárt él; rövid él→hossz, hosszú él→szél.), **nesting vs. külön CNC** mód-váltó (CNC: +1,5 mm kontúr körben; nesting: 0), duplungolás, + tábla-szintű formázó vágás. Keskeny (< `edgeMinW`) élzárt alkatrész → **VV (visszavágás)** jelölés + csoport-javaslat. Etikett-jelölések: VV/CNC/NEST/DUP. Konfig: `WW_CUT_ALLOW`.
- **✅ ÚJ — Kétszintű árkalkuláció (§10):** új „Kalkuláció" fül + `MfgPrep.priceCalc(prep, params)` — **egyszerűsített** (bruttó: anyag + bér+rezsi + gép) és **összetett** (nettó: anyag + bér + járulék 13% + egyéb → közvetlen → +általános 20% → önköltség → +nyereség 15% → nettó ár → +áfa 27% → bruttó). A %-ok szerkeszthetők a UI-ból (`WW_PRICE_PARAMS`), nincsenek bedrótozva.
- **✅ ÚJ — Per-alkatrész műveleti lépések a műhelyben:** a `routingPlan` állomás-lépésenként kiszámolja a WW_OPS bontást (`opSteps`), a kiadás ráteszi a `prodTask`-ra, a Műhely-terminál (`TaskDetail`) lépésenként követhetővé teszi. A tömörfa front-end (válogatás→…→vastagolás→táblásítás, `front`-jelölt) és a táblásítás/szerelés merge (identitás-váltás) láthatóvá vált a műhelyben — nemcsak az előkészítő Folyamatábrán. A **release tehát már per-alkatrész szintű művelet-tudatot ad át**, nem csak per-rendelés állomáslistát.
- **Anyagtípus mint elsőrendű vezérlő:** `material kind = sheet | solidwood | veneer |
  edgeband`. Ez váltja a művelet-készletet, a normaszámítás forrását (alkatrész- vs.
  szabásjegyzék), a mértékegységet (m³ vs. m²/tábla) és a hulladék%-ot.
- **Tömörfa hulladékszázalék-tábla** (2.4) konfigurálható tényezőként az anyagnormában;
  a >100% kezelése (bemenő fűrészáru ≫ nettó).
- **Per-alkatrész útvonal (DAG)** + összevezető (ragasztási) csomópontok — a routing az
  ALKATRÉSZHEZ kötve, nem a rendeléshez. A BOM-összeállítás adja a merge-eket.
- **Szabásjegyzék-logika:** ráhagyások (tömörfa hossz +10–15 / kereszt +5–8; gyalulatlan
  vastagság deszka 25 / palló 52; rövid <350–400 mm összevonás; élzárt lap magméret;
  élléc +50 mm).
- **Segédanyagnorma** (ragasztó/felület/csiszoló) mint külön kimutatás (felület × fajlagos
  felhordás × rétegek + 10% veszteség).
- **Árkalkuláció** kétszintű (egyszerűsített bruttó / összetett nettó) — a meglévő
  ármotor bővítése bér+járulék+rezsi+gép+műszakkihasználtság+nyereség+áfa paraméterekkel
  (a %-ok jogszabály-konfigurálhatók).
- **Részletes műveletterv** mint opcionális, alkatrész-szintű munkautasítás (betanítás,
  minőség) — a Dokumentumtárhoz/QA-hoz köthető.

> Tervezési elv: a meglévő SPEC-rendszer (`resolveTemplate.parts`) MÁR per-alkatrész
> adatot hordoz — a per-alkatrész útvonalat, a tömörfa-normát és a kétszintű kalkulációt
> erre lehet ráépíteni.

---

## 14. Korpuszbútor (lapszerkezet) dokumentációja — a lap-ÁG (3. fejezet)

Forrás: 3. fejezet (korpuszbútor), kidolgozott példa: **éjjeliszekrény** (befoglaló
400×400×618 mm; laminált faforgácslap + nyír rétegelt lemez; korpusz köldökcsapokkal;
fémoldalas fiókrendszer ráütődő fiókelővel; ajtó ráütődő záródás; hátfal aljazásba
illesztett rétegelt lemez). Ez a **lapanyag-ág** kanonikus mintája — a tömörfa-ág
(2. fejezet) ellenpárja. A dokumentáció VÁZA ugyanaz (10 rész), de több ponton eltér:

- **Nincs külön szabásjegyzék** (`fig-3.3`): az alkatrész- és szabásjegyzék **összevont**,
  mert az agglomerált lapot a táblafelosztásnál **egyből a végméretre** vágják → a szabászati
  méret = a kész méret. A lapanyag m²-ben (és tábla); a tömörfa-front-end (válogatás/
  darabolás/egyengetés/vastagolás/táblásítás) **teljesen kimarad**.
- **Élzárás-tudatos méret:** mindig jelöld, **melyik élre milyen élzárás** kerül (+ lap és
  élzáró **színkód**; rajzolatos lapnál **szálirány**). Méret-szabály:
  - **Nincs szoftver-kapcsolat szabó↔élzáró között:** a **2 mm** élzáró vastagságát
    élenként le kell vonni a készméretből; a **0,4/0,8 mm** nem mérvadó (a gép lemarja) →
    a táblázatba a **kész méret** kerül.
  - **Szoftveres kapcsolat van:** a kész alkatrész-méreteket írjuk be, a szoftver
    **automatikusan levonja** a méreteket.
- **Alkatrészjegyzék-összesítés** (éjjeliszekrény, 11 sor): Laminált faforgácslap 18 mm
  **1,148 m²**, 16 mm **0,117 m²**, Nyír rétegelt lemez 4 mm **0,201 m²**. (Példa élzárás:
  Tetőlap/Ajtó/Fiókelő 4 él ABS 2 mm; Oldallap/Szekrényalj/Osztó 1 él ABS 0,4 mm.)
- **Alapanyagnorma** (`fig-3.4`): kis értékek; a szabászati veszteség nehezen kalkulálható
  (modern táblafelosztó szoftver) → elég a **szükséges mennyiség** + fél/egész tábla.
  Lap+lemez 18 mm 1,148 m² (fél tábla), 16 mm 0,117 (fél tábla), nyír 0,201+0,02(10%)=
  **0,22 m² (fél tábla)**. (18 mm-ből rendszerint egész/fél tábla; 16 mm-t m²-re is.)
- **Segédanyagnorma** (`fig-3.5`): KÉT ragasztó-fajta — **PVAc diszperzió** a szerkezeti
  kötésekhez (köldökcsap palást összeadott felülete: 0,023 m² × 130 g/m² = 3 g +10% = **3,5 g**)
  és **PVAc olvadékragasztó (hot-melt)** az élzáráshoz (élek összeadott területe: 0,138 m² ×
  220 g/m² = 30,36 g +10% = **33 g**). Az **élzáró anyag** fajtánként hosszban: ABS 2 mm
  4,23 m +10% = **4,65 m**; ABS 0,4 mm 3,416 m +10% = **3,76 m**.
- **Szerelvényjegyzék** (`fig-3.6`): pl. Köldökcsap 8×35 26 db (bükk); Ráütődő kivetőpánt
  **110°** 2 db; **B.TMB.A. fiókvasalat** (névl. hossz 350 mm) 1 szett; Rászegezős csúszótalp
  34×15×5 4 db; Faforgácslap csavar 3×14 14 db; Süllyesztett fejű **Euro csavar** 6,3×15 6 db.
- **Ütemterv** (`fig-3.7`): rövid — 1. Tervezés, szabászati kiírás. 2. Korpuszoldalak
  aljazása, furatok, korpusz összeépítés, fiók beépítés, tetőlap/hátfal/ajtó felrakás.
  **Részletes műveletterv egyszerű lapbútorhoz általában NEM készül.**
- **⭐ Vonalas folyamatábra** (`fig-3.8`) — **9 művelet** (vs. a tömörfa 22!):
  **Szabás → Élzárás → Furatok elkészítése → Marás → Korpusz összeépítése → Fiók beépítése
  → Tetőlap és hátfal beépítése → Ajtó felszerelése → Kész termék.** Nincs front-end, nincs
  furnérozás; a **Szabással** kezdődik. EZ a vizuális bizonyíték a lap-vs-tömörfa
  útvonal-különbségre (és igazolja a 0. és 11. pontot).
- **Árkalkuláció** (`fig-3.9`/`fig-3.10`): ÚJ tétel a **szabászati költség** (ha a szabást/
  élzárást **külső lapszabász** végzi → fm-ben; ha mi végezzük, a bérköltséget növeli).
  Egyszerűsített: (1a) anyag 30 441 + (1b) szabászat 4150 (szabás 6,42 m×250; ABS 2 mm
  4,225 m×400; ABS 0,4 mm 3,42 m×250) + bér/rezsi 13 000 + gép 3900 = **51 491 Ft bruttó**.
  Összetett: (1) 27 238 → … → nyereség 10% → (11) **73 660 Ft bruttó**.
- **Utókalkuláció** (3.10): a leszállított termékre a **tényleges** anyag-/bér-/rezsiköltség
  alapján újraszámolt önköltség → **terv vs. tény** összevetés; idővel pontosabb ajánlat.
  (Ez a JoineryTech **Kontrolling** világ utókalkulációjával rokon.)

---

## 15. Kereskedelmi / kiegészítő dokumentumok + a TELJES dokumentum-lánc (4. fejezet)

A gyártás-dokumentáción TÚLi, ügylet-szintű bizonylatok. Ezek nagyrészt MÁR léteznek a
JoineryTech világaiban (Sales/CRM/Finance/Logistics) — itt a faipari elvárások +
a **lánc**, ami a rendszer-folyamatot validálja.

### A dokumentum-lánc (gold — a rendszer-folyamat gerince)
**Helyszíni felmérés → Vonalas/vázlat rajz → Látványterv → Árajánlat (sorszám) →
Megrendelő (munkaszám/QR) → Szerződés → Gyártás → Szállítólevél → Számla (NAV).**
Minden lépés írásos (visszakereshetőség + dátum). Egy munka összes dokumentumát
**egy mappában** kell gyűjteni (rajzok, darabjegyzékek, szabásjegyzékek, anyagszükségletek) —
ez a JoineryTech **Dokumentumtár** + a tervezett DMS létjogosultsága.

### Árajánlat (`fig-4.1`)
Kötelező elemek: **saját adatok** (név/adószám/cím/elérhetőség/bank + a készítő neve);
**ajánlatkérő adatai** + tárgyaló személy; **tárgy/darabszám/ár** (általános ÉS rendkívüli
paraméterek: felület, szerelvény; **egyértelmű ÁFA-tartalom**); **pontos tartalom** (mire
vonatkozik / mire NEM; a **megrendelő-biztosított anyag** pl. fogantyú; ki végzi a
szállítást / helyszíni szerelést / kapcsolódó munkát + annak költsége); **határidők/fizetés**
(érvényesség, gyártási + beszerelési határidő, fizetési feltétel pl. előleg, mód pl.
átutalás); **aláírás** (cégjegyzésre jogosult); **SORSZÁM**. Minta: *Ajánlat 214/2023*,
Kétfiókos íróasztal, 218 000 nettó / 276 860 bruttó. → JoineryTech **Sales/Quote** (`QUOTES`).

### Megrendelő + munkaszám/QR (4.2)
A megrendelő az ajánlat ügyfél általi **elfogadása** (ma jellemzően e-mail, az ajánlat
számára hivatkozva). Utána a megrendelés **rendelési/munkaszámot** kap (akár **vonalkód/
QR**), ami **végigkíséri a gyártást** — rajta van minden tervrajzon, nyomtatott címkén →
azonosíthatóság. ⭐ EZ a JoineryTech **rendelés-azonosító + címke-QR** koncepció (a
Műhely-terminál etikett-szkennelése, a `prodTask.order`).

### Szerződés (`fig-4.2`)
Vállalkozói szerződés. Folyamat: helyszíni egyeztetés → **vonalas rajz** (vázlat/falnézeti,
max 5 munkanap) → finomítás → **látványterv** (max 5 munkanap; megrendelés esetén díjtalan,
ELMARADÁS esetén az ajánlati ár **10%-a** fizetendő) → **árajánlat** (fő műszaki paraméterek +
szállítás/beszerelés) → **megrendelés** írásban (ajánlat + látványterv számára hivatkozva).
Kulcs-kikötések: **tulajdonjog-fenntartás** (a teljes vételár megfizetéséig a termék a
Vállalkozó tulajdona); **késedelmi kamat** (jegybanki alapkamat); **garancia/jótállás 2 év**
(az átadástól); módosítás csak **írásban, közös megegyezéssel**. → JoineryTech
**`data-contracts` / Pénzügy → Szerződések** (bővíthető: tulajdonjog-fenntartás, jótállás,
látványterv-díj).

### Gyártási folyamat (4.4)
Aláírt szerződés → anyagrendelés → gyártás a rögzített paraméterekkel. **Termék-változás**
(pl. anyag nem elérhető) → **írásban jelezni ÉS a megrendelő írásban elfogadja** (change
control). Elkészülés előtt 1 hét / 1-2 nappal értesítés a kiszállításról. → a tervezett
**DMS verzió/jóváhagyás** + a gyártás-előkészítés rajz-verzió-tudatának indoklása.

### Szállítólevél (`fig-4.3`)
Az elkészült termékhez; szállító + vevő adatai, kiállítási + **átvételi** dátum, termékkód/
név/mennyiség/fő méret/**tömeg**, gépi esetén nettó/bruttó; utalhat a szállítás módjára, az
ajánlat/megrendelés számára. Aláírással: a Vállalkozó leszállította, a Megrendelő **átvette**.
Minta *SZ101/2023*. → JoineryTech **Logisztika** (kiszállítás/átadás).

### Számla (`fig-4.4`)
**Szigorú számadású bizonylat**, jogszabályi forma, a (gépi) szállítólevél/szerződés alapján;
adatai **automatikusan a NAV felé** továbbítódnak. Kötelező tartalom: vállalkozó + megrendelő
adatai, **számla kelte**, fizetési határidő, **egyedi sorszám**, termék pontos megnevezés
(cikkszám/kód), mennyiség, **nettó egységár**, nettó + bruttó végösszeg, **ÁFA% és érték**.
Egyéni vállalkozó: „egyéni vállalkozó"/„e.v." + nyilvántartási szám. Minta *2429/2023*
(hivatkozik az SZ101/2023 szállítólevélre). → JoineryTech **Pénzügy** (`finInvoices`,
`createInvoiceFromOrder`).

> **Implikáció:** a JoineryTech lánc (CRM → Sales/Quote → Order → Contract → Production →
> Logistics → Finance/Invoice) NAGYJÁBÓL fedi ezt a faipari láncot. **Megerősítve** a modell.
> **Gap-ek:** (1) látványterv-fázis + díj-kikötés a szerződés előtt; (2) a **munkaszám/QR**
> egységes átfűzése felmérés→számla; (3) szerződés tulajdonjog-fenntartás + 2 év jótállás;
> (4) **change-control** (termék-változás írásos elfogadással); (5) **utókalkuláció**
> (terv vs. tény) a Kontrollingban.

---

## 16. Alkatrész-azonosítás — cím-hierarchia (traceability nagy projektben)

Nagy / projektszintű munkánál egy alkatrész **egyértelmű beazonosításához** a
projektszámon belül egy HIERARCHIKUS cím kell — hogy követhető legyen, az elemmel mi
történjen, és hova (melyik emelet/helyiség) megy. Egyedi munkánál és nagy projektnél
egyaránt ez teremti meg az egyértelműséget.

**Cím-hierarchia:**
`Projektszám › Helyszín › (Emelet) › Helyiség › Csoport › Elem › Alkatrész`

**Példa:** `Tulipán utca · 3. emelet · Nappali · TV fal · 3E · Oldalfal`
= a Tulipán utcába, a 3. emeletre, a nappaliba, a **TV fal 3E elemének** az **oldalfala**.

**Szegmens-szótár:**
- **Projektszám** — a munka/rendelés azonosító (a meglévő `order`/projekt-azonosító; a
  címke-QR + a `prodTask.order` ezt hordozza; vö. 4.2 munkaszám/QR).
- **Helyszín** (site) — cím/telephely; **tartalmazhatja az emeletet** (opcionális szegmens).
- **Helyiség** (room) — pl. nappali, konyha, fürdő.
- **Csoport** (group) — bútorsor / funkcionális egység, pl. „TV fal", „felső szekrénysor".
  → a **Bútorsor (composition)** világ egy összeállítása.
- **Elem** (element/unit) — a csoporton belüli EGY bútorelem, pl. „3E". → composition item.
- **Alkatrész** (part) — pl. oldalfal, polc, ajtó, hátlap. → a **per-alkatrész útvonal** oszlopa.

**⭐ Kulcs-elv:** **nem minden kódelemnek kell mindig látszania** — kontextus dönti el,
mit mutatunk. A műhelyben az **elem + alkatrész** elég; a szállításnál/beépítésnél a
**helyszín + emelet + helyiség** számít; a gyártás-előkészítésben a **csoport + elem**.
De a teljes cím a háttérben végig megvan az egyértelműségért (szűrhető/kontextus-függő
megjelenítés).

**Implikációk a rendszerre:**
- A **címke-stratégia** (`PartLabel`/`RakatLabel`, `page-labels.jsx`) alkatrész-kódja
  VALÓJÁBAN ez a cím — sűrűség szerinti szegmens-megjelenítéssel (mini = elem+alkatrész;
  full = teljes cím). A 3-szintű traceability (Tábla→Alkatrész→Rakat) EZ alá rendelődik:
  az „Alkatrész" szint kapja a cím-hierarchiát.
- A **per-alkatrész vonalas folyamatábra** oszlopai = elem-alkatrészek; a cím a fejléc/
  tooltip (`PrepFlowMatrix`).
- A **Bútorsor (composition)** világ már modellezi a **csoport→elem** szintet (falnézet);
  ide köthető a helyszín/helyiség kontextus + az elem alkatrész-bontása.
- Az **útvonal/routing** alkatrész-szinten él → a cím a routing/feladat természetes kulcsa
  (a Műhely-terminál etikett-szkennelés ezt oldja fel).
- 💡 Adat-modell javaslat: strukturált `partRef = { project, site, floor?, room, group,
  element, part }` + egy `partAddrLabel(ref, density)` formázó (kontextus-függő szegmensek).

### Identitás-váltás összeszereléskor (merge → új egység, új jelölés)

A folyamatban az **összeszerelési (merge) csomópontok** nemcsak fizikailag egyesítik az
alkatrészeket, hanem **megváltoztatják azok azonosságát/jelölését**: az egyesített
alkatrészek többé NEM külön entitások, hanem **egy új, magasabb szintű egység**.
- **Példa:** beltéri ajtónál az **ajtólap-keret** + **betétlap** összeépítve már
  **ajtólap**-ként létezik tovább. Csomagoláskor/szállításkor már az „ajtólap"-ot keresik,
  nem külön a keretet és a betétet.
- A **vonalas folyamatábra** merge-pontjai (táblásítás, kétlábra ragasztás, szerk. egységek
  ragasztása, összeépítés) PONTOSAN ezek az **identitás-váltó** pontok (a 11. pont DAG-
  összevezetései). A merge ELŐTT komponens-azonosítók, UTÁNA egység-azonosító él.
- A **cím-hierarchiában** (fent) ez **felgördülés**: a merge után már nem a `part`, hanem
  az `element` / rész-egység a követett szint. Pl. `… TV fal · 3E · Oldalfal` + a többi
  korpusz-alkatrész → összeszerelés után `… TV fal · 3E` (a korpusz mint egység).

**Modell-implikáció:**
- A merge-csomóponton **új azonosító (assembly-ref) keletkezik**, a beérkező alkatrész-
  ref-ek **beolvadnak / lezárulnak** (consumed) — ez a BOM-összeállítás megfordítása,
  gyártás-irányban (vö. `explodeBom` fordítottja).
- **Címke/traceability:** a merge után **új címke** kell az egységre (rakat/egység-címke);
  a komponens-alkatrész-címkék az egységbe kerülve „lezárulnak". A Műhely-terminál
  etikett-szkennelése a merge után az **egység-kódot** oldja fel, nem a komponensét.
- **Adat:** pl. `assemblyRef = { …partRef element-szintig, assembly: "Ajtólap", consumes:[partRef…] }`;
  a routing/feladat a merge-lépéstől az egységre hivatkozik.
- 💡 A `prodTask`/útvonal-lépéseknek lehetne `produces`/`consumes` mezője a merge-eknél,
  hogy a státusz és a jelölés helyesen gördüljön az egység szintjére.

---

## 17. Faipari GYÁRTÁSSZERVEZÉS (Soponyai Éva: Faipari gyártásszervezés, Skandi-Wald, 4. kiadás)

A faipari termelés-szervezés kanonikus tankönyve. A teljes fejezet-váz (a rendszer-
tervezéshez használható keret); a kötet végén Irodalom (129). A JoineryTech világai
nagyrészt EZT a keretet valósítják meg — alább a vázlat + a rendszer-releváns fogalmak.

### Fejezet-váz
1. **Szervezés és vezetés** — szervezés, cél, rendszer (működés/tulajdonságok, döntési
   kényszer), folyamatok (egységek kapcsolata, vállalati struktúra), rendszervizsgálat
   (modellezés, **feketedoboz-módszer**), irányítás (szükségesség, környezeti hatások,
   beavatkozás), gazdálkodószervezetek, folyamat-fajták (**irányítási / fizikai /
   gazdasági** + hibalehetőségei), információk (érték, áramlás, helyes/téves döntés).
2. **Rendszer- és munkaszervezés** — rendszerszervezés folyamata, munkaszervezés,
   **gyártásszervezés** (műszaki fejlesztés, gyártásfejlesztés, gyárfejlesztés/beruházás,
   **termelékenység**, **megtérülési idő**).
3. **A gyártási folyamat megszervezése** — gyártási folyamat összetevői; felépítés
   rendeltetés szerint: **fő- / segéd- / mellékfolyamat**; **gyártási típusok**;
   **gyártás-előkészítés** (anyagnorma, létszámszükséglet, készletgazdálkodás/raktárkészlet);
   **munkaerő-gazdálkodás** (munkaidő kihasználtsága, munkabér/**bérnorma**, hatékonyság-növelés).
4. **Gazdaságossági számítások** — gazdaságosság (munkatermelékenység, megtakarítás),
   megtérülési idő, **átfutási idő**, befektetett eszközök **forgásideje**, gyártás
   tervezése (üzleti terv, **kapacitás**, **átbocsátóképesség**, **kapacitáskihasználtság**),
   **gyártási program**.
5. **Az emberi tényezők hatása a munkavégzésre** — munkalélektan, figyelem, emlékezés,
   hatékonyságot befolyásoló tényezők (üzemen belüli tárgyi / személyi / üzemen kívüli).
6. **Műszaki dokumentáció** — feladat; részei (műszaki rajzok, alkatrészjegyzék,
   szabásjegyzék, **technológiai sorrend**); **előkalkuláció** (alapadatok, munkalap,
   ellenőrzés) + **utókalkuláció**. → vö. a 1–10. szakasz (a másik könyv) részletesen.
7. **Faipari üzem tervezése** — engedélyeztetés (lakóövezet, ipari/raktárépület), üzem
   telepítése, technológiai terv, **tűzvédelem** (tűztávolság, tűzszakasz, tűzoltóvíz),
   üzem/műhely épületei.
8. **Az üzem berendezésének tervezése** — munkahelytervezés (gép-helyszükséglet,
   **gépelrendezési terv**, üzemrészek anyagmozgatása); **gyártási rendszerek és
   anyagmozgatás** (lásd lent); anyagmozgatás területei (külső szállítás / üzemegységek
   közötti / üzemen belüli); anyagmozgatási technológia.
9. **Szabványok** — európai/nemzetközi + magyar szabványosítás, **faipari szabványok**
   (használat, jelölés/azonosítás), nemzetközi osztályozási rendszer, vállalati szabvány.
10. **Minőségbiztosítás, minőségirányítás** — 8 alapelv (lent); MIR tervezése (vevői
    elégedettség, dokumentálás, emberi erőforrás, infrastruktúra, termék-előállítás
    megtervezése); terméktervezés/-fejlesztés; beszerzés; termék-előállítás szabályozása;
    termék megfigyelése/mérése; **hibás termékek kezelése**.
11. **Számítástechnika a faiparban** — felhasználói programok, hálózat, faipari szoftverek.

### Rendszer-releváns fogalmak (a demóhoz)
- **⭐ Gyártási típusok** (a darabszám/ismétlődés szerint — a JoineryTech sokszínűségének
  alapja): **egyedi** (egyedi munka, nincs ismétlés — pl. asztalos egyedi bútor),
  **sorozat** (kis/nagy sorozat), **tömeggyártás**. A típus vezérli az
  előkészítés-mélységet, a routing-modellt és a kalkulációt (egyedi → részletes
  műveletterv ritka; sorozat → érdemes). Vö. a per-alkatrész útvonal (0./11. pont).
- **⭐ Gyártási rendszerek + anyagmozgatás** (üzemszervezési minták — a Műhely/Üzemvezető
  modell alapja): **műhelyrendszerű** (gépcsoportok, nagy anyagmozgatás, rugalmas, egyedi/
  kis sorozat), **csoportos / zárt ciklusú** (cellagyártás, alkatrész-családok),
  **folyamatos rendszerű** (gyártósor, nagy sorozat/tömeg, minimális anyagmozgatás).
- **Folyamat-tagolás rendeltetés szerint:** **fő-** (közvetlen termék-előállítás),
  **segéd-** (szerszám, karbantartás, energia), **mellék-** (hulladék-hasznosítás).
  → JoineryTech: gyártás = fő, karbantartás = segéd, maradékanyag/offcut = mellék.
- **Kapacitás-fogalmak** (Üzemvezető/Kontrolling): **kapacitás** (elvi max teljesítmény),
  **átbocsátóképesség** (tényleges áteresztés a szűk keresztmetszettel), **kapacitás-
  kihasználtság** (tény/elvi %). → a `ProdSchedEngine` véges-kapacitás + szűk
  keresztmetszet logikája EZT modellezi.
- **Idő-fogalmak:** **átfutási idő** (rendeléstől a készig), **megtérülési idő**
  (beruházás), **forgásidő** (befektetett eszköz). → Kontrolling / Logisztika.
- **Gyártás-előkészítés normák:** **anyagnorma**, **létszámszükséglet**, **bérnorma**,
  **munkaidő-kihasználtság** (vö. az árkalkuláció műszakkihasználtság-tényezője).
- **⭐ Minőségirányítás 8 alapelve** (ISO 9000 szellem — a Minőség világ kerete):
  1) vevőközpontúság · 2) vezetési kultúra · 3) munkatársak bevonása · 4) folyamatszemlélet ·
  5) rendszerszemléletű irányítás · 6) folyamatos fejlesztés · 7) tényekre alapozott
  döntéshozatal · 8) kölcsönösen előnyös szállítói kapcsolatok. + **hibás termékek
  kezelése** (→ a service/reklamáció + QA világ).
- **Feketedoboz-módszer / rendszerszemlélet:** a rendszert bemenet→kimenet viszonyként
  vizsgáljuk (a belső működés elvonatkoztatva) — hasznos a világok közti interfész-gondolkodáshoz.

### Implikáció a JoineryTech-re
A meglévő világok lefedik a keret nagy részét: **gyártási rendszer/anyagmozgatás** →
Műhely-terminál + Üzemvezető; **kapacitás/átbocsátóképesség/szűk keresztmetszet** →
ProdSchedEngine + Üzemvezető Terhelés; **gyártás-előkészítés normák** → MfgPrep;
**minőség 8 alapelv + hibás termék** → Minőség + Reklamáció; **átfutás/megtérülés/forgás**
→ Kontrolling/Pénzügy; **műszaki dok + elő-/utókalkuláció** → MfgPrep + Kontrolling.
💡 Explicit **gyártási-típus** mező (egyedi/sorozat/tömeg) a rendelésen/projekten vezérelhetné
az előkészítés mélységét és a routing-modellt (per-alkatrész vs. sorozat-batch).

> A kötet részletes oldalai (képletek: termelékenység, kapacitáskihasználtság, átfutási
> idő, anyag-/bérnorma; gépelrendezési/anyagmozgatási tervek) IGÉNY SZERINT mélyíthetők
> — a `bookscan/` fotók egy adott fejezetét kötegben kiolvasva. A fenti váz a teljes
> tartalomjegyzékből (Tartalom, 4–5. o.) készült.

---

## 18. Lapanyag szabászati ráhagyások és technikák (élzáró-/CNC-tudatos)

Forrás: gyakorlati input (asztalos, 2026-06). A **lapanyag szabásmérete** (a táblán
kivágandó méret) általában **NAGYOBB a készméretnél** — sőt sokszor az élzárt
készméretnél is — több, egymásra rakódó okból. A ráhagyásokat az alkatrész
jellemzői (élzárás, CNC vs. nesting, gérvágás, minta, duplázás) vezérlik, és az
**etiketten jelölik** (VV, GV, …). A `§4` (tömörfa szabásjegyzék) lap-párja.

### 18.1 Élzáró marófej-kompenzáció (élzárt élek) — **+0,5 mm / élzárt él**
Az élzárógépen lévő **marófej** az élzáró-anyagot (akár annak teljes vastagságát is)
lemarja — **oldalanként 0,5 mm**. Ezért az élzárt élre rá kell hagyni, mert a
szabászaton az **elővágó (scoring) lap szélesebb, mint a hasító lap**, és ne maradjon
a ~0,2 mm-es perem. **Élzárt élenként +0,5 mm.** Ha egy méret mindkét végén
(pl. a két **kereszt/rövid** él) élzárt → arra a méretre **+1 mm**.
> Geometria: a **rövid (kereszt) élek** élzárása a **hosszméretet** növeli; a
> **hosszú élek** élzárása a **szélességet**.

### 18.2 CNC-kontúr ráhagyás — **+1–2 mm (csak külön CNC, NEM nesting)**
Ha az alkatrész **külön CNC-gépsorra** kerül, a gép a befogás UTÁN **körbekonturozza**
az anyagot, hogy a befogás bizonytalanságát kiküszöbölje → a furatok/marások/minták
biztosan jó helyre kerülnek. Ezért **+1–2 mm** ráhagyás kell körben.
- **⭐ Nesting-kivétel:** ha a **szabászat MAGA a CNC-n** történik (egy befogással
  szabás + furatolás), **NINCS szükség** erre a ráhagyásra. (A nesting több ráhagyást
  kivált — ez a modern alapeset.)

### 18.3 Gérvágás (GV) / szögbe vágott él — **+1–10 mm / vágás (opcionális)**
A **gérvágás (45°)** elsősorban **csomóponti (kötés) kialakítás**: **párt feltételez** —
a kapcsolódó alkatrész éle is gérelt (pl. **oldallapok, keretek, korpuszok** sarka,
ahol két gérelt él találkozik). Az ember a gérvágásnál **párt vár** (összeillő gérelt él).
- **Ha NINCS pár** (nincs összeillő gérelt alkatrész), akkor **szögbe vágott él** a neve —
  pl. **kinézeti** ok, vagy **fogantyú nélküli nyitás** (fogásmélyedés / nyitássegítő él).
- Ráhagyás gérelt/szögbe vágott élre **+1–10 mm/vágás** (van, aki **0-án** hagyja). A rövid
  (szélirányra merőleges) élen is. **Etikett-jelölés: `GV` + érintett élek**, pl.
  **`GV 1R1H`** = gérvágás 1 rövid + 1 hosszú él.
> A „front" NEM helyes szűkítés — a gér bármely **élkialakítás/kötés** lehet (oldallap,
> keret, korpusz, fedlap). A rendszerben a GV-jelölés a **gérelt/szögbe vágott élekre**
> vonatkozik, nem csak a frontokra.
> **⭐ Felelősség:** a gér/szög **DÖNTÉS a műszaki tervezésé** (specifikáció — `part.miterShort/miterLong`),
> NEM az előkészítésé. A **gyártás-előkészítés** csak az **üzemi ráhagyás mértékét** állítja
> (mm/vágás, akár **0**) — célja, hogy a munkát az **üzem működésére szabja** és előállítsa a
> szükséges dokumentációt. (Ezért a Szabászat fülön a gér/szög nem kapcsoló, hanem ráhagyás-beállító.)

### 18.4 Formázó vágás (minden tábla) — **10–20 mm / 1–4 él**
Minden táblán alkalmazzák: **1–4 élből levágnak 10–20 mm-t** (a tábla szélének
tisztítása, derékszögbe hozása). **Tábla-szintű** veszteség (nem per-alkatrész).

### 18.5 Visszavágás (VV) — keskeny alkatrészek élzárása
Az **élzárónak van min. és max. mérete**; a **minimális szélesség ~50–80 mm** (ez alatt
nem tartja stabilan az anyagot). Ha az alkatrész **hosszú, de keskeny**, a szabászati
listában **2 db-ot 100–150 mm-re összeraknak**; a kivágott szélesség =
**A szél. + B szél. + fűrészlap-vastagság**. Élzárás után **visszavágják** (VV).
- **Etikett:** `VV` + visszavágandó méretek, pl. **`VV:750×50,750×60`** vagy
  **`VV:750×50 2db`**.
- **Rövid élek lezárása összerakással:** pl. **4× 120×80** → a listában összerakják,
  így a keletkező **4×80 + 3×5 mm** hosszú él **egyben lezárható**; visszavágás után a
  maradék (rövid) éleket zárják. (Két menet: hosszú élek → VV → rövid élek.)

### 18.6 Szállfutásos / minta-illesztett vágás — az optimalizálás NEM dönt
Mintás anyagnál (pl. **fiókos szekrény frontjai**) a mintának **folytatólagosnak** kell
lennie a fronton — akár **több szekrény frontjain át**. Ilyenkor az elemeket a **minta
szerint** kell a táblára helyezni; **NEM az optimalizálás dönt**, a jó **kihozatal NEM
cél**. (Külön kezelendő a nesting-optimalizálótól.)

### 18.7 Duplungolás / duplázás (vastagítás) — **+10–20 mm / méret**
Két (jellemzően **azonos vastagságú**) anyag összeragasztásával vastagabb anyagot
érnek el (duplázás, duplungolás). **Duplán vágják**, ragasztás után **visszavágják**
(egyenes él, ha elcsúsztak) → méretenként **+10–20 mm**. Akkor is, ha **furnérozáshoz**
vagy **melamin-gyanta dekorbevonathoz** szabnak. Visszavágás után élzárás.
(Vakmerők kihagyják a ráhagyást.)

### 18.8 Hasító (feszültség-oldó) vágás
Régebbi technika: a lapanyagban rejlő **feszültség** szabadjára engedése. Először az
egész táblát **csíkokra** hasítják (akkora csík, amiből az alkatrész kijön), a csík
szélességére **ráhagynak** az újravágáshoz. Elkerüli a **kardosodást** (a csík éle
minimálisan íves lesz).

### 18.9 Gép-korlátok
- **Szabászgép:** maximum anyagméretek (tábla-méret korlát).
- **Élzáró:** min. szélesség **50–80 mm**, és van max. méret is.

### 18.10 Szabászat MÓDJA: CNC maró vs. körfűrész — eltérő ráhagyás-igény
A szabászat történhet **CNC marógépen** (nesting) VAGY **körfűrészes** géppel
(táblafelosztó körfűrész / lapszabász / formatizáló). A kettő technológiailag eltér,
és **más ráhagyás-logikát** kíván:

| | **CNC maró (nesting)** | **Körfűrész (táblafelosztó / lapszabász / formatizáló)** |
|---|---|---|
| **Vágóeszköz** | egy **marókés** (átmérő ~**6–12 mm**, vastagabb, mint a körfűrészlap) | **körfűrészlap** (vékony, ~3–4 mm kerf) |
| **Vágás jellege** | **NEM kell végigvágni** az anyagot él-éltől; **nem kell csíkozni** | **végig-** és **átvágás**; jellemzően **csíkozás** (előbb csíkok, majd darabok) |
| **Forma** | **szabad formás** alkatrész: rombusz, **amorf**, ívelt kontúr — minimális a mozgásirány-korlát | csak **egyenes, derékszögű** vágások (téglalap) |
| **Csoportosítás** | az alkatrészek a táblán **szabadon csoportosíthatók** (nesting-optimalizálás) | a **csíkrend** köti (azonos szélességű/hosszúságú darabok egy csíkban) |
| **Befogás / ráhagyás** | egy befogással szabás (+furatolás) → **NINCS** per-alkatrész kontúr-ráhagyás | a 18.1–18.8 ráhagyások (élzáró-kompenzáció, formázó, VV, hasító, gérvágás) érvényesek |
| **CNC-kontúr ráhagyás** | csak a **külön CNC** esetén (a szabászat máshol történt, utána fogja be a CNC) → +1–2 mm | nem értelmezett |

> **Kulcs:** a **CNC marós nesting** a modern, ráhagyás-takarékos alapeset (szabad forma,
> szabad csoportosítás, egy befogás). A **körfűrészes** szabászat csíkrendű, egyenes
> vágású, és a 18.x ráhagyásokat igényli. A `Szabászat` fül **mód-váltója**
> (`nesting` / `cnc`) ezt a két technológiát modellezi: nesting = nincs kontúr-ráhagyás
> + szabad csoportosítás; körfűrész/külön CNC = ráhagyások + VV-összerakás.

### Implikáció a modellre
**Szabásméret = készméret + Σ ráhagyás:**
- élzáró-kompenzáció: **+0,5 mm / élzárt él** (rövid él → hossz, hosszú él → szél.),
- CNC-kontúr: **+1–2 mm** körben (csak külön CNC; **nesting = 0**),
- gérvágás: **+1–10 mm / GV-él** (opcionális, jelölve),
- duplungolás: **+10–20 mm / méret**,
- tábla-szintű **formázó vágás 10–20 mm / 1–4 él**.

**Jelölések** (etikett + szabászati lista): `VV:<méretek>`, `GV <nR nH>`, duplázás,
szállfutás. A **nesting** kiváltja a per-alkatrész CNC-ráhagyást. A keskeny
(< ~60 mm) élzárt alkatrész **VV-csoportba** kerül. Konfigurálható tényezők
(`WW_CUT_ALLOW`, `data-woodwork.js`).

---

## 19. Szerepkörök és felelősségek — Design / Műszaki tervezés / Gyártás-előkészítés

Forrás: gyakorlati input (2026-06). A bútor-előállítás **érték-/döntési lánca** három
egymásra épülő szerepen halad át, mielőtt a műhelybe ér. Tisztázza, **ki mit dönt el** —
ez vezérli, hogy egy adat (pl. gér vs. szögbe vágott él, anyag, csomópont) **hol**
keletkezik. (Kapcsolódik: §16 cím-hierarchia, §17 gyártásszervezés, a CLAUDE.md
értékláncai, és az USER_PROFILES felhasználó-típusai.)

### 19.1 Designer (Tervezés / Belsőépítészet világ)
- Eldönti, **mit kell tudnia** a bútornak és **hogyan nézzen ki**.
- A **megrendelő igényét** képviseli/fordítja le.
- **Falnézeteket, elrendezéseket** készít (lásd a Belsőépítészet → Bútorsor/Falnézet,
  és a Tervezés → Koncepciók).
> Kimenet: koncepció, látvány, elrendezés — a „mit és milyen élmény".

### 19.2 Műszaki tervezés (engineering) — a Design ÉS a gyártás közötti híd
- Meghatározza, **mit és nagyjából hogyan** kell gyártani, milyen **műszaki elvárásokkal**.
- A Design/belsőépítész tervek alapján eldönti, hogy az egyes **csomópontok és funkciók**
  hogyan legyenek kivitelezve a bútoron — **pl. gér vs. szögbe vágott él** (§18.3),
  kötéstípus, vasalat-koncepció.
- **Véglegesíti az anyaghasználatot** (a katalógusból — egy igazságforrás, CLAUDE.md).
- **Standardizál** a termékeken; **fejleszti a portfóliót** (sablonok/variánsok).
- **Megrajzolja a műszaki rajzokat**; **előkeresi és csatolja a sztenderdek aktuális
  modelljeit/rajzait**; **elkészíti az egyedi rajzokat**.
> Kimenet: műszaki rajz + specifikáció (méret, csomópont, anyag, vasalat, tűrés) — a
> „mit és műszakilag hogyan". A **gér/szög, anyag, csomópont DÖNTÉS itt születik**, nem
> az előkészítésben. A rendszerben ez a SPEC-réteg (`data-specs`, sablonok, stílus/műszaki),
> a Dokumentumtár (verziózott rajz), és a Törzsadat (cikkszám-standardizálás).
>
> **✅ ALKOTÓ felület (2026-06):** Tervezés → **Műszaki tervezés** (sablon-műhely) — a
> konfigurálható sablon itt SZÜLETIK (paraméterek + alkatrész-képletek + vasalat +
> constraints + gér/szög), életciklussal (`vazlat → ellenorzes → kiadott → archivalt`,
> verzió-léptetés kiadáskor, `design.engineer` jog). Csak a KIADOTT sablon kerül a
> feloldó-registry-be → csak azt látja a konfigurátor/ajánlat/gyártás-előkészítés.
> A standardizálás/portfólió-fejlesztés (sablon-revízió azonos id-n, gyári felülírása)
> és a tervezett munkaóra norma-alapú generálása (→ tény az Utókalkulációból) is itt él.
>
> **✅ CSATLAKOZÁS-KÉNYSZEREK (2026-06, Inventor-minta):** a csomópont-DÖNTÉS itt
> születik — a sablon `joints[]` köti össze, melyik alkatrész melyik **lapja/éle**
> csatlakozik a másikhoz. A lap-alkatrésznek 2 lapja (A/B) + 4 éle van; a kapcsolat-
> típus (**Él–Él / Él–Lap / Lap–Lap**) a két hivatkozásból SZÁRMAZIK, a **gér** az
> él–él variánsa. Minden csatlakozáshoz **megmunkálás** (köldökcsap, excenter, lamelló,
> dominó, horony, csavar, polcfurat) és **eltolás** rendelhető. Két automatikus
> következmény: a **gér-csatlakozás → GV-jelölés** a szabásjegyzékben (a meglévő
> §18.3 lánc), a **megmunkálás → per-alkatrész útvonal** bővülése (furat/marás a
> §11 technológiai sorrendben). Így a „mi csatlakozik mivel és hogyan" döntés
> végigfut a gyártás-előkészítésig — kézi újrarögzítés nélkül.

### 19.3 Gyártás-előkészítés (a mi fókuszunk) — az ÜZEMRE szabás
**Cél:** a (műszaki tervezéstől kapott) munkát az **adott üzem működésére szabni**, és
előállítani a szükséges **gyártási dokumentációt** (szabásjegyzék, anyag-/segédanyag-norma,
útvonal, etikett, kiadás). **NEM dönt** a gérről/anyagról/csomópontról — azt a műszaki
tervezés adja; az előkészítés a **hogyan valósítsuk meg EBBEN az üzemben** kérdést kezeli.

**Képesség-lista** (✅ megvan · 🔨 részben · ⏳ hiányzik):
1. **Paramétereket állítani** — ráhagyások, óradíjak, %-ok, szabászati mód az üzem szokása
   szerint (pl. gér-ráhagyás mm/vágás, akár 0). ✅ (`WW_CUT_ALLOW`, `WW_PRICE_PARAMS`,
   Szabászat/Kalkuláció fül)
2. **Gép-paraméterekre figyelni** — melyik gépnek mi a **min./max.** mérete (szabászgép max
   tábla; élzáró min. szélesség 50–80 mm; …) — a beállítások ezekhez igazodjanak. ✅
   A paraméter **gép-szintű, állandó** érték (beszerzéskor/tapasztalatból derül ki, nem
   munkánként változik) → a kanonikus szerkesztő-otthon a **Karbantartás → eszköz**
   (`asset.cutLimits`, `updateAsset`); a Gyártás-előkészítés Szabászat füle csak **olvassa**
   (`wwMachineLimit` az asszetből → VV-küszöb, `MÉRET!` túllépés). Fallback: `WW_MACHINE_LIMITS` törzs.
3. **Kiszervezést eldönteni** — mit, mikor adjon ki bérmunkába. ✅ (Bérmunka fül → B2BHandshake)
4. **Anyaghiányt jelezni**. ✅ (Anyag fül fedezet: Fedezve/Részben/Hiány)
5. **Folyamatokon változtatni**, ha el akarnak térni tőle. ✅ (Útvonal fül: állomás-ki/be +
   **sorrend-átrendezés** + **alternatív gép** — minden eltérés az **eltérés-naplóba** kerül,
   **indok kötelező** (különben a kiadás LEZÁRT); a napló a kiadással a feladatokra és az
   utókalkulációra is átkerül. Teljes folyamat-szerkesztő a Beállítások → Munkafolyamat.)
6. **Rajzokat kiegészíteni** részletekkel a jobb megértés céljából. ✅ (Dokumentum fül:
   csatol + verzió + **dokumentumonkénti annotáció** a kiadáshoz — a megjegyzés a
   műhely-feladatra kerül (`task.docNotes`), a Feladat-terminál a rajz-kártyán mutatja.
   Valódi rajz-SZERKESZTÉS/részletrajz továbbra is ⏳ — prototípusban nincs fájl.)
7. **Beállításokat menteni és behívni** — az üzemi beállításokat elmenteni és **másik
   projektben alkalmazni** (preset). ✅ (Szabászat fül „Üzemi beállítások" → Mentés/behívás;
   `jt_prep_presets` localStorage, projektfüggetlen — mód, gér-ráhagyás, szabász/élzáró gép)

> **Kulcs-elv (megerősítve §18.3-mal):** ami **TERV-döntés** (gér/szög, anyag, csomópont,
> tűrés) → a **műszaki tervezésé**; ami **ÜZEMI megvalósítás** (ráhagyás-mérték, gép-választás,
> nesting/körfűrész, VV-összerakás, kiszervezés, ütemezés) → a **gyártás-előkészítésé**.
> A gyártás-előkészítés a spec-et **fogyasztja**, nem írja felül.

### 19.4 A §19-lánc ZÁRÁSA a rendszerben (2026-06) — gér/szög a spec-ben + utókalkuláció
- **✅ Gér/szög él-jelölés a MŰSZAKI SPECIFIKÁCIÓBAN:** a Tervezés → Sablonok szerkesztő
  alkatrész-panelje („Él-kialakítás — gér / szögbe vágott él”) dönti el, melyik alkatrész
  hány rövid/hosszú éle gérelt (`sim.partMiters`, kulcs `tplId|partName` → `{short,long,note}`).
  A lánc: `setPartMiter` → `SpecEngine.resolveTemplate` ráteszi a feloldott alkatrészre →
  `MfgPrep.deriveItem` átfűzi a vágólistára → a Szabászat fül `wwCutSize`-a **automatikusan
  GV-jelöl** (ráhagyással vagy 0-val — az üzem döntése). GV chip a PartsTable-ben és az
  alkatrész-fában. Demó: T-01 felső lap (2R) + oldallapok (1R) — gérelt sarok-kötés.
- **✅ Minőség → Logisztika kézfogás:** MEGFELELT végellenőrzés → „Kiszállításra kész —
  fuvar létrehozása” CTA (`createDeliveryFromQa`, perm-mentes auto-belépő, duplikátum-véd) →
  delivery-fuvar a Logisztikában. A dokumentum-lánc (§15) Gyártás→Szállítólevél szakasza így
  a QA-kapun át záródik.
- **✅ Utókalkuláció (terv vs. tény, §14/§15 gap 5):** Kontrolling → Utókalkuláció —
  TERV = a kiadott útvonal órái + előkalkuláció (`MfgPrep.priceCalc`); TÉNY = a
  Feladat-terminál idő-naplója (`taskActualMinutes`) × óradíj. Állomásonkénti
  hatékonyság + bérköltség-eltérés + a kiadás folyamat-eltérései egy nézetben —
  „idővel ebből lesz pontosabb az ajánlat”.

---

## 20. Parametrikus tervező-architektúra (hibrid Inventor × Polyboard koncepció)

Forrás: felhasználói koncepció-dokumentum (2026-06). Egy **nyílt forráskódú, függőség-
mentes** parametrikus bútortervező elméleti váza: az Inventor **kényszer-alapú
szabadsága** + a Polyboard **korpusz/gyártás-orientált adatmélysége**. A felhasználó
**Excel-szerű táblázatot** lát; a háttérben **topológiai gráf + affin transzformációs
mátrixok** számolnak. A §19.2 (műszaki tervezés) csatlakozás-kényszer modell
(sablon `joints[]`, TPL_PART_REFS) MÉLYÍTÉSE — a meglévő 2 lap + 4 él topológia itt
kap formális koordináta-szemantikát.

### 20.1 Alkatrész-topológia + lokális koordináta-rendszer (LCS)
Minden laplemez önálló entitás SAJÁT lokális koordináta-rendszerrel (a CNC-megmunkálás
leírásához elengedhetetlen):
- **X = hosszúság** (a leghosszabb kiterjedés, **szálirány**); **Y = szélesség**;
  **Z = vastagság** (Z ≥ 0).
- **Lapok:** `Lap A` (felső, Z = vastagság) · `Lap B` (alsó, Z = 0).
- **Élek:** `Él 1` (első, Y = 0) · `Él 2` (hátsó, Y = szélesség) · `Él 3` (bal, X = 0) ·
  `Él 4` (jobb, X = hossz).
> Ez a TPL_PART_REFS (lap A/B + 4 él) kanonikus koordináta-megfeleltetése — a meglévő
> joints[] hivatkozások e konvencióra képezhetők le.

### 20.2 Kényszergráf (DAG) + affin transzformációk
A bútor **irányított aciklikus gráf**: csomópont = alkatrész (H/SZ/V paraméterekkel),
él = kapcsolat két alkatrész kijelölt topológiai elemei közt. NEM abszolút 3D koordináták:
- `M_glob,B = M_glob,A × T_kapcs` — a gyermek globális pozíciója a szülőéből + a
  **4×4 homogén transzformációs mátrixból** származik.
- A 3×3 `R` rész az orientáció (csak **90°-os elforgatások** — pl. oldallap áll,
  tetőlap fekszik); `Tx/Ty/Tz` az **eltolás (offset)** a kényszerített síkok/élek közt.
- Paraméter-változáskor (pl. magasság átírása a táblázatban) a mátrixok és kényszerek
  **újraszámolódnak** — minden származtatott pozíció követi.

### 20.3 Megmunkálások csatolása a kapcsolatokhoz (CNC-integráció)
A fúrás/tipli/csap/marás NEM globális térben, hanem a **kapcsolaton (joint)** definiált:
- A kapcsolat topológiai párosából (pl. Él 3 ↔ Lap A) a rendszer FELISMERI a
  csomópont-jelleget („sarokkapcsolat") — vö. meglévő `jointKind` származtatás.
- A kapcsolathoz **séma** rendelhető (pl. **8-as tipli 32 mm-es osztással**) — a szoftver
  MINDKÉT alkatrész saját LCS-ében kiszámolja a megmunkálási koordinátákat
  (pl. A oldallap Lap A: X:50, Y:280, Z-be fúr ↔ B tetőlap Él 3: Y:280, Z:9, X-be fúr).
- Méret-változásnál a furatok **automatikusan eltolódnak**, a szél-távolságok megőrződnek.
> A meglévő `TPL_MACHINING` (köldökcsap/excenter/lamelló/…) ennek a sémának a katalógusa;
> a hiányzó réteg a **per-joint koordináta-generálás** (osztás, szél-távolság szabályok).

### 20.4 Megjelenítés / UX rétegzés
A felhasználót NEM CAD-felület fogadja, hanem rétegek:
1. **Excel-szerű adatrács** — paraméterek (szélesség/magasság/mélység…).
2. **2D parametrikus SVG nézetek** — elölnézet (XY), felülnézet (XZ), oldalnézet (YZ);
   React-state-ből deklaratívan renderelt `<rect>/<line>/<circle>`; az élre/lapra
   kattintva ott állítható a kényszer/offset.
3. **Rejtett 3D modul** — az adatszerkezet (4×4 mátrixok) már 3D-kész; Three.js/R3F
   később belső nézetként, majd prémiumként (fotorealisztikus render, ügyfél-mód).

### 20.5 Függőségmentes megvalósítás + open-core ütemterv
Nehéz CAD-mag NEM kell: a lapok téglatestek/egyszerű sokszögek, a megmunkálás pontszerű
(fúrás) vagy egyenes vonalú (nút/falc) → **elég a lineáris algebra** (frontend: minimális
saját 4×4 mátrixszorzó vagy `gl-matrix`; backend: `System.Numerics.Matrix4x4`).
- **Open source mag:** táblázatos bemenet · 2D parametrikus SVG · alap fakötések
  (tipli/csavar) · **DXF CNC-export** (vonalas modell).
- **Prémium:** 3D interaktív/robbantott nézet · gyártó-specifikus posztprocesszorok
  (Homag WoodWOP `.mpr`, Biesse `.bpp`, g-kód) · felhő-nesting.

### Implikáció a JoineryTech-re
A §19.2 sablon-műhely (joints[] + TPL_MACHINING) a 20.1–20.3 modell ELSŐ lépcsője.
**✅ MEGVALÓSÍTVA (2026-06, `param-geometry.js` + `page-param-views.jsx`):**
(1) a joints[] hivatkozások LCS-szemantikája (20.1, `PG_REFS` keretek) →
(2) kényszer-alapú pozíció-levezetés affin mátrixokkal (20.2, `ParamGeo.solve`,
joint-állapot: megoldott/felfekszik/eltér; új joint-mezők: `offsetV`, `flip`) →
(3) per-joint furat-koordináta generálás sémából (20.3, 32 mm-rendszer, a furatkép
MINDKÉT alkatrész saját LCS-ében) → (4) parametrikus 2D SVG nézetek a sablon-
szerkesztőben (20.4, elöl/felül/oldal + kattintható élek/lapok + élő próba-paraméterek).
A DXF/posztprocesszor-export a prototípus határán túl van (jegyezve mint irány).

---

## 21. Skeleton (vázszerkezet) tervezési minta + kötés-alapú kényszerezés

Forrás: felhasználói koncepció-dokumentum + DÖNTÉS (2026-06). A §20 part→part
kényszergráf TOVÁBBFEJLESZTÉSE: az összeállítás nem alkatrész-alkatrész
rögzítésekre, hanem közös, absztrakt **referenciasík-rendszerre (vázra)** épül —
így a körkörös hivatkozás kizárt, a kiértékelés lineáris.

### 21.1 GCS + fő síkok
Globális rendszer: **X = szélesség (W) · Y = mélység (D, befelé) · Z = magasság (H)**;
az elölnézet a kiindulópont. 6 fő határoló sík az origóból + a befoglalóból:
`bal X=0 · jobb X=W · alsó Z=0 · tető Z=H · elülső Y=0 · hátsó Y=D`.
**Belső síkok** képlettel származtatva: polc-sík `Z = H/2`, osztó `X = W/2`,
hátfal-nút `Y = D − 20` — a síkok a paraméterek függvényei.

### 21.2 Binding-modell (6 határoló kényszer / lap)
Minden laplemez kiterjedését 6 kényszer adja: a lap mindkét irányú min/max
határa egy-egy síkhoz kötve, offsettel (`align_X_min: {plane, offset}` …).
- **Méret SZÁRMAZTATOTT:** `méret = sík_max − sík_min − offsetek` — ha H-t
  720→900-ra írják, az oldallap automatikusan megnyúlik.
- **Pozíció:** az M mátrix eltolása a lokális origó globál-koordinátája; az
  orientáció előre definiált 90°-os forgatás-konstansok (álló/fekvő lap).
- JSON-séma: `skeleton.parameters {W,H,D,V_anyag}` + `planes[{id,axis,formula}]`
  + `parts[{id, material_thickness, constraints{align_*}}]` — megjelenítéstől
  független adat. 2D vetítés triviális (elölnézet = Y elhagyása); a CNC-furat
  a síkokhoz relatív marad.

### 21.3 ⭐ DÖNTÉS — kényszerezés a KÖTÉSEKEN át (a felhasználó elve)
A valóságban NEM a két felület viszonya tartja össze a bútort, hanem a
**kötés** (ragasztás, tipli, csavar, excenter). Ezért az ideális modell a
**kötő-/csatlakozó-elemhez való kényszerezés**: az alkatrész a kötés-objektumhoz
kötődik, nem közvetlenül a másik alkatrész felületéhez. Ez **kikényszeríti a
technológia meghatározását** — nem jöhet létre kapcsolat kötés-típus nélkül,
ami a további (adat-alapú) feldolgozást táplálja.
- **Háromrétegű hierarchia:** `váz (síkok = GEOMETRIA) → kötés-objektum
  (síkra/élre pozicionálva = TECHNOLÓGIA) → alkatrész (a síkokhoz méretezve,
  a kötésekhez rögzítve)`.
- **Kivétel — anyagban kialakított kötések:** csapozásnál maradhat a felületi
  kényszer, de vasalat NÉLKÜL is **kötelező a választás**: `csapozás | gér |
  ragasztás` — deklarálatlan érintkezés nem megengedett.
- **Validációs szabály:** két érintkező lap deklarált kötés nélkül = hiba
  („kényszerezetlen érintkezés") — a teljes kényszerezettség elve.
- A §20 réteg (LCS, furatkép mindkét LCS-ben, 32 mm-séma) VÁLTOZATLANUL a
  kötés-objektumból generál — a skeleton csak a felfűzést cseréli le.

### 21.5 Váz-sablonok (skeleton-presetek) — a síkrendszer mint újrahasználható réteg
A síkrendszer TERMÉKTÍPUS-FÜGGŐ: más elnevezésű/szerepű síkok kellenek egy
**ajtóhoz** (front), egy **korpuszhoz**, egy **sarokszekrényhez** (L-alak,
8 sík). Ezért a váz külön, újrahasználható SABLONKÉNT él:
- **Egyszer kell megadni** a síkrendszert (mint réteget) — utána már csak a
  **befoglaló paraméterek** (szélesség/magasság/mélység) változnak; minden
  sík képlete ezekből származik.
- **Természetes szerkesztés:** az asztalos a jobb oldalt a JOBB SÍKHOZ, a balt
  a BAL SÍKHOZ rendeli — nem „mérnöki", de ez az emberi modell; a síkok
  elnevezése ezt szolgálja (Bal oldal, Tető, Hátsó…). Korpusznál a 6 fő sík
  (befoglaló) a vezérlő.
- A váz-sablon = `{params (befoglaló méretek), planes (képletes síkok)}`;
  bútor-sablonra alkalmazva a paraméterek a sablon változói közé kerülnek,
  a síkok a vázába. Meglévő sablon vázából is menthető új váz-sablon.

### 21.4 ✅ MEGVALÓSÍTVA (2026-06, `skeleton-engine.js` + `page-skeleton.jsx`)
A T-10 demó-sablon skeleton-modellre állt át: képletes sík-szerkesztő · kötés-
objektumok a síkokon normál-iránnyal (egy sík **kétféleképpen** csatlakozhat —
`side: +n/−n`) · 6-kényszeres binding-szerkesztő · „kényszerezetlen érintkezés"
+ ütközés validáció (a kiadást is zárja) · síkok a 2D nézeteken (kattinthatók).
Kulcs-felismerés: a **gér sarok-kötés él–él TÉRFOGATI átfedés** (sarok-doboz) —
a kontakt-detektor külön ismeri fel a felület- és sarok-érintkezést; a gérnél
a felső lap TELJES szélességű (a korábbi inset+gér szakmailag pontatlan volt).
A méret-képletek és a legacy joints[] a vázból SZÁRMAZNAK — a teljes
dokumentum-lánc (szabásjegyzék, GV, útvonal) változatlanul működik tovább.

### 21.5 Váz-sablonok (skeleton-presetek) — a váz mint újrahasznosítható réteg ✅
Felhasználói igény (2026-06): a sík-készlet maga is SABLON. Más elnevezésű
síkok kellenek egy ajtóhoz, egy korpuszhoz, egy sarokszekrényhez — ezeket
külön el lehet menteni és új sablonnál egy mozdulattal alkalmazni.
- **Természetes szerkesztés:** az ember a jobb oldalt a JOBB síkhoz, a balt a
  BAL síkhoz rendeli — nem a „legmérnökibb", de ez a természetes észjárás;
  a sík-nevek ezt szolgálják (bal/jobb/alsó/tető/elülső/hátsó).
- **Korpusz-elv:** a 6 fő sík = a befoglaló méretek (szélesség/magasság/
  mélység), és EZ vezérel. Egyszer kell megadni mint réteget, utána már csak
  paraméterként változik (W/H/D átírása mozgatja az egész vázat).
- Gyári készletek: **Korpusz** (6 fő sík, W/H/D) · **Front/ajtó** (bal/jobb/
  alsó/felső él-síkok + külső/belső felület-sík, vastagság-paraméterrel) ·
  **Sarokszekrény** (6 fő sík + 2 belső sarok-sík a két szár mélységével).
- Bármely kidolgozott váz elmenthető saját váz-sablonként (név + leírás), és
  a műhely más sablonjaira alkalmazható.

---

## Források
Tankönyv: „Faipar műszaki dokumentáció" (tömörfa és korpuszbútor), 1–4. fejezet +
irodalomjegyzék (Lugosi: Faipari kézikönyv; Heidsieck: Fachkenntnisse Holztechnik;
Holztechnik Tabellenbuch; Soponyai: Faipari gyártásszervezés).
Referencia-ábrák a `woodwork/` mappában:
- `fig-1.13-gyartasdokumentacio-reszei.jpg` — a 10 rész + vizsga-tartalom (1.1. tábl.).
- `fig-2.1-ketfiokos-asztal-jellegrajz.jpg` — jellegrajz (metszetek + befoglaló).
- `fig-2.5-alkatreszjegyzek.jpg` — alkatrészjegyzék (20 sor + összesítés).
- `fig-2.7-szabasjegyzek.jpg` — szabásjegyzék (ráhagyásokkal).
- `fig-2.1-hulladekszazalek-tabla.jpg` — hulladékszázalék-értékek (2.1. táblázat).
- `fig-2.9-alapanyagnorma.jpg` — alapanyagnorma (szükséges + hulladék).
- `fig-2.11-segedanyagnorma.jpg` — ragasztó/felület/csiszoló norma.
- `fig-2.13-szerelvenyjegyzek.jpg` — kötőelem/vasalat jegyzék.
- `fig-2.15-utemterv.jpg` — ütemterv (8 foglalkozás).
- `fig-2.16a/b-reszletes-muveletterv.jpg` — fiókhát részletes műveletterve.
- `fig-2.18-vonalas-folyamatabra.jpg` — per-alkatrész × per-művelet útvonal-mátrix.
- `fig-2.20-egyszerusitett-arkalkulacio.jpg` / `fig-2.21-osszetett-arkalkulacio.jpg`.
- `fig-3.3-korpusz-alkatreszjegyzek.jpg` — éjjeliszekrény (lap) összevont alkatrész+szabásjegyzék, élzárás-jelölésekkel.
- `fig-3.8-korpusz-vonalas-folyamatabra.jpg` — **lapbútor 9-műveletes** folyamatábra (a tömörfa 22 ellenpárja).
- `fig-4.1-arajanlat-minta.jpg` · `fig-4.2-szerzodes-minta.jpg` · `fig-4.3-szallitolevel-minta.jpg` · `fig-4.4-szamla-minta.jpg` — kereskedelmi bizonylat-minták.
- `gyartasszervezes-borito.jpg` · `gyartasszervezes-tartalom-1..3.jpg` — Soponyai Éva: *Faipari gyártásszervezés* (Skandi-Wald, 4. kiadás) borító + teljes tartalomjegyzék (a 17. szakasz forrása). A többi oldal igény szerint kötegben kiolvasható.
