namespace SpaceOS.Modules.Kontrolling.Api.Endpoints;

using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using SpaceOS.Modules.Kontrolling.Application.Commands.AddOverheadRule;
using SpaceOS.Modules.Kontrolling.Application.Commands.RemoveOverheadRule;
using SpaceOS.Modules.Kontrolling.Application.Commands.SetOverheadConfig;
using SpaceOS.Modules.Kontrolling.Application.Commands.UpdateOverheadConfig;
using SpaceOS.Modules.Kontrolling.Application.DTOs;
using SpaceOS.Modules.Kontrolling.Application.Portfolio;
using SpaceOS.Modules.Kontrolling.Application.Queries;
using SpaceOS.Modules.Kontrolling.Domain.Enums;

/// <summary>
/// The Kontrolling module's REST surface (minimal API).
/// </summary>
/// <remarks>
/// <para>
/// Two groups of endpoints live here:
/// </para>
/// <para>
/// 1. THE CONTROLLING READ MODEL — portfolio, project detail and cost
/// calculation, variance, and the cost-adjustment write path. These implement
/// the frozen client contract (portal <c>modules/controlling</c>) exactly:
/// business-key project ids, flat numbers, fractional percentages, Hungarian
/// category keys. Everything is calculated per request; nothing is stored.
/// </para>
/// <para>
/// 2. OVERHEAD CONFIGURATION — the tenant's overhead allocation settings.
/// The client contract does not cover these, so they keep the module's native
/// shape.
/// </para>
/// <para>
/// Note there are no transition endpoints: the project lifecycle is a LABEL
/// reported from the project master data, not a state machine this module
/// drives. See <see cref="ProjectLifecycleStatus"/>.
/// </para>
/// </remarks>
public static class KontrollingEndpoints
{
    /// <summary>Tenant scope of the request (EHS/QA/Maintenance precedent).</summary>
    private const string TenantHeader = "X-Tenant-Id";

    /// <summary>The acting user, recorded on audit fields.</summary>
    private const string UserHeader = "X-User-Id";

    /// <summary>Maps the Kontrolling endpoints onto the host.</summary>
    public static IEndpointRouteBuilder MapKontrollingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/kontrolling")
            .WithTags("Kontrolling")
            .RequireAuthorization();

        MapPortfolioEndpoints(group);
        MapCostAdjustmentEndpoints(group);
        MapOverheadConfigEndpoints(group);

