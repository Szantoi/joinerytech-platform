# DOC-CAPTURE Terminal TODO

> **Frissítve:** 2026-08-05 (DC-03a kész; a DC-03 célpontja mérve **nem befogadó felület**)
> **Részletes állapot:** [`STATE.md`](STATE.md) · **Epic:** `docs/tasks/EPIC-DOC-CAPTURE-2026Q3/README.md`

## 2026-08-05 — DC-03a: darabolás + bizonyíték-lánc (`review_requested`)

> Jelentés: `outbox/2026-08-05_001_dc03a-review-requested.md`
> Mért: suite **461** · körök **380 / 13 / 68** `KIHAGYVA=0` · mutáció **74/74**,
> 0 ÉRVÉNYTELEN, 0 NEM FOG · semlegesség/licenc/bináris **exit=0** · pin EGYEZIK ·
> a futás után a fa **tiszta** (0 `MUTACIO`-nyom; `git status` = 12 módosított + 17 új út).

- [x] **A DC-03 CÉLPONTJA MÉRVE — és nem az, aminek a doksi írja.** A Nexus KS-en
      **101** MCP-eszközből **0** fogad tartalmat, és a `POST /api/knowledge/index`
      a **kérés-törzset figyelmen kívül hagyja** (`_req`) — a saját
      `docs/knowledge/**/*.md` fáját olvassa újra. Vagyis **önmagát indexelő
      szolgáltatás**, nem befogadó felület. A Doorstar faipari RAG 1. fázisa ezt
      nem cáfolja: az ingest a **KS folyamatán belül** futó szkript volt, ami
      közvetlenül az `addChunks`-ot importálta. **Ez nem szerződés.**
- [x] **Szeletelve** (a DC-01/DC-02 precedensével): **DC-03a** determinisztikus,
      nulla új függőség, nulla hálózati határátlépés — a **teljes szelet az 1.
      körben mérhető** (+42 teszt mind ott). A **DC-03b BLOKKOLT**, root-döntésre vár.
- [x] **A célpont három hibája a saját oldalunkon megelőzve:** (1) néma eldobás
      → a `ChunkOptions` **tartalmazza a célpont küszöbét**, és elutasítja azt a
      beállítást, ahol a saját minimumunk nem nagyobb nála; (2) futás-globális
      darab-azonosító → nálunk `dokumentum#lap#sorszám`, teszttel **és** mutációval;
      (3) memóriába eső tartalék sikernek látszik → a DC-03b kapu-követelménye
      előre kimondva: **visszaolvasás**, nem a hívás visszatérése.
- [x] **A port kettévált** (`ChunkSink` írás + `SearchIndex` olvasás), kimondva:
      egy port, ami **hazugságra kényszeríti** a megvalósítót (részlánc-keresésre
      `score=1.0`), tervezési hiba. Az `add` visszatérése `None` → `IndexWriteReport`.
- [x] **Megmaradás-törvény, három KÖZVETLENÜL számolt taggal** (egyik sem
      kivonással) + **kém-teszt a bekötésre** mindkét oldalon.

### ⚠ A `mutation_check` mérgezése TÚLÉLTE A SESSIONT — a tegnap ELŐRE LEÍRT kár

- [x] Ma reggel a suite **két teszten piros** volt **bájtra tiszta** fán; a bukás
      alakja **pontosan** a tegnapi „nem fedett karakter" mutáció hatása
      (`written` 2 lett 1 helyett). `__pycache__` törlés után ugyanaz a kód zöld.
- [x] **Ez a tegnapi TODO „harmadik, ma nem látott" kára** — ma megtörtént.
- [x] **A gyökér-ok NINCS megállapítva**, a család igen: a célzott purge csak a
      mutált fájlt takarítja, és **csak ha a futás eljut a visszaállításig**.
- [x] **Javítva:** `purge_all_pycache()` a futás **elején és végén** (mérve: 79 / 21
      fájl). ⚠ Rootra tartozik: az eszköz a .NET modul-repót is kiszolgálja.

### ⚠ A semlegességi kapu VAKFOLTJA — MEGMÉRVE ÉS MEGJAVÍTVA

- [x] A kapu **elkapta** a `joinerytech` márkanevet a design-doksimban (javítva:
      a célpont neve/útvonalai/leletei **nem kerültek a publikus fába** — azok a
      jelentésben állnak, a mailboxok gitignore-oltak).
- [x] ⚠ **De `Doorstar`-t is írtam, és azt a kapu ELVILEG SEM foghatta:** a
      `neutrality.json` **kimondja**, hogy ügyfélnevek szándékosan nincsenek a
      listán, a helyettük kínált `neutrality.local.json` pedig **mérve NEM
      LÉTEZETT** — a dokumentált védelem **nem volt hatályban**, és a kapu közben
      **zölden futott**.
- [x] **MEGJAVÍTVA** (a `tools/` a root döntése szerint ezé a terminálé):
      (1) **lenyomat-alapú ág** (`forbidden_hashed`, szó-tokenre SHA-256) — a CI
      is véd, a név nem áll a repóban; (2) **`NEUTRALITY_EXTRA_WORDS`** CI-titokból
      (az erősebb út: a repó semmit nem hordoz); (3) ⭐ **a kapu MINDEN futáskor
      kiírja, melyik forrásból hány szó jött** — `neutrality.local.json: NINCS
      (0 szo)`. *Pontosan ez hiányzott: a nulla is szám.* (4) **szentinel-lenyomat
      pozitív kontrollként** a követett configban, teszttel kikötve, hogy tényleg
      a szentinelé; (5) ⚠ **a rejtett találat NEM írja ki a sort** — publikus
      repónál a CI-napló is publikus, tehát a hibaüzenet kiadná, amit a lenyomat
      elrejt. **Mutáció őrzi.**
