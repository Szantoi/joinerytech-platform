# PLAN-05 / F5 — Ütemezés: dátumválasztó

- **Szerep:** frontend
- **Méret:** S–M
- **Előzmény:** a scheduling route-bekötés APPROVED (2026-07-29). A képernyő
  elérhetővé válásával lett látható a hiány.
- **Státusz:** kiadva (2026-07-29)

## Cél

A `SchedulingPage` fejléce kiírja a „Terv napja"-t, de **nem lehet másikat
választani**: a `setSelectedDate` sehol nem hívódik, a terv napja mindig a mai.
Gábor döntése: **kell dátumválasztó.**

## Root-lelet, amit a kiírás előtt találtam — ez nem opcionális

A mai kezdőérték (`SchedulingPage.tsx:22-24`):

```ts
const [selectedDate, setSelectedDate] = useState(() =>
  new Date().toISOString().split('T')[0]
)
```

**Ez UTC-t ad, nem helyi dátumot.** Budapesten (UTC+1/+2) éjfél és 01:00/02:00
között a `toISOString()` még az **előző** napot adja vissza — vagyis egy éjszakai
műszakban a képernyő a tegnapi tervet mutatná „mai"-ként, csendben.

A `@spaceos/portal-ui` **már megoldotta** ezt: a `dates.ts` `isoDate()`-je
kifejezetten helyi idejű, és a saját doksija ki is mondja az okát („nem UTC — a
`toISOString` zóna-eltolást okozna"). Az `addDays()` pedig naptári léptetést
csinál, nem ms-aritmetikát, tehát DST-váltáskor sem csúszik át.

**Kikötés: a dátumkezelés a `portal-ui` `dates.ts`-éből jöjjön** (`isoDate`,
`addDays`, `parseIsoDate`, `formatDayName`) — ne szülessen párhuzamos
implementáció, és a mai UTC-s kezdőérték is erre cserélődjön.

## Tartalom

1. **Dátumválasztó a fejlécben**, a „Terv napja" mellé:
   - dátum-beviteli mező (`YYYY-MM-DD`, magyar felirattal),
   - **előző / következő nap** léptetés (`addDays`), mert üzemi képernyőn a
     szomszédos napra ugrás a gyakori mozdulat, nem a naptárból kikeresés,
   - **„Ma"** visszaugrás.
2. **Bekötés:** a `selectedDate` már ma is meghajtja mind a három `useApi` URL-t
   és a `useBatchAssignment`-et — a hiányzó láncszem csak a `setSelectedDate`
   hívása. Ne szervezd át az adatlekérést.
3. **Design-system:** a lap a route-bekötéskor tokenizálva lett; a választó is
   tokenekkel készüljön (világos/sötét), beégetett szín nélkül.
4. **A11y:** a mezőnek legyen társított címkéje, a léptető gombok
   billentyűzetről elérhetők és beszédes nevűek (nem puszta „‹" / „›").

## Amit ez a szelet ingyen kap — és amit ezért mérni kell

A `useApi` **url-váltás ága** (`isPending` újra igaz, amíg az új nap adata meg
nem jön) az M3-bekötésben már megépült és tesztelt, **de a felületről eddig nem
volt elérhető**, mert nem lehetett napot váltani. Ezzel a szelettel élővé válik.

Nem kell újraírni — **de kell rá egy lap-szintű teszt**: napváltáskor a régi nap
adata ne maradjon a képernyőn „az új nap adataként" (skeleton jelenik meg, a
darabszám nem hazudik), majd az új adat érkezésekor álljon helyre. Ez az a
viselkedés, amiért a hook a `resolvedUrl`-t követi és nem egy logikai jelzőt.

## Határok

- **Backend nincs benne** — az API már dátum-paraméteres.
- Az `AssignmentConfirmModal` a11y-je a **PLAN-05 F4** (párhuzamos szelet,
  ugyanaz a fájlkörnyezet — egyeztesd a sorrendet, ne írjátok egymást).
- A `WorkflowPage` dark-mode adóssága **nem** ez a szelet.
- Tartomány-korlátozás (múltbeli napok tiltása, hétvége kizárása) **nincs** —
  ha üzemileg kellene, az termékdöntés, jelezd és ne találd ki.

## Kapuk

- Célzott vitest mért darabszámmal (a napváltás-teszttel együtt).
- `tsc --noEmit` + `npm run build` PASS.
- **Böngésző-kapu:** `npm run test:smoke:keyboard` — a SHELL-H1 maradjon
  **39 route / mind pontosan egy h1**; új bukást ne hozz. A 15 legacy világ
  `aria-current`-je ismert idegen adósság.
- Dark/light mérés a valós route-on (a route-bekötésnél bevált eldobható
  harness-szel), 0 beégetett fehér felület sötétben.
- Lint: stash-elt baseline-nal igazolt „nem hoztam újat".
- `review_requested` a szokásos bizonyítékokkal; done/APPROVED csak root-review.
