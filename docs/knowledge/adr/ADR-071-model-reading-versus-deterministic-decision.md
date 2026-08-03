# ADR-071: A modell határa a dokumentum-befogadásban — olvasás vs. döntés

- **Státusz:** **A DÖNTÉS ELFOGADVA (Gábor, 2026-07-30)** — ez az ADR a már
  meghozott döntést **írásba foglalja** és **mérésre köti**, nem újranyitja.
  ⚠ **Maga az ADR `review_requested`**: az elfogadást a sziget konvenciója
  szerint a root-review állítja, nem a végrehajtó.
- **Felvetette:** EPIC-DOC-CAPTURE-2026Q3 **G2** kapu. A kapu szövege az epicben
  kimondottan ADR-t kért: *„fél év múlva valaki meg fogja kérdezni, miért nem
  tippel a modell cikkszámot, és a válasznak írásban kell lennie."*
- **Szerep:** doccapture
- **Kötelező input (mind ellenőrizve):**
  - `spaceos-doccapture-engine/docs/PRINCIPLES.md` — a 15 elv és a kapu-megfeleltetés
  - `docs/tasks/EPIC-DOC-CAPTURE-2026Q3/README.md` §G1, §G2, §G4 (az eldőlt kapuk)
  - **ADR-067** (modul-katalógus): `spaceos.*` = iparág-agnosztikus, `joinerytech.*`
    = iparági — a határ **repó-szinten** is látszik
  - **ADR-070** (a scheduling külső függőségei) — három precedens, amit ez az ADR
    átvesz: **D2** a könyvtár típusai soha nem jelennek meg a kontraktusban ·
    **D3** a nem-determinisztikus külső motort kimondottan kezelni kell ·
    **D4** supply-chain rögzítés
  - `spaceos-doccapture-engine/docs/DESIGN-DC-02-capture-kontraktus.md` — a publikált
    szerződés és a hash-pin

---

## Kontextus

A dokumentum-befogadó termék két, **élesen különböző** dolgot tesz:

1. megállapítja, **mi van a papíron** (szöveg, számok, mezők) — ez felismerési és
   olvasási feladat, ahol a modell valóban segít;
2. eldönti, **mi kerüljön a fogadó rendszerbe** (cikkszám-párosítás,
   mennyiség-átváltás, könyvelési besorolás, jóváhagyás).

A kettő összemosása **nem stílus-kérdés, hanem auditálhatósági**. A forrás-
prototípus (`Bevetelezes`) élesben azért használható ma, mert a **könyvelési úton
nulla modell-hívás van** — mérve. Ha egy modell tippelne cikkszámot, a könyvelés
minden sora megmagyarázhatatlan lenne visszamenőleg.

**Miért kell ez ADR-be, és miért most:** a döntés Gáboré, és 2026-07-30-án meg is
hozta. De egy kimondott elv, amit **semmi nem őriz**, hat hónap alatt elhalványul —
és a legkényelmesebb következő lépés mindig az, hogy „csak ezt az egy mezőt hagyjuk
a modellre". Ez az ADR ezért nem elvet ír le, hanem **határt jelöl ki, és megnevezi
a kapukat, amik őrzik**.

---

## D1 — A határ: a modell az OLVASÁSHOZ, determinisztikus szabály a DÖNTÉSHEZ

**Döntés:** a modell (felismerés, vizuális segéd, kézírás-átirat) **kizárólag** az
„mi van a papíron" kérdésre használható. Az „mi kerüljön a rendszerbe" kérdésre
**soha**: ott determinisztikus szabály + megfeleltetési tábla + ember dönt.

| Kérdés | Ki válaszol | Auditálható? |
|---|---|---|
| Milyen karakterek vannak ezen a képen? | felismerő (részben modell) | a kimenet **megbízhatósági szinttel** és **bizonyítékkal** jön |
| Mi ez az irat? | **horgony-bizonyíték**, nem osztályozó | igen: a megtalált horgonyok darabszáma |
| Stimmel-e önmagában az irat? | **determinisztikus számtan** (M3) | igen: melyik egyenlőség bomlott el |
| Melyik belső cikkszám tartozik ehhez a sorhoz? | **megfeleltetési tábla + ember** | igen: a tábla egy sora |
| Mennyi kerüljön könyvelésre? | **szabály + ember** | igen |

**Termékként ez eladási érv, nem korlát:** a vevő könyvelése auditálható marad. Egy
modell-tipp nem védhető meg egy adóellenőrzésen; egy megfeleltetési tábla sora igen.

## D2 — A határ MÉRVE van, nem kimondva

Ez a döntés lényegi része. Egy ADR, ami csak elvet állít, dokumentáció; ami
kapukat nevez meg, szabály.

