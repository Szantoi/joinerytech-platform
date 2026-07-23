# STAB-CUTTING-ADAPTER-ACTIVATION-GATE — konfigurációból működő, izolált vendor adapter

- **Szerep:** backend-security + integration + infra
- **Prioritás:** P0 bármely külső adapter engedélyezése előtt
- **Státusz:** pending — a jelenlegi CLI/REST ágak nem teljes production call chain-ek
- **Függőség:** subprocess bounds; platform secret-provider döntés
- **Mutációs határ:** Cutting adapter config/domain, provider resolver, DI/transport
  factory, CLI/REST/file transport, secret resolver és conformance tesztek
- **Tiltott scope:** user/tenant inputból executable vagy tetszőleges URL, transport
  engedélyezése security suite nélkül, plaintext secret, best-effort SSRF-szűrés

## Bizonyított hívási lánc

| Réteg | Jelenlegi viselkedés | Következmény |
|---|---|---|
| Tenant config | adapter és transport külön allowlist, bármely kombináció elfogadott | `manual+cli`, `cutrite+rest` is „érvényes” |
| Resolver | csak `AdapterName` mezőt olvas | `TransportName`, `ConfigJson`, schema version figyelmen kívül marad |
| DI | OptiCut fixen file, CutRite fixen CLI | tenant transport-választása nem hat a runtime-ra |
| OptiCut converter | metadata csak `sheetId` | file transport tenant/adapter metadata hiány miatt nem teljes |
| CutRite converter | metadata csak `sheetId` | CLI transport a processzindítás előtt elutasít |
| CLI transport | payload metadata adja az executable-t | későbbi naiv metadata-bekötés tenant-admin RCE-vé válhat |
| REST transport | DI-ban regisztrált, providerhez nincs kötve; BaseAddress nincs konfigurálva | jelenleg dormant, aktiváláskor hibás/veszélyes |
| Secret detector | entropy csak secret-szerű kulcsnévnél vizsgált | innocens kulcs alá rejtett secret átmehet |
| Secret reference | `${secret:name}` elfogadott | runtime resolver nem található, tehát a szerződés félkész |

Az aktuális CLI/REST veszély ezért **latent activation hazard**, nem bizonyított
publikus RCE/SSRF. Az adapterek működőképessé tétele és a security boundary egyetlen
atomikus fejlesztési csomag legyen; részleges „bekötés” tilos.

## Célarchitektúra

```text
Tenant config (nem érzékeny, sémázott)
        │
        ▼
AdapterProfile registry (server-owned)
  ├─ allowed adapter+transport pár
  ├─ executable ID / destination ID
  ├─ capability + schema version
  └─ secret references
        │
        ▼
Transport factory + security handler + audit
```

Tenant konfiguráció csak előre regisztrált profilazonosítót és nem érzékeny
paramétereket választhat. Programútvonalat, hostot, portot vagy credentialt nem.

## Megvalósítási feladatok

### 1. Domain és konfiguráció

1. Válts a két független allowlistről explicit adapter–transport kompatibilitási
   mátrixra (`builtin:none`, `manual:none`, `opticut:file-exchange`,
   `cutrite:cli-wrapper`; REST csak elfogadott vendor profilnál).
2. Adapterenként verziózott JSON Schema vagy typed options; ismeretlen mező és
   nem támogatott schema version fail-closed.
3. `ConfigJson` byte- és depth-limit; canonical JSON és változás-audit secret nélkül.
4. `IsEnabled=true` csak sikeres config validation + security capability check
   után; új/átmigrált külső profil alapértelmezésben disabled.
5. A resolver teljes, immutable runtime profilt cache-eljen, ne csak adapternevet;
   cache key tartalmazza a config verziót.

### 2. Secret boundary

1. Implementálj `IAdapterSecretResolver` portot; production adapter secret store
   vagy systemd credential providerből olvas.
2. `${secret:name}` csak létező, az adott tenant/profil számára engedélyezett
   referenciára oldható; hiány vagy tiltott referencia fail-closed.
3. A secret detector minden string leafet vizsgáljon ismert credential-formátumra
   és entropiára, ne csak kulcsnévre; legyen false-positive policy és méretlimit.
4. Resolved secret soha ne kerüljön cache-be, DTO-ba, audit payloadba vagy logba.

### 3. CLI profil

1. A payloadból töröld az `executable` döntést. A profil csak szerver-owned
   executable ID-t tartalmazhat.
2. Az ID configból canonical, abszolút, root-owned allowlistelt pathra oldódik;
   symlink/reparse és writeable executable tiltott.
3. A working directory tenant-root containmentet és reparse/TOCTOU threat modelt kap.
4. Strukturált argumentumlista marad; shell indítás tilos.
5. Timeout, output drain, teljes process-tree cancellation és bizonyított
   OS-szintű memória-korlát a subprocess-bounds task szerint.

### 4. REST profil

1. Destination tenant input helyett server-owned destination ID.
2. HTTPS, explicit port/path allowlist és redirect tiltás.
3. Saját `SocketsHttpHandler.ConnectCallback`: minden DNS resolution minden
   csatlakozásnál validált; csak az ellenőrzött IP-re csatlakozik.
4. Tiltandó legalább: loopback, unspecified, private/ULA, link-local, CGNAT,
   multicast, reserved/documentation és cloud metadata tartományok IPv4/IPv6-on.
5. DNS rebinding, több A/AAAA rekord, redirect és IPv4-mapped IPv6 regresszió.
6. Response body/output méretlimit, timeout, TLS policy és circuit breaker.

### 5. File-exchange profil

1. Converter helyett a hosting boundary adja a hitelesített tenant ID-t és a
   server-owned adapternevet; payload metadata nem authority.
2. Inbox/outbox fájlnév opaque correlation ID; canonical containment minden I/O-nál.
3. Tenant root és teljes szülőlánc reparse/symlink ellenőrzése; create/read verseny
   dokumentált platformmechanizmussal kezelve.

## Conformance tesztmátrix

- minden adapter–transport pár valid/invalid táblatesztje;
- config size/depth/schema/unknown-field és secret reference negatív esetek;
- resolver valóban a verziózott profilt használja, cache invalidationnel;
- CLI payload executable override hatástalan;
- executable symlink/world-writable/outside-root elutasított;
- REST DNS privát/loopback/ULA/metadata/rebinding/redirect tesztek;
- file reparse/traversal/cross-tenant tesztek Windows és Linux alatt;
- disabled vagy capability-hiányos profil automatikusan builtin fallback vagy
  explicit unavailable eredmény — a választott szerződés szerint auditálva.

## Elfogadási kritériumok

- [ ] Nincs értelmetlen adapter–transport kombináció.
- [ ] Resolver használja és validálja a teljes profilt; félkész config nem enabled.
- [ ] Tenant/payload nem választhat executable pathot vagy hálózati hostot.
- [ ] Secret reference működik, plaintext és logleak tesztek zöldek.
- [ ] CLI/REST/file conformance suite külön és teljes Cutting suite-ban zöld.
- [ ] Security capability hiányában production startup/activation fail-closed.
- [ ] Maker és adversarial reviewer külön agent.

## Stop / eszkaláció

- Ha nincs platform secret provider vagy OS resource governor, az érintett profil
  maradjon disabled; ne készüljön ideiglenes plaintext/best-effort út.
- Ha a vendor csak HTTP-t, dinamikus executable-t vagy privát hálózati címet kér,
  külön, elfogadott threat-model/ADR nélkül nem aktiválható.
