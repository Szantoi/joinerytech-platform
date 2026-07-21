# SpaceOS B2B kézfogás és vállalatközi együttműködés

> **Dátum:** 2026-07-21 (Europe/Budapest)  
> **Jelleg:** célarchitektúra, biztonsági követelmény és végrehajtási alap  
> **Státusz:** stratégiai termékirány; a részletes ownership az elfogadott
> `PROJECT-CORE-ADR` után válik normatívvá  
> **Kapcsolódó audit:**
> [`PROJECT_CORE_BOUNDARY_AUDIT_2026-07-18.md`](PROJECT_CORE_BOUNDARY_AUDIT_2026-07-18.md)  
> **Végrehajtási epic:**
> [`EPIC-B2B-COLLABORATION-2026Q3`](../../tasks/EPIC-B2B-COLLABORATION-2026Q3/README.md)

## 1. Termékállítás

A **kézfogás a SpaceOS egyik alapvető platformképessége**. Nem pusztán egy
feladat átadása vagy egy tenantazonosító rögzítése, hanem két önálló vállalat
közötti, ellenőrizhető digitális együttműködési kapcsolat.

A képességnek lehetővé kell tennie, hogy:

- az egyik cég egy pontosan körülhatárolt munkacsomagot ajánljon fel a másiknak;
- a fogadó cég elfogadja, visszautasítsa vagy módosítási javaslattal válaszoljon;
- mindkét fél a saját jogosultságai szerint lássa és kezelje az állapotokat;
- a felek séma- és verzióazonosított üzleti információt, dokumentumot és
  teljesítési bizonyítékot cseréljenek;
- az elfogadott feltételek utólag ne legyenek észrevétlenül átírhatók;
- minden jelentős eseményből visszaállítható legyen, hogy ki, melyik vállalat
  nevében, mikor és pontosan melyik feltételverziót fogadta el;
- a JoineryTech, Doorstar és későbbi iparági platformok ugyanazt a semleges
  protokollt használják, saját domainadapterekkel.

Ez az alap a későbbi beszállítói, alvállalkozói, partneri, minőségátadási,
karbantartási és projektkonzorciumi folyamatokhoz.

## 2. Jelenlegi állapot és bizonyított hiány

A jelenlegi megvalósítás nem teljesíti ezt a termékállítást:

- a Kernel `B2BHandshake` egy `FlowEpic`-be ágyazott value object, nem önálló
  együttműködési aggregate;
- a `DelegateFlowEpic` azonnal delegál, nincs kétoldalú ajánlat és elfogadás;
- nincs teljes invite/accept/reject/counter/revoke/amend lifecycle;
- a `SpaceOS.Modules.Abstractions/Handshake` alatt létezik gazdagabb, de a futó
  megvalósítástól eltérő és jelenleg nem használt absztrakció;
- a guest tenant a jelenlegi tenant query filter és PostgreSQL RLS miatt nem
  tudja lekérdezni a neki delegált `FlowEpic`-et;
- a `TenantHandshakeAllowlist` kapcsolatellenőrzési alap, de nem helyettesíti az
  ajánlatot, a résztvevői grantot vagy az állapotjogosultságot;
- a Procurement `SubcontractOrder` külön, átfedő alvállalkozói lifecycle-t
  birtokol, integrációs döntés nélkül;
- a CRM delegáció hívó nélküli, a portál Projects felülete statikus.

Következmény: a jelenlegi elemek migrációs bemenetek, nem a célmodell kész
implementációja. A globális tenantizoláció fellazítása vagy a guest hostként való
megszemélyesítése tiltott megoldás.

## 3. Bounded context és ownership

Javasolt tulajdonos egy önálló, iparágsemleges **SpaceOS Collaboration bounded
context**. A végleges név és fizikai elhelyezés a `PROJECT-CORE-ADR` döntése, de
az alábbi felelősség nem kerülhet ERP-, faipari vagy Doorstar-kódba:

- vállalatközi kapcsolat és résztvevők;
- megállapodásverziók és elfogadási bizonyíték;
- delegált munkacsomag állapotprotokollja;
- résztvevőalapú cross-tenant hozzáférés;
- adatcsere-boríték, kézbesítés és audit;
- közös API- és eseménykontraktus.

