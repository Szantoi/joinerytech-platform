using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.CRM.Application.Interfaces;
using SpaceOS.Modules.CRM.Domain.ValueObjects;
using SpaceOS.Modules.CRM.Domain.Enums;

namespace SpaceOS.Modules.CRM.Application.Commands.ConvertLeadToOpportunity;

/// <summary>
/// Handler for ConvertLeadToOpportunityCommand
/// </summary>
public class ConvertLeadToOpportunityCommandHandler : IRequestHandler<ConvertLeadToOpportunityCommand, Result<Guid>>
{
    private readonly ILeadRepository _leadRepository;
    private readonly IOpportunityRepository _opportunityRepository;

    public ConvertLeadToOpportunityCommandHandler(
        ILeadRepository leadRepository,
        IOpportunityRepository opportunityRepository)
    {
        _leadRepository = leadRepository ?? throw new ArgumentNullException(nameof(leadRepository));
        _opportunityRepository = opportunityRepository ?? throw new ArgumentNullException(nameof(opportunityRepository));
    }

    public async Task<Result<Guid>> Handle(ConvertLeadToOpportunityCommand request, CancellationToken ct)
    {
        var lead = await _leadRepository.GetByIdAsync(request.LeadId, ct).ConfigureAwait(false);
        if (lead == null)
        {
            return Result<Guid>.NotFound($"Lead with ID {request.LeadId} not found");
        }

        if (lead.TenantId != request.TenantId)
        {
            return Result<Guid>.Forbidden();
        }

        try
        {
            // Parse currency enum
            if (!Enum.TryParse<Currency>(request.Currency, ignoreCase: true, out var currency))
            {
                return Result<Guid>.Invalid(new ValidationError
                {
                    Identifier = nameof(request.Currency),
                    ErrorMessage = $"Invalid currency: {request.Currency}"
                });
            }

            // Create Money value object
            var estimatedValue = new Money(request.EstimatedValue, currency);

            // Convert Lead to Opportunity (domain method creates and returns new Opportunity)
            var opportunity = lead.ConvertToOpportunity(estimatedValue);

            // Save both aggregates
            await _leadRepository.UpdateAsync(lead, ct).ConfigureAwait(false);
            await _opportunityRepository.AddAsync(opportunity, ct).ConfigureAwait(false);

            await _leadRepository.SaveChangesAsync(ct).ConfigureAwait(false);
            await _opportunityRepository.SaveChangesAsync(ct).ConfigureAwait(false);

            return Result<Guid>.Success(opportunity.Id);
        }
        catch (InvalidOperationException ex)
        {
            return Result<Guid>.Invalid(new ValidationError { ErrorMessage = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return Result<Guid>.Invalid(new ValidationError { ErrorMessage = ex.Message });
        }
        catch (Exception ex)
        {
            return Result<Guid>.Error(ex.Message);
        }
    }
}
