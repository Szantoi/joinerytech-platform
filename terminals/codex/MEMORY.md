# CODEX Memory

## Tartós működési szabályok

- Stabilitás és hibajavítás előbb; a kész állapot csak mérhető teszt/build/smoke bizonyítékkal.
- A `AGENT-CHANNEL.md` append-only. Új bejegyzést mindig egyedi, friss EOF-konteksszel
  fűzz hozzá; rövid, nem egyedi kontextus korábban középre illesztett duplikátumot okozott.
- Vegyes platform working tree-ben nincs reset, checkout, széles staging vagy commit.
- Éles deploy, VPS-művelet, migráció és credential emberi/Gábor-kapuhoz kötött.

## Technikai emlékeztetők

- A `SpaceOS.Modules.Hosting` Development auth a valós tenant pipeline-t modellezi.
  A `enabled_modules` üresen hiányzik és ezért 403; csak Development módban adható meg.
- A portal world-gating UX-kapu, nem backend authorization forrás. API oldalon a
  tenant/module ellenőrzés és RLS továbbra is kötelező.
- Instance Context runtime endpoint nem indítható a Kernel entitlement igazságforrása nélkül.

## 2026-07-29 — ERPSEP-FE-WORLD-GATING javító kör

- A root-review P1/P2-je technikailag javítva: `ROLE_WORLDS` és tenant
  entitlement metszete a Home-rácsban, anonim fail-closed lista, kizárólag
  snake_case `enabled_modules` claim. Célzott bizonyíték: 5 fájl / 26 teszt,
  érintett ESLint és production build PASS.
- Gábor döntése: a legacy `Joiner → shopfloor` helyett a Joiner a modern
  `production` és a `settings` világot kapja. A teljes entitlementű teszt
  pontosan ezt a két csempét pineli, CRM/warehouse nélkül.
- Több szerepnél a `ROLE_PRIORITY`, nem a JWT szerep-tömb sorrendje dönt;
  `['Joiner', 'Admin']` is Admin világkészletet kap. Ezt külön policy-teszt őrzi.
- Ismeretlen szerep nem nyit meg semmilyen világot még teljes entitlementtel sem.

## 2026-07-29 — ERPSEP-06 wire-contract guard

- A `DevelopmentIdentityOptions.EnabledModules` nemcsak policy-szinten tesztelt:
  a test-only host közvetlenül pineli, hogy a több modul egy JSON tömbös
  `enabled_modules` claim, az üres config pedig claim-hiány. Így egy raw scalar
  regresszió nem maradhat rejtve az egyelemű policy-teszt mögött.
- Bizonyíték: hosting 78/78 PASS, Maintenance host build 0 warning / 0 error.

## 2026-08-13 — tartós Doorstar customer-product szerződés

- Egyetlen entitlement authority van: `Tenant.EnabledModules`. A Doorstar pontos
  customer-product ID-ja `joinerytech.door`, csak Manufacturer tenantnál engedett;
  nincs párhuzamos `EnabledCustomerProducts` állapot.
- A grantok pontosan `joinerytech.door.view|edit|admin`. A downstream capability-k:
  view → `instance.read`; edit → `instance.read,instance.write`; admin →
  `instance.admin,instance.read,instance.write`. `tenant.members.manage` és realm-role
  nem bővíthet Doorstar-hozzáférést.
- Első kiadásban egy subject pontosan egy tenant tagja lehet. A JWT tenant-lista pontosan
  egy bejegyzésű; a flat `tid` csak lista hiányában használható, jelen levő listával
  pontosan egyeznie kell. A control-plane 0001 és deny-sentinel 0002 soha nem customer tenant.
- Handoff v1: `joinerytech.door.membership-handoff/v1`, canonical RSA-PSS/SHA-256,
  pseudonymous `spaceos-<sha256(sub)>`, Replace/Deactivate, workItem-idempotencia és
  monoton verzió. Pending N → Doorstar effective N+1 → Kernel Active N+1.
- A minimal receipt csak schema/accepted/workItem/operation/version/digest mezőket hordoz;
  tenant vagy subject binding nem kerül evidence-be.
- Doorstar minden védett kérésnél, a BFF-session kérésenként is cache nélkül hívja a
  Kernel authoritative endpointját; explicit deny 403, elérhetetlenség/contract drift 503.
  A BFF csak AEAD-sealed access tokent tárol és legfeljebb a JWT lejártáig él.