- [x] ⚠ **A kapunak EGYÁLTALÁN NEM VOLT TESZTJE** — a DC-00 óta minden körben
      „TISZTA"-t jelentett, nulla teszttel, miközben a `license_guard`-nak van.
      **A „TISZTA" pontosan úgy néz ki, mint az „el sem indult".** Pótolva:
      `tests/test_neutrality_guard.py`, **13 kapu**.
- [ ] **Root-döntés marad:** felvegyük-e a valódi ügyfélnevek **lenyomatát** a
      követett configba (gyenge titok, szótár-támadható), vagy maradjon minden a
      CI-titokban? A mechanizmus mostantól **mindkettőt** tudja.

### Három saját pontatlanság, amit a felülvizsgálat talált — javítva

- [x] ⚠ **Az átfedés-politika határonként MÁST jelentett:** hosszú fragmens
      vágása után nulláztam az átfedést, máshol vittem — **két igazság ugyanarról
      a szabályról**, ami sehol nem bukott volna el. Teszt + mutáció.
- [x] ⚠ **A docstringem nem egyezett a saját tesztemmel** (az abszolút-út kapunál
      „az UNC-ot nem fogja meg", miközben a teszt bizonyítja, hogy megfogja).
      A **docstringet** igazítottam a mért valósághoz, és kimondtam, mi megy át.
- [x] A README-példa hiányos importtal állt.

### Kimondott korlátok (a `not_covered`-ben is)

- [ ] **A `target_drop_threshold` ÁLLÍTÁS, nem mérés** — a célpont forrásából jön.
      A 3458-as tunnel le van bontva (`curl` → `000`). A DC-03b-vel **mérendő**.
- [ ] **Az atomikus mentés mutációra nem érzékeny**; a **LOST UPDATE két processz
      között** áll — a zár csak **folyamaton belül** véd.
- [ ] **Nincs szemantikus darabolás** (a mondathatár nyelvfüggő lenne) ·
      **nincs publikált séma + pin** az exportra (a fogyasztó nem dőlt el) ·
      **a hasáb SZÉTVÁGÁSA (M2) továbbra sincs** — de a **jelzés mostantól
      eljut a fogyasztóig** · **teljesítmény nincs mérve**, a nyelő a teljes
      tárat memóriában tartja.

## 2026-08-04 — DC-01b-write: a fail-closed betűtípus-kapu (RÉSZSZÁLLÍTÁS)

> ⚠ **Nem `review_requested` a szeletre**: a `DC-01b-write` háromból egy darabja
> kész. Jelentés: `outbox/2026-08-04_001_dc01b-write-betutipus-kapu-reszszallitas.md`
> ⚠ **Azonosító:** a kanonikus id az `EPICS.yaml`-ból **`DC-01b-write`** — a régi
> `DC-01b` (Excel/CSV-betöltő) ott már **`DC-EXCEL`**. A README-ben a címke még ütközik.

- [x] **A mérésből nem lett két példány.** A betűtípus-fedés mérése eddig **csak**
      a `tools/binary_guard.py`-ban élt: *a kapu meg tudta mérni a betűtípust, a
      termék nem.* A mérés a szállított csomagba került
      (`infrastructure/fonts.py`), a **politika** a magba (`core/font_options.py`),
      és a kapu onnan importál. A csere után a kapu **ugyanazt a 90 karaktert**
      méri (0 hiányzik, `fsType=0`) — a követelmény tartalma bizonyítottan nem változott.
      ⚠ A közös implementáció kockázata (kapu és termék EGYÜTT téved) ki van
      mondva; az ellensúlya a **pozitív kontroll**.
- [x] **Négy hibaalak, négy külön üzenet** — és a negyediket a terv nem tartalmazta:
      **nulla megmért karakter** (*üresen zöld*). Az érvénytelen mérés **előbb**
      dönt, mint a fedés: ha a mérőeszköz nem megbízható, a „fedve van" sem az.
- [x] **Konfigurálható felülírás, csendes visszaesés NÉLKÜL.** Hiányzó felülírásnál
      nincs visszaesés a szállítottra — az zöld tesztet adna, miközben a kimenet
      **más betűtípussal** készülne, mint amit kértek.
- [x] Mért: suite **382** · körök **324 / 13 / 45** `KIHAGYVA=0` · mutáció **43/43**,
      0 ÉRVÉNYTELEN · semlegesség/licenc/bináris TISZTA · pin EGYEZIK.

### ⚠ A `mutation_check` MEGMÉRGEZI A MUNKAFÁT — mérve és REPRODUKÁLVA

- [x] **Javítva** (`tools/mutation_check.py`), de a lelet rootra tartozik: az
      eszköz a docstringje szerint a **.NET modul-repót** is kiszolgálja.
- [x] **A mechanizmus:** a Python a `.pyc` érvényességét a forrás **mtime**-jából
      és **méretéből** dönti el. A cserélő szöveg gyakran **pontosan ugyanolyan
      hosszú** (`if coverage.missing:` → `if False:  # MUTACIO`, mindkettő 28
      karakter), és a visszaállítás ugyanabba az mtime-ütembe esik → a **mutált
      bájtkód érvényes marad a visszaállított forráshoz**.
- [x] **Két mért kár:** (1) az első futás `37/37` **+ 6 ÉRVÉNYTELEN** — az azonos
      hosszú mutáció után minden következő pont mérgezett alapállapoton indult;
      (2) a futás után a **forrás tiszta**, a **bájtkód mutált**, és a suite
      **4 teszten piros** — a fejlesztő a saját kódját kezdi keresni.
- [x] **A harmadik kár, ma nem látott:** fordítva is működik — ha a mutált futás
      egy korábbi `.pyc`-t használ, a mutáció **le sem fut**, és a verdikt
      „NEM FOG" lesz. Egy mérés, ami semmit nem mért.
- [x] ⚠ A `_apply_create` ág ezt a leckét **már ismerte**; a csere-ágon azért
      maradt láthatatlan, mert ott a fájl **jogosan létezik**.

### A DC-01b-write BEFEJEZVE — `review_requested`

> Jelentés: `outbox/2026-08-04_002_dc01b-write-review-requested.md`
> Mért: suite **405** · körök **324 / 13 / 68** `KIHAGYVA=0` · mutáció **53/53**,
> 0 ÉRVÉNYTELEN · semlegesség/licenc/bináris TISZTA · pin EGYEZIK (nincs séma-változás).

- [x] **ELTÉRTEM A TERVTŐL, mérés alapján: nem vettem fel három csomagot.** A terv
      `reportlab`+`pypdf`-et írt elő; a **már meglévő** olvasó a teljes írási
      láncot tudja, és a terv **minden** mért kritériumát teljesíti
      (egyenlőség 22/22 mindkét olvasóval · dx=0,24 dy=0,08 · szélesség 105,00 →
      105,00 · mód 3=INVISIBLE). A `reportlab` egy **licencelt bináris fontot**
      is hozott volna. ⚠ A terv mérése nem volt hibás — **másik utat** mért; a
      különbség a költségben van, és csak azért derült ki, mert a második utat
      **megmértem, mielőtt a tervet végrehajtottam volna**.
- [x] **A `pypdf` megmaradt — MÉRŐESZKÖZKÉNT** (a `packaging` besorolása): nincs a
      `pyproject`-ben, a CI telepíti, a `document` kör **pozitív kontrollal**
      ellenőrzi. ⚠ `skipUnless` nincs — a csendes kihagyás volt a hetedik CI-ok.
- [x] **A port-alak megváltozott, kimondva:** `build(pages, source_path,
      output_path) -> SearchableBuildReport`. A `source_path` az M8 miatt kell
      (mérve: a forrás sha256-ja változatlan); a jelentés azért, mert a némán
      kihagyott adat elveszik (`written + skipped == bemenet`, teszttel kikötve).
- [x] **A délelőtt KIMONDOTT hiányom lezárva:** bizonyítva, hogy a
      `FontUnusableError` a kimeneti fájl **létrehozása ELŐTT** dobódik — bukásnál
      a fájl **nem jön létre**. Mutáció is őrzi.
- [x] **Fragmens-szintű fedés** (a tervben nem volt): a felismerésből jövő szöveg
      bármit tartalmazhat → **egy fragmens** kimondott kihagyása, nem az egész
      kimenet eldobása és nem néma elrontás.
- [x] **Pozíció-kapu a REJTETT réteg saját dobozán** (a terv `no-op` fatálisa
      ellen), két negatív kontrollal: eltolt **és** Y-tükrözött **bukik**.

### A `LicenseRef-PdfiumThirdParty` ÁTOLVASVA — és a mérőeszköz hazudott

- [x] ⚠ **A naiv részlánc-keresés HAMISAN RIASZT:** `MPL` **39 sor** → mind az
      **`IMPLIED`** szóból; `EPL` → `REPLACE`. Szóhatárral **0**. Ha nem nézek rá,
      egy „39 MPL-találat" jelentéssel álltam volna elő.
- [x] **0 copyleft**, 13 mintára, **pozitív kontrollal** igazolva (BSD 14,
      FreeType 37 — a keresés bizonyítottan fog). A 973 soros fájl komponensei
      nevesítve. A „másodkézből vett mérés" tétel **lezárva**.
- [x] **Újramérő kapu, nem hash-pin** (`tests/test_third_party_licenses.py`): a
      licenc a **verzió** tulajdonsága, tehát verzió-emelést **méréssel** kell
      eldönteni. Doksi: `docs/THIRD-PARTY-NOTES.md`.
- [x] ⚠ A `lcms` a fájlban **`lcms`** néven áll, nem „Little CMS"-ként — bukó
      teszt mondta meg. A javítás iránya: a **teszt elvárását** igazítottam a mért
      valósághoz, nem fordítva.

### Kimondott korlátok (a `not_covered`-ben is)

- [ ] **A terv három történeti hibaalakja (Helvetica/Vera) NEM állítható elő** ezzel
      az íróval — a két olvasós mérés a **saját írónk** kódolási hibáira áll őrt.
- [ ] **A copyleft-minta érzékenysége nem mutációzható** (0 találaton egy minta
      elhagyása sem változtat) — az erő a **pozitív kontrolltól** jön.
- [ ] **LOST UPDATE:** a név lefoglalása és a csere között elszálló futás nulla
      bájtos kimenetet hagy. A „ne írj felül" a versenyt **elkerüli**, nem oldja meg.
- [ ] Nincs betűtípus-subsetting (~226 KB) · képből nem csinál lapot ·
      elforgatott/vertikális/RTL nincs fedve · teljesítmény nincs mérve ·
      a `cmap`-olvasás BMP-re (`format 4`) szorítkozik.
- [ ] ⚠ **A CI-ba ÚJ LÉPÉS került** (a második olvasó telepítése) — a push utáni
      futást **meg kell nézni**, nem a YAML-ből ellenőrizni.

## 2026-08-03 — a CI zöldre vitele

- [x] **A 6. ok rendezve + egy HETEDIK, ami a listán nem szerepelt.**
      Commit `e598e7b`, CI-futás **`30839170389` = `completed success`**.
      Jelentés: `outbox/2026-08-03_001_ci-6-ok-rendezve-review-requested.md`
      (`review_requested`). Mért: körök **272 / 13 / 45**, mind `KIHAGYVA=0` ·
      suite **330** · mutáció **29/29**, 0 ÉRVÉNYTELEN · semlegesség TISZTA ·
      pin EGYEZIK · licenc-kapu TISZTA. **Mind a nyolc szám egyezik** a push
      előtt, tiszta venv-ben mért jóslattal.
- [x] **A hetedik ok:** a `test_a_kapu_ELBUKTAT_egy_VALODI_GPL_csomagot`
      `skipUnless`-e tiszta gépen **mindig kihagyott** (`skipped=1`), és a kör
      `KIHAGYVA=0`-t követel → a 6. javítása után is piros maradt volna.
      ⚠ **Egy környezet-függő kapunak két tünete van:** bukás, ha a hiányzó
      dolog kell a méréshez — és *kihagyás*, ha a mérés van hozzá kötve. A
      második csendesebb, és a bukás-üzenet mögé bújik.
- [x] **A három felkínált út premisszája megmérve, és egyik sem járható:** a
      motor teljes telepített láncán **nulla** extra-feltételű követelmény van,
      tehát a CI-n **egyáltalán nincs alkalmas valódi minta**. A választott
      negyedik út: a mintát **magunkkal visszük**
      (`tools/capture_requirement_shapes.py` → `tests/requirement_shapes.json`).

### Amit a CI-javítás NYITOTT

- [ ] **A rögzített minta elavulása nincs gépi kapun** — ha a valódi csomagok
      metaadat-alakja változik, azt semmi nem jelzi. Újra-rögzítés kézzel:
      `python tools/capture_requirement_shapes.py --write`. (Felvéve a
      `mutations.json` `not_covered` szakaszába.)
- [ ] **Minta-jelölt a többi repóra:** minden `skipUnless`, ami a *környezet*
      állapotát kérdezi, ugyanennek a javításnak a jelöltje.
- [ ] **A felhasználó-azonosító kapu csak a `Users/`+`home/` alakot ismeri** —
      UNC-út, gépnév, saját könyvtár nélküli felhasználónév **átmegy**.
      Kimondott korlát (`not_covered`), nem lefedettség.

## 2026-08-03 — GÁBOR-DÖNTÉS: betűtípus-politika ELDŐLT

- [x] **A DC-01b utolsó Gábor-kapuja eldőlt.** *LiberationSans OFL-1.1 alatt
      szállítva + konfigurálható felülírás; hiányzó/nem fedő font esetén
      **fail-closed** (`FontUnusableError` a kimeneti fájl létrehozása ELŐTT).*
      Indoklás a döntés része: az OFL engedi a beágyazást, és a beágyazástól
      **az ügyfél PDF-je nem lesz OFL-es** — a vevő kimenete licenc-mentes marad.
- [x] **Az előmunkálat elvégezve** (`584dd27`, CI `30843462605` = success).
      ⚠ **A terv állítása MÉRVE nem állt:** a `test_source_hygiene`
      abszolút-út-tiltása csak `*.py`-t olvas, a `.md`-t el sem nézi — tehát nem
      **ütközés** volt, hanem **rés**. Három vakfolt mérve, és mindhármat pont a
      font-dokumentáció alakja találja el: **backtick** (a markdown írásmódja),
      **`/usr/share`** (nincs az előtag-listán), **csupasz út**. Pusztán a
      fájlkör bővítése **üresen zöld** kaput adott volna.
      Mért: körök **279 / 13 / 45** `KIHAGYVA=0` · suite **337** · mutáció **31/31**.

### A betűtípus LESZÁLLÍTVA (`dda051b`, CI `30847058315` = success)

- [x] **A kiadás + ellenőrző-összeg rögzítve.** `liberation-fonts` **2.1.5**
      (2021-09-30), fájl-`sha256` `76d04c18…`, csomag-`sha256` `7191c669…`,
      OFL-1.1. Doksi: `docs/FONT-PROVENANCE.md` a motor repójában.
- [x] ⚠ **HELYESBÍTÉS: a `.gitignore` NEM tilt binárist.** Csak konkrét
      kiterjesztéseket sorol fel (`*.pdf`, `*.xlsx`, `*.jpg`, `*.png`) — ez
      **felsorolás, nem szabály**: `.ttf`/`.zip`/átnevezett minta **csendben
      bemegy** egy publikus repóba. **Nem kivételt kellett adni egy tiltás alól,
      hanem a hiányzó kaput megépíteni** — ellentétes irányú munka.
- [x] **`tools/binary_guard.py` + `binary_artifacts.json`** — deklarált
      engedélyező-lista: minden bináris SPDX-et, licenc-fájlt és eredetet kér.
      **Ez zárja be a licenc-kapu nem-pip vakfoltját is.**
- [x] **A betűtípus MÉRVE, nem feltételezve:** 90 karakter, 0 hiányzik ·
      hosszú ékezet megvan · **pozitív kontroll** (CJK helyesen hiányzik) ·
      `fsType=0`. A fájl *jelenléte* nem bizonyítja a *használhatóságát*.
- [x] **Csomagolás bizonyítva:** tiszta venv-be telepítve a font bájtra azonosan
      megérkezik a licenccel. Egy fájl a repóban nem csomag-tartalom.
      Mért: körök **296 / 13 / 45** `KIHAGYVA=0` · suite **354** · mutáció **35/35**.

### ⭐ Amit ebből tanultunk — a saját tesztjeimről

- [x] **Egy mutációm ÁTMENT:** a tesztjeim a mérő függvényt közvetlenül hívták,
      tehát a **mérés** helyességét bizonyították — azt **nem**, hogy a kapu az
      eredményt **fel is használja**. *A mérés és a DÖNTÉS két külön dolog.*
      Új `GateWiringTests` osztály; a mutáció azóta fog.
- [x] **Az új teszt valódi hibát talált a saját kapumban:** a mérő függvény a
      készletet **alapértelmezett argumentumként** kapta → a Python a
      **definíciókor** köti be, tehát a „konfiguráció" nem volt állítható.

### A DC-01b szeletből HÁTRAVAN

- [ ] **Konfigurálható felülírás** (az ügyfél saját, jogtiszta fontja).
- [ ] **Fail-closed `FontUnusableError`** a kimeneti fájl létrehozása ELŐTT.
- [ ] A `SearchableDocumentBuilder` port-alakja + a pozíció-kapu (±1,5 pt).
- [ ] **Nem fedett:** a licenc jogi értelmezése · a betűtípus vizuális minősége ·
      az OFL átnevezési kötelezettsége módosított származéknál (ma nem módosítunk).

## 2026-07-31 — ami MA zárult és ami ebből következik

- [x] **DC-01a (szövegréteg-olvasó geometriával) leszállt**, `review_requested`,
      a root **commitolta** (`327ba9f`, 26 fájl / 3264 sor). Mind a 9 leállási
      szám mérve: suite **326 OK** · három kör **295/13/18**, `KIHAGYVA=0` ·
      mutáció **26/26**, 0 ÉRVÉNYTELEN · x_right **3/3 egyezik** a könyvtárral.
      Jelentés: `outbox/2026-07-31_001_dc01a-review-requested.md`.
- [x] **Doorstar faipari RAG 1. fázis (vektor) ÉLES** — `doorstar-knowledge`
      **35 → 1998** dokumentum, MCP-n kereshető cím+lapszám attribúcióval.
      **APPROVED** (root saját VPS-méréssel, inbox 2026-07-31_002).

### Amit a DC-01a leszállása NYITOTT — rootra/Gáborra vár

- [ ] **A `mutation_check` a MÉRT fát írja → kizárás kell.** Egy egyidejű
      suite-futás a mutált állapotot látja; ingadozó bukást láttam (5 → 4 → 0),
      a mechanizmust azonosítottam, **öt kísérletből nem reprodukáltam**.
      Javaslat: zár vagy munkamásolat. A CI-t nem érinti (szekvenciális), a
      **fejlesztői gépet igen, és ma semmi nem jelzi.**
- [ ] **`LicenseRef-PdfiumThirdParty` átolvasása** — a 972 soros gyűjtő-fájl
      attribúció-KÖTELES tételei (FreeType/FTL, libjpeg-turbo/IJG). Ez a
      `document` extra **kiadásának előfeltétele**; a „0 copyleft" ma
      **másodkézből** vett mérés, én nem olvastam át.
- [ ] **A `document` extra `THIRD-PARTY-LICENSES` tétele** az előző pontból.
- [ ] **API-változás kimondva:** `CaptureConfig.save/load` →
      `config_store.save_config/load_config`. Hívók ma csak tesztek — ha
      bármelyik repó fogyasztja, ez törés.

### DC-01b (kereshető PDF írása) — a terve MÁR MEGVAN, mérésekkel

- [ ] **Betűtípus-kapu = karakterről karakterre egyenlőség + hossz, MINDKÉT
      olvasóval.** Mérve: ugyanaz a hibás PDF **három** különböző hibaalakot ad
      (csonkolás / néma kihagyás / U+25A0) — egy „nincs tiltott karakter" kapu
      két úton is **üresen zöld**.
- [ ] **Pozíció-kapu** ±1,5 pt tűréssel (mérve: dx=0,98 / dy=0,11), és a rejtett
      réteg **saját, deklarált** rectjét kérje — különben szövegréteges forrásnál
      a forrás saját rétege triviálisan kielégíti.
- [ ] **A `SearchableDocumentBuilder` port alakja változik** (build-jelentés a
      kihagyás-számlálóval) — kimondott, additív lépés.
- [ ] **Gábor-kapu: betűtípus-politika** (OFL-1.1 jelölt, kiadás +
      ellenőrző-összeg). A rendszer-font EULA-s → cél-hosztra nem vihető.

## ÚJ, a 2026-07-30-i éles feldolgozásból — rootra vár

> Forrás: [`DOCCAPTURE_SZEGA_TANULSAGOK_2026-07-30.md`](../../docs/knowledge/architecture/DOCCAPTURE_SZEGA_TANULSAGOK_2026-07-30.md)
> (`review_requested`). 520 lap kereshető PDF + RAG, egy **idegen** láncon —
> nem termékfejlesztés volt, de a leletek normatívak.

- [ ] **A `CLAUDE.md` két állítása mérve HAMIS** a hivatkozott motorra:
      „inkrementális feldolgozás jelzőkkel" (az EXTRACT-ra nem áll,
      `version_service.py:6` mindig `max+1`) és a motor **LLM-hívással indítja**
      az EXTRACT-ot (`extractor.py:41-42`) — ez az **1. szabály sérülése a
      referencia-implementációban**. *Root dönti el: a doksit javítsuk vagy a motort?*
