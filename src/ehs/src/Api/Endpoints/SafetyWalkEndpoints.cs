using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.SafetyWalks.Commands.AddSafetyWalkFinding;
using SpaceOS.Modules.Ehs.Application.SafetyWalks.Commands.CancelSafetyWalk;
using SpaceOS.Modules.Ehs.Application.SafetyWalks.Commands.CloseSafetyWalk;
using SpaceOS.Modules.Ehs.Application.SafetyWalks.Commands.CompleteSafetyWalk;
using SpaceOS.Modules.Ehs.Application.SafetyWalks.Commands.ScheduleSafetyWalk;
using SpaceOS.Modules.Ehs.Application.SafetyWalks.Commands.StartSafetyWalk;
using SpaceOS.Modules.Ehs.Application.SafetyWalks.Queries.GetSafetyWalkById;
using SpaceOS.Modules.Ehs.Application.SafetyWalks.Queries.ListSafetyWalks;
using SpaceOS.Modules.Ehs.Application.Wire;
using SpaceOS.Modules.Ehs.Infrastructure.Data;

namespace SpaceOS.Modules.Ehs.Api.Endpoints;

/// <summary>
/// Safety walk endpoints — FSM utemezett → folyamatban → intezkedes → lezart (+elmaradt).
/// Findings requiring action spawn corrective actions via the unified CAPA mechanism.
/// Error contract: 404 = not found, 409 = illegal FSM transition, 400 = invalid input.
/// </summary>
public static class SafetyWalkEndpoints
{
    public static void MapSafetyWalkEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/ehs/safety-walks")
            .WithTags("SafetyWalks")
            .WithOpenApi()
            .RequireAuthorization();

