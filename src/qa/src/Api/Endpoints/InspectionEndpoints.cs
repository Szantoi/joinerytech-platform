using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SpaceOS.Modules.QA.Application.Commands;
using SpaceOS.Modules.QA.Application.DTOs;
using SpaceOS.Modules.QA.Application.Queries;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Api.Endpoints;

/// <summary>
/// Inspection API endpoints using Minimal API pattern.
/// Supports FSM state transitions (Planned → InProgress → Completed)
/// and production integration queries (blocking inspections).
/// Transition endpoints return the fresh InspectionDto (portal contract:
/// the UI reconciles optimistic updates from the response — Maintenance precedent).
/// ADR-063 rework loop: complete/conditional (Conditional result + auto rework
/// Ticket) and rework (new re-check Inspection referencing the original).
/// Error contract: 404 = not found, 409 = illegal FSM transition, 400 = payload validation.
/// </summary>
public static class InspectionEndpoints
{
    private const string LoggerCategory = "SpaceOS.Modules.QA.Api.InspectionEndpoints";

    /// <summary>
    /// Config key for the priority of the auto-spawned rework ticket on a
    /// Conditional completion (ADR-063). QUALITY.md: thresholds/defaults are
    /// config-driven, never inline literals.
    /// </summary>
    public const string ReworkTicketPriorityConfigKey = "QA:Rework:TicketPriority";

    /// <summary>
    /// Fallback rework-ticket priority when not configured: Medium — a conditional
    /// pass is by definition a minor-defect outcome, not an escalation.
    /// </summary>
    public const CrmTaskPriority FallbackReworkTicketPriority = CrmTaskPriority.Medium;

    /// <summary>
    /// Maps Inspection endpoints to the application.
    /// </summary>
    public static IEndpointRouteBuilder MapInspectionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/qa/inspections")
            .WithTags("QA - Inspections")
            .RequireAuthorization();

        group.MapPost("", CreateInspection)
            .WithName("CreateInspection")
            .WithSummary("Create a new inspection")
            .Produces<Guid>(201)
            .ProducesValidationProblem();

        group.MapGet("/{id:guid}", GetInspection)
            .WithName("GetInspection")
            .WithSummary("Get inspection by ID (includes failure notes)")
            .Produces<InspectionDto>(200)
            .Produces(404);

        group.MapGet("", ListInspections)
            .WithName("ListInspections")
            .WithSummary("List all inspections (tenant-filtered)")
            .Produces<InspectionListDto[]>(200);

        group.MapGet("/order/{orderId:guid}", ListInspectionsByOrder)
            .WithName("ListInspectionsByOrder")
            .WithSummary("List inspections for a specific order (production integration)")
            .Produces<InspectionListDto[]>(200);

        group.MapPost("/{id:guid}/failure-notes", AddInspectionFailureNote)
            .WithName("AddInspectionFailureNote")
            .WithSummary("Add a failure note to an inspection (owned collection)")
            .Produces(201)
            .Produces(404)
            .ProducesValidationProblem();

        group.MapPost("/{id:guid}/start", StartInspection)
            .WithName("StartInspection")
            .WithSummary("Start inspection (FSM transition: Planned → InProgress) — returns the fresh InspectionDto")
            .Produces<InspectionDto>(200)
            .Produces(404)
            .Produces(409)
            .ProducesValidationProblem();

        group.MapPost("/{id:guid}/complete/pass", CompleteInspectionPass)
            .WithName("CompleteInspectionPass")
            .WithSummary("Complete inspection with Pass result (FSM transition: InProgress → Completed) — returns the fresh InspectionDto")
            .Produces<InspectionDto>(200)
            .Produces(404)
            .Produces(409)
            .ProducesValidationProblem();

        group.MapPost("/{id:guid}/complete/fail", CompleteInspectionFail)
            .WithName("CompleteInspectionFail")
            .WithSummary("Complete inspection with Fail result (FSM transition: InProgress → Completed; min. 1 failure note) — returns the fresh InspectionDto")
            .Produces<InspectionDto>(200)
            .Produces(400)
            .Produces(404)
            .Produces(409)
            .ProducesValidationProblem();

