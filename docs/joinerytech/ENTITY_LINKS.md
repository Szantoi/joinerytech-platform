# ENTITY_LINKS.md — Entitás-kapcsolatok térképe

> **Cél:** minden modul-közi adatkapcsolat (mező-szint) + UI deep-link egy helyen, **ábra-generálásra alkalmas** formában (táblák + mermaid). Új kapcsolat bevezetésekor IDE is vezesd fel. A UI-megjelenítés közös komponense: `linked-refs.jsx` (`RefPanel` — jog-kapus kapcsolódó-adat kártya; `askNextStep` — művelet utáni navigációs kérdés).

## 1. FŐ lánc — entitás-folyam (mermaid)

```mermaid
graph LR
  WS[Webshop érdeklődés] -->|createLeadFromWebshop| LEAD[Lead]
  LEAD -->|convertLeadToOpp · lead.oppId / opp.fromLead| OPP[Lehetőség]
  OPP -->|oppCreateConcept · opp.conceptRef ↔ concept.oppRef| KON[Koncepció]
  OPP -->|oppCreateQuote · opp.quoteId| Q[Ajánlat]
  KON -.->|handoffConceptPackage · concept.quoteRef| Q
  KON -->|assembleProjectFromConcept · concept.projectRef ↔ project.conceptRef| PRJ[Projekt]
  Q -->|createRequisitionFromQuote · req.fromQuote| REQ[Igénylés order-req]
  REQ -->|createOrderFromRequisition · order.fromReq / req.orderRef| ORD[Rendelés]
  Q -.->|order.fromQuote + lines config/design| ORD
  Q -.->|createProjectFromQuote · project.fromQuote| PRJ
  PRJ -.->|project.items[].orderId| ORD
  ORD -->|releaseOrder| JOB[Gyártási tétel job.order]
  ORD -->|releaseToWorkshop · order.prepRelease.taskIds| GT[Műhelyfeladatok prodTask.order]
  GT -->|sendOrderToFinalQa · insp.ref = order.id| QA[Végellenőrzés]
  QA -->|createDeliveryFromQa · shipment.ref = order.id| SH[Fuvar]
  SH -->|invoiceDraftFromDelivery · invoice.orderRef| INV[Kimenő számla]
  SH -->|atadva → order.status delivered| ORD
  ORD -.->|ticket.ref + ticket.shipmentId| REK[Reklamáció-jegy]
  REK -->|ticketCreateShipment · ticket.linkedShipmentId| SH2[Szerviz-fuvar]
  REK -->|ticketCreateOrder · ticket.linkedOrderId| ORD2[Csere-rendelés]
```

## 2. Kapcsolat-mezők (mező-szintű regiszter)

