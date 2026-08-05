using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Hosting;
using Xunit;

namespace SpaceOS.Projects.Tests.Api;

/// <summary>
/// The HTTP contract of the projects API (PROJ-06), measured through the real pipeline:
/// exception handler, idempotency middleware, tenancy, module gate, wire mapping.
/// </summary>
/// <remarks>
/// <para>
/// The redaction test and its negative control are the S1 lesson applied at birth: the 500 path
/// must never carry provider text, AND the business messages must keep arriving — a suite that
/// only checks one direction passes both on an over-redacting and on a leaking implementation.
/// </para>
/// </remarks>
public sealed class ProjectEndpointsTests : IAsyncLifetime
{
    private const string Base = "/api/projects/v1/projects";
    private const string PlantedSecret = "Npgsql connection failed: password=hunter2 host=10.0.0.5";

    private readonly InMemoryProjectStore _store = new();
    private readonly FakeFlowEpicResolver _kernel = new();
    private readonly InMemoryIdempotencyStore _idempotency = new();
    private IHost _host = null!;
    private HttpClient _client = null!;

    public async Task InitializeAsync()
    {
        _host = await ProjectsApiTestHost.StartAsync(_store, _kernel, _idempotency);
        _client = _host.GetTestClient();
    }

    public async Task DisposeAsync()
    {
        _client.Dispose();
        await _host.StopAsync();
        _host.Dispose();
    }

    /// <summary>A request authenticated as the test tenant with the module enabled.</summary>
    private HttpRequestMessage Request(HttpMethod method, string uri, object? body = null)
    {
        var request = new HttpRequestMessage(method, uri);
        request.Headers.Add(TestAuthHandler.TenantHeader, ProjectsApiTestHost.TenantId.ToString());
        request.Headers.Add(TestAuthHandler.ModulesHeader, "spaceos.projects");

        if (body is not null)
        {
            request.Content = JsonContent.Create(body);
        }

        return request;
    }

