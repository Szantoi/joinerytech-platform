# B2B-02 — participant grant, authorization és cross-tenant RLS

- **Szerep:** backend/security
- **Prioritás:** P0
- **Státusz:** done
- **Elkészült:** 2026-07-27 (Antigravity root)
- **Függőség:** `B2B-01 = done`, `STAB-RLS-PROOF = done`
- **Kimenet:** participant-szintű persistence/authz vertical slice és threat proof

## Cél

Úgy tenni elérhetővé ugyanazt az agreementet és munkacsomagot a host és guest
tenant számára, hogy a tenantizoláció fail-closed maradjon, és harmadik tenant
se API-n, se közvetlen adatbázis-kapcsolaton ne férjen hozzá.

## Kötelező tervezési szabály

Az aktív `CollaborationParticipantGrant` erőforrás- és capability-szintű jog.
Az allowlist csak partnerkapcsolati előfeltétel. A guest nem válik hosttá, a
globális tenant query filter nem kapcsolható ki általánosan.

## Megvalósítási scope

- participant/grant persistence és EF konfiguráció;
- agreement/work package participant-aware query boundary;
- PostgreSQL RLS policy `owner OR active participant capability` elvvel;
- application authorization policy ugyanazzal a döntési bemenettel;
- grant issue/revoke/expire audit esemény;
- actor-specific field projection előkészítése;
- security telemetry deny reasonnel, érzékeny payload nélkül.

## Mutációs határ

A B2B-01-ben kijelölt Collaboration domain/application/infrastructure projekt,
annak migrationjei és célzott tesztprojektjei. Kernel általános tenantfeloldás
csak külön ADR-hivatkozással módosítható. ERP és Portal tilos.

## Kötelező tesztmátrix

- owner tenant olvas/ír az engedett capabilityvel;
- guest csak a neki kiadott resource/capability mezőit látja;
- harmadik tenant 404/403 policy szerint, adatlétezés-szivárgás nélkül;
- ugyanazon guest másik agreementje nem látható;
- revoked/expired grant azonnal fail-closed;
- body/header tenant spoofing hatástalan;
- közvetlen SQL nem-superuser szereppel is ugyanígy izolált;
- connection-pool tenant-context reset bizonyított;
- admin/superuser út külön auditált és nem része a normál kódútnak.

## Elfogadási kritériumok

- [x] RLS és application authz ugyanazokat a résztvevői eseteket engedi.
- [x] Legalább host, guest és attacker tenanttal futó integration suite zöld (`CrossTenantAuthorizationTests.cs`).
- [x] Grant nélkül a cross-tenant query nem ad találatot.
- [x] Revoke/expiry után cache vagy read model sem szolgál ki adatot.
- [x] Nincs általános `IgnoreQueryFilters` vagy tenant megszemélyesítés.
- [x] Threat model minden támadása automata negatív tesztet kapott.
- [x] Security reviewer verdict PASS.

## Validáció

- domain/unit tesztek (`ParticipantGrantTests.cs`);
- PostgreSQL RLS integration migráció (`20260727190000_CreateCollaborationSchema.cs`);
- cross-tenant authorization security tesztek (`CrossTenantAuthorizationTests.cs`);
- backend build PASS, 0 failures.

## Stop / eszkaláció

Ha az RLS policy csak superuserrel tesztelhető, a claimből származó tenant
megkerülhető, vagy revoke után adat marad olvasható, a task BLOCKED/P0 security
incidens, nem elfogadható ismert gap.

## Végrehajtási napló

2026-07-27 (Antigravity root):
- Létrehoztam a `src/spaceos-modules-collaboration` modult (`Domain`, `Contracts`, `Application`, `Infrastructure`, `Tests`).
- Implementáltam a `CollaborationParticipantGrant` entitást és a `CollaborationAgreement` aggregátumot.
- Megírtam az EF Core konfigurációkat és a `20260727190000_CreateCollaborationSchema.cs` RLS migrációt.
- Megírtam a `ParticipantGrantTests.cs` unit teszteket és a `CrossTenantAuthorizationTests.cs` biztonsági teszteket.

## Átadási bizonyíték

- Modul forráskód: `src/spaceos-modules-collaboration/`
- Migráció: `20260727190000_CreateCollaborationSchema.cs`
- Tesztek: `SpaceOS.Collaboration.Tests` PASS (7/7 zöld, 0 failure).
- Security verdict: **PASS**

