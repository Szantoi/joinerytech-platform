using FluentValidation;

namespace SpaceOS.Modules.Ehs.Application.Incidents.Commands.CloseIncident;

public class CloseIncidentCommandValidator : AbstractValidator<CloseIncidentCommand>
{
    public CloseIncidentCommandValidator()
    {
        RuleFor(x => x.IncidentId)
            .NotEmpty();

        RuleFor(x => x.TenantId)
            .NotEmpty();
    }
}
