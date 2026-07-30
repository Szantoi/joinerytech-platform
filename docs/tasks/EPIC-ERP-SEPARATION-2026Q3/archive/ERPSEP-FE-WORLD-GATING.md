# ERPSEP-FE-WORLD-GATING — tenant-kötött világ-láthatóság a portálon

> ## ✅ LEZÁRVA ÉS ARCHIVÁLVA — 2026-07-30 (root)
>
> **APPROVED + commitolva** 2026-07-29 (root-review, portál `bf67ec1`). Mind a három pont zárva: a metszet visszaállt (entitlement **és** szerep), Gábor döntésével a `Joiner` → `production` + `settings`, és a fail-closed szerep-őr a helyén. ⚠ A doksi státusza `review_requested`-en maradt — a csatornán is voltak korábbi, a jóváhagyás ELŐTTI „review_requested" bejegyzések, ami könnyen félrevezet. Az `EPICS.yaml` volt a pontos.
>
> *A lenti eredeti szöveg „Státusz" sora a munka közbeni állapot, nem a végső verdikt.*

- **Epic:** EPIC-ERP-SEPARATION-2026Q3 · **Mérföldkő:** E2-package-boundaries
- **Szerep:** frontend-auth · **Státusz:** review_requested (végrehajtás kész, root-review vár)
- **Kiírva:** 2026-07-27 (root), Gábor kérése: „Tudjuk tenanthoz kötni, hogy
  melyik világok jelenjenek meg… a legfontosabb a termékesítés."
- **Prioritás-indok:** ez a termékesítés első látható darabja — két tenant
  ugyanazon a portálon MÁS világ-készletet lát, a megvásárolt modulok szerint.

## A helyzet (kódból)

- A JWT-ben MÁR MA utazik az `enabled_modules` claim, és az AuthContext
  parsolja (`parseUserClaims` → `enabledModules: string[]`).
