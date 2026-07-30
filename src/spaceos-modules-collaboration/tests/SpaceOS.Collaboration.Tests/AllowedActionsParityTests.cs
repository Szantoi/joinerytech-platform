using SpaceOS.Collaboration.Domain;
using Xunit;

namespace SpaceOS.Collaboration.Tests;

/// <summary>
/// B2B-10 F3/4 — the advertised actions and the enforced ones are the same set.
/// </summary>
/// <remarks>
/// <para>
/// The oracle here is not a table written by hand: for every state and every actor, each of the
/// eight transitions is <b>actually attempted</b> on a fresh aggregate, and whether the domain
/// accepted it is what the list is compared against. A test that restated the rules would only
/// prove that two people typed the same switch statement.
/// </para>
/// <para>
/// This exists because the projection that produced <c>allowedActions</c> until now (the B2B-07
/// <c>AllowedActionsPolicy</c>) had drifted from the aggregate, and since F3/2 that list is on the
/// wire: it is what a portal would build its buttons from.
/// </para>
/// </remarks>
public class AllowedActionsParityTests
{
    private static readonly Guid Host = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid Guest = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly Guid Stranger = Guid.Parse("33333333-3333-3333-3333-333333333333");
    private static readonly Guid User = Guid.Parse("44444444-4444-4444-4444-444444444444");
    private static readonly DateTimeOffset Now = new(2026, 7, 30, 9, 0, 0, TimeSpan.Zero);

    /// <summary>Every transition, with arguments valid enough that only a GUARD can refuse it.</summary>
    private static readonly Dictionary<string, Action<DelegatedWorkPackage, Guid>> Transitions = new()
    {
        ["Offer"] = (package, actor) => package.Offer(actor, User, Now),
        ["Accept"] = (package, actor) => package.Accept(actor, User, Now),
        ["Reject"] = (package, actor) => package.Reject(actor, User, "nem fér bele", Now),
        ["StartProgress"] = (package, actor) => package.StartProgress(actor, User, Now),
        ["Submit"] = (package, actor) => package.Submit(actor, User, "DMS:1", Now),
        ["RequestChanges"] = (package, actor) => package.RequestChanges(actor, User, "más méret", Now),
        ["Complete"] = (package, actor) => package.Complete(actor, User, "QA:1", Now),
        ["Cancel"] = (package, actor) => package.Cancel(actor, User, "elállunk", Now)
    };

    private static DelegatedWorkPackage InState(WorkPackageStatus status)
    {
        var package = DelegatedWorkPackage.Create(
            Guid.NewGuid(), Host, Guest, "Ajtólap gyártás", "50 db", Now.AddDays(30), Now.AddDays(-1));

        switch (status)
        {
            case WorkPackageStatus.Draft:
                break;

            case WorkPackageStatus.Offered:
                package.Offer(Host, User, Now);
                break;

            case WorkPackageStatus.Rejected:
                package.Offer(Host, User, Now);
                package.Reject(Guest, User, "nem fér bele", Now);
                break;

            case WorkPackageStatus.Accepted:
                package.Offer(Host, User, Now);
                package.Accept(Guest, User, Now);
                break;

            case WorkPackageStatus.InProgress:
                package.Offer(Host, User, Now);
                package.Accept(Guest, User, Now);
                package.StartProgress(Guest, User, Now);
                break;

            case WorkPackageStatus.Submitted:
                package.Offer(Host, User, Now);
                package.Accept(Guest, User, Now);
                package.StartProgress(Guest, User, Now);
                package.Submit(Guest, User, "DMS:1", Now);
                break;

            case WorkPackageStatus.ChangesRequested:
                package.Offer(Host, User, Now);
                package.Accept(Guest, User, Now);
                package.StartProgress(Guest, User, Now);
                package.Submit(Guest, User, "DMS:1", Now);
                package.RequestChanges(Host, User, "más méret", Now);
                break;

            case WorkPackageStatus.Completed:
                package.Offer(Host, User, Now);
                package.Accept(Guest, User, Now);
                package.StartProgress(Guest, User, Now);
                package.Submit(Guest, User, "DMS:1", Now);
                package.Complete(Host, User, "QA:1", Now);
                break;

            case WorkPackageStatus.Cancelled:
                package.Cancel(Host, User, "elállunk", Now);
                break;

            default:
                throw new ArgumentOutOfRangeException(nameof(status), status, "Unreachable state in the fixture.");
        }

        Assert.Equal(status, package.Status);
        return package;
    }