        group.MapPost("/{id:guid}/complete/conditional", CompleteInspectionConditional)
            .WithName("CompleteInspectionConditional")
            .WithSummary("Complete inspection with Conditional result (InProgress → Completed; min. 1 failure note) — spawns the rework Ticket (ADR-063) and returns the fresh InspectionDto")
            .Produces<InspectionDto>(200)
            .Produces(400)
            .Produces(404)
            .Produces(409)
            .ProducesValidationProblem();

        group.MapPost("/{id:guid}/rework", CreateReworkInspection)
            .WithName("CreateReworkInspection")
            .WithSummary("Create the re-check inspection of a conditionally passed inspection (ADR-063) — the original stays immutable, the new inspection references it via reworkOfInspectionId")
            .Produces<InspectionDto>(201)
            .Produces(400)
            .Produces(404)
            .Produces(409)
            .ProducesValidationProblem();

        group.MapGet("/order/{orderId:guid}/blocking", GetBlockingInspections)
            .WithName("GetBlockingInspections")
            .WithSummary("Get all blocking inspections for order (production integration)")
            .Produces<InspectionListDto[]>(200);

        return app;
    }

    // ============ HANDLERS ============

    private static async Task<IResult> CreateInspection(
        [FromBody] CreateInspectionRequestDto request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var command = new CreateInspectionCommand(
            CheckpointId: new QACheckpointId(request.CheckpointId),
            InspectorId: request.InspectorId,
            PlannedAt: request.PlannedAt,
            OrderId: request.OrderId,
            ProductId: request.ProductId,
            TenantId: tenantId
        );

        var result = await mediator.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Results.Created($"/api/qa/inspections/{result.Value.Value}", new { inspectionId = result.Value.Value })
            : Results.BadRequest(result.Errors);
    }

    private static async Task<IResult> GetInspection(
        [FromRoute] Guid id,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var query = new GetInspectionQuery(
            InspectionId: new InspectionId(id),
            TenantId: tenantId
        );
        var result = await mediator.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Results.Ok(result.Value)
            : Results.NotFound();
    }

    private static async Task<IResult> ListInspections(
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct = default)
    {
        var query = new GetFailedInspectionsQuery(
            FromDate: DateTime.UtcNow.AddYears(-10),
            ToDate: DateTime.UtcNow,
            TenantId: tenantId);

        var result = await mediator.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Results.Ok(result.Value)
            : Results.BadRequest(result.Errors);
    }

    private static async Task<IResult> ListInspectionsByOrder(
        [FromRoute] Guid orderId,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var query = new GetInspectionsByOrderQuery(
            OrderId: orderId,
            TenantId: tenantId
        );

        var result = await mediator.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Results.Ok(result.Value)
            : Results.BadRequest(result.Errors);
    }

    private static async Task<IResult> AddInspectionFailureNote(
        [FromRoute] Guid id,
        [FromBody] AddInspectionFailureNoteRequestDto request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        if (!Enum.TryParse<FailureType>(request.FailureType, ignoreCase: true, out var failureType))
        {
            return Results.BadRequest(new { error = "Invalid failure type" });
        }

        var command = new AddInspectionFailureNoteCommand(
            InspectionId: new InspectionId(id),
            FailureType: failureType,
            Description: request.Description,
            PhotoUrl: request.PhotoUrl,
            TenantId: tenantId
        );

        var result = await mediator.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Results.StatusCode(201)
            : Results.BadRequest(result.Errors);
    }

    private static async Task<IResult> StartInspection(
        [FromRoute] Guid id,
        [FromServices] IMediator mediator,
        [FromServices] ILoggerFactory loggerFactory,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var command = new StartInspectionCommand(
            InspectionId: new InspectionId(id),
            TenantId: tenantId
        );

        return await ExecuteTransition(mediator, loggerFactory, command, id, tenantId, "start", ct)
            .ConfigureAwait(false);
    }

    private static async Task<IResult> CompleteInspectionPass(
        [FromRoute] Guid id,
        [FromBody] CompleteInspectionPassRequestDto request,
        [FromServices] IMediator mediator,
        [FromServices] ILoggerFactory loggerFactory,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var command = new CompleteInspectionWithPassCommand(
            InspectionId: new InspectionId(id),
            Notes: request.Notes,
            TenantId: tenantId
        );

        return await ExecuteTransition(mediator, loggerFactory, command, id, tenantId, "complete/pass", ct)
            .ConfigureAwait(false);
    }

    private static async Task<IResult> CompleteInspectionFail(
        [FromRoute] Guid id,
        [FromBody] CompleteInspectionFailRequestDto request,
        [FromServices] IMediator mediator,
        [FromServices] ILoggerFactory loggerFactory,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        if (!TryParseFailureNotes(request.FailureNotes, out var failureNotes))
        {
            return Results.BadRequest(new { error = "Invalid failure type" });
        }

        var command = new CompleteInspectionWithFailCommand(
            InspectionId: new InspectionId(id),
            FailureNotes: failureNotes,
            Notes: request.Notes,
            TenantId: tenantId
        );

        return await ExecuteTransition(mediator, loggerFactory, command, id, tenantId, "complete/fail", ct)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Completes an inspection with Conditional result (ADR-063): the documented
    /// minor defects spawn a rework Ticket automatically (priority from config),
    /// then the fresh InspectionDto is returned (with openTicketId — the portal
    /// derives its "javitasra" view-state from it).
    /// </summary>
    private static async Task<IResult> CompleteInspectionConditional(
        [FromRoute] Guid id,
        [FromBody] CompleteInspectionConditionalRequestDto request,
        [FromServices] IMediator mediator,
        [FromServices] IConfiguration configuration,
        [FromServices] ILoggerFactory loggerFactory,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        if (!TryParseFailureNotes(request.FailureNotes, out var failureNotes))
        {
            return Results.BadRequest(new { error = "Invalid failure type" });
        }

        var command = new CompleteInspectionWithConditionalCommand(
            InspectionId: new InspectionId(id),
            FailureNotes: failureNotes,
            Notes: request.Notes,
            ReworkTicketPriority: ResolveReworkTicketPriority(configuration),
            TenantId: tenantId
        );

        var logger = loggerFactory.CreateLogger(LoggerCategory);

        var result = await mediator.Send(command, ct).ConfigureAwait(false);
        if (!result.IsSuccess)
        {
            logger.LogWarning(
                "QA inspection {InspectionId} complete/conditional rejected ({Status}) for tenant {TenantId}",
                id, result.Status, tenantId);
            return QaEndpointResults.Failure(result);
        }

        logger.LogInformation(
            "QA inspection {InspectionId} completed conditionally; rework ticket {TicketId} spawned for tenant {TenantId}",
            id, result.Value, tenantId);

        var fresh = await mediator
            .Send(new GetInspectionQuery(new InspectionId(id), tenantId), ct)
            .ConfigureAwait(false);

        return fresh.IsSuccess
            ? Results.Ok(fresh.Value)
            : QaEndpointResults.Failure(fresh);
    }

    /// <summary>
    /// Creates the re-check inspection of a conditionally passed inspection
    /// (ADR-063): new Inspection referencing the original (reworkOfInspectionId),
    /// the original stays immutable. Returns 201 + the fresh InspectionDto.
    /// </summary>
    private static async Task<IResult> CreateReworkInspection(
        [FromRoute] Guid id,
        [FromBody] CreateReworkInspectionRequestDto request,
        [FromServices] IMediator mediator,
        [FromServices] ILoggerFactory loggerFactory,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var command = new CreateReworkInspectionCommand(
            OriginalInspectionId: new InspectionId(id),
            InspectorId: request.InspectorId,
            PlannedAt: request.PlannedAt,
            TenantId: tenantId
        );

        var logger = loggerFactory.CreateLogger(LoggerCategory);

        var result = await mediator.Send(command, ct).ConfigureAwait(false);
        if (!result.IsSuccess)
        {
            logger.LogWarning(
                "QA rework inspection for {InspectionId} rejected ({Status}) for tenant {TenantId}",
                id, result.Status, tenantId);
            return QaEndpointResults.Failure(result);
        }

        logger.LogInformation(
            "QA rework inspection {ReworkInspectionId} created for inspection {InspectionId}, tenant {TenantId}",
            result.Value.Value, id, tenantId);

        var fresh = await mediator
            .Send(new GetInspectionQuery(result.Value, tenantId), ct)
            .ConfigureAwait(false);

        return fresh.IsSuccess
            ? Results.Created($"/api/qa/inspections/{result.Value.Value}", fresh.Value)
            : QaEndpointResults.Failure(fresh);
    }

    /// <summary>
    /// Parses the wire failure notes (string enum, case-insensitive) into command
    /// inputs; false = at least one unknown failure type (endpoint contract: 400).
    /// </summary>
    private static bool TryParseFailureNotes(
        List<FailureNoteInputDto>? dtos,
        out List<FailureNoteInput> failureNotes)
    {
        failureNotes = new List<FailureNoteInput>();
        if (dtos == null)
        {
            return true;
        }

        foreach (var fn in dtos)
        {
            if (!Enum.TryParse<FailureType>(fn.FailureType, ignoreCase: true, out var failureType))
            {
                return false;
            }

            failureNotes.Add(new FailureNoteInput(failureType, fn.Description, fn.PhotoUrl));
        }

        return true;
    }

    /// <summary>
    /// Resolves the auto-spawned rework ticket's priority from configuration
    /// (fallback: Medium). Invalid config value fails fast — a silently wrong
    /// priority would misroute every rework.
    /// </summary>
    public static CrmTaskPriority ResolveReworkTicketPriority(IConfiguration configuration)
    {
        var raw = configuration[ReworkTicketPriorityConfigKey];
        if (string.IsNullOrWhiteSpace(raw))
        {
            return FallbackReworkTicketPriority;
        }

        if (!Enum.TryParse<CrmTaskPriority>(raw, ignoreCase: true, out var priority))
        {
            throw new InvalidOperationException(
                $"Invalid '{ReworkTicketPriorityConfigKey}' value: '{raw}' " +
                $"(expected one of: {string.Join(", ", Enum.GetNames<CrmTaskPriority>())})");
        }

        return priority;
    }

    /// <summary>
    /// Shared transition execution: run the command, map failures via the module
    /// error contract (404/409/400), and on success return the fresh InspectionDto
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
                "QA inspection {InspectionId} {Action} rejected ({Status}) for tenant {TenantId}",
                id, action, result.Status, tenantId);
            return QaEndpointResults.Failure(result);
        }

        logger.LogInformation(
            "QA inspection {InspectionId} {Action} succeeded for tenant {TenantId}",
            id, action, tenantId);

        var fresh = await mediator
            .Send(new GetInspectionQuery(new InspectionId(id), tenantId), ct)
            .ConfigureAwait(false);

        return fresh.IsSuccess
            ? Results.Ok(fresh.Value)
            : QaEndpointResults.Failure(fresh);
    }

    private static async Task<IResult> GetBlockingInspections(
        [FromRoute] Guid orderId,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var query = new GetBlockingInspectionsQuery(
            OrderId: orderId,
            TenantId: tenantId
        );

        var result = await mediator.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Results.Ok(result.Value)
            : Results.BadRequest(result.Errors);
    }
}

/// <summary>
/// Request DTOs for Inspection operations.
/// </summary>
public record CreateInspectionRequestDto(
    Guid CheckpointId,
    Guid InspectorId,
    DateTime PlannedAt,
    Guid? OrderId,
    Guid? ProductId
);

public record AddInspectionFailureNoteRequestDto(
    string FailureType,
    string Description,
    string? PhotoUrl
);

public record CompleteInspectionPassRequestDto(
    string? Notes
);

public record CompleteInspectionFailRequestDto(
    List<FailureNoteInputDto>? FailureNotes,
    string? Notes
);

public record FailureNoteInputDto(
    string FailureType,
    string Description,
    string? PhotoUrl
);

public record CompleteInspectionConditionalRequestDto(
    List<FailureNoteInputDto>? FailureNotes,
    string? Notes
);

public record CreateReworkInspectionRequestDto(
    Guid InspectorId,
    DateTime PlannedAt
);
