# STAB-CUTTING-SUBPROCESS-PORTABILITY — hordozható subprocess tesztkapu

- **Szerep:** backend/integration
- **Prioritás:** P0
- **Státusz:** done — root (Claude subagent) adversarial review PASS, mergelve
  (`spaceos-modules-cutting@f39d3ea`), platform-pin frissítve
- **Függőség:** nincs; a Cutting production runner szerződése változatlan
- **Mutációs határ:**
  `src/spaceos-modules-cutting/tests/SpaceOS.Modules.Cutting.Tests/Adapters/Infrastructure/BoundedSubprocessRunnerTests.cs`,
  ez a task, az epic index és a Cutting teszt-runbook
- **Tiltott scope:** `BoundedSubprocessRunner` production átírása, CLI adapter wire-szerződés,
  memória-limit megvalósítása, portal, deploy, más agent Cutting fájljai

## Cél

A `BoundedSubprocessRunnerTests` Windows, Linux és macOS alatt is ugyanazt az
alkalmazásszerződést bizonyítsa: stdout/stderr rögzítés, exit code, timeout és
futási idő. A negatív aszinkron tesztek valóban várják meg a FluentAssertions
ellenőrzését, ne hamis zöld eredményt adjanak.

## Gyökérok és döntés

Az öt bukó teszt `/bin/echo`, `/bin/bash`, `/bin/sleep` és `/tmp` elérési utakat
feltételezett. A production runner ezzel szemben konfigurációból kapja az
executable-t, és `ProcessStartInfo.ArgumentList` elemekkel, shell nélkül indítja.
Ezért platformfordítást a production kódba tenni hibás absztrakció lenne.

A tesztfixture operációs rendszer szerint választ tesztshellt:

- Windows: `ComSpec`/`cmd.exe`, strukturált `/d`, `/c`, parancs argumentumok;
- Linux/macOS: `/bin/sh`, strukturált `-c`, parancs argumentum;
- working directory: `Path.GetTempPath()`.

A shell kizárólag determinisztikus fixture; a production runner továbbra sem
épít vagy értelmez shell-parancssort.

## Tesztterv

```powershell
dotnet test tests/SpaceOS.Modules.Cutting.Tests/SpaceOS.Modules.Cutting.Tests.csproj `
  --filter "FullyQualifiedName~BoundedSubprocessRunnerTests" `
  -m:1 -p:BuildInParallel=false

dotnet test tests/SpaceOS.Modules.Cutting.Tests/SpaceOS.Modules.Cutting.Tests.csproj `
  --no-build -m:1 -p:BuildInParallel=false

dotnet build SpaceOS.Modules.Cutting.sln --no-restore `
  -m:1 -p:BuildInParallel=false
```

## Elfogadási kritériumok

- [x] A célzott suite 7/7 zöld Windows alatt.
- [x] Linux/macOS ágon nincs `/bin/bash`-függés; POSIX `/bin/sh` elég.
- [x] Nincs hard-coded `/tmp`; a platform temp könyvtára kerül használatra.
- [x] Az empty executable és null request teszt `async Task`, az assertion awaited.
- [x] A teljes Cutting suite öt hibával javul, új hiba nélkül.
- [x] A production subprocess/CLI fájlok változatlanok.

## Stop / eszkaláció

Ha egy támogatott CI runneren a rendszer shell nem érhető el, ne tegyél
platform-specifikus viselkedést a production runnerbe. Külön, fordított .NET
fixture executable-t kell készíteni és annak build-outputját a teszt mellé másolni.

## Baseline

- Célzott futás Windows alatt: **2/7 zöld, 5 hiba**; mind az öt hiba
  `Win32Exception`, mert a `/bin/*` executable nem létezik.
- A két zöld negatív teszt hamis pozitív volt: a `ThrowAsync` visszatérési
  taskját nem várta meg, és maga a tesztmetódus `void` volt.
- A teljes suite előző, kultúrafix utáni állapota: **1036/1050 zöld, 14 hiba**.

## Átadási bizonyíték

- Célzott suite: **7/7 zöld** Windows 11 alatt; baseline: 2/7, ebből két
  hamis pozitív assertion.
- Teljes Cutting suite: **1041/1050 zöld, 9 hiba**; a korábbi 14-ből pontosan
  az öt `BoundedSubprocessRunnerTests` hiba szűnt meg.
- Fennmaradó hibák: 2 `EmailServiceTests` validációs kontraktus és 7
  `QuoteRequestEndpointTests` integration host/auth/fixture hiba.
- Solution build: **sikeres, 0 hiba, 1 meglévő NU1902 warning** (`MailKit` 4.9.0).
- Production `BoundedSubprocessRunner.cs` és `CliWrapperTransport.cs` nem változott.
- A további security kutatás külön
  [`STAB-CUTTING-SUBPROCESS-BOUNDS`](STAB-CUTTING-SUBPROCESS-BOUNDS.md) taskban
  rögzíti a nem érvényesített memória-limitet, pipe-drain és cancellation gapet.

## Független review-kérés

A reviewer ellenőrizze a Windows és POSIX argumentumágakat, az awaited negatív
assertionöket, valamint azt, hogy production fájl nem került a diffbe. Commit,
submodule-pin és deploy csak review után történhet.
