using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.CRM.Application.DTOs;
using SpaceOS.Modules.CRM.Application.Queries;
using SpaceOS.Modules.CRM.Domain.Enums;
using SpaceOS.Modules.CRM.Domain.Repositories;

namespace SpaceOS.Modules.CRM.Application.Handlers;

/// <summary>
/// Handler: Get leads filtered by status.
/// </summary>
public sealed class GetLeadsByStatusQueryHandler : IRequestHandler<GetLeadsByStatusQuery, Result<List<LeadDto>>>
{
    private readonly ILeadRepository _repository;

    public GetLeadsByStatusQueryHandler(ILeadRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<List<LeadDto>>> Handle(GetLeadsByStatusQuery request, CancellationToken ct)
    {
        try
        {
            if (!Enum.TryParse<LeadStatus>(request.Status, ignoreCase: true, out var status))
            {
                return Result.Invalid(new ValidationError
                {
                    ErrorMessage = $"Unknown lead status '{request.Status}'"
                });
            }

            var leads = await _repository.GetByStatusAsync(request.TenantId, status, ct).ConfigureAwait(false);

            var result = leads
                .Select(CrmDtoMapper.ToDto)
                .ToList();

            return Result.Success(result);
        }
        catch (Exception ex)
        {
            return Result.Error($"Failed to retrieve leads by status: {ex.Message}");
        }
    }

}
