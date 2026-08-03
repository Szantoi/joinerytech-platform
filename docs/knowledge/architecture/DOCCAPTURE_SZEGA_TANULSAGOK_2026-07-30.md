# DOC-CAPTURE tanulságok egy valós, 520 lapos feldolgozásból

**Dátum:** 2026-07-30 · **Terminál:** doccapture · **Státusz:** `review_requested`

Két megvásárolt faipari szakkönyv (240 + 280 lap) kereshető PDF-fé és
RAG-exporttá alakítása egy **meglévő, működő** OCR/RAG láncon. A munka nem a
doc-capture terméken folyt, de **ugyanazokba a problémákba** futott — ezért az
itteni leletek normatív bemenetek a termékhez.

A futás dokumentációja a lánc mellett él (`szega_runs/README.md`,
`FUTASI_TAPASZTALATOK.md`); ez a dokumentum **csak a termék-következményeket**
tartalmazza.

---

## 1. A legfontosabb mért lelet: a javító réteg modell-függően rontja el a szöveget

A lánc a Vision-modellt „szépítésre" használja: a **kép mellé** megkapja a nyers
OCR-szöveget is. 270 lapból 3-on a modell **nem javított, hanem átvette** az OCR
ékezet-hibáját (`Fekvóbútorok`, `elsődleges` → `elsódleges`).

Ezt először mechanizmus-magyarázatként írtam le. Egy adverzáriális ellenőrzés
helyesen kifogásolta, hogy **állítás, nem mérés** — nincs ablációs kontroll.
Elvégeztük, egy lapon, két ágon, modellenként 4 ismétléssel:

```
gemini-flash-lite-latest
  A) prompt a nyers OCR-szöveggel : hosszú ő/ű átlag 16,8 | átvett hiba 59, 4/4 futásban
  B) prompt csak a képpel         : hosszú ő/ű átlag 41,5 | átvett hiba  0, 0/4 futásban

gemini-3.1-flash-lite
  A) 40,0 | 0 hiba                B) 39,0 | 0 hiba        → erre a modellre nem hat
```

**Következmények, amiket a termékbe kell vinni:**

1. **A hatás determinisztikus, de modell-függő.** Ugyanaz a prompt az egyik
   modellen 4/4-ben ront, a másikon 0/4-ben. A „3 lap a 270-ből" tehát **nem
   véletlen szórás** volt, hanem a kvótáért végzett **modell-rotáció**
   mellékhatása: amelyik lap arra a modellre esett, azon romlott.
2. **A kapacitásért végzett modellváltás minőségi szórást okoz** — és ezt
   semmilyen futásidejű kapu nem jelzi. Ha a doccapture több modellt vagy
   szolgáltatót használ terheléselosztásra, a kimenet minőségét **modellenként**
   kell mérni, nem a szolgáltatás szintjén.
3. **Több kontextus nem mindig jobb.** A nyers OCR beadása a promptba mérhetően
   **rontott** (16,8 vs 41,5). Egy megbízhatatlan előfeldolgozás átadása a
   következő lépésnek nem segítség, hanem **horgony**.

---

## 2. Ellentmondások a terminál saját dokumentációjában

Az ellenőrzés kódszinten igazolt két állítást, amit a
`terminals/doccapture/CLAUDE.md` a motor **bevált fegyelmeként** sorol fel.

### 2.1 „Inkrementális feldolgozás jelzőkkel" — az EXTRACT-ra nem áll

`version_service.py:6` mindig `max+1` verziót ad; `cli.py:183` (EXTRACT) ezt
hívja, így a `repository.load()` üres, az `already_done` üres, és **minden
futás nulláról indul**. A projekt saját előzménye: `cache_v003` 64 lap,
`v004` **újra** 64 lap, `v005` 26 lap bukva — ugyanaz a könyv háromszor.
A `cli.py:224` recovery-tippje (`--mode <FÁZIS>`) az EXTRACT-ra **félrevezet**.

### 2.2 Az EXTRACT LLM-hívással indul — ez az 1. szabály sérülése

`extractor.py:41-42`: az `execute()` **első sora** `_test_api_connection()`,
minden OCR előtt. A fázis kimenete (OCR-dobozok) **nulla modellt igényel**.
Az 1. szabály tétele — *„modellt engedünk oda, ahol determinisztikus parse a
helyes válasz"* — a referencia-implementációban sérül.

