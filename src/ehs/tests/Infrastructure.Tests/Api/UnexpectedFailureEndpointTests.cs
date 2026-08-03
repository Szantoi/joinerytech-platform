using System.Net;
using System.Net.Http.Json;
using MediatR;
using Moq;
using SpaceOS.Modules.Ehs.Api.Endpoints;
using SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.CreateRiskAssessment;
using SpaceOS.Modules.Ehs.Domain.Enums;
using Xunit;

namespace SpaceOS.Modules.Ehs.Infrastructure.Tests.Api;

/// <summary>HTTP boundary tests for failures that must not expose provider details.</summary>
public sealed class UnexpectedFailureEndpointTests
{
    [Fact]
    public async Task CreateRiskAssessment_UnexpectedFailure_ReturnsGeneric500WithoutInternalDetail()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<CreateRiskAssessmentCommand>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidProgramException("NpgsqlException: connection string=secret"));

        await using var host = await EhsEndpointTestHost.StartAsync(
            mediator.Object,
            endpoints => endpoints.MapRiskAssessmentEndpoints());

        var response = await host.Client.PostAsJsonAsync(
            "/api/ehs/risk-assessments",
            new CreateRiskAssessmentRequest(
                "Forgácselszívás hiánya",
                Severity.Major,
                Likelihood.Possible,
                Guid.NewGuid(),
                DateTimeOffset.UtcNow.AddDays(7),
                null));

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("InternalServerError", body);
        Assert.DoesNotContain("connection string=secret", body);
    }

    [Fact]
    public async Task CreateRiskAssessment_ConflictFailure_ReturnsGeneric409WithoutInternalDetail()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<CreateRiskAssessmentCommand>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("NpgsqlException: connection string=secret"));

        await using var host = await EhsEndpointTestHost.StartAsync(
            mediator.Object,
            endpoints => endpoints.MapRiskAssessmentEndpoints());

        var response = await host.Client.PostAsJsonAsync(
            "/api/ehs/risk-assessments",
            new CreateRiskAssessmentRequest(
                "Forgácselszívás hiánya",
                Severity.Major,
                Likelihood.Possible,
                Guid.NewGuid(),
                DateTimeOffset.UtcNow.AddDays(7),
                null));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("Conflict", body);
        Assert.DoesNotContain("connection string=secret", body);
    }

    // ===== NEGATIVE CONTROL FOR THE REDACTION =====
    //
    // The two tests above are satisfied by a redaction that is too aggressive — one that also
    // swallows the message the caller is supposed to read. Nothing else in this module would
    // notice: RiskAssessmentValidationEndpointTests asserts the 400 STATUS CODE only, so a
    // validation response reduced to an empty "Érvénytelen kérés." would keep it green while
    // every form in the portal lost its field-level feedback.
    //
    // This test pins the other half of the contract: internal text never leaves, intended text
    // always does.

    [Fact]
    public async Task CreateRiskAssessment_ValidationFailure_Returns400AndKeepsTheMessageTheCallerNeeds()
    {
        const string CallerFacingMessage = "A kockázat leírása legfeljebb 500 karakter lehet.";

        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<CreateRiskAssessmentCommand>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new FluentValidation.ValidationException(
            [
                new FluentValidation.Results.ValidationFailure("HazardDescription", CallerFacingMessage)
            ]));

        await using var host = await EhsEndpointTestHost.StartAsync(
            mediator.Object,
            endpoints => endpoints.MapRiskAssessmentEndpoints());

        var response = await host.Client.PostAsJsonAsync(
            "/api/ehs/risk-assessments",
            new CreateRiskAssessmentRequest(
                "Forgácselszívás hiánya",
                Severity.Major,
                Likelihood.Possible,
                Guid.NewGuid(),
                DateTimeOffset.UtcNow.AddDays(7),
                null));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains(CallerFacingMessage, body);
    }
}
