using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Hosting;
using SpaceOS.Modules.Hosting.Tenancy;
using Xunit;

namespace SpaceOS.Modules.Hosting.Tests.Tenancy;

/// <summary>
/// End-to-end contract tests of the shared tenancy pipeline on a Docker-free TestServer:
/// tenant from the JWT, header only as allowlist selection, forgery → 403 (ADR-061 T1).
/// </summary>
public sealed class TenancyPipelineTests : IAsyncLifetime
{
    private static readonly Guid TenantA = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid TenantB = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly Guid TenantC = Guid.Parse("33333333-3333-3333-3333-333333333333");

    private IHost _host = null!;
    private HttpClient _client = null!;

    public async Task InitializeAsync()
    {
        _host = await TenancyTestHost.StartAsync(TenancyTestHost.UseTestAuth);
        _client = _host.GetTestClient();
    }

    public async Task DisposeAsync()
    {
        _client.Dispose();
        await _host.StopAsync();
        _host.Dispose();
    }

    private sealed record WhoAmIResponse(bool HasTenant, Guid? TenantId);

    [Fact]
    public async Task Unauthenticated_request_is_401()
    {
        var response = await _client.GetAsync("/whoami");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Tenant_comes_from_the_token_claim()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/whoami");
        request.Headers.Add("X-Test-Tid", TenantA.ToString());

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<WhoAmIResponse>();
        Assert.NotNull(body);
        Assert.True(body!.HasTenant);
        Assert.Equal(TenantA, body.TenantId);
    }