- A világ-rács (Home) és a route-ok viszont NEM szűrnek rá: minden
  bejelentkezett user minden világot lát. Az ADR-067 ezt kimondottan hibának
  rögzíti (Kernel-allowlist vs portal enabled_modules „bizonyítottan
  diszjunkt").

## A cél

1. **Home-rács szűrés:** csak azok a világ-csempék jelennek meg, amelyekhez a
   tenant claimje modult ad. **Fail-closed** (ADR-067 7. döntés): üres/hiányzó
   claim → csak a mindenkinek járó alap-csempék (pl. settings), SOHA nem
   „minden".
2. **Route-guard:** a nem engedélyezett világ URL-re (deep-link!) nem
   renderelődik — barátságos „ez a modul nincs előfizetve" képernyő, nem üres
   oldal és nem crash.
3. **world→module térkép configból** (ADR-067 world≠module elv): egy világ
   több modul kompozíciója lehet (pl. production = cutting+joinery), a térkép
   EGY config-fájlban él, nem szétszórt feltételekben. A legacy világok
   besorolása is itt dől el (amíg nincs mögöttük modul: az ADR-067 szerint
   nem szállítható → alapértelmezetten rejtett, dev-flaggel megjeleníthető).
4. **Mock-mód:** a dev mock-user claimje configból szűkíthető — így fejlesztés
   közben ki lehet próbálni a „szegényebb" tenant nézetét is.

## Biztonsági keret — a gating UX-réteg, NEM jogosultsági forrás

(Doorstar-oldali pontosítás nyomán explicitté téve, 2026-07-27:) a JWT
`enabled_modules` claim **UI-hint** — azt vezérli, MI JELENIK MEG, nem azt,
mihez lehet hozzáférni. A tényleges jogosultság-kikényszerítés a szerver-oldal
dolga (backend endpoint-authz + RLS + a Kernel entitled/enabled ellenőrzése,
ERPSEP-05/06 sáv). Ez a task tehát terméknézet-szűrés: egy manipulált
klienssel megjelenített világ is üres/403 marad, mert az API nem szolgálja ki
— és ezt a feltevést a taskban egy teszt mondja ki (a gating megkerülése nem
ad adat-hozzáférést a mockon sem).

## Nem cél (külön sáv)

- A claim-oldal (Keycloak mapper, Kernel Tenant.EntitledModules admin-API) —
  az ERPSEP-05/06 és a Kernel-tier dolga; ez a task azt fogyasztja, ami a
  tokenben van.
- Fizikai csomag-szétválasztás (MODULE-PACKAGES) — ez a task attól független,
  előtte is leszállítható.

## Elfogadási kritérium

- [x] world→module térkép egy config-fájlban, tesztekkel (ismeretlen világ →
      fail-closed rejtett).
- [x] Home-rács: két különböző claim-készlettel két különböző rács renderelődik
      (teszt bizonyítja); üres claim → csak alap-csempék.
- [x] Route-guard: nem engedélyezett világ deep-linkje a „nincs előfizetve"
      képernyőt adja (teszt + browser-smoke kiterjesztés).
- [x] A 7 modul-világ + production/warehouse besorolva; legacy világok
      alapértelmezetten rejtve (dev-flag dokumentálva).
- [ ] Célzott tesztek + tsc + lint + build zöld; done-t a root-review állít.

## Kapcsolódás

ADR-067 (öt-állapotú életciklus — ez a `usable` réteg portál-oldali fele),
ERPSEP-06 (Instance Context API — később a claim helyett/mellett hitelesített
kompozíció-forrás), WORLDS-WAREHOUSE-FIX (a warehouse világ-kulcsok érintettek
— ütemezés a fix UTÁN, fájlütközés elkerülésére).

## Végrehajtási napló — 2026-07-28 (Codex)

- A `src/config/worldAccess.ts` az egyetlen world→module policy: a hét
  SpaceOS-modul, valamint a két teljes entitlementet igénylő kompozit világ
  (production, warehouse) szerepel benne. Az összes többi regisztrált világ
  tételes `HIDDEN_LEGACY_WORLDS` besorolást kapott, ezért fail-closed módon
  rejtett. Fejlesztői megjelenítéshez kizárólag
  `VITE_SHOW_LEGACY_WORLDS=true` használható.
- A Home a claim-készlet szerint renderel. A `src/auth/RequireAuth.tsx` a
  `/w/:world` deep-linkeket is ellenőrzi, de az API authorization/RLS nem
  helyettesíthető vele.
- A claim parser JSON-string tömböt és kizárólag a hosting-szerződés szerinti
  `enabled_modules` alakot fogadja el; a régi rövid modulazonosítókat a kliens
  configja kanonikusra fordítja.
- Bizonyíték: célzott Vitest **4 fájl / 15 teszt PASS**; érintett fájlok ESLint
  PASS; `npm run build` (`tsc -b` + Vite) PASS. A lokális browser-smoke szerint
  `/w/production` a tiltó képernyőt, `/w/crm` a CRM shellt jeleníti meg.
- A teljes `npm run lint` 60 másodperces futtatási keretben nem adott eredményt
  (ismert legacy lint-adósság); ezért az utolsó össz-kapu és a done állapot a
  root-review része marad.

## Kapujavítás — 2026-07-29 (Codex)

- A közös teszt- és fejlesztői mock tenant korábban nem tartalmazta a kompozit
  termékek teljes entitlementjeit. A productionhoz `joinerytech.cutting` **és**
  `joinerytech.joinery`, a warehouse-hoz `joinerytech.inventory` **és**
  `joinerytech.procurement` kell; a hiányos baseline emiatt tévesen a tiltott
  oldalra küldte a jogosan megnyitható route-okat.
- A shared test seed és a `VITE_AUTH_MODE=mock` fejlesztői seed most teljes,
  kanonikus entitlement-készlet. A korlátozott tenant viselkedése továbbra is
  célzott gate tesztekben bizonyított; a hidden legacy `shopfloor` világ teljes
  entitlement mellett is tiltott.
- Bizonyíték: célzott Vitest futtatás **4 fájl / 16 teszt PASS**; `npm run build`
  **PASS**. Browser-smoke: `/w/production/cutting` a `Gyártás / Szabászat`
  képernyőt rendereli, nem a tiltó oldalt.

## ROOT-REVIEW — 2026-07-29: **CHANGES REQUESTED** (1 P1 + 2 P2)

**Root-mérés (reprodukálva, túlteljesítve):** 5 fájl / **23 teszt PASS**
(`RequireAuth.test.tsx`, `worldAccess.test.ts`, `HomeScreen.test.tsx`,
`App.test.tsx`, `AuthContext.claims.test.ts`) — a jelentett 4 fájl / 16 teszt
mellé a `worldAccess.test.ts`-t is bevettem.

**Elfogadott:** a gyökérok-diagnózis pontos, a fail-closed tengely valóban
őrzött (`/w/production` szűk claimmel tiltott; rejtett legacy `/w/shopfloor`
**teljes entitlement mellett is** tiltott; üres claim → csak `settings`).
Az `App.test` shopfloor-esetének törlése **nem** coverage-vesztés: az a teszt a
bejelentkezést mérte, nem a kaput; a `RequireAuth.test` erősebb nála.
`isWorldEnabled` alapból fail-closed (ismeretlen világ → `false`).

### P1 — a szerep-alapú szűkítés nyom nélkül eltűnt

A `HomeScreen`-ből kikerült a `ROLE_WORLDS` + `getVisibleWorlds(roles)`, és a
rács tisztán bérlői entitlementre váltott. Következmény: egy **`Joiner`** a
teljes entitlementű bérlőben **minden világot lát** — korábban csak a
`shopfloor`-t. Az entitlement (mit vett meg a bérlő) és a szerep (mit csinálhat
ez az ember) két külön tengely; a task az elsőről szólt, a második csendben
megszűnt. Egyetlen teszt sem őrzi: minden gating-teszt `roles: ['Admin']`.

Nem hozzáférési rés (az API szerver-oldalon dönt, a route mögött ott a kapu), de
a felületen sérül a legkisebb jogosultság elve. A szerep-alapú rács dokumentált
viselkedés volt — a STAB-TENANT-ONBOARDING lelete is erre hivatkozik
(„HomeScreen.tsx:23-30 szerep-alapú").

**Gábor döntése (2026-07-29): vissza kell állítani.** A kért alak a **metszet**:
a rács akkor mutasson egy világot, ha az entitlement **ÉS** a szerep is engedi.
Kötelező teszt-fedettség a Joiner-esetre. Az entitlement-kapu additív, ezért a
közös kapu közben zöld maradhat — ez a javítás nem blokkol mást.

### P2/1 — az anonim ág fail-open

`isAuthenticated ? visibleWorlds(WORLD_ORDER, enabledModules) : WORLD_ORDER` —
be nem jelentkezett látogató mind a 28 világot látja, köztük a
`HIDDEN_LEGACY_WORLDS` elemeit, amiket ez a változás épp elrejteni akar.
Öröklött viselkedés, de most ellentmond a saját szándékának.

### P2/2 — camelCase claim-tolerancia

`parseUserClaims` az `enabled_modules` mellett `enabledModules`-t is elfogad. Az
ERPSEP-06 hosting-döntés **snake_case**; a kétalakú olvasás elrejt egy elrontott
Keycloak-mappert ahelyett, hogy buktatná. Ha marad, indoklással.

## Javító kör — 2026-07-29 (Codex, review-ra visszaküldve)

- A Home-rács visszakapta a deklaratív `ROLE_WORLDS` policyt a
  `worldAccess.ts` konfigurációban. A látható csempe most a személy legmagasabb
  ismert szerepkörének engedélye **ÉS** a tenant `enabled_modules`
  entitlementjének metszete. A route-gate változatlanul csak tenant-előfizetést
  kezel; tényleges hozzáférést továbbra is a szerver autoritása dönt el.
- A teljes entitlementű `Joiner` negatív kontrollja bizonyítja, hogy CRM,
  Maintenance és Production csempe nem szivárog vissza. A Joiner számára
  látható modern célvilágot ez a teszt szándékosan NEM rögzíti: a
  termékkatalógus-döntésig nem szabad üres rácsot elvárásként kodifikálni.
- Az anonim Home nézet már ugyanazt a fail-closed entitlement policyt használja,
  ezért csak a `settings` alap-csempe marad és legacy világ nem hirdetődik.
- A camelCase `enabledModules` fallback kivezetve; ilyen Keycloak-mapper hiba
  üres entitlementet és így fail-closed viselkedést ad. A szerződés kizárólag
  snake_case `enabled_modules`.
- **Review-előtti termékdöntés:** a pontos szerep × entitlement metszetben a
  `Joiner` role történeti egyetlen világa (`shopfloor`) hidden legacy, így
  üres rácsot kap. A negatív teszt ezt bizonyítja, de a használható utódvilág
  (`production` vagy `settings`) kijelölése Gábor/root termékkatalógus-döntése;
  erre vár a végső review-kérés.

## Termékkatalógus-döntés — 2026-07-29 (Gábor)

- A Joiner a legacy `shopfloor` helyett a modern `production` világot kapja,
  és a `settings` alapvilágot is látja. A `ROLE_WORLDS` és a tesztek ezt a
  teljes entitlementű tenanton rögzítik: pontosan `production` + `settings`,
  CRM és warehouse nélkül.
- A több szerepet hordozó tokeneknél a történeti „legmagasabb jogosultság
  nyer” szabály is explicit regressziós tesztet kapott: a `['Joiner', 'Admin']`
  claim-sorrend is az Admin csempehalmazát adja, nem a tömb első elemét.
- Ismeretlen szerep teljes entitlementtel is üres rácsot kap; a szerep-policy
  ezen a tengelyen is fail-closed.
