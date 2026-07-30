# PLAN-05 / F6 — Szerep-szótár bővítése (az ütemezés jogosultsága)

> ## ✅ LEZÁRVA ÉS ARCHIVÁLVA — 2026-07-30 (root)
>
> **APPROVED** 2026-07-29 (root-review), és az F6/2 (üzemi szerepek rácsa) is APPROVED (37/37). Gábor szerep-szótár döntése végrehajtva. ⚠ A doksi státusza „kiadva"-n maradt — a 2026-07-30-i átvizsgálás javította és archiválta.
>
> *Archiválás a `docs/tasks/<EPIC>/archive/` konvenció szerint. Az alábbi eredeti
> szöveg a lezárás pillanatában érvényes állapotot tükrözi — a benne lévő*
> *„Státusz" sor a munka közbeni állapot, nem a végső verdikt.*

- **Szerep:** frontend (portál) + a Keycloak-oldal a meglévő onboarding-scriptben
- **Méret:** M
- **Prioritás:** **az F4 blokkolójának feloldása** — vedd előre
- **Státusz:** kiadva (2026-07-29), Gábor döntése alapján

## A hiba

A `useSchedulePermissions` ezt nézi:

```ts
const canAssignBatches = roles.includes('machine_operator') || roles.includes('production_manager')
const maxPriority = roles.includes('production_manager') ? 10 : 5
```

A `parseUserClaims` viszont **kiszűri** ezeket (`AuthContext.tsx`):

```ts
const roles = realmAccess?.roles?.filter(r => ['Admin', 'Designer', 'Joiner'].includes(r)) ?? []
```

Következmény: `canAssignBatches` **mindig false**, a képernyő **mindenkinek
csak-olvasható** (Adminnak is), a 10-es prioritás-ág elérhetetlen.

**Root-megállapítás: a szűrő a hibás, nem a jogosultság-hook.** A hook már ma is
a helyes modellt kódolja (üzemvezető 10, gépkezelő 5) — csak a szótár nem
engedte be azokat a szerepeket, amikre írták. Ezért ez **bővítés**, nem
újratervezés.

**A szűrő nem mai regresszió:** a `HEAD`-ben is így áll (a gating-sáv csak
eltolta a sor számát). Nem a Codex világ-gating munkája okozta.

## Gábor döntése

**Bővítsük a szerep-szótárat** — a `production_manager` és a `machine_operator`
valódi realm-szerep. A mai három szerep (Admin/Designer/Joiner) túl szűk egy
üzemhez, és a Keycloak-provisioning már megvan
(`scripts/Invoke-KeycloakTenantOnboarding.ps1`, 42/42 Pester), tehát a
szótár bővítése ma olcsóbb, mint amikor a három szerep született.

## Tartalom

### 1. A claim-szűrő bővítése (`packages/portal-core`)

A szűrő maradjon allowlist (ismeretlen szerep ne szivárogjon be), de vegye fel a
két üzemi szerepet. **A lista egy helyen legyen kimondva** és onnan használódjon
— ma a `worldAccess.ts` `ROLE_PRIORITY`-ja is szerep-listát tart, és két
igazságot nem akarunk.

### 2. Jogosultsági mátrix

Ezt a leképezést javaslom — a hook mai szándékát követi, az `Admin`-t pedig
kimondja, mert ma sehol nem szerepel:

| Szerep | Köteg kiosztása | `maxPriority` |
|---|---|---|
| `production_manager` | igen | 10 |
| `machine_operator` | igen | 5 |
| `Admin` | igen | 10 |
| `Designer`, `Joiner` | nem (olvasás) | — |

Ha az `Admin` nem üzemi szerep és **nem** oszthat ki köteget, szólj — root
döntök, de ez a pont vitatható.

### 3. A tesztek valósághoz igazítása — ez a szelet lelke

A hibát **egy zöld teszt fedte el**: a `SchedulingPage.test.tsx`
`roles: ['machine_operator']`-t mockol, **olyan szerepet, amit az éles kód
kiszűrt**. A mock megengedőbb volt a valóságnál, és a rés alatta maradt.

Ezért kikötés: **a szerep-mockok ugyanazon az útvonalon jöjjenek létre, mint az
éles claim** — azaz a teszt egy realm-claimet adjon meg, és a `parseUserClaims`
állítsa elő belőle a `roles`-t, ne közvetlenül a kimenetet mockolja. Így egy
jövőbeli szűrő-szigorítás **buktatja** a tesztet, ahelyett hogy elrejtőzne
mögötte. Legalább egy negatív eset kell: ismeretlen szerep → nem oszthat ki.

### 4. Seedek

A `test-setup.ts` és a `VITE_AUTH_MODE=mock` fejlesztői seed kapja meg az új
szerepeket, hogy a beroutolt képernyő fejlesztés közben **működő** állapotban
legyen. ⚠ Ez a **gating-sáv két fájlját** érinti (`test-setup.ts`,
`AuthContext.tsx`) — a csatornán egyeztess, mielőtt hozzáérsz.

### 5. Keycloak-oldal (kód, nem éles művelet)

A két szerep kerüljön be az onboarding-profilba
(`config/tenant-onboarding.sample.json` + a runbook), hogy új bérlőnél
automatikusan létrejöjjön. **Az ÉLES realmen futtatás Gábor-kapu** — a scriptet
ne futtasd éles ellen.

## Határok

- A szerver-oldali jogosultság **nem** ez a szelet: a kiosztás API-ja úgyis
  authorizál, a kliens-oldali kapu csak a felület őszintesége.
- A világ-gating (`worldAccess.ts`) szerep-tengelye **más kérdés** (melyik
  világot látja), ne vond össze a kettőt — csak a szerep-lista forrása közös.

## Kapuk

Célzott vitest mért darabszámmal (a negatív esettel), `tsc` + build, lint
stash-elt baseline-nal. **Böngésző-kapu:** ezzel válik futtathatóvá az F4
fókuszcsapda/Escape mérése — ha már megvan, futtasd le és jelentsd együtt.
`review_requested`; done/APPROVED csak root-review.
