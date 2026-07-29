# OCR-projektek felmérése — `Bevetelezes` és `tartalom_mentes`

> **Kérdés (Gábor):** felhasználható-e a két projekt arra, hogy cégek
> információit digitalizáljuk és a JoineryTech platformba integráljuk, úgy hogy
> a napi rutinjukat csak kis mértékben kelljen megváltoztatniuk.
>
> **Rövid válasz:** igen, és **a kettő nem alternatíva, hanem motor + munkafolyamat**.
> De van egy pont, ahol már elkezdtek egymás felé nőni — ezt **most kell** eldönteni,
> különben két igazság lesz ugyanarról.

---

## 1. Mi a két projekt valójában

### `Bevetelezes` — a munkafolyamat (éles, determinisztikus)

Beszkennelt beszállítói számla (PDF) → **SAP cikkszám + SAP mennyiség**.

- ~2600 sor Python; a fő szkript 1488 sor.
- **Tesseract** (`hun+eng`) + PyMuPDF; a kinyerés **szabály-alapú** (18 regex-hely).
- **A könyvelési úton NINCS LLM** — ellenőriztem: nulla LLM-hívás a fő
  szkriptben. A README ezt szándékként is kimondja: *„az LLM csak a
  fejlesztésben és a hiányok triage-ában segít, a könyvelési útvonalon **nem**
  vesz részt."*
- **Forrás-igazság:** `Cikszám megfeleltetés.xlsx`, ami **kézzel bővül** —
  beszállítói megnevezés → SAP cikkszám + átváltó szorzó + SAP ME.

**A legértékesebb része nem az OCR, hanem a jóváhagyási hurok.** A szkript
Excelbe ír javaslatokat megbízhatósági jelöléssel, a felhasználó **`x`-szel**
jelöli, amit elfogad, és a `--jovahagy` felvezeti a megfeleltetési táblába.
Vagyis: **a rendszer javasol, az ember dönt, a tudás gyarapszik** — és mindez
abban az Excelben, amiben a kolléga amúgy is dolgozik.

Ez pontosan az, amit kértél: **a napi rutin alig változik.**

### `tartalom_mentes` — a motor (általános, jól strukturált)

Beszkennelt kép → kereshető PDF + Markdown RAG-tudásbázis.

- **Hexagonális architektúra** (`core` / `infrastructure` / `usecases`),
  tiszta portokkal, **46 teszt-fájl**.
- Négy fázis: **EXTRACT** (EasyOCR + kétmenetes Vision-LLM átirat) → **REVIEW**
  (fragmentumonkénti javítás hallucináció-szűrővel) → **BEAUTIFY** (Markdown +
  RAG-export) → **BUILD** (kereshető PDF **láthatatlan szövegréteggel**).
- Portok: `IVisionClient`, `IOcrService`, `IPdfBuilder`, `IRepository`,
  **`VectorStorePort`**, **`HandwritingOCRPort`** — és **`InvoiceExtractionPort`**
  (`InvoiceData`, `InvoiceVendor`, `InvoiceLineItem`, `IInvoiceRepository`).
- Streamlit UI + CLI, inkrementális feldolgozás, atomikus mentés.

A **kézírás-port** külön figyelmet érdemel: üzemi környezetben a kézzel írt
jegyzet, mérési lap, szállítólevél-firka gyakori — és ezt a Tesseract nem viszi.

---

## 2. ⚠ A lelet: már elkezdtek egymás felé nőni

A `tartalom_mentes` **már tartalmaz számla-kinyerő portot** (`InvoiceExtractionPort`
+ `InvoiceData` modell), miközben a `Bevetelezes` az, ami **élesben működik**
számlákon — determinisztikusan, auditálhatóan.

**Ez két igazság ugyanarról**, és pont az a hibaosztály, amiből ma több is
előkerült a platformon (két CRM-fa, két prioritás-sávozás, két
dátum-implementáció). Mielőtt bármit integrálunk, **el kell dönteni, melyik a
számla-kinyerés forrás-igazsága.**

