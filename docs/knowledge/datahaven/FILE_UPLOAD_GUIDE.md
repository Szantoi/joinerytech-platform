# Hybrid File Upload System — User Guide

> **Version:** 1.0
> **Date:** 2026-06-19
> **Status:** DEPLOYED

---

## Overview

A SpaceOS Hybrid File Upload System három interfészt biztosít fájlok feltöltésére a Knowledge Base-be:

1. **Telegram Bot** — Mobil-barát, bárhonnan elérhető
2. **Web Dashboard** — Drag & drop, böngésző alapú
3. **MCP Tools** — Agent-ek számára, több környezetből

Mindhárom csatorna ugyanazzal a Knowledge Service-szel kommunikál (port 3456), és automatikusan triggereli a reindexet.

---

## 1. Telegram Bot

### Parancsok

| Parancs | Leírás |
|---------|--------|
| `/upload` | Használati útmutató |
| `/files [category]` | Fájlok listázása kategóriánként |
| `/reindex` | Manuális reindex triggerelése |

### Fájl feltöltés

1. Küldj egy dokumentumot a botnak (nem fotóként, hanem fájlként)
2. A **caption**-be írd a kategóriát:
   - `#knowledge` — általános tudásbázis
   - `#architecture` — architekturális dokumentumok
   - `#deployment` — deploy runbookok, gotchák
   - `#patterns` — fejlesztési minták
   - `#security` — biztonsági dokumentumok
   - `#context` — terminál kontextusok
   - `#upload` — általános feltöltés (nem indexelődik)

3. Ha nincs caption, a fájl az `upload` kategóriába kerül

### Példa

```
📎 my-new-doc.md
Caption: #deployment Új deploy checklist
```

### Engedélyezett fájltípusok

`.md`, `.txt`, `.pdf`, `.json`, `.yaml`, `.yml`, `.csv`

**Max méret:** 10 MB

---

## 2. Web Dashboard

### Elérés

**URL:** https://datahaven.joinerytech.hu

### Használat

1. Nyisd meg a **File Management** szekciót
2. Válaszd ki a **kategóriát** a dropdown-ból
3. Húzd a fájlokat a **dropzone**-ba (vagy kattints a "Browse files" gombra)
4. Várj a feltöltés befejezésére
5. A knowledge kategóriák automatikusan reindexelnek

### Features

- **Drag & Drop** — többfájlos feltöltés
- **Progress bar** — feltöltési folyamat
- **File Browser** — kategóriánkénti böngészés
- **Delete** — fájlok törlése
- **Download** — fájlok letöltése
- **Manual Reindex** — kézi reindex gomb

### API Endpoints

| Endpoint | Method | Leírás |
|----------|--------|--------|
| `/api/uploads` | GET | Fájlok listázása |
| `/api/uploads` | POST | Fájl feltöltés (multipart) |
| `/api/uploads/categories` | GET | Kategóriák listája |
| `/api/uploads/:cat/:file` | DELETE | Fájl törlése |
| `/api/uploads/reindex` | POST | Reindex triggerelése |
| `/api/uploads/download/:cat/:file` | GET | Fájl letöltése |

---

## 3. MCP Tools (Agents)

### Elérhető tools

| Tool | Leírás |
|------|--------|
| `knowledge_upload` | Szöveges tartalom feltöltése fájlként |
| `knowledge_list` | Fájlok listázása kategóriánként |
| `knowledge_read` | Fájl tartalmának olvasása |
| `knowledge_delete` | Fájl törlése |
| `knowledge_reindex` | Manuális reindex |
| `knowledge_categories` | Kategóriák listázása |

### Használat (MCP hívás)

```typescript
// Fájl feltöltés
await mcp.call("knowledge_upload", {
  filename: "my-doc.md",
  content: "# My Document\n\nContent here...",
  category: "deployment"
});

// Fájlok listázása
const result = await mcp.call("knowledge_list", {
  category: "knowledge",
  limit: 20
});

// Fájl olvasása
const doc = await mcp.call("knowledge_read", {
  category: "deployment",
  filename: "KNOWN_GOTCHAS.md"
});
```

### Multi-environment támogatás

Az MCP toolok lehetővé teszik, hogy több gépről/környezetből is kapcsolódjanak az agentok:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Local Dev     │     │   VPS Agent     │     │   CI/CD Agent   │
│   (macOS)       │     │   (Linux)       │     │   (GitHub)      │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │   SpaceOS Nexus MCP    │
                    │   (knowledge_upload,   │
                    │    knowledge_read...)  │
                    └────────────┬───────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │   Knowledge Service    │
                    │   (port 3456)          │
                    └────────────────────────┘
```

---

## 4. Kategóriák

| Kategória | Path | RAG indexelés |
|-----------|------|---------------|
| `upload` | `docs/uploads/` | ❌ Nem |
| `knowledge` | `docs/knowledge/` | ✅ Igen |
| `architecture` | `docs/knowledge/architecture/` | ✅ Igen |
| `deployment` | `docs/knowledge/deployment/` | ✅ Igen |
| `patterns` | `docs/knowledge/patterns/` | ✅ Igen |
| `security` | `docs/knowledge/security/` | ✅ Igen |
| `context` | `docs/knowledge/context/` | ✅ Igen |

---

## 5. Auto-Reindex

Minden **knowledge kategóriába** történő feltöltés automatikusan triggereli a Knowledge Service reindexét:

```
Upload → Save to disk → HTTP POST /api/knowledge/index → FTS Update
```

A reindex eredménye tartalmazza az indexelt dokumentumok számát.

---

## 6. Fájl nevezési konvenció

**Ajánlott formátum:**
```
YYYY-MM-DD_topic-slug.md
```

**Példák:**
- `2026-06-19_jwt-security-patterns.md`
- `2026-06-19_keycloak-setup-guide.md`

**Ütközéskezelés:** Ha már létezik azonos nevű fájl, timestamp suffix kerül hozzá:
```
my-doc.md → my-doc_1718784000000.md
```

---

## 7. Hibaelhárítás

### Telegram bot nem válaszol

1. Ellenőrizd a bot státuszát:
```bash
ps aux | grep bot.py
tail -10 /opt/spaceos/datahaven-telegram/logs/bot.log
```

2. Ha 409 Conflict error → több példány fut, lásd Gotcha #22

### Upload sikertelen

1. Ellenőrizd a fájl méretét (max 10 MB)
2. Ellenőrizd a fájl típusát (engedélyezett kiterjesztések)
3. Ellenőrizd a Knowledge Service-t:
```bash
curl http://localhost:3456/health
```

### Reindex nem fut le

```bash
# Manuális reindex
curl -X POST http://localhost:3456/api/knowledge/index

# Ha permission denied → lásd Gotcha #25
sudo chmod -R o+rX /opt/spaceos/docs/knowledge/
```

---

## 8. Összefoglaló

| Interface | Use Case | Előny |
|-----------|----------|-------|
| **Telegram** | Mobilról gyors megosztás | Bárhonnan elérhető |
| **Web** | Batch upload, böngészés | Drag & drop, visual |
| **MCP** | Agent automatizáció | Multi-env, programmatic |
