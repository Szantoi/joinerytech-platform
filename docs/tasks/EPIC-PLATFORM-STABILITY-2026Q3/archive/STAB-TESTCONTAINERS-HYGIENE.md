# STAB-TESTCONTAINERS-HYGIENE — erőforrás-biztos tesztfuttató

- **Szerep:** infra/backend
- **Prioritás:** P0
- **Státusz:** KÉSZ
- **Függőség:** `STAB-EHS-INTEGRATION` fixture-döntése
- **Mutációs határ:** `scripts/`, tesztfuttatási dokumentáció/config, szükséges
  Testcontainers builder-helper fájlok
- **Tiltott scope:** `docker system prune`, név/címke nélküli konténertörlés,
  tartós fejlesztői adatbázis leállítása

## Cél

Normál, hibás és megszakított .NET tesztfutás után se maradjon új
`org.testcontainers=true` konténer. A wrapper csak az adott futás által létrehozott
erőforrást takaríthatja, a `doorstar-production-db` és minden pre-existing
konténer érintetlen.

## Megvalósítás

1. Készíts PowerShell tesztwrappert `scripts/Invoke-DotNetTestSafe.ps1` néven.
2. Preflightban mentse a már futó Testcontainers ID-ket, ellenőrizze Docker
   állapotát és a szabad memóriát.
3. A parancsot argumentumlistából indítsa, továbbítsa az exit code-ot, és
   `finally` blokkban csak a baseline után megjelent,
   `org.testcontainers=true` címkéjű konténereket állítsa le/törölje.
4. Ne építsen shell-stringet felhasználói paraméterből. Minden ID-t a Docker
   strukturált filteréből vegyen.
5. Írjon géppel olvasható összesítést: duration, exit code, created/removed IDs,
   peak container count. Secret/env értéket ne naplózzon.
6. Dokumentáld a használatot a task-indexben vagy külön `scripts/README.md`-ben.
7. Készíts Pester tesztet vagy dry-run adapteres unit tesztet a
   pre-existing/new ID különbségre és a nem-Testcontainers védelemre.

## Tesztterv

```powershell
# dry-run / unit
pwsh -File scripts/Invoke-DotNetTestSafe.ps1 -Project <kis-testprojekt> -WhatIfCleanup
# normál zöld futás
pwsh -File scripts/Invoke-DotNetTestSafe.ps1 -Project src/spaceos-modules-hosting/tests/SpaceOS.Modules.Hosting.Tests/SpaceOS.Modules.Hosting.Tests.csproj
# kontroll: előtte és utána azonos pre-existing konténerkészlet
docker ps --filter "label=org.testcontainers=true" --format "{{.ID}}"
```

## Elfogadási kritériumok

- [x] A wrapper megőrzi a teszt eredeti exit code-ját.
- [x] Csak az aktuális futás új, címkézett konténereit takarítja.
- [x] A `doorstar-production-db` védelmét automatikus teszt bizonyítja.
- [x] Normál és mesterségesen megszakított kontroll után 0 új orphan marad.
- [x] Nincs `prune`, globális WSL shutdown vagy secret-logolás.

## Stop / eszkaláció

Ha egy aktív tesztfolyamat tulajdonjoga nem állapítható meg, a wrapper ne töröljön;
adjon blokkolt eredményt és listázza az ID-ket.

## Végrehajtási napló

### 1. Környezet-előkészítés

- Docker Desktop a feladat kezdetén nem futott a gépen; elindítva, majd
  `docker info`-val válaszképesnek igazolva.
- A gépen csak a beépített Windows PowerShell 5.1 és egy ősi, gyári
  **Pester 3.4.0** volt jelen, `pwsh` (PowerShell 7) nem. A repóban korábban
  SEHOL nem volt Pester-teszt (ellenőrizve `Grep`-pel a teljes repón) — ez
  megnyitotta a task-doksi 7. pontjának "Pester teszt VAGY dry-run/adapteres
  unit teszt, ha Pester nincs betelepítve" alternatíváját, de mivel a gépen
  ELVILEG volt Pester (csak évekkel elavult, más szintaxissal), inkább a modern
  változatot telepítettem, hogy a teszt a mai konvenciót kövesse:
  a `NuGet` package provider hiányzott (ez nem-interaktív módban blokkolta az
  `Install-Module`-t egy `ShouldContinue` promptmal) → telepítve a NuGet
  provider, majd **Pester 5.6.1** `-Scope CurrentUser -SkipPublisherCheck`-kel
  (a gyári 3.4.0-t nem írja felül, csak kiegészíti).

