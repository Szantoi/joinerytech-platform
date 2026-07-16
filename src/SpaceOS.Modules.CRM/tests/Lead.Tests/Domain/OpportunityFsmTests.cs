using Ardalis.Result;
using FluentAssertions;
using SpaceOS.Modules.CRM.Domain.Aggregates;
using SpaceOS.Modules.CRM.Domain.Enums;
using SpaceOS.Modules.CRM.Domain.FSM;
using SpaceOS.Modules.CRM.Domain.ValueObjects;
using Xunit;

namespace SpaceOS.Modules.CRM.Tests.Domain;

/// <summary>
/// Opportunity FSM tests — the portal OPP_FSM mirror
/// (modules/crm/services/fsm.ts + services/__tests__/oppFsm.test.ts).
///
/// Covers the loss branch widened by CRM-BE-HOST (lose from ANY open stage,
/// previously only Proposal/Negotiation) and the stage-probability table.
/// </summary>
public class OpportunityFsmTests
{
    private static readonly Guid TenantId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid UserId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private static Opportunity NewOpportunity()
    {
        var contact = ContactInfo.Create("Nagy Anna", "nagy.anna@example.hu", "+36301112222", "Bútor Zrt.");
        var result = Opportunity.CreateDirect(
            TenantId,
            customerId: Guid.NewGuid(),
            contactInfo: contact,
            title: "Irodabútor beépítés",
            estimatedValue: Money.Create(4_500_000m),
            expectedCloseDate: DateTimeOffset.UtcNow.AddDays(45),
            assignedTo: UserId,
            createdBy: UserId);

        result.IsSuccess.Should().BeTrue();
        return result.Value;
    }

    /// <summary>Drives the opportunity to the requested stage through legal transitions.</summary>
    private static Opportunity OpportunityInStage(OpportunityStatus stage)
    {
        var opp = NewOpportunity();
        if (stage == OpportunityStatus.Open) return opp;

        opp.StartNeedsAssessment(UserId).IsSuccess.Should().BeTrue();
        if (stage == OpportunityStatus.NeedsAssessment) return opp;

        opp.StartSolutionAssembly(UserId).IsSuccess.Should().BeTrue();
        if (stage == OpportunityStatus.SolutionAssembly) return opp;

        opp.SendProposal(Guid.NewGuid(), UserId).IsSuccess.Should().BeTrue();
        if (stage == OpportunityStatus.Proposal) return opp;

        opp.StartNegotiation(UserId).IsSuccess.Should().BeTrue();
        if (stage == OpportunityStatus.Negotiation) return opp;

        switch (stage)
        {
            case OpportunityStatus.Won:
                opp.Win(Guid.NewGuid(), null, UserId).IsSuccess.Should().BeTrue();
                return opp;
            case OpportunityStatus.Lost:
                opp.Lose("Ár", null, UserId).IsSuccess.Should().BeTrue();
                return opp;
            default:
                throw new ArgumentOutOfRangeException(nameof(stage), stage, "Unsupported seed stage");
        }
    }

    // ── Main chain ──────────────────────────────────────────────────────────

    [Fact]
    public void FullMainChain_ReachesWon_WithStageProbabilities()
    {
        var opp = NewOpportunity();
        opp.Status.Should().Be(OpportunityStatus.Open);
        opp.Probability.Should().Be(10m);

        opp.StartNeedsAssessment(UserId).IsSuccess.Should().BeTrue();
        opp.Probability.Should().Be(25m);

        opp.StartSolutionAssembly(UserId).IsSuccess.Should().BeTrue();
        opp.Probability.Should().Be(40m, "portal OPP_STAGE_PROBABILITY: osszeallitas = 0.40");

        opp.SendProposal(Guid.NewGuid(), UserId).IsSuccess.Should().BeTrue();
        opp.Probability.Should().Be(55m, "portal OPP_STAGE_PROBABILITY: ajanlat = 0.55");

        opp.StartNegotiation(UserId).IsSuccess.Should().BeTrue();
        opp.Probability.Should().Be(80m, "portal OPP_STAGE_PROBABILITY: targyalas = 0.80");

        opp.Win(Guid.NewGuid(), null, UserId).IsSuccess.Should().BeTrue();
        opp.Status.Should().Be(OpportunityStatus.Won);
        opp.Probability.Should().Be(100m);
    }

    [Fact]
    public void Win_OnlyFromNegotiation()
    {
        // The portal OPP_FSM requires walking the whole main chain before winning.
        foreach (var stage in new[]
                 {
                     OpportunityStatus.Open,
                     OpportunityStatus.NeedsAssessment,
                     OpportunityStatus.SolutionAssembly,
                     OpportunityStatus.Proposal
                 })
        {
            var opp = OpportunityInStage(stage);

            opp.Win(Guid.NewGuid(), null, UserId).Status.Should().Be(ResultStatus.Conflict,
                $"winning from {stage} skips the main chain");
            opp.Status.Should().Be(stage);
        }
    }

