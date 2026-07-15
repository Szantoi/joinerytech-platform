using FluentValidation;

namespace SpaceOS.Modules.Ehs.Application.Ppe.Commands.ReplacePpeIssuance;

/// <summary>
/// Validator for ReplacePpeIssuanceCommand
/// </summary>
public class ReplacePpeIssuanceCommandValidator : AbstractValidator<ReplacePpeIssuanceCommand>
{
    public ReplacePpeIssuanceCommandValidator()
    {
        RuleFor(x => x.IssuanceId)
            .NotEmpty()
            .WithMessage("IssuanceId is required");

        RuleFor(x => x.TenantId)
            .NotEmpty()
            .WithMessage("TenantId is required");

        RuleFor(x => x.ReplacedBy)
            .NotEmpty()
            .WithMessage("ReplacedBy is required");

        RuleFor(x => x.NewExpiresAt)
            .GreaterThan(DateTimeOffset.UtcNow)
            .When(x => x.NewExpiresAt.HasValue)
            .WithMessage("NewExpiresAt must be in the future");
    }
}
