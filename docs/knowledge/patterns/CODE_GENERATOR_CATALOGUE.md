# CODE_GENERATOR_CATALOGUE.md — SpaceOS Code Generator Toolchain

> **Automatizált kódgenerálás** a SpaceOS modular monolith architektúrához.
> Bash heredoc template rendszer (ADR-050 pattern).

---

## Áttekintés

A SpaceOS két fő kódgenerátort tartalmaz:

| Generátor | Fájl | Cél | Státusz |
|---|---|---|---|
| **React Hook Generator** | `scripts/codegen/generate-hook.sh` | Frontend React hooks (query/mutation/state/effect) | ✅ Production |
| **CQRS Handler Generator** | `scripts/codegen/generate-handler.sh` | Backend MediatR handlers (query/command) | ✅ Production |

**Közös pattern:** Bash heredoc templates (ADR-050)
- Zero dependency (csak bash + cat)
- 0.1s execution time
- Template-alapú fájlgenerálás

---

## 1. CQRS Handler Generator (ADR-051)

> **Cél:** .NET 8 MediatR handler boilerplate automatizálása
> **ROI:** 90% időmegtakarítás (18 perc → 2 perc per handler)

### Használat

```bash
# Query handler generálás
/opt/spaceos/scripts/codegen/generate-handler.sh GetOrderStatus \
  --type query \
  --module Procurement \
  --repository IProcurementRepository \
  --aggregate Order \
  --properties '[{"name":"OrderId","type":"Guid"}]'

# Command handler generálás
/opt/spaceos/scripts/codegen/generate-handler.sh WithdrawComplaint \
  --type command \
  --module Procurement \
  --repository IComplaintRepository \
  --aggregate Complaint \
  --properties '[{"name":"ComplaintId","type":"Guid"},{"name":"Reason","type":"string"}]'
```

### Argumentumok

| Paraméter | Kötelező | Default | Leírás |
|---|---|---|---|
| \`name\` | ✅ | - | Handler név (PascalCase) |
| \`--type\` | ✅ | - | \`query\` vagy \`command\` |
| \`--module\` | ✅ | - | Modul név (pl. \`Procurement\`) |
| \`--repository\` | ✅ | - | Repository interface (pl. \`IProcurementRepository\`) |
| \`--aggregate\` | ✅ | - | Aggregate root név (pl. \`Order\`) |
| \`--properties\` | ❌ | \`[{"name":"Id","type":"Guid"}]\` | Properties JSON array |
| \`--with-response\` | ❌ | \`true\` (query), \`false\` (command) | Generál Response.cs-t |
| \`--with-test\` | ❌ | \`false\` | Unit test fájl generálás |

### Properties JSON Formátum

```json
[
  {
    "name": "OrderId",
    "type": "Guid",
    "nullable": false
  },
  {
    "name": "Reason",
    "type": "string",
    "nullable": true
  }
]
```

**Támogatott típusok:**
- Primitívek: \`Guid\`, \`string\`, \`int\`, \`decimal\`, \`DateTime\`, \`bool\`
- Collections: \`List<T>\`, \`IEnumerable<T>\`
- Custom: \`OrderStatus\`, \`MaterialType\` (enum-ok)

### Generált Fájlok

**Query handler (3 fájl):**
```
Queries/<Name>/<Name>Query.cs
Queries/<Name>/<Name>QueryHandler.cs
Queries/<Name>/<Name>Response.cs
```

**Command handler (2 fájl):**
```
Commands/<Name>/<Name>Command.cs
Commands/<Name>/<Name>CommandHandler.cs
```

### Post-Generation Checklist

- [ ] Felülvizsgáltad a generált fájlokat
- [ ] TODO kommentek helyett valós implementáció
- [ ] Response.cs-ben a TODO properties kitöltve
- [ ] Unit teszt írva (ha \`--with-test\` nem volt használva)
- [ ] DI regisztráció ellenőrizve (MediatR auto-register)
- [ ] Build sikeres (\`dotnet build\`)

---

## 2. React Hook Generator (ADR-050)

> **Cél:** React hooks boilerplate automatizálása
> **Use case:** Frontend portal development

### Használat

```bash
# Query hook with TanStack Query
/opt/spaceos/scripts/codegen/generate-hook.sh Orders \
  --type query \
  --with-cache \
  --endpoint /api/orders

# Mutation hook
/opt/spaceos/scripts/codegen/generate-hook.sh CreateQuote \
  --type mutation \
  --endpoint /api/quotes

# State management hook
/opt/spaceos/scripts/codegen/generate-hook.sh Auth \
  --type state \
  --with-test

# Effect hook
/opt/spaceos/scripts/codegen/generate-hook.sh WindowResize \
  --type effect
```

### Hook Típusok

| Típus | Use Case | TanStack Query Support |
|---|---|---|
| \`query\` | Data fetching, read operations | ✅ \`--with-cache\` |
| \`mutation\` | Create/Update/Delete operations | ✅ \`--with-cache\` |
| \`state\` | Local state management (Zustand-like) | ❌ |
| \`effect\` | Side effects, subscriptions | ❌ |

---

## Best Practices

### CQRS Handler Generator

1. **Generálás után mindig build check:**
   ```bash
   dotnet build → 0 error, 0 warning
   ```

2. **TODO kommentek rendszeresen:**
   - \`// TODO: Implement query logic\` — implementáld a üzleti logikát
   - \`// TODO: Add response properties\` — Response.cs kitöltése

3. **Properties naming convention:**
   - PascalCase: \`OrderId\`, \`ProductName\`, \`TotalAmount\`
   - Nullable: \`nullable: true\` → \`string?\` vagy \`int?\`

4. **Repository pattern:**
   - Interface mindig \`I{Module}Repository\`
   - Aggregate root mindig PascalCase: \`Order\`, \`Complaint\`, \`Material\`

---

## Kapcsolódó Dokumentáció

- **ADR-050:** Code Generator Toolchain Architecture
- **ADR-051:** CQRS Handler Generator Template Design
- \`scripts/codegen/generate-hook.sh\` — React Hook generator implementáció
- \`scripts/codegen/generate-handler.sh\` — CQRS Handler generator implementáció

---

## Version History

| Verzió | Dátum | Változás |
|---|---|---|
| 1.0 | 2026-06-30 | Kezdeti verzió (generate-handler.sh + generate-hook.sh) |

---

**Utolsó frissítés:** 2026-06-30
**Tulajdonos:** Backend Terminal
**Felülvizsgálat:** Quarterly (Q3 2026)
