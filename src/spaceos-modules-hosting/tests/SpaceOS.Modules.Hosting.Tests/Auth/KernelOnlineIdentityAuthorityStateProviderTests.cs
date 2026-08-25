using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Hosting.Internal;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using SpaceOS.Modules.Hosting.Auth;
using SpaceOS.Modules.Hosting.Tenancy;
using Xunit;

namespace SpaceOS.Modules.Hosting.Tests.Auth;

public sealed partial class KernelOnlineIdentityAuthorityStateProviderTests
{
    private const string Subject = "operator-42";
    private static readonly Guid TenantA = Guid.Parse("11111111-2222-4333-8444-555555555555");
    private static readonly Guid TenantB = Guid.Parse("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee");

    [Fact]
    public async Task Happy_path_sends_exact_read_only_post_and_accepts_strict_echo()
    {
        var requestObserved = false;
        await using var harness = KernelOnlineIdentityAuthorityTestHarness.Create(async context =>
        {
            Assert.Equal(HttpMethods.Post, context.Request.Method);
            Assert.Equal("/api/internal/identity-authority/resolve", context.Request.Path);
            Assert.Equal(string.Empty, context.Request.QueryString.Value);
            Assert.Equal("application/json", context.Request.ContentType?.Split(';')[0]);
            Assert.Equal("Bearer", context.Request.Headers.Authorization.ToString().Split(' ')[0]);
            Assert.Equal("synthetic-service-proof", context.Request.Headers.Authorization.ToString().Split(' ')[1]);
            Assert.DoesNotContain(
                "KERNEL_IDENTITY_AUTH_CERTIFICATE",
                context.Request.Headers.SelectMany(static header => header.Value),
                StringComparer.Ordinal);

            using var request = await JsonDocument.ParseAsync(
                context.Request.Body,
                cancellationToken: context.RequestAborted).ConfigureAwait(false);
            var properties = request.RootElement.EnumerateObject().ToArray();
            Assert.Equal(new[] { "subject", "tenantId" }, properties.Select(static p => p.Name));
            Assert.Equal(Subject, request.RootElement.GetProperty("subject").GetString());
            Assert.Equal(TenantA.ToString("D"), request.RootElement.GetProperty("tenantId").GetString());
            requestObserved = true;

            await KernelOnlineIdentityAuthorityTestHarness.WriteJsonAsync(
                context,
                KernelOnlineIdentityAuthorityTestHarness.SuccessfulResponse(Subject, TenantA))
                .ConfigureAwait(false);
        });

        var state = await harness.Provider.GetCurrentAsync(Subject, TenantA, CancellationToken.None);

        Assert.True(requestObserved);
        Assert.NotNull(state);
        Assert.Equal(Subject, state.Subject);
        Assert.Equal(TenantA, state.TenantId);
        Assert.True(state.TenantActive);
        Assert.True(state.MembershipActive);
        Assert.Equal(1, state.MembershipVersion);
        Assert.Equal(1, state.ProjectionVersion);
        Assert.Equal(new[] { "spaceos.crm.admin" }, state.Permissions);
        Assert.Equal(new[] { "spaceos.crm" }, state.EnabledModules);

        var snapshot = harness.Services
            .GetRequiredService<IKernelOnlineIdentityAuthorityObservability>()
            .GetSnapshot();
        Assert.Equal(KernelOnlineIdentityAuthorityOutcome.Success, snapshot.LastOutcome);
        Assert.NotNull(snapshot.LastSuccessfulContactAt);
        Assert.Equal(0, snapshot.ConsecutiveDependencyFailures);
        Assert.True(snapshot.LastLatencyMilliseconds >= 0);
    }

    [Fact]
    public async Task Not_found_is_authoritative_null_and_marks_dependency_available()
    {
        await using var harness = KernelOnlineIdentityAuthorityTestHarness.Create(context =>
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return Task.CompletedTask;
        });

        var state = await harness.Provider.GetCurrentAsync(Subject, TenantA, CancellationToken.None);

