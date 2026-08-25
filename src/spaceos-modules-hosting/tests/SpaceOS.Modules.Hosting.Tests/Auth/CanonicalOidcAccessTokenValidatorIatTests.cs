using System.Security.Claims;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Hosting.Internal;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using SpaceOS.Modules.Hosting.Auth;
using SpaceOS.Modules.Hosting.Tests.Auth.Protocol;
using SpaceOS.Modules.Hosting.Tenancy;
using Xunit;

namespace SpaceOS.Modules.Hosting.Tests.Auth;

/// <summary>Focused second-stage tests for the source-owned access-token issued-at policy.</summary>
public sealed class CanonicalOidcAccessTokenValidatorIatTests
{
    private const string Issuer = FakeOidcAuthority.Issuer;
    private const string Audience = FakeOidcAuthority.Audience;
    private const string AuthorizedParty = FakeOidcAuthority.ClientId;
    private const string Subject = FakeOidcAuthority.Subject;
    private static readonly Guid TenantId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly CanonicalOidcAccessTokenProfile Profile = new(
        Issuer,
        Audience,
        AuthorizedParty);

    [Fact]
    public async Task Issued_at_equal_to_source_owned_now_is_accepted_at_the_revoke_cutoff()
    {
        var now = DateTimeOffset.Parse("2026-08-20T12:00:00Z");
        using var fixture = CreateFixture(now, now);
        var (principal, token) = CreateToken(issuedAt: now);

        var result = await fixture.Validator.ValidateAsync(
            principal,
            token,
            Profile,
            fixture.State,
            CancellationToken.None);

        Assert.True(result.IsValid);
        Assert.Equal("valid", result.Code);
        Assert.Equal(TenantId, result.TenantId);
        Assert.Equal(1, fixture.State.CallCount);
    }

    [Fact]
    public async Task Issued_at_at_the_source_owned_future_skew_boundary_is_accepted()
    {
        var now = DateTimeOffset.Parse("2026-08-20T12:00:00Z");
        var issuedAt = now + OidcAuthorityClock.MaximumFutureIssuedAtSkew;
        using var fixture = CreateFixture(now, issuedAt);
        var (principal, token) = CreateToken(issuedAt: issuedAt);

        var result = await fixture.Validator.ValidateAsync(
            principal,
            token,
            Profile,
            fixture.State,
            CancellationToken.None);

        Assert.True(result.IsValid);
        Assert.Equal(1, fixture.State.CallCount);
    }

    [Fact]
    public async Task Issued_at_beyond_the_source_owned_future_skew_is_denied_before_online_lookup()
    {
        var now = DateTimeOffset.Parse("2026-08-20T12:00:00Z");
        var issuedAt = now + OidcAuthorityClock.MaximumFutureIssuedAtSkew + TimeSpan.FromSeconds(1);
        using var fixture = CreateFixture(now, now);
        var (principal, token) = CreateToken(issuedAt: issuedAt);

        var result = await fixture.Validator.ValidateAsync(
            principal,
            token,
            Profile,
            fixture.State,
            CancellationToken.None);

        Assert.False(result.IsValid);
        Assert.Equal("token_issued_in_future", result.Code);
        Assert.Equal(0, fixture.State.CallCount);
    }

    [Fact]
    public async Task Missing_issued_at_is_denied_before_online_lookup()
    {
        var now = DateTimeOffset.Parse("2026-08-20T12:00:00Z");
        using var fixture = CreateFixture(now, now);
        var (principal, token) = CreateToken(includeIssuedAt: false);

        var result = await fixture.Validator.ValidateAsync(
            principal,
            token,
            Profile,
            fixture.State,
            CancellationToken.None);

        Assert.False(result.IsValid);
        Assert.Equal("authority_version_invalid", result.Code);
        Assert.Equal(0, fixture.State.CallCount);
    }

    [Theory]
    [InlineData(0L)]
    [InlineData(-1L)]
    public async Task Non_positive_issued_at_is_denied_before_online_lookup(long malformedIssuedAt)
    {
        var now = DateTimeOffset.Parse("2026-08-20T12:00:00Z");
        using var fixture = CreateFixture(now, now);
        var (principal, token) = CreateToken(rawIssuedAt: malformedIssuedAt);

        var result = await fixture.Validator.ValidateAsync(
            principal,
            token,
            Profile,
            fixture.State,
            CancellationToken.None);

        Assert.False(result.IsValid);
        Assert.Equal("authority_version_invalid", result.Code);
        Assert.Equal(0, fixture.State.CallCount);
    }

