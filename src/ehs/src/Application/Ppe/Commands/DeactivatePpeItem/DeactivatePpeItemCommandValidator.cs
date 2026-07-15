using FluentValidation;

namespace SpaceOS.Modules.Ehs.Application.Ppe.Commands.DeactivatePpeItem;

/// <summary>
/// Validator for DeactivatePpeItemCommand
/// </summary>
public class DeactivatePpeItemCommandValidator : AbstractValidator<DeactivatePpeItemCommand>
{
    public DeactivatePpeItemCommandValidator()
    {
        RuleFor(x => x.PpeItemId)
            .NotEmpty()
            .WithMessage("PpeItemId is required");

        RuleFor(x => x.TenantId)
            .NotEmpty()
            .WithMessage("TenantId is required");
    }
}