**Javaslat:** a `Bevetelezes` marad a számlák gazdája (az működik, az auditálható,
és az hordozza a megfeleltetési tudást); a `tartalom_mentes` `InvoiceExtractionPort`-ja
vagy **a Bevetelezes elé** kerül bemenet-előkészítőként (jobb szövegréteg), vagy
kivezetendő. Amit **nem** szabad: párhuzamosan fejleszteni mindkettőt.

---

## 3. A második, fontosabb határ: hol lehet LLM és hol nem

A `Bevetelezes` biztonsága abból jön, hogy a **könyvelési út determinisztikus**.
A `tartalom_mentes` motorja viszont Vision-LLM-alapú. Ha a kettőt naivan
összekötjük, elveszítjük azt, ami a `Bevetelezes`-t ma használhatóvá teszi.

**A javasolt szabály, és ezt érdemes kimondva rögzíteni:**

> **LLM az OLVASÁSHOZ, determinisztikus szabály a KÖNYVELÉSHEZ.**
> A modell abban segít, hogy *mi van a papíron* (jobb szövegréteg, kézírás,
> rossz minőségű szkennelés). Abban **nem**, hogy *mi kerüljön a rendszerbe* —
> a cikkszám-párosítás, a mennyiség-átváltás és a jóváhagyás marad szabály +
> ember.

Ez ugyanaz az elv, ami ma a platformon többször visszatért: **egy állítás annyit
ér, amennyit bizonyít.** Egy LLM-es cikkszám-tipp nem auditálható; egy
megfeleltetési tábla sora igen.

---

## 4. Hol illeszkedik a platformba

| Platform-modul | Mit ad neki | Állapot nálunk |
|---|---|---|
| **DMS** | kereshető PDF + kinyert szöveg + metaadat | ma keményítettük: fail-closed ACL, grant-tárolás, SQL-szűrt lista (108/108) |
| **Procurement / Inventory** | a bevételezés maga: számla → cikkszám → mennyiség | van backend-hoszt |
| **Nexus RAG** | a Markdown-export + `VectorStorePort` | a RAG él |
| **Kontrolling** | számla-adatok költségoldala | van |

A **DMS-illeszkedés a legerősebb**: egy kereshető PDF önmagában is érték, és a
mai ACL-munkával együtt (ki láthatja, ki oszthatja meg, auditált grantekkel)
ez egy valódi dokumentum-modul lenne, nem fájltár.

---

## 5. Az integráció alakja: szolgáltatás-határ, nem kód-újrafelhasználás

A platform .NET 8 + Node + React; mindkét projekt **Python**. Kódot tehát nem
emelünk át — és nem is kell:

**Publikált kontraktus + generált kliens.** Pontosan az a minta, ami a
schedulingnél már működik a Doorstar felé: OpenAPI 3.1, hash-pinnelt spec,
generált kliens, verziózott bővítés. Az OCR-motor marad Python-szolgáltatás,
a platform pedig **szerződés ellen** hív.

Előnye, hogy a két projekt **saját ütemben fejlődhet**, és ha valaha lecseréljük
a motort (más OCR, más modell), a platform nem tud róla.

---

## 6. Javasolt lépések

1. **Döntés: melyik a számla-kinyerés gazdája** (javaslat: `Bevetelezes`), és a
   `tartalom_mentes` invoice-portjának sorsa.
2. **Az „LLM olvasáshoz, szabály könyveléshez" határ kimondása** — ez ADR-jelölt,
   mert később mindenki meg fogja kérdezni, miért nem tippel a modell cikkszámot.
3. **Egy szűk első szelet, ami valódi értéket ad:** a `tartalom_mentes`
   BUILD-fázisa (kereshető PDF láthatatlan szövegréteggel) → **DMS-be töltés**
   a mai ACL-lel. Ez nem érinti a könyvelést, azonnal hasznos, és kiméri az
   integrációs határt kockázat nélkül.
4. **A jóváhagyási hurok megőrzése**, ha a bevételezés a platformra kerül: a
   javaslat + `x` + tábla-bővülés minta a napi rutin változatlanságának a kulcsa.
   Ha ezt elveszítjük egy „szép UI" kedvéért, a bevezetés meg fog állni.
5. **Kézírás-felmérés:** a `HandwritingOCRPort` mennyire kész, és van-e üzemi
   eset, ami ma emiatt marad papíron.
