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

## Javasolt lépések (root → Gábor döntése)

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