A Project/FlowEpic, CRM, Procurement, DMS, QA és más modulok adapterként
kapcsolódnak. Saját domainobjektumaikat nem másolják be a Collaboration
contextbe, és nem írnak közvetlenül annak tábláiba.

```text
Project / FlowEpic ─┐
Procurement ────────┤
CRM ────────────────┼── port / event / SubjectRef ──> Collaboration
DMS / QA ───────────┤                                ├─ Agreement
Doorstar pack ──────┘                                ├─ Work package
                                                     ├─ Participant grants
                                                     └─ Exchange + evidence
```

## 4. Két külön életciklus

A megállapodás és a munka végrehajtása nem ugyanaz az állapotgép.

### 4.1 Együttműködési megállapodás

Javasolt teljes állapotkészlet:

```text
Draft -> Offered -> CounterProposed -> Accepted -> Active -> Completed
             ├──────────────> Rejected
             └──────────────> Withdrawn / Expired
Accepted vagy Active ───────> Terminated / Disputed
```

MVP-ben a `CounterProposed`, `Terminated` és `Disputed` kiadható későbbi
szeletként, de az adatmodell és az eseményverziózás nem zárhatja ki őket.

Fő szabályok:

- a draftot csak a kezdeményező módosíthatja;
- az ajánlat egy konkrét, immutable terms revisionre mutat;
- elfogadni csak a címzett vállalat megfelelő felhatalmazású felhasználója tud;
- elfogadás után a revision nem írható át;
- módosítás új revisiont és új elfogadást igényel;
- visszavonás nem törli az ajánlat vagy az események történetét;
- lejárat és megszüntetés szerveroldali idő és policy alapján történik.

### 4.2 Delegált munkacsomag

Javasolt állapotkészlet:

```text
Offered -> Accepted -> InProgress -> Submitted -> Completed
    ├────────> Rejected                 └-> ChangesRequested -> InProgress
    └────────> Cancelled
bármely aktív állapot -> Disputed (policy szerint)
```

A tranzíciókhoz explicit actor-mátrix tartozik. Minimális kiinduló szabály:

| Tranzíció | Kezdeményező/host | Fogadó/guest | Kötelező adat |
|---|---:|---:|---|
| offer | igen | nem | terms revision, scope, határidő |
| accept/reject | nem | igen | elfogadó vagy indok |
| start | policy | igen | tényleges kezdés |
| submit | nem | igen | deliverable/evidence referenciák |
| request changes | igen | nem | indok és új elvárás |
| complete/approve | igen | nem | elfogadási bizonyíték |
| cancel | policy | policy | ok, hatály és értesítés |

Az actor nem pusztán `userId`: minden parancsnál meg kell őrizni a felhasználó,
a képviselt tenant, az auth context és az alkalmazott policy azonosítóját.

## 5. Doménmodell

### 5.1 Fő aggregate-ek

**CollaborationAgreement**

- globálisan egyedi `agreementId`;
- kezdeményező és fogadó participant;
- aktuális állapot és optimistic concurrency verzió;
- általános anchorok (`SubjectRef`, `ProjectRef`, `WorkItemRef`);
- terms revisionök;
- elfogadási és megszüntetési bizonyítékok;
- policy- és retention-azonosítók.

**DelegatedWorkPackage**

- saját `workPackageId` és az agreement hivatkozása;
- host/guest szerepek;
- semleges scope, határidő, SLA és deliverable lista;
- aktuális állapot, actor és állapotverzió;
- bizonyíték- és dokumentumreferenciák;
- a külső modul source-of-truth elemére mutató referencia.

**CollaborationParticipantGrant**

- agreement/work package és tenant kapcsolata;
- szerep, capability és visibility policy;
- érvényesség, visszavonás és kibocsátó;
- soha nem implicit, pusztán allowlistből származó globális jog.

**ExchangeEnvelope**

- schema ID és schema version;
- sender tenant, receiver tenant, correlation és sequence;
- payload vagy DMS/blob referencia;
- classification, checksum és idempotency key;
- kézbesítési/átvételi állapot.

### 5.2 Semleges hivatkozások

A protokoll nem tartalmazhat `door`, `cabinet`, műhelyállomás vagy más iparági
enumot. A kötés csak a jóváhagyott semleges referenciákon történhet:

