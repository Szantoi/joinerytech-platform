using FluentValidation;

namespace Ehs.Application.Commands.CreateRiskAssessment;

/// <summary>
/// Validator for CreateRiskAssessmentCommand.
/// Implements v4-M3 domain rule: High-risk assessments require notes.
/// </summary>
public class CreateRiskAssessmentValidator : AbstractValidator<CreateRiskAssessmentCommand>
{
    public CreateRiskAssessmentValidator()
    {
        RuleFor(x => x.AssessmentId)
            .GreaterThan(0)
            .WithMessage("AssessmentId must be a positive integer");

        RuleFor(x => x.LikelihoodBefore)
            .InclusiveBetween(1, 5)
            .WithMessage("LikelihoodBefore must be between 1 and 5");

        RuleFor(x => x.SeverityBefore)
            .InclusiveBetween(1, 5)
            .WithMessage("SeverityBefore must be between 1 and 5");

        RuleFor(x => x.LikelihoodAfter)
            .InclusiveBetween(1, 5)
            .WithMessage("LikelihoodAfter must be between 1 and 5");

        RuleFor(x => x.SeverityAfter)
            .InclusiveBetween(1, 5)
            .WithMessage("SeverityAfter must be between 1 and 5");

        RuleFor(x => x.Category)
            .NotEmpty()
            .WithMessage("Category is required")
            .MaximumLength(100)
            .WithMessage("Category must not exceed 100 characters");

        RuleFor(x => x.Notes)
            .NotNull()
            .MaximumLength(2000)
            .WithMessage("Notes must not exceed 2000 characters");

        // v4-M3 Domain Rule: High-risk assessments (score > 15) require notes
        RuleFor(x => x)
            .Must(cmd =>
            {
                var riskScore = cmd.LikelihoodBefore * cmd.SeverityBefore;
                if (riskScore > 15)
                {
                    return !string.IsNullOrWhiteSpace(cmd.Notes);
                }
                return true;
            })
            .WithMessage("High-risk assessments (score > 15) require mitigation notes")
            .WithName("Notes");
    }
}
