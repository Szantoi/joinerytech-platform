using SpaceOS.Collaboration.Domain;
using Xunit;

namespace SpaceOS.Collaboration.Tests;

public sealed class DelegatedWorkPackageFsmTests
{
    private static readonly Guid AgreementId = Guid.NewGuid();
    private static readonly Guid HostTenantId = Guid.NewGuid();
    private static readonly Guid GuestTenantId = Guid.NewGuid();
    private static readonly Guid HostUserId = Guid.NewGuid();
    private static readonly Guid GuestUserId = Guid.NewGuid();
    private static readonly DateTimeOffset Now = DateTimeOffset.UtcNow;
    private static readonly DateTimeOffset DueDate = Now.AddDays(7);

    [Fact]
    public void FullLifecycle_HappyPath_TransitionsToCompleted()
    {
        var wp = DelegatedWorkPackage.Create(
            AgreementId,
            HostTenantId,
            GuestTenantId,
            "Window Frame Subcontract",
            "Produce 50 oak window frames according to spec #402",
            DueDate,
            Now);

        Assert.Equal(WorkPackageStatus.Draft, wp.Status);

        // 1. Offer (Host)
        wp.Offer(HostTenantId, HostUserId, Now.AddMinutes(1));
        Assert.Equal(WorkPackageStatus.Offered, wp.Status);

        // 2. Accept (Guest)
        wp.Accept(GuestTenantId, GuestUserId, Now.AddMinutes(2));
        Assert.Equal(WorkPackageStatus.Accepted, wp.Status);

        // 3. Start Progress (Guest)
        wp.StartProgress(GuestTenantId, GuestUserId, Now.AddHours(1));
        Assert.Equal(WorkPackageStatus.InProgress, wp.Status);

        // 4. Submit (Guest)
        wp.Submit(GuestTenantId, GuestUserId, "QA-INSPECTION-PROOF-901", Now.AddDays(3));
        Assert.Equal(WorkPackageStatus.Submitted, wp.Status);
        Assert.Equal("QA-INSPECTION-PROOF-901", wp.DeliverableRef);

        // 5. Complete (Host)
        wp.Complete(HostTenantId, HostUserId, "ACCEPTANCE-SIGN-OFF-001", Now.AddDays(4));
        Assert.Equal(WorkPackageStatus.Completed, wp.Status);
        Assert.Equal("ACCEPTANCE-SIGN-OFF-001", wp.CompletionProofRef);

        Assert.Equal(5, wp.History.Count);
    }

    [Fact]
    public void Submit_HostActor_ThrowsInvalidOperationException()
    {
        var wp = DelegatedWorkPackage.Create(
            AgreementId,
            HostTenantId,
            GuestTenantId,
            "Cutting Service",
            "Scope description",
            DueDate,
            Now);

        wp.Offer(HostTenantId, HostUserId, Now);
        wp.Accept(GuestTenantId, GuestUserId, Now);
        wp.StartProgress(GuestTenantId, GuestUserId, Now);

        // Host attempts to submit work (Guest-only action)
        var ex = Assert.Throws<InvalidOperationException>(() =>
            wp.Submit(HostTenantId, HostUserId, "PROOF-123", Now));

        Assert.Contains("Only the guest", ex.Message);
    }

    [Fact]
    public void Submit_MissingDeliverableRef_ThrowsArgumentException()
    {
        var wp = DelegatedWorkPackage.Create(
            AgreementId,
            HostTenantId,
            GuestTenantId,
            "Cutting Service",
            "Scope description",
            DueDate,
            Now);

        wp.Offer(HostTenantId, HostUserId, Now);
        wp.Accept(GuestTenantId, GuestUserId, Now);
        wp.StartProgress(GuestTenantId, GuestUserId, Now);

        var ex = Assert.Throws<ArgumentException>(() =>
            wp.Submit(GuestTenantId, GuestUserId, "   ", Now));

        Assert.Contains("Deliverable proof reference", ex.Message);
    }

