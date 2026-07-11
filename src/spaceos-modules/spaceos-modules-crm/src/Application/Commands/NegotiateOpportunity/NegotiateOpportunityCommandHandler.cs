using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.CRM.Application.Interfaces;
using SpaceOS.Modules.CRM.Domain.ValueObjects;
using SpaceOS.Modules.CRM.Domain.Enums;

namespace SpaceOS.Modules.CRM.Application.Commands.NegotiateOpportunity;

/// <summary>
/// Handler for NegotiateOpportunityCommand
/// </summary>
public class NegotiateOpportunityCommandHandler : IRequestHandler<NegotiateOpportunityCommand, Result>
{
    private readonly IOpportunityRepository _repository;

    public NegotiateOpportunityCommandHandler(IOpportunityRepository repository)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
    }

    public async Task<Result> Handle(NegotiateOpportunityCommand request, CancellationToken ct)
    {
        var opportunity = await _repository.GetByIdAsync(request.OpportunityId, ct).ConfigureAwait(false);
        if (opportunity == null)
        {
            return Result.NotFound($"Opportunity with ID {request.OpportunityId} not found");
        }

        if (opportunity.TenantId != request.TenantId)
        {
            return Result.Forbidden();
        }

        try
        {
            Money? updatedValue = null;
            if (request.UpdatedValue.HasValue && !string.IsNullOrWhiteSpace(request.UpdatedCurrency))
            {
                if (!Enum.TryParse<Currency>(request.UpdatedCurrency, ignoreCase: true, out var currency))
                {
                    return Result.Invalid(new ValidationError
                    {
                        Identifier = nameof(request.UpdatedCurrency),
                        ErrorMessage = $"Invalid currency: {request.UpdatedCurrency}"
                    });
                }
                updatedValue = new Money(request.UpdatedValue.Value, currency);
            }

            opportunity.Negotiate(updatedValue, request.UpdatedProbability);
            await _repository.UpdateAsync(opportunity, ct).ConfigureAwait(false);
            await _repository.SaveChangesAsync(ct).ConfigureAwait(false);

            return Result.Success();
        }
        catch (InvalidOperationException ex)
        {
            return Result.Invalid(new ValidationError { ErrorMessage = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return Result.Invalid(new ValidationError { ErrorMessage = ex.Message });
        }
        catch (Exception ex)
        {
            return Result.Error(ex.Message);
        }
    }
}
