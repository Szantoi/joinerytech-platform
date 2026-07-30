using SpaceOS.Collaboration.Domain;
using Xunit;

namespace SpaceOS.Collaboration.Tests;

/// <summary>
/// B2B-10 F3/4 — the agreement's advertised actions equal the ones its guards accept.
/// </summary>
/// <remarks>
/// Same oracle as the work-package suite: every transition is attempted for real, on a fresh
/// aggregate, and the outcome is what the list is measured against.
/// </remarks>
public class AgreementAllowedActionsParityTests
{
    private static readonly Guid Host = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid Guest = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly Guid Stranger = Guid.Parse("33333333-3333-3333-3333-333333333333");
    private static readonly Guid User = Guid.Parse("44444444-4444-4444-4444-444444444444");
    private static readonly Guid Terms = Guid.Parse("55555555-5555-5555-5555-555555555555");
    private static readonly Guid NextTerms = Guid.Parse("66666666-6666-6666-6666-666666666666");
    private static readonly DateTimeOffset Now = new(2026, 7, 30, 9, 0, 0, TimeSpan.Zero);

    private static readonly Dictionary<string, Action<CollaborationAgreement, Guid>> Transitions = new()
    {
        ["Propose"] = (agreement, actor) => agreement.Propose(actor, User, Now),
        ["Accept"] = (agreement, actor) => agreement.Accept(actor, User, Terms, "signed:doc-1", Now),
        ["Reject"] = (agreement, actor) => agreement.Reject(actor, User, "nem fér bele", Now),
        ["Cancel"] = (agreement, actor) => agreement.Cancel(actor, User, "elállunk", Now),
        ["Supersede"] = (agreement, actor) => agreement.Supersede(actor, User, NextTerms, Now)
    };

    private static CollaborationAgreement InState(AgreementStatus status)
    {
        var agreement = CollaborationAgreement.Create(Host, Guest, "Doorstar pilot", Now.AddDays(-10));

        switch (status)
        {
            case AgreementStatus.Draft:
                break;

            case AgreementStatus.Proposed:
                agreement.Propose(Host, User, Now);
                break;

            case AgreementStatus.Accepted:
                agreement.Propose(Host, User, Now);
                agreement.Accept(Guest, User, Terms, "signed:doc-1", Now);
                break;

            case AgreementStatus.Rejected:
                agreement.Propose(Host, User, Now);
                agreement.Reject(Guest, User, "nem fér bele", Now);
                break;

            case AgreementStatus.Cancelled:
                agreement.Cancel(Host, User, "elállunk", Now);
                break;

            case AgreementStatus.Superseded:
                agreement.Propose(Host, User, Now);
                agreement.Accept(Guest, User, Terms, "signed:doc-1", Now);
                agreement.Supersede(Host, User, NextTerms, Now);
                break;

            default:
                throw new ArgumentOutOfRangeException(nameof(status), status, "Unreachable state in the fixture.");
        }

        Assert.Equal(status, agreement.Status);
        return agreement;
    }

    private static HashSet<string> Enforced(AgreementStatus status, Guid actor)
    {
        var accepted = new HashSet<string>(StringComparer.Ordinal);

        foreach (var (name, invoke) in Transitions)
        {
            var agreement = InState(status);

            try
            {
                invoke(agreement, actor);
                accepted.Add(name);
            }
            catch (InvalidOperationException)
            {
            }
            catch (ArgumentException)
            {
                // Supersede from Accepted with the SAME revision is an argument error, not a guard.
                // The fixture uses a different revision, so this only fires where the transition
                // was going to be refused anyway; treating it as "not allowed" keeps the oracle
                // conservative rather than optimistic.
            }
        }

        return accepted;
    }

    public static TheoryData<AgreementStatus, string> Cells()
    {
        var data = new TheoryData<AgreementStatus, string>();

        foreach (var status in Enum.GetValues<AgreementStatus>())
        {
            data.Add(status, "host");
            data.Add(status, "guest");
        }

        return data;
    }

    [Theory]
    [MemberData(nameof(Cells))]
    public void The_advertised_actions_are_exactly_the_ones_the_domain_accepts(
        AgreementStatus status, string role)
    {
        var actor = role == "host" ? Host : Guest;

        var advertised = InState(status).AllowedActionsFor(actor).ToHashSet(StringComparer.Ordinal);
        var enforced = Enforced(status, actor);

        Assert.Equal(enforced, advertised);
    }

    [Fact]
    public void A_tenant_outside_the_agreement_is_advertised_nothing()
    {
        foreach (var status in Enum.GetValues<AgreementStatus>())
        {
            Assert.Empty(InState(status).AllowedActionsFor(Stranger));
            Assert.Empty(Enforced(status, Stranger));
        }
    }

    [Fact]
    public void The_probe_itself_can_tell_allowed_from_refused()
    {
        Assert.Contains("Propose", Enforced(AgreementStatus.Draft, Host));
        Assert.DoesNotContain("Propose", Enforced(AgreementStatus.Draft, Guest));
        Assert.Contains("Accept", Enforced(AgreementStatus.Proposed, Guest));
        Assert.Empty(Enforced(AgreementStatus.Superseded, Host));
    }
}
