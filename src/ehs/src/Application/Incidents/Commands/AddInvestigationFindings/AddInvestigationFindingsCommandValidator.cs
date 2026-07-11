using FluentValidation;

namespace SpaceOS.Modules.Ehs.Application.Incidents.Commands.AddInvestigationFindings;

public class AddInvestigationFindingsCommandValidator : AbstractValidator<AddInvestigationFindingsCommand>
{
    public AddInvestigationFindingsCommandValidator()
    {
        RuleFor(x => x.IncidentId)
            .NotEmpty();

        RuleFor(x => x.TenantId)
            .NotEmpty();

        RuleFor(x => x.Findings)
            .NotEmpty()
            .MaximumLength(2000);

        RuleFor(x => x.RootCause)
            .NotEmpty()
            .MaximumLength(1000);

        RuleFor(x => x.Recommendations)
            .MaximumLength(1000)
            .When(x => x.Recommendations != null);
    }
}
