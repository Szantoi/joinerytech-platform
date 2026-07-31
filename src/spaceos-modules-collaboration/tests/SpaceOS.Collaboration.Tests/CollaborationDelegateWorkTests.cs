using SpaceOS.Collaboration.Domain;
using Xunit;

namespace SpaceOS.Collaboration.Tests;

/// <summary>
/// B2B-10 F5/1 — the production birth of a delegated work package.
/// </summary>
/// <remarks>
/// Until F5/1 the anchor was a dead store: the factory accepted a scope nothing ever passed, and
/// no production path created a package at all. These tests pin the rules of the one path that
/// now does: <see cref="CollaborationAgreement.DelegateWork"/>.
/// </remarks>
public class CollaborationDelegateWorkTests
{
    private static readonly Guid Host = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid Guest = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly Guid Stranger = Guid.Parse("33333333-3333-3333-3333-333333333333");
    private static readonly Guid HostUser = Guid.Parse("44444444-4444-4444-4444-444444444444");
    private static readonly Guid GuestUser = Guid.Parse("55555555-5555-5555-5555-555555555555");
    private static readonly DateTimeOffset Now = new(2026, 7, 31, 9, 0, 0, TimeSpan.Zero);

    private static CollaborationAgreement Agreement()
        => CollaborationAgreement.Create(Host, Guest, "Doorstar pilot", Now.AddDays(-10));

    private static CollaborationWorkScope Scope(Guid? projectId = null)
        => CollaborationWorkScope.Create(projectId ?? Guid.NewGuid(), Guid.NewGuid());

    private static DelegatedWorkPackage Delegate(
        CollaborationAgreement agreement,
        Guid actorTenantId,
        CollaborationWorkScope? scope = null,
        Guid? existingProjectId = null)
        => agreement.DelegateWork(
            actorTenantId, HostUser, "Ajtólap gyártás", "50 db tölgy ajtólap",
            Now.AddDays(30), scope ?? Scope(), existingProjectId, Now);

    [Fact]
    public void The_host_delegates_work_and_the_pair_comes_from_the_agreement()
    {
        var agreement = Agreement();
        var scope = Scope();

        var package = Delegate(agreement, Host, scope);

        Assert.Equal(agreement.Id, package.AgreementId);
        Assert.Equal(Host, package.HostTenantId);
        Assert.Equal(Guest, package.GuestTenantId);
        Assert.Equal(WorkPackageStatus.Draft, package.Status);
        Assert.Equal(1, package.RowVersion);
    }

    [Fact]
    public void The_anchor_is_attached_as_an_isolated_copy()
    {
        // The EF owned value-object trap: two packages sharing one instance silently write NULL
        // columns for the second. The factory copies; this pins that it keeps doing so.
        var scope = Scope();

        var package = Delegate(Agreement(), Host, scope);

        Assert.NotNull(package.WorkScope);
        Assert.NotSame(scope, package.WorkScope);
        Assert.Equal(scope, package.WorkScope);
    }

    [Fact]
    public void The_guest_cannot_delegate_work_to_itself()
    {
        // Same direction rule as Propose: delegating writes an obligation into the host's
        // delegation, and only the host may do that.
        var exception = Assert.Throws<InvalidOperationException>(() => Delegate(Agreement(), Guest));

        Assert.Contains("host", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void An_outside_tenant_cannot_delegate_at_all()
        => Assert.Throws<InvalidOperationException>(() => Delegate(Agreement(), Stranger));

    [Theory]
    [InlineData(AgreementStatus.Draft)]
    [InlineData(AgreementStatus.Proposed)]
    [InlineData(AgreementStatus.Accepted)]
    public void An_agreement_in_play_takes_new_work(AgreementStatus status)
    {
        var agreement = AgreementIn(status);

        var package = Delegate(agreement, Host);

        Assert.Equal(WorkPackageStatus.Draft, package.Status);
    }

    [Theory]
    [InlineData(AgreementStatus.Rejected)]
    [InlineData(AgreementStatus.Cancelled)]
    [InlineData(AgreementStatus.Superseded)]
    public void A_closed_agreement_takes_no_new_work(AgreementStatus status)
    {
        // "The closed state is closed" (Gábor, 2026-07-30) — for what the agreement carries too.
        var agreement = AgreementIn(status);

        var exception = Assert.Throws<InvalidOperationException>(() => Delegate(agreement, Host));

        Assert.Contains("closed", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void A_new_package_cannot_be_born_without_its_anchor()
        => Assert.Throws<ArgumentNullException>(() => Agreement().DelegateWork(
            Host, HostUser, "Ajtólap gyártás", "50 db", Now.AddDays(30), null!, null, Now));

    [Fact]
    public void Delegating_must_name_the_acting_user()
        => Assert.Throws<ArgumentException>(() => Agreement().DelegateWork(
            Host, Guid.Empty, "Ajtólap gyártás", "50 db", Now.AddDays(30), Scope(), null, Now));

    [Fact]
    public void One_agreement_delegates_one_project()
    {
        var agreement = Agreement();
        var existingProject = Guid.NewGuid();

        Assert.Throws<InvalidOperationException>(() =>
            Delegate(agreement, Host, Scope(), existingProjectId: existingProject));
    }

    [Fact]
    public void A_second_package_of_the_same_project_is_welcome()
    {
        var agreement = Agreement();
        var projectId = Guid.NewGuid();

        var package = Delegate(agreement, Host, Scope(projectId), existingProjectId: projectId);

        Assert.Equal(projectId, package.WorkScope!.ProjectId);
    }

    private static CollaborationAgreement AgreementIn(AgreementStatus status)
    {
        var agreement = Agreement();

        switch (status)
        {
            case AgreementStatus.Draft:
                break;
            case AgreementStatus.Proposed:
                agreement.Propose(Host, HostUser, Now.AddDays(-5));
                break;
            case AgreementStatus.Accepted:
                agreement.Propose(Host, HostUser, Now.AddDays(-5));
                agreement.Accept(Guest, GuestUser, Guid.NewGuid(), "aláírt PDF: DMS-123", Now.AddDays(-4));
                break;
            case AgreementStatus.Rejected:
                agreement.Propose(Host, HostUser, Now.AddDays(-5));
                agreement.Reject(Guest, GuestUser, "nem fér bele", Now.AddDays(-4));
                break;
            case AgreementStatus.Cancelled:
                agreement.Cancel(Host, HostUser, "meggondoltuk", Now.AddDays(-5));
                break;
            case AgreementStatus.Superseded:
                agreement.Propose(Host, HostUser, Now.AddDays(-5));
                agreement.Accept(Guest, GuestUser, Guid.NewGuid(), "aláírt PDF: DMS-123", Now.AddDays(-4));
                agreement.Supersede(Host, HostUser, Guid.NewGuid(), Now.AddDays(-3));
                break;
            default:
                throw new ArgumentOutOfRangeException(nameof(status), status, "Unhandled agreement status.");
        }

        Assert.Equal(status, agreement.Status);
        return agreement;
    }
}