        Assert.Null(state);
        var snapshot = harness.Services
            .GetRequiredService<IKernelOnlineIdentityAuthorityObservability>()
            .GetSnapshot();
        Assert.Equal(KernelOnlineIdentityAuthorityOutcome.NotFound, snapshot.LastOutcome);
        Assert.NotNull(snapshot.LastSuccessfulContactAt);
        Assert.Null(snapshot.LastDependencyFailureAt);
    }

    [Theory]
    [MemberData(nameof(MalformedResponses))]
    public async Task Malformed_or_noncanonical_response_fails_without_retry(string responseJson)
    {
        var attempts = 0;
        await using var harness = KernelOnlineIdentityAuthorityTestHarness.Create(async context =>
        {
            Interlocked.Increment(ref attempts);
            await KernelOnlineIdentityAuthorityTestHarness.WriteJsonAsync(context, responseJson)
                .ConfigureAwait(false);
        });

        var exception = await Assert.ThrowsAsync<KernelOnlineIdentityAuthorityException>(async () =>
            await harness.Provider.GetCurrentAsync(Subject, TenantA, CancellationToken.None));

        Assert.Equal(KernelOnlineIdentityAuthorityOutcome.MalformedResponse, exception.Outcome);
        Assert.Equal(1, attempts);
    }

    [Theory]
    [InlineData("subject")]
    [InlineData("tenant")]
    public async Task Response_must_echo_exact_subject_and_tenant(string mismatch)
    {
        var response = mismatch == "subject"
            ? KernelOnlineIdentityAuthorityTestHarness.SuccessfulResponse("different-subject", TenantA)
            : KernelOnlineIdentityAuthorityTestHarness.SuccessfulResponse(Subject, TenantB);
        await using var harness = KernelOnlineIdentityAuthorityTestHarness.Create(context =>
            KernelOnlineIdentityAuthorityTestHarness.WriteJsonAsync(context, response));

        var exception = await Assert.ThrowsAsync<KernelOnlineIdentityAuthorityException>(async () =>
            await harness.Provider.GetCurrentAsync(Subject, TenantA, CancellationToken.None));

        Assert.Equal(KernelOnlineIdentityAuthorityOutcome.ScopeMismatch, exception.Outcome);
    }

    [Theory]
    [InlineData("deactivated", "active", false, true)]
    [InlineData("active", "deactivated", true, false)]
    [InlineData("active", "revoked", true, false)]
    public async Task Exact_statuses_map_to_existing_fail_closed_interface(
        string tenantStatus,
        string membershipStatus,
        bool expectedTenantActive,
        bool expectedMembershipActive)
    {
        var response = KernelOnlineIdentityAuthorityTestHarness.SuccessfulResponse(
            Subject,
            TenantA,
            tenantStatus: tenantStatus,
            membershipStatus: membershipStatus);
        await using var harness = KernelOnlineIdentityAuthorityTestHarness.Create(context =>
            KernelOnlineIdentityAuthorityTestHarness.WriteJsonAsync(context, response));

        var state = await harness.Provider.GetCurrentAsync(Subject, TenantA, CancellationToken.None);

        Assert.NotNull(state);
        Assert.Equal(expectedTenantActive, state.TenantActive);
        Assert.Equal(expectedMembershipActive, state.MembershipActive);
    }

    [Fact]
    public async Task Stale_online_content_is_denied_by_the_canonical_validator()
    {
        var response = KernelOnlineIdentityAuthorityTestHarness.SuccessfulResponse(
            Subject,
            TenantA,
            "spaceos.qa",
            "spaceos.qa.admin");
        await using var harness = KernelOnlineIdentityAuthorityTestHarness.Create(context =>
            KernelOnlineIdentityAuthorityTestHarness.WriteJsonAsync(context, response));
        using var rsa = RSA.Create(2048);
        var key = new RsaSecurityKey(rsa) { KeyId = "test-key" };
        var issuedAt = DateTimeOffset.Parse("2026-08-20T01:00:00Z");
        var claims = new Dictionary<string, object>
        {
            ["sub"] = Subject,
            ["azp"] = "portal-app",
            ["typ"] = "Bearer",
            [TenancyDefaults.MembershipVersionClaim] = 1,
            [TenancyDefaults.ProjectionVersionClaim] = 1,
            [TenancyDefaults.TenantListClaim] = new[]
            {
                new Dictionary<string, object>
                {
                    ["tenant_id"] = TenantA.ToString("D"),
                    ["permissions"] = new[] { "spaceos.crm.admin" },
                    ["enabled_modules"] = new[] { "spaceos.crm" },
                },
            },
        };
        var compact = new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Issuer = "https://issuer.test/realms/spaceos",
            Audience = "crm-api",
            Claims = claims,
            IssuedAt = issuedAt.UtcDateTime,
            NotBefore = issuedAt.AddSeconds(-1).UtcDateTime,
            Expires = issuedAt.AddHours(1).UtcDateTime,
            SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.RsaSha256),
            TokenType = "JWT",
        });
        var token = new JsonWebToken(compact);
        var principal = new ClaimsPrincipal(new ClaimsIdentity(token.Claims, "Bearer"));

        var result = await new CanonicalOidcAccessTokenValidator(new OidcAuthorityClock(
            "https://issuer.test/realms/spaceos",
            new HostingEnvironment { EnvironmentName = Environments.Production },
            testOverride: null)).ValidateAsync(
            principal,
            token,
            new CanonicalOidcAccessTokenProfile(
                "https://issuer.test/realms/spaceos",
                "crm-api",
                "portal-app"),
            harness.Provider,
            CancellationToken.None);

        Assert.False(result.IsValid);
        Assert.Equal("projection_content_stale", result.Code);
    }

    public static IEnumerable<object[]> MalformedResponses()
    {
        var valid = KernelOnlineIdentityAuthorityTestHarness.SuccessfulResponse(Subject, TenantA);
        yield return ["{"];
        yield return [valid.Insert(1, $"\"schemaVersion\":\"{KernelOnlineIdentityAuthorityProtocol.SchemaVersion}\",")];
        yield return [valid.Replace("\"tenantStatus\":\"active\"", "\"tenantStatus\":\"unknown\"", StringComparison.Ordinal)];
        yield return [valid.Insert(valid.Length - 1, ",\"extra\":true")];
        yield return [valid.Replace("\"membershipVersion\":1", "\"membershipVersion\":0", StringComparison.Ordinal)];
        yield return [valid.Replace("2026-08-20T00:00:00Z", "2026-08-20T00:00:00+00:00", StringComparison.Ordinal)];
        yield return [valid.Replace(
            "\"permissions\":[\"spaceos.crm.admin\"],\"enabledModules\":[\"spaceos.crm\"]",
            "\"permissions\":[\"spaceos.qa.admin\",\"spaceos.crm.admin\"],\"enabledModules\":[\"spaceos.qa\",\"spaceos.crm\"]",
            StringComparison.Ordinal)];
        yield return [valid.Replace(
            "\"permissions\":[\"spaceos.crm.admin\"],\"enabledModules\":[\"spaceos.crm\"]",
            "\"permissions\":[\"spaceos.crm.admin\",\"spaceos.crm.admin\"],\"enabledModules\":[\"spaceos.crm\",\"spaceos.crm\"]",
            StringComparison.Ordinal)];
    }
}
