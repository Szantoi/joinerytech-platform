# BUILD_NOTES — Gyártás-floor & Címke-stratégia (4.7-A folyt.)

> Élő jegyzet. A felhasználó menet közben ad új pontokat — ide gyűjtjük, hogy semmi ne vesszen el.
> Jelölés: ✅ kész · 🔨 épül most · ⏳ hátra · 💡 ötlet/később

_Utolsó frissítés: 2026-06-09_

---

## 0. Stratégiai irány (eldöntve)
- **Mélység, nem szélesség.** A világ = *szerep* (munka), nem *állomás* (hely).
- Az állomások (Szabászat/CNC/Összeszerelés/Felületkezelés) **NEM** külön világok → **egy állomás-szűrt Műhely-terminál**.
- Külön világ csak a valódi külön szerepeknek: **Üzemvezető (dispatch)**, **Gyártás-előkészítés**.
- Állomás-identitás: **profil-default + felülbírható választó** (localStorage).
- JIT: az operátor csak a szükséges infót lássa, ami előtte van, azzal dolgozik.

---

## 1. Műhely-terminál — az „Üzem" (shopfloor) világ ✅ (épül/wired, verifikáció hátra)
**Fájl:** `page-workshop.jsx` (`window.WorkshopTerminal`), a `shopfloor` route ezt rendereli (a régi statikus `ShopFloor` PIN-kiosk helyett).
- ✅ Élő `prodTasks` store-ból dolgozik (NEM a statikus `SHOPFLOOR_QUEUE` mock).
- ✅ Állomás-kapu (PROD_KINDS) → állomás-szűrt JIT lista (Most ezen dolgozol / Sorban / Blokkolt / Mai kész).
- ✅ Profil-default + választó (localStorage `jt_wk_station`, `jt_wk_op`); operátor-chip.
- ✅ „Felveszem" (assignProdTask) a szabad feladatokra.
- ✅ Újrahasznosítja a `window.TaskDetail`-t (idő-naplózás, lánc, kivét, rajz, szkennelés).
- ✅ Etikett-QR → munkadarab betöltése (kód → feladat feloldás, teljes kontextus).

## 2. Dokumentum / verzió-tudat a terminálon ✅
- ✅ `DocsEngine.runtimeVersion(doc)` — melyik a futtatható KIADOTT verzió.
- ✅ `TaskDetail` „Gyártási rajz · verzió" panel: kiadott→gyártható, ellenőrzés/piszkozat→figyelmeztet (futtasd a kiadott vN-t), nincs kiadott→ne kezdd el.
- ✅ CNC `program` mező megjelenítése (melyik variánst futtassa).
- ✅ Demó-feszültség: Doorstar gyártási rajz v2 **ellenőrzés** alatt → CNC a kiadott v1-et futtatja; Bognár rajz v2 **kiadott** (tiszta eset).

---

## 3. CÍMKE-STRATÉGIA (most ez a fókusz) 🔨
> A gyártás-floor egyik legfontosabb craft-artefaktja. 3-szintű traceability.

### 3.1 Kódolt entitások
- **Tábla (board)** — saját kód → mely alkatrészek lettek róla szabva. ⏳
- **Alkatrész (part)** — saját kód → kontúr + élek + szálirány + következő állomás + QR. ⏳
- **Rakat (pallet/stack)** — saját kód → melyik állomáson van / hová tart + milyen alkatrészek vannak rajta. ⏳

### 3.2 Folyamat
1. A táblához hozzá vannak rendelve az alkatrészek (a nesting elrendezésből) → tudni mi lett szabva. ⏳
2. A tábláról a **címkéket fel kell rakni az alkatrészekre** (nyomtatható alkatrész-címke). ⏳
3. Szabászat után a **következő állomás számít** → aszerint kell **rakatra tenni** (kötegelés). ⏳
4. A rakat **kódot kap** → követhető, melyik állomáson van + mi van rajta. ⏳

