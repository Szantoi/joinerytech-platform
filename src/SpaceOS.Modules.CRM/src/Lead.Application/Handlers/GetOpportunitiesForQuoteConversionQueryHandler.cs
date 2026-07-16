using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.CRM.Application.DTOs;
using SpaceOS.Modules.CRM.Application.Queries;
using SpaceOS.Modules.CRM.Domain.Repositories;

namespace SpaceOS.Modules.CRM.Application.Handlers;

/// <summary>
/// Handler: Get opportunities ready for quote conversion (status = SolutionAssembly).
/// For integration with Sales/Quote module.
/// </summary>
public sealed class GetOpportunitiesForQuoteConversionQueryHandler : IRequestHandler<GetOpportunitiesForQuoteConversionQuery, Result<List<OpportunityDto>>>
{
    private readonly IOpportunityRepository _repository;

    public GetOpportunitiesForQuoteConversionQueryHandler(IOpportunityRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<List<OpportunityDto>>> Handle(GetOpportunitiesForQuoteConversionQuery request, CancellationToken ct)
    {
        try
        {
            var opportunities = await _repository.GetByTenantAsync(request.TenantId, ct).ConfigureAwait(false);

            // Filter to only SolutionAssembly status (ready for quote)
            var quoteReadyOpportunities = opportunities
                .Where(o => o.Status.ToString() == "SolutionAssembly")
                .Select(CrmDtoMapper.ToDto)
                .ToList();

            return Result.Success(quoteReadyOpportunities);
        }
        catch (Exception ex)
        {
            return Result.Error($"Failed to retrieve quote conversion opportunities: {ex.Message}");
        }
    }

}
