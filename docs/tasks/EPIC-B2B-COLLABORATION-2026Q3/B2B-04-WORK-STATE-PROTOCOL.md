# B2B-04 — delegált munkacsomag állapot- és actor-protokoll

- **Szerep:** backend
- **Prioritás:** P0
- **Státusz:** blocked
- **Függőség:** `B2B-01 = done`
- **Kimenet:** work package aggregate, FSM, policy és események

## Cél

Külön aggregate-ben és állapotgépben kezelni a másik cégnek kiadott munka
végrehajtását. A host adja a scope-ot és fogadja el a teljesítést; a guest vállalja,
dolgozik és bizonyítékot nyújt be.

## Minimum lifecycle

```text
Offered -> Accepted -> InProgress -> Submitted -> Completed
    |          |            ^           |
 Rejected   Cancelled       └─ ChangesRequested
```

A `Disputed` és részletes termination az első verzióban feature flag mögötti vagy
későbbi állapot lehet, de a contract nem teheti breaking change-dzsé.

## Megvalósítási scope

- aggregate és state transition guardok;
- host/guest actor capability policy;
- scope, due date/SLA, deliverable és evidence requirement;
- commandok és versioned domain/integration eventek;
- state history actor/reason/revision/correlation mezőkkel;
- ETag/row version és idempotency key;
- due/overdue calculation explicit timezone/UTC szabállyal;
- cancel, reject és change request indokkövetelmény;
- proof reference a DMS/QA adapter számára.

## Mutációs határ

A B2B-01 kijelölt Collaboration domain/application projekt és tesztek. Project,
Procurement, CRM, DMS, QA és Portal közvetlen módosítása tilos; adapter a B2B-06.

## Elfogadási kritériumok

- [ ] A normatív actor/state mátrix minden sora automata tesztet kapott.
- [ ] Guest nem tud completiont jóváhagyni, host nem tud guestként submitolni.
- [ ] Submit csak a kötelező proof/deliverable referenciákkal sikeres.
- [ ] ChangesRequested indokolt és visszavisz végrehajtható állapotba.
- [ ] Duplicate command idempotens, stale ETag 409-et ad az application rétegben.
- [ ] UTC és határidő-számítás determinisztikus.
- [ ] Minden sikeres state change versioned eseményt és auditrekordot ad.
- [ ] Ismeretlen state/event version fail-closed vagy quarantine-ba kerül.

## Validáció

- state-machine property/parameterized unit tesztek;
- concurrency és duplicate-request integration tesztek;
- event serialization golden test;
- teljes Collaboration domain regresszió.

## Stop / eszkaláció

Ha egy állapot tulajdonosa vagy a host/guest actor joga nem vezethető le a B2B-01
contractból, új állapot vagy implicit admin bypass nem található ki helyben.

## Végrehajtási napló

_Kitöltendő: command/event lista, tesztszám, concurrency eredmény._

## Átadási bizonyíték

_Kitöltendő: package/version, event schema hash, tesztverdict._

