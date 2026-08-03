using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Hosting.RlsFixtures;
using SpaceOS.Modules.Hosting.Tenancy;
using SpaceOS.Projects.Application.Projects;
using SpaceOS.Projects.Application.Tenancy;
using SpaceOS.Projects.Infrastructure.Data;
using SpaceOS.Projects.Infrastructure.Tenancy;
using Xunit;

namespace SpaceOS.Projects.IntegrationTests;

/// <summary>
/// The <c>PRJ-2026-001</c> allocator (ADR-072 §7.3 — Gábor, 2026-08-03).
/// </summary>
/// <remarks>
/// Measured against a real database rather than a fake, because the property that matters — two
/// concurrent creates never get the same number — lives entirely in the <c>ON CONFLICT DO UPDATE
/// … RETURNING</c> statement. An in-memory double would model the increment I intended, not the
/// one PostgreSQL performs.
/// </remarks>
public sealed class ProjectCodeAllocatorTests : IAsyncLifetime
{
    private sealed class FixedTenantContext(Guid tenantId) : ITenantContext
    {
        public bool HasTenant => true;
        public Guid TenantId => tenantId;
    }

    private sealed class FixedClock(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }

    private readonly NonSuperuserRlsFixture _fixture = new("projects_code_allocator");
    private static readonly Guid TenantA = Guid.NewGuid();
    private static readonly Guid TenantB = Guid.NewGuid();
    private static readonly DateTimeOffset In2026 = new(2026, 8, 3, 12, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset In2027 = new(2027, 1, 2, 12, 0, 0, TimeSpan.Zero);

    public async Task InitializeAsync()
    {
        try
        {
            await _fixture.StartAsync();

            await using var context = new ProjectsDbContext(Options());
            await context.Database.MigrateAsync();
        }
        catch
        {
            await _fixture.DisposeAsync();
            throw;
        }
    }

    public async Task DisposeAsync() => await _fixture.DisposeAsync();

    private DbContextOptions<ProjectsDbContext> Options() =>
        new DbContextOptionsBuilder<ProjectsDbContext>()
            .UseNpgsql(_fixture.AdminConnectionString)
            .Options;

    private IProjectCodeAllocator CreateAllocator(
        Guid tenantId, DateTimeOffset now, out ProjectsDbContext context)
    {
        context = new ProjectsDbContext(Options(), new FixedTenantContext(tenantId));

        return new SequentialProjectCodeAllocator(
            context,
            new TenantContextCurrentTenant(new FixedTenantContext(tenantId)),
            new FixedClock(now));
    }

    [Fact]
    public async Task The_first_code_of_a_year_is_the_decided_shape()
    {
        var allocator = CreateAllocator(TenantA, In2026, out var context);
        await using (context)
        {
            var code = await allocator.AllocateAsync();

            Assert.Equal("PRJ-2026-001", code.Value);
        }
    }

    [Fact]
    public async Task Codes_run_in_sequence_within_a_tenant_and_year()
    {
        var allocator = CreateAllocator(TenantB, In2026, out var context);
        await using (context)
        {
            var first = await allocator.AllocateAsync();
            var second = await allocator.AllocateAsync();
            var third = await allocator.AllocateAsync();

            Assert.Equal("PRJ-2026-001", first.Value);
            Assert.Equal("PRJ-2026-002", second.Value);
            Assert.Equal("PRJ-2026-003", third.Value);
        }
    }

    [Fact]
    public async Task Each_tenant_has_its_own_counter()
    {
        var tenantOne = Guid.NewGuid();
        var tenantTwo = Guid.NewGuid();

        var first = CreateAllocator(tenantOne, In2026, out var contextOne);
        await using (contextOne)
        {
            await first.AllocateAsync();
            await first.AllocateAsync();
        }

        var second = CreateAllocator(tenantTwo, In2026, out var contextTwo);
        await using (contextTwo)
        {
            // Not 003: a tenant's numbering must not reveal how much another one is doing.
            Assert.Equal("PRJ-2026-001", (await second.AllocateAsync()).Value);
        }
    }

    [Fact]
    public async Task The_sequence_restarts_at_the_turn_of_the_year()
    {
        var tenantId = Guid.NewGuid();

        var inOldYear = CreateAllocator(tenantId, In2026, out var oldContext);
        await using (oldContext)
        {
            await inOldYear.AllocateAsync();
            await inOldYear.AllocateAsync();
        }

        var inNewYear = CreateAllocator(tenantId, In2027, out var newContext);
        await using (newContext)
        {
            Assert.Equal("PRJ-2027-001", (await inNewYear.AllocateAsync()).Value);
        }
    }

    [Fact]
    public async Task Twenty_concurrent_allocations_produce_twenty_distinct_codes()
    {
        // The reason the counter is a table and not max(code) + 1. Read-then-write would hand the
        // same number to several of these, and the failure would surface as a unique-index
        // violation on an ordinary create — rare enough to be blamed on anything.
        var tenantId = Guid.NewGuid();

        var codes = await Task.WhenAll(Enumerable.Range(0, 20).Select(async _ =>
        {
            var allocator = CreateAllocator(tenantId, In2026, out var context);
            await using (context)
            {
                return (await allocator.AllocateAsync()).Value;
            }
        }));

        Assert.Equal(20, codes.Distinct(StringComparer.Ordinal).Count());
        Assert.Equal("PRJ-2026-020", codes.OrderBy(code => code, StringComparer.Ordinal).Last());
    }

    [Fact]
    public async Task Past_nine_hundred_and_ninety_nine_the_sequence_grows_instead_of_wrapping()
    {
        // The padding is a minimum width, not a ceiling. A tenant that opens its 1000th project of
        // the year gets PRJ-2026-1000 rather than a duplicate of its first.
        var tenantId = Guid.NewGuid();
        await using (var seed = new ProjectsDbContext(Options()))
        {
            await seed.Database.ExecuteSqlRawAsync(
                $$"""
                INSERT INTO {{ProjectsDbContext.SchemaName}}."project_code_counters"
                    ("TenantId", "Year", "LastValue")
                VALUES ({0}, 2026, 999)
                """,
                tenantId);
        }

        var allocator = CreateAllocator(tenantId, In2026, out var context);
        await using (context)
        {
            Assert.Equal("PRJ-2026-1000", (await allocator.AllocateAsync()).Value);
        }
    }
}
