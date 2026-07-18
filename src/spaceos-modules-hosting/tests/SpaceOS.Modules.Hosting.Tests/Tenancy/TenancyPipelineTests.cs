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
        Assert.Contains("not in the caller's authorized tenant list", body);
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
    public async Task Multi_tenant_token_may_select_any_member_tenant()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/whoami");
        request.Headers.Add("X-Test-Tenants", $"{TenantA},{TenantB}");
        request.Headers.Add(TenancyDefaults.TenantHeader, TenantB.ToString());

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<WhoAmIResponse>();
        Assert.Equal(TenantB, body!.TenantId);
    }

    [Fact]
    public async Task Multi_tenant_token_may_not_select_a_foreign_tenant()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/whoami");
        request.Headers.Add("X-Test-Tenants", $"{TenantA},{TenantB}");
        request.Headers.Add(TenancyDefaults.TenantHeader, TenantC.ToString());

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
}
