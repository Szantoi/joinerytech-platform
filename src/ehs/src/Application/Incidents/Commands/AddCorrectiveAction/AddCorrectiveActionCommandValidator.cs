using FluentValidation;

namespace SpaceOS.Modules.Ehs.Application.Incidents.Commands.AddCorrectiveAction;

public class AddCorrectiveActionCommandValidator : AbstractValidator<AddCorrectiveActionCommand>
{
    public AddCorrectiveActionCommandValidator()
    {
        RuleFor(x => x.IncidentId)
            .NotEmpty();

        RuleFor(x => x.TenantId)
            .NotEmpty();

        RuleFor(x => x.Description)
            .NotEmpty()
            .MaximumLength(1000);

        RuleFor(x => x.AssignedTo)
            .NotEmpty();

        RuleFor(x => x.DueDate)
            .GreaterThan(DateTimeOffset.UtcNow)
            .WithMessage("Due date must be in the future");
    }
}
