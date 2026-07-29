# CLAUDE.md — DOC-CAPTURE Terminal (JoineryTech sziget)

> Dokumentum-digitalizálás **termékként**: cégek integrálásának támogatása
> PDF-ből, Excelből, papírról és kézírásból.
> Epic: [`docs/tasks/EPIC-DOC-CAPTURE-2026Q3/README.md`](../../docs/tasks/EPIC-DOC-CAPTURE-2026Q3/README.md)

---

## SZEREP

Három **külön repóban** épülő termék gazdája (Gábor döntése: külön repók, hogy
termékként szolgáltatni lehessen):

| Repó | Mi | ModuleId |
|---|---|---|
| `spaceos-doccapture-engine` (Python) | a motor: Excel/CSV parse · digitális PDF · OCR · kézírás → normalizált javaslat + kereshető PDF + RAG-export | — |
| `spaceos-modules-doccapture` (.NET) | befogadás, DMS-tárolás ACL-lel, RAG-indexelés | `spaceos.doccapture` |
| `joinerytech-goods-receipt` | bevételezés: számla-sorok → cikkszám + mennyiség, jóváhagyási hurokkal | `joinerytech.procurement` bővítése |

**Forrás-projektek** (nem másolni — általánosítva átemelni):
`C:\Users\szant\Documents\Development\Bevetelezes` (éles munkafolyamat) ·
`C:\Users\szant\Documents\Development\tartalom_mentes` (hexagonális motor, 46 teszt-fájl).

---

## A HÁROM SZABÁLY, AMI EBBEN A TERMÉKBEN A LEGFONTOSABB

### 1. A négy bemenet NÉGY külön út — összemosni tervezési hiba

| Bemenet | Amire szükség van | Modell kell? |
|---|---|---|
| Excel / CSV | oszlop-térképezés, típus, validáció | **nem** — ez parse |
| Digitális PDF | a meglévő szövegréteg | **nem** |
| Papír / szkennelt | raszter → szövegréteg (OCR) | részben |
| Kézírás | vizuális átirat bizonytalanság-jelzéssel | igen |

Ha mindet „OCR-nek" hívjuk, a legolcsóbb eseteket a legdrágább úton oldjuk meg,
és **modellt engedünk oda, ahol determinisztikus parse a helyes válasz**.

### 2. LLM az OLVASÁSHOZ, determinisztikus szabály a KÖNYVELÉSHEZ

A modell abban segít, *mi van a papíron*. Abban **nem**, hogy *mi kerüljön a
rendszerbe*: a cikkszám-párosítás, a mennyiség-átváltás és a jóváhagyás marad
szabály + ember. **Egy LLM-tipp nem auditálható; egy megfeleltetési tábla sora
igen.** A `Bevetelezes` ma ezért használható — a könyvelési úton nulla LLM-hívás.

Termékként ez **eladási érv**, nem korlát: a vevő könyvelése auditálható marad.

### 3. A jóváhagyási hurok a termék magja — nem az OCR

A `Bevetelezes` Excelben javasol, az ember **`x`-szel** jóváhagy, és a
megfeleltetési tábla **nő**. Ez adja, hogy a napi rutin alig változik — és ez a
bevezethetőség kulcsa. **Ha ezt egy „szép UI" kedvéért felborítjuk, a bevezetés
meg fog állni az első ügyfélnél.**

---

## A FORRÁS-REPÓK SZABÁLYAI — Gábor a munka közben hozta meg őket

**Ezek nem ötletek, hanem drágán megvett tapasztalatok.** Aki a terméket építi,
ezeket vigye tovább; ha valamit el akarsz hagyni, **kérdezz rá**.

### `Bevetelezes` — a könyvelési út fegyelme

- **Determinizmus a könyvelési útvonalon.** LLM csak fejlesztésben és a hiányok
  offline triage-ában; a párosító/bevételező hot path-ban **NINCS** LLM.
- **„Inkább hiány, mint téves."** Bizonytalan adatot **ne tippelj**: jelöld
  `ELLENŐRIZD` (sárga) / `HIÁNY` (piros) emberi ellenőrzésre. — *Ez a termék
  legfontosabb viselkedési szabálya: a csendes tévedés drágább, mint a bevallott
  hiány.*
- **Excel = forrás-igazság.** A párosító táblát és a javító Exceleket a
  felhasználó hagyja jóvá; a szkript onnan olvas.
- **Eredetik érintetlenek.** Átnevezés/szétbontás **másolatot** készít új mappába.
- **SAP-számokat (10 jegyű) és kézírást NEM olvasunk gépileg**
  (`READ_SAP_HANDWRITING = False`) — kézi kitöltés, sárgán jelölve.
- **Vevő-horgony:** a Vevő mindig ugyanaz (adószámmal azonosítva), a beszállító
  az, ami *nem* ez. Kétoszlopos OCR gyakran egy sorba olvad → a sort a
  vevő-token előtt vágjuk. *Általánosítandó: a horgony legyen konfiguráció.*
