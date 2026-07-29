using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Npgsql;
using SpaceOS.Collaboration.Infrastructure.Data;
using SpaceOS.Modules.Hosting.RlsFixtures;
using Xunit;

namespace SpaceOS.Collaboration.IntegrationTests;

/// <summary>
/// B2B-10 F2/4 — every table and column the EF model expects actually exists after the
/// migrations have run.
/// </summary>
/// <remarks>
/// <para>
/// Written after F1 shipped an <c>AcceptanceEvidence</c> property with no migration behind it.
/// EF mapped the property by convention, the InMemory tests had no schema to disagree with, and
/// the mismatch only appeared when an agreement was first written to PostgreSQL — by a test
/// measuring something else. Fixing that one column would have left the same class of defect
/// free to recur on the next property somebody adds.
/// </para>
/// <para>
/// So this asserts the whole model at once, from the model itself rather than from a list
/// maintained by hand: a hand-written list is exactly the thing that stops being updated. A new
/// mapped property with no migration fails here immediately, naming the table and column.
/// </para>
/// <para>
/// The check is one-directional on purpose. Columns that exist in the database but not in the
/// model are not failures — a column can legitimately outlive the code that used to map it, and
/// failing on that would turn every deliberate deprecation into a broken build.
/// </para>
/// </remarks>
public sealed class ModelSchemaConformanceTests : IAsyncLifetime
{
    private readonly NonSuperuserRlsFixture _fixture = new("collaboration_model_conformance");

    public async Task InitializeAsync()
    {
        await _fixture.StartAsync();

        await using var db = NewContext();
        await db.Database.MigrateAsync();
    }

    public async Task DisposeAsync() => await _fixture.DisposeAsync();

    [Fact]
    public async Task Every_mapped_column_exists_in_the_migrated_schema()
    {
        await using var db = NewContext();

        var actual = await ReadSchemaAsync();
        var missing = new List<string>();

        foreach (var entityType in db.Model.GetEntityTypes())
        {
            var table = entityType.GetTableName();
            if (table is null)
                continue;

            var storeObject = StoreObjectIdentifier.Table(table, entityType.GetSchema());

            if (!actual.TryGetValue(table, out var columns))
            {
                missing.Add($"{table} (whole table)");
                continue;
            }

            foreach (var property in entityType.GetProperties())
            {
                var column = property.GetColumnName(storeObject);
                if (column is not null && !columns.Contains(column))
                    missing.Add($"{table}.{column}  (property {entityType.ClrType.Name}.{property.Name})");
            }
        }

        Assert.True(
            missing.Count == 0,
            "The EF model expects columns the migrations never created:" +
            Environment.NewLine + string.Join(Environment.NewLine, missing));
    }

    private CollaborationDbContext NewContext() =>
        new(new DbContextOptionsBuilder<CollaborationDbContext>()
            .UseNpgsql(_fixture.AdminConnectionString)
            .Options);

    private async Task<Dictionary<string, HashSet<string>>> ReadSchemaAsync()
    {
        var schema = new Dictionary<string, HashSet<string>>(StringComparer.Ordinal);

        await using var connection = new NpgsqlConnection(_fixture.AdminConnectionString);
        await connection.OpenAsync();

        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT table_name, column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
            """;

        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var table = reader.GetString(0);
            if (!schema.TryGetValue(table, out var columns))
                schema[table] = columns = new HashSet<string>(StringComparer.Ordinal);
            columns.Add(reader.GetString(1));
        }

        return schema;
    }
}
