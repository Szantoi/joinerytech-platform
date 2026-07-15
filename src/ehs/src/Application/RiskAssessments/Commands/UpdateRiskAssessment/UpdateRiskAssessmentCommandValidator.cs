using FluentValidation;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.UpdateRiskAssessment;

/// <summary>
/// Input validation: required fields + 1-5 rating scale (→ HTTP 400).
/// </summary>
public class UpdateRiskAssessmentCommandValidator : AbstractValidator<UpdateRiskAssessmentCommand>
{
    public UpdateRiskAssessmentCommandValidator()
    {
        RuleFor(x => x.RiskAssessmentId)
            .NotEmpty();

        RuleFor(x => x.TenantId)
            .NotEmpty();

        RuleFor(x => x.HazardDescription)
            .NotEmpty()
            .MaximumLength(1000);

        RuleFor(x => x.Severity)
            .IsInEnum()
            .WithMessage("Severity must be within the 1-5 scale");

        RuleFor(x => x.Likelihood)
            .IsInEnum()
            .WithMessage("Likelihood must be within the 1-5 scale");

        RuleFor(x => x.ReviewDueDate)
            .GreaterThan(DateTimeOffset.UtcNow)
            .WithMessage("Review due date must be in the future");

        RuleFor(x => x.LocationId)
            .NotEqual(Guid.Empty)
            .When(x => x.LocationId.HasValue)
            .WithMessage("LocationId must be a valid id or null");
    }
}
