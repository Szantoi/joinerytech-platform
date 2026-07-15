using FluentValidation;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.AddControlMeasure;

/// <summary>
/// Input validation. CAPA fields are optional, but assignee and due date
/// must be provided together for a CAPA to spawn.
/// </summary>
public class AddControlMeasureCommandValidator : AbstractValidator<AddControlMeasureCommand>
{
    public AddControlMeasureCommandValidator()
    {
        RuleFor(x => x.RiskAssessmentId)
            .NotEmpty();

        RuleFor(x => x.TenantId)
            .NotEmpty();

        RuleFor(x => x.ControlMeasure)
            .NotEmpty()
            .MaximumLength(1000);

        RuleFor(x => x.ResponsiblePerson)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(x => x.CapaDescription)
            .MaximumLength(1000);

        RuleFor(x => x.CapaDueDate)
            .GreaterThan(DateTimeOffset.UtcNow)
            .When(x => x.CapaDueDate.HasValue)
            .WithMessage("CAPA due date must be in the future");

        RuleFor(x => x.CapaAssignedTo)
            .NotEmpty()
            .When(x => x.CapaDueDate.HasValue)
            .WithMessage("CapaAssignedTo is required when CapaDueDate is provided");

        RuleFor(x => x.CapaDueDate)
            .NotEmpty()
            .When(x => x.CapaAssignedTo.HasValue)
            .WithMessage("CapaDueDate is required when CapaAssignedTo is provided");
    }
}
