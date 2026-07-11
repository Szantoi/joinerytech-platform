using FluentValidation;

namespace SpaceOS.Modules.CRM.Application.Commands.ConvertOpportunityToQuote;

/// <summary>
/// Validator for ConvertOpportunityToQuoteCommand
/// </summary>
public class ConvertOpportunityToQuoteValidator : AbstractValidator<ConvertOpportunityToQuoteCommand>
{
    public ConvertOpportunityToQuoteValidator()
    {
        RuleFor(x => x.OpportunityId)
            .NotEmpty()
            .WithMessage("OpportunityId is required");
    }
}
