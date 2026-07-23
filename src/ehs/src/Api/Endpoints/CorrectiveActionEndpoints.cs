using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.CorrectiveActions.Commands.CompleteCorrectiveAction;
using SpaceOS.Modules.Ehs.Application.CorrectiveActions.Queries.ListCorrectiveActions;
using SpaceOS.Modules.Ehs.Application.Wire;
using SpaceOS.Modules.Ehs.Infrastructure.Data;

namespace SpaceOS.Modules.Ehs.Api.Endpoints;

/// <summary>
/// Unified CAPA endpoints — one board for corrective actions from every
/// source (incident, safety walk, risk assessment).
/// Error contract: 404 = not found, 409 = domain guard violation.
/// </summary>
public static class CorrectiveActionEndpoints
{
    public static void MapCorrectiveActionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/ehs/corrective-actions")
            .WithTags("CorrectiveActions")
            .WithOpenApi()
            .RequireAuthorization();

        // GET /api/ehs/corrective-actions
        group.MapGet("/", ListActions)
            .WithName("ListCorrectiveActions")
            .WithSummary("Unified CAPA board (filter: completed, assignedTo, source, sourceId)")
            .Produces(StatusCodes.Status200OK);

        // POST /api/ehs/corrective-actions/{id}/complete
        group.MapPost("/{id:guid}/complete", CompleteAction)
            .WithName("CompleteCorrectiveAction")
            .WithSummary("Complete a corrective action (any source)")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);
    }

    private static async Task<IResult> ListActions(
        [AsParameters] ListCorrectiveActionsRequest request,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        if (!WireQuery.TryParse(
                EhsWire.CapaSource,
                request.Source,
                "CAPA-forrás",
                out var source,
                out var sourceError))
        {
            return sourceError!;
        }

        var filter = new CapaFilter(request.Completed, request.AssignedTo, source, request.SourceId);
        var query = new ListCorrectiveActionsQuery(tenantContext.TenantId, filter);

        var result = await mediator.Send(query, ct).ConfigureAwait(false);
        return Results.Ok(result);
    }

    private static async Task<IResult> CompleteAction(
        Guid id,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        try
        {
            var command = new CompleteCorrectiveActionCommand(id, tenantContext.TenantId);
            await mediator.Send(command, ct).ConfigureAwait(false);
            return Results.NoContent();
        }
        catch (KeyNotFoundException)
        {
            return Results.NotFound();
        }
        catch (ValidationException)
        {
            // Pipeline guard (id/tenant NotEmpty): an empty id can never match a
            // resource — 404 per the documented 204/404/409 contract (no 400 here).
            return Results.NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return Results.Conflict(new { Error = ex.Message });
        }
    }
}

// Request DTOs
public record ListCorrectiveActionsRequest(
    bool? Completed = null,
    Guid? AssignedTo = null,
    string? Source = null,
    Guid? SourceId = null
);
