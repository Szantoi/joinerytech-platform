# Élő auth- és RLS-felmérés (VPS) — 2026-07-25

> **Kiadta:** root terminál — 2026-07-25
> **Módszer:** read-only SSH a `joinerytech-vps`-re (systemd, curl, `psql`
> lekérdezések; semmilyen mutáció). Minden alábbi állítás **saját mérés**, nem
> agent-jelentés — épp azért készült, mert egy felmérő agent két állítása
> tévesnek bizonyult (lásd 4. pont).

## 1. Mi fut ma élesben

11 SpaceOS-service + Keycloak: `kernel`, `cutting`, `joinery`, `inventory`,
`procurement`, `abstractions`, `identity`, `sales`, `orchestrator`,
`knowledge`, `minio`.

**A hét ERP-modul (CRM, Kontrolling, HR, Maintenance, QA, EHS, DMS) közül
EGYIK SEM fut a VPS-en.** Ez több korábbi kockázat-értékelést átminősít.

## 2. Keycloak — verzió és következmény

| Tény | Érték |
|---|---|
| Verzió | **24.0.0** (`/opt/keycloak-app`, `keycloak-core-24.0.0.jar`) |
| Útvonal-prefix | **`/auth`** (`http://localhost:8080/auth/realms/spaceos` → 200; prefix nélkül 404) |
| Realm-modell | **egyetlen realm** (`spaceos`); a bérlő a tokenből jön (`tid` + `spaceos_tenants`) |

**Következmény:** a Keycloak **Organizations** funkciója (org → domain →
per-tenant IdP-föderáció) a **26-os** vonalban jelent meg — **nálatok ma NINCS**.
Ha egy ügyfél a saját Entra/Google IdP-jével akar belépni, az a mai verzióval
csak kézi identity-provider-konfigurációval megy, nem szervezeti modellként.

Az egyetlen realm + claim-alapú bérlő viszont **helyes minta** a célskálán
(1300–2500 cég); a realm-per-tenant nem skálázna. Tehát nem a modell rossz,
hanem a verzió öreg.

## 3. Élő RLS-szerepek (port 5433, a valódi SpaceOS-példány)

```
rolname                     rolsuper  rolbypassrls
postgres                    t         t      <- admin, nem app
gabor                       f         f
identity_app                f         f
spaceos                     f         f      <- a fő app-szerep: HELYES
spaceos_freetier            f         f
spaceos_keycloak_user       f         f
spaceos_sales_app           f         f
spaceos_sales_worker        f         f
spaceos_inventory_worker    f         t      <- ⚠ BYPASSRLS
spaceos_procurement_worker  f         t      <- ⚠ BYPASSRLS
```

**Jó hír, és ez ELSŐ ÉLŐ BIZONYÍTÉK:** a futó modulok app-szerepei
`NOSUPERUSER` **és** `NOBYPASSRLS` — a `STAB-RLS-PROOF` eddig csak
Testcontainers-környezetre bizonyította az izolációt, most az élesre is áll.

**Új lelet:** **két worker-szerep `BYPASSRLS` jogú**
(`spaceos_inventory_worker`, `spaceos_procurement_worker`). Nem superuser, de a
row-level security **rájuk nem érvényes**. A repóban **sehol nincs
dokumentálva**, hogy ez szándékos-e (0 találat a szerepnevekre és a
`BYPASSRLS`-re a scripteken/ADR-eken kívül). A `STAB-RLS-PROOF` stop-klauzulája
épp ezt az esetet nevezi blokkolónak — igaz, app-szerepekre. Külön task:
**`STAB-RLS-WORKER-BYPASS`**.

## 4. Két korábbi állítás, ami NEM állja meg a helyét

Egy felmérő agent „legnagyobb kockázatként" azt jelentette, hogy *„a HR és a DMS
élesben `postgres` superuserrel csatlakozik"*. A mérés szerint:

1. **A HR és a DMS nem fut a VPS-en** (nincs ilyen systemd-unit).
2. A `spaceos_hr` / `spaceos_dms` **adatbázis nem is létezik** a valódi
   példányon (5433). Az appsettings a **docker**-példányra (5432) mutat, ahol
   viszont **`postgres` nevű szerep sincs** — a connection string ott
   authentikáció-hibával elszállna.

Vagyis a superuser connection string **nem éles rés**, hanem **repo-alapértelmezés**,
ami az ELSŐ deploynál válna azzá. Javítva ebben a körben (2 fájl + szerep-script),
de a súlyossága P1, nem P0-incidens. **Az agent-jelentést nem szabad
mérés nélkül kockázatként továbbadni** — ez a felmérés pontosan ezért készült.

## 5. Amit ebből érdemes csinálni

| # | Lépés | Miért |
|---|---|---|
| 1 | `STAB-RLS-WORKER-BYPASS` — a két worker-szerep `BYPASSRLS`-ének tisztázása (szándékos? korlátozható?) | ma dokumentálatlan, és a policy nem véd ellene |
| 2 | Keycloak **24 → 26+** upgrade-döntés | Organizations (per-tenant SSO) + 2 évnyi CVE-lemaradás |
| 3 | HR/DMS app-szerep tényleges provisionálása deploy előtt | a `CHANGE_ME` jelszó szándékosan fail-fast |
| 4 | A `spaceos_hr`/`spaceos_dms` külön adatbázis vs. közös `spaceos` séma döntés | ma 3 különböző DB-modell fut egyszerre (Gábor döntése) |
