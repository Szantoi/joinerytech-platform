using Ehs.Application.Services;
using Microsoft.EntityFrameworkCore.Diagnostics;
using System.Data.Common;

namespace Ehs.Infrastructure.Interceptors;

/// <summary>
/// EF Core interceptor that sets PostgreSQL session variable for RLS policies.
/// CRITICAL: This interceptor enforces tenant isolation at the database level (v3-C1 security fix).
/// </summary>
public class TenantIsolationInterceptor : DbConnectionInterceptor
{
    private readonly ICurrentUserService _currentUserService;

    public TenantIsolationInterceptor(ICurrentUserService currentUserService)
    {
        _currentUserService = currentUserService ?? throw new ArgumentNullException(nameof(currentUserService));
    }

    public override async ValueTask<InterceptionResult> ConnectionOpeningAsync(
        DbConnection connection,
        ConnectionEventData eventData,
        InterceptionResult result,
        CancellationToken cancellationToken = default)
    {
        await SetSessionVariableAsync(connection, cancellationToken).ConfigureAwait(false);
        return await base.ConnectionOpeningAsync(connection, eventData, result, cancellationToken).ConfigureAwait(false);
    }

    public override InterceptionResult ConnectionOpening(
        DbConnection connection,
        ConnectionEventData eventData,
        InterceptionResult result)
    {
        SetSessionVariable(connection);
        return base.ConnectionOpening(connection, eventData, result);
    }

    private async Task SetSessionVariableAsync(DbConnection connection, CancellationToken cancellationToken)
    {
        var organizationId = _currentUserService.GetOrganizationId();

        if (organizationId == null)
        {
            // No organization context - RLS policies will deny all access
            // This is intentional: unauthenticated users should not bypass RLS
            return;
        }

        // Set PostgreSQL session variable for RLS policies
        // This variable is used in the USING and WITH CHECK clauses of RLS policies
        using var command = connection.CreateCommand();
        command.CommandText = $"SET LOCAL app.current_organization_id = '{organizationId.Value}';";

        if (connection.State != System.Data.ConnectionState.Open)
        {
            await connection.OpenAsync(cancellationToken).ConfigureAwait(false);
        }

        await command.ExecuteNonQueryAsync(cancellationToken).ConfigureAwait(false);
    }

    private void SetSessionVariable(DbConnection connection)
    {
        var organizationId = _currentUserService.GetOrganizationId();

        if (organizationId == null)
        {
            // No organization context - RLS policies will deny all access
            return;
        }

        using var command = connection.CreateCommand();
        command.CommandText = $"SET LOCAL app.current_organization_id = '{organizationId.Value}';";

        if (connection.State != System.Data.ConnectionState.Open)
        {
            connection.Open();
        }

        command.ExecuteNonQuery();
    }
}
