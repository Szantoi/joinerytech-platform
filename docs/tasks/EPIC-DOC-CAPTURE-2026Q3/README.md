# EPIC-DOC-CAPTURE-2026Q3 — dokumentum-digitalizálás **termékként**, több külön repóban

- **Kiváltó ok:** Gábor (2026-07-29): *„Szeretném ezeket a készségeket behozni
  javított formában a JoineryTech szolgáltatásai közé"* — pontosítással:
  **külön repókban, hogy termékként szolgáltatni lehessen.**
- **Előzmény-felmérés:** `docs/knowledge/architecture/OCR_PROJEKTEK_FELMERES_2026-07-29.md`
- **Forrás-projektek:** `Bevetelezes` (éles munkafolyamat) · `tartalom_mentes`
  (hexagonális OCR/RAG-motor, 19 teszt-fájl)
- **Státusz:** **DC-00 kész** (`review_requested`, 2026-07-29) — a további
  szeletek a G-kapukra várnak; a kritikus úton a **G4** a blokkoló

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

## G-kapuk — Gábor döntései, a szelet-terv ezekre épül

### G1. A számla-kinyerés forrás-igazsága

A `tartalom_mentes` **már tartalmaz** `InvoiceExtractionPort`-ot, miközben a
`Bevetelezes` az, ami élesben, determinisztikusan működik. **Két igazság
ugyanarról** — ma több ilyet zártunk a platformon.

**Javaslat:** a `Bevetelezes` a gazda (3. repó); a motor invoice-portja
**bemenet-előkészítővé** fokozódik le, vagy kivezetendő. Párhuzamosan
fejleszteni mindkettőt a legrosszabb.

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

**Döntendő:** marad-e az Excel a jóváhagyás felülete az első körben (javaslom),
vagy azonnal portál-UI. Ha a rutint egy „szép UI" kedvéért felborítjuk, a
bevezetés meg fog állni az első ügyfélnél.

### G4. Adatvédelem — **ez a telepítési alakot dönti el**

Beszállítói számla cégadatot és árat tartalmaz. Mehet-e külső
LLM-szolgáltatáshoz, vagy a Vision-fázis **csak helyben** futhat?

Termékként ez nem mellékes: egy „az adatai nem hagyják el a telephelyet"
változat más piacot nyit, mint egy felhő-alapú. **Ezt a szeletek előtt kell
eldönteni**, mert a motor telepítési alakja múlik rajta.

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
és `license` mező egyetlen `package.json`-ban sem. Vagyis a repók ma
**publikusak licenc nélkül** = minden jog fenntartva — ami a kimondott céllal
(„minél többen használják") **ellentétes**. Amíg nincs döntés, a doccapture
repókba **szándékosan nem tettünk** LICENSE-t, hogy ne előlegezzük meg.

## Szelet-terv

| # | Szelet | Repó | Miért ez a sorrend |
|---|---|---|---|
| ~~**DC-00**~~ ✅ | Repók, CI, verziózás, semlegességi őr | mind3 | **KÉSZ** (`review_requested`, 2026-07-29) — ld. a „DC-00 kivitelezés" szakaszt |
| **DC-01** | **Kereshető PDF → DMS**, a mai ACL-lel | 1+2 | nem érinti a könyvelést, **azonnal hasznos**, és kockázat nélkül kiméri az integrációs határt |
| **DC-01b** | **Excel/CSV betöltő** — oszlop-térképezés + validáció, modell nélkül | 1+2 | a cég-integráció **leggyakoribb** bemenete, és a legolcsóbb út: árlista, cikktörzs, beszállítói lista. Az OCR előtt térül meg. |
| **DC-02** | Capture-kontraktus (OpenAPI 3.1 + hash-pin + generált kliens) | 1 | a motor cserélhető anélkül, hogy a platform tudna róla |
| **DC-03** | RAG-indexelés (`VectorStorePort` → Nexus) | 1+2 | a Markdown-export már megvan |
| **DC-04** | Bevételezés: sorok + megfeleltetés + **jóváhagyási hurok** | 3 | csak G1-G3 után; ez érinti a könyvelést, és ez adja a legtöbbet |
| **DC-05** | Kézírás (`HandwritingOCRPort`) | 1 | üzemi mérési lap; saját minőségi kapu kell hozzá |

**Kritikus út a valós haszonig:** G4 → DC-00 → **DC-01b** → DC-01 → DC-02 →
(G1+G2+G3, Gábor tapasztalat-gyűjtésével) → DC-04.

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

## Minőségi kapuk

Mért darabszám, nem „zöld" · `review_requested` a szokásos bizonyítékokkal ·
done/APPROVED kizárólag root-review · a kontraktus **hash-pinnelt**, a
verzió-emelés kimondott · **szótár-őr mindhárom repóban**, a
`spaceos-doccapture-engine`-ben a legszigorúbb (márka, iparág, ügyfélnév tilos).
