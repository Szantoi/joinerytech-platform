using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SpaceOS.Modules.Hosting.Wire;
using SpaceOS.Modules.Maintenance.Api;
using SpaceOS.Modules.Maintenance.Domain.Enums;
using Xunit;

namespace SpaceOS.Modules.Maintenance.Tests.Api;

/// <summary>
/// ADR-059 wire-vocabulary pin for the maintenance module: the canonical
/// Hungarian keys mirrored by the portal's zod enums. The map constructors
/// enforce completeness; these tests pin the EXACT spellings so a renamed key
/// breaks the build, not the client.
/// </summary>
public sealed class MaintenanceWireTests
{
    [Fact]
    public void EveryAssetKind_HasAHungarianSpelling()
        => Enum.GetValues<AssetKind>().Select(MaintenanceWire.AssetKind.ToWire)
            .Should().Equal("gep", "jarmu", "szerszam", "infrastruktura", "it", "helyiseg");

    [Fact]
    public void EveryAssetStatus_HasAHungarianSpelling()
        => Enum.GetValues<AssetStatus>().Select(MaintenanceWire.AssetStatus.ToWire)
            .Should().Equal("uzemel", "karbantartas", "geptores", "selejtezve");

    [Fact]
    public void EveryMaintenanceTrigger_HasAHungarianSpelling()
        => Enum.GetValues<MaintenanceTrigger>().Select(MaintenanceWire.MaintenanceTrigger.ToWire)
            .Should().Equal("idokoz", "uzemora");

    [Fact]
    public void EveryWorkOrderStatus_HasAHungarianSpelling()
        => Enum.GetValues<WorkOrderStatus>().Select(MaintenanceWire.WorkOrderStatus.ToWire)
            .Should().Equal("bejelentve", "utemezve", "folyamatban", "kesz", "halasztva", "elutasitva");

    [Fact]
    public void EveryWorkOrderType_HasAHungarianSpelling()
        => Enum.GetValues<WorkOrderType>().Select(MaintenanceWire.WorkOrderType.ToWire)
            .Should().Equal("javitas", "megelozo", "takaritas");

    [Fact]
    public void EveryWorkOrderPriority_HasAHungarianSpelling()
        => Enum.GetValues<WorkOrderPriority>().Select(MaintenanceWire.WorkOrderPriority.ToWire)
            .Should().Equal("kritikus", "magas", "kozepes", "alacsony");

    [Fact]
    public void EveryAssignmentType_HasAHungarianSpelling()
        => Enum.GetValues<AssignmentType>().Select(MaintenanceWire.AssignmentType.ToWire)
            .Should().Equal("belso", "kulso");

    [Fact]
    public void ParsingIsCaseSensitive_AndRejectsEnglishMemberNames()
    {
        // The contract spells them lowercase; accepting "Utemezve" or the
        // English member name "Scheduled" would invite clients to drift.
        MaintenanceWire.WorkOrderStatus.TryParse("utemezve", out var status).Should().BeTrue();
        status.Should().Be(WorkOrderStatus.Scheduled);

        MaintenanceWire.WorkOrderStatus.TryParse("Utemezve", out _).Should().BeFalse();
        MaintenanceWire.WorkOrderStatus.TryParse("Scheduled", out _).Should().BeFalse();
        MaintenanceWire.WorkOrderStatus.TryParse(null, out _).Should().BeFalse();
    }

    [Fact]
    public void AddingAnEnumMemberWithoutASpelling_FailsFast()
    {
        // Guards the whole scheme: a member with no wire name would otherwise
        // serialise as something the client cannot parse.
        var act = () => new EnumWireMap<WorkOrderStatus>(
            new Dictionary<WorkOrderStatus, string> { [WorkOrderStatus.Reported] = "bejelentve" });

        act.Should().Throw<ArgumentException>().WithMessage("*without a wire spelling*");
    }
}

/// <summary>
/// HTTP-level ADR-059 checks: request bodies parse the Hungarian keys exactly,
/// unknown keys answer 400 with the accepted spellings, and FSM 409 bodies
/// speak wire keys, not English enum member names.
/// </summary>
public sealed class MaintenanceWireEndpointTests : IAsyncLifetime
{
    private const string BaseUrl = "/api/maintenance/work-orders";

    private readonly WorkOrderEndpointTestHost _host = new();

    public Task InitializeAsync() => _host.InitializeAsync();

    public Task DisposeAsync() => _host.DisposeAsync();

    [Fact]
    public async Task CreateWorkOrder_WithHungarianTypeAndPriority_Returns201()
    {
        var asset = _host.SeedAsset();

        var response = await _host.Client.PostAsJsonAsync(BaseUrl, new
        {
            assetId = asset.Id.Value,
            type = "javitas",
            priority = "magas",
            title = "Szíj csere",
            description = "A hajtószíj elszakadt üzem közben"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task CreateWorkOrder_WithEnglishMemberName_Returns400ListingSpellings()
    {
        var asset = _host.SeedAsset();

        var response = await _host.Client.PostAsJsonAsync(BaseUrl, new
        {
            assetId = asset.Id.Value,
            type = "Corrective", // domain member name, NOT a wire key
            priority = "magas",
            title = "Szíj csere",
            description = "A hajtószíj elszakadt üzem közben"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("javitas").And.Contain("megelozo").And.Contain("takaritas");
    }

    [Fact]
    public async Task Assign_WithUnknownAssignmentType_Returns400ListingSpellings()
    {
        var asset = _host.SeedAsset();
        var wo = _host.SeedWorkOrder(asset.Id);

        var response = await _host.Client.PutAsJsonAsync(
            $"{BaseUrl}/{wo.Id.Value}/assign",
            new { assignmentType = "Internal", assignedTo = Guid.NewGuid() });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("belso").And.Contain("kulso");
    }

    [Fact]
    public async Task TransitionConflict_Body_SpeaksWireKeysNotMemberNames()
    {
        var asset = _host.SeedAsset();
        var wo = _host.SeedWorkOrder(asset.Id, WorkOrderStatus.Scheduled);

        var response = await _host.Client.PutAsJsonAsync(
            $"{BaseUrl}/{wo.Id.Value}/schedule",
            new { scheduledAt = DateTime.UtcNow.AddDays(2), estimatedHours = 1m });

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("utemezve"); // "Cannot schedule work order in utemezve status"
        body.Should().NotContain("Scheduled");
    }
}
