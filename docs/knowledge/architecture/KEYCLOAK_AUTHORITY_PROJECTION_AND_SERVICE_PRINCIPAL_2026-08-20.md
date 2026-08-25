# Keycloak authority projection és Office→Plant service-principal registry

- **Állapot:** lokális P0 provisioning-szerződés; **nem aktiválási bizonyíték**
- **Dátum:** 2026-08-20
- **Kapcsolódó döntések:** ADR-061 (JWT tenant authority), ADR-067 (kanonikus
  ModuleId és Kernel-owned entitlement)
- **Végrehajtó:** `scripts/provision_keycloak_tenant_projection.py` + a
  product-semleges `scripts/keycloak_provisioning_transport.py`
- **Minta:** `config/keycloak-tenant-projection.sample.json`

## Cél és biztonsági határ

Ez a szerződés leváltja a retired `portal-app + tid + realm-role` onboarding
modellt. A profil nem tartalmazhat secretet, jelszót, credentialt vagy tokent.
A Keycloak publikus issuer és a loopback-only admin végpont külön, exact
értékként van rögzítve. A script nem hív VPS-t vagy adatbázist.
Minden profile- és Keycloak/readback JSON strict parseren megy át; bármely
objektumszinten ismételt kulcs invalid, nem „utolsó érték nyer" kompatibilitás.

Nincs implicit futási mód:

- `--offline`: profilvalidáció és géppel olvasható exact-replace/readback terv,
  credential és hálózat nélkül;
- `--verify-only`: explicit online, csak olvasó drift-felmérés; két teljes,
  azonos realm-inventory passzt és signed baseline/readback egyezést kér, de az
  atomikus CAS és production trust anchor hiánya miatt nem ad konvergencia-evidenciát;
- `--apply`: fenntartott, de jelenleg hard-disabled mód; profil-, credential-
  vagy hálózatolvasás előtt `exit 2`.

Mód nélkül vagy egyszerre több móddal a script `exit 2`-vel leáll, még a
profilhoz kötött admin-hitelesítés előtt. `--apply` futást ebben a fejlesztési
szeletben nem hajtottunk végre, és a kód jelen állapotában nem is enged.

## Emberi access-token authority

### Registry és kiválasztott projection

A Keycloak user registry több tenant-membershipet tárolhat a nem tokenizált
`spaceos_membership_registry` attribútumban. Egy access token azonban nem
lehet több tenant vagy több product egyidejű authorityja. Minden human consumer
külön client scope-ot és külön, opaque user projection attribútumot kap. A
consumer scope ezt az attribútumot ugyanarra a publikus `spaceos_tenants`
claimre képezi, de csak a saját egyetlen module/permission grantjával. Például a
Plant consumer wire-alakja:

Az audience/module/permission/scope/opaque-attribútum kapcsolat a szintén
nem tokenizált `spaceos_consumer_projection_registry` attribútumban kerül exact
readbackre. Így consumer- vagy audience-változás csak magasabb
`spaceos_projection_version` mellett fogadható el; a mapper-drift önmagában nem
kerülheti meg a stale-token cutoffot.

```json
{
  "spaceos_tenants": [
    {
      "tenant_id": "11111111-2222-4333-8444-555555555555",
      "permissions": [
        "joinerytech.plant.admin"
      ],
      "enabled_modules": [
        "joinerytech.plant"
      ]
    }
  ],
  "spaceos_membership_version": 1,
  "spaceos_projection_version": 1
}
```

Szabályok:

1. `spaceos_tenants` natív JSON array, hossza **0 vagy pontosan 1**. A 0 elemű
   projection mindig grant nélküli/inaktív.
2. Az entry kulcskészlete **pontosan** `tenant_id`, `permissions`,
   `enabled_modules`. `tenant_type`, `brand_skin`, registry meta/lifecycle és
   más product grant nem kerülhet tokenbe.
