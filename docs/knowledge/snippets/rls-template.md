# RLS (Row Level Security) Policy Template

**Use case:** Tenant isolation — User can only see their tenant's data

## 1. SQL Policy Setup

```sql
-- Enable RLS on table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policy for users (tenant isolation)
CREATE POLICY orders_tenant_isolation ON orders
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Create policy for admins (bypass RLS)
CREATE POLICY orders_admin_bypass ON orders
    USING (
        current_setting('app.role')::text = 'admin'
        OR tenant_id = current_setting('app.tenant_id')::uuid
    );

-- Create policy for INSERT
CREATE POLICY orders_insert ON orders
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
```

## 2. C# DbContext Setup (EF Core)

```csharp
protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
{
    base.OnConfiguring(optionsBuilder);

    optionsBuilder.UseSqlServer(
        _connectionString,
        opt => opt.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery)
    );
}

// In middleware or interceptor
public class TenantInterceptor : DbCommandInterceptor
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public override Task<InterceptionResult<DbCommand>> CommandCreatedAsync(
        CommandEventData eventData,
        InterceptionResult<DbCommand> result,
        CancellationToken cancellationToken = default)
    {
        var tenantId = _httpContextAccessor?.HttpContext?.User
            .FindFirst("tenant_id")?.Value;
        var role = _httpContextAccessor?.HttpContext?.User
            .FindFirst(ClaimTypes.Role)?.Value;

        if (tenantId != null)
        {
            var command = eventData.Command;
            command.CommandText = $"SET app.tenant_id = '{tenantId}';\n" +
                                 $"SET app.role = '{role}';\n" +
                                 command.CommandText;
        }

        return base.CommandCreatedAsync(eventData, result, cancellationToken);
    }
}
```

## 3. Registration

```csharp
services.AddScoped<TenantInterceptor>();
```

**See also:** [MULTI_TENANT_RLS_ARCHITECTURE_2026.md](../architecture/MULTI_TENANT_RLS_ARCHITECTURE_2026.md)
