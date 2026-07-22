# STAB-PLATFORM-ASPNET22-RCE-REMOVAL — legacy ASP.NET Core 2.2 RCE-lánc eltávolítása

- **Epic:** EPIC-PLATFORM-STABILITY-2026Q3
- **Szerep:** backend/security + federation
- **Prioritás:** P0 security
- **Státusz:** ready — platformszintű ismétlődés bizonyítva
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
- [ ] Kontrolling direct 2.2 dependency megszűnt; vulnerability-scan nem romlott.
- [ ] HR direct 2.2 dependency megszűnt; vulnerability-scan nem romlott.
- [ ] Legacy DMS 2.2 dependency és RCE-lánc megszűnt.
- [ ] JoineryTech Infrastructure két 2.2 package-e megszűnt.
- [ ] Joinery Infrastructure 2.2 package-e megszűnt.
- [ ] Minden érintett modul build/teszt zöld.
- [ ] Egyetlen célgráfban sincs `System.Text.Encodings.Web 4.5.0`.
- [ ] Független security review APPROVED modulonként.

## Stop / eszkaláció

- Gitlink mutáció csak az adott repo tulajdonosának/rootjának ACK-jával.
- Ha framework reference mellett compile-hiba marad, a valós API surface-t
  azonosítsd; régi 2.2 package visszaállítása tilos.
- Ha valamely projekt nem net8, külön compatibility döntés kell.
- Deploy csak a teljes érintett host vulnerability-scanje után.

## Rollback

Modulonként atomikus. Rollback után a vulnerability-scan kötelező; kritikus
findinget visszahozó állapot nem release-elhető.