- **Kereszt-ellenőrzés, nem hit:** `mennyiség × egységár ≟ nettó` (1% tűrés), és
  a nettó **függetlenül** ellenőrizhető az ÁFA/bruttó sorból. Ahol nem stimmel,
  ott jelölés van, nem javítás.
- **Az egységárból számolt érték független a mennyiség OCR-hibájától** — ahol
  lehet, ezt az utat válaszd.
- Fájlnévből tiltott karakterek `sanitize()`-zal; a cél `.xlsx` legyen bezárva
  írás előtt (`PermissionError` kezelve); a `tessdata/` **soha** nem törlendő.

### `tartalom_mentes` — a motor fegyelme

- **Hexagonális határ:** `core/`-ban **nincs** infrastruktúra-import.
- **Minden konfigurálható érték a `PipelineConfig`-on át** — soha ne hardcode-olj.
  (Ez egybevág a QUALITY §3-mal.)
- A támogatott formátumok **egy helyen** definiáltak (`config.supported_extensions`).
- **Szálbiztonság:** párhuzamos mentésnél lock.
- Atomikus JSON-mentés (tmp + fsync + replace); inkrementális feldolgozás
  jelzőkkel; retry exponenciális backoffal a Vision-kliensben.

### `doorstar-instance/terminals/import-discovery` — a már futó próba-terminál

Gábor jelezte: **ez a terminál már fut**, és a bevezetési tapasztalatokat
gyűjti. **Normatív bemenet** — olvasd el a `state.md` és `memory.md` fájljait,
mielőtt bármit terveznél. A kimondott működési szabályai ránk is állnak:

- **A forrásmappa csak olvasható**: nincs létrehozás, átnevezés, törlés, másolás.
- **XLSM: OOXML-cache olvasás** — VBA, Excel, formula, Power Query és külső link
  futtatása **tilos**. *(Biztonsági és determinizmus-kérdés egyszerre.)*
- Kizárás: `.bak`, `.dwl`, `.dwl2`, `~$*`, lock- és cache-fájlok.
- **Dokumentumhivatkozás = relatív útvonal + SHA-256.** Üzleti bináris **nem**
  kerül a repóba.
- **Production/public adatbázisba írás tilos.** Csak reviewed preview után,
  explicit `schema=doorstar_test` védelemmel, DRAFT-ként.
- **Az agent nem jóváhagyó:** DRAFT-ot készít elő, az ember hitelesít.
- Mértékegység: az **eredetit előbb meg kell őrizni**, a konverzió **explicit és
  naplózott**.

> **A közös nevező mind a háromban:** a rendszer **javasol és jelöl**, az ember
> **dönt**, és a döntésből **tudás lesz**. Ez a termék, nem az OCR.

---

## SZABÁLYOK A PLATFORM-REPÓBÓL — kötelező olvasmány

### Minőség: [`QUALITY.md`](../../QUALITY.md)

A legfontosabbak erre a munkára:

- **Teljes architekturális tervezés nélkül nem kezdünk feature-fejlesztésbe** (§2).
  A design intentet is rögzítjük, nem csak a végeredményt.
- **Clean code + DDD**, minden kommentelve és README-vel; **nincs nagy fájl**;
  **nincs hardcodolt adat** — configból jön; **a futó kódot loggal kell követni** (§3).
- **Unit ÉS integrációs teszt**, és a végén **össze kell vetni az elvárásokkal**;
  a kivitelezést a task-fájlba rögzítjük (§4).
- **Token-tudatosság** (§5): ismert lépéssorra **paraméterezhető szkript** jár,
  nem LLM-generálás. Ez itt kétszeresen igaz — ld. az 1. és 2. szabályt.
- **Készítő ≠ ellenőr** (§8): a saját hibáidra vak vagy. A „kész" =
  **ellenőrizhető bizonyíték**, nem önértékelés.
- **Stabilitás > új feature**; secrets/token/`.env` **sosem** kerül gitre (§7).

### Review-kapu (a sziget konvenciója)

- **`done`/`APPROVED`-ot KIZÁRÓLAG a root-review állít.** Te
  **`review_requested`**-et jelentesz, **mért bizonyítékkal**.
- **Mért darabszám, nem „zöld"**: „324 teszt zöld, 0 bukás", nem „a tesztek jók".
- Amit **nem tudtál** megmérni, azt **mondd ki** — ne tűnjön el egy összesített
  szám mögött. (Ma több esetben ez volt a legértékesebb része egy jelentésnek.)

### Mérés-fegyelem — a mai nap tanulságai, drágán megvéve

- **„Mit bizonyít, ha átment?"** Egy zöld szám nem bizonyíték, amíg meg nem
  mondod, mit mér. Ma négy alakban került elő csendben rossz dolog: megengedő
  teszt (`expect([400,401,403])`), kézzel karbantartott route-lista,
  „legacy adósságnak" minősített lint-figyelmeztetés, és egy üresen zöld
  számláló.
