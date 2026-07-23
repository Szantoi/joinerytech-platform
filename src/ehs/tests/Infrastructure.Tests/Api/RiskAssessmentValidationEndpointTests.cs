using System.Net;
using System.Text;
using System.Text.Json;
using SpaceOS.Modules.Ehs.Domain.Aggregates.RiskAssessmentAggregate;
using SpaceOS.Modules.Ehs.Domain.Enums;
using Xunit;

namespace SpaceOS.Modules.Ehs.Infrastructure.Tests.Api;

/// <summary>
/// P1 pin for the shared validation pipeline (RISKS-5X5-FE integration gate):
/// FluentValidation failures must return the documented 400 and short-circuit
/// BEFORE the handler — proven by the recording repositories staying untouched.
/// Runs on the real MediatR pipeline (<see cref="EhsValidationPipelineTestHost"/>),
/// unlike the mocked-mediator wire tests.
/// </summary>
public sealed class RiskAssessmentValidationEndpointTests : IAsyncLifetime
{
    private const string BaseRoute = "/api/ehs/risk-assessments";
    private static readonly Guid AssessedBy = Guid.Parse("22222222-2222-4222-8222-222222222222");
    private static readonly Guid KnownLocationId = Guid.Parse("33333333-3333-4333-8333-333333333333");

    private EhsValidationPipelineTestHost _host = null!;

    public async Task InitializeAsync()
    {
        _host = await EhsValidationPipelineTestHost.StartAsync();
        _host.Locations.SeedExisting(KnownLocationId);
    }

    public async Task DisposeAsync() => await _host.DisposeAsync();

    // ── Create ───────────────────────────────────────────────────────────

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Create_BlankHazardDescription_Returns400BeforeHandler(string hazard)
    {
        // LocationId is set on purpose: without the pipeline the handler's FIRST
        // action would be the location existence check, so ExistsCalls == 0 below
        // proves the short-circuit, not just the status code.
        var response = await _host.Client.PostAsync(
            BaseRoute, Json(CreateBody(hazard, FutureDate(), KnownLocationId)));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(0, _host.TotalRepositoryCalls);
    }

    [Fact]
    public async Task Create_HazardDescriptionAtMaxLength_Returns201()
    {
        var response = await _host.Client.PostAsync(
            BaseRoute, Json(CreateBody(new string('a', 1000), FutureDate())));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal(1, _host.RiskAssessments.AddCalls);
    }

    [Fact]
    public async Task Create_HazardDescriptionOverMaxLength_Returns400BeforeHandler()
    {
        var response = await _host.Client.PostAsync(
            BaseRoute, Json(CreateBody(new string('a', 1001), FutureDate(), KnownLocationId)));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(0, _host.TotalRepositoryCalls);
    }

    [Fact]
    public async Task Create_PastReviewDueDate_Returns400BeforeHandler()
    {
        var response = await _host.Client.PostAsync(
            BaseRoute, Json(CreateBody("Forgácselszívás hiánya", PastDate(), KnownLocationId)));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(0, _host.TotalRepositoryCalls);
    }

    [Fact]
    public async Task Create_ValidRequest_Returns201WithRiskAssessmentIdWireKey()
    {
        var response = await _host.Client.PostAsync(
            BaseRoute, Json(CreateBody("Forgácselszívás hiánya", FutureDate())));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        // The portal zod schema binds the exact camelCase key — pin the raw wire
        // shape, not just a tolerant deserialization (defect #3 regression guard).
        var raw = await response.Content.ReadAsStringAsync();
        Assert.Contains("\"riskAssessmentId\":", raw);
        Assert.DoesNotContain("RiskAssessmentId", raw);

        using var body = JsonDocument.Parse(raw);
        var returnedId = body.RootElement.GetProperty("riskAssessmentId").GetGuid();
        var stored = Assert.Single(_host.RiskAssessments.Stored);
        Assert.Equal(stored.RiskAssessmentId, returnedId);
        Assert.Equal($"{BaseRoute}/{returnedId}", response.Headers.Location?.ToString());
    }

    // ── Update ───────────────────────────────────────────────────────────

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Update_BlankHazardDescription_Returns400BeforeHandler(string hazard)
    {
        // Without the pipeline this would be a 404: the handler's first action is
        // GetByIdAsync on the unknown id. 400 + zero calls = pipeline proof.
        var response = await _host.Client.PutAsync(
            $"{BaseRoute}/{Guid.NewGuid()}", Json(UpdateBody(hazard, FutureDate())));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(0, _host.TotalRepositoryCalls);
    }

