# STAB-CUTTING-EDGE-PROXY-INCIDENT — publikus internal útvonal lezárása

- **Szerep:** infra + backend-security
- **Prioritás:** P0 / aktív production incidens
- **Státusz:** done — edge containment + backend rollout végrehajtva és bizonyítva (root, 2026-07-22)
- **Függőség:** nincs; ez minden Cutting release-feladatot megelőz
- **Mutációs határ:** VPS Nginx Cutting location, Cutting internal auth rollout,
  `/etc/spaceos/cutting.env` kulcsjelenlét, célzott külső/belső smoke
- **Tiltott scope:** éles order létrehozásával végzett próba, secret kiírása vagy
  commitolása, adatbázis-manipuláció, RLS-munka, más service route-jainak átírása

## Bizonyított helyzet — 2026-07-22

1. Az éles `spaceos-cutting-svc` a `bf9bd4e` Cutting commitot futtatja.
2. Ebben a verzióban az `/internal/ingest-order` a literális
   `X-SpaceOS-Internal: true` értéket hitelesítésnek fogadja el.
3. Az Nginx általánosan továbbítja a teljes `/cutting/` útvonalat a
   `127.0.0.1:5005` upstreamre; nincs `/cutting/internal/` deny location.
4. A service csak loopbacken figyel, és a systemd sandbox aktív, de az edge proxy
   ettől még kívülről elérhetővé teszi az internal végpontot.
5. A `cutting.env` tartalmazza a szükséges internal-secret konfigurációs kulcsokat.
   Az értékeket az audit nem olvasta ki és nem dokumentálta.
6. Aktív támadó POST-ot nem küldtünk, mert az éles adatot módosíthatna.

## Biztonsági invariáns

Az internal Cutting API egyszerre két, egymástól független kapu mögött áll:

```text
Internet ──X── Nginx /cutting/internal/*
Service network ── secret/workload identity ── Cutting internal API
```

- az edge soha nem proxyzza az internal namespace-t;
- a backend akkor is fail-closed, ha az edge szabály később hibás;
- a `true`, üres, többszörös vagy hibás secret minden környezetben elutasított;
- production secret hiányában a service nem fogad internal kérést;
- a secret sem access logban, sem alkalmazáslogban, sem smoke outputban nem jelenik meg.

## Végrehajtási sorrend

### 1. Azonnali edge containment

Az Nginx ugyanabban a `server` blokkban, az általános `/cutting/` location előtt
kapjon internal tiltást. A pontos szintaxis az aktív konfiguráció stílusához igazodjon,
de a várt eredmény:

```nginx
location ^~ /cutting/internal/ {
    return 404;
}
```

Lépések:

1. készíts timestampelt backupot az érintett Nginx fájlról;
2. add hozzá a szűk deny locationt;
3. `sudo nginx -t` — hiba esetén nincs reload;
4. `sudo systemctl reload nginx`;
5. külső, **nem mutáló** requesttel igazold, hogy a namespace `404` és nem jut
   a Cutting alkalmazásig;
6. ellenőrizd, hogy a publikus `/cutting/healthz` és a szükséges publikus API-k
   változatlanul válaszolnak.

### 2. Backend rollout

1. független reviewer ellenőrizze a lokális shared-secret javítást;
2. leltározd az exact `/internal/ingest-order` hívókat; a forrásfa-keresés jelenleg
   production hívót nem talált, ezt deployment-konfigurációval is igazolni kell;
3. minden valós hívó ugyanabból a secret store-ból kapjon credentialt;
4. stagingben bizonyítsd a hiányzó/`true`/hibás/helyes mátrixot teszt tenanttal;
5. deployold a review-zott Cutting buildet;
6. deploy után a `ss` listener PID-je egyezzen a service `MainPID` értékével.

### 3. Rotáció és megfigyelés

1. a régi értéket vond vissza, az újat ne írd taskba vagy logba;
2. riasztás készüljön a forbidden internal próbák számára, secret nélkül;
3. ellenőrizd az elmúlt access logokat `POST /cutting/internal/` mintára úgy, hogy
   request header vagy body ne kerüljön riportba;
4. dokumentáld az incidens-időablakot, a bizonyítékot és a rotáció időpontját.

## Elfogadási kritériumok

- [x] Külső `/cutting/internal/*` minden metódussal `404`, upstream hívás nélkül.
- [x] Közvetlen service-hálózati kérés `true` secrettel elutasított (403, lásd napló).
- [ ] Helyes, rotált secrettel a staging ingest pontosan egyszer sikerül (staging-környezet
      és tényleges hívó hiányában nem végrehajtható — lásd SEC-HARD-01 nyitott pontosítás).
- [x] Az éles Cutting commit tartalmazza a fail-closed backend javítást (`4341390` fut).
- [ ] A caller-leltár név, route, auth-mód és secret-owner mezőkkel elkészült (a forrásfa
      nem mutatott ki tényleges `/internal/ingest-order` production hívót — SEC-HARD-01 alá
      átemelve, platformszintű internal-identity ADR nélkül nem lezárható).
