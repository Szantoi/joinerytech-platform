# WORLDS-SHELL-H1 — duplikált (és két route-on ellentmondó) oldalcím minden világban

- **Szerep:** frontend
- **Prioritás:** P2
- **Státusz:** done — root adversarial review: **APPROVED** (2026-07-27)
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

**DÖNTÉS-MÓDOSÍTÁS (Gábor, 2026-07-27): a cutting világ neve mégis
„Szabászat".** A root explicit rákérdezett az ellentmondásra a 07-25-i
döntéssel szemben, Gábor megerősítette a felülírást. A „Megmunkálás"
(machining) változatlan. Végrehajtandó a következő körben: a `cutting`
nav-címke ÉS a képernyőcím egységesen **„Szabászat"** (a 07-25-i kör
„Vágótervezés"-re állította — azt át kell írni), a nav↔oldalcím
ellentmondás-mentesség őre változatlanul érvényes.

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

- [x] Oldalanként pontosan egy `<h1>` mind a 7 világban, minden szélességen.
- [x] A nav-címke és az oldalcím nem mond ellent egymásnak.
- [x] Automatizált őr: a böngésző-smoke ellenőrizze a `h1`-ek számát
      (route-onként 1) — ez jsdom-ban is fogható, de a shell `hidden md:block`
      miatt a szélesség-függés csak böngészőben látszik.
- [x] Teljes portál-suite + build + lint zöld; a 7 világ screenshot-szúrópróbája
      csak a szándékolt változást mutatja.
- [x] Fresh adversarial review a diffre.

## Végrehajtás — 2026-07-27

- **Irány A:** a `WorldShell` maradt az egyetlen dokumentum-`<h1>`. A címtartó
  `sr-only md:not-sr-only`, ezért mobilon nincs vizuális ismétlés, de a főcím
  képernyőolvasóval elérhető marad.
- A 7 approved modul és a production 36 ismételt képernyőcíme `<h2>` lett;
  a legacy világokhoz nem nyúltunk, így azok megtartják shellből kapott egyetlen
  címüket.
- A 2026-07-27-i Gábor-döntés szerint `production.cutting` minden felhasználói
  címkéje **„Szabászat”**; a `machining` **„Megmunkálás”** maradt.
- A `keyboard-smoke` immár 22 route-on kötelezően pontosan egy `h1`-et ellenőriz,
  és 360 px-en külön méri, hogy a „Szabászat” főcím nem `display:none`.

### Bizonyíték

- Célzott regresszió: **33/33** (`WorldShell`, `ProductionPage`, production findings).
- Warehouse célzott regresszió (a build által feltárt mock-handler típushibája után):
  **24/24**.
- App route-regresszió (Warehouse procurement + movements shell-cím): **8/8**.
- Érintett ESLint: **0 hiba**.
- Production build (`tsc -b && vite build`): **zöld**.
- Valós Playwright keyboard/a11y smoke: **20/20 zöld**; benne 22 desktop route
  pontosan egy `h1`, nav↔cím egyezés, és 360 px-es „Szabászat” a11y-ellenőrzés.
- Teljes `npm run test:full`: **175/175 fájl, 1626/1626 teszt zöld**
  (490 mp; a Vitest összegzett riportolása miatt hosszú futás).

### Nyitott minőségi kapu

Root adversarial review: **APPROVED**. A teljes-suite kapu is zöld.

## Független root-review (2026-07-27 este) — VERDIKT: CHANGES REQUESTED

**Igazolva:** sr-only mérten helyes (360px a11y-tree + 1440px pixelre azonos
desktop-látvány), 36 h1→h2 csere tiszta, terminológia rendben (Szabászat/
Megmunkálás), a 8 cím-nélküli legacy világon nincs címvesztés, a smoke
valóban pontosan-1-h1-re bukik.

**Findingok:**
- **P1-1 (ÚJ regresszió):** létezik egy HARMADIK réteg-osztály, amit a 4
  bizonyított korlát kihagyott — shell-be csomagolt legacy világok SAJÁT
  h1-nel (~9 oldal: TasksPage, AttendancePage, AiPage, ExecBiPage,
  LogisticsPage, MfgPrepPage, ProjectsPage, SupervisorPage, ShopPage). Ott
  mobilon eddig 1 h1 volt (a shell-cím `hidden` kiesett), az sr-only miatt
  most 2 (élő 360px probe: /w/tasks, /w/logistics). Javítás: h1→h2 söprés
  ezeken is.
- **P2-1 (mutációval bizonyított őr-lyuk):** LeadsScreen h2→h1 visszamutálva
  MINDEN őr zöld maradt — a smoke 22 route-ja a nem-production modulokból
  csak a dash-t fedi. Javítás: ROUTES-bővítés modulonként legalább egy
  alképernyővel.
- P2-2: warehouse deep-link route-ok (lots/zones/movementlog) dupla h1 +
  ellentmondó cím → a WORLDS-WAREHOUSE-FIX scope-jába tartozik.
- P2-3: árva „Vágótervezés" egy teszt-névben (productionScreens.smoke:36).
- P2-4: App.tsx 6 eslint-hiba — a warehouse-szelet hibája (ott követve).

**Javítás: root vállalja** (P1-1 + P2-1 + P2-3), az eredmény alább.

## Root javító kör (2026-07-27 este) — P1-1 + P2-1 + P2-3 KÉSZ

- **P1-1:** mind a 9 saját-címes legacy oldal (Tasks/Attendance/Ai/ExecBi/
  Logistics/MfgPrep/Projects/Supervisor/Shop) 27 db h1-je h2-re söpörve —
  azonos egysoros minta, más nem változott (a 27 előfordulás mind ugyanazt az
  osztály-mintát viselte, sed-del bizonyíthatóan csak tag-csere történt).
- **P2-1:** a keyboard-smoke ROUTES 22→38 route-ra bővült: +7 modul-alképernyő
  (crm/leads, hr/people, kontrolling/portfolio, maintenance/assets,
  quality/tickets, ehs/incidents, docs/library — a mutációs próba által
  bizonyított lyuk zárva) és +9 saját-címes legacy világ (a P1-1 osztály őre).
- **P2-3:** az árva „Vágótervezés" teszt-név átnevezve — a src-ben 0 találat.
- P2-2 (warehouse deep-link dupla h1) és P2-4 (App.tsx 6 lint-hiba) a
  WORLDS-WAREHOUSE-FIX scope-jában követve.

**Kapuk:** célzott vitest 149/149 (a 9 oldal tesztjei + WorldShell + production
smoke); browser-smoke MIND ZÖLD — 38 route-on pontosan 1 h1, nav↔cím eltérés 0,
360px Szabászat-őr PASS; eslint: 0 új hiba (a 9 legacy fájl 16 pre-existing
hibája HEAD-en is pontosan 16 — stash-összevetéssel bizonyítva); tsc+build zöld.

**Nyitva a done-hoz:** a teljes portál-suite közös futása — a warehouse-fix
(Antigravity) lezárása utáni közös kapuban futtatjuk, mert a working tree a két
szeletet együtt tartalmazza.
