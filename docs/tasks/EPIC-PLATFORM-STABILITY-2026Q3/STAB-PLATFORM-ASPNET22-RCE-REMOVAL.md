# STAB-PLATFORM-ASPNET22-RCE-REMOVAL — legacy ASP.NET Core 2.2 RCE-lánc eltávolítása

- **Epic:** EPIC-PLATFORM-STABILITY-2026Q3
- **Szerep:** backend/security + federation
- **Prioritás:** P0 security
- **Státusz:** pending (2026-08-03 root-triázs: a korábbi `ready` szó NEM része a
  státusz-szótárnak — „indítható"-t jelentett, nem „elkészült"-et, és így éveken át
  eltérést mutatott a kanonikus `EPICS.yaml` `pending`-jéhez képest. ÚJRAMÉRVE MA:
  a `Microsoft.AspNetCore.Http.Abstractions 2.2.0` direct referencia **4 csproj-ban,
  5 helyen ÉL** — HR, Kontrolling, Joinery.Infrastructure, JoineryTech.Infrastructure
  (utóbbin a `Http 2.2.2` is). A doksi által nevesített ötödik, a legacy DMS, a mai
  fán nincs meg — ez NEM azt jelenti, hogy elkészült, hanem hogy tisztázandó.
  ⚠ Műszer-tanulság: a `System.Text.Encodings.Web`-re keresni a `.csproj`-okban
  ÉRVÉNYTELEN mérés — az a lánc tranzitív, ott elvileg sem látszik.)
- **Előzmény:** `STAB-EHS-DEPENDENCY-ADVISORIES` S0 az EHS-ben kész mintát ad
- **Mutációs határ:** öt felsorolt modul `.csproj`-ja + szükséges buildtesztek
- **Tiltott scope:** endpoint/domain viselkedés, tenant-refaktor, package major
  upgrade, portál, deploy

## Finding

A kritikus `System.Text.Encodings.Web 4.5.0` RCE-láncot az EHS-ben egy örökölt
`Microsoft.AspNetCore.Http.Abstractions 2.2.0` közvetlen package hozta. Az EHS
referencia eltávolítása után az advisory azonnal megszűnt, az API build zöld
maradt. A platform teljes `.csproj` keresése további öt ismétlődést talált.
A 2026-07-22-i feloldott gráfban a kritikus 4.5.0 ténylegesen a legacy DMS,
JoineryTech és Joinery Infrastructure alatt materializálódik. Kontrollingban
és HR-ben egy magasabb transitive feloldás jelenleg elfedi ezt a kritikus
láncot, de a támogatáson kívüli 2.2 direct reference ettől még eltávolítandó.

| Modul/repo | Legacy reference | Feloldott finding | Valós Http-fogyasztó | Kötelező megoldás |
|---|---|---|---|---|
| Kontrolling | `Http.Abstractions 2.2.0` | nincs 4.5.0 a jelenlegi gráfban | endpoint `IResult`/Http types | net8 `FrameworkReference Microsoft.AspNetCore.App` |
| HR | `Http.Abstractions 2.2.0` | nincs 4.5.0 a jelenlegi gráfban | forráskeresésben nincs | package törlése; framework ref csak compile-igényre |
| legacy DMS | `Http.Abstractions 2.2.0` | **Critical 4.5.0** | endpoint Http types | net8 framework reference |
| JoineryTech Infrastructure | `Http.Abstractions 2.2.0` + `Http 2.2.2` | **Critical 4.5.0** | tenant interceptor | mindkettő törlése + framework reference |
| Joinery Infrastructure | `Http.Abstractions 2.2.0` | **Critical 4.5.0** | middleware + tenant interceptor | package törlése + framework reference |

A modern `src/dms` projekt már pontosan ezt a mintát dokumentálja: a net8
ASP.NET shared frameworket használja a stale 2.2 package helyett.

Hivatalos advisory: `System.Text.Encodings.Web` 4.5.0 kritikus, hálózatról
kihasználható RCE (CVSS 9.8), javított 4.5.1:
https://github.com/advisories/GHSA-ghhp-997w-qr28

## Végrehajtási szabály

Minden gitlink/repo külön fájlzárral, külön bizonyítékkal készül. A változás
mechanikus dependency-seam javítás; üzleti kód módosítása tilos.

Modulonként:

1. `dotnet list <belépő csproj> package --vulnerable --include-transitive`
   baseline és `dotnet nuget why ... System.Text.Encodings.Web` útvonal mentése;
2. a 2.2-es `Microsoft.AspNetCore.Http*` package reference törlése;
3. ha a class library Http típusokat használ, `<FrameworkReference
   Include="Microsoft.AspNetCore.App" />`; ha nem használ, ne adj fölösleges
   framework reference-t;
