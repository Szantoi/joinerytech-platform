# DOC-CAPTURE — tételes átvételi leltár a forrás-projektekből (2026-07-30)

> **Miért létezik:** Gábor kérdése — *„az eredeti repókból mit veszel át?"*
> Eddig csak szeletenkénti említések voltak, tételes leltár nem. Ez a dokumentum
> **mérve** mondja meg, mi van a forrásban, mi került már át, mi van hátra, és
> **mit nem viszünk — indokkal**.
>
> **Mérés módja:** fájl- és sorszám-számlálás az **élő** fán, függvény- és
> osztály-leltár, minta-keresés. A `.claude/worktrees/agent-*` másolatok
> **kizárva** (régebbi logikát tartalmaznak).
>
> ⚠ **A forrás-projektek nem publikusak, ez a dokumentum viszont publikus repóba
> kerül.** Ezért itt **nincs** abszolút útvonal, cégnév, cél-rendszer-név és
> mezőnév-idézet; a függvény-nevek megnevezése funkció szerint történik.

---

## 0. Három mérési korrekció, mielőtt bármit átveszünk

### K1 — A „19 teszt-fájl" is felfújt szám: a valódi **16**

| Verzió | Szám | Mi volt a hiba |
|---|---|---|
| eredeti | 46 | a 3 worktree-másolat is beszámolva |
| root javította (07-29) | 19 | a worktree-k kivéve — de… |
| **most, mérve** | **16** | …a 19-ben **3 `scratch/` szkript** is benne volt |

A három `scratch/`-fájl `test_` előtaggal kezdődik, de **egyikben sincs
`unittest`, `pytest` vagy `def test_`** (mérve: 0/0/0). Kézi kísérleti
szkriptek, nem tesztek. **A motor valódi teszt-fájl száma 16.**

> Ez ugyanannak a számnak a **harmadik** korrekciója. A tanulság nem az, hogy
> „számoljunk jobban", hanem hogy **a másodkézből vett szám is mérendő** — a 19
> már egy javítás eredménye volt, és mégis hibás.

### K2 — ⚠ **A `tartalom_mentes` élő API-kulcsokat tartalmaz** (eszkalálva)

Minta-kereséssel mérve, **532 fájl átvizsgálva**. ⚠ **Ez a szakasz javított
számot tartalmaz:** az első mérésem **2** kulcsot talált, a javított minta **3**-at.

| Hely | Minta | `sha1(a teljes illeszkedő részlet)` előtag |
|---|---|---|
| `scratch/` kísérleti szkript | modell-szolgáltatói kulcs (A) | `144025331d` |
| `scratch/` kísérleti szkript | modell-szolgáltatói kulcs (B) | `e0a994e4cf` |
| gyökér-beállításfájl (`settings.json`) | **ugyanaz a (B) kulcs** | `e0a994e4cf` |
| gyökér-adatfájl (`.json`) | **ugyanaz a (B) kulcs** | `e0a994e4cf` |
| `.mcp.json` (JSON-konfig) | **kereső-szolgáltatói kulcs (C)**, 31 karakter | `cefeb3edee` |

