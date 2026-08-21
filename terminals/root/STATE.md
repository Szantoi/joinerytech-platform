# ROOT Terminal State

> **Frissítve:** 2026-08-21 este, Europe/Budapest
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

---

## 2026-08-14 — Plant multi-tenant és jogosultság-alapú termékbelépés

- A `joinerytech-plant` forrásoldali több-bérlős szelete elkészült és
  független P0/P1 review-n átment. Minden tenant-adatművelet opák, hitelesített
  scope-ot és műveletspecifikus authorityt kap; a PostgreSQL cél tenant-kompozit
  kulcsokat, explicit tenant-predikátumokat, tranzakció-lokális GUC-t, FORCE RLS-t,
  külön migrátor/runtime credentialt és pontos owner+runtime ACL-allowlistet használ.
  A runtime szerep minden bejövő és kimenő role-membershipje fail-closed tiltott.
- A Doorstar–Plant `OfficePlantExecutionEnvelope/v2` forrásseam elkészült, de
  alapértelmezetten OFF és nincs route-ként felcsatolva. Az engedélyezett út előbb
  a szűk, operatív `office.issue_work_package` szolgáltatási authorityt ellenőrzi,
  csak utána olvassa a body-t; `memory-demo` authority nem használható.
- A recovered Kernelben a `joinerytech.plant` külön, Manufacturer-only,
  `ClaimsOnly` customer product lett `view|edit|admin` human grantokkal. Nem
  Doorstar-alias, nem kap Doorstar membership-handoffot, és nem gyárt Office
  service-principal jogot. A Portal Plant-only grantnál csak külön validált célra
  navigál, több terméknél explicit választót ad. A Plant cél dupla default-OFF:
  `VITE_PLANT_APP_URL` üres, a Plant origin nincs az alap allowlistben.
- Bizonyíték: Plant `npm run verify` PASS — contracts 27/27, runtime 7/7,
  API 92 PASS + 4 explicit disposable-PostgreSQL skip, Web 31/31; Portal teljes
  suite 193 fájl / 1936 teszt és production build PASS; Kernel unit 1097/1097,
  Plant landing/auth golden 42/42 PASS. Diff-checkek tiszták, csak CRLF
  figyelmeztetések maradtak.
- **Aktiváció továbbra NO-GO.** Nem futott live DB/migráció, Keycloak/JWKS,
  hálózati integráció, deploy, commit vagy push. Szükséges még az alkalmazott
  0038 + három-credentiales PostgreSQL/RLS próba, reviewed token-mapperek és
  readback, Plant browser/API audience és OIDC/BFF session, Office
  service-principal registry, operator PoP, fresh-token revoke/downgrade E2E,
  backup/restore/rollback és külön aktivációs engedély.

## 2026-08-14 — Plant élő PostgreSQL/RLS, recovery és Kernel 0038 bizonyíték

- Izolált PostgreSQL 16 konténerben, külön migrátor- és közvetlen non-owner
  runtime credentiallel lefutott a Plant migráció és mind a négy guardolt RLS
  teszt. Azonos package/task/message/command/outbox ID-k két tenantban egymástól
  függetlenek; missing GUC nulla sort lát; wrong-tenant write és ACK tiltott;
  max-one pool rollback/reuse tiszta. Pontos ACL-vizsgálat csak ownert és runtime
  szerepet talált a nyolc védett táblán.
- A live futás egy valós verifierhibát talált és regresszióval javított:
  `pg_catalog.aclexplode` mezősorrendje `grantor, grantee, privilege_type,
  is_grantable`. A migráció hibás állapotban biztonságosan rollbackelt.
- A 25,916 bájtos custom backup SHA-256 értéke
  `b04b9f336bc97d040bc5c4526bf17c7cfa267ae61ca15d2aa02e6183188be89d`;
  külön restore-adatbázison a kontrollrekord és ismét mind a 4/4 teszt PASS.
  A teljes live Plant `npm run verify` zöld: contracts 27, runtime 7, API 98
  (4 valódi PostgreSQL, 0 skip), Web 31.
