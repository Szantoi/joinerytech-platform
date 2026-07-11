using FluentValidation;

namespace SpaceOS.Modules.Ehs.Application.Incidents.Commands.AddWitness;

public class AddWitnessCommandValidator : AbstractValidator<AddWitnessCommand>
{
    public AddWitnessCommandValidator()
    {
        RuleFor(x => x.IncidentId)
            .NotEmpty();

        RuleFor(x => x.TenantId)
            .NotEmpty();

        RuleFor(x => x.EmployeeId)
            .NotEmpty();

        RuleFor(x => x.Statement)
            .NotEmpty()
            .MaximumLength(2000);
    }
}
