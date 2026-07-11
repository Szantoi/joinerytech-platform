using Ehs.Application.Commands.CreateRiskAssessment;
using Ehs.Application.Queries.GetLatestRiskAssessment;
using Ehs.Application.Queries.GetRiskAssessmentHistory;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;

namespace Ehs.Api.Endpoints;

/// <summary>
/// Minimal API endpoints for Risk Assessment management.
/// Security: All endpoints require authentication (v3-C1, v3-C2 fixes).
/// </summary>
public static class RiskAssessmentEndpoints
{
    public static void MapRiskAssessmentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/ehs/risk-assessments")
            .RequireAuthorization()
            .WithTags("Risk Assessments")
            .WithOpenApi();

        // POST /api/ehs/risk-assessments
        group.MapPost("/", CreateRiskAssessment)
            .WithName("CreateRiskAssessment")
            .WithSummary("Create a new risk assessment")
            .Produces<CreateRiskAssessmentResponse>(StatusCodes.Status201Created)
            .ProducesValidationProblem()
            .Produces(StatusCodes.Status401Unauthorized);

        // GET /api/ehs/risk-assessments/latest
        group.MapGet("/latest", GetLatestRiskAssessment)
            .WithName("GetLatestRiskAssessment")
            .WithSummary("Get the latest risk assessment for the current organization")
            .Produces<RiskAssessmentDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized);

        // GET /api/ehs/risk-assessments/history
        group.MapGet("/history", GetRiskAssessmentHistory)
            .WithName("GetRiskAssessmentHistory")
            .WithSummary("Get paginated risk assessment history for the current organization")
            .Produces<PagedRiskAssessmentResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized);
    }

    /// <summary>
    /// Creates a new risk assessment.
    /// Security fixes:
    /// - v3-C1: Uses ICurrentUserService for tenant isolation (no manual organizationId parameter)
    /// - v3-C2: Mass assignment prevented (only allowed fields in command)
    /// - v4-M3: Domain validation enforced (high-risk requires notes)
    /// </summary>
    private static async Task<IResult> CreateRiskAssessment(
        [FromBody] CreateRiskAssessmentCommand command,
        [FromServices] CreateRiskAssessmentHandler handler,
        [FromServices] IValidator<CreateRiskAssessmentCommand> validator,
        CancellationToken cancellationToken)
    {
        // FluentValidation
        var validationResult = await validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            return Results.ValidationProblem(validationResult.ToDictionary());
        }

        try
        {
            // Handler gets organization ID from ICurrentUserService (v3-C1 security fix)
            var response = await handler.HandleAsync(command, cancellationToken);

            return Results.Created($"/api/ehs/risk-assessments/{response.Id}", response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Results.Problem(
                statusCode: StatusCodes.Status401Unauthorized,
                title: "Unauthorized",
                detail: ex.Message
            );
        }
        catch (Exception ex)
        {
            return Results.Problem(
                statusCode: StatusCodes.Status500InternalServerError,
                title: "Internal Server Error",
                detail: ex.Message
            );
        }
    }

    /// <summary>
    /// Gets the latest risk assessment for the current organization.
    /// Security fixes:
    /// - v3-H2: IDOR prevented - user can only access their organization's data
    /// - Uses ICurrentUserService + RLS policies for double defense
    /// </summary>
    private static async Task<IResult> GetLatestRiskAssessment(
        [FromServices] GetLatestRiskAssessmentHandler handler,
        CancellationToken cancellationToken)
    {
        try
        {
            var assessment = await handler.HandleAsync(
                new GetLatestRiskAssessmentQuery(),
                cancellationToken);

            if (assessment == null)
            {
                return Results.NotFound(new
                {
                    title = "No risk assessments found",
                    detail = "No risk assessments found for your organization"
                });
            }

            return Results.Ok(assessment);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Results.Problem(
                statusCode: StatusCodes.Status401Unauthorized,
                title = "Unauthorized",
                detail: ex.Message
            );
        }
        catch (Exception ex)
        {
            return Results.Problem(
                statusCode: StatusCodes.Status500InternalServerError,
                title: "Internal Server Error",
                detail: ex.Message
            );
        }
    }

    /// <summary>
    /// Gets paginated risk assessment history for the current organization.
    /// Security fixes:
    /// - v3-H2: IDOR prevented - user can only access their organization's data
    /// - v3-H1: Pagination implemented to prevent large result sets
    /// - Uses ICurrentUserService + RLS policies for double defense
    /// </summary>
    private static async Task<IResult> GetRiskAssessmentHistory(
        [FromQuery] int page,
        [FromQuery] int pageSize,
        [FromServices] GetRiskAssessmentHistoryHandler handler,
        CancellationToken cancellationToken)
    {
        try
        {
            var query = new GetRiskAssessmentHistoryQuery(
                page > 0 ? page : 1,
                pageSize > 0 ? pageSize : 20
            );

            var response = await handler.HandleAsync(query, cancellationToken);

            return Results.Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Results.Problem(
                statusCode: StatusCodes.Status401Unauthorized,
                title: "Unauthorized",
                detail: ex.Message
            );
        }
        catch (Exception ex)
        {
            return Results.Problem(
                statusCode: StatusCodes.Status500InternalServerError,
                title: "Internal Server Error",
                detail: ex.Message
            );
        }
    }
}