    [Fact]
    public async Task Header_matching_the_token_tenant_is_accepted()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/whoami");
        request.Headers.Add("X-Test-Tid", TenantA.ToString());
        request.Headers.Add(TenancyDefaults.TenantHeader, TenantA.ToString());

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<WhoAmIResponse>();
        Assert.Equal(TenantA, body!.TenantId);
    }

    [Fact]
    public async Task Forged_tenant_header_is_rejected_with_403_problem_details()
    {
        // The pre-ADR modules would have served Tenant B's data here. Never again.
        using var request = new HttpRequestMessage(HttpMethod.Get, "/whoami");
        request.Headers.Add("X-Test-Tid", TenantA.ToString());
        request.Headers.Add(TenancyDefaults.TenantHeader, TenantB.ToString());

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("does not match the caller's signed selected tenant", body);
        Assert.Contains("correlationId", body);
    }

    [Fact]
    public async Task Kernel_style_active_tenant_header_is_validated_the_same_way()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/whoami");
        request.Headers.Add("X-Test-Tid", TenantA.ToString());
        request.Headers.Add(TenancyDefaults.ActiveTenantHeader, TenantB.ToString());

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Multi_entry_token_cannot_implicitly_select_first_or_header_selected_tenant()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/whoami");
        request.Headers.Add("X-Test-Tenants", $"{TenantA},{TenantB}");
        request.Headers.Add(TenancyDefaults.TenantHeader, TenantB.ToString());

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("tenant authority is invalid", body);
    }

    [Fact]
    public async Task Multi_entry_token_is_denied_even_without_a_selection_header()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/whoami");
        request.Headers.Add("X-Test-Tenants", $"{TenantA},{TenantB}");
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Authenticated_token_without_tenant_identity_is_403()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/whoami");
        request.Headers.Add("X-Test-Authenticated", "1");

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("no tenant identity", body);
    }

    [Fact]
    public async Task Anonymous_endpoint_passes_through_without_tenant()
    {
        var response = await _client.GetAsync("/anonymous");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("\"hasTenant\":false", body);
    }

    [Fact]
    public async Task Enabled_module_policy_allows_only_the_canonical_claimed_module()
    {
        using var allowed = new HttpRequestMessage(HttpMethod.Get, "/maintenance/protected");
        allowed.Headers.Add("X-Test-Tid", TenantA.ToString());
        allowed.Headers.Add("X-Test-Enabled-Modules", "spaceos.maintenance");

        var allowedResponse = await _client.SendAsync(allowed);

        Assert.Equal(HttpStatusCode.OK, allowedResponse.StatusCode);

        using var denied = new HttpRequestMessage(HttpMethod.Get, "/maintenance/protected");
        denied.Headers.Add("X-Test-Tid", TenantA.ToString());
        denied.Headers.Add("X-Test-Enabled-Modules", "maintenance");

        var deniedResponse = await _client.SendAsync(denied);

        Assert.Equal(HttpStatusCode.Forbidden, deniedResponse.StatusCode);
    }

    [Fact]
    public async Task View_permission_cannot_call_a_write_endpoint()
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/maintenance/protected");
        request.Headers.Add("X-Test-Tid", TenantA.ToString());
        request.Headers.Add("X-Test-Enabled-Modules", "spaceos.maintenance");

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Theory]
    [InlineData("spaceos.maintenance.edit")]
    [InlineData("spaceos.maintenance.admin")]
    public async Task Edit_or_admin_permission_can_call_a_write_endpoint(string permission)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/maintenance/protected");
        request.Headers.Add("X-Test-Tid", TenantA.ToString());
        request.Headers.Add("X-Test-Enabled-Modules", "spaceos.maintenance");
        request.Headers.Add("X-Test-Permissions", permission);

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Theory]
    [InlineData("GET")]
    [InlineData("HEAD")]
    [InlineData("OPTIONS")]
    public async Task View_permission_allows_only_safe_method_matrix_entries(string method)
    {
        using var request = ModuleRequest(method, "spaceos.maintenance.view");

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Theory]
    [InlineData("POST")]
    [InlineData("PUT")]
    [InlineData("PATCH")]
    [InlineData("DELETE")]
    [InlineData("TRACE")]
    [InlineData("CUSTOM")]
    public async Task View_permission_denies_every_non_safe_method_matrix_entry(string method)
    {
        using var request = ModuleRequest(method, "spaceos.maintenance.view");

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Theory]
    [InlineData("spaceos.maintenance.edit", "PUT")]
    [InlineData("spaceos.maintenance.admin", "DELETE")]
    [InlineData("spaceos.maintenance.admin", "CUSTOM")]
    public async Task Edit_or_admin_permission_survives_nested_group_conventions(
        string permission,
        string method)
    {
        using var request = ModuleRequest(method, permission);

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task A_different_modules_edit_permission_cannot_cross_the_module_gate()
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/maintenance/protected");
        request.Headers.Add("X-Test-Tid", TenantA.ToString());
        request.Headers.Add("X-Test-Enabled-Modules", "spaceos.qa");
        request.Headers.Add("X-Test-Permissions", "spaceos.qa.edit");

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Enabled_module_policy_denies_missing_or_empty_module_claim()
    {
        using var missing = new HttpRequestMessage(HttpMethod.Get, "/maintenance/protected");
        missing.Headers.Add("X-Test-Tid", TenantA.ToString());

        var missingResponse = await _client.SendAsync(missing);

        Assert.Equal(HttpStatusCode.Forbidden, missingResponse.StatusCode);

        using var empty = new HttpRequestMessage(HttpMethod.Get, "/maintenance/protected");
        empty.Headers.Add("X-Test-Tid", TenantA.ToString());
        empty.Headers.Add("X-Test-Enabled-Modules", string.Empty);

        var emptyResponse = await _client.SendAsync(empty);

        Assert.Equal(HttpStatusCode.Forbidden, emptyResponse.StatusCode);
    }

    [Fact]
    public async Task Enabled_module_policy_challenges_an_unauthenticated_request()
    {
        var response = await _client.GetAsync("/maintenance/protected");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Forged_tenant_header_cannot_bypass_an_otherwise_valid_module_claim()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/maintenance/protected");
        request.Headers.Add("X-Test-Tid", TenantA.ToString());
        request.Headers.Add("X-Test-Enabled-Modules", "spaceos.maintenance");
        request.Headers.Add(TenancyDefaults.TenantHeader, TenantB.ToString());

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    private static HttpRequestMessage ModuleRequest(string method, string permission)
    {
        var request = new HttpRequestMessage(new HttpMethod(method), "/maintenance/nested/method-probe");
        request.Headers.Add("X-Test-Tid", TenantA.ToString());
        request.Headers.Add("X-Test-Enabled-Modules", "spaceos.maintenance");
        request.Headers.Add("X-Test-Permissions", permission);
        return request;
    }
}
