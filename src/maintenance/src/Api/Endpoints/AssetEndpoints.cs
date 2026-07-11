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
/// Asset API endpoints using Minimal API pattern.
/// </summary>
public static class AssetEndpoints
{
    /// <summary>
    /// Maps Asset endpoints to the application.
    /// </summary>
    public static IEndpointRouteBuilder MapAssetEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/maintenance/assets")
            .WithTags("Maintenance - Assets")
            .RequireAuthorization();

        group.MapPost("", CreateAsset)
            .WithName("CreateAsset")
            .WithSummary("Create a new asset")
            .Produces<Guid>(201)
            .ProducesValidationProblem();

        group.MapGet("/{id:guid}", GetAsset)
            .WithName("GetAsset")
            .WithSummary("Get asset by ID (includes maintenance plans)")
            .Produces<AssetDto>(200)
            .Produces(404);

        group.MapGet("", ListAssets)
            .WithName("ListAssets")
            .WithSummary("List all assets (paginated, tenant-filtered)")
            .Produces<AssetListDto[]>(200);

        group.MapPut("/{id:guid}/maintenance-plans", UpdateMaintenancePlan)
            .WithName("UpdateMaintenancePlan")
            .WithSummary("Add maintenance plan to asset (owned collection)")
            .Produces(204)
            .Produces(404)
            .ProducesValidationProblem();

        group.MapPost("/{id:guid}/retire", RetireAsset)
            .WithName("RetireAsset")
            .WithSummary("Retire an asset (mark as no longer in use)")
            .Produces(204)
            .Produces(404)
            .ProducesValidationProblem();

        return app;
    }

    // ============ HANDLERS ============

    private static async Task<IResult> CreateAsset(
        [FromBody] CreateAssetRequestDto request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        if (!Enum.TryParse<AssetKind>(request.Kind, ignoreCase: true, out var assetKind))
        {
            return Results.BadRequest(new { error = "Invalid asset kind" });
        }

        var command = new CreateAssetCommand(
            Kind: assetKind,
            Code: request.Code,
            Name: request.Name,
            Location: request.Location,
            TenantId: tenantId,
            FacilityId: request.FacilityId
        );

        // Note: CreateAssetCommand returns AssetId, facility needs to be created separately or via DDD aggregate
        // This matches domain-first architecture where Asset is created first

        var result = await mediator.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Results.Created($"/api/maintenance/assets/{result.Value.Value}", new { assetId = result.Value.Value })
            : Results.BadRequest(result.Errors);
    }

    private static async Task<IResult> GetAsset(
        [FromRoute] Guid id,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var query = new GetAssetQuery(
            AssetId: new AssetId(id),
            TenantId: tenantId
        );
        var result = await mediator.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Results.Ok(result.Value)
            : Results.NotFound();
    }

    private static async Task<IResult> ListAssets(
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var query = new GetAssetsQuery(
            Kind: null,
            Status: null,
            Page: page,
            PageSize: pageSize,
            TenantId: tenantId
        );

        var result = await mediator.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Results.Ok(result.Value)
            : Results.BadRequest(result.Errors);
    }

    private static async Task<IResult> UpdateMaintenancePlan(
        [FromRoute] Guid id,
        [FromBody] UpdateMaintenancePlanRequestDto request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        if (!Enum.TryParse<MaintenanceTrigger>(request.Trigger, ignoreCase: true, out var trigger))
        {
            return Results.BadRequest(new { error = "Invalid maintenance trigger" });
        }

        var command = new AddMaintenancePlanCommand(
            AssetId: new AssetId(id),
            Trigger: trigger,
            IntervalDays: request.IntervalDays,
            OperatingHoursThreshold: request.OperatingHoursThreshold,
            Description: request.Description,
            TenantId: tenantId
        );

        var result = await mediator.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Results.NoContent()
            : Results.BadRequest(result.Errors);
    }

    private static async Task<IResult> RetireAsset(
        [FromRoute] Guid id,
        [FromBody] RetireAssetRequestDto? request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var command = new RetireAssetCommand(
            AssetId: new AssetId(id),
            Reason: request?.Reason,
            TenantId: tenantId
        );

        var result = await mediator.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Results.NoContent()
            : Results.BadRequest(result.Errors);
    }
}

/// <summary>
/// Request DTOs for Asset operations.
/// </summary>
public record CreateAssetRequestDto(
    string Kind,
    string Code,
    string Name,
    string Location,
    Guid FacilityId
);

public record UpdateMaintenancePlanRequestDto(
    string Trigger,
    int? IntervalDays,
    decimal? OperatingHoursThreshold,
    string? Description
);

public record RetireAssetRequestDto(
    string? Reason
);
