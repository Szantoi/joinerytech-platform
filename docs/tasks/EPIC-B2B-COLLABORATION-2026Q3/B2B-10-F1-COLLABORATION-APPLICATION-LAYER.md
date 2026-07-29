# B2B-10 / F1 — Collaboration application-réteg

- **Szerep:** backend
- **Méret:** L (szeletelve adandó review-ra — ld. „Szelet-kadencia")
- **Prioritás:** P1 — a Doorstar-pilot kritikus útjának első kódszelete
- **Előfeltétel:** F0 KÉSZ (4 döntés rögzítve); **indulás a scheduling M4
  mérföldkő-review APPROVED-ja után** (a backend sávja addig az M4)
- **Státusz:** kiadva (2026-07-29), végrehajtásra vár

## Cél

A Collaboration bounded contextnek ma **jól megírt domain-magja van,
application-réteg nélkül**: nincs repository, nincs parancs-belépő, nincs DI,
és a `CollaborationAgreement` aggregátumnak egyáltalán nincs FSM-je. Ez a task
azt a réteget építi meg, amin keresztül a modul kívülről egyáltalán
használható lesz — az API-host (F3) enélkül nem tud mire ráülni.

**Nem cél** az API, az RLS és a Kernel-horgony bekötése: azok F2/F3/F5.

## Normatív alapok

1. `docs/knowledge/architecture/B2B_COLLABORATION_REAUDIT_2026-07-28.md` —
   a hiánylista tételes forrása és az F0-F8 fázisterv (ez a normatív terv).
2. `docs/tasks/EPIC-B2B-COLLABORATION-2026Q3/B2B-10-DOORSTAR-HANDSHAKE-INTEGRATION.md`
   — az F0 négy rögzített döntése.
3. `ADR-068` (Collaboration ownership, terms-revision + hash, actor-szűrt
   nézetek), `ADR-066` (tipizált referenciák).
4. `docs/knowledge/domain/B2B_COLLABORATION_DOMAIN_CONTRACT.md` (a B2B-01
   javított host/guest mátrixával).

## Kiindulási állapot (root-mérés, 2026-07-29)

**Van** (`src/spaceos-modules-collaboration`, 4 projekt + 1 teszt-projekt):

| Réteg | Tartalom |
|---|---|
| Domain | `CollaborationAgreement` (csak `Create` + `AddGrant`), `DelegatedWorkPackage` (9 FSM-átmenet actor-guardokkal), grant, terms-revision + acceptance evidence, `TermsCanonicalizer`, outbox/inbox üzenetek, state-history |
| Infrastructure | `CollaborationDbContext` + 7 EF-konfiguráció + 4 migráció |
| Application | 4 adapter-interfész **kizárólag InMemory implementációval**, read-modellek + `AllowedActionsPolicy` + `CollaborationProjectionService` |
| Contracts | üres (csak csproj) |

**Nincs:** repository-absztrakció, command/handler/validator, DI-extension,
Agreement-FSM, kernel-horgony mező. A `CollaborationAgreement.Status` ma
`Draft`-ra áll be és **soha nem változik** — nincs olyan kódút, ami elmozdítaná.

## Tartalom

### 1. Agreement-FSM az aggregátumon

`Propose` / `Accept` / `Reject` / `Cancel` / `Supersede` átmenetek
actor-guardokkal, a `DelegatedWorkPackage` mintája szerint (actorTenantId +
actorUserId + timestamp, állapot-történet írása).

- A mátrix az F0/3-ban javított irány: **a HOST ajánl, a GUEST fogad el.**
- **Kétfeles elfogadás guardja:** a B2B-03 szépséghibája, hogy az `Accepted`
  egyfelesen billenthető. Az elfogadás kösse a `CurrentTermsRevisionId`-t és
  az acceptance evidence-t: elfogadott állapot bizonyíték nélkül ne
  létezhessen.
- `Supersede`: az új terms-revízió az előzőt váltja; a `Superseded` állapot
  terminális az adott revízióra.

### 2. Application-réteg

- **Repository-absztrakció** az Application rétegben, implementáció az
  Infrastructure-ben (a DbContext ne szivárogjon ki a handlerekbe).
- **MediatR command + handler + validator** minden meglévő WorkPackage
  FSM-átmenetre (`Offer`, `Accept`, `Reject`, `StartProgress`, `Submit`,
  `RequestChanges`, `Complete`, `Cancel`) és minden új Agreement-átmenetre.
- **DI-extensionök:** `AddCollaborationApplication()` /
  `AddCollaborationInfrastructure()` — az F3 host ezekre fog ülni.
- A validator a bemenet alakját őrzi; az **üzleti invariáns marad az
  aggregátumban** (a handler ne írja újra a guardot — egy igazság).

### 3. Munkacsomag-horgony (F0/4)

A `DelegatedWorkPackage` kapjon **work-scope értékobjektumot**: `ProjectRef`
és `EpicRef` kötelező, `TaskRef` opcionális — mező + migráció.

- Egy agreement munkacsomagjai **egy projekthez** tartoznak (a scheduling
  egy-run-egy-projekt invariánsának analógja) — ez aggregátum-invariáns,
  teszttel.
- A guest a scope-ot **opak azonosítóként** kapja: nem oldja fel, és nem is
  kell neki (ADR-068 §11 egyirányú projekció).
- A mai `ScopeDescription` szabad szöveg **marad** (ember-olvasható cím) — a
  horgony nem váltja ki, a kettő külön mező.

> **ROOT DÖNTÉS a típus hovatartozásáról.** Az F0/4 „KernelWorkScope
> újrahasznosítva" megfogalmazása egy repo-határt takar: a `KernelWorkScope`
> **kizárólag a scheduling repóban létezik** (`Szantoi/spaceos-modules-scheduling`),
> a platform-fában nincs meg, és a közös `SpaceOS.Modules.Contracts` csomag
> per-modul DTO/event felület, nem domain-értékobjektumok otthona.
> Ezért: a Collaboration **saját, strukturálisan azonos** értékobjektumot
> definiál (`CollaborationWorkScope`) — nem hivatkozik a scheduling csomagra.
>
> **Indok:** Collaboration → Scheduling csomagfüggőség két egyenrangú
> modul-repót kötne össze rossz irányban, egy háromsoros értékobjektumért. A
> szerződés itt a **szerkezeti azonosság**, nem a megosztott típus: ugyanaz a
> három mező, ugyanaz a jelentés, ugyanaz a wire-alak.
>
> **Kötelező őr:** egy conformance-teszt pinelje a scope alakját a
> kézbesített scheduling-kontraktus scope-sémájához (openapi.yaml,
> SHA-256 `3fc6c57d…`) — így a drift bukik, nem csendben szétcsúszik.
> Ha később valóban két fogyasztója lesz, a közös csomagba emelés külön,
> verziózott döntés.

### 4. Dispute kivezetése (F0/2)

A `Disputed` enum-érték **marad** (wire-kompatibilitás), de átmenet, parancs és
validator **nem épül rá**. Ez tudatos non-goal, ne „teljességből" kerüljön be.

### 5. Tesztek

- **FSM `[Theory]`-mátrix** mindkét aggregátumra: minden (állapot × átmenet ×
  actor) hármas, **pozitív és negatív ágon**. A re-audit kritikája szó szerint
  ez volt: 4 fact egy 10-állapotú FSM-re nem fedettség.
- Handler-tesztek a parancs-belépőkre (a validator és az aggregátum-guard
  külön-külön is bizonyítva).
- Scope-invariáns teszt (egy agreement → egy projekt) + a conformance-teszt a
  scope alakjára.

## Határok — mi NEM ez a task

| Kizárva | Hova tartozik |
|---|---|
| Grant-alapú RLS-policy, tenant-context interceptor, valódi optimistic concurrency | **F2** |
| API-host, endpointok, DTO-k, ETag/Idempotency, `RequireEnabledModule` | **F3** |
| OpenAPI-artifact, drift-gate, Orval-kliens, portál-bekötés | **F4** |
| `HttpProjectAdapter` a kernel flow-epics ellen (a mai InMemory kiváltása) | **F5** |
| Outbox-dispatcher, inbox-handler, reconciliation, replay | **F6** |

Két kikötés a határokon:

1. A handlerek úgy készüljenek, hogy az **F2 interceptora alá becsúsztathatók**
   legyenek (a scheduling DbContext-mintája) — de az interceptort itt ne írd meg.
2. A mai `DelegatedWorkPackage.RowVersion` egy kézzel `1`-re állított `int`,
   **nem** EF-concurrency-token. Ne építs rá optimista zárolást és ne is
   állítsd, hogy véd — az igazi concurrency-token az F2 tartalma.
3. **URL/DTO-alakot itt semmi nem fagyaszt** — az az F3-F4 kontraktus-köre.

## Kapuk (átvételi feltételek)

- Célzott `dotnet test`: FSM-mátrix + handler-tesztek + scope-invariáns,
  **mért darabszámmal** (nem „zöld").
- `dotnet build` **0 warning**.
- **Szótár-kapu:** a Collaboration magban iparági szó (ajtó/szabászat/panel…)
  nem fordulhat elő — ez iparágsemleges bounded context (ADR-068).
- Migráció: attribútumos konfiguráció, a scheduling migráció-szabályai szerint.
  **Figyelem az EF owned-értékobjektum csapdájára:** osztott owned példány
  csendben NULL oszlopokat ír — a scope-értékobjektum példányonként izolált
  legyen, és a migrációt regenerálás után nézd át kézzel.
- `review_requested` a szokásos bizonyítékokkal (mért számok, commit-hash).
  **A done-t/APPROVED-ot kizárólag root-review állítja.**

## Szelet-kadencia (javasolt)

L-méret, ezért ne egy nagy review-ban érkezzen:

1. **F1/1** — Agreement-FSM + a `[Theory]`-mátrix (domain-only, gyors kapu).
2. **F1/2** — repository + DI + WorkPackage-parancsok/handlerek.
3. **F1/3** — Agreement-parancsok + work-scope mező + migráció + conformance-teszt.

Minden szelet külön `review_requested`; a mérföldkő-review a harmadik után.

## Nyitott pont (nem blokkoló)

A `TenantHandshakeAllowlist` mint **formális grant-bemenet** (Gábor
ADR-068/3 döntése: csak listán lévőnek ajánlható agreement) — a természetes
helye a grant-kiadási út, de a kernel-oldali írási útvonal hiánya miatt ez a
`PROJECT-KERNEL-TRADETYPE-NEUTRAL` scope-jegyzetében külön follow-up.
**F1-ben ne épüljön be**; ha az Agreement-FSM `Propose` ágán hiányzónak érzed,
jelezd a csatornán — root dönt, hova kerül.
