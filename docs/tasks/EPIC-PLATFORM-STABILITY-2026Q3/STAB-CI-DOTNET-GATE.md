# STAB-CI-DOTNET-GATE — a platform 27 .NET teszt-projektje közül EGY SEM fut CI-ből

- **Szerep:** infra / root
- **Prioritás:** **P1** (a legnagyobb egyszeri nyereség, amit ma mértünk)
- **Státusz:** `in_progress` — **az 1. szelet KÉSZ** (build-ratchet, 2026-07-30 root).
  A teszt-kapu és a submodule-hozzáférés **továbbra is Gábor-döntés** (ld. 5–6.)
- **Forrás:** a `rls-interceptor-switch-recon` workflow szintézis-ágense hozta elő
  „a legkockázatosabb feltevés" pontban; a root **függetlenül újramérte**.

## A lelet — mérve, nem feltételezve

```
.github/workflows/ a platform-repoban : CSAK secret-scan.yml
`grep -rl "dotnet test" .github/`     : 0 talalat
.NET teszt-projekt a repoban          : 27
sajat workflow-val rendelkezo submodule: 2 (joinerytech-portal, spaceos-kernel)
```

**A platform 27 .NET teszt-projektje közül egy sem fut automatikusan.** Minden
zöld szám, amit ma leírtunk — 227+47 (collaboration), 85 (hosting), a hét modul
RLS-bizonyítéka, a worker-security tesztek — **csak azért zöld, mert valaki
kézzel elindította.**

## Miért ez a nap legnagyobb tétele

Ez **ugyanaz a hibaosztály, amit ma egész nap kerestünk, egy szinttel feljebb.**

A `NonSuperuserRlsFixture` tükre azért volt baj, mert **zöld marad, ha az eredeti
elromlik**. Egy teszt-suite, amit **semmi nem futtat**, még ennyit sem mond: nem
marad zöld, hanem **nincs is állapota**. A mai munka nagy része (a root
`InterceptorMirrorConformanceTests`-e, a backend `TenantQueryFilterPresenceTests`-e,
az F3X sorrend-őre, a `Disputed`-őr) **pontosan azért készült, hogy egy jövőbeli
regressziót megfogjon** — és egyik sem fog megfogni semmit, amíg nincs, ami
lefuttatja.

> **Amit ki kell mondani:** amíg ez nyitva van, minden „a kapu őrzi" típusú
> állításunk **feltételes**. A kapu megvan; a kapus nincs.

## Ellenpélda a saját repóinkból — tehát nem elvi akadály

- a három **doc-capture** repó CI-je **három körben** fut (függőség nélkül →
  teljes → mutáció), és a semlegességi kaput **hash-pinnel** tölti le;
- a **portál** és a **kernel** submodule-nak van saját workflow-ja;
- a platform-repóban a `secret-scan.yml` **működik** — tehát a GitHub Actions
  ezen a repón be van kötve, csak .NET-et nem futtat.

## Amit el kell dönteni (scope, root/Gábor)

1. **Hatókör.** Mind a 27 projekt, vagy először a Testcontainers-mentes rész?
   Mérendő: melyik projekt igényel Dockert. *(A collaboration integrációs suite
   root-mérése ma **13 m 19 s** volt szerializálva — a kapu-költség nem
   elhanyagolható, és a backend `parallelizeTestCollections=false` döntése CI-ben
   is helyes lesz.)*
2. **Trigger.** PR-kapu (lassú, de megfog) vs. éjszakai (gyors PR, késői jelzés)
   vs. kettő: gyors unit-kör PR-en, Docker-igényes kör éjjel.
3. **`.sln`-hiány.** Mérve: a hét modul teszt-projektje **egyetlen `.sln`-ben sem
   szerepel** (11 `.sln` van a repóban, köztük egy az **orphan**
   `spaceos-modules-ehs` fára). A CI vagy explicit projekt-listát kap, vagy
   előbb rendbe kell tenni a solution-szerkezetet — ez **külön döntés**.
