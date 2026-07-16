using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SpaceOS.Modules.QA.Application.DTOs;
using SpaceOS.Modules.QA.Application.Queries;

namespace SpaceOS.Modules.QA.Api.Endpoints;

/// <summary>
/// QA metrics API endpoint — exposes GetQAMetricsQuery (pass/fail rates,
/// average ticket resolution time) for the portal dashboard/trend screens
/// (client mirror: services/qa/calc.ts calcQaMetrics).
/// </summary>
public static class QAMetricsEndpoints
{
    private const string LoggerCategory = "SpaceOS.Modules.QA.Api.QAMetricsEndpoints";

    /// <summary>
    /// Config key for the default metrics window (days) when from/to are omitted.
    /// </summary>
    public const string DefaultWindowDaysConfigKey = "QA:Metrics:DefaultWindowDays";

    /// <summary>
    /// Fallback window: 42 days = 6 calendar weeks — mirrors the portal
    /// TREND_WINDOW_WEEKS (services/qa/config.ts) so the default server window
    /// covers the trend view without configuration.
    /// </summary>
    public const int FallbackWindowDays = 42;

    /// <summary>
    /// Maps QA metrics endpoints to the application.
    /// </summary>
    public static IEndpointRouteBuilder MapQAMetricsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/qa/metrics")
            .WithTags("QA - Metrics")
            .RequireAuthorization();

        group.MapGet("", GetQAMetrics)
            .WithName("GetQAMetrics")
            .WithSummary("QA metrics for a date range (pass rate, avg ticket resolution time; default window from config)")
            .Produces<QAMetricsDto>(200)
            .Produces(400);

        return app;
    }

    // ============ HANDLERS ============

    private static async Task<IResult> GetQAMetrics(
        [FromServices] IMediator mediator,
        [FromServices] IConfiguration configuration,
        [FromServices] ILoggerFactory loggerFactory,
        [FromHeader(Name = "X-Tenant-Id")] Guid tenantId,
        [FromQuery(Name = "from")] DateTime? from,
        [FromQuery(Name = "to")] DateTime? to,
        CancellationToken ct)
    {
        // Config-driven default window (QUALITY.md: no hardcoded thresholds).
        var windowDays = configuration.GetValue(DefaultWindowDaysConfigKey, FallbackWindowDays);
        var endDate = to ?? DateTime.UtcNow;
        var startDate = from ?? endDate.AddDays(-windowDays);

        if (startDate > endDate)
        {
            return Results.BadRequest(new { error = "'from' must not be later than 'to'" });
        }

        var query = new GetQAMetricsQuery(startDate, endDate, tenantId);
        var result = await mediator.Send(query, ct).ConfigureAwait(false);

        if (!result.IsSuccess)
        {
            return QaEndpointResults.Failure(result);
        }

        loggerFactory.CreateLogger(LoggerCategory).LogInformation(
            "QA metrics served for tenant {TenantId} ({StartDate:u} → {EndDate:u})",
            tenantId, startDate, endDate);

        return Results.Ok(result.Value);
    }
}