### 3.3 Alkatrész-címke tartalma (kötelező elemek)
- ⏳ Alkatrész-kód + tábla-kód + rakat-kód.
- ⏳ **Kontúr-rajz**, helyes orientációval — ha nem téglalap, lehessen tudni melyik oldal melyik.
- ⏳ **Élek az elöl-hátul-bal-jobb elv mentén** (E/H/B/J), a megfelelő oldalra helyezve.
- ⏳ **Élzárás** jelölése élenként (melyik él zárt, milyen anyaggal).
- ⏳ **Szálirány** (grain) nyíllal.
- ⏳ **Következő állomás** (routing) — hová megy / melyik rakatra.
- ⏳ **QR** — beolvasva minden info betöltődik a terminálon.

### 3.4 Rakat-címke tartalma
- ⏳ Rakat-kód + cél/aktuális állomás (színkódolt) + alkatrész-darabszám + lista/összegzés + QR.

### 3.5 Adat-modell (kész a seedben)
- ✅ `data-nesting.js` NEST_JOBS_SEED part-mezők: `grain` (hossz/szel/null), `edges {e,h,b,j}` (élzáró anyag vagy null), `route` (állomás-lánc szabászat után, route[0]=rakat-cél), `contour` (opc. normalizált poligon nem-téglalaphoz).
- ✅ Demó kontúr: Várdai „Munkalap (sarok)" L-alak.

### 3.6 Megvalósítás
- ✅ `page-labels.jsx`: faux-QR + faux-Code128 vonalkód, `PartLabel` (4 sűrűség: full/compact/std/mini), `RakatLabel`, `LabelSheet`, `LabelEngine.build(plan,job)`.
- ✅ Belépő a Szabászat tervből: „Címkék & rakatok" gomb (GhostBtn, qr ikon).
- ✅ Élek konvenció a címkén: H=hátul(fent), E=elöl(lent), B=bal, J=jobb; élzárt él = vastag narancs vonal; szálirány = nyíl.
- ✅ Routing = **technológiai folyamat** (tervezés/gyártáselőkészítés határozza meg); a köv. állomás a `route[0]`; a címke kiírja a teljes lánc-ot, a köv. állomás kiemelve. Festésre menő alkatrész → felületkezelés rakat (külön rakat).
- ✅ **Fázis-tudat:** a címke a CÉL állomás aktuális műveletét + utasítását hozza fő helyre; „Minden fázis" kapcsoló → minden átadási ponthoz kiegészítő címke (route-lépésenként).

### 3.7 Nyomtatás — szabványok (kutatva) ✅
- **Irodai (A4 ív, fő útvonal):** Avery-kompat. raszterek, bármely lézer/tintasugaras. Faipari default **70×37 (24/ív)** és **63,5×38,1 (21/ív)**. Továbbiak: 99,1×38,1 (14), 99,1×67,7 (8), A6 105×148,5 (4), 38,1×21,2 (65, vonalkód-tag).
- **Ipari (tekercs/thermal, bővítés):** Zebra/Brother QL/TSC — 100×150 (4×6", logisztika/rakat), 100×50, 58×40, 50×30, 40×30.
- ✅ `LABEL_FORMATS` konfigurálható sablon-modell (page/margó/méret/sor/oszlop/raszter/sarok), `kind: sheet|roll`. Mód-váltó az ívben.
- ✅ **PDF-szerű mm-pontos render** + **100% / „valós méret" figyelmeztetés** (a „fit to page" a leggyakoribb hiba). Code128/QR a címkén.
- 💡 Később: valódi PDF-export (reportlab/QuestPDF) + ZPL renderer thermalra (Strategy pattern, közös LabelContent).

---