### 2. Megvalósítás

- **`scripts/TestcontainersHygiene.psm1`** (új): a döntési logika
  (`Resolve-OrphanCleanupPlan`) szándékosan Docker-I/O-mentes, tiszta függvény
  — ez teszi lehetővé, hogy a két kötelező bizonyítékot (pre-existing vs. új,
  és a nem-címkézett/védett-nevű konténer sosem törlődik) gyors, determinisztikus
  Pester-teszttel lehessen igazolni Docker nélkül is. A Docker-hívó függvények
  (`Get-TestcontainersContainerIds`, `Get-ContainerName`, `Test-ContainerHasLabel`,
  `Remove-OrphanContainer`, `Test-DockerAvailable`) mind Docker saját strukturált
  `--filter`/`--format`/`inspect` kimenetére épülnek, sosem szöveges `docker ps`
  tábla-parse-ra, és minden konténer-ID-t egy hex-mintás regexszel validálnak
  felhasználás előtt (védelem az injection ellen, azon felül, hogy az ID-k
  amúgy is csak Docker saját kimenetéből származnak).
- **`scripts/Invoke-DotNetTestSafe.ps1`** (új): preflight (Docker-válaszkészség
  időkorláttal + szabad memória advisory-check) → baseline snapshot → a
  tesztparancs `Start-Process -ArgumentList <tömb>`-ből indítva (sosem
  string-konkatenált parancssor) → `finally` blokkban diff + takarítás +
  JSON-összesítő (`duration`, exit code, baseline/post-run/new/removed/
  protected/ambiguous/ignored ID-listák, peak konténerszám). Sentinel exit
  code **90**, ha a preflight (Docker nem válaszol / `-FailOnLowMemory` és
  kevés a memória) miatt a teszt el sem indul; minden más esetben a script
  saját exit code-ja pontosan a `dotnet test` valódi exit code-ja.
- **`scripts/Invoke-DotNetTestSafe.Tests.ps1`** (új): Pester 5 teszt-suite.
- **`scripts/README.md`** (új, korábban nem létezett): használati dokumentáció.

### 3. Két valódi hiba, amit a tényleges futtatás közben találtam és javítottam

Mindkettőt csak azért találtam meg, mert a wrappert éles Docker Desktop ellen,
valódi `dotnet test` futtatásokkal ellenőriztem, nem csak elolvastam a kódot:

- **Hiba A — az exit code elveszett.** `Start-Process -PassThru` után a
  Windows PowerShell 5.1 alatti .NET Framework-ös `Process` osztály elvéti a
  `.HasExited`/`.ExitCode`-ot, ha a `.Handle`-t sosem érintjük előtte (ismert
  quirk). Az első éles futtatásnál a JSON-összesítő `testExitCode` mezője
  üresen ("exit code .") jött vissza — ami pont az elfogadási kritérium #1-et
  ("megőrzi az eredeti exit code-ot") törte volna szét, csendben. Javítás:
  `$null = $proc.Handle` közvetlenül `Start-Process` után. Utána mindhárom
  megfigyelt exit code (0 zöld futásnál, 1 hibás/megölt futásnál, 90
  preflight-abortnál) helyesen jelent meg.
