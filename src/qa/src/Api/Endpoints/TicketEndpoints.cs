using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Logging;
using SpaceOS.Modules.QA.Application.Commands;
using SpaceOS.Modules.QA.Application.DTOs;
using SpaceOS.Modules.QA.Application.Queries;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Api.Endpoints;

/// <summary>
/// Ticket API endpoints using Minimal API pattern (portal MSW contract mirror:
/// src/joinerytech-portal/src/mocks/qaApi/handlers.tickets.ts).
/// FSM: Reported → Assigned → InProgress → Resolved (+ Rejected from InProgress,
/// Reopen back to Reported); priority escalation is status/rank-guarded but not
/// an FSM transition. Transition endpoints return the fresh TicketDto (the UI
/// uses it for optimistic-update reconciliation).
/// Error contract: 404 = not found, 409 = illegal FSM transition / escalation
/// guard, 400 = payload validation.
/// </summary>
public static class TicketEndpoints
{
    private const string LoggerCategory = "SpaceOS.Modules.QA.Api.TicketEndpoints";

    /// <summary>
    /// Maps Ticket endpoints to the application.
    /// </summary>
    public static IEndpointRouteBuilder MapTicketEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/qa/tickets")
            .WithTags("QA - Tickets")
            .RequireAuthorization();

        group.MapPost("", CreateTicket)
            .WithName("CreateTicket")
            .WithSummary("Create a new ticket (FSM entry: Reported)")
            .Produces<TicketDto>(201)
            .Produces(400)
            .ProducesValidationProblem();

        group.MapGet("", ListTickets)
            .WithName("ListTickets")
            .WithSummary("List tickets (filters: status, priority, inspectionId, open, q; newest first)")
            .Produces<TicketDto[]>(200)
            .Produces(400);

        group.MapGet("/{id:guid}", GetTicket)
            .WithName("GetTicket")
            .WithSummary("Get ticket by ID (includes resolution actions)")
            .Produces<TicketDto>(200)
            .Produces(404);

        group.MapPut("/{id:guid}/assign", AssignTicket)
            .WithName("AssignTicket")
            .WithSummary("Assign ticket (FSM: Reported → Assigned)")
            .Produces<TicketDto>(200)
            .Produces(400)
            .Produces(404)
            .Produces(409);

        group.MapPut("/{id:guid}/start", StartTicket)
            .WithName("StartTicket")
            .WithSummary("Start work on ticket (FSM: Assigned → InProgress)")
            .Produces<TicketDto>(200)
            .Produces(404)
            .Produces(409);

        group.MapPut("/{id:guid}/resolve", ResolveTicket)
            .WithName("ResolveTicket")
            .WithSummary("Resolve ticket with at least one resolution action (FSM: InProgress → Resolved)")
            .Produces<TicketDto>(200)
            .Produces(400)
            .Produces(404)
            .Produces(409);

        group.MapPut("/{id:guid}/reject", RejectTicket)
            .WithName("RejectTicket")
            .WithSummary("Reject ticket with mandatory reason (FSM: InProgress → Rejected; reason → resolutionNotes)")
            .Produces<TicketDto>(200)
            .Produces(400)
            .Produces(404)
            .Produces(409);

        group.MapPut("/{id:guid}/reopen", ReopenTicket)
            .WithName("ReopenTicket")
            .WithSummary("Reopen rejected ticket (FSM: Rejected → Reported; clears assignment/start/notes)")
            .Produces<TicketDto>(200)
            .Produces(404)
            .Produces(409);

        group.MapPut("/{id:guid}/escalate", EscalateTicket)
            .WithName("EscalateTicketPriority")
            .WithSummary("Escalate priority (guarded: not on resolved tickets, only to a strictly higher priority)")
            .Produces<TicketDto>(200)
            .Produces(400)
            .Produces(404)
            .Produces(409);

