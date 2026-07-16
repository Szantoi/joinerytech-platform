using Ardalis.Result;
using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using SpaceOS.Modules.Maintenance.Application.Commands;
using SpaceOS.Modules.Maintenance.Application.DTOs;
using SpaceOS.Modules.Maintenance.Application.Queries;
using SpaceOS.Modules.Maintenance.Domain.Enums;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;
using IResult = Microsoft.AspNetCore.Http.IResult;

namespace SpaceOS.Modules.Maintenance.Api.Endpoints;

/// <summary>
/// WorkOrder API endpoints using Minimal API pattern.
/// FSM transitions (portal WORK_ORDER_FSM mirror — the aggregate is the source of truth):
///   PUT {id}/schedule  Reported → Scheduled
///   PUT {id}/start     Scheduled → InProgress (assignment required)
///   PUT {id}/complete  InProgress → Completed (terminal)
///   PUT {id}/postpone  Scheduled/InProgress → Postponed (reason required)
///   PUT {id}/reject    Reported/Scheduled → Rejected (reason required)
///   PUT {id}/reopen    Postponed/Rejected → Reported (clears assignment/schedule/reasons)
///   PUT {id}/assign    status-guarded action (Reported/Scheduled), NOT an FSM transition
/// Every transition returns the FRESH WorkOrderDto (portal optimistic-update contract).
/// Error contract (EHS precedent): 404 = not found, 409 = illegal FSM transition /
/// state conflict, 400 = invalid input.
/// </summary>
public static class WorkOrderEndpoints
{
    /// <summary>
    /// Maps WorkOrder endpoints to the application.
    /// </summary>
    public static IEndpointRouteBuilder MapWorkOrderEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/maintenance/work-orders")
            .WithTags("Maintenance - WorkOrders")
            .RequireAuthorization();

        group.MapPost("", CreateWorkOrder)
            .WithName("CreateWorkOrder")
            .WithSummary("Create a new work order (FSM entry: Reported)")
            .Produces<Guid>(201)
            .ProducesValidationProblem();

        group.MapGet("/{id:guid}", GetWorkOrder)
            .WithName("GetWorkOrder")
            .WithSummary("Get work order by ID (includes parts)")
            .Produces<WorkOrderDto>(200)
            .Produces(404);

        group.MapGet("", ListWorkOrders)
            .WithName("ListWorkOrders")
            .WithSummary("List all work orders (paginated, tenant-filtered)")
            .Produces<WorkOrderListDto[]>(200);

        group.MapGet("/asset/{assetId:guid}", ListWorkOrdersByAsset)
            .WithName("ListWorkOrdersByAsset")
            .WithSummary("List work orders for a specific asset")
            .Produces<WorkOrderListDto[]>(200);

        group.MapPost("/{id:guid}/parts", AddWorkOrderPart)
            .WithName("AddWorkOrderPart")
            .WithSummary("Add a part to a work order (owned collection)")
            .Produces(201)
            .Produces(404)
            .ProducesValidationProblem();

        // ── FSM transition endpoints (portal contract: PUT + fresh WorkOrderDto) ──

        MapTransition(group, "schedule", ScheduleWorkOrder,
            "ScheduleWorkOrder", "FSM: Reported → Scheduled (date + estimated hours required)");

        MapTransition(group, "assign", AssignWorkOrder,
            "AssignWorkOrder", "Assign internal technician or external contractor (Reported/Scheduled only — not an FSM transition)");

        MapTransition(group, "start", StartWorkOrder,
            "StartWorkOrder", "FSM: Scheduled → InProgress (assignment required; empty body)");

        MapTransition(group, "complete", CompleteWorkOrder,
            "CompleteWorkOrder", "FSM: InProgress → Completed (actual hours required; terminal)");

        MapTransition(group, "postpone", PostponeWorkOrder,
            "PostponeWorkOrder", "FSM: Scheduled/InProgress → Postponed (reason required)");

        MapTransition(group, "reject", RejectWorkOrder,
            "RejectWorkOrder", "FSM: Reported/Scheduled → Rejected (reason required)");

