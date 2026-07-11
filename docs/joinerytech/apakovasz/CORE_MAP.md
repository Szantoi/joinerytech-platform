# CORE_MAP.md — A domén-független mag leválasztása (JoineryTech → Apakovász)

> **Cél (felhasználói irány, 2026-06-15):** bizonyítani, hogy a JoineryTech vállalatirányítási
> demo nem asztalos-specifikus, hanem egy **domén-független MAG** + cserélhető **domén-ADAPTER**
> + ügyfél-szintű **MÁRKA** réteg. A bizonyíték: egy kovászos pékség (**Apakovász / Bittó Tamás e.v.**)
> ugyanazokon a mag-primitíveken fut, ÚJ üzleti logika nélkül — csak konfiguráció + adapter.

Ez a dokumentum (1) megnevezi a mag-primitíveket, (2) megmutatja, miért domén-vakok,
(3) megfelelteti rájuk a pékséget, és (4) lefekteti a tényleges kód-szétválasztást,
amit az `apakovasz/` prototípus már fizikailag így épít fel (`core/` · `domain/` · `brand`).

---

## 0. A három réteg

```
┌───────────────────────────────────────────────────────────────────────┐
│  BRAND   (ügyfelenként cserélhető)                                     │
│  szín · logó · hangnem · persona — Apakovász: meleg kovász-tónusok     │
├───────────────────────────────────────────────────────────────────────┤
│  DOMAIN ADAPTER   (ágazatonként cserélhető)                            │
│  termék/recept szótár · műveletek · állomás-típusok · seed adat        │
│  asztalos: szabászat/élzárás/CNC     pékség: dagasztás/kelesztés/sütés │
├───────────────────────────────────────────────────────────────────────┤
│  CORE   (minden ágazatra közös, domén-VAK)                            │
│  FSM-motor · véges kapacitás-ütemező · BOM-robbantás/MRP · raktár     │
│  (lot/zóna/mozgás) · rendelés-pipeline · feladat-aggregátor · store   │
└───────────────────────────────────────────────────────────────────────┘
```

A kulcs-teszt minden mag-primitívre: **„Ki tudom-e mondani a nevét és a viselkedését
egyetlen asztalos/pékség szó használata nélkül?"** Ha igen → CORE. Ha nem → ADAPTER.

---

## 1. A mag-primitívek (CORE) és pékség-megfeleltetésük

| # | CORE primitív | Mit csinál (domén-vakon) | JoineryTech (asztalos) | **Apakovász (pékség)** |
|---|---|---|---|---|
| 1 | **FSM-motor** (`makeFSM`) | állapot + engedélyezett átmenetek + guard + indok | rendelés, ajánlat, gyártási feladat | **sarzs** (sütési tétel), rendelés, szállítmány |
| 2 | **Kapacitás-ütemező** (`CapacityEngine`) | „bucket"-ök napi órakerettel; terhelés, ütközés, kihasználtság | gépek (szabász, CNC) napi óra | **sütők** napi kapacitás (kemence-óra, tepsi-hely) |
| 3 | **Művelet-útvonal** (`RouteEngine`) | termék → rendezett műveletsor, per-művelet idő | szabászat→élzárás→szerelés | **dagasztás→kelesztés→formázás→sütés→hűtés** |
| 4 | **BOM-robbantás + MRP** (`BomEngine`) | termék→alkatrész/alapanyag szorzás; igény − készlet = rendelendő | bútor→lap/vasalat | **recept→liszt/víz/só/kovász** mennyiség |
| 5 | **Raktár** (`InventoryEngine`) | lot/zóna/mozgás; foglalás; készlet-csökkenés gyártásra | lap/vasalat raktár | **alapanyag-raktár** (liszt-silók, hűtő, fagyasztó) |
| 6 | **Rendelés-pipeline** (`order` FSM) | rendelésre gyártás VAGY készletről foglalás | egyedi bútor / webshop | **előrendelt termék / pultos készlet** |
| 7 | **Telephely-mozgás** (`TransferEngine`) | két telephely közti folyamatos készlet-átadás | üzem→bemutatóterem | **üzem→bolt** napközbeni szállítás |
| 8 | **Feladat-aggregátor** (`unifiedTasks`) | kereszt-modul „mit kell ma csinálni" lista | minden világ nyitott teendői | hajnali mise-en-place, hiányzó sütések |
| 9 | **Persistens store** (`makeStore`) | localStorage + verzió + akció-diszpécser + React-kötés | `window.sim` | `window.bakery` |

### Miért domén-vakok? (a 3 legfontosabb)

**Kapacitás-ütemező** — a JoineryTech `ProdSchedEngine`-je `stations`-t ismer `dailyHours`
kerettel, és `dayLoad`/`capacityOf`/`conflicts`/`utilization` függvényeket számol. Sehol nem
mond „fűrész" vagy „CNC" szót — csak *bucket + óra + foglalás*. Egy sütő ugyanúgy egy bucket
napi kemence-órával. **Egyetlen kódsor változtatás nélkül ütemez sütőt.**

**BOM-robbantás** — „termék → (alkatrész × darab)" rekurzió. Hogy az alkatrész egy fiókoldal
vagy 0,5 kg liszt, az a motornak közömbös; az MRP (`igény − készlet = rendelendő`) tiszta
aritmetika. A **„rendelések+trendek alapján mennyi alapanyagot rendeljek"** igény = klasszikus
MRP a recept-BOM-on.