    [Fact]
    public void Win_Twice_ReturnsConflict()
    {
        var opp = OpportunityInStage(OpportunityStatus.Won);

        opp.Win(Guid.NewGuid(), null, UserId).Status.Should().Be(ResultStatus.Conflict);
    }

    [Fact]
    public void StageSkip_ReturnsConflict()
    {
        var opp = NewOpportunity();

        opp.SendProposal(Guid.NewGuid(), UserId).Status.Should().Be(ResultStatus.Conflict);
        opp.Status.Should().Be(OpportunityStatus.Open);
    }

    // ── Lose (from any open stage — widened to match the portal) ─────────────

    [Theory]
    [InlineData(OpportunityStatus.Open)]
    [InlineData(OpportunityStatus.NeedsAssessment)]
    [InlineData(OpportunityStatus.SolutionAssembly)]
    [InlineData(OpportunityStatus.Proposal)]
    [InlineData(OpportunityStatus.Negotiation)]
    public void Lose_FromAnyOpenStage_Succeeds(OpportunityStatus stage)
    {
        var opp = OpportunityInStage(stage);

        opp.Lose("Konkurencia olcsóbb volt", "Rivális Kft.", UserId).IsSuccess.Should().BeTrue();
        opp.Status.Should().Be(OpportunityStatus.Lost);
        opp.Probability.Should().Be(0m);
        opp.LossReason.Should().Be("Konkurencia olcsóbb volt");
    }

    [Theory]
    [InlineData(OpportunityStatus.Won)]
    [InlineData(OpportunityStatus.Lost)]
    public void Lose_FromTerminalStage_ReturnsConflict(OpportunityStatus stage)
    {
        var opp = OpportunityInStage(stage);

        opp.Lose("Túl késő", null, UserId).Status.Should().Be(ResultStatus.Conflict);
    }

    // ── Transition table + probabilities ────────────────────────────────────

    [Fact]
    public void TransitionTable_MatchesPortalOppFsm()
    {
        OpportunityStatusTransitions.CanTransition(OpportunityStatus.Open, OpportunityStatus.NeedsAssessment).Should().BeTrue();
        OpportunityStatusTransitions.CanTransition(OpportunityStatus.NeedsAssessment, OpportunityStatus.SolutionAssembly).Should().BeTrue();
        OpportunityStatusTransitions.CanTransition(OpportunityStatus.SolutionAssembly, OpportunityStatus.Proposal).Should().BeTrue();
        OpportunityStatusTransitions.CanTransition(OpportunityStatus.Proposal, OpportunityStatus.Negotiation).Should().BeTrue();
        OpportunityStatusTransitions.CanTransition(OpportunityStatus.Negotiation, OpportunityStatus.Won).Should().BeTrue();

        // lose from every open stage
        foreach (var stage in OpportunityStatusTransitions.OpenStages)
        {
            OpportunityStatusTransitions.CanTransition(stage, OpportunityStatus.Lost).Should().BeTrue();
        }

        // no backward steps, no terminal escapes
        OpportunityStatusTransitions.CanTransition(OpportunityStatus.Negotiation, OpportunityStatus.Proposal).Should().BeFalse();
        OpportunityStatusTransitions.CanTransition(OpportunityStatus.Won, OpportunityStatus.Lost).Should().BeFalse();
        OpportunityStatusTransitions.CanTransition(OpportunityStatus.Lost, OpportunityStatus.Open).Should().BeFalse();
    }

    [Fact]
    public void StageProbability_MirrorsPortalTable()
    {
        // portal OPP_STAGE_PROBABILITY (fractions) × 100
        OpportunityStageProbability.For(OpportunityStatus.Open).Should().Be(10m);
        OpportunityStageProbability.For(OpportunityStatus.NeedsAssessment).Should().Be(25m);
        OpportunityStageProbability.For(OpportunityStatus.SolutionAssembly).Should().Be(40m);
        OpportunityStageProbability.For(OpportunityStatus.Proposal).Should().Be(55m);
        OpportunityStageProbability.For(OpportunityStatus.Negotiation).Should().Be(80m);
        OpportunityStageProbability.For(OpportunityStatus.Won).Should().Be(100m);
        OpportunityStageProbability.For(OpportunityStatus.Lost).Should().Be(0m);
    }

    [Fact]
    public void OpenStages_MatchPortalOppOpenStages()
    {
        OpportunityStatusTransitions.OpenStages.Should().BeEquivalentTo(new[]
        {
            OpportunityStatus.Open,
            OpportunityStatus.NeedsAssessment,
            OpportunityStatus.SolutionAssembly,
            OpportunityStatus.Proposal,
            OpportunityStatus.Negotiation
        }, options => options.WithStrictOrdering());
    }
}
