# EF Core Migration Workflow

**Quick reference:** Adding a new column or table to Kernel

## 1. Add Property to Entity

```csharp
// Models/Order.cs
public class Order
{
    public Guid Id { get; set; }
    public string OrderNumber { get; set; }

    // NEW COLUMN
    public DateTime? ShipDate { get; set; }

    public string TenantId { get; set; }
    // ...
}
```

## 2. Create Migration

```bash
cd spaceos-nexus/kernel

# Create migration
dotnet ef migrations add AddShipDateToOrder --project src/Kernel.Infrastructure

# Check generated migration
cat Migrations/20260629_AddShipDateToOrder.cs
```

## 3. Review Migration File

```csharp
protected override void Up(MigrationBuilder migrationBuilder)
{
    migrationBuilder.AddColumn<DateTime>(
        name: "ShipDate",
        table: "Orders",
        type: "datetime2",
        nullable: true);
}

protected override void Down(MigrationBuilder migrationBuilder)
{
    migrationBuilder.DropColumn(
        name: "ShipDate",
        table: "Orders");
}
```

## 4. Apply to Database

```bash
# Development
dotnet ef database update --project src/Kernel.Infrastructure

# Production (with snapshot)
dotnet ef migrations list
dotnet ef database update AddShipDateToOrder --project src/Kernel.Infrastructure --environment Production
```

## ⚠️ Common Gotchas

- **suppressTransaction = true** for table renames (see KNOWN_GOTCHAS.md)
- **RunSQL()** only if EF can't infer the operation
- **Test migrations** with Testcontainers before production

**See also:** [DATABASE_PATTERNS.md](../patterns/DATABASE_PATTERNS.md)
