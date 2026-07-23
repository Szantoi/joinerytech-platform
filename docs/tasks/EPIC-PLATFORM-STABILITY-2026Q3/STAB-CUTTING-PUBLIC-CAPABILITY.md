# STAB-CUTTING-PUBLIC-CAPABILITY — biztonságos ajánlatkövetés és digitális elfogadás

- **Szerep:** backend-security + domain architect + integration
- **Prioritás:** P0 a publikus elfogadás élesítése előtt
- **Státusz:** pending — threat model és migráció szükséges
- **Függőség:** edge proxy containment; notification outbox párhuzamosan tervezhető
- **Mutációs határ:** Cutting quote capability domain, public track/accept API,
  persistence/migráció, rate-limit policy, audit evidence és célzott tesztek
- **Tiltott scope:** token logolása, plaintext token migrálása új capabilityként,
  queryből/bodyból tenant választás, a capability „digitális aláírásnak” nevezése
  bizonyított identity/consent modell nélkül

## Kutatási eredmény

1. A tracking token 6 CSPRNG byte, azaz 48 bit / 12 hex karakter.
2. Plaintextben tárolódik, nincs lejárat, scope vagy külön visszavonási állapot.
3. Ugyanaz a token olvasási és állapotmódosító capability: track és accept.
4. A token URL pathba, API-válaszba és emailbe kerül; access logban, előzményben
   vagy linkmegosztásban kiszivároghat.
5. Ismeretlen token esetén az application error visszatükrözi a beküldött tokent.
6. Az accept state-gated és az aggregate `Version` concurrency tokennel védett,
   de konkurens replay `DbUpdateConcurrencyException` útja nincs publikus,
   determinisztikus `409/410` szerződéssé alakítva.
7. A jelenlegi limiter create/track/accept között közös. Reverse proxy mögött a
   worktree per-IP kulcsa trusted forwarded-header middleware nélkül továbbra is
   közös proxy-IP lehet.

## Döntési elv

A státuszkövetés és a szerződéses hatású elfogadás két külön capability:

```text
read token ── GET állapot, rövidebb adattartalom
action token ── egyszeri, lejáró elfogadás egy konkrét quote snapshothoz kötve
```

Az action token birtoklása önmagában legfeljebb email-birtoklási bizonyíték. Ha a
SpaceOS ezt digitális megállapodás alapjaként használja, az assurance-szintet ADR-ben
kell megnevezni, és az elfogadás bizonyítékát változtathatatlanul rögzíteni kell.

## Megvalósítási feladatok

### 1. Capability domain

- legalább 128 bit CSPRNG; ajánlott 256 bit base64url;
- adatbázisban csak verziózott, pepperelt HMAC/hash és token ID tárolható;
- külön `read` és `accept` scope, `IssuedAt`, `ExpiresAt`, `ConsumedAt`, `RevokedAt`;
- a token quote ID, tenant ID, quote version/snapshot hash és recipient channel
  összerendeléshez kötött;
- constant-time összehasonlítás a hash ellenőrzésénél;
- approve/reprice/reject esemény a régi action capabilityt automatikusan visszavonja.

### 2. Digitális elfogadási bizonyíték

Az acceptance record minimálisan tartalmazza:

- tenant, quote és quote-version azonosító;
- a megjelenített ajánlat canonical snapshot hash-e;
- terms/document verzió és hash;
- elfogadás UTC időpontja, correlation/event ID;
- azonosítási módszer (`email_link`, később OTP/eID), capability ID — token nélkül;
- minimális, retention policy alá eső technikai evidence;
- append-only audit/outbox esemény és idempotency key.

Az acceptance record nem módosítható újabb quote-verzió létrehozásával; az új
feltételekhez új elfogadás kell.

### 3. HTTP és abuse boundary

- token formátum/maximum hossz route binding előtt validált;
- hibák generikusak, a beküldött token se válaszban, se logban nincs;
- `Cache-Control: no-store`, `Referrer-Policy: no-referrer` a capability oldalakon;
- access log redaction vagy route-template logolás a token path-szegmensre;
- külön limiter create, track és accept műveletre; accept token-ID + valós IP
  összetett kulccsal, konfigurált trusted proxy mellett;
- sikeres accept után action token egyszer használható; replay determinisztikus
  `410 Gone` vagy dokumentált idempotens success, nem `500`;
- rate-limit storage több replika esetén elosztott, nem process-local.

### 4. Migráció

- a meglévő plaintext tokeneket ne emeld automatikusan magas assurance action
  tokenné;
- válassz rövid kompatibilitási ablakot: legacy token csak read, accepthez új,
  emailben kiküldött action token;
- migráció után a plaintext oszlop törlendő vagy bizonyítottan nullázandó;
- rollback nem állíthatja vissza a már visszavont action capabilityket.

## Kötelező tesztmátrix

- entropy/formátum és token-hash determinisztikus validáció;
- lejárt, visszavont, elfogyasztott, rossz scope, rossz quote-version;
- más tenant/quote hashével nincs találat és nincs existence leak;
- két párhuzamos acceptből pontosan egy domain transition és egy order születik;
- replay és concurrency exception dokumentált HTTP eredményre fordul;
- token nem szerepel structured logban, exceptionben vagy access-log fixture-ben;
- proxy trusted/untrusted XFF és külön limiter budgetek;
- legacy migráció és rollback-adatbiztonság.

## Elfogadási kritériumok

- [ ] Plaintext, lejárat nélküli action token nincs.
- [ ] Read és accept scope fizikailag/logikailag külön capability.
- [ ] Acceptance egy konkrét quote+terms snapshothoz kötött, auditálható.
- [ ] Konkurens/replay kérésből legfeljebb egy order keletkezik, nincs `500`.
- [ ] Token se alkalmazás-, se proxylogban nem jelenik meg.
- [ ] Valós kliens-IP és elosztott abuse control stagingben bizonyított.
- [ ] Migráció, visszavonás, retention és operátori runbook kész.

## Stop / eszkaláció

- Ha az üzleti elvárás jogilag erős elektronikus aláírás, az email capability nem
  elegendő; jogi/compliance ADR és megfelelő identity provider szükséges.
- Ha a proxy nem tud token-pathot redaktálni, a capability route nem élesíthető.
