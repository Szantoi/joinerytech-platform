using FluentValidation;
using SpaceOS.Modules.QA.Application.Commands;

namespace SpaceOS.Modules.QA.Application.Validators;

/// <summary>
/// Validator for ReopenTicketCommand.
/// </summary>
public class ReopenTicketValidator : AbstractValidator<ReopenTicketCommand>
{
    public ReopenTicketValidator()
    {
        RuleFor(x => x.TicketId)
            .NotNull().WithMessage("Ticket ID is required");

        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("Tenant ID is required");
    }
}
