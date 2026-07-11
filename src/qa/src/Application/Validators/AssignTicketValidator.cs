using FluentValidation;
using SpaceOS.Modules.QA.Application.Commands;

namespace SpaceOS.Modules.QA.Application.Validators;

/// <summary>
/// Validator for AssignTicketCommand.
/// </summary>
public class AssignTicketValidator : AbstractValidator<AssignTicketCommand>
{
    public AssignTicketValidator()
    {
        RuleFor(x => x.TicketId)
            .NotNull().WithMessage("Ticket ID is required");

        RuleFor(x => x.AssigneeId)
            .NotEmpty().WithMessage("Assignee ID is required");

        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("Tenant ID is required");
    }
}
