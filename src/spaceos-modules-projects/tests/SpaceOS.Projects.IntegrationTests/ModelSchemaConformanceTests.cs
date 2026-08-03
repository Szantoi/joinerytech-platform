using Microsoft.EntityFrameworkCore;
using Npgsql;
using SpaceOS.Modules.Hosting.RlsFixtures;
using SpaceOS.Projects.Infrastructure.Data;
using Xunit;

namespace SpaceOS.Projects.IntegrationTests;

/// <summary>
/// Every column the EF model believes in exists in the migrated schema, and every column the
/// migration creates is known to the model.
/// </summary>
/// <remarks>
/// <para>
/// <b>Why this test exists at all.</b> The migration here is hand-written SQL, and the model is
/// declared separately in the configurations — two descriptions of one schema, with nothing
/// forcing them to agree. An InMemory suite cannot notice the disagreement <i>in principle</i>:
/// it never touches a schema. The B2B-10 F1 slice shipped three defects of exactly this shape
/// before a real database was in the loop.
/// </para>
/// <para>
/// <b>Both directions are checked, and that is the point.</b> A model-to-database check alone
/// passes when the migration creates a column nobody maps (dead weight that silently accumulates,
/// or a NOT NULL column that will reject every insert). The reverse check is what catches it.
/// </para>
/// </remarks>
public sealed class ModelSchemaConformanceTests : IAsyncLifetime
{
    private readonly NonSuperuserRlsFixture _fixture = new("projects_conformance");

    public async Task InitializeAsync()
    {
        try
        {
            await _fixture.StartAsync();

            var options = new DbContextOptionsBuilder<ProjectsDbContext>()
                .UseNpgsql(_fixture.AdminConnectionString)
                .Options;

            await using var context = new ProjectsDbContext(options);
            await context.Database.MigrateAsync();
        }
        catch
        {
            await _fixture.DisposeAsync();
            throw;
        }
    }

    public async Task DisposeAsync() => await _fixture.DisposeAsync();

    private ProjectsDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<ProjectsDbContext>()
            .UseNpgsql(_fixture.AdminConnectionString)
            .Options);

    /// <summary>Reads (table, column, is-nullable) for the module schema from the live catalog.</summary>
    private async Task<Dictionary<string, Dictionary<string, bool>>> ReadSchemaAsync()
    {
        var schema = new Dictionary<string, Dictionary<string, bool>>(StringComparer.Ordinal);

        await using var connection = await RlsSql.OpenAsync(_fixture.AdminConnectionString);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT table_name, column_name, is_nullable
            FROM information_schema.columns
            WHERE table_schema = @schema
            """;
        command.Parameters.Add(new NpgsqlParameter("schema", ProjectsDbContext.SchemaName));

        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var table = reader.GetString(0);
            if (!schema.TryGetValue(table, out var columns))
                schema[table] = columns = new Dictionary<string, bool>(StringComparer.Ordinal);

            columns[reader.GetString(1)] = reader.GetString(2) == "YES";
        }

        return schema;
    }

    [Fact]
    public async Task Every_mapped_column_exists_in_the_database_with_the_declared_nullability()
    {
        await using var context = CreateContext();
        var live = await ReadSchemaAsync();
        var problems = new List<string>();

        foreach (var entityType in context.Model.GetEntityTypes())
        {
            var table = entityType.GetTableName()!;

            if (!live.TryGetValue(table, out var columns))
            {
                problems.Add($"table {table} is mapped but does not exist");
                continue;
            }

            foreach (var property in entityType.GetProperties())
            {
                var column = property.GetColumnName();

                if (!columns.TryGetValue(column, out var nullableInDb))
                {
                    problems.Add($"{table}.{column} is mapped but does not exist");
                    continue;
                }

                if (nullableInDb != property.IsNullable)
                {
                    problems.Add(
                        $"{table}.{column} nullability differs: model={property.IsNullable}, database={nullableInDb}");
                }
            }
        }

        Assert.Empty(problems);
    }

    [Fact]
    public async Task Every_column_the_migration_creates_is_known_to_the_model()
    {
        await using var context = CreateContext();
        var live = await ReadSchemaAsync();

        var mapped = context.Model.GetEntityTypes()
            .SelectMany(entityType => entityType.GetProperties()
                .Select(property => $"{entityType.GetTableName()}.{property.GetColumnName()}"))
            .ToHashSet(StringComparer.Ordinal);

        // The migrations history table is EF's own bookkeeping and is deliberately not mapped.
        var unmapped = live
            .Where(table => table.Key != "__EFMigrationsHistory")
            .SelectMany(table => table.Value.Keys.Select(column => $"{table.Key}.{column}"))
            .Where(column => !mapped.Contains(column))
            .ToList();

        Assert.Empty(unmapped);
    }

    [Fact]
    public async Task The_two_uniqueness_guarantees_exist_as_indexes_that_are_actually_unique()
    {
        // Asserted on the catalog rather than on behaviour: a missing unique index shows up as a
        // rare lost race in production and as nothing at all in a test suite.
        //
        // The FIRST version of this test read pg_indexes and asserted the NAME was present. A
        // mutation run (unique index downgraded to a plain one) left it green — the gate only
        // caught what it looked at, and it was not looking at uniqueness. It now reads
        // pg_index.indisunique, which is the property the name was standing in for.
        await using var connection = await RlsSql.OpenAsync(_fixture.AdminConnectionString);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT cls.relname, idx.indisunique
            FROM pg_index idx
            JOIN pg_class cls ON cls.oid = idx.indexrelid
            JOIN pg_namespace ns ON ns.oid = cls.relnamespace
            WHERE ns.nspname = @schema
            """;
        command.Parameters.Add(new NpgsqlParameter("schema", ProjectsDbContext.SchemaName));

        var unique = new Dictionary<string, bool>(StringComparer.Ordinal);
        await using (var reader = await command.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
                unique[reader.GetString(0)] = reader.GetBoolean(1);
        }

        Assert.True(unique.GetValueOrDefault("IX_projects_TenantId_Code"),
            "IX_projects_TenantId_Code is missing or is not a UNIQUE index");
        Assert.True(unique.GetValueOrDefault("IX_project_epic_assignments_TenantId_EpicId"),
            "IX_project_epic_assignments_TenantId_EpicId is missing or is not a UNIQUE index");
    }
}
