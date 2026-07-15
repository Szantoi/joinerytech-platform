using FluentValidation;

namespace SpaceOS.Modules.Ehs.Application.Ppe.Commands.CreatePpeItem;

/// <summary>
/// Validator for CreatePpeItemCommand
/// </summary>
public class CreatePpeItemCommandValidator : AbstractValidator<CreatePpeItemCommand>
{
    public CreatePpeItemCommandValidator()
    {
        RuleFor(x => x.TenantId)
            .NotEmpty()
            .WithMessage("TenantId is required");

        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(200)
            .WithMessage("Name is required and must be max 200 characters");

        RuleFor(x => x.Category)
            .IsInEnum()
            .WithMessage("Invalid PPE category");

        RuleFor(x => x.DefaultLifetimeMonths)
            .GreaterThan(0)
            .When(x => x.DefaultLifetimeMonths.HasValue)
            .WithMessage("DefaultLifetimeMonths must be positive");
    }
}
