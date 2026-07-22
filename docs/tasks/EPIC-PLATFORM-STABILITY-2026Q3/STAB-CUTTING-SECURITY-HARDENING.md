# STAB-CUTTING-SECURITY-HARDENING — boundary és supply-chain kapu

- **Szerep:** backend-security + infra
- **Prioritás:** P0
- **Státusz:** in_progress — második audit kész; aktív edge incidens és további
  végrehajtható P0 taskok nyitottak
- **Audit:**
  [`CUTTING_SECURITY_AUDIT_2026-07-21`](../../knowledge/architecture/CUTTING_SECURITY_AUDIT_2026-07-21.md)
- **Mutációs határ A (kész/review):** Cutting `InternalEndpoints`, `Program`,
  `QuoteRequestEndpoints`, `ExecutionHub`, `TenantAdapterStorage`, MailKit package és
  közvetlen tesztjeik
- **Mutációs határ B (következő):** csak külön foglalással: adapter transport,
  email template/outbox, teszt package-ek, deployment secret/proxy config
- **Tiltott scope:** RLS proof fájlok párhuzamos lock nélkül, valódi secret commitolása,
  user inputból executable/URL allowlist, advisory suppression

## Cél

A Cutting modul minden külső és belső belépési pontja fail-closed legyen, a
tenant-identitás ne legyen felülírható, a fájl/processz/hálózati adapterhatár ne
adjon traversal/RCE/SSRF képességet, és runtime sérülékeny csomag ne maradjon.

## A. Elkészült implementáció — független review-ra vár

1. Az internal `true` header helyett konfigurált shared secret, SHA-256 +
   `FixedTimeEquals`, hiányzó szerver-secret esetén `503`.
2. `adapterName` allowlist + canonical tenant-root containment.
3. MailKit `4.9.0` → `4.16.0`; MailKit/MimeKit runtime advisory megszűnt.
4. SignalR `tid` elsődleges, hibás canonical claim fail-closed, `Guid` execution ID.
5. Publikus quote limiter per remote IP partícionálva, legacy route-ok is védettek,
   limit/window config-vezérelt és pozitív értékre validált.
6. Production/staging JWT authority és Cutting DB connection string nélkül nem indul;
   `changeme` csak development fallback.
7. A hitelesítetlen `X-Tenant-Id` segédfüggvény eltávolítva.

## B. Kiosztható következő munkacsomagok

Az alábbi négy task önálló, éles fájlhatárral és tesztkapuval rendelkezik:

- [`STAB-CUTTING-EDGE-PROXY-INCIDENT`](STAB-CUTTING-EDGE-PROXY-INCIDENT.md) —
  azonnali Nginx containment + backend rollout;
- [`STAB-CUTTING-PUBLIC-CAPABILITY`](STAB-CUTTING-PUBLIC-CAPABILITY.md) —
  read/action token, replay és digitális elfogadási evidence;
- [`STAB-CUTTING-PUBLIC-QUOTE-OWNERSHIP`](STAB-CUTTING-PUBLIC-QUOTE-OWNERSHIP.md) —
  owner-aware PII, egy canonical quote flow és attachment karantén;
- [`STAB-CUTTING-ADAPTER-ACTIVATION-GATE`](STAB-CUTTING-ADAPTER-ACTIVATION-GATE.md) —
  kompatibilitási profil, secret resolver, CLI/REST/file conformance;
- [`STAB-NEXUS-CREDENTIAL-RBAC`](STAB-NEXUS-CREDENTIAL-RBAC.md) —
  platformszintű tokenrotáció és MCP default-deny jogosultság.

### SEC-HARD-01 — internal caller rollout

- keresd meg az összes Cutting `/internal/*` hívót, beleértve orchestrator/outbox/VPS
  konfigurációt;
- secretet kizárólag secret store vagy systemd credential/environment file adhat;
- stagingben igazold: hiányzó/rossz/legacy secret elutasítva, rotált secret elfogadva;
- frissítsd a kontraktust; a secret értékét ne dokumentáld;
- deploy után port PID = service MainPID ellenőrzés kötelező.

Bizonyított pontosítás: az exact Cutting ingest production hívóját a forrásfa nem
mutatta ki. A Kernel `CrossModuleOutboxDispatcher` viszont általánosan továbbra is
`X-SpaceOS-Internal: true` értéket küld, ezért az egységes internal identity
kontraktus platformfeladat, nem pusztán Cutting env-változtatás.

### SEC-HARD-02 — adapter activation gate

- CLI executable legyen szerverkonfigurációból, abszolút canonical pathból és
  allowlistből; payload metadata nem választhat programot;
- REST transport tiltson redirectet, minden DNS resolution után blokkolja a private,
  loopback, link-local és metadata tartományokat, DNS rebinding teszttel;