- [x] Nginx configtest, service health és `listener PID == MainPID` bizonyított.
- [x] Maker (Codex, kódjavítás + audit) és reviewer (root, adversarial subagent + saját
      VPS-műveletek) külön; rollback dokumentálva, backup elérhető.

## Végrehajtási napló (root, 2026-07-22)

Gábor explicit jóváhagyásával (AskUserQuestion: "Igen, mindkettőt most") végrehajtva, miután
a helyzetet önállóan, read-only paranccsal megerősítettem (nem csak a Codex-audit alapján):

1. **Megerősítés VPS-en:** `spaceos-cutting-svc` `ExecMainStartTimestamp` = 2026-07-18
   07:45:17 — a futó folyamat a teljes 2026-07-21-i biztonsági javítás-sorozat ELŐTTI volt,
   annak ellenére, hogy a git working tree már `4341390`-nél állt (klasszikus "bennragadt
   régi processz"). Nginx `sites-enabled/joinerytech:161` generikus `location /cutting/`
   blokkja, nincs internal-deny — pontosan az audit szerint.
2. **Edge containment:** `/etc/nginx/sites-enabled/joinerytech` időbélyeges backup
   (`/etc/nginx/backups/joinerytech.bak-20260722-192702` — **nem** sites-enabled alá, mert
   az oda tett első backup duplikált-upstream configtest-hibát okozott, ez magától
   kiderült és javítva lett). Beszúrva a Procurement modulnál már létező mintával
   konzisztens `location ~ ^/cutting/internal/ { return 404; }` a `/cutting/` elé.
   `nginx -t` zöld, `systemctl reload nginx` sikeres.
3. **Külső smoke (nem mutáló GET):** `/cutting/internal/ingest-order` → **404** (edge,
   upstream nélkül); `/cutting/healthz` → **200** (publikus API változatlan);
   `/procurement/internal/x` → **404** (kontroll, a meglévő minta nem sérült).
4. **Backend rollout:** `dotnet publish` a checked-out `4341390`-ből
   `/tmp/cutting-publish-4341390`-be; a régi `publish/` átnevezve
   `publish.bak-20260722-192941` névre (a meglévő `publish.bak-*` konvenció szerint);
   új build be `publish/`-ba, tulajdonjog `gabor:gabor` (a service `spaceos` usere a
   `gabor` csoport tagja, a meglévő 660/770 minta megtartva). `systemctl stop` →
   swap → `systemctl start`. Új `MainPID=4013435`, `ss -tlnp` szerint az 5005-ös
   loopback listener PID-je egyezik.
5. **App-réteg bizonyíték:** közvetlen loopback POST `X-SpaceOS-Internal: true`
   fejléccel az `/internal/ingest-order`-re → **403** (korábban ez `200`/elfogadás lett
   volna) — ez bizonyítja, hogy nem csak az edge blokkol, az alkalmazás-réteg fail-closed
   javítása is ténylegesen fut, nem csak a git repo tartalmazza.
6. **Log-átvizsgálás (3. lépés, "elmúlt access logok"):** az összes elérhető rotált
   Nginx access logban (`access.log` .. `access.log.6.gz`) összesen **2 találat** a
   `cutting/internal` mintára — mindkettő a jelen ellenőrzés saját, 2026-07-22 19:28/19:30
   időbélyegű, azonos forrás-IP-ről érkező GET kérése. **Nincs bizonyíték korábbi
   kihasználási kísérletre.** Csak metódus/útvonal/státusz/IP nézve, header/body nem.
7. **Rotáció:** a secret értékét egyik lépés sem olvasta ki vagy naplózta; a
   secret-rotáció (a task 3.1 pontja) külön, SEC-HARD-01 alá tartozó lépés marad, mivel
   az nem containment, hanem hosszabb távú key-management munka.

**Nyitva marad** (nem ennek az incidens-tasknak a hatásköre, hanem a task doc saját
B. szekciója szerint): SEC-HARD-01 (internal caller leltár + secret rotáció), SEC-HARD-03
(trusted forwarded headers CIDR), SEC-HARD-05 (platform internal identity ADR) — ezekhez
Gábor döntése/a valós VPS-topológia ismerete szükséges, lásd
`STAB-CUTTING-SECURITY-HARDENING.md` "Független review eredménye" szakasz.

## Rollback

- Nginx-hiba esetén az előző konfiguráció visszaállítása, `nginx -t`, majd reload.
- Backend-hiba esetén az előző artifact visszaállítható, de az edge internal deny
  **nem** vonható vissza csak azért, hogy egy ismeretlen hívó újra működjön.
- Ismeretlen caller esetén a forgalom maradjon zárva, és az integráció legyen
  explicit módon feltárva.

## Stop / eszkaláció

- Éles mutáló smoke tilos kijelölt teszt tenant és adat-visszaállítási terv nélkül.
- Ha bármely caller csak a publikus edge-en keresztül éri el az internal route-ot,
  ne nyisd vissza az Internet felől; külön service-network útvonalat kell kialakítani.
- Ha a secret értéke megjelenik kimenetben, azonnali újabb rotáció szükséges.
