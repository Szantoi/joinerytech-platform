using FluentValidation;

namespace SpaceOS.Modules.Ehs.Application.Ppe.Commands.AcknowledgePpeIssuance;

/// <summary>
/// Validator for AcknowledgePpeIssuanceCommand
/// </summary>
public class AcknowledgePpeIssuanceCommandValidator : AbstractValidator<AcknowledgePpeIssuanceCommand>
{
    public AcknowledgePpeIssuanceCommandValidator()
    {
        RuleFor(x => x.IssuanceId)
            .NotEmpty()
            .WithMessage("IssuanceId is required");

        RuleFor(x => x.TenantId)
            .NotEmpty()
            .WithMessage("TenantId is required");
    }
}
