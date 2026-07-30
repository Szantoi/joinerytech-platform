# PORTALUI-PUBLISH — a `@spaceos/portal-ui` fogyaszthatóvá tétele (Doorstar)

- **Szerep:** frontend
- **Méret:** M
- **Kiváltó ok:** Gábor kérése (2026-07-29): *„segítsétek a munkájukat"* — a
  Doorstar portál fejlesztésének támogatása.
- **Felmérés:** `docs/knowledge/architecture/DOORSTAR_PORTAL_TOOLING_2026-07-29.md`
- **Státusz:** `blocked` — **a végrehajtás APPROVED** (root-review 2026-07-29: build + 811 teszt), de az **`npm publish` GÁBOR-KAPU**. ⚠ 2026-07-30: a task „kész" definíciója a fogyasztói átvétel, ezért **nem archiválható** a publikálás előtt. A commit kint van (`47ecd29`, portál `main`) — a push nem publikálás.
- **Licenc-előfeltétel:** a G5 eldőlt (**MIT**), tehát a publikálás jogi akadálya elhárult.

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

## ⚠ A semlegesség két sérülése — ezek nélkül a csomag nem publikálható

**1. A JoineryTech-brand benne van a semleges csomagban.**
`components/ui/Wordmark.tsx` beégetve tartalmazza a `joinery` / `tech`
szóvédjegyet és a `GrainMark` faerezet-logót. Ez a `@spaceos/portal-ui`-ban van
— abban, amit domain-mentesnek nevezünk és a Doorstarnak adnánk. A brand a
**legláthatóbb** kötés: egy másik cég portálja nem fogyaszthat a mi
szóvédjegyünket tartalmazó „semleges" csomagot.

Két járható út: **(a)** a `Wordmark`/`GrainMark` az **app-ba** költözik (egy
szóvédjegy nem UI-primitív) — ezt javaslom —, vagy **(b)** slot/prop-vezérelt
lesz, és a márkajelet a fogyasztó adja. A `Wordmark.test.tsx` vele megy.

**2. Nincs őr, ami a semlegességet fenntartaná.**
A backendnek van **szótár-őre** (iparági szó tilos a semleges magban), és ma
többször fogott is. A portálon **nincs ilyen** — a `portal-ui` semlegességét ma
figyelem tartja fenn, nem kapu. Kifelé publikált csomagnál ez kevés.

Kérek **egy egyszerű őrt** a szeletben: tiltott szólista a `packages/portal-ui/src`
felett (iparági és brand-szavak), a **provenancia-kommentek kivételével** — azok
dokumentálják, hogy egy primitív honnan lett általánosítva, és értéket hordoznak.

## ⚠ Egy mellékes defektus, javítsd ebben a szeletben

A `@spaceos/module-collaboration` **nincs `private: true`-ra állítva**, szemben
az összes többi workspace-csomaggal. Ez a B2B-08 modul, ami
**`changes_requested`** állapotban van — egy véletlen `npm publish` kivinné.
Állítsd `private`-ra.

## A fogyasztó átvételi feltételei (Doorstar, 2026-07-29) — ez a „kész" definíciója

A Doorstar tételes listát küldött arról, mi kell ahhoz, hogy **biztonságosan**
fogyaszthasson. Ezt vesszük a szelet átvételi feltételének — a fogyasztó
mondja meg, mikor használható, nem mi:

1. **Verziózott hozzáférés:** privát registry URL · csomagnév · jogosultsági
   beállítás · támogatott Node/package-manager · **pontos, rögzíthető verzió**.
2. **Önálló dokumentáció:** telepítés · stabil import-felület · peer
   dependencyk · **theme-provider** · komponensenként a támogatott és tiltott
   használat. (A theme/Tailwind-igény kimondása kötelező — ez a leggyakoribb
   „nálam nem néz ki jól" ok.)
3. **Migrációs útmutató komponensenként:** Doorstar-előfeltétel · **ismert
   viselkedéskülönbség** · **rollback-lépés** · minimális mintakód.
4. **Változásközlés:** changelog · **breaking-change jelölés** ·
   verzió-emelési üzenet · kontraktus-hash példa.
5. **Semlegességi kapu automatizált CI-ellenőrzéssel:** a `portal-ui` márka-,
   tenant-, auth- és iparági-domain **mentes**; a `Wordmark` az alkalmazásban
   vagy sloton keresztül él.

⚠ Az 5. pontot **tőlünk függetlenül ugyanígy azonosították** — ez megerősíti,
hogy nem pedantéria. És ők **CI-ellenőrzést** kérnek rá, nem szólistát a
review-ban: a semlegességnek gépi kapunak kell lennie.

## Kapuk

- A **meglévő portál** build + teljes teszt-suite zöld a `dist`-re állítás után
  (ez a valódi kockázat: a workspace-fogyasztó törése).
- `tsc --noEmit` tiszta, a `.d.ts` generálódik.
- A fogyasztói próba **mért bizonyítékkal** (mit renderelt, milyen verzióból).
- `review_requested`; done/APPROVED csak root-review.
