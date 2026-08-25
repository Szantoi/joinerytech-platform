# DOC-CAPTURE Terminal State

> **Létrehozva:** 2026-07-29 este Europe/Budapest (root)
> **Frissítve:** 2026-08-05 este (DC-01b-write + DC-03a `review_requested`, **mindkettő commitolatlan**)
> **Epic:** [`docs/tasks/EPIC-DOC-CAPTURE-2026Q3/README.md`](../../docs/tasks/EPIC-DOC-CAPTURE-2026Q3/README.md)
> **Állapot:** **DC-00 · DC-EXCEL · DC-06 · DC-02 · DC-01a kész és COMMITOLVA**
> (utolsó commit `dda051b`) · **mind az öt G-kapu eldőlt** · **Doorstar faipari
> RAG 1. fázis APPROVED** (35 → 1998 dok)
>
> ⚠ **KÉT SZELET ÜL A FÁN COMMITOLATLANUL:** `DC-01b-write` (kereshető PDF
> írása, outbox `2026-08-04_002`) és `DC-03a` (darabolás + bizonyíték-lánc,
> outbox `2026-08-05_001`). A hatókörük **átfed** négy fájlon — egyik jelentés
> sem váltja ki a másikat, a fa a két lista **uniója** (mérve `git status`-szal).
>
> ⚠ **A DC-03 CÉLPONTJA MÉRVE nem befogadó felület** (101 MCP-eszközből 0 fogad
> tartalmat; az „indexelj" útvonal a kérés-törzset figyelmen kívül hagyja) →
> a **DC-03b BLOKKOLT**, root-döntésre vár.
>
> ⚠ **A CI-t 2026-07-31-ig két napig senki nem nézte meg — hat okból volt piros.**
> Mostantól: push után **futást** nézni, nem YAML-t olvasni. **A 2026-08-04-i új
> CI-lépés (második olvasó) élesben MÉG NEM FUTOTT.**

## Miért létezik ez a terminál

Gábor döntése (2026-07-29): a két meglévő OCR-projekt képességeit **javított
formában**, **több külön repóban**, **termékként szolgáltathatóan** kell behozni
a JoineryTech szolgáltatásai közé — és a termék **cégek integrálását** segítse:
PDF, Excel, papír és kézírás.

## A G-kapuk — MIND ELDŐLT (Gábor, 2026-07-30, közvetlenül)

| Kapu | Döntés | Hol áll a kódban |
|---|---|---|
| **G1** | **a bevételezés a gazda** | a motorban nincs számla-port; a kapu **véglegesen** marad |
| **G2** | LLM az olvasáshoz, szabály a könyveléshez | **ADR-jelölt marad** — még nincs megírva |
| **G3** | **portál-UI azonnal** ⚠ | szembemegy a saját javaslatunkkal — ld. lent |
| **G4** | **helyi alap, külső opcionális** | `allow_external_processing=False` + kötelező indok, fail-closed |
| **G5** | **MIT** | `LICENSE` mind a 3 repóban + csomag-metaadat |

⚠ **A G3-at ki kell mondani.** Az epic és a terminál `CLAUDE.md`-je azt írta:
*„ha a rutint egy szép UI kedvéért felborítjuk, a bevezetés meg fog állni az
első ügyfélnél."* Gábor a kockázat ismeretében a portál-UI-t választotta (a
kockázat ott volt az opció szövegében). **Elfogadva** — de a DC-04 tervébe
bekerült három kikötés: a **mechanika** nem cserélhető (javaslat → egy
mozdulattal jóváhagyás → a tábla nő), a jóváhagyó felület a **forrás-igazság**
(M9), és a lépésszámot a mai Excel-úthoz képest **meg kell mérni**, nem érezni.

