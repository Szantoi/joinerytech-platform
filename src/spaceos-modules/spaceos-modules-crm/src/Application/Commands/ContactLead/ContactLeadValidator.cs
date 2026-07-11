using FluentValidation;

namespace SpaceOS.Modules.CRM.Application.Commands.ContactLead;

/// <summary>
/// Validator for ContactLeadCommand
/// </summary>
public class ContactLeadValidator : AbstractValidator<ContactLeadCommand>
{
    public ContactLeadValidator()
    {
        RuleFor(x => x.LeadId)
            .NotEmpty()
            .WithMessage("LeadId is required");

        RuleFor(x => x.TenantId)
            .NotEmpty()
            .WithMessage("TenantId is required");
    }
}
