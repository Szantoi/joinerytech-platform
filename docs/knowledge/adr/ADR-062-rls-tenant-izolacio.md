# ADR-062: RLS — egységes tenant-izolációs minta a modulokban

- **Státusz:** PROPOSED — döntésre vár (root)
- **Dátum:** 2026-07-16
- **Felvetette:** KONTROLLING-BE-HOST (10.) — „a migráció nem hozza létre a
  `set_tenant_context` függvényt és a policy-ket — élesben minden DB-hívást megbuktat"
- **Súlyosság:** ⚠️ **a csomag legmagasabb kockázatú tétele** — két modulban **néma
  tenant-szivárgás**, nem elszállás

---

## Kontextus

Az állítás **modulonként igaz vagy hamis — és ahol hamis, ott sokszor rosszabb.**

### Modulonkénti valóság (kódból ellenőrizve)

| Modul | Migráció | `set_tenant_context` | CREATE POLICY | Interceptor | Éles kimenetel |
|---|---|---|---|---|---|
| **kernel** | 58 (9 policy-vel) | `set_config` | ✅ + **FORCE RLS** | ✅ `TenantSessionInterceptor` | ✅ **teljes, 3-rétegű** |
| **dms** | 3 | ✅ | ✅ 3 tábla | ⚠️ közvetlen `set_config` | ✅ működik |
| **maintenance** | 2 | ✅ | ✅ | ⚠️ közvetlen `set_config` | ✅ működik |
| **hr** | 2 | ✅ + 12 policy | ✅ | dob hibára | ⚠️ **a migráció nem alkalmazódik** |
| **kontrolling** | 1 | ❌ | ❌ | hív, **try/catch nélkül** | 💥 **minden DB-hívás elszáll** |
| **ehs** | 3 | ❌ | ❌ | hív, **elnyeli a hibát** | 🔓 **néma tenant-szivárgás** |
| **qa** | 1 | ❌ | ❌ | hív, **elnyeli a hibát** | 🔓 **néma tenant-szivárgás** |
| **crm** | 1 | ❌ | ❌ | **nincs interceptor** | 🔓 **semmi izoláció** |

### A négy hiba-osztály

**1. 🔓 EHS és QA — nem elszállnak, hanem *némán szivárognak*. Ez a legrosszabb.**
`src/qa/src/Infrastructure/Persistence/TenantDbConnectionInterceptor.cs:40-47` (szó szerint
ugyanez `src/ehs/…/TenantDbContextInterceptor.cs:40-47`):
```csharp
cmd.CommandText = $"SELECT qa.set_tenant_context('{tenantId}')";
cmd.ExecuteNonQuery();
}
catch (Exception)
{
    // Silently fail if RLS function doesn't exist (not yet migrated)
}
```
A függvény **nem létezik**, és **policy sincs** → a lekérdezések **minden tenant sorát
visszaadják**, hiba, riasztás és nyom nélkül. *(Ráadásul string-interpolációval épül az SQL —
a kernel paraméterezett `set_config`-ot használ, `TenantSessionInterceptor.cs:197`.)*

