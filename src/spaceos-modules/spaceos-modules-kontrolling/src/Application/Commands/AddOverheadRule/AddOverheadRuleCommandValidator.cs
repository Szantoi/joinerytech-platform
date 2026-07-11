using FluentValidation;

namespace SpaceOS.Modules.Kontrolling.Application.Commands.AddOverheadRule;

/// <summary>
/// Validator: Add overhead rule command
/// </summary>
public class AddOverheadRuleCommandValidator : AbstractValidator<AddOverheadRuleCommand>
{
    public AddOverheadRuleCommandValidator()
    {
        RuleFor(x => x.TenantId)
            .NotEmpty()
            .WithMessage("TenantId is required");

        RuleFor(x => x.Category)
            .IsInEnum()
            .WithMessage("Valid cost category is required");

        RuleFor(x => x.CustomRate)
            .GreaterThanOrEqualTo(0)
            .When(x => x.CustomRate.HasValue)
            .WithMessage("Custom rate must be non-negative");

        RuleFor(x => x)
            .Must(x => !x.Exclude || !x.CustomRate.HasValue)
            .WithMessage("Cannot exclude a category and provide a custom rate at the same time");

        RuleFor(x => x.UpdatedBy)
            .NotEmpty()
            .WithMessage("UpdatedBy is required");
    }
}