4. **A kapu bizonyítása.** A kapu maga se maradhat mérés nélkül: kelljen egy
   **szándékosan piros** commit, ami bizonyítja, hogy a workflow **bukik** is,
   nem csak lefut. *(Ugyanaz az elv, amit a doc-capture a semlegességi kapunál
   alkalmaz: negatív + pozitív kontroll minden futásban.)*

## Átvételi kritériumok

- [ ] A CI **futtat** .NET tesztet a platform-repón, és a **bukás piros**
      (bizonyítva egy szándékosan hibás ágon, nem csak leírva).
- [ ] Kiírva, **mely projektek maradnak ki** és miért — a „N projekt lefut"
      önmagában állítás, nem mérés (a kimaradók nevesítése kötelező).
- [ ] A Docker-igényes projektek kezelése eldöntve és **mérve** (futásidő).
- [ ] A `secret-scan` kapu **megmarad** és nem lassul.
- [ ] A `docs/tasks/.../STAB-RLS-WORKER-BYPASS` szerep-kapuja
      (`Invoke-DbRolePrivilegeGuard.ps1`) **bekötve** — az is ma készült, és az
      is kézi indításra vár.

## Amit ez a task NEM csinál

- Nem rendezi a `.sln`-szerkezetet (külön döntés, ld. 3.).
- Nem foglalkozik az **orphan `spaceos-modules-ehs`** fával — az önálló lelet
  (saját `.sln`, két rivális DI-belépő, az egyik **interceptor nélkül**),
  ugyanaz az alak, mint a `két párhuzamos modul-fa` tanulság.


---

## 1. SZELET KÉSZ — build-ratchet, 2026-07-30 (root)

**A platform első automatikus .NET-kapuja.** Nem teszt-kapu — és ez **mérésből
következett, nem választásból**.

### Miért nem teszt-kapu lett: a „Docker-mentes első kör" nem létezik

Ezt a szeletet úgy ajánlottam meg, hogy „nem előlegez meg scope-döntést" — aztán
megmértem, és **az ötlet nem állt meg**:

| Osztály | Db |
|---|---|
| platform-saját teszt-projekt | **15** |
| ebből **Docker-mentes** (Testcontainers nélkül, tranzitívan is) | **1** |
| ebből Docker kell | **14** |
| submodule-ban élő (külön repó, saját CI) | 12 |

⚠ **Az első mérésem érvénytelen volt**: csak a `.csproj`-ban kereste a
Testcontainers-t, és így a collaboration integrációs suite „Docker-mentes"-nek
látszott — pedig a hivatkozás a `RlsFixtures` **ProjectReference**-én át jön.
Tranzitív + forrás-szintű ellenőrzéssel jött ki az igazi 1/15.

**Tehát a „Docker-mentes teszt-kör" 15-ből 1-et futtatna, és a lefedettség
látszatát adná.** Helyette **build + warning-ratchet**: Docker nélkül fut, gyors,
és pont azt fogja meg, ami ma átcsúszott a root-review-mon — egy **hamis
„0 warning"** állítás.

### Az alapállapot, mérve

```
13/15 projekt fordul · 2 NEM · 15 warning a fordulokban
  EHS Infrastructure.Tests : 10 warning
  QA Tests                 :  2
  Production.Tests         :  3 (es nem is fordul)
```

**A két nem-forduló projekt indoka mérve, nem feltételezve:**

- **`Ehs.Tests`** (az **orphan** EHS-fa): az `Ehs.Application` az
  `Ehs.Infrastructure`-t és a `Microsoft.EntityFrameworkCore`-t hivatkozza, de a
  hivatkozás **hiányzik** (CS0234). Vagyis a fa **belső wiringje törött** — ez
  erősen a **törlés** felé mutat (0 systemd-unit, nincs `bin/` a VPS-en).
