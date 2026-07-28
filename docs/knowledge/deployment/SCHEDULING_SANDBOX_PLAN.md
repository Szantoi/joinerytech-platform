# Scheduling sandbox — TERV (PLAN-03 M3, 2026-07-28)

> **Ez terv, nem élesítés.** Semmi nincs telepítve, DNS-bejegyzés nincs kérve,
> a VPS-en nem futott parancs. **Az élesítés Gábor-kapu** — a lenti lépések
> csak az ő kifejezett jóváhagyása után indulhatnak.

## 1. Mire való

A Doorstar a `spaceos.scheduling` read-kontraktusból generál klienst. A generált
kliens **fordul** attól, hogy a spec helyes — de azt nem bizonyítja, hogy a
platform ugyanazt is *adja vissza*. A sandbox az a hely, ahol a Doorstar
integrációja végpontról végpontig kipróbálható **éles ügyféladat nélkül**.

Nem cél: teljesítménymérés, terheléses teszt, éles adat próbája, írás-API.

## 2. Amit kiszolgál

Kizárólag a publikált read-kontraktus (ADR-069 §6, 8 GET-végpont) a
`/api/scheduling/v1` alatt, plusz az anonim `/health`. Írás nincs — az M3
scope-ja read-only, és a sandboxban ez egyben **biztonsági korlát** is: amit
nem lehet írni, azt nem lehet elrontani sem.

## 3. Topológia

| Elem | Döntés | Indok |
|---|---|---|
| Hostnév | `scheduling-sandbox.joinerytech.hu` | külön név, hogy soha ne keveredjen éles végponttal |
| Futtatás | dedikált systemd unit a VPS-en, saját porton | a 11 meglévő spaceos-service mintája; nem nyúlunk hozzájuk |
| Adatbázis | **külön PostgreSQL adatbázis**, saját szerep | nem külön séma: egy elrontott sandbox-migráció így nem érhet éles adathoz |
| DB-szerep | nem-superuser, `NOBYPASSRLS` | ugyanaz a szerep-profil, amit az RLS-proof bizonyít |
| TLS | Caddy/nginx reverse proxy, Let's Encrypt | a meglévő minta |
| Hozzáférés | Keycloak sandbox-realm vagy dedikált kliens | **`Jwt:Mode=Development` TILOS** — az minden hívót hitelesít |

## 4. Bérlő és adat

- **Egy** demo-bérlő, a `enabled_modules`-ban `spaceos.scheduling`-gal.
  Enélkül minden kérés 403 — ez a fail-closed kapu, nem hiba.
- Seed: a **v1 és v2 Doorstar input-packből** származtatott terv (ugyanazok a
  hash-pinnelt fájlok, amiken a kompatibilitási kapu fut), plusz egy naptár
  kivétellel és egy szándékosan **karanténba tett** standard-revízió.
  A karantén azért kell, mert a Doorstar kliensének a hiányzó normát is
  kezelnie kell — sandboxban olcsó megtanulni, éles indulásnál drága.
- **Éles ügyféladat nem kerül bele semmilyen formában** (anonimizálva sem:
  egy anonimizálási hiba pont az a hibaosztály, amit nem akarunk megtanulni).

## 5. Menet (jóváhagyás után)

1. DB + szerep létrehozása, `dotnet ef database update` a sandbox connection stringgel.
2. RLS-ellenőrzés a helyszínen: a proof-suite `(a)`–`(h)` tényei a sandbox
   adatbázison is lefutnak — **ha bármelyik bukik, nincs indulás**.
3. Seed-script futtatása (idempotens, újrafuttatható).
4. Unit + proxy + TLS, majd `/health` ellenőrzés.
5. **Füst-próba a generált TS-klienssel**, nem curl-lel: pont azt az utat
   mérjük, amit a Doorstar használni fog.
6. Doorstar értesítése federation-csatornán (base URL + demo-bérlő + token-igénylés módja).

## 6. Leállítás / visszavonás

`systemctl stop` + a DNS-rekord visszavonása + a sandbox-DB eldobása. Mivel
külön adatbázis és külön szerep, a visszavonás nem érint semmilyen éles
komponenst. A sandbox **eldobható** — ez tervezési tulajdonság, nem véletlen.

## 7. Nyitott kérdések Gáborhoz

1. Kaphat-e a sandbox saját Keycloak-realmet, vagy az éles realmben kap egy
   dedikált klienst? (A saját realm tisztább, de több üzemeltetés.)
2. A `scheduling-sandbox.joinerytech.hu` DNS-rekordot ki hozza létre?
3. Publikus legyen, vagy csak Tailnet-en (100.82.133.87) érhető el? A Tailnet
   szűkebb, és a Doorstar-oldali fejlesztéshez elég lehet.

— backend terminál (Claude)

---

## GÁBOR-DÖNTÉSEK (2026-07-28, root közvetítette)

1. **Keycloak:** dedikált kliens az ÉLES realmben (külön audience-szel);
   saját sandbox-realm majd a Keycloak Postgres-migrációja után mérlegelhető.
2. **Elérhetőség: Tailnet-only** (100.82.133.87) — publikus DNS-rekord
   egyelőre NEM szükséges; ha később publikusra bővül, a DNS-t Gábor hozza
   létre.
3. Az élesítés (VPS-műveletek) továbbra is Gábor-kapu — a terv e döntésekkel
   végrehajtásra kész az M3-verdikt után.
