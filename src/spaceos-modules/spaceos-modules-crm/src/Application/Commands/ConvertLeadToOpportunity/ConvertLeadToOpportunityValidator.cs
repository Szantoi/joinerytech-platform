using FluentValidation;
using SpaceOS.Modules.CRM.Domain.Enums;

namespace SpaceOS.Modules.CRM.Application.Commands.ConvertLeadToOpportunity;

/// <summary>
/// Validator for ConvertLeadToOpportunityCommand
/// </summary>
public class ConvertLeadToOpportunityValidator : AbstractValidator<ConvertLeadToOpportunityCommand>
{
    public ConvertLeadToOpportunityValidator()
    {
        RuleFor(x => x.LeadId)
            .NotEmpty()
            .WithMessage("LeadId is required");

        RuleFor(x => x.TenantId)
            .NotEmpty()
            .WithMessage("TenantId is required");

        RuleFor(x => x.EstimatedValue)
            .GreaterThan(0)
            .WithMessage("Estimated value must be greater than zero");

        RuleFor(x => x.Currency)
            .NotEmpty()
            .WithMessage("Currency is required")
            .Must(BeValidCurrency)
            .WithMessage("Invalid currency. Valid values: HUF, EUR, USD");
    }

    private bool BeValidCurrency(string currency)
    {
        return Enum.TryParse<Currency>(currency, ignoreCase: true, out _);
    }
}
