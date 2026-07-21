# B2B-03 — verziózott terms, elfogadás és szerződésbizonyíték

- **Szerep:** backend/security
- **Prioritás:** P0
- **Státusz:** blocked
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

- [ ] Azonos logikai snapshot két független futtatásban azonos hash-t ad.
- [ ] Mező-, tömbsorrend- és Unicode-szabály dokumentált/golden testelt.
- [ ] Offered/Accepted revision normál paranccsal nem módosítható.
- [ ] Stale vagy eltérő revision hash elfogadása konfliktussal elutasított.
- [ ] Amendment új revision és új acceptance flow.
- [ ] Auditrekord üzleti API-ból nem update/delete-elhető.
- [ ] Exportból ellenőrizhető a revision, hash, actor és eseménysorrend.
- [ ] UI/API szöveg nem állít minősített aláírást vagy garantált joghatást.

## Validáció

- canonicalization golden vectors;
- tamper, stale revision, duplicate accept és clock-boundary negatív tesztek;
- persistence integration immutable constrainttal;
- audit export/verifier roundtrip;
- schema backward/forward compatibility teszt.

## Stop / eszkaláció

Jogi kikényszeríthetőség, minősített aláírás, bizalmi időbélyeg, retention-idő vagy
valós szerződésszöveg igénye külön legal/compliance döntést és emberi kaput kér.

## Végrehajtási napló

_Kitöltendő: schema version, canonicalization spec, tesztvektorok, gapek._

## Átadási bizonyíték

_Kitöltendő: schema/hash, verifier verdict, tesztszám, security review._