- adapter root könyvtárlánc symlink/reparse-point és create/read TOCTOU threat model;
- minden transport defaultban disabled, amíg a saját security suite nem zöld.

### SEC-HARD-03 — publikus capability és abuse gate

- legalább 128 bites tracking token, expiry, hash-at-rest, accept state/replay teszt;
- trusted forwarded headers csak konfigurált proxy CIDR-ből;
- külön limiter budget create/track/accept műveletre, valós kliens-IP bizonyítékkal;
- PII-t tartalmazó request mező ne kerüljön warning/error logba nyersen.

Második audit kiegészítés:

- `X-Original-Host` nem használható tenant authorityként; az éles Nginx jelenleg
  nem írja felül és nem törli ezt a kliens-headert;
- adapter- és quote-admin műveletekhez explicit permission + érvényes `sub`
  szükséges; a tenant típusa önmagában nem admin jogosultság;
- read és accept capability külön scope; az elfogadás quote+terms snapshothoz kötött;
- a modern, owner nélküli B2C PII aggregate és a legacy tenant quote konszolidálandó.

### SEC-HARD-06 — repository artifact hygiene

- távolítsd el a követett `publish-fix/` build outputot a tipből;
- ignore-old a generált publish variánsokat, artifact csak CI-ból készüljön;
- SBOM/provenance és tiszta clone publish bizonyíték;
- teljes history secret-scan; history rewrite csak koordinált döntéssel.

### SEC-HARD-04 — test supply-chain

- xUnit/test SDK/runner kompatibilis frissítése vagy advisory-mentes tesztstack;
- EF Core SQLite és SQLitePCLRaw javított, kompatibilis verzióra emelése;
- `dotnet nuget why` before/after bizonyíték;
- teljes suite, vulnerability audit és lock/restore diff review;
- runtime/test-only kockázatot külön jelöld, de egyiket se suppresszáld indoklás nélkül.

### SEC-HARD-05 — platform internal identity ADR

- leltározd a Kernel/Joinery/Inventory/Procurement/Cutting eltérő internal auth mintáit;
- dönts shared-secret átmenet, workload JWT vagy mTLS cél között;
- legyen audience, caller service identity, tenant delegation és rotációs szerződés;
- a B2B handshake partnerjoga nem helyettesítheti a service identityt vagy tenant claimet.

## Elfogadási kritériumok

- [x] legacy `X-SpaceOS-Internal: true` regressziós tesztben elutasítva;
- [x] traversal adapternevek regressziós tesztben elutasítva;
- [x] SignalR canonical/legacy/malformed claim mátrix zöld;
- [x] Cutting runtime projektek vulnerability auditja tiszta;
- [x] API clean build 0 warning/0 error;
- [x] teljes Cutting suite **1069/1069** zöld, 0 skipped;
- [ ] hívó- és deploy-rollout stagingben bizonyított;
- [ ] edge `/cutting/internal/*` kívülről upstream nélkül `404`;
- [x] `X-Original-Host` spoof nem választhat tenantot;
- [x] trusted proxy mögött a limiter valódi IP-t használ, közvetlen XFF spoof nélkül;
- [ ] admin mutation explicit permissiont és valódi actor `sub` claimet kér;
- [ ] nyitott CLI/REST/email/capability kapuk külön taskban lezárva;
- [ ] követett publish artifact nincs; reproducible CI artifact evidence kész;
- [x] független security reviewer PASS-WITH-FINDINGS (lásd lent);
- [x] a `4341390` commit és platform-pin megtörtént (2026-07-21, Gábor "mindent komitolj"
      utasítására, review NÉLKÜL) — a jelen review utólagos. **Deploy azóta megtörtént**
      a `STAB-CUTTING-EDGE-PROXY-INCIDENT` élő incidens elhárítása keretében (2026-07-22,
      lásd ott a napló) — az edge containment nélkül a deploy önmagában nem lett volna
      elég, mert a stale folyamat volt a valós kitettség.

## Független review eredménye (root, utólagos — 2026-07-22)

Adversarial review subagent, read-only, a `4341390` commit diffjén + build/teszt/vuln-audit
újrafuttatásával, a "A. Elkészült implementáció" 7 pontjára. 5/7 CONFIRMED: const-time
secret compare + 503 fail-closed; adapter traversal-védelem (a symlink-rés tudottan
SEC-HARD-02 alá tartozik, nem túl-állítás); MailKit 4.16.0; production/staging
startup-gate ténylegesen `Program.cs` top-level statementben fut, nem holt options-osztály;
`X-Tenant-Id` helper már korábban, az `f39d3ea`-ban eltávolítva. Build 0 warning/0 error,
teljes suite 1069/1069 pontosan egyezik, vulnerability audit: runtime tiszta, csak
test-only projekteken 3 High advisory (System.Net.Http/RegularExpressions 4.3.0,
SQLitePCLRaw 2.1.6) — ezek már SEC-HARD-04 alá vannak sorolva, nincs alul-jelentés.

