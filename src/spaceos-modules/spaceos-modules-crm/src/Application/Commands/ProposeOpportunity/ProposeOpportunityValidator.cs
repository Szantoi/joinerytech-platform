using FluentValidation;

namespace SpaceOS.Modules.CRM.Application.Commands.ProposeOpportunity;

/// <summary>
/// Validator for ProposeOpportunityCommand
/// </summary>
public class ProposeOpportunityValidator : AbstractValidator<ProposeOpportunityCommand>
{
    public ProposeOpportunityValidator()
    {
        RuleFor(x => x.OpportunityId)
            .NotEmpty()
            .WithMessage("OpportunityId is required");

        RuleFor(x => x.TenantId)
            .NotEmpty()
            .WithMessage("TenantId is required");

        RuleFor(x => x.ExpectedCloseDate)
            .GreaterThan(DateTime.UtcNow.Date)
            .WithMessage("Expected close date must be in the future");
    }
}
