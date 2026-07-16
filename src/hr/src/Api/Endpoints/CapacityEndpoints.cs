using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.HR.Application.DTOs;
using SpaceOS.Modules.HR.Application.Queries;

namespace SpaceOS.Modules.HR.Api.Endpoints;

/// <summary>
/// Capacity API endpoint (portal MSW contract mirror:
/// src/joinerytech-portal/src/modules/hr/mocks/handlers.capacity.ts).
///
/// The weekly grid is a COMPUTED resource: the server runs the domain's
/// CapacityCalculationService and the client renders the response — it never
/// computes a grid of its own. The `week` parameter is mandatory and must be a
/// Monday in YYYY-MM-DD form (anything else → 400, mirroring the mock's guards).
/// </summary>
public static class CapacityEndpoints
{
    /// <summary>Maps the capacity endpoint to the application.</summary>
    public static IEndpointRouteBuilder MapCapacityEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/hr/capacity", GetWeekCapacity)
            .WithTags("HR - Capacity")
            .RequireAuthorization()
            .WithName("GetWeekCapacity")
            .WithSummary("Server-computed weekly capacity grid (week = the week's Monday)")
            .Produces<WeekCapacityDto>(200)
            .Produces(400);

        return app;
    }

    private static async Task<IResult> GetWeekCapacity(
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        [FromQuery(Name = "week")] string? week,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(week))
        {
            return Results.BadRequest(new { error = "The week parameter (YYYY-MM-DD, Monday) is required" });
        }

        if (!DateOnly.TryParseExact(week, "yyyy-MM-dd", out var monday))
        {
            return Results.BadRequest(new { error = $"Invalid week parameter (expected YYYY-MM-DD, got: {week})" });
        }

        // The Monday guard itself lives in the query handler (it is a domain rule,
        // not a parsing concern) and comes back as ResultStatus.Invalid → 400.
        var result = await mediator
            .Send(new GetWeekCapacityQuery(TenantId.From(tenantId), monday), ct)
            .ConfigureAwait(false);

        return result.IsSuccess
            ? Results.Ok(result.Value)
            : HrEndpointResults.Failure(result);
    }
}
