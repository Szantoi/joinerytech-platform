using FluentValidation;

namespace SpaceOS.Modules.CRM.Application.Commands.DisqualifyLead;

/// <summary>
/// Validator for DisqualifyLeadCommand
/// </summary>
public class DisqualifyLeadValidator : AbstractValidator<DisqualifyLeadCommand>
{
    public DisqualifyLeadValidator()
    {
        RuleFor(x => x.LeadId)
            .NotEmpty()
            .WithMessage("LeadId is required");

        RuleFor(x => x.TenantId)
            .NotEmpty()
            .WithMessage("TenantId is required");

        RuleFor(x => x.Reason)
            .NotEmpty()
            .WithMessage("Disqualification reason is required")
            .MaximumLength(500)
            .WithMessage("Reason must not exceed 500 characters");
    }
}
