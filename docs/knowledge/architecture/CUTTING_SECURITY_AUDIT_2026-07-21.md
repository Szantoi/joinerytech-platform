# Cutting biztonsági audit — 2026-07-21

- **Állapot:** második kör + containment addendum 2026-07-22; a Cutting edge P0
  lezárva, a trusted-proxy/tenant javítás lokálisan review-zott, a külön Nexus P0 nyitott
- **Hatókör:** Cutting API, tenant/auth határ, internal API, publikus API, adapterek,
  fájl- és processzhatár, email, NuGet ellátási lánc
- **Kapcsolódó task:**
  [`STAB-CUTTING-SECURITY-HARDENING`](../../tasks/EPIC-PLATFORM-STABILITY-2026Q3/STAB-CUTTING-SECURITY-HARDENING.md)
- **Alapszerződés:**
  [Cutting auth- és tenant-kontraktus](CUTTING_AUTH_TENANCY_CONTRACT_2026-07-21.md)

## 1. Vezetői összefoglaló

Az audit hat közvetlenül javítható biztonsági hibát és hét további aktiválási vagy
hardening kaput azonosított. A legfontosabb bizonyított hiba az internal API volt:
az `X-SpaceOS-Internal: true` publikus, kitalálható értéke szolgáltatás-hitelesítésnek
számított, ezért bárki tetszőleges tenant nevében rendelést ingestálhatott.

A jelen munkafa ezt konfigurált shared secretre, konstans idejű összehasonlításra és
fail-closed működésre cseréli. Ugyanebben a körben bezárult az adapter
`adapterName` path traversal, a SignalR claim-prioritási eltérés, a globális publikus
rate limiter, a production `changeme` adatbázis-fallback és a sérülékeny
MailKit/MimeKit runtime lánc.

Az éles állapot külön ellenőrzése kimutatta, hogy a VPS még a régi `bf9bd4e`
Cutting commitot futtatja, miközben az Nginx a teljes `/cutting/` namespace-t
proxyzza. Emiatt az internal `true` fejléc hiba jelenleg kívülről elérhető útvonalon
él. Az első lépés az edge `/cutting/internal/` tiltása, utána jöhet a review-zott
backend és a rotált caller rollout.

Ez volt az auditkori stop-döntés. **2026-07-22 containment addendum:** a külön
`STAB-CUTTING-EDGE-PROXY-INCIDENT` végrehajtása során az Nginx internal deny és a
review-zott `4341390` backend rollout megtörtént; külső internal `404`, health `200`,
loopback legacy-header `403`, listener PID = service MainPID bizonyított. Az azonnali
edge P0 ezért lezárt. A később elkészült trusted-proxy/tenant-host szelet review-zott,
de még nincs deployolva; ehhez továbbra is éles proxy/tenant konfiguráció, Nginx
header-szerződés és staging smoke kell.

## 2. Bizonyított leletek

| ID | Súlyosság | Lelet | Hatás | Jelen állapot |
|---|---:|---|---|---|
| SEC-CUT-01 | magas | Az internal endpointok a literális `true` fejlécet fogadták el | anonim, kereszt-tenant order ingest; allowlist esetén tesztadat-törlés | javítva a munkafában |
| SEC-CUT-02 | magas | `adapterName` ellenőrzés nélkül lett fájlútvonalrész | tenant gyökérből kilépő írás/olvasás, későbbi CLI workdir-eltérítés | javítva a munkafában |
| SEC-CUT-03 | közepes | MailKit 4.9.0 és MimeKit 4.9.0 sérülékeny | STARTTLS response injection/SASL downgrade és email injection kockázat | 4.16.0-ra frissítve |
| SEC-CUT-04 | közepes | SignalR a legacy `tenant_id` claimet a canonical `tid` elé helyezte | eltérő claim esetén hibás tenant-csoport, izolációs szerződés sérülése | javítva a munkafában |
| SEC-CUT-05 | közepes | A publikus limiter globális volt, a legacy publikus route-ok pedig limit nélküliek | egy kliens mindenki kvótáját kimeríthette; spam/DoS | per-IP partíció + minden publikus quote route |
| SEC-CUT-06 | magas | Production/staging DB config hiányában `Password=changeme` fallback | ismert hitelesítő adat elfogadása vagy téves adatbázis-csatlakozás | production-like fail-fast |