⚠ **A terminál `CLAUDE.md`-je ezen a ponton elavult** (3. szabály: „a jóváhagyási
hurok a termék magja — ne borítsuk fel egy szép UI kedvéért"). Nem nyúltam
hozzá: normatív utasítás, a módosítása Gábor/root döntése.

## Ami 2026-07-30 délelőtt megtörtént

**DC-01b (táblázatos betöltő) kész**, a `spaceos-doccapture-engine` repóban —
a `TabularReader` port első két adaptere és a mögötte lévő domain-logika.

```
Teljes suite            : 154 zold, 0 bukas   (DC-00 utan 29 volt)
Fuggoseg NELKUL (mert)  : 141 zold, 0 bukas, 0 KIHAGYVA + negativ kontroll
Munkafuzet-tesztek      : 13   (141 + 13 = 154)
Semlegessegi kapu       : TISZTA
Mutacio                 : 6/6 uj kapu bizonyitottan HARAP
CI YAML                 : parse OK, 8 lepes
README pelda            : lefuttatva, a dokumentalt kimenetet adja
```

**A G4/G1/G5 döntés nem csak dokumentum lett, hanem kód:**
`allow_external_processing` fail-closed kapu kötelező indokkal · a G1-kapu
docstringje a döntést rögzíti, a teszt véglegessé vált · `LICENSE` (MIT) mind a
három repóban, és a **csomag-metaadatban is** — egy `LICENSE` fájl a repóban nem
jut el a fogyasztóhoz.

### Négy hiba, amit a saját kapuk és tesztek találtak

1. **A `csv.Sniffer` nem bukik el, hanem TIPPEL** — a szóközt választotta
   elválasztónak, és a fejléc szavakra esett szét. A hiba nem a kódban volt,
   hanem abban, amit a **mérőeszközről feltettem**. Kivezetve, determinisztikus
   fejléc-alapú szabályra cserélve.
2. **A tudományos-alak detektorom vak volt a 2⁵³…1e16 sávra** — ott a számjegyek
   már elvesztek, de az `e`-vizsgálat nem fogott.
3. **A sor-üresség szabálya elnyelte a saját jelzésemet** — a gyorsítótár nélküli
   képlet az azonosító oszlopban **csendben kiütötte az egész sort**. A javítás
   fogalmi: az üresség a *bemenet* tulajdonsága, nem az értelmezés eredménye.
4. **A semlegességi kapu a saját tervdokumentumomban talált szivárgást** — szó
   szerint bemásolt prototípus-kódban benne volt a cél-rendszer neve.

### Egy besorolási hibám javítva

A DC-01b korábban „**G4-re vár**" címkét kapott — én mondtam, a root elfogadta.
**Pontatlan volt:** a szeletben nulla modell-hívás van, tehát a G4 válasza a
kódját nem változtathatta meg. A jelzés megvolt, a **súlyozása** volt rossz —
ugyanaz az alakja, mint a 07-29-i token-leletnél.

## Amit NEM mértem — kimondva

1. **Valódi ügyfél-fájlon nem futott** semmi; minden teszt-táblázat szintetikus.
2. **Összevont cella kezelése nincs, és nem is jelezzük** — ismert rés.
3. **A makró-mentesség csak részben bizonyított:** valódi makró-projektet nem
   tudunk előállítani. Amit bizonyítottunk: hibás gyorsítótár-érték injektálva
   (`=1+1` → tárolt `99`) → az adapter **99-et ad**, tehát képletet nem értékel ki.
4. **A CI soha nem futott GitHub Actionsön** (DC-00-ból örökölt tétel).
5. **Nagy fájl teljesítménye nincs mérve**; a kétszeri megnyitás duplázza a memóriát.
6. **A `.NET` oldal érintetlen** — `dotnet build` ma sem futott.

## Ami 2026-07-30 délután megtörtént — DC-06 (irat-típus szerinti elemzés)

Gábor kérése: *„Az elveket mindenképp emeld át… a cél, hogy a gyártás során
keletkező munkalapokat és a számlákat, más iratokat meglegyen a specifikus
elemzése."*

**A központi tervezési döntés: KÉT FÜGGETLEN TENGELY.** Az `InputKind` azt mondja
meg, *hogyan* olvassuk; a `DocumentProfile` azt, *mi az irat és mit kérünk tőle*.
A kettő **szorzat**: egy munkalap jöhet szkennelve és táblázatként is. Egy
tengelyre húzva minden új irat-típus négy új ágat jelentene.

```
Teljes suite            : 245 zold, 0 bukas   (DC-01b utan 154 volt -> +91)
Fuggoseg NELKUL (mert)  : 232 zold, 0 bukas, 0 KIHAGYVA + negativ kontroll
Mutacio                 : 10/10 kapu bizonyitottan HARAP  (+0 ERVENYTELEN)
Semlegessegi kapu       : TISZTA mind a 3 repoban
Elv-tabla               : 15 elv, 10 teljes / 2 reszleges / 3 nem fedett (TESZT koti)
```

**Az elvek átemelve:** `docs/PRINCIPLES.md` a **motor** repójában (nem csak a
platform tudástárában), mert a csomag önállóan eladható — aki csak ezt kapja meg,
annak is látnia kell, **miért** így viselkedik a kód. Minden elv mellett kiírva,
hogy **fedi-e gépi kapu**, és a három nem fedett (M2, M9, M14) **nevesítve**.

**Két QUALITY-hiányt is pótoltunk, amit az előírás olvasása hozott elő:**

| QUALITY | Hiány a DC-01b-ben | Pótolva |
|---|---|---|
| §3 naplózás | **nulla logolás** volt | `core/observability.py`, titok és abszolút út nélkül, 10 teszttel |
| §5 szkript | a mérők **eldobható mappában** | `tools/mutation_check.py` + `tools/measure_dependency_free.py` |

### Három hiba, amit a saját tesztek találtak

1. **⚠ Egy rövidebb címke elszívta egy hosszabb mező sorát — és a hibát
   ELMASZKOLTA a javító mechanizmus.** Az `"Adó"` beleillett az `"Adóalap:"`
   sorba, az adó mező hiány lett, majd az **M4-származtatás kitöltötte a HELYES
   értékkel** a végösszegből. A kimenet jónak látszott, a kinyerés rossz volt.
   *A származtatás egy hiányt pótol — és attól a hiány OKA eltűnik a szem elől.*
   Javítás: szóhatár **+** a leghosszabb címke nyeri a sort (a szóhatár nem véd,
   ha az egyik címke a másik szó-részhalmaza: `"Idő"` vs. `"Összes idő"`).
2. **Az elv-tábla összegző számát elszámoltam** (9/3/3 helyett 10/2/3) → kapu
   lett belőle, ami a számot a táblához köti, és a ✅-k mögötti teszteket is méri.
3. **Cirill `о` azonosítóban — MÁSODSZOR.** Visszatérő hibamódra kapu jár →
   `test_source_hygiene.py`, mellé két addig nem mért vállalás: **nincs `eval`**
   a csomagban, és **nincs abszolút útvonal** a forrásban (a repó publikus).

### Amit a DC-06-ból NEM mértem

Valódi ügyfél-irat · **szkennelt** bemenet (a felismerés hibaprofilja!) ·
hasáb-szétvágás (M2, nincs megírva) · több irat egy fájlban (holtverseny →
`MISSING`, a szétbontás hiányzik) · táblázat-fejléces elrendezés · `.NET` oldal ·
a CI Actionsön (most **három** körre nőtt) · a naplózás teljesítménye.

## Ami 2026-07-30 késő délután megtörtént — DC-02: AZ INTEGRÁCIÓ

Gábor kérése: *„Folytasd a fejlesztést és az integrációt."* A rés egyértelmű
volt: a motornak volt képessége, de **semmi nem fogyasztotta** — a `.NET`
modul-repóban csak licenc-metaadat állt.

**A központi döntés: ez ADAT-szerződés, nem HTTP-API.** A G4 (helyi alap, külső
opcionális) miatt a motor futhat in-process is; egy HTTP-API feltételezné a
telepítési alakot. A szerződés ezért a `CaptureRecord` **wire-alakja** — működik
in-process, soron át, és később HTTP mögött is: **a szállítás cserélhető, az alak
nem.** Ez a scheduling-minta **lényegének** átvétele, nem a formájának.

```
MOTOR (Python)
  Teljes suite            : 274 zold, 0 bukas   (DC-06 utan 245 volt)
  Fuggoseg NELKUL (mert)  : 261 zold, 0 bukas, 0 KIHAGYVA + negativ kontroll
  Mutacio                 : 13/13 kapu harap, 0 ERVENYTELEN
  Kontraktus-pin          : EGYEZIK (1.0.0)      Semlegesseg: TISZTA

MODUL (.NET)  -- dotnet 8.0.419 elerheto, tehat MERVE, nem leirva
  dotnet build            : 0 Warning, 0 Error   (TreatWarningsAsErrors=true)
  dotnet test             : 32 zold, 0 bukas, 0 kihagyva
  .NET mutacio            : 3/3 integracios kapu harap
  csproj darabszam        : 2  (az "oszinte nulla" szamlalo mostantol valos buildet ad)

KERESZT-REPO: a vendorolt es a motor-beli sema BAJTRA egyezik (sha256:6f2aef82323c…)
```

### A hash a wire-tartalmat fedi — HÁROM kapu

Minden előállított mező a sémában van · minden sémában deklarált mező elő is áll ·
és a **származtatott** `needs_human` premisszáját **újraszámoljuk a wire-ból**.
Mindháromhoz negatív kontroll jár, és külön teszt méri, hogy a próba-rekord
**minden érték-típust** tartalmaz — különben az 1. kapu csak részhalmazról
állítana valamit.

### ⚠ Egy kapu, ami SZÁNDÉKOSAN piros a motor pusholásáig

A modul CI-ja letölti a motor **publikált** sémáját, és bájtra összeveti a
vendorolt másolattal. Amíg a motor nincs kint, ez **elbukik** — és nem nyeltem el
`continue-on-error`-ral: **egy pin egy nem publikált szerződésre nem pin.**
**@root: ez döntési pont** — kivehető, de akkor a kereszt-repó drift nincs mérve.

### Három hiba, és MINDHÁROM a mérőeszközben volt

1. **⚠ A saját mutációs eszközöm elrontotta a hash-pinnelt fájlt.** A `write_text`
   Windowson `LF → CRLF`-et fordít: a visszaállítás **szöveg-azonos** volt, de
   **nem bájt-azonos**, és a vendorolt séma 112 bájttal nőtt. **A pin-kapu fogta
   meg** — ezzel igazolva a bájt-szintű hash tervezési döntését.
2. **A javítás új rést nyitott, és az eszköz KIMONDTA.** Bájt-szintre váltva
   **három** többsoros mutációs pont `ERVENYTELEN` lett (a készletben LF, a
   forrásban CRLF). A készlet **csendben szűkült volna** 13-ról 10-re — de az
   eszköz nem 10/10-et jelentett sikerként. Helyes válasz: **az illesztés
   szövegen, a visszaállítás bájton**.
3. **A generátoraim CRLF-fel írtak.** A tartós javítás nem a fájlok újraírása
   volt, hanem **`.gitattributes`**: a gépen `core.autocrlf=true`, tehát a
   **következő klónozásnál** a git visszaírta volna a CRLF-et, és a pin **minden
   Windows-fejlesztőnél elbukott volna** — olyan hibával, aminek a forrása nem is
   a repóban van.

**És egy negyedik:** a függőség-mentes mérés **nem fedte a kontraktus-teszteket**
(268 futott, 232 mérve, 13 munkafüzet → **23 teszt egyik körben sem**). Ebből is
kapu lett: minden teszt-modul pontosan egy körben fut.

### Amit a DC-02-ből NEM mértem

A CI egyik repóban sem futott Actionsön (most 3 kör + 8 lépés) · a kereszt-repó
drift-kapu a motor publikálását igényli · nincs NuGet-publikálás · **a modul
semmit nem TESZ a befogadott adattal** (nincs DMS, nincs jogosultság, nincs
index — az a DC-01/DC-03) · a `rows` séma-szinten homogén · `value_type` `MISSING`
esetén `null` · route-drift kapu itt nem értelmezhető.

## Ami 2026-07-30 este megtörtént — ADR-071 és a mutáció-készlet lezárása

**A DC-01 felderítése és tervezése workflow-ban fut** (licenc-audit · szövegréteg-út ·
felismerő-út · DMS/ACL, majd terv-panel bírákkal). Amíg az fut, olyat vittem előre,
ami **nem a terv kimenetétől függ**.

### ADR-071 — a modell határa írásba foglalva (az utolsó nyitott G-tétel)

A **G2** kapu kimondottan ADR-t kért: *„fél év múlva valaki meg fogja kérdezni,
miért nem tippel a modell cikkszámot, és a válasznak írásban kell lennie."*
`docs/knowledge/adr/ADR-071-model-reading-versus-deterministic-decision.md` —
`review_requested` (az elfogadás a root-review joga).

Az ADR **nem elvet ír le, hanem határt jelöl ki és megnevezi a kapukat**, amik
őrzik: nyolc kapu, és **mind a nyolc mutációval igazolva**.

⚠ **Ezt az állítást először HAMISAN írtam le.** „Mind a nyolc mutációval igazolva"
— aztán megszámoltam, és **négy** volt. A gyengébb válasz az lett volna, hogy az
állítást gyengítem; a helyes az, hogy **pótoltam a hiányzó négyet**.

**Három precedenst átvettem az ADR-070-ből** (a scheduling külső függőségei), hogy
ne keletkezzen két igazság: **D2** a könyvtár típusai soha nem jelennek meg a
kontraktusban *(a DC-02 ezt már teljesítette)* · **D3** a nem-determinisztikus
külső motort kimondottan kezelni kell *(OCR-nél élő kérdés)* · **D4** supply-chain
rögzítés *(⚠ a Python motorban ma NINCS lockfile — nyitott kérdés az ADR-ben)*.

### A mutáció-készlet: 23/23, és EGY implementáció két repóban

```
motor : python tools/mutation_check.py                        16/16 harap
modul : python <motor>/tools/mutation_check.py --root .             --config tools/mutations.json                      7/7  harap
                                                          osszesen: 23/23
```

Az eszközt **kétszer bővítettem, és mindkettőt egy lelet kényszerítette ki:**

1. **`kind: "create"` mutáció-fajta** — a *„nincs számla-specifikus use-case"* kapu
   `pkgutil`-lal **fájl-listát** vizsgál, tehát szöveg-cserével nem rontható el.
   Enélkül egy egész kapu-fajta (*„nincs ilyen fájl"*) mérhetetlen maradt volna.
2. **A futtató konfigurálható** (`runner` a `mutations.json`-ban) — így **egy**
   implementáció szolgálja ki a `dotnet test`-et is. Két másolat két igazság lenne
   ugyanarról a mechanizmusról; ez a semlegességi kapu mintája.

### ⚠ Egy mutáció, ami MAGÁT A TESZTET rontotta el — és ezért semmit nem bizonyított

Az egyik modul-mutációm kivett egy `Assert`-et a tesztből, és attól persze átment.
Az eszköz `NEM FOG`-ot írt ki, és **épp ezért néztem rá**. A tanulság: **a mutáció
a produkciós oldalt (kód vagy ADAT) rontsa el, és a teszt fogja meg** — a tesztet
mutálni önigazolás. Lecserélve **adat-mutációra**: az aranypéldányban megsértem a
két invariánst (`missing` mellé értéket írok), és a teszt megfogja.

### A kereszt-repó drift-kapu ZÖLD — a döntési pont feloldva

Root közben commitolta és **pusholta** mind a négy szeletet (`2001000` a motorban,
`4af5142` a modulban). A „szándékosan piros" lépés így megszűnt; **élesben mérve:**

```
publikalt : sha256:6f2aef82323ce6d3ed1e18883f0c395a1baa133c19caf757c2bf4e7ed1bb2145  (HTTP 200, 5194 bajt)
vendorolt : sha256:6f2aef82323ce6d3ed1e18883f0c395a1baa133c19caf757c2bf4e7ed1bb2145
=> EGYEZIK. Es mivel a hash egyezik, ez EGYBEN a sorveg-bizonyitek is.
```

**A `-f` védelme megmérve:** `-f` nélkül a curl **letölti a hibaoldalt**, és a
„404: Not Found" szöveg hashét (`d5558cd419c8d46b…`) hasonlítanánk össze — a kapu
**csendben soha nem fogna**. `-f`-fel exit 22.

⚠ **Amit ez NEM jelent:** a CI **még mindig nem futott GitHub Actionsön**. A kapu
*logikája* mérve zöld, a *runner-viselkedés* bizonyítatlan.

### Egy mérhető lelet az ADR-indexről

Az `ADR_CATALOGUE.md` **ADR-058-nál áll meg**, az ADR `README.md` pedig csak
**059–064**-et fedi. Vagyis **ADR-065…070 (hat ADR) egyetlen indexben sem
szerepel** — aki azt kérdezi, „milyen döntések vannak", hatot nem talál meg. Nem
javítottam (az index a rooté), csak mérve jelzem.

## Licenc-kapu (G5) — egy mért rés bezárva, amíg a DC-01 terve fut

A DC-01 felderítése **tíz blokkoló leletet** hozott, és az egyik a saját házunkban
volt: *„a G5-öt semmilyen gépi kapu nem méri — az első DC-01 függőséggel a szabály
azonnal mérés nélkülivé válik: GPL-függőséggel is lefordul és zöld a suite."*

Megépítve: `tools/license_guard.py` + `tools/licenses.json`, CI-ba kötve,
**19 minta öntesztje** (negatív + pozitív + „nem mérhető" kontroll) és **3/3
mutáció**.

### A központi tervezési döntés: a licenc a VERZIÓ tulajdonsága

⚠ Ezt egy **feloldott ellentmondás** tanította. Két független felderítő a
**telepített** `surya-ocr`-ból `GPL-3.0-or-later`-t mért — helyesen. A PyPI a
**legújabbra** `Apache-2.0`-t mond — szintén helyesen. Végigmérve:

```
surya-ocr 0.1.0 … 0.19.x  ->  GPL-3.0-or-later   (a telepitett 0.17.1 ilyen)
surya-ocr 0.20.0 -tol     ->  Apache-2.0
```

**Mindkét mérés igaz volt, és mégis rossz szabály jött ki** (*„a surya tilos"*),
mert egyik sem vizsgálta a verzió-függést. A helyes: *„0.20.0 alatt tilos"* — és
ezt a `pyproject` **alsó korlátjának** kell kikényszerítenie, különben a következő
**tiszta telepítés** csendben behozza a copyleft-es kiadást.

Ezért a kapu **két külön kérdést** mér: *megfelelő-e, ami telepítve van* (a
telepített metaadat) **és** *szabad-e rá hivatkozni* (a deklarált korlát).

### Amit MÉRVE tudunk a szóba jövő függőségekről (PyPI metaadat, 2026-07-30)

```
pymupdf   1.28.0 -> "Dual Licensed - GNU AFFERO ..."  => TILTOTT
pypdfium2 5.12.1 -> BSD-3-Clause / Apache-2.0         => megengedett  (a fitz potlasa)
pypdf     6.14.2 -> BSD-3-Clause                      => megengedett
pikepdf  10.10.0 -> MPL-2.0                           => FEL NEM ISMERT (dontes kell)
reportlab  5.0.0 -> BSD                               => megengedett
pillow    12.3.0 -> MIT-CMU                           => megengedett
easyocr    1.7.2 -> Apache-2.0                        => megengedett
paddleocr  3.7.0 -> Apache-2.0                        => megengedett
surya-ocr 0.22.1 -> Apache-2.0  (de <0.20.0 GPL!)      => verzio-korlattal
```

⚠ **Egy saját korrekció:** azt írtam, hogy a PyMuPDF „AGPL" — **emlékezetből**.
Tartalmilag igaz, de a licenc-ügynök helyesen utasította vissza a módszert:
*„nem tudtam megmérni, tehát blokkolónak kell tekinteni, amíg meg nincs mérve."*
Most hiteles forrásból mérve.

### Két hiba a saját kapumban, amit a saját kontrollok találtak

1. **Az önteszt elbukott, mielőtt a kaput használtam volna:** a csak-szóközből álló
   licenc-mezőt `ismeretlen`-nek minősítette `nem-merheto` helyett. A két állapot
   **más javítást kér** (kézi feloldás vs. döntés a szabálylistáról), összemosva a
   fejlesztő a rossz helyen keresne.
2. **A „precedencia-tesztem" nem mérte a precedenciát.** Egy mutáció (a megengedő
   lista fut a tiltó előtt) **átment** — mert a próba-szövegem
   (`Dual Licensed - GNU AFFERO … or commercial`) **egyetlen megengedő mintára sem
   illeszkedik**, tehát a sorrend nála nem is számít. A precedencia **csak olyan
   szövegen mérhető, ami mindkét listára illik** (`Apache-2.0 OR GPL-3.0`).
   Javítva, és a mutáció most fog.

### Mért állapot

```
MOTOR : 292 teszt zold | fuggoseg nelkul 279 / 0 KIHAGYVA | 19/19 mutacio
        licenc-kapu TISZTA | kontraktus-pin EGYEZIK | semlegesseg TISZTA
MODUL : 32 teszt zold | 7/7 mutacio
```

## ⚠ A forrás-prototípus ÉLŐ, nem archív — két korábbi állításom pontosítása

2026-07-30 este Gábor **új könyvet töltött le** a `tartalom_mentes` prototípussal
(szega.hu, 240 oldal), és a saját letöltő-szkriptjét használta hozzá. Ez két
dolgot változtat azon, amit a nap folyamán a forrás-projektről írtam:

**1. A `tartalom_mentes` nem befagyasztott előzmény, hanem HASZNÁLATBAN van.**
Eddig „forrás-prototípusként" kezeltem, amiből általánosítva átemelünk. Ez
továbbra is igaz, de nem szabad úgy tervezni, mintha állna: a fája **mozog**, és
az átemelésnél a *mai* állapotot kell nézni, nem a reggelit.

**2. Az abban lévő élő API-kulcs sürgősebb, mint ahogy jeleztem.** A délelőtti
leltárban rotáció-jelöltként rögzítettem, hogy a `settings.json` élő kulcsot
tartalmaz. Most kiderült, hogy **Gábor épp azt a fájlt használja** — tehát nem
„egy régi kísérletben maradt" érték, hanem a napi munkafolyamat része.
*(A repó nem publikus, tehát nem publikus szivárgás — de a mappa megosztása vagy
verziókezelésbe tétele kivinné.)*

**Amit a letöltésnél mértem, és ide is tartozik** (a DC-01/DC-05 bemenet-oldala):

```
240 lap letoltve | lapszamok 1..240, hianyzo 0, tobblet 0, ismetlodo 0
JPEG-fejlec 240/240 rendben, csonka 0, gyanusan apro 0 | osszesen 190,2 MB
```

⚠ **A darabszám önmagában NEM lett volna bizonyíték:** egy hibalap is `.jpg` néven
landol. A folytonosságot és a JPEG vég-jelet külön kellett mérni — ugyanaz az
elv, mint a `KIHAGYVA=0` a teszt-számlálóknál.

**És egy hiba a prototípus letöltőjében**, ami pontosan a mai nap mintája: a
`base64Data.length < 1000` ág kihagyott egy lapot, majd a ciklus után
**mindenképp „SIKER!"-t** írt. 240 oldalnál ez 228 fájlt és zöld visszajelzést
adhatott volna — az OCR-lánc pedig **hiányos könyvön** fut le. Írtam mellé egy
változatot, ami darabszámot és hiányzó lapszámokat ír ki; az eredetit nem
bántottam (M8).

## Ami 2026-07-30 késő este megtörtént — 520 lap ÉLES feldolgozása egy idegen láncon

Gábor két megvásárolt faipari szakkönyvét (134: 240 lap, 143: 280 lap) kereshető
PDF-fé és RAG-exporttá alakítottuk a `tartalom_mentes` prototípus láncán. **Nem
doc-capture-fejlesztés volt**, de ugyanazokba a problémákba futott, ezért a
leletek **normatív bemenetek a termékhez**.

**Termék-dokumentum:** [`DOCCAPTURE_SZEGA_TANULSAGOK_2026-07-30.md`](../../docs/knowledge/architecture/DOCCAPTURE_SZEGA_TANULSAGOK_2026-07-30.md)
(`review_requested`, 4 kérdés a rootnak) · **futás-dokumentáció:**
`Development/szega_runs/{README,FUTASI_TAPASZTALATOK}.md` (a platform-repón kívül)

**Mért eredmény:** 520 lap · 485 MB kereshető PDF · 541 k karakter RAG · a hosszú
`ő`/`ű` sűrűsége 8,8 és 11,9 / 1000 (magyar szakszöveg: ~8–12) · a nyers
EasyOCR-kimenet ugyanezeken a lapokon **0**. A kimenetek a Drive-tudástárban
(`Faipar/Tudástár`), tartalomra ellenőrizve (sha256 + a Drive-példány
oldalszáma és szövegrétege).

### A négy lelet, ami a terméket érinti

1. **A javító réteg MODELL-FÜGGŐEN ront.** Ablációval mérve: ugyanaz a
   prompt-csatolás (a kép mellé a nyers OCR-szöveg) a `flash-lite-latest`-en
   **4/4 futásban** átvitte az OCR hibáját (hosszú ő/ű 41,5 → 16,8), a
   `3.1-flash-lite`-on **0/4**-ben. A „3 lap a 270-ből" tehát nem szórás volt,
   hanem a **kvótáért végzett modell-rotáció** mellékhatása. → **M17-jelölt**
2. **Több kontextus nem mindig jobb.** A megbízhatatlan előfeldolgozás átadása
   **horgony**: a modell *egyetért* ahelyett, hogy *olvasna*.
3. **Két állítás a terminál `CLAUDE.md`-jében mérve HAMIS** a hivatkozott
   motorra: az „inkrementális feldolgozás jelzőkkel" az EXTRACT-ra nem áll
   (`version_service.py:6` mindig `max+1`), és az EXTRACT **LLM-hívással indul**
   (`extractor.py:41-42`) — utóbbi az **1. szabály sérülése a referencia-motorban**.
4. **A korpuszból nőtt megfeleltetési tábla** (476 csere, ember nélkül) **M5
   mechanizmusán kívül van**: olvasáshoz rendben, **könyveléshez tilos** — ez a
   legfontosabb új termékhatár.

### Ami a G3/M9-hez szól

A lánc két kimenete **két különböző mezőből** épült (`block.text` vs.
`beautified_text`), hibaüzenet nélkül. **M9 csak akkor tartható, ha minden
downstream artefaktum ugyanabból a mezőből épül** — és ezt tesztnek kell
kikötnie. A DC-04 lépésszám-mérése mellé ez is kikötendő.

### Két saját korrekció

- Azt mondtam, a mérés „megbuktatta" a négy-bemenet táblázat *digitális PDF*
  sorát. **Pontatlan volt:** a bemenet raszterizált JPG volt, nem szövegréteges
  PDF. Amit valóban felfed: a táblázat **tengelye kétértelmű** (eredet vs.
  képesség); a helyes ismérv, hogy **van-e kinyerhető szövegréteg**.
- A javító-réteg mechanizmusát először **mérés nélkül állítottam**. Az
  adverzáriális ellenőrzés jogosan kifogásolta; az abláció utólag igazolta —
  de csak a **hibát produkáló modellen** megismételve.

## Ami 2026-07-31 megtörtént — DC-01a + a Doorstar faipari RAG

### 1. Doorstar faipari GraphRAG, 1. fázis (vektor) — **APPROVED**

Gábor kérése: a Doorstar agentei faipari ismereteket kapjanak GraphRAG-ból.
A felmérés kimutatta, hogy **a nexus-dev knowledge-service GraphRAG-alapja már
áll** (Neo4j + hibrid keresés, GR-M1..M3 `done`), és a programjuk **stopping
condition**-je maga vár egy „termék-korpusz" szigetre — vagyis ez nem eltérítés,
hanem a hiányzó második láb.

**Két Gábor-döntés, a csatornán kihirdetve:** (1) a nexus-dev GraphRAG-jára
építünk; (2) **LLM-alapú entitás-kinyerés ENGEDÉLYEZVE, a faipari
könyv-korpuszra szűkítve** — a kód-korpuszok determinisztikusak maradnak.

**Mért eredmény:** `doorstar-knowledge` collection **35 → 1998** dokumentum
(1963 érdemi chunk, darabra egyezik). Korpusz: VPS
`/opt/doorstar/data/faipar-corpus/` (gitignore-olt `data/` — megvásárolt könyvek
tartalma, **repóba nem kerülhet**), SHA-256-os manifesttel; ingest-szkript
idempotens, hash-kapuval és **kemény kapuval az in-memory fallback ellen**.
MCP-n (3460) mérve: faipari kérdésre könyv-chunkok **cím+lapszám** attribúcióval,
célzott üzemi kérdésre továbbra is az üzemi doksik elöl.

**Út közben két valódi hiba:** CRLF törte a lap-fejléc regexét (a 07-30-i
családfa **negyedik** ütése — a hash a nyers bájton, a normalizálás csak utána),
és a lapszám-alapú chunk-id ütközött lapszám nélküli szekcióknál.

⚠ **Ismert korlát:** ez a KS-kódvonal **nem tud domain-szűrést**, tehát vak,
általános kérdésnél a könyv-korpusz (1963 chunk) elnyomhatja a 35 üzemi doksit.
A 2. fázis (gráf) kérése a **nexus-dev root inboxában** van.

### 2. DC-01a — szövegréteg-olvasó geometriával, `review_requested` → **commitolva**

A root a tervet elfogadta (három szeletre bontás), a DC-01a-t kiadta, és a
leszállítás után **commitolta** (`327ba9f`, 26 fájl / 3264 sor).

**A kilenc leállási szám:** suite **326 OK** (alapvonal 292) · három mérési kör
**295/13/18**, mindháromban `KIHAGYVA=0` · licenc-kapu `document` extrával
**TISZTA** (önteszt 23/23) · **x_right 3/3 EGYEZIK** a könyvtár jobb szélével ·
mutáció **26/26 fog, 0 ÉRVÉNYTELEN** (6 új) · PRINCIPLES **10/3/2** · kiterjesztett
határ-kapu zöld · végponttól végpontig `sha256:` előtaggal · a CI-ban mind bekötve.

**Négy dolog, ami a tervben nem így szerepelt:**

1. **A K8 kapu bevezetése MÁR MEGLÉVŐ sértést talált.** A terv úgy fogalmazott,
   hogy „a kaput itt kell bezárni, amíg nincs sértés" — volt: a `core/config.py`
   `open()`-t hívott a magban, és a régi (csak-import) kapu ezt **elvileg sem
   foghatta**. Nem gyengítettem a kaput: a perzisztálás átkerült az
   `infrastructure/config_store.py`-ba. ⚠ **API-változás**
   (`CaptureConfig.save/load` → `save_config/load_config`), hívók: csak tesztek.
2. **A `test_principles.py` összegző-regexe a magyar TOLDALÉKRA volt szabva** —
   a helyesen írt mondat buktatta el a kaput. A **mintát** javítottam, nem a
   mondatot rontottam el a minta kedvéért.
3. **A `WORKBOOK_DEPENDENT_MODULES` a rossz helyen állt** (tesztfájlban literál).
   Mindhárom kör-lista az eszközbe került; a kapu mostantól **kör-páronként**
   vizsgál (három körnél a régi `free & workbook` kettőt átengedett volna).
4. **A `mutations.json` `not_covered`-je HAMIS sort tartalmazott** egy nem létező
   öntesztről. Javítva: **adósság**, nem lefedettség.

**Egy tervi „NEM MÉRT" tételt lezártam:** a kézzel írt PDF-fixture **járható**
pdfium-mal (721 bájt → 3 téglalap, 64 karakter) — a tartalék-terv nem kell, és
üzleti bináris nem kerül a repóba.

**Egy általános érvényű lelet:** *a geometriai invariáns egymagában nem elég.*
A koordináta-konverziót kétféleképp lehet elrontani; a **név szerinti** átvétel
megsérti a `y_top < y_bottom` kikötést, az **index szerinti** viszont
**kielégíti** — miközben a lap fejjel lefelé áll. Ezért a kapu a **tényleges
koordinátát** méri. Mindkét mód külön mutációval igazolva.

### ⚠ Amit NEM tudtam lezárni — ingadozó bukás

A záró ellenőrzésnél a suite **5 bukást** adott, ismétlésre 4-et, majd 0-t (azóta
mind zöld). Mindig ugyanaz: a `license_guard` **precedencia**-tesztje.
**A mechanizmust azonosítottam, az okot nem:** a `mutation_check` **a mért fát
írja**, tehát egy egyidejű suite-futás a mutált állapotot látja. Öt kísérletből
nem reprodukáltam; a kizárt hipotézisek táblája a jelentésben.

⚠ **A saját maradvány-keresésem is hibás volt:** csak a `src/`-ben grepeltem
„MUTACIO"-ra, holott az érintett eszköz a `tools/`-ban van — a „0 találat" nem
tisztaságot bizonyított, hanem rossz helyen keresést.

### ⚠ És amit a root talált MEG UTÁNAM — a CI két napig piros volt, HAT okból

**A motor CI-je a DC-02 óta (2026-07-30) PIROS volt**, és a root a DC-01a
review-ján **hat** különálló okot javított (`packaging` előfeltétel · a
licenc-kapu lépés-sorrendje a telepítéshez képest · az előfeltétel helye az 1.
körhöz képest · **egy teszt rossz mérési körben** · és a lenti `.gitignore`-eset).

**Kettő közvetlenül az én szeleteimet érinti:**

1. **A `test_license_guard` a függőség-mentes körben állt**, de **alprocesszben**
   futtatja a kaput — és az alprocessz **nem örökli** az import-blokkolást. Ahol
   az extrák globálisan telepítve vannak (minden fejlesztői gép), a teszt zöld;
   a CI-n azonnal elbukott. **A gépemen elvileg sem derülhetett volna ki**, és a
   kör „függőség nélkül" állítása ennyivel hamis volt.
2. **A DC-02 aranypéldánya sosem ért be a repóba:** a `.gitignore` `samples/`
   sora — ami **üzleti binárisokra** való — elnyelte a `contracts/samples/`
   alatti **normatív JSON**-t is. Az aranypéldány a DC-02 review-ján
   **bizonyítékként szerepelt**. A teszt helyesen bukott: *„nincs aranypéldány —
   a mérés vakon zöld lenne."*

**A közös gyökér:** a kapuk olyan gépen készülnek, ahol **minden telepítve van**
és **minden fájl ott van** — ezért a környezet-függő állítások csendben átmennek.
Én a jelentésemben kimondtam, hogy a CI-bekötést **a YAML-ből** ellenőriztem,
„nem egy zöld futásból" — és pontosan ott volt a hat hiba.
***A YAML-olvasás nem helyettesíti a futást.***

⚠ **Munkamódszer-következmény (mostantól kötelező):** minden kapunál kérdezd meg,
**mi ebben környezet-függő** (telepített csomag · meglévő fájl · globális config ·
futó szolgáltatás), és push után **nézd meg a futást**. A `.gitignore`-javítást
**mindkét irányban** bizonyítsd: `git ls-files` mutassa a felvenni kívánt fájlt,
ÉS egy negatív kontroll maradjon tiltott.

### Amit a DC-01a-ban NEM mértem — kimondva

- **elforgatott lap, vertikális szöveg, RTL írásrend** — egyik fixture sem fedi;
- **valódi éles iraton mért hasáb-találati és hamis-riasztási arány** — csak kézzel
  írt fixture-ökön; a `merged_span_ratio` alapértéke **nem** éles adaton hangolt;
- **a `LicenseRef-PdfiumThirdParty` tételes tartalma** — a 972 soros gyűjtő-fájlt
  nem olvastam át; a „0 copyleft" **másodkézből** vett mérés, és az átolvasás a
  `document` extra **kiadásának** előfeltétele (FreeType/FTL, libjpeg-turbo/IJG attribúció);
- **a pypdfium2 5.x** viselkedése és licenc-mező alakja — épp ezért `<5` a korlát;
- **teljesítmény** bármilyen fájlmérten;
- **tiszta venv-ből** épített telepítés licenc-mezői — minden mérés egy globális
  Python 3.12.10-en, venv nélkül;
- **a CI tényleges lefutása** — a bekötést a YAML-ből ellenőriztem. ⚠ **Ez utólag
  a legdrágább tétel lett: pontosan ott volt hat hiba** (ld. fent).

---

## Következő lépés

**Feladatkiadásra vár**, de a kapuk már nem blokkolnak. Sorrend-javaslat:

1. ~~DC-01a~~ ✅ **kész és commitolva** (`327ba9f`) — a szövegréteges **olvasás**
   áll; az irat-elemzés innentől digitális PDF-en is fut, nem csak sima szövegen.
2. **DC-01b — kereshető PDF ÍRÁSA.** A terve **már megvan, mérésekkel**
   (betűtípus-kapu három hibaalakkal, pozíció-kapu ±1,5 pt, port-alakváltás).
   ⚠ **Gábor-kapu előtte:** betűtípus-politika (OFL-1.1 jelölt).
3. **DC-01c — .NET befogadás + DMS-tárolás:** **BLOKKOLT**, licenc-kapun
   (`SpaceOS.Modules.Hosting` licenc nélkül + platform-repó gyökér-`LICENSE`).
4. ~~DC-02~~ ✅ **kész** — a szerződés áll, a `.NET` oldal fogyasztja
5. ~~G2-ADR~~ ✅ **megírva** (ADR-071, `review_requested`). **Két nyitott
   kérdés benne:** Python supply-chain rögzítés (lockfile) és a
   dependency-licencek manifest-szakasza.
6. **Faipari RAG 2. fázis (gráf)** — a **nexus-dev** sávjában, a kérés kiment.
7. **DC-04** — **továbbra is blokkolt**: Gábor bevezetési tapasztalat-gyűjtésére
   vár, és a G3 portál-UI döntése után **még fontosabb**, mert a jóváhagyás
   lépésszámát ahhoz kell mérni

## Nyitva, nem nálam

| Tétel | Kinél | Állás |
|---|---|---|
| **Token-rotáció** | **root** | **FUT** (2026-07-30 10:00) — az éles master token AZONOS a publikusan kint lévővel |
| Commit + push | **root** | ✅ **megtörtént** — DC-01b/06/02 + **DC-01a (`327ba9f`)** a főágon; a CI-javítások is (`3e81f03`…`f9a2a59`) |
| **`mutation_check` kizárása** | root/kiosztatlan | az eszköz **a mért fát írja**; egyidejű suite-futás a mutált állapotot látja (ingadozó bukás mérve, nem reprodukálva) |
| **`LicenseRef-PdfiumThirdParty` átolvasása** | doccapture | a `document` extra **kiadásának** előfeltétele (attribúció-köteles tételek); a „0 copyleft" ma másodkézből vett mérés |
| **Faipari RAG 2. fázis (gráf)** | **nexus-dev** | a kérés kiment (`terminals/root/inbox/2026-07-31_joinerytech-doccapture_graphrag-faipar-korpusz.md`); Gábor engedélye az LLM-kinyerésre a könyv-korpuszon megvan |
| `portal-ui` publish | root | a licenc-döntés a doccapture-repókra szól; a `portal-ui` külön |
| nesting/cutting licenc | Gábor | **külön döntés**, nyitva (szabadalom-közeli) |
| G2-ADR | kiosztatlan | a döntés megvan, az írásba foglalás nem |
