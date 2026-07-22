using System.Net;
using MediatR;
using Moq;
using SpaceOS.Modules.Ehs.Api.Endpoints;
using SpaceOS.Modules.Ehs.Application.CorrectiveActions.DTOs;
using SpaceOS.Modules.Ehs.Application.CorrectiveActions.Queries.ListCorrectiveActions;
using SpaceOS.Modules.Ehs.Domain.Enums;
using Xunit;

namespace SpaceOS.Modules.Ehs.Infrastructure.Tests.Api;

/// <summary>
/// Endpoint-level pin for the query seam that bypasses JSON enum converters:
/// [AsParameters] raw string -&gt; WireQuery -&gt; canonical domain enum.
/// </summary>
public sealed class CorrectiveActionEndpointWireTests : IAsyncLifetime
{
    private readonly Mock<IMediator> _mediator = new(MockBehavior.Strict);
    private EhsEndpointTestHost _host = null!;

    public async Task InitializeAsync()
    {
        _mediator
            .Setup(m => m.Send(
                It.IsAny<ListCorrectiveActionsQuery>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<CapaDto>());

        _host = await EhsEndpointTestHost.StartAsync(
            _mediator.Object,
            endpoints => endpoints.MapCorrectiveActionEndpoints());
    }

    public async Task DisposeAsync() => await _host.DisposeAsync();

    [Theory]
    [InlineData("esemeny", CapaSource.Incident)]
    [InlineData("bejaras", CapaSource.SafetyWalk)]
    [InlineData("kockazatertekeles", CapaSource.RiskAssessment)]
    public async Task CanonicalHungarianSource_ReachesMediatorAsDomainEnum(
        string wire,
        CapaSource expected)
    {
        _mediator.Invocations.Clear();

        var response = await _host.Client.GetAsync(
            $"/api/ehs/corrective-actions?source={wire}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        _mediator.Verify(m => m.Send(
            It.Is<ListCorrectiveActionsQuery>(query => query.Filter.Source == expected),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task MissingSource_ReachesMediatorAsNullFilter()
    {
        _mediator.Invocations.Clear();

        var response = await _host.Client.GetAsync("/api/ehs/corrective-actions");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        _mediator.Verify(m => m.Send(
            It.Is<ListCorrectiveActionsQuery>(query => query.Filter.Source == null),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Theory]
    [InlineData("")]
    [InlineData("Incident")]
    [InlineData("SafetyWalk")]
    [InlineData("RiskAssessment")]
    [InlineData("Kockazatertekeles")]
    [InlineData("ismeretlen")]
    public async Task EmptyEnglishMiscasedOrUnknownSource_ReturnsBadRequestBeforeMediator(string wire)
    {
        _mediator.Invocations.Clear();

        var response = await _host.Client.GetAsync(
            $"/api/ehs/corrective-actions?source={Uri.EscapeDataString(wire)}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        _mediator.Verify(m => m.Send(
            It.IsAny<ListCorrectiveActionsQuery>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }
}
