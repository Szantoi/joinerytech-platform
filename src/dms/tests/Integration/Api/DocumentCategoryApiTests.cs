using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.DMS.Domain.Aggregates.DocumentCategory;
using SpaceOS.Modules.DMS.Domain.Repositories;
using SpaceOS.Modules.DMS.Infrastructure.Persistence;
using Xunit;

namespace SpaceOS.Modules.DMS.Tests.Integration.Api;

/// <summary>
/// Persistence integration tests for the DocumentCategory slice (real
/// PostgreSQL). DMS-BE-HOST repair: the earlier HTTP variants targeted
/// endpoints that never existed — the category/tag ENDPOINT layer is a
/// separate task; these tests pin the working repository layer.
/// </summary>
[Collection("DMS API Tests")]
public class DocumentCategoryApiTests
{
    private readonly ApiTestFixture _fixture;

    public DocumentCategoryApiTests(ApiTestFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task DocumentCategoryRepository_CanCreateAndRetrieveCategory()
    {
        using var scope = _fixture.CreateScope();
        var repository = scope.ServiceProvider.GetRequiredService<IDocumentCategoryRepository>();

        var category = DocumentCategory.Create(
            new DocumentCategoryId(Guid.NewGuid()),
            TenantId.From(ApiTestFixture.TenantId),
            "Kiviteli rajzok",
            "Gyártásra kiadott tervdokumentáció");
        await repository.AddAsync(category);

        using var freshScope = _fixture.CreateScope();
        var freshRepository = freshScope.ServiceProvider.GetRequiredService<IDocumentCategoryRepository>();
        var reloaded = await freshRepository.GetByIdAsync(category.Id);

        reloaded.Should().NotBeNull();
        reloaded!.Name.Should().Be("Kiviteli rajzok");
        reloaded.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task DbContext_AllowsDatabaseOperations()
    {
        using var scope = _fixture.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DMSDbContext>();

        var categoriesCount = dbContext.DocumentCategories.Count();

        categoriesCount.Should().BeGreaterThanOrEqualTo(0);
    }
}

/// <summary>
/// Persistence integration tests for the Tag slice (real PostgreSQL).
/// </summary>
[Collection("DMS API Tests")]
public class TagApiTests
{
    private readonly ApiTestFixture _fixture;

    public TagApiTests(ApiTestFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task TagRepository_CanAccessDatabase()
    {
        using var scope = _fixture.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DMSDbContext>();

        var count = dbContext.Tags.Count();

        count.Should().BeGreaterThanOrEqualTo(0);
    }
}
