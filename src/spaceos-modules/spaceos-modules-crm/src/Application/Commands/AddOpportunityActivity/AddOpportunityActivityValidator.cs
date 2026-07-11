using FluentValidation;
using SpaceOS.Modules.CRM.Domain.Enums;

namespace SpaceOS.Modules.CRM.Application.Commands.AddOpportunityActivity;

/// <summary>
/// Validator for AddOpportunityActivityCommand
/// </summary>
public class AddOpportunityActivityValidator : AbstractValidator<AddOpportunityActivityCommand>
{
    public AddOpportunityActivityValidator()
    {
        RuleFor(x => x.OpportunityId)
            .NotEmpty()
            .WithMessage("OpportunityId is required");

        RuleFor(x => x.TenantId)
            .NotEmpty()
            .WithMessage("TenantId is required");

        RuleFor(x => x.ActivityType)
            .NotEmpty()
            .WithMessage("ActivityType is required")
            .Must(BeValidActivityType)
            .WithMessage("Invalid activity type. Valid values: Call, Email, Meeting, Note");

        RuleFor(x => x.Description)
            .NotEmpty()
            .WithMessage("Description is required")
            .MaximumLength(2000)
            .WithMessage("Description must not exceed 2000 characters");

        RuleFor(x => x.CreatedBy)
            .NotEmpty()
            .WithMessage("CreatedBy is required");
    }

    private bool BeValidActivityType(string activityType)
    {
        return Enum.TryParse<ActivityType>(activityType, ignoreCase: true, out _);
    }
}
