using Ardalis.Result;
using MediatR;
using Microsoft.Extensions.Options;
using SpaceOS.Modules.CRM.Application.Queries;
using SpaceOS.Modules.CRM.Domain.Enums;
using SpaceOS.Modules.CRM.Domain.Repositories;

namespace SpaceOS.Modules.CRM.Application.Handlers;

/// <summary>
/// Handler: the cross-entity "recent activities" feed (portal dashboard panel).
/// Page size falls back to the configured default (<c>Crm:Activities:RecentLimit</c>).
/// </summary>
public sealed class GetRecentActivitiesQueryHandler
    : IRequestHandler<GetRecentActivitiesQuery, Result<RecentActivityDto[]>>
{
    private readonly ILeadRepository _leadRepository;
    private readonly IOpportunityRepository _opportunityRepository;
    private readonly CrmOptions _options;

    public GetRecentActivitiesQueryHandler(
        ILeadRepository leadRepository,
        IOpportunityRepository opportunityRepository,
        IOptions<CrmOptions> options)
    {
        _leadRepository = leadRepository;
        _opportunityRepository = opportunityRepository;
        _options = options.Value;
    }

    public async Task<Result<RecentActivityDto[]>> Handle(GetRecentActivitiesQuery request, CancellationToken ct)
    {
        var limit = request.Limit ?? _options.Activities.RecentLimit;

        if (limit <= 0)
        {
            return Result.Invalid(new ValidationError { ErrorMessage = "Limit must be greater than zero" });
        }

        var leads = await _leadRepository.GetByTenantAsync(request.TenantId, ct).ConfigureAwait(false);
        var opportunities = await _opportunityRepository.GetByTenantAsync(request.TenantId, ct).ConfigureAwait(false);

        var fromLeads = leads.SelectMany(lead => lead.Activities.Select(activity => new RecentActivityDto
        {
            RefType = CrmRefType.Lead,
            RefId = lead.Id,
            RefTitle = lead.ContactInfo.Name,
            Type = activity.Type,
            Description = activity.Description,
            CreatedBy = activity.CreatedBy,
            CreatedAt = activity.CreatedAt
        }));

        var fromOpportunities = opportunities.SelectMany(opp => opp.Activities.Select(activity => new RecentActivityDto
        {
            RefType = CrmRefType.Opportunity,
            RefId = opp.Id,
            RefTitle = opp.Title,
            Type = activity.Type,
            Description = activity.Description,
            CreatedBy = activity.CreatedBy,
            CreatedAt = activity.CreatedAt
        }));

        var recent = fromLeads
            .Concat(fromOpportunities)
            .OrderByDescending(a => a.CreatedAt)
            .Take(limit)
            .ToArray();

        return Result.Success(recent);
    }
}
