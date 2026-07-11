using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.CRM.Application.Interfaces;
using SpaceOS.Modules.CRM.Domain.Enums;

namespace SpaceOS.Modules.CRM.Application.Commands.AddLeadActivity;

/// <summary>
/// Handler for AddLeadActivityCommand
/// </summary>
public class AddLeadActivityCommandHandler : IRequestHandler<AddLeadActivityCommand, Result<Guid>>
{
    private readonly ILeadRepository _repository;

    public AddLeadActivityCommandHandler(ILeadRepository repository)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
    }

    public async Task<Result<Guid>> Handle(AddLeadActivityCommand request, CancellationToken ct)
    {
        var lead = await _repository.GetByIdAsync(request.LeadId, ct).ConfigureAwait(false);
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
            var activityId = lead.AddActivity(activityType, request.Description, request.CreatedBy);

            await _repository.UpdateAsync(lead, ct).ConfigureAwait(false);
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
