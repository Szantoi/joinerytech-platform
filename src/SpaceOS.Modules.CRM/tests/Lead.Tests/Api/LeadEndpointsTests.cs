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
/// REST-layer contract tests for LeadEndpoints (TestServer + mocked IMediator):
/// route set, request parsing, and the module error contract
/// (200 fresh DTO / 201 created / 400 payload guard / 404 / 409 illegal FSM transition).
///
/// Mirror: portal <c>modules/crm/mocks/handlers.leads.ts</c>.
/// </summary>
public class LeadEndpointsTests
{
    private static readonly Guid LeadId = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly Guid ActorId = Guid.Parse("33333333-3333-3333-3333-333333333333");

    private static LeadDto SampleLead(LeadStatus status = LeadStatus.New, Guid? opportunityRef = null) => new()
    {
        Id = LeadId,
        TenantId = CrmEndpointTestHost.TenantId,
        Status = status.ToString(),
        ContactName = "Kovács Béla",
        Email = "kovacs.bela@example.hu",
        Phone = "+36301234567",
        Company = "Faipar Kft.",
        Source = LeadSource.Referral.ToString(),
        AssignedToUserId = ActorId,
        OpportunityRef = opportunityRef,
        CreatedAt = DateTimeOffset.UtcNow
    };

    private static Task<CrmEndpointTestHost> StartHostAsync(IMediator mediator)
        => CrmEndpointTestHost.StartAsync(mediator, endpoints => endpoints.MapLeadEndpoints());

    // ══════════ List + detail ══════════

