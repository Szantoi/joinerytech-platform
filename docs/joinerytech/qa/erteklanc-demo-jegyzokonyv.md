# Értéklánc-demó UI-ból — QA-jegyzőkönyv + demó-forgatókönyv

**Dátum:** 2026-06-12 · **Mód:** valódi UI-kattintások (gomb-szintű vezérlés, store-akció közvetlen hívása nélkül), lépésenkénti profil-/szerepváltással · **Adat:** megmaradt demó-adatként a store-ban.

**Eredmény: a FŐ értéklánc a webshop-érdeklődéstől a számla kiállításáig + a garancia-hurokig VÉGIGKATTINTHATÓ.** Két kis deep-link hibát találtam és javítottam; a többi megfigyelés demó-tudnivaló.

---

## A demó-futás entitás-lánca (mind a store-ban, megnyitható)

| # | Lépés (világ) | Entitás | Végállapot |
|---|---|---|---|
| 1 | Webshop (B2C — Nagy Anna) | érdeklődés-űrlap | elküldve |
| 2 | CRM — auto-lead | **LEAD-2426-008** „Egyedi gardróbszekrény hálószobába" (forrás: webshop) | konvertalva |
| 3 | CRM — lehetőség | **OPP-2426-008** | összeállítás → (él) |
| 4 | Belsőépítészet — koncepció | **KON-2026-018** (opp-hoz linkelve) | létrehozva |
| 5 | Értékesítés — ajánlat | **Q-2426-068** — Tolóajtós gardróbszekrény 240×260, 1 450 000 Ft | converted |
| 6 | Beszerzés — rendelés-igénylés | **PR-2426-108** (order-req) | ConvertedToOrder |
| 7 | Értékesítés — rendelés | **JT-2426-0196** (2 tételsor, design-átvitel OK) | **delivered** |
| 8 | Gyártás — job | FE-2426-196 | queued→… |
| 9 | Gyártás-előkészítés — kiadás | **GT-2426-009…013** (5 feladat, műveleti lépésekkel: 6/1/3/2/2) | mind **kesz** |
| 10 | Minőség — végellenőrzés | **QA-2426-007** (vegellenorzes) | **megfelelt** |
| 11 | Logisztika — kiszállítás | **SH-2426-008** (install, átadás-átvétel: aláírás + jegyzőkönyv) | **atadva** |
| 12 | Pénzügy — kimenő számla | **SZ-2426-0044** (1 450 000 Ft + ÁFA) | **issued** (határidő 2026-05-11) |
| 13 | Reklamáció — garancia-jegy | **REK-2426-006** „Tolóajtó nehezen csúszik" (ref: JT-2426-0196, SH-2426-008) | kivizsgalas, megoldás: helyszíni |
| 14 | Logisztika — szerviz-fuvar | **SH-2426-009** (a jegyből, visszakötés) | tervezett |

---

## Demó-forgatókönyv (belső bemutatóhoz, ~10 perc)

> Narratíva: „Nagy Anna magánszemély a webshopból indul, és a rendszer egyetlen láncon viszi végig a gardróbját a műhelyen át a számláig — minden szerep a saját képernyőjén dolgozik, és minden lépés átgyűrűzik a következő világba."