- A recovered Kernel eredeti 0037+0038 SQL-je külön eldobható PostgreSQL 16-on
  1/1 PASS: Manufacturer Plant, öt más tenant-típus deny, exact 10 grant accept,
  11/duplicate/wildcard/unknown deny, invitation/membership/projection/online
  authorize, majd 0038 Down után exact Doorstar-only viselkedés.
- Mindkét eldobható konténer, volume, port és ideiglenes harness eltávolítva;
  éles/staging/VPS/Keycloak nem változott. A DB/RLS/recovery és 0038 kapu zöld,
  de az összesített aktiváció továbbra NO-GO az identity/JWKS mapper/readback,
  Office service-principal revoke/version, tartós DPEX lifecycle, Plant OIDC/BFF
  és operator device/station/cnf/PoP bizonyításáig.

## 2026-08-14 — Plant oszlopszintű ACL P1 lezárása

- Az előző élő bizonyíték a tenant-RLS-t, a table `relacl`-t, a role-topológiát
  és az eredeti+restore 4/4 mátrixot igazolta. A későbbi review feltárta, hogy a
  közvetlen `pg_attribute.attacl` grantok nem voltak a verifier hatókörében,
  ezért a korábbi teljes „exact ACL” lezárás csak ideiglenes volt.
- A migrációs preflight és az API startup most az oszlopszintű ACL-eket is
  fail-closed ellenőrzi. Élő PostgreSQL 16-on mindkettő megtagadta a harmadik
  role `SELECT` és `UPDATE WITH GRANT OPTION` grantját, silent revoke nélkül;
  a tiszta 4/4 mátrix PASS.
- A javítás utáni teljes live verify: contracts 27, runtime 7, API 99
  (4 PostgreSQL, 0 skip), Web 31. A Plant DB-verifier ismert column-ACL P1
  hibája lezárult; az identity, DPEX lifecycle, browser és operator-PoP kapuk
  változatlanul NO-GO állapotúak.

## 2026-08-20 — Portal P0 fail-closed recovery/identity szelet

- A kanonikus Portal `/shopfloor` és `/w/shopfloor` route-ja a korábbi publikus
  kliens-PIN/mock session helyett közös, state- és fetch-mentes unavailable
  képernyőre mutat; a legacy kiosk/page lazy importok kikerültek a production
  importláncból. A PIN fallback hibán is fail-closed, `operatorPin` nem kerül
  sessionbe. A hitelesített + legacy-world-enabled pozitív út külön CI tesztet kapott.
- A recovery-fa jogosultság-alapú termékválasztója a kanonikus Portalba került.
  Csak strict access-token authority-projection dönt; duplikált JSON, hibás JWT
  envelope, kevert native/flat tenant claim, ismeretlen modul és case-variant
  cross-product deep link mind fail-closed. Doorstar/Plant cél csak explicit,
  HTTPS root-origin allowlistből nyitható token/tenant URL-paraméter nélkül.
- A régi `Invoke-KeycloakTenantOnboarding.ps1` minden online/default/verify/apply
  módja profil-, credential- és hálózatolvasás előtt exit 2-vel retired. Csak a
  nem aktiváló, DML-t nem kibocsátó `-Offline` történeti elemzés engedélyezett.
- Bizonyíték: Portal 92/92 célzott Vitest, provisioning 32/32 Python teszt,
  scoped ESLint, `tsc -b`+Vite production build és artifact kiosk/import scan PASS;
  független security review után a route casing- és claim-ambiguity-leletek javítva.
  Nem történt Keycloak/DB/VPS/deploy/commit/push vagy release-aláírás.