### 2.1 Internal szolgáltatás-hitelesítés

Új szerződés:

```text
X-SpaceOS-Internal: <rotált shared secret>
config: SpaceOS:InternalSecret
env fallback: SPACEOS_INTERNAL_SECRET
```

Szabályok:

- hiányzó szerver-secret → `503`, minden internal hívás elutasítva;
- hiányzó, többszörös vagy hibás kliens-secret → `403`;
- összehasonlítás SHA-256 után `CryptographicOperations.FixedTimeEquals`;
- a secret nem kerül logba vagy válaszba;
- a delete endpoint `confirm=true` és `TEST_TENANT_ALLOWLIST` védelme megmarad.

Ez shared-secret átmeneti minta. A hosszú távú platformirány egységes,
rotálható service identity (mTLS vagy rövid élettartamú workload token), nem
modulonként eltérő header-konvenció.

### 2.2 Adapter fájlhatár

Az adapter neve most legfeljebb 64 karakter, betűvel vagy számmal kezdődik, és
csak ASCII betűt, számot, `_` vagy `-` jelet tartalmazhat. A canonicalizált adapter
útvonalnak a canonicalizált tenant gyökér alatt kell maradnia. Tiltott példa:
`../other-tenant`, `..\\other-tenant`, abszolút út, pont-szegmens és szóköz.

### 2.3 Runtime csomaglánc

A `dotnet list SpaceOS.Modules.Cutting.sln package --vulnerable
--include-transitive` audit az upgrade után a runtime projektekre tiszta.

Hivatalos advisoryk:

