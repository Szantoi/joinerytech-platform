using FluentValidation;
using SpaceOS.Modules.QA.Application.Commands;

namespace SpaceOS.Modules.QA.Application.Validators;

/// <summary>
/// Validator for RejectTicketCommand.
/// </summary>
public class RejectTicketValidator : AbstractValidator<RejectTicketCommand>
{
    public RejectTicketValidator()
    {
        RuleFor(x => x.TicketId)
            .NotNull().WithMessage("Ticket ID is required");

        RuleFor(x => x.Reason)
            .NotEmpty().WithMessage("Rejection reason is required")
            .MinimumLength(10).WithMessage("Rejection reason must be at least 10 characters");

        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("Tenant ID is required");
    }
}
