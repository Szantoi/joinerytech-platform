# CODEX Terminal TODO

> **Frissítve:** 2026-08-14
> **Első olvasmány új chatben:** `AGENTS.md`, `QUALITY.md`, `terminals/codex/STATE.md`,
> `AGENT-CHANNEL.md` vége, `terminals/root/TODO.md`, majd friss `git status --short`.

## Review-ra vár / döntésre blokkolt

- [ ] Root-review: `ERPSEP-FE-WORLD-GATING` P1/P2 javító kör — 5 fájl / 26
      teszt, lint és build zöld. A Joiner utódvilága (`production` vagy
      `settings`) külön nyitott termékdöntés; az üres rács nincs tesztelvárásként
      rögzítve.
- [ ] Root-review: `ERPSEP-06 / DevelopmentIdentityOptions.EnabledModules` — 76 hosting teszt,
      Maintenance host build zöld; két kötelező guard teljesül.

## Csak felhatalmazás után

- [ ] Instance Context futó endpoint: kizárólag Kernel `EntitledModules` igazságforrás,
      brand/entitlement tulajdonos és ADR-döntés után. Addig csak a meglévő OpenAPI draft
      review-ja kezelhető.
- [ ] Következő új fejlesztési szeletet a root aktuális TODO/AGENT csatornája alapján válassz;
      ne nyúlj a frontend vagy backend aktív fájlhatáraihoz kiosztás nélkül.

## Higiénia

- [ ] Ne stagingelj/commitolj vegyes working tree-ből, nincs `git add -A`.
- [ ] A root eltávolította a korábbi 10:05-ös duplikátumot. Új AGENT állapotot csak
      friss, egyedi EOF-konteksszel fűzz a fájl végére.

## 2026-08-13/14 — recovery és release-kapu sorrend

- [x] Ne prune-old és ne használd újra az eltűnt worktree-metaadatot. Készíts három új,
      elkülönített recovery clone/worktree könyvtárat a megmaradt branch-refekből.
- [x] A fenti STATE-ben felsorolt JSONL naplókból időrendben csak a sikeres
      `apply_patch` hívásokat játszd vissza; az eredeti abszolút worktree-prefixet cseréld
      a recovery könyvtárra. Architecture, Portal és Kernel recovery kész; Kernel 325/325.
- [x] Kernel: ellenőrizd újra a globális `SubjectHash` unique indexet, tiltsd az
      `X-SpaceOS-Active-Tenant` selector headert az online authority/admin útvonalakon,
      utasítsd el a duplikált JSON propertyket, és tiltsd a 0001/0002 tenant ID-t a
      handoff producerben/validatorban.
- [x] Portal: állítsd helyre az onboarding UX-et, a `kind: Module|CustomerProduct`
      szerződést, az exact Manufacturer-only Doorstar opciót és az egy-entry-s
      `spaceos_tenants` fail-closed auth profilt; futtasd újra a focused suite/build/lintet.
- [x] Platform hostok: állítsd helyre a hét host online Kernel-authority wiringját,
      ADR-073/074-et, state/TODO/memory dokumentációt és a 188/188 + 7 host build kaput.
- [x] Doorstar: elsőként futtasd újra a legutolsó három hardening módosítás után a
      `tsc`, focused suite-okat, teljes unitot, buildet, Prisma validate-et és
      `git diff --check`-et; kérj új független security review-t.
- [x] Cross-repo golden Portal–Kernel–Doorstar permission/landing contract és
      független P0/P1 review lezárva.
- [ ] Valódi PostgreSQL RLS/projection, Keycloak provider/mapper, dual-audience token,
      két-tenant/revoke böngészős E2E és rollback külön, emberileg jóváhagyott release-szelet.
- [ ] Külön DB-felhatalmazással takarítsd a helyi
      `doorstar_test_vitest_39180_d8ff2fc44f2a412486ca6cc5a6a79cc2` tesztsémát,
      majd igazold a hiányát; addig ne indíts Doorstar integrációs Vitest configot.
- [ ] Nincs commit/push/deploy/VPS/Keycloak/DB művelet külön Gábor-jóváhagyás nélkül.

## 2026-08-14 - Plant/Doorstar isolated proof follow-up

- [x] Prove Kernel Migration 0038 Up/Down on isolated PostgreSQL 16; 1/1 PASS.
- [x] Prove the Plant and Doorstar local database slices: Plant full 213/213
      with DPEX 1/1 and tenant/RLS 4/4; Doorstar migration/direct-write/lease/
      Prisma matrix 20/20; independent P0/P1 0/0.
- [ ] Repeat Plant Migration 005 DPEX proof on an independently restored copy,
      then retain WAN/power-loss and final backup/restore evidence.
- [ ] Complete real Keycloak/OIDC/JWKS service registry, fresh-token/revoke,
      online membership/version, exact resource binding, route/worker mount,
      monitoring/reconciliation and explicit human cutover before activation.
- [ ] With separate exact DB authorization, verify and remove both named local
      Doorstar test schemas; do not enumerate or delete broader database state.
