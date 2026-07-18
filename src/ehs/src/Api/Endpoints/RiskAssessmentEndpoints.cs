using MediatR;
using Microsoft.AspNetCore.Mvc;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.AddControlMeasure;
using SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.ApproveRiskAssessment;
using SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.ArchiveRiskAssessment;
using SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.CreateRiskAssessment;
using SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.ReturnRiskAssessmentToDraft;
using SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.SubmitRiskAssessmentForReview;
using SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.UpdateRiskAssessment;
using SpaceOS.Modules.Ehs.Application.RiskAssessments.Queries.GetRiskAssessmentById;
using SpaceOS.Modules.Ehs.Application.RiskAssessments.Queries.GetRiskMatrixSummary;
using SpaceOS.Modules.Ehs.Application.RiskAssessments.Queries.ListRiskAssessments;
using SpaceOS.Modules.Ehs.Application.Wire;
using SpaceOS.Modules.Ehs.Infrastructure.Data;

namespace SpaceOS.Modules.Ehs.Api.Endpoints;

/// <summary>
/// Risk assessment endpoints — 5×5 matrix (RISKS-5X5-BE).
/// FSM: Draft → UnderReview → Approved → Archived (+ return-to-draft).
/// Error contract: 404 = not found, 409 = illegal FSM transition / missing reference,
/// 400 = invalid input (rating outside 1-5, missing required field, past due date).
/// </summary>
public static class RiskAssessmentEndpoints
{
    public static void MapRiskAssessmentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/ehs/risk-assessments")
            .WithTags("Risk Assessments")
            .WithOpenApi()
            .RequireAuthorization();

