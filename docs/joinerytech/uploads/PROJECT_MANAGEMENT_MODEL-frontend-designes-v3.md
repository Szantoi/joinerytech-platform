# PROJECT_MANAGEMENT_MODEL.md — SpaceOS projektmenedzsment
## Amit a Design chatnek tudnia kell — UX tervezéshez

> Ez a fájl a `CLAUDE.md`, `PROJECT_STATUS.md` és `USER_PROFILES.md` mellé tartozik.
> A SpaceOS projektmenedzsment modelljét írja le — a prototípus erre épüljön.

_Utolsó frissítés: 2026-05-31_

---

## Az alapgondolat

A SpaceOS **nem Jira-klón**. A projektmenedzsment itt B2B iparágban él: asztalosok,
gyártók, belsőépítészek, lapszabászok — akik egymás között is dolgoznak, nem csak
belső csapatban. A projekt tehát **keresztülmegy céghatárokon**.

Ez az egyetlen dolog ami mindent meghatároz.

---

## A hierarchia (fentről lefelé)

```
Program
  └── Projekt
        └── Mérföldkő
              └── Almérföldkő (opcionális)
                    └── Epik
                          └── Task
                                └── Subtask
```

### Mit jelent minden szint

**Program** — a legnagyobb egység. Egy hosszú életű üzleti cél, ami több projektből áll.
Példa: "Konyhabútor sorozat 2026" → több ügyfélprojektből áll.
Nem minden cégnek van programja — egy kis vállalkozónak általában nincs, ő projektekben gondolkodik.

**Projekt** — egy lezárható munkacsomag, jellemzően egy ügyfélhez vagy helyszínhez kötve.
Példa: "Nagy Anna — nappalibútor", "Bognár Bútor — Rákóczi út irodabútor".
Ez az egység, ahol a **B2B kézfogás (B2BHandshake) megtörténik** — ha egy külső cég
(pl. lapszabász) részt vesz a munkában, azt itt delegálják.

**Mérföldkő** — a projekt fő fázisai, sorrendben.
Példa egy ajtógyártónál: `Ajánlat → Felmérés → Gyártás → Beépítés → Átadás`
A mérföldkövek sorrendje **tenant-specifikus** — Doorstar más sorrendet használhat mint
egy lapszabász. A StageChain mechanizmus ezt kezeli.

**Almérföldkő** — opcionális, ha egy fázis tovább bontható.
Példa: "Gyártás" almérföldkövei → `Lapszabászat → Élzárás → CNC → Összeszerelés`
Nem kötelező szint — csak ha a komplexitás indokolja.

**Epik** — a **kulcsegység a SpaceOS-ban**. Ez a `FlowEpic` aggregate a rendszerben.
Egy epik = egy önálló, lezárható munkacsomag, ami egy munkaállomáshoz (WorkStation)
rendelhető, és **delegálható egy másik céghez** B2BHandshake-kel.

Példa: "Lapszabászat — Nagy Anna projekt" → ezt a gyártó kiadja a lapszabász cégnek.
A lapszabász a saját rendszerében látja, kezeli, visszajelzi. A gyártó látja az állapotát.

**Task** — az epiken belüli konkrét feladat. Egy emberre, egy napra méretezve.
Példa: "Frontlapok szabása — 2026-06-03 — Kovács Péter"

**Subtask** — ha egy task tovább bontható apró lépésekre.
Példa: "Frontlapok szabása" → `Anyag kivétel raktárból` + `Gép beállítás` + `Szabás` + `QC mérés`

---

## A kézfogás (B2BHandshake) — ez a SpaceOS különlegessége

Amikor egy epikot **egy másik cégnek adunk ki**, az nem e-mail, nem Viber-üzenet.
Ez egy platform-szintű delegáció:

```
Gyártó (Doorstar Kft.)
  → kiad egy Lapszabászat epikot
  → Profi Lapszabász Kft.-nek (aki szintén SpaceOS-t használ)

Profi Lapszabász Kft.
  → látja a saját rendszerében az epikot
  → elvégzi, visszajelzi: DONE

Doorstar Kft.
  → valós időben látja az állapotot
  → az epik automatikusan CLOSED_DONE-ra vált
```