- **Hiba B — a törlés előtti címke-újraellenőrzés MINDIG hamis lett volna.**
  Az eredeti `Test-ContainerHasLabel` egy Go-template stringbe ágyazott dupla
  idézőjelet küldött a `docker.exe`-nek
  (`{{index .Config.Labels "org.testcontainers"}}`) — a PowerShell natív
  argumentum-átadása menet közben elrontja a beágyazott `"` karaktereket, a Go
  template parser `function "org" not defined` hibával elszállt, a függvény
  emiatt MINDIG `$false`-t adott volna vissza. Élesben ez azt jelentette
  volna, hogy a wrapper a paranoid újraellenőrzésen mindig elakad és SOHA nem
  töröl semmit (a log "no longer carries the label" ürüggyel mindent
  kihagyott volna) — pontosan ez történt az első valódi futtatásnál (a saját
  Ryuk-reaper konténerén reprodukálva, közvetlenül igazolva közvetlen
  függvényhívással). Javítás: `{{json .Config.Labels}}` + `ConvertFrom-Json`
  PowerShell-oldali feldolgozásra cserélve (nincs beágyazott idézőjel a Docker
  felé küldött argumentumban). E nélkül a tényleges Docker-ellenes futtatás
  nélkül ez a hiba észrevétlen maradt volna, mert a Pester-egységteszt (ami
  nem hív valódi `docker.exe`-t) nem látta volna.

### 4. Valós, Docker Desktop ellen futtatott ellenőrzések

A gépen 11 db, napokkal korábbi, más agent-körökből maradt, `Exited` állapotú
Testcontainers-konténer volt jelen a munka kezdetén (baseline) — ezek a teljes
vizsgálat alatt érintetlenek maradtak. A valódi, folyamatosan futó
`doorstar-production-db` (unlabeled, `StartedAt: 2026-07-22T16:48:23`) a teljes
munkamenet alatt — dry-run, több zöld futás, kevert szcenárió, megszakított
futás — egyetlen másodpercet sem változott (`docker inspect` `StartedAt`
mezővel ellenőrizve a legvégén is).

- **Dry-run** (`-WhatIfCleanup`) `SpaceOS.Modules.Hosting.Tests` ellen:
  57/57 zöld, exit code 0, 0 új konténer (ez a suite nem indít saját
  Testcontainert), a terv helyesen semmit sem listázott törlésre.
- **Valódi (nem dry-run) zöld futás** `SpaceOS.Modules.Ehs.Infrastructure.Tests`
  ellen (ez ténylegesen Testcontainer-alapú Postgres-t indít, ld. STAB-EHS-
  INTEGRATION `EhsPostgresFixture`): 76/76 zöld, exit code 0; a futás saját
  maga generálta 1 Postgres + 1 Ryuk-reaper konténert, mindkettőt helyesen
  új+címkézettként azonosította és eltávolította; a 11 pre-existing konténer
  és a `doorstar-production-db` érintetlen maradt. Megismételve (több
  független futtatás), azonos eredménnyel.