    /// <summary>What the aggregate ACTUALLY accepts, found by trying it.</summary>
    private static HashSet<string> Enforced(WorkPackageStatus status, Guid actor)
    {
        var accepted = new HashSet<string>(StringComparer.Ordinal);

        foreach (var (name, invoke) in Transitions)
        {
            // A fresh aggregate per probe: a successful transition moves the state, and the next
            // probe would then be asking about a different cell.
            var package = InState(status);

            try
            {
                invoke(package, actor);
                accepted.Add(name);
            }
            catch (InvalidOperationException)
            {
                // A guard refused — exactly what "not allowed" means.
            }
        }

        return accepted;
    }

    /// <summary>
    /// States this suite does NOT cover, named rather than quietly skipped.
    /// </summary>
    /// <remarks>
    /// <c>Disputed</c> exists in the enum and nowhere else: no transition writes it, no guard reads
    /// it, and the B2B-10 F0 decision took disputes out of the MVP. It cannot be put into a cell of
    /// the matrix because no sequence of calls produces a package in that state — so instead of
    /// pretending to cover it, the suite proves it is unreachable
    /// (<see cref="No_transition_can_reach_an_excluded_state"/>). Wire a dispute in and that test
    /// goes red, which is the reminder to extend the coverage here.
    /// </para>
    /// <para>
    /// <b>Root decision (2026-07-30): the enum member STAYS, and this guard may not be deleted
    /// without a root decision.</b> The F0 decision took disputes out of the MVP, not out of the
    /// product; removing the member would mean re-picking its numeric value later and risking a
    /// clash with historical data, and — worse — after a deletion anyone could re-invent disputes
    /// ad hoc. The guard turns dead code into a trap instead.
    /// </remarks>
    private static readonly WorkPackageStatus[] UnreachableStates = [WorkPackageStatus.Disputed];

    public static TheoryData<WorkPackageStatus, string> Cells()
    {
        var data = new TheoryData<WorkPackageStatus, string>();

        foreach (var status in Enum.GetValues<WorkPackageStatus>().Except(UnreachableStates))
        {
            data.Add(status, "host");
            data.Add(status, "guest");
        }

        return data;
    }

    [Theory]
    [MemberData(nameof(Cells))]
    public void The_advertised_actions_are_exactly_the_ones_the_domain_accepts(
        WorkPackageStatus status, string role)
    {
        var actor = role == "host" ? Host : Guest;

        var advertised = InState(status).AllowedActionsFor(actor).ToHashSet(StringComparer.Ordinal);
        var enforced = Enforced(status, actor);

        Assert.Equal(enforced, advertised);
    }

    [Fact]
    public void No_transition_can_reach_an_excluded_state()
    {
        // The excuse for the exclusion, measured. Every transition is driven from every reachable
        // state by both parties, and none of them lands in an excluded state.
        foreach (var status in Enum.GetValues<WorkPackageStatus>().Except(UnreachableStates))
        {
            foreach (var actor in new[] { Host, Guest })
            {
                foreach (var (_, invoke) in Transitions)
                {
                    var package = InState(status);

                    try
                    {
                        invoke(package, actor);
                    }
                    catch (InvalidOperationException)
                    {
                        continue;
                    }

                    Assert.DoesNotContain(package.Status, UnreachableStates);
                }
            }
        }
    }

    [Fact]
    public void A_tenant_outside_the_package_is_advertised_nothing()
    {
        foreach (var status in Enum.GetValues<WorkPackageStatus>().Except(UnreachableStates))
        {
            Assert.Empty(InState(status).AllowedActionsFor(Stranger));
            Assert.Empty(Enforced(status, Stranger));
        }
    }

    [Fact]
    public void The_probe_itself_can_tell_allowed_from_refused()
    {
        // The negative control for the oracle above. If the probe silently swallowed everything it
        // would report "nothing is allowed" everywhere, and the parity assertions would pass
        // against an equally empty list — proving nothing at all.
        Assert.Contains("Offer", Enforced(WorkPackageStatus.Draft, Host));
        Assert.DoesNotContain("Complete", Enforced(WorkPackageStatus.Draft, Host));
        Assert.Contains("Accept", Enforced(WorkPackageStatus.Offered, Guest));
        Assert.DoesNotContain("Accept", Enforced(WorkPackageStatus.Offered, Host));
    }
}