    [Fact]
    public void ChangesRequested_Flow_AllowsReworkAndReSubmission()
    {
        var wp = DelegatedWorkPackage.Create(
            AgreementId,
            HostTenantId,
            GuestTenantId,
            "Furniture Assembly",
            "Scope",
            DueDate,
            Now);

        wp.Offer(HostTenantId, HostUserId, Now);
        wp.Accept(GuestTenantId, GuestUserId, Now);
        wp.StartProgress(GuestTenantId, GuestUserId, Now);
        wp.Submit(GuestTenantId, GuestUserId, "PROOF-v1", Now);

        // Host requests changes
        wp.RequestChanges(HostTenantId, HostUserId, "Sanded finish tolerance out of spec by 0.5mm", Now.AddHours(1));
        Assert.Equal(WorkPackageStatus.ChangesRequested, wp.Status);

        // Guest starts progress again
        wp.StartProgress(GuestTenantId, GuestUserId, Now.AddHours(2));
        Assert.Equal(WorkPackageStatus.InProgress, wp.Status);

        // Guest submits updated deliverable
        wp.Submit(GuestTenantId, GuestUserId, "PROOF-v2", Now.AddHours(3));
        Assert.Equal(WorkPackageStatus.Submitted, wp.Status);

        // Host completes
        wp.Complete(HostTenantId, HostUserId, "FINAL-PROOF", Now.AddHours(4));
        Assert.Equal(WorkPackageStatus.Completed, wp.Status);
    }

    [Theory]
    [InlineData(WorkPackageStatus.Rejected)]
    [InlineData(WorkPackageStatus.Cancelled)]
    [InlineData(WorkPackageStatus.Completed)]
    public void A_closed_package_cannot_be_cancelled_again(WorkPackageStatus closed)
    {
        // Gábor's decision (2026-07-30). NOT covered by the parity suite: that one proves the
        // advertised list and the guards AGREE, which they would even if both were wrong. What is
        // right is a product rule, and a product rule has to be stated somewhere.
        var package = InState(closed);

        var refusal = Assert.Throws<InvalidOperationException>(
            () => package.Cancel(HostTenantId, HostUserId, "meggondoltuk", Now));

        Assert.Contains("already closed", refusal.Message, StringComparison.Ordinal);
        Assert.Equal(closed, package.Status);
    }

    [Fact]
    public void An_open_package_can_still_be_cancelled_by_either_party()
    {
        // The negative control: if the guard had simply become "never cancel", the theory above
        // would pass just as well.
        var byHost = InState(WorkPackageStatus.Offered);
        byHost.Cancel(HostTenantId, HostUserId, "elállunk", Now);
        Assert.Equal(WorkPackageStatus.Cancelled, byHost.Status);

        var byGuest = InState(WorkPackageStatus.InProgress);
        byGuest.Cancel(GuestTenantId, HostUserId, "nem fér bele", Now);
        Assert.Equal(WorkPackageStatus.Cancelled, byGuest.Status);
    }

    /// <summary>Drives the FSM to the requested state with the real transitions.</summary>
    private static DelegatedWorkPackage InState(WorkPackageStatus status)
    {
        var package = DelegatedWorkPackage.Create(
            Guid.NewGuid(), HostTenantId, GuestTenantId, "Ajtólap", "50 db", Now.AddDays(30), Now.AddDays(-1));

        if (status == WorkPackageStatus.Cancelled)
        {
            package.Cancel(HostTenantId, HostUserId, "elállunk", Now);
            return package;
        }

        package.Offer(HostTenantId, HostUserId, Now);

        if (status == WorkPackageStatus.Offered)
        {
            return package;
        }

        if (status == WorkPackageStatus.Rejected)
        {
            package.Reject(GuestTenantId, HostUserId, "nem fér bele", Now);
            return package;
        }

        package.Accept(GuestTenantId, HostUserId, Now);

        if (status == WorkPackageStatus.Accepted)
        {
            return package;
        }

        package.StartProgress(GuestTenantId, HostUserId, Now);

        if (status == WorkPackageStatus.InProgress)
        {
            return package;
        }

        package.Submit(GuestTenantId, HostUserId, "DMS:1", Now);

        if (status == WorkPackageStatus.Submitted)
        {
            return package;
        }

        package.Complete(HostTenantId, HostUserId, "QA:1", Now);
        return package;
    }
}
