# Door Manufacturing több-bérlős SaaS — staging audit és első védelmi szelet

**Dátum:** 2026-08-12
**Hatókör:** Doorstar Instance, Flow Lab, Calculation Lab; kizárólag staging és kanonikus publikus edge. A doormanufacturing.demo.joinerytech.hu demóhoz nem történt módosítás.

## Eredmény röviden

Az Instance staging izoláltan és loopbacken fut, a kanonikus hostból viszont eddig a szintetikus demó statikus assetjei is elérhetők voltak. Ez összemosta a jövőbeli valódi hostot és a demó kiadást, ezért a kanonikus hostot visszaállítottuk fail-closed állapotba. A valódi több-bérlős adatút aktiválása még blokkolt: az Instance kiadott artefaktuma hash-elt, de nem vezethető vissza tiszta, privát Git release baseline-ra; a teljes tenant-owned legacy aggregate/RLS átvezetés sincs bizonyítva.

## Végrehajtott, visszaállítható védelmi változás

**Cél:** a doormanufacturing.joinerytech.hu ne szolgáljon ki demó Instance, Flow vagy Calc assetet, és ne legyen alkalmazás/BFF/lab ingress, amíg a tenant-, auth- és két-bérlős E2E-kapuk nem zöldek.

| Tétel | Érték |
| --- | --- |
| Módosított VPS fájl | /etc/nginx/sites-available/doormanufacturing |
| Előző konfiguráció SHA-256 | 108171c69010306ccd686289c964f64ef414798103acc0669b1272ae1e4f0fcb |
| Új konfiguráció SHA-256 | 5e8eed9047f7bdc3c4768e8bd62c1215387a0139c20dad9f83742c51622b6395 |
| Rollback mentés | /var/backups/doorstar-nginx/20260812T092708Z-canonical-fail-closed/doormanufacturing |
| A külön demó-vhost SHA-256 | változatlan: 804ef155fb3bcd475df1c451eca66976a95f7dd29094f65e97fa9b5c860febe9 |

A kanonikus vhost már nem hivatkozik /var/www/doormanufacturing-demo alá, és nincs benne proxy_pass.

### Utóellenőrzés

Az Nginx szintaxis-ellenőrzése és reloadja sikeres volt. Külső, hostname-validált ellenőrzésből:

| URL | Várt | Mért |
| --- | ---: | ---: |
| https://doormanufacturing.joinerytech.hu/ | 503 | 503 |
| /flow, /flow/ | 503 | 503 |
| /calc, /calc/ | 503 | 503 |
| /assets/demo.js | 404 | 404 |
| /api/production/instance-context | 404 | 404 |
| /healthz | 204 | 204 |

A külön szintetikus host változatlanul működik: doormanufacturing.demo.joinerytech.hu root/Flow/Calc felületei 200-at adnak. Ez nem az Instance, Flow vagy Calc staging backendje, és a kanonikus hostnak nincs rá proxyja.

**Rollback (csak indokolt esetben):**

~~~
ssh joinerytech-vps \
  'sudo cp --preserve=mode,ownership,timestamps \
  /var/backups/doorstar-nginx/20260812T092708Z-canonical-fail-closed/doormanufacturing \
  /etc/nginx/sites-available/doormanufacturing && \
  sudo nginx -t && sudo systemctl reload nginx'
~~~

## Mért staging állapot

### Doorstar Instance

- systemd: doorstar-instance-staging.service, aktív, csak 127.0.0.1:4614; a service MainPID és a listener PID egyezett az auditkor;
- GET /healthz és GET /readyz: 200;
- token nélküli GET /api/production/bff/session: 401;
- token nélküli GET /api/production/instance-context: 401;
- kiadott futtatási mód: tenant-context-only; legacy production route-ok nem váltak elérhetővé;
- a futtatási szerződés RS256, kiadott issuer/audience, tid tenant claim és rövid token-élettartam használatára van konfigurálva; browser-token nincs a publikus edge-en;
- elkülönített staging PostgreSQL: 127.0.0.1:5464, Docker health zöld;
- release artefaktum: /opt/doorstar-staging/releases/20260812T012500Z-instance-root-surface-candidate. A teljes manifest ellenőrzött SHA-256 értéke d2d9399488f10f95b64e2c434f38956e5730bedc04fa445dc1b75fddc3de8a4c, az overlay manifesté e393be302ce9e78b31adca61113dd8293ebb12f3df1c71cee6d39c25a472ad6b. A manifest-ellenőrzés, az artefaktum buildje, célzott unit tesztjei és statikus edge gate-je zöldek.

### Flow és Calculation Lab

- Calc replay PostgreSQL elkülönítve, loopbacken fut (127.0.0.1:5465), de Calculation Lab staging alkalmazás-service nincs aktiválva.
- Flow gateway replay PostgreSQL elkülönítve, loopbacken fut (127.0.0.1:5466). A replay proof artefaktum hash-elt és a kontrollált PostgreSQL-restart bizonyítéka zöld, de nincs telepített Flow staging service és a konténer systemd tulajdonosi/lifecycle bizonyítéka hiányos.
- Flow clean integrációs jelölt helyben 6552f2a5de1d, de nincs a privát remote-on rögzített, reprodukálható release-ként; a fő Flow worktree dirty.
- Calc privát replay-store baseline: e088dcef37da, de ez önmagában csak replay-védelmi szelet, nem tenant-katalógus/RLS bizonyíték.

## Miért nem alkalmaztuk az Instance BFF-migrációt

Az izolált DB-n a 20260812010000_spaceos_oidc_bff_instance_surface Prisma migráció még pending. Szándékosan nem alkalmaztuk, mert az alábbi kapuk nem teljesültek:

1. Az Instance artefaktumot nem egy tiszta, privát Git commit/annotált release tag azonosítja. A lokális Instance fa 541 dirty/untracked bejegyzést mutat, tehát sem a main, sem a lokális fa nem deploy-forrás.
2. A migráció a BFF-surface-et készíti elő, nem az összes legacy tenant-owned aggregate tenant-dimenzióját és FORCE RLS policy-jét.
3. Nincs bizonyított két-tenant PostgreSQL teszt a tényleges, nem-tulajdonos, NOBYPASSRLS app szereppel: hiányzó context, cross-tenant read/write, hamisított header, station-scope, compound unique és pool-reuse esetekre.

Ennek megfelelően a következő biztonságos lépés **nem** a migráció futtatása, hanem a kiadási integritás lezárása:

1. a Doorstar Instance valódi privát source baseline-jának tulajdonosi azonosítása és immutable remote branch/tag rögzítése;
2. commit-, dependency lock-, build- és konfigurációs hash felvétele egy release recordba;
3. az N5/RLS döntés és a teljes tenant-migrációs terv elfogadása;
4. csak ezután: staging DB backup + célzott BFF-migráció + két-bérlős, pool-reuse PostgreSQL bizonyítás.

## Kapcsolódó kapuk

- [Doorstar-lánc integrációs terv](DOORSTAR_CHAIN_INTEGRATION_PLAN_2026-08-10.md)
- EPIC-DOORSTAR-CHAIN-2026Q3 / DSC-00 (repo-biztosítás)
- DSCONV-03 és DSCONV-GATE-SECURITY (JWT, tenant, station policy)
- DSCONV-10 (hosting/RLS/release gate)

_Ez a dokumentum a 2026-08-12-i read-only audit és a fenti Nginx hardening evidence-e. Nem production go/no-go, nem Keycloak-, tenant- vagy adatmutációs jóváhagyás._