    [Fact]
    public async Task Update_HazardDescriptionOverMaxLength_Returns400BeforeHandler()
    {
        var response = await _host.Client.PutAsync(
            $"{BaseRoute}/{Guid.NewGuid()}", Json(UpdateBody(new string('a', 1001), FutureDate())));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(0, _host.TotalRepositoryCalls);
    }

    [Fact]
    public async Task Update_PastReviewDueDate_Returns400BeforeHandler()
    {
        var response = await _host.Client.PutAsync(
            $"{BaseRoute}/{Guid.NewGuid()}", Json(UpdateBody("Zajterhelés", PastDate())));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(0, _host.TotalRepositoryCalls);
    }

    [Fact]
    public async Task Update_ValidDraft_Returns204ThroughPipeline()
    {
        var draft = SeedDraft();

        var response = await _host.Client.PutAsync(
            $"{BaseRoute}/{draft.RiskAssessmentId}", Json(UpdateBody("Zajterhelés frissítve", FutureDate())));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(1, _host.RiskAssessments.UpdateCalls);
    }

    // ── Add-control ──────────────────────────────────────────────────────

    [Fact]
    public async Task AddControl_CapaAssignedToWithoutDueDate_Returns400AndPersistsNothing()
    {
        var draft = SeedDraft();

        var response = await _host.Client.PostAsync(
            $"{BaseRoute}/{draft.RiskAssessmentId}/add-control",
            Json(AddControlBody(
                "Elszívás telepítése", "Kovács Béla",
                capaAssignedTo: AssessedBy, capaDueDate: null)));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        AssertNothingPersisted(draft);
    }

    [Fact]
    public async Task AddControl_CapaDueDateWithoutAssignee_Returns400AndPersistsNothing()
    {
        var draft = SeedDraft();

        var response = await _host.Client.PostAsync(
            $"{BaseRoute}/{draft.RiskAssessmentId}/add-control",
            Json(AddControlBody(
                "Elszívás telepítése", "Kovács Béla",
                capaAssignedTo: null, capaDueDate: FutureDate())));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        AssertNothingPersisted(draft);
    }

    [Fact]
    public async Task AddControl_PastCapaDueDate_Returns400AndPersistsNothing()
    {
        var draft = SeedDraft();

        var response = await _host.Client.PostAsync(
            $"{BaseRoute}/{draft.RiskAssessmentId}/add-control",
            Json(AddControlBody(
                "Elszívás telepítése", "Kovács Béla",
                capaAssignedTo: AssessedBy, capaDueDate: PastDate())));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        AssertNothingPersisted(draft);
    }

    [Fact]
    public async Task AddControl_BlankControlMeasure_Returns400AndPersistsNothing()
    {
        var draft = SeedDraft();

        var response = await _host.Client.PostAsync(
            $"{BaseRoute}/{draft.RiskAssessmentId}/add-control",
            Json(AddControlBody("", "Kovács Béla",
                capaAssignedTo: null, capaDueDate: null)));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        AssertNothingPersisted(draft);
    }

    [Fact]
    public async Task AddControl_ResponsiblePersonOverMaxLength_Returns400AndPersistsNothing()
    {
        var draft = SeedDraft();

        // Boundary: 200 is the validator max, 201 must fail.
        var response = await _host.Client.PostAsync(
            $"{BaseRoute}/{draft.RiskAssessmentId}/add-control",
            Json(AddControlBody("Elszívás telepítése", new string('b', 201),
                capaAssignedTo: null, capaDueDate: null)));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        AssertNothingPersisted(draft);
    }

    [Fact]
    public async Task AddControl_ValidWithFullCapaPair_Returns201AndSpawnsCapa()
    {
        var draft = SeedDraft();

        var response = await _host.Client.PostAsync(
            $"{BaseRoute}/{draft.RiskAssessmentId}/add-control",
            Json(AddControlBody(
                "Elszívás telepítése", "Kovács Béla",
                capaAssignedTo: AssessedBy, capaDueDate: FutureDate())));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var raw = await response.Content.ReadAsStringAsync();
        Assert.Contains("\"riskControlId\":", raw);
        Assert.Contains("\"correctiveActionId\":", raw);
        Assert.Equal(1, _host.CorrectiveActions.AddCalls);
        Assert.Equal(1, _host.RiskAssessments.UpdateCalls);
        Assert.Single(draft.Controls);
    }

    // ── FSM transitions — non-regression on the real pipeline ────────────

    public static TheoryData<string> FsmActions => new()
    {
        "submit-for-review",
        "approve",
        "return-to-draft",
        "archive",
    };

