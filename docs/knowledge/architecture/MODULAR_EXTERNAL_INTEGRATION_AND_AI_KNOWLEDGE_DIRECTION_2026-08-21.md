# Moduláris ügyfélkompozíció, külső integrációk és AI-tudásréteg

> **Dátum:** 2026-08-21 (Europe/Budapest)
> **Jelleg:** közösen megerősített tervezési irány / design intent
> **Státusz:** nem aktiválási vagy élesítési döntés; a meglévő auth-, tenant-, migrációs és üzemeltetési kapuk ettől függetlenül kötelezőek
> **Kapcsolódó dokumentumok:** [SpaceOS moduláris termékarchitektúra](SPACEOS_MODULAR_PRODUCT_ARCHITECTURE_2026-07-18.md), [ADR-067 modul-katalógus és életciklus](../adr/ADR-067-module-catalog-and-lifecycle.md), [Doorstar-lánc integrációs terv](DOORSTAR_CHAIN_INTEGRATION_PLAN_2026-08-10.md)

---

## 1. Termékirány: az ügyfél a szükséges képességeket választja

Egy tenant indulhat akár egyetlen platformképességgel is — például DMS-sel vagy egy későbbi CMS-szel — és később további saját modulokat kapcsolhat be. A `known → installed → entitled → enabled → usable` életciklus továbbra is ennek biztonsági és kereskedelmi kerete; a dokumentum nem állítja, hogy ez a végrehajtási lánc már minden hoston kész.

Az ügyfélnek nem kötelező a platform azonos képességű saját modulját választania. Használhat külső CRM-, ERP-, DMS- vagy más rendszert is, miközben a kiválasztott JoineryTech/SpaceOS modulok működnek. A külső rendszer ilyenkor nem közvetlen adatbázis-partner és nem automatikusan betöltött plugin: **verziózott integrációs szerződéshez kötött adapter/konektor**.

## 2. Adattulajdon és integrációs határ

Minden üzleti fogalomnak pontosan egy source of truth-ja van.

| Helyzet | Tulajdonos | A platform szerepe |
|---|---|---|
| Platformmodulban kezelt fogalom | az adott modul | saját domainmodell, API és adat |
| Külső rendszerben kezelt fogalom | a külső rendszer | hitelesített adapter, hivatkozás vagy lokális read projection |
| Közös platformtény | Kernel | tenant, identity, entitlement, audit és integrációs primitívek |

Kötelező szabályok:

- Konektor soha nem ír közvetlenül idegen modul- vagy külső rendszer-adatbázisba.
- A kapcsolat versioned OpenAPI/REST, esemény- vagy webhook-szerződésen át történik; az események idempotensek és auditálhatók.
- Minden hívás tenant- és fogyasztóazonosítóhoz, rövid életű szolgáltatási hitelesítéshez, minimális jogosultsághoz és naplózáshoz kötött.
- A mapping egyértelműen leírja az entitás-, mező-, irány-, hiba- és visszajátszási szabályokat. A helyi projection nem válhat csendben új source of truth-tá.

Így egy külső CRM vagy DMS fokozatosan bevezethető, majd később lecserélhető a platform saját megfelelőjére — vagy fordítva — anélkül, hogy a modulok egymás belső tábláira épülnének.

## 3. MCP szerepe: AI-eszközhatár, nem modul-integrációs busz

Az MCP a modellek/agentek számára ad szabályozott eszközöket, például tudáskeresést vagy kifejezetten engedélyezett, olvasási üzleti lekérdezést. Nem helyettesíti a modulok és külső rendszerek közötti API-, esemény- vagy konektor-réteget.

A jelenlegi Nexus Knowledge Service MCP- és RAG-alapot ad; ez jó kiindulópont belső agent- és tesztkörnyezethez. Ügyfél- vagy partneroldali MCP-eszköz csak akkor tehető elérhetővé, ha az adott toolnak külön tenant-scope-ja, felhasználó-/szolgáltatásazonossága, explicit engedélye, rate limitje és auditja van. Alapelv: **default deny, legkisebb jogosultság, közvetlen adatbázis-eszköz nélkül**.

**Jelenlegi korlát:** a Knowledge Service meglévő RAG-indexe még nem tenant- és ACL-szűrt, a tudás-REST útvonalai pedig nem ügyféladatot védő hozzáférési határként vannak kialakítva. Emiatt az a mai formájában belső fejlesztői/agent tudástár, nem közvetlenül bekapcsolható ügyféladat-RAG.

## 4. RAG: rövid távon hasznos, de index-projection marad

A Doorstar és más instance-ok számára a RAG a következő természetes AI-réteg: dokumentumokból, jóváhagyott specifikációkból és kijelölt tudásforrásokból ad forrásolt találatokat.

Egy üzemi RAG-index kötelező metaadatai:

- tenant-azonosító és a forrásrendszer azonosítója;
- dokumentum- és verzióazonosító, tartalom-hash és indexelési idő;
- az eredeti DMS-/külső ACL-ből származó hozzáférési címkék;
- visszamutatható forrás és idézhető fragmentum.

A RAG csak retrieval-projection: nem ír üzleti adatot, nem ruház jogosultságot, és nem lehet az üzleti döntés egyetlen bizonyítéka. Egy generált válaszhoz a felhasználó számára forrásokat kell adni; bármely író művelet a normál, hitelesített modul-API-n keresztül és külön jóváhagyással történik.

Tartós teszt- vagy staging környezetben perzisztens vektortár és ellenőrzött indexelési folyamat kell. A csak folyamatmemóriás keresési fallback fejlesztői kényelmi mód, nem megőrzési vagy auditálható tudástár.

## 5. GraphRAG: célzott második lépcső

A meglévő projekt-/függőségi gráf nem azonos GraphRAG-gal. Valódi GraphRAG csak akkor indokolt, ha a kérdések több kapcsolaton átívelő választ igényelnek, például:

```text
projekt → ajtótípus → rajzverzió → gyártási előírás → minőségi eltérés
```

Előfeltétele egy egyeztetett, tenant-scope-os szemantikus modell: entitástípusok, kapcsolattípusok, kapcsolat-provenance, verziózás, ACL és törlési/retenciós szabályok. A gráf és a vektorindex egyaránt másodlagos keresési projection; az eredeti modul vagy külső rendszer marad az adat tulajdonosa.

Ezért a javasolt sorrend:

1. tenant- és ACL-szűrt RAG, forrásidézetekkel;
2. szűk, alapértelmezetten olvasási MCP-toolok;
3. csak igazolt többkapcsolatos üzleti kérdésekre hibrid GraphRAG.

## 6. Doorstar tesztüzemi alkalmazás

Az első hasznos, biztonságos szelet a Doorstar jóváhagyott dokumentumainak tenant-szűrt RAG-ja és egy olvasási MCP-kereső. Külső rendszerhez először egy egyértelműen kijelölt capability-konektor készül; nem kapcsolunk be tetszőleges harmadik fél rendszert általános credentiallel vagy közvetlen adatbázis-hozzáféréssel.

Ez az irány nem oldja fel a jelenlegi testüzemi aktiválási kapukat: a hitelesített szolgáltatásidentitás, tenant/RLS, modul-életciklus, migrációs bizonyíték és Keycloak-integráció továbbra is külön go/no-go feltétel.
