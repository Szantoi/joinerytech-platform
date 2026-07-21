using Npgsql;

namespace SpaceOS.Modules.Hosting.RlsFixtures;

/// <summary>
/// Minimal raw-SQL helpers for the STAB-RLS-PROOF per-module tests. Deliberately thin: the proof
/// must exercise PostgreSQL's own RLS enforcement directly (parameterised INSERT/SELECT against
/// the real tables), NOT the module's EF <c>HasQueryFilter</c> second layer — using the module's
/// LINQ/DbContext query path here would test the app-side filter, not the database's own
/// enforcement, which is exactly what this task must prove independently (see ADR-062 and the
/// task's "Kötelező források").
/// </summary>
public static class RlsSql
{
    /// <summary>Executes a non-query statement with named parameters.</summary>
    public static async Task ExecuteAsync(NpgsqlConnection connection, string sql, params (string Name, object Value)[] parameters)
    {
        await using var cmd = connection.CreateCommand();
        cmd.CommandText = sql;
        foreach (var (name, value) in parameters)
            cmd.Parameters.AddWithValue(name, value);
        await cmd.ExecuteNonQueryAsync().ConfigureAwait(false);
    }

    /// <summary>Runs a scalar COUNT/aggregate query and returns it as <see cref="int"/>.</summary>
    public static async Task<int> CountAsync(NpgsqlConnection connection, string sql, params (string Name, object Value)[] parameters)
    {
        await using var cmd = connection.CreateCommand();
        cmd.CommandText = sql;
        foreach (var (name, value) in parameters)
            cmd.Parameters.AddWithValue(name, value);
        var result = await cmd.ExecuteScalarAsync().ConfigureAwait(false);
        return Convert.ToInt32(result);
    }

    /// <summary>Opens a fresh connection against the given connection string.</summary>
    public static async Task<NpgsqlConnection> OpenAsync(string connectionString)
    {
        var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync().ConfigureAwait(false);
        return connection;
    }
}
