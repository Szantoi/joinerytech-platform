# STAB-CI-DOTNET-GATE — a platform 27 .NET teszt-projektje közül EGY SEM fut CI-ből

- **Szerep:** infra / root
- **Prioritás:** **P1** (a legnagyobb egyszeri nyereség, amit ma mértünk)
- **Státusz:** `open` — kiadva 2026-07-30 (root), **scope-döntést kér** (ld. lent)
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
