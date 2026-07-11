using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.CRM.Application.DTOs;
using SpaceOS.Modules.CRM.Application.Interfaces;

namespace SpaceOS.Modules.CRM.Application.Queries.GetOpportunityByConversionId;

/// <summary>
/// Handler for GetOpportunityByConversionIdQuery (ADR-063)
/// Polling endpoint for conversion status
/// </summary>
public class GetOpportunityByConversionIdQueryHandler : IRequestHandler<GetOpportunityByConversionIdQuery, Result<OpportunityResponse>>
{
    private readonly IOpportunityRepository _repository;

    public GetOpportunityByConversionIdQueryHandler(IOpportunityRepository repository)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
    }

    public async Task<Result<OpportunityResponse>> Handle(GetOpportunityByConversionIdQuery request, CancellationToken ct)
    {
        var opportunity = await _repository.GetByConversionIdAsync(request.ConversionId, ct).ConfigureAwait(false);

        if (opportunity == null)
        {
            return Result<OpportunityResponse>.NotFound($"Conversion {request.ConversionId} not found");
        }

        if (opportunity.TenantId != request.TenantId)
        {
            return Result<OpportunityResponse>.Forbidden();
        }

        var response = new OpportunityResponse
        {
            Id = opportunity.Id,
            Name = opportunity.ContactInfo.Name,
            Email = opportunity.ContactInfo.Email.Value,
            Phone = opportunity.ContactInfo.Phone?.Value,
            Company = opportunity.ContactInfo.Company,
            Status = opportunity.Status.ToString(),
            EstimatedValue = opportunity.EstimatedValue.Amount,
            Currency = opportunity.EstimatedValue.Currency.ToString(),
            Probability = opportunity.Probability,
            ExpectedCloseDate = opportunity.ExpectedCloseDate,
            AssignedTo = opportunity.AssignedTo,
            LeadRef = opportunity.LeadRef,
            QuoteRef = opportunity.QuoteRef,
            ActivityCount = opportunity.Activities.Count,
            TaskCount = opportunity.Tasks.Count,
            CreatedAt = opportunity.CreatedAt,
            UpdatedAt = opportunity.UpdatedAt ?? opportunity.CreatedAt
        };

        return Result<OpportunityResponse>.Success(response);
    }
}