4. restore, build, célzott tesztek;
5. új `nuget why` és vulnerability-scan: a 4.5.0 dependencynek el kell tűnnie;
6. lock/assets/obj generált fájl nem commitolható.

Direct `System.Text.Encodings.Web` pin nem elfogadott alapmegoldás: az elavult
ASP.NET 2.2 csomaggráfot kell eltávolítani, nem csak fölülírni egyik levelét.

## Modulkapuk

### Kontrolling

- build + Docker-mentes domain/application teszt;
- endpoint compile bizonyítja az `IResult`/Http típusokat;
- EF Relational 8.0.7 külön cache-hardening task, nem e szelet.

### HR

- teljes forráskeresés ismét `IHttpContextAccessor|HttpContext` mintára;
- package egyszerű törlése preferált;
- build + HR gyors suite.

### Legacy DMS

- endpoint build framework reference-szel;
- ne keverd a modern `src/dms` ADR-059 ágával;
- DMS gyors suite.

### JoineryTech és Joinery Infrastructure

- mindkét repo valóban használ HttpContextot, ezért shared framework szükséges;
- tenant interceptor/middleware viselkedés nem változhat;
- API + Infrastructure build, tenant/security tesztek;
- ezek külön gitlink/repo lockot igényelnek.

## Elfogadási kritériumok

- [x] EHS direct 2.2 package eltávolítva, critical finding megszűnt.
- [x] **Kontrolling** direct 2.2 dependency megszűnt (2026-08-03, root); a gráfban
      **0** `AspNetCore.Http`-sor, build 0 W / 0 E, teszt **191/191**.
- [ ] ~~HR direct 2.2 dependency~~ **ÁTMINŐSÍTVE: nem végrehajtási tétel.** A referencia
      a **halott** HR-fában (`src/spaceos-modules/spaceos-modules-hr`, host/Api nélkül)
      ül; az **élő** `src/hr` tiszta. Scope-döntés kell (törlés vagy élesztés).
- [ ] Legacy DMS 2.2 dependency és RCE-lánc megszűnt. ⚠ A modul a mai fán **nincs meg**
      — ez tisztázandó, nem tekinthető késznek.
- [x] **JoineryTech Infrastructure** két 2.2 package-e megszűnt (2026-08-03, root);
      a `System.Text.Encodings.Web 4.5.0` **eltűnt a gráfból** (előtte mérten ott volt),
      `FrameworkReference` hozzáadva, **mutációval igazoltan teherhordó** (kivéve: 3 hiba).
- [ ] Joinery Infrastructure 2.2 package-e megszűnt. ⚠ **Külön repó** (submodule) —
      külön commit + gazda-ACK kell, innen nem végezhető el.
- [ ] Minden érintett modul build/teszt zöld. → **A két elvégzett modulra teljesült**
      (JoineryTech.sln 0 W/0 E · Kontrolling src+host+tests 0 W/0 E + 191/191);
      a maradék kettőre nyitva. ⚠ A JoineryTech-modulnak **nincs egyetlen tesztje sem**
      (ld. a melléklelet), tehát ott a bizonyíték kizárólag build + függőségi gráf.
- [ ] Egyetlen célgráfban sincs `System.Text.Encodings.Web 4.5.0`. → **A két elvégzett
      modulra mérve teljesül**; a Joinery-submodule és a legacy DMS kérdése nyitva.
- [ ] **Független security review APPROVED modulonként.** ⚠ Ezt a root **nem tudja
      magára kiállítani**: a végrehajtó ma a root volt, tehát a „független" feltétel
      per definitionem nem teljesül. Vagy a gazda-döntéssel érkező sáv nézi át, vagy
      Gábor mondja ki, hogy a mért bizonyíték (mutáció + gráf-diff + 191/191) elég.

## Stop / eszkaláció

- Gitlink mutáció csak az adott repo tulajdonosának/rootjának ACK-jával.
- Ha framework reference mellett compile-hiba marad, a valós API surface-t
  azonosítsd; régi 2.2 package visszaállítása tilos.
- Ha valamely projekt nem net8, külön compatibility döntés kell.
- Deploy csak a teljes érintett host vulnerability-scanje után.

## Rollback

Modulonként atomikus. Rollback után a vulnerability-scan kötelező; kritikus
findinget visszahozó állapot nem release-elhető.

---

## 2026-08-03 — ROOT-VÉGREHAJTÁS: 4-ből 2 lezárva, és a másik kettő NEM végrehajtás-kérdés

A tétel gazdátlan volt (Codex-sáv), a triázs-kör kihozta, a root elvégezte a
végrehajtható részét. **Minden szám saját mérés**, a munkafán (ld. a korlátot lent).

