# CODEX Terminal State

> **Frissítve:** 2026-08-14 Europe/Budapest
> **Állapotforrás:** `AGENT-CHANNEL.md`, `terminals/root/TODO.md`, task-naplók
> **Mód:** átadási memento új Codex-chathez

## Átadási állapot

Két Codex-szelet **review_requested**, mindkettő változtatása még nem commitolt.
Ne stagingelj vagy commitolj vegyes working tree-ből; különösen ne használj
`git add -A`-t.

### 1. ERPSEP-FE-WORLD-GATING — review_requested

- A portal `worldAccess` policy fail-closed: a hét SpaceOS-világ, továbbá a
  production (`cutting` + `joinery`) és warehouse (`inventory` + `procurement`)
  kompozíciók jogosultsághoz kötöttek.
- A teszt- és `VITE_AUTH_MODE=mock` seed teljes kanonikus entitlement-listát kapott,
  ezért `/w/production/cutting` ismét megnyílik; szűk tenant és hidden legacy
  `shopfloor` továbbra is tiltott.
- A root-review P1/P2 javító köre elkészült: Home a szerepkör és tenant
  entitlement metszetét használja; anonim nézet fail-closed; csak snake_case
  `enabled_modules` claim fogadható el. Célzott kapu: **5 fájl / 28 teszt
  PASS**, érintett lint PASS, `npm run build` PASS.
- Gábor döntése átvezetve: a Joiner a modern `production` és a `settings`
  világot látja. A teljes entitlementű negatív kontroll pontosan ezt a két
  csempét engedi, CRM-et és warehouse-t nem; 28/28 gating teszt, lint és build
  újrafuttatva zöld.
- Task: `docs/tasks/EPIC-ERP-SEPARATION-2026Q3/ERPSEP-FE-WORLD-GATING.md`.

### 2. ERPSEP-06 DevelopmentIdentityOptions.EnabledModules — review_requested

- `DevelopmentIdentityOptions.EnabledModules` üres alapértelmezéssel bekerült a
  hosting csomagba. Nem üres értéknél JSON `enabled_modules` claimet ad ki;
  üres lista → module gate 403.
- `Jwt:Development:EnabledModules` Keycloak módban startup-hiba. Maintenance dev
  konfiguráció explicit `spaceos.maintenance` modult kapott.
- Bizonyíték: `dotnet test tests/SpaceOS.Modules.Hosting.Tests/SpaceOS.Modules.Hosting.Tests.csproj --no-restore`
  → **78/78 PASS** (a többmodulos JSON wire-alak és az üres claim is pinelve);
  `dotnet build SpaceOS.Modules.Maintenance.Host.csproj --no-restore`
  → **0 warning / 0 error**.
- Task: `docs/tasks/EPIC-ERP-SEPARATION-2026Q3/ERPSEP-06-INSTANCE-CONTEXT.md`.

## Fontos korlátok

- A futó `GET /api/platform/instance-context` nincs implementálva. A task stop-feltétele
  szerint Kernel `EntitledModules` igazságforrás és tulajdonosi/ADR döntés nélkül ezt
  nem szabad elkezdeni.
- A Maintenance bootstrap/anonimizált `MapModuleHealth` és az Instance Context OpenAPI
  korábban külön review-ra lett küldve; a futó endpoint nem része a mostani dev-identity
  szeletnek.
- A root a korábbi, középre illesztett 10:05-ös duplikátumot eltávolította; a
  csatorna végén lévő hiteles példány maradt. Jövőbeni státuszt csak friss,
  egyedi EOF-konteksszel fűzz hozzá.

## Working-tree fegyelem

- A repo erősen dirty, több más terminál és submodule változtatása él.
- Saját érintett fájlok: `src/spaceos-modules-hosting` auth options/handler/extensions
  + auth tesztek + README; `src/maintenance/host/appsettings.Development.json`; két
  ERPSEP task-napló; `AGENT-CHANNEL.md`; portal world-gating fájlok.
- Minden új munka előtt ellenőrizd újra a `git status --short` és az AGENT csatorna végét.

## 2026-08-13 — gépleállítás előtti memento: központi Doorstar-kiszolgálás