    [Theory]
    [MemberData(nameof(FsmActions))]
    public async Task FsmAction_UnknownId_Returns404NotFive500(string action)
    {
        var response = await _host.Client.PostAsync(
            $"{BaseRoute}/{Guid.NewGuid()}/{action}", content: null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal(1, _host.RiskAssessments.GetByIdCalls); // handler ran, repo said no
    }

    [Theory]
    [MemberData(nameof(FsmActions))]
    public async Task FsmAction_EmptyGuidId_Returns404FromPipelineGuard(string action)
    {
        // The id/tenant NotEmpty validator now fires on the real pipeline; the
        // endpoint maps it to the documented 404 (MSW parity) instead of a 500.
        var response = await _host.Client.PostAsync(
            $"{BaseRoute}/{Guid.Empty}/{action}", content: null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal(0, _host.RiskAssessments.GetByIdCalls); // handler never reached
    }

    // ── Queries — the behavior must no-op where no validator exists ──────

    [Fact]
    public async Task ListRiskAssessments_Returns200OnRealPipeline()
    {
        var response = await _host.Client.GetAsync(BaseRoute);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(1, _host.RiskAssessments.ListCalls);
    }

    [Fact]
    public async Task GetRiskMatrix_Returns200OnRealPipeline()
    {
        var response = await _host.Client.GetAsync($"{BaseRoute}/risk-matrix");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetRiskAssessment_UnknownId_Returns404OnRealPipeline()
    {
        var response = await _host.Client.GetAsync($"{BaseRoute}/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private RiskAssessment SeedDraft()
    {
        var draft = RiskAssessment.Create(
            EhsValidationPipelineTestHost.TenantId,
            "Meglévő veszély",
            Severity.Moderate,
            Likelihood.Possible,
            AssessedBy,
            DateTimeOffset.UtcNow.AddDays(30),
            RiskBandConfiguration.Default);

        _host.RiskAssessments.Seed(draft);
        _host.ResetCounters(); // seeding must not pollute the short-circuit proof
        return draft;
    }

    private void AssertNothingPersisted(RiskAssessment draft)
    {
        Assert.Equal(0, _host.RiskAssessments.GetByIdCalls);
        Assert.Equal(0, _host.RiskAssessments.UpdateCalls);
        Assert.Equal(0, _host.CorrectiveActions.AddCalls);
        Assert.Empty(draft.Controls);
    }

    private static StringContent Json(string payload)
        => new(payload, Encoding.UTF8, "application/json");

    private static DateTimeOffset FutureDate() => DateTimeOffset.UtcNow.AddDays(30);

    private static DateTimeOffset PastDate() => DateTimeOffset.UtcNow.AddDays(-1);

    /// <summary>Create body in the canonical Hungarian wire vocabulary (ADR-059).</summary>
    private static string CreateBody(string hazard, DateTimeOffset reviewDueDate, Guid? locationId = null)
        => $"{{\"hazardDescription\":{JsonSerializer.Serialize(hazard)}," +
           "\"severity\":\"kozepes\",\"likelihood\":\"lehetseges\"," +
           $"\"assessedBy\":\"{AssessedBy}\"," +
           $"\"reviewDueDate\":\"{reviewDueDate:O}\"," +
           $"\"locationId\":{NullableGuid(locationId)}}}";

    private static string UpdateBody(string hazard, DateTimeOffset reviewDueDate, Guid? locationId = null)
        => $"{{\"hazardDescription\":{JsonSerializer.Serialize(hazard)}," +
           "\"severity\":\"kozepes\",\"likelihood\":\"lehetseges\"," +
           $"\"reviewDueDate\":\"{reviewDueDate:O}\"," +
           $"\"locationId\":{NullableGuid(locationId)}}}";

    private static string AddControlBody(
        string controlMeasure,
        string responsiblePerson,
        Guid? capaAssignedTo,
        DateTimeOffset? capaDueDate,
        string? capaDescription = null)
        => $"{{\"controlMeasure\":{JsonSerializer.Serialize(controlMeasure)}," +
           $"\"responsiblePerson\":{JsonSerializer.Serialize(responsiblePerson)}," +
           $"\"capaDescription\":{JsonSerializer.Serialize(capaDescription)}," +
           $"\"capaAssignedTo\":{NullableGuid(capaAssignedTo)}," +
           $"\"capaDueDate\":{(capaDueDate is null ? "null" : $"\"{capaDueDate:O}\"")}}}";

    private static string NullableGuid(Guid? value)
        => value is null ? "null" : $"\"{value}\"";
}
