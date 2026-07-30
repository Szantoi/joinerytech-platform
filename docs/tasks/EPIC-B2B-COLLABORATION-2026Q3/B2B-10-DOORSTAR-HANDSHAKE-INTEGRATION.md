# B2B-10 — Doorstar-integráció kézfogásokon át az epic/task/projekt-rendszerbe

- **Szerep:** backend + doorstar (két-oldali)
- **Prioritás:** P1 (Gábor kérése, 2026-07-28: „a doorstar rendszernek is
  tudnia kell integrálódnia a kézfogásokon keresztül az epic, task, projekt
  rendszerbe")
- **Státusz:** `in_progress` — a REAUDIT **megvan** (2026-07-28), és a végrehajtás fut az F-szeleteken: **F1 · F2 · F3 (öt szelet) mind APPROVED** (archívumban). Nyitva: **F3X** (sorrend-bizonyítás), **F4** (OpenAPI-kontraktus + wire-szótár), **F5**, **F7**. *(A „REAUDIT-ra vár" státusz 2026-07-28 óta elavult — javítva a 2026-07-30-i root átvizsgálásban.)*
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

## F0 KÉSZ — a re-audit eredménye (2026-07-28)

A B2B-RE-AUDIT lefutott: **1 igaz / 3 részben / 3 hamis** done; a normatív
állapot- és fázisterv mostantól a
`docs/knowledge/architecture/B2B_COLLABORATION_REAUDIT_2026-07-28.md` —
annak F0-F8 táblája VÁLTJA az alábbi vázlatos fázisokat. Kritikus út a
Doorstar-pilotig: **F0(döntések) → F1(application-réteg, L) → F2(RLS-javítás,
M) → F3(API-host, M) → F5(ProjectRef-horgony, M) → F7(proof-suite, M)**.
F0 három döntése: URL-prefix (javaslat: /api/collaboration/v1 — egyes szám,
a portál-konvencióval), dispute ki az MVP-ből (ADR-068 non-goal; a portálból
kivezetendő), B2B-01 doksi host/guest javítás. + ÚJ (Gábor 2026-07-28, projekt→epicek→műveletek döntés nyomán): a work-package horgony SZINTJE — csak ProjectRef (ADR-068 §13 mai alakja) vagy ProjectRef+EpicRef (a scheduling kétszintű mintája szerint) — az F0-ban döntendő.

## F0 DÖNTÉSEK RÖGZÍTVE (root, 2026-07-28, Gábor „folytasd" felhatalmazásával)

1. **URL-prefix: `/api/collaboration/v1`** (egyes szám, verziózott — a portál
   és a scheduling `/api/scheduling/v1` konvenciójával egységes). Az ADR-068
   §13 `/api/collaborations/…` alakja ezzel felülírva — dokumentált eltérés.
2. **Dispute KI az MVP-ből** (az ADR-068 explicit non-goal): a `Disputed`
   enum-érték marad (wire-kompatibilitás), de átmenet és endpoint nem épül rá;
   a portál-modul újraépítésekor a /dispute hívások kivezetendők.
3. **B2B-01 doksi host/guest javítva** (a §3.2 mátrix 5 sora + korrekciós
   záradék a doksi végén): a HOST ajánl, a GUEST fogad el és hajt végre.
4. **Work-package horgony: `KernelWorkScope` újrahasznosítva** — ProjectRef +
   EpicRef kötelező, TaskRef opcionális (a kézfogás tipikusan epic-szintű
   munkát delegál; task-szintre bontásnál kitöltendő). Konzisztens a
   scheduling háromszintű horgonyával; a guest a scope-ot opak azonosítóként
   kapja, feloldani nem tudja és nem is kell neki.

Ezzel az F0 KÉSZ — az F1 (application-réteg) kiadható.

## Eredeti fázis-vázlat (történeti)

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