3. `tenant_id` lowercase, nem reserved UUID. `permissions` és
   `enabled_modules` egyaránt pontosan egy canonical product értéket tartalmaz;
   a permission module-prefixe exact egyezik az egyetlen enabled module-lal.
   A szélesebb, akár több productot és `tenant.members.manage` capabilityt
   tartalmazó authority kizárólag a nem tokenizált registryben marad.
4. Az entryben verzió vagy lifecycle status nincs. A két top-level verzió
   natív JSON integer, bool/string nem fogadható el, értékük legalább 1.
5. A membership- és projection-verzió két független, monoton számláló; nincs
   köztük numerikus rendezési feltétel. A szerver csak az online aktív registry
   exact verzióegyezésekor engedhet.
6. A natív profil mellett `tid`, top-level `tenant_id`, `permissions` vagy
   `enabled_modules` **tilos**. Native+flat mixed token fail-closed.
7. Tenant-, consumer audience-, module- vagy permission-váltáskor nő a
   projection-verzió, és
   friss access token kell. Régi token queue-ürítéshez sem használható.

A mintaprofil két explicit projectiont pinel:

- `doormanufacturing-web`: `aud` exact
  `doormanufacturing-instance-api` + `kernel-api`, egyetlen
  `joinerytech.door` / `joinerytech.door.admin` grant;
- `joinerytech-plant-web`: `aud` exact `joinerytech-plant-api` +
  `joinerytech-plant-web`, egyetlen `joinerytech.plant` /
  `joinerytech.plant.admin` grant.

A browser security posture szintén source-pinned és része a signed adoption
baseline-nak, valamint az observation fingerprintnek. A Door kliens enabled,
`S256` PKCE-t kér, redirectje pontosan a tracked `/calc/auth/callback` és
`/flow/auth/callback`, originje pedig kizárólag
`https://doormanufacturing.joinerytech.hu`. Wildcard, HTTP, port, query,
fragment, más HTTPS origin vagy hiányzó/`plain` PKCE blokkol. A Plant repóban
nincs browser app/callback szerződés: ezért `joinerytech-plant-web` explicit
disabled, redirect/origin listája üres, és az offline/online terv külön
`consumer-browser-activation=Block` lépéssel jelzi, hogy browser auth nem kész.

Az `azp` mindkét esetben a Keycloak built-in kliensazonosító. Minden custom
audience külön mapperként része az adott scope exact mapper-readbackjének.

A jelenlegi Keycloak user-attribute projection csak bootstrap-mechanizmus. Ha
egy user párhuzamos sessionökben több tenantot használ, külön szerveroldali
tenant-selection/token-exchange megoldás szükséges; a globális user attribútum
nem elég session-scope-os authoritynak.

## Exact-replace és lifecycle

A provisioner terve csak a saját, név szerint felsorolt user/service-account
attribútumait és a `spaceos-tenant-authority-v1--<consumerClientId>` nevű,
consumer-specifikus scope-ok teljes mapperkészletét kezelné. A következő
invariánsokat az offline/read-only terv és teszt rögzíti, de a mutációs út a lent
leírt P0-k miatt le van tiltva.

- Ismeretlen vagy flat authority mapper a consumer kliensen `Block`, nem
  automatikus törlés. Így egy másik scope módosítása nem rejtett side effect.
- A consumer saját scope-ján kívüli custom-audience, `aud` claim vagy dinamikus
  audience-resolve mapper `Block`; különben az exact audience set nem bizonyított.
- A saját client scope mapperkészlete exact-replace: extra mapper törlendő,
  hiányzó létrehozandó, driftelő teljesen cserélendő.
- Tagságot törölni tilos. `active → revoked/deactivated` állapotváltással és
  magasabb `membership_version` értékkel kell visszavonni.
- Revoke/deactivate/reactivate és permissioncsere megfelelő audit actiont és
  monoton verzióemelést kér. Verzió-visszagörgetés vagy változatlan verziójú
  authority-módosítás blokkolja az apply-t.
