using MediatR;
using Ardalis.Result;

namespace SpaceOS.Modules.CRM.Application.Commands.ConvertOpportunityToQuote;

/// <summary>
/// Command to convert an Opportunity to a Sales Quote (ADR-063)
/// </summary>
public record ConvertOpportunityToQuoteCommand : IRequest<Result<ConversionResult>>
{
    public Guid OpportunityId { get; init; }
}

/// <summary>
/// Result of a conversion request
/// </summary>
public record ConversionResult
{
    public Guid ConversionId { get; init; }
}
