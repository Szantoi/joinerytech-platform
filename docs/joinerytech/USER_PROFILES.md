# USER_PROFILES.md — Célközönség & felhasználói profilok

> Kik használják a JoineryTech Portált, és mit várnak tőle. Ez vezérli a **modul-aktiválást** (mely világokat lát egy fiók) és a **jogosultságokat** (`portal.jsx`). A rendszer lényege: **ugyanaz a platform skálázódjon** az egy fős vállalkozótól a 20+ fős cégig — mindenki csak azt aktiválja, amire szüksége van.

_Utolsó frissítés: 2026-05-30_

---

## Vezérelv

A portál **egy közös ügymenetet** modellez (ajánlat → rendelés → tervezés → beszerzés → gyártás → kiszállítás), de **minden szereplő más szeletét** látja belőle. A méret és a szerep dönti el:
- **hány világ** aktív (kis cégnél kevés, összevont; nagy cégnél mind, részlegekre bontva),
- **ki mit tehet** (egy ember mindent, vagy feladatonként külön emberek külön jogokkal),
- **mennyit lát** az ügyfél (B2C: webshop-szintű; partner/viszonteladó: több).

A státusz-láncok (lásd `CLAUDE.md`) **mindenkinél ugyanazok** — csak a láthatóság és a jogosultság változik.

---

## A. Gyártó vállalkozások (méret szerint)

### A1. Egy fős vállalkozó — asztalos / összeszerelő / beszerelő
- **Egy ember mindent csinál:** felmérés, ajánlat, beszerzés, gyártás, beépítés, kapcsolattartás.
- **Igény:** maximális egyszerűség, mobil-első, minimális adminisztráció. Egy nézetben az egész: mit kell ma csinálni, mit kell rendelni, mennyiért vállalta.
- **Aktivált világok:** összevont — Értékesítés (ajánlat), Beszerzés (egyszerű), esetleg minimál Gyártás. **Nincs** részleg-bontás, nincs jóváhagyási lánc.
- **Jogosultság:** minden jog egy fióknál (ő a tulaj és a dolgozó is).

### A2. ~5 fős mikrovállalkozás
- **Egy tulaj mindent visz** (ajánlat, beszerzés, ügyfél), **1 segéd**, a többi **szerel / gépet kezel**.
- **Igény:** a tulaj kezében az üzleti rész, a műhely lássa a feladatait. Egyszerű munkamegosztás, de még kevés formális szerep.
- **Aktivált világok:** Értékesítés + Beszerzés + Gyártás/Üzem (a műhelynek). Raktár egyszerűsítve.
- **Jogosultság:** tulaj = teljes; dolgozók = csak gyártási/üzemi nézet, nincs üzleti/áras hozzáférés.

### A3. 10–20 fő — kialakuló részlegek
- **Külön emberek:** tervező, **értékesítési részleg**, **üzemvezető**, külön **beszerzés** és **raktározás**.
- **Igény:** a feladatok már szétválnak; kell az átadás-átvétel a részlegek közt (tervezés → gyártáselőkészítés → beszerzés → üzem). Megjelenik a jóváhagyás igénye.
- **Aktivált világok:** mind, részleg-szerepekre osztva.
- **Jogosultság:** szerep szerint — pl. értékesítő nem ad ki gyártásba, beszerző nem módosít ajánlatot.

### A4. 20+ fő — letisztult, részlegekre bontott cég
- **Minden feladatra 2–3 ember.** Tipikus részlegek:
  - **Belsőépítészeti tervezés** (saját)
  - **Műszaki tervezés**
  - **Gyártáselőkészítés**
  - **Üzemvezető + műhelyfőnök**
  - **Beszerelő részleg**
  - **Sales (értékesítők)**, **beszerzők**, **felmérők**
- **Igény:** erős szerepkör-kezelés, jóváhagyási láncok, párhuzamos projektek, mérhető átfutás. Az **audit / nyomon követhetőség** itt válik fontossá.
- **Aktivált világok:** mind, finom jogosultságokkal; több ember azonos szerepben.

---

## B. Tervezők / belsőépítészek

### B1. Belsőépítész — 1–2 fő
- **Terveznek, megrendelnek, értékesítenek, projektet meneszelnek** — egyszerre alkotó és koordinátor.
- **Igény:** a tervtől az ügyfél-kommunikációig egy helyen; gyártót, beszállítót megrendel; az ügyfél felé ő a kapcsolattartó.
- **Aktivált világok:** Tervezés + Értékesítés (ajánlat/projekt) + a partnerek (gyártó/beszállító) felé **megrendelői** szerep.

### B2. Nagyobb belsőépítész iroda — 5+ fő
- **Sok párhuzamos projekt**, több tervező, projektmenedzsment.
- **Igény:** projekt-portfólió nézet, erőforrás/ütemezés, több gyártóval és szakággal párhuzamosan.

