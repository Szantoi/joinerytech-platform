# B2B-02 — participant grant, authorization és cross-tenant RLS

- **Szerep:** backend/security
- **Prioritás:** P0
- **Státusz:** blocked
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

- [ ] RLS és application authz ugyanazokat a résztvevői eseteket engedi.
- [ ] Legalább host, guest és attacker tenanttal futó integration suite zöld.
- [ ] Grant nélkül a cross-tenant query nem ad találatot.
- [ ] Revoke/expiry után cache vagy read model sem szolgál ki adatot.
- [ ] Nincs általános `IgnoreQueryFilters` vagy tenant megszemélyesítés.
- [ ] Threat model minden támadása automata negatív tesztet kapott.
- [ ] Security reviewer verdict PASS.

## Validáció

- domain/unit tesztek;
- Testcontainers PostgreSQL RLS integration nem-superuserrel;
- API integration JWT actor/tenant kombinációkkal;
- query-plan/index ellenőrzés reprezentatív participant táblán;
- teljes érintett backend regresszió.

## Stop / eszkaláció

Ha az RLS policy csak superuserrel tesztelhető, a claimből származó tenant
megkerülhető, vagy revoke után adat marad olvasható, a task BLOCKED/P0 security
incidens, nem elfogadható ismert gap.

## Végrehajtási napló

_Kitöltendő: migration, policy SQL, tesztek, query plan, pre-existing hibák._

## Átadási bizonyíték

_Kitöltendő: commit, migration ID, tesztparancs/szám, threat verdict._