- **Egy jelzés, amit adósságnak minősítesz, mondd ki, mit állítasz vele.** Egy
  használatlan import esetén: *mi az, ami emiatt nem fut le?*
- **A detektor is tévedhet.** Ha a mérésed hibát jelez, előbb a mérést értsd meg,
  csak utána javítsd a kódot.
- **Két igazság ugyanarról = a leggyakoribb hibánk.** Ma három ilyet zártunk.
  Ha ugyanazt két helyen számoljuk, az egyik előbb-utóbb hazudni fog.

### Fájl- és git-fegyelem

- **Nincs `git add -A` vegyes fán** — taskonkénti fájllista.
- **A commitot a root végzi**; te `review_requested`-et jelentesz.
- **Idegen repóban destruktív parancs nem fér bele** (`reset --hard`,
  force-push) — ha vissza kell vonni, `revert`.
- Közös fájl előtt **nézd az mtime-ot**; ütközésnél a bent lévő író fejezze be.

### Modul-katalógus: [`ADR-067`](../../docs/knowledge/adr/ADR-067-module-catalog-and-lifecycle.md)

- **`spaceos.*`** = iparág-agnosztikus, **bizonyítottan** mentes faipari
  terminológiától. A `spaceos.doccapture` és a motor ilyen.
- **`joinerytech.*`** = faipari/ökoszisztéma-specifikus.
- **Szótár-őr kötelező** mindhárom repóban, a motorban a legszigorúbb:
  **márka-, iparági és ügyfélnév nem lehet benne.** Ma tanultuk meg, hogy ezt
  gépi kapunak kell mérnie: a `portal-ui`-ban beégetve maradt a `joinery/tech`
  szóvédjegy, és ezt a Doorstar tőlünk függetlenül szintén kifogásolta.

### Kontraktus-fegyelem (a scheduling bevált mintája)

- **Publikált OpenAPI 3.1 + hash-pin + generált kliens.** A motor Python marad,
  a platform **szerződés ellen** hív — így a motor cserélhető.
- **Additív bővítés**, verzió-emelés **kimondva**; a fogyasztónak **egy** üzenet
  megy a kör végén, nem szeletenként.
- **A hash fedje a wire-tartalmat.** Ha egy mező kimegy a wire-ra, de a hash-en
  kívül marad, a hash megszűnik identitás lenni. Származtatott mezőt akkor nem
  kell hashelni, ha **minden bemenete** hashelve van — és ezt a premisszát
  **ellenőrizni kell**, nem feltételezni.

### Adatbázis: `docs/knowledge/patterns/DATABASE_PATTERNS.md` + a Nexus RAG

Backend-infra munka előtt **kötelező forrás** (Gábor kérése). Az EF
owned-értékobjektum csapdája külön figyelmet érdemel: osztott owned példány
csendben NULL oszlopokat ír.

---

## MUNKAFOLYAMAT

1. `inbox/` feladat olvasása → spec-review → **kérdezz, ha ellentmondást látsz**
2. Implementáció a kiírás fájlhatárain belül
3. Tesztek + **mért** kapuk
4. `review_requested` az `outbox/`-ba + a csatornára, mért bizonyítékkal
5. Nagyobb lépés végén **memória-mentés** (QUALITY §5)

## KOORDINÁCIÓ

- **Csatorna:** [`AGENT-CHANNEL.md`](../../AGENT-CHANNEL.md) — a fájl **elejét**
  („Nyitott szálak") és a **végét** is olvasd. Archívum:
  `docs/knowledge/archive/agent-channel/`.
- **Termékdöntés EGY csatornán megy fel Gáborhoz** — a rooton keresztül. Ha
  terméknyitást látsz, jelezd a csatornán; ha mégis közvetlenül kérdezel, a
  **választ írd ki** a csatornára.
- **Doorstar:** *„a Doorstarnál is ezekbe ütközünk"* — ők az első valós terep
  (Import Inbox, Excel-forráshoz kötött dokumentumhivatkozás, `SURVEY_PENDING`).
  A platform ⇄ Doorstar **kétirányú áramlás** ide is áll; a federation-üzenetre
  **válaszolni kell**, a feldolgozás nem helyettesíti a választ.

## GÁBOR-KAPUK — ezek nélkül ne kezdd

A G1-G5 az epic README-jében. Kiemelve: **G4 (adatvédelem)** dönti el a motor
telepítési alakját — mehet-e a számla külső LLM-szolgáltatáshoz, vagy a
Vision-fázis csak helyben futhat. **A szeletek előtt kell.**

Gábor **külön taszkban gyűjti a bevezetési tapasztalatokat** — az normatív
bemenet a jóváhagyási hurok alakjához (G3). **A DC-04-et ne kezdd előtte.**

---

_JoineryTech DOC-CAPTURE Terminal_
