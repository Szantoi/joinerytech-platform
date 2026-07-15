using FluentValidation;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.ReturnRiskAssessmentToDraft;

public class ReturnRiskAssessmentToDraftCommandValidator
    : AbstractValidator<ReturnRiskAssessmentToDraftCommand>
{
    public ReturnRiskAssessmentToDraftCommandValidator()
    {
        RuleFor(x => x.RiskAssessmentId).NotEmpty();
        RuleFor(x => x.TenantId).NotEmpty();
    }
}
