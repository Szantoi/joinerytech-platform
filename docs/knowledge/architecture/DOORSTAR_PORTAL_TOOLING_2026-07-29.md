# Mit tudunk adni a Doorstar portálnak? — felmérés (2026-07-29)

> **Kérdés (Gábor):** milyen eszközöket tudunk adni a Doorstar portálnak, hogy
> folytassa a fejlesztést.
> **Rövid válasz:** sokat — de **ma egyetlen csomagot sem tudunk átadni**, mert
> minden workspace-csomagunk `private: true` és forrás-exportos. Ez a blokkoló,
> és ez egy csomagolási döntés, nem fejlesztés.

## 1. A jó hír: a stackek egyeznek

| | Doorstar `@doorstar/uzemi-tabla-web` | Platform `joinerytech-portal` |
|---|---|---|
| React | 19 | 19 |
| Router | react-router-dom 7 | react-router-dom 7 |
| Tailwind | 4 | 4 |
| Szerver-állapot | TanStack Query 5 | TanStack Query 5 |
| Kliens-állapot | Zustand 5 | Zustand 5 |

A Doorstar `package.json`-ja ezt szándéknak is mondja: *„Mirrors
joinerytech-portal conventions … so pages/services can be dropped into that
portal later."* Tehát nincs technológiai akadály — a `@spaceos/portal-ui`
peer-igénye (`react ^19`) is teljesül.

## 2. Amit ma párhuzamosan tartunk fenn (duplikáció)

| Doorstar saját | Platform megfelelő | Megjegyzés |
|---|---|---|
| `Button.tsx` | `Button` | |
| `ConfirmDialog.tsx` | `ConfirmDialog` + `useConfirm` | a miénk **strukturált `details`-variánssal**, és a fókuszcsapda/Escape **valós böngészőben bizonyítva** (2026-07-29) |
| `Panel.tsx` | `Card` | |
| `StatusChip.tsx` | `StatusPill` | |
| `Toast.tsx` | toast-réteg (`react-hot-toast` peer) | |
| `DependencyGanttTimeline.tsx` | `GanttChart` | **a miénk az ő kódjukból lett általánosítva** (PLAN-05 F1) |
| `WorkflowDependencyGraph.tsx` | `DependencyGraph` | ugyanaz a provenancia |
| `planningVisualizationModel.ts` | scheduling nézet-modellek | |
| `lib/dates.ts` | `portal-ui/dates.ts` | a fájl fejléce kimondja: *„a doorstar-instance `lib/dates.ts`-éből általánosítva"* |
| `lib/printOnly.ts` | `usePrintScope` | |
| `lib/roles.ts` | `portal-core/auth/roles.ts` | ma bővült az üzemi szerepekkel |
| `theme/tokens.css` | `portal-ui/theme` | |

**Ez a lista a felmérés lényege:** a Doorstar tizenkét helyen tart fenn valamit,
aminek nálunk **karbantartott, tesztelt és mért** párja van. A GanttChart és a
DependencyGraph esetében ráadásul **a sajátjukból** általánosítottuk — a hurok
most zárulna be azzal, hogy visszakapják.

## 3. Amink van, és nekik nincs

`CapacityHeatmap` · `DataTable` + `DataTableCards` (kártyás mobil-nézettel) ·
`QueryGate` (pending/error egy helyen) · `SlideOver` · `FormFields` · `Input` ·
`FsmStepper` · `KpiCard` · `ProgressBar` · `Sparkline` · `Avatar` · `Icon` ·
`useConfirm` / `usePrintScope` / `useTimeCursor`.

Ezekből a `QueryGate` és a `DataTable` a legértékesebb: az első a betöltés/hiba
kezelését teszi egyöntetűvé (ma náluk minden lap maga oldja meg), a második a
lista-nézeteket mobilon is.

## 4. A blokkoló: minden csomagunk zárt

```
PRIVATE @spaceos/portal-ui        exports: "./src/index.ts"   (nincs build)
PRIVATE @spaceos/portal-core      exports: "./src/…"
PRIVATE @joinerytech/world-*      …
```

- **`private: true`** → `npm publish` nem megy;
- **forrás-export** (`.ts`, nem `dist`) → a fogyasztónak fordítania kell, tehát
  a TS/Vite-konfigurációnk is átszivárog;
- **nincs `.npmrc` / registry-konfiguráció** a portál-repóban.

Vagyis ma a Doorstar **másolni tud, fogyasztani nem** — és a másolás pont az,
ami a fenti duplikációt szülte.

⚠ **Mellékes lelet:** a `@spaceos/module-collaboration` **nincs** `private`-ra
állítva, szemben az összes többivel. Ez a B2B-08 modul, ami `changes_requested`
állapotban van — egy véletlen `npm publish` kivinné. Javítandó.

## 5. Három út, és amit javaslok

| Út | Előny | Ár |
|---|---|---|
| **A. Publikálás GitHub Packages-re** (`@spaceos/portal-ui` verziózva, `dist`-tel) | valódi verziózás, hash-pin, a Doorstar úgy fogyaszt, mint bármely külső csomagot; illeszkedik a scheduling-mintához (`SPACEOS_PACKAGES_TOKEN` már létezik) | build-lépés + CI kell a csomaghoz; a `private` feloldása és a peer-ek rendezése |
| **B. Git submodule/subtree** | gyors, nincs registry | a Doorstar a mi belső fánkat kapja, verzió helyett commit-pin; a törött gitlinkek tapasztalata nem bátorít |
| **C. Marad a másolás** | nincs munka | a duplikáció nő, és minden javításunk (pl. a mai ConfirmDialog-fókuszcsapda) náluk nem jelenik meg |

**Javaslat: A**, és először **csak a `@spaceos/portal-ui`-t**. Indok: az a
csomag domain-mentes (primitívek + téma + dátum-segédek), tehát nincs
platform-specifikus szivárgás; a `portal-core` viszont auth/tenant-fogalmakat
visz, ami a Doorstar saját identitás-modelljével ütközhet — az **második kör**,
külön döntéssel.

## 6. Kontraktusok — ez a másik fele, és itt jobban állunk

- **scheduling:** a read-only kontraktus **kézbesítve** (OpenAPI 3.1, SHA-256
  `3fc6c57d…`), és most megy a additív bővítési kör (dátumosított proposal,
  `lagKind` a wire-on, kapacitás-ütközés mező). A Doorstar generált klienssel
  építkezik — ez a minta működik.
- **Collaboration (B2B-10):** az F3-F4 publikálja majd az OpenAPI-t; a Doorstar
  ott lesz az **első valós guest-fogyasztó**. Az F1 most indítható.

## 7. Amit javaslok konkrét lépésként

1. **Döntés a csomagolásról** (A/B/C) — Gábor.
2. Ha A: egy szelet, ami a `@spaceos/portal-ui`-t **publikálhatóvá** teszi
   (build → `dist`, `exports` átállítás, verziózás, CI-publish), plusz a
   `module-collaboration` `private`-ra állítása.
3. A Doorstar-oldali **átállási lista** ugyanebből a táblából jön: a tizenkét
   duplikátumból melyik cserélhető azonnal (Gantt, DependencyGraph, dates,
   ConfirmDialog), és melyik igényel egyeztetést (roles, theme).
4. **Kontraktus-oldalon nincs teendő** — a scheduling megy, a Collaboration jön.
