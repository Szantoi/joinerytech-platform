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

namespace SpaceOS.Modules.Maintenance.Api.Endpoints;

/// <summary>
/// WorkOrder API endpoints using Minimal API pattern.
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
            .WithSummary("Create a new work order")
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

        group.MapPost("/{id:guid}/start", StartWorkOrder)
            .WithName("StartWorkOrder")
            .WithSummary("Start work order (FSM transition: Planned → InProgress)")
            .Produces(204)
            .Produces(404)
            .ProducesValidationProblem();

        group.MapPost("/{id:guid}/complete", CompleteWorkOrder)
            .WithName("CompleteWorkOrder")
            .WithSummary("Complete work order (FSM transition: InProgress → Completed)")
            .Produces(204)
            .Produces(404)
            .ProducesValidationProblem();

        return app;
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

    private static async Task<IResult> StartWorkOrder(
        [FromRoute] Guid id,
        [FromBody] StartWorkOrderRequestDto request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var command = new StartWorkOrderCommand(
            WorkOrderId: new WorkOrderId(id),
            RequiresDowntime: request.RequiresDowntime,
            TenantId: tenantId
        );

        var result = await mediator.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Results.NoContent()
            : Results.BadRequest(result.Errors);
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

        return result.IsSuccess
            ? Results.NoContent()
            : Results.BadRequest(result.Errors);
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

public record StartWorkOrderRequestDto(
    bool RequiresDowntime
);

public record CompleteWorkOrderRequestDto(
    decimal ActualHours,
    string? CompletionNote
);
