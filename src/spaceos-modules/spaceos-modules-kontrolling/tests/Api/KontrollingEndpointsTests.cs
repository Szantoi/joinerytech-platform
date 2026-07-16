namespace SpaceOS.Modules.Kontrolling.Tests.Api;

using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using SpaceOS.Modules.Kontrolling.Application.Portfolio;
using SpaceOS.Modules.Kontrolling.Domain.Entities;
using SpaceOS.Modules.Kontrolling.Domain.Enums;
using SpaceOS.Modules.Kontrolling.Domain.ValueObjects;
using Xunit;

/// <summary>
/// HTTP contract tests for the controlling endpoints, against the frozen
/// client contract (portal <c>modules/controlling</c>).
/// </summary>
/// <remarks>
/// These assert the RAW JSON, not deserialised DTOs: the wire spelling of the
/// enums, fractional percentages, and null-vs-absent are exactly what a
/// round-trip through our own converters would hide. The client validates the
/// payload with zod, so a shape mismatch is a break even when the C# types
/// line up.
/// </remarks>
public sealed class KontrollingEndpointsTests : IAsyncLifetime
{
    private readonly KontrollingEndpointTestHost _host = new();
    private HttpClient Client => _host.Client;

    public Task InitializeAsync() => _host.InitializeAsync();
    public Task DisposeAsync() => _host.DisposeAsync();

    private static ProjectCostLine Line(
        CostCategory category, decimal plan, decimal actual, string? note = null)
        => new(category, $"{category} sor", Money.FromHUF(plan), Money.FromHUF(actual), note);

    private async Task<JsonElement> GetJsonAsync(string url)
    {
        var response = await Client.GetAsync(url);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        return JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
    }

    // ── Portfolio list ──────────────────────────────────────────────────────

    [Fact]
    public async Task ListProjects_ReturnsContractShape_WithCalculatedRollUp()
    {
        // Contract value 1M, plan 400k, actual 500k.
        _host.Projects.Seed(
            KontrollingEndpointTestHost.TenantId, "PRJ-2026-001",
            ProjectLifecycleStatus.Install, contractValue: 1_000_000m, invoiced: 500_000m,
            Line(CostCategory.Material, 300_000m, 350_000m),
            Line(CostCategory.Labor, 100_000m, 150_000m));

        var json = await GetJsonAsync("/api/kontrolling/projects");
        var project = json.EnumerateArray().Single();

        project.GetProperty("id").GetString().Should().Be("PRJ-2026-001");
        project.GetProperty("status").GetString().Should().Be("install");
        project.GetProperty("contractValue").GetDecimal().Should().Be(1_000_000m);

        project.GetProperty("planTotal").GetDecimal().Should().Be(400_000m);
        project.GetProperty("actualTotal").GetDecimal().Should().Be(500_000m);
        // EAC = Σ MAX(plan, actual) per category = 350k + 150k
        project.GetProperty("eacTotal").GetDecimal().Should().Be(500_000m);
        project.GetProperty("variance").GetDecimal().Should().Be(100_000m);
        // Fractions, not percentages: 100k / 400k
        project.GetProperty("variancePct").GetDecimal().Should().Be(0.25m);
        // (1M − 500k) / 1M
        project.GetProperty("eacMarginPct").GetDecimal().Should().Be(0.5m);

        var categories = project.GetProperty("byCategory").EnumerateArray().ToList();
        categories.Select(c => c.GetProperty("category").GetString())
            .Should().Equal("anyag", "munka");
        categories[0].GetProperty("projected").GetDecimal().Should().Be(350_000m);
    }

    [Fact]
    public async Task ListProjects_OrdersByBusinessKeyDescending()
    {
        foreach (var code in new[] { "PRJ-2026-011", "PRJ-2026-014", "PRJ-2026-012" })
        {
            _host.Projects.Seed(KontrollingEndpointTestHost.TenantId, code,
                lines: Line(CostCategory.Material, 100m, 100m));
        }

        var json = await GetJsonAsync("/api/kontrolling/projects");

        json.EnumerateArray().Select(p => p.GetProperty("id").GetString())
            .Should().Equal("PRJ-2026-014", "PRJ-2026-012", "PRJ-2026-011");
    }

