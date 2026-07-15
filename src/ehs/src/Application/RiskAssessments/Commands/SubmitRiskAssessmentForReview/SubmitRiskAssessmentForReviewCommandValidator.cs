using FluentValidation;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.SubmitRiskAssessmentForReview;

public class SubmitRiskAssessmentForReviewCommandValidator
    : AbstractValidator<SubmitRiskAssessmentForReviewCommand>
{
    public SubmitRiskAssessmentForReviewCommandValidator()
    {
        RuleFor(x => x.RiskAssessmentId).NotEmpty();
        RuleFor(x => x.TenantId).NotEmpty();
    }
}
