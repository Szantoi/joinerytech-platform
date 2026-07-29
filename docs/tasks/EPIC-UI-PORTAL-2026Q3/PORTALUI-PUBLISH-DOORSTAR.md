# PORTALUI-PUBLISH — a `@spaceos/portal-ui` fogyaszthatóvá tétele (Doorstar)

- **Szerep:** frontend
- **Méret:** M
- **Kiváltó ok:** Gábor kérése (2026-07-29): *„segítsétek a munkájukat"* — a
  Doorstar portál fejlesztésének támogatása.
- **Felmérés:** `docs/knowledge/architecture/DOORSTAR_PORTAL_TOOLING_2026-07-29.md`
- **Státusz:** kiadva (2026-07-29)

## A probléma

A stackek egyeznek (React 19 · Router 7 · Tailwind 4 · TanStack Query · Zustand),
a primitív-készletünk náluk **futna** — de **minden workspace-csomagunk
`private: true`**, és forrást exportál (`"." : "./src/index.ts"`), nem buildelt
`dist`-et. Registry-konfiguráció sincs. Vagyis a Doorstar ma **másolni tud,
fogyasztani nem** — és pontosan ez szülte azt a tizenkét duplikátumot, amit a
felmérés listáz (köztük a `GanttChart` és a `DependencyGraph`, amiket **az ő
kódjukból** általánosítottunk).

## Tartalom

1. **Build-lépés a `@spaceos/portal-ui`-hoz**: `dist` (ESM + `.d.ts`), az
   `exports` a buildelt kimenetre mutasson. A workspace-fogyasztók
   (`joinerytech-portal`) **ne törjenek** — ez a kapu.
2. **`private` feloldása + verziózás.** Kezdő verzió és changelog; a verzió
   tartalmi változásnál emelkedik (a hash-pin fegyelem analógja).
3. **Publikálás a privát registrybe** (GitHub Packages — a scheduling-repó
   `SPACEOS_PACKAGES_TOKEN` mintája szerint), CI-lépéssel.
4. **Peer-ek rendezése:** ma `clsx`, `react`, `react-dom`, `react-hot-toast`.
   Nézd át, hogy a `dist` tényleg nem húz be mást (pl. Tailwind-osztályok
   igényelnek-e konfigurációt a fogyasztónál — ha igen, **dokumentáld**, mert
   ez a leggyakoribb „nálam nem néz ki jól" ok).
5. **Fogyasztói próba**: egy eldobható projektben (nem a Doorstar repóban)
   telepítsd a publikált csomagot, és renderelj **egy** primitívet (javaslat:
   `QueryGate` vagy `GanttChart`). Ez a bizonyíték, hogy a csomag valóban
   fogyasztható — nem a build zöldje.
6. **Migrációs útmutató + stabil import-felület** — a Doorstar **tételesen
   ezt kérte** a válaszában (2026-07-29), és célzott PR-szeletekben cserélnének,
   nem párhuzamos készletet építve. Ezért:
   - az `exports` felület legyen **kimondottan stabil** (mit garantálunk, mit nem);
   - az útmutató a **konkrét cseréket** írja le, ne általánosságokat — az általuk
     megnevezett első jelöltekkel kezdve: **`ConfirmDialog`/megerősítési folyamat,
     `Button`/státuszjelölők, lekérdezés-állapotok** (`QueryGate`), majd később a
     rendelésregiszterhez és az Import Inboxhoz a `DataTable` + `DataTableCards`;
   - ahol a mi primitívünk **nem tud** valamit, amit az ő komponensük igen, azt
     az útmutató **mondja ki** — az nálunk bővítés, nem az ő hibájuk.

## Határok

- **Csak a `portal-ui`.** A `portal-core` auth/tenant-fogalmakat visz, ami a
  Doorstar saját identitás-modelljével ütközhet → **második kör, külön döntés**.
  A `lib/roles.ts` egyelőre maradjon náluk.
- A Doorstar repójához **ne nyúlj** — az másik projekt. A mi dolgunk a csomag
  és a jelzés.
- A `@joinerytech/world-*` csomagok iparág-specifikusak, nem ide tartoznak.

## ⚠ Egy mellékes defektus, javítsd ebben a szeletben

A `@spaceos/module-collaboration` **nincs `private: true`-ra állítva**, szemben
az összes többi workspace-csomaggal. Ez a B2B-08 modul, ami
**`changes_requested`** állapotban van — egy véletlen `npm publish` kivinné.
Állítsd `private`-ra.

## Kapuk

- A **meglévő portál** build + teljes teszt-suite zöld a `dist`-re állítás után
  (ez a valódi kockázat: a workspace-fogyasztó törése).
- `tsc --noEmit` tiszta, a `.d.ts` generálódik.
- A fogyasztói próba **mért bizonyítékkal** (mit renderelt, milyen verzióból).
- `review_requested`; done/APPROVED csak root-review.
