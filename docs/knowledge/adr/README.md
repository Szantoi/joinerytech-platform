# ADR-index — JoineryTech platform

> Az „első kör" (EPIC-UI-PORTAL-2026Q3) során felgyűlt architektúra-döntések.
> **6 ADR (059–064), mind ELFOGADVA az ajánlás szerint — Gábor, 2026-07-16.**
> Számozás a `docs/knowledge/architecture/ADR_CATALOGUE.md` folytatása (utolsó: ADR-058).
>
> Végrehajtási sorrend (a függőségek szerint): **① 061+062** (hosting-csomag: auth + tenant
> JWT-ből + RLS — deploy-blokkolók) és vele párhuzamosan **② 060 + 063** (HR-taxonómia,
> QA-rework — domain-rétegek), majd **③ 059** (EnumWireMap — a 060/063 utáni enum-készletre)
> és **④ 064** részletei.

---

## ⚠️ Először ezt olvasd el — a sürgősség helyes értelmezése

**A 7 JoineryTech modul (ehs, qa, hr, dms, maintenance, crm, kontrolling) MA NEM FUT ÉLESBEN
— nincs VPS-deployjuk.** A VPS-en futó 11 service a **spaceos-világ** moduljai (kernel,
orchestrator, inventory, cutting, procurement, identity, sales…), nem ezek
(`architecture/VPS_SERVICE_STATE_2026-07-16.md:47-64`).

Ezért:

| | |
|---|---|
| 🟢 **Ami NEM igaz** | „Most szivárog tenant-adat." **Nincs aktív adatvédelmi incidens.** Nincs éles adat, nincs éles kitettség. |
| 🔴 **Ami igaz** | Az EHS/QA jelenlegi kódja **néma tenant-szivárgást** okozna, a CRM-ben **semmilyen izoláció nincs** — **a deploy pillanatában**. Ezek **deploy-blokkolók**, nem tűzoltás. |

**Következmény a prioritásra:** az RLS/auth ADR-ek (062, 061) **nem ma éjjel sürgősek** — de a
7 modul VPS-deployja **nem indulhat el** a döntésük és végrehajtásuk nélkül. A ma legdrágább
halasztás valójában az **ADR-059**: minden nap, amíg áll, a portal fetcher-átállása áll 4 modulon.

---

## A tábla

| ADR | A kérdés egy mondatban | Ajánlás | Sürgősség | Függőség |
|---|---|---|---|---|
| **[059](ADR-059-wire-nyelv.md)** — Wire-nyelv | Magyar vagy angol enum-kulcsok a dróton, és hol fordítunk? | **Magyar wire, fordítás a backend varratán** (`EnumWireMap`, kontrolling-precedens); a domain angol marad; EHS is HU-ra igazodik | 🟠 **Nem élesítés-blokkoló, de a legdrágább halasztás** — a portal fetcher-átállását blokkolja 4 modulon; a migrációs ablak (nulla adat) most nyitva | **Nincs — ez a többi 3 előfeltétele** |
| **[060](ADR-060-hr-enum-taxonomia.md)** — HR taxonómia | A HR készség-/részleg-készlete a faipari (portal) vagy az általános ipari (backend) legyen? | **Backend átveszi a faipari taxonómiát**; a `PayGrade` sáv-enum + config-ráta; a törzsadat-verzió (referencia-tábla) későbbre jegyezve | 🟠 **A HR élesítését blokkolja** — ma a fetcher-átállás nem lehet „MSW-lekapcsolás" | **059** (nyelv) + **062** (a séma-létrehozás közös körben) |
| **[061](ADR-061-host-auth-es-tenant-identitas.md)** — Host-auth + tenant-identitás | Hol lakik a modul-hostok közös auth-wiringje, és honnan jön a tenant-azonosító? | **Sziget-szintű platform-csomag** (kernel = referencia, nem függőség) + **a tenant a JWT-claimből** jöjjön, ne hitelesítetlen headerből | 🔴 **DEPLOY-BLOKKOLÓ** — a 7 modul VPS-deployja előtt kötelező. *(Ma nincs kitettség.)* **+2 azonnali bug**: CRM host használhatatlan; EHS/DMS védtelen | Testvér: **062** |
| **[062](ADR-062-rls-tenant-izolacio.md)** — RLS tenant-izoláció | Egységes tenant-izolációs minta — hol, milyen kulccsal, hány réteggel? | **Közös baseline a 061 csomagjában**, kernel-minta, `app.current_tenant_id`, **`FORCE RLS`**, `HasQueryFilter` 2. rétegként — és **az interceptor soha ne nyelje el a hibát** | 🔴 **DEPLOY-BLOKKOLÓ — a csomag legmagasabb kockázata.** EHS/QA: **néma szivárgás**; CRM: **semmi izoláció**; HR: a séma sosem jött létre. *(Ma nincs kitettség.)* | Testvér: **061** — **egyik sem izolál a másik nélkül** |
| **[063](ADR-063-qa-rework-conditional.md)** — QA rework/Conditional | Kell-e feltételes megfelelés + javítási hurok, és hol modellezzük? | **A hurok a Ticket-domainben** (már kész, reopennel); az Inspection immutable marad; újraellenőrzés = új Inspection | 🟡 **Nem élesítés-blokkoló** — de a QA fetcher-átállását blokkolja (3↔4 státusz) | **059** + **designer** |
| **[064](ADR-064-kontraktus-reszletek.md)** — Gyűjtő (5 tétel) | Assign-identitás/`createdBy`, Maint `Reported→InProgress`, DMS archive/reopen, Kontrolling `AppliesTo`, multi-currency | Guid + **írás-idejű** név-denormalizáció · él marad törölve · **DMS lezárva** · kontraktus nyer · HUF-only kimondva | 🟢 **Egyik sem élesítés-blokkoló** — az 1. tétel a 061-re vár; a UI addig Guidot mutatna | **061** (assign) + **059** (DMS-nyelv) |

