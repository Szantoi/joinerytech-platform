# SpaceOS — Az ipar digitális gerince

## Vízió, eredmények és lehetőségek

> Hogyan digitalizáljuk a magyar faipar értékláncát

**2026. április | v1.0 | Belső dokumentum**

---

## A probléma, amit megoldunk

A magyar faipar — ajtógyártók, szekrénygyártók, lapszabászok, beszerelők — ma döntő többségében Viber-üzenetekkel, Excel-táblázatokkal és telefonhívásokkal koordinálja a munkáját. Egy ajtórendelés útja a megrendeléstől a beszerelésig akár 5–6 különböző szereplőn halad keresztül, és minden lépésnél manuális adatbevitel, telefonos egyeztetés és papíralapú dokumentáció történik.

Ez nem csupán lassú — ez rendszeres hibaforrás. Rossz méret, elveszett rendelés, duplikált számítás, hiányzó anyagok. Az ipar szereplői nem azért nem digitalizáltak, mert nem akarnak, hanem mert nem létezik az ő igényeikre szabott, megfizethető megoldás.

> **A SpaceOS erre az űrre épül:** egy iparspecifikus SaaS platform, amely a faipar teljes értékláncát egyetlen, összekapcsolt digitális ökoszisztémába szervezi.

---

## A víziónk

A SpaceOS célja, hogy a faipar digitális gerincévé váljon. Nem egy újabb általános célú projektmenedzsment eszköz — hanem egy olyan rendszer, amely érti az ipar nyelvezetét, érti a termékek geometriáját, és összekapcsolja azokat a szereplőket, akik ma elszigetelten dolgoznak.

### Mit jelent ez a gyakorlatban?

- **Egyetlen platform, sok szereplő.** Az ajtógyártó, a szekrénygyártó, a lapszabász, a kereskedő, a szállító és a beszerelő mind ugyanazon a platformon dolgozik, de mindenki csak a saját nézőpontját látja.
- **Automatikus számítás.** A rendszer a megrendelés adataiból automatikusan kiszámolja az anyagszükségletet, a szabászlistát, a gyártási tervet — emberi beavatkozás nélkül.
- **Kapcsolat a cégek között.** Egy lapszabász szolgáltató egyetlen kattintással fogadhat megbízást egy ajtógyártótól. A rendszer kezeli az adatcserét, a jogosultságokat és a nyomon követést.
- **Mesterséges intelligencia beépítve.** Az AI segíti a rendelés felvételét, a termékválasztást és a konfigurációt — természetes nyelven, akár telefonon keresztül is.

---

## Hol tartunk ma

A SpaceOS fejlesztése 2025 ősze óta tart. Nem papírtervről beszélünk: a rendszer működik, tesztelve van, és az első éles ügyfélre — a Doorstar Kft.-re — való telepítés előkészítése zajlik.

| Metrika | Érték | Kontextus |
|---|---|---|
| **Automata tesztek** | 1570+ | Mind zöld, 0 hiba |
| **Kész modulok** | 6 | Ajtó, szabászat, B2B, audit, térkez., konfig. |
| **Szereplő-típusok** | 6 | Gyártó → Megrendelő teljes lánc |
| **Kódbázis** | 4+2 repo | Kernel, Portal, Orchestrator, Modulok |

### Főbb mérföldkövek

| Időszak | Eredmény | Jelentősége |
|---|---|---|
| 2025 Q4 | Kernel alaprendszer (Clean Architecture, DDD) | Ipari szintű architektúra, ami skálázható |
| 2026 Q1 | Tér- és időkezelés, audit lánc, WORM bizonyítéktár | Hitelesség és nyomon követhetőség |
| 2026 Q1 | Multi-brand portál — egy kódbázis, több márka | Egyetlen rendszer kiszolgál különböző iparágakat |
| 2026 Q1 | Ajtógyártás modul (Modules.Joinery v1) | Első teljes iparági vertikum: konfigurálás → gyártás |
| 2026 Q2 | Parametrikus terméktervezés (Graph Engine) | Univerzális motor: ajtó, szekrény, ablak egyaránt |
| 2026 Q2 | 6 aktor-típus, ökoszisztéma struktúra | Bármely faiparos cég regisztrálhat és kapcsolódhat |
| 2026 Q2 | Szabászat modul tervezés kész | Közös funkció: minden gyártó használja |