        // POST /api/ehs/safety-walks
        group.MapPost("/", ScheduleWalk)
            .WithName("ScheduleSafetyWalk")
            .WithSummary("Schedule a safety walk (FSM entry: Scheduled / utemezett)")
            .Produces<Guid>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status409Conflict);

        // GET /api/ehs/safety-walks
        group.MapGet("/", ListWalks)
            .WithName("ListSafetyWalks")
            .WithSummary("List safety walks (filter: locationId, status, schedule window)")
            .Produces(StatusCodes.Status200OK);

        // GET /api/ehs/safety-walks/{id}
        group.MapGet("/{id:guid}", GetWalk)
            .WithName("GetSafetyWalk")
            .WithSummary("Get safety walk by ID (with findings)")
            .Produces(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        // POST /api/ehs/safety-walks/{id}/start
        group.MapPost("/{id:guid}/start", StartWalk)
            .WithName("StartSafetyWalk")
            .WithSummary("FSM: Scheduled → InProgress (folyamatban)")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        // POST /api/ehs/safety-walks/{id}/findings
        group.MapPost("/{id:guid}/findings", AddFinding)
            .WithName("AddSafetyWalkFinding")
            .WithSummary("Record a finding (+ optional CAPA generation via the unified mechanism)")
            .Produces<AddSafetyWalkFindingResult>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status409Conflict);

        // POST /api/ehs/safety-walks/{id}/complete
        group.MapPost("/{id:guid}/complete", CompleteWalk)
            .WithName("CompleteSafetyWalk")
            .WithSummary("FSM: InProgress → ActionRequired (intezkedes) or Closed (lezart)")
            .Produces(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        // POST /api/ehs/safety-walks/{id}/close
        group.MapPost("/{id:guid}/close", CloseWalk)
            .WithName("CloseSafetyWalk")
            .WithSummary("FSM: ActionRequired → Closed (guard: all linked CAPAs completed)")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        // POST /api/ehs/safety-walks/{id}/cancel
        group.MapPost("/{id:guid}/cancel", CancelWalk)
            .WithName("CancelSafetyWalk")
            .WithSummary("FSM: Scheduled → Cancelled (elmaradt)")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);
    }

    private static async Task<IResult> ScheduleWalk(
        [FromBody] ScheduleSafetyWalkRequest request,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        try
        {
            var command = new ScheduleSafetyWalkCommand(
                tenantContext.TenantId,
                request.LocationId,
                request.ScheduledDate,
                request.ConductedBy,
                request.Participants);

            var walkId = await mediator.Send(command, ct).ConfigureAwait(false);
            return Results.Created($"/api/ehs/safety-walks/{walkId}", new { SafetyWalkId = walkId });
        }
        catch (InvalidOperationException ex)
        {
            return Results.Conflict(new { Error = ex.Message });
        }
        catch (Exception ex)
        {
            return Results.BadRequest(new { Error = ex.Message });
        }
    }

    private static async Task<IResult> ListWalks(
        [AsParameters] ListSafetyWalksRequest request,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        // Query-string enums bypass the JSON converters — parse the Hungarian
        // wire keys by hand (ADR-059); unknown key → 400, not an empty list.
        if (!WireQuery.TryParse(EhsWire.SafetyWalkStatus, request.Status, "bejárás-státusz", out var status, out var statusError))
            return statusError!;

        var filter = new SafetyWalkFilter(
            request.LocationId,
            status,
            request.ScheduledAfter,
            request.ScheduledBefore);

        var query = new ListSafetyWalksQuery(tenantContext.TenantId, filter);

        var result = await mediator.Send(query, ct).ConfigureAwait(false);
        return Results.Ok(result);
    }

    private static async Task<IResult> GetWalk(
        Guid id,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        try
        {
            var query = new GetSafetyWalkByIdQuery(id, tenantContext.TenantId);
            var result = await mediator.Send(query, ct).ConfigureAwait(false);
            return Results.Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return Results.NotFound();
        }
    }

    private static async Task<IResult> StartWalk(
        Guid id,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        try
        {
            var command = new StartSafetyWalkCommand(id, tenantContext.TenantId);
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

    private static async Task<IResult> AddFinding(
        Guid id,
        [FromBody] AddSafetyWalkFindingRequest request,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        try
        {
            var command = new AddSafetyWalkFindingCommand(
                id,
                tenantContext.TenantId,
                request.Description,
                request.Severity,
                request.RequiresAction,
                request.PhotoS3Key,
                request.LinkedRiskAssessmentId,
                request.CapaDescription,
                request.CapaAssignedTo,
                request.CapaDueDate);

            var result = await mediator.Send(command, ct).ConfigureAwait(false);
            return Results.Created($"/api/ehs/safety-walks/{id}", result);
        }
        catch (KeyNotFoundException)
        {
            return Results.NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return Results.Conflict(new { Error = ex.Message });
        }
        catch (Exception ex)
        {
            return Results.BadRequest(new { Error = ex.Message });
        }
    }

    private static async Task<IResult> CompleteWalk(
        Guid id,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        try
        {
            var command = new CompleteSafetyWalkCommand(id, tenantContext.TenantId);
            var resultingStatus = await mediator.Send(command, ct).ConfigureAwait(false);
            return Results.Ok(new { Status = resultingStatus });
        }
        catch (KeyNotFoundException)
        {
            return Results.NotFound();
        }
        catch (ValidationException)
        {
            // Pipeline guard (empty id/tenant) → 404, same contract as StartWalk.
            return Results.NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return Results.Conflict(new { Error = ex.Message });
        }
    }

    private static async Task<IResult> CloseWalk(
        Guid id,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        try
        {
            var command = new CloseSafetyWalkCommand(id, tenantContext.TenantId);
            await mediator.Send(command, ct).ConfigureAwait(false);
            return Results.NoContent();
        }
        catch (KeyNotFoundException)
        {
            return Results.NotFound();
        }
        catch (ValidationException)
        {
            // Pipeline guard (empty id/tenant) → 404, same contract as StartWalk.
            return Results.NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return Results.Conflict(new { Error = ex.Message });
        }
    }

    private static async Task<IResult> CancelWalk(
        Guid id,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        try
        {
            var command = new CancelSafetyWalkCommand(id, tenantContext.TenantId);
            await mediator.Send(command, ct).ConfigureAwait(false);
            return Results.NoContent();
        }
        catch (KeyNotFoundException)
        {
            return Results.NotFound();
        }
        catch (ValidationException)
        {
            // Pipeline guard (empty id/tenant) → 404, same contract as StartWalk.
            return Results.NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return Results.Conflict(new { Error = ex.Message });
        }
    }
}

// Request DTOs
public record ScheduleSafetyWalkRequest(
    Guid LocationId,
    DateTimeOffset ScheduledDate,
    Guid ConductedBy,
    List<Guid>? Participants
);

/// <summary>
/// List filter — the status filter travels as a raw string and is parsed
/// against the EhsWire map in the handler (ADR-059 Hungarian wire keys).
/// </summary>
public record ListSafetyWalksRequest(
    Guid? LocationId = null,
    string? Status = null,
    DateTimeOffset? ScheduledAfter = null,
    DateTimeOffset? ScheduledBefore = null
);

public record AddSafetyWalkFindingRequest(
    string Description,
    Domain.Enums.Severity Severity,
    bool RequiresAction,
    string? PhotoS3Key,
    Guid? LinkedRiskAssessmentId,
    string? CapaDescription,
    Guid? CapaAssignedTo,
    DateTimeOffset? CapaDueDate
);