**2. 🟡 HR — a migráció létezik, de az EF nem látja.**
`src/hr/src/Infrastructure/Persistence/Migrations/20260707_002_EnableRLS.cs` tartalmilag
teljes (fn + 12 policy), de **hiányzik róla a `[DbContext]`/`[Migration]` attribútum** → a
`Database.Migrate()` számára láthatatlan. **A saját kódbázis dokumentálja, hogy ez valódi hiba** —
a DMS javította (`20260716080001_EnableRLS.cs:10-21`: *„hand-written migrations without them are
invisible to Database.Migrate()"*), a maintenance is (`20260707_002:10-14`) — **a HR kimaradt
a javításból.** Mivel a HR interceptora **dob** (nem nyel el), a HR élesben ugyanúgy elszáll,
mint a kontrolling.
→ **Ez az oka, hogy a HR-nek soha nem jött létre sémája — innen az ADR-060 ingyenes ablaka.**

**3. 💥 Kontrolling — az eredeti állítás pontosan itt igaz.**
`…/kontrolling/src/Infrastructure/MultiTenancy/TenantDbConnectionInterceptor.cs:50-53` feltétel
nélkül hívja a nem létező függvényt → **42883 undefined_function minden connection-nél**.

**4. 🔓 CRM — se interceptor, se RLS; a DbContext komment mégis RLS-t állít.**
`src/SpaceOS.Modules.CRM/src/Lead.Infrastructure/Persistence/CrmDbContext.cs:8-9`:
*„Tenant isolation is enforced by the repositories (and by PostgreSQL RLS in the deployed
database)."* — **az „RLS in the deployed database" sehol nem létezik kódban.** Hamis biztonság.

### ⚠️ Két rendszerszintű probléma, ami a „működő" modulokat is érinti

**A `FORCE ROW LEVEL SECURITY` egyetlen modul-migrációban sincs.** A doksi „(CRITICAL)"-ként
jelöli (`MULTI_TENANT_RLS_ARCHITECTURE_2026.md:117`); a kernel 11 fájlban használja. **Az
`ENABLE ROW LEVEL SECURITY` nem vonatkozik a tábla tulajdonosára** — ha az alkalmazás a
tulajdonos szerepben kapcsolódik (és a migrációkat futtató szerep tipikusan ugyanaz), a
policy-k **csendben nem érvényesülnek**. **Vagyis a DMS és a maintenance „működik" minősítése
feltételes** — a policy-jeik a deploy-szereptől függően no-op-ok lehetnek.

**A session-kulcs három néven fut:**

| Réteg | Kulcs |
|---|---|
| **Kernel** (`TenantSessionInterceptor.cs:50`) | `app.current_tenant_id` |
| **JT-modulok** (hr/dms/maintenance/qa/ehs migrációk + interceptorok) | `app.tenant_id` |
| **`DATABASE_PATTERNS.md:105,114,149`** | `app.current_tenant` |

→ **A kernel és a modulok RLS-kontextusa nem interoperábilis.** Ha egy modul valaha a kernel
tábláira olvas (vagy fordítva), a policy nem talál kontextust.

### A dokumentáció megbízhatatlan forrás itt

- `MULTI_TENANT_RLS_ARCHITECTURE_2026.md` **nem a futó kódot írja le** (2026-06-22-es kutatás):
  a `:72` olyan modulokat sorol, amik nem ezek; a `:98` mintakódja `SET LOCAL` +
  **string-interpoláció** — **pont az a két hiba, amit a kernel azóta kijavított**.
  ⚠️ A `SET LOCAL` **tranzakció-hatókörű**; `ConnectionOpened`-ben nincs nyitott tranzakció →
  **no-op**. A kernel doc-commentje (`TenantSessionInterceptor.cs:16-22`) pontosan ezt a bugot
  írja le (BE-P15-03), és `is_local=false`-szal oldja meg.
- `DATABASE_PATTERNS.md` **önmagával ellentmondásos** (`app.current_tenant` vs. a
  `snippets/rls-template.md:13` `app.tenant_id`-ja), és a `:124-126` kódpéldája
  (`"DISABLE ROW LEVEL SECURITY ON \"Orders\";"`) **szintaktikailag érvénytelen PostgreSQL**.

**A megbízható referencia a kernel** — az egyetlen futó, 3-rétegű, kódból ellenőrizhető
implementáció. *(A VPS-en futó további modulok — inventory, procurement, cutting… — forrása
**lokálisan nem elérhető** (inicializálatlan submodule-ok), így mintaként ma nem
vizsgálhatók; ld. ADR-061 módszertani megjegyzés.)*

---

## Döntendő kérdés

**Egységes tenant-izolációs minta — hol lakik, milyen kulccsal, és mi a védelmi rétegek száma?**

---

## Opciók

### (a) Közös baseline az ADR-061 platform-csomagban + kernel-minta átvétele

Egy `SpaceOsTenantInterceptor` (paraméterezett `set_config`, **fail-fast**, pool-reset) +
migrációs SQL-sablon (`ENABLE` + **`FORCE`** + policy + fn), **egy session-kulcs**.

- **Következmény:** egy hely; a drift szerkezetileg megszűnik. A kernellel interoperábilis.
- **Munkaigény:** interceptor+sablon ≈1,5 nap; modulonként ≈0,5-1 nap × 6 ≈ **5-6,5 nap**.
- **Kockázat:** alacsony. A `FORCE RLS` bevezetése deploy-szerep-ellenőrzést igényel.

### (b) Csak a 4 törött modul foltozása (kontrolling/ehs/qa/crm + HR-attribútum)

- **Következmény:** a tünetek megszűnnek, a **drift megmarad** (5 interceptor, 3 viselkedés,
  2 session-kulcs). A `FORCE RLS` és a kulcs-egységesítés kimarad.
- **Munkaigény:** ≈3 nap.
- **Kockázat:** a következő modul újra elrontja; a néma-szivárgás osztály visszatérhet.

### (c) RLS elhagyása — app-szintű izoláció (`HasQueryFilter` + repository `WHERE`)

- **Következmény:** **egyrétegű** védelem; egy elfelejtett query = szivárgás. Ellentmond a
  `MULTI_TENANT_RLS_ARCHITECTURE_2026`-nak és az ADR-004 need-to-know elvének. Cserébe:
  Postgres nélkül tesztelhető, nincs `FORCE`/szerep-probléma.
- **Kockázat:** magas. **Elvetendő elsődlegesként** — de **második rétegként értékes**: a
  kernel 13 entitáson használ `HasQueryFilter`-t az RLS **mellett**. A JT-modulok közül
  **egyik sem** (a kontrolling egyetlen filtere soft-delete, nem tenant).

### Al-döntés: session-kulcs

- **(K1) `app.current_tenant_id`** — a kernelé (58 migráció, 9 policy).
- **(K2) `app.tenant_id`** — a JT-moduloké (5 modul migrációi + interceptorai).

---

## Ajánlás

> **(a) — közös baseline az ADR-061 csomagban, a kernel mintájára; + (c) mint MÁSODIK réteg
> (`HasQueryFilter` minden tenant-scoped entitásra); + `FORCE ROW LEVEL SECURITY` mindenhol;
> + (K1) `app.current_tenant_id` az egyetlen kulcs.**
>
> **És a legfontosabb egysoros szabály: az interceptor SOHA ne nyelje el a hibát.**

**Indoklás:**

1. **A néma elnyelés a legsúlyosabb hibaosztály a csomagban.** Egy elszálló modul (kontrolling)
   **kiabál** — észreveszed az első kérésnél, és nem kerül élesbe. Egy néma szivárgás (EHS, QA)
   **kiszolgálja a kérést**, idegen tenant adatával, nyom nélkül. Multi-tenant SaaS-ban ez a
   legrosszabb kimenetel: a kontrolling „hibája" valójában a **helyes** viselkedés.
   **A `catch (Exception) { }` blokk törlése önmagában többet ér, mint az összes többi
   RLS-munka** — ezt a doksi is előírja (`MULTI_TENANT_RLS_ARCHITECTURE_2026.md:92-95`:
   `throw new InvalidOperationException("Tenant context not set")`), a QA/EHS pedig
   `if (tenantId != Guid.Empty)`-vel némán átugorja.

2. **(K1), mert a költség aszimmetrikus.** A kernel 58 migrációja (9 policy-vel) és 11
   `FORCE RLS` fájlja vs. 5 modul, aminek **3-ból 0 éles adata van** (a HR sémája létre sem
   jött). **Olcsóbb az 5 modult a kernelhez igazítani, mint a kernelt átírni** — és cserébe a
   két világ interoperábilissá válik. A `DATABASE_PATTERNS.md` harmadik kulcsa (`app.current_tenant`)
   egyszerűen **hibás** → javítandó, nem megőrzendő.

3. **A `FORCE RLS` nélkül a policy dísz.** Enélkül a „működik" minősítésű DMS/maintenance is
   csak akkor izolál, ha az app **nem** a tábla tulajdonosaként kapcsolódik — ez ma **nincs
   ellenőrizve**. A doksi „CRITICAL"-ja jogos; a kernel betartja, a modulok nem.
   **Ellenőrizni kell a deploy-szerepet is, nem csak az SQL-t.**

4. **A kettős réteg olcsó, és ez a lényege.** A `HasQueryFilter` ≈0,5 nap/modul, és pont attól
   véd, ami a legvalószínűbb: egy elfelejtett `WHERE`, egy rosszul konfigurált szerep, egy
   `FORCE` nélküli tábla. A `MULTI_TENANT_RLS_ARCHITECTURE_2026.md:152-157` rationale-ja
   („ha 1 layer fail, a másik 2 still protect") **helyes — csak sehol nincs betartva a
   modulokban.**

5. **(b) nem olcsóbb, csak rövidlátóbb.** 3 nap vs. 5-6,5 — a különbözetért cserébe eltűnik
   5 interceptor-másolat és 3 divergens viselkedés. Ha az ADR-061 csomagja megépül, ez
   **ugyanaz a munka, ugyanabban a fájlban**.

**⚠️ A bizonyíték-szabály:** az RLS-t **nem lehet unit-teszttel bizonyítani**. Minden modulba
kell **egy** Testcontainers-teszt: *„A tenant kontextusával nem látom B tenant sorát"* —
valódi Postgresszel, a valódi deploy-szereppel. Enélkül a „kész" állítás nem ellenőrizhető,
és pontosan ide jutunk vissza. *(Kapcsolódó adósság: a QA/HR integrációs készlet ma nem fut —
QA-INTEGRATION-FIX, HR-INTEGRATION-FIX.)*

---

## Hatás

**Azonnal javítandó (döntéstől függetlenül, sorrendben):**
1. **EHS + QA:** `catch (Exception) { }` **törlése** → fail-fast. *(A szivárgás megszűnik; a
   modul elszáll, amíg a 2. pont nincs kész — ez a helyes sorrend.)*
2. **EHS, QA, kontrolling, CRM:** fn + policy + `FORCE` migráció.
3. **HR:** `[DbContext]`/`[Migration]` attribútumok → a séma először jön létre
   (**ADR-060-nal egy körben!**).
4. **CRM:** interceptor + a hamis `CrmDbContext.cs:8-9` komment javítása.

**Érintett:** 5× `TenantDbConnectionInterceptor` (→ 1 közös) · 6 modul migrációi ·
`docs/knowledge/patterns/DATABASE_PATTERNS.md` (3 hiba: kulcs, érvénytelen SQL, `SET LOCAL`) ·
`MULTI_TENANT_RLS_ARCHITECTURE_2026.md` (elavult modul-lista, interpolált mintakód).

**Migráció:** **igen, minden modulban** — de **adat nincs**, tehát kockázatmentes. A
`FORCE RLS` bevezetése **deploy-szerep felülvizsgálatot** igényel (ne a tábla tulajdonosaként
kapcsolódjon az app).

**Munka:** ≈5-6,5 nap (ADR-061 csomagjával közösen ≈4, mert ugyanaz a váz).

**Blokkol-e élesítést?** **IGEN — ez a csomag legmagasabb kockázatú tétele.** Éles adat mellett
az EHS/QA jelenlegi állapota **tenant-közti adatszivárgás**. Ma nincs kitettség (a JT-hostok
nincsenek deployolva), de a deploy előtt **kötelező**.
**Az ADR-061 (T1) nélkül önmagában nem elég:** hitelesítetlen `X-Tenant-Id` mellett a tökéletes
RLS is a hamisított tenantot érvényesíti. **A kettő együtt ad izolációt.**

---

## Döntés

**ELFOGADVA — Gábor, 2026-07-16:** az ajánlás szerint.


- [x] (a) Közös baseline (ADR-061 csomagban), kernel-minta — *ajánlott — ELFOGADVA*
- [ ] (b) Csak a törött modulok foltozása
- [ ] (c) RLS elhagyása, app-szintű izoláció
- [ ] Session-kulcs: **(K1) `app.current_tenant_id`** — *ajánlott* ☐ / (K2) `app.tenant_id` ☐
- [ ] `FORCE ROW LEVEL SECURITY` mindenhol + deploy-szerep felülvizsgálat? ☐
- [ ] `HasQueryFilter` 2. rétegként? ☐
- [ ] Tenant-izolációs Testcontainers-teszt modulonként kötelező? ☐

**Indoklás:**

---

## Kapcsolódó ADR-ek

- **ADR-061** (host-auth + tenant-identitás) — **testvér-döntés, együtt hatásos.**
- **ADR-060** (HR taxonómia) — a HR séma-létrehozás **közös körben**.
- **ADR-004** (RBAC need-to-know), **ADR-003** (audit trail) — a keret.
- Referencia: `spaceos-kernel/SpaceOS.Infrastructure/Persistence/TenantSessionInterceptor.cs`
  (`:50` kulcs, `:109` pool-reset, `:197` paraméterezett `set_config`).
</content>
</invoke>