- **`Production.Tests`**: **kereszt-repó kontraktus-sodródás** — a
  `SpaceOS.Modules.Contracts.Maintenance` névtér és az `AssetDowntimeEvent` típus
  a `contracts` submodule **mai pinjén nem létezik** (CS0234 + CS0246). *Pontosan
  az az osztály, amit a doc-capture hash-pinje őriz a saját szerződésén — itt
  viszont semmi nem őrzi.*

### Miért RATCHET és nem „legyen nulla"

Egy „legyen nulla warning" kapu az **első naptól piros** lenne, és egy piros
kapu, amit senki nem tud zöldre hozni, **egy héten belül ki lesz kapcsolva**.
Ezért a kapu a **romlást** fogja meg: elromlott build · **nőtt** warning-szám ·
listán kívüli projekt · eltűnt projekt. **A javulás sosem bukhat.**

### Amit szállít

| Fájl | Mi |
|---|---|
| `config/dotnet-build-baseline.json` | a **mért** alapállapot, projektenként indoklással |
| `scripts/dotnet-build-gate.mjs` | tiszta kiértékelő függvény + I/O + **önteszt** |
| `.github/workflows/dotnet-build-gate.yml` | PR + push + `workflow_dispatch` |

### Bizonyítás — a kapu maga sem maradt mérés nélkül

| Kapu | Eredmény |
|---|---|
| önteszt (4 romlás-eset + 3 javulás-eset) | **7/7 PASS** |
| a kapu a mai fán (mind a 15) | **TISZTA**, exit 0 |
| a kapu `--ci` módban (6 projekt) | **TISZTA**, exit 0 |
| **szándékos romlás-szimuláció** (baseline-ban `maxWarnings: -1`) | **exit 1**, a pontos lelettel (`romlas-warning-no`) |
| visszaállítás után | **exit 0**, a baseline **bitre azonos** |
| workflow YAML-parse | OK, 5 lépés |

## ⚠ Ami NEM készült el, és miért — nevesítve

**1. A kapu 6/15 projektet mér CI-ben.** A másik **9 tranzitívan submodule-ban
élő projektre hivatkozik**: 8 a **privát `spaceos-kernel`**-re, 1 a
`contracts`-ra. A CI-nek **PAT kell** hozzájuk → **Gábor-döntés**. A script a
kihagyottakat **nevesítve kiírja** minden futásnál — a kimaradás elhallgatása
ugyanaz a hamis zöld, amit a kapu zárni akar.

**2. Nincs `submodules: recursive` checkout.** Három gitlink **árva** (nincs
`.gitmodules`-bejegyzés), és a `git submodule status` **már ma is elhasal
rajtuk** — a recursive checkout viselkedése rajtuk **bizonyítatlan**. Előbb a
három árva gitlink rendezése kell.

**3. A kapu NEM futtat tesztet.** A teszt-kapu külön döntés: Docker + a
collaboration integrációs suite **root-mért 13 m 19 s** költsége.

**4. A workflow még nem futott GitHub Actionsön.** A kapu *logikája* mérve zöld
(önteszt + szimulált romlás + éles futás), a *runner-viselkedés* bizonyítatlan.
**Ez ugyanaz a korlát, amit a doc-capture minden jelentésében kiír** — nem
hallgatom el a saját szeletemnél sem.

## Hátralévő átvételi kritériumok

- [x] A CI **futtat** .NET-műveletet, és a **bukás piros** (bizonyítva).
- [x] Kiírva, **mely projektek maradnak ki és miért** (a script minden futásnál).
- [ ] A **Docker-igényes** projektek kezelése (teszt-kapu) — Gábor-döntés.
- [ ] A **9 submodule-függő** projekt bevonása — PAT, Gábor-döntés.
- [ ] A **három árva gitlink** rendezése (ez a `submodules: recursive` előfeltétele).
- [x] A `secret-scan` kapu érintetlen (külön workflow, nem lassul).
- [ ] `Invoke-DbRolePrivilegeGuard.ps1` bekötése — **nem GitHub Actions-be**: az
      SSH-t igényel a VPS-hez, tehát ütemezett helyi/VPS-futás kell.
