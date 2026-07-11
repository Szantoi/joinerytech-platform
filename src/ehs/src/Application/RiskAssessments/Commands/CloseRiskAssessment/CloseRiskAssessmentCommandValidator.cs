using FluentValidation;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.CloseRiskAssessment;

public class CloseRiskAssessmentCommandValidator : AbstractValidator<CloseRiskAssessmentCommand>
{
    public CloseRiskAssessmentCommandValidator()
    {
        RuleFor(x => x.RiskAssessmentId)
            .NotEmpty();

        RuleFor(x => x.TenantId)
            .NotEmpty();
    }
}
