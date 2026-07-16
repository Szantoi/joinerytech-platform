# VPS service-állapot — 2026-07-16 (kritikus lelet)

> Felderítés az újonnan beállított `joinerytech-vps` SSH-hozzáférésen.
> Kiváltó ok: Gábor jelezte, hogy a `spaceos-joinery.service` crash-loopol.
> **A valóság ennél nagyobb: a teljes spaceos backend áll.**

## A gyökérok — egy mondatban

**A projekt átköltözött `/opt/spaceos/backend/` alól `/opt/joinerytech/src/` alá,
de a systemd unit-ok nem követték.** Minden `spaceos-*.service` egy nem létező
útvonalra mutat, ezért mind végtelen újraindításban van.

| Unit keresi | Valójában itt van |
|---|---|
| `/opt/spaceos/backend/spaceos-modules-joinery/publish` | `/opt/joinerytech/src/spaceos-modules-joinery/publish` ✅ |
| `/opt/spaceos/backend/spaceos-kernel/publish` | (a `/opt/spaceos/backend/` **egyáltalán nem létezik**) |
| `/opt/spaceos/spaceos-nexus/knowledge-service/.env` | `/opt/joinerytech/src/joinerytech-nexus/knowledge-service/` ✅ |

A publish-mappák tehát **megvannak** (abstractions, identity, inventory, joinery,
procurement, sales) — csak az új helyükön. Ez zömmel **unit-javítás**, nem újra-deploy.

## Az érintett service-ek (2026-07-16 21:00)

| Service | Újraindítás | Állapot |
|---|---|---|
| spaceos-orchestrator | **141 057** | activating (auto-restart) |
| spaceos-knowledge (**a Nexus MCP!**) | **35 967** | activating (auto-restart) |
| spaceos-kernel | 4 704 | activating (auto-restart) |
| joinery, cutting-svc, inventory, abstractions, modules-identity, modules-sales, procurement | 4 690 egyenként | activating (auto-restart) |
| spaceos-minio | — | ✅ **active (running)** — az egyetlen élő |

A knowledge-service legkorábbi rögzített hibája: **2026-07-13 12:30** (a journal ekkor kezdődik,
tehát valószínűleg régebb óta tart). Journal-méret: **4 GB**. Lemez: 51% (75 GB szabad) — nem szorít.

## A Nexus-rejtély megoldva

A 3458-as portot **nem a systemd-service** szolgálja ki (az crash-loopol), hanem egy
**kézzel indított árva processz**: `node dist/server.js`, user `gabor`, **uptime 2 nap 21 óra**.

Ezért viselkedett a Nexus szeszélyesen: a szolgáltatás maga végig élt a VPS-en, a
**kiesések a lokális SSH-tunnel megszakadásai voltak**. A saját tunnellel
(`ssh -N -f -L 3458:localhost:3458 joinerytech-vps`) a probléma megszűnt.

**Következmény:** ha ez az árva processz meghal, a Nexus végleg elmegy — a systemd
nem tudja felhozni, mert elavult útvonalon keresi. Ez a legsürgősebb egyedi kockázat.

## ✅ ELVÉGZETT JAVÍTÁS (2026-07-16 este, Gábor jóváhagyásával)

**Mind a 10 crash-loop leállítva**, unit-backup: `/etc/systemd/system/.backup-2026-07-16/`.
Az összes unit útvonala javítva (`/opt/spaceos/backend/` → `/opt/joinerytech/src/`).
Jogosultság: a `spaceos` service-user felvéve a `gabor` csoportba (enélkül az új útvonalat
nem olvashatta — `drwxr-x--- gabor gabor`).

**5 service ÉL, PID-egyezéssel igazolva, 0 újraindítással:**

| Service | Port | Megjegyzés |
|---|---|---|
| **spaceos-knowledge** (Nexus MCP) | 3458 | **systemd alá visszavezetve** — az árva processz leállítva, `ExecStart=/usr/bin/node dist/server.js`, `enable`-ölve. A Nexus többé nem törékeny. |
| spaceos-abstractions | 5003 | |
| spaceos-inventory | 5004 | |
| spaceos-procurement | 5006 | |
| spaceos-modules-identity | **5008** | ✅ megerősíti a mai orchestrator port-fixet (IDENTITY 5003→5008) |

## Ami maradt: 5 service, forrás-oldali okokból (NEM unit-hiba)

| Service | Ok |
|---|---|
| **spaceos-kernel** | a VPS-checkout (`develop@c1f6dd6`) **nem fordul**: CS1929 hibák a `TradeWorldEndpoints.cs`-ben, és **9 uncommitted fájl** — a VPS-csapat félbehagyott munkája. **Nem nyúltunk hozzá.** |
| **spaceos-orchestrator** | **23 uncommitted fájl** a `develop@2fd47ed`-en (a mai port-fix `fffa9be` még nincs lehúzva) — szintén aktív, félbehagyott munka. **Nem nyúltunk hozzá.** |
| **joinery, cutting, sales** | a repóban **verziókövetett** `NuGet.Config` abszolút, elavult útvonalra mutat: `LocalCutting = /opt/spaceos/backend/spaceos-modules-cutting/nupkg/`. A csomagok valójában `/opt/joinerytech/src/spaceos-modules-cutting/nupkg/` alatt vannak (Cutting.Contracts 1.0.0, Nesting.Algorithms 1.1.0). **5 modul NuGet.Configja érintett** (cutting, inventory, joinery, procurement, sales). |

### A NuGet.Config javítási javaslata (repo-szintű, Gábor döntése)

Az abszolút VPS-útvonal a repóban **lokálisan is törött** (Windows-on értelmezhetetlen).
Helyes: **relatív útvonal** — `../spaceos-modules-cutting/nupkg/` — ami VPS-en és fejlesztői
gépen egyaránt működik. Érintett: 5 külön submodule-repo + platform pin-bumpok.
VPS-lokális `sed` nem megoldás: a fájl verziókövetett, egy `git pull` visszaállítaná.

## Eredeti javasolt lépések (referencia)

1. **Azonnali, kockázatmentes:** a crash-loopok leállítása (`systemctl stop`) — nem fut belőlük semmi,
   csak CPU-t és journalt égetnek. Bármikor visszafordítható.
2. **Unit-javítás** (a fő munka): `/opt/spaceos/backend/<mod>/publish` →
   `/opt/joinerytech/src/<mod>/publish`, knowledge: WorkingDirectory + EnvironmentFile a
   `/opt/joinerytech/src/joinerytech-nexus/knowledge-service`-re, `ExecStart` a **buildelt
   `dist/server.js`-re** (ne `npx ts-node src/server.ts` — az árva processz is dist-ből fut).
3. **A knowledge-service systemd alá visszavezetése** — hogy a Nexus túléljen egy újraindítást.
4. Ahol nincs publish (kernel, cutting-svc, orchestrator): `dotnet publish` / `npm run build` kell.
5. Deploy után PID-ellenőrzés (`ss -tlnp` ↔ MainPID) — bennragadt processz csendben szolgálhat ki.

⚠️ A `/opt/spaceos` a Nexus/spaceos sziget futó rendszere is — a unit-javítás **átnyúlik a
sziget-határon**, ezért Gábor döntése kell hozzá; a JoineryTech root nem nyúlt hozzá.
