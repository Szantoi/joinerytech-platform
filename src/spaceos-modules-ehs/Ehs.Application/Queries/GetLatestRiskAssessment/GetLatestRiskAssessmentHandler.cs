using Ehs.Application.Services;
using Ehs.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Ehs.Application.Queries.GetLatestRiskAssessment;

/// <summary>
/// Handler for GetLatestRiskAssessmentQuery.
/// Security: Tenant isolation via RLS policies and ICurrentUserService (v3-H2 IDOR fix).
/// </summary>
public class GetLatestRiskAssessmentHandler
{
    private readonly EhsDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;

    public GetLatestRiskAssessmentHandler(
        EhsDbContext dbContext,
        ICurrentUserService currentUserService)
    {
        _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
        _currentUserService = currentUserService ?? throw new ArgumentNullException(nameof(currentUserService));
    }

    public async Task<RiskAssessmentDto?> HandleAsync(
        GetLatestRiskAssessmentQuery query,
        CancellationToken cancellationToken = default)
    {
        // Security: Verify user is authenticated
        if (!_currentUserService.IsAuthenticated)
        {
            throw new UnauthorizedAccessException("User must be authenticated");
        }

        var organizationId = _currentUserService.GetOrganizationId()
            ?? throw new UnauthorizedAccessException("Organization ID not found in claims");

        // Query with RLS enforcement
        // Note: RLS policies automatically filter by organization_id,
        // but we explicitly include it here for clarity and defense-in-depth
        var assessment = await _dbContext.RiskAssessments
            .AsNoTracking()
            .Where(a => a.OrganizationId == organizationId.Value)
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new RiskAssessmentDto(
                a.Id,
                a.AssessmentId,
                a.LikelihoodBefore,
                a.SeverityBefore,
                a.LikelihoodAfter,
                a.SeverityAfter,
                a.RiskScoreBefore,
                a.RiskScoreAfter,
                a.ImprovementScore,
                a.Category,
                a.Notes,
                a.CreatedBy,
                a.CreatedAt,
                a.DataHash
            ))
            .FirstOrDefaultAsync(cancellationToken)
            .ConfigureAwait(false);

        return assessment;
    }
}
