# MSG-BACKEND-001 — API kontraktus-audit + EHS előfeltételek

- **Szerep:** backend · **Státusz:** ✅ done (2026-07-14) · **Fázis:** F0

## Feladat
A 7 backend-modul API-felületének auditja a terv FSM-készletei ellen; EHS-bővítés kontraktus-javaslata.

## Kivitelezés
Domain/Application/Api rétegek átvizsgálása modulonként (src/SpaceOS.Modules.CRM, src/dms|hr|maintenance|qa|ehs, spaceos-modules-*).

## Eredmény
`docs/knowledge/architecture/API_CONTRACT_AUDIT_2026-07-14.md`:
- Kettős implementációk: CRM/DMS/HR/EHS (src/<modul> vs spaceos-modules*); **src/ehs a kanonikus EHS**; Kontrolling NEM stub (EAC/variance kész).
- FSM-őrzés domain-szinten mindenhol erős (private setter + guard). Eltérések: CRM Lead −Nurturing; QA −javitasra/selejt; DMS −teljes doc-életciklus; EHS −elutasitva.
- Egyetlen futtatható host: src/ehs (Swagger+openapi.yaml) — többi unhostolt class lib = **OpenAPI/Orval blocker (G0.1)**. src/ehs kernel-csproj referencia törött ebben a repóban.
- EHS-kontraktus javaslat: EhsLocation (hierarchikus), HazardousMaterial + számított SDS-érvényesség, PpeItem/PpeIssuance FSM (kiadva→atvett→visszavett/cserelve), SafetyWalk FSM (utemezett→folyamatban→intezkedes→lezart) egységes CAPA-forrással. Gap-lista: G0–G7.

## Tesztek
n/a (audit, kód nem módosult). Lejelentve: MSG-BACKEND-001-DONE.
