# STAB-CUTTING-CULTURE-INVARIANCE — pricing és OptiCut invariáns számformátum

- **Szerep:** backend/integration
- **Prioritás:** P0
- **Státusz:** done — root (Claude subagent) adversarial review PASS, mergelve
  (`spaceos-modules-cutting@f39d3ea`), platform-pin frissítve
- **Függőség:** nincs; lokálisan a `STAB-CUTTING-TENANT-RESOLVER` egyfájlos
  diffje fölött, fájlszinten diszjunkt sáv
- **Mutációs határ:** Cutting `PricingRule` és `OptiCutFormatConverter`, a két
  közvetlen tesztosztály, ez a task, a Platform Stability README és a Cutting
  runbook
- **Tiltott scope:** árazási képlet/FSM, vendor XML schema redesign, más adapter,
  portal, deploy, idegen agent diffje

## Cél

A pricing magyarázó kontraktusa és az OptiCut XML adatcsere ugyanazt a ponttal
írt decimális formátumot használja magyar fejlesztői gépen, CI-ben és Linux
production környezetben. A számértékek és üzleti képletek nem változhatnak.

## Gyökérok

- A `PricingRule.CalculatePrice()` interpolált decimális értékei a
  `CurrentCulture` formátumát használják, ezért magyar gépen `100,00`, miközben
  a kontraktus és a tesztek `100.00` alakot várnak.
- Az `OptiCutFormatConverter` XML-generálása közvetlen decimal interpolációt,
  parserje kultúra nélküli `decimal.TryParse` hívást használ. Emiatt a vendor
  által küldött `8.5` magyar kultúrán nem `8.5m` értékként olvasható.
- A testvér `CutRiteFormatConverter` már `InvariantCulture` mintát használ;
  ez bizonyítja a modulon belüli elvárt wire-kontraktust.

## Megvalósítás

1. Készíts explicit `hu-HU` regressziós tesztet a pricing breakdownra és az
   OptiCut XML írására/olvasására.
2. A pricing szövegben minden decimális formázás legyen invariáns; az egész és
   domain-szöveg változatlan.
3. Az OptiCut kimenet ponttal írt decimális XML-attribútumot használjon.
4. Az OptiCut parser explicit `InvariantCulture` + meghatározott
   `NumberStyles` beállítással olvasson; hibás/missing mező fallbackje maradjon
   a jelenlegi `0`.
5. Az XXE/DTD hardening és XML-escape tesztek maradjanak zöldek.
6. Futtasd a célzott, teljes Cutting és build kaput, majd aktualizáld a
   tesztadósság-leltárt.

## Tesztterv

A Cutting submodule gyökeréből:

```powershell
dotnet test tests/SpaceOS.Modules.Cutting.Tests/SpaceOS.Modules.Cutting.Tests.csproj `
  --no-restore -m:1 -p:BuildInParallel=false `
  --filter "FullyQualifiedName~Domain.PricingRuleTests|FullyQualifiedName~Adapters.Providers.OptiCutFormatConverterTests"

dotnet test tests/SpaceOS.Modules.Cutting.Tests/SpaceOS.Modules.Cutting.Tests.csproj `
  --no-build --no-restore -m:1

dotnet build SpaceOS.Modules.Cutting.sln `
  --no-restore -m:1 -p:BuildInParallel=false
```

## Elfogadási kritériumok

- [x] Pricing breakdown `hu-HU` mellett is ponttal írt stabil kontraktus.
- [x] OptiCut XML kimenet kultúrafüggetlen.
- [x] OptiCut XML parser `8.5` értéket minden támogatott hostkultúrán `8.5m`-ként olvas.
- [x] Az öt izolált baseline hiba megszűnik.
- [x] A teljes suite hibaszáma 19-ről 14-re vagy kevesebbre csökken.
- [x] Nincs árazási képlet-, FSM-, XML-security- vagy adapter scope-változás.
- [x] Build 0 hibával és új warning nélkül zárul.

## Stop / eszkaláció

Ha az OptiCut hivatalos vendor-kontraktusa vesszővel írt decimálist követel,
ne vezess be automatikus kétértelmű parsingot. A vendor-specet kell rögzíteni és
verziózott adapter-policy döntést kérni. A jelenlegi fixture és a CutRite minta
ponttal írt, invariáns wire-formátumot támaszt alá.

## Végrehajtási napló

- **Platform HEAD:** `7ffc353`
- **Cutting HEAD:** `a889109` (`main`, authfix commit)
- **Meglévő saját diff:** kizárólag
  `Infrastructure/Services/TenantResolver.cs`; nem része ennek a tasknak.
- **Párhuzamos idegen sávok:** EHS, portal, Inventory, Procurement,
  MODULE-PACKAGES; egyikhez sem nyúl ez a task.
- **Izolált baseline:** PricingRule + OptiCut **26/31 zöld, 5 hiba**.
- **Teljes baseline:** **1028/1047 zöld, 19 hiba** a resolver javítása után.
- **TDD red:** három explicit `hu-HU` teszt hozzáadása után **26/34 zöld, 8
  hiba**; az öt régi és mindhárom új teszt a várt kultúra-okból bukott.
- **Implementáció:**
  - a pricing breakdown decimális interpolációi
    `FormattableString.Invariant` formázást kaptak;
  - az OptiCut XML szélesség, magasság és mennyiség attribútumai invariáns
    szövegként készülnek;
  - a vendor decimal parser `NumberStyles.Float` + `InvariantCulture`, az egész
    parser `NumberStyles.Integer` + `InvariantCulture` beállítást használ;
  - a pont-decimális wire-szerződés szigorú maradt, a vessző nem értelmezhető
    félre ezres elválasztóként.

## Átadási bizonyíték

- Célzott PricingRule + OptiCut kapu: **34/34 zöld**.
- Teljes Cutting suite: **1036/1050 zöld, 14 hiba**; előtte 1028/1047 és 19
  hiba. Az öt baseline kultúrahiba megszűnt, három regressziós teszt került be.
- Solution build: **sikeres, 0 hiba, 1 meglévő NU1902 warning** (`MailKit`
  4.9.0); új warning nincs.
- Az OptiCut malformed XML, XXE, billion-laughs és XML-escape tesztjei zöldek.
- `git diff --check`: tiszta; csak CRLF-tájékoztatások jelentek meg.
- Változott production fájlok:
  `Domain/Aggregates/PricingRule.cs` és
  `Infrastructure/Adapters/Providers/OptiCutFormatConverter.cs`.
- Új regressziós tesztek: egy pricing és két OptiCut `hu-HU` eset.
- **Review-kérés:** Claude/backend reviewer ellenőrizze a pricing szöveges
  kontraktust, az OptiCut vendor-formátumot és a szigorú parse policyt. Commit,
  platform-pin és deploy nem történt.
