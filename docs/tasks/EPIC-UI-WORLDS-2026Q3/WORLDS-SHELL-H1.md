# WORLDS-SHELL-H1 — duplikált (és két route-on ellentmondó) oldalcím minden világban

- **Szerep:** frontend
- **Prioritás:** P2
- **Státusz:** pending — **a terminológia-fele KÉSZ** (2026-07-25, portal@13bf494),
  a `<h1>`-duplikáció feloldása nyitva
- **Forrás:** [`WORLDS_PRODUCTION_DESIGN_REVIEW_2026-07-24.md`](../../knowledge/qa/WORLDS_PRODUCTION_DESIGN_REVIEW_2026-07-24.md)
  → „Re-review (2026-07-25)" / **NEW-1**
- **Mutációs határ:** `src/components/layout/WorldShell.tsx` és a világ-képernyők
  fejléc-blokkja (`src/modules/*/pages/*Screen.tsx`, `src/pages/*Page.tsx` érintett
  részei) + tesztek. **Mind a 7 APPROVED modul-világ közös kódja** — teljes
  portál-suite + böngésző-smoke kötelező.

## A lelet

A `WorldShell.tsx:244` (`hidden md:block` blokk) kiír egy
`<h1>{screenLabel}</h1>`-et a **nav-regiszter** címkéjével, a képernyő pedig a
saját `<h1>`-ét. Mért állapot desktopon (production világ, 2026-07-25):

| Route | shell `<h1>` | képernyő `<h1>` |
|---|---|---|
| dash / orders / quotes / analytics | „Áttekintés" / „Ajtórendelések" / „Árajánlatok" / „Elemzések" | ugyanaz — redundáns |
| cutting | **„Szabászat"** | **„Vágótervezés"** |
| machining | **„Megmunkálás"** | **„Végrehajtás"** |

Hatás:

1. **Szemantika/a11y:** két `<h1>` oldalanként — a heading-hierarchia sérül,
   képernyőolvasón kettős dokumentum-cím.
2. **Terminológia:** két route-on a navigáció és az oldal MÁS nevet ad ugyanannak
   a képernyőnek — a felhasználó két külön dolognak hiheti.
3. **Sűrűség:** ~60 px függőleges hely megy el redundáns címre minden md+ nézetben.

Mobilon nincs duplikáció (a shell-cím `hidden`), tehát a hiba md-től felfelé él.

## Miért nem blokkolta a production APPROVED-ot

Pre-existing, és a másik hat modul-világ **ugyanezzel a mintával** kapott
APPROVED-ot — a production egyedüli blokkolása következetlen lett volna.
Ez a task rendezi egységesen, mind a 7 világra.

## Végrehajtási napló — első kör (2026-07-25)

**KÉSZ: a terminológia-ütközés feloldva.** Gábor döntése: *„A vágó tervezés az
egy technológia, a megmunkálás meg a marás, vágás és további maradandó
változást eredményező folyamatokat tartalmazza."* Ennek megfelelően a
nav-címke `cutting` → **„Vágótervezés"**, a megmunkálás-képernyő címe →
**„Megmunkálás"**, a dashboard-linkek ugyanezek, a Kontrolling és az EHS
áttekintő-címe pedig „Áttekintés" (a másik 5 világ már így hívta). **A nav és
az oldalcím sehol nem mond ellent egymásnak.**

**NYITVA MARAD: a `<h1>`-duplikáció.** Az első nekifutás a shell címét
szemantizálta le `<p>`-vé — a fresh review bizonyította, hogy ezzel **8 legacy
világ 38 route-ja cím NÉLKÜL maradt volna** (sales, design, warehouse, finance,
masterdata, interior, service, settings — ott a shell címe az EGYETLEN cím).
Visszavonva.

**Amit a következő kör kötelezően vegyen figyelembe (bizonyított korlátok):**

1. A shell címe `hidden md:block` — ha ez marad az egyetlen `<h1>`, **mobilon
   nincs cím az accessibility tree-ben**. `sr-only md:not-sr-only` kell hozzá.
2. A modul-képernyők (7 világ + production) saját címe MA szó szerint
   ugyanaz, mint a nav-címke → a duplikáció feloldása ott ~35 fájl egysoros
   változtatása (a cím elvétele, az alcím marad).
3. A legacy világok képernyői **nem adnak saját címet** — ezért ott a shell
   címét NEM szabad elvenni.
4. Van már automatizált őr: a böngésző-smoke 22 route-on ellenőrzi, hogy
   minden oldalnak van címe, van `aria-current`-tel jelölt aktív nav-eleme, és
   hogy a nav-címke megjelenik az oldal címei között.

## Fix-irányok (döntés a végrehajtóé, indoklással)

- **A)** A shell marad az egyetlen `<h1>` (a képernyők fejléce `<h2>`/`<p>`-vé
  válik) — előny: a cím a shell-lel együtt mindig konzisztens; hátrány: a
  képernyők elveszítik a saját, bővebb címüket (a nav-címke rövidebb).
- **B)** A képernyő marad az egyetlen `<h1>`, a shell-cím `aria-hidden`
  dekorációvá (vagy `<p>`-vé) válik — előny: a részletesebb cím marad; hátrány:
  a nav-címke és az oldalcím eltérése megmarad (lásd 2. pont).
- **C)** A két forrás egyesítése: a nav-regiszter és a képernyő-cím EGY
  szótárból jöjjön (`worlds` regiszter), és a shell rendeljen `<h1>`-et, a
  képernyő ne. Ez a leginkább DRY, de a legnagyobb diff.

A terminológia-ütközést (Szabászat/Vágótervezés, Megmunkálás/Végrehajtás)
mindhárom irány esetén el kell dönteni — ez **tartalmi**, nem technikai kérdés.

## Elfogadási kritérium

- [ ] Oldalanként pontosan egy `<h1>` mind a 7 világban, minden szélességen.
- [ ] A nav-címke és az oldalcím nem mond ellent egymásnak.
- [ ] Automatizált őr: a böngésző-smoke ellenőrizze a `h1`-ek számát
      (route-onként 1) — ez jsdom-ban is fogható, de a shell `hidden md:block`
      miatt a szélesség-függés csak böngészőben látszik.
- [ ] Teljes portál-suite + build + lint zöld; a 7 világ screenshot-szúrópróbája
      csak a szándékolt változást mutatja.
- [ ] Fresh adversarial review a diffre.