        return app;
    }

    // ============ CONTROLLING READ MODEL ============

    private static void MapPortfolioEndpoints(IEndpointRouteBuilder group)
    {
        group.MapGet("/projects", ListProjects)
            .WithName("ListControllingProjects")
            .WithSummary("Portfolio list with the calculated cost roll-up, newest first")
            .Produces<IReadOnlyList<ProjectListItemDto>>(200)
            .ProducesProblem(400);

        group.MapGet("/projects/{id}", GetProject)
            .WithName("GetControllingProject")
            .WithSummary("Project detail: master data and cost lines")
            .Produces<ProjectDetailDto>(200)
            .ProducesProblem(404);

        group.MapGet("/projects/{id}/cost-calculation", GetProjectCalculation)
            .WithName("GetProjectCostCalculation")
            .WithSummary("Project cost calculation: EAC, variance, margins (never stored)")
            .Produces<ProjectCalculationDto>(200)
            .ProducesProblem(404);

        group.MapGet("/portfolio/cost-calculation", GetPortfolioSummary)
            .WithName("GetPortfolioCostCalculation")
            .WithSummary("Executive portfolio roll-up (never stored)")
            .Produces<PortfolioSummaryViewDto>(200);

        group.MapGet("/variance", GetVariance)
            .WithName("GetVarianceAnalysis")
            .WithSummary("Portfolio-wide plan vs. actual by category, with project drill-down")
            .Produces<IReadOnlyList<VarianceRowDto>>(200);
    }

    private static async Task<IResult> ListProjects(
        [FromServices] IMediator mediator,
        [FromHeader(Name = TenantHeader)] Guid tenantId,
        CancellationToken ct,
        [FromQuery] string? status = null)
    {
        // Query-string enums bypass the JSON converters, so the wire map is
        // applied by hand here — an unknown label is a bad request, not an
        // empty list, which would silently look like "no such projects".
        ProjectLifecycleStatus? parsed = null;
        if (status is not null)
        {
            if (!KontrollingWire.Status.TryParse(status, out var value))
            {
                return KontrollingEndpointResults.BadRequest(
                    $"Ismeretlen projekt-státusz: '{status}'. " +
                    $"Lehetséges értékek: {string.Join(", ", KontrollingWire.Status.Spellings)}.");
            }

            parsed = value;
        }

        return Results.Ok(await mediator.Send(new ListProjectsQuery(tenantId, parsed), ct));
    }

    private static async Task<IResult> GetProject(
        [FromRoute] string id,
        [FromServices] IMediator mediator,
        [FromHeader(Name = TenantHeader)] Guid tenantId,
        CancellationToken ct)
    {
        var result = await mediator.Send(new GetProjectQuery(tenantId, id), ct);
        return result.IsSuccess
            ? Results.Ok(result.Value)
            : KontrollingEndpointResults.Failure(result);
    }

    private static async Task<IResult> GetProjectCalculation(
        [FromRoute] string id,
        [FromServices] IMediator mediator,
        [FromHeader(Name = TenantHeader)] Guid tenantId,
        CancellationToken ct)
    {
        var result = await mediator.Send(new GetProjectCalculationQuery(tenantId, id), ct);
        return result.IsSuccess
            ? Results.Ok(result.Value)
            : KontrollingEndpointResults.Failure(result);
    }

    private static async Task<IResult> GetPortfolioSummary(
        [FromServices] IMediator mediator,
        [FromHeader(Name = TenantHeader)] Guid tenantId,
        CancellationToken ct)
        => Results.Ok(await mediator.Send(new GetPortfolioSummaryViewQuery(tenantId), ct));

    private static async Task<IResult> GetVariance(
        [FromServices] IMediator mediator,
        [FromHeader(Name = TenantHeader)] Guid tenantId,
        CancellationToken ct)
        => Results.Ok(await mediator.Send(new GetVarianceRowsQuery(tenantId), ct));

    // ============ COST ADJUSTMENTS ============

    private static void MapCostAdjustmentEndpoints(IEndpointRouteBuilder group)
    {
        group.MapGet("/cost-adjustments", ListCostAdjustments)
            .WithName("ListCostAdjustments")
            .WithSummary("Cost adjustments, newest first, optionally filtered to one project")
            .Produces<IReadOnlyList<CostAdjustmentViewDto>>(200)
            .ProducesProblem(404);

        group.MapPost("/cost-adjustments", CreateCostAdjustment)
            .WithName("CreateCostAdjustment")
            .WithSummary("Record a cost adjustment; returns the created adjustment")
            .Produces<CostAdjustmentViewDto>(201)
            .ProducesProblem(400)
            .ProducesProblem(404);

        group.MapDelete("/cost-adjustments/{id:guid}", DeleteCostAdjustment)
            .WithName("DeleteCostAdjustment")
            .WithSummary("Soft-delete a cost adjustment (the audit trail is preserved)")
            .Produces(204)
            .ProducesProblem(404)
            .ProducesProblem(409);
    }

    private static async Task<IResult> ListCostAdjustments(
        [FromServices] IMediator mediator,
        [FromHeader(Name = TenantHeader)] Guid tenantId,
        CancellationToken ct,
        [FromQuery] string? projectId = null)
    {
        var result = await mediator.Send(new ListAdjustmentsQuery(tenantId, projectId), ct);
        return result.IsSuccess
            ? Results.Ok(result.Value)
            : KontrollingEndpointResults.Failure(result);
    }

    private static async Task<IResult> CreateCostAdjustment(
        [FromBody] CreateCostAdjustmentRequest request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = TenantHeader)] Guid tenantId,
        [FromHeader(Name = UserHeader)] Guid userId,
        CancellationToken ct)
    {
        var command = new CreateAdjustmentCommand(
            TenantId: tenantId,
            ProjectCode: request.ProjectId,
            Category: request.Category,
            Amount: request.Amount,
            Scope: request.Scope,
            Reason: request.Reason,
            // The authenticated caller is the audit user; a client-supplied
            // name could not be trusted as an audit record anyway.
            CreatedBy: userId);

        var result = await mediator.Send(command, ct);

        // A fresh DTO, not just the id: the client applies it optimistically.
        return result.IsSuccess
            ? Results.Created($"/api/kontrolling/cost-adjustments/{result.Value.Id}", result.Value)
            : KontrollingEndpointResults.Failure(result);
    }

    private static async Task<IResult> DeleteCostAdjustment(
        [FromRoute] Guid id,
        [FromServices] IMediator mediator,
        [FromHeader(Name = TenantHeader)] Guid tenantId,
        [FromHeader(Name = UserHeader)] Guid userId,
        CancellationToken ct)
    {
        var result = await mediator.Send(new DeleteAdjustmentCommand(tenantId, id, userId), ct);
        return result.IsSuccess
            ? Results.NoContent()
            : KontrollingEndpointResults.Failure(result);
    }

    // ============ OVERHEAD CONFIG ============

    private static void MapOverheadConfigEndpoints(IEndpointRouteBuilder group)
    {
        group.MapGet("/overhead-config", GetOverheadConfig)
            .WithName("GetOverheadConfig")
            .WithSummary("Get the tenant's overhead configuration")
            .Produces<OverheadConfigDto>(200)
            .ProducesProblem(404);

        group.MapPut("/overhead-config", SetOverheadConfig)
            .WithName("SetOverheadConfig")
            .WithSummary("Create or update the overhead configuration (upsert)")
            .Produces(200)
            .ProducesProblem(400);

        group.MapPatch("/overhead-config", UpdateOverheadConfig)
            .WithName("UpdateOverheadConfig")
            .WithSummary("Update the overhead configuration")
            .Produces(200)
            .ProducesProblem(400)
            .ProducesProblem(404);

        group.MapPost("/overhead-config/rules", AddOverheadRule)
            .WithName("AddOverheadRule")
            .WithSummary("Add an overhead rule to the configuration")
            .Produces(201)
            .ProducesProblem(400)
            .ProducesProblem(404);

        group.MapDelete("/overhead-config/rules/{category}", RemoveOverheadRule)
            .WithName("RemoveOverheadRule")
            .WithSummary("Remove an overhead rule from the configuration")
            .Produces(204)
            .ProducesProblem(400)
            .ProducesProblem(404);
    }

    private static async Task<IResult> GetOverheadConfig(
        [FromServices] IMediator mediator,
        [FromHeader(Name = TenantHeader)] Guid tenantId,
        CancellationToken ct)
    {
        var result = await mediator.Send(new GetOverheadConfigQuery(tenantId), ct);
        return result.IsSuccess
            ? Results.Ok(result.Value)
            : KontrollingEndpointResults.Failure(result);
    }

    private static async Task<IResult> SetOverheadConfig(
        [FromBody] SetOverheadConfigRequest request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = TenantHeader)] Guid tenantId,
        [FromHeader(Name = UserHeader)] Guid userId,
        CancellationToken ct)
    {
        var result = await mediator.Send(
            new SetOverheadConfigCommand(tenantId, request.AllocationMethod, request.OverheadRate, userId),
            ct);

        return result.IsSuccess
            ? Results.Ok(new { overheadConfigId = result.Value })
            : KontrollingEndpointResults.Failure(result);
    }

    private static async Task<IResult> UpdateOverheadConfig(
        [FromBody] UpdateOverheadConfigRequest request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = TenantHeader)] Guid tenantId,
        [FromHeader(Name = UserHeader)] Guid userId,
        CancellationToken ct)
    {
        var result = await mediator.Send(
            new UpdateOverheadConfigCommand(tenantId, request.AllocationMethod, request.OverheadRate, userId),
            ct);

        return result.IsSuccess
            ? Results.Ok(new { overheadConfigId = result.Value })
            : KontrollingEndpointResults.Failure(result);
    }

    private static async Task<IResult> AddOverheadRule(
        [FromBody] AddOverheadRuleRequest request,
        [FromServices] IMediator mediator,
        [FromHeader(Name = TenantHeader)] Guid tenantId,
        [FromHeader(Name = UserHeader)] Guid userId,
        CancellationToken ct)
    {
        var result = await mediator.Send(
            new AddOverheadRuleCommand(tenantId, request.Category, request.Exclude, request.CustomRate, userId),
            ct);

        return result.IsSuccess
            ? Results.Created("/api/kontrolling/overhead-config", new { overheadConfigId = result.Value })
            : KontrollingEndpointResults.Failure(result);
    }

    private static async Task<IResult> RemoveOverheadRule(
        [FromRoute] string category,
        [FromServices] IMediator mediator,
        [FromHeader(Name = TenantHeader)] Guid tenantId,
        [FromHeader(Name = UserHeader)] Guid userId,
        CancellationToken ct)
    {
        if (!KontrollingWire.Category.TryParse(category, out var costCategory))
        {
            return KontrollingEndpointResults.BadRequest(
                $"Ismeretlen költség-kategória: '{category}'. " +
                $"Lehetséges értékek: {string.Join(", ", KontrollingWire.Category.Spellings)}.");
        }

        var result = await mediator.Send(
            new RemoveOverheadRuleCommand(tenantId, costCategory, userId), ct);

        return result.IsSuccess
            ? Results.NoContent()
            : KontrollingEndpointResults.Failure(result);
    }
}

// ============ REQUEST DTOs ============

/// <summary>Payload of the cost-adjustment write path.</summary>
/// <param name="ProjectId">
/// Project business key. Required for <see cref="AdjustmentScope.Project"/>,
/// must be absent for <see cref="AdjustmentScope.Portfolio"/>.
/// </param>
/// <param name="Amount">Signed (negative = credit); zero is rejected.</param>
/// <param name="Reason">Mandatory — the audit trail.</param>
public sealed record CreateCostAdjustmentRequest(
    string? ProjectId,
    CostCategory Category,
    decimal Amount,
    AdjustmentScope Scope,
    string Reason);

/// <summary>Payload of the overhead-config upsert.</summary>
public sealed record SetOverheadConfigRequest(
    OverheadAllocationMethod AllocationMethod,
    decimal OverheadRate);

/// <summary>Payload of the overhead-config update.</summary>
public sealed record UpdateOverheadConfigRequest(
    OverheadAllocationMethod AllocationMethod,
    decimal OverheadRate);

/// <summary>Payload of the overhead-rule create.</summary>
public sealed record AddOverheadRuleRequest(
    CostCategory Category,
    bool Exclude,
    decimal? CustomRate);
