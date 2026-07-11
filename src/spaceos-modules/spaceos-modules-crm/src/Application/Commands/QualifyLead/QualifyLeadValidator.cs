using FluentValidation;

namespace SpaceOS.Modules.CRM.Application.Commands.QualifyLead;

/// <summary>
/// Validator for QualifyLeadCommand
/// </summary>
public class QualifyLeadValidator : AbstractValidator<QualifyLeadCommand>
{
    public QualifyLeadValidator()
    {
        RuleFor(x => x.LeadId)
            .NotEmpty()
            .WithMessage("LeadId is required");

        RuleFor(x => x.TenantId)
            .NotEmpty()
            .WithMessage("TenantId is required");
    }
}
