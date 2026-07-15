using FluentValidation;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.ApproveRiskAssessment;

public class ApproveRiskAssessmentCommandValidator : AbstractValidator<ApproveRiskAssessmentCommand>
{
    public ApproveRiskAssessmentCommandValidator()
    {
        RuleFor(x => x.RiskAssessmentId).NotEmpty();
        RuleFor(x => x.TenantId).NotEmpty();
    }
}