    [Fact]
    public async Task ListLeads_ReturnsOkWithDtoArray_EnumsAsStrings()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<GetLeadsQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<PaginatedResponse<LeadDto>>.Success(new PaginatedResponse<LeadDto>
            {
                Data = [SampleLead(LeadStatus.Nurturing)],
                Total = 1
            }));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.GetAsync("/api/crm/leads");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetArrayLength().Should().Be(1);
        body.RootElement[0].GetProperty("status").GetString().Should().Be("Nurturing");
    }

    [Fact]
    public async Task ListLeads_PassesFiltersToQuery()
    {
        GetLeadsQuery? captured = null;
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<GetLeadsQuery>(), It.IsAny<CancellationToken>()))
            .Callback((IRequest<Result<PaginatedResponse<LeadDto>>> q, CancellationToken _) =>
                captured = (GetLeadsQuery)q)
            .ReturnsAsync(Result<PaginatedResponse<LeadDto>>.Success(new PaginatedResponse<LeadDto>()));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.GetAsync("/api/crm/leads?status=Nurturing&q=kovács");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        captured.Should().NotBeNull();
        captured!.TenantId.Should().Be(CrmEndpointTestHost.TenantId);
        captured.StatusFilter.Should().Be("Nurturing");
        captured.SearchText.Should().Be("kovács");
    }

    [Fact]
    public async Task ListLeads_InvalidStatusFilter_Returns400()
    {
        await using var host = await StartHostAsync(new Mock<IMediator>().Object);

        var response = await host.Client.GetAsync("/api/crm/leads?status=nemletezik");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetLead_NotFound_Returns404()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<GetLeadByIdQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<LeadDto>.NotFound("Lead not found"));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.GetAsync($"/api/crm/leads/{LeadId}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ══════════ Nurture — the branch this task added ══════════

    [Fact]
    public async Task NurtureLead_Success_Returns200WithFreshDto()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<NurtureLeadCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<LeadDto>.Success(SampleLead(LeadStatus.Nurturing)));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PutAsJsonAsync(
            $"/api/crm/leads/{LeadId}/nurture", new { note = "Q4-ben újranézzük", actedBy = ActorId });

        // The portal reconciles its optimistic update from this body — 200 + DTO, not 204.
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("status").GetString().Should().Be("Nurturing");
    }

    [Fact]
    public async Task NurtureLead_PassesNoteAndActorToCommand()
    {
        NurtureLeadCommand? captured = null;
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<NurtureLeadCommand>(), It.IsAny<CancellationToken>()))
            .Callback((IRequest<Result<LeadDto>> c, CancellationToken _) => captured = (NurtureLeadCommand)c)
            .ReturnsAsync(Result<LeadDto>.Success(SampleLead(LeadStatus.Nurturing)));

        await using var host = await StartHostAsync(mediator.Object);
        await host.Client.PutAsJsonAsync(
            $"/api/crm/leads/{LeadId}/nurture", new { note = "Parkolópálya", actedBy = ActorId });

        captured.Should().NotBeNull();
        captured!.LeadId.Should().Be(LeadId);
        captured.TenantId.Should().Be(CrmEndpointTestHost.TenantId);
        captured.Notes.Should().Be("Parkolópálya");
        captured.ActedBy.Should().Be(ActorId);
    }

    [Fact]
    public async Task NurtureLead_IllegalTransition_Returns409WithGuardMessage()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<NurtureLeadCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<LeadDto>.Conflict("Cannot transition lead from New to Nurturing"));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PutAsJsonAsync(
            $"/api/crm/leads/{LeadId}/nurture", new { note = (string?)null, actedBy = ActorId });

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("error").GetString().Should().Be("Conflict");
        body.RootElement.GetProperty("message").GetString().Should().Contain("Nurturing");
    }

    // ══════════ Other transitions ══════════

    [Theory]
    [InlineData("contact")]
    [InlineData("qualify")]
    public async Task SimpleTransitions_Success_Return200(string action)
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<ContactLeadCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<LeadDto>.Success(SampleLead(LeadStatus.Contacted)));
        mediator
            .Setup(m => m.Send(It.IsAny<QualifyLeadCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<LeadDto>.Success(SampleLead(LeadStatus.Qualified)));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PutAsJsonAsync(
            $"/api/crm/leads/{LeadId}/{action}", new { note = (string?)null, actedBy = ActorId });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task DiscardLead_WithoutReason_Returns400_WithoutCallingMediator()
    {
        var mediator = new Mock<IMediator>();
        await using var host = await StartHostAsync(mediator.Object);

        var response = await host.Client.PutAsJsonAsync(
            $"/api/crm/leads/{LeadId}/discard", new { reason = "   ", actedBy = ActorId });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        mediator.Verify(m => m.Send(It.IsAny<DisqualifyLeadCommand>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task DiscardLead_WithReason_Returns200()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<DisqualifyLeadCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<LeadDto>.Success(SampleLead(LeadStatus.Disqualified)));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PutAsJsonAsync(
            $"/api/crm/leads/{LeadId}/discard", new { reason = "Nincs büdzsé", actedBy = ActorId });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task DiscardLead_TerminalStatus_Returns409()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<DisqualifyLeadCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<LeadDto>.Conflict("Cannot transition lead from Opportunity to Disqualified"));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PutAsJsonAsync(
            $"/api/crm/leads/{LeadId}/discard", new { reason = "Túl késő", actedBy = ActorId });

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    // ══════════ Convert ══════════

    [Fact]
    public async Task ConvertLead_Success_Returns201WithLeadAndOpportunityId()
    {
        var opportunityId = Guid.NewGuid();
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<ConvertToOpportunityCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<LeadDto>.Success(SampleLead(LeadStatus.Opportunity, opportunityId)));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PostAsJsonAsync($"/api/crm/leads/{LeadId}/convert", new
        {
            customerId = Guid.NewGuid(),
            title = "Konyhabútor",
            estimatedValue = 3_500_000m,
            convertedBy = ActorId
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("opportunityId").GetGuid().Should().Be(opportunityId);
        body.RootElement.GetProperty("lead").GetProperty("status").GetString().Should().Be("Opportunity");
    }

    [Fact]
    public async Task ConvertLead_FromIllegalStatus_Returns409()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<ConvertToOpportunityCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<LeadDto>.Conflict("Cannot transition lead from New to Opportunity"));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PostAsJsonAsync($"/api/crm/leads/{LeadId}/convert", new
        {
            customerId = Guid.NewGuid(),
            title = "Konyhabútor",
            estimatedValue = 3_500_000m,
            convertedBy = ActorId
        });

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    // ══════════ Create + activities ══════════

    [Fact]
    public async Task CreateLead_InvalidSource_Returns400()
    {
        var mediator = new Mock<IMediator>();
        await using var host = await StartHostAsync(mediator.Object);

        var response = await host.Client.PostAsJsonAsync("/api/crm/leads", new
        {
            contactName = "Teszt Elek",
            email = "teszt@example.hu",
            source = "nemletezik",
            assignedToUserId = ActorId,
            createdBy = ActorId
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        mediator.Verify(m => m.Send(It.IsAny<CreateLeadCommand>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateLead_Valid_Returns201WithLocation()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<CreateLeadCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<LeadDto>.Success(SampleLead()));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PostAsJsonAsync("/api/crm/leads", new
        {
            contactName = "Teszt Elek",
            email = "teszt@example.hu",
            source = "Referral",
            assignedToUserId = ActorId,
            createdBy = ActorId
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        response.Headers.Location!.ToString().Should().Contain(LeadId.ToString());
    }

    [Fact]
    public async Task LogActivity_EmptyText_Returns400()
    {
        var mediator = new Mock<IMediator>();
        await using var host = await StartHostAsync(mediator.Object);

        var response = await host.Client.PostAsJsonAsync($"/api/crm/leads/{LeadId}/activities", new
        {
            type = "Call",
            description = "  ",
            loggedBy = ActorId
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task LogActivity_Valid_Returns201WithFreshLead()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<LogLeadActivityCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<LeadDto>.Success(SampleLead()));

        await using var host = await StartHostAsync(mediator.Object);
        var response = await host.Client.PostAsJsonAsync($"/api/crm/leads/{LeadId}/activities", new
        {
            type = "Call",
            description = "Egyeztetés a helyszíni felmérésről",
            loggedBy = ActorId
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }
}
