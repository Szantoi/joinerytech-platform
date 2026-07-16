using Ardalis.Result;
using FluentAssertions;
using MediatR;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using SpaceOS.Modules.CRM.Application;
using SpaceOS.Modules.CRM.Application.Commands;
using SpaceOS.Modules.CRM.Application.Handlers;
using SpaceOS.Modules.CRM.Application.Queries;
using SpaceOS.Modules.CRM.Domain.Aggregates;
using SpaceOS.Modules.CRM.Domain.Enums;
using SpaceOS.Modules.CRM.Domain.ValueObjects;
using Xunit;

namespace SpaceOS.Modules.CRM.Tests.Unit;

/// <summary>
/// Handler tests for the cross-entity views (tasks, activity feed, forecast) on
/// in-memory repositories — real aggregates, no database, no Docker.
///
/// These cover what the mocked-IMediator endpoint tests cannot: the actual
/// aggregation across BOTH aggregates, the computed SLA, and the config-driven
/// thresholds.
/// </summary>
public class CrossEntityQueryHandlerTests
{
    private static readonly Guid TenantId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid UserId = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly DateTimeOffset Now = new(2026, 7, 16, 10, 0, 0, TimeSpan.Zero);

    private static readonly TimeProvider Clock = new FakeTimeProvider(Now);

    private static IOptions<CrmOptions> Options(int slaSoonDays = 2, int recentLimit = 8)
        => Microsoft.Extensions.Options.Options.Create(new CrmOptions
        {
            Tasks = new CrmTaskOptions { SlaSoonDays = slaSoonDays },
            Activities = new CrmActivityOptions { RecentLimit = recentLimit }
        });

    private static Lead NewLead(string name = "Kovács Béla")
    {
        var contact = ContactInfo.Create(name, "kovacs.bela@example.hu", "+36301234567", "Faipar Kft.");
        return Lead.Create(TenantId, contact, LeadSource.Referral, UserId, UserId).Value;
    }

    private static Opportunity NewOpportunity(string title = "Irodabútor", decimal value = 1_000_000m)
        => Opportunity.CreateDirect(
            TenantId,
            Guid.NewGuid(),
            ContactInfo.Create("Nagy Anna", "nagy.anna@example.hu", null, "Bútor Zrt."),
            title,
            Money.Create(value),
            Now.AddDays(45),
            UserId,
            UserId).Value;

    // ══════════ Tasks ══════════

    [Fact]
    public async Task GetCrmTasks_MergesBothAggregates_AndComputesSla()
    {
        var lead = NewLead();
        lead.CreateTask("Visszahívás", Now.AddDays(10), "magas", UserId);

        var opp = NewOpportunity();
        opp.CreateTask("Ajánlat véglegesítése", Now.AddDays(1), "kozepes", UserId);

        var handler = new GetCrmTasksQueryHandler(
            new InMemoryLeadRepository().Seed(lead),
            new InMemoryOpportunityRepository().Seed(opp),
            Options(),
            Clock);

        var result = await handler.Handle(new GetCrmTasksQuery { TenantId = TenantId }, default);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().HaveCount(2);

        // Earliest deadline first — the opportunity task is due sooner.
        result.Value[0].RefType.Should().Be(CrmRefType.Opportunity);
        result.Value[0].Sla.Should().Be(TaskSla.Soon);
        result.Value[0].RefTitle.Should().Be("Irodabútor");

        result.Value[1].RefType.Should().Be(CrmRefType.Lead);
        result.Value[1].Sla.Should().Be(TaskSla.Ok);
        result.Value[1].RefTitle.Should().Be("Kovács Béla");
    }

    [Fact]
    public async Task GetCrmTasks_SlaWindowIsConfigDriven()
    {
        var lead = NewLead();
        lead.CreateTask("Visszahívás", Now.AddDays(5), "magas", UserId);

        var repo = new InMemoryLeadRepository().Seed(lead);

        var withDefaultWindow = new GetCrmTasksQueryHandler(
            repo, new InMemoryOpportunityRepository(), Options(slaSoonDays: 2), Clock);
        var withWideWindow = new GetCrmTasksQueryHandler(
            repo, new InMemoryOpportunityRepository(), Options(slaSoonDays: 7), Clock);

        var defaultResult = await withDefaultWindow.Handle(new GetCrmTasksQuery { TenantId = TenantId }, default);
        var wideResult = await withWideWindow.Handle(new GetCrmTasksQuery { TenantId = TenantId }, default);

        defaultResult.Value[0].Sla.Should().Be(TaskSla.Ok);
        wideResult.Value[0].Sla.Should().Be(TaskSla.Soon, "a wider window pulls the task into 'soon'");
    }

