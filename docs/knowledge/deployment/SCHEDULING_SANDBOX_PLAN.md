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
| Elérhetőség | **Tailnet-only** (100.82.133.87), publikus DNS nincs | Gábor-döntés; a Doorstar-oldali fejlesztéshez elég, és a támadási felület nulla marad |
| TLS | a Tailnet saját titkosítása; publikus proxy nem kell | publikus végpont nélkül a Let's Encrypt-kör felesleges mozgó alkatrész lenne |
| Hozzáférés | **dedikált Keycloak-kliens az ÉLES realmben, saját audience-szel** | Gábor-döntés; saját sandbox-realm a Keycloak Postgres-migrációja után mérlegelhető |
| Auth-mód | **`Jwt:Mode=Development` TILOS** | az minden hívót hitelesít — sandboxban is éles auth-út fut |

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
4. Keycloak: dedikált kliens az éles realmben, **saját audience-szel**, és a
   demo-bérlő `enabled_modules`-ában a `spaceos.scheduling`. A host oldalán
   `Jwt:Audience` erre az audience-re áll — külön audience nélkül egy másik
   szolgáltatásnak kiállított token is elfogadásra kerülne itt.
5. Unit indítása, **kizárólag a Tailnet-címre kötve** (nem `0.0.0.0`): a
   kötési cím az elsődleges védelem, a tűzfal csak a második.
6. `/health` ellenőrzés, majd — a CLAUDE.md szabálya szerint — a futó PID
   egyeztetése a service MainPID-jével.
7. **Füst-próba a generált TS-klienssel**, nem curl-lel: pont azt az utat
   mérjük, amit a Doorstar használni fog. Két esetnek kötelezően zöldnek kell
   lennie: az entitlement nélküli hívás 403, a karanténba tett standard pedig
   olvasható és karanténként jelenik meg.
8. Doorstar értesítése federation-csatornán (base URL + demo-bérlő + token-igénylés módja).

## 6. Leállítás / visszavonás

`systemctl stop` + a DNS-rekord visszavonása + a sandbox-DB eldobása. Mivel
külön adatbázis és külön szerep, a visszavonás nem érint semmilyen éles
komponenst. A sandbox **eldobható** — ez tervezési tulajdonság, nem véletlen.

## 7. A három nyitott kérdés — ELDŐLT

Mindhárom megválaszolva (Gábor, 2026-07-28; a szó szerinti döntés a doksi
végén). A terv törzse — topológia és menet — már ezekkel van írva, tehát
végrehajtásra kész: a hostnév helyett Tailnet-cím, TLS helyett a Tailnet saját
titkosítása, auth-ban dedikált kliens saját audience-szel.

Egy következmény, amit érdemes látni: **publikus DNS nélkül a `Host` fejlécre
épülő reverse-proxy réteg kiesik**, és vele a hozzá tartozó tanúsítvány-
megújítás is. Ez kevesebb mozgó alkatrész, nem kevesebb védelem — a
hitelesítés, a bérlő-feloldás és az RLS ugyanúgy fut, mint élesben.

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
