# SpaceOS — Ismert csapdák és diagnózisok

> Ez a fájl élő tapasztalatból épül. Minden VPS deploy vagy service indítás után
> frissítsd, ha új csapdát találsz.
>
> **Forrás:** `/spaceos-deploy` skill és valós deploy incidensek.

---

## 1. dotnet-ef tool verziókonfliktusd

**Tünet:**
```
The EF Core tools version '10.x.x' is newer than that of the runtime '8.x.x'.
```
vagy egyszerűen: `dotnet ef` parancs futtatása után semmi nem történik / tool not found.

**Ok:** `~/.dotnet/tools/dotnet-ef` v10-es, de a projekt .NET 8 targetű. A v10 eszköz
nem kompatibilis .NET 8 projektekkel.

**Fix — minden .NET 8 migrációt manuális SQL-lel kell alkalmazni:**
```bash
# 1. Extractáld az SQL-t a migration .cs fájlból
cat src/SpaceOS.Modules.X.Infrastructure/Persistence/Migrations/YYYYMMDD_MigrationName.cs

# 2. Futtasd psql-ben (5433 a natív PostgreSQL port, NEM 5432!)
sudo -u postgres psql -p 5433 -d <adatbázis_neve> <<'SQL'
  -- migration SQL tartalma ide
  SELECT 'migration-name OK' AS result;
SQL

# 3. Ha szükséges: rögzítsd a migration history-ban
sudo -u postgres psql -p 5433 -d <adatbázis_neve> <<SQL
INSERT INTO public."__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('YYYYMMDDHHMMSS_MigrationName', '8.0.x');
SQL
```

**Érintett service-ek:** Identity, Joinery (J-003), Sales (S-001/002/003) — mind manuális SQL-lel lett alkalmazva.

---

## 2. Üres / stale model snapshot — EF "already up to date" hamisan

**Tünet:**
```
No migrations were applied. The database is already up to date.
```
...de a táblák nem léteznek a DB-ben.

**Ok:** A `*DbContextModelSnapshot.cs` fájl üres vagy nem lett frissítve a migration generálásakor.
Az EF Core a snapshot alapján dönti el, hogy van-e pending migration — ha a snapshot nem tartalmazza
a migration-t, az EF nem látja pending-ként.

**Diagnózis:**
```bash
# Ellenőrizd a snapshot méretét
wc -l src/*/Persistence/Migrations/*ModelSnapshot.cs
# Ha < 50 sor → valószínűleg üres/stale

# Ellenőrizd, hogy a migration DLL-ben van-e
strings /tmp/publish/SpaceOS.Modules.X.Infrastructure.dll | grep "MigrationName"
# Ha megvan a DLL-ben de EF mégis "up to date" → snapshot probléma
```