- [ ] **Négy minta-jelölt elfogadása** (M16 kép≠felismerő · M17 a második
      olvasat függetlensége **modellenként mérendő** · M18 korpusz mint kontroll ·
      M20 a kapu ereje hibaosztályonként más). Az ellenőrzés szerkezeti lyukat
      talált: **M1–M15 egyike sem szól arról, honnan tudjuk, hogy az OLVASÁS helyes.**
- [ ] **Termékhatár kimondása:** korpuszból nőtt megfeleltetési tábla
      **olvasáshoz igen, könyveléshez tilos** (M5 mechanizmusán kívül van).
      ADR-071-be vagy külön ADR-be?
- [ ] **Az 1. szabály táblázatának tengelye kétértelmű** — a helyes ismérv nem az
      *eredet*, hanem hogy **van-e kinyerhető szövegréteg**. *(A „digitális PDF"
      cella maga NEM cáfolódott — a saját korábbi állításomat itt korrigáltam.)*
- [ ] **M9-kikötés a DC-04-hez:** minden downstream artefaktum **ugyanabból a
      mezőből** épüljön, tesztnek kell kikötnie. Egy működő láncban ma
      bizonyítottan nem így volt (PDF a nyersből, RAG a javítottból).

## P0 — az első futásnál, kód előtt