    [Fact]
    public async Task ListProjects_FiltersByStatus()
    {
        _host.Projects.Seed(KontrollingEndpointTestHost.TenantId, "PRJ-A",
            ProjectLifecycleStatus.OnHold, lines: Line(CostCategory.Material, 100m, 100m));
        _host.Projects.Seed(KontrollingEndpointTestHost.TenantId, "PRJ-B",
            ProjectLifecycleStatus.Done, lines: Line(CostCategory.Material, 100m, 100m));

        var json = await GetJsonAsync("/api/kontrolling/projects?status=on_hold");

        json.EnumerateArray().Select(p => p.GetProperty("id").GetString()).Should().Equal("PRJ-A");
    }

    [Fact]
    public async Task ListProjects_WithUnknownStatus_Returns400()
    {
        // Not an empty list: an unrecognised filter is a broken request, and
        // silently returning nothing would look like "no such projects".
        var response = await Client.GetAsync("/api/kontrolling/projects?status=finished");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("finished").And.Contain("on_hold");
    }

    [Fact]
    public async Task ListProjects_IsScopedToTheTenant()
    {
        _host.Projects.Seed(Guid.NewGuid(), "PRJ-OTHER-TENANT",
            lines: Line(CostCategory.Material, 100m, 100m));

        var json = await GetJsonAsync("/api/kontrolling/projects");

        json.GetArrayLength().Should().Be(0);
    }

    // ── Project detail ──────────────────────────────────────────────────────

    [Fact]
    public async Task GetProject_ReturnsMasterDataAndCostLines()
    {
        _host.Projects.Seed(
            KontrollingEndpointTestHost.TenantId, "PRJ-2026-014",
            ProjectLifecycleStatus.Install, contractValue: 2_700_000m, invoiced: 1_890_000m,
            Line(CostCategory.Material, 620_000m, 684_000m),
            Line(CostCategory.Supplier, 120_000m, 128_400m, "Blum számla projektre osztott része."));

        var json = await GetJsonAsync("/api/kontrolling/projects/PRJ-2026-014");

        json.GetProperty("customer").GetString().Should().Be("Teszt Ügyfél Kft.");
        json.GetProperty("invoiced").GetDecimal().Should().Be(1_890_000m);

        var lines = json.GetProperty("lines").EnumerateArray().ToList();
        lines.Should().HaveCount(2);
        lines[1].GetProperty("category").GetString().Should().Be("beszallito");
        lines[1].GetProperty("note").GetString().Should().Be("Blum számla projektre osztott része.");
    }

    [Fact]
    public async Task GetProject_OmitsNoteWhenAbsent()
    {
        // The client schema declares `note` optional, not nullable — an
        // explicit null would fail its validation.
        _host.Projects.Seed(KontrollingEndpointTestHost.TenantId, "PRJ-A",
            lines: Line(CostCategory.Material, 100m, 100m));

        var json = await GetJsonAsync("/api/kontrolling/projects/PRJ-A");

        json.GetProperty("lines")[0].TryGetProperty("note", out _).Should().BeFalse();
    }

    [Fact]
    public async Task GetProject_WithUnknownCode_Returns404()
    {
        var response = await Client.GetAsync("/api/kontrolling/projects/PRJ-NOPE");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        var body = await response.Content.ReadAsStringAsync();
        // The client's apiClient surfaces `message` to the user.
        body.Should().Contain("message");
    }

    // ── Cost calculation ────────────────────────────────────────────────────

    [Fact]
    public async Task GetProjectCalculation_FoldsLiveAdjustmentsIntoActuals()
    {
        var project = _host.Projects.Seed(
            KontrollingEndpointTestHost.TenantId, "PRJ-A",
            contractValue: 1_000_000m,
            lines: Line(CostCategory.Material, 300_000m, 300_000m));

        _host.Adjustments.Seed(CostAdjustment.Create(
            KontrollingEndpointTestHost.TenantId, project.ProjectId, CostCategory.Material,
            Money.FromHUF(-50_000m), AdjustmentScope.Project, "Beszállítói jóváírás", Guid.NewGuid()));

        var json = await GetJsonAsync("/api/kontrolling/projects/PRJ-A/cost-calculation");

        json.GetProperty("projectId").GetString().Should().Be("PRJ-A");
        // A credit lowers the actual; the plan is untouched.
        json.GetProperty("planTotal").GetDecimal().Should().Be(300_000m);
        json.GetProperty("actualTotal").GetDecimal().Should().Be(250_000m);
        // EAC = MAX(300k plan, 250k actual)
        json.GetProperty("eacTotal").GetDecimal().Should().Be(300_000m);
        json.GetProperty("variance").GetDecimal().Should().Be(-50_000m);
        json.GetProperty("calculatedAt").GetString().Should().StartWith("2026-07-16");
    }

