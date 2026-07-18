# ADR-065: Kernel core-elemek domain-mentessége — FlowEpicScope absztrakcióvá alakítása

- **Státusz:** ELFOGADVA — Gábor, 2026-07-18 (a döntés és a végrehajtás is jóváhagyva)
- **Dátum:** 2026-07-18
- **Felvetette:** PROJECT-BOUNDARY-AUDIT (docs/knowledge/architecture/PROJECT_CORE_BOUNDARY_AUDIT_2026-07-18.md,
  7.-es szakasz) — a `FlowEpicScope` enum konkrét faipari értékeket (`DoorOrder`, `CuttingPlan`,
  `MicroAssembly`) tartalmaz a `SpaceOS.Kernel.Domain` rétegben.
- **Döntéshozó indoklása (Gábor, 2026-07-18, két üzenetben):** „Az állapotgépek és a
  projektkezelés a magja az egész SpaceOS-nek. Nagyon érzékeny és fontos core, minden e köré
  épül. Mindig is igyekeztem érintetlenül hagyni, ezért is van az a szabály, hogy nem lehet
  függőség a kernel core részében, csak saját kód. […] Nincs benne és nem is lehet domain
  tudás. Ennek a core elemnek globálisan értelmesnek kell lenni, mint egy absztrakt elem vagy
  interface. Ez biztosítja, hogy a kőműves cég vagy akár egy pékség alap információkat tudjon
  cserélni az egyes feladatok állapotáról. Az, hogy kiegészítés kerül rá, az nem gond. Legfeljebb
  nem értelmeződik.”

---

## Kontextus

A Kernelre két, egymást kiegészítő elv vonatkozik:

1. **Függőség-mentesség**: a Kernel core-nak nincs külső csomag-/modul-függősége, csak saját
   kódja van.
2. **Domain-mentesség** (ez az ADR ezt formalizálja): a Kernel core-elemeinek (pl. a `FlowEpic`
   aggregate mezői) **globálisan értelmes, absztrakt** típusoknak kell lenniük — nem
   tartalmazhatnak semmilyen konkrét iparági/üzleti szókincset. Ez teszi lehetővé, hogy egymástól
   teljesen független iparágak (a döntéshozó példája: egy kőműves cég vagy egy pékség) ugyanazon
   a core-on keresztül cserélhessenek alap állapot-információt a feladataikról.

A `FlowEpicScope` enum (`SpaceOS.Kernel.Domain/Enums/FlowEpicScope.cs`) ma egy **zárt
felsorolás faipari tagnevekkel**:

```csharp
public enum FlowEpicScope
{
    DoorOrder = 1,
    CuttingPlan = 2,
    MicroAssembly = 3
}
```

Ez sérti a 2. elvet: egy pékség vagy egy kőműves cég számára ezek az értékek értelmezhetetlenek,
és minden új iparág bevezetése **Kernel-kódmódosítást** igényelne (új enum-tag felvétele) — ez
pont az ellenkezője annak, hogy a Kernel stabil, változatlan alap maradjon.

**A `FlowEpicRequiredResource` szomszédos típus MÁR MA a helyes mintát követi**: a
`ResourceType`/`ResourceName` szabad string, amit a Kernel nem értelmez, csak tárol és
visszaad — ez a modell, amit a `FlowEpicScope`-nak is követnie kell.

### Blast radius (bizonyíték-alapú, teljes repó átvizsgálva)

- `FlowEpicScope`-ot **kizárólag a Kernel saját fájljai** használják: `FlowEpic.cs`,
  `FlowEpicRequiredResource.cs` (csak doc-comment hivatkozás), `FlowEpicConfiguration.cs`
  (EF-konverzió), `FlowEpicScopeTests.cs`.
- **A platform egyetlen más része sem hívja** a `FlowEpic.Create(..., scope)` túlterhelést —
  a JoineryTech-modulok, a portál és a src/spaceos-modules-* egyike sem fogyasztja ma élesben
  (megerősítve a PROJECT-BOUNDARY-AUDIT azon megállapítását, hogy a Kernel `FlowEpic` egyelőre
  nincs éles üzleti folyamatba kötve).
