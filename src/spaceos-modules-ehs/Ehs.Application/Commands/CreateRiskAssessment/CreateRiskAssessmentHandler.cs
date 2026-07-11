using Ehs.Application.Services;
using Ehs.Domain.Entities;
using Ehs.Infrastructure.Data;

namespace Ehs.Application.Commands.CreateRiskAssessment;

/// <summary>
/// Handler for CreateRiskAssessmentCommand.
/// Security: Uses ICurrentUserService for tenant isolation (v3-C1 fix).
/// </summary>
public class CreateRiskAssessmentHandler
{
    private readonly EhsDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;

    public CreateRiskAssessmentHandler(
        EhsDbContext dbContext,
        ICurrentUserService currentUserService)
    {
        _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
        _currentUserService = currentUserService ?? throw new ArgumentNullException(nameof(currentUserService));
    }

    public async Task<CreateRiskAssessmentResponse> HandleAsync(
        CreateRiskAssessmentCommand command,
        CancellationToken cancellationToken = default)
    {
        // Get organization ID from authenticated user (v3-C1 security fix)
        var organizationId = _currentUserService.GetOrganizationId()
            ?? throw new UnauthorizedAccessException("User must be authenticated with an organization context");

        var userId = _currentUserService.GetUserId()
            ?? throw new UnauthorizedAccessException("User ID not found in claims");

        // Use domain factory method (enforces domain rules)
        var assessment = RiskAssessment.Create(
            organizationId.Value,
            command.AssessmentId,
            command.LikelihoodBefore,
            command.SeverityBefore,
            command.LikelihoodAfter,
            command.SeverityAfter,
            command.Category,
            command.Notes,
            userId
        );

        // Add to DbContext
        _dbContext.RiskAssessments.Add(assessment);

        // Save changes (RLS policies will enforce tenant isolation)
        await _dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        // Return response
        return new CreateRiskAssessmentResponse(
            assessment.Id,
            assessment.RiskScoreBefore,
            assessment.RiskScoreAfter,
            assessment.ImprovementScore,
            assessment.DataHash
        );
    }
}
