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

---

## Kiegészítés (2026-07-27, root) — élő Keycloak-realm felmérés

Az élő `spaceos` realm (joinerytech.hu/auth, Keycloak `/auth` relatív úttal fut
— a kcadm-hívásokhoz ez kell, e nélkül minden hitelesítés AUTH_FAIL) állapota:

1. **Mindössze 2 felhasználó van:** `anna.kovacs` (anna.kovacs@joinerytech.hu)
   és `demo`. A korábbi, `spaceos_keycloak` DB-ből listázott ~19 doorstar-user
   egy MÁSIK (régi/leszerelt) Keycloak-példány adatbázisából származik — a
   futó realm nem tartalmazza őket. Deploy/audit-tanulság: a szerep- és
   user-állításokat a FUTÓ realm admin-API-jából kell igazolni, nem a
   DB-ből találomra.
2. **A `portal-app` kliens helyesen konfigurált:** publikus, standard flow,
   redirect URI-k `https://joinerytech.hu/*` ÉS `http://localhost:*/*`.
   → A CLAUDE.md-ben évek óta szereplő „Keycloak localhost redirect URI
   hiányzik, ezért kell a VITE_AUTH_MODE=mock dev-bypass" adósság
   **elavult** — lokálisan is lehet valódi Keycloak-login.
3. **ADÓSSÁG (termékesítés-kritikus): a felhasználókon nincs `tid`
   attribútum, és a realmben nem létezik `Admin`/`Designer`/`Joiner` szerep** —
   csak `default-roles-spaceos`. Következmény: sikeres bejelentkezés után a
   portál `tenantId = null`, `roles = []`, `enabledModules = []` értékkel
   fut; a bérlő-kötött világ-szűrés (ERPSEP-FE-WORLD-GATING) fail-closed
   viselkedése miatt ilyen tokennel a felhasználó alig látna valamit.
   → A claim-oldal (tid + realm-szerepek + enabled_modules mapper) felvétele
   a world-gating ELŐFELTÉTELE, és a Doorstar-onboarding része.
   Kapcsolódó, korábban rögzített lelet: a hosting `TenantResolver`
   szerver-oldalon eldobja az `enabled_modules` claimet (PLAN-01 audit).
4. Jelszó-kezelés: az `anna.kovacs` fiók jelszava 2026-07-27-én root által
   ideiglenes jelszóra állítva (kötelező csere első belépéskor), Gábor kérésére.
   A jelszó-érték NEM került repóba.

### Élő Keycloak-konfiguráció változás (2026-07-27, root, Gábor kérésére)

Tünet: sikeres bejelentkezés után a portál világ-rácsa ÜRES.
Gyökérok (kódból): `HomeScreen.tsx:23-30` — `getVisibleWorlds(roles)` a Keycloak
realm-szerepekből dönt (Admin/Designer/Joiner), ismeretlen szerepnél
**üres listát** ad vissza. A realmben viszont EGYETLEN ilyen szerep sem
létezett (csak `default-roles-spaceos`), tehát minden felhasználó üres
rácsot kapott — az élő rendszer így nem volt használható.

Elvégzett, visszafordítható konfiguráció (kcadm, `/auth` relatív úttal):
1. `Admin`, `Designer`, `Joiner` realm-szerepek létrehozva a `spaceos` realmben.
2. `Admin` szerep hozzárendelve az `anna.kovacs` felhasználóhoz.
3. A `portal-app` kliensre két protocol mapper felvéve (eddig NULLA mappere
   volt): `tid` (user attribútum → `tid` claim) és `enabled_modules`
   (multivalued user attribútum → `enabled_modules` claim). Ezek a portál
   `parseUserClaims` (AuthContext) elvárt claim-jei.