    private async Task<(Guid Id, int RowVersion)> CreateProjectAsync(string name = "Konyha projekt")
    {
        var request = Request(HttpMethod.Post, Base, new { name });
        request.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString());

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return (body.RootElement.GetProperty("id").GetGuid(),
                body.RootElement.GetProperty("rowVersion").GetInt32());
    }

    // ---- create + idempotency -----------------------------------------------------------------

    [Fact]
    public async Task Create_without_an_idempotency_key_is_refused_with_400()
    {
        var response = await _client.SendAsync(Request(HttpMethod.Post, Base, new { name = "Ajtó" }));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("Idempotency-Key", body);
        Assert.Equal(0, _store.Count);
    }

    [Fact]
    public async Task Create_answers_201_with_the_allocated_code_and_a_weak_etag()
    {
        var request = Request(HttpMethod.Post, Base, new { name = "Konyha" });
        request.Headers.Add("Idempotency-Key", "key-1");

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal("W/\"1\"", response.Headers.ETag?.ToString());
        Assert.StartsWith(Base, response.Headers.Location?.ToString());

        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("PRJ-2026-001", body.RootElement.GetProperty("code").GetString());
        Assert.Equal("draft", body.RootElement.GetProperty("status").GetString());
    }

    [Fact]
    public async Task Create_retried_under_the_same_key_replays_instead_of_creating_twice()
    {
        var first = Request(HttpMethod.Post, Base, new { name = "Konyha" });
        first.Headers.Add("Idempotency-Key", "retry-key");
        var firstResponse = await _client.SendAsync(first);
        var firstBody = await firstResponse.Content.ReadAsStringAsync();

        var second = Request(HttpMethod.Post, Base, new { name = "Konyha" });
        second.Headers.Add("Idempotency-Key", "retry-key");
        var secondResponse = await _client.SendAsync(second);
        var secondBody = await secondResponse.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.Created, secondResponse.StatusCode);
        Assert.Equal("true", secondResponse.Headers.GetValues("Idempotency-Replayed").Single());
        Assert.Equal(firstBody, secondBody);
        Assert.Equal(1, _store.Count);
    }

    [Fact]
    public async Task The_same_key_with_a_different_payload_is_422_not_a_false_replay()
    {
        var first = Request(HttpMethod.Post, Base, new { name = "Konyha" });
        first.Headers.Add("Idempotency-Key", "reused-key");
        await _client.SendAsync(first);

        var second = Request(HttpMethod.Post, Base, new { name = "Fürdő" });
        second.Headers.Add("Idempotency-Key", "reused-key");
        var response = await _client.SendAsync(second);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal(1, _store.Count);
    }

    // ---- conditional requests -----------------------------------------------------------------

    [Fact]
    public async Task A_mutation_without_if_match_is_428_and_nothing_moves()
    {
        var (id, _) = await CreateProjectAsync();

        var response = await _client.SendAsync(
            Request(HttpMethod.Put, $"{Base}/{id}/name", new { name = "Új név" }));

        Assert.Equal(HttpStatusCode.PreconditionRequired, response.StatusCode);

        var get = await _client.SendAsync(Request(HttpMethod.Get, $"{Base}/{id}"));
        using var body = JsonDocument.Parse(await get.Content.ReadAsStringAsync());
        Assert.Equal("Konyha projekt", body.RootElement.GetProperty("name").GetString());
    }

    [Fact]
    public async Task A_stale_if_match_is_412_carrying_both_versions_and_a_correlation_id()
    {
        var (id, _) = await CreateProjectAsync();

        var request = Request(HttpMethod.Put, $"{Base}/{id}/name", new { name = "Új név" });
        request.Headers.TryAddWithoutValidation("If-Match", "W/\"99\"");

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.PreconditionFailed, response.StatusCode);
        Assert.True(response.Headers.Contains("X-Correlation-Id"));

        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Contains("version 1", body.RootElement.GetProperty("detail").GetString());
        Assert.Contains("expected 99", body.RootElement.GetProperty("detail").GetString());
        Assert.False(string.IsNullOrEmpty(body.RootElement.GetProperty("correlationId").GetString()));
    }

    [Fact]
    public async Task A_current_if_match_moves_the_resource_and_hands_back_the_next_tag()
    {
        var (id, version) = await CreateProjectAsync();

        var request = Request(HttpMethod.Put, $"{Base}/{id}/name", new { name = "Új név" });
        request.Headers.TryAddWithoutValidation("If-Match", $"W/\"{version}\"");

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("W/\"2\"", response.Headers.ETag?.ToString());
    }

    // ---- wire shape ---------------------------------------------------------------------------

    [Fact]
    public async Task An_unknown_status_spelling_is_400_naming_the_allowed_ones()
    {
        var (id, version) = await CreateProjectAsync();

        var request = Request(HttpMethod.Put, $"{Base}/{id}/status", new { status = "Aktív" });
        request.Headers.TryAddWithoutValidation("If-Match", $"W/\"{version}\"");

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("on_hold", body);
    }

    [Fact]
    public async Task The_status_round_trips_in_its_wire_spelling()
    {
        var (id, version) = await CreateProjectAsync();

        var request = Request(HttpMethod.Put, $"{Base}/{id}/status", new { status = "on_hold" });
        request.Headers.TryAddWithoutValidation("If-Match", $"W/\"{version}\"");
        var mutation = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, mutation.StatusCode);

        var get = await _client.SendAsync(Request(HttpMethod.Get, $"{Base}/{id}"));
        using var body = JsonDocument.Parse(await get.Content.ReadAsStringAsync());
        Assert.Equal("on_hold", body.RootElement.GetProperty("status").GetString());
    }

    // ---- the module gate ----------------------------------------------------------------------

    [Fact]
    public async Task A_token_without_the_module_entitlement_is_403_on_every_business_route()
    {
        var request = new HttpRequestMessage(HttpMethod.Get, Base);
        request.Headers.Add(TestAuthHandler.TenantHeader, ProjectsApiTestHost.TenantId.ToString());
        // No X-Test-Enabled-Modules header → no enabled_modules claim → the gate must close.

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // ---- the epic membership and the Kernel ---------------------------------------------------

    [Fact]
    public async Task Assigning_an_epic_the_kernel_does_not_know_is_422_and_nothing_moves()
    {
        var (id, version) = await CreateProjectAsync();
        _kernel.NextAnswer = FakeFlowEpicResolver.Answer.Unknown;

        var request = Request(HttpMethod.Post, $"{Base}/{id}/epics", new { epicId = Guid.NewGuid() });
        request.Headers.TryAddWithoutValidation("If-Match", $"W/\"{version}\"");

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);

        var get = await _client.SendAsync(Request(HttpMethod.Get, $"{Base}/{id}"));
        using var body = JsonDocument.Parse(await get.Content.ReadAsStringAsync());
        Assert.Empty(body.RootElement.GetProperty("epics").EnumerateArray());
    }

    [Fact]
    public async Task A_kernel_refusal_is_502_and_an_outage_is_503_never_422()
    {
        var (id, version) = await CreateProjectAsync();

        _kernel.NextAnswer = FakeFlowEpicResolver.Answer.Rejected;
        var rejected = Request(HttpMethod.Post, $"{Base}/{id}/epics", new { epicId = Guid.NewGuid() });
        rejected.Headers.TryAddWithoutValidation("If-Match", $"W/\"{version}\"");
        Assert.Equal(HttpStatusCode.BadGateway, (await _client.SendAsync(rejected)).StatusCode);

        _kernel.NextAnswer = FakeFlowEpicResolver.Answer.Unavailable;
        var down = Request(HttpMethod.Post, $"{Base}/{id}/epics", new { epicId = Guid.NewGuid() });
        down.Headers.TryAddWithoutValidation("If-Match", $"W/\"{version}\"");
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await _client.SendAsync(down)).StatusCode);
    }

    [Fact]
    public async Task A_resolved_epic_attaches_and_shows_up_on_the_resource()
    {
        var (id, version) = await CreateProjectAsync();
        var epicId = Guid.NewGuid();

        var request = Request(HttpMethod.Post, $"{Base}/{id}/epics", new { epicId });
        request.Headers.TryAddWithoutValidation("If-Match", $"W/\"{version}\"");
        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var get = await _client.SendAsync(Request(HttpMethod.Get, $"{Base}/{id}"));
        using var body = JsonDocument.Parse(await get.Content.ReadAsStringAsync());
        var epic = Assert.Single(body.RootElement.GetProperty("epics").EnumerateArray());
        Assert.Equal(epicId, epic.GetProperty("epicId").GetGuid());
    }

    // ---- the error contract (the S1 class, applied at birth) ----------------------------------

    [Fact]
    public async Task An_unknown_failure_is_a_plain_500_that_never_carries_the_provider_text()
    {
        var (id, _) = await CreateProjectAsync();
        _store.ThrowOnNextLoad = new InvalidCastException(PlantedSecret);

        var response = await _client.SendAsync(Request(HttpMethod.Get, $"{Base}/{id}"));

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("hunter2", body);
        Assert.DoesNotContain("Npgsql", body);
        Assert.DoesNotContain("10.0.0.5", body);
    }

    [Fact]
    public async Task Business_refusals_keep_their_messages_the_negative_control()
    {
        // The redaction must not eat what the caller legitimately needs: the domain's own
        // refusal text and the 404 shape both survive.
        var (id, version) = await CreateProjectAsync();

        // Draft → Draft is the domain's "already carries this label" conflict.
        var conflict = Request(HttpMethod.Put, $"{Base}/{id}/status", new { status = "draft" });
        conflict.Headers.TryAddWithoutValidation("If-Match", $"W/\"{version}\"");
        var conflictResponse = await _client.SendAsync(conflict);

        Assert.Equal(HttpStatusCode.Conflict, conflictResponse.StatusCode);
        Assert.Contains("already", await conflictResponse.Content.ReadAsStringAsync());

        var missing = await _client.SendAsync(Request(HttpMethod.Get, $"{Base}/{Guid.NewGuid()}"));
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
    }
}
