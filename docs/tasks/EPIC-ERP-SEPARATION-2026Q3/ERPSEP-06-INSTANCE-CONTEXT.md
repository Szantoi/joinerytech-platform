# ERPSEP-06 — hitelesített Instance Context API és portálkompozíció

- **Epic:** EPIC-ERP-SEPARATION-2026Q3
- **Szerep:** backend/frontend/security
- **Prioritás:** P1
- **Státusz:** blocked
- **Függőség:** ERPSEP-02, MODULE-PACKAGES
- **Mutációs határ:** Kernel/platform API, auth/context contract és portal shell
- **Tiltott scope:** ERP-domain, Doorstar brand vagy station konfiguráció,
  tetszőleges runtime scriptbetöltés

## Cél és üzleti eredmény

A portál hitelesített runtime kontextusból kapja az aktív tenantot, platform- és
modulverziókat, entitlement/enabled állapotot, permissiont, brandet,
terminológiát és feature flageket. A JWT csak stabil identity/auth claimet visz.

## Kötelező kimenet

- OpenAPI 3.1 `GET /api/platform/instance-context`;
- backend query/endpoint és fail-closed authz;
- Orval kliens és shell registry;
- cache, ETag/invalidation és brand fallback szabály;
- negative-path security tesztek.

## Megvalósítási lépések

1. Írd meg a specifikációt és security threat boundaryt.
2. A kontextust szerveroldali tenantból és aláírt katalógusból állítsd össze.
3. Kösd össze a known/installed/entitled/enabled/permission kapukat.
4. A portal route, navigation és world registry ebből épüljön.
5. Direkt URL és direkt API esetén is legyen backend tiltás.
6. Token/entitlement változásra definiálj invalidációt.

## Teszt- és bizonyítékterv

```powershell
dotnet test <instance-context-test-project>
cd src/joinerytech-portal
npm test
npm run build
```

## Elfogadási kritériumok

- [ ] Disabled, unentitled és permission nélküli modul nem használható.
- [ ] Kliens által küldött tenant/module/role header nem source of truth.
- [ ] Ismeretlen manifest vagy brand fail-closed/fallback viselkedése tesztelt.
- [ ] A portal hardcoded role–world lista nélkül kompozícióképes.
- [ ] OpenAPI és generált kliens drift-checkje CI-ben futtatható.

## Stop / eszkaláció

Az ADR-065 elfogadása vagy a brand/entitlement tulajdonos nélkül csak OpenAPI
draft készülhet, implementáció nem.

## Végrehajtási napló

_Az agent tölti ki._

## Átadási bizonyíték

_OpenAPI hash, backend/FE teszt, security negative-path riport._