| Kapu | Mit mér | Hol |
|---|---|---|
| **nincs számla-specifikus típus a magban** | a döntési oldal nem szivárog be az olvasó rétegbe | `engine tests/test_ports.py::GateTests` |
| **nincs számla-specifikus use-case** | ugyanaz, a fázis-rétegre | `engine tests/test_load_tabular.py` |
| **a rekord nem tartalmaz párosítást/átváltást** | az olvasás kimenete nem „dönt" | `engine tests/test_analyze_document.py` |
| **a felismerés holtversenynél nem dönt** | a téves irat-típus az egész elemzést elrontaná | `engine tests/test_document_detect.py` |
| **a kétértelmű érték HIÁNY, nem tipp** | „inkább hiány, mint téves" | `engine tests/test_tabular_values.py` |
| **a származtatott érték soha nem `CONFIRMED`** | a számított érték nem látszhat leolvasottnak | `engine tests/test_document_consistency.py` |
| **ismeretlen megbízhatóság nem automatikusan használható** | fail-closed a fogyasztó oldalán | `modul ForwardCompatibilityTests` |
| **G4-kapu: külső feldolgozás fail-closed** | a forrás nem hagyhatja el a telepítést engedély nélkül | `engine tests/test_config.py` |

**Mind a nyolc mutációval igazolva** — vagyis szándékos elrontásra pirosra váltanak.
A nyolc a teljes mutáció-készlet része, és a készlet **reprodukálható**:

```
motor : python tools/mutation_check.py                        -> 16/16 harap
modul : python <motor>/tools/mutation_check.py --root . \
            --config tools/mutations.json                     -> 7/7 harap
                                                            osszesen: 23/23
```

⚠ **Az eszköznek EGY implementációja van** (a motor repójában), a futtatót a
`mutations.json` `runner` szakasza adja — így a .NET oldal `dotnet test`-tel megy
ugyanazzal a mechanizmussal. Két másolat két igazság lenne ugyanarról, ugyanaz az
elv, mint a semlegességi kapunál.

⚠ **Amit a 23 mutáció NEM fed, a `not_covered` szakaszok nevesítik** — a mutáció az
**érzékenységet** bizonyítja (a kapu fog azon, amit *megnéz*), nem a lefedettséget.

⚠ **Amit ezek NEM mérnek — kimondva:** azt, hogy a **jóváhagyási hurokban** (DC-04)
nem lesz modell-hívás. Az a réteg még nincs megírva, tehát erre ma **nincs kapu**.
Ez az ADR ezért a DC-04 elfogadási kritériumába **beírja**: a könyvelési úton mért
**nulla** modell-hívás.

## D3 — Determinizmus: a nem-determinisztikus olvasás nem szivároghat a döntésbe

Az ADR-070 D3 precedense szerint egy nem-determinisztikus külső motort **kimondottan
kezelni kell**, nem elhallgatni. A felismerőkre ez ugyanúgy áll: szálas/GPU-s
futásnál ugyanaz a kép **eltérő** kimenetet adhat.

**Döntés — a determinizmus a DÖNTÉSI oldalon kötelező, az olvasási oldalon nem:**

- az **olvasás** kimenete **adat megbízhatósággal**; ha nem determinisztikus, az a
  megbízhatóságban és a bizonyítékban jelenik meg, nem rejtve;
- a **döntés** (párosítás, átváltás, számtan) **azonos bemenetre azonos kimenetet**
  ad — ez ma triviálisan teljesül, mert azon az úton **nulla** modell-hívás van, és
  a számtan zárt művelet-készlettel megy (`Operation`), nem kifejezés-nyelvvel;
- **aktív tartalmat nem futtatunk** (M11): egy futtatott képlet ma és holnap mást
  adhat. Ezt injektált, szándékosan hibás gyorsítótár-értékkel bizonyítottuk.

⚠ **Következmény a DC-01-re:** ha egy felismerő-adapter nem determinisztikus,
az adapter **konfigurációjában kimondva** kell rögzíteni (mag-szám, szál-szám,
seed), az ADR-070 D3 mintájára — és a szeletnek **meg kell mérnie**, nem
feltételeznie.

## D4 — A határ fizikai alakja: repó-szinten látszik

Az ADR-067 szerint `spaceos.*` = iparág-agnosztikus, `joinerytech.*` = iparági.
A modell-határ **egybeesik** ezzel a szétválasztással, és ez nem véletlen:

| Repó | Mit tesz | Mehet-e modell? |
|---|---|---|
| `spaceos-doccapture-engine` | **olvas**: szöveg, mezők, önellenőrző számtan | igen — a G4 szerint helyi alap, külső kimondott engedéllyel |
| `spaceos-modules-doccapture` | **befogad és tárol** jogosultsággal | nem — nincs értelmezési feladata |
| `joinerytech-goods-receipt` | **dönt**: párosítás, átváltás, jóváhagyás | **nem, soha** |

