# B2B-10 — Doorstar-integráció kézfogásokon át az epic/task/projekt-rendszerbe

- **Szerep:** backend + doorstar (két-oldali)
- **Prioritás:** P1 (Gábor kérése, 2026-07-28: „a doorstar rendszernek is
  tudnia kell integrálódnia a kézfogásokon keresztül az epic, task, projekt
  rendszerbe")
- **Státusz:** pending — a B2B-RE-AUDIT eredményére vár
- **Normatív alap:** ADR-068 (Collaboration ownership, terms-revision+hash,
  actor-szűrt nézetek, ProjectRef(FlowEpic.Id) horgony); ADR-066 (tipizált
  referenciák); a scheduling-kontraktus mint minta (publikált OpenAPI +
  federation-átadás + hash-pinnelt vektorok).

## Cél

A Doorstar (guest-tenant) a B2B kézfogás-protokollon keresztül kapcsolódjon a
platform projekt-rendszeréhez: Agreement (megállapodás) → WorkPackage-ek
(munka-egységek) → a host-oldali FlowEpic-projekthez horgonyozva
(ProjectRef), actor-szűrt nézetekkel és bizonyíték-lánccal (terms-hash +
acceptance evidence). Ugyanaz a fogyasztási modell, mint a schedulingnél: a
platform PUBLIKÁLT kontraktust ad, a Doorstar generált klienssel + saját
adapterrel csatlakozik — forrás-másolás nélkül.

## Fázisok (a re-audit pontosítja)

1. **F0 — B2B-RE-AUDIT (fut):** ground truth a B2B-01..07 valós állapotáról;
   a hiány-lista a publikálható API-ig.
2. **F1 — B2B-07R:** Collaboration host-váz a hosting-mintára (auth + tenancy
   + RLS + RequireEnabledModule('spaceos.collaboration')) + HTTP-endpointok a
   meglévő read-modellek/policyk fölé + OpenAPI 3.1 publikáció (generált-
   kliens kapuval, a scheduling M3 mintájára). A B2B-08 (portál-UI) javítása
   CSAK ezután, a valódi spec-ből generált klienssel.
3. **F2 — Kernel-horgony:** Agreement ↔ ProjectRef(FlowEpic.Id) él
   bizonyítása: a host-oldali projekt (FlowEpic) alá rendelt kézfogás; a
   guest SOHA nem éri el a Kernel API-t közvetlenül — a Collaboration
   actor-szűrt nézete a határ (ADR-068 §11 egyirányú projekció).
4. **F3 — Doorstar-adapter (doorstar-oldal):** federation-kézbesített
   kontraktus-csomag (OpenAPI + verzió/hash) → generált TS/C# kliens →
   a Doorstar work-package nézet a saját rendszerében (üzemi tábla / projekt
   követés) — a Doorstar-root viszi, kontraktus-review-val.
5. **F4 — Két-tenant kézfogás-pilot:** host=JoineryTech demo-bérlő,
   guest=Doorstar-bérlő; teljes lánc: agreement offer → terms-hash accept
   (evidence) → work package-ek → állapot-átmenetek → actor-szűrt nézetek
   mindkét oldalról; RLS-proof két élő tenanttal. Ez adja a B2B-09
   release-kapu magját.

## Kemény szabályok

- A B2B-08-ból tanulva: kliens KIZÁRÓLAG publikált OpenAPI-ból generálva;
  wire-enum nem fordul; SHA-256 evidence valódi hash-lánccal.
- A Kernel-t nem érintjük (ADR-065); a horgony opak ProjectRef.
- Entitlement: a spaceos.collaboration modul-ID az enabled_modules gate alatt
  (a friss hosting-policy első Collaboration-fogyasztása).
- Doorstar-oldali bemenetek (a scheduling-minta szerint): integrációs
  vektorok/fixture-ök + kontraktus-reviewer — a federation-csatornán kérendő.
