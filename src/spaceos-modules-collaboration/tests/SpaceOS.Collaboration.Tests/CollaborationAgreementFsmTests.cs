using SpaceOS.Collaboration.Domain;
using Xunit;

namespace SpaceOS.Collaboration.Tests;

/// <summary>
/// The agreement lifecycle (B2B-10 F1), measured as a MATRIX rather than as a handful of happy
/// paths.
/// </summary>
/// <remarks>
/// The re-audit's criticism of the work-package FSM was that four facts cannot cover a
/// multi-state machine: the cases nobody writes are exactly the ones that let a guest cancel a
/// host's agreement, or an accepted agreement be accepted again. So every combination of
/// (state × transition × actor) is executed here — 60 cells — and the expectation comes from
/// one table instead of sixty hand-written assertions.
/// </remarks>
public class CollaborationAgreementFsmTests
{
    private static readonly Guid Host = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid Guest = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly Guid HostUser = Guid.Parse("33333333-3333-3333-3333-333333333333");
    private static readonly Guid GuestUser = Guid.Parse("44444444-4444-4444-4444-444444444444");
    private static readonly Guid Terms = Guid.Parse("55555555-5555-5555-5555-555555555555");
    private static readonly Guid NewTerms = Guid.Parse("66666666-6666-6666-6666-666666666666");
    private static readonly DateTimeOffset Now = new(2026, 7, 29, 10, 0, 0, TimeSpan.Zero);

    private const string Transitions = "Propose,Accept,Reject,Cancel,Supersede";

    /// <summary>The only cells that are allowed; everything else must be refused.</summary>
    private static readonly HashSet<string> Allowed =
    [
        "Draft/Propose/host",
        "Draft/Cancel/host",
        "Proposed/Accept/guest",
        "Proposed/Reject/guest",
        "Proposed/Cancel/host",
        "Accepted/Supersede/host",
    ];

    public static IEnumerable<object[]> Matrix()
    {
        foreach (var state in Enum.GetValues<AgreementStatus>())
        {
            foreach (var transition in Transitions.Split(','))
            {
                foreach (var actor in new[] { "host", "guest" })
                {
                    yield return [state, transition, actor];
                }
            }
        }
    }

    [Theory]
    [MemberData(nameof(Matrix))]
    public void Every_cell_of_the_lifecycle_behaves_as_the_table_says(
        AgreementStatus state,
        string transition,
        string actor)
    {
        var agreement = AgreementIn(state);
        var shouldSucceed = Allowed.Contains($"{state}/{transition}/{actor}");

        var act = () => Invoke(agreement, transition, actor);

        if (shouldSucceed)
        {
            act();
            Assert.NotEqual(state, agreement.Status);
            Assert.Equal(actor == "host" ? Host : Guest, agreement.History[^1].ActorTenantId);
        }
        else
        {
            // Both guards answer the same way — a wrong state and a wrong actor are equally
            // "you may not do this" — so the matrix does not have to know which one fired.
            Assert.ThrowsAny<Exception>(act);
            Assert.Equal(state, agreement.Status);
        }
    }

    [Fact]
    public void Acceptance_without_evidence_is_refused()
    {
        // The B2B-03 shortcoming, closed: an Accepted status with nothing behind it looks
        // binding and is not.
        var agreement = AgreementIn(AgreementStatus.Proposed);

        Assert.Throws<ArgumentException>(() =>
            agreement.Accept(Guest, GuestUser, Terms, "   ", Now));

        Assert.Equal(AgreementStatus.Proposed, agreement.Status);
    }

    [Fact]
    public void Acceptance_without_a_terms_revision_is_refused()
    {
        var agreement = AgreementIn(AgreementStatus.Proposed);

        Assert.Throws<ArgumentException>(() =>
            agreement.Accept(Guest, GuestUser, Guid.Empty, "signed:doc-1", Now));
    }