NYITVA (Gábor-döntés): az `anna.kovacs` felhasználón a `tid` attribútum
ÉRTÉKE nincs beállítva — a `Tenants` táblában ma a "Doorstar Kft."
(a1b2c3d4-e5f6-7890-abcd-ef1234567890, EnabledModules={door,cutting}) az
egyetlen valós, modulokkal rendelkező bérlő; nincs külön JoineryTech-bérlő.
Egy platform-tulajdonosi fiók ügyfél-bérlőhöz kötése adat-hozzáférési
döntés, ezért root nem hozta meg. Amíg nincs `tid`, a portál felülete
látszik, de a bérlő-kötött adathívások kontextus nélkül futnak.

Termékesítési tanulság: a szerep-/claim-oldal (realm-szerepek + tid +
enabled_modules mapper) az ERPSEP-FE-WORLD-GATING KEMÉNY előfeltétele, és
az ügyfél-onboarding kötelező lépéslistájának része kell legyen
(ma egyik sem volt provisionálva — a Doorstar-élesítés előtt ez blokkoló).

### Elvégzett provisioning + bizonyíték (2026-07-27 éjjel)

- `anna.kovacs`: `Admin` realm-szerep + `tid` =
  `11111111-2222-4333-8444-555555555555` + `enabled_modules` attribútum.
- Új bérlő a Kernel DB-ben: **„JoineryTech Kft. (demo)"** (Gábor döntése:
  ne az ügyfél-bérlőhöz kössük a tulajdonosi fiókot).
  **ÉLŐ MEGERŐSÍTÉSE AZ ADR-067 LELETNEK:** a 7 ERP-modulkulcs
  (crm/kontrolling/hr/…) beszúrása a `validate_enabled_modules_for_type()`
  DB-triggerbe ütközött — a Kernel modul-szótára KIZÁRÓLAG iparági kulcsokat
  ismer (Manufacturer → {door,cabinet,window,cutting,spatial}). A bérlő
  ezért ezzel a készlettel jött létre. Ez pontosan az ADR-067 „Kernel-allowlist
  vs portal enabled_modules diszjunkt" pontja, most éles adaton igazolva —
  a legacy→kanonikus migrációs tábla (ADR-067) nélkül a tenant-kötött
  világ-szűrés nem implementálható konzisztensen.
- `spaceos` realm user-profile: `unmanagedAttributePolicy` = `ADMIN_EDIT`
  (eddig nem volt; enélkül a `tid`/`enabled_modules` attribútum NEM tárolható).
- Végponttól végpontig bizonyítva egy eldobható próbafiókkal (utána törölve):
  a token tartalmazza `realm_access.roles=[Admin]`, `tid`, `enabled_modules`.
- Buktató a jövőbeli onboardinghoz: `firstName`/`lastName` nélkül a KC24
  `VERIFY_PROFILE` required actiont tesz a fiókra, és a bejelentkezés
  „Account is not fully set up" hibával áll meg.

### ÚJ, SÚLYOS PRODUCTION-LELET: a Keycloak beágyazott H2-n fut

`/opt/keycloak-app/conf/keycloak.conf`-ban NINCS `db`/`db-url` beállítás, az
egység `kc.sh start`-tal indul, és az adat a
`/opt/keycloak-app/data/h2/keycloakdb.mv.db` fájlban él (1,4 MB, aktívan írva).
A Postgres `spaceos_keycloak` adatbázis (19 user, köztük a doorstar-fiókok)
egy KORÁBBI telepítés maradványa — a futó rendszer nem használja.
Következmények: a Keycloak dokumentáció szerint H2 **nem támogatott
production**-ben (nincs biztonságos mentés/HA, sérülékeny a fájl-korrupcióra);
a felhasználó- és realm-adatok NINCSENEK a rendszeres Postgres-mentésben;
skálázás/újratelepítés esetén az identitás-adat elveszhet.
→ Doorstar-értékesítés ELŐTT rendezendő: migráció Postgresre + mentés.
Külön task-jelölt: STAB-KEYCLOAK-POSTGRES-MIGRATION.
