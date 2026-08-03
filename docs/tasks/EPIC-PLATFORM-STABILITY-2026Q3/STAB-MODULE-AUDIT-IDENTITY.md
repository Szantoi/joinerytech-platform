# STAB-MODULE-AUDIT-IDENTITY — Audit-azonosítók a hitelesített callerből

- **Epic:** `EPIC-PLATFORM-STABILITY-2026Q3`
- **Szerep:** backend
- **Prioritás:** P1
- **Státusz:** `review`
- **Függőség:** közös host-auth csomag (ADR-061/062) rendelkezésre áll
- **Mutációs határ:** `spaceos-modules-hosting`, élő CRM, HR és Kontrolling API endpointok és célzott tesztjeik
- **Tiltott scope:** tenant-feloldás/RLS-séma, role-policy modell, portál wire-szerződés törése, Nexus

## Cél és üzleti eredmény

Hitelesített felhasználó nem tud más személy nevében auditált CRM-, HR- vagy
Kontrolling-műveletet létrehozni kliensoldali body- vagy fejlécértékkel.

## Kötelező források

- `AGENT-CHANNEL.md`: 2026-07-29 JoineryTech security/performance discovery
- `docs/knowledge/adr/ADR-061-host-auth-es-tenant-identitas.md`
- `QUALITY.md`

## Preflight

1. Kiinduló HEAD: `909c436`; a munkafa már dirty volt, idegen változtatás nem
   került formázásra vagy módosításra.
2. Az érintett hostok business route-csoportjai hitelesítést kérnek; az audit
   identitás forrása viszont CRM-ben és HR-ben body, Kontrollingban
   `X-User-Id` header volt.
3. A változtatás a fennálló JWT-auth és tenancy pipeline-ra támaszkodik, nem
   változtat tenant- vagy jogosultság-feloldást.

## Megvalósítási lépések

1. `ClaimsPrincipalUserIdExtensions.GetRequiredUserId()` készült a hosting
   csomagba: GUID `sub`, majd framework-mappelt nameidentifier; hiányzó vagy
   hibás értéknél fail-closed kivétel.
2. CRM lead- és opportunity-state transitionök, illetve lead-létrehozás a
   claim-alapú callert írják auditmezőbe; a régi body-mezők kompatibilitásból
   fogadhatók, de figyelmen kívül maradnak.
3. HR approve/reject auditértékei a callerből jönnek; Kontrolling minden
   mutációs endpointja megszüntette az `X-User-Id` kötést.
4. Test hostok GUID-azonosítót adnak a hitelesített principalnak. Negatív body-
   és header-spoof regressziós tesztek igazolják, hogy a perzisztált audit user
   a principalból származik.

## Elfogadási kritériumok

- [x] Nincs aktív `X-User-Id` paraméterkötés az élő Kontrolling endpointokban.
- [x] CRM és HR audit-azonosító nem a request bodyból származik.
- [x] A claim-feloldás `sub` és `nameidentifier` mellett működik, hibás
  identitás esetén nem gyárt audit usert.
- [x] Body/header megszemélyesítés regressziós teszttel lefedett.
- [x] Célzott tesztcsomagok zöldek.

## Stop / eszkaláció

Modul-szintű write/admin policy bevezetése külön termék-szerepmátrixot igényel;
nem része ennek a javításnak. A body-mezők végleges API-törlése csak portál
kontraktusmigrációval tehető meg.

## Végrehajtási napló

2026-07-29 — A P1 audit-integritási lelet javítva. A legacy bodymezők
megmaradtak a futó portál kompatibilitásáért, a szerver viszont nem olvassa őket
auditforrásként. A helper szándékosan fail-closed, hogy hibás token-claim esetén
ne keletkezzen hamis vagy null auditidentitás.

## Átadási bizonyíték

```text
dotnet test src/spaceos-modules-hosting/tests/SpaceOS.Modules.Hosting.Tests/SpaceOS.Modules.Hosting.Tests.csproj --no-restore --nologo
Passed: 81, Failed: 0

dotnet test src/SpaceOS.Modules.CRM/tests/Lead.Tests/SpaceOS.Modules.CRM.Tests.csproj --no-restore --nologo
Passed: 120, Failed: 0

dotnet test src/hr/tests/SpaceOS.Modules.HR.Tests.csproj --no-restore --nologo
Passed: 210, Failed: 0

dotnet test src/spaceos-modules/spaceos-modules-kontrolling/tests/SpaceOS.Modules.Kontrolling.Tests.csproj --no-restore --nologo
Passed: 190, Failed: 0
```

Összes célzott teszt: **601 zöld**. `git diff --check` az érintett fájlokon
nem jelzett whitespace hibát. Root diff-review és commit még hátra van.
