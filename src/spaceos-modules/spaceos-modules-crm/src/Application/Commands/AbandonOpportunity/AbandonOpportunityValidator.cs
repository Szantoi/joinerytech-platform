using FluentValidation;

namespace SpaceOS.Modules.CRM.Application.Commands.AbandonOpportunity;

/// <summary>
/// Validator for AbandonOpportunityCommand
/// </summary>
public class AbandonOpportunityValidator : AbstractValidator<AbandonOpportunityCommand>
{
    public AbandonOpportunityValidator()
    {
        RuleFor(x => x.OpportunityId)
            .NotEmpty()
            .WithMessage("OpportunityId is required");

        RuleFor(x => x.TenantId)
            .NotEmpty()
            .WithMessage("TenantId is required");

        RuleFor(x => x.Reason)
            .NotEmpty()
            .WithMessage("Reason for abandoning opportunity is required")
            .MaximumLength(500)
            .WithMessage("Reason must not exceed 500 characters");

        RuleFor(x => x.AbandonedBy)
            .NotEmpty()
            .WithMessage("AbandonedBy is required");
    }
}