    [Fact]
    public async Task GetProjectCalculation_WithoutContractValue_ReportsNullMargins()
    {
        // A margin on no revenue is undefined, not zero.
        _host.Projects.Seed(KontrollingEndpointTestHost.TenantId, "PRJ-A",
            contractValue: 0m, lines: Line(CostCategory.Material, 100m, 100m));

        var json = await GetJsonAsync("/api/kontrolling/projects/PRJ-A/cost-calculation");

        json.GetProperty("planMarginPct").ValueKind.Should().Be(JsonValueKind.Null);
        json.GetProperty("eacMarginPct").ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Fact]
    public async Task GetProjectCalculation_ExcludesPortfolioScopedAdjustments()
    {
        // A portfolio-wide correction belongs to no single project.
        _host.Projects.Seed(KontrollingEndpointTestHost.TenantId, "PRJ-A",
            lines: Line(CostCategory.Overhead, 100_000m, 100_000m));

        _host.Adjustments.Seed(CostAdjustment.Create(
            KontrollingEndpointTestHost.TenantId, null, CostCategory.Overhead,
            Money.FromHUF(120_000m), AdjustmentScope.Portfolio, "Energia-átalány", Guid.NewGuid()));

        var json = await GetJsonAsync("/api/kontrolling/projects/PRJ-A/cost-calculation");

        json.GetProperty("actualTotal").GetDecimal().Should().Be(100_000m);
    }

    // ── Portfolio summary ───────────────────────────────────────────────────

    [Fact]
    public async Task GetPortfolioSummary_CountsPortfolioAdjustmentExactlyOnce()
    {
        // Two projects; a single portfolio correction must be added once to
        // the totals — not once per project.
        foreach (var code in new[] { "PRJ-A", "PRJ-B" })
        {
            _host.Projects.Seed(KontrollingEndpointTestHost.TenantId, code,
                contractValue: 1_000_000m,
                lines: Line(CostCategory.Overhead, 100_000m, 100_000m));
        }

        _host.Adjustments.Seed(CostAdjustment.Create(
            KontrollingEndpointTestHost.TenantId, null, CostCategory.Overhead,
            Money.FromHUF(50_000m), AdjustmentScope.Portfolio, "Energia-átalány", Guid.NewGuid()));

        var json = await GetJsonAsync("/api/kontrolling/portfolio/cost-calculation");

        json.GetProperty("projectCount").GetInt32().Should().Be(2);
        json.GetProperty("contractTotal").GetDecimal().Should().Be(2_000_000m);
        json.GetProperty("planCostTotal").GetDecimal().Should().Be(200_000m);
        // 200k of project actuals + 50k portfolio correction (once)
        json.GetProperty("actualCostTotal").GetDecimal().Should().Be(250_000m);
        json.GetProperty("eacTotal").GetDecimal().Should().Be(250_000m);
    }

    [Fact]
    public async Task GetPortfolioSummary_FlagsRunningProjectsBelowTheMarginThreshold()
    {
        // Running, EAC margin 10% — below the 15% default threshold.
        _host.Projects.Seed(KontrollingEndpointTestHost.TenantId, "PRJ-RISK",
            ProjectLifecycleStatus.Active, contractValue: 1_000_000m,
            lines: Line(CostCategory.Material, 900_000m, 900_000m));

        // Draft with a terrible margin — not running, so never at risk.
        _host.Projects.Seed(KontrollingEndpointTestHost.TenantId, "PRJ-DRAFT",
            ProjectLifecycleStatus.Draft, contractValue: 1_000_000m,
            lines: Line(CostCategory.Material, 990_000m, 990_000m));

        var json = await GetJsonAsync("/api/kontrolling/portfolio/cost-calculation");

        json.GetProperty("projectsAtRisk").GetInt32().Should().Be(1);
        var atRisk = json.GetProperty("atRiskProjects").EnumerateArray().Single();
        atRisk.GetProperty("id").GetString().Should().Be("PRJ-RISK");
        atRisk.GetProperty("eacMarginPct").GetDecimal().Should().BeApproximately(0.1m, 0.0001m);
    }