- Rollback nem régi verzió visszaírása: a korábbi grant alakját egy **új,
  magasabb** membership/projection verzióval kell visszaállítani.

A friss token önmagában sem végső authority. A Kernel/Plant online döntésnek az
aktív membership státuszt és mindkét verziót ellenőriznie kell. Ennek runtime
bekötése és két-tenant OIDC/JWKS bizonyítéka külön aktiválási kapu.

## Immutable adoption, custody és inventory szerződés

A `mutationSafety` blokk exact, ismeretlen mezőt nem fogad. Az owner/adoption
receipt külső RS256 aláírása a realmhez, authority/service change ID-khez, teljes
konfiguráció-digesthez, subjecthez, consumer client ID-khez, scope-nevekhez és
minden érintett Keycloak belső UUID-jéhez kötött. Erőforrásonként két külön hash
van:

- `desiredOwnedStateSha256`: a configból levezetett, tool-owned célállapot;
- `observedOwnedStateSha256`: egy külön read-only adoption-candidate futás
  aláírt baseline-ja. Azonos név és azonos belső UUID sem elég, ha az aktuális
  owned subset ettől eltér.

A custody receipt ettől elkülönített signer-usage, és exact módon köti a service
client belső UUID/clientId párját, audience-ot, tenant/project/station/permission
scope digestet, key state/version/label/fingerprintet, rotation-időket,
service change ID-t és config digestet. Mindkét receipt legfeljebb 31 napig
érvényes; future/expired, wrong-usage, wrong-realm, stale config vagy újraaláírt,
de szemantikailag helytelen payload `Block`.

A repository ebben a szeletben szándékosan **nem** tartalmaz production
trust anchort. A `TRUSTED_RECEIPT_KEYS` üres; a mintában lévő `AA` signature és
`*-unconfigured` key ID csak séma-minta, soha nem evidence. A production public
key külön security review-ban kerülhet be, a hozzá tartozó private key pedig nem
kerülhet a repóba. A teszt runtime-ban generál ephemeral legalább 3072 bites,
exact 65537 exponentű RSA kulcsot; külső kriptográfiai runtime dependency nincs.

Az online megfigyelés a `/clients?first&max` listát bounded, progress- és
duplicate-ellenőrzött lapokon olvassa. Minden klienshez detail, direct mapper,
default/optional scope és attached mapper inventory készül. A classic
`/client-scopes` endpoint nem dokumentál pagination paramétert, ezért azt egyben,
szigorú `pageSize * maxPages` felső korláttal, majd minden scope-ra exact ID/detail
readbackkel kezeli. Minden attached scope name/ID párnak pontosan egyeznie kell e
teljes katalógussal; bármely ismételt név vagy immutable ID (azonos vagy alias,
default és optional között is) blokkol. Live mappernél scalar elem, hiányzó vagy
dupla stable ID/name, illetve malformed protocol/protocolMapper/config szintén
fail-closed. Két teljes passz fingerprintje byte-azonos kell legyen.
Managed scope reverse edge kizárólag a receipt-bound saját human consumer
`default` edge lehet, és a binding immutable ID-jének is a receipt-bound scope
ID-val kell egyeznie; idegen, substituted, internal, service vagy optional edge blokkol. A
hiányzó kívánt edge továbbra is látható `AttachDefault` terv, nem hamis evidence.

Az observation fingerprint csak immutable target anchorokat és explicit
owned/guard mezőket tartalmaz. Credential, secret/token, `access`,
`registeredNodes`, server metadata és foreign user/client attribútum nem kerül
fingerprintbe. A Python runtime-ban nincs classic mutation DTO/helper vagy
írható scaffold; a jövőbeli writer külön review-zott szerveroldali komponens.

## Office→Plant service-principal

Az emberi tokentől külön profil:

