# Cutting biztonsági audit — 2026-07-21

- **Állapot:** javítások a munkafában, független security review és deploy-rollout szükséges
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

Deploy **nem engedélyezett**, amíg a hívó szolgáltatások ugyanazt a rotált
`SPACEOS_INTERNAL_SECRET` értéket nem kapják meg, és független review nem igazolja a
változást.

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

## 4. Bizonyíték

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

## 5. Review ellenőrzőlista

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