- A default identity provider szándékosan fail-closed. Kereskedelmi aktiválás nincs valós,
  least-privilege Keycloak adapter + exact workItem/version readback + friss-token,
  két-audience és két-tenant negatív E2E nélkül.
- Ha izolált worktree eltűnik, ne prune-old azonnal: a Codex JSONL session napló a teljes
  `apply_patch` inputot és tool-outputot megőrzi, így új clone-ba deduplikáltan visszajátszható.

## 2026-08-14 — recovery tanulság és biztonsági checkpoint

- Recoveryhez nem elég a látható tool-call részhalmaz: az authoritative
  `patch_apply_end success=true` eseményeket is össze kell számolni. A Kernel
  esetén 275 tool-call mellett 325 sikeres event-diff volt; ezért friss clone-on
  a teljes event-ledger a helyes forrás.
- Windows replaynél a shell-kimenet csonkolhat nagy JSON-t, a PowerShell implicit
  dekódolása pedig mojibake-ot okozhat. Patchenkénti UTF-8 cache, call-id dedup,
  SHA-ledger, időrendi replay és 20-as checkpoint szükséges; a hibás kísérleteket
  törlés helyett karanténban kell megőrizni.
- A Doorstar first-release JWT present `spaceos_tenants` listája exact egy strict
  rekord; tenant és module lista egyezik a flat profillal. Federált principal
  sem új, sem régi local-password sessionből nem használható.
- Prisma PostgreSQL migrációnál a security-sensitive `NO FORCE RLS` preflightot
  explicit `BEGIN/COMMIT` közé kell zárni; az implicit migrációs tranzakcióra
  nem szabad hagyatkozni.
- 2026-08-14 checkpoint: architecture és portal recovery kész; Doorstar 18/122
  + build + független P0/P1 review zöld; Kernel és activation E2E még nyitott.

## 2026-08-14 — ONB-12 tartós termékbelépési szerződés

- A recovery lezárult; a korábbi „Kernel még nyitott” checkpoint történeti.
- A böngészős termékcél permissionből következik: `joinerytech.door.*` → Doorstar,
  `spaceos.*` → JoineryTech, `tenant.members.manage` → tagkezelés, metszet →
  választó. Role vagy preferencia nem ad tenant-termékhozzáférést.
- A Portal és Kernel csak natív JSON authorityt fogad: exact-one object-array
  `spaceos_tenants`, natív permission/module arrays, exact scalar selector,
  roles-only realm, kanonikus UUID és rekurzívan egyedi dekódolt kulcsok.
- Tenant nélküli exact platform owner külön control-plane authority; bármilyen
  tenantprofil vagy más ismert üzleti role együtt fail-closed.
- Portal → Doorstar navigáció nem authority-átadás. A Doorstar külön OIDC/BFF
  sessiont és kérésenkénti online Kernel membership/version ellenőrzést használ.
- Source PASS nem production GO: Keycloak projection/transport, valós token,
  tiszta PG/RLS, revocation, browser E2E, artifact és rollback külön kapu.
- Téves tesztkonfig lokális adatbázist is módosíthat. A 2026-08-14-i megmaradt
  Doorstar tesztséma csak explicit DB-felhatalmazással törölhető.

## 2026-08-14 - Plant/Doorstar durable verification rules

- Plant exact database verification includes table `relacl`, column `attacl`,
  creator `pg_default_acl` for relation/sequence/function and protected
  function identity/owner/shape/security/search-path/EXECUTE state. Hostile
  topology must fail before persistent migration mutation.
- Nullable tenant-composite DPEX references may use `MATCH SIMPLE` only with a
  paired-null CHECK that makes both local reference fields absent or present;
  non-null references still bind the full tenant-composite key.
- Source and isolated PostgreSQL proof do not activate identity, routes,
  connectors, workers or operator commands. Production still needs reviewed
  trust, fresh-token revocation/versioning, resource binding and cutover.
- Doorstar full unit 558/559 is not full-green; the unrelated Nexus-RAG failure
  remains open. Both exact leftover local schema names must be retained as
  cleanup targets until separately authorized, not treated as deletion scope.
