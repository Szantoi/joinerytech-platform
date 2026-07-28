# ADR-070: A `spaceos.scheduling` mag külső függőségei (solver és időkezelés)

- **Státusz:** **ELFOGADVA (Accepted) — 2026-07-28.** A D1/D2 döntések + a
  root-review két kötelező kiegészítése (determinizmus, supply-chain pin —
  a backend végre is hajtotta) érvényesek. A két nyitott kérdés Gábor
  ismételt „folytasd a termékesítést" felhatalmazása alapján a root
  ajánlásával zárult (Gábor bármikor felülbírálhatja, a változtatás olcsó):
  **Q1 RID-mátrix: linux-x64 (deploy) + win-x64 (fejlesztői) — arm64 később
  additív**; **Q2 bundle-plafon: nincs kemény plafon, de a manifest kötelezően
  kimondja a bundle-méretet, és 100 MB felett a solver külön-artefaktum
  kérdését újra kell nyitni.** Az M4 solver-munka ezzel feloldva.
- **Felvetette:** PLAN-03 M2 zárása; a root kérésére készült
  (`terminals/backend/inbox/2026-07-28_008_root-m2-valaszok.md`)
- **Szerep:** backend
- **Kötelező input (mind ellenőrizve):**
  - ADR-069 §4 (számítási szemantika), §5 (idő és naptár-policy), §11 (M4 hatóköre)
  - ADR-067 (modul-katalógus, manifest, bundle-aláírás — a csomagméret és a natív
    binárisok ide tartoznak)
  - `docs/knowledge/architecture/PLANNING_CAPABILITY_AUDIT_2026-07-27.md` §1.3
    (a Cutting mai tervező-magja: egy-erőforrású, naptár nélküli)
  - Doorstar referencia: `dependencyBaseline.ts` („a naptár/DST-konverzió a C# oldalé"),
    `calendarConfigPreflight.ts`
  - `Google.OrTools.runtime.linux-x64` 9.15.6755 — **25,22 MB**, `net8.0`, Apache-2.0

## Kontextus

Az M4 a naptár-tudatos, **véges kapacitású** ütemező. Ehhez két külső függőség merült fel,
és mindkettő **termék-szintű** következménnyel jár, nem implementációs részlet: az egyik a
telepíthető modul-bundle méretét és platform-mátrixát érinti (ADR-067 rezsim), a másik a
publikált OpenAPI-kontraktust és ezzel a Doorstar kliensgenerálását.

Ma a platform legérettebb tervező-magja a Cutting: **egy erőforrás, naptár nélkül** (audit
§1.3). Az M4 ennél lényegesen többet kér: több erőforrás, műszak/szünet/kivétel-naptár,
kapacitás-korlát, overload-számszerűsítés.

---

## D1 — Ütemező motor: **OR-Tools CP-SAT**, port mögé zárva

**Döntés:** az M4 a Google OR-Tools CP-SAT solverét használja (`Google.OrTools`, .NET),
de **kizárólag egy alkalmazás-rétegbeli porton keresztül** (`ISchedulingSolver`); a Domain
réteg solver-mentes marad, ahogy ma is (M1/M2: nulla külső függőség a Domainben).

### Alternatíva-mérlegelés

| Opció | Mellette | Ellene |
|---|---|---|
| **Saját CP/heurisztika** | nincs natív bináris, kicsi bundle, teljes kontroll | a véges kapacitás + naptár + FS/SS/FF/SF + partial release együtt **NP-nehéz**; a „jó" megoldás minősége hónapokban mérhető fejlesztés, és minden új korlát újraírás. A Cutting mai magja épp azért nem elég, mert egy-erőforrású. |
| **OR-Tools CP-SAT** | `AddNoOverlap` (diszjunktív erőforrás), `AddCumulative` (véges kapacitás), opcionális intervallumok (naptár-kivétel, zárás) — a mi korlátaink **natív primitívjei**; érett, Apache-2.0 | natív binárisok platformonként; nagyobb bundle; tanulási görbe a modellezésben |
| Timefold / OptaPlanner | erős domain-szótár, kiforrott | **Java/Kotlin és Python; .NET-kötés nincs** — külön futtatókörnyezetet és IPC-t igényelne. Kizárva. |

**Miért a port:** a solver-választás így visszafordítható. Ha az OR-Tools mérete vagy
platform-mátrixa később vállalhatatlan lesz, egy másik implementáció beköthető a domain és
a kontraktus érintése nélkül. A shadow/publish FSM, a revision-hash és a
függőség-precedencia **nem** a solver felelőssége — azok a Domainben maradnak, ahol ma is
tesztelve vannak.

### Következmények a csomagolásra (ADR-067)

- **Licenc:** Apache-2.0 — megengedő, a modul-bundle terjesztésével kompatibilis;
  a manifest `licenses` szakaszában feltüntetendő.
- **Natív binárisok:** a `Google.OrTools` metacsomag runtime-specifikus alcsomagokat húz
  be (`runtime.linux-x64`, `linux-arm64`, `win-x64`, `osx-*`). A linux-x64 önmagában
  **25,22 MB** — a modul-bundle mérete nagyságrendet ugrik, ami az ADR-067 aláírás- és
  disztribúció-tervét érinti (digest-számítás, letöltési idő, revocation-újratöltés).
  **Javaslat:** a deploy-célra szűkített RID (`linux-x64`) publikálása, nem a teljes mátrix.
- **⚠ Nyitott ellenőrzés a deploy előtt:** a NuGet-oldal **sehol nem dokumentál musl/Alpine
  támogatást**. Ha a modul konténer-image-e Alpine-alapú lenne, ez futásidőben,
  `DllNotFoundException`-nel derülne ki. Az M4 első lépése egy **smoke-teszt a tényleges
  base image-en** (a VPS ma Debian 13 — glibc, tehát várhatóan rendben, de mérni kell).

---

## D2 — Időkezelés: **NodaTime csak a domain belsejében**, a wire ISO-8601 + IANA zóna

**Döntés:** a naptár-számítás (műszak, szünet, kivétel, DST-átmenet) NodaTime-mal készül,
de a típusai **soha nem jelennek meg a publikált kontraktusban**. Az OpenAPI DTO-k
kizárólag:

- `string` időbélyeg **ISO-8601 / RFC 3339** formában, UTC-ben (`2026-07-28T06:00:00Z`), és
- `string` **IANA zóna-azonosító** (`Europe/Budapest`) ott, ahol a lokális értelmezés számít
  (naptár-profil, műszak-definíció).

A konverzió a határon történik (Application réteg), a Domain nem tud a wire-formátumról.

**Miért nem elég a `DateTimeOffset`:** csak egy **eltolást** ismer, zónaszabályokat nem.
Egy műszak azonban lokál időben definiált (07:00–16:00), és az óraátállítás hetében a
naptári nap nettó perceinek száma eltér — a `DateTimeOffset`-tel ez vagy elveszik, vagy
kézzel újraimplementált zóna-logikává fajul. Az ADR-069 §5 kimondottan a **magra** hárítja
a DST-konverziót, a Doorstar referencia (`dependencyBaseline.ts`) pedig explicit ki is
mondja, hogy a naptár/DST a C# oldal dolga. A NodaTime `ZonedDateTime` + `InZoneLeniently`
a hiányzó (tavaszi ugrás) és a kétszer létező (őszi visszaállás) helyi időt definiált
szabály szerint kezeli — ez a két eset ma sehol nincs lefedve.

**Miért nem szivároghat a kontraktusba:** a Doorstar generált TS-klienst épít az
OpenAPI-ból. Egy NodaTime-típus vagy annak szerializált alakja idegen sémát vinne a
kliensbe, és a platform belső könyvtár-választását tenné a kontraktus részévé — az ADR-067
verziózási elve pont ezt tiltja. Ezt **CI-őrrel** kell kikényszeríteni (a generált
OpenAPI-ban nem szerepelhet NodaTime-eredetű séma), ugyanúgy, ahogy a szótár-őr a faipari
szavakat tiltja a magban.

---

---

## D3 — Determinizmus (a root-review 1. kötelező kiegészítése)

**A probléma:** a CP-SAT több worker-szállal **nem determinisztikus** — ugyanarra a
bemenetre eltérő, de azonos költségű ütemtervet adhat, mert a szálak versenye dönti el,
melyik megoldást találja meg előbb. Ez nem elméleti kockázat nálunk: a
`ScheduleRevision.ContentHash` **a tartalomból** számolódik, tehát két azonos bemenetű
futás **eltérő hash-t** adna, a shadow↔published diff pedig zajt mutatna változás nélkül.
A Doorstar visszaidézi ezt a hash-t — egy „megváltozott" terv, ami valójában ugyanaz,
fölösleges jóváhagyási kört indítana.

**Döntés — alap-profil:**

- `random_seed` **rögzített** (konfigból, alapértéke fix), és
- `num_search_workers = 1`.

A párhuzamos keresés **opt-in**, és az azt használó futás eredménye a válaszban
**kimondottan „nem reprodukálható" jelölést kap** — nem szabad úgy tenni, mintha a
hash-e stabil identitás lenne.

**Kötelező teszt (a kompatibilitási kapu mintájára):** ugyanaz a bemenet kétszer
lefuttatva **ugyanazt a revision-hash-t** adja. A hash-oldali determinizmus (rendezés,
kultúrafüggetlenség, skála-normalizálás) ma már tesztelt; a solver-oldali determinizmus
az M4 kapujának része lesz.

**Miért nem elég a rendezés utólag:** két azonos költségű, de más művelet-kiosztású terv
tartalmilag különbözik — nincs olyan kanonikus rendezés, ami ezt eltüntetné. A
determinizmust a keresésnél kell kikényszeríteni, nem a hash-elésnél.

---

## D4 — Supply-chain rögzítés (a root-review 2. kötelező kiegészítése)

**Döntés — mindkét függőségre:**

| Elem | Rögzítés |
|---|---|
| `Google.OrTools` | pontos verzió-pin: **9.15.6755** (a runtime-alcsomagok ugyanerre) |
| `NodaTime` | pontos verzió-pin: **3.1.11** |
| Tranzitív gráf | **committed lockfile** minden projektben (`RestorePackagesWithLockFile`) |
| CI | `dotnet restore --locked-mode` — eltérés = build-bukás, nem csendes verzióváltás |
| Manifest | a bundle digestje a **natív runtime-binárisokra is** kiterjed (ADR-067 5. döntés: az aláírás a tartalmat fedi, nem csak a metaadatot) |

**Végrehajtva (2026-07-28):** a `spaceos-modules-scheduling` repóban a lockfile-ok
generálva és commitolva (Domain / Infrastructure / 3 teszt-projekt), a CI restore
`--locked-mode`-ban fut.

**Miért lockfile és nem csak verzió-pin:** a közvetlen hivatkozás pinelése a *tranzitív*
gráfot nem rögzíti. Egy natív binárisokat szállító modulnál egy elmozduló tranzitív
csomag a bundle digestjét is elmozdítja — vagyis az aláírt tartalom változna meg úgy,
hogy egyetlen commit sem utal rá.

---

## Következmények

- **Pozitív:** az M4 nem saját solver-fejlesztéssel indul; a naptár-helyesség (DST) egy
  bizonyítottan karbantartott könyvtárra épül, nem házi zóna-logikára.
- **Pozitív:** a determinizmus-klauzulával a revision-hash megmarad stabil identitásnak,
  és a shadow-diff valódi különbséget jelez, nem solver-zajt.
- **Semleges:** a Domain réteg mindkét döntés után **külső függőség nélkül** marad; a
  solver és a NodaTime az Application/Infrastructure rétegben él.
- **Negatív / kockázat:** a bundle-méret ugrik (natív binárisok), és az Alpine/musl kérdés
  a deploy előtt mérendő. Ha a válasz nemleges, a base image kötött (glibc), ami
  üzemeltetési megkötés — ezt a manifestben ki kell mondani.

## Nyitott kérdések (root/Gábor)

1. **RID-mátrix:** elég-e a `linux-x64` (+ fejlesztői `win-x64`), vagy kell `linux-arm64`
   is? Ez közvetlenül a bundle méretét szorozza.
2. **Bundle-méret plafon:** van-e felső korlát, ami fölött az ADR-067 disztribúció-terve
   módosul (pl. a solver külön, lazán betöltött artefaktum)?
3. **A solver-döntés az M4 kapuja** (root levele szerint). A NodaTime domain-belső
   használata viszont az elfogadásig sem blokkolt — megerősítendő.

## Kapcsolódó

ADR-069 (§4 szemantika, §5 idő/naptár, §11 M4), ADR-067 (katalógus, manifest, aláírás),
PLAN-03 M2 napló (a mai állapot: Domain nulla külső függőséggel, 98 unit + 6 RLS-proof zöld).

---

## ROOT-REVIEW (2026-07-28) — verdikt: ELFOGADHATÓ, két kötelező kiegészítéssel

1. **Determinizmus-klauzula (kötelező, D1-hez):** a CP-SAT több worker-szállal
   nem-determinisztikus — ugyanarra a bemenetre eltérő (azonos költségű)
   ütemterveket adhat. Ez a ScheduleRevision hash-ét és a shadow↔published
   diffet zajossá tenné. Előírás: rögzített `random_seed` + `num_search_workers=1`
   az alap-profilban (a párhuzamos keresés opt-in, kimondottan
   nem-reprodukálható jelöléssel), ÉS determinizmus-teszt a kompatibilitási
   kapu mintájára (azonos bemenet → azonos revision-hash kétszer futtatva).
2. **Supply-chain rögzítés (kötelező, mindkét függőségre):** pontos
   verzió-pin (Google.OrTools 9.15.6755, NodaTime major.minor.patch) +
   lockfile/central package management, a manifest digest-számítása a natív
   runtime-csomagokra is kiterjed.
3. Q3 megerősítve: a NodaTime domain-belső használata NEM blokkolt az
   elfogadásig; a solver-döntés az M4 kapuja marad.
4. Q1 (RID-mátrix) és Q2 (bundle-plafon) Gábor asztalán — a döntéssel együtt
   fordul az ADR Accepted-re.