### 2.3 Egy harmadik, közös alak

Mindkettő ugyanaz a minta, és ma egy harmadik is előkerült: a dokumentált
exponenciális backoffot a **fölötte lévő** rotációs réteg „várakozás nélkül"
megkerülte (3907 modellváltás, 2 ó 57 p, **0 feldolgozott lap**).

> **A dokumentáció mindhárom esetben igazat állít a saját rétegéről** — és a
> rendszer szintjén mégis hamis. A fegyelmet egy fölötte lévő réteg csendben
> hatástalanná teheti.

---

## 3. Az 1. szabály táblázata: nem cáfolt, de a tengelye kétértelmű

A saját kiinduló feltevésem — *„tiszta, digitális eredetű lapon az OCR elég
lesz"* — megbukott: 2832×4000-es, vektorból raszterizált, zajmentes lapon az
EasyOCR **0 hosszú ő/ű**-t adott 3026 karakteren, és nem elhagyta, hanem
**elrontotta** őket (`elhelyezkedó`, `külsó`, `utómü`).

**Ez a táblázat „Digitális PDF → modell kell? nem" celláját NEM cáfolja**, mert
a bemenetünk nem szövegréteges PDF volt, hanem JPG — funkcionálisan a
„Papír / szkennelt" sor. *(Ezt korábban pontatlanul fogalmaztam meg.)*

Amit viszont felfed: **a táblázat osztályozó tengelye kétértelmű.** A „digitális"
szó *eredetet* sugall, a magyarázat (`a meglévő szövegréteg`) *képességet* jelöl.
A helyes ismérv nem az eredet, hanem hogy **van-e kinyerhető szövegréteg**.

Két további árnyalás:

- A „Papír / szkennelt → **részben**" nem hordozza, hogy a modell itt **nem az
  elrendezésért, hanem a karakterhűségért** kell: az OCR szerkezetileg jó
  kimenetet adott, ami egy teljes karakter-osztályra nézve téves volt.
- **Egy bemeneti úton belül fázisonként más a válasz:** OCR (modell nem kell) →
  olvasás (kell) → javítás (**nem szabad**) → PDF-építés (nem kell). A táblázat
  bemenetenként egy igen/nem-et enged.

---

## 4. Javasolt minta-kiegészítések

Az ellenőrzés szerkezeti lyukat talált: **az M1–M9 a számla-könyvelésből, az
M10–M15 a fájl-felderítésből jön — egyik sem szól arról, honnan tudjuk, hogy az
OLVASÁS helyes.** M6 és M7 a legközelebbi, de mindkettő azt mondja, *mit kezdj* a
megbízhatatlansággal, nem azt, *hogyan állapítod meg*.

| Jelölt | Megfogalmazás | Bizonyíték |
|---|---|---|
| **M16** | **A kép minősége és a felismerő képessége két külön tengely.** Zajmentes, nagy felbontású lap nem bizonyítja, hogy a kiolvasás helyes; a **motor + korpusz párt** kell mérni, mielőtt a bemenetet „könnyűnek" minősítjük. | 2832×4000-es lapon 0 hosszú ő/ű, miközben a `hu_char.txt` mind a 18 ékezetes karaktert tartalmazza |
| **M17** | **A második olvasat csak akkor bizonyíték, ha független** — és a függetlenséget **modellenként** kell mérni, mert ugyanaz a csatolás az egyik modellen 4/4-ben ront, a másikon 0/4-ben. | az 1. pont ablációs mérése |
| **M18** | **A kontroll a korpusz saját statisztikája, nem a szabályom.** Hiba-detektorhoz a dokumentum-halmaz szógyakoriságát használd. | 21 hamis riasztás kézi mintákkal → 3 valódi adatvezérelten |
| **M20** | **A kapu ereje hibaosztályonként más — mondd ki, melyik osztályra véd.** | ékezet-hosszúságnál a normalizálás szerkezetileg zárja ki az új szót; karaktertévesztésnél nem véd (`mellé`→`mellő`), ott kétirányú korpusz-bizonyíték kell |

**Beolvasztható, ha a készletet szűken tartjuk:** *a javító lépés hordozzon
bizonyítható invariánst* (karakterszám változatlan, 0 új szó) — ez a 2. szabály
**mechanizmusa**, nem új elv; és *a fegyelmet egy fölötte lévő réteg csendben
kikapcsolhatja* (ld. 2.3) — ez inkább QUALITY-szintű.

