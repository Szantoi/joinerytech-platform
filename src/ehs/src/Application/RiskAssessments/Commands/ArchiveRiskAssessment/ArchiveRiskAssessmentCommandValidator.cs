using FluentValidation;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.ArchiveRiskAssessment;

public class ArchiveRiskAssessmentCommandValidator : AbstractValidator<ArchiveRiskAssessmentCommand>
{
    public ArchiveRiskAssessmentCommandValidator()
    {
        RuleFor(x => x.RiskAssessmentId).NotEmpty();
        RuleFor(x => x.TenantId).NotEmpty();
    }
}
