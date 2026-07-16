using Ardalis.Result;
using FluentAssertions;
using SpaceOS.Modules.CRM.Domain.Aggregates;
using SpaceOS.Modules.CRM.Domain.Enums;
using SpaceOS.Modules.CRM.Domain.FSM;
using SpaceOS.Modules.CRM.Domain.ValueObjects;
using Xunit;

namespace SpaceOS.Modules.CRM.Tests.Domain;

/// <summary>
/// Lead FSM tests — the portal LEAD_FSM mirror
/// (modules/crm/services/fsm.ts + services/__tests__/leadFsm.test.ts).
///
/// Covers the nurturing branch added by CRM-BE-HOST and the module error
/// contract: illegal transition → ResultStatus.Conflict (HTTP 409),
/// payload guard → ResultStatus.Invalid (HTTP 400).
/// </summary>
public class LeadFsmTests
{
    private static readonly Guid TenantId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid UserId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private static Lead NewLead()
    {
        var contact = ContactInfo.Create("Kovács Béla", "kovacs.bela@example.hu", "+36301234567", "Faipar Kft.");
        var result = Lead.Create(TenantId, contact, LeadSource.Referral, UserId, UserId);
        result.IsSuccess.Should().BeTrue();
        return result.Value;
    }

    /// <summary>Drives the lead to the requested status through legal transitions.</summary>
    private static Lead LeadInStatus(LeadStatus status)
    {
        var lead = NewLead();
        if (status == LeadStatus.New) return lead;

        lead.Contact(null, UserId).IsSuccess.Should().BeTrue();
        if (status == LeadStatus.Contacted) return lead;

        lead.Qualify(null, UserId).IsSuccess.Should().BeTrue();
        if (status == LeadStatus.Qualified) return lead;

        switch (status)
        {
            case LeadStatus.Nurturing:
                lead.Nurture(null, UserId).IsSuccess.Should().BeTrue();
                return lead;
            case LeadStatus.Opportunity:
                lead.ConvertToOpportunity(Guid.NewGuid(), Guid.NewGuid(), UserId).IsSuccess.Should().BeTrue();
                return lead;
            case LeadStatus.Disqualified:
                lead.Disqualify("Nincs büdzsé", UserId).IsSuccess.Should().BeTrue();
                return lead;
            default:
                throw new ArgumentOutOfRangeException(nameof(status), status, "Unsupported seed status");
        }
    }

    // ── Main chain ──────────────────────────────────────────────────────────

    [Fact]
    public void NewLead_StartsInNewStatus()
    {
        NewLead().Status.Should().Be(LeadStatus.New);
    }

    [Fact]
    public void FullChain_ThroughNurturing_ReachesOpportunity()
    {
        var lead = NewLead();

        lead.Contact(null, UserId).IsSuccess.Should().BeTrue();
        lead.Status.Should().Be(LeadStatus.Contacted);

        lead.Qualify(null, UserId).IsSuccess.Should().BeTrue();
        lead.Status.Should().Be(LeadStatus.Qualified);

        lead.Nurture("Q4-ben újranézzük", UserId).IsSuccess.Should().BeTrue();
        lead.Status.Should().Be(LeadStatus.Nurturing);

        var opportunityId = Guid.NewGuid();
        lead.ConvertToOpportunity(opportunityId, Guid.NewGuid(), UserId).IsSuccess.Should().BeTrue();
        lead.Status.Should().Be(LeadStatus.Opportunity);
        lead.OpportunityRef.Should().Be(opportunityId);
    }

    [Fact]
    public void Convert_DirectlyFromQualified_Succeeds()
    {
        // The nurturing stop is optional — the portal LEAD_FSM allows
        // convert from both 'minosites' and 'nurturing'.
        var lead = LeadInStatus(LeadStatus.Qualified);

        lead.ConvertToOpportunity(Guid.NewGuid(), Guid.NewGuid(), UserId).IsSuccess.Should().BeTrue();
        lead.Status.Should().Be(LeadStatus.Opportunity);
    }

    // ── Nurture guards ──────────────────────────────────────────────────────

    [Theory]
    [InlineData(LeadStatus.New)]
    [InlineData(LeadStatus.Contacted)]
    [InlineData(LeadStatus.Nurturing)]
    [InlineData(LeadStatus.Opportunity)]
    [InlineData(LeadStatus.Disqualified)]
    public void Nurture_FromIllegalStatus_ReturnsConflict(LeadStatus status)
    {
        var lead = LeadInStatus(status);

        var result = lead.Nurture(null, UserId);

        result.Status.Should().Be(ResultStatus.Conflict);
        lead.Status.Should().Be(status, "a rejected transition must not mutate the aggregate");
    }