        return app;
    }

    // ============ HANDLERS ============

    private static async Task<IResult> CreateTicket(
        [FromBody] CreateTicketRequestDto request,
        [FromServices] IMediator mediator,
        [FromServices] ILoggerFactory loggerFactory,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        if (!Enum.TryParse<TicketType>(request.TicketType, ignoreCase: true, out var ticketType))
        {
            return Results.BadRequest(new { error = "Invalid ticket type" });
        }

        if (!Enum.TryParse<CrmTaskPriority>(request.Priority, ignoreCase: true, out var priority))
        {
            return Results.BadRequest(new { error = "Invalid priority" });
        }

        var command = new CreateTicketCommand(
            TicketType: ticketType,
            Priority: priority,
            Title: request.Title,
            Description: request.Description,
            ReportedBy: request.ReportedBy,
            OrderId: request.OrderId,
            ProductId: request.ProductId,
            InspectionId: request.InspectionId,
            TenantId: tenantId
        );

        var result = await mediator.Send(command, ct).ConfigureAwait(false);
        if (!result.IsSuccess)
        {
            return QaEndpointResults.Failure(result);
        }

        loggerFactory.CreateLogger(LoggerCategory).LogInformation(
            "QA ticket {TicketId} created ({TicketType}, {Priority}) for tenant {TenantId}",
            result.Value.Value, ticketType, priority, tenantId);

        // Portal contract: 201 with the full created DTO in the body.
        var fresh = await mediator
            .Send(new GetTicketQuery(result.Value, tenantId), ct)
            .ConfigureAwait(false);

        return fresh.IsSuccess
            ? Results.Created($"/api/qa/tickets/{result.Value.Value}", fresh.Value)
            : QaEndpointResults.Failure(fresh);
    }

    private static async Task<IResult> ListTickets(
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        [FromQuery(Name = "status")] string? status,
        [FromQuery(Name = "priority")] string? priority,
        [FromQuery(Name = "inspectionId")] Guid? inspectionId,
        [FromQuery(Name = "open")] bool? open,
        [FromQuery(Name = "q")] string? q,
        CancellationToken ct)
    {
        TicketStatus? statusFilter = null;
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<TicketStatus>(status, ignoreCase: true, out var parsedStatus))
            {
                return Results.BadRequest(new { error = "Invalid status filter" });
            }
            statusFilter = parsedStatus;
        }

        CrmTaskPriority? priorityFilter = null;
        if (!string.IsNullOrWhiteSpace(priority))
        {
            if (!Enum.TryParse<CrmTaskPriority>(priority, ignoreCase: true, out var parsedPriority))
            {
                return Results.BadRequest(new { error = "Invalid priority filter" });
            }
            priorityFilter = parsedPriority;
        }

        var query = new GetTicketsQuery(
            TenantId: tenantId,
            Status: statusFilter,
            Priority: priorityFilter,
            InspectionId: inspectionId,
            OpenOnly: open == true,
            SearchText: q
        );

        var result = await mediator.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Results.Ok(result.Value)
            : QaEndpointResults.Failure(result);
    }

    private static async Task<IResult> GetTicket(
        [FromRoute] Guid id,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var result = await mediator
            .Send(new GetTicketQuery(new TicketId(id), tenantId), ct)
            .ConfigureAwait(false);

        return result.IsSuccess
            ? Results.Ok(result.Value)
            : Results.NotFound();
    }

    private static async Task<IResult> AssignTicket(
        [FromRoute] Guid id,
        [FromBody] AssignTicketRequestDto request,
        [FromServices] IMediator mediator,
        [FromServices] ILoggerFactory loggerFactory,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var command = new AssignTicketCommand(new TicketId(id), request.AssigneeId, tenantId);
        return await ExecuteTransition(mediator, loggerFactory, command, id, tenantId, "assign", ct)
            .ConfigureAwait(false);
    }

    private static async Task<IResult> StartTicket(
        [FromRoute] Guid id,
        [FromServices] IMediator mediator,
        [FromServices] ILoggerFactory loggerFactory,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var command = new StartTicketCommand(new TicketId(id), tenantId);
        return await ExecuteTransition(mediator, loggerFactory, command, id, tenantId, "start", ct)
            .ConfigureAwait(false);
    }

    private static async Task<IResult> ResolveTicket(
        [FromRoute] Guid id,
        [FromBody] ResolveTicketRequestDto request,
        [FromServices] IMediator mediator,
        [FromServices] ILoggerFactory loggerFactory,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        // Validate all action types upfront (module pattern: string enums + TryParse)
        var actions = new List<ResolutionActionInput>();
        foreach (var action in request.ResolutionActions ?? new())
        {
            if (!Enum.TryParse<ActionType>(action.ActionType, ignoreCase: true, out var actionType))
            {
                return Results.BadRequest(new { error = "Invalid resolution action type" });
            }
            actions.Add(new ResolutionActionInput(actionType, action.Description, action.CostAmount));
        }

        var command = new ResolveTicketCommand(new TicketId(id), actions, request.ResolutionNotes, tenantId);
        return await ExecuteTransition(mediator, loggerFactory, command, id, tenantId, "resolve", ct)
            .ConfigureAwait(false);
    }

    private static async Task<IResult> RejectTicket(
        [FromRoute] Guid id,
        [FromBody] RejectTicketRequestDto request,
        [FromServices] IMediator mediator,
        [FromServices] ILoggerFactory loggerFactory,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var command = new RejectTicketCommand(new TicketId(id), request.Reason, tenantId);
        return await ExecuteTransition(mediator, loggerFactory, command, id, tenantId, "reject", ct)
            .ConfigureAwait(false);
    }

    private static async Task<IResult> ReopenTicket(
        [FromRoute] Guid id,
        [FromServices] IMediator mediator,
        [FromServices] ILoggerFactory loggerFactory,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var command = new ReopenTicketCommand(new TicketId(id), tenantId);
        return await ExecuteTransition(mediator, loggerFactory, command, id, tenantId, "reopen", ct)
            .ConfigureAwait(false);
    }

    private static async Task<IResult> EscalateTicket(
        [FromRoute] Guid id,
        [FromBody] EscalateTicketRequestDto request,
        [FromServices] IMediator mediator,
        [FromServices] ILoggerFactory loggerFactory,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        if (!Enum.TryParse<CrmTaskPriority>(request.Priority, ignoreCase: true, out var priority))
        {
            return Results.BadRequest(new { error = "Invalid priority" });
        }

        var command = new EscalateTicketPriorityCommand(new TicketId(id), priority, tenantId);
        return await ExecuteTransition(mediator, loggerFactory, command, id, tenantId, "escalate", ct)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Shared transition execution: run the command, map failures via the module
    /// error contract (404/409/400), and on success return the fresh TicketDto
    /// (portal contract: the UI reconciles optimistic updates from the response).
    /// </summary>
    private static async Task<IResult> ExecuteTransition(
        IMediator mediator,
        ILoggerFactory loggerFactory,
        IRequest<Ardalis.Result.Result> command,
        Guid id,
        Guid tenantId,
        string action,
        CancellationToken ct)
    {
        var logger = loggerFactory.CreateLogger(LoggerCategory);

        var result = await mediator.Send(command, ct).ConfigureAwait(false);
        if (!result.IsSuccess)
        {
            logger.LogWarning(
                "QA ticket {TicketId} {Action} rejected ({Status}) for tenant {TenantId}",
                id, action, result.Status, tenantId);
            return QaEndpointResults.Failure(result);
        }

        logger.LogInformation(
            "QA ticket {TicketId} {Action} succeeded for tenant {TenantId}",
            id, action, tenantId);

        var fresh = await mediator
            .Send(new GetTicketQuery(new TicketId(id), tenantId), ct)
            .ConfigureAwait(false);

        return fresh.IsSuccess
            ? Results.Ok(fresh.Value)
            : QaEndpointResults.Failure(fresh);
    }
}

/// <summary>
/// Request DTOs for Ticket operations (module pattern: enums travel as strings,
/// parsed with Enum.TryParse — invalid values → 400).
/// </summary>
public record CreateTicketRequestDto(
    string TicketType,
    string Priority,
    string Title,
    string Description,
    Guid ReportedBy,
    Guid? OrderId,
    Guid? ProductId,
    Guid? InspectionId
);

public record AssignTicketRequestDto(
    Guid AssigneeId
);

public record ResolveTicketRequestDto(
    List<ResolutionActionRequestDto>? ResolutionActions,
    string? ResolutionNotes
);

public record ResolutionActionRequestDto(
    string ActionType,
    string Description,
    decimal? CostAmount
);

public record RejectTicketRequestDto(
    string Reason
);

public record EscalateTicketRequestDto(
    string Priority
);
