# ROOT Terminal State

> **Frissítve:** 2026-07-31 este, Europe/Budapest
> **Állapotforrás:** [`EPICS.yaml`](../../EPICS.yaml) (**kanonikus**) + [`AGENT-CHANNEL.md`](../../AGENT-CHANNEL.md)
> **Belépő:** a csatorna **eleje** („Nyitott szálak") és **vége**; a régebbi napok archívumban.

---

## Hol tartunk egy bekezdésben

A nap **tizenkét review-t** zárt APPROVED-dal, és **két olyan leletet** hozott, ami a
main-ágat érintette: a platform buildje **két napja törött volt**, a doc-capture motor
CI-je pedig **a DC-02 óta piros** — mindkettő azért, mert egy APPROVED szelet bizonyítéka
kimaradt a főágból. A **B2B-10 F5 lezárva** (mind a négy szelet), az **F7 üresnek mérve
és átdefiniálva**, a portál **8001 sor halott kódtól szabadult**, és Gábor
projekt-döntése nyomán megnyílt a **`spaceos.projects`** modul. Az `EPICS.yaml`
**90/133** kész (reggel 80/124).

---

## ⭐ A nap két legfontosabb lelete — ugyanaz a hibaosztály, két repóban

### 1. A platform buildje két napja törött volt az origin/main-en

A `dotnet-build-gate` a létrehozása óta piros volt, és az **első diagnózisom rossz volt**
(„idegen sáv munkája, nem nyúlok hozzá"). Az újramérés megfordította: a
`ClaimsPrincipalUserIdExtensions.cs` **szállított függőség hiánya** volt — a fogyasztója
07-29-én kiment a főágra **root-review APPROVED-dal**, a szolgáltató fájl viszont sosem
került be.

**A mérés helye számított:** tiszta `origin/main` kicsomagoláson (nem a munkafán, mert az
hazudik) **2 hiba → 0 hiba, 0 warning**. Commitolva (`3468fe4`), fájl-szintű pathspeckel.
**A kapu azóta zöld — a létrehozása óta először.**

### 2. A doc-capture motor CI-je a DC-02 óta piros — HAT okból, ötöt javítottam

A legsúlyosabb: a **DC-02 aranypéldánya sosem ért be a repóba**, mert a `.gitignore`
`samples/` sora (üzleti binárisokra való) elnyelte a `contracts/samples/` alatti
**normatív JSON**-t is. A teszt helyesen bukott: *„nincs aranypéldány — a mérés vakon
zöld lenne."* Javítás: a szabály **szűkítése**, bizonyítva **mindkét irányban**.

**A közös gyökér:** a kapuk olyan gépen készültek, ahol **minden telepítve van**. A
függőség-mentes kör az importokat a saját folyamatában blokkolja, az **alprocessz viszont
nem örökli** — így egy modul valójában a telepített csomagokat mérte, és a kör állítása
ennyivel hamis volt. **A 6. okot szándékosan nem javítottam** (tervezői döntés, a
terminálé).

---

## Ma lezárt review-k — mind saját méréssel

| Szelet | Mérés |
|---|---|
| **B2B-10 F5/0 · F5/1 · F5/2 · F5/3** — az F5 **mind a négy** szelete | 89/89 · 256+52 · 277+53 · élő Kernel-mátrix; mindegyiknél saját mutáció |
| **DC-01 terv · DC-01a** | a terv 4 root-döntéssel elfogadva; a 9 leállási szám **újramérve** (326 OK · 295/13/18 · 26/26) + saját K8-mutáció |
| **faipari RAG 1. fázis** | saját VPS-mérés: manifest-hash 5/5 · dry-run 1963 chunk · Chroma **count=1998** |
| **frontend ×7**: gép-státusz · PieceInputRow · designer-verifikáció · workflow read-only · lang+ThemeToggle · axe-kör · 3 axe-javítás | mind mutációval; **axe 0/0/0/0** a shell + 7 világon |
| **PORTAL-DEADTREE-A** | **59 fájl / 8001 sor**; lint **172 → 125**, a 125 a törlés ELŐTT kiszámolva |

**Root-munka:** CRM interceptor-E2E pilot (`6f1ef5f`) · a 3 árva gitlink eltávolítva
(`d6e647e` — a `git submodule status` először ad kimenetet) · **F7 hatókör-elemzés** ·
B2B-01..08 tételes megfeleltetés · befejezetlen-epic triázs · EPIC-DOC-CAPTURE és
EPIC-PROJECTS-MODULE regisztrálva · a doc-capture CI öt javítása.

---

## Gábor termékdöntése — kihirdetve

> **„A projekt az epikek felett egy összefogó egység."** (2026-07-31)

A döntés közvetlenül a backendnek hangzott el; ők **nem hajtották végre csendben**, hanem
feladták a rootnak → kihirdetve a csatornán. Új epic (`EPIC-PROJECTS-MODULE-2026Q3`),
`PROJ-01` kiadva. **ADR-072 = javaslat, Gábor elé megy.**

⛔ **Időkritikus:** az ADR-066 §9.1 (07-21: „a `ProjectRef` tulajdonosa a Kernel
`FlowEpic`") **felülírt** — és az **F4 kötelező eleme**, hogy a publikált szerződés
kimondja: a `projectId` **opak korrelációs azonosító**. Enélkül a javítás később
verziózott **törő** változás a Doorstar felé.

---

## 🔴 Gábor előtt — a részletes lista a [`TODO.md`](TODO.md)-ban

**Ha csak hármat:** a **négy kulcs visszavonása** · a **`NOBYPASSRLS`** telepítése (mindkettő
élő kitettség, a javítás kész) · a **licenc-kérdés** (egy aláírás feloldja a DC-01c-t).

---

## Futó sávok

| Sáv | Mi fut |
|---|---|
| backend | **`PROJ-01`** (projects v1 mag) + a 6 modul interceptor-átállása (`STAB-RLS-INTERCEPTOR-E2E`, a CRM a minta) |
| doccapture | a motor CI 6. oka (tervezői döntés), utána **DC-01b** |
| designer | **`WORLDS-WAREHOUSE-REVIEW`** (07-28 óta állt, ma kiadva) |
| frontend | a sávja **elfogyott** — mind a 4 nyitott tétele emberi kapun áll |

---

## Nyitott szerkezeti leletek (nem sürgős, de nevesítve)

- **Orphan `spaceos-modules-ehs` fa**: nem fut, **nem is fordul**, a `Program.cs` az
  interceptor nélküli DI-t hívja. Törlés vagy javítás — scope-döntés.
- **`Production.Tests`**: kereszt-repó kontraktus-sodródás a `contracts` pinjén.
- **Kontrolling**: az `AddSpaceOsModuleTenancy()` az API-rétegben van, nem az
  Infrastructure-ben. Fail-loud, de döntés kell.
- **ADR-070 D4**: a Python doc-capture motorban nincs lockfile.
- **ERPSEP**: 5 státusz-eltérés (yaml↔doksi), és a sáv **gazdátlan**.

---

## Újraindítási védelem

1. Csatorna **eleje + vége**, `EPICS.yaml`, ez a state, `TODO.md`.
2. **A két Monitort újra kell élesíteni.**
3. **`gh run list` push után** — ma ez kétszer hozott elő main-ágat érintő hibát.
4. **A munkafa nem a publikált állapot.** Ha egy kapu piros, a diagnózist **tiszta
   `origin/main` kicsomagoláson** mérd, ne a saját fádon.
5. **A negatív eredmény érvényességét külön igazold** (ma háromszor látszott hiánynak egy
   érvénytelen mérés): futott-e le, illik-e a műszer, van-e pozitív kontroll.
6. Nincs `git add -A` vegyes fán; **review-nként, fájl-szintű pathspeckel** commitolj.
7. Done/APPROVED kizárólag root-review, **saját méréssel** — a **warning-szám is mért tétel**.
8. **Mutáció:** a produkciós oldalt rontsd, alkalmazva-bizonyítással, tiszta
   build-cache-sel — és **csak akkor, ha semmilyen build nincs röptében** ugyanabból a fából.
9. **Kiadás előtt mérd a task hatókörét** — egy 90%-ban kész task kiadva hamis munkát
   könyvel el.
10. Idegen repóban nincs destruktív parancs; VPS/éles migráció/credential csak
    Gábor-jóváhagyással.
11. Egy hiba után **keresd meg a testvéreit**, és más ágens **mérőeszköz-hibáját**
    alkalmazd a sajátodra is.
12. **Shell-be írt szöveg:** idézőjeles heredoc (`<<'EOF'`), különben a backtickek
    parancsként futnak és **szavak esnek ki** (ma egy commit-üzenetben megtörtént).
