using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Ardalis.Result;
using FluentAssertions;
using MediatR;
using Moq;
using SpaceOS.Modules.CRM.Api.Endpoints;
using SpaceOS.Modules.CRM.Application.Commands;
using SpaceOS.Modules.CRM.Application.Queries;
using SpaceOS.Modules.CRM.Domain.Enums;
using Xunit;

namespace SpaceOS.Modules.CRM.Tests.Api;

/// <summary>
/// REST-layer contract tests for OpportunityEndpoints (TestServer + mocked IMediator).
/// Mirror: portal <c>modules/crm/mocks/handlers.opps.ts</c> — the OPP_FSM route
/// segments (start-discovery / start-proposal / send-quote / negotiate / win / lose),
/// PUT + fresh DTO (200), and the 400/404/409 contract.
/// </summary>
public class OpportunityEndpointsTests
{
    private static readonly Guid OppId = Guid.Parse("44444444-4444-4444-4444-444444444444");
    private static readonly Guid ActorId = Guid.Parse("33333333-3333-3333-3333-333333333333");

    private static OpportunityDto SampleOpp(OpportunityStatus status = OpportunityStatus.Open) => new()
    {
        Id = OppId,
        TenantId = CrmEndpointTestHost.TenantId,
        Status = status.ToString(),
        CustomerId = Guid.NewGuid(),
        ContactName = "Nagy Anna",
        Email = "nagy.anna@example.hu",
        Title = "Irodabútor beépítés",
        EstimatedValue = 4_500_000m,
        Currency = "HUF",
        Probability = 10m,
        AssignedToUserId = ActorId,
        CreatedAt = DateTimeOffset.UtcNow
    };

    private static Task<CrmEndpointTestHost> StartHostAsync(IMediator mediator)
        => CrmEndpointTestHost.StartAsync(mediator, endpoints => endpoints.MapOpportunityEndpoints());

    private static Mock<IMediator> MediatorReturning(OpportunityStatus status)
    {
        var mediator = new Mock<IMediator>();
        var dto = Result<OpportunityDto>.Success(SampleOpp(status));

        mediator.Setup(m => m.Send(It.IsAny<StartNeedsAssessmentCommand>(), It.IsAny<CancellationToken>())).ReturnsAsync(dto);
        mediator.Setup(m => m.Send(It.IsAny<StartSolutionAssemblyCommand>(), It.IsAny<CancellationToken>())).ReturnsAsync(dto);
        mediator.Setup(m => m.Send(It.IsAny<SendProposalCommand>(), It.IsAny<CancellationToken>())).ReturnsAsync(dto);
        mediator.Setup(m => m.Send(It.IsAny<StartNegotiationCommand>(), It.IsAny<CancellationToken>())).ReturnsAsync(dto);
        mediator.Setup(m => m.Send(It.IsAny<WinOpportunityCommand>(), It.IsAny<CancellationToken>())).ReturnsAsync(dto);
        mediator.Setup(m => m.Send(It.IsAny<LoseOpportunityCommand>(), It.IsAny<CancellationToken>())).ReturnsAsync(dto);

        return mediator;
    }

    // ══════════ FSM route set (the portal's segments) ══════════

    [Theory]
    [InlineData("start-discovery", OpportunityStatus.NeedsAssessment)]
    [InlineData("start-proposal", OpportunityStatus.SolutionAssembly)]
    [InlineData("send-quote", OpportunityStatus.Proposal)]
    [InlineData("negotiate", OpportunityStatus.Negotiation)]
    [InlineData("win", OpportunityStatus.Won)]
    public async Task StageTransition_Success_Returns200WithFreshDto(string segment, OpportunityStatus expected)
    {
        var mediator = MediatorReturning(expected);

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PutAsJsonAsync(
            $"/api/crm/opportunities/{OppId}/{segment}", new { note = (string?)null, actedBy = ActorId });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("status").GetString().Should().Be(expected.ToString());
    }

