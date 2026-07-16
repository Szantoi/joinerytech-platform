# ADR-059: Wire-nyelv — a kontraktus kanonikus enum-szókincse

- **Státusz:** PROPOSED — döntésre vár (root)
- **Dátum:** 2026-07-16
- **Felvetette:** MAINT-BE-TRANSITIONS (3.), HR-BE-HOST (1.), CRM-BE-HOST (1.), DMS-BE-HOST
  (`DocumentStatus.cs:15-19`) — **négy modul, egymástól függetlenül**
- **Előfeltétele:** ADR-060, ADR-063, ADR-064 (a kontraktus-döntések erre épülnek)

---

## Kontextus

A backend-hostok string-enumot adnak a dróton (`JsonStringEnumConverter`), a portal
zod-sémái viszont magyar kulcsokat várnak. A leltárak ezt „a backend angolul beszél, a
portal magyarul" néven írták le — **a kód ennél árnyaltabb képet mutat.**

### Modulonkénti valóság (megszámolva, kódból)

| Modul | Portal wire | Backend wire | Egyezik? | Van ma mapping? |
|---|---|---|---|---|
| **kontrolling** | HU kategória + EN státusz | **ugyanaz** | ✅ **IGEN** | ✅ `Api/WireEnums.cs` (explicit szótár) |
| **ehs** | **EN** PascalCase | EN PascalCase | ✅ **IGEN** | nem kell (a portal igazodott) |
| **dms** | HU | **vegyes** | ⚠️ **RÉSZBEN** | részleges (enum-tagnévbe égetve) |
| **crm** | HU | EN PascalCase | ❌ NEM | nincs |
| **hr** | HU | EN PascalCase | ❌ NEM | nincs |
| **qa** | HU | EN PascalCase | ❌ NEM | nincs (+ nincs élő host-route) |
| **maintenance** | HU | EN PascalCase | ❌ NEM | nincs (+ nincs élő host-route) |

**Állás: 2 egyezik · 1 részben · 4 nem.** Az „enumok int-ként mennének ki" kockázat **nem áll
fenn** — minden élő host regisztrál string-konvertert.

### Három tény, ami a döntést kereteizi

**1. A probléma ma sehol nem robban — és ez veszélyes.**
Nincs Orval, nincs generált kliens (`orval.config.*` nem létezik). A portal zod-sémái
**kézzel írt, független** deklarációk — semmi nem kényszeríti ki az egyezést fordítási időben.
A `services/apiClient.ts:90` nyers `JSON.parse(text)`, nulla enum-transzformáció. A portal
dev-ben MSW-ből eszik (`src/main.tsx:7-15`), és a mock ugyanazt a magyar szótárat beszéli, mint
a zod. **A törés a valódi backend rákötésekor jelentkezik, egyszerre 4 modulban.**

**2. Már két, egymással ellentétes megoldás él a fában — precedensnek mindkettő kínálja magát.**

- **Kontrolling — a jó minta: fordítás a szerializációs varraton.**
  `spaceos-modules-kontrolling/src/Api/WireEnums.cs:71-76`:
  ```csharp
  [CostCategory.Material] = "anyag",
  [CostCategory.Labor] = "munka",
  [CostCategory.Subcontracting] = "bermunka",
  ```
  A doc-comment (`:12-17`) kimondja a lényeget: *„the spellings are a TRANSLATION, not a
  convention… No naming policy derives those."* Az `EnumWireMap` konstruktora (`:31-37`)
  **startupkor dob**, ha egy enum-tagnak nincs wire-neve — a kontraktus-drift boot-hibává
  van előléptetve. **A domain angol marad, csak a wire magyar.**

