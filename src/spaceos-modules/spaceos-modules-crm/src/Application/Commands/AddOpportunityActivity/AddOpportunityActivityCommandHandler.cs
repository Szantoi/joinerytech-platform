using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.CRM.Application.Interfaces;
using SpaceOS.Modules.CRM.Domain.Enums;

namespace SpaceOS.Modules.CRM.Application.Commands.AddOpportunityActivity;

/// <summary>
/// Handler for AddOpportunityActivityCommand
/// </summary>
public class AddOpportunityActivityCommandHandler : IRequestHandler<AddOpportunityActivityCommand, Result<Guid>>
{
    private readonly IOpportunityRepository _repository;

    public AddOpportunityActivityCommandHandler(IOpportunityRepository repository)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
    }

    public async Task<Result<Guid>> Handle(AddOpportunityActivityCommand request, CancellationToken ct)
    {
        var opportunity = await _repository.GetByIdAsync(request.OpportunityId, ct).ConfigureAwait(false);
        if (opportunity == null)
        {
            return Result<Guid>.NotFound($"Opportunity with ID {request.OpportunityId} not found");
        }

        if (opportunity.TenantId != request.TenantId)
        {
            return Result<Guid>.Forbidden();
        }

        try
        {
            // Parse ActivityType enum
            if (!Enum.TryParse<ActivityType>(request.ActivityType, ignoreCase: true, out var activityType))
            {
                return Result<Guid>.Invalid(new ValidationError
                {
                    Identifier = nameof(request.ActivityType),
                    ErrorMessage = $"Invalid activity type: {request.ActivityType}"
                });
            }

            // Add activity using domain method
            var activityId = opportunity.AddActivity(activityType, request.Description, request.CreatedBy);

            await _repository.UpdateAsync(opportunity, ct).ConfigureAwait(false);
            await _repository.SaveChangesAsync(ct).ConfigureAwait(false);

            return Result<Guid>.Success(activityId);
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