    [Fact]
    public async Task GetPortfolioSummary_ReportsEacOverruns()
    {
        _host.Projects.Seed(KontrollingEndpointTestHost.TenantId, "PRJ-OVER",
            contractValue: 1_000_000m, lines: Line(CostCategory.Material, 100_000m, 130_000m));
        _host.Projects.Seed(KontrollingEndpointTestHost.TenantId, "PRJ-OK",
            contractValue: 1_000_000m, lines: Line(CostCategory.Material, 100_000m, 90_000m));

        var json = await GetJsonAsync("/api/kontrolling/portfolio/cost-calculation");

        json.GetProperty("eacOverrunCount").GetInt32().Should().Be(1);
        json.GetProperty("eacOverrunTotal").GetDecimal().Should().Be(30_000m);
    }

    [Fact]
    public async Task GetPortfolioSummary_TrendEndsWithTheCurrentMonthFromLiveData()
    {
        _host.Projects.Seed(KontrollingEndpointTestHost.TenantId, "PRJ-A",
            contractValue: 1_000_000m, lines: Line(CostCategory.Material, 250_000m, 300_000m));

        var json = await GetJsonAsync("/api/kontrolling/portfolio/cost-calculation");

        // The module stores no cost history, so the current month is the only
        // point it can state truthfully.
        var trend = json.GetProperty("marginTrend").EnumerateArray().ToList();
        trend.Should().HaveCount(1);
        trend[0].GetProperty("month").GetString().Should().Be("2026-07");
        trend[0].GetProperty("planMarginPct").GetDecimal().Should().Be(0.75m);
        trend[0].GetProperty("actualMarginPct").GetDecimal().Should().Be(0.7m);
    }

    // ── Variance ────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetVariance_AggregatesByCategory_WithProjectDrillDownWorstFirst()
    {
        _host.Projects.Seed(KontrollingEndpointTestHost.TenantId, "PRJ-A",
            lines: Line(CostCategory.Material, 100_000m, 130_000m));
        _host.Projects.Seed(KontrollingEndpointTestHost.TenantId, "PRJ-B",
            lines: Line(CostCategory.Material, 100_000m, 90_000m));

        var json = await GetJsonAsync("/api/kontrolling/variance");

        var row = json.EnumerateArray().Single();
        row.GetProperty("category").GetString().Should().Be("anyag");
        row.GetProperty("plan").GetDecimal().Should().Be(200_000m);
        row.GetProperty("actual").GetDecimal().Should().Be(220_000m);
        row.GetProperty("variance").GetDecimal().Should().Be(20_000m);
        row.GetProperty("variancePct").GetDecimal().Should().Be(0.1m);

        // Biggest overspend first.
        row.GetProperty("projects").EnumerateArray()
            .Select(p => p.GetProperty("projectId").GetString())
            .Should().Equal("PRJ-A", "PRJ-B");
    }

    [Fact]
    public async Task GetVariance_OmitsCategoriesNoProjectTouches()
    {
        _host.Projects.Seed(KontrollingEndpointTestHost.TenantId, "PRJ-A",
            lines: Line(CostCategory.Material, 100_000m, 100_000m));

        var json = await GetJsonAsync("/api/kontrolling/variance");

        json.EnumerateArray().Select(r => r.GetProperty("category").GetString())
            .Should().Equal("anyag");
    }

    // ── Cost adjustments: read ──────────────────────────────────────────────

    [Fact]
    public async Task ListAdjustments_ReturnsContractShape()
    {
        var project = _host.Projects.Seed(KontrollingEndpointTestHost.TenantId, "PRJ-A",
            lines: Line(CostCategory.Supplier, 100m, 100m));

        _host.Adjustments.Seed(CostAdjustment.Create(
            KontrollingEndpointTestHost.TenantId, project.ProjectId, CostCategory.Supplier,
            Money.FromHUF(-35_000m), AdjustmentScope.Project,
            "Beszállítói jóváírás — élzárás reklamáció", Guid.NewGuid()));

        var json = await GetJsonAsync("/api/kontrolling/cost-adjustments");
        var adjustment = json.EnumerateArray().Single();

        // The project is addressed by business key, not the internal Guid.
        adjustment.GetProperty("projectId").GetString().Should().Be("PRJ-A");
        adjustment.GetProperty("category").GetString().Should().Be("beszallito");
        adjustment.GetProperty("scope").GetString().Should().Be("project");
        adjustment.GetProperty("amount").GetDecimal().Should().Be(-35_000m);
        adjustment.GetProperty("reason").GetString().Should().Contain("jóváírás");
    }