- **DMS — az elkerülendő minta: fordítás a domainbe égetve.**
  `dms/src/Domain/Enums/DocType.cs:11-24` tagjai *literálisan magyarul* vannak PascalCase-ben
  (`Rajz`, `Szerzodes`, `Tanusitvany`, `Utasitas`, `Egyeb`), és a CamelCase policy
  (`DmsServiceCollectionExtensions.cs:44-48`) csinál belőlük `"rajz"`/`"szerzodes"`-t.
  Ugyanígy `ExpiryState.Lejart` → `"lejart"`, `DocLinkType` → `"project"`.
  **A `DocumentStatus` viszont angol** (`"draft"/"underReview"/"released"/"archived"`) a portal
  `piszkozat/ellenorzes/kiadott/archivalt` ellenében — a fájl maga jelöli ADR-jelöltként
  (`DocumentStatus.cs:15-19`). Vagyis **egyetlen modulon belül két nyelv fut**, a megfeleltetés
  enumonként eltérő mélységű.

**3. A „HU vs EN" részben álkérdés — az i18n-érv nem azt támasztja alá, amit gondolnánk.**
A wire-enum **azonosító, nem címke**. A portal ezt már ma is szétválasztja: a
`src/mocks/worlds.ts` (735 sor) minden világa `{ key, hu, en, sub, icon, … }` — a `key` a stabil
azonosító, a `hu`/`en` a megjelenítendő szöveg. **Az i18n-jövő tehát nem angol kulcsokat
követel, hanem stabil, átlátszatlan kulcsokat + külön címke-réteget** — ez mindkét opcióval
teljesül. (A `worlds.ts` hu/en párja navigációs UI-címke, **nem** enum-szótár — nem precedens,
és nem hasznosítható újra erre.)

