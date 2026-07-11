namespace SpaceOS.Modules.Kontrolling.Application.Commands.CreateCostAdjustment;

using FluentValidation;
using SpaceOS.Modules.Kontrolling.Domain.Enums;

/// <summary>
/// Validator for CreateCostAdjustmentCommand
/// </summary>
public sealed class CreateCostAdjustmentCommandValidator
    : AbstractValidator<CreateCostAdjustmentCommand>
{
    public CreateCostAdjustmentCommandValidator()
    {
        RuleFor(x => x.TenantId)
            .NotEmpty()
            .WithMessage("TenantId is required");

        RuleFor(x => x.Amount)
            .NotEqual(0)
            .WithMessage("Adjustment amount cannot be zero");

        RuleFor(x => x.Currency)
            .NotEmpty()
            .WithMessage("Currency is required");

        RuleFor(x => x.Reason)
            .NotEmpty()
            .MinimumLength(10)
            .WithMessage("Reason must be at least 10 characters");

        RuleFor(x => x.Category)
            .IsInEnum()
            .WithMessage("Invalid cost category");

        RuleFor(x => x.Scope)
            .IsInEnum()
            .WithMessage("Invalid adjustment scope");

        When(x => x.Scope == AdjustmentScope.Project, () =>
        {
            RuleFor(x => x.ProjectId)
                .NotNull()
                .WithMessage("ProjectId is required when scope is Project");
        });

        When(x => x.Scope == AdjustmentScope.Portfolio, () =>
        {
            RuleFor(x => x.ProjectId)
                .Null()
                .WithMessage("ProjectId must be null when scope is Portfolio");
        });

        RuleFor(x => x.CreatedByUserId)
            .NotEmpty()
            .WithMessage("CreatedByUserId is required");
    }
}