## 4. Hátralévő világok (a stratégia szerint)
- ✅ **Üzemvezető (dispatch)** világ — `page-supervisor.jsx`, `supervisor` világ (slate). 4 képernyő: Áttekintés (élő műhely-státusz, állomás-kártyák), Diszpécser (kanban, **húzd-rá kiosztás** állomásokra + átirányítás + sürgős/prioritás), Terhelés (heti kapacitás + **szűk keresztmetszet** ProdSchedEngine-ből), Termelékenység (operatorStats). Store: `setProdTaskPrio` + meglévő schedule/assign akciók. Újrahasznosítja a `ProdTaskDetail` SlideOvert.
- ✅ **Gyártás-előkészítés** világ (`mfgprep`, teal) — **MINDEN előkészítés egy helyen** (a felhasználó kérése: „ne kelljen keresgélni"). A Gyártás világból KIKÖLTÖZÖTT ide az `Előkészítés` (anyag/szabászat/vasalat/munkaidő/bérmunka levezetés) és az `Anyagoptimalizálás` (nesting + címkék). A Gyártásban maradt: Áttekintés, Ütemezés, Megmunkálás, Gyártási projektek, Munkafolyamat, Elemzések.
  - **Screenek:** `dash` (Munkasor — `MfgPrepPage`, projekt + kiadott rendelés sor, kiadás-állapot badge), `nesting` (`CuttingOptimizer`). A munkalap (`MfgPrepWorkspace`) fullscreen, a kártyáról nyílik.
  - **A HIÁNYZÓ LÁNC kész — `page-mfg-prep-release.jsx` (3 új workspace-fül):**
    - **Útvonal** (`PrepRouting`) — technológiai műveletekre bontás (`MfgPrep.routingPlan` → `OP_TO_KIND`: cutting→szabaszat, edge→elzaras, cnc→cnc, assembly→szereles, surface→feluletkezeles; qc kimarad). Állomás-választó (`PROD_STATIONS`) + óra + házon belül/bérmunka toggle + be/ki kapcsoló.
    - **Dokumentum** (`PrepDocs`) — a munkához kötött rajzok (`docsFor(order|project,id)`) + verzió-tudat (`DocsEngine.runtimeVersion`), figyelmeztet ha nincs KIADOTT rajz; bepipált doksik a kiadásra; csatolás a tárból (`linkDocToWork`).
    - **Kiadás** (`PrepRelease`) — áttekintés + **`releaseToWorkshop(source, plan)`** → VALÓDI `prodTasks` (várólista, közös `order`, `docIds`, `prepBy`, `route`-lánc) → a Műhely-terminál + Üzemvezető azonnal látja. Kiadás után a forrásra `prepRelease` snapshot kerül; a workspace a kiadott-nézetet mutatja (Műhely/Üzemvezető deep-link, 0/N kész).
  - **Store:** `releaseToWorkshop`, `linkDocToWork` (app-store.jsx, a `generatePrep` után, perm-mentes). Migráció (bump nélkül): `acc-internal.worlds` += `mfgprep` a `load()`-ban (a supervisor-mintára). `prepRelease` mező a rendelésen/projekten (nincs seed-bump). **LS_KEY marad `jt_sim_v63`.**
  - **Bekötés:** `data-worlds.js` (mfgprep world + WORLD_ORDER: tasks, production, **mfgprep**, supervisor…; prep/cutting kivéve a productionból), HTML router-ág + `page-mfg-prep-release.jsx` script tag (a `page-mfg-prep.jsx` után), enabledModules + RootTweaks + acc-internal worlds. Deep-linkek: page-home + ProductionDashboard cutting→mfgprep/nesting, a quick-link kártya „Gyártás-előkészítés"-re mutat.
  - ✅ VERIFIKÁLT (0 hiba): kiadott rendelés → Útvonal (5 lépés) → Kiadás → GT-2426-014…018 várólistás feladatok → megjelennek a Műhely-terminál állomás-soraiban (Felveszem).
  - ✅ **Anyagtípus-vezérelt per-alkatrész útvonal (vonalas folyamatábra)** — `data-woodwork.js` (`WW_MATERIAL_KINDS` sheet/solidwood, `WW_OPS` 15 művelet technológiai sorrendben állomás-mappel, `wwMaterialKind()` osztályozó [katalógus `kind:"tömör"` → solidwood], `wwPartOps()` per-anyagtípus útvonal), `MfgPrep.partRoutes(project)` (motor, tiszta), `page-mfg-prep-flow.jsx` (`PrepFlowMatrix` — alkatrész × művelet mátrix, lap=teal / tömörfa=amber oszlopok, anyagtípus-összegző). Új **„Folyamatábra"** workspace-fül. A LAP rövid (Szabás→Élzárás→…), a TÖMÖRFA hosszú (Válogatás→Darabolás→…→Felület) útvonalat jár — egy mátrixban elkülönülve. `orderToPseudo` elemkategória-következtetés (ajtó→Ajtó/front→cat-door→tömör TL-040). Forrás-tudás: `woodwork_domain.md`. VERIFIKÁLT: Bognár konyha vegyes (40 lap + 4 tömör), mind a 15 műveletsor renderel.
  - ✅ **Hierarchikus alkatrész-cím alkalmazva** (woodwork_domain 16.): `data-woodwork.js` `wwPartAddr(ref,density)` + `wwParseLocation`; `MfgPrep.partRoutes` minden alkatrészhez `ref={project,site,room,group,element,part}`-ot ad (a projekt/rendelés nevéből helyszín/helyiség). A `PrepFlowMatrix` mutatja: **helyszín · helyiség** kontextus-sor, **elem-csoportosító sáv** az oszlopok fölött (összetartozó elemek egy sávban), teljes cím a tooltipben. VERIFIKÁLT: Petőfi projekt (Konyha+nappali, „6 db beltéri ajtó" / „Konyhabútor" elem-sávok).
- 💡 **Asztalos (egyedi munkák)** modul — legkevésbé kiforrott, utoljára.

## 6. DOKUMENTUMTÁR (DMS) ÚJRAGONDOLÁS — a gyártás info-alapja a rajz 💡→🔨
> A felhasználó vízió-pontjai (2026-06-09). A jelenlegi `data-docs.js`/`page-docs.jsx` lineáris (folder nélkül, verzió előtérben). Cél: kifinomultabb.

### 6.1 Tárolás = gráf, nem mappa
- **Mappa-struktúra UX, de NÉZETKÉNT, nem tárolásként.** Az emberek a mappát szokták meg → kell mappa-fa, DE az valójában **mentett tag-lekérdezés (smart folder)**. Egy dokumentum MINDEN mappában megjelenik, aminek a tag-szűrőjére illeszkedik → természetes **több-csoportos** tagság.
- **Tagek / facetek (több-szintű):** típus · projekt · szakág (víz/áram/szellőzés/gépészet) · állomás · státusz · ügyfél — egy doksi több csoportba is tartozhat. Faceted böngészés.

### 6.2 Verzió mint TULAJDONSÁG (ne legyen előtérben)
- A lista/kártya a doksit EGYSZER mutatja (legfrissebb), a verzió a **Tulajdonságok / Verziók** fülön. V1–V100 ne zsúfolja a felületet.

### 6.3 Származtatás + érvénytelenedés (a kulcs-igény)
- `derivedFrom: { docId, version }` — B dokumentum A@v3-ból készült. Ha A → v4, B **„forrás frissült — felülvizsgálandó"** (részben elavult), amíg újra nem validálják / újra-pinelik.
- **Függőség-gráf:** propagálja az elavulást a ráépülő doksikra (nem dob el mindent, csak jelez).

### 6.4 Szöveg-deszkriptor diff (md/html, rajz- és 3D-leíró) — a „React-reconciliation" ötlet
- Ha a tartalmat **md/html** (vagy a rajz/3D-modell **szöveges leírója**) formában is tároljuk → a verziók **diffelhetők** → **változás-detektálás**.
- Granuláris: csak a megváltozott szakaszok propagálnak elavulást a függő doksikra (nem all-or-nothing). Mint a React: a változatlan részfát megtartjuk.
- **Kliens vs szerver:** a gráf-modell, tagek, smart-folder, származtatás, elavulás-jelzés, verzió-mint-tulajdonság — **kliensen szimulálható (prototípus)**. A valódi fájl-tartalom-tárolás + granuláris tartalom-diff/reconciliation = **szerver-oldali** (prototípusban `descriptor` szövegmező + egyszerű sor-diff sim).

### 6.5 Prototípus-terv (ha építjük)
- `documents[]` bővítés: `tags[]`, `derivedFrom`, verzió-előzmény `descriptor` (md). Smart-folder = mentett tag-szűrő.
- UI: bal mappa-fa (smart folderek) + facet-szűrők + doksi-lista (verzió tulajdonságban) + származtatás-panel (forrás/leszármazottak + elavulás-jelzés + diff-nézet).

### 6.6 Verzió-ELÁGAZÁS (branching) — git-modell dokumentumokra
- A lineáris V1→V100 nem elég. Néha **leágazás** kell: egy alkatrész a fejlesztés során megváltozik, DE a régi verzió évekig jól működött, és a **gyártás arra a régi doksira épült/finomodott** → azt NEM dobjuk el.
- **Branch:** megtartjuk az eredetit (stabil/bevált ág), és **mellé/rá építve** fejlesztjük az újat. A verzió-előzmény így **fa/DAG, nem egyenes** (mint a git: `main` + `dev` ág).
- A régi ágra **pinelt leszármazott doksik (gyártási finomítások) érvényesek maradnak**, mert a régi ág megmarad; az új ág párhuzamosan fejlődik. Később opcionális **merge** vagy a leszármazottak tudatos átpinelése az új ágra.
- Modell: `version`-ök ághoz (`branch`) kötve; `branchedFrom: { version }`; ág-státusz (`stabil`/`fejlesztés`/`nyugdíjazott`). A „kiadott" ág az, amire a gyártás épít.

### 6.7 Tárolás: delta + aktuális (ne a teljes doksi minden stádiumban)
- Tárold a **változást (delta) + az AKTUÁLIS dokumentumot**; az előző állapotok **számítással visszafejthetők** (delta-lánc visszafelé). Nem kell minden verziónál a teljes doksit duplikálni.
- **Kivétel:** a **ténylegesen használatban lévő régi verziókat** érdemes materializálni (gyors elérés, nem kell visszaszámolni). → „használt verziók" cache.
- **Kliens vs szerver:** ez döntően **szerver-oldali** (tartalom-delta, tömörítés). Prototípusban a `descriptor`-diff jelképezi (sor-szintű delta), a materializált „használt verzió" pedig egy mentett snapshot.

### 6.8 ⭐ UX: a git EREJE, de NE git-nyelven (a legfontosabb)
> „A github sokat inspirál, de nehéz egy informatikán kívülről jövővel elhitetni, hogy nem az ördög maga és nem mágia."
- **A modell lehet git-erős, a FELSZÍN viszont asztalos-nyelven beszéljen.** Soha ne lássák: commit / branch / merge / HEAD / DAG.
- **Metafora-térkép (jargon → emberi):**
  - branch → „változat" / „leágazás" (párhuzamos verzió)
  - commit/version → „mentett állapot" (verzió = tulajdonság)
  - HEAD/current → „aktuális"
  - derivedFrom → „ebből készült" / „forrás"
  - stale → „a forrás frissült — nézd át"
  - merge → „összevezetés"
  - diff → „mi változott"
- **Alapnézet:** egyszerű **idővonal/napló** + „változatok" csempék; a DAG a felszín ALATT számítódik. A verzió rejtve (tulajdonság). A teljes „változat-térkép" (fa) csak opcionális, power-user nézet — barátságos vizuállal, magyar címkékkel, nem gráf-zsargonnal.

---

## 5. Technikai emlékeztetők
- **LS_KEY jelenleg `jt_sim_v63`, seed `v: 46`.** Új bump csak ha új store-mező kell.
- Scope-prefixek: `nz` (nesting), `wk` (workshop), `Cfg` (configurator), `Co` (composition). Címke: `lb`-prefix lesz.
- Betöltési sorrend: `page-workshop.jsx` a `page-prodterminal.jsx` UTÁN (window.TaskDetail). `page-labels.jsx` a `page-nesting.jsx` után.
- A `data-nesting.js` az app-store ELŐTT (seed hivatkozza a NEST_JOBS_SEED-et).
