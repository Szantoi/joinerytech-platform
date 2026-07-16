using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using SpaceOS.Modules.Maintenance.Domain.Enums;
using Xunit;

namespace SpaceOS.Modules.Maintenance.Tests.Api;

/// <summary>
/// HTTP contract tests for the work order transition endpoints (MAINT-BE-TRANSITIONS).
/// Portal contract mirror (mocks/maintenanceApi/handlers.workOrders.ts):
///   PUT {id}/schedule|assign|start|complete|postpone|reject|reopen
///   200 → fresh WorkOrderDto, 404 → unknown id, 409 → FSM/state conflict,
///   400 → invalid payload; enums travel as strings.
/// TestServer + in-memory repositories — no database needed.
/// </summary>
public sealed class WorkOrderTransitionEndpointTests : IAsyncLifetime
{
    private const string BaseUrl = "/api/maintenance/work-orders";

    private readonly WorkOrderEndpointTestHost _host = new();

    public Task InitializeAsync() => _host.InitializeAsync();

    public Task DisposeAsync() => _host.DisposeAsync();

    // ── schedule ────────────────────────────────────────────────────────────

    [Fact]
    public async Task Schedule_FromReported_Returns200WithFreshDto()
    {
        var asset = _host.SeedAsset();
        var wo = _host.SeedWorkOrder(asset.Id);
        var scheduledAt = DateTime.UtcNow.AddDays(2);

        var response = await _host.Client.PutAsJsonAsync(
            $"{BaseUrl}/{wo.Id.Value}/schedule",
            new { scheduledAt, estimatedHours = 3.5m });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto = await ReadJson(response);
        dto.GetProperty("status").GetString().Should().Be("Scheduled"); // enum as string
        dto.GetProperty("estimatedHours").GetDecimal().Should().Be(3.5m);
        dto.GetProperty("scheduledStart").GetDateTime().Should().BeCloseTo(scheduledAt, TimeSpan.FromSeconds(1));
        dto.GetProperty("assetCode").GetString().Should().Be("CNC-01");
    }