    [Fact]
    public async Task Issued_at_before_the_online_revoke_cutoff_is_still_denied()
    {
        var now = DateTimeOffset.Parse("2026-08-20T12:00:00Z");
        using var fixture = CreateFixture(now, now.AddSeconds(1));
        var (principal, token) = CreateToken(issuedAt: now);

        var result = await fixture.Validator.ValidateAsync(
            principal,
            token,
            Profile,
            fixture.State,
            CancellationToken.None);

        Assert.False(result.IsValid);
        Assert.Equal("token_revoked", result.Code);
        Assert.Equal(1, fixture.State.CallCount);
    }

    private static IatValidatorFixture CreateFixture(
        DateTimeOffset now,
        DateTimeOffset acceptTokensIssuedAtOrAfter)
    {
        var state = new RecordingStateProvider(new OnlineIdentityAuthorityState(
            Subject,
            TenantId,
            TenantActive: true,
            MembershipActive: true,
            MembershipVersion: 1,
            ProjectionVersion: 1,
            acceptTokensIssuedAtOrAfter,
            Permissions: ["spaceos.maintenance.view"],
            EnabledModules: ["spaceos.maintenance"]));
        var services = new ServiceCollection();
        services.AddSingleton<IOnlineIdentityAuthorityStateProvider>(state);
        services.AddSpaceOsModuleAuth(Configuration(), ProductionTestEnvironment());
        services.AddOidcAuthorityTestClock(new FixedTimeProvider(now));
        var provider = services.BuildServiceProvider();
        return new IatValidatorFixture(
            provider,
            provider.GetRequiredService<CanonicalOidcAccessTokenValidator>(),
            state);
    }

    private static IConfiguration Configuration()
        => new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:Mode"] = SpaceOsModuleAuthOptions.KeycloakMode,
            ["Jwt:Authority"] = Issuer,
            ["Jwt:Audience"] = Audience,
            ["Jwt:AuthorizedParty"] = AuthorizedParty,
        }).Build();

    private static IHostEnvironment ProductionTestEnvironment()
        => new HostingEnvironment
        {
            EnvironmentName = Environments.Production,
            ApplicationName = OidcAuthorityTransport.TestAssemblyName,
        };

    private static (ClaimsPrincipal Principal, JsonWebToken Token) CreateToken(
        DateTimeOffset? issuedAt = null,
        object? rawIssuedAt = null,
        bool includeIssuedAt = true)
    {
        var payload = new Dictionary<string, object?>(StringComparer.Ordinal)
        {
            ["iss"] = Issuer,
            ["aud"] = Audience,
            ["sub"] = Subject,
            ["azp"] = AuthorizedParty,
            ["typ"] = "Bearer",
            [TenancyDefaults.MembershipVersionClaim] = 1,
            [TenancyDefaults.ProjectionVersionClaim] = 1,
            [TenancyDefaults.TenantListClaim] = new[]
            {
                new Dictionary<string, object?>
                {
                    ["tenant_id"] = TenantId.ToString("D"),
                    ["permissions"] = new[] { "spaceos.maintenance.view" },
                    ["enabled_modules"] = new[] { "spaceos.maintenance" },
                },
            },
        };
        if (includeIssuedAt)
            payload["iat"] = rawIssuedAt ?? issuedAt?.ToUnixTimeSeconds();

        var compact = string.Join(
            '.',
            Base64UrlEncoder.Encode(JsonSerializer.SerializeToUtf8Bytes(new
            {
                alg = SecurityAlgorithms.RsaSha256,
                kid = "test-key",
                typ = "JWT",
            })),
            Base64UrlEncoder.Encode(JsonSerializer.SerializeToUtf8Bytes(payload)),
            Base64UrlEncoder.Encode([0x01]));
        var token = new JsonWebToken(compact);
        return (new ClaimsPrincipal(new ClaimsIdentity(token.Claims, "Bearer")), token);
    }

    private sealed class IatValidatorFixture(
        ServiceProvider provider,
        CanonicalOidcAccessTokenValidator validator,
        RecordingStateProvider state) : IDisposable
    {
        internal CanonicalOidcAccessTokenValidator Validator { get; } = validator;

        internal RecordingStateProvider State { get; } = state;

        public void Dispose() => provider.Dispose();
    }

    private sealed class RecordingStateProvider(OnlineIdentityAuthorityState state)
        : IOnlineIdentityAuthorityStateProvider
    {
        internal int CallCount { get; private set; }

        public ValueTask<OnlineIdentityAuthorityState?> GetCurrentAsync(
            string subject,
            Guid tenantId,
            CancellationToken cancellationToken)
        {
            cancellationToken.ThrowIfCancellationRequested();
            CallCount++;
            return ValueTask.FromResult<OnlineIdentityAuthorityState?>(state);
        }
    }

    private sealed class FixedTimeProvider(DateTimeOffset utcNow) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => utcNow;
    }
}
