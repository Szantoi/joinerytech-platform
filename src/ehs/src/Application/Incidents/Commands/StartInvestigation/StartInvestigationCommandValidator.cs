using FluentValidation;

namespace SpaceOS.Modules.Ehs.Application.Incidents.Commands.StartInvestigation;

public class StartInvestigationCommandValidator : AbstractValidator<StartInvestigationCommand>
{
    public StartInvestigationCommandValidator()
    {
        RuleFor(x => x.IncidentId)
            .NotEmpty();

        RuleFor(x => x.TenantId)
            .NotEmpty();

        RuleFor(x => x.InvestigatedBy)
            .NotEmpty();
    }
}
