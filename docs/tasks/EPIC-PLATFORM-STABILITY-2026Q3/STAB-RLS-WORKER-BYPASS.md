# STAB-RLS-WORKER-BYPASS — két élő worker-szerep megkerüli a row-level security-t

- **Szerep:** backend-security / infra
- **Prioritás:** P1
- **Státusz:** pending
- **Forrás:** [`LIVE_AUTH_AND_RLS_ASSESSMENT_2026-07-25.md`](../../knowledge/architecture/LIVE_AUTH_AND_RLS_ASSESSMENT_2026-07-25.md) 3. pont
- **Mutációs határ:** a két érintett modul (`spaceos-modules-inventory`,
  `spaceos-modules-procurement`) worker-kódja és a VPS szerep-jogosultságai.
  **Jogosultság-módosítás az éles adatbázison CSAK Gábor jóváhagyásával.**

## A lelet (élő mérés, 2026-07-25)

```
spaceos_inventory_worker    rolsuper=f   rolbypassrls=t
spaceos_procurement_worker  rolsuper=f   rolbypassrls=t
```

A többi élő login-szerep (`spaceos`, `identity_app`, `spaceos_sales_app`,
`spaceos_sales_worker`, `spaceos_freetier`, `spaceos_keycloak_user`) helyesen
`NOSUPERUSER`/`NOBYPASSRLS`.

`BYPASSRLS` mellett a `FORCE ROW LEVEL SECURITY` policy **nem érvényesül** — a
szerep minden bérlő minden sorát látja. A repóban **sehol nincs dokumentálva**,
hogy ez szándékos-e: a szerepnevekre és a `BYPASSRLS`-re 0 találat van a
kódban/ADR-ekben (csak a proof-task és a teszt-kommentek említik az elvárt
`NOBYPASSRLS`-t).

## Miért most fontos

A közös SpaceOS-adatbázisba több cég adata kerül (ez a kimondott cél). Ott az
egyetlen elválasztó réteg a sor-szintű policy. Egy `BYPASSRLS` szerep bármely
hibája (hiányzó `WHERE`, SQL-injekció, elrontott háttérjob) **az összes bérlő
adatát** eléri. Amíg nincs tisztázva, hogy a két worker miért kapta meg ezt,
addig a „több cég egy adatbázisban" ígéret nem teljes.

## Amit el kell dönteni / tisztázni

1. **Szándékos-e?** Egy háttér-worker gyakran keresztbérlős feladatot végez
   (pl. összesítés, karbantartás). Ha igen: hol van ez kimondva, és milyen
   korlátok között fut?
2. **Kiváltható-e?** Alternatívák, csökkenő jogosultság szerint:
   - a worker bérlőnként futtat (bérlő-ciklus, `tid` beállításával) →
     `BYPASSRLS` nem kell;
   - dedikált, szűk `SECURITY DEFINER` függvények a keresztbérlős
     részfeladatra, a worker maga marad `NOBYPASSRLS`;
   - marad a `BYPASSRLS`, de **külön szerep** csak arra a néhány műveletre,
     és a fő worker-szerep visszaszorítva.
3. **Bizonyíték:** akármelyik irány, a végén ugyanaz a mérés fusson le, mint
   ebben a felmérésben, és kerüljön be egy visszatérő ellenőrzésbe.

## Elfogadási kritérium

- [ ] Kódból bizonyítva, MELYIK worker-művelet igényel keresztbérlős olvasást
      (fájl:sor), vagy hogy egyik sem.
- [ ] Döntés rögzítve (Gábor), a fenti három irány valamelyike szerint.
- [ ] A végállapot mérve: `SELECT rolname, rolsuper, rolbypassrls …` kimenete a
      task naplójában, elvárt értékkel.
- [ ] A `STAB-RLS-PROOF` bizonyítéka kiegészítve az ÉLŐ szerepekkel (eddig csak
      Testcontainers-környezetre állt).
- [ ] Visszatérő ellenőrzés: a szerep-jogosultság mérés bekerül egy
      health/smoke scriptbe, hogy egy jövőbeli `ALTER ROLE` ne maradjon némán.

## Stop / eszkaláció

Éles jogosultság-módosítás (`ALTER ROLE … NOBYPASSRLS`) **csak Gábor
jóváhagyásával** — ha egy worker valóban keresztbérlős olvasásra épül, a
visszavonás leállíthatja a háttérfolyamatot.
