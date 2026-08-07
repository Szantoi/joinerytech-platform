# ROOT Terminal State

> **Frissítve:** 2026-08-07, Europe/Budapest
> **Állapotforrás:** [`EPICS.yaml`](../../EPICS.yaml) (**kanonikus**) + [`AGENT-CHANNEL.md`](../../AGENT-CHANNEL.md)
> **Belépő:** a csatorna **eleje** („Nyitott szálak") és **vége**; a régebbi napok archívumban.

---

## Hol tartunk egy bekezdésben

A nap **egy stratégiai döntést** hozott — **az ütemezés gazdája a `spaceos.scheduling`**,
a Flow Lab pedig `doorstar.scheduling-import` lesz —, és **négy saját mérőeszköz-hibát**,
amiből kettőt már publikáltam, mielőtt kiderült. Mindkettőt ugyanoda helyesbítettem, ahol
az eredeti állt. A Flow Lab a **v3 input-packet** leszállította, a reprodukciót **tiszta
szobában, bájtazonosan** igazoltam, és a scheduling hash-pin kapuját **két mutációval**
bizonyítottam. Kiadva egy új task (`ERPSEP-INSTANCE-NEUTRALITY-GATE`) egy **valódi hiba**
nyomán: beégetett ügyfél-cégnév egy platform-modul PDF-generátorában.
`EPICS.yaml` **93/143** (07-31: 90/133) — de **a szám nem hiteles**, ld. lentebb.

---

## 2026-08-07 — a scheduling-repó GAZDÁJA a platform (Gábor döntése)

A tegnapi 1. számú blokkoló **feloldva**. Amit tettem, és amit közben **helyesbítenem kellett**:

**Bekapcsolva a sziget-fába:** `.gitmodules` **+3 −0**, `src/spaceos-modules-scheduling`,
gitlink-szám **11 → 12**. A **pin `d63f317` (M4/4), nem a HEAD** — a gitlink ugyanaz a
vállalás, mint a portál-pin: azt az állapotot jelöli, amit a platform **vállal**.

> ⛔ **Ezért nem a HEAD:** a d63f317 után **9 commit áll root-review nélkül** — m4-5 (solver
> DI), m4-6 (shadow-diff read-model) és kontraktus/1..7, az utolsó **„1.0.0-preview.2 —
> kézbesítésre kész"** verzió-emeléssel. Review-nyom sehol (`EPICS.yaml`, csatorna).
> Az önjelentett készültség érvénytelen — és itt egy **verzió-emelés** hordozza, ami a
> Doorstar felé kézbesítési jelzés. **A 9 commit review-ja most az én sávom.**

**⚠ Két tegnapi saját állításom TÉVES volt** — mindkettőt visszavontam a csatornában:

| amit írtam | a mért igazság |
|---|---|
| „nincs `terminals/` mappája → nincs hova felterjeszteni" | **egyetlen** modul-submodule-nak sincs; a sáv a platform backend-terminálja, és működött (M1..M4 APPROVED) |
| „M4/3+M4/4 nincs pusholva, CI nem futott rajtuk" | mindkettő `origin/main`-en, a CI utolsó **5/5 futama success** |

A valódi hiány **kizárólag a gitlink** volt. **A „hiányzik" verdikt is mérendő, nem csak a
„megvan"** — ez ugyanaz az osztály, mint a tegnapi négy mérőeszköz-hiba.

**Klón-buktató, nevesítve:** az `url.insteadOf` a platform-repóban **lokális**, és a
`git submodule add` klón-**alprocessze nem örökli** → `fatal: Could not read from remote`.
Megkerülés: `git -c url."https://github.com/".insteadOf="git@github.com:" submodule add …`.
Valószínűleg ez magyarázza a 3 kicsomagolatlan gitlinket is.

---

## ⭐ 2026-08-06 döntése: az ütemezés gazdája a platform

**Kérdés (Gábor közvetítette a Flow Lab rootjától):** a `spaceos.scheduling` az ütemezés
gazdája, vagy a Flow Lab ütemezője marad az? **Válasz: a platformé.** Négy mért ok, de
egy közülük eldönti:

> **A Flow Lab 27 SS+részleges élt FS-re normalizált — az IMPORT rétegben.** Ott a
> `releaseThresholdPercent` és az SS-jelleg **megszűnik létezni, mielőtt az ütemezőhöz
> érne**, tehát az ADR-069 §4 szemantikája **elvileg sem alkalmazható**. Nem két szabály
> versenyez: **az egyik réteg elpusztítja a másik bemenetét.**

**Megőrzés teszt-korpuszként, nem kód-átemeléssel:** a Flow Lab kimenete
`doorstar-planning-input-pack.v3` + `.sha256` alakban a scheduling-repóba; a solver
leépítése **csak a v3 zöld befogadása után** — addig a Flow Lab ütemezője a **bizonyíték
egyetlen példánya**.

**Két kiegészítés, amit külön kértek:** a fogyasztás **nem NuGet** (a scheduling nem
publikál csomagot; a szerződés a `docs/openapi.yaml`, és a motor behúzása megkerülné az
ADR-069 D6 host-oldali garanciáit) — NuGet a **hostingra** kell. És a v3-at a Flow Lab
**előállítja**, de a scheduling-repóba **a platform veszi be**: *egy kapu, aminek a
bemenetét a mért fél állítja be, soha nem bukhat el.*

---

## ⚠ A nap másik tanulsága: négy saját mérőeszköz-hiba, kettő publikálva

| # | A hiba | Hogyan derült ki |
|---|---|---|
| 1 | nyers `grep -oE` **élek mutatóit és kommenteket** számolt sornak (82 vs. 41) | **a Flow Lab** mérte meg helyettem |
| 2 | a `TaskId = "` minta a **`ParentTaskId`-t is** fogja (73 vs. 41) | összeg-kontroll |
| 3 | a `unitSeconds` mutáció **nem alkalmazódott** (a mező nem létezik) | assert |
| 4 | **ékezetes minta `python -c`-vel a shellen** → a karakter-osztály megromlik, és **2165-öt** ad 4 helyett | két saját mérésem ellentmondott |

A 4. a legsúlyosabb: **adatvédelmi vádat** építettem rá egy detektorral, amit **soha nem
teszteltem ismert bemeneten**. Visszavonva (`7e352dc`); a Flow Lab valójában **jól**
csinálta — a felvételek cella-koordinátát visznek, értéket nem.

> **Új szabály: nem-ASCII mintát soha ne adj át `python -c`-vel a shellen — írd fájlba és
> futtasd a fájlt.** Egy megromlott karakter-osztály nem hibaüzenettel jelentkezik, hanem
> **hihető, nagy számokkal.**

---

## Ma lezárt review-k — mind saját méréssel

| Szelet | Mérés |
|---|---|
| **Flow Lab v3-átadás** | reprodukció **tiszta szobában, bájtazonos** (`847541…`, 270 588 B); **3 kontroll** kellett az érzékenységhez, az első kettő érvénytelen volt |
| **scheduling hash-pin kapu** (a v3-befogadás előfeltétele) | **M-ROOT-1**: pack romlik → 5 bukás, és a **teljes szám 263→246** (a pin dob, tesztek el sem indulnak) · **M-ROOT-2**: a **dokumentált** frissítési út (pack + `.sha256` együtt) → a hash-kapu átengedi, de a viselkedési vektor **így is bukik** |
| **a `raw/` lelet lezárása** | a Flow Lab a nehezebb utat választotta (leadta a 12 felvételt) — elfogadva |

**Root-munka:** a Doorstar-csatolódás mérése · `ERPSEP-INSTANCE-NEUTRALITY-GATE` kiadva ·
a PROJ-05/06 **retroaktív** bejegyzése az `EPICS.yaml`-ba.

---

## ⛔ Új, valódi hiba — task kiadva

```
joinery/.../Pdf/ProductionSheetGenerator.cs:252 és :270
   "Doorstar Kft. — Gyártásilap"   <- beégetett string-literál, NEM konfiguráció
elérhetőség MÉRVE: DI-singleton -> 3 PDF query-handler -> GyartasilapEndpoints.cs
```

⇒ **minden** joinery-t használó bérlő gyártásilapján a Doorstar neve jelenne meg.
Task: **`ERPSEP-INSTANCE-NEUTRALITY-GATE`** (E1-boundaries), két fázissal és **kötelező
sorrenddel**: előbb a feloldás, **utána** a kapu — fordítva a kapu az első percben pirosat
adna a meglévő 25 soron, és a kikapcsolás mintáját tanítaná.

**A jó hír a mérésből:** „Doorstar" 100 nyers előfordulás a platform `src/`-jében, de
szétválasztva **25 produkciós kódsor** (54 teszt), és abból **~92% migrációs seed** —
a kernel-seedek ráadásul **bérlő-szűrtek**. **A Doorstar nincs beépülve; rétegvágási
adósság van.**

---

## ⚠ Az `EPICS.yaml` alul-jelent — a 93/143 nem hiteles

Ma mérve, a saját szabályom fordítva ütött vissza (*a task-doksi státusza nem hiteles* →
most a **yaml** volt az, ami hiányzott):

- **PROJ-05 és PROJ-06 nem is szerepelt** a yaml-ban, pedig **mindkettőt én zártam
  APPROVED-dal** → retroaktívan bejegyezve, `⚠ RETROAKTÍV` megjelöléssel.
- **`PROJ-NUMBERING-GAP` (open):** a `docs/tasks/EPIC-PROJECTS-MODULE-2026Q3/` mappa
  **üres**, a git-log PROJ-01 után egyből PROJ-05-re ugrik, és a **PROJ-01 `in_progress`
  a rá épülő PROJ-05/06 `done`-ja mellett.** Belsőleg ellentmondásos — **nem találgatom
  ki**, a backend mondja meg.
- `DC-01b-write` és `DC-03` `pending`, pedig mindkettő **APPROVED** (a commit szándékosan
  visszatartva a doccapture-sávban).

---

## 🔴 Gábor előtt — a részletes lista a [`TODO.md`](TODO.md)-ban

**Ha csak hármat:**

1. ~~A `spaceos-modules-scheduling` gazdája~~ — **LEZÁRVA 2026-08-07: a platform.**
2. **A 48 könyv-oldal** a publikus repóban (+ a hiányzó bináris-kapu).
3. **A `NOBYPASSRLS` telepítése** és a **licenc-kérdés** (egy aláírás feloldja a DC-01c-t).

---

## Futó sávok

| Sáv | Mi fut |
|---|---|
| **root / scheduling** ⭐ | **ÚJ SÁV (08-07): a 9 review nélküli commit átvétele** (m4-5, m4-6, kontraktus/1..7 + a `1.0.0-preview.2` verzió-emelés) → utána gitlink-bump d63f317-ről; majd a **v3 input-pack befogadása** |
| **Flow Lab** (doorstar) | katalógus-ADR (1%-os javítás, hash-rotáció) — **engedélyezve**; a `raw/` 4 maradék-előfordulása; a solver leépítése **BLOKKOLT** (a v3-befogadásig) |
| backend | `PROJ-01`/`PROJ-02` és a 6 modul interceptor-átállása (`STAB-RLS-INTERCEPTOR-E2E`, a CRM a minta) |
| doccapture | a neutrality-szelet felterjesztésére vár; **a fa hold alatt**, 3 szelet egy commitban zárul |
| frontend | a portál **lockfile platform-függő** — a CI-kapu piros; **a portál-pint nem bumpolom, amíg nem zöld** |

---

## Nyitott szerkezeti leletek (nem sürgős, de nevesítve)

- **Orphan `spaceos-modules-ehs` fa**: nem fut, nem is fordul.
- **Instance-adat platform-migrációkban** (kernel StageRegistry, cutting AddPricingTables,
  joinery seederek) — migrációt **nem** írunk át, a szabály a jövőbeli seedre szól.
- **Kontrolling**: az `AddSpaceOsModuleTenancy()` az API-rétegben van.
- **ADR-069 hiánya:** nincs **indítási késleltetés** fogalom — az `extraDays` a *tartamhoz*
  ad, a késleltetés a *kezdést* tolja. A Flow Lab helyesen **nem** simította el.
- **ERPSEP**: a sáv **gazdátlan**.

---

## Újraindítási védelem

1. Csatorna **eleje + vége**, `EPICS.yaml`, ez a state, `TODO.md`.
2. **A két Monitort újra kell élesíteni.**
3. **`gh run list` push után** — „van workflow" ≠ „fut rá" ≠ „zöld".
4. **A munkafa nem a publikált állapot.** Piros kapunál tiszta `origin/main`
   kicsomagoláson mérj.
5. **A negatív eredmény érvényességét külön igazold:** futott-e le, illik-e a műszer,
   van-e **pozitív** kontroll.
6. Nincs `git add -A` vegyes fán; **review-nként, fájl-szintű pathspeckel** commitolj.
7. Done/APPROVED kizárólag root-review, **saját méréssel** — a warning-szám is mért tétel.
8. **Mutáció:** a produkciós oldalt rontsd, alkalmazva-bizonyítással — és az **„alkalmazva"
   ≠ „releváns"**: ha a mért kimenet nem fogyasztja a rontott bemenetet, a változatlan
   eredmény a **célzásom** hibája, nem a kapu vaksága.
9. **Kiadás előtt mérd a task hatókörét.**
10. Idegen repóban nincs destruktív parancs; VPS/éles migráció/credential csak
    Gábor-jóváhagyással.
11. Egy hiba után **keresd meg a testvéreit**; más ágens mérőeszköz-hibáját alkalmazd a
    sajátodra is.
12. **Shell-be írt szöveg:** idézőjeles heredoc (`<<'EOF'`).
13. ⭐ **Nem-ASCII (ékezetes) mintát SOHA ne adj át `python -c`-vel** — írd fájlba és
    futtasd a fájlt. A megromlott karakter-osztály **hihető nagy számokkal** hazudik.
14. ⭐ **Kereső/maszkoló eszközt tesztelj ismert bemeneten, MIELŐTT valódi adaton futtatod**
    — főleg, ha a lelet **vádat** fogalmaz meg valakiről.
15. ⭐ **Bontás + összeg csak akkor bizonyíték együtt, ha az összeg a bontásból adódik.**
    Külön parancsból jövő stimmelő összeg **hitelesít egy hibás bontást**.
16. ⭐ **A „hiányzik" verdiktet a TÁRSAKON mérd, ne magában.** „Nincs `terminals/` mappája"
    csak akkor lelet, ha a többinek **van** — itt egyiknek sem volt. Egy hiány anomália
    voltát a **társ-populáció** dönti el; enélkül a normát jelentem hibának.
    (Rokona: 5. — de az a *saját mérés* érvényességéről szól, ez a *referencia-keretről*.)
