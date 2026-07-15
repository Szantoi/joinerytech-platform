using FluentValidation;

namespace SpaceOS.Modules.Ehs.Application.Ppe.Commands.IssuePpe;

/// <summary>
/// Validator for IssuePpeCommand
/// </summary>
public class IssuePpeCommandValidator : AbstractValidator<IssuePpeCommand>
{
    public IssuePpeCommandValidator()
    {
        RuleFor(x => x.TenantId)
            .NotEmpty()
            .WithMessage("TenantId is required");

        RuleFor(x => x.EmployeeId)
            .NotEmpty()
            .WithMessage("EmployeeId is required");

        RuleFor(x => x.PpeItemId)
            .NotEmpty()
            .WithMessage("PpeItemId is required");

        RuleFor(x => x.IssuedBy)
            .NotEmpty()
            .WithMessage("IssuedBy is required");

        RuleFor(x => x.Quantity)
            .GreaterThan(0)
            .WithMessage("Quantity must be positive");

        RuleFor(x => x.ExpiresAt)
            .GreaterThan(DateTimeOffset.UtcNow)
            .When(x => x.ExpiresAt.HasValue)
            .WithMessage("ExpiresAt must be in the future");
    }
}
