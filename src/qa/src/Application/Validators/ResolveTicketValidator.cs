using FluentValidation;
using SpaceOS.Modules.QA.Application.Commands;

namespace SpaceOS.Modules.QA.Application.Validators;

/// <summary>
/// Validator for ResolveTicketCommand.
/// </summary>
public class ResolveTicketValidator : AbstractValidator<ResolveTicketCommand>
{
    public ResolveTicketValidator()
    {
        RuleFor(x => x.TicketId)
            .NotNull().WithMessage("Ticket ID is required");

        RuleFor(x => x.ResolutionActions)
            .NotEmpty().WithMessage("At least one resolution action is required")
            .Must(actions => actions != null && actions.Count > 0)
            .WithMessage("At least one resolution action is required");

        RuleForEach(x => x.ResolutionActions).ChildRules(action =>
        {
            action.RuleFor(ra => ra.ActionType)
                .IsInEnum().WithMessage("Valid action type is required");

            action.RuleFor(ra => ra.Description)
                .NotEmpty().WithMessage("Action description is required");

            action.RuleFor(ra => ra.CostAmount)
                .GreaterThanOrEqualTo(0).WithMessage("Cost amount must be non-negative")
                .When(ra => ra.CostAmount.HasValue);
        });

        RuleFor(x => x.ResolutionNotes)
            .MaximumLength(1000).WithMessage("Resolution notes cannot exceed 1000 characters")
            .When(x => !string.IsNullOrEmpty(x.ResolutionNotes));

        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("Tenant ID is required");
    }
}
