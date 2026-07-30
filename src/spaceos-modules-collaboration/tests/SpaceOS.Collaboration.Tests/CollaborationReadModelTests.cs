using SpaceOS.Collaboration.Application.Projections;
using SpaceOS.Collaboration.Domain;
using Xunit;

namespace SpaceOS.Collaboration.Tests;

public sealed class CollaborationReadModelTests
{
    private static readonly Guid AgreementId = Guid.NewGuid();
    private static readonly Guid HostTenantId = Guid.NewGuid();
    private static readonly Guid GuestTenantId = Guid.NewGuid();
    private static readonly Guid AttackerTenantId = Guid.NewGuid();
    private static readonly Guid HostUserId = Guid.NewGuid();
    private static readonly Guid GuestUserId = Guid.NewGuid();
    private static readonly DateTimeOffset Now = DateTimeOffset.UtcNow;

    [Fact]
    public void AllowedActions_InProgressState_GuestHasSubmit_HostDoesNotHaveSubmit()
    {
        var wp = DelegatedWorkPackage.Create(
            AgreementId,
            HostTenantId,
            GuestTenantId,
            "Machining Work",
            "Milling 100 aluminum brackets",
            Now.AddDays(5),
            Now);

        wp.Offer(HostTenantId, HostUserId, Now);
        wp.Accept(GuestTenantId, GuestUserId, Now);
        wp.StartProgress(GuestTenantId, GuestUserId, Now);

        var guestActions = wp.AllowedActionsFor(GuestTenantId);
        var hostActions = wp.AllowedActionsFor(HostTenantId);

        Assert.Contains("Submit", guestActions);
        Assert.DoesNotContain("Submit", hostActions);
        Assert.Contains("Cancel", hostActions);
    }

    [Fact]
    public void AllowedActions_SubmittedState_HostHasCompleteAndRequestChanges()
    {
        var wp = DelegatedWorkPackage.Create(
            AgreementId,
            HostTenantId,
            GuestTenantId,
            "Machining Work",
            "Milling 100 aluminum brackets",
            Now.AddDays(5),
            Now);

        wp.Offer(HostTenantId, HostUserId, Now);
        wp.Accept(GuestTenantId, GuestUserId, Now);
        wp.StartProgress(GuestTenantId, GuestUserId, Now);
        wp.Submit(GuestTenantId, GuestUserId, "QA-PROOF-101", Now);

        var hostActions = wp.AllowedActionsFor(HostTenantId);
        var guestActions = wp.AllowedActionsFor(GuestTenantId);

        Assert.Contains("Complete", hostActions);
        Assert.Contains("RequestChanges", hostActions);
        Assert.DoesNotContain("Complete", guestActions);
    }

    [Fact]
    public void ProjectionService_AttackerTenant_ReturnsNullWithoutDataLeakage()
    {
        var wp = DelegatedWorkPackage.Create(
            AgreementId,
            HostTenantId,
            GuestTenantId,
            "Secret Subcontract",
            "Confidential specification",
            Now.AddDays(5),
            Now);

        var service = new CollaborationProjectionService();

        var readModel = service.ProjectWorkPackage(wp, AttackerTenantId);

        Assert.Null(readModel);
    }
}
