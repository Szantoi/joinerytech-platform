using FluentValidation;
using SpaceOS.Modules.CRM.Domain.Enums;

namespace SpaceOS.Modules.CRM.Application.Commands.CreateLead;

/// <summary>
/// Validator for CreateLeadCommand
/// </summary>
public class CreateLeadValidator : AbstractValidator<CreateLeadCommand>
{
    public CreateLeadValidator()
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

        RuleFor(x => x.Phone)
            .MinimumLength(7)
            .When(x => !string.IsNullOrWhiteSpace(x.Phone))
            .WithMessage("Phone must be at least 7 characters")
            .MaximumLength(20)
            .When(x => !string.IsNullOrWhiteSpace(x.Phone))
            .WithMessage("Phone must not exceed 20 characters");

        RuleFor(x => x.Company)
            .MaximumLength(300)
            .When(x => !string.IsNullOrWhiteSpace(x.Company))
            .WithMessage("Company name must not exceed 300 characters");

        RuleFor(x => x.Source)
            .NotEmpty()
            .WithMessage("Source is required")
            .Must(BeValidSource)
            .WithMessage("Invalid lead source. Valid values: Webshop, TradeShow, Referral, Cold, Partner, Marketing, Direct");

        RuleFor(x => x.AssignedTo)
            .NotEmpty()
            .WithMessage("AssignedTo is required");
    }

    private bool BeValidSource(string source)
    {
        return Enum.TryParse<LeadSource>(source, ignoreCase: true, out _);
    }
}