    [Fact]
    public async Task StageSkip_Returns409()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<SendProposalCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<OpportunityDto>.Conflict("Cannot transition opportunity from Open to Proposal"));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PutAsJsonAsync(
            $"/api/crm/opportunities/{OppId}/send-quote", new { note = (string?)null, actedBy = ActorId });

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("error").GetString().Should().Be("Conflict");
    }

    [Fact]
    public async Task Win_PassesOptionalOrderIdAndFinalValue()
    {
        WinOpportunityCommand? captured = null;
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<WinOpportunityCommand>(), It.IsAny<CancellationToken>()))
            .Callback((IRequest<Result<OpportunityDto>> c, CancellationToken _) => captured = (WinOpportunityCommand)c)
            .ReturnsAsync(Result<OpportunityDto>.Success(SampleOpp(OpportunityStatus.Won)));

        var orderId = Guid.NewGuid();
        await using var host = await StartHostAsync(mediator.Object);
        await host.Client.PutAsJsonAsync($"/api/crm/opportunities/{OppId}/win", new
        {
            orderId,
            finalValue = 4_200_000m,
            actedBy = ActorId
        });

        captured.Should().NotBeNull();
        captured!.OrderId.Should().Be(orderId);
        captured.FinalValue.Should().Be(4_200_000m);
        captured.WonBy.Should().Be(ActorId);
    }

    [Fact]
    public async Task Win_WithoutOrderId_StillAccepted_SalesHandoffIsOptional()
    {
        // The portal sends only a note: the order lives in the Sales module
        // (CRM-BE-HOST follow-up #2) — the endpoint must not 400 on its absence.
        var mediator = MediatorReturning(OpportunityStatus.Won);

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PutAsJsonAsync(
            $"/api/crm/opportunities/{OppId}/win", new { note = "Szerződés aláírva", actedBy = ActorId });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ══════════ Lose ══════════

    [Fact]
    public async Task Lose_WithoutReason_Returns400_WithoutCallingMediator()
    {
        var mediator = new Mock<IMediator>();
        await using var host = await StartHostAsync(mediator.Object);

        var response = await host.Client.PutAsJsonAsync(
            $"/api/crm/opportunities/{OppId}/lose", new { reason = "", actedBy = ActorId });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        mediator.Verify(m => m.Send(It.IsAny<LoseOpportunityCommand>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Lose_WithReason_Returns200AndPassesCompetitor()
    {
        LoseOpportunityCommand? captured = null;
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<LoseOpportunityCommand>(), It.IsAny<CancellationToken>()))
            .Callback((IRequest<Result<OpportunityDto>> c, CancellationToken _) => captured = (LoseOpportunityCommand)c)
            .ReturnsAsync(Result<OpportunityDto>.Success(SampleOpp(OpportunityStatus.Lost)));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PutAsJsonAsync($"/api/crm/opportunities/{OppId}/lose", new
        {
            reason = "Konkurencia olcsóbb volt",
            competitorName = "Rivális Kft.",
            actedBy = ActorId
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured!.Reason.Should().Be("Konkurencia olcsóbb volt");
        captured.CompetitorName.Should().Be("Rivális Kft.");
    }

    // ══════════ List + detail ══════════

    [Fact]
    public async Task ListOpportunities_OpenFilter_KeepsOnlyNonTerminalStages()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<GetOpportunitiesQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<PaginatedResponse<OpportunityDto>>.Success(new PaginatedResponse<OpportunityDto>
            {
                Data =
                [
                    SampleOpp(OpportunityStatus.Negotiation),
                    SampleOpp(OpportunityStatus.Won),
                    SampleOpp(OpportunityStatus.Lost)
                ]
            }));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.GetAsync("/api/crm/opportunities?open=true");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetArrayLength().Should().Be(1);
        body.RootElement[0].GetProperty("status").GetString().Should().Be("Negotiation");
    }

    [Fact]
    public async Task ListOpportunities_InvalidStatusFilter_Returns400()
    {
        await using var host = await StartHostAsync(new Mock<IMediator>().Object);

        var response = await host.Client.GetAsync("/api/crm/opportunities?status=nemletezik");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetOpportunity_NotFound_Returns404()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<GetOpportunityByIdQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<OpportunityDto>.NotFound("Opportunity not found"));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.GetAsync($"/api/crm/opportunities/{OppId}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task QuoteStubRoute_IsNotImplemented_Returns404()
    {
        // POST /opportunities/{id}/quote (portal oppCreateQuote handoff) is a
        // deliberate gap — generating a quote reaches into the Sales module.
        // Documented as an ADR candidate rather than invented here.
        await using var host = await StartHostAsync(new Mock<IMediator>().Object);

        var response = await host.Client.PostAsync($"/api/crm/opportunities/{OppId}/quote", null);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
