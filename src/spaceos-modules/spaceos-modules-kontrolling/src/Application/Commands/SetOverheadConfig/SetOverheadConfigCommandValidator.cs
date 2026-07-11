using FluentValidation;
using SpaceOS.Modules.Kontrolling.Domain.Enums;

namespace SpaceOS.Modules.Kontrolling.Application.Commands.SetOverheadConfig;

/// <summary>
/// Validator for SetOverheadConfigCommand
/// </summary>
public sealed class SetOverheadConfigCommandValidator : AbstractValidator<SetOverheadConfigCommand>
{
    public SetOverheadConfigCommandValidator()
    {
        RuleFor(x => x.TenantId)
            .NotEmpty()
            .WithMessage("TenantId is required");

        RuleFor(x => x.Method)
            .IsInEnum()
            .WithMessage("Invalid overhead allocation method");

        RuleFor(x => x.Rate)
            .GreaterThanOrEqualTo(0)
            .WithMessage("Overhead rate must be non-negative");

        RuleFor(x => x.Rate)
            .LessThanOrEqualTo(1)
            .When(x => x.Method == OverheadAllocationMethod.DirectCostPercentage || x.Method == OverheadAllocationMethod.Revenue)
            .WithMessage("Percentage overhead rate must be between 0 and 1 (0-100%)");

        RuleFor(x => x.UpdatedBy)
            .NotEmpty()
            .WithMessage("UpdatedBy is required");
    }
}