```text
SubjectRef(moduleId, aggregateType, aggregateId)
ProjectRef(projectId)
WorkItemRef(moduleId, workItemType, workItemId)
DocumentRef(documentId, versionId?)
PartyRef(partyId)
```

A referencia létezése nem hozzáférési jog. Feloldáskor a célmodul külön
engedélyezi az agreement participant és visibility policy alapján.

## 6. Digitális megállapodás és bizonyíték

Minden felajánlott revision két reprezentációt kaphat:

1. **géppel olvasható terms snapshot**, verziózott JSON Schema alapján;
2. **ember által olvasható dokumentum**, DMS `DocumentRef`-fel.

A gépi snapshot minimális mezői:

- felek és szerepek;
- delegált tárgy és scope;
- határidő, SLA és mérföldkövek;
- megengedett állapotátmenetek és actorok;
- deliverable és proof követelmények;
- adatmegosztási/visibility szabályok;
- módosítási, visszavonási és vita-kezelési policy;
- opcionális kereskedelmi hivatkozások, nem duplikált pénzügyi truth source.

A snapshotot determinisztikusan kell kanonizálni és SHA-256 hash-sel ellátni. Az
elfogadási rekord legalább a tenantot, usert, UTC időt, revision ID-t, hash-t,
auth-contextot és eseménysorszámot tartalmazza. Auditrekord nem frissíthető vagy
törölhető normál üzleti művelettel.

> **Jogi határ:** ez a képesség erős operatív bizonyítékot és digitális
> megállapodási alapot ad, de önmagában nem állítható róla, hogy minősített
> elektronikus aláírás vagy minden joghatóságban kikényszeríthető szerződés.
> Minősített aláírás, bizalmi időbélyeg, megőrzési idő és joghatósági szöveg csak
> külön jogi/compliance döntés és jóváhagyott szolgáltató után kerülhet be.

## 7. Információcsere

- Minden üzenet séma- és verzióazonosított envelope-ban közlekedik.
- Küldés outboxból, fogadás inboxon keresztül történik.
- Az idempotency key és a participantonként monoton sequence megakadályozza a
  duplikált állapotátmenetet.
- Ismeretlen vagy nem támogatott schema version fail-closed; nem veszhet el
  csendben.
- Nagy payload és dokumentum DMS/blob referencia, hash és classification alapján
  cserélhető; a platform nem másolhat korlátlanul üzleti adatot.
- Minden parancs és delivery státusz correlation ID-val megfigyelhető.
- Retry, dead-letter, replay és reconciliation külön operációs felületet kap.

## 8. Tenant- és biztonsági modell

A cross-tenant együttműködés nem kivétel a tenantizoláció alól, hanem külön,
explicit résztvevői engedélymodell.

Javasolt PostgreSQL/RLS elv:

```text
engedélyezett, ha
  current_tenant_id = owner_tenant_id
  VAGY EXISTS aktív participant_grant,
       amely ugyanarra az agreement/work package-re,
       a current_tenant_id-re és a kért capabilityre szól
```

Kötelező biztonsági tulajdonságok:

- deny-by-default RLS és alkalmazásrétegbeli authorization együtt;
- a participant grant scope-ja capability- és erőforrásszintű;
- a host nem olvashat guest-belső adatot, a guest nem olvashat host-belső adatot;
- az allowlist csak partnerkapcsolati előfeltétel, nem adat-hozzáférési grant;
- ugyanaz az erőforrás-URL actor-specifikus projekciót adhat, de nem szivárogtathat
  rejtett mezőt;
- visibility szűkítése és revoke után a jövőbeli hozzáférés megszűnik, miközben a
  jogszerű audit és korábbi elfogadási bizonyíték megmarad;
- minden mutation ETag/row version és idempotency key használatával védett;
- superuserrel futó teszt nem fogadható el RLS-bizonyítékként.

Threat-model minimum: tenant ID cseréje, másik agreement ID-jának találgatása,
stale revision elfogadása, replay, dupla submit, jogosulatlan state transition,
visszavont grant, séma-downgrade, dokumentumhash-eltérés és eseménysorrend-hiba.

## 9. Moduladapterek

