# DOC-CAPTURE Terminal State

> **Létrehozva:** 2026-07-29 este Europe/Budapest (root)
> **Epic:** [`docs/tasks/EPIC-DOC-CAPTURE-2026Q3/README.md`](../../docs/tasks/EPIC-DOC-CAPTURE-2026Q3/README.md)
> **Állapot:** **DC-00 kész, `review_requested`** (2026-07-29 este) — a G-kapuk
> (G1-G5) továbbra is döntésre várnak, a szeletek azokra várnak

## Miért létezik ez a terminál

Gábor döntése (2026-07-29): a két meglévő OCR-projekt képességeit **javított
formában**, **több külön repóban**, **termékként szolgáltathatóan** kell behozni
a JoineryTech szolgáltatásai közé — és a termék **cégek integrálását** segítse:
PDF, Excel, papír és kézírás.

## Amit már tudunk (nem kell újra felderíteni)

### A forrás-projektek állapota (root-felmérés, 2026-07-29)

- **`Bevetelezes`** — éles, determinisztikus munkafolyamat. ~2600 sor Python;
  Tesseract `hun+eng` + PyMuPDF; a kinyerés szabály-alapú (18 regex-hely);
  **nulla LLM-hívás a könyvelési úton** (mérve). Forrás-igazság a
  `Cikszám megfeleltetés.xlsx`, ami kézzel bővül. **A legértékesebb része a
  jóváhagyási hurok**, nem az OCR.
