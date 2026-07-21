# STAB-CUTTING-SECURITY-HARDENING — boundary és supply-chain kapu

- **Szerep:** backend-security + infra
- **Prioritás:** P0
- **Státusz:** in_progress — első javítási csomag kész, review szükséges
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

### SEC-HARD-01 — internal caller rollout

- keresd meg az összes Cutting `/internal/*` hívót, beleértve orchestrator/outbox/VPS
  konfigurációt;
- secretet kizárólag secret store vagy systemd credential/environment file adhat;
- stagingben igazold: hiányzó/rossz/legacy secret elutasítva, rotált secret elfogadva;
- frissítsd a kontraktust; a secret értékét ne dokumentáld;
- deploy után port PID = service MainPID ellenőrzés kötelező.

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
- [ ] nyitott CLI/REST/email/capability kapuk külön taskban lezárva;
- [ ] független security reviewer PASS;
- [ ] commit, platform-pin és deploy csak review után.

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
