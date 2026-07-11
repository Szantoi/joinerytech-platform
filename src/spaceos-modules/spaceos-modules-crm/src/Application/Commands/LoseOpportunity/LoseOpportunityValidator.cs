using FluentValidation;

namespace SpaceOS.Modules.CRM.Application.Commands.LoseOpportunity;

/// <summary>
/// Validator for LoseOpportunityCommand
/// </summary>
public class LoseOpportunityValidator : AbstractValidator<LoseOpportunityCommand>
{
    public LoseOpportunityValidator()
    {
        RuleFor(x => x.OpportunityId)
            .NotEmpty()
            .WithMessage("OpportunityId is required");

        RuleFor(x => x.TenantId)
            .NotEmpty()
            .WithMessage("TenantId is required");

        RuleFor(x => x.Reason)
            .NotEmpty()
            .WithMessage("Reason for losing opportunity is required")
            .MaximumLength(500)
            .WithMessage("Reason must not exceed 500 characters");

        RuleFor(x => x.LostBy)
            .NotEmpty()
            .WithMessage("LostBy is required");
    }
}