- **`tartalom_mentes`** — hexagonális OCR/RAG-motor, **19 teszt-fájl**, négy
  fázis (EXTRACT/REVIEW/BEAUTIFY/BUILD), kereshető PDF láthatatlan
  szövegréteggel, Markdown/RAG export. Portjai: `IVisionClient`, `IOcrService`,
  `IPdfBuilder`, `IRepository`, `VectorStorePort`, `HandwritingOCRPort` — és
  **`InvoiceExtractionPort`** (ld. G1).
  ⚠ **Csak az élő fából szabad átemelni.** A projektben három
  `.claude/worktrees/agent-*` másolat is van ugyanarról a magról; **egyetlen új
  teszt-modult sem** hoznak, viszont a **tartalmuk eltér** (régebbi logika).
  Aki rossz fából emel át, csendben visszalép egy verziót. (Innen jött a
  korábbi, felfújt „46 teszt-fájl" szám is.)
- **`doorstar-instance/terminals/import-discovery`** — **már fut**, bizonyíték-
  alapú adatfelderítés legacy dokumentumokból (PDF/DWG/XLSX/XLSM). A működési
  szabályai ránk is állnak (csak olvasható forrás; XLSM OOXML-cache, VBA/formula
  tilos; hivatkozás = relatív út + SHA-256; DRAFT + emberi hitelesítés).

### A négy bemenet négy külön út

Excel/CSV és digitális PDF → **parse, modell nélkül**; szkennelt kép → OCR;
kézírás → vizuális átirat. Összemosni tervezési hiba. **Ezért megy az
Excel-betöltő (DC-01b) a kritikus út elejére** — egy cég integrálásakor az
adatok többsége már digitális.

## Nyitott G-kapuk (Gábor döntése, az epic README-jében)

| Kapu | Miről szól | Miért blokkoló |
|---|---|---|
| **G1** | a számla-kinyerés forrás-igazsága | két igazság van kialakulóban (`Bevetelezes` vs. a motor `InvoiceExtractionPort`-ja) |
| **G2** | az LLM határa — ADR-jelölt | „LLM az olvasáshoz, szabály a könyveléshez"; termékként eladási érv |
| **G3** | a jóváhagyási hurok felülete | Excel marad-e; **Gábor tapasztalat-gyűjtése normatív bemenet** |
| **G4** | adatvédelem | **ez dönti el a motor telepítési alakját** — a szeletek előtt kell |
| **G5** | licenc- és tulajdon-határ | a repók létrehozása előtt jó tudni |

## Ami 2026-07-29 este megtörtént

**A premissza megdőlt:** a kickoff privátnak mondta a repókat — **mind a négy
PUBLIC** (a három termék-repó + a platform). Gábor döntése: **maradjanak
publikusak**, a titkok kerüljenek ki, a VPS-adatok gitignore-olt configba.

**Ebből jött a nap legsúlyosabb lelete** (eszkalálva, a rotáció a rooté):
az `origin/main`-en **6 követett fájl** tartalmazta nyílt szövegben az MCP
master tokent + 11 agent-tokent. A tanulság a besorolásról szól: a `CLAUDE.md`
**listázta** adósságként, de *történetiként*, privát repót feltételezve.
A jelzés megvolt, a **súlyozása** volt rossz.

**DC-00 mindhárom darabja kész**, commitolatlanul (a commit a rooté):

| Darab | Bizonyíték |
|---|---|
| a két .NET repó CI-ja + verziózása | kapu-önteszt **8/8** és **8/8**, hash-pin megmérve |
| a harmadik repó **eltérő** semlegességi szabálya | `furniture`: modul-repó **exit 1**, bevételezés **exit 0** — a különbség gépileg őrzött |
| a hexagonális mag általánosított átemelése | **29 teszt zöld** (7 volt + 22 új), kapu TISZTA |

**Két gépi kapu, mutációval igazolva:** a semlegességi kapu (becsempészett
iparági szó → `README.md:52`, exit 1) és az architekturális határ (külső csomag
**és** saját infrastruktúra-import is elbukott).

**A kapu két valódi hibát talált a saját kódomban:** a `CaptureConfig.save()`
előbb csonkolta a fájlt, mint hogy elbukott volna az ellenőrzésen (éles üzemben
adatvesztés), és az `assert_no_secret_values` `asdict()`-en iterált, ami csak a
deklarált mezőket látja — a kapu pont attól lett volna vak, ami ellen véd.

**G1-et nem léptük át:** a számla-kinyerő port **nincs** átemelve, és **teszt
őrzi**. Ha az a teszt elbukik, az jelzés, hogy valaki a kapu előtt lépett.

## Következő lépés

**Feladatkiadásra vár.** Javaslat: **DC-01b** (Excel/CSV betöltő) — modell
nélküli parse, a G-kapuktól **független**, és ez adná az első adaptert a
`TabularReader` port mögé, tehát a most beépített portokat is bizonyítaná.

**Nem indul el kiírás nélkül.** Blokkolt marad: DC-04 (G1-G3 + Gábor
tapasztalat-gyűjtése) és minden, ami a motor **telepítési alakjától** függ (G4).

**Nyitva, nem nálam** (2026-07-29 esti állás):

| Tétel | Kinél | Állás |
|---|---|---|
| **Token-rotáció (R1)** | **root** — Gábor rá osztotta | friss fejjel, holnap |
| Szivárgás-kapu | frontend, **APPROVED** | a lefedettséget is kimondja (`X/Y` + a 14 submodule nevesítve) |
| **G5 — licenc** | Gábor | **irány megvan** („minél többen használják" → nyílt licenc), a **konkrét licenc nyitva**: MIT vs Apache-2.0, a nesting/szabás szabadalmi kockázata miatt nem triviális |
| `portal-ui` publish | root | **a licencre vár** |
| A hat meg nem mért submodule | — | **nyitva**, Gábor nem válaszolt rá |

⚠ **A push vissza van tartva a rotációig.** A DC-00 minden darabja
**commitolva, de nem pusholva** — a repók publikusak, és a kint lévő hitelesítő
miatt a publikálás sorrendje számít.

⚠ **A terminál `CLAUDE.md`-je két abszolút helyi útvonalat tartalmaz** (21-22.
sor), és **követett** — a következő pushsal publikussá válik. Jelezve a
csatornán; nem nyúltam hozzá, mert normatív utasítás.