Fordítva viszont van egy valós szakmai érv: a `bermunka`, `szabas`, `elzaras` **magyar faipari
szakszavak**. Az angolosításuk szintén fordítás — csak a másik irányba, és találékonyabb
(„edgeBanding"?). Egyik nyelv sem „természetes" — épp ezért mondja a kontrolling
doc-commentje, hogy ez fordítás, nem konvenció.

### A megfeleltetés helyenként mélyebb, mint a nyelv

Puszta HU↔EN szótár **nem oldja meg** ezeket — a halmazok sem fedik egymást:

- **QA `InspectionStatus`**: backend **3** érték (`Planned/InProgress/Completed`,
  `qa/src/Domain/Enums/InspectionStatus.cs:8-10`), portal **4**
  (`'nyitott','folyamatban','megfelelt','selejt'`). A `megfelelt`/`selejt` a backendben nem
  státusz, hanem külön `InspectionResult` enum → **modellezési eltérés** (→ **ADR-063**).
- **HR `Department`/`SkillKey`/`SkillLevel`/`PayGrade`**: nem bijektív, fogalmi eltérés
  (→ **ADR-060**).
- **CRM `LeadStatus`** (6↔6, de más tartalom), `CrmSource` (backend 10 ↔ portal 7).

**Ez az ADR csak a nyelvet dönti el.** A halmaz-eltérések külön ADR-ek — de mindegyik ezt
az alapdöntést feltételezi.

---

## Döntendő kérdés

**Melyik nyelv a kontraktus kanonikus enum-szókincse a dróton, és hol történik a fordítás?**

---

## Opciók

### (a) Backend igazodik — magyar kanonikus kulcsok a dróton, fordítás a backend varraton

Minden modul `EnumWireMap`-et kap (kontrolling-precedens): a **domain angol marad**
(C# tagnevek), a wire-szókincs egyetlen fájlban, fail-fast.

- **Következmény:** a 7 APPROVED portal-világ, az MSW-kontraktusok és az 1418 zöld teszt
  **érintetlen**. Az EHS portal-oldala HU-ra állna (ez az egy modul, ahol ma a portal beszél
  angolul). A DMS `DocType`/`ExpiryState` domain-tagnevei angolra javítandók + wire-map
  (a domain-szennyezés visszavonása).
- **Munkaigény:** 4 modul × `EnumWireMap` (~120 LOC + teszt) ≈ **3-5 nap**; DMS domain-takarítás
  ≈ 0,5 nap; EHS portal HU-igazítás ≈ 1 nap (APPROVED modul → designer-újrakör). **Összesen ≈ 5-7 nap.**
  **Migráció: nincs** (nincs adat — ld. Hatás).
- **Kockázat:** a magyar wire-szókincs termék-szintű elköteleződés; egy nem-magyar deploy
  (@joinerytech/* csomagok, jövőbeli partner-integráció) magyar kulcsokat lát az OpenAPI-ban.
  **Mérséklés:** a kulcs azonosító, sosem jelenik meg nyersen; és a szótár **egy fájl
  modulonként** — nyelvváltás = szótárcsere + API-verziózás, nem domain-refaktor.

### (b) Portal igazodik — angol kulcsok a zod-ban, HU csak megjelenítési label

- **Következmény:** 6 modul zod + MSW + UI-labelmap + tesztek átírása; **7 APPROVED világ
  újranyitása** → designer-újrakör mindegyikre. A kontrolling `anyag/munka/bermunka` magyar
  szakszavaira **angol terminust kell kitalálni** (üzleti fordítási kockázat, nem technikai).
- **Munkaigény:** ≈ **10-15 nap** + designer-újrakör + regressziós kockázat az 1418 teszten.
- **Kockázat:** APPROVED munka újranyitása; a legnagyobb regressziós felület. Cserébe: a
  domain és a wire ugyanazt a nyelvet beszéli, nincs fordítási varrat.

### (c) Mapping-réteg a portal fetcher-ben

- **Következmény:** **ez a legrosszabb opció, és érdemes kimondani, miért.** A 7 modul
  MSW-FIRST módszertana azon áll, hogy **a mock a valódi API hű előképe**. Ha a fetcher fordít,
  akkor vagy az MSW is angolra vált (→ ekkor ez az (b) opció, csak drágábban), vagy a mock és
  az éles API **különböző nyelvet beszél** → az MSW megszűnik kontraktus-előkép lenni, és
  elveszik az egész eddigi módszertan értéke. A zod is hazuggá válik (transzformáció után
  validál).
- **Munkaigény:** (b) munkája + adapter-réteg 7 modulon.
- **Kockázat:** módszertan-vesztés. **Elvetendő.**

### (d) Mapping-réteg orchestrator BFF-en

- **Következmény:** új hop, új deploy-egység, **harmadik hely, ahol driftelhet**. Ma nincs BFF
  a portal és a modulok között; az orchestrator (Node, port 3000) a spaceos-világ része, a
  VPS-csapat develop-branchén aktív, félbehagyott munkával
  (`VPS_SERVICE_STATE_2026-07-16.md:119`).
- **Munkaigény:** ≈ 15+ nap, plusz üzemeltetési teher.
- **Kockázat:** kritikus úton lévő függés egy másik csapat instabil komponensétől. **Elvetendő
  most** — ha valaha más okból BFF épül, a szótár odaköltöztethető.

---

## Ajánlás

> **(a) — magyar kanonikus kulcsok a dróton, fordítás a backend szerializációs varratán,
> `EnumWireMap` mintával; a domain angol marad. Az EHS is HU-ra igazodik.**

**Indoklás:**

1. **A költség-aszimmetria egyértelmű, és most a legkedvezőbb.** A backend-hostok **ma
   épültek** (HR `5f35843`, Kontrolling `e7f3157`, CRM `0ce24cb`, DMS `760349a`) — nulla adat,
   nulla fogyasztó, nulla migráció. A portal-oldalon 7 designer-APPROVED világ és 1418 zöld
   teszt áll. **A napok óta létező oldalt olcsóbb hajlítani, mint a hónapok óta jóváhagyottat.**
   5-7 nap vs. 10-15 nap + designer-újrakör.

2. **A precedens már megvan, és bevált.** A kontrolling `EnumWireMap`-je nem tervrajz, hanem
   **futó, tesztelt kód** (177 zöld teszt, a wire-szótár teljességét teszt őrzi). A minta
   fail-fast: hiányzó wire-név → startup-hiba, nem néma drift.

3. **Az igazi, tartós döntés nem a nyelv, hanem a varrat.** A DMS megmutatja a különbséget:
   ha a fordítás a **domain enum-tagnevébe** kerül (`DocType.Rajz`), a nyelv-választás
   **visszafordíthatatlanná** válik, és a domain elveszti a nyelvi semlegességét. Ha a varraton
   van (`EnumWireMap`), akkor **egy fájl cseréje** — ha Gábor 2 év múlva angol wire-t akar egy
   exportpiacra, az egy szótár + API-verzió, nem 7 modul refaktora. **Ezért az ajánlás magja
   nem a „magyar", hanem a „varrat" — a nyelv ennek revideálható paramétere.**

4. **Az i18n-érv nem szól a (b) mellett.** A wire-kulcs azonosító; a portal `worlds.ts` már ma
   is `key` + `hu`/`en` címke szerkezetű. Angol wire-kulcsok nem hoznának i18n-előnyt — a
   címke-réteg úgyis kell.

5. **Az EHS is igazodjon.** Egy szabály egy kivétellel nem szabály — a „mindenhol HU, kivéve
   EHS" örök lábjegyzet lenne minden új modulnál. 1 modul FE-igazítása (≈1 nap) az ára annak,
   hogy a szabály kimondható legyen. *(Ha a designer-újrakör költsége miatt Gábor az EHS
   grandfather-elését választja, az védhető — de akkor írjuk le kivételként, ne felejtsük el.)*

**Amit az ajánlás NEM old meg:** a halmaz-eltéréseket (QA 3↔4, HR nem-bijektív, CRM
kardinalitás). Azok fogalmi döntések → ADR-060, ADR-063. Ez az ADR csak megmondja, milyen
nyelven íródnak a végül elfogadott halmazok.

---

## Hatás

**Modulok / fájlok:**
- **Új** `Api/WireEnums.cs` (kontrolling-minta): `qa`, `maintenance`, `hr`, `crm` +
  DMS `DocumentStatus`.
- **DMS domain-takarítás:** `DocType`, `ExpiryState`, `DocLinkType` tagnevei angolra +
  wire-map (a `DmsServiceCollectionExtensions.cs:44-48` camelCase-policy kiváltása).
- **EHS:** portal `modules/ehs/services/*.ts` zod + `mocks/handlers.*.ts` + label-map HU-ra.
- **Portal:** a 6 HU-modulban **nincs változás** (ez a lényeg).
- Az OpenAPI/Swagger sémák a wire-szótárból generálódnak → felülvizsgálandók.

**Migráció:** **nincs.** Egyik modulnak sincs éles adata; a HR séma soha nem is jött létre
(→ ADR-062), a CRM/DMS/kontrolling migráció ma született. **Ez az ablak most nyitva van —
minden nap, amíg a döntés csúszik, nő az esély, hogy adat kerül a rossz szókincsre.**

**Munka:** ≈ 5-7 nap (backend 4-5,5 nap + EHS FE ≈1 nap), párhuzamosítható modulonként.

**Blokkol-e élesítést?** Közvetlenül nem (ma minden MSW-ből fut), de **blokkolja a portal
fetcher-átállását mind a 4 modulon** — vagyis a valódi backend-bekötést. Ez a legdrágább
halasztható döntés a csomagban.

---

## Döntés

_(Gábor tölti ki)_

- [ ] (a) Magyar wire + `EnumWireMap` varrat, domain angol — *ajánlott*
- [ ] (b) Angol wire, portal igazodik
- [ ] (c) / (d) mapping-réteg fetcher / BFF
- [ ] EHS: igazodjon HU-ra ☐ / maradjon EN kivételként ☐

**Indoklás:**

---

## Kapcsolódó ADR-ek

- **ADR-060** (HR taxonómia) — a nyelvi döntést feltételezi; a HR halmaz-eltérése mélyebb.
- **ADR-063** (QA rework/Conditional) — a QA 3↔4 státusz-eltérés modellezési oka.
- **ADR-064** (gyűjtő) — assign-identitás, `AppliesTo`, `createdBy`.
- **ADR-058** (JoineryTech Backend-Frontend Integration Architecture) — a keret, amit ez pontosít.
- Forrás-precedens: `spaceos-modules-kontrolling/src/Api/WireEnums.cs`
</content>
</invoke>
