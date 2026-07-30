# STAB-CRM-LIST-PAGING — CRM listaolvasás adatbázisoldali lapozással

> ## ✅ LEZÁRVA ÉS ARCHIVÁLVA — 2026-07-30 (root)
>
> **APPROVED** 2026-07-29 (root-review, 123/123 saját mérés). A lead/opportunity lista SQL-lapozásra állítva (Codex). Commit: `748f8e7`. ⚠ Egy tétel külön P2-ként él tovább: a lapozás-metaadat wire-re emelése.
>
> *Archiválás a `docs/tasks/<EPIC>/archive/` konvenció szerint. Az alábbi eredeti
> szöveg a lezárás pillanatában érvényes állapotot tükrözi — a benne lévő*
> *„Státusz" sor a munka közbeni állapot, nem a végső verdikt.*

- **Epic:** `EPIC-PLATFORM-STABILITY-2026Q3`
- **Szerep:** backend
- **Prioritás:** P1
- **Státusz:** `review`
- **Függőség:** nincs
- **Mutációs határ:** CRM domain repository-szerződések, EF repositoryk, lead/opportunity lista-handlerek és tesztduplák
- **Tiltott scope:** task/activity workflowk, portal query-kontraktus, adatbázis-séma vagy RLS-policy

## Cél és üzleti eredmény

A portál 50 soros CRM lead- és opportunity-listája nem tölti be a tenant összes
aggregate-jét memóriába; a szűrés, rendezés, darabszám és lapozás az adatbázisban
történik.

## Preflight

A `GetLeadsQueryHandler` és `GetOpportunitiesQueryHandler` a
`GetByTenantAsync` után memóriában szűrt, számolt és lapozott. Nagy tenantnál
ez minden listaolvasáskor O(tenant-aggregate) terhelést okozott, függetlenül a
válasz 50 soros méretétől.

## Megvalósítási lépések

1. A CRM repository-szerződésekhez dedikált, read-side `GetPageAsync` metódus
   és `RepositoryPage<T>` eredmény került.
2. EF Core implementációk `AsNoTracking`, tenant/státusz/felelős/keresés
   predicate, `CountAsync`, rendezés és `Skip/Take` SQL-láncot használnak.
3. A két lista-handler csak az oldal elemeit DTO-zza; nem hív többé
   `GetByTenantAsync`-t.
4. A tesztduplák ugyanazt a lapozási szerződést valósítják meg, új regressziós
   tesztek pedig tiltják a tenant-szintű teljes betöltést.

## Elfogadási kritériumok

- [x] Lead és opportunity listázásnál szűrés + `Count` + `Skip/Take` az EF
  query-ben történik.
- [x] Lista-handler nem hív `GetByTenantAsync`-t.
- [x] Tenant, státusz és felelős filter megmarad; lead keresés megmarad.
- [x] Listaolvasások `AsNoTracking` módon futnak.
- [x] Célzott és teljes CRM regresszió zöld.

## Stop / eszkaláció

A jelenlegi endpointok nem teszik ki a `page/pageSize` query-paramétereket és
a portál csak az alapértelmezett első oldalt használja. Ezek publikus
wire-szerződés- és UX-változások, külön portál/API taskot igényelnek. A
task/activity és forecast lekérdezések más használati esetei továbbra is
teljes tenant-aggregate-olvasást végeznek; nem részei ennek a lista-szeletnek.

## Végrehajtási napló

2026-07-29 — A performance javítás csak az auditban név szerint érintett lead
és opportunity lista-handlereket módosította. A domain íróútjai és a teljes
aggregate-et szándékosan használó task/activity workflowk változatlanok.

## Átadási bizonyíték

```text
dotnet test src/SpaceOS.Modules.CRM/tests/Lead.Tests/SpaceOS.Modules.CRM.Tests.csproj --no-restore --nologo
Passed: 123, Failed: 0
```

Külön regressziós teszt igazolja a `GetPageAsync` hívást és azt, hogy a két
handler nem hívja a `GetByTenantAsync` teljes-terhelő metódust. Root diff-review
és commit még hátra van.
