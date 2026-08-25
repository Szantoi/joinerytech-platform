# EPIC-DOC-CAPTURE-2026Q3 — dokumentum-digitalizálás **termékként**, több külön repóban

- **Kiváltó ok:** Gábor (2026-07-29): *„Szeretném ezeket a készségeket behozni
  javított formában a JoineryTech szolgáltatásai közé"* — pontosítással:
  **külön repókban, hogy termékként szolgáltatni lehessen.**
- **Előzmény-felmérés:** `docs/knowledge/architecture/OCR_PROJEKTEK_FELMERES_2026-07-29.md`
- **Forrás-projektek:** `Bevetelezes` (éles munkafolyamat) · `tartalom_mentes`
  (hexagonális OCR/RAG-motor, 19 teszt-fájl)
- **Státusz:** **DC-00 + DC-01b kész** (`review_requested`) — és **mind az öt
  G-kapu eldőlt** (Gábor, 2026-07-30). A kritikus út szabad; a DC-04 már csak a
  bevezetési tapasztalat-gyűjtésre vár

## A cél

A beszkennelt papír váljon kereshető, jogosultság-kezelt adattá — úgy, hogy aki
ma papírral és Excellel dolgozik, **holnap is nagyjából ugyanúgy dolgozzon** —,
és mindez **önállóan értékesíthető termékként**, ne a platform belső
mellékterméke legyen.

## A valódi feladat: **cég-integráció**, nem OCR

Gábor pontosítása (2026-07-29): a termék **cégek integrálását segítse**, és
kezelnie kell **PDF-et, Excelt, papírt és kézírást** — *„a Doorstarnál is
ezekbe ütközünk."*

Ez átrendezi a súlypontot. Egy új ügyfél behozásakor nem „szkennelünk", hanem
**egy működő cég meglévő tudását visszük át**: árlisták, cikktörzsek,
beszállítói megnevezések, technológiai lapok, mérési jegyzőkönyvek — vegyesen
digitális és papír alapon.

### ⚠ A négy bemenet NÉGY különböző út — összemosni tervezési hiba

| Bemenet | Amire szükség van | Modell kell? |
|---|---|---|
| **Excel / CSV** | oszlop-térképezés, típus-felismerés, validáció | **nem** — ez parse, nem OCR |
| **Digitális PDF** | meglévő szövegréteg kiolvasása, tábla-szerkezet | **nem** — a szöveg már ott van |
| **Papír / szkennelt kép** | raszter → szövegréteg (OCR) | részben |
| **Kézírás** | vizuális átirat, bizonytalanság-jelzéssel | **igen** |

Ha mind a négyet „OCR-nek" hívjuk, a legolcsóbb eseteket (Excel, digitális PDF)
a legdrágább úton oldjuk meg, és **modellt engedünk oda, ahol determinisztikus
parse a helyes válasz**. Ez ugyanaz a hiba, mint LLM-mel tippelni cikkszámot.

### Ahol viszont a négy út összeér — és itt van az érték

**Egy normalizált céladat-modell + egy jóváhagyási hurok.** A termék értéke nem
az olvasásban van (azt sokan tudják), hanem abban, hogy

1. mind a négy bemenet **ugyanabba a javaslat-alakba** fut be,
2. a javaslat **megbízhatósági jelöléssel** érkezik,
3. az ember **ott hagyja jóvá, ahol dolgozik**, és
4. a jóváhagyásból **tudás lesz** — a következő számlánál már nem kérdez.

A `Bevetelezes` ezt a hurkot **már élesben csinálja** (Excel-javaslat → `x` →
a megfeleltetési tábla nő). Ez a termék magja; az OCR csak az egyik bemenet.

### Doorstar: az első valós eset, nem hipotézis

*„A Doorstarnál is ezekbe ütközünk."* — és a saját visszajelzésükben már
nevesítették az **Import Inboxot**, az **Excel-forráshoz kötött
dokumentumhivatkozást** és a `SURVEY_PENDING` adatminőségi jelzéseket.

Vagyis van egy élő, együttműködő terep, ahol a képesség azonnal mérhető. A ma
elfogadott **kétirányú áramlás** (platform ⇄ Doorstar) ide is áll: ha náluk
születik importáló megoldás, az általánosítható; ha nálunk, ők kapják meg.

> **Bemenet, amit várok:** Gábor jelezte, hogy **külön taszkban dolgoztatja fel
> a tapasztalatokat**. Az a gyűjtés ennek az epicnek **normatív bemenete** — a
> G-kapuk (különösen G3, a jóváhagyási hurok alakja) attól függenek, hogy a
> valóságban hol akad el a bevezetés. Ne kezdjük a DC-04-et előtte.

## A jó hír: a termékesítés gépezete már megvan

Nem új infrastruktúrát építünk, hanem **alkalmazzuk a bevált mintát**:

| Amire szükség van egy termékhez | Amink már van |
|---|---|
| önálló repó, saját release-ciklus | `spaceos-modules-scheduling` precedens |
| verziózott csomag, hash-pin | GitHub Packages + `SPACEOS_PACKAGES_TOKEN` |
| publikált kontraktus, generált kliens | scheduling → Doorstar (OpenAPI 3.1, SHA-256 pin) |
| **értékesítési kapcsoló** | `enabled_modules` entitlement-kapu + ADR-067 modul-katalógus |
| auth / tenant / RLS alapvonal | `SpaceOS.Modules.Hosting` csomag |
| semlegességi fegyelem | szótár-őr (backend), és ma kértük a portálra is |

**Az `enabled_modules` kapu a lényeg:** egy ügyfél megveheti a
dokumentum-digitalizálást a többi modul nélkül, és a platform ezt már ma tudja
kezelni — a mai `RequireEnabledModule` fail-closed kapu pontosan ez.

## Repó-térkép — három termék, három repó

### 1. `spaceos-doccapture-engine` (Python) — **a motor, önállóan eladható**

**Mind a négy bemenetet** kezeli, de **külön úton**: Excel/CSV → parse;
digitális PDF → meglévő szövegréteg; szkennelt kép → OCR; kézírás → vizuális
átirat bizonytalanság-jelzéssel. Kimenet mindenhol ugyanaz: normalizált
javaslat + **kereshető PDF láthatatlan szövegréteggel** + Markdown/RAG export.

A `tartalom_mentes` hexagonális magja innen indul (portok: `IVisionClient`,
`IOcrService`, `IPdfBuilder`, `VectorStorePort`, `HandwritingOCRPort`) — a
**parse-ág (Excel, digitális PDF) új port**, és szándékosan modell-mentes.

**Ez a legszélesebb piacú darab:** semmit nem tud a faiparról, az ERP-ről, sőt a
JoineryTech-ről sem. Bárki megveheti, akinek papírja van.

> ⚠ **Semlegességi követelmény — ma tanultuk meg drágán.** A `portal-ui`-ban
> beégetve benne maradt a `joinery/tech` szóvédjegy, és ezt a Doorstar tőlünk
> függetlenül szintén kifogásolta. Egy eladható motorban **márka-, iparági és
> ügyfél-szó nem lehet**, és ezt **gépi kapunak** kell mérnie, nem figyelemnek.

### 2. `spaceos-modules-doccapture` (.NET) — **a platform-modul**

