namespace SpaceOS.Modules.Kontrolling.Application.Portfolio;

using Ardalis.Result;
using MediatR;
using Microsoft.Extensions.Logging;
using SpaceOS.Modules.Kontrolling.Application.Services;
using SpaceOS.Modules.Kontrolling.Domain.Enums;

// Read side of the controlling REST contract. Every response here is
// CALCULATED from the project cost lines plus the live cost adjustments —
// nothing is stored. That is why a cost adjustment invalidates every read of
// the module (the client mirrors this by invalidating its whole module cache).

/// <summary>Portfolio list, optionally narrowed to one lifecycle label.</summary>
public sealed record ListProjectsQuery(Guid TenantId, ProjectLifecycleStatus? Status)
    : IRequest<IReadOnlyList<ProjectListItemDto>>;

/// <summary>Project detail (master data + cost lines) by business key.</summary>
public sealed record GetProjectQuery(Guid TenantId, string ProjectCode)
    : IRequest<Result<ProjectDetailDto>>;

/// <summary>Project cost calculation (EAC, variance, margins) by business key.</summary>
public sealed record GetProjectCalculationQuery(Guid TenantId, string ProjectCode)
    : IRequest<Result<ProjectCalculationDto>>;

/// <summary>Executive portfolio roll-up.</summary>
public sealed record GetPortfolioSummaryViewQuery(Guid TenantId)
    : IRequest<PortfolioSummaryViewDto>;

/// <summary>Portfolio-wide variance analysis by category.</summary>
public sealed record GetVarianceRowsQuery(Guid TenantId)
    : IRequest<IReadOnlyList<VarianceRowDto>>;

/// <summary>Cost adjustments, optionally narrowed to one project.</summary>
public sealed record ListAdjustmentsQuery(Guid TenantId, string? ProjectCode)
    : IRequest<Result<IReadOnlyList<CostAdjustmentViewDto>>>;

/// <inheritdoc cref="ListProjectsQuery"/>
public sealed class ListProjectsQueryHandler(
    IProjectPortfolioSource projects,
    ICostAdjustmentRepository adjustments,
    ILogger<ListProjectsQueryHandler> logger)
    : IRequestHandler<ListProjectsQuery, IReadOnlyList<ProjectListItemDto>>
{
    public async Task<IReadOnlyList<ProjectListItemDto>> Handle(
        ListProjectsQuery request,
        CancellationToken ct)
    {
        var all = await projects.GetProjectsAsync(request.TenantId, ct).ConfigureAwait(false);
        var live = await adjustments.GetAllAsync(request.TenantId, ct).ConfigureAwait(false);

        var rows = all
            .Where(p => request.Status is null || p.Status == request.Status)
            .Select(p => PortfolioCostView.ToListItem(p, live))
            // Newest first, by business key (PRJ-2026-014 before PRJ-2026-013).
            .OrderByDescending(p => p.Id, StringComparer.Ordinal)
            .ToList();

        logger.LogDebug(
            "Listed {Count} controlling projects for tenant {TenantId} (status filter: {Status})",
            rows.Count, request.TenantId, request.Status);

        return rows;
    }
}

/// <inheritdoc cref="GetProjectQuery"/>
public sealed class GetProjectQueryHandler(
    IProjectPortfolioSource projects,
    ILogger<GetProjectQueryHandler> logger)
    : IRequestHandler<GetProjectQuery, Result<ProjectDetailDto>>
{
    public async Task<Result<ProjectDetailDto>> Handle(GetProjectQuery request, CancellationToken ct)
    {
        var project = await projects
            .GetProjectAsync(request.TenantId, request.ProjectCode, ct)
            .ConfigureAwait(false);

        if (project is null)
        {
            logger.LogInformation(
                "Controlling project {ProjectCode} not found for tenant {TenantId}",
                request.ProjectCode, request.TenantId);
            return Result<ProjectDetailDto>.NotFound("A projekt nem található.");
        }

        return Result<ProjectDetailDto>.Success(new ProjectDetailDto(
            Id: project.ProjectCode,
            Name: project.Name,
            Customer: project.Customer,
            Status: project.Status,
            ContractValue: project.ContractValue.Amount,
            Invoiced: project.Invoiced.Amount,
            Lines: [.. project.Lines.Select(l => new CostLineViewDto(
                l.Category, l.Label, l.Plan.Amount, l.Actual.Amount, l.Note))]));
    }
}

