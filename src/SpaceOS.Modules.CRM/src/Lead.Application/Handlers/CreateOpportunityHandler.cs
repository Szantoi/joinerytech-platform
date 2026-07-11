using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.CRM.Application.Commands;
using SpaceOS.Modules.CRM.Domain.Aggregates;
using SpaceOS.Modules.CRM.Domain.ValueObjects;

namespace SpaceOS.Modules.CRM.Application.Handlers;

/// <summary>
/// Handler for CreateOpportunityCommand.
/// Creates opportunity directly (not from lead conversion).
/// Initiates in "Open" status.
/// </summary>
public sealed class CreateOpportunityHandler : IRequestHandler<CreateOpportunityCommand, Result<OpportunityResponse>>
{
    private readonly IOpportunityRepository _opportunityRepository;
    private readonly IPublisher _publisher;

    public CreateOpportunityHandler(IOpportunityRepository opportunityRepository, IPublisher publisher)
    {
        _opportunityRepository = opportunityRepository;
        _publisher = publisher;
    }

    public async Task<Result<OpportunityResponse>> Handle(CreateOpportunityCommand request, CancellationToken cancellationToken)
    {
        // Create contact info value object
        var contactInfo = ContactInfo.Create(
            request.ContactName,
            request.Email,
            request.Phone,
            request.Company);

        // Create money value object
        var estimatedValue = new Money(request.EstimatedValue, request.Currency);

        // Create opportunity aggregate using factory method
        // Note: CreateDirect() is used (not from lead)
        var opportunityResult = Opportunity.CreateDirect(
            request.TenantId,
            request.CustomerId,
            contactInfo,
            request.Title,
            estimatedValue,
            request.ExpectedCloseDate.HasValue ? new DateTimeOffset(request.ExpectedCloseDate.Value) : null,
            request.AssignedToUserId,
            request.CreatedBy);

        if (!opportunityResult.IsSuccess)
            return opportunityResult.Map(x => MapToResponse(x));

        var opportunity = opportunityResult.Value;

        // Persist aggregate
        await _opportunityRepository.AddAsync(opportunity, cancellationToken).ConfigureAwait(false);

        // Publish domain events
        foreach (var domainEvent in opportunity.GetDomainEvents())
        {
            await _publisher.Publish(domainEvent, cancellationToken).ConfigureAwait(false);
        }

        opportunity.ClearDomainEvents();

        return Result.Success(MapToResponse(opportunity));
    }

    private static OpportunityResponse MapToResponse(Opportunity opportunity)
    {
        return new OpportunityResponse
        {
            Id = opportunity.Id,
            TenantId = opportunity.TenantId,
            Status = opportunity.Status.ToString(),
            LeadId = opportunity.LeadId,
            CustomerId = opportunity.CustomerId,
            ContactName = opportunity.ContactInfo.Name,
            Email = opportunity.ContactInfo.Email,
            Phone = opportunity.ContactInfo.Phone,
            Company = opportunity.ContactInfo.Company,
            Title = opportunity.Title,
            EstimatedValue = opportunity.EstimatedValue.Amount,
            Currency = opportunity.EstimatedValue.Currency,
            FinalValue = opportunity.FinalValue?.Amount,
            Probability = opportunity.Probability,
            ExpectedCloseDate = opportunity.ExpectedCloseDate?.DateTime,
            AssignedToUserId = opportunity.AssignedTo,
            OrderRef = opportunity.OrderId,
            QuoteRef = opportunity.QuoteId,
            LossReason = opportunity.LossReason,
            CompetitorName = opportunity.CompetitorName,
            ActivityCount = opportunity.Activities.Count,
            TaskCount = opportunity.Tasks.Count,
            OpenTaskCount = opportunity.Tasks.Count(t => !t.IsCompleted),
            CreatedAt = opportunity.CreatedAt,
            UpdatedAt = opportunity.UpdatedAt
        };
    }
}
