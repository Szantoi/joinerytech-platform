# STAB-KONTROLLING-PORTFOLIO-INDEX — Projektkorrekciók egyszeri indexelése

- **Epic:** `EPIC-PLATFORM-STABILITY-2026Q3`
- **Szerep:** backend
- **Prioritás:** P1
- **Státusz:** `review`
- **Mutációs határ:** Kontrolling portfolio read model és tesztjei

## Cél és eredmény

A projektlista, a portfólió-összegző és a variancia nézet nem szűri végig
minden projektnél újra a tenant teljes korrekciólistáját.

## Megvalósítás és bizonyíték

`PortfolioCostView.ToListItems` egyszer projektazonosító szerint indexeli az
élő, projekt-scope-os korrekciókat. A három tömeges portfólió-lekérdezés ezt
használja; az egyprojektes út változatlan. A portfolio-scope-os korrekciók nem
kerülnek projekthez, így az összesítőben továbbra is csak egyszer számolódnak.

```text
dotnet test src/spaceos-modules/spaceos-modules-kontrolling/tests/SpaceOS.Modules.Kontrolling.Tests.csproj --no-restore --nologo
Passed: 190, Failed: 0

dotnet test ... --filter FullyQualifiedName~PortfolioCostViewTests
Passed: 5, Failed: 0
```

Az új regressziós teszt két projekt és egy portfolio-korrekció mellett rögzíti
a helyes hozzárendelést. Root review és commit még hátra van.
