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

**Forrás-projektek** (nem másolni — általánosítva átemelni): két helyi, **nem
publikus** prototípus a fejlesztői munkakönyvtárban, a platform-repóval azonos
szinten — egy éles bevételezési munkafolyamat és egy hexagonális OCR/RAG-motor
(19 teszt-fájl). A pontos elérési utat a **gitignore-olt** `LOCAL_PATHS.md`
tartja; abszolút útvonal **nem kerül követett fájlba** (ez a repó publikus, és
a gépi könyvtárszerkezet felfedése fölösleges kitettség).

⚠ **Csak az élő fából szabad átemelni** — a `.claude/worktrees/agent-*`
másolatok régebbi logikát tartalmaznak, és aki rossz fából emel át, **csendben
visszalép egy verziót**.

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

### 3. A jóváhagyási hurok a termék magja — nem az OCR, és nem a felület

A **mechanika** a lényeg: a rendszer **javasol**, az ember **egy mozdulattal**
jóváhagy, és a megfeleltetési tábla **nő**. Ez adja, hogy a napi rutin alig
változik — és ez a bevezethetőség kulcsa.

> **FRISSÍTVE 2026-07-30 (G3-döntés, Gábor).** Ez a szabály korábban azt írta,
> hogy a jóváhagyás **Excelben** történik, és hogy „ha ezt egy szép UI kedvéért
> felborítjuk, a bevezetés meg fog állni az első ügyfélnél". **Gábor a
> kockázat ismeretében a portál-UI-t választotta** (a kockázat benne volt az
> opció szövegében), tehát a felület **portál**, nem Excel.
>
> **Amit a döntés NEM változtatott meg — ez a szabály maradék éle:**
>
> 1. **A mechanika nem cserélhető, csak a felület.** Javaslat → **egy
>    mozdulattal** jóváhagyás → a tábla **nő**. Ha a portál ebből több lépést
>    csinál, az a szabály megsértése, nem a szabály fejlesztése.
> 2. **A jóváhagyó felület a forrás-igazság (M9).** Nem lehet két helyen
>    jóváhagyni — se Excelben *és* portálon.
> 3. **A lépésszámot a mai Excel-úthoz képest MEG KELL MÉRNI, nem érezni.**
>    *(root-kötelező: a DC-04 enélkül nem zárható le.)* Ez az egyetlen dolog,
>    ami a G3 kockázatát mérhetővé teszi ahelyett, hogy vitatkoznánk róla.
>
> A szabály tehát **nem** esett el — az **indoka** maradt, a **hordozója**
> változott. Ezt a különbséget tartsd meg: „a rutin ne boruljon fel" ≠ „a
> felület legyen Excel".

---

## A FORRÁS-REPÓK SZABÁLYAI — Gábor a munka közben hozta meg őket

**Ezek nem ötletek, hanem drágán megvett tapasztalatok.** Aki a terméket építi,
ezeket vigye tovább; ha valamit el akarsz hagyni, **kérdezz rá**.

> ⚠ **Általános mintaként tanuld meg, ne receptként.** A forrás-projektek egy
> konkrét cég konkrét rendszerére készültek. **A cél-rendszer, a cégnevek, az
> adószámok, az adókulcsok, a mértékegységek és a mezőnevek mind
> KONFIGURÁCIÓ** — ha bármelyik a kódba kerül, a termék egyetlen ügyfélnél
> használható. Az alábbiak a **minták**, amikre illeszteni kell.

### Minta-készlet: dokumentumból adat (a `Bevetelezes` tapasztalatából általánosítva)

**M1 — Horgony-fél és ellenfél.** Egy kétoldalú dokumentumon az egyik fél
**állandó** (mi vagyunk), a másik változó. A horgonyt **stabil azonosítóval**
ismerd fel (adószám, regisztrációs szám — konfigurációból), és az ellenfél az,
ami *nem* a horgony. Ne névre illessz: a név elírható, az azonosító nem.

**M2 — Összeolvadó oszlopok.** Szkennelt, hasábos elrendezésnél a szövegréteg
gyakran **egy sorba olvasztja** a két hasábot. A megoldás nem jobb OCR, hanem
**vágás a horgony-tokennél**: a horgony előtti rész az egyik fél, utána a másik.