**FSM-motor** — `{ states, transitions, guard }`. A „sütés nem sikerült" nem új fogalom: a
gyártási feladat `blokkolt`/selejt átmenetének pontos megfelelője. Ugyanaz a guard-olt
`setStatus(id, to, {reason})`.

---

## 2. Az ADAPTER felület (amit egy pékség kitölt)

A domén-adapter egyetlen **konfigurációs objektum** + seed. Nincs benne vezérlés-logika,
csak adat, amit a CORE motorok fogyasztanak:

```js
registerDomain({
  id: 'bakery',
  // 2.a Állomás-típusok a kapacitás-motornak (gépek helyett sütők)
  stations: [
    { id:'kemence-1', label:'Kőkemence', dailyHours: 20, kind:'sutes' },
    { id:'kemence-2', label:'Légkeveréses', dailyHours: 18, kind:'sutes' },
    { id:'dagaszto',  label:'Dagasztó',    dailyHours: 16, kind:'dagasztas' },
  ],
  // 2.b Műveletek (a RouteEngine lépései) — asztalos szabászat helyett ezek
  operations: ['dagasztas','kelesztes','formazas','sutes','hutes','csomagolas'],
  // 2.c Termék-katalógus + recept-BOM (a BomEngine tápláléka)
  products: [ { id, name, route:[op…], bom:[{ material, qty, unit }], shelfLife } ],
  // 2.d Alapanyag-törzs (az InventoryEngine tételei)
  materials: [ { id, name, unit, zone, stock, reorderPoint } ],
  // 2.e FSM-definíciók (a makeFSM-nek átadva)
  flows: { batch: {…}, order: {…}, delivery: {…} },
});
```

Egy **asztalos** adapter ugyanezt a kulcs-készletet tölti ki gépekkel/lapanyaggal;
egy **pékség** sütőkkel/liszttel. A CORE-ban **nincs `if(domain==='bakery')`**.

---

## 3. Pékség-specifikus FSM-ek (mind a közös `makeFSM`-ből)

### SARZS (sütési tétel) — `batch.status`
```
tervezett → bekeverve → kel → sül → kész        (fő ág)
                                  ↘ sikertelen   (← „a sütés nem sikerült", indok-kötelező)
sikertelen → tervezett                          (újrasütés)
```
A `sikertelen` a JoineryTech gyártási `blokkolt`/selejt pontos analógja: terminál-közeli,
indok-kötelező, és **kiveszi a termék várható bolti készletéből** (lásc Bolt napi nézet).

### RENDELÉS — `order.status` (változatlanul a CORE-ból)
```
draft → visszaigazolva → gyártásban → kész → átadva
```
Előrendelés (kovászos kenyér holnapra) → gyártásba kötve; pultos készlet → azonnal `kész`.

### SZÁLLÍTMÁNY (üzem→bolt) — `delivery.status`
```
összekészítés → úton → megérkezett
```
Napközben több kör; minden kör egy `TransferEngine` mozgás (üzem-zóna → bolt-zóna).

---

## 4. Az érték-láncok mint CORE-kompozíciók

| Pékség értéklánc | CORE-primitívekből összerakva |
|---|---|
| **Hajnali gyártás** (2-3h indulás) | RouteEngine (útvonal) + CapacityEngine (sütő-foglalás) + batch-FSM |
| **Üzem-terminál** (mit készítsek össze) | unifiedTasks ⨉ BomEngine (mise-en-place a recept-BOM-ból) |
| **Alapanyag-rendelés** (trend→MRP) | BomEngine.explode(Σ rendelés) − Inventory.stock = rendelendő |
| **Bolt napi nézet** (várható + hiány) | batch-FSM állapotok aggregálva termékenként; `sikertelen`→hiány |
| **Üzem↔bolt szállítás** | TransferEngine (folyamatos mozgások két zóna közt) |
| **Webshop** (rendelésre + foglalás) | order-FSM két belépővel (gyártásba / készlet-foglalás) |
| **Reggeliztetés / café** | order-FSM „helyben" csatornával (előkészítve, ebéd később) |

Egyetlen érték-lánchoz sem kellett ÚJ motor — mind a 9 CORE-primitív kompozíciója.

---

## 5. Fizikai kód-szétválasztás (az `apakovasz/` prototípusban)

```
apakovasz/
  core/
    core-fsm.js           # makeFSM — guard-olt állapotgép (domén-vak)
    core-capacity.js      # CapacityEngine — bucket + napi óra + ütközés
    core-bom.js           # BomEngine — robbantás + MRP
    core-inventory.js     # InventoryEngine — lot/zóna/mozgás/foglalás
    core-store.js         # makeStore — persistens store + React-kötés
  domain/
    bakery-domain.js      # az ADAPTER: sütők, műveletek, termékek, receptek, FSM-defek
    bakery-seed.js        # demó adat (egy reális Apakovász-nap)
  brand/
    apakovasz-brand.js    # MÁRKA: szín/hangnem/persona  (+ CSS változók a HTML-ben)
  ui/
    *.jsx                 # képernyők — CORE store-ból olvasnak, BRAND-del festve
  Apakovász Pékség.html   # belépő (mobil-első shell)
```

A `core/` fájlokban **nincs egyetlen pékség-szó sem** — szándékosan, hogy bizonyítható
legyen: ugyanezek a fájlok bemásolhatók egy asztalos vagy bármely más adapter mellé.
Ez a CORE_MAP a szerződés a rétegek között.
