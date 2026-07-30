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


    /// <summary>
    /// A conditional POST, because since F3/3 a work-package transition without <c>If-Match</c> is
    /// refused. The version is what the caller would have read from the ETag.
    /// </summary>
    private static Task<HttpResponseMessage> PostAsync(
        CollaborationEndpointTestHost host, string url, int? ifMatch, HttpContent? content = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = content };

        if (ifMatch is { } version)
        {
            request.Headers.TryAddWithoutValidation("If-Match", ConditionalRequests.Format(version));
        }

        return host.Client.SendAsync(request);
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

        var response = await PostAsync(
            host, $"/api/collaboration/v1/work-packages/{package.Id}/accept", package.RowVersion);

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

        var response = await PostAsync(
            host, $"/api/collaboration/v1/work-packages/{package.Id}/reject", package.RowVersion, smuggled);

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

        var response = await PostAsync(
            host, $"/api/collaboration/v1/work-packages/{package.Id}/accept", package.RowVersion);

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

        var response = await PostAsync(
            host, $"/api/collaboration/v1/work-packages/{package.Id}/accept", package.RowVersion);

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

        var response = await PostAsync(
            host, $"/api/collaboration/v1/work-packages/{draft.Id}/accept", draft.RowVersion);

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

        var response = await PostAsync(
            host, $"/api/collaboration/v1/work-packages/{package.Id}/accept", package.RowVersion);

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

    // ---------------------------------------------------------------------------------------
    // F3/3 — conditional requests
    // ---------------------------------------------------------------------------------------

    [Fact]
    public async Task Reading_a_package_hands_back_the_tag_to_write_with()
    {
        var agreement = Agreement();
        agreement.AddGrant(CollaborationCapability.WorkPackageRead, Guid.NewGuid(), Now.AddDays(-9));
        var package = OfferedPackage(agreement);

        await using var host = await CollaborationEndpointTestHost.StartAsync(agreement, package);
        host.As(Guest, GuestUser);

        var response = await host.Client.GetAsync($"/api/collaboration/v1/work-packages/{package.Id}");

        Assert.Equal(ConditionalRequests.Format(package.RowVersion), response.Headers.ETag?.ToString());
    }

    [Fact]
    public async Task A_transition_without_If_Match_is_refused_with_428()
    {
        // Everything else about this request is valid — the guest is a party, holds the grant, and
        // the package is in the right state. Only the precondition is missing.
        var agreement = Agreement();
        var package = OfferedPackage(agreement);
        await using var host = await CollaborationEndpointTestHost.StartAsync(agreement, package);
        host.As(Guest, GuestUser);

        var response = await PostAsync(host, $"/api/collaboration/v1/work-packages/{package.Id}/accept", ifMatch: null);

        Assert.Equal(HttpStatusCode.PreconditionRequired, response.StatusCode);
        Assert.Equal(WorkPackageStatus.Offered, package.Status);
    }

    [Fact]
    public async Task A_stale_If_Match_is_refused_with_412_and_changes_nothing()
    {
        var agreement = Agreement();
        var package = OfferedPackage(agreement);
        await using var host = await CollaborationEndpointTestHost.StartAsync(agreement, package);
        host.As(Guest, GuestUser);

        var stale = package.RowVersion - 1;
        var response = await PostAsync(host, $"/api/collaboration/v1/work-packages/{package.Id}/accept", stale);

        Assert.Equal(HttpStatusCode.PreconditionFailed, response.StatusCode);
        Assert.Equal(WorkPackageStatus.Offered, package.Status);

        // The current version IS disclosed here — the caller is a party, and withholding it would
        // only make it guess.
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains(package.RowVersion.ToString(), body, StringComparison.Ordinal);
    }

    [Fact]
    public async Task A_successful_transition_returns_the_next_tag()
    {
        var agreement = Agreement();
        var package = OfferedPackage(agreement);
        var before = package.RowVersion;

        await using var host = await CollaborationEndpointTestHost.StartAsync(agreement, package);
        host.As(Guest, GuestUser);

        var response = await PostAsync(host, $"/api/collaboration/v1/work-packages/{package.Id}/accept", before);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(ConditionalRequests.Format(before + 1), response.Headers.ETag?.ToString());
        Assert.Equal(before + 1, package.RowVersion);
    }

    [Fact]
    public async Task A_tag_this_API_never_issued_is_a_400_not_a_412()
    {
        // A 412 would tell the client to re-read and retry — with a tag it will mangle the same way
        // next time. This is a client bug and has to say so.
        var agreement = Agreement();
        var package = OfferedPackage(agreement);
        await using var host = await CollaborationEndpointTestHost.StartAsync(agreement, package);
        host.As(Guest, GuestUser);

        var request = new HttpRequestMessage(
            HttpMethod.Post, $"/api/collaboration/v1/work-packages/{package.Id}/accept");
        request.Headers.TryAddWithoutValidation("If-Match", "\"abc123\"");

        var response = await host.Client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task If_Match_star_means_whatever_version_it_is_now()
    {
        var agreement = Agreement();
        var package = OfferedPackage(agreement);
        await using var host = await CollaborationEndpointTestHost.StartAsync(agreement, package);
        host.As(Guest, GuestUser);

        var request = new HttpRequestMessage(
            HttpMethod.Post, $"/api/collaboration/v1/work-packages/{package.Id}/accept");
        request.Headers.TryAddWithoutValidation("If-Match", "*");

        var response = await host.Client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task The_precondition_never_becomes_a_version_oracle()
    {
        // A stranger sending a deliberately wrong version must not be able to tell "wrong version"
        // (the resource exists and moves) apart from "nothing here". Authorization runs first, so
        // both answer 404.
        var agreement = Agreement();
        var package = OfferedPackage(agreement);
        await using var host = await CollaborationEndpointTestHost.StartAsync(agreement, package);
        host.As(Stranger, HostUser);

        var response = await PostAsync(
            host, $"/api/collaboration/v1/work-packages/{package.Id}/accept", package.RowVersion + 99);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task A_party_without_a_grant_gets_403_before_the_version_is_even_compared()
    {
        var agreement = Agreement(withExecuteGrant: false);
        var package = OfferedPackage(agreement);
        await using var host = await CollaborationEndpointTestHost.StartAsync(agreement, package);
        host.As(Guest, GuestUser);

        var response = await PostAsync(
            host, $"/api/collaboration/v1/work-packages/{package.Id}/accept", package.RowVersion + 99);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task An_agreement_transition_carries_a_tag_and_honours_a_stale_one()
    {
        // The agreement routes accept If-Match but do not demand it: they have no read endpoint yet
        // (F3/4), so requiring a tag nobody can obtain would make them unusable. What is present is
        // enforced, and the response always hands back the next one.
        var agreement = Agreement();
        await using var host = await CollaborationEndpointTestHost.StartAsync(agreement);
        host.As(Host, HostUser);

        var blind = await PostAsync(host, $"/api/collaboration/v1/agreements/{agreement.Id}/propose", ifMatch: null);
        Assert.Equal(HttpStatusCode.OK, blind.StatusCode);
        Assert.Equal(ConditionalRequests.Format(agreement.RowVersion), blind.Headers.ETag?.ToString());

        var stale = await PostAsync(
            host, $"/api/collaboration/v1/agreements/{agreement.Id}/cancel",
            agreement.RowVersion - 1,
            new StringContent("{\"reason\":\"meggondoltuk\"}", Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.PreconditionFailed, stale.StatusCode);
        Assert.Equal(AgreementStatus.Proposed, agreement.Status);
    }
}