- **Aktiváció továbbra NO-GO:** autoritatív Keycloak projection exact-replace+
  readback, membership-version/revoke, scoped service-principal registry, két-tenant
  OIDC/JWKS E2E, Plant browser/PoP/device, DPEX lifecycle, TLS/backup/cutover és
  aláírt immutable release artifact még külön kötelező kapu. Az offline
  `test_verify_doormanufacturing_auth_contract.py` jelenleg 1 failure + 1 error
  állapotú `Doorstar validator hash drift` miatt; a release pin módosítása nem
  történt meg, mert release-owner/aláírási döntést igényel.

## 2026-08-20 — Tesztüzemi identity- és dependency-hardening, aktiválás nélkül

- A Shopfloor lezárás immár a route mellett a két régi page-importon is
  fail-closed: a compatibility exportok csak az unavailable oldalt renderelik.
  A Portal mockjaiból a fennmaradt PIN mezők és értékek kikerültek, a korábbi
  `1234` szerverhibán sem nyit sessiont. A friss production artifactban nincs
  kiosk/login endpoint, operator-PIN vagy legacy Shopfloor chunk. Független
  review: P0=0, P1=0; teljes Portal suite 184 fájl / 1715 teszt és build PASS.
- A recovery termékválasztó a kanonikus Portal része. A browser authority csak
  exact, egy-tenantos native projectiont és két pozitív verziót fogad; flat,
  mixed, duplikált, case-variant vagy ismeretlen claim/route fail-closed.
- Az új Keycloak projection consumer-specifikus scope-ot és opaque attribútumot
  tervez. A Door és Plant human wire pontosan `{tenant_id, permissions,
  enabled_modules}`, egy product granttal; a registry-meta nem tokenizált. Az
  Office service projection a Plant exact háromműveletes szótárát használja.
  Doorstar és Plant tényleges consumerei a generált fixture-eket elfogadták.
  Az új `--apply` CAS/adoption/custody/reverse-inventory elkészültéig korán
  hard-off; minden activation/mutation/convergence evidence hamis. A két régi
  Door Python CLI és a PowerShell onboarding csak historical offline módban él,
  profile/credential/network előtti tiltással. Provisioning: 104/104 PASS.
- A Hosting, Doorstar és Plant canonical consumer-szeletei elkészültek és
  fail-closedak. A hét .NET host Production startup smoke-ja 7/7; valódi online
  authority provider hiányában szándékosan deny-all. Doorstar 738/738 unit és
  build PASS; Plant teljes verify PASS (contracts 40, runtime 7, API 204 + 5
  explicit disposable-DB skip, web 31). Plant task execution és DPEX mount
  továbbra 503/default-off.
- A dependency audit magas találatai megszűntek. Hét .NET host és kilenc
  test/RLS gráf 0 advisory; EF/Npgsql biztonságos 8.0.x patchre, Testcontainers
  támogatott 4.14.0 gráfra került. Az EHS AutoMapper helyett explicit típusos
  DTO mappinget használ (4/4 mappingteszt). Portal, Doorstar és Plant teljes
  production+dev npm auditja 0; Portal 1715/1715, Doorstar Vitest 4 alatt
  738/738. A .NET nem-Docker kör 1148 pass; 170 DB/RLS teszt csak a helyi Docker
  endpoint hiánya miatt nem futott.
- A végső repószintű Testcontainers-leltár további legacy HR/EHS/Production,
  Inventory/Procurement/Cutting/Joinery/JoineryTech és Kernel tesztgráfokat is
  feltárt. Mind a 18 közvetlen Testcontainers projekt egységesen 4.14.0-ra és
  az explicit image-constructor API-ra került; friss restore után 18/18
  transzitív audit 0 advisory. A hozzájuk kötődő régi HTTP/Regex, Scriban,
  DynamicLinq, SQLitePCLRaw, Bcl.Memory és Caching.Memory láncok a tulajdonos
  csomag frissítésével vagy a redundáns ASP.NET 2.2 referencia eltávolításával
  zárultak. Maradó, nem dependency-regressziós kapu: a legacy EHS teljes build
  meglévő Application→Infrastructure réteghibán, a Production teljes build egy
  hiányzó Maintenance contracton áll; a Dockeres tesztekhez továbbra is CI kell.
