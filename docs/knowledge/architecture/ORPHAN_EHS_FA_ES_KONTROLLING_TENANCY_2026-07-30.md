# Orphan EHS-fa és a kontrolling tenancy-regisztrációja — 2026-07-30

> **Készítette:** root (Claude). **Kiváltó ok:** a `rls-interceptor-switch-recon`
> workflow (7 modul felmérés + 7 megdöntési kísérlet + szintézis) két olyan
> leletet hozott elő, amit nem a fő kérdés keresett. Mindkettőt **függetlenül
> újramértem**, és mindkettő besorolása **szűkebb**, mint amilyennek elsőre látszott.

---

## 1. Az orphan `src/spaceos-modules-ehs` fa — **lappangó csapda, NEM élő rés**

### Amit a felmérés jelzett

Két rivális DI-belépő ugyanarra a `EhsDbContext`-re, és a `Program.cs` az
**interceptor nélkülit** hívja.

### Amit megmértem

| Kérdés | Mérés |
|---|---|
| Létezik és követve van? | **igen** — `src/spaceos-modules-ehs`, saját `SpaceOS.Modules.Ehs.sln`, **55 követett fájl** |
| `Ehs.Infrastructure/DependencyInjection.cs` interceptor-hivatkozás | **0** |
| `Ehs.Infrastructure/Extensions/ServiceCollectionExtensions.cs` | **1** |
| Melyiket hívja a host? | `Ehs.Api/Program.cs:22` → `AddEhsInfrastructure` — az **interceptor NÉLKÜLI** |
| Van EHS systemd-unit a VPS-en? | **0** (`list-unit-files … \| grep -ci ehs` = 0) |
| Le van buildelve a VPS-en? | **NINCS** — `Ehs.Api/bin` nem létezik |
| Futó `spaceos-*` service-ek közt van EHS? | **nincs** |

### Besorolás — és miért nem élesebb

**Ez nem élő tenant-izolációs rés**, mert a fát **semmi nem futtatja**: nincs
unit, nincs build, nincs futó service. **Halott kód egy lappangó csapdával**: aki
egyszer elindítja azt a hostot, egy interceptor nélküli `DbContext`-et kap, és a
FORCE RLS policy egy soha be nem állított session-kulcsra ül — vagyis vagy
fail-closed nulla sor, vagy (ha a policy megengedőbb) izolálatlan olvasás.

> **Ez pontosan a `két párhuzamos modul-fa` csapda**, amiről a tudástár azt írja:
> *audit-lelet előtt döntsd el, melyik fut* — mert egy korábbi CRM-lelet is a
> halott fára vonatkozott. Az **élő** EHS a `src/ehs`, és ott a felmérés szerint
> az interceptor **be van kötve** (a megdöntési kísérlet magas bizalommal
> fenntartotta).

### Teendő (nem sürgős, de nevesített)

- [ ] **Scope-döntés:** az orphan fa **törlendő**, vagy fenntartott build-cél?
      55 követett fájl + saját `.sln`. Amíg megvan, a csapda is megvan.
- [ ] Ha marad: a `Program.cs` álljon át az **interceptort bekötő** belépőre,
      **vagy** a másik belépő szűnjön meg (két igazság ugyanarról).
- [ ] Bármelyik irány: a döntés kerüljön a fa `README`-jébe, mert a következő
      olvasó ugyanezt a nyomozást fogja megismételni.

---

## 2. A kontrolling tenancy-regisztrációja — **megvan, de két rétegre osztva**

### Amit a felmérés jelzett

Az `AddKontrollingInfrastructure` az **egyetlen** a hét modulból, ami nem hívja
az `AddSpaceOsModuleTenancy()`-t (a hat másik ugyanabban a metódusban teszi
mindkettőt).

### Amit megmértem — és ez pontosítja a képet

```
src/.../kontrolling/src/Api/KontrollingServiceCollectionExtensions.cs:37
    services.AddSpaceOsModuleTenancy();            <-- MEGVAN, csak az API-retegben

src/.../kontrolling/src/Infrastructure/DependencyInjection.cs:40-41
    options.AddInterceptors(
        serviceProvider.GetRequiredService<SpaceOsTenantSessionInterceptor>());
```

Összehasonlításul a DMS, ahol egy metódusban van a kettő:
`src/dms/src/Infrastructure/DependencyInjection.cs:39` + `:49`.

### Besorolás — és a hibamód, ami ebből következik

**A regisztráció nem hiányzik**, csak **rétegek között oszlik meg**: az API-réteg
adja a tenancy-t, az Infrastructure-réteg fogyasztja az interceptort.

Ami ebből következik, és amiért érdemes rögzíteni: ha valaki az
`AddKontrollingInfrastructure`-t az **API-réteg nélkül** hívja (integrációs
teszt, worker-host, tooling), a `GetRequiredService<…>()` **dob**. Ez
**fail-loud**, nem néma rés — tehát a viselkedés helyes, csak a hívónak tudnia
kell a sorrendet, amit a hat másik modulnál nem kell.

⚠ **Fontos**: ez a rétegzés **nem hiba**, és nem javítandó „egységesítés"
kedvéért, ha van rá szándék. De **döntés kell róla**, mert ma nincs kimondva:

- [ ] **Root/backend-döntés:** az `AddKontrollingInfrastructure` hívja-e maga az
      `AddSpaceOsModuleTenancy()`-t (mint a hat másik), vagy marad a rétegzés?
      Ha marad, **a metódus doksijába kerüljön be az előfeltétel** — különben a
      következő teszt-író egy `GetRequiredService` kivételen tanulja meg.

---

## 3. Mellékes, de figyelemre méltó: öt modul mögött nem fut service

A futó `spaceos-*` unitok (VPS, 2026-07-30): `abstractions` · `cutting-svc` ·
`inventory` · `joinery` · `kernel` · `knowledge` · `minio` · `modules-identity`
· `modules-sales` · `orchestrator` · `procurement`.

**Nincs köztük EHS, HR, QA, DMS, kontrolling.**

A gyökér `CLAUDE.md` állítása — *„mind a 7 modul mögött **futtatható**
backend-host"* — **így igaz**: futtathatóság ≠ futó service. De érdemes
kimondani, mert a két állítás könnyen összeolvad, és egy „7/7 modul kész"
olvasat mást sugall, mint amit a VPS mutat.

- [ ] Nem teendő, csak **rögzítés**: ha valaki üzemi állapotra hivatkozik, a
      „futtatható" és a „fut" különbségét tegye ki.
