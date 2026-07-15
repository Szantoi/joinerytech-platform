using FluentValidation;

namespace SpaceOS.Modules.Ehs.Application.Ppe.Commands.ReturnPpeIssuance;

/// <summary>
/// Validator for ReturnPpeIssuanceCommand
/// </summary>
public class ReturnPpeIssuanceCommandValidator : AbstractValidator<ReturnPpeIssuanceCommand>
{
    public ReturnPpeIssuanceCommandValidator()
    {
        RuleFor(x => x.IssuanceId)
            .NotEmpty()
            .WithMessage("IssuanceId is required");

        RuleFor(x => x.TenantId)
            .NotEmpty()
            .WithMessage("TenantId is required");
    }
}
