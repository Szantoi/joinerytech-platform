using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using System.Text;
using System.Text.Json;
using SpaceOS.Collaboration.Contracts;
using SpaceOS.Collaboration.Api;
using SpaceOS.Collaboration.Domain;
using SpaceOS.Modules.Hosting.Authorization;
using Xunit;

namespace SpaceOS.Collaboration.Tests;

/// <summary>
/// B2B-10 F3/2 — the HTTP surface, measured through a real pipeline.
/// </summary>
/// <remarks>
/// These are the tests that can see things a handler test cannot: that the route is authorized at
/// all, that the module gate is on it, that a tenant header cannot be forged, and that a denial
/// leaves as RFC 7807 without telling the caller why.
/// </remarks>
public class CollaborationEndpointTests
{
    private static readonly Guid Host = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid Guest = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly Guid Stranger = Guid.Parse("33333333-3333-3333-3333-333333333333");
    private static readonly Guid HostUser = Guid.Parse("44444444-4444-4444-4444-444444444444");
    private static readonly Guid GuestUser = Guid.Parse("55555555-5555-5555-5555-555555555555");
    private static readonly DateTimeOffset Now = new(2026, 7, 30, 9, 0, 0, TimeSpan.Zero);

    private static CollaborationAgreement Agreement(bool withExecuteGrant = true)
    {
        var agreement = CollaborationAgreement.Create(Host, Guest, "Doorstar pilot", Now.AddDays(-10));

        if (withExecuteGrant)
        {
            agreement.AddGrant(CollaborationCapability.WorkPackageExecute, Guid.NewGuid(), Now.AddDays(-9));
        }

        return agreement;
    }

    private static DelegatedWorkPackage OfferedPackage(CollaborationAgreement agreement)
    {
        var package = DelegatedWorkPackage.Create(
            agreement.Id, Host, Guest, "Ajtólap gyártás", "50 db", Now.AddDays(20), Now.AddDays(-2));
        package.Offer(Host, HostUser, Now.AddDays(-1));
        return package;
    }

    // ---------------------------------------------------------------------------------------
    // The gates on the route itself
    // ---------------------------------------------------------------------------------------

