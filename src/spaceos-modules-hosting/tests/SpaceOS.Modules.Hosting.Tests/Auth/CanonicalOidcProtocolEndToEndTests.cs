using System.Net;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using SpaceOS.Modules.Hosting.Auth;
using SpaceOS.Modules.Hosting.Tests.Auth.Protocol;
using Xunit;

namespace SpaceOS.Modules.Hosting.Tests.Auth;

/// <summary>
/// Network-free protocol proof using real discovery/JWKS HTTP, authorization-code + S256 PKCE,
/// the production JwtBearer composition and the production Kernel HTTP authority provider.
/// </summary>
public sealed class CanonicalOidcProtocolEndToEndTests
{
    private static readonly Guid TenantA = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid TenantB = Guid.Parse("22222222-2222-2222-2222-222222222222");

    [Fact]
    public async Task Real_configuration_manager_resolves_two_tenants_through_full_code_flow()
    {
        await using var harness = await CanonicalOidcProtocolHarness.StartAsync();
        var grantA = ProtocolOidcGrant.Create(TenantA);
        var grantB = ProtocolOidcGrant.Create(TenantB);
        harness.Kernel.Set(CanonicalOidcProtocolHarness.ActiveState(grantA));
        harness.Kernel.Set(CanonicalOidcProtocolHarness.ActiveState(grantB));

        var tokenA = await harness.Browser.LoginAsync(grantA);
        var tokenB = await harness.Browser.LoginAsync(grantB);
        using var responseA = await harness.SendAsync(tokenA);
        using var responseB = await harness.SendAsync(tokenB);
        var bodyA = await responseA.Content.ReadAsStringAsync();
        var bodyB = await responseB.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, responseA.StatusCode);
        Assert.Equal(HttpStatusCode.OK, responseB.StatusCode);
        Assert.Contains(TenantA.ToString("D"), bodyA, StringComparison.Ordinal);
        Assert.DoesNotContain(TenantB.ToString("D"), bodyA, StringComparison.Ordinal);
        Assert.Contains(TenantB.ToString("D"), bodyB, StringComparison.Ordinal);
        Assert.DoesNotContain(TenantA.ToString("D"), bodyB, StringComparison.Ordinal);
        var strictManager = Assert.IsType<StrictOidcConfigurationManager>(
            harness.JwtOptions.ConfigurationManager);
        Assert.True(strictManager.UsesRealIdentityModelConfigurationManager);
        Assert.True(strictManager.InnerLastKnownGoodDisabled);
        Assert.True(strictManager.HasExactSourceOwnedRuntimeContract());
        Assert.False(strictManager.UseLastKnownGoodConfiguration);
        Assert.False(harness.JwtOptions.TokenValidationParameters.ValidateWithLKG);
        Assert.True(harness.JwtOptions.RefreshOnIssuerKeyNotFound);
        Assert.Null(harness.JwtOptions.TokenValidationParameters.IssuerSigningKeyResolver);
        Assert.Equal(
            [
                new ProtocolKernelRequest(FakeOidcAuthority.Subject, TenantA),
                new ProtocolKernelRequest(FakeOidcAuthority.Subject, TenantB),
            ],
            harness.Kernel.Requests);
    }

    [Fact]
    public async Task Wrong_verifier_burns_the_one_shot_authorization_code()
    {
        await using var harness = await CanonicalOidcProtocolHarness.StartAsync();
        var authorization = await harness.Browser.BeginAsync(ProtocolOidcGrant.Create(TenantA));
        Assert.True(authorization.HasExactState);

        var replacement = authorization.Verifier[^1] == 'x' ? 'y' : 'x';
        var wrong = await harness.Browser.RedeemRawAsync(
            authorization,
            verifier: authorization.Verifier[..^1] + replacement);
        var retryWithCorrectVerifier = await harness.Browser.RedeemRawAsync(authorization);

        Assert.Equal(HttpStatusCode.BadRequest, wrong.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, retryWithCorrectVerifier.StatusCode);
        Assert.Equal(2, harness.Oidc.TokenRequestCount);
    }

    [Fact]
    public async Task Successfully_redeemed_authorization_code_cannot_be_replayed()
    {
        await using var harness = await CanonicalOidcProtocolHarness.StartAsync();
        var authorization = await harness.Browser.BeginAsync(ProtocolOidcGrant.Create(TenantA));

        var first = await harness.Browser.RedeemRawAsync(authorization);
        var replay = await harness.Browser.RedeemRawAsync(authorization);

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.NotNull(first.AccessToken);
        Assert.Equal(HttpStatusCode.BadRequest, replay.StatusCode);
    }

    [Theory]
    [InlineData("authorize-client")]
    [InlineData("authorize-redirect")]
    [InlineData("token-client")]
    [InlineData("token-redirect")]
    public async Task Client_and_redirect_are_exactly_bound_at_both_endpoints(string mutation)
    {
        await using var harness = await CanonicalOidcProtocolHarness.StartAsync();
        var grant = ProtocolOidcGrant.Create(TenantA);

        if (mutation.StartsWith("authorize", StringComparison.Ordinal))
        {
            var authorization = await harness.Browser.BeginAsync(
                grant,
                clientId: mutation == "authorize-client" ? "other-browser" : FakeOidcAuthority.ClientId,
                redirectUri: mutation == "authorize-redirect"
                    ? "https://evil.protocol.test/callback"
                    : FakeOidcAuthority.RedirectUri);
            Assert.Equal(HttpStatusCode.BadRequest, authorization.StatusCode);
            Assert.Null(authorization.Code);
            Assert.Equal(0, harness.Oidc.TokenRequestCount);
            return;
        }

        var validAuthorization = await harness.Browser.BeginAsync(grant);
        var token = await harness.Browser.RedeemRawAsync(
            validAuthorization,
            clientId: mutation == "token-client" ? "other-browser" : null,
            redirectUri: mutation == "token-redirect" ? "https://evil.protocol.test/callback" : null);
        Assert.Equal(HttpStatusCode.BadRequest, token.StatusCode);
    }

    [Fact]
    public async Task Browser_rejects_wrong_state_before_calling_token_endpoint()
    {
        await using var harness = await CanonicalOidcProtocolHarness.StartAsync();
        harness.Oidc.ReturnWrongState = true;

        await Assert.ThrowsAsync<ProtocolBrowserException>(() =>
            harness.Browser.LoginAsync(ProtocolOidcGrant.Create(TenantA)));

        Assert.Equal(0, harness.Oidc.TokenRequestCount);
        Assert.Equal(0, harness.Kernel.RequestCount);
    }

    [Fact]
    public async Task Browser_rejects_signed_id_token_with_wrong_nonce()
    {
        await using var harness = await CanonicalOidcProtocolHarness.StartAsync();
        harness.Oidc.NonceFault = ProtocolNonceFault.Wrong;

        await Assert.ThrowsAsync<ProtocolBrowserException>(() =>
            harness.Browser.LoginAsync(ProtocolOidcGrant.Create(TenantA)));

        Assert.Equal(1, harness.Oidc.TokenRequestCount);
        Assert.Equal(0, harness.Kernel.RequestCount);
    }

    [Fact]
    public async Task Expected_audience_once_in_bounded_set_is_allowed_but_wrong_aud_or_azp_is_denied()
    {
        await using var harness = await CanonicalOidcProtocolHarness.StartAsync();
        var valid = ProtocolOidcGrant.Create(
            TenantA,
            audiences: [FakeOidcAuthority.Audience, "other-api"]);
        harness.Kernel.Set(CanonicalOidcProtocolHarness.ActiveState(valid));
        var validToken = await harness.Browser.LoginAsync(valid);
        Assert.Equal(HttpStatusCode.OK, await SendStatusAsync(harness, validToken));

        var wrongAudience = valid with { Audiences = ["other-api"] };
        var wrongAudienceToken = await harness.Browser.LoginAsync(wrongAudience);
        Assert.Equal(HttpStatusCode.Unauthorized, await SendStatusAsync(harness, wrongAudienceToken));

        var wrongAuthorizedParty = valid with { AuthorizedParty = "other-browser" };
        var wrongAuthorizedPartyToken = await harness.Browser.LoginAsync(wrongAuthorizedParty);
        Assert.Equal(HttpStatusCode.Unauthorized, await SendStatusAsync(harness, wrongAuthorizedPartyToken));
        Assert.Equal(1, harness.Kernel.RequestCount);
    }

    [Theory]
    [InlineData("role")]
    [InlineData("roles")]
    [InlineData("claim-types-role")]
    [InlineData("realm_access")]
    public async Task Legacy_role_authority_is_denied_before_Kernel(string authorityKind)
    {
        await using var harness = await CanonicalOidcProtocolHarness.StartAsync();
        var grant = ProtocolOidcGrant.Create(TenantA);
        harness.Kernel.Set(CanonicalOidcProtocolHarness.ActiveState(grant));
        const string dmsAclRole = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
        var claimName = authorityKind == "claim-types-role" ? ClaimTypes.Role : authorityKind;
        object claimValue = authorityKind switch
        {
            "roles" => new[] { dmsAclRole },
            "realm_access" => new Dictionary<string, object>
            {
                ["roles"] = new[] { dmsAclRole },
            },
            _ => dmsAclRole,
        };
        var token = harness.Oidc.CreateAccessTokenWithAdditionalClaimsForTests(
            grant,
            new Dictionary<string, object> { [claimName] = claimValue });

        using var response = await harness.SendAsync(token);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal(0, harness.Kernel.RequestCount);
    }

    [Theory]
    [InlineData(2, 1)]
    [InlineData(1, 2)]
    public async Task Stale_membership_or_projection_version_is_denied(
        long currentMembership,
        long currentProjection)
    {
        await using var harness = await CanonicalOidcProtocolHarness.StartAsync();
        var grant = ProtocolOidcGrant.Create(TenantA);
        harness.Kernel.Set(CanonicalOidcProtocolHarness.ActiveState(
            grant,
            membershipVersion: currentMembership,
            projectionVersion: currentProjection));
        var token = await harness.Browser.LoginAsync(grant);

        Assert.Equal(HttpStatusCode.Unauthorized, await SendStatusAsync(harness, token));
        Assert.Equal([new ProtocolKernelRequest(grant.Subject, grant.TenantId)], harness.Kernel.Requests);
    }

    [Fact]
    public async Task Same_version_but_changed_projection_content_is_denied()
    {
        await using var harness = await CanonicalOidcProtocolHarness.StartAsync();
        var grant = ProtocolOidcGrant.Create(TenantA);
        harness.Kernel.Set(CanonicalOidcProtocolHarness.ActiveState(
            grant,
            permissions: ["spaceos.qa.view"],
            enabledModules: ["spaceos.qa"]));
        var token = await harness.Browser.LoginAsync(grant);

        Assert.Equal(HttpStatusCode.Unauthorized, await SendStatusAsync(harness, token));
    }

    [Fact]
    public async Task Version_and_content_change_rejects_old_token_then_accepts_fresh_token()
    {
        await using var harness = await CanonicalOidcProtocolHarness.StartAsync();
        var oldGrant = ProtocolOidcGrant.Create(TenantA);
        harness.Kernel.Set(CanonicalOidcProtocolHarness.ActiveState(oldGrant));
        var oldToken = await harness.Browser.LoginAsync(oldGrant);
        Assert.Equal(HttpStatusCode.OK, await SendStatusAsync(harness, oldToken));

        var freshGrant = ProtocolOidcGrant.Create(
            TenantA,
            projectionVersion: 2,
            module: "spaceos.qa",
            issuedAt: DateTimeOffset.UtcNow.AddSeconds(-1));
        harness.Kernel.Set(CanonicalOidcProtocolHarness.ActiveState(freshGrant));
        Assert.Equal(HttpStatusCode.Unauthorized, await SendStatusAsync(harness, oldToken));

        var freshToken = await harness.Browser.LoginAsync(freshGrant);
        Assert.Equal(HttpStatusCode.OK, await SendStatusAsync(harness, freshToken));
    }

    [Fact]
    public async Task Revocation_cutoff_rejects_old_token_and_accepts_new_issue()
    {
        await using var harness = await CanonicalOidcProtocolHarness.StartAsync();
        var oldGrant = ProtocolOidcGrant.Create(
            TenantA,
            issuedAt: DateTimeOffset.UtcNow.AddMinutes(-10));
        var cutoff = DateTimeOffset.UtcNow.AddMinutes(-2);
        harness.Kernel.Set(CanonicalOidcProtocolHarness.ActiveState(
            oldGrant,
            acceptTokensIssuedAtOrAfter: cutoff));
        var oldToken = await harness.Browser.LoginAsync(oldGrant);
        Assert.Equal(HttpStatusCode.Unauthorized, await SendStatusAsync(harness, oldToken));

        var freshGrant = oldGrant with { IssuedAt = DateTimeOffset.UtcNow.AddSeconds(-1) };
        harness.Kernel.Set(CanonicalOidcProtocolHarness.ActiveState(
            freshGrant,
            acceptTokensIssuedAtOrAfter: cutoff));
        var freshToken = await harness.Browser.LoginAsync(freshGrant);
        Assert.Equal(HttpStatusCode.OK, await SendStatusAsync(harness, freshToken));
    }

    [Fact]
    public async Task Signed_bearer_with_future_issued_at_and_valid_not_before_is_denied_before_Kernel()
    {
        var now = DateTimeOffset.UtcNow;
        var clock = new ProtocolManualTimeProvider(now);
        await using var harness = await CanonicalOidcProtocolHarness.StartAsync(clock);
        var grant = ProtocolOidcGrant.Create(
            TenantA,
            issuedAt: now.AddSeconds(31),
            notBefore: now.AddSeconds(-1));
        harness.Kernel.Set(CanonicalOidcProtocolHarness.ActiveState(
            grant,
            acceptTokensIssuedAtOrAfter: now.AddMinutes(-1)));
        var token = await harness.Browser.LoginAsync(grant);

        Assert.Equal(HttpStatusCode.Unauthorized, await SendStatusAsync(harness, token));
        Assert.Equal(0, harness.Kernel.RequestCount);
    }

    [Theory]
    [InlineData(false, true)]
    [InlineData(true, false)]
    public async Task Tenant_or_membership_deactivation_is_denied(
        bool tenantActive,
        bool membershipActive)
    {
        await using var harness = await CanonicalOidcProtocolHarness.StartAsync();
        var grant = ProtocolOidcGrant.Create(TenantA);
        harness.Kernel.Set(CanonicalOidcProtocolHarness.ActiveState(
            grant,
            tenantActive: tenantActive,
            membershipActive: membershipActive));
        var token = await harness.Browser.LoginAsync(grant);

        Assert.Equal(HttpStatusCode.Unauthorized, await SendStatusAsync(harness, token));
    }

    [Fact]
    public async Task Kernel_404_for_exact_subject_tenant_pair_is_denied()
    {
        await using var harness = await CanonicalOidcProtocolHarness.StartAsync();
        var token = await harness.Browser.LoginAsync(ProtocolOidcGrant.Create(TenantA));

        Assert.Equal(HttpStatusCode.Unauthorized, await SendStatusAsync(harness, token));
        Assert.Equal(
            [new ProtocolKernelRequest(FakeOidcAuthority.Subject, TenantA)],
            harness.Kernel.Requests);
    }

    [Theory]
    [InlineData(ProtocolKernelFault.Timeout)]
    [InlineData(ProtocolKernelFault.Malformed)]
    public async Task Kernel_timeout_or_malformed_response_fails_closed(ProtocolKernelFault fault)
    {
        await using var harness = await CanonicalOidcProtocolHarness.StartAsync();
        var grant = ProtocolOidcGrant.Create(TenantA);
        harness.Kernel.Set(CanonicalOidcProtocolHarness.ActiveState(grant));
        var token = await harness.Browser.LoginAsync(grant);
        harness.Kernel.Fault = fault;

        Assert.Equal(HttpStatusCode.Unauthorized, await SendStatusAsync(harness, token));
        Assert.Equal(1, harness.Kernel.RequestCount);
    }

    [Theory]
    [InlineData(ProtocolEndpointFault.Timeout)]
    [InlineData(ProtocolEndpointFault.Malformed)]
    [InlineData(ProtocolEndpointFault.WrongIssuer)]
    [InlineData(ProtocolEndpointFault.DuplicateIssuer)]
    [InlineData(ProtocolEndpointFault.DuplicateJwksUri)]
    public async Task Discovery_timeout_malformed_or_substituted_issuer_fails_before_Kernel(
        ProtocolEndpointFault fault)
    {
        await using var harness = await CanonicalOidcProtocolHarness.StartAsync();
        var grant = ProtocolOidcGrant.Create(TenantA);
        harness.Kernel.Set(CanonicalOidcProtocolHarness.ActiveState(grant));
        var token = await harness.Browser.LoginAsync(grant);
        harness.Oidc.DiscoveryFault = fault;

        Assert.Equal(HttpStatusCode.Unauthorized, await SendStatusAsync(harness, token));
        Assert.Equal(0, harness.Kernel.RequestCount);
    }

    [Theory]
    [InlineData(ProtocolJwksFault.Timeout)]
    [InlineData(ProtocolJwksFault.Malformed)]
    [InlineData(ProtocolJwksFault.DuplicateKeyId)]
    [InlineData(ProtocolJwksFault.MissingKeyId)]
    [InlineData(ProtocolJwksFault.TooManyKeys)]
    [InlineData(ProtocolJwksFault.Oversized)]
    [InlineData(ProtocolJwksFault.DuplicateKeyPropertyKid)]
    [InlineData(ProtocolJwksFault.DuplicateKeyPropertyModulus)]
    [InlineData(ProtocolJwksFault.WrongUse)]
    [InlineData(ProtocolJwksFault.WrongAlgorithm)]
    [InlineData(ProtocolJwksFault.WeakRsa)]
    [InlineData(ProtocolJwksFault.PrivateRsa)]
    [InlineData(ProtocolJwksFault.WrongExponent)]
    [InlineData(ProtocolJwksFault.SymmetricKey)]
    public async Task Invalid_or_unavailable_jwks_fails_before_Kernel(
        ProtocolJwksFault fault)
    {
        await using var harness = await CanonicalOidcProtocolHarness.StartAsync();
        var grant = ProtocolOidcGrant.Create(TenantA);
        harness.Kernel.Set(CanonicalOidcProtocolHarness.ActiveState(grant));
        var token = await harness.Browser.LoginAsync(grant);
        harness.Oidc.JwksFault = fault;

        Assert.Equal(HttpStatusCode.Unauthorized, await SendStatusAsync(harness, token));
        Assert.Equal(0, harness.Kernel.RequestCount);
    }

    [Fact]
    public async Task Mixed_signing_and_encryption_jwks_uses_only_exact_signing_keys()
    {
        await using var harness = await CanonicalOidcProtocolHarness.StartAsync(
            initialJwksFault: ProtocolJwksFault.MixedSigningAndEncryption);
        var grantA = ProtocolOidcGrant.Create(TenantA, signingKey: ProtocolSigningKey.A);
        harness.Kernel.Set(CanonicalOidcProtocolHarness.ActiveState(grantA));
        var tokenA = await harness.Browser.LoginAsync(grantA);

        Assert.Equal(HttpStatusCode.OK, await SendStatusAsync(harness, tokenA));
        Assert.Equal(1, harness.Kernel.RequestCount);
        var manager = Assert.IsType<StrictOidcConfigurationManager>(
            harness.JwtOptions.ConfigurationManager);
        var snapshot = await manager.GetConfigurationAsync(CancellationToken.None);
        Assert.Equal(
            ["key-a", "key-b"],
            snapshot.JsonWebKeySet!.Keys.Select(static key => key.Kid));
        Assert.Equal(["key-a"], snapshot.SigningKeys.Select(static key => key.KeyId));
        Assert.False(snapshot.SigningKeys.Single().CryptoProviderFactory.CacheSignatureProviders);

        var grantB = grantA with
        {
            SigningKey = ProtocolSigningKey.B,
            IssuedAt = DateTimeOffset.UtcNow.AddSeconds(-1),
        };
        var tokenB = harness.Oidc.CreateAccessTokenForTests(grantB);
        Assert.Equal(HttpStatusCode.Unauthorized, await SendStatusAsync(harness, tokenB));
        Assert.Equal(1, harness.Kernel.RequestCount);
    }

    [Fact]
    public async Task Readiness_is_cold_until_full_configuration_and_cache_hit_does_not_refresh_age()
    {
        var clock = new ProtocolManualTimeProvider(DateTimeOffset.UtcNow);
        await using var harness = await CanonicalOidcProtocolHarness.StartAsync(clock);
        Assert.Equal(HealthStatus.Unhealthy, await harness.CheckOidcReadinessAsync());

        var grant = ProtocolOidcGrant.Create(TenantA);
        harness.Kernel.Set(CanonicalOidcProtocolHarness.ActiveState(grant));
        var token = await harness.Browser.LoginAsync(grant);
        Assert.Equal(HttpStatusCode.OK, await SendStatusAsync(harness, token));
        Assert.Equal(HealthStatus.Healthy, await harness.CheckOidcReadinessAsync());
        var firstSuccess = harness.OidcRuntimeState.GetSnapshot().LastSuccessfulConfigurationAt;

        clock.Advance(TimeSpan.FromSeconds(2));
        Assert.Equal(HttpStatusCode.OK, await SendStatusAsync(harness, token));
        Assert.Equal(firstSuccess, harness.OidcRuntimeState.GetSnapshot().LastSuccessfulConfigurationAt);
        Assert.Equal(HealthStatus.Healthy, await harness.CheckOidcReadinessAsync());
    }

    [Fact]
    public async Task Jwks_outage_marks_readiness_unhealthy_without_extending_cached_success()
    {
        var clock = new ProtocolManualTimeProvider(DateTimeOffset.UtcNow);
        await using var harness = await CanonicalOidcProtocolHarness.StartAsync(clock);
        var grantA = ProtocolOidcGrant.Create(TenantA, signingKey: ProtocolSigningKey.A);
        harness.Kernel.Set(CanonicalOidcProtocolHarness.ActiveState(grantA));
        var tokenA = await harness.Browser.LoginAsync(grantA);
        Assert.Equal(HttpStatusCode.OK, await SendStatusAsync(harness, tokenA));
        var successfulAt = harness.OidcRuntimeState.GetSnapshot().LastSuccessfulConfigurationAt;

        harness.Oidc.Publish(ProtocolSigningKey.A, ProtocolSigningKey.C);
        var tokenC = await harness.Browser.LoginAsync(grantA with
        {
            SigningKey = ProtocolSigningKey.C,
            IssuedAt = DateTimeOffset.UtcNow.AddSeconds(-1),
        });
        harness.Oidc.JwksFault = ProtocolJwksFault.Timeout;
        Assert.Equal(HttpStatusCode.Unauthorized, await SendStatusAsync(harness, tokenC));
        Assert.Equal(
            HealthStatus.Unhealthy,
            await EventuallyReadinessAsync(harness, HealthStatus.Unhealthy, TimeSpan.FromSeconds(2)));
        Assert.Equal(successfulAt, harness.OidcRuntimeState.GetSnapshot().LastSuccessfulConfigurationAt);

        // A recent cached key remains usable inside the explicit max-age window, while the
        // dependency-facing readiness signal already prevents activation/cutover.
        Assert.Equal(HttpStatusCode.OK, await SendStatusAsync(harness, tokenA));
    }

    [Fact]
    public async Task Maximum_configuration_age_fails_auth_closed_and_recovery_restores_health()
    {
        var clock = new ProtocolManualTimeProvider(DateTimeOffset.UtcNow);
        await using var harness = await CanonicalOidcProtocolHarness.StartAsync(clock);
        var grant = ProtocolOidcGrant.Create(TenantA);
        harness.Kernel.Set(CanonicalOidcProtocolHarness.ActiveState(grant));
        var token = await harness.Browser.LoginAsync(grant);
        Assert.Equal(HttpStatusCode.OK, await SendStatusAsync(harness, token));

        clock.Advance(TimeSpan.FromSeconds(6));
        harness.Oidc.DiscoveryFault = ProtocolEndpointFault.Timeout;
        Assert.Equal(HttpStatusCode.Unauthorized, await SendStatusAsync(harness, token));
        Assert.Equal(
            HealthStatus.Unhealthy,
            await EventuallyReadinessAsync(harness, HealthStatus.Unhealthy, TimeSpan.FromSeconds(2)));

        harness.Oidc.DiscoveryFault = ProtocolEndpointFault.None;
        await Task.Delay(TimeSpan.FromMilliseconds(1100));
        Assert.Equal(
            HttpStatusCode.OK,
            await EventuallyAcceptedAsync(harness, token, TimeSpan.FromSeconds(3)));
        Assert.Equal(HealthStatus.Healthy, await harness.CheckOidcReadinessAsync());
    }

    [Fact]
    public async Task Clock_rollback_cannot_make_a_future_configuration_appear_fresh()
    {
        var clock = new ProtocolManualTimeProvider(DateTimeOffset.UtcNow);
        await using var harness = await CanonicalOidcProtocolHarness.StartAsync(clock);
        var grant = ProtocolOidcGrant.Create(TenantA);
        harness.Kernel.Set(CanonicalOidcProtocolHarness.ActiveState(grant));
        var token = await harness.Browser.LoginAsync(grant);
        Assert.Equal(HttpStatusCode.OK, await SendStatusAsync(harness, token));

        clock.Advance(TimeSpan.FromSeconds(-1));
        harness.Oidc.DiscoveryFault = ProtocolEndpointFault.Timeout;

        Assert.Equal(HealthStatus.Unhealthy, await harness.CheckOidcReadinessAsync());
        Assert.Equal(HttpStatusCode.Unauthorized, await SendStatusAsync(harness, token));
    }

    [Fact]
    public async Task Pre_registered_frozen_global_clock_cannot_extend_OIDC_freshness()
    {
        var frozenGlobal = new ProtocolManualTimeProvider(
            DateTimeOffset.Parse("2026-08-20T12:00:00Z"));
        await using var harness = await CanonicalOidcProtocolHarness.StartAsync(
            timeProvider: TimeProvider.System,
            globalTimeProvider: frozenGlobal);
        var grant = ProtocolOidcGrant.Create(TenantA);
        harness.Kernel.Set(CanonicalOidcProtocolHarness.ActiveState(grant));
        var token = await harness.Browser.LoginAsync(grant);
        Assert.Equal(HttpStatusCode.OK, await SendStatusAsync(harness, token));
        var success = Assert.IsType<DateTimeOffset>(
            harness.OidcRuntimeState.GetSnapshot().LastSuccessfulConfigurationAt);

        await Task.Delay(TimeSpan.FromMilliseconds(5250));
        harness.Oidc.DiscoveryFault = ProtocolEndpointFault.Timeout;

        Assert.True(harness.OidcRuntimeState.UtcNow - success > TimeSpan.FromSeconds(5));
        Assert.Equal(
            DateTimeOffset.Parse("2026-08-20T12:00:00Z"),
            frozenGlobal.GetUtcNow());
        Assert.Equal(HttpStatusCode.Unauthorized, await SendStatusAsync(harness, token));
        Assert.Equal(HealthStatus.Unhealthy, await harness.CheckOidcReadinessAsync());
    }

    [Fact]
    public async Task Real_jwks_refresh_observes_A_then_A_and_B_then_B_and_rejects_removed_A()
    {
        await using var harness = await CanonicalOidcProtocolHarness.StartAsync();
        var grantA = ProtocolOidcGrant.Create(TenantA, signingKey: ProtocolSigningKey.A);
        harness.Kernel.Set(CanonicalOidcProtocolHarness.ActiveState(grantA));

        harness.Oidc.Publish(ProtocolSigningKey.A);
        var tokenA = await harness.Browser.LoginAsync(grantA);
        Assert.Equal(HttpStatusCode.OK, await SendStatusAsync(harness, tokenA));

        harness.Oidc.Publish(ProtocolSigningKey.A, ProtocolSigningKey.B);
        var grantB = grantA with
        {
            SigningKey = ProtocolSigningKey.B,
            IssuedAt = DateTimeOffset.UtcNow.AddSeconds(-1),
        };
        var tokenB = await harness.Browser.LoginAsync(grantB);
        Assert.Equal(
            HttpStatusCode.OK,
            await EventuallyAcceptedAsync(harness, tokenB, TimeSpan.FromSeconds(3)));

        await Task.Delay(TimeSpan.FromMilliseconds(1100));
        harness.Oidc.Publish(ProtocolSigningKey.B, ProtocolSigningKey.C);
        var grantC = grantA with
        {
            SigningKey = ProtocolSigningKey.C,
            IssuedAt = DateTimeOffset.UtcNow.AddSeconds(-1),
        };
        var tokenC = await harness.Browser.LoginAsync(grantC);
        harness.Oidc.Publish(ProtocolSigningKey.B);
        Assert.Equal(
            HttpStatusCode.Unauthorized,
            await EventuallyObservedJwksAsync(
                harness,
                tokenC,
                expectedLastSnapshot: ["key-b"],
                timeout: TimeSpan.FromSeconds(3)));

        Assert.Equal(
            HttpStatusCode.Unauthorized,
            await EventuallyDeniedAsync(harness, tokenA, TimeSpan.FromSeconds(3)));
        Assert.Equal(HttpStatusCode.OK, await SendStatusAsync(harness, tokenB));
        Assert.Collection(
            harness.ModuleJwksSnapshots.Take(3),
            snapshot => Assert.Equal(["key-a"], snapshot),
            snapshot => Assert.Equal(["key-a", "key-b"], snapshot),
            snapshot => Assert.Equal(["key-b"], snapshot));
    }

    private static async Task<HttpStatusCode> SendStatusAsync(
        CanonicalOidcProtocolHarness harness,
        string token)
    {
        using var response = await harness.SendAsync(token);
        return response.StatusCode;
    }

    private static async Task<HttpStatusCode> EventuallyAcceptedAsync(
        CanonicalOidcProtocolHarness harness,
        string token,
        TimeSpan timeout)
    {
        var deadline = DateTimeOffset.UtcNow + timeout;
        HttpStatusCode status;
        do
        {
            status = await SendStatusAsync(harness, token);
            if (status == HttpStatusCode.OK)
                return status;
            await Task.Delay(50);
        }
        while (DateTimeOffset.UtcNow < deadline);

        return status;
    }

    private static async Task<HttpStatusCode> EventuallyDeniedAsync(
        CanonicalOidcProtocolHarness harness,
        string token,
        TimeSpan timeout)
    {
        var deadline = DateTimeOffset.UtcNow + timeout;
        HttpStatusCode status;
        do
        {
            status = await SendStatusAsync(harness, token);
            if (status == HttpStatusCode.Unauthorized)
                return status;
            await Task.Delay(50);
        }
        while (DateTimeOffset.UtcNow < deadline);

        return status;
    }

    private static async Task<HttpStatusCode> EventuallyObservedJwksAsync(
        CanonicalOidcProtocolHarness harness,
        string token,
        IReadOnlyList<string> expectedLastSnapshot,
        TimeSpan timeout)
    {
        var deadline = DateTimeOffset.UtcNow + timeout;
        HttpStatusCode status;
        do
        {
            status = await SendStatusAsync(harness, token);
            if (harness.ModuleJwksSnapshots.LastOrDefault() is { } snapshot
                && snapshot.SequenceEqual(expectedLastSnapshot, StringComparer.Ordinal))
            {
                await Task.Delay(50);
                return status;
            }

            await Task.Delay(50);
        }
        while (DateTimeOffset.UtcNow < deadline);

        return status;
    }

    private static async Task<HealthStatus> EventuallyReadinessAsync(
        CanonicalOidcProtocolHarness harness,
        HealthStatus expected,
        TimeSpan timeout)
    {
        var deadline = DateTimeOffset.UtcNow + timeout;
        HealthStatus status;
        do
        {
            status = await harness.CheckOidcReadinessAsync();
            if (status == expected)
                return status;
            await Task.Delay(50);
        }
        while (DateTimeOffset.UtcNow < deadline);

        return status;
    }
}