### Amit a mérés a kiíráshoz képest MEGVÁLTOZTATOTT

A táblázat öt modult sorol. A mai fán **négy** hordozza a referenciát, és a négyből
**kettő nem végrehajtási feladat**:

| Modul | Mért állapot | Mi történt |
|---|---|---|
| **JoineryTech.Infrastructure** | a `System.Text.Encodings.Web 4.5.0` **ténylegesen materializálódik** | ✅ **JAVÍTVA** |
| **Kontrolling** | a lánc **elfedve** (a tranzitív feloldás 8.0.0), de a 2.2 direct referencia él | ✅ **JAVÍTVA** |
| **HR** | ⛔ a referencia a **HALOTT** HR-fában ül | ❌ nem javítom — ld. lent |
| **Joinery.Infrastructure** | a `spaceos-modules-joinery` **külön repó** (submodule) | ❌ nem innen — külön commit + gazda |
| legacy DMS | a mai fán **nincs meg** | tisztázandó, NEM feltételezhető, hogy kész |

### ⛔ A HR-sor egy halott fára mutat — ezért NEM javítottam

A HR-nek **két fája** van a repóban, és a lelet a rosszban ül:

```
src/hr/                              src + Api + tests · utolso commit 2026-07-25 · ELO
src/spaceos-modules/spaceos-modules-hr/   src + tests, API/HOST NELKUL · 2026-07-15 · csak a sajat tesztje hivatkozza
```

**Az élő HR-fa tiszta** — nincs benne 2.2-es referencia. A leletet hordozó fa az,
amelyiknek nincs hostja. Ennek a „javítása" egy hulla kozmetikázása lenne, és
elrejtené a valódi kérdést: **a halott fa törlése vagy élesztése scope-döntés**
(ugyanaz az osztály, mint az orphan `spaceos-modules-ehs` fa).

### Mérések

| Mit | Előtte | Utána |
|---|---|---|
| `JoineryTech.Infrastructure` függőségi gráf | `Encodings.Web 4.5.0` + 3 AspNetCore.Http-sor | **0 találat mindkettőre** |
| `Kontrolling` függőségi gráf | `Http.Abstractions 2.2.0` (a 4.5.0 elfedve 8.0.0-val) | **0 AspNetCore.Http-sor** |
| `JoineryTech.sln` (Api + Tests is) | — | **0 warning / 0 error** |
| Kontrolling `src` / `host` / `tests` build | 0 W / 0 E | **0 W / 0 E** (változatlan) |
| Kontrolling teszt-suite | — | **191/191 zöld** (4 m 48 s) |
| saját `dotnet-build-gate` (önteszt + ratchet) | — | önteszt PASS, **„TISZTA: nincs romlás"** |

**MUTÁCIÓ** (a produkciós oldalon, alkalmazva-bizonyítva): a beírt
`FrameworkReference` kivétele a `JoineryTech.Infrastructure`-ből → **3 fordítási hiba**.
A sor tehát **teherhordó**, nem kozmetika; a kiírás állítása („valós Http-fogyasztó:
tenant interceptor") kódszinten is igazolt: `Data/TenantDbConnectionInterceptor.cs`
`IHttpContextAccessor`-t használ. ⚠ Az első mutáció-olvasatom hibás volt (0 hibát
mértem, mert `error CS`-re grepeltem a build-összegző helyett) — a **negatív eredmény
érvényességét külön kellett igazolni**, és nem állt.

### ⚠ MELLÉKLELET, ami nem ehhez a taskhoz tartozik, de itt derült ki

A **`SpaceOS.Modules.JoineryTech.Tests` projekt NULLA tesztet tartalmaz**
(0 `.cs` fájl, 0 `[Fact]`/`[Theory]`), miközben:

- a `dotnet test` rá **exit 0**-t ad („No test is available" — de a kilépőkód siker);
- a `dotnet-build-gate` a listáján **`OK w=0`** sorként jelenik meg.

Vagyis egy olvasó jogosan hinné, hogy a modul teszt-fedettséggel bír. **Nincs.**
A mai javítást ebben a modulban **kizárólag build és függőségi gráf** igazolja,
teszt nem. Külön tételként felvéve.

### A mérés korlátja, kimondva

A build/teszt-mérések a **munkafán** futottak, amelyen idegen sáv commitolatlan
változásai is ülnek (Kontrolling endpoint/portfolio). A csproj-változás ettől
független, és a **különbség-mérés ugyanabban a fában** történt (előtte 0 W/0 E,
utána 0 W/0 E), de a „main-ág zöld" állítás ebből **nem** következik — a CI-kapu
mondja ki, push után.