    [Fact]
    public async Task GetCrmTasks_DoneFilter_Applies()
    {
        var lead = NewLead();
        lead.CreateTask("Nyitott", Now.AddDays(3), "magas", UserId);
        lead.CreateTask("Kész", Now.AddDays(4), "alacsony", UserId);
        lead.CompleteTask(lead.Tasks.Last().Id, UserId);

        var handler = new GetCrmTasksQueryHandler(
            new InMemoryLeadRepository().Seed(lead), new InMemoryOpportunityRepository(), Options(), Clock);

        var open = await handler.Handle(new GetCrmTasksQuery { TenantId = TenantId, Done = false }, default);
        var done = await handler.Handle(new GetCrmTasksQuery { TenantId = TenantId, Done = true }, default);
        var all = await handler.Handle(new GetCrmTasksQuery { TenantId = TenantId }, default);

        open.Value.Should().ContainSingle().Which.Title.Should().Be("Nyitott");
        done.Value.Should().ContainSingle().Which.Title.Should().Be("Kész");
        all.Value.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetCrmTasks_IsTenantScoped()
    {
        var lead = NewLead();
        lead.CreateTask("Visszahívás", Now.AddDays(3), "magas", UserId);

        var handler = new GetCrmTasksQueryHandler(
            new InMemoryLeadRepository().Seed(lead), new InMemoryOpportunityRepository(), Options(), Clock);

        var otherTenant = await handler.Handle(new GetCrmTasksQuery { TenantId = Guid.NewGuid() }, default);

        otherTenant.Value.Should().BeEmpty();
    }

    // ══════════ Complete task (by id, parent resolved by the handler) ══════════

    [Fact]
    public async Task CompleteCrmTask_ResolvesOwningLead()
    {
        var lead = NewLead();
        lead.CreateTask("Visszahívás", Now.AddDays(3), "magas", UserId);
        var taskId = lead.Tasks[0].Id;

        var handler = new CompleteCrmTaskHandler(
            new InMemoryLeadRepository().Seed(lead),
            new InMemoryOpportunityRepository(),
            Mock.Of<IPublisher>(),
            Options(),
            Clock,
            NullLogger<CompleteCrmTaskHandler>.Instance);

        var result = await handler.Handle(
            new CompleteCrmTaskCommand { TenantId = TenantId, TaskId = taskId, CompletedBy = UserId }, default);

        result.IsSuccess.Should().BeTrue();
        result.Value.IsCompleted.Should().BeTrue();
        result.Value.RefType.Should().Be(CrmRefType.Lead);
        lead.Tasks[0].IsCompleted.Should().BeTrue();
    }

    [Fact]
    public async Task CompleteCrmTask_ResolvesOwningOpportunity()
    {
        var opp = NewOpportunity();
        opp.CreateTask("Ajánlat", Now.AddDays(3), "magas", UserId);
        var taskId = opp.Tasks[0].Id;

        var handler = new CompleteCrmTaskHandler(
            new InMemoryLeadRepository(),
            new InMemoryOpportunityRepository().Seed(opp),
            Mock.Of<IPublisher>(),
            Options(),
            Clock,
            NullLogger<CompleteCrmTaskHandler>.Instance);

        var result = await handler.Handle(
            new CompleteCrmTaskCommand { TenantId = TenantId, TaskId = taskId, CompletedBy = UserId }, default);

        result.IsSuccess.Should().BeTrue();
        result.Value.RefType.Should().Be(CrmRefType.Opportunity);
        opp.Tasks[0].IsCompleted.Should().BeTrue();
    }

    [Fact]
    public async Task CompleteCrmTask_UnknownId_ReturnsNotFound()
    {
        var handler = new CompleteCrmTaskHandler(
            new InMemoryLeadRepository().Seed(NewLead()),
            new InMemoryOpportunityRepository(),
            Mock.Of<IPublisher>(),
            Options(),
            Clock,
            NullLogger<CompleteCrmTaskHandler>.Instance);

        var result = await handler.Handle(
            new CompleteCrmTaskCommand { TenantId = TenantId, TaskId = Guid.NewGuid(), CompletedBy = UserId }, default);

        result.Status.Should().Be(ResultStatus.NotFound);
    }

    // ══════════ Recent activities ══════════

    [Fact]
    public async Task GetRecentActivities_MergesAndOrdersNewestFirst_RespectingLimit()
    {
        var lead = NewLead();
        lead.LogActivity("Call", "Első hívás", UserId);

        var opp = NewOpportunity();
        opp.LogActivity("Meeting", "Helyszíni felmérés", UserId);
        opp.LogActivity("Email", "Ajánlat kiküldve", UserId);

        var handler = new GetRecentActivitiesQueryHandler(
            new InMemoryLeadRepository().Seed(lead),
            new InMemoryOpportunityRepository().Seed(opp),
            Options());

        var all = await handler.Handle(new GetRecentActivitiesQuery { TenantId = TenantId }, default);
        var limited = await handler.Handle(new GetRecentActivitiesQuery { TenantId = TenantId, Limit = 2 }, default);

        all.Value.Should().HaveCount(3);
        all.Value.Should().BeInDescendingOrder(a => a.CreatedAt);
        all.Value.Select(a => a.RefType).Should().Contain(CrmRefType.Lead)
            .And.Contain(CrmRefType.Opportunity);

        limited.Value.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetRecentActivities_DefaultLimit_ComesFromConfig()
    {
        var lead = NewLead();
        for (var i = 0; i < 5; i++)
        {
            lead.LogActivity("Note", $"Bejegyzés {i}", UserId);
        }

        var handler = new GetRecentActivitiesQueryHandler(
            new InMemoryLeadRepository().Seed(lead),
            new InMemoryOpportunityRepository(),
            Options(recentLimit: 3));

        var result = await handler.Handle(new GetRecentActivitiesQuery { TenantId = TenantId }, default);

        result.Value.Should().HaveCount(3, "the configured RecentLimit caps the feed");
    }

    [Fact]
    public async Task GetRecentActivities_NonPositiveLimit_ReturnsInvalid()
    {
        var handler = new GetRecentActivitiesQueryHandler(
            new InMemoryLeadRepository(), new InMemoryOpportunityRepository(), Options());

        var result = await handler.Handle(new GetRecentActivitiesQuery { TenantId = TenantId, Limit = 0 }, default);

        result.Status.Should().Be(ResultStatus.Invalid);
    }

    // ══════════ Forecast ══════════

    [Fact]
    public async Task Forecast_WeightsByConfiguredStageProbability()
    {
        // Negotiation @ 80% → 1 000 000 * 0.80 = 800 000
        var negotiating = NewOpportunity("Tárgyalás alatt", 1_000_000m);
        negotiating.StartNeedsAssessment(UserId);
        negotiating.StartSolutionAssembly(UserId);
        negotiating.SendProposal(Guid.NewGuid(), UserId);
        negotiating.StartNegotiation(UserId);

        // Open @ 10% → 500 000 * 0.10 = 50 000
        var open = NewOpportunity("Új lehetőség", 500_000m);

        var handler = new GetPipelineForecastQueryHandler(
            new InMemoryOpportunityRepository().Seed(negotiating, open),
            Options(),
            Clock);

        var result = await handler.Handle(new GetPipelineForecastQuery { TenantId = TenantId }, default);

        result.IsSuccess.Should().BeTrue();
        result.Value.WeightedTotalValue.Should().Be(850_000m);
        result.Value.Currency.Should().Be("HUF");

        // Main-chain order: Open before Negotiation.
        result.Value.Stages[0].Status.Should().Be(nameof(OpportunityStatus.Open));
        result.Value.Stages[0].WeightedValue.Should().Be(50_000m);
        result.Value.Stages[1].Status.Should().Be(nameof(OpportunityStatus.Negotiation));
        result.Value.Stages[1].WeightedValue.Should().Be(800_000m);
    }

    [Fact]
    public async Task Forecast_ConfigOverride_ChangesWeighting()
    {
        var open = NewOpportunity("Új lehetőség", 1_000_000m);

        var options = Microsoft.Extensions.Options.Options.Create(new CrmOptions
        {
            Forecast = new CrmForecastOptions
            {
                StageProbability = new Dictionary<OpportunityStatus, decimal>
                {
                    [OpportunityStatus.Open] = 50m
                }
            }
        });

        var handler = new GetPipelineForecastQueryHandler(
            new InMemoryOpportunityRepository().Seed(open), options, Clock);

        var result = await handler.Handle(new GetPipelineForecastQuery { TenantId = TenantId }, default);

        result.Value.WeightedTotalValue.Should().Be(500_000m, "the configured 50% overrides the 10% default");
    }

    [Fact]
    public async Task Forecast_EmptyPipeline_ReturnsZeroAndDefaultCurrency()
    {
        var handler = new GetPipelineForecastQueryHandler(
            new InMemoryOpportunityRepository(), Options(), Clock);

        var result = await handler.Handle(new GetPipelineForecastQuery { TenantId = TenantId }, default);

        result.IsSuccess.Should().BeTrue();
        result.Value.Stages.Should().BeEmpty();
        result.Value.WeightedTotalValue.Should().Be(0m);
        result.Value.Currency.Should().Be("HUF");
    }
}

/// <summary>Fixed clock for the SLA / forecast handlers.</summary>
internal sealed class FakeTimeProvider : TimeProvider
{
    private readonly DateTimeOffset _now;

    public FakeTimeProvider(DateTimeOffset now) => _now = now;

    public override DateTimeOffset GetUtcNow() => _now;
}