        // POST /api/ehs/risk-assessments
        group.MapPost("/", CreateRiskAssessment)
            .WithName("CreateRiskAssessment")
            .WithSummary("Create a risk assessment (FSM entry: Draft / vazlat)")
            .Produces<Guid>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status409Conflict);

        // GET /api/ehs/risk-assessments
        group.MapGet("/", ListRiskAssessments)
            .WithName("ListRiskAssessments")
            .WithSummary("List risk assessments (filter: riskLevel, status, locationId, reviewDueBefore)")
            .Produces(StatusCodes.Status200OK);

        // GET /api/ehs/risk-assessments/risk-matrix
        group.MapGet("/risk-matrix", GetRiskMatrix)
            .WithName("GetRiskMatrixSummary")
            .WithSummary("5×5 matrix summary for the dashboard (per-cell counts, all 25 cells; non-archived)")
            .Produces(StatusCodes.Status200OK);

        // GET /api/ehs/risk-assessments/{id}
        group.MapGet("/{id:guid}", GetRiskAssessment)
            .WithName("GetRiskAssessment")
            .WithSummary("Get risk assessment by ID (with control measures)")
            .Produces(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        // PUT /api/ehs/risk-assessments/{id}
        group.MapPut("/{id:guid}", UpdateRiskAssessment)
            .WithName("UpdateRiskAssessment")
            .WithSummary("Update details (Draft only — score/band recalculated)")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        // POST /api/ehs/risk-assessments/{id}/submit-for-review
        group.MapPost("/{id:guid}/submit-for-review", SubmitForReview)
            .WithName("SubmitRiskAssessmentForReview")
            .WithSummary("FSM: Draft → UnderReview (felulvizsgalatra)")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        // POST /api/ehs/risk-assessments/{id}/approve
        group.MapPost("/{id:guid}/approve", Approve)
            .WithName("ApproveRiskAssessment")
            .WithSummary("FSM: UnderReview → Approved (jovahagyva)")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        // POST /api/ehs/risk-assessments/{id}/return-to-draft
        group.MapPost("/{id:guid}/return-to-draft", ReturnToDraft)
            .WithName("ReturnRiskAssessmentToDraft")
            .WithSummary("FSM: UnderReview → Draft (visszakuldes atdolgozasra)")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        // POST /api/ehs/risk-assessments/{id}/archive
        group.MapPost("/{id:guid}/archive", Archive)
            .WithName("ArchiveRiskAssessment")
            .WithSummary("FSM: Approved → Archived (archivalva)")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        // POST /api/ehs/risk-assessments/{id}/add-control
        group.MapPost("/{id:guid}/add-control", AddControl)
            .WithName("AddRiskControlMeasure")
            .WithSummary("Add a control measure (+ optional CAPA via the unified mechanism)")
            .Produces<AddControlMeasureResult>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);
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
                request.ReviewDueDate,
                request.LocationId);

            var id = await mediator.Send(command, ct).ConfigureAwait(false);
            return Results.Created($"/api/ehs/risk-assessments/{id}", new { RiskAssessmentId = id });
        }
        catch (InvalidOperationException ex)
        {
            return Results.Conflict(new { Error = ex.Message });
        }
        catch (Exception ex)
        {
            return Results.BadRequest(new { Error = ex.Message });
        }
    }

    private static async Task<IResult> ListRiskAssessments(
        [AsParameters] ListRiskAssessmentsRequest request,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        // Query-string enums bypass the JSON converters — parse the Hungarian
        // wire keys by hand (ADR-059); unknown key → 400, not an empty list.
        if (!WireQuery.TryParse(EhsWire.RiskLevel, request.RiskLevel, "kockázati-szint", out var riskLevel, out var levelError))
            return levelError!;
        if (!WireQuery.TryParse(EhsWire.RiskStatus, request.Status, "kockázatértékelés-státusz", out var status, out var statusError))
            return statusError!;

        var filter = new RiskAssessmentFilter(
            riskLevel,
            status,
            request.LocationId,
            request.ReviewDueBefore);

        var query = new ListRiskAssessmentsQuery(tenantContext.TenantId, filter);

        var result = await mediator.Send(query, ct).ConfigureAwait(false);
        return Results.Ok(result);
    }

    private static async Task<IResult> GetRiskAssessment(
        Guid id,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        var query = new GetRiskAssessmentByIdQuery(id, tenantContext.TenantId);
        var result = await mediator.Send(query, ct).ConfigureAwait(false);

        return result is null ? Results.NotFound() : Results.Ok(result);
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

    private static async Task<IResult> UpdateRiskAssessment(
        Guid id,
        [FromBody] UpdateRiskAssessmentRequest request,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
    {
        try
        {
            var command = new UpdateRiskAssessmentCommand(
                id,
                tenantContext.TenantId,
                request.HazardDescription,
                request.Severity,
                request.Likelihood,
                request.ReviewDueDate,
                request.LocationId);

            await mediator.Send(command, ct).ConfigureAwait(false);
            return Results.NoContent();
        }
        catch (KeyNotFoundException)
        {
            return Results.NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return Results.Conflict(new { Error = ex.Message });
        }
        catch (Exception ex)
        {
            return Results.BadRequest(new { Error = ex.Message });
        }
    }

    private static Task<IResult> SubmitForReview(
        Guid id,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
        => ExecuteTransition(mediator, new SubmitRiskAssessmentForReviewCommand(id, tenantContext.TenantId), ct);

    private static Task<IResult> Approve(
        Guid id,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
        => ExecuteTransition(mediator, new ApproveRiskAssessmentCommand(id, tenantContext.TenantId), ct);

    private static Task<IResult> ReturnToDraft(
        Guid id,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
        => ExecuteTransition(mediator, new ReturnRiskAssessmentToDraftCommand(id, tenantContext.TenantId), ct);

    private static Task<IResult> Archive(
        Guid id,
        [FromServices] IMediator mediator,
        [FromServices] ITenantContext tenantContext,
        CancellationToken ct)
        => ExecuteTransition(mediator, new ArchiveRiskAssessmentCommand(id, tenantContext.TenantId), ct);

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
                request.ResponsiblePerson,
                request.CapaDescription,
                request.CapaAssignedTo,
                request.CapaDueDate);

            var result = await mediator.Send(command, ct).ConfigureAwait(false);
            return Results.Created($"/api/ehs/risk-assessments/{id}", result);
        }
        catch (KeyNotFoundException)
        {
            return Results.NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return Results.Conflict(new { Error = ex.Message });
        }
        catch (Exception ex)
        {
            return Results.BadRequest(new { Error = ex.Message });
        }
    }

    /// <summary>
    /// Shared FSM-transition execution with the module error contract
    /// (404 not found / 409 illegal transition).
    /// </summary>
    private static async Task<IResult> ExecuteTransition<TCommand>(
        IMediator mediator,
        TCommand command,
        CancellationToken ct)
        where TCommand : IRequest<Unit>
    {
        try
        {
            await mediator.Send(command, ct).ConfigureAwait(false);
            return Results.NoContent();
        }
        catch (KeyNotFoundException)
        {
            return Results.NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return Results.Conflict(new { Error = ex.Message });
        }
    }
}

// Request DTOs
public record CreateRiskAssessmentRequest(
    string HazardDescription,
    Domain.Enums.Severity Severity,
    Domain.Enums.Likelihood Likelihood,
    Guid AssessedBy,
    DateTimeOffset ReviewDueDate,
    Guid? LocationId
);

public record UpdateRiskAssessmentRequest(
    string HazardDescription,
    Domain.Enums.Severity Severity,
    Domain.Enums.Likelihood Likelihood,
    DateTimeOffset ReviewDueDate,
    Guid? LocationId
);

/// <summary>
/// List filter — enum filters travel as raw strings and are parsed against
/// the EhsWire maps in the handler (ADR-059 Hungarian wire keys).
/// </summary>
public record ListRiskAssessmentsRequest(
    string? RiskLevel = null,
    string? Status = null,
    Guid? LocationId = null,
    DateTimeOffset? ReviewDueBefore = null
);

public record AddControlRequest(
    string ControlMeasure,
    string ResponsiblePerson,
    string? CapaDescription,
    Guid? CapaAssignedTo,
    DateTimeOffset? CapaDueDate
);
