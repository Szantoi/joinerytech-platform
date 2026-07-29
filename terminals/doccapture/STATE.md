# DOC-CAPTURE Terminal State

> **Létrehozva:** 2026-07-29 este Europe/Budapest (root)
> **Epic:** [`docs/tasks/EPIC-DOC-CAPTURE-2026Q3/README.md`](../../docs/tasks/EPIC-DOC-CAPTURE-2026Q3/README.md)
> **Állapot:** induló — még nem kezdődött végrehajtás, a G-kapuk döntésre várnak

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

## Következő lépés

**Nem kód.** Először: az `import-discovery` terminál `state.md` + `memory.md`
elolvasása (élő tapasztalat), majd a G4 döntés megvárása. A DC-00 (repók, CI,
**szótár-őr első naptól**) csak utána indul.