| Modul | Tulajdon | Collaboration kapcsolat |
|---|---|---|
| Projects/FlowEpic | projekt- és epik-hierarchia | agreement/work package anchor, státusprojekció |
| Procurement | beszállító és `SubcontractOrder` kereskedelmi folyamata | adapter; lifecycle-duplikáció nélkül |
| CRM | partnerkapcsolat/opportunity | agreement indítási port és hivatkozás |
| DMS | dokumentum és verzió | terms, deliverable és proof `DocumentRef` |
| QA | inspection/defect/acceptance | teljesítési bizonyíték és elfogadási port |
| Kontrolling | költség/EAC | agreement/work package ID alapú pénzügyi projekció |
| Doorstar | instance workflow és szakmai tartalom | platformprotokoll fogyasztása, saját template/policy |

A Procurement `SubcontractOrder` nem válhat második handshake aggregate-té. Az
ADR-nek el kell döntenie, hogy kereskedelmi adapterként hivatkozik a work package-re
vagy mely jelenlegi állapotai kerülnek kivezetésre.

## 10. API és UI minimum

Contract-first API minimális képességei:

- draft létrehozása és terms revision mentése;
- offer, accept, reject, counter/amend és withdraw;
- work package accept/start/submit/request-changes/complete/cancel;
- host/guest inbox és outbox listák;
- actor-szűrt detail, timeline és terms diff;
- dokumentum/evidence csatolás;
- delivery/reconciliation állapot;
- OpenAPI 3.1, versioned event schema és generált kliens.

A portál minimális élménye:

- „Kimenő együttműködések” és „Beérkező feladatok” nézet;
- partner, scope, határidő és aktuális felelős egyértelmű megjelenítése;
- elfogadás előtt a pontos revision és változásdiff megtekintése;
- csak az actor számára engedélyezett tranzíciók láthatók;
- bizonyítékbeküldés, módosításkérés és jóváhagyás;
- mindkét fél számára azonos sorszámú, de jogosultság szerint redaktált timeline;
- konfliktus/stale ETag esetén érthető újratöltési és újraértékelési flow.

## 11. Első bizonyító vertical slice

1. Az A tenant egy Project/FlowEpic hivatkozású munkacsomagot ajánl B tenantnak.
2. B csak a neki engedett terms- és scope-adatot látja.
3. B a pontos revision hash-re hivatkozva elfogad vagy visszautasít.
4. Elfogadás participant grantet és actor-specifikus read modelt aktivál.
5. B `InProgress`, majd `Submitted` állapotba léptet, és DMS/proof referenciát ad.
6. A módosítást kér vagy teljesítettnek jelöli.
7. Mindkét tenant ugyanazt az eseménysorrendet és revision hash-t igazolja.
8. Harmadik tenant, visszavont grant, replay és stale revision minden esetben
   elutasítást kap.

Ez a slice a Doorstar pilot bemenete, de a protokoll és a biztonsági bizonyíték a
JoineryTech/SpaceOS platform repositoryban készül.

## 12. Release-kapuk

- elfogadott `PROJECT-CORE-ADR` és egyértelmű aggregate ownership;
- géppel validált terms- és event-schema;
- nem-superuser, két- plusz támadó-tenanttal futó RLS integration suite;
- actor/state transition conformance matrix;
- canonicalization/hash golden test;
- outbox/inbox replay és idempotency teszt;
- OpenAPI drift és generált kliens;
- Portal E2E mindkét tenantnézettel;
- Doorstar cross-company pilot PASS;
- jogi állítások és opcionális trust-provider integráció külön kapun.

## 13. Memento

- A kézfogás nem `FlowEpic`-mező, hanem vállalatközi protokoll.
- A megállapodás és a delegált munka két külön életciklus.
- Az elfogadott feltételverzió immutable és hash-elt.
- Cross-tenant olvasás csak explicit participant granttel történhet.
- Az allowlist kapcsolatot engedélyez, de nem ad automatikus adathozzáférést.
- Az ERP és iparági modulok adapterek; a protokoll iparágsemleges marad.
- A Doorstar az első fogyasztói pilot, nem a platformprotokoll tulajdonosa.
- A rendszer auditálható digitális megállapodási alap, nem automatikus jogi
  minősítés.

