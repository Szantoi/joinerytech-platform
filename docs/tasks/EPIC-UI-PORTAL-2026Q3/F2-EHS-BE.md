# F2-EHS-BE — EHS backend: EhsLocation + HazardousMaterial/SDS + PpeIssuance FSM + SafetyWalk FSM

- **Szerep:** backend · **Státusz:** ✅ done (2026-07-14) · **Fázis:** F2 (EHS, 1. modul)

## Feladat
Az API-audit kontraktus-javaslatának implementálása a kanonikus `src/ehs` modulban.

## Kivitelezés / Eredmény
- **Kernel-blocker megoldva:** spaceos-kernel submodule HTTPS-en klónozva (SSH deploy key nincs a gépen); Domain.csproj törött `backend/` útvonala javítva → **dotnet build SUCCESS**. (hr/dms/qa/maintenance ugyanazt a törött útvonalat hordozza — scope-on kívül, jelezve.)
- **EhsLocation:** hierarchikus törzs (Code/Name/ParentLocationId/Kind/IsActive) guard-okkal (nincs ön-szülő, nincs deaktiválás aktív gyerekkel) + list/get/create/update/deactivate → a portál locations-TODO feloldva.
- **HazardousMaterial:** SDS-törzs, életciklus Active→Archived, **számított SdsValidity** (Valid >30d / Expiring ≤30d / Expired, a TrainingStatus mintára), RenewSds + `/expiring` dashboard-endpoint, SQL-oldali szűrés.
- **PpeItem + PpeIssuance FSM:** Issued(kiadva)→Acknowledged(atvett)→Returned(visszavett)|Replaced(cserelve), domain-őrzött; Replace() atomikusan új Issued-et ír; lejárat DefaultLifetimeMonths-ból; `by-employee/{id}` + átmenet-route-ok.
- **SafetyWalk FSM:** Scheduled→InProgress→ActionRequired→Closed (+Cancelled); finding csak InProgress-ben; Close() csak ha minden CAPA kész.
- **Egységes CAPA:** CorrectiveAction első-osztályú entitássá emelve (Source/SourceId/FindingId) — incidens + bejárás-finding EGY táblán (`ehs.corrective_actions`), közös board-endpoint. Migráció kézzel adatmegőrzőre igazítva (rename+backfill, reverzibilis Down).
- **Hibakontraktus:** 404 / **409 illegális FSM-átmenetre** / 400 validáció.
- **OpenAPI:** openapi.yaml +27 path (46 össz), +19 séma, 6 új tag — validálva. `src/ehs/README.md` létrehozva.

## Tesztek
- Domain unit: **92/92 zöld** (minden FSM legális/illegális átmenet, SDS-határok, CAPA source, Replace-szemantika). Látens csproj-bug javítva (Domain.Tests a beágyazott Infra.Tests forrásait globolta).
- Integrációs (Testcontainers): 3 új tesztfájl — fordul, de **Docker nincs a gépen** → CI/VPS futtatás szükséges (pre-existing korlát).
- Runtime smoke: API elindult, Swagger 200, mind a 27 új route kiszolgálva.

## Fájlok
66 új + 13 módosított `src/ehs` alatt (+ spaceos-kernel submodule checkout, gitlink változatlan).
