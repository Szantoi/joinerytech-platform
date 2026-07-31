using SpaceOS.Collaboration.Application.Adapters;
using Xunit;

namespace SpaceOS.Collaboration.Tests;

public sealed class ModuleAdapterIntegrationTests
{
    private static readonly Guid HostTenantId = Guid.NewGuid();
    private static readonly Guid GuestTenantId = Guid.NewGuid();

    [Fact]
    public async Task ProjectAdapter_KnownEpic_ResolvesAndUnknownStaysNull()
    {
        // The F5/2 port shape: no tenant parameter and no owner field — on the on-behalf-of path
        // the tenant travels in the forwarded token and the KERNEL enforces it (its 404 is the
        // tenant proof). The in-memory stand-in therefore only models known/unknown, fail-closed.
        var adapter = new InMemoryProjectAdapter();
        var epicId = Guid.NewGuid();
        adapter.RegisterProject(new ProjectReference(epicId, "Door Manufacturing Project"));

        var result = await adapter.ResolveFlowEpicAsync(epicId);
        Assert.NotNull(result);
        Assert.Equal("Door Manufacturing Project", result.Title);

        var unknown = await adapter.ResolveFlowEpicAsync(Guid.NewGuid());
        Assert.Null(unknown);
    }

    [Fact]
    public async Task DmsAdapter_ValidDocRef_VerifiesDocumentHash()
    {
        var adapter = new InMemoryDmsAdapter();
        const string docRef = "DMS-DOC-2026-9041";
        adapter.RegisterDocument(new DocumentReference(docRef, "Subcontract Agreement PDF", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", 1024500));

        var result = await adapter.VerifyDocumentRefAsync(docRef, HostTenantId);

        Assert.NotNull(result);
        Assert.Equal("Subcontract Agreement PDF", result.Title);
        Assert.Equal(64, result.ContentHash.Length);
    }

    [Fact]
    public async Task QaAdapter_ValidInspection_VerifiesPassedStatus()
    {
        var adapter = new InMemoryQaAdapter();
        const string qaRef = "QA-INSPECTION-PASS-082";
        adapter.RegisterInspection(new InspectionProofReference(qaRef, true, DateTimeOffset.UtcNow, "Chief QA Inspector"));

        var result = await adapter.VerifyInspectionProofAsync(qaRef, GuestTenantId);

        Assert.NotNull(result);
        Assert.True(result.IsPassed);
        Assert.Equal("Chief QA Inspector", result.InspectorName);
    }

    [Fact]
    public async Task ProcurementAdapter_SubcontractOrder_ResolvesWithoutCrossModuleDbJoin()
    {
        var adapter = new InMemoryProcurementAdapter();
        var orderId = Guid.NewGuid();
        adapter.RegisterOrder(new SubcontractOrderReference(orderId, HostTenantId, "PO-SUBCONTRACT-2026-001", 3500000m));

        var result = await adapter.GetSubcontractOrderRefAsync(orderId, HostTenantId);

        Assert.NotNull(result);
        Assert.Equal("PO-SUBCONTRACT-2026-001", result.OrderNumber);
        Assert.Equal(3500000m, result.TotalAmount);
    }
}