**Fix:** A migration SQL-t manuálisan kell futtatni (→ lásd #1 gotcha).

---

## 3. ChangeTracker tilos OnModelCreating-ben

**Tünet:**
```
System.InvalidOperationException: An attempt was made to use the model while it was being created.
A DbContext instance cannot be used inside 'OnModelCreating' in any way that makes use of the model
that is being created.
```
Service elindul, health 500, outbox worker folyamatosan fail-el.

**Ok:** A `DbContext.OnModelCreating()` futása közben az EF Core a model-t még építi.
Minden olyan hívás, ami a model-t igényli (beleértve a `ChangeTracker` elérését), kivételt dob.

**Fix — event subscription a konstruktorba:**
```csharp
// ❌ TILOS
protected override void OnModelCreating(ModelBuilder mb)
{
    mb.ApplyConfigurationsFromAssembly(...);
    ChangeTracker.Tracked += (_, e) => { ... }; // CRASH
}

// ✅ HELYES
public sealed class SalesDbContext : DbContext
{
    public SalesDbContext(DbContextOptions<SalesDbContext> options) : base(options)
    {
        ChangeTracker.Tracked += (_, e) => { ... }; // konstruktorban OK
    }

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.ApplyConfigurationsFromAssembly(...);
        // ChangeTracker IDE NEM kerülhet
    }
}
```

---

## 4. Env kulcs ≠ Program.cs konfig kulcs

**Tünet:**
```
System.InvalidOperationException: The MetadataAddress or Authority must use HTTPS
unless disabled for development by setting RequireHttpsMetadata=false.
```
...annak ellenére, hogy az authority URL valóban HTTPS.

**Ok:** Az env fájlban lévő kulcsnév nem egyezik azzal, amit a `Program.cs` olvas.
Pl. env-ben `Jwt__Authority`, de a kód `builder.Configuration["Auth:Authority"]`-t kér.
Az ASP.NET Core nem dob kivételt, ha egy konfig kulcs `null` — az `opts.Authority = null`
esetén viszont a JWT middleware HTTPS nélkül próbál discovery-t végezni, ami crashel.

**Diagnózis:**
```bash
# Melyik kulcsot olvassa a Program.cs?
grep -n "Authority\|Jwt\|Auth\|Issuer" src/*/Program.cs

# Mit tartalmaz az env fájl?
sudo grep -i "auth\|jwt\|issuer" /etc/spaceos/<service>.env
```

**Fix:** Az env kulcsot a Program.cs-hez igazítsd. A .NET env → konfig leképzés:
`Auth__Authority` → `Auth:Authority`, `Jwt__Authority` → `Jwt:Authority`.

**Érintett:** Sales (`Jwt__Authority` → `Auth__Authority` javítás, 2026-05-28).

---

## 5. GRANT CREATE ON DATABASE — első migráció schema-létrehozáshoz

**Tünet:**
```
ERROR: permission denied for database spaceos
```
Az első migration futásakor, amikor a service megpróbálja létrehozni a saját sémáját.

**Ok:** A `CREATE SCHEMA` jog nincs alapból az app role-on. A PostgreSQL-ben a séma létrehozáshoz
`CREATE` jog kell az adatbázisra, nem csak a sémára.

**Fix — első indítás előtt:**
```bash
sudo -u postgres psql -p 5433 -d spaceos \
  -c "GRANT CREATE ON DATABASE spaceos TO spaceos_<modul>_app;"

sudo systemctl restart spaceos-modules-<modul>
```

**Mikor kell:** Minden új service első deployjakor, amelyik saját sémát hoz létre
(`CREATE SCHEMA IF NOT EXISTS spaceos_<modul>`).

---

## 6. Migration-ban létrehozott role-ok jelszó nélkül születnek

**Tünet:** Service elindul, de DB kapcsolat authentication error-ral meghiúsul,
annak ellenére, hogy az env fájlban jelszó van megadva.

**Ok:** Az EF Core migration `DO $$ BEGIN IF NOT EXISTS CREATE ROLE ... END $$` blokkban
a role-t jelszó nélkül hozza létre (csak `LOGIN NOINHERIT`). Az env fájlban lévő jelszó
nincs érvényes, mert a role-on nincs beállítva.

**Fix — migration után:**
```bash
sudo -u postgres psql -p 5433 -d spaceos <<SQL
ALTER ROLE spaceos_<modul>_app PASSWORD '<app_password>';
ALTER ROLE spaceos_<modul>_worker PASSWORD '<worker_password>';
SQL
```

**Sorrend:** Jelszó generálás → env fájl írás → migration futtatás → ALTER ROLE → service start.

---

## 7. PostgreSQL port: 5433, NEM 5432

**Tünet:** `Connection refused` a connection string-ben `Port=5432`-vel.

**Ok:** A VPS-en a PostgreSQL natív telepítéssel fut (nem Docker), és a 5433-as porton
hallgat. A 5432 üres.

**Fix:** Minden connection string-ben és psql hívásban: `-p 5433` / `Port=5433`.

```bash
# Ellenőrzés
sudo -u postgres psql -p 5433 -c "\l"  # ✅
sudo -u postgres psql -p 5432 -c "\l"  # ❌ connection refused
```

---

## 8. systemd service néveltérések

**Tünet:** `Unit spaceos-cutting.service could not be found.`

**Valós service nevek** (2026-05-28 állapot):

| Név amit gondolnál | Valós systemd neve |
|---|---|
| `spaceos-cutting` | `spaceos-cutting-svc` |
| `spaceos-sales` | `spaceos-modules-sales` |
| `spaceos-identity` | `spaceos-modules-identity` |

**Ellenőrzés:**
```bash
sudo systemctl list-units --type=service | grep spaceos
```

---

## 9. nginx dist root = már a dist/ mappa

**Tünet:** `sudo cp -r dist/. "$DIST_TARGET/"` hibát dob: "same file".

**Ok:** A joinerytech.hu nginx config `root` direktívája közvetlenül a
`/opt/spaceos/frontend/joinerytech-portal/dist` mappára mutat.
A `pnpm build` ugyanebbe a mappába ír.

**Fix:** `pnpm build` után **nincs másolás szükséges**. A dist tartalom azonnal él.
```bash
cd /opt/spaceos/frontend/joinerytech-portal
pnpm build
# kész — nginx automatikusan az új fájlokat szolgálja ki
```

---

## 10. journalctl — root exception kiemelése stacktrace-özönből

A .NET service-ek crashkor több száz sor stacktrace-t írnak. A tényleges hiba az első
`Exception` típus és üzenet — általában az első `fail:` sor után.

```bash
# Root exception megtalálása
sudo journalctl -u <service> --since "2 minutes ago" --no-pager \
  | grep -E "Exception|Error|fail:" | head -10

# Teljes log az utolsó indítástól
sudo journalctl -u <service> --since "$(sudo systemctl show <service> \
  --property=ActiveEnterTimestamp --value | cut -d' ' -f1,2)" --no-pager | head -60
```

**Pattern:** Ha a health endpoint 500-at ad, de a service `active (running)`:
1. Keresd meg az első `fail:` sort
2. Az alatta lévő sor a root exception típusa és üzenete
3. A stacktrace csak a hívási lánc — nem a hiba oka

---

## 11. Kernel repo név elgépelés — "Kerner" vs "Kernel"

**Tünet:** git pull falál, vagy a build `directory not found` hibát ad.

**Ok:** A VPS-en a Kernel repo valódi neve `/opt/spaceos/SpaceOS.Kerner/`
(**elgépelt "Kerner", nem "Kernel"**). Az üzenetek és taskbok gyakran `SpaceOS.Kernel`-re
hivatkoznak, amely nem létezik.

**Fix:**
- Source pull: `/opt/spaceos/SpaceOS.Kerner/` (elgépelés és minden)
- Deploy target: `/opt/spaceos/spaceos-kernel/publish/` (másik dir!)

---

## 12. Kernel DB Database név

**Tünet:** Migration crash, `database "spaceos_kernel" does not exist`.

**Ok:** Az összes Kernel séma és tábla egyetlen `spaceos` adatbázisban van,
nem `spaceos_kernel`-ben.

**Fix:** Connection string és migration target: `Database=spaceos` (NEM `spaceos_kernel`).

---

## 13. PM2 (Orchestrator) PATH quirk

**Tünet:** `pm2 command not found` vagy `sudo pm2 ...` nem működik.

**Ok:** A PM2 **root-ként** fut (`/root/.pm2`), de a binary nincs a rendszer PATH-ban.
A `sudo pm2` hívás az eredeti user PATH-ját használja, nem root-ét.

**Fix — explicit PATH szükséges:**
```bash
sudo env PATH=$PATH:/root/.npm-global/bin pm2 list
sudo env PATH=$PATH:/root/.npm-global/bin pm2 restart spaceos-orchestrator
```

**Process name:** `spaceos-orchestrator` (NEM `spaceos-orch`).

---

## 14. rsync nincs telepítve — cp -r + rm -rf szükséges

**Tünet:** `rsync command not found`.

**Ok:** A VPS szparc telepítés — rsync nem áll rendelkezésre.

**Fix — manuális másolás atomosztálya:**
```bash
# 1. Backup az előző verzióról
sudo cp -r /opt/spaceos/spaceos-kernel/publish \
  /opt/spaceos/spaceos-kernel/publish.bak-$(date +%s)

# 2. Új tartalom másolása temp helyről
sudo cp -r /tmp/kernel-publish/* /opt/spaceos/spaceos-kernel/publish/

# 3. Jogorvoslat
sudo chown -R spaceos:spaceos /opt/spaceos/spaceos-kernel/publish
sudo systemctl restart spaceos-kernel
```

---

## 15. psql nem standalone — postgres user szükséges

**Tünet:** `psql: command not found` vagy `psql: could not translate host name`.

**Ok:** A `psql` csak a `postgres` OS user-ben áll rendelkezésre.
Direct `psql -U postgres` nem működik.

**Fix:**
```bash
sudo -u postgres psql -p 5433 -d spaceos -c "SELECT VERSION();"
```

---

## 16. Backup konvenció — forensics helyreállítás

Az atomikus deploy failure recovery-hez:

| Típus | Path | Amikor |
|---|---|---|
| Kernel publish | `/opt/spaceos/spaceos-kernel/publish.bak-YYYYMMDD-HHMMSS` | Sikeres deploy után |
| Broken state | `/opt/spaceos/spaceos-kernel/publish.failed-TS` | Deploy hiba, forensics |
| Nginx config | `/etc/nginx/sites-available/spaceos.bak-TS` | Konfigváltás előtt |
| Keycloak env | `/opt/spaceos/keycloak/.env.bak-TS` | Szenzitív change előtt |

---

## 17. Portok — mind loopback-only, nginx reverse proxy szükséges

| Service | Port | Bindpoint | Access |
|---|---|---|---|
| Kernel | 5000 | 127.0.0.1 | nginx proxy-on át |
| Joinery module | 5002 | 127.0.0.1 | nginx proxy-on át |
| Abstractions module | 5003 | 127.0.0.1 | nginx proxy-on át |
| Orchestrator (PM2) | 3000 | 127.0.0.1 | nginx proxy-on át |
| Keycloak | 8080 | 127.0.0.1 | nginx proxy-on át |

**PostgreSQL két példány:**
- Native service: **5433** (mely a systemd service-ek csatlakoznak)
- Docker (pgAdmin): 5432

**Tűzfal:** Csak 80/443 nyitva külső felé — minden belső kommunikáció loopback-on.

---

## 18. Claude CLI session — prompt-nál elakad, dupla Enter kell

**Tünet:** A tmux session-ben a Claude CLI elindul, de a `> ` prompt-nál nem reagál a beküldött üzenetre. Az üzenet a text mezőben "ragad".

**Ok:** A `tmux send-keys` parancs csak beírja a szöveget, de nem küldi el. A Claude CLI interaktív prompt-ja nem az Enter billentyűre, hanem a sorbevitel befejezésére vár.

**Fix — dupla Enter pattern:**
```bash
tmux -S /tmp/spaceos.tmux send-keys -t <session> "Üzenet szövege"
sleep 0.5
tmux -S /tmp/spaceos.tmux send-keys -t <session> Enter
sleep 1
tmux -S /tmp/spaceos.tmux send-keys -t <session> Enter
```

**Érintett scriptek:** watch-stuck.sh, watch-inbox.sh, telegram-bot.sh, telegram-datahaven-bot.sh

---

## 19. FE session rossz working directory — /home/gabor helyett /opt/spaceos/spaceos-doorstar-portal

**Tünet:** Az FE terminál session-t elindítja a watch-inbox.sh, de a `claude --model sonnet` a `/home/gabor` mappában indul, nem a projekt mappában. A Task/Explore agent nem találja a fájlokat.

**Ok:** A tmux session létrehozásakor nem lett megadva a `-c` (start-directory) opció, vagy a session már létezett korábbról rossz directory-vel.

**Diagnózis:**
```bash
tmux -S /tmp/spaceos.tmux display-message -t spaceos-fe -p "#{pane_current_path}"
```

**Fix — session létrehozás helyes directory-vel:**
```bash
tmux -S /tmp/spaceos.tmux new-session -d -s spaceos-fe \
  -c /opt/spaceos/spaceos-doorstar-portal
```

**Ha már létezik a session:** Kill és újra létrehozás, vagy explicit `cd` küldése:
```bash
tmux -S /tmp/spaceos.tmux send-keys -t spaceos-fe \
  "cd /opt/spaceos/spaceos-doorstar-portal" Enter
```

---

## 20. Claude CLI "Noodling" / "Thinking" állapot — nem stuck, ne nudge-old

**Tünet:** A session capture-pane output-ja `Noodling…` vagy `Thinking…` sort mutat, a session nem reagál az üzenetekre.

**Ok:** A Claude CLI gondolkodik (reasoning mode). Ez normális működés, különösen komplex feladatoknál. A "Noodling" 1-5 percig is tarthat.

**Diagnózis:**
```bash
tmux -S /tmp/spaceos.tmux capture-pane -t <session> -p | grep -E "Noodling|Thinking"
```

**Fix:** NE küldj nudge-ot. Várd meg amíg a gondolkodás befejeződik. A watch-stuck.sh-ban exemptáld a "Noodling" és "Thinking" pattern-eket.

---

## 21. Session "bypass permissions" prompt — Enter szükséges

**Tünet:** A session output-ja `⏵⏵ bypass permissions on (shift+tab to cycle)` sort mutat, de a session nem dolgozik.

**Ok:** A Claude CLI választásra vár a permission policy-val kapcsolatban. A default "bypass" általában megfelelő, de explicit Enter szükséges a folytatáshoz.

**Fix:**
```bash
tmux -S /tmp/spaceos.tmux send-keys -t <session> Enter
```

**watch-stuck.sh integráció:** Ha a pane tartalmazza a "shift+tab to cycle" pattern-t, küldj Enter-t.

---

## 22. WatchMonitor testMode bekapcsolva maradt — inbox flooding

**Tünet:** Monitor terminál inbox-a 100+ scheduled-health-check fájlt tartalmaz, session stuck.

```bash
$ ls terminals/monitor/inbox/ | wc -l
469
```

**Ok:** `watchMonitor.ts` fájlban `testMode = true` maradt production-ben:
```typescript
const testMode = true; // ← BUG: 5× több health check!
```

**Fix:**
```typescript
const testMode = false; // Production mode
```

**Cleanup:**
```bash
mkdir -p terminals/monitor/archive/health-checks
mv terminals/monitor/inbox/*scheduled-health-check*.md terminals/monitor/archive/health-checks/
```

**Referencia:** `docs/knowledge/debugging/WATCHMONITOR_TESTMODE_BUG_2026-07-10.md`

---

## 23. Knowledge-service .js import extension — CommonJS inkompatibilitás

**Tünet:** Knowledge service crash loop, MCP tools nem működnek.

```bash
Error: Cannot find module './conversationManager.js'
```

**Ok:** TypeScript fájlban `.js` extension az importban:
```typescript
import { ... } from './conversationManager.js'; // ← HIBÁS
```

CommonJS + ts-node nem oldja fel a `.js` kiterjesztést `.ts` fájlokra.

**Fix:**
```typescript
import { ... } from './conversationManager'; // ← extension nélkül
```

**Rebuild szükséges:**
```bash
cd spaceos-nexus/knowledge-service && npm run build
sudo systemctl restart spaceos-knowledge
```

**Referencia:** `docs/knowledge/debugging/KNOWLEDGE_SERVICE_IMPORT_BUG_2026-07-10.md`

---

## 24. MessageRegistry.db üres (0 byte) — DONE pipeline megáll

**Tünet:** DONE outbox-ok nem kerülnek feldolgozásra, pipeline.log üres.

```bash
$ ls -la data/message-registry.db
-rw-r----- 1 gabor gabor 0 Jul  8 13:29 message-registry.db

$ sqlite3 data/message-registry.db "SELECT * FROM messages;"
Error: no such table: messages
```

**Ok:** Knowledge service crash → `initSchema()` nem futott le → üres DB fájl maradt.

**Fix:**
```bash
rm spaceos-nexus/knowledge-service/data/message-registry.db
sudo systemctl restart spaceos-knowledge
# Service újra inicializálja a DB-t
```

**Ellenőrzés:**
```bash
sqlite3 data/message_registry.db "SELECT COUNT(*) FROM messages;"
# Várt: >0 (backfill megtörtént)
```

**Referencia:** `docs/knowledge/debugging/KNOWLEDGE_SERVICE_IMPORT_BUG_2026-07-10.md`