| Forrás entitás | Mező | Cél | Létrehozó akció | Irány |
|---|---|---|---|---|
| lead | `oppId` | opportunity | `convertLeadToOpp` | 1:1, vissza: `opp.fromLead` |
| opportunity | `quoteId` | quote | `oppCreateQuote` | 1:1 |
| opportunity | `conceptRef` | concept | `oppCreateConcept` | 1:1, vissza: `concept.oppRef` |
| concept | `quoteRef` | quote | `handoffConceptPackage` | 1:1 |
| concept | `projectRef` | project | `assembleProjectFromConcept` | 1:1, vissza: `project.conceptRef` |
| requisition | `fromQuote` | quote | `createRequisitionFromQuote` | n:1 |
| requisition | `orderRef` | order | `createOrderFromRequisition` | 1:1, vissza: `order.fromReq` |
| requisition | `projectRef` | project | kézi / folyamat | n:1 |
| order | `fromQuote` | quote | konverzió-lánc | n:1 · `lines[].config/design` = design-átvitel |
| concept | `quoteRef` | quote (tervezési **díj-ajánlat**) | `createQuoteFromConcept(id, {targetQuoteId})` | 1:1 · `targetQuoteId` → a meglévő (draft) ajánlatba fűz, nem új dok. |
| composition | `quoteRef` | quote | `compositionToQuote(id, {customer, targetQuoteId})` | 1:1 · `targetQuoteId` → meglévő ajánlatba fűz |
| quote | `feeQuoteId` ↔ `detailFor` | quote (ajánlat-készítési díj) | `createFeeQuoteForQuote(quoteId, amount)` | a díj-ajánlat ELŐRE megy ki; elfogadásáig a fő ajánlat kiküldése ZÁRT (UI-kapu) |
| quoteRequest | `quoteId` / `resultRef` | quote → concept / rfq | `requestQuoteSubOffer(quoteId, kind)` · `startConceptFromQuoteRequest` · `createRfqFromQuote` | belső/külső al-ajánlatkérés; FSM `kert→folyamatban→kesz` (mellék: elutasitva, indokkal); rfq-kind státusza SZÁMÍTOTT az RFQ-ból; interior auto-teljesül, amikor a koncepció díja/bútorsora a cél-ajánlatba íródik (`_autoFulfillInteriorReq`) |
| quoteRequest | `plan` (technical) | munkalap a kérésen | `updateQuoteRequestPlan(id, patch)` | `{basis: internal\|external, rooms[] (leírás+alaprajz+anyaghasználat), items[] (bútor→sablon VAGY egyedi: 2D/3D rajz+modell+paraméterek+ár)}` · készültség-kapu: `techReqCompleteness` — a `kesz` átmenet store-szinten blokkolt, amíg hiányos |
| quote.lines[] | `source.kind: "techreq"` | quoteRequest | `importTechResultToQuote(reqId)` | a teljesített műszaki munkalap bútorai → főtétel + bútoronként altag, forrás-zárt sorok |
| concept | `forQuoteId` | quote | `startConceptFromQuoteRequest` | melyik ajánlat pontosításához készült a koncepció (≠ `quoteRef`, ami a díj-ajánlat) |
| rfq | `sourceQuoteId` | quote | `createRfqFromQuote` | az ajánlatból indított külső ajánlatkérés; odaítélt eredmény visszaemelése: `importRfqResultToQuote` (forrás-zárt tételsor) |
| quote.lines[] | `uid` / `parentUid` / `subMode` / `source` | tétel-hierarchia | `_normQuoteLine` normalizál | altétel: `parentUid`; főtétel értéke = Σ altag (saját ár nem számít); `subMode: osszevont/reszletezett` megjelenítés; `source {world, kind, ref, label}` = forrás-zárt sor (csak a forrás-világban szerkeszthető, az ajánlatból deep-link) · számozás SZÁMÍTOTT: `quoteLineNumbers` → 10/20/30 + 10.1/10.2 |
| brief | `quoteId` / `projectId` / `lineUid` / `parentBriefId` | quote / project / quote.line / brief (fa) | `ensureBrief({scope,quoteId,lineUid,projectId,title})` · `addChildBrief(parentId, name)` | TERVEZÉSI BRIEF — igény-információ a tervezőknek. HIERARCHIKUS fa: `scope ∈ quote→site→area→room→furniture→part` (`BRIEF_SCOPES`, `briefChildScope`); minden szint ugyanaz a modell. Mezők: `fields{func,site,style,users,special,budgetMin/Max,deadline}` (`updateBriefFields`, naplózva), `refs[]` (moodboard/rajz-jelkép). `BriefEngine.completeness/minimumReady`. SZÁMÍTOTT, soha ne tárold. |
| brief.questions[] | `status: nyitott→megvalaszolt→lezart` | Q&A hurok | `addBriefQuestion` · `answerBriefQuestion` · `setBriefQuestionStatus` (`BRIEF_Q_FLOW`) | bárki kérdez/válaszol (sales ↔ belsőépítész ↔ műszaki); a NYITOTT kérdések a Feladataim `brief` forrásában is megjelennek (`unifiedTasks`) |
| brief | `projectId` (átvitel) | project | `createProjectFromQuote` automatikusan átfűzi | konvertáláskor a quote-briefek a projektre kerülnek: `projectId` rákerül (ÉLŐ link, tovább fejlődik) + `history` handoff-snapshot (MÁSOLAT). UI: `BriefCard` a Sales-detailben (ajánlat-szint), a koncepció-detailben + műszaki munkalapon (a tervező MEGKAPJA), és a projekt-detailben |
| brief | `site` (helyszín/végügyfél) + `inheritedFrom` | brief (korábbi gyökér, ÜGYFÉL-szinten) | `setBriefSite(id, site)` · `inheritBriefForQuote(targetQuoteId, sourceRootId)` | a brief az ÜGYFÉLÉ (számla-partner), de egy ügyfél több HELYSZÍNT/végügyfelet vihet (pl. belsőépítész cég → több végügyfél) — a `site` mező különbözteti meg, mind külön brief-fa. Öröklés csak azonos ügyfélen belül, helyszín szerint válogatva: `briefsForCustomer` / `inheritableBriefsForQuote` (helyszín-címkével). Mély-klón + üres-mező feltöltés, kitöltöttet nem ír felül |
| quoteRequest (technical) | gate: `quoteBriefReady` | brief (quote-szint, `minimumReady`) | `requestQuoteSubOffer(quoteId,"technical")` | a műszaki kérés ELŐFELTÉTELE a kitöltött BRIEF (funkció+helyszín+stílus), NEM a koncepció (3.52 — feloldva) |
| brief | `docId` ↔ document.`briefId` | document (DMS) | `registerBriefDoc(briefId)` (auto `minimumReady`-kor, perm-mentes) | a brief verziózott DMS-dokumentumként is rögzül (type `egyeb`, linkType `customer`); a brief tartalma a `briefs[]`-ben, a metaadat a DMS-ben — egy igazságforrás, kétirányú link. `_nextDocId` ütközés-biztos |
| customerNote | `customer` (név) | customer | `addCustomerNote(customer, text)` / `customerNotesFor` | ügyfél-megjegyzések (perm-mentes); a Sales → Ügyfelek → ügyfél-detail „Megjegyzések" szekciójában. Az ügyfél-detail 360°: összes ajánlat + `ordersForCustomer` + briefek (helyszín szerint) + megjegyzések + kapcsolati profil (`customerProfile`) |
| brandItem | `docId` ↔ document.`brandItemId` + `rag` | document (DMS) + RAG-index | `addBrandItem(kind, {title,note})` / `toggleBrandItemRag` / `brandRagDocs` | márka/belső dokumentum (`branding.items[]`, kind: policy/internal/contract/template) — felvitelkor egyből DMS-dokumentum (egy igazságforrás); a `rag` jelölő (alapból be) sorolja a cég RAG tudásbázisába. Beállítások → Márka (`BrandingPanel`) |
| opportunity | `quoteId` ← `concept.quoteRef` | quote | `createQuoteFromConcept` (csak ha `!opp.quoteId`) | a koncepció díj-ajánlata visszacsatol a lehetőséghez, ha annak még nincs ajánlata |
| order | `prepRelease.taskIds[]` | prodTask | `releaseToWorkshop` | 1:n, vissza: `prodTask.order` |
| order | `workNo` (projekten: `project.workNo`) | — | `handoffConceptPackage` (MSZ-…) | QR: `MSZ-…/elemUid` |
| project | `fromQuote` | quote | `createProjectFromQuote` | n:1 |
| project | `items[].orderId` | order | tétel-hozzárendelés | n:n |
| job | `order` | order | `releaseOrder` | n:1 |
| qaInspection | `ref` | order | `sendOrderToFinalQa` | n:1 (duplikátum-véd) |
| shipment | `ref` | order | `createDeliveryFromQa` / `createDeliveryFromOrder` | n:1 |
| finInvoice (out) | `orderRef` | order | `invoiceDraftFromDelivery` / `createInvoiceFromOrder` / `billMilestone` | n:1 |
| serviceTicket | `ref` / `shipmentId` | order / shipment | `createTicket` (forrás-választó) | n:1 |
| serviceTicket | `linkedShipmentId` | shipment (szerviz-fuvar) | `ticketCreateShipment` | 1:1 |
| serviceTicket | `linkedOrderId` | order (csere) | `ticketCreateOrder` | 1:1 |
| contract | `milestones[].invoiceId` | finInvoice | `billMilestone` | 1:n |
| **(4.14) projekt-betekintő — vevő-portál, MODULÁRIS adapter-registry** | | | | |
| project (vevő-nézet) | `customerMilestones[]` | — (cég által kurált haladás) | `addCustomerMilestone`/`toggleCustomerMilestone`/`removeCustomerMilestone` | a vevő-portál `ProjectDetail` Áttekintés füle; ügyfél-látható, belső részlet nélkül |
| project → concept | `conceptForProject(projectId)` (concept.`projectRef`) | concept (látványterv) | — (SZÁMÍTOTT, csak `selectedVariantId` ÉS nem draft/archived/brief) | a **Belsőépítészet adapter** forrása (selected variant + paletta + helyiségek + szakág-tervek) |
| project → fázisok | `customerProjectPhases(projectId)` (HR `assignments.projectId`) | hrAssignment | — (SZÁMÍTOTT, NÉV/óra/bér NÉLKÜL: label+időszak+done/active) | a **Gyártás adapter** „Gyártási ütemezés" forrása; egy igazságforrás (HR-beosztás), vevő-barát vetület |
| customerNote | `customer` + `from:"portal"` | customer (kapcsolati napló) | `customerMessage(customer, text, refLabel)` | a vevő üzen egy elemről a portálról (perm-mentes); ref-címke + `postSystem` a belső csapatnak |
| quote (vevő-elfogadás) | `customerAcceptedAt` | quote (`sent→approved`) | `customerAcceptQuote(id)` | a vevő a `ProjectDetail` Ajánlatok füléről fogadja el; a rendelés-létrehozás marad a belső `approveQuote` (`quote.convert`) |
| **adapter-registry** | `window.ProjectPortalAdapters` | (domén-fül) | `window.registerProjectAdapter({id,label,icon,applies,render})` | ⭐ verticalizálhatóság: a MAG nem tud az adapterekről; egy pékség-adapter ugyanígy regisztrál új fület — kódváltás nélkül |
| rfq | `poRef` | PO | `awardRfq` | 1:n, vissza: `po.sourceRef` |
| po | `lines[].reqId` | requisition | `createPOsFromReqs` | n:n (szállítónkénti bontás) |
| handshake | `kind: crm/internal_order/epic` | opp / req / epic | `delegateOpp` / `delegateReqToInternalUnit` / `delegateEpic` | B2B kézfogás |

