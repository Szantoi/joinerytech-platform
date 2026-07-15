using FluentValidation;

namespace SpaceOS.Modules.Ehs.Application.CorrectiveActions.Commands.CompleteCorrectiveAction;

/// <summary>
/// Validator for CompleteCorrectiveActionCommand
/// </summary>
public class CompleteCorrectiveActionCommandValidator : AbstractValidator<CompleteCorrectiveActionCommand>
{
    public CompleteCorrectiveActionCommandValidator()
    {
        RuleFor(x => x.CorrectiveActionId)
            .NotEmpty()
            .WithMessage("CorrectiveActionId is required");

        RuleFor(x => x.TenantId)
            .NotEmpty()
            .WithMessage("TenantId is required");
    }
}
