using MediatR;
using Microsoft.AspNetCore.Mvc;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.AddControlMeasure;
using SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.CreateRiskAssessment;
using SpaceOS.Modules.Ehs.Application.RiskAssessments.Queries.GetRiskAssessmentById;
using SpaceOS.Modules.Ehs.Application.RiskAssessments.Queries.GetRiskMatrixSummary;
using SpaceOS.Modules.Ehs.Application.RiskAssessments.Queries.ListRiskAssessments;
using SpaceOS.Modules.Ehs.Infrastructure.Data;

namespace SpaceOS.Modules.Ehs.Api.Endpoints;

/// <summary>
/// Risk Assessment endpoints registration.
/// </summary>
public static class RiskAssessmentEndpoints
{
    public static void MapRiskAssessmentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/ehs/risk-assessments")
            .WithTags("Risk Assessments")
            .WithOpenApi();

        group.MapPost("/", CreateRiskAssessment);
        group.MapGet("/{id:guid}", GetRiskAssessment);
        group.MapGet("/", ListRiskAssessments);
        group.MapGet("/risk-matrix", GetRiskMatrix);
        group.MapPost("/{id:guid}/add-control", AddControl);
    }

    private static async Task<IResult> CreateRiskAssessment(
        [FromBody] CreateRiskAssessmentRequest request,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        try
        {
            var command = new CreateRiskAssessmentCommand(
                tenantContext.TenantId,
                request.HazardDescription,
                request.Severity,
                request.Likelihood,
                request.AssessedBy,
                request.ReviewDueDate
            );

            var id = await mediator.Send(command, ct).ConfigureAwait(false);
            return Results.Created($"/api/ehs/risk-assessments/{id}", new { RiskAssessmentId = id });
        }
        catch (Exception ex)
        {
            return Results.BadRequest(new { Error = ex.Message });
        }
    }

    private static async Task<IResult> GetRiskAssessment(
        Guid id,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        try
        {
            var query = new GetRiskAssessmentByIdQuery(id, tenantContext.TenantId);
            var result = await mediator.Send(query, ct).ConfigureAwait(false);
            return Results.Ok(result);
        }
        catch (InvalidOperationException)
        {
            return Results.NotFound();
        }
    }

    private static async Task<IResult> ListRiskAssessments(
        [AsParameters] ListRiskAssessmentsRequest request,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        var filter = new RiskAssessmentFilter(
            request.RiskLevel,
            request.Status,
            request.ReviewDueBefore
        );

        var query = new ListRiskAssessmentsQuery(tenantContext.TenantId, filter);

        var result = await mediator.Send(query, ct).ConfigureAwait(false);
        return Results.Ok(result);
    }

    private static async Task<IResult> GetRiskMatrix(
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        var query = new GetRiskMatrixSummaryQuery(tenantContext.TenantId);
        var result = await mediator.Send(query, ct).ConfigureAwait(false);
        return Results.Ok(result);
    }

    private static async Task<IResult> AddControl(
        Guid id,
        [FromBody] AddControlRequest request,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        try
        {
            var command = new AddControlMeasureCommand(
                id,
                tenantContext.TenantId,
                request.ControlMeasure,
                request.ResponsiblePerson
            );

            await mediator.Send(command, ct).ConfigureAwait(false);
            return Results.NoContent();
        }
        catch (InvalidOperationException)
        {
            return Results.NotFound();
        }
        catch (Exception ex)
        {
            return Results.BadRequest(new { Error = ex.Message });
        }
    }
}

// Request DTOs
public record CreateRiskAssessmentRequest(
    string HazardDescription,
    Domain.Enums.Severity Severity,
    Domain.Enums.Likelihood Likelihood,
    Guid AssessedBy,
    DateTimeOffset ReviewDueDate
);

public record ListRiskAssessmentsRequest(
    Domain.Enums.RiskLevel? RiskLevel = null,
    Domain.Enums.RiskStatus? Status = null,
    DateTimeOffset? ReviewDueBefore = null
);

public record AddControlRequest(string ControlMeasure, string ResponsiblePerson);