    [Fact]
    public void Acceptance_binds_the_terms_revision_and_its_evidence()
    {
        var agreement = AgreementIn(AgreementStatus.Proposed);

        agreement.Accept(Guest, GuestUser, Terms, " signed:doc-1 ", Now);

        Assert.Equal(AgreementStatus.Accepted, agreement.Status);
        Assert.Equal(Terms, agreement.CurrentTermsRevisionId);
        Assert.Equal("signed:doc-1", agreement.AcceptanceEvidence);
        Assert.Equal(Terms, agreement.History[^1].TermsRevisionId);
    }

    [Fact]
    public void Rejection_demands_a_reason()
    {
        var agreement = AgreementIn(AgreementStatus.Proposed);

        Assert.Throws<ArgumentException>(() => agreement.Reject(Guest, GuestUser, "  ", Now));
    }

    [Fact]
    public void Superseding_with_the_revision_already_in_force_changes_nothing_and_is_refused()
    {
        var agreement = AgreementIn(AgreementStatus.Accepted);

        Assert.Throws<ArgumentException>(() =>
            agreement.Supersede(Host, HostUser, Terms, Now));
    }

    [Fact]
    public void The_history_records_every_step_with_its_actor()
    {
        // What the audit trail is for: months later, who moved this and when.
        var agreement = CollaborationAgreement.Create(Host, Guest, "Doorstar pilot", Now);

        agreement.Propose(Host, HostUser, Now);
        agreement.Accept(Guest, GuestUser, Terms, "signed:doc-1", Now.AddHours(1));
        agreement.Supersede(Host, HostUser, NewTerms, Now.AddDays(1));

        Assert.Collection(
            agreement.History,
            entry => Assert.Equal("Propose", entry.ActionName),
            entry => Assert.Equal("Accept", entry.ActionName),
            entry => Assert.Equal("Supersede", entry.ActionName));

        Assert.Equal(AgreementStatus.Draft, agreement.History[0].FromStatus);
        Assert.Equal(AgreementStatus.Superseded, agreement.History[^1].ToStatus);
    }

    /// <summary>Builds an agreement already in the requested state, by legal transitions only.</summary>
    private static CollaborationAgreement AgreementIn(AgreementStatus state)
    {
        var agreement = CollaborationAgreement.Create(Host, Guest, "Doorstar pilot", Now);

        switch (state)
        {
            case AgreementStatus.Draft:
                break;

            case AgreementStatus.Proposed:
                agreement.Propose(Host, HostUser, Now);
                break;

            case AgreementStatus.Accepted:
                agreement.Propose(Host, HostUser, Now);
                agreement.Accept(Guest, GuestUser, Terms, "signed:doc-1", Now);
                break;

            case AgreementStatus.Rejected:
                agreement.Propose(Host, HostUser, Now);
                agreement.Reject(Guest, GuestUser, "Kapacitáshiány", Now);
                break;

            case AgreementStatus.Cancelled:
                agreement.Propose(Host, HostUser, Now);
                agreement.Cancel(Host, HostUser, "Elállt az igény", Now);
                break;

            case AgreementStatus.Superseded:
                agreement.Propose(Host, HostUser, Now);
                agreement.Accept(Guest, GuestUser, Terms, "signed:doc-1", Now);
                agreement.Supersede(Host, HostUser, NewTerms, Now);
                break;

            default:
                throw new ArgumentOutOfRangeException(nameof(state), state, "Unmapped state.");
        }

        return agreement;
    }

    private static void Invoke(CollaborationAgreement agreement, string transition, string actor)
    {
        var tenantId = actor == "host" ? Host : Guest;
        var userId = actor == "host" ? HostUser : GuestUser;

        switch (transition)
        {
            case "Propose":
                agreement.Propose(tenantId, userId, Now);
                break;
            case "Accept":
                agreement.Accept(tenantId, userId, Terms, "signed:doc-1", Now);
                break;
            case "Reject":
                agreement.Reject(tenantId, userId, "Kapacitáshiány", Now);
                break;
            case "Cancel":
                agreement.Cancel(tenantId, userId, "Elállt az igény", Now);
                break;
            case "Supersede":
                agreement.Supersede(tenantId, userId, NewTerms, Now);
                break;
            default:
                throw new ArgumentOutOfRangeException(nameof(transition), transition, "Unmapped transition.");
        }
    }
}
