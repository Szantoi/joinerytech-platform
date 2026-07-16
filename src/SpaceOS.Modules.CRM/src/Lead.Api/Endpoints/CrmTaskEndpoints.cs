using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Logging;
using SpaceOS.Modules.CRM.Application.Commands;
using SpaceOS.Modules.CRM.Application.Queries;

namespace SpaceOS.Modules.CRM.Api.Endpoints;

/// <summary>
/// CRM task, activity-feed and forecast endpoints — the cross-entity views
/// (portal MSW mirror: <c>modules/crm/mocks/handlers.tasks.ts</c>).
///
///   GET  /api/crm/tasks?done=            flat task list, earliest due first,
///                                        with the COMPUTED SLA field
///   POST /api/crm/tasks/{id}/complete    complete a task by id alone
///   GET  /api/crm/activities/recent?limit=   newest-first activity feed
///   GET  /api/crm/forecast               weighted pipeline per stage
///
/// The SLA window and the feed size are config-driven (<c>Crm:Tasks:SlaSoonDays</c>,
/// <c>Crm:Activities:RecentLimit</c>) — the portal config.ts is the mirror.
/// </summary>
public static class CrmTaskEndpoints
{
    private const string LoggerCategory = "SpaceOS.Modules.CRM.Api.CrmTaskEndpoints";

    public static IEndpointRouteBuilder MapCrmTaskEndpoints(this IEndpointRouteBuilder app)
    {
        var tasks = app.MapGroup("/api/crm/tasks")
            .WithTags("CRM - Tasks")
            .RequireAuthorization();

        tasks.MapGet("", ListTasks)
            .WithName("ListCrmTasks")
            .WithSummary("Flat task list across leads and opportunities (filter: done; earliest due first)")
            .Produces<CrmTaskListItemDto[]>(StatusCodes.Status200OK);

        tasks.MapPost("/{id:guid}/complete", CompleteTask)
            .WithName("CompleteCrmTask")
            .WithSummary("Complete a task addressed by id; returns the fresh task")
            .Produces<CrmTaskListItemDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound);

        var activities = app.MapGroup("/api/crm/activities")
            .WithTags("CRM - Activities")
            .RequireAuthorization();

        activities.MapGet("/recent", RecentActivities)
            .WithName("GetRecentCrmActivities")
            .WithSummary("Recent activities across leads and opportunities (newest first)")
            .Produces<RecentActivityDto[]>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status400BadRequest);

        var forecast = app.MapGroup("/api/crm/forecast")
            .WithTags("CRM - Forecast")
            .RequireAuthorization();

        forecast.MapGet("", GetForecast)
            .WithName("GetCrmPipelineForecast")
            .WithSummary("Weighted pipeline forecast per stage (config-driven stage probabilities)")
            .Produces<PipelineForecastDto>(StatusCodes.Status200OK);

        return app;
    }

    // ══════════ Handlers ══════════

    private static async Task<Microsoft.AspNetCore.Http.IResult> ListTasks(
        [FromServices] IMediator mediator,
        [FromHeader(Name = CrmApiHeaders.TenantId)] Guid tenantId,
        [FromQuery(Name = "done")] bool? done,
        CancellationToken ct)
    {
        var result = await mediator
            .Send(new GetCrmTasksQuery { TenantId = tenantId, Done = done }, ct)
            .ConfigureAwait(false);

        return result.IsSuccess
            ? Results.Ok(result.Value)
            : CrmEndpointResults.Failure(result);
    }

    private static async Task<Microsoft.AspNetCore.Http.IResult> CompleteTask(
        [FromRoute] Guid id,
        [FromBody] CompleteTaskRequestDto? request,
        [FromServices] IMediator mediator,
        [FromServices] ILoggerFactory loggerFactory,
        [FromHeader(Name = CrmApiHeaders.TenantId)] Guid tenantId,
        CancellationToken ct)
    {
        var command = new CompleteCrmTaskCommand
        {
            TenantId = tenantId,
            TaskId = id,
            CompletedBy = request?.CompletedBy ?? Guid.Empty
        };

        var result = await mediator.Send(command, ct).ConfigureAwait(false);

        if (!result.IsSuccess)
        {
            loggerFactory.CreateLogger(LoggerCategory).LogWarning(
                "CRM task {TaskId} complete rejected ({Status}) for tenant {TenantId}",
                id, result.Status, tenantId);

            return CrmEndpointResults.Failure(result);
        }

        return Results.Ok(result.Value);
    }

    private static async Task<Microsoft.AspNetCore.Http.IResult> RecentActivities(
        [FromServices] IMediator mediator,
        [FromHeader(Name = CrmApiHeaders.TenantId)] Guid tenantId,
        [FromQuery(Name = "limit")] int? limit,
        CancellationToken ct)
    {
        var result = await mediator
            .Send(new GetRecentActivitiesQuery { TenantId = tenantId, Limit = limit }, ct)
            .ConfigureAwait(false);

        return result.IsSuccess
            ? Results.Ok(result.Value)
            : CrmEndpointResults.Failure(result);
    }

    private static async Task<Microsoft.AspNetCore.Http.IResult> GetForecast(
        [FromServices] IMediator mediator,
        [FromHeader(Name = CrmApiHeaders.TenantId)] Guid tenantId,
        CancellationToken ct)
    {
        var result = await mediator
            .Send(new GetPipelineForecastQuery { TenantId = tenantId }, ct)
            .ConfigureAwait(false);

        return result.IsSuccess
            ? Results.Ok(result.Value)
            : CrmEndpointResults.Failure(result);
    }
}

/// <summary>Complete-task payload (who completed it).</summary>
public record CompleteTaskRequestDto(Guid CompletedBy);
