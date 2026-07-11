using FluentAssertions;
using SpaceOS.Modules.CRM.Domain.Aggregates;
using SpaceOS.Modules.CRM.Domain.Enums;
using SpaceOS.Modules.CRM.Domain.Events;
using SpaceOS.Modules.CRM.Domain.ValueObjects;
using Xunit;

namespace SpaceOS.Modules.CRM.Tests.Integration.FSM;

/// <summary>
/// Integration tests for Lead → Opportunity FSM transitions
/// Tests valid/invalid conversions and immutability
/// </summary>
public class LeadConversionTests
{
    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly Guid _assignedTo = Guid.NewGuid();

    [Fact]
    public void ConvertToOpportunity_FromQualifiedLead_ShouldSucceed()
    {
        // Arrange: Create and qualify a Lead
        var contactInfo = CreateTestContact();
        var lead = Lead.Create(contactInfo, LeadSource.Webshop, _assignedTo, _tenantId);

        // Add activity to meet qualification requirement
        lead.AddActivity(ActivityType.Call, "Initial consultation call", _assignedTo);
        lead.Contact();
        lead.Qualify();

        lead.Status.Should().Be(LeadState.Qualified);

        var estimatedValue = new Money(50000, Currency.HUF);

        // Act: Convert to Opportunity
        var opportunity = lead.ConvertToOpportunity(estimatedValue);

        // Assert: Opportunity created with correct data
        opportunity.Should().NotBeNull();
        opportunity.TenantId.Should().Be(_tenantId);
        opportunity.LeadRef.Should().Be(lead.Id);
        opportunity.ContactInfo.Name.Should().Be(contactInfo.Name);
        opportunity.ContactInfo.Email.Value.Should().Be(contactInfo.Email.Value);
        opportunity.EstimatedValue.Should().Be(estimatedValue);
        opportunity.Status.Should().Be(OpportunityStatus.Draft);

        // Assert: Lead marked as converted
        lead.Status.Should().Be(LeadState.ConvertedToOpportunity);
        lead.OpportunityRef.Should().Be(opportunity.Id);

        // Assert: Domain event published
        var events = lead.PopDomainEvents();
        events.Should().ContainSingle(e => e is LeadConvertedToOpportunityEvent);

        var conversionEvent = events.OfType<LeadConvertedToOpportunityEvent>().Single();
        conversionEvent.LeadId.Should().Be(lead.Id);
        conversionEvent.TenantId.Should().Be(_tenantId);
    }

    [Fact]
    public void ConvertToOpportunity_FromNonQualifiedLead_ShouldThrow()
    {
        // Arrange: Lead in New state (not qualified)
        var contactInfo = CreateTestContact();
        var lead = Lead.Create(contactInfo, LeadSource.Webshop, _assignedTo, _tenantId);

        lead.Status.Should().Be(LeadState.New);

        var estimatedValue = new Money(50000, Currency.HUF);

        // Act & Assert: Conversion should fail
        var act = () => lead.ConvertToOpportunity(estimatedValue);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*Qualified*");
    }

    [Fact]
    public void ConvertToOpportunity_FromDisqualifiedLead_ShouldThrow()
    {
        // Arrange: Disqualified Lead
        var contactInfo = CreateTestContact();
        var lead = Lead.Create(contactInfo, LeadSource.Webshop, _assignedTo, _tenantId);

        lead.Disqualify("Not interested");
        lead.Status.Should().Be(LeadState.Disqualified);

        var estimatedValue = new Money(50000, Currency.HUF);

        // Act & Assert: Conversion should fail
        var act = () => lead.ConvertToOpportunity(estimatedValue);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*Qualified*");
    }

    [Fact]
    public void ConvertToOpportunity_WhenAlreadyConverted_ShouldThrow()
    {
        // Arrange: Lead already converted
        var contactInfo = CreateTestContact();
        var lead = Lead.Create(contactInfo, LeadSource.Webshop, _assignedTo, _tenantId);

        lead.AddActivity(ActivityType.Call, "Call", _assignedTo);
        lead.Contact();
        lead.Qualify();

        var estimatedValue = new Money(50000, Currency.HUF);
        var opportunity = lead.ConvertToOpportunity(estimatedValue);

        lead.Status.Should().Be(LeadState.ConvertedToOpportunity);
        opportunity.Should().NotBeNull();

        // Act & Assert: Second conversion should fail
        var act = () => lead.ConvertToOpportunity(new Money(60000, Currency.HUF));

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*ConvertedToOpportunity*");
    }

    [Fact]
    public void OpportunityCreatedFromLead_ShouldBeImmutableReference()
    {
        // Arrange: Convert Lead to Opportunity
        var contactInfo = CreateTestContact();
        var lead = Lead.Create(contactInfo, LeadSource.Webshop, _assignedTo, _tenantId);

        lead.AddActivity(ActivityType.Call, "Call", _assignedTo);
        lead.Contact();
        lead.Qualify();

        var estimatedValue = new Money(50000, Currency.HUF);
        var opportunity = lead.ConvertToOpportunity(estimatedValue);

        // Assert: OpportunityRef is immutable
        lead.OpportunityRef.Should().Be(opportunity.Id);

        // Assert: Opportunity has immutable LeadRef
        opportunity.LeadRef.Should().Be(lead.Id);

        // Assert: No method exists to revert conversion (compile-time safety)
        // This test documents that Lead → Opportunity is irreversible
        lead.Status.Should().Be(LeadState.ConvertedToOpportunity);
    }

    [Fact]
    public void FullWorkflow_NewToQualifiedToOpportunity_ShouldSucceed()
    {
        // Arrange: New Lead
        var contactInfo = CreateTestContact();
        var lead = Lead.Create(contactInfo, LeadSource.Webshop, _assignedTo, _tenantId);

        lead.Status.Should().Be(LeadState.New);

        // Act: Progress through FSM
        lead.AddActivity(ActivityType.Email, "Initial contact", _assignedTo);
        lead.Contact();
        lead.Status.Should().Be(LeadState.Contacted);

        lead.AddActivity(ActivityType.Call, "Discovery call", _assignedTo);
        lead.Qualify();
        lead.Status.Should().Be(LeadState.Qualified);

        var estimatedValue = new Money(100000, Currency.HUF);
        var opportunity = lead.ConvertToOpportunity(estimatedValue);

        // Assert: Full workflow completed
        lead.Status.Should().Be(LeadState.ConvertedToOpportunity);
        opportunity.Should().NotBeNull();
        opportunity.Status.Should().Be(OpportunityStatus.Draft);
        opportunity.EstimatedValue.Amount.Should().Be(100000);
        opportunity.EstimatedValue.Currency.Should().Be(Currency.HUF);

        // Assert: Domain events captured entire journey
        var events = lead.PopDomainEvents();
        events.Should().Contain(e => e is LeadConvertedToOpportunityEvent);
    }

    private ContactInfo CreateTestContact(string name = "Test Company", string email = "test@example.com")
    {
        return new ContactInfo(
            name,
            new Email(email),
            null,
            "Test Contact Company");
    }
}
