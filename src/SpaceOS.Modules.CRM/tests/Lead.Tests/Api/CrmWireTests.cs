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
using SpaceOS.Modules.CRM.Application.Wire;
using SpaceOS.Modules.CRM.Domain.Enums;
using Xunit;

namespace SpaceOS.Modules.CRM.Tests.Api;

/// <summary>
/// Contract tests for the CRM wire vocabulary (ADR-059, <see cref="CrmWire"/>):
/// a vocabulary pin per enum, case-sensitivity (English member names must NOT
/// parse), unknown-key → 400, and a TestServer round-trip (Hungarian request →
/// Hungarian response).
/// </summary>
public sealed class CrmWireTests
{
    private static readonly Guid LeadId = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly Guid ActorId = Guid.Parse("33333333-3333-3333-3333-333333333333");

    // ── Vocabulary pins ──────────────────────────────────────────────────────

    [Fact]
    public void LeadStatus_Vocabulary()
        => Enum.GetValues<LeadStatus>().Select(CrmWire.LeadStatus.ToWire)
            .Should().Equal("uj", "kapcsolat", "minosites", "elvetve", "konvertalva", "nurturing");

    [Fact]
    public void LeadSource_Vocabulary()
        => Enum.GetValues<LeadSource>().Select(CrmWire.LeadSource.ToWire)
            .Should().Equal("ismeretlen", "weboldal", "telefon", "email", "kiallitas",
                "ajanlas", "partner", "direkt", "marketing", "kozossegi");

    [Fact]
    public void OpportunityStatus_Vocabulary()
        => Enum.GetValues<OpportunityStatus>().Select(CrmWire.OpportunityStatus.ToWire)
            .Should().Equal("nyitott", "igenyfelmeres", "osszeallitas", "ajanlat",
                "targyalas", "megnyert", "elveszett", "felhagyva");

    [Fact]
    public void TaskSla_Vocabulary()
        => Enum.GetValues<TaskSla>().Select(CrmWire.TaskSla.ToWire)
            .Should().Equal("ok", "soon", "overdue");

    [Fact]
    public void RefType_Vocabulary()
        => Enum.GetValues<CrmRefType>().Select(CrmWire.RefType.ToWire)
            .Should().Equal("lead", "opp");

    // ── Case-sensitivity ─────────────────────────────────────────────────────

    [Theory]
    [InlineData("New")]
    [InlineData("new")]
    [InlineData("Uj")]
    public void LeadStatus_EnglishOrMiscasedKey_DoesNotParse(string wire)
        => CrmWire.LeadStatus.TryParse(wire, out _).Should().BeFalse();

    [Theory]
    [InlineData("Negotiation")]
    [InlineData("Targyalas")]
    public void OpportunityStatus_EnglishOrMiscasedKey_DoesNotParse(string wire)
        => CrmWire.OpportunityStatus.TryParse(wire, out _).Should().BeFalse();

    // ── Endpoint contract ────────────────────────────────────────────────────

    private static Task<CrmEndpointTestHost> StartLeadHostAsync(IMediator mediator)
        => CrmEndpointTestHost.StartAsync(mediator, endpoints => endpoints.MapLeadEndpoints());

    [Fact]
    public async Task ListLeads_OldEnglishStatusKey_Returns400()
    {
        // ADR-059 contract tightening: the legacy English member name no
        // longer parses even though it once matched the domain enum spelling.
        await using var host = await StartLeadHostAsync(new Mock<IMediator>().Object);

        var response = await host.Client.GetAsync("/api/crm/leads?status=New");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateLead_UnknownSourceKey_Returns400ListingVocabulary()
    {
        var mediator = new Mock<IMediator>();
        await using var host = await StartLeadHostAsync(mediator.Object);

        var response = await host.Client.PostAsJsonAsync("/api/crm/leads", new
        {
            contactName = "Teszt Elek",
            email = "teszt@example.hu",
            source = "website-x",
            assignedToUserId = ActorId,
            createdBy = ActorId,
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("weboldal");
    }

    [Fact]
    public async Task CreateLead_HungarianRoundTrip_RequestAndResponseUseWireKeys()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<CreateLeadCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<LeadDto>.Success(new LeadDto
            {
                Id = LeadId,
                TenantId = CrmEndpointTestHost.TenantId,
                Status = CrmWire.LeadStatus.ToWire(LeadStatus.New),
                ContactName = "Teszt Elek",
                Email = "teszt@example.hu",
                Source = CrmWire.LeadSource.ToWire(LeadSource.Website),
                AssignedToUserId = ActorId,
                CreatedAt = DateTimeOffset.UtcNow,
            }));

        await using var host = await StartLeadHostAsync(mediator.Object);
        var response = await host.Client.PostAsJsonAsync("/api/crm/leads", new
        {
            contactName = "Teszt Elek",
            email = "teszt@example.hu",
            source = "weboldal",
            assignedToUserId = ActorId,
            createdBy = ActorId,
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        body.RootElement.GetProperty("status").GetString().Should().Be("uj");
        body.RootElement.GetProperty("source").GetString().Should().Be("weboldal");
    }
}