```json
{
  "azp": "joinerytech-office-to-plant",
  "aud": "joinerytech-plant-api",
  "spaceos_service_principal": {
    "principal_id": "joinerytech-office-to-plant",
    "tenant_id": "11111111-2222-4333-8444-555555555555",
    "project_ids": ["e179c41d-7a24-4102-bb73-f99e0d055e9c"],
    "station_ids": ["station-cnc-01"],
    "permissions": [
      "office.ack_outbox",
      "office.issue_work_package",
      "office.read_outbox"
    ]
  },
  "spaceos_membership_version": 1,
  "spaceos_projection_version": 1
}
```

Az `azp`, audience, tenant, project, station és Plant által fogyasztott Office
operation-vocabulary exact. A
service token nem hordozhat human `spaceos_tenants` vagy flat human
permission/module authorityt. `revoked`/`deactivated` állapotnál a kliens
disabled, a stale tokent pedig az online version/status check tagadja meg.
Realm-default és optional client scope sem maradhat a dedikált kliensen; a
kívánt terv mindet leválasztja, a device authorization és CIBA grantot explicit
`false` értékre zárja. A tool jelenleg sem javítást, sem aktiválást nem végez:
`--apply` minden ilyen művelet előtt leáll.

### Kulcsrotáció határa

A `keyRotation` blokk kizárólag **nem titkos registry-metaadat**:

- aktív key label és monoton version;
- aktiválási és következő rotációs idő;
- overlap státusz/időablak;
- az immutable signed custody receipt UUID-ja.

A provisioner szándékosan nem fogad, nem olvas vissza és nem ír ki kliens-
kulcsot vagy secretet. Nem telepít kulcsot, nem adja át az Office-nak, és nem
vonja vissza a korábbi kulcsot. A metadata/readback eredménye ezért **nem live
key-rotation proof**. Aktív principal csak külön, jóváhagyott, trusted és még
érvényes custody receipt után engedhető; a jelenlegi minta not-provisioned és
disabled.

## Retry, readback és audit

- Read-only GET: configból korlátozott, legfeljebb 5 próbás exponential backoff.
- CLI `--apply`, importált `apply()`, a raise-only belső mutation entrypoint és
  minden nem-GET classic Admin kérés profil/credential/hálózat vagy mutáció előtt
  hard-stop; a korábbi POST/PUT/DELETE/create/enable scaffold fizikailag nincs a
  provisionerben.
  Receipt-only `create` nincs: a policy kizárólag exact existing resource UUID-k
  adoptálását engedi, de még ezt sem írja a Python tool.
- A teljes reverse inventory és immediate exact reread csökkenti a race ablakot,
  de nem atomikus CAS. A classic Admin REST nem dokumentál erős ETag/If-Match
  user/client/scope tranzakciót; ezért a tervben a
  `keycloak-atomic-cas` mindig `Block`. Feloldás csak serialized szerveroldali
  writer/lock/SPI lehet, nem még egy kliensoldali GET.
- A jövőbeli writer szerződése disabled-first; bármely exception, uncertain
  válasz, activation drift vagy final teljes re-observe nem nulla terv esetén az
  exact receipt-bound service clientet letiltja és friss readbackkel bizonyítja.
  Ha a disabled állapot nem bizonyítható, incident és nulla activation evidence.

