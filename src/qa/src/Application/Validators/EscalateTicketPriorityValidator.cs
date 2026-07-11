using FluentValidation;
using SpaceOS.Modules.QA.Application.Commands;

namespace SpaceOS.Modules.QA.Application.Validators;

/// <summary>
/// Validator for EscalateTicketPriorityCommand.
/// </summary>
public class EscalateTicketPriorityValidator : AbstractValidator<EscalateTicketPriorityCommand>
{
    public EscalateTicketPriorityValidator()
    {
        RuleFor(x => x.TicketId)
            .NotNull().WithMessage("Ticket ID is required");

        RuleFor(x => x.NewPriority)
            .IsInEnum().WithMessage("Valid priority is required");

        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("Tenant ID is required");
    }
}
