# DC-PII-IMPORT-GATE — fail-closed személyesadat-kapu az import határán

**Kiírva:** 2026-08-07 (root) · **Sáv:** doccapture · **Státusz:** pending
**Kiváltó Gábor-döntés:** *„Integráljuk ezt a tudást, mert **sok cégtől** kell majd adatokat
átvenni Excelből."*

---

## Miért kell, és miért most

A `DC-EXCEL` (done, root-APPROVED 2026-07-30) egy **semleges Excel/CSV betöltőt**
(`TabularReader`) szállított. A termékvonal célja kimondottan az, hogy **sok cég adatát**
vegye át. Minden ilyen import **személyes adatot hordoz**: dolgozói nevek, ügyfél-kontaktok,
e-mail-címek, telefonszámok.

**Mérve 2026-08-07 a `spaceos-doccapture-engine`-ben:**

```
TabularReader + openpyxl        11 fajl   -> Excel-beolvasas          MEGVAN
provenance / cell_ref / sheet    9 fajl   -> cella-szintu nyom        MEGVAN
review 22 / hash 30 fajl                  -> birálati kapu + hash-pin MEGVAN
redact | anonim | pii            0 fajl   -> SZEMELYES ADAT KEZELES   NINCS  ⛔
```

**Mérve a PUBLIKUS platform-repóban ugyanaznap:** 43 e-mail-domain / 62 fájl, köztük szabad
levelezős (`gmail`, `protonmail`) címek **demóadatban**, és személynév-alakú kontaktok.
Vagyis a rés **nem elméleti: már ma is szivárog** oda, ahol nem kellene.

## A kapu alakja

**Fail-closed:** ha a detektor nem tud dönteni, az import **áll meg**, nem megy tovább
maszkolatlanul. A `DevelopmentAuthentication`-precedens szerint a megkerülés konfigurációs, és
Developmenten kívül **indulásnál dob**.

**A kapu HELYE az import határa** — ott, ahol az idegen adat belép. A ma tanult
`normalizalas-veszteseges-a-hataron` tükörképe: ami a határon átmegy maszkolatlanul, azt
később már **nem lehet visszavonni**, mert szétfolyik a származtatott adatokba, a
bizonyítékokba és a naplókba.

## A recept — mind a hat pont VALÓDI HIBÁBÓL származik (2026-08-06/07)

| # | Szabály | A hiba, amiből jön |
|---|---|---|
| 1 | **Alak-alapú detektor ELŐSZÖR** (e-mail, név-alak, telefon), **névlistás csak ellenőrzésre** | az ismert-név-detektorom „0 munkatárs-nevet" mondott — igaz volt és félrevezető; alak-alapúra váltva azonnal 3 további személynév jött elő |
| 2 | **A találat KÖRNYEZETE dönt, nem a darabszám** | a vezetéknév egyben gyakori szó és helységnév-előtag volt → **6-ból 5 hamis pozitív** (szín, „Fehérvár") |
| 3 | **Önteszt ismert bemeneten, VALÓDI adat ELŐTT** — pozitív **és** negatív kontrollal | egy validálatlan detektorral **adatvédelmi vádat** fogalmaztam meg |
| 4 | **A bizonyíték örökölje a termék redakcióját** | a leadott nyers felvételek nem örökölték a pack redakcióját — valódi lelet volt |
| 5 | **A redakció bizonyíthatósága**: a javítás **előtti** állapotot külön mérni; ha eltűnt, a visszavonás nem megalapozott | a már redaktált fán mértem nullát, és **visszavontam egy igaz leletet** |
| 6 | **Nem-ASCII mintát ne a shellen át** — fájlba írva, kódpontokból építve | a `python -c`-s átadás elrontotta a karakter-osztályt |

## Megvalósítási lépések

1. **Detektor-port** a `core/ports.py` mellé, alak-alapú felismerőkkel (e-mail, magyar és
   általános névalak, telefon, adószám/bankszámla), **konfigurálható szabályhalmazzal**.
2. **Önteszt-készlet**, ami a detektor **indulásakor** fut: pozitív és negatív kontroll
   mintánként; bukásra **dob**, nem logol.
3. **Döntés a cella szintjén**: maszkolás / megtartás / **megállás**. A `raw`/`norm` mezők
   üresítése úgy, hogy a **cella-koordináta és a kitöltöttség ténye megmaradjon** (a Flow Lab
   már bevált alakja) — így a downstream elemzés nem veszít, a név viszont nem megy tovább.
4. **A bizonyíték-út is a kapun megy át** — capture-record, hibaüzenet, napló, hash-manifest.
   Külön teszt bizonyítsa, hogy **a bizonyítékban sincs** maszkolatlan érték.
5. **Semlegességi őr kiterjesztése** (`DC-00` mintája): a kapu meglétét és bekötöttségét
   **CI mérje**, ne figyelem.

## Átvételi feltételek

- **Mutációval bizonyítva**, hogy a kapu harap: a maszkolás kivétele **bukjon**.
- **Negatív kontroll**: egy tudottan tiszta munkafüzeten **0 találat**, és ez ne a detektor
  némasága legyen (pozitív kontroll ugyanazon a futáson).
- A kapu **fail-closed**: nem-dönthető eset → az import **megáll**; ez teszttel kikötve.
- **Arány jelentve**, ne csak darabszám: `X/Y` cella vizsgálva, a kihagyottak **nevesítve**.
- A **bizonyíték-úton** is 0 maszkolatlan érték, külön teszttel.

## Kapcsolódás

- A Flow Lab négy képességéből **három már a motorban van** — ez a task a **negyediket** és a
  hiányzót adja hozzá; a Flow Lab a mennyiségi szabály-modelljét **bemenetként** adja át,
  nem párhuzamos implementációként (`inbox/2026-08-07_010`).
- `DC-01c` továbbra is blokkolt (NuGet-út, .NET projektek) — **ez a task nem függ tőle**.