    [Fact]
    public async Task ListAdjustments_PortfolioScoped_HasNullProjectId()
    {
        _host.Adjustments.Seed(CostAdjustment.Create(
            KontrollingEndpointTestHost.TenantId, null, CostCategory.Overhead,
            Money.FromHUF(120_000m), AdjustmentScope.Portfolio, "Energia-átalány", Guid.NewGuid()));

        var json = await GetJsonAsync("/api/kontrolling/cost-adjustments");
        var adjustment = json.EnumerateArray().Single();

        adjustment.GetProperty("projectId").ValueKind.Should().Be(JsonValueKind.Null);
        adjustment.GetProperty("scope").GetString().Should().Be("portfolio");
    }

    [Fact]
    public async Task ListAdjustments_FilteredByProject_ExcludesPortfolioScoped()
    {
        var project = _host.Projects.Seed(KontrollingEndpointTestHost.TenantId, "PRJ-A",
            lines: Line(CostCategory.Material, 100m, 100m));

        _host.Adjustments.Seed(CostAdjustment.Create(
            KontrollingEndpointTestHost.TenantId, project.ProjectId, CostCategory.Material,
            Money.FromHUF(1_000m), AdjustmentScope.Project, "Projekt-korrekció", Guid.NewGuid()));
        _host.Adjustments.Seed(CostAdjustment.Create(
            KontrollingEndpointTestHost.TenantId, null, CostCategory.Overhead,
            Money.FromHUF(2_000m), AdjustmentScope.Portfolio, "Portfólió-korrekció", Guid.NewGuid()));

        var json = await GetJsonAsync("/api/kontrolling/cost-adjustments?projectId=PRJ-A");

        json.EnumerateArray().Select(a => a.GetProperty("reason").GetString())
            .Should().Equal("Projekt-korrekció");
    }

