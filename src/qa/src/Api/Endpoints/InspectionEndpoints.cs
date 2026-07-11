using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
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
/// </summary>
public static class InspectionEndpoints
{
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
            .WithSummary("Start inspection (FSM transition: Planned → InProgress)")
            .Produces(204)
            .Produces(404)
            .ProducesValidationProblem();

        group.MapPost("/{id:guid}/complete/pass", CompleteInspectionPass)
            .WithName("CompleteInspectionPass")
            .WithSummary("Complete inspection with Pass result (FSM transition: InProgress → Completed)")
            .Produces(204)
            .Produces(404)
            .ProducesValidationProblem();

        group.MapPost("/{id:guid}/complete/fail", CompleteInspectionFail)
            .WithName("CompleteInspectionFail")
            .WithSummary("Complete inspection with Fail result (FSM transition: InProgress → Completed)")
            .Produces(204)
            .Produces(404)
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
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var command = new StartInspectionCommand(
            InspectionId: new InspectionId(id),
            TenantId: tenantId
        );

        var result = await mediator.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Results.NoContent()
            : Results.BadRequest(result.Errors);
    }

    private static async Task<IResult> CompleteInspectionPass(
        [FromRoute] Guid id,
        [FromBody] CompleteInspectionPassRequestDto request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var command = new CompleteInspectionWithPassCommand(
            InspectionId: new InspectionId(id),
            Notes: request.Notes,
            TenantId: tenantId
        );

        var result = await mediator.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Results.NoContent()
            : Results.BadRequest(result.Errors);
    }

    private static async Task<IResult> CompleteInspectionFail(
        [FromRoute] Guid id,
        [FromBody] CompleteInspectionFailRequestDto request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        // Validate all failure note types upfront
        if (request.FailureNotes != null)
        {
            foreach (var fn in request.FailureNotes)
            {
                if (!Enum.TryParse<FailureType>(fn.FailureType, ignoreCase: true, out _))
                {
                    return Results.BadRequest(new { error = "Invalid failure type" });
                }
            }
        }

        var failureNotes = request.FailureNotes?
            .Select(fn => new FailureNoteInput(
                FailureType: Enum.Parse<FailureType>(fn.FailureType, ignoreCase: true),
                Description: fn.Description,
                PhotoUrl: fn.PhotoUrl
            ))
            .ToList();

        var command = new CompleteInspectionWithFailCommand(
            InspectionId: new InspectionId(id),
            FailureNotes: failureNotes ?? new(),
            Notes: request.Notes,
            TenantId: tenantId
        );

        var result = await mediator.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Results.NoContent()
            : Results.BadRequest(result.Errors);
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
