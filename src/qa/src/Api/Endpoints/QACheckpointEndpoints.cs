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
/// QACheckpoint API endpoints using Minimal API pattern.
/// </summary>
public static class QACheckpointEndpoints
{
    /// <summary>
    /// Maps QACheckpoint endpoints to the application.
    /// </summary>
    public static IEndpointRouteBuilder MapQACheckpointEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/qa/checkpoints")
            .WithTags("QA - Checkpoints")
            .RequireAuthorization();

        group.MapPost("", CreateQACheckpoint)
            .WithName("CreateQACheckpoint")
            .WithSummary("Create a new QA checkpoint")
            .Produces<Guid>(201)
            .ProducesValidationProblem();

        group.MapGet("/{id:guid}", GetQACheckpoint)
            .WithName("GetQACheckpoint")
            .WithSummary("Get QA checkpoint by ID (includes inspection criteria)")
            .Produces<QACheckpointDto>(200)
            .Produces(404);

        group.MapGet("", ListQACheckpoints)
            .WithName("ListQACheckpoints")
            .WithSummary("List all QA checkpoints (tenant-filtered)")
            .Produces<QACheckpointListDto[]>(200);

        group.MapPut("/{id:guid}", UpdateQACheckpoint)
            .WithName("UpdateQACheckpoint")
            .WithSummary("Update QA checkpoint")
            .Produces(204)
            .Produces(404)
            .ProducesValidationProblem();

        group.MapPut("/{id:guid}/criteria", UpdateQACheckpointCriteria)
            .WithName("UpdateQACheckpointCriteria")
            .WithSummary("Update checkpoint criteria (owned collection)")
            .Produces(204)
            .Produces(404)
            .ProducesValidationProblem();

        return app;
    }

    // ============ HANDLERS ============

    private static async Task<IResult> CreateQACheckpoint(
        [FromBody] CreateQACheckpointRequestDto request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        if (!Enum.TryParse<CheckpointType>(request.CheckpointType, ignoreCase: true, out var checkpointType))
        {
            return Results.BadRequest(new { error = "Invalid checkpoint type" });
        }

        if (!Enum.TryParse<CriticalLevel>(request.CriticalLevel, ignoreCase: true, out var criticalLevel))
        {
            return Results.BadRequest(new { error = "Invalid critical level" });
        }

        var command = new CreateQACheckpointCommand(
            Name: request.Name,
            CheckpointType: checkpointType,
            CriticalLevel: criticalLevel,
            Description: request.Description,
            TenantId: tenantId
        );

        var result = await mediator.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Results.Created($"/api/qa/checkpoints/{result.Value.Value}", new { checkpointId = result.Value.Value })
            : Results.BadRequest(result.Errors);
    }

    private static async Task<IResult> GetQACheckpoint(
        [FromRoute] Guid id,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var query = new GetQACheckpointQuery(
            CheckpointId: new QACheckpointId(id),
            TenantId: tenantId
        );
        var result = await mediator.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Results.Ok(result.Value)
            : Results.NotFound();
    }

    private static async Task<IResult> ListQACheckpoints(
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct = default)
    {
        var query = new GetQACheckpointsQuery(TenantId: tenantId);

        var result = await mediator.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Results.Ok(result.Value)
            : Results.BadRequest(result.Errors);
    }

    private static async Task<IResult> UpdateQACheckpoint(
        [FromRoute] Guid id,
        [FromBody] UpdateQACheckpointRequestDto request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        if (!Enum.TryParse<CriticalLevel>(request.CriticalLevel, ignoreCase: true, out var criticalLevel))
        {
            return Results.BadRequest(new { error = "Invalid critical level" });
        }

        var command = new UpdateQACheckpointCommand(
            CheckpointId: new QACheckpointId(id),
            Name: request.Name,
            CriticalLevel: criticalLevel,
            Description: request.Description,
            TenantId: tenantId
        );

        var result = await mediator.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Results.NoContent()
            : Results.BadRequest(result.Errors);
    }

    private static async Task<IResult> UpdateQACheckpointCriteria(
        [FromRoute] Guid id,
        [FromBody] UpdateQACheckpointCriteriaRequestDto request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var command = new UpdateQACheckpointCriteriaCommand(
            CheckpointId: id,
            Criteria: request.Criteria,
            TenantId: tenantId
        );

        var result = await mediator.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Results.NoContent()
            : Results.BadRequest(result.Errors);
    }
}

/// <summary>
/// Request DTOs for QACheckpoint operations.
/// </summary>
public record CreateQACheckpointRequestDto(
    string Name,
    string CheckpointType,
    string CriticalLevel,
    string? Description
);

public record UpdateQACheckpointRequestDto(
    string Name,
    string CriticalLevel,
    string? Description
);

public record UpdateQACheckpointCriteriaRequestDto(
    List<CriteriaItemForUpdate> Criteria
);