## 3. UI deep-link térkép (`_pendingOpen` + `navigateTo`)

A `RefPanel` (linked-refs.jsx, `REF_KINDS`) ezt használja; a fogadó képernyő mountkor felveszi a `window._pendingOpen`-t.

| kind | Cél-világ / képernyő | `_pendingOpen.type` | Jog-kapu (kezelés) |
|---|---|---|---|
| order | sales / orders | `order` | világ: sales + perm: `order.track` |
| quote | sales / quotes | `quote` | világ: sales |
| requisition | procurement / requisitions | `requisition` | világ: procurement |
| project | projects | `project` | világ: projects |
| shipment | logistics / deliveries | `shipment` | világ: logistics |
| invoice | finance / outgoing | `invoice` | világ: finance |
| ticket | service / tickets | `ticket` | világ: service |
| job | production / dash | `job` | világ: production |

**Szabály:** ha a fióknak NINCS hozzáférése a cél-világhoz → a `RefPanel` **vendég nézetet** mutat (azonosító + státusz + kulcsmezők láthatók, „Megnyitás" gomb nincs, lakat-jelvény van). Az adat tehát mindig látszik, csak a kezelés jog-függő.

## 4. Művelet utáni navigációs kérdés — hol él már

| Művelet | Kérdés-opciók |
|---|---|
| Értékesítés: ajánlat → „Igénylés létrehozása" | Ugrás az igénylésre (Beszerzés) · Maradok az ajánlatnál |
| Beszerzés: igénylés jóváhagyása (order-req) | Rendelés generálása most · További igények kezelése |
| Beszerzés: „Rendelés generálása" | Rendelés megnyitása (Értékesítés) · További igények kezelése |

**Bővítési minta:** minden lánc-továbblépő művelet után `window.askNextStep({title, text, options})` — az első opció a lánc következő lépése (primary, deep-linkkel), az utolsó a „maradok". Jelölt további helyek: quote kiküldés/elfogadás, MfgPrep kiadás (→ Feladataim), QA megfelelt (→ Logisztika), fuvar átadva (→ Pénzügy), reklamáció-jegy rögzítése.