**Ami a UX-ből fontos:**
- A delegált epik **mindkét cég projektjében látszik** — más-más nézettel
- A delegáló látja: `"Kiadva → Profi Lapszabász Kft. — Folyamatban"`
- A végrehajtó látja: `"Beérkezett megbízás — Doorstar Kft.-től"`
- Ha nincs kézfogás (a partner nem SpaceOS-t használ): **külső hivatkozásként** kezeljük,
  az állapotot manuálisan frissítik

---

## Az epik FSM (állapotgép)

Ez a legfontosabb szabály — **soha ne találj ki új státuszt**:

```
BACKLOG_READY → IN_DEV → IN_REVIEW → CLOSED_DONE
                                    → CLOSED_BLOCKED
```

| Státusz | Magyar jelentés | Ki lépteti tovább |
|---|---|---|
| `BACKLOG_READY` | Várakozik, elindítható | Üzemvezető / projektmenedzser |
| `IN_DEV` | Folyamatban | A végrehajtó (belső vagy delegált partner) |
| `IN_REVIEW` | Ellenőrzés alatt | Minőségellenőr vagy megrendelő |
| `CLOSED_DONE` | Lezárva — kész | Rendszer automatikusan / jóváhagyó |
| `CLOSED_BLOCKED` | Lezárva — blokkolt | Bárki, indoklással |

**Tiltott átmenetek (a gomb legyen lezárt, ne rejtett):**
- `BACKLOG_READY` → `CLOSED_DONE` (nem lehet kihagyni a munkafázisokat)
- `CLOSED_DONE` → bármi (lezárt epik nem nyitható vissza, csak új verziót lehet létrehozni)
- `IN_DEV` → `BACKLOG_READY` (visszalépés csak `CLOSED_BLOCKED`-on keresztül)

---

## Kinek mi a projekt — nézet-szétválás

A SpaceOS hat actor típust különböztet meg. Mindenki ugyanazt a projektet látja,
de **más szeletét, más jogosultsággal**:

| Actor | Mit lát | Mit nem lát |
|---|---|---|
| **Manufacturer** (gyártó) | Teljes projekt, minden epik, belső taskök, delegált epikök státusza | Partner belső taskjait |
| **Supplier** (lapszabász, anyagszállító) | Csak a nekik delegált epikök | A gyártó többi projektje |
| **Dealer** (viszonteladó) | Ajánlat, rendelés állapota, szállítás | Gyártási részletek, árak |
| **Installer** (beszerelő) | Beépítési epik, helyszín, határidő | Gyártási és kereskedelmi adatok |
| **Designer** (belsőépítész) | Projekt tételei, mérföldkövek, szakág-függőségek | Gyártási műhely-adatok |
| **Client** (ügyfél) | Egyszerűsített állapot-idővonal | Minden belső adat |

### A nézet-szétválás UX-szabálya

Ugyanaz az URL, más tartalom — az actor típusa és a B2BHandshake-kapcsolat
dönti el, mit lát valaki. **Nem különböző képernyők, hanem kontextus-szűrt nézetek.**

---

## A szabad de szabályok mentén növelhető elv

Ez a SpaceOS tervezési filozófia magja:

**Szabad:** Egy cég maga dönti el, hogy milyen mérföldköveket használ, milyen sorrendben,
hány almérföldkővel. Egy egyfős vállalkozónak lehet csak 3 lépés. Egy 20 fős cégnek lehet 8.

**Szabályok mentén:** Az epikokat és taskokat nem lehet "random" létrehozni.
- Egy epik csak egy létező mérföldkőhöz tartozhat
- Egy task csak egy epikhoz
- A delegáció csak igazolt B2BHandshake-en keresztül lehetséges
- Az állapot-átmenetek az FSM szerint haladnak — nem lehet `BACKLOG_READY`-ből
  egyből `CLOSED_DONE`-ra ugrani

**Növelhető:** A rendszer indul egyszerűen (1 cég, belső munkák, 3 mérföldkő),
és organikusan bővíthető (más cégekkel, több szinttel, analitikával) — anélkül,
hogy az alapstruktúra megváltozna.

---

## Skálázódás actor-típusonként

