using FluentValidation;
using SpaceOS.Modules.DMS.Application.Commands;

namespace SpaceOS.Modules.DMS.Application.Validators;

/// <summary>
/// Validator for CreateTagCommand.
/// </summary>
public class CreateTagCommandValidator
    : AbstractValidator<CreateTagCommand>
{
    public CreateTagCommandValidator()
    {
        RuleFor(x => x.TenantId)
            .NotEmpty()
            .WithMessage("TenantId is required");

        RuleFor(x => x.Name)
            .NotEmpty()
            .WithMessage("Name is required")
            .MaximumLength(50)
            .WithMessage("Name must not exceed 50 characters");

        RuleFor(x => x.Color)
            .MaximumLength(20)
            .WithMessage("Color must not exceed 20 characters")
            .When(x => !string.IsNullOrEmpty(x.Color));
    }
}
