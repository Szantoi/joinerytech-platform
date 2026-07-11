using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using SpaceOS.Modules.Kontrolling.Application.Commands.AddOverheadRule;
using SpaceOS.Modules.Kontrolling.Application.Commands.CreateCostAdjustment;
using SpaceOS.Modules.Kontrolling.Application.Commands.DeleteCostAdjustment;
using SpaceOS.Modules.Kontrolling.Application.Commands.RemoveOverheadRule;
using SpaceOS.Modules.Kontrolling.Application.Commands.SetOverheadConfig;
using SpaceOS.Modules.Kontrolling.Application.Commands.UpdateOverheadConfig;
using SpaceOS.Modules.Kontrolling.Application.DTOs;
using SpaceOS.Modules.Kontrolling.Application.Queries;
using SpaceOS.Modules.Kontrolling.Application.Queries.GetCostAdjustment;
using SpaceOS.Modules.Kontrolling.Application.Queries.GetPortfolioCostAdjustments;
using SpaceOS.Modules.Kontrolling.Application.Queries.ListCostAdjustmentsByProject;
using SpaceOS.Modules.Kontrolling.Domain.Enums;

namespace SpaceOS.Modules.Kontrolling.Api.Endpoints;

/// <summary>
/// Kontrolling API endpoints using Minimal API pattern.
/// </summary>
public static class KontrollingEndpoints
{
    /// <summary>
    /// Maps Kontrolling endpoints to the application.
    /// </summary>
    public static IEndpointRouteBuilder MapKontrollingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/kontrolling")
            .WithTags("Kontrolling")
            .RequireAuthorization();

        // ============ OVERHEAD CONFIG ENDPOINTS ============

        group.MapGet("/overhead-config", GetOverheadConfig)
            .WithName("GetOverheadConfig")
            .WithSummary("Get overhead configuration for tenant")
            .Produces<OverheadConfigDto>(200)
            .Produces(404);

        group.MapPut("/overhead-config", SetOverheadConfig)
            .WithName("SetOverheadConfig")
            .WithSummary("Create or update overhead configuration (upsert)")
            .Produces<Guid>(200)
            .ProducesValidationProblem();

        group.MapPatch("/overhead-config", UpdateOverheadConfig)
            .WithName("UpdateOverheadConfig")
            .WithSummary("Update overhead configuration")
            .Produces<Guid>(200)
            .Produces(404)
            .ProducesValidationProblem();

        group.MapPost("/overhead-config/rules", AddOverheadRule)
            .WithName("AddOverheadRule")
            .WithSummary("Add overhead rule to configuration (owned collection)")
            .Produces<Guid>(201)
            .Produces(404)
            .ProducesValidationProblem();

        group.MapDelete("/overhead-config/rules/{category}", RemoveOverheadRule)
            .WithName("RemoveOverheadRule")
            .WithSummary("Remove overhead rule from configuration")
            .Produces(204)
            .Produces(404);

        // ============ COST CALCULATION ENDPOINTS (CALCULATED - NOT STORED) ============

        group.MapGet("/projects/{projectId:guid}/cost-calculation", CalculateProjectCost)
            .WithName("CalculateProjectCost")
            .WithSummary("Calculate project cost (EAC, Variance, Margin) - NOT stored in DB")
            .Produces<EACCalculationDto>(200)
            .Produces(404);

        group.MapGet("/portfolio/cost-calculation", CalculatePortfolioCost)
            .WithName("CalculatePortfolioCost")
            .WithSummary("Calculate portfolio-level cost summary - NOT stored in DB")
            .Produces<PortfolioSummaryDto>(200);

        // ============ COST ADJUSTMENT ENDPOINTS ============

        group.MapPost("/cost-adjustments", CreateCostAdjustment)
            .WithName("CreateCostAdjustment")
            .WithSummary("Create cost adjustment")
            .Produces<Guid>(201)
            .ProducesValidationProblem();

        group.MapGet("/cost-adjustments/{id:guid}", GetCostAdjustment)
            .WithName("GetCostAdjustment")
            .WithSummary("Get cost adjustment by ID")
            .Produces<CostAdjustmentDto>(200)
            .Produces(404);

