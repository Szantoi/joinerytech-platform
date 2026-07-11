# SpaceOS Code Generator Toolchain (ADR-050)

> Automatizált kódgenerálás API kliensekhez, React komponensekhez, hookokhoz és .NET modulokhoz.

## Architektúra

```
┌─────────────────────────────────────────────────────────────────┐
│                     SpaceOS Codegen Stack                       │
├─────────────────────────────────────────────────────────────────┤
│  CLI Layer         spaceos generate <type> [options]            │
│                         │                                       │
│  Script Layer      scripts/codegen/generate-*.sh                │
│                         │                                       │
│  Engine Layer      knowledge-service/src/codegen/               │
│                         │                                       │
│  MCP Layer         generate_* tools (terminálok számára)        │
└─────────────────────────────────────────────────────────────────┘
```

## Elérhető Generátorok

### 1. API Client Generator
```bash
spaceos generate api-client [portal|orchestrator|all]
```
- **Portal:** Orval + TanStack Query hooks
- **Orchestrator:** NSwag TypeScript client

### 2. React Component Generator
```bash
spaceos generate component <name> --category <feature|ui|layout> [--with-test] [--with-story]
```
Generál:
- `<Name>.tsx` - Fő komponens
- `<Name>.module.css` - CSS modul
- `index.ts` - Export
- `<Name>.test.tsx` - Vitest teszt (opcionális)
- `<Name>.stories.tsx` - Storybook (opcionális)

### 3. React Hook Generator
```bash
spaceos generate hook <name> --type <query|mutation|state|effect> [--with-test] [--with-cache] [--endpoint <path>]
```

**Hook típusok:**

| Típus | Leírás | TanStack Query |
|-------|--------|----------------|
| `query` | Adat lekérdezés | `useQuery` (--with-cache) |
| `mutation` | Adat módosítás | `useMutation` (--with-cache) |
| `state` | Lokális állapot | useState + useCallback |
| `effect` | Side effects | useEffect + cleanup |

### 4. .NET Module Generator
```bash
spaceos generate module <name> --states <s1,s2,...> [--aggregate <name>] [--events <e1,e2>] [--with-api]
```
Generál DDD struktúrát:
- Aggregate root
- FSM states
- Domain events
- API endpoints (opcionális)

## MCP Tools (Terminálok számára)

| Tool | Terminál | Leírás |
|------|----------|--------|
| `generate_api_client` | frontend | Orval/NSwag API kliens |
| `generate_component` | frontend | React komponens scaffold |
| `generate_hook` | frontend | React hook scaffold |
| `generate_module` | backend | .NET modul scaffold |
| `get_codegen_status` | mindegyik | Konfiguráció státusz |

## Conductor + Haiku Automatizáció

A Nexus rendszer lehetővé teszi párhuzamos kódgenerálást:

```yaml
# Conductor task dispatch példa
task: "Generate CQRS handlers for Procurement"
parallel_workers:
  - terminal: backend
    model: haiku
    prompt: "generate_handler GetPurchaseOrders --type query"
  - terminal: backend
    model: haiku
    prompt: "generate_handler CreatePurchaseOrder --type command"
  # ... további párhuzamos taskok
```

**Előnyök:**
- 5 handler generálás: ~2 perc (vs 30+ perc szekvenciális)
- Konzisztens output (ugyanaz a template)
- Reviewer validálja az összeset

## Codegen Roadmap

| Prioritás | Generátor | Státusz |
|-----------|-----------|---------|
| KÉSZ | React Hooks | `generate_hook` |
| KÉSZ | React Components | `generate_component` |
| KÉSZ | API Clients | `generate_api_client` |
| KÉSZ | .NET Modules | `generate_module` |
| TERVEZETT | CQRS Handlers | Q3 |
| TERVEZETT | Express Routes | Q3 |
| TERVEZETT | Domain Events | Q3 |
| TERVEZETT | React Cards | Q3 |

## Fájl Struktúra

```
/opt/spaceos/
├── scripts/codegen/
│   ├── spaceos                    # CLI entry point (symlink: /usr/local/bin/spaceos)
│   ├── generate-api-client.sh
│   ├── generate-component.sh
│   ├── generate-hook.sh
│   └── generate-module.sh
│
└── spaceos-nexus/knowledge-service/src/codegen/
    ├── index.ts                   # Exports
    └── codegenEngine.ts           # TypeScript engine + MCP integration
```

## Használati Példák

### Frontend terminál
```bash
# Új feature komponens
spaceos generate component QuoteWizard --category feature --with-test

# Data fetching hook TanStack Query-vel
spaceos generate hook Quotes --type query --with-cache --endpoint /api/quotes

# Mutation hook
spaceos generate hook SubmitQuote --type mutation --with-cache --endpoint /api/quotes/submit
```

### Backend terminál
```bash
# Új .NET modul
spaceos generate module Pricing --states Draft,Calculated,Approved --with-api

# API kliens frissítés
spaceos generate api-client orchestrator
```

## Kapcsolódó Dokumentumok

- ADR-050: Code Generator Toolchain Architecture
- `terminals/frontend/CLAUDE.md` - Frontend codegen használat
- `terminals/backend/CLAUDE.md` - Backend codegen használat