---

## Javasolt döntési sorrend — két párhuzamos sáv

A sürgősségnek **két, eltérő tengelye** van; érdemes nem összekeverni őket.

### 1. sáv — kontraktus-döntések (a fetcher-átállást nyitják; **059 a kapu**)

```
ADR-059 (wire-nyelv)  ←── ELŐSZÖR: ez blokkolja a másik hármat
   ├── ADR-060 (HR taxonómia)     ← + ADR-062 séma-körrel együtt
   ├── ADR-063 (QA rework)        ← + designer
   └── ADR-064 (gyűjtő)           ← + ADR-061 az assign-tételhez
```

### 2. sáv — deploy-blokkolók (döntés-függetlenül indítható, **nincs 059-függés**)

```
ADR-061 (auth + tenant-claim)  ─┐
                                ├── együtt adnak tenant-izolációt
ADR-062 (RLS enforcement)      ─┘
```

**Ha csak egy dolgot döntesz ma: ADR-059.** Az 1. sáv teljesen áll nélküle, és a
migrációs ablak (nulla adat mindenhol) záródni fog.

**Ha csak egy dolgot indítasz el ma: ADR-061+062 közös csomagja.** Nem sürgős órákban,
de ~4-6,5 nap munka a deploy kritikus útján, és a 7 host addig nem mehet ki.

---

## Döntéstől független, azonnal javítható hibák

Ezek **nem ADR-kérdések** — az audit találta őket, és jóváhagyás után javíthatók:

| Hiba | Hol | Következmény |
|---|---|---|
| `AddAuthentication()` **séma nélkül** + `RequireAuthorization` | `SpaceOS.Modules.CRM/src/Lead.Api/Program.cs:17` | **A CRM host ma használhatatlan** — minden kérés elszáll, Developmentben is |
| Auth teljes hiánya | `src/ehs/src/Api/Program.cs`, `src/dms/host/Program.cs` | A hostok **védtelenül** futnak |
| `catch (Exception) { }` az RLS-interceptorban | `src/qa/…/TenantDbConnectionInterceptor.cs:40-47`, `src/ehs/…:40-47` | **Néma tenant-szivárgás** — ennek a törlése önmagában többet ér, mint a többi RLS-munka |
| Hiányzó `[DbContext]`/`[Migration]` attribútum | `src/hr/…/Migrations/20260707_00{1,2}_*.cs` | A HR sémája **soha nem jött létre** (a DMS/maintenance javította, a HR kimaradt) |
| Hamis komment: „RLS in the deployed database" | `SpaceOS.Modules.CRM/…/CrmDbContext.cs:8-9` | **Hamis biztonság** — nincs ilyen RLS |
| Authority-drift | `spaceos-modules-ehs/Ehs.Api/appsettings.json:17-19` (`auth.spaceos.local`) | Eltér a kernel/hr Authorityjétől |
| Elavult/hibás doksi | `patterns/DATABASE_PATTERNS.md` (3 hiba), `architecture/MULTI_TENANT_RLS_ARCHITECTURE_2026.md` | **Érvénytelen SQL-példa + 3 különböző session-kulcs** — ADR-forrásként félrevezet |
| Elavult ADR-jelölt | `docs/tasks/EPIC-UI-PORTAL-2026Q3/archive/F2-DMS-FE.md` 2. pont | A DMS-BE-HOST azóta lezárta (→ ADR-064 §3) |

---

## Módszertani megjegyzés (a döntés megbízhatóságához)

- **A tényeket kódból ellenőriztük**, nem a task-doksikból. Több forrás-állítás **elavultnak
  vagy pontatlannak** bizonyult (pl. „egyetlen host sem regisztrál auth-sémát" — a HR igen;
  „a DMS archive/reopen nyitott" — lezárva; „a migrációk nem hozzák létre a policy-ket" —
  modulonként eltér, és ahol hamis, ott **rosszabb**: néma szivárgás).
- ⚠️ **A VPS-en futó modulok (inventory, procurement, cutting…) forrása lokálisan NEM
  elérhető** (inicializálatlan submodule-ok; a `sales` repo GitHubon nem is létezik). Ezért
  „hogyan oldják meg a futó modulok" kérdésre **ma nem lehet kódból válaszolni** — az egyetlen
  ellenőrizhető, futó referencia a **kernel**, az ajánlások erre épülnek.
  Ha a döntés előtt kell a többi modul mintája:
  `git submodule update --init src/spaceos-modules-{inventory,cutting,procurement,joinery,abstractions}`
  vagy VPS-olvasás `/opt/joinerytech/src/` alatt.

---

## Formátum

Minden ADR: **Kontextus** (tényekkel, `fájl:sor` hivatkozásokkal) · **Döntendő kérdés** ·
**Opciók** (következmény / munkaigény / kockázat) · **Ajánlás + indoklás** · **Hatás** ·
**Döntés** _(Gábor tölti ki)_ · **Kapcsolódó ADR-ek**.

Az ADR-ek **nem döntenek** — opciókat és indokolt ajánlást adnak. A döntés-mező üres.
</content>
</invoke>
