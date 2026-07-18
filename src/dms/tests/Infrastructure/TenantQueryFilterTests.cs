using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.DMS.Domain.Aggregates.Document;
using SpaceOS.Modules.DMS.Domain.Aggregates.DocumentCategory;
using SpaceOS.Modules.DMS.Domain.Aggregates.Tag;
using SpaceOS.Modules.DMS.Domain.Enums;
using SpaceOS.Modules.DMS.Infrastructure.Persistence;
using SpaceOS.Modules.Hosting.Tenancy;
using Xunit;

namespace SpaceOS.Modules.DMS.Tests.Infrastructure;

/// <summary>
/// ADR-062 second isolation layer: the tenant query filters on the DMS DbContext must
/// hide other tenants' rows even without PostgreSQL RLS (Docker-free InMemory
/// verification). Covers both tenant value-object shapes — the module-local
/// <c>Domain.ValueObjects.TenantId</c> record on Document and the kernel
/// <c>TenantId</c> struct on DocumentCategory/Tag.
/// </summary>
public class TenantQueryFilterTests
{
    private static readonly Guid TenantA = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid TenantB = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private static DbContextOptions<DMSDbContext> Options(string dbName) =>
        new DbContextOptionsBuilder<DMSDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;

    private static Document NewDocument(Guid tenantId, string name) =>
        Document.Create(
            new SpaceOS.Modules.DMS.Domain.ValueObjects.TenantId(tenantId),
            name: name,
            type: DocType.Rajz,
            linkType: DocLinkType.None,
            linkId: null,
            linkLabel: string.Empty,
            owner: "Kovács Péter",
            note: null,
            fileLabel: $"{Guid.NewGuid():N}.pdf",
            validUntil: null);

    private static async Task SeedBothTenantsAsync(string dbName)
    {
        await using var seedContext = new DMSDbContext(Options(dbName));

        seedContext.Documents.Add(NewDocument(TenantA, "Tenant A rajz"));
        seedContext.Documents.Add(NewDocument(TenantB, "Tenant B rajz"));

        seedContext.DocumentCategories.Add(DocumentCategory.Create(
            new DocumentCategoryId(Guid.NewGuid()),
            SpaceOS.Kernel.Domain.ValueObjects.TenantId.From(TenantA),
            "Tenant A kategória",
            null));
        seedContext.DocumentCategories.Add(DocumentCategory.Create(
            new DocumentCategoryId(Guid.NewGuid()),
            SpaceOS.Kernel.Domain.ValueObjects.TenantId.From(TenantB),
            "Tenant B kategória",
            null));

        seedContext.Tags.Add(Tag.Create(
            new TagId(Guid.NewGuid()),
            SpaceOS.Kernel.Domain.ValueObjects.TenantId.From(TenantA),
            "tenant-a-cimke"));
        seedContext.Tags.Add(Tag.Create(
            new TagId(Guid.NewGuid()),
            SpaceOS.Kernel.Domain.ValueObjects.TenantId.From(TenantB),
            "tenant-b-cimke"));

        await seedContext.SaveChangesAsync();
    }

    [Fact]
    public async Task Query_filter_hides_other_tenants_documents()
    {
        var dbName = Guid.NewGuid().ToString();
        await SeedBothTenantsAsync(dbName);

        await using var tenantScoped = new DMSDbContext(Options(dbName), new FixedTenantContext(TenantA));
        var visible = await tenantScoped.Documents.ToListAsync();

        visible.Should().ContainSingle()
            .Which.TenantId.Value.Should().Be(TenantA);
    }

    [Fact]
    public async Task Query_filter_hides_other_tenants_categories_and_tags()
    {
        var dbName = Guid.NewGuid().ToString();
        await SeedBothTenantsAsync(dbName);

        await using var tenantScoped = new DMSDbContext(Options(dbName), new FixedTenantContext(TenantA));

        var categories = await tenantScoped.DocumentCategories.ToListAsync();
        categories.Should().ContainSingle()
            .Which.TenantId.Value.Should().Be(TenantA);

        var tags = await tenantScoped.Tags.ToListAsync();
        tags.Should().ContainSingle()
            .Which.TenantId.Value.Should().Be(TenantA);
    }

    [Fact]
    public async Task Without_tenant_scope_the_filter_is_open_for_background_work()
    {
        var dbName = Guid.NewGuid().ToString();
        await SeedBothTenantsAsync(dbName);

        await using var unscoped = new DMSDbContext(Options(dbName));

        (await unscoped.Documents.CountAsync()).Should().Be(2);
        (await unscoped.DocumentCategories.CountAsync()).Should().Be(2);
        (await unscoped.Tags.CountAsync()).Should().Be(2);
    }
}