    [Fact]
    public void Nurture_RaisesNurturingStartedEvent()
    {
        var lead = LeadInStatus(LeadStatus.Qualified);
        lead.ClearDomainEvents();

        lead.Nurture("Parkolópálya", UserId).IsSuccess.Should().BeTrue();

        lead.GetDomainEvents().Should().ContainSingle()
            .Which.Should().BeOfType<SpaceOS.Modules.CRM.Domain.Events.LeadNurturingStartedEvent>()
            .Which.Notes.Should().Be("Parkolópálya");
    }

    // ── Discard (from any open status) ───────────────────────────────────────

    [Theory]
    [InlineData(LeadStatus.New)]
    [InlineData(LeadStatus.Contacted)]
    [InlineData(LeadStatus.Qualified)]
    [InlineData(LeadStatus.Nurturing)]
    public void Discard_FromAnyOpenStatus_Succeeds(LeadStatus status)
    {
        var lead = LeadInStatus(status);

        lead.Disqualify("Konkurenciát választotta", UserId).IsSuccess.Should().BeTrue();
        lead.Status.Should().Be(LeadStatus.Disqualified);
    }

    [Theory]
    [InlineData(LeadStatus.Opportunity)]
    [InlineData(LeadStatus.Disqualified)]
    public void Discard_FromTerminalStatus_ReturnsConflict(LeadStatus status)
    {
        var lead = LeadInStatus(status);

        lead.Disqualify("Túl késő", UserId).Status.Should().Be(ResultStatus.Conflict);
    }

    [Fact]
    public void Discard_WithoutReason_ReturnsInvalid_NotConflict()
    {
        // Payload guard → 400, distinct from an FSM violation → 409.
        var lead = LeadInStatus(LeadStatus.Qualified);

        lead.Disqualify("   ", UserId).Status.Should().Be(ResultStatus.Invalid);
        lead.Status.Should().Be(LeadStatus.Qualified);
    }

    // ── Convert / contact / qualify guards ──────────────────────────────────

    [Theory]
    [InlineData(LeadStatus.New)]
    [InlineData(LeadStatus.Contacted)]
    [InlineData(LeadStatus.Opportunity)]
    [InlineData(LeadStatus.Disqualified)]
    public void Convert_FromIllegalStatus_ReturnsConflict(LeadStatus status)
    {
        var lead = LeadInStatus(status);

        lead.ConvertToOpportunity(Guid.NewGuid(), Guid.NewGuid(), UserId)
            .Status.Should().Be(ResultStatus.Conflict);
    }

    [Fact]
    public void Contact_Twice_ReturnsConflict()
    {
        var lead = LeadInStatus(LeadStatus.Contacted);

        lead.Contact(null, UserId).Status.Should().Be(ResultStatus.Conflict);
    }

    [Fact]
    public void Qualify_FromNew_ReturnsConflict_StageSkipNotAllowed()
    {
        var lead = LeadInStatus(LeadStatus.New);

        lead.Qualify(null, UserId).Status.Should().Be(ResultStatus.Conflict);
    }

    // ── Transition table ────────────────────────────────────────────────────

    [Fact]
    public void TransitionTable_MatchesPortalLeadFsm()
    {
        // The portal LEAD_FSM (fsm.ts) enumerated as (action) from → to.
        LeadStatusTransitions.CanTransition(LeadStatus.New, LeadStatus.Contacted).Should().BeTrue();
        LeadStatusTransitions.CanTransition(LeadStatus.Contacted, LeadStatus.Qualified).Should().BeTrue();
        LeadStatusTransitions.CanTransition(LeadStatus.Qualified, LeadStatus.Nurturing).Should().BeTrue();
        LeadStatusTransitions.CanTransition(LeadStatus.Qualified, LeadStatus.Opportunity).Should().BeTrue();
        LeadStatusTransitions.CanTransition(LeadStatus.Nurturing, LeadStatus.Opportunity).Should().BeTrue();

        // Nurturing is a one-way parking state: no way back to Qualified.
        LeadStatusTransitions.CanTransition(LeadStatus.Nurturing, LeadStatus.Qualified).Should().BeFalse();
        // No stage skipping.
        LeadStatusTransitions.CanTransition(LeadStatus.New, LeadStatus.Qualified).Should().BeFalse();
        LeadStatusTransitions.CanTransition(LeadStatus.Contacted, LeadStatus.Opportunity).Should().BeFalse();
    }

    [Fact]
    public void OpenStatuses_MatchPortalLeadOpenStatuses()
    {
        LeadStatusTransitions.OpenStatuses.Should().BeEquivalentTo(new[]
        {
            LeadStatus.New, LeadStatus.Contacted, LeadStatus.Qualified, LeadStatus.Nurturing
        });

        LeadStatusTransitions.IsOpen(LeadStatus.Opportunity).Should().BeFalse();
        LeadStatusTransitions.IsOpen(LeadStatus.Disqualified).Should().BeFalse();
    }
}