1. **Ügyfél (B2C)** — profilváltó → *Nagy Anna*. A webshop a teljes élménye. „Egyedi elképzelése van?" sáv → **Ajánlatkérés** → űrlap → küldés. *Pont:* az érdeklődés **azonnal lead** a CRM-ben — nem vész el email-fiókban. Kilépés gombbal vissza a belső fiókba.
2. **Értékesítő (CRM → Leadek)** — az új lead nyitásával: Kapcsolatfelvétel → Minősítés → **Konvertálás lehetőséggé** (a gomb addig nem aktív — az FSM véd). Az OppDetailben: státusz *Igényfelmérés* → **Koncepció indítása a Belsőépítészetben** (tervezési láncszem, link megjelenik) → **Vázlat-ajánlat készítése** (az opp automatikusan „Összeállítás alatt" + CRM-feladat).
3. **Értékesítő (Értékesítés → Ajánlatok)** — a vázlat-ajánlatban tétel felvétele (Gyors tétel sor), **Kiküldés** (érvényességgel) → **Elfogadás** → **Igénylés létrehozása** (~2 mp szimulált átfutás). *Pont:* az ajánlat nem közvetlenül rendelés — kontrollált igénylés-kapun megy át.
4. **Beszerzés-jóváhagyó (Beszerzés → Igénylések!)** — a PR-sor nyitása → **Jóváhagyás** (SoD-ellenőrzéssel) → *a panel bezárul* → sor újranyitása → **Rendelés generálása** → JT-rendelés, az ajánlat tételei (config/design) átöröklődnek.
5. **Értékesítő (Értékesítés → Rendelések)** — a rendelés kibontása: **Számítás indítása** (anyaglista/vágóterv szimuláció, ~2,4 mp) → **Kiadás gyártásba**.
6. **Gyártás-előkészítő (Gyártás-előkészítés)** — a kiadott rendelés kártyája → fülek (Anyag/Szabászat/Útvonal/Dokumentum) → **Kiadás** fül → **„Kiadás a műhelynek — 5 feladat"**. *Pont:* állomásonkénti feladatok, műveleti lépésekkel (tömörfa front-end nem lapul egy „szabászatba").
7. **Műhely-dolgozó (Feladataim → Csapat)** — feladatonként: **Munka indítása** (valós órajel) → műveleti lépések lepipálása → **Kész**. Az 5. után a detailben megjelenik a **„Végellenőrzésre küld"** CTA → QA-ellenőrzés automatikusan.
8. **Minőségellenőr (Minőség → Ellenőrzések)** — QA-jegy: *Folyamatban* → *Megfelelt* → **„Kiszállításra kész — fuvar létrehozása"** CTA → fuvar a Logisztikában.
9. **Logisztikus (Logisztika → Kiszállítások)** — fuvar FSM: Berakodva → Úton → Kiszállítva → *(átadás-átvétel: ügyfél-aláírás, fotó, jegyzőkönyv)* → Beszerelve → **Átadva**. *Pont:* az átadás a rendelést is `delivered`-re gyűrűzi, és megjelenik a **Számlázás** blokk → **számla-piszkozat** egy gombbal.
10. **Pénzügyes (Pénzügy → Kimenő számlák)** — a piszkozat nyitása → **Kiállítás** (finance.manage joghoz kötve). A lánc pénzügyileg zárva.
11. **Ügyfélszolgálat (Reklamáció)** — **Új bejelentés**: ügyfél *Nagy Anna*, kapcsolódó fuvar a listából (garancia-dátumhoz), garancia típus → rögzítés → *Kivizsgálás* → megoldás: **Helyszíni javítás** → **„Szerviz-fuvar létrehozása"** → új fuvar a Logisztikában. *Pont:* az utóélet visszaköt a fizikai láncba — a kör bezárult.

---

## Javított hibák (ebben a körben)

1. **Logisztika → Pénzügy deep-link rossz képernyő-kulcs** — `page-logistics-2.jsx`: a Számlázás blokk linkje `navigateTo("finance","invoices")`-t hívott; ilyen képernyő nincs (outgoing/incoming/contracts/payments), ezért a Pénzügy *áttekintőjére* esett a számla-lista helyett. → `"outgoing"`. *(build/page-logistics-2.js?v=3)*
2. **Beszerzés req-detail „Kapcsolódó rendelés" linkje nem létező világra mutatott** — `page-procurement2.jsx`: `navigateTo("orders")` — „orders" nevű VILÁG nincs, kattintásra TypeError-ral elszállt volna. → `navigateTo("sales","orders")` (a `_pendingOpen` mély-link a Rendelések képernyőn landol). *(build/page-procurement2.js?v=2)*

## Megfigyelések / demó-tudnivalók (nem javítva — döntésre vár)

- **Beszerzés világ alapképernyője a (legacy) „Megrendelések"** — a Sales-ből konvertált rendelés-igénylés az **Igénylések** képernyőn van; a konvertálás toastja mondja a PR-azonosítót, de nem visz oda. Demónál tudatosan kell fület váltani. *(Javaslat: a „Igénylés létrehozása" után deep-link a Beszerzés → Igénylésekre.)*
- **Igénylés jóváhagyása bezárja a slideovert** — a következő akcióhoz („Rendelés generálása") ugyanazt a sort újra meg kell nyitni. *(Javaslat: jóváhagyás után maradjon nyitva, a footer már a következő lépést mutatja.)*
- **A rendelés `calc`/`ready` állapota csak UI-overlay** (`window.orderFlow`, page-flow.jsx) — nem store-FSM és nem perzisztens: frissítés után a „Számítás" eredménye eltűnik, a sim csak `draft→released`-et lát. Prototípus-egyszerűsítés; a CLAUDE.md `draft → calc → ready → released` lánca a UI-ban él, a store-ban csak a két végpont.
- **`createDeliveryFromQa` nem ad dátumot a fuvarnak** → a reklamáció-űrlap garancia-dátuma (installedAt) üresen marad, a garancia-óra nem indul. *(Apró; javasolt: átadáskor `date` beállítása.)*
- **Konvertálás/számítás szimulált átfutásai** (1,6 mp / 2,4 mp spinner) — demónál számítani kell rá, ne kattints dupla.
- A FSM-kapuk mindenhol jól zártak: lead-konvertálás csak minősítés után; kiküldés csak érvényességgel; „Rendelés generálása" csak Approved igényen; „Végellenőrzésre küld" csak teljes lánc `kesz` után; számla-kiállítás joghoz kötve.

## Maradt nyitva (következő körre)

- A két UX-javaslat (jóváhagyás utáni nyitva tartás; konvertálás utáni deep-link) — jóváhagyásodra vár.
- A koncepció-ág (KON-2026-018) most csak létrejött + linkelődött; a teljes Belsőépítészet → Projekt-összeállítás → handoff utat a 3.39/3.42 kör már verifikálta — kattintós demóba illesztése külön kör lehet.
