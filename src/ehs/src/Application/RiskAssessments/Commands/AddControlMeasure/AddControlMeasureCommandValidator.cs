using FluentValidation;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.AddControlMeasure;

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
    }
}
