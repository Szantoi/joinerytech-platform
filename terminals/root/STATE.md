# ROOT Terminal State

> **Frissítve:** 2026-08-07 este, Europe/Budapest
> **Állapotforrás:** [`EPICS.yaml`](../../EPICS.yaml) (**kanonikus**) + [`AGENT-CHANNEL.md`](../../AGENT-CHANNEL.md)
> **Belépő:** a csatorna **eleje** („Nyitott szálak") és **vége**; a régebbi napok archívumban.

---

## ⭐ A nap tétele: a platform-munka NEM háttér — az a szállítási út

**Gábor prioritása:** *„Most a Doorstarnak kell terméket szállítani; a platform-fejlesztés
fontos háttér, ami a jövőt alapozza meg — hogy gyorsan tudjunk **tesztelt és validált**
megoldást szállítani."*

Megmérve viszont a Doorstar-oldali konvergencia-lánc:

```
DSCONV-01        completed
DSCONV-02..08    pending (dependency-blocked)
DSCONV-00, 09    blocked
```

**Az egész lánc NÉGY platform-kapun áll** (`PLATFORM-GATES.md`: *„ezeket kizárólag conductor
vagy root zárhatja"*), a kapuk pedig az **ERPSEP**-sávon:

| kapu | platform-bemenet | állapot |
|---|---|---|
| **GATE-INSTANCE** ⭐ | ERPSEP-02 ✅ · ERPSEP-03 ✅ · ADR-072 ✅ · **ERPSEP-07 pending** · kompat-policy | **3/5 — a legolcsóbban zárható** |
| **GATE-SECURITY** | STAB-RLS-PROOF ✅ · **ERPSEP-06 blocked** · JWT/tenant szerződés · hosting-verzió | blokkolja a `DSCONV-03`-at (P0 auth) |
| **GATE-BUNDLE** | **ERPSEP-08/09 blocked** (infra) · Maintenance pilot | legtávolabb |
| **GATE-HANDSHAKE** | B2B-lánc | a pilot kapuja |

⇒ **amit „háttérnek" hívtunk, az a szűk keresztmetszet.**

---

## ⛔ És amit kerülgettem — Gábor mondta ki

*„Teljesen szét kell választani az ERP-t, a SpaceOS-t és a JoineryTech-et, hogy tudjak
szolgáltatni."* Megmérve: **a döntés nem hiányzott.**

```
EPIC-ERP-SEPARATION-2026Q3   started 2026-07-18   owner: root   <- EN
ERPSEP-04 "ERP-mag kulon repoban"   pending 13 napja
   ELHELYEZES ELDONTVE (Gabor, 2026-07-25): kulon repo (spaceos-erp-core),
   GitHub Packages, NEM forras-submodule.  4 fazis kiirva.
```

**Én neveztem „gazdátlan sávnak" a saját epicemet**, és Gábor döntési listájára tettem egy
végrehajtási adósságot. A fizikai ok, amiért nem lehet szolgáltatni (ma újramérve):

```
kanonikus CRM : Lead.cs, Opportunity.cs ... de Order/Quote/Customer aggregatum: 0
a rendeles    : Joinery/DoorOrder.cs + Procurement/PurchaseOrder.cs
=> NINCS ERP-mag; egy masodik ugyfelhez ma a DoorOrder-t is vinni kellene
```

**Gábor döntése az (a) útra:** a `DoorOrder` **marad és hivatkozik** a semleges `Order`-re —
a szétválasztás nem vehet el a működő terméktől. **Indul az ERPSEP-04 1. fázisa (enyém).**

---

## Gábor mai döntései — mind rögzítve

| # | döntés | hol |
|---|---|---|
| 1 | a `spaceos-modules-scheduling` gazdája a **platform** | `.gitmodules` 12. gitlink, pin `d63f317` |
| 2 | a 48 könyv-oldal **törlendő** + **történet-átírás** | `ef16466`, `78c4802` (forced) |
| 3 | Tranche B mehet *(közben már meg is volt)* · licenc **ne legyen blokkoló** | EPICS |
| 4 | `NOBYPASSRLS` **most mehet**, és **maradjon** élesben | mind a 3 role `f` |
| 5 | auth: **(A) üzemeltetői onboarding**, nem önkiszolgáló | `AUTH-DOORSTAR-ONBOARDING` |
| 6 | **személyes fiók mindenkinek** — „a valódi audit nyomvonal" | ADR-jelölt: állomás mint aláírt claim |
| 7 | **ERPSEP-04 (a)**: a `DoorOrder` marad és hivatkozik | ERPSEP-04 indul |
| 8 | *„Integráljuk ezt a tudást — sok cégtől kell Excelből átvenni"* | **`DC-PII-IMPORT-GATE`** |

---

## Ma végrehajtva

- **Történet-átírás** (`filter-repo`, külön mirror-klón, 85 MB bundle-mentés): a 48 fájl
  eltűnt a **teljes** történetből; friss GitHub-klónnal igazolva (0 találat, pozitív kontroll
  1, HEAD-fa **bájtra azonos**). VPS-en is törölve, 11/11 service fut.
- **NOBYPASSRLS élesítve** mindkét workeren; 0 új hiba, a hibatípusok előtte/utána azonosak.
- **Demóadat fertőtlenítve** a publikus repóban: 11 e-mail + 35 személynév-mező, 3 fájlban.
- **Kiadva:** `AUTH-DOORSTAR-ONBOARDING` (szűkítve: csak platform-oldal), `DC-PII-IMPORT-GATE`
  (a `doccapture` terminál inboxába), `STAB-INV-REORDER-OUTBOX`, `STAB-RLS-POLICY-MISSINGOK`.
- **Flow Lab:** 4 üzenet ki (`008`–`011`); a **termékesítési blokkolójuk feloldva**.

---

## ⚠ A mai saját hibáim — mind ugyanabból a családból

| # | hiba | hogyan derült ki |
|---|---|---|
| 1 | a **visszavont lelet IGAZ volt** — a már redaktált fán mértem nullát | a redakció **nyoma** fájlonként egyezett |
| 2 | „nincs `terminals/` mappája" → **egyetlen** modulnak sincs | a társak megmérése |
| 3 | a **doksi 2. felében** állt a kötelező sorrend (definer-függvények) | a jegyzet végigolvasása |
| 4 | **rossz FÁT mértem** kétszer: auth (7 modul máshol), OOXML (motor külön repóban) | képesség-alapú kérdés |
| 5 | **13 napos végrehajtási adósságot** döntési kérdésnek álcáztam | `owner: root` a yaml-ban |
| 6 | a PII-doksiba **beleírtam a valódi nevet** példaként | a saját utóellenőrzésem |

> **A 4. a legdrágább:** a hamis negatív alapján **utasítást adtam** a Flow Labnak, hogy
> építsenek meg négy képességet — **háromból három már létezett**, root-jóváhagyva.
> A hamis pozitív az én időmet viszi; a hamis negatív **más munkáját**.

---

## 🔴 Gábor előtt

1. **`/shopfloor` PIN-route** — a `PIN=1234` **közös** belépő, ami szembemegy a mai
   „személyes fiók" döntéssel. **A kettőt együtt kell eldönteni.**
2. **A Codex-sáv gazdája** (9 task) · **`npm publish` + VPS-IP + 3 submodule push**
3. **4 kulcs rotálása** (Gemini, 2× Brave, 2 modell-szolgáltatói) — **ez a te kezed kell**
4. `B2B-10-F7` (`root+gabor`) · PyMuPDF (AGPL) · S3 vagy MinIO
5. *(opcionális)* GitHub Support a szerver-oldali objektumokra

---

## Futó sávok

| sáv | mi fut |
|---|---|
| **root** ⭐ | **ERPSEP-04 F1** (domain-szerződés) · a scheduling **9 review nélküli commitja** → gitlink-bump → v4-befogadás · ADR-069 indítási késleltetés |
| doccapture | **`DC-PII-IMPORT-GATE`** (kiírva ma) · DC-01b-write · DC-03 |
| backend | ERPSEP-05/06 · PROJ-01 · a 6 modul interceptor-átállása · `STAB-INV-REORDER-OUTBOX` |
| frontend | a portál **lockfile platform-függő** → CI piros; **a pint nem bumpolom** |
| Flow Lab | katalógus-séma átadás + mennyiségi szabály-modell; **a solver leépítése BLOKKOLT** a pack befogadásáig |

**⚠ Két napja áll 5 review-kérés** (08-05): backend PROJ-06 · ERPSEP-05 helyesbítés ·
doccapture DC-03a · 2× frontend. Kettő közülük **a kritikus úton van**.

---

## Nyitott szerkezeti leletek

- **A VPS `/opt/joinerytech` a RÉGI történeten áll** (`b123146`) → a következő `git pull` ott
  **elszáll**. Friss klón vagy `fetch --force` + reset — **telepítési döntés**.
- `spaceos-modules-identity`: **fut a VPS-en, de nincs a `.gitmodules`-ban** (üres mappa).
- **Duplikált ID az `EPICS.yaml`-ban:** `EHS-WIZARD-HU` kétszer, mindkettő `blocked`.
- `PORTAL-DEADTREE-B` `blocked`, pedig a munka **kész** (portal `76bc647`).
- Orphan `spaceos-modules-ehs` fa · Kontrolling `AddSpaceOsModuleTenancy` az API-rétegben.
- **ADR-069 hiánya:** nincs *indítási késleltetés* fogalom (az `extraDays` a tartamhoz ad).

---

## Újraindítási védelem

1. Csatorna **eleje + vége**, `EPICS.yaml`, ez a state, `TODO.md`.
2. **A két Monitort újra kell élesíteni** — ma emiatt maradt olvasatlan 2 inbox-üzenet.
3. **`gh run list` push után** — „van workflow" ≠ „fut rá" ≠ „zöld".
4. **A munkafa nem a publikált állapot.** Piros kapunál tiszta `origin/main`-en mérj.
5. **A negatív eredmény érvényességét külön igazold:** futott-e le, illik-e a műszer,
   van-e **pozitív** kontroll.
6. Nincs `git add -A` vegyes fán; **review-nként, fájl-szintű pathspeckel** commitolj.
7. Done/APPROVED kizárólag root-review, **saját méréssel**.
8. **Mutáció:** a produkciós oldalt rontsd; az **„alkalmazva" ≠ „releváns"**.
9. **Kiadás előtt mérd a task hatókörét.**
10. Idegen repóban nincs destruktív parancs; VPS/éles migráció/credential csak
    Gábor-jóváhagyással.
11. Egy hiba után **keresd meg a testvéreit**.
12. **Shell-be írt szöveg:** idézőjeles heredoc (`<<'EOF'`).
13. ~~Nem-ASCII minta `python -c`-vel~~ **VISSZAVONVA (hamis alapon állt).** Helyette:
    **ha egy leletet a másik fél már javíthatott, a visszavonás előtt bizonyítsd, hogy a
    javítás ELŐTTI állapotot méred.** Ne gyárts gyökér-okot: két eltérő mérésnél az első
    hipotézis az legyen, hogy **mást mértek** (idő, fa, commit).
14. **Kereső/maszkoló eszközt tesztelj ismert bemeneten, MIELŐTT valódi adaton futtatod** —
    főleg, ha a lelet **vádat** fogalmaz meg.
15. **Bontás + összeg csak akkor bizonyíték együtt, ha az összeg a bontásból adódik.**
16. **A „hiányzik" verdiktet a TÁRSAKON mérd**, ne magában.
17. ⭐ **A „nincs ilyen képesség" a MÉRT FA tulajdonsága lehet.** Verdikt előtt sorold fel a
    fákat (`.gitmodules`, testvér-repók, **külön repós termékvonalak**), és keress a
    **képesség nevére** az `EPICS.yaml`-ban, ne a könyvtárra. **Ha a verdikt MÁS munkáját
    irányítja, a mérés legyen szélesebb, mint amit a kérdés kér.**
18. ⭐ **Mielőtt bármit „gazdátlannak" nevezel, olvasd el az epic `owner` mezőjét.** Ha a
    döntés dátumozva megvan és a terv is, akkor **munka**, nem döntés — a felterjesztése álca.
19. ⭐ **A privát-adat-szkennt futtasd le a SAJÁT frissen írt doksidra is**, mielőtt
    commitolod. Aki szivárgást dokumentál, új találatot gyárt.
