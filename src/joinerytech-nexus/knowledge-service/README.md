# Nexus Knowledge Service

A Nexus Knowledge Service a JoineryTech platform Node.js/TypeScript alapú
tudás-, MCP- és agent-koordinációs szolgáltatása. Express HTTP szervert ad,
indexeli a tudástár Markdown-dokumentumait, és ugyanebből a futtatási környezetből
szolgál ki mailbox-, session- és egyéb agent-műveleteket.

## Mit tartalmaz

- RAG keresés a tudástárban: GET és POST /api/knowledge/search
- Tudástár-indexelés és Chroma-alapú vektortárolás
- MCP JSON-RPC felület a /mcp útvonalon
- Mailbox, session, pipeline, státusz és dashboard route-ok
- Health, readiness és liveness probe: /health, /ready és /live

A fő belépési pont a src/server.ts. Induláskor inicializálja a tárolókat és a
mailboxot; ha a vektortároló üres, automatikusan megkísérli a tudástár első
indexelését is.

## Helyi indítás

A parancsokat ebből a könyvtárból futtasd:

    cd src/joinerytech-nexus/knowledge-service
    npm ci

A jelenlegi checkoutban add meg a tudástár abszolút útvonalát. Ez azért fontos,
mert az indexelő forrásbeli fallbackje a jelenlegi repository-elrendezésben egy
nem létező src/docs/knowledge célra oldódik fel.

PowerShellben:

    $env:KNOWLEDGE_BASE_PATH = (Resolve-Path -LiteralPath '../../../docs/knowledge').Path
    npm run dev

A szolgáltatás első indítása üres tárolónál indexelést végez, ezért a start nem
feltétlenül azonnali. Kézi újraindexeléshez:

    npm run index

A forrás az indexelési ciklusok között 40 másodperces várakozást alkalmaz, ezért
nagy tudástárnál ezt tervezett, nem interaktív műveletként kezeld.

## Tároló és embedding

A szolgáltatás elsődlegesen ChromaDB-t használ. Ha a Chroma nem elérhető,
folyamatmemóriás fallbackre vált; az így felépített index újraindításkor elveszik.

A Chroma-kapcsolathoz a jelenlegi forrás localhost:8001 címet használ. A
CHROMA_URL változó jelenleg csak a naplózási értéket befolyásolja, nem írja felül
a tényleges klienskapcsolatot, ezért ne építs rá hordozható konfigurációként.

A normál Chroma-útvonal Xenova all-MiniLM-L6-v2 embedding függvényt használ. A
VOYAGE_API_KEY opcionális: ha be van állítva, a dokumentum- és lekérdezés-
embeddingeket Voyage AI-val készíti. A kulcsot kizárólag helyi secret
környezetből töltsd be; ne kerüljön README-be, commitba vagy VITE_ változóba.

## Port és deployment

| Kontextus | Port | Forrása |
|---|---:|---|
| Helyi forrás alapértéke | 3456 | A src/server.ts a PORT változót olvassa, ennek hiányában 3456-ot használ. |
| Telepített Nexus MCP elérési konvenció | 3458 | Platformszintű üzemeltetési szerződés; nem a szolgáltatás forrásbeli alapértéke. |

Más helyi portra PowerShellben például:

    $env:PORT = '3457'
    npm run dev

A src/server.ts csak a portot adja át az Express app.listen hívásnak; host- vagy
loopback-bindingot nem határoz meg. A 3458-as telepített elérhetőséghez a
service managernek vagy az előtte lévő proxy/tunnelnek kell a megfelelő portot
és kötést adnia. Éles állapotot ne ebből a README-ből feltételezz: a futó
listener, a service környezete és a health válasz együtt a bizonyíték.

A platform aktuális üzemeltetési konvencióit a
[platform útmutató](../../../AGENTS.md), a történeti állapotot pedig a
[VPS service state](../../../docs/knowledge/architecture/VPS_SERVICE_STATE_2026-07-16.md)
rögzíti.

## Helyi ellenőrzés

Alapértelmezett port mellett:

    $base = 'http://localhost:3456'
    Invoke-RestMethod "$base/health"
    Invoke-RestMethod "$base/ready"
    Invoke-RestMethod "$base/api/knowledge/search?q=tenant&topK=5"

Az MCP- és mailbox-végpontok hitelesítési, jogosultsági és környezeti
követelményeit a szolgáltatás konfigurációja szabályozza. Ne helyettesítsd
ezeket dokumentált vagy beégetett tokenekkel.

## Build és tesztek

    npm run validate
    npm run test
    npm run test:unit
    npm run test:integration
    npm run test:e2e
    npm run build
    npm start

A build a dist/server.js belépési pontot készíti el. A .env és a runtime
adatkönyvtár nem verziókövetett; local konfigurációt és credentialt mindig ott
vagy erre kijelölt secret source-ban tarts.

## További olvasnivaló

- [MCP eszközök állapota](docs/MCP_TOOLS_PHASE1_STATUS.md)
- [Központi tudástár-index](../../../docs/knowledge/INDEX.md)
- [Platformszintű minőségi és biztonsági elvárások](../../../QUALITY.md)