**M3 — Redundancia = ingyen ellenőrzés.** Az üzleti dokumentumok tele vannak
**önellenőrző számtannal**: tétel-érték = mennyiség × egységár; adóalap × kulcs
= adó; adóalap + adó = végösszeg. Ha a redundáns értékek nem stimmelnek
(tűréssel), **jelöld** — ne javítsd csendben. *A hiba visszafejthető abból, hogy
melyik egyenlőség bomlik el.*

**M4 — Válaszd a hibára legkevésbé érzékeny bemenetet.** Ha ugyanaz az érték
több úton is kiszámolható, azt az utat vedd, amelyik **nem függ a törékeny
mezőtől**. (Példa: ahol a mennyiség OCR-érzékeny, ott az egységárból számolj.)
Ez általános elv, nem számla-specifikus.

**M5 — Növekvő megfeleltetési tábla.** A külső fél a **saját szavaival** ír; mi
a **saját kódjainkkal** dolgozunk. A kettő közé kell egy tábla:
*külső megnevezés/kód → belső kód + átváltó szorzó + belső mértékegység*.
Ez a tábla a **forrás-igazság**, kézzel bővül, és **a jóváhagyásból nő**.

**M6 — A bizonytalanság adat, nem hiba.** Minden kimenő érték hordozzon
**megbízhatósági szintet** (biztos / ellenőrizendő / hiányzik). *„Inkább hiány,
mint téves"* — a csendes tévedés drágább, mint a bevallott hiány.

**M7 — Amit tudottan rosszul olvasunk, azt ne olvassuk gépileg.** Ha egy
mező-típusnál a gépi olvasás megbízhatatlan (hosszú azonosító-számok, kézírás),
**kapcsold ki és jelöld emberi kitöltésre** — ne adj rossz értéket
magabiztosan. Ez konfiguráció legyen mezőtípusonként, ne beégetett tiltás.

**M8 — Az eredetit nem bántjuk.** Átnevezés, szétbontás, normalizálás mindig
**másolaton** dolgozik; a forrás érintetlen marad, és a kimenet **visszavezet rá**.

**M9 — A felhasználó felülete a forrás-igazság.** Ahol az ember jóváhagy (ma:
táblázat), az a hely dönt — a gép onnan olvassa a véglegeset. A jóváhagyó
felület formátuma cserélhető, a **szerepe** nem.

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

**M10 — A forrás csak olvasható.** Az ügyfél élő mappájában nincs létrehozás,
átnevezés, törlés, másolás. Az importáló **olvas és javasol**, nem rendez.

**M11 — Aktív tartalmat nem futtatunk.** Makrós/aktív dokumentumnál a
**tárolt gyorsítótárat** olvassuk (OOXML-cache), és **nem futtatunk** makrót,
képletet, lekérdezést vagy külső hivatkozást. Egyszerre biztonsági és
determinizmus-kérdés: egy futtatott képlet más eredményt ad ma és holnap.

**M12 — Zaj-fájlokat ki kell zárni.** Minden ügyfél-mappában van biztonsági
másolat, lock- és cache-fájl (`~$*`, `.bak`, szerkesztő-lockok). A kizárási
lista **konfiguráció**, mert rendszerenként más.

**M13 — Bizonyíték-lánc: relatív út + tartalom-hash.** Minden kinyert adat
**visszavezethető** a forrásra: hol volt, és **milyen tartalmú** fájlban
(SHA-256). Így egy későbbi eltérésnél eldönthető, a forrás változott-e vagy a
kinyerés. **Üzleti bináris nem kerül a repóba.**

**M14 — Egy munka-azonosító = egy entitás.** Az összevonás **nem** történhet
gyengébb egyezés alapján (pl. „ugyanaz az ügyfél"). Az entitás-azonosság
szabálya explicit legyen — a hamis összevonás visszafordíthatatlan.

**M15 — Az egységet előbb megőrizzük, a konverzió explicit és naplózott.**
Amíg nem tudjuk biztosan, mi az eredeti mértékegység, ne normalizáljunk.
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
