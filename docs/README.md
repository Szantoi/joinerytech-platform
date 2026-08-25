# JoineryTech dokumentáció

Ez a mappa a platform emberi olvasásra szánt dokumentációjának belépési pontja. A cél, hogy egy új fejlesztő vagy döntéshozó gyorsan megtalálja a megfelelő, kellően friss forrást anélkül, hogy dátumozott auditokból próbálná összerakni a jelenlegi állapotot.

## Ajánlott olvasási sorrend

1. [Projekt README](../README.md) — mi a JoineryTech és hogyan épül fel a workspace.
2. [Architektúra áttekintés](ARCHITECTURE.md) — komponens- és bizalmi határok.
3. [Fejlesztői útmutató](DEVELOPMENT.md) — checkout, futtatás, tesztelés, konfiguráció.
4. [Állapot és tervezés](STATUS.md) — melyik forrásból olvasd az aktuális munkát.
5. A szerepednek megfelelő részletes dokumentum az alábbi térképből.

## Melyik dokumentum mire való?

| Cél | Olvasd ezt | Életciklus |
|---|---|---|
| Aktuális program- és epic-státusz | [`EPICS.yaml`](../EPICS.yaml) | **Élő státuszforrás** |
| Műszaki minták, domain és rendszerszintű kontextus | [Knowledge index](knowledge/INDEX.md) | **Kanonikus technikai navigáció** |
| Döntési indok és kötelező architekturális irány | [ADR-index](knowledge/adr/README.md) | **Döntési forrás** |
| API-, modul- és release-szerződések | [Kontraktus-index](knowledge/contracts/README.md) | **Kanonikus szerződés** |
| Tenant-, auth- és deploy-műveletek | [Üzemeltetési index](knowledge/deployment/README.md) | **Operatív útmutató** |
| Fejlesztői task végrehajtása | [Task-protokoll](tasks/README.md) | **Végrehajtási dokumentáció** |
| Régi designok, prototípusok és screenshotok | [Legacy/prototípus korpusz](joinerytech/README.md) | **Történeti referencia** |

## Dokumentumok frissessége

Minden dokumentumot a szerepe alapján olvass:

- **Élő státuszforrás:** az `EPICS.yaml`. A státuszt nem egy régi checkpoint vagy README dönti el.
- **Kanonikus szerződés vagy döntés:** ADR, verziózott kontraktus, vagy az adott komponens forrása/README-je.
- **Dátumozott assessment, audit, QA- vagy release-evidence:** a megjelölt időpont állapotát dokumentálja. Jó bizonyíték, de nem helyettesíti az élő státuszt.
- **`archive/` és `docs/joinerytech/`:** megőrzött történet, prototípus vagy lezárt taskanyag. Ne kezeld automatikusan implementációs specifikációként.

## Szerep szerinti útvonalak

### Frontend

- [Portál README](../src/joinerytech-portal/README.md)
- [Frontend fejlesztési útmutató](DEVELOPMENT.md#portál)
- [Portál- és world-architektúra](knowledge/architecture/README.md#portál-és-worldök)
- [Design és frontend minták](knowledge/INDEX.md#minták-és-fejlesztési-szabványok)

### Backend és platform

- [Modul- és tenant-architektúra](ARCHITECTURE.md#bizalmi-határok-auth-tenant-rls)
- [Közös hosting szerződés](../src/spaceos-modules-hosting/README.md)
- [Domain modellek](knowledge/INDEX.md#domain)
- [Backend fejlesztési útmutató](DEVELOPMENT.md#net-modulhostok)

### Architektúra és termékdöntés

- [Architekturális dokumentumtérkép](knowledge/architecture/README.md)
- [ADR-index](knowledge/adr/README.md)
- [Modul- és termékhatárok](ARCHITECTURE.md#modulok-és-termékhatárok)
- [Élő epic-terv](../EPICS.yaml)

### Üzemeltetés és biztonság

- [Üzemeltetési dokumentumok](knowledge/deployment/README.md)
- [Szkriptek leírása](../scripts/README.md)
- [Identity/tenant szerződés](knowledge/architecture/KEYCLOAK_AUTHORITY_PROJECTION_AND_SERVICE_PRINCIPAL_2026-08-20.md)

Az utóbbi egy lokális, fail-closed szerződés; önmagában nem aktiválási vagy production-go jelzés.

## Karbantartási szabály

Új dokumentum létrehozásakor először döntsd el, hogy élő specifikáció, döntési rekord, futtatási útmutató vagy történeti evidence lesz-e. Ezt jelöld a bevezetőben, és ide vagy a megfelelő részindexbe vedd fel a linket. Így a következő olvasónak nem kell találgatnia a dokumentum hatályát.
