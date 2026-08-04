namespace SpaceOS.Modules.Kontrolling.Tests.Api;

using System.Text.Json;
using Ardalis.Result;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using SpaceOS.Modules.Kontrolling.Api.Endpoints;
using Xunit;

/// <summary>
/// The redaction contract of the failure mapper. The named branches (404/409/400)
/// carry their business message to the client; everything else — infrastructure
/// and provider failures included — must map to a generic 500 whose body never
/// contains the internal error text.
/// </summary>
/// <remarks>
/// The mapper's wiring into the endpoints is covered by the endpoint tests
/// (e.g. the 409 "már törölve" body assertion); this class pins the content of
/// the branches themselves. Today no live handler returns
/// <see cref="ResultStatus.Error"/> (the only such handler,
/// <c>DeleteCostAdjustmentCommandHandler</c>, is not wired to any endpoint), so
/// the fallback branch is preventive hardening, not a live leak.
/// </remarks>
public sealed class KontrollingEndpointResultsTests
{
    private const string InternalDetail = "Npgsql connection failed: password=hunter2 host=10.0.0.5";

    [Fact]
    public void Unknown_status_maps_to_a_generic_500_without_the_internal_error_text()
    {
        var response = KontrollingEndpointResults.Failure(Result.Error(InternalDetail));

        response.Should().BeAssignableTo<IStatusCodeHttpResult>()
            .Which.StatusCode.Should().Be(StatusCodes.Status500InternalServerError);

        var body = SerializeBody(response);
        body.Should().NotContain("hunter2").And.NotContain("Npgsql").And.NotContain("10.0.0.5");
        body.Should().Contain("\"error\":\"InternalServerError\"")
            .And.Contain("Váratlan kiszolgálóhiba történt.");
    }

    [Fact]
    public void Named_branches_keep_their_business_message_negative_control()
    {
        // The redaction must not eat the messages the client legitimately shows.
        SerializeBody(KontrollingEndpointResults.Failure(Result.NotFound("Nincs ilyen kiigazítás.")))
            .Should().Contain("Nincs ilyen kiigazítás.");

        SerializeBody(KontrollingEndpointResults.Failure(
                Result.Invalid(new ValidationError("Az összeg nem lehet nulla."))))
            .Should().Contain("Az összeg nem lehet nulla.");
    }

    private static string SerializeBody(Microsoft.AspNetCore.Http.IResult result) =>
        JsonSerializer.Serialize(
            result.Should().BeAssignableTo<IValueHttpResult>().Which.Value,
            new JsonSerializerOptions { Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping });
}
