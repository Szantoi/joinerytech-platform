using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.CRM.Application.Interfaces;

namespace SpaceOS.Modules.CRM.Application.Commands.WinOpportunity;

/// <summary>
/// Handler for WinOpportunityCommand
/// </summary>
public class WinOpportunityCommandHandler : IRequestHandler<WinOpportunityCommand, Result>
{
    private readonly IOpportunityRepository _repository;

    public WinOpportunityCommandHandler(IOpportunityRepository repository)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
    }

    public async Task<Result> Handle(WinOpportunityCommand request, CancellationToken ct)
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
            opportunity.Win(request.WonBy);
            await _repository.UpdateAsync(opportunity, ct).ConfigureAwait(false);
            await _repository.SaveChangesAsync(ct).ConfigureAwait(false);

            return Result.Success();
        }
        catch (InvalidOperationException ex)
        {
            return Result.Invalid(new ValidationError { ErrorMessage = ex.Message });
        }
        catch (Exception ex)
        {
            return Result.Error(ex.Message);
        }
    }
}