- [MailKit STARTTLS response injection — GHSA-9j88-vvj5-vhgr](https://github.com/advisories/GHSA-9j88-vvj5-vhgr): javított verzió `4.16.0`;
- [MimeKit CRLF injection — GHSA-g7hc-96xr-gvvx](https://github.com/advisories/GHSA-g7hc-96xr-gvvx): javított verzió `4.15.1`; a MailKit 4.16.0 javított MimeKitet hoz.

## 3. Nyitott security kapuk

### P0 — aktiválás/deploy előtt kötelező

1. **Internal caller rollout és secret rotáció.** A régi `true` szerződés több
   dokumentumban és más modulokban is él. A Cutting hívóit leltározni, a secretet
   secret store-ból injektálni, rotálni és staging smoke-kal bizonyítani kell.
2. **Quote email ownership + outbox.** Approve/reject esetén a címzett még
   kliensvezérelt, a DB commit utáni SMTP szinkron és nem idempotens. Az aggregate
   címzettje + transactional outbox kötelező.
3. **Email HTML/context encoding.** A quote number, reason, email és URL mezők nyers
   HTML interpolációban vannak. `HtmlEncoder`, kizárólag validált HTTPS URL és
   template-injection regresszió szükséges.
4. **CLI adapter aktiválási kapu.** A payload `executable` mezője tetszőleges programot
   jelölhet ki. Jelenleg a CutRite converter a szükséges metadata hiánya miatt nem
   ad működő production hívási láncot; engedélyezés előtt kizárólag config-owned,
   abszolút, allowlistelt executable használható, tenant inputból soha.
5. **REST adapter SSRF.** A védelem csak literális IP-címet ellenőriz. DNS-név privát,
   loopback vagy metadata IP-re oldása, illetve DNS rebinding megkerüli ezt. A
   resolved címeket minden csatlakozásnál ellenőrző handler és redirect-tiltás kell.
6. **RLS bizonyíték.** A klasszikus Cutting repository több olvasása explicit tenant
   predikátum nélkül a PostgreSQL `FORCE RLS`-re támaszkodik. A futó
   `STAB-RLS-PROOF` nem-superuser bizonyítéka és később EF query-filteres második
   réteg szükséges; ezt a mostani párhuzamos RLS munkát megkerülve nem szabad átírni.

### P1 — release-kapu erősítése

1. **Trusted proxy + limiter kulcs.** A per-IP limiter csak akkor lát valódi kliens
   IP-t reverse proxy mögött, ha a platform trusted proxy allowlisttel kezeli a
   forwarded headereket. Tetszőleges `X-Forwarded-For` elfogadása tilos.
2. **Tracking token életciklus.** A 48 bites token helyett legalább 128 bites,
   lejáró, adatbázisban hash-elve tárolt capability token javasolt; accept után
   egyszer használható/állapotfüggő maradjon.
3. **Tesztellátási lánc.** Runtime projekt már tiszta, de a tesztprojektekben maradt:
   - xUnit 2.5.3 → NETStandard.Library 1.6.1 → `System.Net.Http 4.3.0` és
     `System.Text.RegularExpressions 4.3.0`;
   - EF Core SQLite 8.0.11 → `SQLitePCLRaw.lib.e_sqlite3 2.1.6`.
   Frissített tesztstack, lock/restore, teljes suite és új vulnerability-audit kell.
4. **Belső auth platformosítása.** Cutting, Joinery, Inventory, Procurement és Kernel
   eltérő header/Bearer/loopback mintáit közös hosting security csomagba kell emelni.

## 4. Második kör — attack-path és aktiválási audit (2026-07-22)

### 4.1 Prioritási és kitettségi mátrix

| ID | Súlyosság | Kitettség | Lelet | Kijelölt task |
|---|---:|---|---|---|
| SEC-CUT-07 | kritikus | **aktív production** | A régi `true` internal auth az általános Nginx `/cutting/` proxy mögött fut | `STAB-CUTTING-EDGE-PROXY-INCIDENT` |
| SEC-CUT-08 | magas | **aktív production** | A legacy quote tenantját kliens által küldhető `X-Original-Host` választja; az Nginx nem írja felül és nem törli | proxy hardening + tenant resolver |
| SEC-CUT-09 | magas | aktív auth út | A `ManufacturerOnly` csak tenant-típust kér; quote/adapter adminhoz nincs finom jogosultság, adapter actor `sub` hiányában tenant ID-ra esik vissza | security hardening |
| SEC-CUT-10 | magas | publikus action élesítése előtt | 48 bites, plaintext, lejárat nélküli token ugyanazzal a scope-pal trackel és acceptál | `STAB-CUTTING-PUBLIC-CAPABILITY` |
| SEC-CUT-11 | magas | aktív email/admin út | Approve/reject recipient kliensvezérelt; nyers HTML mezők, PII-logok és commit utáni szinkron SMTP | notification outbox + email hardening |
| SEC-CUT-12 | magas | **latent activation** | CLI executable payload metadata; REST DNS/redirect/IPv6 SSRF védelem hiányos | `STAB-CUTTING-ADAPTER-ACTIVATION-GATE` |
| SEC-CUT-13 | közepes | aktív public create | A modern B2C quote tenant/space-owner nélküli PII rekordot ír; két párhuzamos quote modell sodródik | `STAB-CUTTING-PUBLIC-QUOTE-OWNERSHIP` |
| SEC-CUT-14 | közepes | aktív input út | Public validator és DB maxhossz eltér, attachment count nincs limitálva, az elfogadott attachmentet a handler eldobja | public contract gate |
| SEC-CUT-15 | közepes | repo/supply-chain | A Cutting `publish-fix/` alatt 517 követett build artifact, kb. 51,54 MiB, PDB és stale dependency snapshot él | release reproducibility |
| SEC-PLAT-01 | magas | platform auth drift | Kernel cross-module dispatcher továbbra is `X-SpaceOS-Internal: true` értéket küld és production HMAC kulcs hiányában `dev-hmac-key` fallbacket használ; receiver HMAC-verifikáció nem található | platform internal identity ADR |

### 4.2 Éles edge bizonyíték

Read-only VPS ellenőrzés eredménye:

- Cutting deployment commit: `bf9bd4ee9161d451adb5bc861ae1555e39c5d4c1`;
- service: `spaceos-cutting-svc`, active/running;
- listener: `127.0.0.1:5005`, PID megegyezik a systemd `MainPID` értékével;
- Nginx: `location /cutting/ { proxy_pass http://cutting_backend/; ... }`;
- nincs `location ^~ /cutting/internal/` vagy azzal egyenértékű deny;
- a proxy `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto` fejléceket
  beállítja, de a kliens `X-Original-Host` fejlécét nem törli;
- a deploy env-ben az internal secret kulcsnevek jelen vannak, értékük nem került
  kiolvasásra;
- mutáló támadáspróba nem történt.

Az azonnali, backend deploytól független containment részletes terve:
[`STAB-CUTTING-EDGE-PROXY-INCIDENT`](../../tasks/EPIC-PLATFORM-STABILITY-2026Q3/archive/STAB-CUTTING-EDGE-PROXY-INCIDENT.md).

### 4.3 Host/tenant és limiter trust boundary

Az endpoint sorrendje jelenleg:

```text
X-Original-Host (tetszőleges kliens header) ?? Request.Host
  → első DNS label
  → Tenants.Subdomain SQL lookup
  → public quote létrehozás a kiválasztott tenantban
```

Az Nginx alapértelmezésben továbbítja az ismeretlen request headereket, ezért egy
külső kliens más tenant subdomainjét állíthatja be. A resolver ezen felül nem
validálja a regisztrált root domaint; csak az első pont előtti címkét használja.

A worktree per-IP limitere `RemoteIpAddress` alapján dolgozik, de a Cutting hostban
nincs `UseForwardedHeaders`. Reverse proxy mögött ezért minden ügyfél azonos
loopback/proxy partitionbe kerülhet. A javítás feltétele:

- `X-Original-Host` teljes eltávolítása az authority útból;
- `Request.Host` vagy framework `X-Forwarded-Host` feldolgozás kizárólag
  konfigurált `KnownProxy`/`KnownNetwork` mellett;
- host canonicalizálás és exact domain/host registry;
- forwarded middleware az auth/rate limiter előtt;
- külön create/track/accept limiter budget.

### 4.4 Publikus capability és digitális elfogadás

A jelenlegi tracking token 6 random byte (48 bit), plaintext unique indexszel,
expiry és hash nélkül. A read és accept ugyanazt a tokent használja. Ismeretlen
token esetén a handler a nyers beküldött értéket hibaüzenetben visszatükrözi.

Pozitív kontroll: az accept csak `Quoted` állapotból fut, az aggregate `Version`
optimista concurrency token, és az order+quote egy `SaveChanges` tranzakcióba kerül.
Nyitott hiba: párhuzamos accept concurrency exceptionje várhatóan generikus `500`,
nem determinisztikus replay eredmény.

A SpaceOS kézfogás/digitális szerződés irány miatt a puszta bearer link nem nevezhető
önmagában jogilag erős aláírásnak. Az action capabilityt külön scope, expiry,
one-time state, quote+terms snapshot hash és append-only acceptance evidence kell
kiegészítse. Részletes task:
[`STAB-CUTTING-PUBLIC-CAPABILITY`](../../tasks/EPIC-PLATFORM-STABILITY-2026Q3/STAB-CUTTING-PUBLIC-CAPABILITY.md).

### 4.5 Email, PII és public input

- A publikus endpoint, az `EmailService` és a stub `QuoteNotificationService`
  teljes email címet logol; a rejection reason is logba kerül.
- A HTML template nyersen interpolál quote number, customer email, reason,
  currency és URL mezőket.
- Approve/reject bodyban a hitelesített tenant user tetszőleges `CustomerEmail`
  címet adhat, így a modul tenanton belüli mail relay/phishing eszközzé válhat.
- A modern public quote rekordnak nincs `TenantId`/`SpaceId` tulajdonosa, így a
  PII tenant-access, törlés és retention szerződése nem határozható meg.
- A public validator telefont 50 karakterig, edge/surface mezőt 100 karakterig
  enged, a DB rendre 20/50 karakterre korlátoz; validnak jelzett input `500`-at
  okozhat.
- Attachmentenként van méretellenőrzés, darabszám-limit nincs, a handler pedig az
  elfogadott attachment adatot nem perzisztálja és nem jelzi az eldobást.

A notification ownership/outbox és HTML encoding már külön taskot kapott. A public
quote két modelljének owner-aware konszolidációja:
[`STAB-CUTTING-PUBLIC-QUOTE-OWNERSHIP`](../../tasks/EPIC-PLATFORM-STABILITY-2026Q3/STAB-CUTTING-PUBLIC-QUOTE-OWNERSHIP.md).

### 4.6 Adapter activation trap

Az adapter konfiguráció olyan transportkombinációkat is enged, amelyeket a runtime
nem használ. A resolver csak az adapternevet olvassa; a DI OptiCut→file és
CutRite→CLI kötése fix. A converterek nem adják át a transport által elvárt
tenant/adapter metadata mezőket, ezért a veszélyes ágak jelenleg még a processz vagy
hálózati hívás előtt elbuknak.

Ez nem felmentés, hanem aktiválási csapda: ha valaki egyszerűen „beköti” a tenant
`ConfigJson` értékeit, a payload `executable` RCE-vé, a DNS-t nem ellenőrző REST
transport SSRF-fé válhat. Az IPv6 `::1`, `fc00::/7`, több IPv4 special-use tartomány,
redirect és DNS rebinding jelenleg nincs blokkolva. Részletes task:
[`STAB-CUTTING-ADAPTER-ACTIVATION-GATE`](../../tasks/EPIC-PLATFORM-STABILITY-2026Q3/STAB-CUTTING-ADAPTER-ACTIVATION-GATE.md).

### 4.7 Platform internal identity drift

Az exact `/internal/ingest-order` production hívóját a forrásfa-keresés nem találta.
A Kernel általános `CrossModuleOutboxDispatcher` ugyanakkor továbbra is literális
`true` internal fejlécet küld minden subscription endpointnak. Emellett:

- HMAC config hiányában `dev-hmac-key` fallback van;
- a repóban `X-SpaceOS-Hmac` receiver-verifikáció nem található;
- az inbox endpoint DB-configból jön, de URL security policy nincs a domainben.

Ezért a Cutting rollout előtt caller-leltár kell, hosszabb távon pedig egységes
workload identity + tenant delegation, audience, replay és destination registry.

### 4.8 Követett build artifact

A `spaceos-modules-cutting/publish-fix/` 517 követett fájlt és kb. 51,54 MiB build
kimenetet tartalmaz, köztük DLL-eket, PDB-ket és deps snapshotokat. Ez:

- megkerülheti a source reviewt, ha valaki artifactként használja;
- stale/vulnerable dependencyt tarthat a repóban a forrásfrissítés után;
- PDB-ben környezeti/build információt őrizhet;
- rontja a reprodukálhatóságot és a secret-scant.

A tipből való eltávolítás, ignore-szabály, tiszta CI publish és SBOM/provenance kapu
szükséges. History rewrite csak külön koordinációval indokolt.

## 5. Bizonyíték

- célzott internal + storage regresszió: **36/36 zöld**;
- SignalR tenant regresszió: **3/3 zöld**;
- Cutting API clean build: **0 warning, 0 error**;
- runtime NuGet vulnerability audit: **0 találat**;
- tesztprojekt advisoryk: három tranzitív, dokumentált találat;
- forrásfa literal-secret mintakeresés: nincs találat; ez nem helyettesít teljes
  secret-scannert és git-történet auditot;
- teljes Cutting suite: **1069/1069 zöld**, 0 skipped;
- teljes solution clean build: **0 warning, 0 error**;
- független reviewer: még kötelező kapu.

## 6. Review ellenőrzőlista

- [ ] a `true` fejléc sem delete, sem ingest esetén nem hitelesít;
- [ ] hiányzó szerver-secret fail-closed;
- [ ] secret nem logolódik és konstans idejű összehasonlítást kap;
- [ ] minden adapter path API ugyanazt az adapter-name validációt használja;
- [ ] `tid` elsődleges; hibás `tid` mellett nincs legacy fallback SignalR-ban sem;
- [ ] publikus modern és legacy quote route egyaránt limiter alatt van;
- [ ] production/staging nem indul DB connection string nélkül;
- [ ] runtime dependency audit tiszta;
- [ ] internal hívók és deployment secret rollout dokumentált;
- [ ] maker és reviewer külön agent/személy.

Második kör kiegészítése:

- [ ] az edge nem proxyzza a Cutting internal namespace-t;
- [ ] `X-Original-Host` nem authority, idegen root domain elutasított;
- [ ] trusted forwarded headers a limiter előtt, untrusted spoof hatástalan;
- [ ] adapter/quote adminhoz explicit permission és kötelező `sub` tartozik;
- [ ] public capability scope/expiry/hash/replay és acceptance evidence bizonyított;
- [ ] email recipient aggregate-owned, HTML/URL encoded, PII log redaktált;
- [ ] külső adapter csak teljes activation conformance után enabled;
- [ ] követett publish artifact nincs, CI artifact forrásból reprodukálható.
