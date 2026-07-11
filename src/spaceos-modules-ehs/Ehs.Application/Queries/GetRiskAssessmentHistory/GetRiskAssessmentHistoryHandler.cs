using Ehs.Application.Services;
using Ehs.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Ehs.Application.Queries.GetRiskAssessmentHistory;

/// <summary>
/// Handler for GetRiskAssessmentHistoryQuery.
/// Security: Tenant isolation via RLS policies and ICurrentUserService (v3-H2 IDOR fix).
/// Performance: Implements pagination to prevent large result sets (v3-H1 fix).
/// </summary>
public class GetRiskAssessmentHistoryHandler
{
    private readonly EhsDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private const int MaxPageSize = 100;
    private const int DefaultPageSize = 20;

    public GetRiskAssessmentHistoryHandler(
        EhsDbContext dbContext,
        ICurrentUserService currentUserService)
    {
        _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
        _currentUserService = currentUserService ?? throw new ArgumentNullException(nameof(currentUserService));
    }

    public async Task<PagedRiskAssessmentResponse> HandleAsync(
        GetRiskAssessmentHistoryQuery query,
        CancellationToken cancellationToken = default)
    {
        // Security: Verify user is authenticated
        if (!_currentUserService.IsAuthenticated)
        {
            throw new UnauthorizedAccessException("User must be authenticated");
        }

        var organizationId = _currentUserService.GetOrganizationId()
            ?? throw new UnauthorizedAccessException("Organization ID not found in claims");

        // Validate and normalize pagination parameters
        var page = query.Page < 1 ? 1 : query.Page;
        var pageSize = query.PageSize < 1 ? DefaultPageSize : Math.Min(query.PageSize, MaxPageSize);

        // Build base query with RLS enforcement
        var baseQuery = _dbContext.RiskAssessments
            .AsNoTracking()
            .Where(a => a.OrganizationId == organizationId.Value);

        // Get total count (for pagination metadata)
        var totalCount = await baseQuery
            .CountAsync(cancellationToken)
            .ConfigureAwait(false);

        // Calculate total pages
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        // Get paginated results
        var items = await baseQuery
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new RiskAssessmentHistoryDto(
                a.Id,
                a.AssessmentId,
                a.RiskScoreBefore,
                a.RiskScoreAfter,
                a.ImprovementScore,
                a.Category,
                a.CreatedBy,
                a.CreatedAt
            ))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        return new PagedRiskAssessmentResponse(
            items,
            totalCount,
            page,
            pageSize,
            totalPages
        );
    }
}