    [Fact]
    public async Task An_unauthenticated_request_is_refused()
    {
        await using var host = await CollaborationEndpointTestHost.StartAsync(Agreement());

        var response = await host.Client.PostAsync(
            $"/api/collaboration/v1/agreements/{Guid.NewGuid()}/propose", content: null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Every_business_route_carries_the_module_policy()
    {
        // A behavioural test cannot separate the two gates: RequireEnabledModule already implies
        // authentication, so removing RequireAuthorization() changes no response. What it CAN
        // change is a future route mapped outside the group — and that is what this looks at.
        // Enumerating the endpoints is the only way to see a missing gate rather than infer it.
        await using var host = await CollaborationEndpointTestHost.StartAsync(Agreement());

        var endpoints = host.Endpoints
            .Where(endpoint => endpoint is RouteEndpoint route
                && route.RoutePattern.RawText?.StartsWith("/api/collaboration", StringComparison.Ordinal) == true)
            .ToList();

        Assert.NotEmpty(endpoints);

        var expectedPolicy = ModuleEntitlementAuthorizationExtensions.PolicyName(
            CollaborationApiExtensions.ModuleId);

        foreach (var endpoint in endpoints)
        {
            var policies = endpoint.Metadata
                .GetOrderedMetadata<IAuthorizeData>()
                .Select(data => data.Policy)
                .ToList();

            Assert.True(
                policies.Contains(expectedPolicy),
                $"{endpoint.DisplayName} is mapped without the '{expectedPolicy}' gate.");
        }
    }

    [Fact]
    public async Task A_tenant_without_the_module_enabled_is_refused_even_as_a_party()
    {
        // The ERPSEP-06 gate: being host of the agreement is not enough if the tenant's token does
        // not list the module. A gate that only holds for outsiders is not a gate.
        var agreement = Agreement();
        await using var host = await CollaborationEndpointTestHost.StartAsync(agreement);
        host.As(Host, HostUser, modules: "spaceos.maintenance");

        var response = await host.Client.PostAsync(
            $"/api/collaboration/v1/agreements/{agreement.Id}/propose", content: null);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task A_tenant_header_naming_someone_else_is_refused()
    {
        // ADR-061 T1 through the real middleware: the header may only SELECT among the tenants the
        // token itself carries, so it cannot be used to become another tenant.
        var agreement = Agreement();
        await using var host = await CollaborationEndpointTestHost.StartAsync(agreement);
        host.As(Guest, GuestUser);
        host.Client.DefaultRequestHeaders.Add("X-Tenant-Id", Host.ToString());

        var response = await host.Client.PostAsync(
            $"/api/collaboration/v1/agreements/{agreement.Id}/propose", content: null);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // ---------------------------------------------------------------------------------------
    // The happy paths
    // ---------------------------------------------------------------------------------------

    [Fact]
    public async Task The_host_can_propose_its_own_agreement()
    {
        var agreement = Agreement();
        await using var host = await CollaborationEndpointTestHost.StartAsync(agreement);
        host.As(Host, HostUser);

        var response = await host.Client.PostAsync(
            $"/api/collaboration/v1/agreements/{agreement.Id}/propose", content: null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<AgreementStatusResponse>();
        Assert.Equal(nameof(AgreementStatus.Proposed), body!.Status);
        Assert.Equal(AgreementStatus.Proposed, agreement.Status);
    }

    [Fact]
    public async Task A_guest_holding_the_grant_can_move_the_work_package()
    {
        var agreement = Agreement();
        var package = OfferedPackage(agreement);
        await using var host = await CollaborationEndpointTestHost.StartAsync(agreement, package);
        host.As(Guest, GuestUser);

        var response = await host.Client.PostAsync(
            $"/api/collaboration/v1/work-packages/{package.Id}/accept", content: null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(WorkPackageStatus.Accepted, package.Status);
    }

    [Fact]
    public async Task The_recorded_actor_is_the_token_holder_even_when_the_body_says_otherwise()
    {
        // The structural half of the anti-spoofing measure: the request records have no actor
        // field, so an extra one in the JSON is simply not bound. The audit trail must still name
        // the token's user, not the payload's.
        var agreement = Agreement();
        var package = OfferedPackage(agreement);
        await using var host = await CollaborationEndpointTestHost.StartAsync(agreement, package);
        host.As(Guest, GuestUser);

        var smuggled = new StringContent(
            $$"""{"reason":"nem fér bele","actorTenantId":"{{Host}}","actorUserId":"{{HostUser}}"}""",
            Encoding.UTF8,
            "application/json");

        var response = await host.Client.PostAsync(
            $"/api/collaboration/v1/work-packages/{package.Id}/reject", smuggled);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var recorded = package.History[^1];
        Assert.Equal(Guest, recorded.ActorTenantId);
        Assert.Equal(GuestUser, recorded.ActorUserId);
    }

    // ---------------------------------------------------------------------------------------
    // 404 / 403 / 409 on the wire, and what the body may say
    // ---------------------------------------------------------------------------------------

    [Fact]
    public async Task A_guest_without_a_grant_gets_403_and_is_told_nothing_about_why()
    {
        var agreement = Agreement(withExecuteGrant: false);
        var package = OfferedPackage(agreement);
        await using var host = await CollaborationEndpointTestHost.StartAsync(agreement, package);
        host.As(Guest, GuestUser);

        var response = await host.Client.PostAsync(
            $"/api/collaboration/v1/work-packages/{package.Id}/accept", content: null);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);

        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("grant", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("revoked", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("expired", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(CollaborationCapability.WorkPackageExecute, body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task An_outside_tenant_gets_404_rather_than_403()
    {
        var agreement = Agreement();
        var package = OfferedPackage(agreement);
        await using var host = await CollaborationEndpointTestHost.StartAsync(agreement, package);
        host.As(Stranger, HostUser);

        var response = await host.Client.PostAsync(
            $"/api/collaboration/v1/work-packages/{package.Id}/accept", content: null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task A_transition_the_aggregate_refuses_is_a_409()
    {
        // The guest holds the grant and is a party; it is the FSM that says no (a Draft package
        // cannot be accepted). A 403 here would send the host looking for a permission problem.
        var agreement = Agreement();
        var draft = DelegatedWorkPackage.Create(
            agreement.Id, Host, Guest, "Ajtólap gyártás", "50 db", Now.AddDays(20), Now.AddDays(-2));

        await using var host = await CollaborationEndpointTestHost.StartAsync(agreement, draft);
        host.As(Guest, GuestUser);

        var response = await host.Client.PostAsync(
            $"/api/collaboration/v1/work-packages/{draft.Id}/accept", content: null);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Every_refusal_carries_a_correlation_id_in_both_the_header_and_the_body()
    {
        // The Doorstar security contract asks for it, and it is what makes a deliberately silent
        // 403 supportable: the reason is in our log under this id.
        var agreement = Agreement(withExecuteGrant: false);
        var package = OfferedPackage(agreement);
        await using var host = await CollaborationEndpointTestHost.StartAsync(agreement, package);
        host.As(Guest, GuestUser);

        var response = await host.Client.PostAsync(
            $"/api/collaboration/v1/work-packages/{package.Id}/accept", content: null);

        Assert.True(response.Headers.TryGetValues("X-Correlation-Id", out var header));
        var correlationId = header!.Single();

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(correlationId, document.RootElement.GetProperty("correlationId").GetString());
    }

    // ---------------------------------------------------------------------------------------
    // Reading is its own permission
    // ---------------------------------------------------------------------------------------

    [Fact]
    public async Task Reading_a_work_package_needs_the_read_grant_not_the_execute_one()
    {
        var agreement = Agreement();       // execute only
        var package = OfferedPackage(agreement);
        await using var host = await CollaborationEndpointTestHost.StartAsync(agreement, package);
        host.As(Guest, GuestUser);

        var response = await host.Client.GetAsync($"/api/collaboration/v1/work-packages/{package.Id}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task With_the_read_grant_the_guest_sees_the_package()
    {
        var agreement = Agreement();
        agreement.AddGrant(CollaborationCapability.WorkPackageRead, Guid.NewGuid(), Now.AddDays(-9));
        var package = OfferedPackage(agreement);

        await using var host = await CollaborationEndpointTestHost.StartAsync(agreement, package);
        host.As(Guest, GuestUser);

        var response = await host.Client.GetAsync($"/api/collaboration/v1/work-packages/{package.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(package.Id, document.RootElement.GetProperty("workPackageId").GetGuid());
    }

    [Fact]
    public async Task The_host_reads_its_own_work_package_without_holding_any_grant()
    {
        var agreement = Agreement(withExecuteGrant: false);
        var package = OfferedPackage(agreement);
        await using var host = await CollaborationEndpointTestHost.StartAsync(agreement, package);
        host.As(Host, HostUser);

        var response = await host.Client.GetAsync($"/api/collaboration/v1/work-packages/{package.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