- A cél változatlan: a JoineryTech központi, több-bérlős onboardingja szolgálja ki a
  `joinerytech.door` Doorstar ügyfélterméket. A platform-admin jóváhagy, a tenant-admin
  meghív és pontos `view|edit|admin` termékjogot ad; a Doorstar nem uniózhat legacy
  realm-role jogosultságot a központi `permissions` claimhez.
- A Doorstar forrásmunka megmaradt a
  `C:\Users\szant\Documents\Development\doorstar-instance` munkafában. Elkészült a
  permissions-only auth, a cache nélküli Kernel authority-check, az egy-subject/egy-tenant
  federált binding, az N/N+1 verziózott Replace/Deactivate handoff, a default-OFF
  RSA-PSS intake, a BFF minden kéréses újraellenőrzése és a két forward Prisma-migráció.
- Utolsó teljesen ellenőrzött Doorstar checkpoint: TypeScript/build/Prisma zöld;
  core suite 59/59, intake/wiring/RLS suite 23/23. A legutolsó három hardening változás
  (transport provenance, RSA-signature szigorítás, legacy-binding DB guard) a leállítás
  előtt már nem kapott új tesztkört, ezért újraindítás után ezekkel kell kezdeni.
- Három izolált, nem commitolt munkakönyvtár 21:30 körül külső állapotváltozás miatt
  egyszerre eltűnt; egyik agent sem törölte vagy mozgatta őket:
  `_codex_spaceos_kernel_onboarding_20260813`,
  `_codex_joinerytech_portal_onboarding_20260813`,
  `_codex_joinerytech_onboarding_architecture_20260813`.
  Az eredeti Git worktree-metaadat **megmaradt és prunable**, ezért tilos `git worktree
  prune`, reset vagy checkout a helyreállítás előtt.
