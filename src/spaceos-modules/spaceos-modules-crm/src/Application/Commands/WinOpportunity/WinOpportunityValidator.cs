using FluentValidation;

namespace SpaceOS.Modules.CRM.Application.Commands.WinOpportunity;

/// <summary>
/// Validator for WinOpportunityCommand
/// </summary>
public class WinOpportunityValidator : AbstractValidator<WinOpportunityCommand>
{
    public WinOpportunityValidator()
    {
        RuleFor(x => x.OpportunityId)
            .NotEmpty()
            .WithMessage("OpportunityId is required");

        RuleFor(x => x.TenantId)
            .NotEmpty()
            .WithMessage("TenantId is required");

        RuleFor(x => x.WonBy)
            .NotEmpty()
            .WithMessage("WonBy is required");
    }
}