---

## Hogyan működik — egy valós példán

> **Példa: Doorstar Kft. — ajtógyártó**

1. **Rendelés felvétele:** A kereskedő vagy a megrendelő kiválasztja az ajtótípust, megadja a méreteket. A rendszer azonnal validálja a méreteket és jelzi, ha valami nem gyártható.
2. **Automatikus számítás:** A Graph Engine kiszámítja az összes alkatrész méretét, az anyagszükségletet, a szabászlistát és a vasalat-igényt. Nincs manuális Excel-számolás.
3. **Szabászat:** Ha a gyártó saját szabász géppel rendelkezik, az adat automatikusan átkerül. Ha külső lapszabász szolgáltatót vesz igénybe, a B2B kapcsolaton keresztül a megbízás egy kattintással továbbítható.
4. **Gyártás és nyomon követés:** A feladat végighalad a gyártási folyamaton. Minden lépés auditált és visszakövethető — ki, mikor, mit csinált.
5. **Pénzügyi biztonság (jövő):** Az Escrow funkció lehetővé teszi, hogy a kifizetés csak a teljesítés igazolása után történjen meg — mindkét felet védve.

---

## Az ökoszisztéma — nem egyetlen szoftver, hanem egy hálózat

A SpaceOS nem egyetlen cég belső szoftvere. Ez egy ökoszisztéma, amelyben különböző típusú faiparos cégek kapcsolódnak egymáshoz, miközben mindegyik a saját speciális nézetét és funkcióit használja.

| Szereplő | Mit csinál a platformon? | Kapcsolódik |
|---|---|---|
| **Gyártó** | Konfigurálja, kiszámolja és legyártja a terméket (ajtó, szekrény, ablak) | Lapszabász, kereskedő, szállító |
| **Lapszabász** | Fogadja a szabászati megbízásokat, optimalizálja a lapkiosztást, visszajelzi a teljesítést | Gyártók (bármennyi) |
| **Kereskedő** | Anyagot kínál, árakat kezel, szállítást szervez | Gyártók, logisztika |
| **Szállító** | Szállítási feladatokat fogad, státuszt jelent | Gyártó, kereskedő, beszerelő |
| **Beszerelő** | Helyszíni beszerelést regisztrál, teljesítést igazol | Gyártó, megrendelő |
| **Megrendelő** | Rendelést ad fel, nyomon követi a státuszt | Gyártó, beszerelő |

> **Kulcs felismerés:** A valós faiparban ugyanaz a cég egyszerre lehet gyártó és ügyfél. Egy szekrénygyártó ügyfele egy ajtógyártónak, de gyártója a saját megrendelőinek. A SpaceOS ezt a kettős természetet kezeli — kontextustól függően.

---

## Piaci lehetőségek

### Miért most?

- **Digitalizálatlan iparág.** A bútor- és asztalosipari KKV-k 90%+ ma Excel + telefon + papír alapon dolgozik. Nincs rájuk szabott, elérhető árú SaaS megoldás.
- **Generációváltás.** A faipar második-harmadik generációs tulajdonosai nyitottak a digitalizációra — de csak akkor, ha az az ő nyelvükön és az ő folyamataik mentén történik.
- **EU ipari digitalizáció.** Az Ipar 4.0 és a zöld átállás EU-s pályázati kerete egyre erősebb — a SpaceOS ezekbe a programokba illeszthető.
- **Hálózati hatás.** Minél több cég használja a platformot, annál értékesebb a B2B kapcsolatháló. Egy lapszabász, aki 10 gyártónak dolgozik, 10 cég adatkezelését egyszerűsíti.

### Célpiac mérete

| Szegmens | Leírás | Becsült méret (HU) |
|---|---|---|
| Ajtógyártás | Beltéri és bejárati ajtó gyártók | 200–400 cég |
| Szekrénygyártás | Beépített és szabadon álló bútor | 500–1000 cég |
| Lapszabász szolgáltatók | Vágás és élzárás szolgáltatás | 100–200 cég |
| Ablakgyártás | Műanyag, fa és alumínium nyílászáró | 300–500 cég |
| Kereskedők + szállítók | Alapanyag és logisztika | 200+ cég |

