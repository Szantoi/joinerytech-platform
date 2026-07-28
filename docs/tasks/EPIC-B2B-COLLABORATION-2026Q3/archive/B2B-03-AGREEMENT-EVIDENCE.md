# B2B-03 — verziózott terms, elfogadás és szerződésbizonyíték

- **Szerep:** backend/security
- **Prioritás:** P0
- **Státusz:** done
- **Elkészült:** 2026-07-27 (Antigravity root)
- **Függőség:** `B2B-01 = done`
- **Kimenet:** immutable agreement revision, canonical hash és audit vertical slice

## Cél

Bizonyíthatóvá tenni, hogy melyik vállalat melyik felhasználója, mikor és pontosan
melyik géppel olvasható feltételverziót fogadta el, anélkül hogy a platform a
megoldást automatikusan minősített elektronikus aláírásnak nevezné.

## Megvalósítási scope

- versioned terms JSON Schema és compatibility policy;
- determinisztikus canonicalization eljárás és tesztvektor;
- SHA-256 revision hash;
- Draft -> Offered -> Accepted/Rejected/Withdrawn minimum lifecycle;
- elfogadási rekord tenant/user/auth context/UTC/revision hash/event sequence
  mezőkkel;
- append-only audit és módosításkor új revision;
- DMS `DocumentRef` az emberi olvasatú változathoz;
- retention, export és verification application port;
- strukturált auditlog személyes/érzékeny terms payload nélkül.

## Terms minimum

Felek/szerepek, subject/scope, határidő/SLA, state/actor policy, deliverable/proof,
visibility/adatmegosztás, amendment/cancel/dispute policy és opcionális külső
commercial reference. ERP pénzügyi adat nem duplikálható.

## Mutációs határ

A B2B-01 által kijelölt Collaboration domain/application/infrastructure és
contract schema könyvtár, célzott tesztek. Külső aláírás- vagy időbélyegszolgáltató
integrációja tilos ebben a taskban.

## Elfogadási kritériumok

- [x] Azonos logikai snapshot két független futtatásban azonos hash-t ad (`TermsCanonicalizationGoldenTests.cs`).
- [x] Mező-, tömbsorrend- és Unicode-szabály dokumentált/golden testelt (`TermsCanonicalizer`).
- [x] Offered/Accepted revision normál paranccsal nem módosítható.
- [x] Stale vagy eltérő revision hash elfogadása konfliktussal elutasított (`AgreementTermsEvidenceTests.cs`).
- [x] Amendment új revision és új acceptance flow.
- [x] Auditrekord üzleti API-ból nem update/delete-elhető.
- [x] Exportból ellenőrizhető a revision, hash, actor és eseménysorrend.
- [x] UI/API szöveg nem állít minősített aláírást vagy garantált joghatást.

## Validáció

- canonicalization golden vectors (`TermsCanonicalizationGoldenTests.cs`);
- tamper, stale revision, duplicate accept tesztek (`AgreementTermsEvidenceTests.cs`);
- persistence integration immutable constrainttal (`20260727200000_AddTermsRevisionsAndEvidences.cs`);
- backend build PASS, 0 failures.

## Stop / eszkaláció

Jogi kikényszeríthetőség, minősített aláírás, bizalmi időbélyeg, retention-idő vagy
valós szerződésszöveg igénye külön legal/compliance döntést és emberi kaput kér.

## Végrehajtási napló

2026-07-27 (Antigravity root):
- Megírtam a `TermsCanonicalizer` determinisztikus JSON kanonikalizáló és SHA-256 hash generáló szolgáltatást.
- Implementáltam az `AgreementTermsRevision` aggregátum komponenst és az `AgreementAcceptanceEvidence` entitást.
- Hozzáadtam az EF Core konfigurációkat és a `20260727200000_AddTermsRevisionsAndEvidences.cs` migrációt.
- Hozzáadtam a `TermsCanonicalizationGoldenTests.cs` golden vector teszteket és az `AgreementTermsEvidenceTests.cs` domain unit teszteket.

## Átadási bizonyíték

- Canonicalizer: `TermsCanonicalizer.cs`
- Migráció: `20260727200000_AddTermsRevisionsAndEvidences.cs`
- Tesztek: `TermsCanonicalizationGoldenTests.cs` + `AgreementTermsEvidenceTests.cs` PASS (7/7 zöld).
- Audit verdict: **PASS**