Forráskorlátok: a [Keycloak Admin REST referencia](https://www.keycloak.org/docs-api/latest/rest-api/index.html)
a client listán dokumentál `first/max` lapozást, a client-scope listán nem; a
[Keycloak #19691](https://github.com/keycloak/keycloak/issues/19691) az
attribute update/CAS hiányát is rögzíti. Ezekből nem vezetünk le erősebb
garanciát, mint amit az API ténylegesen ad.
- Az Admin transport nem használ környezeti proxyt, nem követ redirectet, minden
  URL-t az exact loopback originre validál, és a confidential response-ból még a
  provisioner előtt exact/path-aware denylisttel eltávolítja a secret/password/
  credential/bearer-token értékmezőket. A mapper szemantikai token flagjeit
  (`access.token.claim`, `id.token.claim`, `userinfo.token.claim`,
  `introspection.token.claim`) megőrzi az exact mapper readbackhez.
- A JSON summary allowlisted, nem titkos policy-metaadatot tartalmaz: opaque
  user/tenant kulcsot, publikus client/audience/module/permission és browser
  posture mezőket, verziót, digestet, change ID-t, lokális profilútvonalat és
  tervet. Bearer, jelszó, credential, client secret vagy kulcsanyag nincs benne.

## Fennmaradó aktiválási blokkok

1. A Plant és Doorstar consumer snapshotok már nested-only, exact háromkulcsos,
   egy-productos human projectiont, mixed/flat deny-t, exact audience/`azp`
   ellenőrzést és online subject+tenant/version/content/cutoff readbacket
   valósítanak meg. A platform mintaprofil generált fixture-e mindkét grammarrel,
   a service fixture pedig a Plant exact Office operation-vocabularyjával lokálisan
   kompatibilis. A Plant browser kliens ettől még explicit disabled/default-off,
   mert nincs source-pinned callback/BFF; `browserActivationEvidence=false` és a
   tervben külön Block. Ez továbbra sem live Keycloak token- vagy integrációs evidencia.
2. Az immutable adoption/custody receipt séma, signed observed baseline, bounded
   teljes kétpasszos inventory, reverse-binding allowlist, allowlisted fingerprint,
   immediate reread és compensation contract offline tesztelhető. A production
   signer anchor azonban szándékosan konfigurálatlan, és a classic Admin REST
   atomikus CAS hiánya feloldatlan P0. Ezért az apply minden belső útja hard-off;
   `mutationSafetyEvidence=false`.
3. A régi `provision_doormanufacturing_keycloak_clients.py` közvetlen
   `tid`/`enabled_modules` mapperei és a
   `provision_doormanufacturing_identity.py` flat user-attribútum/realm-role
   útja retired. Mindkét CLI csak explicit historical `--offline` validációt
   enged; default/verify/apply/invite profil-, credential- és hálózatelérés előtt
   leáll, runnable action output nélkül. Defense in depthként a megtartott legacy
   credential/HTTP helper és a két közvetlen invitation/role-mapping transport is
   azonnal `retired` hibát ad, ezért importon keresztül sem nyit hálózati útvonalat.
4. Nem futott élő Keycloak verify/apply/readback, Authorization Code + PKCE,
   tokenkiadás, JOSE/JWKS key-rotation, revoke/downgrade/deactivate vagy online
   két-tenant Kernel/Plant integráció. Nem történt DB/VPS/deploy vagy release-pin
   változtatás ebben a platform szeletben.

## Lokális bizonyíték

```powershell
python scripts/provision_keycloak_tenant_projection.py `
  --profile config/keycloak-tenant-projection.sample.json --offline

python -m unittest scripts/test_provision_keycloak_tenant_projection.py -v

python -m unittest discover -s scripts -p "test_provision*.py" -v
```

Az offline summary szándékosan `activationEvidence=false`,
`liveTokenEvidence=false`, `projectionConvergenceEvidence=false` és
`mutationSafetyEvidence=false` értéket ad.

Mért lokális eredmény ezen a snapshoton: projection suite **105/105**, a három
Python provisioning suite együtt **140/140**. A platform által renderelt fixture
az actual Doorstar nested parseren elfogadott Door grantot, az actual Plant
authority consumeren pedig human Plant grantot és mindhárom Office operationt
elfogadott exact online-state echo mellett. Ez szintetikus fixture-kompatibilitás,
nem aláírt token/JWKS vagy élő Kernel/Keycloak bizonyíték.
