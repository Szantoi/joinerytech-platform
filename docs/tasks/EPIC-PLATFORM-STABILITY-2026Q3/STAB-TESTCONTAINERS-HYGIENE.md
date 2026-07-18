# STAB-TESTCONTAINERS-HYGIENE — erőforrás-biztos tesztfuttató

- **Szerep:** infra/backend
- **Prioritás:** P0
- **Státusz:** pending
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

- [ ] A wrapper megőrzi a teszt eredeti exit code-ját.
- [ ] Csak az aktuális futás új, címkézett konténereit takarítja.
- [ ] A `doorstar-production-db` védelmét automatikus teszt bizonyítja.
- [ ] Normál és mesterségesen megszakított kontroll után 0 új orphan marad.
- [ ] Nincs `prune`, globális WSL shutdown vagy secret-logolás.

## Stop / eszkaláció

Ha egy aktív tesztfolyamat tulajdonjoga nem állapítható meg, a wrapper ne töröljön;
adjon blokkolt eredményt és listázza az ID-ket.

## Végrehajtási napló

_Kitöltendő._

## Átadási bizonyíték

_Kitöltendő._