- [x] **Olvasd el a `CLAUDE.md`-t végig.** ⚠ **Egy pontja elavult:** a 3. szabály
      („a jóváhagyási hurok a termék magja — ne borítsuk fel egy szép UI
      kedvéért") **szembemegy a G3-döntéssel** (portál-UI azonnal). A döntés
      Gáboré; a `CLAUDE.md` javítása is az ő/a root dolga.
- [x] `doorstar-instance/terminals/import-discovery` — `state.md` + `memory.md`.
      A két élő szabálya megerősíti az M14-M15 mintáinkat.
- [x] `QUALITY.md` + `ADR-067` · `AGENT-CHANNEL.md` eleje és vége.
- [x] A két forrás-projekt felmérve. ⚠ **Csak az élő fából emelj át.**

## G-kapuk — MIND ELDŐLT (2026-07-30)

- [x] **G1** a bevételezés a gazda · **G3** portál-UI · **G4** helyi alap, külső
      opcionális · **G5** MIT
- [x] **G2 — ADR-071 MEGÍRVA** (`review_requested`). Nem elvet ír le, hanem
      **határt jelöl ki és megnevezi a kapukat**: nyolc kapu, mind mutációval
      igazolva. Átveszi az ADR-070 három precedensét (wire-fegyelem,
      determinizmus, supply-chain).
- [ ] **ADR-071 Q1: Python supply-chain rögzítés** — az ADR-070 D4 committolt
      lockfile-t ír elő a .NET-re; a motorban **nincs** lockfile. Javaslat: a
      DC-01 függőség-döntése után, hogy ne kelljen kétszer.
- [ ] **ADR-071 Q2: dependency-licencek manifest-szakasza** (ADR-067) — a
      doccapture-repókban ma nincs ilyen manifest.
- [ ] **ADR-071 Q3:** a DC-04 nulla-modell-hívására **ma nincs kapu** (a réteg
      nincs megírva); a kritérium beírva.

## Szeletek

- [x] **DC-00** — 3 repó, CI, verziózás, szótár-őr **egy implementációval, három
      szabályhalmazzal**, hexagonális mag. `review_requested` (2026-07-29).
- [x] **DC-01b** — táblázatos betöltő, **modell nélkül**. `review_requested`
      (2026-07-30). Bizonyíték: **154 teszt zöld**, függőség nélkül **141 zöld
      0 kihagyás**, **6/6 mutáció harap**, semlegességi kapu TISZTA.
- [x] **DC-06** — **irat-típus szerinti elemzés** (munkalap · számla · más
      iratok). `review_requested` (2026-07-30). Bizonyíték: **245 teszt zöld**,
      függőség nélkül **232 / 0 kihagyás**, **10/10 mutáció harap**, elv-tábla
      kapuval kötve. Az **elvek átemelve** a motor repójába (`docs/PRINCIPLES.md`).
- [ ] **DC-01a** — **szövegréteg-olvasó geometriával**. ⚠ **EZ MEGY ELŐSZÖR** — az
      egyetlen út, aminek ma **nulla blokkolója** van (1 csomag, 6 MB,
      `Requires-Dist: None`, mérve). Terv: `DC-01-TERV-2026-07-30.md`.
      **A központi döntés: az első szelet OLVASÁS, nem írás** — a kereshető PDF
      *kimenet*, nem szelet, és a digitális PDF már kereshető.
- [ ] **DC-01b** — kereshető PDF **írása**. Port-változást igényel + a betűtípus-lánc
      külön kapu-készletét (fail-closed betűtípus, mert a Helvetica-fallback **némán
      rombolja az ékezetet** — és a hiba **láthatatlan szövegben** van).
- [ ] **DC-01c** — .NET befogadás + DMS. ⚠ **BLOKKOLT**, három mért blokkolóval,
      egyik sem a terminál hatásköre (ld. a nyolc nyitott kérdést).
- [ ] ⚠ **A `Document.AddVersion` visszavonná a jóváhagyást** (`Status = Draft`,
      `ReviewNote = null`) → a DC-01c-nek **saját kapu** kell rá. Ez a lelet buktatta
      meg az egyik terv központi ötletét.
- [x] **DC-02** — **Capture-kontraktus + `.NET` fogyasztó**. `review_requested`
      (2026-07-30). ADAT-szerződés, nem HTTP-API. Bizonyíték: motor **274 zöld**,
      **13/13 mutáció**, pin EGYEZIK; modul **32 zöld**, **0 Warning/Error**,
      **3/3 integrációs mutáció**; a vendorolt séma **bájtra** egyezik.
- [ ] **DC-03** — RAG-indexelés (`SearchIndex` → Nexus).
- [ ] **DC-04** — bevételezés + jóváhagyási hurok. **BLOKKOLT:** Gábor bevezetési
      tapasztalat-gyűjtésére vár. A G3 után **három kikötés** áll rá: a mechanika
      nem cserélhető, a jóváhagyó felület a forrás-igazság, és a lépésszámot a mai
      Excel-úthoz képest **meg kell mérni**.
- [ ] **DC-05** — kézírás. Saját minőségi kapu kell hozzá; a G4 a *határátlépést*
      szabályozta, a helyi felismerés **minőségét** nem.

## A DC-01 terv NYOLC nyitott kérdése — rooton át Gáborhoz

- [ ] **1. BLOKKOLÓ:** a `SpaceOS.Modules.Hosting`-nak **nincs licence** (mérve: se
      `PackageLicenseExpression`, se `PackageLicenseFile`), miközben a
      doccapture-modul **MIT**-et deklarál → a DC-01c **nem szállítható**.
- [ ] **2.** Elfogadja-e a root a **három szeletre bontást**? A DC-01a nem teljesíti
      a DC-01 címét — kimondva.
- [ ] **3.** **MPL-2.0 döntés** (fájl-szintű copyleft) — a kapu ma fel-nem-ismertként
      buktatja el, tehát a döntés **kimondott** lesz, nem csendben megengedett.
- [ ] **4.** **Betűtípus-politika** (OFL-1.1 kötelezettségek + a példány
      proveniencia). ⚠ A proveniencia `.md`-be írása a **saját** abszolút-út-tiltásomat
      buktatná — előre rendezni.
- [ ] **5.** **PyMuPDF a bevételezési repóban** → a `joinerytech-goods-receipt`
      MIT-státusza **érintett**; 4 fájl `fitz`-hívása pypdfium2-re.
- [ ] **6.** **Objektum-tár** (S3/MinIO) a DC-01c-hez — a filesystem-stub nem
      produkciós tár. (`Minio 5.0.1` = Apache-2.0, mérve → licencre nem blokkolt.)
- [ ] **7.** **Role-alapú láthatóság** — **élő Keycloak-tokennel mérni**, mielőtt
      bármi épül rá; a mai lelet kód-összeolvasás, nem elfogott token.
- [ ] **8.** A `RepositoryUrl` kettősség a Hostingban.

## A DC-01 felderítésének BLOKKOLÓ leletei (workflow, 2026-07-30)

- [x] **G5-nek nem volt gépi kapuja** → `tools/license_guard.py` megépítve, CI-ba
      kötve, 3/3 mutáció. A licenc **verzió-függő** lehet (surya <0.20.0 GPL).
- [ ] ⚠ **A `fitz` (PyMuPDF) TILTOTT** (mérve: Dual Licensed – GNU AFFERO). A
      `Bevetelezes` 4 fájlja használja. Pótlás: **pypdfium2** (BSD/Apache-2.0), és
      a mért hívás-felszín csak `open` + `get_pixmap` + `tobytes`.
- [ ] ⚠ **A Helvetica-fallback NÉMÁN rombolja az ékezetet** a kereshető PDF-ben, és
      betűtípus nélküli Linux-konténeren ez az **alapeset**. A hiba **láthatatlan
      szövegben** van → fail-closed betűtípus + visszaolvasó kapu (`őűŐŰ`, U+25A0).
- [ ] ⚠ **A felismerő-út telepítési terhe 923 MB / 26 csomag** (torch 453 MB) vs. a
      PDF-lánc 25 MB / 6 csomag → **kötelezően külön extra**, különben más termék.
- [ ] ⚠ **G4-sérülés alapbeállításon:** a paddleocr import-időben **7 kimenő TLS**-t
      kísérel meg, az easyocr a Reader felállításakor **15,1 MB modellt** töltene le
      — a config bármilyen beállítása ELŐTT.
- [ ] ⚠ **A modell-súlyok licence mérhetetlen** (0 licenc-fájl a gyorsítótárakban).
      **A pip-csomag licence NEM a súlyok licence.**
- [ ] ⚠ **A DMS-ben NINCS grant-írási út** (0 command/handler/endpoint), miközben az
      ACL fail-closed → a befogadott dokumentumot **senki nem látná**.
- [ ] ⚠ **A DMS nem fogad bináris tartalmat** (nincs multipart végpont) → a
      „kereshető PDF → DMS" a mai végponttal **nem megvalósítható**.
- [ ] ⚠ **A `SpaceOS.Modules.Hosting` nem elérhető** a doccapture-repóból (0
      PackageReference, 0 NuGet.Config) → publikálni kell egy feedre.
- [ ] ⚠ **A DMS-ben nincs hely a `content_hash`-nek** (M13) és a **Confidence-t
      minden FSM-átmenet felülírja** (`review_note`) → a jelölés csendben elveszik.

## Ismert rések a kész munkában — nem felejtendők

- [x] ~~A kereszt-repó drift-kapu piros~~ — **FELOLDVA**: root pusholta a
      szerződést, és a kapu logikája **élesben mérve ZÖLD** (a publikált és a
      vendorolt hash bájtra egyezik). ⚠ A CI viszont **még mindig nem futott
      Actionsön**.
- [ ] ⚠ **Az ADR-index elavult**: `ADR_CATALOGUE.md` ADR-058-nál áll meg, az ADR
      `README.md` csak 059–064-et fedi → **ADR-065…070 egyetlen indexben sem
      szerepel** (mérve). Az index a rooté; csak jelzem.
- [ ] **A modul semmit nem TESZ a befogadott adattal** — nincs DMS-tárolás,
      jogosultság, index. A DC-02 a **határt** építette, nem a tárolást.
- [ ] **Nincs NuGet-publikálás** a szerződés-csomagra (külön, kimondott lépés).
- [ ] **A `rows` séma-szinten homogén** — két különböző tétel-tábla egy iraton
      nem különül el a wire-on.

- [ ] **M2 — hasáb-szétvágás nincs megírva.** Két hasáb egy sorba olvadva a
      címke-kinyerést elrontja, és **ma nem jelezzük**. Ez az M2 elv, ami az
      elv-táblában „nem fedett".
- [ ] **M9 és M14 sem fedett** — a jóváhagyó felület (DC-04) és az
      entitás-azonosság a fogyasztónál van.
- [ ] **Több irat egy fájlban** → holtverseny → `MISSING`. Helyes válasz, de a
      **szétbontás hiányzik**.
- [x] ~~**Szkennelt iraton nem futott** az irat-elemzés~~ — **RÉSZBEN LEZÁRVA
      2026-07-30 este**: 520 lap éles feldolgozása a `tartalom_mentes` láncán
      megadta a hibaprofilt. ⚠ **De nem a mi motorunkon**: az elemző-lánc
      továbbra sem futott felismerésből jövő szövegen. A **mért** hibaprofil:
      hosszú `ő`/`ű` → `ó`/`ü` (0 hosszú ő/ű 3026 karakteren), `ő` → `é`
      (199 előfordulás / 17 068 szó = 1,17%), mediaevális `1` → `I` (36 db).
      Az **összeolvadó hasáb (M2) NEM jelentkezett** — a két hasáb tisztán
      elkülönült. Ld. `DOCCAPTURE_SZEGA_TANULSAGOK_2026-07-30.md`.
- [ ] **Atomikus mentés zár nélkül** — a forrás-prototípusból átvett minta
      hiányzó fele.

- [ ] **Összevont cella (`merged`)**: az olvasó a bal-felső értéket látja, a
      többit üresnek — és ezt **ma nem jelezzük**.
- [ ] **Valódi ügyfél-fájlon** semmi nem futott; minden teszt-táblázat szintetikus.
- [ ] **A CI soha nem futott GitHub Actionsön** (DC-00-ból örökölt).
- [ ] **Nagy fájl teljesítménye** nincs mérve; a kétszeri megnyitás duplázza a
      memóriát, és a `max_rows` alapértéke nem mérésből jön.
- [ ] **Egyoszlopos táblázat** betöltése nem támogatott (kimondott hiba).

## A forrás-prototípusról — ÉLŐ, nem archív

- [ ] ⚠ **A `tartalom_mentes` HASZNÁLATBAN van** (2026-07-30: új, 240 oldalas könyv
      letöltve). Az átemelésnél a **mai** fát kell nézni, nem egy korábbi
      pillanatképet — és továbbra is **csak az élő fából**, a
      `.claude/worktrees/agent-*` másolatokból soha.
- [ ] ⚠ **Az élő API-kulcs a `settings.json`-ban SÜRGŐSEBB, mint jeleztem** — Gábor
      épp azt a fájlt használja, tehát nem „régi kísérletben maradt" érték.
      Rotáció-jelölt; a repó nem publikus, de a mappa megosztása kivinné.

## Állandó szabályok

1. **`done`/`APPROVED`-ot kizárólag a root-review állít.** Te
   `review_requested`-et jelentesz, **mért** bizonyítékkal (darabszám, nem „zöld").
2. **Amit nem tudtál megmérni, mondd ki** — ne tűnjön el egy összesített szám mögött.
3. **„Inkább hiány, mint téves."** Bizonytalan adatot jelölj, ne tippelj.
4. **A mérőeszköz is tévedhet.** Ha a mérésed pirosat mutat, **előbb a mérés
   érvényességét** vizsgáld. Ma ebből lett a legértékesebb lelet (a `csv.Sniffer`
   nem bukik el, hanem tippel).
5. **Eredetik érintetlenek**; a forrásmappa csak olvasható — és ezt **mérd**, ne
   állítsd (mappa-pillanatkép a betöltés előtt és után).
6. Nincs `git add -A`; a commitot a root végzi. Idegen repóban **nincs**
   destruktív parancs.
7. **Termékdöntés a rooton át megy fel Gáborhoz**; ha közvetlenül kérdezel, a
   választ **ki kell hirdetni a csatornára**.
8. Nagyobb lépés végén **memória-mentés** (QUALITY §5).
9. **A CI-t meg kell NÉZNI, nem a YAML-t elolvasni.** 2026-07-31: a motor CI-je
   07-30 óta piros volt, és a root **négy** okot javított — miközben én a saját
   jelentésemben a bekötést a YAML-ből „ellenőriztem". A lépés *létezése* és a
   lépés *sikere* két külön mért tétel.
10. **Izolációs mérésnél kérdezd meg: indít-e valamelyik teszt alprocesszt?**
    Az import-blokkoló hook csak a saját folyamatban véd; ahol a csomagok
    globálisan telepítve vannak, ott az ilyen teszt **elvileg sem bukhat**.
11. **Ingadozó bukást KI KELL MONDANI**, akkor is, ha nem reprodukálod — a
    mechanizmussal és a kizárt hipotézisek listájával együtt. A „most már zöld"
    nem magyarázat.
