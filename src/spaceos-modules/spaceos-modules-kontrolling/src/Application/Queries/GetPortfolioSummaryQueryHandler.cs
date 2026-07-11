using MediatR;
using Ardalis.Result;
using Microsoft.Extensions.Caching.Memory;
using SpaceOS.Modules.Kontrolling.Application.DTOs;
using SpaceOS.Modules.Kontrolling.Application.Services;
using SpaceOS.Modules.Kontrolling.Domain.Enums;
using SpaceOS.Modules.Kontrolling.Domain.ValueObjects;

namespace SpaceOS.Modules.Kontrolling.Application.Queries;

/// <summary>
/// Handler: Get portfolio summary aggregating all active projects
/// </summary>
public class GetPortfolioSummaryQueryHandler : IRequestHandler<GetPortfolioSummaryQuery, Result<PortfolioSummaryDto>>
{
    private readonly IProjectCostCalculationService _calculationService;
    private readonly IIntegrationDataProvider _integrationProvider;
    private readonly IMemoryCache _cache;

    public GetPortfolioSummaryQueryHandler(
        IProjectCostCalculationService calculationService,
        IIntegrationDataProvider integrationProvider,
        IMemoryCache cache)
    {
        _calculationService = calculationService;
        _integrationProvider = integrationProvider;
        _cache = cache;
    }

    public async Task<Result<PortfolioSummaryDto>> Handle(
        GetPortfolioSummaryQuery request,
        CancellationToken ct)
    {
        var cacheKey = $"portfolio-{request.TenantId}";

        return await _cache.GetOrCreateAsync(cacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10);

            // Get all active projects for tenant
            var projects = await _integrationProvider
                .GetActiveProjectsAsync(request.TenantId, ct)
                .ConfigureAwait(false);

            var projectList = projects.ToList();
            if (!projectList.Any())
            {
                return Result<PortfolioSummaryDto>.NotFound("No active projects found");
            }

            // Calculate costs for each project
            var calculations = new List<(ProjectInfo project, Domain.Aggregates.ProjectCostCalculation calculation)>();
            foreach (var project in projectList)
            {
                try
                {
                    var calculation = await _calculationService
                        .CalculateAsync(project.ProjectId, request.TenantId, ct)
                        .ConfigureAwait(false);
                    calculations.Add((project, calculation));
                }
                catch
                {
                    // Skip projects with calculation errors
                    continue;
                }
            }

            if (!calculations.Any())
            {
                return Result<PortfolioSummaryDto>.Error("Failed to calculate any project costs");
            }

            // Aggregate totals
            var totalRevenue = calculations
                .Select(c => c.calculation.Revenue.Actual)
                .Aggregate((a, b) => a.Add(b));

            var totalEac = calculations
                .Select(c => c.calculation.CostEAC)
                .Aggregate((a, b) => a.Add(b));

            // Calculate aggregated margin
            var aggregatedMargin = Margin.Calculate(totalRevenue, totalEac);

            // Identify top and worst performing projects (by margin percentage)
            var projectSummaries = calculations
                .Select(c => new ProjectSummaryDto(
                    ProjectId: c.project.ProjectId,
                    ProjectName: c.project.ProjectName,
                    Revenue: new MoneyDto(c.calculation.Revenue.Actual.Amount, c.calculation.Revenue.Actual.Currency),
                    Eac: new MoneyDto(c.calculation.CostEAC.Amount, c.calculation.CostEAC.Currency),
                    Margin: new MarginDto(
                        new MoneyDto(c.calculation.EACMargin.Amount.Amount, c.calculation.EACMargin.Amount.Currency),
                        c.calculation.EACMargin.Percentage
                    )
                ))
                .ToList();

            var topPerforming = projectSummaries
                .OrderByDescending(p => p.Margin.Percentage)
                .Take(5)
                .ToList();

            var worstPerforming = projectSummaries
                .OrderBy(p => p.Margin.Percentage)
                .Take(5)
                .ToList();

            // Identify top variances (highest variance percentage by category)
            var varianceWarnings = new List<VarianceWarningDto>();
            foreach (var (project, calculation) in calculations)
            {
                foreach (var kvp in calculation.CostByCategory)
                {
                    var category = kvp.Key;
                    var categoryCost = kvp.Value;

                    if (categoryCost.Planned.Amount == 0) continue;

                    var variancePercentage = (categoryCost.Variance.Amount / categoryCost.Planned.Amount) * 100;

                    // Only include significant variances (>10%)
                    if (Math.Abs(variancePercentage) > 10)
                    {
                        varianceWarnings.Add(new VarianceWarningDto(
                            ProjectId: project.ProjectId,
                            ProjectName: project.ProjectName,
                            Category: category,
                            Variance: new MoneyDto(categoryCost.Variance.Amount, categoryCost.Variance.Currency),
                            VariancePercentage: variancePercentage
                        ));
                    }
                }
            }

            var topVariances = varianceWarnings
                .OrderByDescending(v => Math.Abs(v.VariancePercentage))
                .Take(10)
                .ToList();

            var dto = new PortfolioSummaryDto(
                ProjectCount: calculations.Count,
                TotalRevenue: new MoneyDto(totalRevenue.Amount, totalRevenue.Currency),
                TotalEac: new MoneyDto(totalEac.Amount, totalEac.Currency),
                AggregatedMargin: new MarginDto(
                    new MoneyDto(aggregatedMargin.Amount.Amount, aggregatedMargin.Amount.Currency),
                    aggregatedMargin.Percentage
                ),
                TopPerformingProjects: topPerforming,
                WorstPerformingProjects: worstPerforming,
                TopVariances: topVariances,
                CalculatedAt: DateTime.UtcNow
            );

            return Result<PortfolioSummaryDto>.Success(dto);
        }).ConfigureAwait(false) ?? Result<PortfolioSummaryDto>.NotFound("Portfolio summary not found");
    }
}