### B3. ⚠️ Belsőépítész mint szakág-koordinátor (kulcs-felismerés)
A belsőépítészetnek **sok más szakágat kell összefognia**, amelyek munkájától **függ a bútor beépítésének időpontja**:
- **víz** kiállás, **áram** kiállás, **szellőzés**, **gépészet**.
- **Igény a rendszertől:** a projektnek legyenek **függőségei / mérföldkövei** más szakágakhoz kötve — a bútorbeépítés dátuma **ezektől függ**. (→ lásd Tervezett funkciók: projekt-függőségek, ütemezés.)

---

## C. Kereskedelmi / részfeladatos cégek

### C1. Lapszabászat — 5–10 fő
- **Raktározás, sales, beszerzés, értékesítés, megmunkálás** (szabás, élzárás).
- **Igény:** bejövő megmunkálási megrendelések kezelése, anyag a raktárból vagy beszerezve, gyors árajánlat lapból + szolgáltatásból.
- **Aktivált világok:** Raktár + Beszerzés + Értékesítés + Üzem (megmunkálás). **Nincs** komplex belsőépítészeti tervezés.

### C2. Vasalat-kereskedő — 5–10 fő
- **Sales, raktár, beszerzés, értékesítés.**
- **Igény:** katalógus-alapú értékesítés, készlet, beszerzés a gyártóktól. A gyártó cégek **beszállítójaként** is megjelenik (B2B kapcsolat a platformon belül).
- **Aktivált világok:** Raktár + Beszerzés + Értékesítés (Bolt/katalógus). **Nincs** gyártás.

---

## D. Magánszemélyek (ügyfelek)

### D1. Önállóan intéző magánszemély
- **Saját maga rendel** és intézi a kapcsolattartást a gyártóval/kereskedővel.
- **Igény:** webshop-szintű egyszerűség — válogat, rendel, követi az állapotot, üzenget. (Ez a **B2C / `webshop.jsx`** profil.)
- **Aktivált:** csak a webshop; egyszerűsített állapot-idővonal.

### D2. Belsőépítészt megbízó magánszemély
- **Nem maga intézi** — egy belsőépítészre bízza a projektet.
- **Igény:** áttekintő, „hol tart a projektem" szintű rálátás; a részleteket a belsőépítész (B1/B2) kezeli. A magánszemély a **belsőépítész ügyfele**, a belsőépítész a gyártó ügyfele → **B2B2C lánc**.

---

## Hogyan képződnek le a rendszerre

| Profil | Tipikus aktivált világok | Jogosultság-jelleg |
|---|---|---|
| A1 egy fő | Értékesítés, Beszerzés (összevont) | minden jog egy fióknál |
| A2 ~5 fő | + Gyártás/Üzem | tulaj=teljes; dolgozó=üzem |
| A3 10–20 fő | mind, részlegekre | szerep szerint korlátozva |
| A4 20+ fő | mind, finom bontás | erős szerep + jóváhagyás + audit |
| B1 belsőépítész 1–2 fő | Tervezés, Értékesítés + megrendelői | alkotó + koordinátor |
| B2 iroda 5+ | + projekt-portfólió | több tervező, PM |
| C1 lapszabászat | Raktár, Beszerzés, Értékesítés, Üzem | részfeladatos |
| C2 vasalat-keresk. | Raktár, Beszerzés, Értékesítés (Bolt) | kereskedelmi; B2B beszállító |
| D1 magánszemély | webshop | rendelés + követés |
| D2 belsőépítészt megbíz | áttekintő (B2B2C) | korlátozott rálátás |

> A jelenlegi demó-fiókok (belső / B2B / viszonteladó / B2C) ezeknek a **kezdő leképezései**. A cél: bármely fenti profil **felvehető** legyen a megfelelő világ- és jogosultság-kombinációval.

---

## Ebből fakadó, még nyitott rendszerigények

1. **Projekt mint összefogó egység** (főleg belsőépítésznél): több bútor-tétel + **más szakágak** (víz/áram/szellőzés/gépészet) **függőségként**, amitől a beépítés dátuma függ.
2. **Ütemezés / mérföldkövek** a függőségekkel — mikor kezdhető a gyártás, mikor a beépítés.
3. **B2B2C lánc kibontása:** magánszemély → belsőépítész → gyártó/kereskedő, mindenki a maga nézetével.
4. **Platformon belüli partner-kapcsolatok:** egy cég beszállítója egy másik, itt regisztrált cég (pl. vasalat-kereskedő ↔ gyártó) — a megrendelés a partner rendszerébe érkezzen igényként.
5. **Szerep-sablonok** a méret szerint (A1…A4), hogy egy új cég gyorsan a profiljához illő alapbeállítást kapjon.