/// <inheritdoc cref="GetProjectCalculationQuery"/>
public sealed class GetProjectCalculationQueryHandler(
    IProjectPortfolioSource projects,
    ICostAdjustmentRepository adjustments,
    TimeProvider clock,
    ILogger<GetProjectCalculationQueryHandler> logger)
    : IRequestHandler<GetProjectCalculationQuery, Result<ProjectCalculationDto>>
{
    public async Task<Result<ProjectCalculationDto>> Handle(
        GetProjectCalculationQuery request,
        CancellationToken ct)
    {
        var project = await projects
            .GetProjectAsync(request.TenantId, request.ProjectCode, ct)
            .ConfigureAwait(false);

        if (project is null)
        {
            return Result<ProjectCalculationDto>.NotFound("A projekt nem található.");
        }

        var live = await adjustments.GetAllAsync(request.TenantId, ct).ConfigureAwait(false);
        var (byCategory, totals) = ProjectCostView.Calculate(
            project,
            PortfolioCostView.ProjectScoped(live, project.ProjectId));

        logger.LogDebug(
            "Calculated cost for project {ProjectCode}: EAC {Eac}, variance {Variance}",
            project.ProjectCode, totals.EacTotal, totals.Variance);

        return Result<ProjectCalculationDto>.Success(new ProjectCalculationDto(
            ProjectId: project.ProjectCode,
            ByCategory: byCategory,
            PlanTotal: totals.PlanTotal,
            ActualTotal: totals.ActualTotal,
            EacTotal: totals.EacTotal,
            Variance: totals.Variance,
            VariancePct: totals.VariancePct,
            PlanMarginPct: totals.PlanMarginPct,
            ActualMarginPct: totals.ActualMarginPct,
            EacMarginPct: totals.EacMarginPct,
            CalculatedAt: clock.GetUtcNow().UtcDateTime));
    }
}

/// <inheritdoc cref="GetPortfolioSummaryViewQuery"/>
public sealed class GetPortfolioSummaryViewQueryHandler(
    IProjectPortfolioSource projects,
    ICostAdjustmentRepository adjustments,
    PortfolioThresholds thresholds,
    TimeProvider clock,
    ILogger<GetPortfolioSummaryViewQueryHandler> logger)
    : IRequestHandler<GetPortfolioSummaryViewQuery, PortfolioSummaryViewDto>
{
    public async Task<PortfolioSummaryViewDto> Handle(
        GetPortfolioSummaryViewQuery request,
        CancellationToken ct)
    {
        var all = await projects.GetProjectsAsync(request.TenantId, ct).ConfigureAwait(false);
        var live = await adjustments.GetAllAsync(request.TenantId, ct).ConfigureAwait(false);

        var rows = all.Select(p => PortfolioCostView.ToListItem(p, live)).ToList();

        // No historic trend points: the module stores no cost snapshots, so the
        // only month it can state truthfully is the current one, computed from
        // live data. Backfilling history needs a periodic snapshot — see the
        // task doc's follow-up. Fabricating past months here would be a lie.
        var summary = PortfolioCostView.Summarize(
            rows, live, thresholds, clock.GetUtcNow().UtcDateTime);

        logger.LogDebug(
            "Portfolio summary for tenant {TenantId}: {ProjectCount} projects, " +
            "{AtRisk} at risk, EAC {Eac}",
            request.TenantId, summary.ProjectCount, summary.ProjectsAtRisk, summary.EacTotal);

        return summary;
    }
}

/// <inheritdoc cref="GetVarianceRowsQuery"/>
public sealed class GetVarianceRowsQueryHandler(
    IProjectPortfolioSource projects,
    ICostAdjustmentRepository adjustments)
    : IRequestHandler<GetVarianceRowsQuery, IReadOnlyList<VarianceRowDto>>
{
    public async Task<IReadOnlyList<VarianceRowDto>> Handle(
        GetVarianceRowsQuery request,
        CancellationToken ct)
    {
        var all = await projects.GetProjectsAsync(request.TenantId, ct).ConfigureAwait(false);
        var live = await adjustments.GetAllAsync(request.TenantId, ct).ConfigureAwait(false);

        var rows = all.Select(p => PortfolioCostView.ToListItem(p, live)).ToList();
        return PortfolioCostView.Variance(rows);
    }
}

/// <inheritdoc cref="ListAdjustmentsQuery"/>
public sealed class ListAdjustmentsQueryHandler(
    IProjectPortfolioSource projects,
    ICostAdjustmentRepository adjustments)
    : IRequestHandler<ListAdjustmentsQuery, Result<IReadOnlyList<CostAdjustmentViewDto>>>
{
    public async Task<Result<IReadOnlyList<CostAdjustmentViewDto>>> Handle(
        ListAdjustmentsQuery request,
        CancellationToken ct)
    {
        var all = await projects.GetProjectsAsync(request.TenantId, ct).ConfigureAwait(false);
        var codeById = all.ToDictionary(p => p.ProjectId, p => p.ProjectCode);

        var live = await adjustments.GetAllAsync(request.TenantId, ct).ConfigureAwait(false);

        if (request.ProjectCode is not null)
        {
            var project = all.FirstOrDefault(p => p.ProjectCode == request.ProjectCode);
            if (project is null)
            {
                return Result<IReadOnlyList<CostAdjustmentViewDto>>.NotFound("A projekt nem található.");
            }

            live = PortfolioCostView.ProjectScoped(live, project.ProjectId);
        }

        IReadOnlyList<CostAdjustmentViewDto> rows = live
            .OrderByDescending(a => a.CreatedAt)
            .ThenByDescending(a => a.AdjustmentId)
            .Select(a => AdjustmentView.From(a, codeById))
            .ToList();

        return Result<IReadOnlyList<CostAdjustmentViewDto>>.Success(rows);
    }
}