- **Aktiválás továbbra NO-GO.** Nem történt élő Keycloak/Kernel tokenkiadás,
  DB/VPS/deploy, commit, artifact-aláírás vagy repin. Hátra van a valós két-tenant
  PKCE/JWKS/revoke/rotation és online registry, Plant browser+PoP/device/station,
  DPEX worker/lifecycle/reconciliation, Dockeres DB-kör, TLS ingress,
  restore/shadow/cutover/rollback, SBOM/provenance/signing és külön aktiválási
  jóváhagyás.

## 2026-08-20 — Keycloak mutation-safety offline kapu

- A canonical projection provisioner most aláírt RS256 owner/adoption és külön
  service-custody receiptet, receipt-bound desired/observed owned-state digestet,
  két teljes stabil realm-inventory passzt és exact client/scope/reverse-binding
  ellenőrzést követel. A production trust store szándékosan üres; tesztkulcs csak
  futásidőben, hermetikusan létezik.
- A human browser-kliensek posture-je is a signed fingerprint része. Door csak a
  két forrásban pinelt callbacket, exact origint és S256 PKCE-t fogadja; a még nem
  létező Plant browser kliens disabled, callback/origin nélkül, külön Blockként
  jelenik meg. Duplikált/aliasolt scope-ID, hibás mapper-ID, idegen binding vagy
  secret-szűrés miatti mapper-csonkítás fail-closed.
- A klasszikus Keycloak Admin REST mutáció fizikailag retired: CLI `--apply`,
  importált `apply()`/`_apply_mutations()`, provisioner request és shared transport
  POST/PUT/DELETE útja hálózat előtt leáll. A régi latent create/PUT/enable scaffold
  kikerült. Az offline output négy őszinte Blockot ad: Plant browser, két hiányzó
  production trust anchor és a klasszikus Admin API atomikus CAS-hiánya.
- Bizonyíték: projection 105/105, összes provisioning 140/140, `py_compile` és
  diff-check PASS; független adverszárius review P0/P1/P2 nélkül zárt. Apply egy
  nem létező profillal is exit 2 még profil-, credential- és hálózatolvasás előtt.
- **Aktiválás továbbra NO-GO:** külön review-zott production public anchorok és
  szerveroldalon sorosított writer/lock/SPI atomikus CAS-szal még nincsenek; élő
  Keycloak/Kernel/JWKS/token, deploy, commit, push vagy credential-hívás nem történt.

## 2026-08-20 — Kernel online authority és valós helyi OIDC/JWKS protokollkapu

- A Hosting-csomag explicit opt-in, default-deny Kernel authority providert kapott.
  Az exact subject–tenant POST strict echo/status/verzió/content/cutoff readbacket,
  teljes 1500 ms-os budgetet, szűk retry-listát, stale fallback nélküli cache-t és
  readiness/observability állapotot használ. A service-auth requestet a legbelső,
  forrástulajdonú transport-boundary újra attestálja; késői BaseAddress/header/body/
  delegating-handler vagy primary-handler felülírás nulla hálózati hívással tiltott.
- Runtime Sockets transport csak HTTPS és a szándékosan üres production source-pin
  mellett aktiválhatatlan. Cleartext loopback kizárólag internal friend-test marker,
  exact test assembly, Development és pinelt URI együttesével engedett; marker,
  application-name spoof vagy validator-bypass esetén is fail-closed.
- A helyi protokoll-E2E már nem statikus signer: valódi discovery/JWKS,
  Authorization Code + egyszer használható S256 PKCE tokenváltás, state és aláírt
  ID-token nonce, két tenant, exact Kernel HTTP readback, fresh/stale/revoke/
  deactivate/content mismatch és A→A+B→B kulcsrotáció fut. A production wrapper a
  valódi IdentityModel ConfigurationManager körül LKG-t tilt, nyers JSON-duplikációt,
  duplikált/hiányzó kid-et és origin/body/depth/key-count driftet megtagad, network-
  only freshness/max-age/readiness és ingressfüggetlen bounded prewarm mellett.