| Actor / méret | Tipikus hierarchia mélység | B2BHandshake? | Program szint? |
|---|---|---|---|
| A1 — egy fős vállalkozó | Projekt → Epik → Task | Ritkán | Nem |
| A2 — ~5 fős mikro | Projekt → Mérföldkő → Epik → Task | Esetleg | Nem |
| A3 — 10–20 fő | Projekt → Mérföldkő → Almérföldkő → Epik → Task | Igen | Ritkán |
| A4 — 20+ fő | Program → Projekt → mind | Igen, rendszeresen | Igen |
| B1 — belsőépítész | Projekt → Mérföldkő → Epik (szakágak) → Task | Igen (gyártó felé) | Esetleg |
| C1 — lapszabász | Projekt = Beérkezett megbízás → Epik → Task | Passzív fogadó | Nem |

---

## Amit a UX prototípusban modellezni kell

### 1. Hierarchia navigáció
A felhasználó bármely szintről navigálhat fel/le.
- Breadcrumb: `Program > Projekt > Mérföldkő > Epik`
- Kártyanézet és lista-nézet váltható minden szinten
- Mélység-limit vizuálisan jelzett (almérföldkő opcionális szint → más stílus)

### 2. Nézet-szétválás
Más fiók más szeletét látja ugyanannak a projektnek.
- Profilváltóval tesztelhető (jelenlegi demó-mechanizmus)
- A "látom / nem látom" logika a B2BHandshake-kapcsolaton és az actor-típuson alapul

### 3. Kézfogás UX
- Delegálás folyamata: epik kiválasztása → partner keresés → delegálás küldése → várakozás → visszajelzés
- Delegált epik kártyán: jelzés hogy "Külső partner végzi" + partner neve + státusz
- Beérkező delegáció: értesítés → elfogadás / visszautasítás → munkafelvétel

### 4. FSM szigor
- Tiltott átmenetek: a gomb **lezárt** (disabled + tooltip), nem rejtett
- Indoklás mező `CLOSED_BLOCKED`-nál kötelező
- `IN_REVIEW` státusznál a jóváhagyó actor típusa számít (nem bárki zárhatja le)

### 5. Skálafüggetlenség
Ugyanabban a UI-ban kezelhetők:
- Egyszerű projekt: 3 mérföldkő, 5 epik, 1 fő
- Komplex projekt: program, 8 mérföldkő, almérföldkövek, 3 delegált partner, 50+ epik

---

## Ami NEM a projektmenedzsment modul dolga

| Terület | Hol van |
|---|---|
| Ajánlat / árajánlat kezelés | Sales modul |
| Anyagkövetés, készlet | Raktár / Cutting modul |
| Számlázás | Külső integráció |
| Chat / kommunikáció | Comm Hub |
| AI asszisztens | Orchestrator |
| Gyártási gép-vezérlés | ShopFloor / Üzem |

A projektmenedzsment az **összefogó keret** — a többi modul eseményei
(pl. "ajánlat elfogadva", "anyag megérkezett") mérföldkő-átmeneteket triggerelhetnek,
de a projekt nem tartalmazza ezeket az adatokat, csak hivatkozik rájuk.

---

## Store-integráció a prototípusban

A meglévő `window.sim` store-ba így illeszkedik:

```
sim.programs[]          ← opcionális, csak A4 profilnál aktív
sim.projects[]          ← fő egység (már részben megvan page-projects.jsx-ben)
  .milestones[]         ← mérföldkövek (StageChain megfelelője)
    .subMilestones[]    ← opcionális almérföldkövek
      .epics[]          ← FlowEpic-ek (FSM: BACKLOG_READY → CLOSED_DONE)
        .tasks[]        ← taskök
          .subtasks[]   ← subtaskök
  .handshakes[]         ← B2BHandshake delegációk (delegált epik + partner + státusz)
```

**FSM-akciók (a meglévő setProjectStatus / setDependencyStatus mintájára):**
```
setEpicStatus(projectId, epicId, status)     ← FSM átmenet, validált
delegateEpic(projectId, epicId, partnerId)   ← B2BHandshake létrehozás
acceptDelegation(projectId, epicId)          ← partner oldal
createMilestone(projectId, data)             ← szabad mérföldkő-felvétel
```

**LS_KEY emelés szükséges** ha a projects séma bővül: `jt_sim_v6` → `jt_sim_v7`