    [Fact]
    public async Task ListAdjustments_FilteredByUnknownProject_Returns404()
    {
        var response = await Client.GetAsync("/api/kontrolling/cost-adjustments?projectId=PRJ-NOPE");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── Cost adjustments: write ─────────────────────────────────────────────

    private async Task<HttpResponseMessage> PostAdjustmentAsync(string json) =>
        await Client.PostAsync("/api/kontrolling/cost-adjustments",
            new StringContent(json, Encoding.UTF8, "application/json"));

    [Fact]
    public async Task CreateAdjustment_Returns201_WithTheFreshAdjustment()
    {
        _host.Projects.Seed(KontrollingEndpointTestHost.TenantId, "PRJ-A",
            lines: Line(CostCategory.Material, 100m, 100m));

        var response = await PostAdjustmentAsync("""
            {"projectId":"PRJ-A","category":"anyag","amount":-35000,
             "scope":"project","reason":"Beszállítói jóváírás"}
            """);

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        // The client applies the response optimistically, so the body must be
        // the whole adjustment — not just an id.
        var created = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
        created.GetProperty("id").GetString().Should().NotBeNullOrWhiteSpace();
        created.GetProperty("projectId").GetString().Should().Be("PRJ-A");
        created.GetProperty("category").GetString().Should().Be("anyag");
        created.GetProperty("amount").GetDecimal().Should().Be(-35_000m);
        created.GetProperty("scope").GetString().Should().Be("project");
        created.GetProperty("createdBy").GetString()
            .Should().Be(KontrollingEndpointTestHost.UserId.ToString());
    }

    [Fact]
    public async Task CreateAdjustment_ShiftsTheProjectActualImmediately()
    {
        _host.Projects.Seed(KontrollingEndpointTestHost.TenantId, "PRJ-A",
            contractValue: 1_000_000m, lines: Line(CostCategory.Material, 300_000m, 300_000m));

        await PostAdjustmentAsync("""
            {"projectId":"PRJ-A","category":"anyag","amount":25000,
             "scope":"project","reason":"Pótrendelés"}
            """);

        var json = await GetJsonAsync("/api/kontrolling/projects/PRJ-A/cost-calculation");
        json.GetProperty("actualTotal").GetDecimal().Should().Be(325_000m);
    }

    [Theory]
    // Reason is the audit trail — blank is never acceptable.
    [InlineData("""{"projectId":"PRJ-A","category":"anyag","amount":100,"scope":"project","reason":"   "}""")]
    // A zero correction corrects nothing.
    [InlineData("""{"projectId":"PRJ-A","category":"anyag","amount":0,"scope":"project","reason":"Ok"}""")]
    // Project scope without a project.
    [InlineData("""{"projectId":null,"category":"anyag","amount":100,"scope":"project","reason":"Ok"}""")]
    // Portfolio scope with a project.
    [InlineData("""{"projectId":"PRJ-A","category":"anyag","amount":100,"scope":"portfolio","reason":"Ok"}""")]
    // Unknown category spelling.
    [InlineData("""{"projectId":"PRJ-A","category":"unknown","amount":100,"scope":"project","reason":"Ok"}""")]
    public async Task CreateAdjustment_WithInvalidPayload_Returns400(string payload)
    {
        _host.Projects.Seed(KontrollingEndpointTestHost.TenantId, "PRJ-A",
            lines: Line(CostCategory.Material, 100m, 100m));

        var response = await PostAdjustmentAsync(payload);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateAdjustment_ForUnknownProject_Returns404()
    {
        // The payload is well formed; only the project is missing — so this is
        // 404, not 400.
        var response = await PostAdjustmentAsync("""
            {"projectId":"PRJ-NOPE","category":"anyag","amount":100,
             "scope":"project","reason":"Ok"}
            """);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task CreateAdjustment_PortfolioScoped_IsAccepted()
    {
        var response = await PostAdjustmentAsync("""
            {"projectId":null,"category":"rezsi","amount":120000,
             "scope":"portfolio","reason":"Energia-átalány Q2 korrekció"}
            """);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
        created.GetProperty("projectId").ValueKind.Should().Be(JsonValueKind.Null);
        created.GetProperty("category").GetString().Should().Be("rezsi");
    }

    // ── Cost adjustments: delete ────────────────────────────────────────────

    [Fact]
    public async Task DeleteAdjustment_Returns204_AndStopsAffectingTheCalculation()
    {
        var project = _host.Projects.Seed(KontrollingEndpointTestHost.TenantId, "PRJ-A",
            contractValue: 1_000_000m, lines: Line(CostCategory.Material, 300_000m, 300_000m));

        var adjustment = _host.Adjustments.Seed(CostAdjustment.Create(
            KontrollingEndpointTestHost.TenantId, project.ProjectId, CostCategory.Material,
            Money.FromHUF(25_000m), AdjustmentScope.Project, "Pótrendelés", Guid.NewGuid()));

        var response = await Client.DeleteAsync(
            $"/api/kontrolling/cost-adjustments/{adjustment.AdjustmentId}");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var json = await GetJsonAsync("/api/kontrolling/projects/PRJ-A/cost-calculation");
        json.GetProperty("actualTotal").GetDecimal().Should().Be(300_000m);
    }

    [Fact]
    public async Task DeleteAdjustment_SoftDeletes_KeepingTheAuditTrail()
    {
        var adjustment = _host.Adjustments.Seed(CostAdjustment.Create(
            KontrollingEndpointTestHost.TenantId, null, CostCategory.Overhead,
            Money.FromHUF(1_000m), AdjustmentScope.Portfolio, "Korrekció", Guid.NewGuid()));

        await Client.DeleteAsync($"/api/kontrolling/cost-adjustments/{adjustment.AdjustmentId}");

        adjustment.IsDeleted.Should().BeTrue();
        adjustment.DeletedBy.Should().Be(KontrollingEndpointTestHost.UserId);
        adjustment.Reason.Should().Be("Korrekció");

        // Gone from the read model, but still on record.
        var json = await GetJsonAsync("/api/kontrolling/cost-adjustments");
        json.GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task DeleteAdjustment_WhenUnknown_Returns404()
    {
        var response = await Client.DeleteAsync($"/api/kontrolling/cost-adjustments/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteAdjustment_WhenAlreadyDeleted_Returns409()
    {
        // The one state conflict this module has — it has no state machine.
        var adjustment = _host.Adjustments.Seed(CostAdjustment.Create(
            KontrollingEndpointTestHost.TenantId, null, CostCategory.Overhead,
            Money.FromHUF(1_000m), AdjustmentScope.Portfolio, "Korrekció", Guid.NewGuid()));

        await Client.DeleteAsync($"/api/kontrolling/cost-adjustments/{adjustment.AdjustmentId}");
        var second = await Client.DeleteAsync($"/api/kontrolling/cost-adjustments/{adjustment.AdjustmentId}");

        second.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var body = await second.Content.ReadAsStringAsync();
        body.Should().Contain("már törölve");
    }
}