**A (B) kulcs három helyen ugyanaz — és az egyik a futó alkalmazás
beállítás-fájlja. Vagyis ez nem „egy régi kísérletben maradt kulcs", hanem
élő hitelesítő.** *(A hashelt bemenet megnevezve: a teljes illeszkedő részlet —
így nem lesz belőle „három külön lelet" egy kulcsból.)*

**A (C) kulcsot az első mérésem NEM találta meg**, és az ok tanulságos: a root
ugyanezen a napon mérte ki, hogy a platform szivárgás-kapuja **vak a JSON
`"kulcs": "érték"` alakra** (az idézőjel beékelődik a kulcs és a `:` közé) és a
**`UPPER_SNAKE=érték`** alakra. **Pontosan ez a két vak pont volt az én
mintámban is.** A root leletét a saját eszközömre alkalmazva került elő a (C).

⚠ **A (C) NEM azonos a root által a platformban talált kereső-kulccsal:** ugyanaz
a hashelt bemenet (a `BRAVE_API_KEY` értéke), de `cefeb3edee` ≠ `061ddd503f` —
**két külön kulcs**.

**Egy hamis pozitív, kimondva:** egy negyedik találat egy dokumentációs
példasorban állt (`ANTHROPIC_API_KEY=your…`, 17 karakter) — **helyőrző, nem
titok**.

A repó **nem publikus**, tehát ez nem publikus szivárgás. De: **ebből a repóból
emelünk át kódot egy PUBLIKUS repóba.** A rotáció Gábor döntése; a
`scratch/` és a beállításfájlok **átemelési tilalom** alá esnek (ld. §3).

### K3 — A publikus repókban **nincs** szivárgás (a találat hamis pozitív)

Ugyanaz a keresés a három doccapture-repón: **egy** találat, a motor
`tests/test_config.py`-jában — `access_token = "nem-kerulhet-lemezre"`. Ez a
**titok-kapu tesztjének fixtúrája**, magyar szöveggel, nem hitelesítő.

> Kimondom, mert könnyű lett volna „4. szivárgásként" jelenteni: **a detektorom
> hamis pozitívot adott, épp azon a teszten, ami a kaput bizonyítja.**

⚠ **Amit a K3-ról ki kell mondani, hogy ne legyen belőle túlállítás.** A „nincs
szivárgás" két mérésen áll, és a kettő **nem egyformán erős**:

| Mérés | Erő |
|---|---|
| szolgáltatói **literál** minták (`sk-ant-…`, `AIza…`, `BSA…`, `gh?_…`) | **megbízható** — a formátum kötött |
| **általános** `kulcs = érték` minta | ⚠ **nem megbízható** — ld. lent |

Vagyis a helyes állítás: **a publikus doccapture-repókban nincs
szolgáltatói-formátumú kulcs.** Egy nem-szabványos alakú titok (saját formátumú
jelszó, kapcsolati sztring) **elvileg elkerülhetné** a mérést. Ez nem
elhanyagolható, csak nincs rá jelenleg jelzés.

**Miért nem megbízható az általános minta — mérve.** A root vak-pontjait
kijavítva (idézőjel nélküli érték is illeszkedjen) a minta **túlkorrigált**:
onnantól **minden `x = Azonosító` sorra** illeszkedik. A platform követett
fájljain **37 találatot** adott, és a mintavételezett **10 mind hamis pozitív**
volt — köztük `public class RefreshTokenConfiguration : IEntityType…` és
`const token = generateTerminalToken(terminal)`.

**A saját pozitív kontrollom túl szűk volt:** négy változó-hivatkozás-alakot
próbáltam (`os.environ[…]`, `process.env.X`, `${…}`, `credential_env={…}`), és
**mind a négy véletlenül elkerülte ezt a hibamódot**. A kontroll akkor kontroll,
ha a **valódi kódbázison** is lefut — ez most véletlenül történt meg, és azonnal
kiderült.

**Van-e használható érték-alak szűrő? Mérve, nem tippelve.** Kinyertem a
platform követett fájljaiból **4 025 valódi, 20+ karakteres azonosítót**:

```
valodi azonositok entropiaja : min 2,59 · median 3,80 · 95%: 4,36 · MAX 4,69
a harom megtalalt titok      : 4,76 · 4,86 · 5,38
atfedes                      : 0
MARGO                        : 4,76 - 4,69 = 0,07 bit/karakter
```

A legnagyobb entrópiájú valódi azonosítók **hosszú teszt-metódusnevek**
(`From_WithKeyExceeding500Chars_ShouldThrowArgumentException` — 4,69).

**Következtetés:** egy tiszta entrópia-kapu ezen a korpuszon **0 hamis
pozitívot** adna — de a margó **0,07 bit/karakter**, vagyis **egyetlen hosszabb
teszt-metódusnév átlépheti**. Tehát az entrópia önmagában **nem biztonságos
kapu**. A járható tengely valószínűleg **szerkezeti**: a valódi azonosítók
`_`/nagybetű-határon **angol szavakra bomlanak**, a kulcsok nem. Ezt nem mértem
ki — átadom a kapu gazdájának.

---

## 1. `tartalom_mentes` — a hexagonális motor (6 197 sor `src/`, 16 teszt-fájl)

### 1.1 Mag — **átemelve, általánosítva** (DC-00)

| Forrás | Cél | Mit változtattunk, és miért |
|---|---|---|
| `core/models.py` | `core/models.py` | a bizonytalanság + bizonyíték-lánc **invariánssá** vált (a modell kikényszeríti) |
| `core/config.py` | `core/config.py` | gyártó-nevű kulcsok → `adapter_options`; **titok soha nem tárolható** |
| `core/errors.py` | `core/errors.py` | átmeneti/végleges szétválasztás **domain-döntésként** |
| `core/ports.py` | `core/ports.py` | gyártó-nevek kivezetve; a **számla-port kimaradt** (G1) |
| `core/utils.py` (40 sor) | *szétosztva* | `is_transient_error` → `errors.py`; a kép-útvonal-feloldás **infrastruktúra**, nem mag |

### 1.2 Fázisok (`usecases/`, 767 sor) — **hátra van, szeletekre bontva**

| Forrás | Sor | Hova tartozik | Mit kell vele tenni |
|---|---|---|---|
| `extractor.py` | 252 | **DC-01** | a szövegréteg/raszter útválasztás; a `.pdf` ma **feltevés** — meg kell nézni, van-e szövegréteg |
| `reviewer.py` | 131 | **DC-01** | a bizonytalan darabok emberhez irányítása |
| `beautifier.py` | 148 | **DC-01** | szöveg-tisztítás; ⚠ **modell-hívás lehet benne** → G4-kapu alá kell vinni |
| `builder.py` | 32 | **DC-01** | kereshető dokumentum láthatatlan szövegréteggel |
| `index_rag.py` | 120 | **DC-03** | a chunk-olás és indexelés |
| `rag_query.py` | 84 | **DC-03** | keresés |

### 1.3 Adapterek (`infrastructure/`, 1 563 sor)

| Forrás | Sor | Szelet | Megjegyzés |
|---|---|---|---|
| `ocr_easyocr` · `ocr_paddle` · `ocr_surya` · `ocr_trocr` | 317 | **DC-01** | **négy** felismerő ugyanahhoz a porthoz — ez erő, nem redundancia: a `RasterTextReader` cserélhetőségét bizonyítja |
| `ocr_ensemble` | 49 | **DC-01** | a négy összevetése; a redundancia itt **ingyen ellenőrzés** (M3) |
| `pdf_reportlab` | 95 | **DC-01** | láthatatlan szövegréteg |
| `md_chunk_parser` | 264 | **DC-03** | a legnagyobb adapter; a chunk-határok üzleti döntést hordoznak |
| `chroma_vector_store` | 98 | **DC-03** | ⚠ a `SearchIndex` port mögé; a Nexus a másik jelölt |
| `storage_json` | 60 | **DC-01** | **atomikus mentés mérve megvan** benne: tmp + `fsync` + `os.replace`. Ezt **változtatás nélkül** át kell venni — drágán megtanult minta. ⚠ **Zár nincs** benne, pedig a fegyelem-lista kér: hozzá kell tenni |
| `api_vision` | 206 | **DC-05** | ⚠ **ez az egyetlen adapter, ami a forrást KIENGEDI a telepítésből** → a G4-kapun (`assert_external_processing_allowed`) át kell mennie |
| `handwriting_detector` | 95 | **DC-05** | kézírás-jelenlét felismerése |
| `invoice_extractor` | 124 | **NEM JÖN** | **G1**: a bevételezés a gazda |
| `sqlite_invoice_store` | 155 | **NEM JÖN** | **G1**: ugyanaz |

### 1.4 Ami **nem jön** a motorba

| Forrás | Sor | Miért nem |
|---|---|---|
| `frontend/` (20 fájl) | 1 335 | **G3: portál-UI.** Egy önálló kezelőfelület a motorban a portál-döntéssel **két igazságot** csinálna a jóváhagyásból. A motor kontraktuson át beszél. |
| `backend/cli.py` | 232 | a szolgáltatás-alak a modul-repóé (DC-02); a **fázis-vezérlés mintája** viszont hasznos |
| `backend/pipeline_service` · `profile_service` · `version_service` | 179 | ugyanaz — a verziózást a mi `Directory.Build.props`/`pyproject` már megoldja |
| `scratch/` (3 szkript) | 80 | ⚠ **kulcsot tartalmaz** (K2) + abszolút útvonalat + iparági megnevezést. **Átemelési tilalom.** |
| `settings.json`, gyökér-adatfájlok | — | ⚠ **kulcsot tartalmaz** (K2). **Átemelési tilalom.** |
| `invoice_extractor` + `sqlite_invoice_store` | 279 | **G1** |

**Összesen nem jön: 1 873 sor** a 6 197-ből (30%) — és ennek a nagyobb része
(`frontend/`) nem hiba, hanem **határ**.

---

## 2. `Bevetelezes` — az éles munkafolyamat (2 615 sor, 4 fájl)

### 2.1 ⚠ A prototípusban **KÉT igazság** van az oszlop-térképezésre

Ezt a DC-01b tervdokumentumában **rosszul írtam le**, és most javítom:

| Fájl | Hogyan old fel oszlopot |
|---|---|
| `bevetelezes_feldolgozas.py` (220 sor) | **beégetett index** (`cell(r, 2)`, `cell(r, 4)`) |
| `bevetelezes_ocr.py` (1 488 sor) | **fejléc-alias szerint** (`_resolve_cols` + alias-térkép), **beégetett indexre visszaesve**, ha nem talál |

**A fejlettebb fájl tehát már azt csinálta, amit én „általánosításként" építettem.**
A tervdokumentumban a **rosszabb** fájlt idéztem „a prototípus így csinálta"
felirattal. Ez az „ismerős minta ≠ bizonyíték" hibám: feltettem, hogy a
prototípus **egységesen** beégetett indexet használ.

**Amiben a mi változatunk mégis javítás — és ez mérhető:** a `_resolve_cols`
fallback-ja `idx or ALAPÉRTELMEZETT_INDEX`, vagyis **egy átnevezett vagy hiányzó
fejléc esetén nem bukik el, hanem csendben visszaesik egy pozícióra**. Ez pontosan
a néma rossz-oszlop-betöltés — ugyanaz a minta, mint a `process.env.X || '<literál>'`
titok-fallback: **néma visszaesés a rosszabb forrásra.** A mi implementációnk
ilyenkor kötelező oszlopnál elbukik, nem kötelezőnél **kimondja**.

### 2.2 ⚠ **A prototípus KIÉRTÉKELI a képletet — és pont azt a problémát kerüli meg, amit én megtaláltam**

A `bevetelezes_ocr.py` szándékosan **gyorsítótár-mód NÉLKÜL** olvassa a
megfeleltetési táblát, és a képletszöveget **kiszámolja** (aritmetikára szűkített
kifejezés-kiértékelés). Az indoklása a kódban áll, és **helyes**: az átváltó
szorzó a táblában képlettel is meg lehet adva, és mentés után a **képlet
gyorsítótára elveszhet, de a képletszöveg megmarad**.

**Ez ugyanaz a probléma, amit a DC-01b-ben D4 néven megtaláltam — két
ellentétes válasszal:**

| | Prototípus | A mi motorunk (ma) |
|---|---|---|
| olvasás | képlet-mód, **kiértékel** | gyorsítótár-mód, **nem értékel ki** |
| eredmény | **megvan az érték** | **hiány, kimondott indokkal** |
| M11 (nincs aktív tartalom) | **sérül** | teljesül |
| determinizmus | tiszta aritmetikára megmarad | megmarad |
| DC-04 használhatóság | ✅ | ⚠ **az átváltó szorzó elveszik** |

**Ez termékdöntés, nem implementációs részlet** — ezért felviszem (ld. §4/D1).
Az átváltó szorzó a jóváhagyási hurok **magja**; ha ott hiányt adunk, a DC-04
nem tud dolgozni.

### 2.3 Mit veszünk át tételesen — funkció szerint

| Funkció-csoport a forrásban | Szelet | Miért ez a legértékesebb rész |
|---|---|---|
| **jóváhagyási hurok** (javaslatok jóváhagyása + a megfeleltetési tábla bővítése) | **DC-04** | ez a termék magja; **a G3 után a felület portál-UI, de a mechanika ez marad** |
| **redundancia-ellenőrzés** (mennyiség × egységár = tétel-érték; adóalap × kulcs = adó; visszaszámolás a bruttóból) | **DC-04** | M3: ingyen ellenőrzés, és a **hiba visszafejthető** abból, melyik egyenlőség bomlik el |
| **hiba-diagnózis** (melyik mező a hibás) | **DC-04** | nem jelöl „valami rossz"-at, hanem megmondja, **mi** |
| **párosítás** (kód-kompatibilitás, karakter-helyettesítés, halmaz-hasonlóság, jelölt-lista) | **DC-04** | **determinisztikus, nulla modell-hívás** — a G2 eladási érve élesben |
| **mennyiség-átváltás** (szorzó + belső mértékegység) | **DC-04** | M15: az egység megőrzése, a konverzió **naplózott** |
| **szám-parse** (mennyiség, összeg, tizedes-hiány kezelése) | *részben megvan* | a DC-01b-ben újraírva, **locale-mentesen** — a prototípus itt beégetett formátumot használ |
| **horgony-fél felismerés** (melyik fél vagyunk mi) | **DC-04** + DC-01 | M1: **stabil azonosítóval**, nem névvel |
| **javítás-visszaolvasás** (a kézi korrekciók újra-beolvasása) | **DC-04** | ⚠ **ez a jóváhagyási hurok korai alakja**, és eddig nem volt nevesítve a mintáink között |
| **fájlnév-képzés + ékezet-kezelés** | DC-01 | M8: **másolaton** dolgozik, az eredeti érintetlen |
| **bélyegző-detektálás** (kép alsó sávjának tinta-aránya) | **DC-04** | egyszerű, determinisztikus jelzés — nem modell |
| **cél-rendszer-specifikus kimenet + szétbontás** | **DC-04** | ⚠ **általánosítandó**: a cél-rendszer **paraméter** |

### 2.4 Ami **nem jön** a bevételezésből

- **Minden cél-rendszer-, cég- és mezőnév** → konfiguráció (a semlegességi kapu
  a motor-repóban ezt gépileg őrzi; a bevételezés-repóban az iparági szótár
  megengedett, az **ügyfélnév és a cél-rendszer neve nem**).
- **A kifejezés-kiértékelés `eval`-alapú megvalósítása** → ha a §4/D1 döntés az
  „igen", akkor **saját, `eval`-mentes** aritmetikai kiolvasóval, mert az `eval`
  még szűkített névtérrel is olyan minta, amit egy publikus termékben nem
  vállalunk.

---

## 3. Átemelési tilalmak — gépi kapunak kell mérnie

| Tilalom | Miért | Hol áll ma |
|---|---|---|
| `scratch/` és a gyökér-beállításfájlok | **élő kulcsot tartalmaznak** (K2) | ⚠ **nincs kapu** — ma figyelem őrzi |
| `.claude/worktrees/agent-*` | régebbi logika; aki innen emel, **csendben visszalép egy verziót** | ⚠ **nincs kapu** |
| cél-rendszer/cég/mezőnév | a termék egyetlen ügyfélnél lenne használható | ✅ **semlegességi kapu** (mérve: a bevételezés-repó a motor szigorú configjával `exit 1`) |
| titok bármely alakban | publikus repók | ✅ config-kapu + frontend szivárgás-kapu |

**Javaslat:** a felső két tilalom is legyen **kapu**, ne figyelem. A minta-kereső,
amivel a K2/K3 mérést végeztem, ennek az alapja lehet — de a hamis pozitívot (K3)
előbb kezelni kell, különben zajos lesz és kikapcsolják.

---

## 4. Amit ez a leltár felvisz döntésre

### D1 — ⚠ **Kiértékelhet-e a motor képletet?** (Gábor-döntés, a DC-04 előtt)

A prototípus **igen**-t válaszolt, és élesben működik; a mai motorunk **nem**-et,
és attól **elveszik az átváltó szorzó**, ami a jóváhagyási hurok magja.

**Javaslatom — a harmadik út:** a motor **nem futtat** aktív tartalmat (M11
marad), de a képletszöveget **saját, `eval`-mentes, tisztán aritmetikai
kiolvasóval** feldolgozhatja, ha a config kimondottan engedi. Az eredmény
**`NEEDS_REVIEW`**, nem `CONFIRMED`, és a diagnosztika **kiírja a képletszöveget**.
Így: az érték nem veszik el · a determinizmus megmarad (tiszta aritmetika ma és
holnap ugyanaz) · a bizonytalanság **jelölt** · és nem futtatunk makrót, külső
hivatkozást vagy lekérdezést.

### D2 — Melyik vektortár a `SearchIndex` mögött? (DC-03)

A prototípus egy konkrét beágyazott tárat használ; nálunk a **Nexus RAG** is
jelölt. Két igazság kialakulásának a szaga van — **egy gazda kell**.

### D3 — A négy felismerő közül melyik marad? (DC-01)

A prototípusban **négy** felismerő + egy összevető van. Termékként ez
telepítési teher; **de az összevetés adja a redundancia-alapú ellenőrzést**.
Javaslat: a portot **négy** adapter szolgálja ki, de a **telepítés
konfigurációja** döntse el, melyik fut — ne a kód.

---

## 5. Amit NEM mértem ebben a leltárban — kimondva

1. **A fázisok belső logikáját nem olvastam végig** (767 sor `usecases/`).
   A szelet-hozzárendelés a fájlnevek, a portok és a függvény-leltár alapján
   készült — az **átemelés közben** kiderülhet, hogy valami máshova tartozik.
2. **Nem mértem, hogy a `beautifier.py` tényleg hív-e modellt.** Ha igen, a G4
   kapuja alá kell vinni. Ez feltevés, nem mérés.
3. **A prototípus tesztjeinek tartalmát nem vizsgáltam** — csak azt, hogy a
   16 fájl valóban teszt, a 3 `scratch/` pedig nem.
4. **A 4 felismerő pontosságát nem hasonlítottam össze.** A D3 javaslat a
   *cserélhetőségről* szól, nem arról, hogy melyik jobb.
5. **A minta-keresőm hamis pozitívot ad** (K3), és a lefedettségét nem mértem:
   nem tudom, **mit nem talál meg**. Kapuvá alakítás előtt ezt meg kell mérni.