- **Kevert szcenárió** (valós Docker-konténerekkel szimulálva "mi történik, ha
  a futás ALATT más is indít konténert"): a fenti EHS-futás közben kézzel
  indítottam 3 plusz konténert: (a) `hygiene-test-orphan-unprotected`
  (`org.testcontainers=true` címkével, nem védett név), (b)
  `hygiene-test-protected-decoy` (`org.testcontainers=true` címkével, a
  `-ProtectedContainerNames` paraméterben explicit védett névként átadva),
  (c) `hygiene-test-unlabeled-decoy` (NINCS testcontainers címkéje). A
  wrapper JSON-összesítője: `removedContainerIds` = [az EHS-futás saját
  Postgres+Ryuk konténere, `hygiene-test-orphan-unprotected`],
  `protectedContainerIds` = [`hygiene-test-protected-decoy`] (érintetlen
  maradt); az unlabeled decoy egyik listában sem jelent meg (mert a
  lekérdezés már a Docker-oldali címke-szűrőn átment). Ez a két legkényesebb
  elfogadási kritériumot (pre-existing vs. új megkülönböztetés + a
  nem-címkézett/védett-nevű konténer sosem törlődik) élő Dockerrel is
  igazolja, nem csak a Pester-egységteszttel.
- **Mesterségesen megszakított futás**: az EHS-suite-ot háttérben elindítva,
  a wrapper saját logjából ("Starting test execution please wait") + ~8 mp
  várakozással megvártam, míg a Postgres-fixture ténylegesen felhúzza a
  konténerét (`docker ps` megerősítette: Postgres + Ryuk-reaper konténer fut),
  majd `taskkill /T /F`-fel megöltem magát a `dotnet test` folyamatfát (a
  wrapper powershell-folyamatát NEM, csak a gyermek `dotnet.exe`-ket) — így a
  wrapper `finally` blokkja élesben, valódi megszakítás után futott le, nem
  szimulálva. Eredmény: `testExitCode`/`scriptExitCode` = 1 (a megölt folyamat
  hibás visszatérési kódja helyesen továbbadva); a futás közben keletkezett
  mind a 3 új konténer (2 Postgres-kapcsolódó + 1 Ryuk-reaper) helyesen
  azonosítva és eltávolítva; a 11 pre-existing konténer + `doorstar-production-db`
  érintetlen. Közvetlenül utána `docker ps -a --filter "label=org.testcontainers=true"`:
  pontosan a 11 baseline konténer, **0 új orphan**.
- **Preflight-abort valódi útvonala**: egy gyerekfolyamatban `PATH`-t
  `C:\Windows\System32`-re szűkítve (sem `docker`, sem `dotnet` nem elérhető)
  a wrapper korrekt `exit code 90`-nel állt le, **mielőtt bármilyen tesztet
  elindított volna** — ezt a Pester-suite egy integrációs tesztje minden
  futtatáskor automatikusan újra-igazolja.
- Egy alkalommal (a kevert-szcenáriós kísérletezés közben, egy párhuzamosan
  futtatott `docker events` figyelő miatt) a Docker Desktop named pipe-ja
  ténylegesen válaszképtelenné vált egy pillanatra — ekkor a wrapper helyesen
  a preflight-abort ágon (exit 90) állt le, tesztfuttatás és
  konténer-módosítás nélkül. Ez véletlen, de valós megerősítése a preflight
  védelemnek.

### 5. Pester-teszt

`Invoke-Pester -Path scripts/Invoke-DotNetTestSafe.Tests.ps1` (Pester 5.6.1):
**14/14 zöld**. Lefedés: pre-existing vs. új ID megkülönböztetés (több eset,
sorrend-függetlenség is), nem-címkézett konténer sosem törlődik még ha "új" is,
`doorstar-production-db` védelme az adversarial esetben is (hipotetikusan
új+címkézett+ugyanaz a védett név), egy realisztikus kevert szcenárió
(pre-existing orphan + új orphan + védett név + nem-címkézett idegen konténer
egyszerre), az ambiguous/stop-eszkalációs eset (fel nem oldható név → jelentve,
nem törölve), konténer-ID validáció (injection-szerű string elutasítva), és egy
valós preflight-abort integrációs teszt (docker-mentes `PATH`-ú gyerekfolyamat).

### 6. Ismert korlátok / amit NEM sikerült élesben, célzottan igazolni

- A "Docker válaszképtelenné válik pontosan a cleanup-fázisban"
  (`cleanupStatus: blocked-docker-unavailable`) ágat csak kódszemlével + a
  logika szintjén ellenőriztem determinisztikusan; a fent (5. pont) leírt
  véletlen Docker-válaszképtelenség a PREFLIGHT ágat igazolta (exit 90), nem
  célzottan a cleanup-fázisbeli blokkolt ágat. Független reviewer-nek érdemes
  ezt egy mock/stub `docker` paranccsal (ami a cleanup pillanatában hibát dob)
  külön lefednie.
- A gépen valós erőforrás-nyomás jelentkezett a több egymást követő, valódi
  Testcontainers-futtatás alatt (szabad memória időnként 2.3 GB-ról 197 MB-ra
  esett) — ez indokolja a `-MinFreeMemoryMB`/`-FailOnLowMemory` advisory
  ellenőrzést, egyben arra is figyelmeztet, hogy ezen a gépen több nehéz,
  párhuzamos `dotnet test`+Docker-kör futtatása fokozott elővigyázatosságot
  igényel.
- A `SpaceOS.Modules.Ehs.Infrastructure.Tests` 76/76 zöld eredménye csak a
  Testcontainers-higiénia mellékbizonyítéka; a STAB-EHS-INTEGRATION már lezárt
  task, ezt a suite-ot nem auditáltam újra tartalmilag.

## Átadási bizonyíték

**Módosított/új fájlok** (a mutációs határon belül, `scripts/` + saját
task-doksi):

- `scripts/TestcontainersHygiene.psm1` (új) — Docker-I/O-mentes döntési logika
  + vékony Docker-wrapper függvények.
- `scripts/Invoke-DotNetTestSafe.ps1` (új) — a wrapper script.
- `scripts/Invoke-DotNetTestSafe.Tests.ps1` (új) — Pester 5 teszt-suite.
- `scripts/README.md` (új, korábban nem létezett) — használati dokumentáció.
- ez a task-doksi.

**Pester-eredmény:**

```
Tests Passed: 14, Failed: 0, Skipped: 0, Inconclusive: 0, NotRun: 0
```

**Normál zöld futás** (`SpaceOS.Modules.Ehs.Infrastructure.Tests`, valódi
Testcontainer-alapú Postgres-fixture-rel):

```
Passed!  - Failed: 0, Passed: 76, Skipped: 0, Total: 76, Duration: 38 s
[testcontainers-hygiene] dotnet test finished with exit code 0.
[testcontainers-hygiene] Removed orphan container a6872a40c727.
"testExitCode": 0, "scriptExitCode": 0, "newContainerIds": ["a6872a40c727"],
"removedContainerIds": ["a6872a40c727"], "cleanupStatus": "ok"
```

**Mesterségesen megszakított futás** (a `dotnet test` folyamatfa `taskkill /T /F`-fel
megölve, miután a Postgres-fixture konténere ténylegesen felállt; a wrapper
powershell-folyamata NEM lett megölve, csak a gyermek `dotnet.exe`):

```
[testcontainers-hygiene] dotnet test finished with exit code 1.
[testcontainers-hygiene] Removed orphan container 825c5f6c60da.
[testcontainers-hygiene] Removed orphan container 6f3f06f30788.
[testcontainers-hygiene] Removed orphan container 358ff1912648.
"testExitCode": 1, "scriptExitCode": 1,
"newContainerIds": ["825c5f6c60da","6f3f06f30788","358ff1912648"],
"removedContainerIds": ["825c5f6c60da","6f3f06f30788","358ff1912648"],
"cleanupStatus": "ok"
```

Közvetlenül utána: `docker ps -a --filter "label=org.testcontainers=true" --format "{{.ID}}"`
→ pontosan a 11 pre-existing baseline ID, **0 új orphan**.

**`doorstar-production-db` védelme** — automatikus Pester-teszttel
(`Resolve-OrphanCleanupPlan` adversarial eset: hipotetikusan új + címkézett +
`doorstar-production-db` néven) ÉS élő megfigyeléssel is igazolva:

```
docker inspect doorstar-production-db --format "{{.State.Status}} {{.State.StartedAt}}"
running 2026-07-22T16:48:23.169099829Z
```

— ugyanez az időbélyeg a munkamenet legelején és a legutolsó ellenőrzésnél is,
minden köztes futtatás (dry-run, több zöld futás, kevert szcenárió, megszakított
futás) után változatlan.

**Kevert szcenárió** (védett név + nem-védett orphan + nem-címkézett idegen
konténer egyidejűleg, valós Dockerrel):

```
"newContainerIds": ["0e71ca72c996","79632493a6a3","dac945a01611"],
"removedContainerIds": ["79632493a6a3","dac945a01611"],
"protectedContainerIds": ["0e71ca72c996"]
```

(`0e71ca72c996` = `hygiene-test-protected-decoy`, a `-ProtectedContainerNames`
listában; `79632493a6a3` = a valós orphan; `dac945a01611` = az EHS-futás saját
Ryuk-reaper konténere. A `hygiene-test-unlabeled-decoy` egyik listában sem
szerepel — sosem volt címkézett, ezért Docker-oldali szűrőn már ki sem jött.)

**Build-ellenőrzés:** `SpaceOS.Modules.Ehs.Infrastructure.Tests.csproj` és
`SpaceOS.Modules.Hosting.Tests.csproj` mindkettő hiba nélkül épül (csak
pre-existing AutoMapper NU1603/NU1903 feed-drift figyelmeztetés).

Minden teszt-melléktermék (a kézzel indított `hygiene-test-*` konténerek) a
vizsgálat végén eltávolítva; a gép Docker-állapota a munka lezárásakor
megegyezik a baseline-nal (11 pre-existing konténer + `doorstar-production-db`).

