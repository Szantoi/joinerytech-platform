# ERPSEP-FE-WORLD-GATING — tenant-kötött világ-láthatóság a portálon

- **Epic:** EPIC-ERP-SEPARATION-2026Q3 · **Mérföldkő:** E2-package-boundaries
- **Szerep:** frontend-auth · **Státusz:** pending (kiadható)
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

- [ ] world→module térkép egy config-fájlban, tesztekkel (ismeretlen világ →
      fail-closed rejtett).
- [ ] Home-rács: két különböző claim-készlettel két különböző rács renderelődik
      (teszt bizonyítja); üres claim → csak alap-csempék.
- [ ] Route-guard: nem engedélyezett világ deep-linkje a „nincs előfizetve"
      képernyőt adja (teszt + browser-smoke kiterjesztés).
- [ ] A 7 modul-világ + production/warehouse besorolva; legacy világok
      alapértelmezetten rejtve (dev-flag dokumentálva).
- [ ] Célzott tesztek + tsc + lint + build zöld; done-t a root-review állít.

## Kapcsolódás

ADR-067 (öt-állapotú életciklus — ez a `usable` réteg portál-oldali fele),
ERPSEP-06 (Instance Context API — később a claim helyett/mellett hitelesített
kompozíció-forrás), WORLDS-WAREHOUSE-FIX (a warehouse világ-kulcsok érintettek
— ütemezés a fix UTÁN, fájlütközés elkerülésére).