- A teljes rekonstrukciós forrás megvan a Codex JSONL naplókban. A legfontosabbak:
  `rollout-2026-08-13T13-53-13-019ffaf8-2241-7012-8ef3-c756d7eac7da.jsonl`,
  `rollout-2026-08-13T15-43-16-019ffb5c-e3b0-7a53-9001-0e8698486dbf.jsonl`,
  `rollout-2026-08-13T15-43-52-019ffb5d-6f56-79e2-b444-af09afff5e6c.jsonl`,
  `rollout-2026-08-13T18-20-54-019ffbed-3395-7482-a7ca-f4c8b0b41939.jsonl`,
  `rollout-2026-08-13T20-31-47-019ffc65-0709-7ff2-9464-dc7157270570.jsonl`.
  Helyük: `C:\Users\szant\.codex\sessions\2026\08\13\`.
- Sem commit, push, deploy, VPS-, Keycloak- vagy adatbázis-módosítás nem történt.
  A teljes aktiválás továbbra is NO-GO: valós, least-privilege Keycloak projection
  provider/mapper és két-audience (`doormanufacturing-instance-api`, `kernel-api`)
  friss-token E2E még hiányzik.

## 2026-08-14 — recovery és Doorstar source-security checkpoint

- Architecture recovery kész:
  `C:\Users\szant\Documents\Development\_recovery_joinerytech_onboarding_architecture_20260814`,
  62/62 scope-olt patch, shared hosting 185/185 Docker-fixture nélkül, 7/7 host
  build, UTF-8/diff kontroll zöld. Recovery manifest az onboarding epicben.
- Portal recovery kész:
  `C:\Users\szant\Documents\Development\_recovery_joinerytech_portal_onboarding_20260814`,
  140/140 replay-állapot, 53/53 focused teszt, build, 44 fájlos scoped lint és
  production audit zöld. `RECOVERY_MANIFEST.md` és SHA-ledger rögzíti a forrást.
- Kernel recovery a korábbi 275 tool-call részhalmaz helyett az authoritative
  325 sikeres event-diffből friss clone-on újraindult; még folyamatban van.
- Doorstar bridge: strict flat/present-list tenant binding, exact Doorstar
  product token, federált local-login tiltás, principal-lock/CAS/idempotency és
  explicit tranzakciós FORCE-RLS migration preflight elkészült. 18 fájl / 122
  unit teszt és production build zöld; független review maradó P0/P1-et nem talált.
- Két téves localhost integrációs tesztindítás generált ideiglenes sémát; a két
  exact sémát loopback-cél ellenőrzése után eltávolítottuk és hiányukat SQL-lel
  igazoltuk. Éles/staging DB, VPS, Keycloak, deploy, commit vagy push nem változott.
- Aktiválás továbbra is NO-GO a Kernel recovery/cross-contract, valós PostgreSQL
  FORCE-RLS/concurrency, least-privilege Keycloak adapter/mapper, friss dual-audience
  JWT és két-tenant/revoke E2E lezárásáig.

## 2026-08-14 — ONB-12 source-closeout (a fenti recovery sort felülírja)

- Mindhárom recovery kész. A Kernel authoritative replay 325/325, a négy ledger
  hash változatlan; full Kernel unit 1084/1084 és solution build zöld.
- Jogosultság-alapú célválasztás kész: Doorstar-only → Door Manufacturing;
  `spaceos.*` → JoineryTech; mindkettő → explicit választó; kizárólag
  `tenant.members.manage` → tagkezelés; tenant nélküli exact platform owner →
  regisztrációs sor; hibás/no-grant profil fail-closed.
- Portal: 9 fájl / 191 célzott, teljes suite 193 fájl / 1848 teszt, build 1085
  modul, scoped lint 0, audit 0/431. Kernel landing/security: 50/50 + 38/38 +
  7/7 és 0 buildhiba. Doorstar BFF: 4 fájl / 32, TypeScript/build/OpenAPI
  146/ops verifier zöld. Független cross-repo review: PASS, P0/P1 = 0.
- Exact wire: natív exact-one `spaceos_tenants` object-array, natív granttömbök,
  roles-only realm, kanonikus `D` UUID, rekurzívan egyedi JSON kulcsok. Wrapper,
  alias, duplicate és raw-role deny. Nincs `preferred_product` authority.
- A Doorstar-handoff same-tab, token/tenant/grant nélküli origin-navigáció; a
  Doorstar saját OIDC/BFF és online Kernel membership/version kapuja dönt.
- Production aktiválás változatlanul NO-GO: valós Keycloak mapper/provider,
  explicit handoff wiring, dual-audience token, tiszta PG/RLS + két-tenant/revoke
  böngészős E2E, immutable artifact és rollback bizonyíték hiányzik.
- Új lokális reviewer-harness incidens: a hibás Doorstar Vitest config létrehozta
  a `doorstar_test_vitest_39180_d8ff2fc44f2a412486ca6cc5a6a79cc2` sémát a
  helyi `doorstar_production` DB-ben. P6001 miatt megmaradt; engedély nélkül nem
  töröltük. Éles/staging DB nem változott.
- Nem történt commit, push, deploy, VPS-, Keycloak-, DNS- vagy proxymódosítás.

## 2026-08-14 - cross-repository isolated-database closeout

- Kernel Migration 0038 PostgreSQL 16 Up/Down proof: 1/1 PASS.
- Plant final proof: 213/213 PASS = contracts 31, runtime 7, API 144 including
  DPEX 1/1 and tenant/RLS 4/4, Web 31. Six source hashes remained stable,
  catalog drift was zero and all named Plant disposable resources were removed.
- Doorstar final local proof: PostgreSQL 20/20; no-DB execution 6/55 plus
  lifecycle 5/16 = 11/71 PASS; lifecycle pins 7/7 MATCH. Full unit remains
  558/559 because of one unrelated Nexus-RAG dry-run failure.
- The local Doorstar schemas
  `doorstar_test_vitest_39180_d8ff2fc44f2a412486ca6cc5a6a79cc2` and
  `doorstar_test_vitest_9036_bee05455a0334bc6bd5e46af8527ff91` remain
  untouched and pending separately authorized exact-target cleanup.
- Scoped independent verdict: source plus isolated DB P0=0/P1=0. Production
  activation remains NO-GO; no commit, push, deploy, VPS or Keycloak change
  occurred.
