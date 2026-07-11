using FluentValidation;

namespace SpaceOS.Modules.Ehs.Application.Incidents.Commands.ReopenIncident;

public class ReopenIncidentCommandValidator : AbstractValidator<ReopenIncidentCommand>
{
    public ReopenIncidentCommandValidator()
    {
        RuleFor(x => x.IncidentId)
            .NotEmpty();

        RuleFor(x => x.TenantId)
            .NotEmpty();
    }
}
