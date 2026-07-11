using System;
using FluentAssertions;
using SpaceOS.Modules.CRM.Domain.Aggregates;
using SpaceOS.Modules.CRM.Domain.Enums;
using SpaceOS.Modules.CRM.Domain.ValueObjects;
using Xunit;

namespace SpaceOS.Modules.CRM.Tests.Integration.API;

/// <summary>
/// Domain-level tests for ConvertOpportunityToQuote FSM transitions (ADR-063)
/// Tests happy path and idempotent retry scenarios at domain level
/// </summary>
public class ConvertOpportunityToQuote_Minimal_Tests
{
    [Fact]
    public void StartConversion_FromNegotiation_Success()
    {
        // Arrange
        var opportunity = CreateOpportunityInNegotiation();
        var conversionId = Guid.NewGuid();

        // Act
        opportunity.StartConversion(conversionId);

        // Assert
        opportunity.Status.Should().Be(OpportunityStatus.Converting);
        opportunity.ConversionId.Should().Be(conversionId);
        opportunity.ConversionStartedAt.Should().NotBeNull();
    }

    [Fact]
    public void StartConversion_Idempotent_SameConversionId_NoError()
    {
        // Arrange
        var opportunity = CreateOpportunityInNegotiation();
        var conversionId = Guid.NewGuid();

        // Act: Call twice with same conversionId
        opportunity.StartConversion(conversionId);
        opportunity.StartConversion(conversionId); // Idempotent - should not throw

        // Assert
        opportunity.Status.Should().Be(OpportunityStatus.Converting);
        opportunity.ConversionId.Should().Be(conversionId);
    }

    [Fact]
    public void CompleteConversion_FromConverting_TransitionsToWon()
    {
        // Arrange
        var opportunity = CreateOpportunityInNegotiation();
        var conversionId = Guid.NewGuid();
        opportunity.StartConversion(conversionId);

        var quoteId = Guid.NewGuid();

        // Act
        opportunity.CompleteConversion(quoteId);

        // Assert
        opportunity.Status.Should().Be(OpportunityStatus.Won);
        opportunity.QuoteRef.Should().Be(quoteId);
        opportunity.ConversionId.Should().BeNull(); // Cleared after completion
        opportunity.Probability.Should().Be(100);
        opportunity.ClosedAt.Should().NotBeNull();
    }

    [Fact]
    public void RollbackConversion_FromConverting_TransitionsToNegotiation()
    {
        // Arrange
        var opportunity = CreateOpportunityInNegotiation();
        var conversionId = Guid.NewGuid();
        opportunity.StartConversion(conversionId);

        // Act
        opportunity.RollbackConversion("Insufficient inventory");

        // Assert
        opportunity.Status.Should().Be(OpportunityStatus.Negotiation);
        opportunity.ConversionId.Should().BeNull(); // Cleared after rollback
        opportunity.ConversionStartedAt.Should().BeNull();
    }

    [Fact]
    public void StartConversion_FromDraft_ThrowsInvalidOperationException()
    {
        // Arrange
        var opportunity = CreateOpportunityInDraft();
        var conversionId = Guid.NewGuid();

        // Act & Assert
        Assert.Throws<InvalidOperationException>(() =>
            opportunity.StartConversion(conversionId));
    }

    private Opportunity CreateOpportunityInDraft()
    {
        var contactInfo = ContactInfo.Create("John Doe", Email.Create("john@example.com"));
        var money = Money.Create(100000, Currency.HUF);
        var tenantId = Guid.NewGuid();
        var assignedTo = Guid.NewGuid();

        return Opportunity.Create(contactInfo, money, assignedTo, tenantId);
    }

    private Opportunity CreateOpportunityInNegotiation()
    {
        var opportunity = CreateOpportunityInDraft();

        // Transition: Draft → Proposal → Negotiation
        opportunity.Propose(DateTime.UtcNow.AddDays(30));
        opportunity.Negotiate();

        return opportunity;
    }
}
