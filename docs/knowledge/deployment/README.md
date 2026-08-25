# Üzemeltetési és deployment dokumentumtérkép

Ez a mappa a futtatási, onboarding- és biztonsági runbookok indexe. A runbook olvasása nem ad deploy- vagy tenant-mutatási felhatalmazást: az ilyen műveletekhez jogosult owner, előírt bizonyíték és jóváhagyás szükséges.

## Melyik dokumentumot használd?

| Helyzet | Dokumentum | Megjegyzés |
|---|---|---|
| Általános ismert csapdák | [KNOWN_GOTCHAS.md](KNOWN_GOTCHAS.md) | Kezdj ezzel, mielőtt infrastruktúrát módosítasz. |
| Token vagy credential rotáció | [TOKEN_ROTATION_RUNBOOK_2026-07-30.md](TOKEN_ROTATION_RUNBOOK_2026-07-30.md) | Érzékeny, approval-köteles folyamat. |
| Tenant onboarding | [TENANT_ONBOARDING_RUNBOOK.md](TENANT_ONBOARDING_RUNBOOK.md) | Olvasd a fájl saját RETIRED/tiltó jelzéseit; ne aktiváld a visszavont folyamatot. |
| Scheduling sandbox | [SCHEDULING_SANDBOX_PLAN.md](SCHEDULING_SANDBOX_PLAN.md) | Elkülönített, nem általános élesítési terv. |
| Provisioning/authority szerződés | [KEYCLOAK authority projection](../architecture/KEYCLOAK_AUTHORITY_PROJECTION_AND_SERVICE_PRINCIPAL_2026-08-20.md) | Lokális, fail-closed; explicit módon nem live activation evidence. |
| Automatizált ellenőrző vagy provision script | [scripts/README.md](../../../scripts/README.md) | A script saját safe/apply korlátait kötelező elolvasni. |

## Biztonságos műveleti sorrend

1. Azonosítsd a pontos környezetet, owner-t és mutációs határt.
2. Olvasd el a kapcsolódó ADR-t, runbookot és script dokumentációt.
3. Futass read-only vagy verify lépést, ha rendelkezésre áll.
4. Kérd meg a szükséges jóváhagyást az irreversible vagy külső hatású lépéshez.
5. Mutáció után a runbook szerinti, független ellenőrzéssel bizonyítsd a kívánt állapotot.

Ne másolj IP-címet, credentialt, tokent vagy production connection stringet README-be, taskba vagy mintakonfigurációba.