**2 konkrét, korábban nem névvel nevezett rés:**

- **#4 — `ExecutionHub.ResolveTenantId` legacy `tid`-fallback:** ha a canonical `tid`
  claim HIÁNYZIK (nem hibás, egyszerűen nincs jelen), a kód csendben a legacy
  `tenant_id` claimre esik vissza és elfogadja — saját teszt
  (`JoinExecution_CanonicalClaimAbsent_UsesValidLegacyClaim`) explicit szándékként
  assertálja. A "malformed claim fail-closed" állítás technikailag igaz, de a legacy
  útvonal időkorlát nélküli, nem migráció-shimnek tűnik. → **SEC-HARD-05** (platform
  internal identity ADR) alá tartozik, architekturális döntés kell hozzá.
- **#5 — rate limiter partíciókulcs reverse proxy mögött összeomlik:** a limiter kulcsa
  `HttpContext.Connection.RemoteIpAddress`, de a modulban sehol nincs
  `UseForwardedHeaders`/`ForwardedHeadersOptions` bekötve — reverse proxy mögött minden
  kérés ugyanarra az egy (proxy) IP-re partícionálna, egyetlen kliens kimerítheti az
  összes tenant budgetjét. → **SEC-HARD-03** alá tartozik, a valós VPS-topológia
  ismerete (van-e reverse proxy, mi a CIDR-je — igen, van: Nginx a joinerytech-vps-en)
  kell hozzá pontos fixhez.

**Verdikt: PASS-WITH-FINDINGS.** A már commitolt/deployolt kód build/teszt-szinten
helytálló és nem regresszió; a 2 rés a következő SEC-HARD-03/05 munkacsomagban
priorizálandó.

## Trusted proxy és tenant-host follow-up — 2026-07-22

A SEC-HARD-03 proxy/host szelet lokálisan elkészült, három adversarial
maker/reviewer kör után **APPROVED**, P0–P3 finding nélkül:

- az endpoint csak a `Request.Host.Host` értékét adja a tenant resolvernek;
- forwarded IP/host/proto kizárólag explicit `KnownProxies`/`KnownNetworks`
  forrásból, `ForwardLimit=1` és header-szimmetria mellett fogadható el;
- a middleware a rate limiter előtt fut, trusted és untrusted pipeline-ágra is
  van valódi host-teszt;
- production/staging hiányzó proxy- vagy tenant-host policy esetén migráció előtt
  fail-fast;
- túl tág, nem kanonikus és IPv4-mapped IPv6 trust hálózat/cím tiltott;
- a tenant csak egycímkés, engedélyezett base-domainből vagy exact host mappingből
  oldható fel; suffix-confusion, idegen/IDN root, IP literal és hibás DNS-label
  elutasított.

Bizonyíték: fő célzott mátrix **76/76**, legacy tesztprojekt **9/9**, clean solution
build **0 warning / 0 error**. Commit és deploy nem történt.

Rollout-kapu változatlanul nyitott: az éles `ReverseProxy:*` és
`TenantResolution:*` konfiguráció, az Nginx három forwarded-headerének felülírása,
staging smoke, valamint a külön `/cutting/internal/*` P0 edge containment szükséges.

## Kötelező parancsok

```powershell
dotnet test tests/SpaceOS.Modules.Cutting.Tests/SpaceOS.Modules.Cutting.Tests.csproj `
  --filter "FullyQualifiedName~InternalEndpointsTests|FullyQualifiedName~TenantAdapterStorageTests|FullyQualifiedName~ExecutionHubSecurityTests" `
  -- RunConfiguration.MaxCpuCount=1

dotnet build SpaceOS.Modules.Cutting.sln --no-restore --no-incremental -m:1

dotnet test tests/SpaceOS.Modules.Cutting.Tests/SpaceOS.Modules.Cutting.Tests.csproj `
  --no-build -- RunConfiguration.MaxCpuCount=1

dotnet list SpaceOS.Modules.Cutting.sln package --vulnerable --include-transitive
```

## Stop / eszkaláció

- Ha nincs azonosított internal hívó és rotációs út, ne deployolj.
- Ha a reverse proxy trust boundary nem ismert, ne bízz `X-Forwarded-For` értékben.
- Ha adapter executable vagy REST host tenant/user inputból származik, az adaptert
  tartsd disabled állapotban.
- Ha a teljes suite eltér a baseline-tól, előbb bizonyítsd a regressziót; ne lazíts tesztet.