- A végső trust-határon a validáció request-private options/TVP/token-handler/
  events gráfot használ; a public JwtBearerOptions utólagos mutációja, a régi
  realm/flat role authority, a cached crypto-provider és a mutable JWKS-key
  objektum nem szélesítheti az elfogadást. Signing trust kizárólag strict,
  public RSA `sig`/`RS256` JWK-ból, kanonikus `n`/`e` anyagból épül (2048–8192
  bit, e=65537); encryption vagy hibás/privát/szimmetrikus JWK teljesen tiltott.
- Befagyasztott kapuk: provider 99/99, canonical token 34/34, protokoll 50/50,
  combined OIDC 137/137, teljes non-Docker 367/367 kétszer; Release build
  0 warning/0 error, format és diff-check tiszta, source+test transzitív audit 0.
- **Aktiválás továbbra NO-GO:** a hét host egyike sincs valós Kernel service-trusttal
  opt-inelve; nincs production endpoint-pin, credential adapter, élő Keycloak/DNS/TLS,
  két-tenant revoke/rotation vagy Docker/PostgreSQL interceptor-konformancia evidencia.
  Nem történt deploy, commit, repin vagy élő identity-hívás.

---

## 2026-08-21 — kontrollált Kernel migrációs rehearsal: PAUSED / activation NO-GO

- Lefutott az explicit, csak helyi Docker Desktopot és eldobható PostgreSQL-t használó
  kontrollált rehearsal. Nem ért el éles adatbázist, Doorstar/Keycloak/VPS-t vagy
  credentialt; az általa létrehozott konténer a futás után nem maradt meg.
- A futás eljutott az EF–PostgreSQL séma-konformancia ellenőrzésig, ahol **23 valós
  eltérést** jelzett. Ez hasznos diagnózis, nem sikeres aktiválási bizonyíték.
  A fő okok: a korábbi SprintC tárolási szerződés TEXT mezői, a CurrentStageCode
  varchar(30) kontra modellbeli text eltérése, a SpaceLayers történeti fizikai
  szerződése és az EF által nem discoverelt RefreshTokens 0013 migration.
- Döntés: a meglévő fizikai tárolási szerződést a modellhez igazítjuk, nem vakon
  alakítjuk át az adatokat. Az IntentDataJson **text marad**, mert a raw UTF-8
  JSON-ból képzett LastStateHash-t a jsonb kanonizálása érvényteleníthetné.
  A CurrentStageCode varchar(30), az ExternalAuthTokenRef varchar(512);
  a SprintC korábbi TEXT mezői explicit Npgsql text mappingot kapnak.
- A következő forward-only jelölt a 0037_ReconcileRefreshTokens: csak a
  public."RefreshTokens" kanonikus create/adopt útját kezeli. Nem tesszük
  discoverable-é a történeti 0013-at, nem stampelünk migration-historyt, és nem
  módosítjuk a snapshotot.
- **Még nyitott, ezért ma nem futtatandó:** a 0037 külső FK-, PostgreSQL inheritance-,
  case-lookalike- és logical-replication-függőség fail-closed lezárása, valamint a
  hozzá tartozó history/generated-script és negatív rehearsal bizonyíték. Ezek után
  kell független source review, statikus kapu, majd újra a kontrollált Docker rehearsal.
- A globális snapshot-paritás (has-pending-model-changes) továbbra is külön
  activation NO-GO. Doorstar szolgáltatás-token adaptere csak a Kernel zöld
  rehearsal + snapshot-döntés után következhet; emberi bearer tokent nem továbbítunk
  a Kernel belső identity-authority végpontjához.