**A G1-döntés ennek a következménye, nem külön szabály:** a számla-értelmezés
gazdája a bevételezési repó, tehát a motorban nincs számla-port. Ha valaki oda
bemásolná, egyszerre sértené a G1-et és ezt az ADR-t — és a kapu mindkettőt fogja.

## D5 — A szerződés nem árulja el, mi van mögötte (ADR-070 D2 átvéve)

A publikált Capture-szerződésben **nincs** könyvtár-név, belső típusnév és
abszolút útvonal; a dátum ISO-8601 sztringként utazik. Ez az ADR-070 D2 elvének
átvétele: **a platform-oldali könyvtár-választás nem kerül a wire-ra.**

Miért ide tartozik: ha a szerződésből kiderülne, melyik felismerő van mögötte, a
motor **cserélhetetlen** lenne — és a modell-határ épp attól tartható, hogy a
modellt használó rész **kicserélhető**, a döntési rész pedig nem.

**Mérve:** `engine tests/test_contract.py::WireDisciplineTests` — a wire nem
tartalmaz belső típusnevet és abszolút utat, és ez mutációval igazolt.

---

## Következmények

1. **A DC-04 (bevételezés) elfogadási kritériuma bővül:** a könyvelési úton
   **mért nulla** modell-hívás, és a jóváhagyás lépésszáma a mai Excel-úthoz
   képest **kimondott szám** (a G3-döntés kikötése).
2. **A DC-01/DC-05 adaptereinek** meg kell hívniuk a G4-kaput
   (`assert_external_processing_allowed`), ha a forrást kiengedik a telepítésből;
   és a determinizmus-beállításokat (D3) configban kell rögzíteniük.
3. **Új modell-használat** ebben a termékben ADR-módosítást igényel, nem
   implementációs döntést. A „csak ezt az egy mezőt" a leggyakoribb erózió-út.
4. **A supply-chain rögzítés (ADR-070 D4) hiányzik a Python motorban** — ma nincs
   committolt lockfile. Ez nyitott tétel, ld. lent.

## Nyitott kérdések (root/Gábor)

- **Q1 — Supply-chain rögzítés a Python oldalon.** Az ADR-070 D4 committolt
  lockfile-t ír elő a .NET csomagokra. A motorban ma **nincs** lockfile
  (`pyproject.toml` + opcionális extra). Kell-e `requirements.lock` / hash-pinnelt
  telepítés, és a CI-nak azt kell-e használnia? *(Javaslatom: igen, de a DC-01
  függőség-döntése után, hogy ne kelljen kétszer csinálni.)*
- **Q2 — A dependency-licencek manifest-szakasza.** Az ADR-070 §D1 szerint a
  licencet „a manifest `licenses` szakaszában feltüntetendő" (ADR-067). A
  doccapture-repókban ma **nincs** ilyen manifest. Kell-e, és melyik repóban?
- **Q3 — Mikor lesz kapu a DC-04 nulla-modell-hívására?** Ma nincs, mert a réteg
  nincs megírva. A kritérium beírva, a kapu még nem.

## Kapcsolódó

- **ADR-067** — modul-katalógus és életciklus (`spaceos.*` vs. `joinerytech.*`)
- **ADR-070** — a scheduling külső függőségei (D2 wire-fegyelem, D3 determinizmus,
  D4 supply-chain — mindhárom precedens itt átvéve)
- `EPIC-DOC-CAPTURE-2026Q3/README.md` — G1..G5, és a DC-00/01b/02/06 kivitelezés
- `spaceos-doccapture-engine/docs/PRINCIPLES.md` — a 15 elv és a kapu-megfeleltetés

---

## ⚠ Amit ez az ADR NEM dönt el

1. **Nem dönt arról, MELYIK modellt/felismerőt használjuk.** Az a DC-01 tárgya, és
   licenc-, determinizmus- és telepítési-teher kérdés.
2. **Nem dönt a telepítési alakról** — az a G4, és az eldőlt (helyi alap, külső
   opcionális).
3. **Nem tiltja a modellt a felismerésben.** Épp ellenkezőleg: ott a helye. A
   tiltás **kizárólag** a döntési útra vonatkozik.
4. **Nem mondja meg, mi a „döntés" pontos határa egy határesetben.** Példa, amit
   szándékosan nyitva hagyunk: ha egy modell a *mértékegységet* olvassa le a
   papírról, az olvasás — de ha a mértékegységet *kikövetkezteti* a
   nagyságrendből, az már döntés. A szabály: **ha az érték nem áll a papíron,
   modell nem állíthatja elő.**
