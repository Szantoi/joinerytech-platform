---
name: efcore-installation
description: 'Entity Framework Core environment setup guide: NuGet packages and dotnet-ef tool installation. Use when setting up EF Core for the first time or troubleshooting tool installations.'
domain: engineering
last_updated: 2026-02-24
---

# ??? EF Core Telepítés és Setup Skill

**Summary:** Gyors útmutató az Entity Framework Core környezet beállításához, a szükséges NuGet csomagokhoz és a `dotnet-ef` eszköz telepítéséhez.

## ?? Mikor töltsd be?

- **Projekt Setup**: Új projekt indításakor az adatbázis réteg elõkészítéséhez.
- **Környezet Hiba**: Ha a `dotnet ef` parancs nem található vagy verzióhiba van.
- **CI/CD**: Pipeline konfigurálásakor.

---

## ?? 1. Szükséges NuGet Csomagok

Ezeket a parancsokat a megfelelõ projekt mappájában futtasd.

### Infra Projekt (`JoineryTech.Flow.Infra`)

```powershell
dotnet add package Microsoft.EntityFrameworkCore
dotnet add package Microsoft.EntityFrameworkCore.Sqlite
dotnet add package Microsoft.EntityFrameworkCore.Design
```

- `dotnet-ef` telepítése (helyi, ajánlott repo szinten):

```powershell
# ha nincs tool manifest
dotnet new tool-manifest --force
# add a local tool dependency
# Frissítsd a dotnet-tools.json-be: "dotnet-ef": { "version": "10.0.2", "commands": ["dotnet-ef"] }
# majd restore
dotnet tool restore --verbosity diagnostic
```

- Ha globálisan szeretnéd (gyors megoldás, admin lehet kell):

```powershell
dotnet tool install --global dotnet-ef --version 10.0.2
# ellenõrzés
& "$env:USERPROFILE\\.dotnet\\tools\\dotnet-ef.exe" --version
```

- Migráció létrehozása és alkalmazása (példa a repo-ra):

```powershell
# migráció létrehozása
dotnet ef migrations add InitialCreate -p JoineryTech.Flow.Infra -s JoineryTech.Flow.Api
# migráció alkalmazása (adatbázis létrehozása)
dotnet ef database update -p JoineryTech.Flow.Infra -s JoineryTech.Flow.Api
```

> Tipp: ha `dotnet ef` a repo rootból futtatva a helyi toolt preferálja, és te globális eszközt használsz, hívd meg a globális futtathatót közvetlenül (`& "$env:USERPROFILE\\.dotnet\\tools\\dotnet-ef.exe" <cmd>`).

---

## Program.cs: automatikus migráció futtatás induláskor (opcionális)

- Példa kód:

```csharp
using var scope = app.Services.CreateScope();
var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
db.Database.Migrate();
```

---

## Hibakeresés / gyakori problémák

- Hálózati timeout / TLS reset (NU1301, HTTP timeouts):
  - Próbáld meg egy másik hálózatról (mobil hotspot) — gyakran corporate proxy/DPI okozza.
  - `dotnet nuget locals all --clear` majd `dotnet restore --verbosity diagnostic` a hiba pontos logjának gyûjtéséhez.
  - Ha a hálózat nem megbízható, használj helyi forrást: töltsd le a `.nupkg` fájlokat megbízható hálózatról és add a `dotnet nuget add source "C:\nuget-local" -n LocalPackages`-t.

- PowerShell `Invoke-WebRequest` vs natív `curl`:
  - A PowerShell HTTP kliens bizonyos környezetekben timeoutolhat másképp; natív `curl.exe` gyakran megbízhatóbb diagnosztikához.

- `dotnet tool restore` megszakad/exit code 1:
  - Ellenõrizd `dotnet-tools.json` szintaxisát (verzió pontos megadása, ne használj `8.*` jelölést), majd `dotnet tool restore --verbosity diagnostic`.
  - Ha nem megy, globális telepítés vagy CI alapú generálás lehetséges alternatíva.

- Design-time factory vagy `Microsoft.EntityFrameworkCore.Design` hiánya:
  - Ha a migráció futás közben a `DbContext` példányosítása sikertelen a design-time környezetben, gyõzõdj meg hogy a `Microsoft.EntityFrameworkCore.Design` csomag telepítve van a startup (vagy Infra) projektre.

---

## Alternatív/backup megoldások

- CI generálás (GitHub Actions): készíts egy workflow-ot, ami restore-olja a megoldást egy megbízható runneren, létrehozza a migrációt és commitolja (és push-olja) a migrációs fájlokat. Ez jól jön, ha helyi hálózati korlátok vannak.
- Lokális `.nupkg` feed (offline vagy korporát környezetben megbízható megoldás).

---

## Verifikáció (DoD)

- `dotnet ef --version` elérhetõ és a kívánt verziót adja vissza.
- `dotnet ef migrations add InitialCreate` létrehozza a migrációs fájlokat a `Migrations/` mappában.
- `dotnet ef database update` létrehozza az SQLite fájlt (pl. `JoineryTech.Flow.Api/flow.db`) és a táblák megvannak.
- API indul, a Swagger UI elérhetõ és adatok perzisztálnak újraindítás után.

---

## Hivatkozások a repo-ra

- Példák a projektben: `JoineryTech.Flow.Infra/AppDbContext.cs`, `JoineryTech.Flow.Infra/Migrations/`, `JoineryTech.Flow.Api/appsettings.json` (ConnectionStrings)
- CI példa is hozzáadva: `.github/workflows/generate-migration.yml`

---

Ha szeretnéd, beillesztem ezt a skillt `src/agent-system/database/roles/skills/index.md`-be vagy létrehozok egy rövid checklist fájlt, amelyet fejlesztõk könnyen követhetnek. Szeretnéd, hogy linkeljem be az új skillt az `skills` indexbe is? ??