- A DB-oszlop **már ma is string** (`.HasConversion<string?>()`, a migrációs snapshotban
  `b.Property<string>("Scope")`) — a döntés végrehajtása **nem igényel új EF-migrációt**, csak a
  C#-típus cseréjét zárt enumról nyílt, validált string-wrapperré.

## Döntés

`FlowEpicScope` **enum helyett `readonly record struct` value object** lesz (a `TenantId`/
`FacilityId` bevett Kernel-mintáját követve), a `SpaceOS.Kernel.Domain.ValueObjects`
névtérben:

- egyetlen invariáns: a becsomagolt string nem lehet üres/whitespace, és max. 50 karakter
  (megegyezik a mai `HasMaxLength(50)` DB-korláttal);
- a Kernel **nem validál zárt szótár ellen** — bármilyen nem-üres kulcsot elfogad;
- a konkrét faipari kulcsok (`"DoorOrder"`, `"CuttingPlan"`, `"MicroAssembly"`) **megszűnnek
  Kernel-konstansként létezni** — ha/amikor a JoineryTech-réteg éles használatba veszi a
  `FlowEpic.Create(..., scope)` túlterhelést, a saját (JoineryTech-oldali) kódjában definiálja
  ezeket egyszerű string-konstansként, Kernel-módosítás nélkül;
- a meglévő (üres) éles adatállományra nézve **teljes visszamenőleges kompatibilitás**: a
  DB-oszlop alakja és a tárolt string-értékek formátuma nem változik.

## Következmények

- **Pozitív:** a Kernel innentől bizonyíthatóan iparág-agnosztikus ezen a ponton; új iparág
  bevezetése (bármilyen `scope`-érték) nem igényel Kernel-kódváltozást, csak egy string
  megadását a hívó oldalon.
- **Semleges:** a `FlowEpicScopeTests.cs`-ben a `[Theory]/[InlineData]` a korábbi enum-tagok
  helyett string-kulcsokat kap paraméterként (a `record struct` nem konstans-kompatibilis
  attribútum-argumentumként); a tesztek emellett kapnak egy explicit esetet tetszőleges,
  nem-faipari kulccsal (pl. `"BakeryOrder"`), ami bizonyítja az iparág-agnosztikusságot.
- **Nincs migráció, nincs adatvesztés**: a DB-oszlop típusa és a stringek formátuma változatlan.

## Végrehajtás

Root hajtotta végre, a `src/spaceos-kernel` submodule-ban, előbb **külön branch-en**
(`feature/adr-065-flowepicscope-abstraction`). Érintett fájlok: `FlowEpicScope.cs`
(Enums → ValueObjects, átírva), `FlowEpicRequiredResource.cs` (doc-comment),
`FlowEpicConfiguration.cs` (EF-konverzió), `FlowEpicScopeTests.cs` (teszt-adaptáció + új
iparág-agnosztikus teszt). Kernel.Tests 976/976 zöld (971 baseline + 5 új teszt).

**Mergelés (2026-07-18, Gábor jóváhagyásával):** kiderült, hogy a kernel `main` ága
46 commit-tal a `develop` mögött van, és maga a `FlowEpicScope`/`FlowEpicRequiredResource`
funkció is csak a `develop`-on létezik — a `main`-re cherry-pickelés ütközött (a
funkció alapja hiányzik onnan). Gábor a `develop`-ba mergelést választotta: a
feature-branch pontosan a `develop` csúcsára épült, **fast-forward mergelve**
(`c1f6dd6..6b470ba`), Kernel.Tests újra 976/976 zöld a merge után, pusholva
`origin/develop`-ra. A feature-branch törölve (helyi + remote). A platform
gitlink-pin frissítve `6b470ba`-ra (platform commit `dbd9d5d`).