**Nem javaslunk új mintát** a „két igazság ugyanarról" esetre (**ismétlés**, ez a
negyedik alkalom) és „a detektor is tévedhet" félre (**ismétlés**).

---

## 5. Két termékhatár, amit ki kell mondani

### 5.1 Korpuszból nőtt tábla: olvasáshoz igen, könyveléshez tilos

Az M5 szerint a megfeleltetési tábla *„kézzel bővül, és a jóváhagyásból nő"*.
A mai tévesztés-tábla (64 + 63 bejegyzés, 476 csere) **korpusz-bizonyítékból
nőtt, ember nélkül** — M5 kimondott mechanizmusán kívül.

> Ez **olvasáshoz** rendben van (nincs könyvelési következménye), **könyveléshez
> tilos**. Ha ugyanez a mechanizmus töltene `külső megnevezés → belső cikkszám`
> táblát, az statisztikából származó megfeleltetést vinne az auditált útra — a
> 2. és 3. szabály megkerülése.

A mechanizmus most már **létezik és csábító**, ezért a határt ki kell írni.

### 5.2 Ahol a kimeneti formátum nem tud jelölni, ott M6 nem kifejezhető

A kereshető PDF láthatatlan szövegrétegének **nincs csatornája**, amin
megbízhatósági szintet hordozhatna. Ezért a tudottan hibás maradékot (36 db
mediaevális `1`→`I`, néhány `ő`→`é`) a PDF **jelöletlenül** szállítja, miközben
a RAG-ban ugyanaz helyes. M6 hallgatólagosan feltételezi, hogy a formátum tud
jelölni — ahol nem tud, azt **ki kell mondani**, nem elhallgatni.

*(Következmény: a RAG↔PDF eltérés nem szűnt meg, csak szándékossá vált.)*

---

## 6. Ami a G3-döntéshez (portál-UI mint jóváhagyó felület) szól

A lánc két kimenete — kereshető PDF és RAG-export — **két különböző szövegből**
épült, hibaüzenet nélkül: a PDF a nyers OCR-blokkokból (`block.text`), a RAG a
javítottból (`beautified_text`).

> **M9 (a jóváhagyó felület a forrás-igazság) csak akkor tartható, ha minden
> downstream artefaktum UGYANABBÓL a mezőből épül** — és ezt tesztnek kell
> kikötnie. Ma egy működő láncban bizonyítottan nem így volt.

A DC-04 kötelező lépésszám-mérése mellé ezt is ki kell kötni.

---

## 7. Amit NEM mértünk — tételesen

1. **Az 1. pont általánosíthatóságát:** egy motor (`easyocr` / `latin_g2`), egy
   nyelv, két testvérkönyv. Nincs kontroll másik OCR-motorral ugyanazon a lapon.
2. **A karaktertévesztés-kapu hamis-negatív oldalát:** 3788/3892 valódi alak
   védve — arra nincs szám, **hány valódi hibát hagyott bent**.
3. **A token-limitet** (csak a kérés-keretet mértük).
4. **A kinyert szöveg tartalmi helyességét:** minden kapunk darabszámot és
   szerkezetet mér. Egyetlen lap átiratát ellenőriztük emberi olvasással.
5. **A `--mode INDEX` (Chroma) fázist** — a RAG-export készen áll, indexelve nincs.
6. **Az ábrafeliratok elvesztésének mértékét:** tudjuk, hogy a `canvas_size: 1280`
   melletti 3,12× kicsinyítés ~9 px-re viszi őket (a `min_size: 10` alá), de nem
   számoltuk meg, hány felirat esik ki.

---

## 8. Kérdések a rootnak

1. Elfogadható-e a négy minta-jelölt (M16–M18, M20), vagy szűkebb készletet
   akarunk? A 4. pont tartalmazza a beolvasztási javaslatot is.
2. A `terminals/doccapture/CLAUDE.md` két állítása (2.1, 2.2) **mérve hamis** a
   hivatkozott motorra nézve. Javítsuk a CLAUDE.md-t, vagy a motort?
3. Az 1. szabály táblázatának tengelyét pontosítsuk-e („van-e kinyerhető
   szövegréteg" az „eredet" helyett)?
4. Az 5.1 termékhatár (korpuszból nőtt tábla könyveléshez tilos) bekerüljön-e
   az ADR-071-be, vagy külön ADR-t érdemel?