        group.MapGet("/projects/{projectId:guid}/cost-adjustments", ListCostAdjustmentsByProject)
            .WithName("ListCostAdjustmentsByProject")
            .WithSummary("List cost adjustments for a project")
            .Produces<IReadOnlyList<CostAdjustmentListDto>>(200);

        group.MapGet("/portfolio/cost-adjustments", GetPortfolioCostAdjustments)
            .WithName("GetPortfolioCostAdjustments")
            .WithSummary("Get portfolio-level cost adjustments")
            .Produces<IReadOnlyList<CostAdjustmentListDto>>(200);

        group.MapDelete("/cost-adjustments/{id:guid}", DeleteCostAdjustment)
            .WithName("DeleteCostAdjustment")
            .WithSummary("Soft-delete cost adjustment")
            .Produces(204)
            .Produces(404);

        return app;
    }

    // ============ OVERHEAD CONFIG HANDLERS ============

    private static async Task<IResult> GetOverheadConfig(
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var query = new GetOverheadConfigQuery(tenantId);
        var result = await mediator.Send(query, ct);

        return result.IsSuccess
            ? Results.Ok(result.Value)
            : Results.NotFound(new { error = result.Errors });
    }

    private static async Task<IResult> SetOverheadConfig(
        [FromBody] SetOverheadConfigRequest request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        [FromHeader(Name = "X-User-Id")] Guid userId,
        CancellationToken ct)
    {
        var command = new SetOverheadConfigCommand(
            TenantId: tenantId,
            Method: request.AllocationMethod,
            Rate: request.OverheadRate,
            UpdatedBy: userId
        );

        var result = await mediator.Send(command, ct);

        return result.IsSuccess
            ? Results.Ok(new { overheadConfigId = result.Value })
            : Results.BadRequest(result.Errors);
    }

    private static async Task<IResult> UpdateOverheadConfig(
        [FromBody] UpdateOverheadConfigRequest request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        [FromHeader(Name = "X-User-Id")] Guid userId,
        CancellationToken ct)
    {
        var command = new UpdateOverheadConfigCommand(
            TenantId: tenantId,
            Method: request.AllocationMethod,
            Rate: request.OverheadRate,
            UpdatedBy: userId
        );

        var result = await mediator.Send(command, ct);

        return result.IsSuccess
            ? Results.Ok(new { overheadConfigId = result.Value })
            : result.Status == Ardalis.Result.ResultStatus.NotFound
                ? Results.NotFound(new { error = result.Errors })
                : Results.BadRequest(result.Errors);
    }

    private static async Task<IResult> AddOverheadRule(
        [FromBody] AddOverheadRuleRequest request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        [FromHeader(Name = "X-User-Id")] Guid userId,
        CancellationToken ct)
    {
        var command = new AddOverheadRuleCommand(
            TenantId: tenantId,
            Category: request.Category,
            Exclude: request.Exclude,
            CustomRate: request.CustomRate,
            UpdatedBy: userId
        );

        var result = await mediator.Send(command, ct);

        return result.IsSuccess
            ? Results.Created($"/api/kontrolling/overhead-config", new { overheadConfigId = result.Value })
            : result.Status == Ardalis.Result.ResultStatus.NotFound
                ? Results.NotFound(new { error = result.Errors })
                : Results.BadRequest(result.Errors);
    }

    private static async Task<IResult> RemoveOverheadRule(
        [FromRoute] string category,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        [FromHeader(Name = "X-User-Id")] Guid userId,
        CancellationToken ct)
    {
        if (!Enum.TryParse<CostCategory>(category, ignoreCase: true, out var costCategory))
        {
            return Results.BadRequest(new { error = "Invalid cost category" });
        }

        var command = new RemoveOverheadRuleCommand(
            TenantId: tenantId,
            Category: costCategory,
            UpdatedBy: userId
        );

        var result = await mediator.Send(command, ct);

        return result.IsSuccess
            ? Results.NoContent()
            : result.Status == Ardalis.Result.ResultStatus.NotFound
                ? Results.NotFound(new { error = result.Errors })
                : Results.BadRequest(result.Errors);
    }

    // ============ COST CALCULATION HANDLERS (CALCULATED - NOT STORED) ============

    private static async Task<IResult> CalculateProjectCost(
        [FromRoute] Guid projectId,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        // Use GetEACCalculationQuery (existing calculated query)
        var query = new GetEACCalculationQuery(projectId, tenantId);
        var result = await mediator.Send(query, ct);

        return result.IsSuccess
            ? Results.Ok(result.Value)
            : Results.NotFound(new { error = result.Errors });
    }

    private static async Task<IResult> CalculatePortfolioCost(
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        // Use GetPortfolioSummaryQuery (existing portfolio calculation)
        var query = new GetPortfolioSummaryQuery(tenantId);
        var result = await mediator.Send(query, ct);

        return result.IsSuccess
            ? Results.Ok(result.Value)
            : Results.BadRequest(result.Errors);
    }

    // ============ COST ADJUSTMENT HANDLERS ============

    private static async Task<IResult> CreateCostAdjustment(
        [FromBody] CreateCostAdjustmentRequest request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        [FromHeader(Name = "X-User-Id")] Guid userId,
        CancellationToken ct)
    {
        var command = new CreateCostAdjustmentCommand(
            TenantId: tenantId,
            ProjectId: request.ProjectId,
            Category: request.Category,
            Amount: request.Amount,
            Currency: request.Currency ?? "HUF",
            Scope: request.Scope,
            Reason: request.Reason,
            CreatedByUserId: userId
        );

        var adjustmentId = await mediator.Send(command, ct);

        return Results.Created($"/api/kontrolling/cost-adjustments/{adjustmentId}", new { costAdjustmentId = adjustmentId });
    }

    private static async Task<IResult> GetCostAdjustment(
        [FromRoute] Guid id,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var query = new GetCostAdjustmentQuery(
            CostAdjustmentId: id,
            TenantId: tenantId
        );

        var result = await mediator.Send(query, ct);

        return result.IsSuccess
            ? Results.Ok(result.Value)
            : Results.NotFound(new { error = result.Errors });
    }

    private static async Task<IResult> ListCostAdjustmentsByProject(
        [FromRoute] Guid projectId,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var query = new ListCostAdjustmentsByProjectQuery(
            ProjectId: projectId,
            TenantId: tenantId
        );

        var result = await mediator.Send(query, ct);

        return result.IsSuccess
            ? Results.Ok(result.Value)
            : Results.BadRequest(result.Errors);
    }

    private static async Task<IResult> GetPortfolioCostAdjustments(
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        CancellationToken ct)
    {
        var query = new GetPortfolioCostAdjustmentsQuery(TenantId: tenantId);
        var result = await mediator.Send(query, ct);

        return result.IsSuccess
            ? Results.Ok(result.Value)
            : Results.BadRequest(result.Errors);
    }

    private static async Task<IResult> DeleteCostAdjustment(
        [FromRoute] Guid id,
        [FromServices] IMediator mediator,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        [FromHeader(Name = "X-User-Id")] Guid userId,
        CancellationToken ct)
    {
        var command = new DeleteCostAdjustmentCommand(
            AdjustmentId: id,
            TenantId: tenantId,
            DeletedBy: userId
        );

        var result = await mediator.Send(command, ct);

        return result.IsSuccess
            ? Results.NoContent()
            : result.Status == Ardalis.Result.ResultStatus.NotFound
                ? Results.NotFound(new { error = result.Errors })
                : Results.BadRequest(result.Errors);
    }
}

// ============ REQUEST DTOs ============

/// <summary>
/// Request DTO for SetOverheadConfig
/// </summary>
public record SetOverheadConfigRequest(
    OverheadAllocationMethod AllocationMethod,
    decimal OverheadRate
);

/// <summary>
/// Request DTO for UpdateOverheadConfig
/// </summary>
public record UpdateOverheadConfigRequest(
    OverheadAllocationMethod AllocationMethod,
    decimal OverheadRate
);

/// <summary>
/// Request DTO for AddOverheadRule
/// </summary>
public record AddOverheadRuleRequest(
    CostCategory Category,
    bool Exclude,
    decimal? CustomRate
);

/// <summary>
/// Request DTO for CreateCostAdjustment
/// </summary>
public record CreateCostAdjustmentRequest(
    Guid? ProjectId,
    CostCategory Category,
    decimal Amount,
    string? Currency,
    AdjustmentScope Scope,
    string Reason
);
