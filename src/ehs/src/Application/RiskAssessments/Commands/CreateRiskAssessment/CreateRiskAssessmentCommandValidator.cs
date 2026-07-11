using FluentValidation;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.CreateRiskAssessment;

public class CreateRiskAssessmentCommandValidator : AbstractValidator<CreateRiskAssessmentCommand>
{
    public CreateRiskAssessmentCommandValidator()
    {
        RuleFor(x => x.TenantId)
            .NotEmpty();

        RuleFor(x => x.HazardDescription)
            .NotEmpty()
            .MaximumLength(500);

        RuleFor(x => x.AssessedBy)
            .NotEmpty();

        RuleFor(x => x.ReviewDueDate)
            .GreaterThan(DateTimeOffset.UtcNow)
            .WithMessage("Review due date must be in the future");
    }
}