        MapTransition(group, "reopen", ReopenWorkOrder,
            "ReopenWorkOrder", "FSM: Postponed/Rejected → Reported (clears assignment/schedule/reasons; empty body)");

        return app;
    }

    /// <summary>
    /// Shared route metadata for the transition endpoints
    /// (PUT, fresh WorkOrderDto, 404/409/400 error contract).
    /// </summary>
    private static void MapTransition(
        RouteGroupBuilder group,
        string action,
        Delegate handler,
        string name,
        string summary)
    {
        group.MapPut($"/{{id:guid}}/{action}", handler)
            .WithName(name)
            .WithSummary(summary)
            .Produces<WorkOrderDto>(200)
            .Produces(400)
            .Produces(404)
            .Produces(409);
    }

    // ============ HANDLERS ============

    private static async Task<IResult> CreateWorkOrder(
        [FromBody] CreateWorkOrderRequestDto request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        if (!Enum.TryParse<WorkOrderType>(request.Type, ignoreCase: true, out var type))
        {
            return Results.BadRequest(new { error = "Invalid work order type" });
        }

        if (!Enum.TryParse<WorkOrderPriority>(request.Priority, ignoreCase: true, out var priority))
        {
            return Results.BadRequest(new { error = "Invalid work order priority" });
        }

        var command = new ReportWorkOrderCommand(
            AssetId: new AssetId(request.AssetId),
            Type: type,
            Priority: priority,
            Title: request.Title,
            Description: request.Description,
            TenantId: tenantId
        );

        var result = await mediator.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Results.Created($"/api/maintenance/work-orders/{result.Value.Value}", new { workOrderId = result.Value.Value })
            : Results.BadRequest(result.Errors);
    }

    private static async Task<IResult> GetWorkOrder(
        [FromRoute] Guid id,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var query = new GetWorkOrderQuery(
            WorkOrderId: new WorkOrderId(id),
            TenantId: tenantId
        );
        var result = await mediator.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Results.Ok(result.Value)
            : Results.NotFound();
    }

    private static async Task<IResult> ListWorkOrders(
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var query = new GetWorkOrdersQuery(
            Status: null,
            Type: null,
            Page: page,
            PageSize: pageSize,
            TenantId: tenantId
        );

        var result = await mediator.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Results.Ok(result.Value)
            : Results.BadRequest(result.Errors);
    }

    private static async Task<IResult> ListWorkOrdersByAsset(
        [FromRoute] Guid assetId,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        // Use GetAssetCurrentWorkOrdersQuery to get work orders for specific asset
        var query = new GetAssetCurrentWorkOrdersQuery(
            AssetId: new AssetId(assetId),
            TenantId: tenantId
        );

        var result = await mediator.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Results.Ok(result.Value)
            : Results.BadRequest(result.Errors);
    }

    private static async Task<IResult> AddWorkOrderPart(
        [FromRoute] Guid id,
        [FromBody] AddWorkOrderPartRequestDto request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var command = new AddWorkOrderPartCommand(
            WorkOrderId: new WorkOrderId(id),
            PartName: request.PartName,
            Quantity: request.Quantity,
            UnitPrice: request.UnitPrice,
            TenantId: tenantId
        );

        var result = await mediator.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Results.StatusCode(201)
            : Results.BadRequest(result.Errors);
    }

    // ── FSM transition handlers ──

    private static async Task<IResult> ScheduleWorkOrder(
        [FromRoute] Guid id,
        [FromBody] ScheduleWorkOrderRequestDto request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var command = new ScheduleWorkOrderCommand(
            WorkOrderId: new WorkOrderId(id),
            ScheduledStart: request.ScheduledAt,
            EstimatedHours: request.EstimatedHours,
            TenantId: tenantId
        );

        var result = await mediator.Send(command, ct).ConfigureAwait(false);
        return ToTransitionResult(result);
    }

    private static async Task<IResult> AssignWorkOrder(
        [FromRoute] Guid id,
        [FromBody] AssignWorkOrderRequestDto request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        if (!Enum.TryParse<AssignmentType>(request.AssignmentType, ignoreCase: true, out var assignmentType))
        {
            return Results.BadRequest(new { error = "Invalid assignment type" });
        }

        var command = new AssignWorkOrderCommand(
            WorkOrderId: new WorkOrderId(id),
            AssignedTo: request.AssignedTo,
            AssignmentType: assignmentType,
            TenantId: tenantId
        );

        var result = await mediator.Send(command, ct).ConfigureAwait(false);
        return ToTransitionResult(result);
    }

    private static async Task<IResult> StartWorkOrder(
        [FromRoute] Guid id,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        // No body: RequiresDowntime is fixed at creation time on the aggregate (portal contract)
        var command = new StartWorkOrderCommand(
            WorkOrderId: new WorkOrderId(id),
            TenantId: tenantId
        );

        var result = await mediator.Send(command, ct).ConfigureAwait(false);
        return ToTransitionResult(result);
    }

    private static async Task<IResult> CompleteWorkOrder(
        [FromRoute] Guid id,
        [FromBody] CompleteWorkOrderRequestDto request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var command = new CompleteWorkOrderCommand(
            WorkOrderId: new WorkOrderId(id),
            ActualHours: request.ActualHours,
            CompletionNote: request.CompletionNote,
            TenantId: tenantId
        );

        var result = await mediator.Send(command, ct).ConfigureAwait(false);
        return ToTransitionResult(result);
    }

    private static async Task<IResult> PostponeWorkOrder(
        [FromRoute] Guid id,
        [FromBody] PostponeWorkOrderRequestDto request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var command = new PostponeWorkOrderCommand(
            WorkOrderId: new WorkOrderId(id),
            Reason: request.Reason,
            TenantId: tenantId
        );

        var result = await mediator.Send(command, ct).ConfigureAwait(false);
        return ToTransitionResult(result);
    }

    private static async Task<IResult> RejectWorkOrder(
        [FromRoute] Guid id,
        [FromBody] RejectWorkOrderRequestDto request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var command = new RejectWorkOrderCommand(
            WorkOrderId: new WorkOrderId(id),
            Reason: request.Reason,
            TenantId: tenantId
        );

        var result = await mediator.Send(command, ct).ConfigureAwait(false);
        return ToTransitionResult(result);
    }

    private static async Task<IResult> ReopenWorkOrder(
        [FromRoute] Guid id,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        // No body: reopen carries no reason (portal contract)
        var command = new ReopenWorkOrderCommand(
            WorkOrderId: new WorkOrderId(id),
            TenantId: tenantId
        );

        var result = await mediator.Send(command, ct).ConfigureAwait(false);
        return ToTransitionResult(result);
    }

    /// <summary>
    /// Shared Result → HTTP mapping for the transition endpoints
    /// (200 fresh DTO / 404 not found / 409 state conflict / 400 invalid input).
    /// </summary>
    private static IResult ToTransitionResult(Result<WorkOrderDto> result)
    {
        return result.Status switch
        {
            ResultStatus.Ok => Results.Ok(result.Value),
            ResultStatus.NotFound => Results.NotFound(),
            ResultStatus.Conflict => Results.Conflict(new { Error = result.Errors.FirstOrDefault() ?? "State conflict" }),
            ResultStatus.Invalid => Results.BadRequest(new { Error = result.ValidationErrors.FirstOrDefault()?.ErrorMessage ?? "Invalid request" }),
            _ => Results.BadRequest(new { Error = result.Errors.FirstOrDefault() ?? "Request failed" })
        };
    }
}

/// <summary>
/// Request DTOs for WorkOrder operations.
/// </summary>
public record CreateWorkOrderRequestDto(
    Guid AssetId,
    string Type,
    string Priority,
    string Title,
    string Description
);

public record AddWorkOrderPartRequestDto(
    string PartName,
    int Quantity,
    decimal UnitPrice
);

public record ScheduleWorkOrderRequestDto(
    DateTime ScheduledAt,
    decimal EstimatedHours
);

public record AssignWorkOrderRequestDto(
    string AssignmentType,
    Guid AssignedTo
);

public record CompleteWorkOrderRequestDto(
    decimal ActualHours,
    string? CompletionNote
);

public record PostponeWorkOrderRequestDto(
    string Reason
);

public record RejectWorkOrderRequestDto(
    string Reason
);