    [Fact]
    public async Task Schedule_FromScheduled_Returns409()
    {
        var asset = _host.SeedAsset();
        var wo = _host.SeedWorkOrder(asset.Id, WorkOrderStatus.Scheduled);

        var response = await _host.Client.PutAsJsonAsync(
            $"{BaseUrl}/{wo.Id.Value}/schedule",
            new { scheduledAt = DateTime.UtcNow.AddDays(2), estimatedHours = 1m });

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await response.Content.ReadAsStringAsync()).Should().Contain("Cannot schedule");
    }

    [Fact]
    public async Task Schedule_WithPastDate_Returns400()
    {
        var asset = _host.SeedAsset();
        var wo = _host.SeedWorkOrder(asset.Id);

        var response = await _host.Client.PutAsJsonAsync(
            $"{BaseUrl}/{wo.Id.Value}/schedule",
            new { scheduledAt = DateTime.UtcNow.AddDays(-1), estimatedHours = 1m });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Schedule_UnknownId_Returns404()
    {
        var response = await _host.Client.PutAsJsonAsync(
            $"{BaseUrl}/{Guid.NewGuid()}/schedule",
            new { scheduledAt = DateTime.UtcNow.AddDays(2), estimatedHours = 1m });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── assign ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task Assign_FromReported_Returns200WithAssignee()
    {
        var asset = _host.SeedAsset();
        var wo = _host.SeedWorkOrder(asset.Id);
        var employeeId = Guid.NewGuid();

        var response = await _host.Client.PutAsJsonAsync(
            $"{BaseUrl}/{wo.Id.Value}/assign",
            new { assignmentType = "Internal", assignedTo = employeeId });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto = await ReadJson(response);
        dto.GetProperty("status").GetString().Should().Be("Reported"); // assign is NOT an FSM transition
        dto.GetProperty("assignmentType").GetString().Should().Be("Internal");
        dto.GetProperty("assignedTo").GetGuid().Should().Be(employeeId);
    }

    [Fact]
    public async Task Assign_InProgress_Returns409()
    {
        var asset = _host.SeedAsset();
        var wo = _host.SeedWorkOrder(asset.Id, WorkOrderStatus.InProgress);

        var response = await _host.Client.PutAsJsonAsync(
            $"{BaseUrl}/{wo.Id.Value}/assign",
            new { assignmentType = "External", assignedTo = Guid.NewGuid() });

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Assign_InvalidType_Returns400()
    {
        var asset = _host.SeedAsset();
        var wo = _host.SeedWorkOrder(asset.Id);

        var response = await _host.Client.PutAsJsonAsync(
            $"{BaseUrl}/{wo.Id.Value}/assign",
            new { assignmentType = "Alien", assignedTo = Guid.NewGuid() });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ── start ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task Start_ScheduledAndAssigned_Returns200InProgress()
    {
        var asset = _host.SeedAsset();
        var wo = _host.SeedWorkOrder(asset.Id, WorkOrderStatus.Scheduled, assigned: true);

        // Portal contract: empty body
        var response = await _host.Client.PutAsync($"{BaseUrl}/{wo.Id.Value}/start", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto = await ReadJson(response);
        dto.GetProperty("status").GetString().Should().Be("InProgress");
        dto.GetProperty("startedAt").ValueKind.Should().Be(JsonValueKind.String);
    }

    [Fact]
    public async Task Start_WithoutAssignment_Returns409WithGuardMessage()
    {
        var asset = _host.SeedAsset();
        var wo = _host.SeedWorkOrder(asset.Id, WorkOrderStatus.Scheduled);

        var response = await _host.Client.PutAsync($"{BaseUrl}/{wo.Id.Value}/start", null);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await response.Content.ReadAsStringAsync())
            .Should().Contain("must be assigned before starting"); // StartWork() guard mirror
    }

    [Fact]
    public async Task Start_FromReported_Returns409()
    {
        var asset = _host.SeedAsset();
        var wo = _host.SeedWorkOrder(asset.Id); // Reported — the removed FSM-table shortcut

        var response = await _host.Client.PutAsync($"{BaseUrl}/{wo.Id.Value}/start", null);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    // ── complete ────────────────────────────────────────────────────────────

    [Fact]
    public async Task Complete_FromInProgress_Returns200Completed()
    {
        var asset = _host.SeedAsset();
        var wo = _host.SeedWorkOrder(asset.Id, WorkOrderStatus.InProgress);

        var response = await _host.Client.PutAsJsonAsync(
            $"{BaseUrl}/{wo.Id.Value}/complete",
            new { actualHours = 2.5m });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto = await ReadJson(response);
        dto.GetProperty("status").GetString().Should().Be("Completed");
        dto.GetProperty("actualHours").GetDecimal().Should().Be(2.5m);
    }

    [Fact]
    public async Task Complete_FromScheduled_Returns409()
    {
        var asset = _host.SeedAsset();
        var wo = _host.SeedWorkOrder(asset.Id, WorkOrderStatus.Scheduled, assigned: true);

        var response = await _host.Client.PutAsJsonAsync(
            $"{BaseUrl}/{wo.Id.Value}/complete",
            new { actualHours = 2.5m });

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Complete_WithZeroHours_Returns400()
    {
        var asset = _host.SeedAsset();
        var wo = _host.SeedWorkOrder(asset.Id, WorkOrderStatus.InProgress);

        var response = await _host.Client.PutAsJsonAsync(
            $"{BaseUrl}/{wo.Id.Value}/complete",
            new { actualHours = 0m });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ── postpone / reject ───────────────────────────────────────────────────

    [Fact]
    public async Task Postpone_FromScheduled_Returns200Postponed()
    {
        var asset = _host.SeedAsset();
        var wo = _host.SeedWorkOrder(asset.Id, WorkOrderStatus.Scheduled);

        var response = await _host.Client.PutAsJsonAsync(
            $"{BaseUrl}/{wo.Id.Value}/postpone",
            new { reason = "Alkatrészre várunk" });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto = await ReadJson(response);
        dto.GetProperty("status").GetString().Should().Be("Postponed");
        dto.GetProperty("postponementReason").GetString().Should().Be("Alkatrészre várunk");
    }

    [Fact]
    public async Task Postpone_WithEmptyReason_Returns400()
    {
        var asset = _host.SeedAsset();
        var wo = _host.SeedWorkOrder(asset.Id, WorkOrderStatus.Scheduled);

        var response = await _host.Client.PutAsJsonAsync(
            $"{BaseUrl}/{wo.Id.Value}/postpone",
            new { reason = "" });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Postpone_FromReported_Returns409()
    {
        var asset = _host.SeedAsset();
        var wo = _host.SeedWorkOrder(asset.Id);

        var response = await _host.Client.PutAsJsonAsync(
            $"{BaseUrl}/{wo.Id.Value}/postpone",
            new { reason = "Indok" });

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Reject_FromReported_Returns200Rejected()
    {
        var asset = _host.SeedAsset();
        var wo = _host.SeedWorkOrder(asset.Id);

        var response = await _host.Client.PutAsJsonAsync(
            $"{BaseUrl}/{wo.Id.Value}/reject",
            new { reason = "Nem indokolt" });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await ReadJson(response)).GetProperty("status").GetString().Should().Be("Rejected");
    }

    [Fact]
    public async Task Reject_FromInProgress_Returns409()
    {
        var asset = _host.SeedAsset();
        var wo = _host.SeedWorkOrder(asset.Id, WorkOrderStatus.InProgress);

        var response = await _host.Client.PutAsJsonAsync(
            $"{BaseUrl}/{wo.Id.Value}/reject",
            new { reason = "Indok" });

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    // ── reopen ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task Reopen_FromPostponed_Returns200AndClearsAssignmentAndSchedule()
    {
        var asset = _host.SeedAsset();
        var wo = _host.SeedWorkOrder(asset.Id, WorkOrderStatus.Postponed, assigned: true);

        // Portal contract: empty body
        var response = await _host.Client.PutAsync($"{BaseUrl}/{wo.Id.Value}/reopen", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto = await ReadJson(response);
        dto.GetProperty("status").GetString().Should().Be("Reported");
        dto.GetProperty("assignedTo").ValueKind.Should().Be(JsonValueKind.Null);
        dto.GetProperty("assignmentType").ValueKind.Should().Be(JsonValueKind.Null);
        dto.GetProperty("scheduledStart").ValueKind.Should().Be(JsonValueKind.Null);
        dto.GetProperty("postponementReason").ValueKind.Should().Be(JsonValueKind.Null); // Reopen() clears it
    }

    [Fact]
    public async Task Reopen_FromCompleted_Returns409Terminal()
    {
        var asset = _host.SeedAsset();
        var wo = _host.SeedWorkOrder(asset.Id, WorkOrderStatus.Completed);

        var response = await _host.Client.PutAsync($"{BaseUrl}/{wo.Id.Value}/reopen", null);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    // ── full chain (portal happy path) ──────────────────────────────────────

    [Fact]
    public async Task FullChain_Schedule_Assign_Start_Complete_MirrorsPortalFsm()
    {
        var asset = _host.SeedAsset();
        var wo = _host.SeedWorkOrder(asset.Id);
        var url = $"{BaseUrl}/{wo.Id.Value}";

        var schedule = await _host.Client.PutAsJsonAsync(
            $"{url}/schedule", new { scheduledAt = DateTime.UtcNow.AddDays(1), estimatedHours = 4m });
        schedule.StatusCode.Should().Be(HttpStatusCode.OK);

        var assign = await _host.Client.PutAsJsonAsync(
            $"{url}/assign", new { assignmentType = "External", assignedTo = Guid.NewGuid() });
        assign.StatusCode.Should().Be(HttpStatusCode.OK);

        var start = await _host.Client.PutAsync($"{url}/start", null);
        start.StatusCode.Should().Be(HttpStatusCode.OK);
        (await ReadJson(start)).GetProperty("status").GetString().Should().Be("InProgress");

        var complete = await _host.Client.PutAsJsonAsync($"{url}/complete", new { actualHours = 3.5m });
        complete.StatusCode.Should().Be(HttpStatusCode.OK);
        (await ReadJson(complete)).GetProperty("status").GetString().Should().Be("Completed");
    }

    private static async Task<JsonElement> ReadJson(HttpResponseMessage response)
    {
        var payload = await response.Content.ReadAsStringAsync();
        return JsonDocument.Parse(payload).RootElement;
    }
}