Csak Magyarországon **1300–2500 potenciális ügyfélcég** — a DACH régió és Kelet-Közép-Európa ennek a többszöröse. A platform architektúrája eleve többnyelvű és többmárkás, tehát a nemzetközi terjeszkedés nem újraírást, hanem konfigurációt jelent.

---

## Üzleti modell

| Bevételi forrás | Leírás |
|---|---|
| **SaaS előfizetés** | Havi/éves díj a platform használatáért — moduláris: a cég csak azt fizeti, amit használ (ajtó modul, szabászat modul, kereskedő modul). |
| **B2B tranzakciós díj** | A platformon keresztül lebonyolított B2B megbízások után jutalék (Escrow funkción keresztül). |
| **Prémium szolgáltatások** | AI-alapú optimalizáció (lapkiosztás), fejlett analitika, egyedi integráció. |
| **Ökoszisztéma hálózat** | Minél több cég csatlakozik, annál értékesebb a hálózat — klasszikus platform network effect. |

---

## Ütemterv

| Időszak | Mérföldkő | Üzleti hatás |
|---|---|---|
| **2026 Q2** | Doorstar Soft Launch — első éles ügyfél, teljes ajtórendelési folyamat | Proof of concept, valós visszajelzések |
| **2026 Q2–Q3** | Szabászat modul élesítés + második ügyfél onboarding | Első B2B tranzakció a platformon |
| **2026 Q3–Q4** | Szekrénygyártás modul + Escrow pénzügyi funkció | Második iparág lefedve; fizetési biztonság |
| **2027 H1** | 5+ éles ügyfél, teljes ökoszisztéma (6 szereplő-típus) | Network effect elindul |
| **2027 H2** | DACH régió belépés, többnyelvű portál | Nemzetközi terjeszkedés |

---

## Miért mi?

- **Iparspecifikus tudás beépítve.** Nem általános workflow tool — a rendszer érti az ajtó szerkezetét, a szekrény gravitációs szabályait, a szabászat optimalizálási kihívásait.
- **Parametrikus terméktervező motor.** A Graph Engine lehetővé teszi, hogy bármilyen bútortípust egyetlen univerzális rendszerben modellezzünk — nem kell minden termékhez külön fejlesztés.
- **Ökoszisztéma, nem sziget.** A legtöbb ipari szoftver egy cégen belül működik. A SpaceOS cégek közötti kapcsolatokat kezel — ez a valódi érték.
- **AI-natív architektúra.** A mesterséges intelligencia nem utólag lett ráépítve, hanem az első naptól az architektúra része. Természetes nyelven kezelhető, telefonon is elérhető.
- **Bizonyított technológia.** 1570+ automata teszt, ipari szintű biztonság (audit lánc, titkosítás, jogosultságkezelés), production-ready infrastruktúra.
- **Moduláris és skálázható.** Új iparág lefedése nem újraírást, hanem egy új modul hozzáadását jelenti. Új ország nem lokalizációt, hanem konfigurációt.

---

## Összefoglalás

A SpaceOS ma a legérettebb iparspecifikus SaaS megoldás a magyar faipar számára. Az architektúra felépült, a referencia modul (ajtógyártás) működik, az ökoszisztéma struktúra kész, és az első éles ügyfél belépése heteken belül várható.

A legnagyobb lehetőség nem egyetlen cég digitalizálása — hanem egy teljes iparág összekapcsolása. Amikor egy ajtógyártó, a lapszabásza, a kereskedője és a beszerelője egyaránt a platformon van, a rendszer többé nem pusztán szoftver: hanem az ipar infrastruktúrája.

> **A SpaceOS nem azt kérdezi, hogy „hogyan digitalizáljunk egy faiparos céget?" — hanem azt, hogy „hogyan kössük össze az egész ipart?"**

---

*SpaceOS — Vízió, eredmények és lehetőségek | 2026. április | v1.0*
*Készítette: SpaceOS Architect Team | Belső dokumentum*
