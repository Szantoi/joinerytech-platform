using FluentValidation;
using SpaceOS.Modules.CRM.Domain.Enums;

namespace SpaceOS.Modules.CRM.Application.Commands.CreateOpportunity;

/// <summary>
/// Validator for CreateOpportunityCommand
/// </summary>
public class CreateOpportunityValidator : AbstractValidator<CreateOpportunityCommand>
{
    public CreateOpportunityValidator()
    {
        RuleFor(x => x.TenantId)
            .NotEmpty()
            .WithMessage("TenantId is required");

        RuleFor(x => x.Name)
            .NotEmpty()
            .WithMessage("Name is required")
            .MaximumLength(200)
            .WithMessage("Name must not exceed 200 characters");

        RuleFor(x => x.Email)
            .NotEmpty()
            .WithMessage("Email is required")
            .EmailAddress()
            .WithMessage("Invalid email format");

        RuleFor(x => x.EstimatedValue)
            .GreaterThan(0)
            .WithMessage("Estimated value must be greater than zero");

        RuleFor(x => x.Currency)
            .NotEmpty()
            .WithMessage("Currency is required")
            .Must(BeValidCurrency)
            .WithMessage("Invalid currency. Valid values: HUF, EUR, USD");

        RuleFor(x => x.AssignedTo)
            .NotEmpty()
            .WithMessage("AssignedTo is required");
    }

    private bool BeValidCurrency(string currency)
    {
        return Enum.TryParse<Currency>(currency, ignoreCase: true, out _);
    }
}
