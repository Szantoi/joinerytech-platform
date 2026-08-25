# Kontraktusok és verziózott release-artefaktumok

Ez a mappa a modulok és instance-ek közti gépileg értelmezhető szerződések otthona. A szerződés nem csupán dokumentáció: a wire-formátum, a verzió és a release-integritás a kompatibilitási határ része.

## Fő artefaktumok

| Artefaktum | Cél |
|---|---|
| [spaceos-module-v1.schema.json](spaceos-module-v1.schema.json) | Modulleíró szerződés sémája |
| [spaceos-instance-context-v1.openapi.yaml](spaceos-instance-context-v1.openapi.yaml) | Instance-context HTTP szerződés |
| [module-id-legacy-aliases.json](module-id-legacy-aliases.json) | Régi modulazonosítók explicit aliasai |
| [releases/spaceos-door-manufacturing-auth/v1.0.0](releases/spaceos-door-manufacturing-auth/v1.0.0/README.md) | Verziózott Door Manufacturing auth-release és integritási anyagai |

## Használati szabályok

- Wire-mezőt, enumértéket vagy modulazonosítót ne találj ki a kliensben. A megfelelő schema/OpenAPI/ADR alapján változtass.
- A `releases/` alatti verziózott artefaktum immutable kiadás. Checksum, aláírás vagy pin módosítása új, jogosult release-folyamat, nem dokumentációs javítás.
- Ha a szerződés és a futó implementáció eltér, ne „javítsd ki” csendben egyik oldalt sem. Nyiss kompatibilitási döntést és rögzítsd a migrációt.
- Új kontraktushoz legyen tulajdonos, verziózási stratégia, validációs pont és fogyasztói lista.

## Kapcsolódó döntések

- [ADR-059 — wire nyelv](../adr/ADR-059-wire-nyelv.md)
- [ADR-066 — ERP modul- és referenciahatárok](../adr/ADR-066-erp-module-contract-boundaries.md)
- [ADR-067 — ModuleId és lifecycle](../adr/ADR-067-module-catalog-and-lifecycle.md)

Az auth- és instance-boundary megértéséhez olvasd el a [2026-08-20-i authority-projection szerződést](../architecture/KEYCLOAK_AUTHORITY_PROJECTION_AND_SERVICE_PRINCIPAL_2026-08-20.md). Ez local, fail-closed tervezési és implementációs dokumentum; nem bizonyít önmagában élő konfigurációt vagy aktiválást.