ModuleId: **`spaceos.doccapture`** (ADR-067 §1: `spaceos.*`, mert a
dokumentum-befogadás iparág-agnosztikus). Feladata: a motor kimenetének
befogadása, **DMS-tárolás a mai ACL-lel**, RAG-indexelés, metaadat,
audit-nyom. A platform NuGet-csomagként fogyasztja, a scheduling mintájára.

### 3. `joinerytech-goods-receipt` — **a bevételezés, ERP-oldali termék**

A `Bevetelezes` munkafolyamata általánosítva: számla-sorok → cikkszám +
mennyiség, **megfeleltetési táblával és jóváhagyási hurokkal**.

**Miért külön repó és nem a motorban:** más a vevő (ERP-t használó cég, nem
„akinek papírja van"), más a release-ciklus, és **más a kockázati profil** — ez
az egyetlen darab, ami a könyvelést érinti.

> A mai SAP-specifikus kimenet **általánosítandó**: a cél-rendszer legyen
> paraméter, különben egy SAP nélküli ügyfélnél a termék használhatatlan.

**A határ a három között:** a motor nem tud az ERP-ről, a modul nem tud a
számlákról, a bevételezés nem tud az OCR belsejéről. Mindhárom **publikált
kontraktuson** át beszél.

## G-kapuk — MIND ELDŐLT (Gábor, 2026-07-30)

| Kapu | Döntés | Mi lett belőle a kódban |
|---|---|---|
| **G1** | **a bevételezés a gazda** | a motorban **nincs** számla-port, és a kapu ezért **véglegesen** marad (`test_ports.GateTests`) |
| **G2** | LLM az olvasáshoz, szabály a könyveléshez — **ADR-jelölt marad** | a use-case határa mérve: a rekordban nincs párosítás/átváltás |
| **G3** | **portál-UI azonnal** ⚠ | felülírja az addigi javaslatot — ld. lent |
| **G4** | **helyi alap, külső opcionális** | `allow_external_processing=False` + kötelező indok, fail-closed, mutációval igazolva |
| **G5** | **MIT** | `LICENSE` mind a három repóban + csomag-metaadat |

> **A döntéseket Gábor közvetlenül adta a doccapture terminálnak**, nem a rooton
> át. A sziget konvenciója szerint ilyenkor a választ ki kell hirdetni a
> csatornára — megtörtént, hogy ne keletkezzen két igazság ugyanarról.

### ⚠ G3: a döntés SZEMBEMEGY a saját javaslatunkkal — és ezt kimondjuk

Az epic (és a terminál `CLAUDE.md`-je) azt írta: *„ha a rutint egy szép UI
kedvéért felborítjuk, a bevezetés meg fog állni az első ügyfélnél."* Gábor a
kockázat ismeretében **a portál-UI-t választotta** — a kockázat ott volt az
opció szövegében.

**Amit ez kötelezővé tesz a DC-04-ben**, és amit most rögzítünk, hogy ne
felejtődjön:

1. **A mechanika nem cserélhető, csak a felület.** Javaslat → **egy
   mozdulattal** jóváhagyás → a megfeleltetési tábla **nő**. Ha a portál-UI
   ehhez több lépést kér, mint a mai `x` beírása, akkor a bevezethetőséget
   rontottuk el, nem a felületet fejlesztettük.
2. **A jóváhagyó felület a forrás-igazság (M9).** A gép onnan olvassa a
   véglegeset — nem lehet két helyen jóváhagyni.
3. **Mérni kell, nem hinni:** a jóváhagyási hurok lépésszáma a mai Excel-úthoz
   képest legyen **kimondott szám**, ne benyomás.

### G1. A számla-kinyerés forrás-igazsága — **ELDŐLT: a bevételezés a gazda**

A `tartalom_mentes` **már tartalmaz** `InvoiceExtractionPort`-ot, miközben a
`Bevetelezes` az, ami élesben, determinisztikusan működik. **Két igazság
ugyanarról** — ma több ilyet zártunk a platformon.

**Javaslat volt:** a bevételezés a gazda (3. repó); a motor invoice-portja
**bemenet-előkészítővé** fokozódik le. Párhuzamosan fejleszteni mindkettőt a
legrosszabb.

✅ **Gábor 2026-07-30-án ezt választotta.** A motorban a számla-port nem
létezik, és a gépi kapu (`tests/test_ports.py`) ezért **nem ideiglenes
védőkorlát, hanem a döntés gépi alakja** — ha elbukik, valaki egy meghozott
döntést írt vissza kóddal.

### G2. Az LLM határa — **ADR-jelölt, és termékként még fontosabb**

> **LLM az OLVASÁSHOZ, determinisztikus szabály a KÖNYVELÉSHEZ.**

A modell abban segít, *mi van a papíron*. Abban **nem**, hogy *mi kerüljön a
rendszerbe*. Egy LLM-tipp nem auditálható; egy megfeleltetési tábla sora igen.

**Termékként ez eladási érv, nem korlát:** a vevő könyvelése auditálható marad.
Ezért kell ADR — fél év múlva valaki meg fogja kérdezni, miért nem tippel a
modell cikkszámot, és a válasznak írásban kell lennie.

### G3. A jóváhagyási hurok

A `Bevetelezes` legértékesebb része nem az OCR, hanem hogy **Excelben javasol,
az ember `x`-szel jóváhagy, és a tábla nő**. Ez a „napi rutin alig változik"
kulcsa — és termékként a **bevezethetőség** kulcsa.

**Döntendő volt:** marad-e az Excel a jóváhagyás felülete az első körben, vagy
azonnal portál-UI.

✅ **Gábor 2026-07-30: PORTÁL-UI AZONNAL.** Ez **szembemegy** az itt szereplő
javaslattal; a kockázatot kimondtuk, a döntés a Gáboré. A kikötéseket ld. fent
(„⚠ G3") — röviden: **a mechanika nem cserélhető, csak a felület**, és a
jóváhagyás lépésszámát a mai Excel-úthoz képest **meg kell mérni**.

### G4. Adatvédelem — **ez a telepítési alakot dönti el**

Beszállítói számla cégadatot és árat tartalmaz. Mehet-e külső
LLM-szolgáltatáshoz, vagy a Vision-fázis **csak helyben** futhat?

Termékként ez nem mellékes: egy „az adatai nem hagyják el a telephelyet"
változat más piacot nyit, mint egy felhő-alapú.

✅ **Gábor 2026-07-30: HELYI ALAP, KÜLSŐ OPCIONÁLIS.** Vagyis **két piac egy
kódbázison**, és a különbség konfiguráció, nem külön termék.

A kódban ez már áll, és **fail-closed**: `allow_external_processing=False` az
alapérték, és az engedélyhez **kötelező indok** (`external_processing_audit_note`)
— mert egy indoklás nélküli `true` fél év múlva megmagyarázhatatlan, és senki
nem meri visszavenni. A kaput mutáció igazolja: ha az alapérték `True`-ra
változik, a suite pirosra vált.

⚠ **Amit a G4 NEM oldott meg:** a döntés a *határátlépés engedélyét*
szabályozza. Azt, hogy a helyi felismerés **milyen minőségű**, nem — a kézírás
(DC-05) saját minőségi kapuja ettől független kérdés.

### G5. Licenc- és tulajdon-határ

Ha eladható termék, kell rá döntés: **milyen licenc**, és mi a viszony a
platform-forráshoz. Nem sürgős a DC-01-hez, de a repók létrehozása előtt jó
tudni.

**Részben megválaszolva (2026-07-29):** Gábor **irányt** adott — *„Nem gyártok
jelenleg nagy titkokat, az a cél hogy minél többen tudják használni a
rendszeremet"* —, tehát **nyílt licenc**. A **konkrét licenc még nyitva van**,
és nem triviális: a nesting/szabás-optimalizálás szabadalmakkal sűrűn fedett
terület, ezért az **Apache-2.0** (kifejezett szabadalmi engedély + védjegy-
rendezés) más kockázati profilt ad, mint az **MIT**.

⚠ **Mérve (2026-07-29):** `LICENSE`/`COPYING`/`NOTICE` **egyik repóban sincs**,
és `license` mező egyetlen `package.json`-ban sem. Vagyis a repók akkor
**publikusak voltak licenc nélkül** = minden jog fenntartva — ami a kimondott
céllal („minél többen használják") **ellentétes**.

✅ **Gábor 2026-07-30: MIT** — a három doccapture-repóra. Ezzel a root
javaslatával (a publikálandó csomagokra MIT) **egyezik**, tehát nem keletkezett
két igazság. Elvégezve:

| Repó | Mi került bele |
|---|---|
| motor | `LICENSE` + `license = "MIT"` a csomag-leírásban |
| modul | `LICENSE` + `PackageLicenseExpression` (hogy a **fogyasztó** is lássa) |
| bevételezés | ugyanaz |

**Miért a csomag-metaadatba is:** egy `LICENSE` fájl a repóban **nem jut el** a
csomagba. Ha csak ott állna, a fogyasztó ugyanott lenne, mint licenc nélkül.

⚠ **Ez a döntés a doccapture-repókra szól.** A `spaceos-nesting-algorithms` és a
`spaceos-modules-cutting` (szabadalom-közeli algoritmusok) **külön döntés**, és
nyitva marad — a root ezt külön jelezte.

## Szelet-terv

| # | Szelet | Repó | Miért ez a sorrend |
|---|---|---|---|
| ~~**DC-00**~~ ✅ | Repók, CI, verziózás, semlegességi őr | mind3 | **KÉSZ** (`review_requested`, 2026-07-29) — ld. a „DC-00 kivitelezés" szakaszt |
| **DC-01a** | **Szövegréteg-olvasó geometriával** (`TextLayerReader`) | 1 | **EZ MEGY ELŐSZÖR** — az egyetlen út, aminek ma **nulla blokkolója** van: 1 csomag, 6 MB, `Requires-Dist: None` (mérve) |
| **DC-01b** | Kereshető PDF **írása** (láthatatlan szövegréteg) | 1 | második — port-változást igényel, és a betűtípus-lánc külön kapu-készletet kér |
| **DC-01c** | .NET befogadás + DMS-tárolás az ACL-lel | 2 | ⚠ **BLOKKOLT** — három mért blokkoló, egyik sem a terminál hatásköre |
| ~~**DC-01b**~~ ✅ | **Excel/CSV betöltő** — oszlop-térképezés + validáció, modell nélkül | 1 | **KÉSZ** (`review_requested`, 2026-07-30) — ld. a „DC-01b kivitelezés" szakaszt |
| ~~**DC-02**~~ ✅ | **Capture-kontraktus** — publikalt sema + hash-pin + .NET-oldali fogyaszto | 1+2 | **KESZ** (`review_requested`, 2026-07-30) — ADAT-szerzodes, nem HTTP-API; ld. a DC-02 kivitelezes szakaszt |
| **DC-03** | RAG-indexelés (`VectorStorePort` → Nexus) | 1+2 | a Markdown-export már megvan |
| **DC-04** | Bevételezés: sorok + megfeleltetés + **jóváhagyási hurok** | 3 | csak G1-G3 után; ez érinti a könyvelést, és ez adja a legtöbbet |
| **DC-05** | Kézírás (`HandwritingOCRPort`) | 1 | üzemi mérési lap; saját minőségi kapu kell hozzá |
| ~~**DC-06**~~ ✅ | **Irat-típus szerinti elemzés** — munkalap, számla, más iratok | 1 | **KÉSZ** (`review_requested`, 2026-07-30) — Gábor kérése; ld. a DC-06 kivitelezés szakaszt |

**Kritikus út a valós haszonig:** ~~G4~~ → ~~DC-00~~ → ~~**DC-01b**~~ →
~~DC-02~~ → **DC-01** → DC-03 → DC-04 (a tapasztalat-gyűjtéssel).

⚠ **A DC-02 a DC-01 ELŐTT készült el, és ez tudatos csere volt:** a szerződés nélkül a `.NET` oldal a motor **belsejéhez** kötődött volna, és a DC-01 (DMS-tárolás) épp azt a réteget építi, aminek a szerződés mögé kell dolgoznia. A sorrend megfordítása így **kevesebb visszabontást** jelent, nem többet.

**Ami ebből ma szabad:** mind az öt G-kapu eldőlt, tehát a szeletek nem kapura
várnak. **Egy dolog blokkol még:** a DC-04 Gábor bevezetési tapasztalat-
gyűjtésére vár — az normatív bemenet a jóváhagyási hurok alakjához, és a G3
portál-UI döntése után **még fontosabb**, mert a lépésszámot ahhoz kell mérni.

⚠ **Egy besorolási hiba javítva:** a DC-01b korábban „G4-re vár" címkét kapott
(a terminál mondta, a root elfogadta). **Ez pontatlan volt:** a szeletben nulla
modell-hívás van, tehát a G4 válasza a kódját nem változtathatta meg. A jelzés
megvolt, a *súlyozása* volt rossz — ugyanaz az alakja, mint a 2026-07-29-i
token-leletnél.

**Miért az Excel megy elöl:** egy cég integrálásakor az adatok többsége **már
digitális** — árlista, cikktörzs, beszállítói lista Excelben. Ezt modell nélkül,
determinisztikusan be lehet tölteni, tehát ez a **leggyorsabb megtérülés** és a
legkisebb kockázat. A papír és a kézírás utána jön, mert az a drágább és
ritkább eset. Ha az OCR-rel kezdenénk, a látványosabb felét építenénk előbb.

## DC-00 kivitelezés (2026-07-29, `review_requested`)

> A QUALITY §4 szerint a kivitelezést a task-fájlba rögzítjük. **A commitot
> Gábor kérésére a terminál végezte**, nem a root; done/APPROVED továbbra is
> kizárólag root-review.

### Amit a root készített (a kickoff előtt)

A három repó váza, a motor `core/models.py`-ja (a két alapszabály **invariánsként**,
7 teszt) és a `tools/neutrality_guard.py` negatív kontrollal.

### Amit a terminál készített

| Repó | Fájl | Mi |
|---|---|---|
| engine | `core/config.py` · `ports.py` · `layout.py` · `errors.py` | a hexagonális mag **általánosított** átemelése |
| engine | `tests/test_config.py` · `test_core_boundary.py` · `test_ports.py` | +22 teszt |
| engine | `docs/DESIGN-mag-altalanositas.md` | design intent (mit változtattunk és **miért**) |
| modules | `Directory.Build.props` · `tools/neutrality.json` · `.github/workflows/ci.yml` | verzió egyetlen forrása + **szigorú** szabályhalmaz + CI |
| goods-receipt | ugyanaz | **eltérő** szabályhalmaz: iparági szótár megengedett, cél-rendszer és ügyfélnév nem |

### A két tervezési döntés

1. **Egy implementáció, három szabályhalmaz.** A kapu **szkriptjét nem másoltuk**
   a repókba (az három igazság lenne ugyanarról); a CI **hash-pinnel** tölti le
   a motor repójából, és minden repó csak a saját `neutrality.json`-ját birtokolja.
   Pin: `ba3414bd…`, megmérve, hogy a publikált változat bájtra egyezik.
2. **A kapu minden futásnál bizonyítja, hogy harap** (negatív + pozitív kontroll).
   A minták a `neutrality.json`-ban állnak, mert azt a kapu név szerint kihagyja —
   a workflow YAML-ba írva **a kapu saját magára bukna el**.

### Mért bizonyíték

```
Kapu-onteszt:      8/8 es 8/8      Repo-vizsgalat: 3/3 TISZTA
Motor tesztjei:    29 zold (7 volt + 22 uj), 0 bukas
Workflow YAML:     2/2 parse-olhato        Hash-pin: publikalt == lokalis
```

**A kulcs-bizonyíték:** ugyanaz a szó **ellentétes** eredményt ad — `furniture`
a modul-repóban exit 1, a bevételezésben exit 0. A goods-receipt öntesztjében az
iparági szó a `must_pass`-ban van, tehát ha valaki odamásolja a motor szigorú
configját, a CI **azonnal pirosra vált**.

**Mutációval igazolva:** a semlegességi kapu (becsempészett szó → `README.md:52`,
exit 1) és az architekturális határ (külső csomag **és** saját infrastruktúra-import).

### Amit tudatosan kihagytunk

- **A számla-kinyerő port** — ez a **G1** tárgya; bemásolni annyi lenne, mint a
  kérdést kódba írt tényként előredönteni. **Teszt őrzi** (`test_ports.GateTests`).
- **LICENSE** — a **G5** iránya megvan, a konkrét licenc nincs (ld. fent).

### Amit NEM mértünk — kimondva

1. **A CI soha nem futott GitHub Actionsön** — csak a logikáját futtattuk lokálisan
   + YAML-parse. A runner-viselkedés (hálózat, `setup-dotnet`, heredoc) bizonyítatlan.
2. **A `dotnet` ág bizonyítatlan** (ma 0 `.csproj`); a CI ezt **kimondja** a logban,
   nem ad üres zöldet.
3. **A portoknak nincs adapterük** — a *használhatóságuk* bizonyítatlan; a `.pdf`
   útválasztás feltevés; a redundancia-tűrés alapértéke találgatás.
4. Az öntesztet futtató ~30 sor Python **tudatosan duplikált** a két workflow-ban
   (közös futtató csak publikálás után lehet) — konszolidációs jelölt.

### Két hiba, amit a saját kapunk talált — nem az ember

- `CaptureConfig.save()` **előbb nyitotta meg** a fájlt, mint hogy elbukott volna
  az ellenőrzésen; az `open(…,"w")` csonkol, tehát **egy meglévő, helyes configot
  nullára írt volna**.
- `assert_no_secret_values` `asdict()`-en iterált, ami csak a **deklarált** mezőket
  adja vissza — a futásidőben hozzáadott `api_key`-t nem is látta volna.
- **Utólag, önauditból:** a határ-kapu `glob("*.py")`-jal listázott (nem `rglob`),
  tehát egy `core/alcsomag/` **csendben kimaradt volna**; és a találatokat
  `module.name` szerint gyűjtötte, ami két azonos nevű fájlt összeolvasztott volna.
  *A mutáció az érzékenységet bizonyítja, nem a lefedettséget.*

### Mérési korrekció, ami több dokumentumot érintett

A forrás-motor „**46 teszt-fájl**" száma **felfújt** volt: az élő fában **19** van,
a 46 három `.claude/worktrees/agent-*` másolattal jön ki. A worktree-k **egyetlen
új teszt-modult sem** hoznak, viszont **régebbi logikát** tartalmaznak — aki rossz
fából emel át, csendben visszalép egy verziót. A root ezt négy helyen javította.

## DC-01b kivitelezés (2026-07-30, `review_requested`)

> A QUALITY §4 szerint a kivitelezést a task-fájlba rögzítjük.
> `done`/`APPROVED` továbbra is **kizárólag root-review**.

### Mit épített

A **`TabularReader` port első két adaptere** és a mögötte lévő domain-logika, a
`spaceos-doccapture-engine` repóban:

| Réteg | Fájl | Mi |
|---|---|---|
| mag | `core/tabular/options.py` | a táblázat olvasásának minden beállítható eleme |
| mag | `core/tabular/schema.py` | oszlop-térképezés fejléc-NÉV szerint, kétértelműség-kapuval |
| mag | `core/tabular/values.py` | cella → `Extracted`; kétértelműségnél **hiány** |
| mag | `core/tabular/assembly.py` | a KÖZÖS összeállító — hogy ne legyen két igazság |
| mag | `core/tabular/result.py` | az eredmény a **diagnosztikával együtt** |
| mag | `core/source_selection.py` | zaj-fájl kizárás + útválasztás + relatív-út kapu |
| infra | `infrastructure/evidence.py` | relatív út + SHA-256 (M13) |
| infra | `infrastructure/tabular/delimited.py` | CSV — **függőség nélkül** |
| infra | `infrastructure/tabular/workbook.py` | munkafüzet, gyorsítótárból, futtatás nélkül |
| use-case | `usecases/load_tabular.py` | `CaptureRecord` + a motor **határa** |
| terv | `docs/DESIGN-DC-01b-tablazatos-betolto.md` | a hét tervezési döntés és a **miért** |

### Mért bizonyíték

```
Teljes suite            : 154 zold, 0 bukas   (DC-00 utan 29 volt -> +125)
Fuggoseg NELKUL (mert)  : 141 zold, 0 bukas, 0 KIHAGYVA
   negativ kontroll     : a blokkolo bizonyitottan fog (openpyxl nem importalhato)
Munkafuzet-tesztek      : 13  (141 + 13 = 154 -- a ket szam osszefer)
Semlegessegi kapu       : TISZTA
Mutacio                 : 6/6 uj kapu bizonyitottan HARAP
CI YAML                 : parse OK, 8 lepes
README pelda            : lefuttatva, a dokumentalt kimenetet adja
```

**A „függőség nélkül" nem állítás, hanem mérés:** a CI első köre **előbb
bizonyítja**, hogy a táblázat-olvasó nincs telepítve, és csak utána futtatja a
függőség-mentes részt. A második kör előtt pedig **kimondottan ellenőrzi**, hogy
az extra megvan — különben a munkafüzet-tesztek csendben kimaradnának, és
`154 zöld` helyett `141 zöld + 13 néma kihagyás` lenne, ugyanolyan zöld színnel.

### A hat mutáció, és mit állít mindegyik

| Mutáció | Mit bizonyít, hogy fog rajta |
|---|---|
| infra-import a mag új alcsomagjába | a határ-kapu **belát** a `core/tabular/`-ba (`rglob`, nem `glob`) |
| az olvashatatlan cella üresnek számít | a **néma sor-eltűnés** mérve van |
| a kétértelmű számot elfogadjuk | az „inkább hiány, mint téves" mérve van |
| a külső feldolgozás alapból engedve | a **G4 fail-closed** alapállapot mérve van |
| a szóköz is lehet elválasztó-jelölt | a felismerő-tippelés elleni kapu mérve van |
| számla-specifikus típus a magban | a **G1-döntés** gépi alakja mérve van |

⚠ **A mutáció az érzékenységet bizonyítja, nem a lefedettséget:** azt állítja,
hogy a kapu fog azon, amit **megnéz**. Amit egyik mutáció sem fed: a dátum- és
logikai értelmezés, a kódolás-jelöltek sorrendje, a `max_rows` csonkolás-jelzés
és a bizonyíték-lánc hash-elése. Azokat sima teszt fedi, mutáció nem.

### Négy hiba, amit a saját kapuk és tesztek találtak — nem az ember

1. **A `csv.Sniffer` nem bukik el, hanem TIPPEL.** Egy elválasztó nélküli soron a
   **szóközt** választotta, és a fejléc szavakra esett szét: a betöltés
   „működött", és szemetet adott. Ráadásul **sor-konzisztenciát igényel**, tehát
   egy cím-sor a fejléc fölött (nagyon gyakori) megbuktatja. **A hiba nem a
   kódban volt, hanem abban, amit a mérőeszközről feltettem** — hogy a
   bizonytalanságát hibával jelzi. Kivezetve; a helyén determinisztikus szabály,
   ami a **fejléc-sorból** dolgozik, holtversenynél elbukik, és a másodlagos
   jelöltet **kimondja**.
2. **A tudományos-alak detektorom vak volt a legveszélyesebb sávra.** A `repr`
   csak `1e16` fölött vált tudományos alakra, a lebegőpontos tárolás viszont már
   **2⁵³ (≈9,007e15)** fölött pontatlan. A kettő között a számjegyek **már
   elvesztek**, de az `e`-vizsgálat nem fogott. Külön ág + külön indok lett belőle.
3. **A sor-üresség szabálya elnyelte a saját jelzésemet.** A gyorsítótár nélküli
   képlethez külön jelző-értéket vezettem be — de a sor-üresség az *értelmezett*
   megbízhatóságból dolgozott, tehát egy ilyen cella az azonosító oszlopban
   **csendben kiütötte az egész sort**. A javítás fogalmi: az üresség a **bemenet**
   tulajdonsága, nem az értelmezés eredménye. Ugyanez a hiba egy második esetet is
   érintett (M7-jelölt azonosító oszlop → **nulla sor**, üres fájlnak látszva).
4. **A semlegességi kapu a saját tervdokumentumomban talált szivárgást:** szó
   szerint bemásoltam a prototípus kódját, és abban benne volt a **cél-rendszer
   neve**. A kapu ott fogott, ahol nem is a kódot néztem.

### Amit NEM mértünk — kimondva

1. **Valódi ügyfél-fájlon nem futott.** Minden teszt-táblázatot magunk
   állítottunk elő. Egy éles fájl összevont celláktól, rejtett soroktól és
   tagolástól máshogy viselkedhet.
2. **Összevont cella (`merged`) kezelése nincs**, és **nem is jelezzük**. Az
   olvasó a bal-felső cella értékét látja, a többit üresnek. Ismert rés.
3. **A makró-mentesség csak részben bizonyított.** A `.xlsm` úton azt mértük,
   hogy olvasható és a gyorsítótárból dolgozik. Azt **nem**, hogy egy VALÓDI
   makró-projektet nem futtatunk le — olyan fájlt nem tudunk előállítani.
   *Amit viszont bizonyítottunk:* egy képlet mellé **szándékosan hibás** tárolt
   értéket injektáltunk (`=1+1` → tárolt `99`), és az adapter **99-et adott** —
   tehát a gyorsítótárat olvassa, és képletet nem értékel ki.
4. **A CI soha nem futott GitHub Actionsön.** A logikáját lokálisan futtattuk +
   YAML-parse. A runner-viselkedés (hálózat, `pip install`, heredoc) bizonyítatlan.
   *(Ez a DC-00-ból örökölt, nyitott tétel.)*
5. **Teljesítmény nagy fájlon nincs mérve.** A kétszeri megnyitás (a
   gyorsítótár-csapda miatt) **megduplázza** a memóriaigényt; a `max_rows`
   korlát ezért van, de a határértéket **nem méréssel** állítottuk be.
6. **A `.NET` oldal érintetlen.** A modul-repóba csak licenc-metaadat került; a
   befogadó végpont a DC-01/DC-02 tárgya, és `dotnet build` ma sem futott.

## DC-06 kivitelezés (2026-07-30, `review_requested`)

> **Kiváltó ok (Gábor):** *„Az elveket mindenképp emeld át. Fontos és hasznos
> tapasztalatokon alapszanak. QUALITY.md előírásait figyelemmel kísérve fejleszd
> a repót. A cél, hogy a gyártás során keletkező munkalapokat és a számlákat, más
> iratokat meglegyen a specifikus elemzése."*

### A központi tervezési döntés: KÉT FÜGGETLEN TENGELY

A motorban eddig **egy** tengely volt: `InputKind` — *hogyan* olvassuk. Gábor
kérése egy **másikról** szól: *mi az irat, és mit kell kinyerni belőle*.

|  | mit mond meg |
|---|---|
| `InputKind` | **hogyan olvassuk** (táblázat · szövegréteg · raszter · kézírás) |
| **`DocumentProfile`** (új) | **mi az irat, és mit kérünk tőle** |

**A kettő szorzat, nem összeg.** Egy munkalap jöhet szkennelve **és** táblázatként;
egy számla lehet digitális **és** papír. Ha egy tengelyre húznánk őket
(`SZKENNELT_MUNKALAP`, `DIGITALIS_SZAMLA`, …), minden új irat-típus **négy** új
ágat jelentene. Ez ugyanaz a hiba lenne, mint a négy bemenetet „OCR"-nek hívni —
csak fordítva.

### Mit épített

| Réteg | Fájl | Mi |
|---|---|---|
| mag | `core/documents/profile.py` | `DocumentProfile` · `FieldSpec` · `ConsistencyRule` — **adat, nem kód** |
| mag | `core/documents/detect.py` | típus-felismerés **horgony-bizonyítékkal**; holtversenynél **nem dönt** |
| mag | `core/documents/extract.py` | címke → érték; szóhatár + **leghosszabb címke nyeri a sort** |
| mag | `core/documents/consistency.py` | **M3** (jelöl, nem javít) + **M4** (kevésbé érzékeny út) |
| mag | `core/observability.py` | **naplózás** (QUALITY §3), abszolút út és titok nélkül |
| infra | `infrastructure/profile_registry.py` | profil-katalógus; azonosító-ütközés **hiba**, nem felülírás |
| infra | `infrastructure/text_lines.py` | minimális szöveg-olvasó, hogy a lánc **ma** futtatható legyen |
| use-case | `usecases/analyze_document.py` | a lánc + a **motor határa** (G1/G2) |
| adat | `profiles/*.json` | **semleges** példa-profilok: kétoldalú kereskedelmi irat · munkalap |
| elvek | `docs/PRINCIPLES.md` | 15 elv, **kapu-megfeleltetéssel** |
| eszköz | `tools/mutation_check.py` + `mutations.json` | a kapu-mérés **paraméterezhető** szkriptté vált |
| eszköz | `tools/measure_dependency_free.py` | a függőség-mentesség mérése, negatív kontrollal |

### QUALITY §4 — az eredmény összevetése az ELVÁRÁSOKKAL

A leállási feltétel a tervben (`docs/DESIGN-DC-06-dokumentum-profilok.md`) öt
pontban állt. Tételesen:

| # | Elvárás | Eredmény | Bizonyíték |
|---|---|---|---|
| 1 | egy irat-típus **konfigurációból** felvehető, kód nélkül | ✅ | `DocumentProfile.from_dict` + körút-teszt a szállított profilokon |
| 2 | a felismerés **bizonyítékkal** dönt | ✅ | horgony-találatok darabszáma, teljes mérleg a diagnosztikában |
| 3 | típus-specifikus **mezők** | ✅ | két profil, két különböző mezőkészlet, ugyanazon a bemeneti úton |
| 4 | **önellenőrző számtan** mérve működik | ✅ | 18 teszt + mutáció; a bomló egyenlőség jelölve, **nem javítva** |
| 5 | a fel nem ismert típus **kimondott hiány**, nem tipp | ✅ | holtverseny → `MISSING`, és mezőket **nem is nyerünk ki** |

**Plusz, amit a QUALITY-olvasás közben pótoltunk** — nem volt a tervben, de
előírás volt:

| QUALITY | Hiány a DC-01b-ben | Pótolva |
|---|---|---|
| §3 — *„a futó kódot loggal kell tudni nyomon követni"* | **nulla logolás** | `core/observability.py`, a táblázatos és az irat-út bekötve; **10 teszt** |
| §5 — *„ami bevált, paraméterezhető szkript"* | a mérők **eldobható mappában** | `tools/mutation_check.py` + `tools/measure_dependency_free.py`, konfigurációval |

### Mért bizonyíték

```
Teljes suite            : 245 zold, 0 bukas   (DC-01b utan 154 volt -> +91)
Fuggoseg NELKUL (mert)  : 232 zold, 0 bukas, 0 KIHAGYVA + negativ kontroll
Mutacio                 : 10/10 kapu bizonyitottan HARAP  (+0 ERVENYTELEN)
Semlegessegi kapu       : TISZTA mind a 3 repoban
CI                      : parse OK, 8 lepes (3 kor: fuggoseg nelkul -> teljes -> mutacio)
Elv-tabla               : 15 elv, 10 teljes / 2 reszleges / 3 nem fedett -- TESZT koti a szamot
```

**A naplózásról külön, mert biztonsági kérdés is:** a napló **szerkezetről és
darabszámról** beszél, tartalomról nem. Sem titok, sem **abszolút útvonal** nem
kerülhet ki, és ezt nem konvenció őrzi: a `log_step` **elbukik** rajta. A teszt
nem csak a kaput méri, hanem a **valódi napló-hívásokat** is — egy kapu, amit a
saját kódunk nem hív, ugyanolyan haszontalan, mint egy mindig zöld teszt.

### Három hiba, amit a saját tesztek és kapuk találtak

**1. ⚠ Egy rövidebb címke ELSZÍVTA egy hosszabb mező sorát — és a hibát
ELMASZKOLTA a javító mechanizmus.**

Az `"Adó"` címke puszta részszövegként beleillett az `"Adóalap: 100000"` sorba,
tehát az adó mezőbe `"alap: 100000"` került → hiány lett belőle. **És itt jön a
tanulságos rész:** a hiányt az **M4-származtatás kitöltötte** a végösszegből — a
**helyes** értékkel. A kimenet tehát **jónak látszott**, miközben a kinyerés rossz
volt.

> **A javító mechanizmus elrejtette a hibát, amit javítani hivatott.** Ezt fejben
> kell tartani minden önjavító réteggel: a származtatás egy *hiányt* pótol, és
> attól a hiány **oka** eltűnik a szem elől.

A javítás két részes, és a második nem triviális: **szóhatár** (az `"Adó"` nem
illik az `"Adóalap"`-ba), **plusz** a sorok kiosztása úgy, hogy a **leghosszabb
illeszkedő címke nyeri a sort** — mert a szóhatár nem véd, ha az egyik címke a
másik **szó-részhalmaza** (`"Idő"` vs. `"Összes idő"`): ott mindkettő szóhatáron
áll. Regressziós teszt mind a kettőre.

**2. Az elv-tábla összegző számát elszámoltam** (9/3/3 helyett 10/2/3). Ez a fajta
szám észrevétlenül csúszik el: a tábla nő, az összegzés marad. **Kapu lett belőle**
(`tests/test_principles.py`), ami a számot a táblához köti — és azt is méri, hogy a
✅-vel jelölt elvek mögött **tényleg van** teszt-fájl. *Egy „✅" egy dokumentumban
a legkényelmesebb hazugság.*

**3. Cirill `о` csúszott azonosítóba — MÁSODSZOR** ugyanabban a munkakörben. Egy
láthatatlan karakter egy azonosítóban a legrosszabb fajta hiba: a szem nem látja,
a keresés nem találja meg. Egy **visszatérő** hibamódra kapu jár, nem figyelem →
`tests/test_source_hygiene.py`, és mellé **két másik kimondott vállalás**, amit
addig semmi nem mért: **nincs `eval`/`exec`** a csomagban (a prototípus
képlet-kiértékelését kimondottan nem vettük át), és **nincs abszolút útvonal** a
forrásban (a repó publikus).

> A 3. kapu építése közben rögtön hozott egy leletet a **saját mintám** ellen: az
> első változat a naplózó modul **szemléltető kommentjére** is illeszkedett. A
> kommenteket **nem** vettem ki a mérésből (ott is lehet igazi szivárgás) — a
> mintát pontosítottam: a szeparátor után **valódi név-karakter** kell álljon.

### Amit NEM mértünk — kimondva

1. **Valódi ügyfél-iraton nem futott.** Minden teszt-irat szintetikus, és **egyik
   sem szkennelt**: a felismerésből jövő hibaprofil (ékezet-tévedés, összeolvadó
   hasáb) itt nem jelenik meg.
2. **A hasáb-szétvágás (M2) nincs megírva**, és ez az átvételi leltárban is nyitott
   tétel. Két hasáb egy sorba olvadva a címke-kinyerést **elrontja** — ma nem jelezzük.
3. **A profil-felismerés nem tud rész-iratot.** Egy több iratot tartalmazó
   szkennelt csomag (számla + munkalap egy fájlban) **holtversenyt** ad, tehát
   `MISSING` — helyes válasz, de azt jelenti, hogy a szétbontás hiányzik.
4. **A címke-kinyerés egy- és kétsoros esetet fed.** Táblázatos elrendezésben, ahol
   a címke egy oszlop-fejléc, **nem fog találni** — ott a táblázatos út a helyes eszköz.
5. **A `.NET` oldal továbbra is érintetlen.** `dotnet build` ma sem futott.
6. **A CI soha nem futott GitHub Actionsön** (DC-00-ból örökölt tétel), és most
   **három** körre nőtt — a runner-viselkedés annyival bizonyítatlanabb.
7. **A naplózás teljesítménye nincs mérve.** A `log_step` a szint-ellenőrzés előtt
   futtatja a mező-ellenőrzést; nagy fájlon ez mérhető költség lehet.

## DC-02 kivitelezés (2026-07-30, `review_requested`) — az INTEGRÁCIÓ

> **Kiváltó ok (Gábor):** *„Folytasd a fejlesztést és az integrációt."*
>
> A rés egyértelmű volt: a motornak már volt képessége (táblázatos betöltés,
> irat-profilok), de **semmi nem fogyasztotta** — a `.NET` modul-repóban csak
> licenc-metaadat volt.

### A központi tervezési döntés: ez ADAT-szerződés, nem HTTP-API

Csábító lett volna a scheduling mintáját szó szerint másolni (OpenAPI 3.1 +
végpont-tábla + generált kliens). **De ott egy futó szolgáltatás API-ja volt a
szerződés; itt nem az:**

- **a G4-döntés (helyi alap, külső opcionális) miatt a motor futhat in-process
  is** — egy HTTP-API feltételezné a telepítési alakot, pont azt, amit a G4
  szándékosan konfigurációnak hagyott;
- a motor **könyvtár és eszköz**, nem szerver.

Ezért a szerződés a `CaptureRecord` **wire-alakja** (JSON Schema 2020-12,
OpenAPI 3.1-kompatibilis). Ez működik in-process hívásnál, soron át, és akkor is,
ha később HTTP kerül elé: **a szállítás cserélhető, az alak nem.**

> A scheduling-minta **lényegének** átvétele, nem a formájának: ott is az volt a
> lényeg, hogy a szerződés **forrás-igazság**, kétirányú kapuval és generált
> fogyasztóval — nem az, hogy YAML-ban végpontok álltak.

### Mit épített

| Oldal | Fájl | Mi |
|---|---|---|
| motor | `contracts/capture-record.schema.json` | a **publikált** szerződés — forrás-igazság, nem melléktermék |
| motor | `contracts/capture-record.pin.json` | SHA-256 pin, **kimondva, mit hasheltünk** |
| motor | `contracts/samples/…json` | **aranypéldány a motor VALÓDI kimenetéből** (bomló önellenőrzéssel) |
| motor | `infrastructure/wire.py` | `CaptureRecord` → wire; a wire nem árulja el, mi van mögötte |
| motor | `tools/contract_pin.py` | pin számítás/ellenőrzés, paraméterezhetően |
| motor | `tests/test_contract.py` | **26 teszt**: kétirányú fedés + a származtatott mező premisszája |
| modul | `src/…Contracts/` | DTO-k + `CaptureContract` (verzió-kapu) + `CaptureConfidence` |
| modul | `tests/…Contracts.Tests/` | **32 teszt**: séma-konformancia, aranypéldány, előre-kompatibilitás |
| mindkettő | `.gitattributes` | a hash-pinnelt fájlok sorvégei nem fordulhatnak át |

### A hash a WIRE-TARTALMAT fedi — három kapu, nem egy

Az epic figyelmeztetése szó szerint: *„Ha egy mező kimegy a wire-ra, de a hash-en
kívül marad, a hash megszűnik identitás lenni. Származtatott mezőt akkor nem kell
hashelni, ha minden bemenete hashelve van — és ezt a premisszát ellenőrizni kell,
nem feltételezni."*

| # | Kapu | Mit zár be |
|---|---|---|
| 1 | minden **előállított** mező szerepel a sémában | egy séma nélküli mező a hash-en kívül utazna |
| 2 | minden **sémában deklarált** mező elő is áll | egy mező csendben megszűnhetne mérve lenni |
| 3 | a **származtatott** mező premisszája | a `needs_human`-t **újraszámoljuk a wire-ból** és összevetjük |

Mindháromhoz **negatív kontroll** jár, és a próba-rekord **minden érték-típust**
tartalmaz — külön teszt méri, hogy tartalmaz, mert egy részleges próba-rekord
mellett az 1. kapu csak egy részhalmazról állítana valamit.

### A `.NET` oldal: a szerződés a buildbe kötve, MÉRVE

`dotnet 8.0.419` elérhető, tehát az integráció nem leírt, hanem **mért**:

```
dotnet build : 0 Warning, 0 Error   (TreatWarningsAsErrors=true)
dotnet test  : 32 zold, 0 bukas, 0 kihagyva
```

Három kapu köti a szerződést a kódhoz, és **mind a három mutációval igazolva**:

| Mutáció | Mit bizonyít, hogy fog rajta |
|---|---|
| DTO-tag átnevezése | a 2. irány: a szerződésen kívül utazó tag elbukik |
| a vendorolt séma **egyetlen bájtja** | a pin-kapu: a motor változása a modulban azonnal piros |
| ismeretlen mező tiltása | az előre-kompatibilitás: additív bővítés nem törheti a fogyasztót |

**Az előre-kompatibilitás két szabálya EGYÜTT** — és egymás nélkül
használhatatlanok: **ismeretlen MEZŐ átmegy** (különben minden additív bővítés
törné a fogyasztót, és a „kimondott verzió-emelés" elve értelmét vesztené),
**ismeretlen FŐ verzió elbukik** (különben a törő változás csendben téves adatot
adna, mert a mezők részben ugyanúgy hívódnak).

**És egy fail-closed döntés, amit ki kell mondani:** egy **ismeretlen
megbízhatósági szint NEM automatikusan feldolgozható**. Ha egy jövőbeli motor új
szintet vezet be, a régebbi modul nem veheti megerősítettnek — az ellenkezője
csendes tévedés lenne.

### Mért bizonyíték

```
MOTOR (Python)
  Teljes suite            : 274 zold, 0 bukas   (DC-06 utan 245 volt -> +29)
  Fuggoseg NELKUL (mert)  : 261 zold, 0 bukas, 0 KIHAGYVA + negativ kontroll
  Mutacio                 : 13/13 kapu harap, 0 ERVENYTELEN
  Kontraktus-pin          : EGYEZIK (verzio 1.0.0)
  Semlegessegi kapu       : TISZTA

MODUL (.NET)
  dotnet build            : 0 Warning, 0 Error
  dotnet test             : 32 zold, 0 bukas, 0 kihagyva
  .NET mutacio            : 3/3 integracios kapu harap
  Semlegessegi kapu       : TISZTA
  csproj darabszam        : 2  (az "oszinte nulla" szamlalo mostantol valos buildet ad)

KERESZT-REPO
  a vendorolt es a motor-beli sema BAJTRA egyezik (sha256:6f2aef82323c…)
```

### ⚠ Egy kapu, ami SZÁNDÉKOSAN piros lesz a motor pusholásáig

A modul CI-jába bekerült a **kereszt-repó szerződés-drift** kapu: letölti a motor
**publikált** sémáját, és összeveti a vendorolt másolattal. Amíg a motor repója
nincs kint, ez a lépés **elbukik** — és ezt nem nyeltem el `continue-on-error`-ral:

> **Egy pin egy nem publikált szerződésre nem pin.** Amíg a motor nincs kint, a
> modul csak azt tudja, hogy a **saját** vendorolt másolata és a **saját** pinje
> egyezik — azt nem, hogy a motor ugyanezt adja. Egy elnyelt hiba pontosan úgy
> néz ki, mint egy sikeres ellenőrzés.

**@root: ez döntési pont.** Ha nem akarod, hogy a modul CI-ja piros legyen a
pushig, a lépés kivehető — de akkor a kereszt-repó drift **nincs mérve**, és ezt
ki kell mondani.

### Három hiba, amit a saját kapuk találtak — és mindhárom a MÉRŐESZKÖZBEN volt

**1. ⚠ A saját mutációs eszközöm elrontotta a hash-pinnelt fájlt.** A
`write_text` Windowson `LF → CRLF`-et fordít, tehát a visszaállítás
**szöveg-azonos** volt, de **nem bájt-azonos** — és a vendorolt séma 112 bájttal
nőtt. **A pin-kapu fogta meg**, és ezzel igazolta a tervezési döntést (a hash
bájt-szintű, tehát a formázási változás is új pint ad).

**2. A javítás új rést nyitott, és az eszköz KIMONDTA.** Bájt-szintre váltottam,
amitől **három** többsoros mutációs pont `ERVENYTELEN` lett: a készletben LF áll,
a forrásfájlokban CRLF. A mutáció-készlet így **csendben szűkült volna** 13-ról
10-re — de az eszköz nem 10/10-et jelentett sikerként, hanem
`10/10 + 3 ERVENYTELEN`-t. A helyes válasz: **az illesztés szövegen, a
visszaállítás bájton**.

**3. A generátoraim CRLF-fel írtak.** Az új sorvég-kapu kimutatta, hogy a pin és
az aranypéldány CRLF-es. Ez a pint nem buktatta (a pin a *sémát* hasheli), de egy
hashelés alá eső műveltárnál lappangó csapda — **platform-függő pin**.

**A tartós javítás nem a fájlok újraírása volt, hanem `.gitattributes`:** a gépen
`core.autocrlf=true`, tehát a **következő klónozásnál** a git visszaírta volna a
CRLF-et, és a pin **minden Windows-fejlesztőnél elbukott volna** — olyan hibával,
aminek a forrása nem is a repóban van. `contracts/** -text` mindkét repóban.

**És egy negyedik, amit külön kimondok:** a függőség-mentes mérés **nem fedte a
kontraktus-teszteket** (a suite 268-at futtatott, a mérés 232-t, a munkafüzet-kör
13-at — **23 teszt egyik körben sem volt**). A `232 zöld` szám nem fedte azt, amit
fedni látszott. Ebből is **kapu** lett
(`tests/test_measurement_completeness.py`): minden teszt-modul pontosan egy
körben fut, és egy új teszt-fájl, ami egyikben sem szerepel, ott bukik el.

### Amit NEM mértünk — kimondva

1. **A CI egyik repóban sem futott GitHub Actionsön.** Most már **három** kör a
   motorban és **nyolc** lépés a modulban — a runner-viselkedés annyival
   bizonyítatlanabb. *(DC-00-ból örökölt tétel.)*
2. **A kereszt-repó drift-kapu bizonyítatlan** (ld. fent): a motor publikálását
   igényli.
3. **Nincs NuGet-publikálás.** A csomagolás külön, kimondott lépés lesz.
4. **A modul semmit nem TESZ a befogadott adattal** — nincs DMS-tárolás, nincs
   jogosultság-kezelés, nincs indexelés. Ez a szelet a **határt** építette, nem a
   tárolást; az a DC-01/DC-03.
5. **A `rows` séma-szinten homogén.** Egy iraton, ahol két különböző tétel-tábla
   van, a wire nem különíti el őket.
6. **A `value_type` `MISSING` esetén `null`** — ott nincs érték, tehát a típus sem
   levezethető. A szándékolt típust a fogyasztó a **saját** sémájából tudja.
7. **A `.NET` oldalon nincs végpont, tehát route-drift kapu sincs** — a
   scheduling-mintából ez itt nem értelmezhető, és ezt nem nevezzük
   „teljesítettnek".

## ⚠ A DC-01 HÁROM szeletre bomlott — workflow-terv, 2026-07-30

**Részletes terv:** [`DC-01-TERV-2026-07-30.md`](DC-01-TERV-2026-07-30.md)
(17 ügynökös workflow: 4 felderítés → 3 terv → 9 adverzáriális bírálat → szintézis;
mérve 3,04 M token / 96 perc). **A bírálók egyik tervet sem pontozták magasra**
(26–33/50), mind „javítással építhető", egy **elutasítva** — ez a jelentés őszinte
része, nem a kudarcé.

### A központi tervezési döntés

> **A DC-01 első szelete OLVASÁS, nem írás.** A „kereshető PDF" nem szelet, hanem
> **kimenet** — és ma az egyetlen bemenet, amiből előállíthatnánk, **már kereshető**
> (digitális PDF). A PDF-írás értelmét a **raszter-út** adja, az pedig 923 MB / 26
> csomag, GPL-aknával és import-időben hálózatra menő felismerővel (mind mérve).

### A tíz mért blokkoló, ami a bontást kikényszerítette

| # | Blokkoló | Mérve |
|---|---|---|
| 1 | **`fitz` (PyMuPDF) TILTOTT** — `Dual Licensed – GNU AFFERO` | PyPI metaadat; a `Bevetelezes` 4 fájlja használja |
| 2 | felismerő telepítési teher | **923 MB / 26 csomag** (torch 453 MB) vs. PDF-lánc **25 MB / 6** |
| 3 | **G4-sérülés alapbeállításon** | `paddleocr` import-időben **7 kimenő TLS**; `easyocr` **15,1 MB** letöltés |
| 4 | **modell-súlyok licence mérhetetlen** | 0 licenc-fájl a gyorsítótárakban |
| 5 | **a DMS-ben nincs grant-írási út** | 0 command / 0 handler / 0 endpoint, miközben az ACL fail-closed |
| 6 | **a DMS nem fogad binárist** | nincs multipart végpont; `SaveAsync`/`AttachBlob` 0 éles hívóval |
| 7 | **a `Hosting` csomagnak NINCS licence** | se `PackageLicenseExpression`, se `PackageLicenseFile` — a doccapture viszont **MIT**-et deklarál |
| 8 | nincs hely a `content_hash`-nek | 0 találat → **az M13 a platform-oldalon nem létezik** |
| 9 | a `Confidence` elveszik | a `review_note`-ot minden FSM-átmenet felülírja |
| 10 | **`AddVersion` visszavonná a jóváhagyást** | `Status = Draft`, `ReviewNote = null` → egy gépi származék **csendben** visszavonna egy Approved dokumentumot |

⚠ **A 10. a legsúlyosabb, és ez buktatta meg az egyik terv központi ötletét.** Az a
terv a származékot az eredeti **új verziójaként** vitte volna be — így elegánsan
elkerülte volna a hiányzó grant-utat. De mérve: az `AddVersion` `Draft`-ra állítja a
státuszt és **null**-ra a review-jegyzetet. *„Egy jóváhagyási-hurok termékben ez pont
az a kár, ami ellen létezünk."*

### Amit a DC-01a NEM fog tudni — kimondva

- **M2 (hasáb) csak JELZÉS, nem szétvágás.** Ahol a szövegréteg egy futamban adja a
  két hasábot, a rés **a szövegből elveszett** (~20 szóköz → 1), és az egyetlen
  orvosság a horgony-token szerinti vágás — a horgony viszont **profil-adat**
  (DC-06), tehát vágó-szabály a PDF-adapterben **két igazságot** teremtene.
  **M2 = `részben`, nem `✅`.**
- **A `CaptureRecordStore` zárja marad nyitott** — a szelet **semmilyen fájlt nem
  ír**, tehát a kérdés elvileg sem áll be. A `PRINCIPLES.md` „Zár még nincs" sora
  **változatlan**: nem javítjuk és nem minősítjük teljesítettnek.
- **Egyetlen külső határátlépés sincs**, tehát a G4-kapunak itt **nincs mit őriznie**
  — ezt kimondjuk, nem nevezzük teljesítettnek.

## Minőségi kapuk

Mért darabszám, nem „zöld" · `review_requested` a szokásos bizonyítékokkal ·
done/APPROVED kizárólag root-review · a kontraktus **hash-pinnelt**, a
verzió-emelés kimondott · **szótár-őr mindhárom repóban**, a
`spaceos-doccapture-engine`-ben a legszigorúbb (márka, iparág, ügyfélnév tilos).
