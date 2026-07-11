# JoineryTech CRM Domain Model - C# Skeleton Code

**Purpose:** Reference implementation skeletons for .NET 8 backend.

**Note:** These are **skeleton/pseudo-code** examples, not complete implementations. Full implementation should include:
- Proper exception handling
- Logging
- Unit tests
- EF Core mapping configurations
- CQRS command/query handlers

---

## File Structure

```
JoineryTech.CRM.Domain/
  ├── Aggregates/
  │   ├── Lead.cs
  │   ├── Opportunity.cs
  │   └── Activity.cs (child entity)
  ├── ValueObjects/
  │   ├── ContactInfo.cs
  │   ├── Money.cs
  │   ├── LeadScore.cs
  │   └── LeadSource.cs
  ├── Enums/
  │   ├── LeadStatus.cs
  │   ├── OpportunityStatus.cs
  │   └── ActivityType.cs
  ├── Services/
  │   ├── ILeadScoringService.cs
  │   └── IOpportunityForecastService.cs
  ├── Repositories/
  │   ├── ILeadRepository.cs
  │   └── IOpportunityRepository.cs
  ├── Events/
  │   ├── LeadCreatedEvent.cs
  │   ├── LeadQualifiedEvent.cs
  │   ├── OpportunityCreatedEvent.cs
  │   └── OpportunityWonEvent.cs
  └── Exceptions/
      ├── InvalidStateTransitionException.cs
      └── DomainException.cs
```

---

## Usage Notes

1. **Base Classes:** All aggregates inherit from `AggregateRoot<TId>` (from shared kernel)
2. **Value Objects:** Inherit from `ValueObject` base class (implements equality by value)
3. **Domain Events:** Use `AddDomainEvent()` method from `AggregateRoot`
4. **FSM Validation:** Throw `InvalidStateTransitionException` for invalid transitions
5. **Immutability:** Value Objects are immutable (no public setters)

---

## Implementation Checklist

- [ ] Shared kernel: `AggregateRoot`, `ValueObject`, `Entity` base classes
- [ ] Domain events infrastructure (publish/subscribe)
- [ ] Repository implementations (EF Core)
- [ ] Unit tests for FSM transitions (Lead, Opportunity)
- [ ] Unit tests for Value Object validation
- [ ] Integration tests for repositories
- [ ] CQRS command handlers (CreateLead, QualifyLead, ConvertToOpportunity, etc.)
- [ ] CQRS query handlers (GetLead, ListLeads, GetOpportunity, etc.)
- [ ] Event handlers (LeadQualified → send notification, etc.)

---

## Example: Lead Aggregate Usage

```csharp
// Create new lead
var contact = ContactInfo.Create(
    name: "John Doe",
    email: "john@acme.com",
    phone: "+36301234567",
    company: "Acme Furniture Ltd."
);

var lead = Lead.Create(
    tenantId: TenantId.Parse("tenant-123"),
    contact: contact,
    source: LeadSource.Website,
    assignedToUserId: UserId.Parse("user-456")
);

// Add to repository
await leadRepository.AddAsync(lead, ct);

// Publish domain events
await eventBus.PublishAsync(lead.DomainEvents, ct);

// Later: Mark as contacted
lead.MarkAsContacted();
await leadRepository.UpdateAsync(lead, ct);
await eventBus.PublishAsync(lead.DomainEvents, ct);

// Qualify lead
lead.Qualify();
await leadRepository.UpdateAsync(lead, ct);

// Convert to opportunity
var opportunity = lead.ConvertToOpportunity(
    customerId: CustomerId.Parse("customer-789"),
    title: "Kitchen cabinet order",
    estimatedValue: Money.Create(500_000, "HUF"),
    probability: 60m
);

await leadRepository.UpdateAsync(lead, ct);
await opportunityRepository.AddAsync(opportunity, ct);
await eventBus.PublishAsync(lead.DomainEvents.Concat(opportunity.DomainEvents), ct);
```

---

## Example: Opportunity Pipeline Advancement

```csharp
// Get opportunity
var opportunity = await opportunityRepository.GetByIdAsync(opportunityId, ct);

// Advance: Open → NeedsAssessment
opportunity.AdvanceToNeedsAssessment();
await opportunityRepository.UpdateAsync(opportunity, ct);

// Advance: NeedsAssessment → SolutionAssembly
opportunity.AdvanceToSolutionAssembly();
await opportunityRepository.UpdateAsync(opportunity, ct);

// Advance: SolutionAssembly → Proposal (requires Quote)
var quote = await quoteService.CreateQuoteAsync(...); // Sales module
opportunity.AdvanceToProposal(quote.Id);
await opportunityRepository.UpdateAsync(opportunity, ct);

// Advance: Proposal → Negotiation
opportunity.AdvanceToNegotiation();
await opportunityRepository.UpdateAsync(opportunity, ct);

// Win: Negotiation → Won (requires Order)
var order = await orderService.CreateOrderAsync(...); // Sales module
opportunity.MarkAsWon(order.Id);
await opportunityRepository.UpdateAsync(opportunity, ct);
await eventBus.PublishAsync(opportunity.DomainEvents, ct);
```

---

## Example: Lead Scoring

```csharp
// Recalculate lead score after activity
var lead = await leadRepository.GetByIdAsync(leadId, ct);

lead.AddActivity(
    type: ActivityType.Call,
    description: "Initial discovery call - interested in kitchen cabinets",
    performedBy: currentUserId
);

var newScore = leadScoringService.CalculateScore(lead);
lead.UpdateScore(newScore);

await leadRepository.UpdateAsync(lead, ct);
```

---

**See individual .cs files for detailed skeleton implementations.**
