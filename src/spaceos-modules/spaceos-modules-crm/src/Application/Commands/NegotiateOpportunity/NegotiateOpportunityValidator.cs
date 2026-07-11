using FluentValidation;
using SpaceOS.Modules.CRM.Domain.Enums;

namespace SpaceOS.Modules.CRM.Application.Commands.NegotiateOpportunity;

/// <summary>
/// Validator for NegotiateOpportunityCommand
/// </summary>
public class NegotiateOpportunityValidator : AbstractValidator<NegotiateOpportunityCommand>
{
    public NegotiateOpportunityValidator()
    {
        RuleFor(x => x.OpportunityId)
            .NotEmpty()
            .WithMessage("OpportunityId is required");

        RuleFor(x => x.TenantId)
            .NotEmpty()
            .WithMessage("TenantId is required");

        RuleFor(x => x.UpdatedValue)
            .GreaterThan(0)
            .When(x => x.UpdatedValue.HasValue)
            .WithMessage("Updated value must be greater than zero");

        RuleFor(x => x.UpdatedCurrency)
            .Must(BeValidCurrency)
            .When(x => !string.IsNullOrWhiteSpace(x.UpdatedCurrency))
            .WithMessage("Invalid currency. Valid values: HUF, EUR, USD");

        RuleFor(x => x.UpdatedProbability)
            .InclusiveBetween(0, 100)
            .When(x => x.UpdatedProbability.HasValue)
            .WithMessage("Probability must be between 0 and 100");

        RuleFor(x => x)
            .Must(x => !x.UpdatedValue.HasValue || !string.IsNullOrWhiteSpace(x.UpdatedCurrency))
            .WithMessage("Currency is required when updating value");
    }

    private bool BeValidCurrency(string? currency)
    {
        if (string.IsNullOrWhiteSpace(currency)) return true;
        return Enum.TryParse<Currency>(currency, ignoreCase: true, out _);
    }
}
