using Ardalis.Result;
using FluentAssertions;
using Moq;
using SpaceOS.Modules.CRM.Application.Handlers;
using SpaceOS.Modules.CRM.Application.Queries;
using SpaceOS.Modules.CRM.Domain.Aggregates;
using SpaceOS.Modules.CRM.Domain.Enums;
using SpaceOS.Modules.CRM.Domain.Repositories;
using Xunit;

namespace SpaceOS.Modules.CRM.Tests.Unit;

/// <summary>
/// Regression pins for SQL-backed list paging. A 50-row portal response must
/// not call the aggregate-wide tenant load used by task/activity workflows.
/// </summary>
public sealed class PagedListQueryHandlerTests
{
    [Fact]
    public async Task LeadList_UsesFilteredRepositoryPage_NotTenantWideAggregateLoad()
    {
        var repository = new Mock<ILeadRepository>(MockBehavior.Strict);
        var tenantId = Guid.NewGuid();
        var assignedTo = Guid.NewGuid();
        repository
            .Setup(r => r.GetPageAsync(
                tenantId, LeadStatus.Qualified, assignedTo, "kovács", 2, 25, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RepositoryPage<Lead>([], 73));

        var result = await new GetLeadsQueryHandler(repository.Object).Handle(new GetLeadsQuery
        {
            TenantId = tenantId,
            StatusFilter = "Qualified",
            AssignedToUserIdFilter = assignedTo,
            SearchText = "kovács",
            Page = 2,
            PageSize = 25
        }, CancellationToken.None);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Total.Should().Be(73);
        result.Value.Data.Should().BeEmpty();
        repository.VerifyAll();
        repository.Verify(r => r.GetByTenantAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task OpportunityList_UsesFilteredRepositoryPage_NotTenantWideAggregateLoad()
    {
        var repository = new Mock<IOpportunityRepository>(MockBehavior.Strict);
        var tenantId = Guid.NewGuid();
        var assignedTo = Guid.NewGuid();
        repository
            .Setup(r => r.GetPageAsync(
                tenantId, OpportunityStatus.Proposal, assignedTo, 3, 10, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RepositoryPage<Opportunity>([], 42));

        var result = await new GetOpportunitiesQueryHandler(repository.Object).Handle(new GetOpportunitiesQuery
        {
            TenantId = tenantId,
            StatusFilter = "Proposal",
            AssignedToUserIdFilter = assignedTo,
            Page = 3,
            PageSize = 10
        }, CancellationToken.None);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Total.Should().Be(42);
        result.Value.Data.Should().BeEmpty();
        repository.VerifyAll();
        repository.Verify(r => r.GetByTenantAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
