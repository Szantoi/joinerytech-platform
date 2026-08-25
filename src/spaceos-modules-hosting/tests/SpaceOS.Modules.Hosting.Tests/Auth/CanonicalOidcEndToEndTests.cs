using System.Net;
using System.Globalization;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.TestHost;
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

/// <summary>
/// Network-free end-to-end proof of the canonical server pipeline. The mutable key ring
/// models JWKS read-back/rotation; it is deliberately not evidence of a live Keycloak flow.
/// </summary>
public sealed class CanonicalOidcEndToEndTests
{
    private const string Issuer = FakeOidcAuthority.Issuer;
    private const string Audience = FakeOidcAuthority.Audience;
    private const string AuthorizedParty = FakeOidcAuthority.ClientId;
    private const string Subject = FakeOidcAuthority.Subject;
    private static readonly Guid TenantA = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid TenantB = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly DateTimeOffset IssuedAt = DateTimeOffset.UtcNow.AddMinutes(-10);

    [Fact]
    public void Browser_client_contract_requires_authorization_code_and_pkce_s256_only()
    {
        var canonical = new BrowserOidcClientSecurityProfile(
            PublicClient: true,
            StandardFlowEnabled: true,
            ImplicitFlowEnabled: false,
            DirectAccessGrantsEnabled: false,
            ServiceAccountsEnabled: false,
            ProofKeyCodeChallengeMethod: "S256");

        Assert.True(canonical.IsAuthorizationCodeWithPkceS256());
        Assert.False((canonical with { ProofKeyCodeChallengeMethod = "plain" })
            .IsAuthorizationCodeWithPkceS256());
        Assert.False((canonical with { ImplicitFlowEnabled = true })
            .IsAuthorizationCodeWithPkceS256());
        Assert.False((canonical with { DirectAccessGrantsEnabled = true })
            .IsAuthorizationCodeWithPkceS256());
    }

    [Fact]
    public async Task Two_tenants_require_two_fresh_single_tenant_tokens_and_never_cross_resolve()
    {
        await using var harness = await Harness.StartAsync();
        harness.State.Set(Subject, TenantA, ActiveState());
        harness.State.Set(Subject, TenantB, ActiveState(tenantId: TenantB));

        var responseA = await harness.SendAsync(harness.Token(TenantA));
        var responseB = await harness.SendAsync(harness.Token(TenantB));

        Assert.Equal(HttpStatusCode.OK, responseA.StatusCode);
        Assert.Contains(TenantA.ToString("D"), await responseA.Content.ReadAsStringAsync());
        Assert.DoesNotContain(TenantB.ToString("D"), await responseA.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.OK, responseB.StatusCode);
        Assert.Contains(TenantB.ToString("D"), await responseB.Content.ReadAsStringAsync());
        Assert.DoesNotContain(TenantA.ToString("D"), await responseB.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Wrong_subject_tenant_pair_is_denied_by_online_lookup()
    {
        await using var harness = await Harness.StartAsync();
        harness.State.Set(Subject, TenantA, ActiveState());

        var response = await harness.SendAsync(harness.Token(TenantB));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData(" operator-123")]
    [InlineData("operator-123 ")]
    [InlineData("operator\t123")]
    [InlineData("operator\u00a0123")]
    [InlineData("operator\u200b123")]
    [InlineData("operator\u0001123")]
    public async Task Unicode_whitespace_control_or_format_in_subject_is_denied_before_online_lookup(
        string invalidSubject)
    {
        await using var harness = await Harness.StartAsync();

        var response = await harness.SendAsync(
            harness.Token(TenantA, new TokenMutation(Subject: invalidSubject)));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Missing_live_online_provider_uses_default_deny_in_the_shared_wiring()
    {
        await using var harness = await Harness.StartAsync(registerOnlineProvider: false);

        var response = await harness.SendAsync(harness.Token(TenantA));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData("issuer")]
    [InlineData("audience")]
    [InlineData("azp")]
    public async Task Wrong_issuer_audience_or_authorized_party_is_denied(string field)
    {
        await using var harness = await Harness.StartAsync();
        harness.State.Set(Subject, TenantA, ActiveState());
        var mutation = new TokenMutation(
            Issuer: field == "issuer" ? "https://evil.example.test/realms/spaceos" : Issuer,
            Audience: field == "audience" ? "wrong-api" : Audience,
            AuthorizedParty: field == "azp" ? "other-browser" : AuthorizedParty);

        var response = await harness.SendAsync(harness.Token(TenantA, mutation));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData("ID")]
    [InlineData("at+jwt")]
    public async Task Wrong_exact_jose_access_token_type_is_denied(string tokenType)
    {
        await using var harness = await Harness.StartAsync();
        harness.State.Set(Subject, TenantA, ActiveState());

        var response = await harness.SendAsync(harness.Token(
            TenantA, new TokenMutation(JoseTokenType: tokenType)));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Missing_or_duplicate_jose_type_header_is_denied()
    {
        await using var harness = await Harness.StartAsync();
        harness.State.Set(Subject, TenantA, ActiveState());

        var missing = await harness.SendAsync(harness.TokenWithCustomHeader(
            TenantA, "{\"alg\":\"RS256\",\"kid\":\"key-a\"}"));
        var duplicate = await harness.SendAsync(harness.TokenWithCustomHeader(
            TenantA, "{\"alg\":\"RS256\",\"kid\":\"key-a\",\"typ\":\"JWT\",\"typ\":\"JWT\"}"));

        Assert.Equal(HttpStatusCode.Unauthorized, missing.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, duplicate.StatusCode);
    }

    [Fact]
    public async Task Missing_wrong_or_duplicate_keycloak_payload_type_is_denied()
    {
        await using var harness = await Harness.StartAsync();
        harness.State.Set(Subject, TenantA, ActiveState());

        var missing = await harness.SendAsync(harness.TokenWithCustomPayload(
            harness.PayloadJson(TenantA, includePayloadType: false)));
        var wrong = await harness.SendAsync(harness.TokenWithCustomPayload(
            harness.PayloadJson(TenantA, payloadTypeJson: "\"ID\"")));
        var duplicate = await harness.SendAsync(harness.TokenWithCustomPayload(
            harness.PayloadJson(TenantA, payloadTypeJson: "\"Bearer\",\"typ\":\"Bearer\"")));

        Assert.Equal(HttpStatusCode.Unauthorized, missing.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, wrong.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, duplicate.StatusCode);
    }

    [Fact]
    public async Task Bounded_unique_multi_audience_is_allowed_but_duplicate_audience_or_claim_is_denied()
    {
        await using var harness = await Harness.StartAsync();
        harness.State.Set(Subject, TenantA, ActiveState());
        var multiAudiencePayload = harness.PayloadJson(
            TenantA,
            audienceJson: "[\"plant-api\",\"other-api\"]");
        var duplicateAzpPayload = harness.PayloadJson(
            TenantA,
            authorizedPartyJson: "\"joinerytech-portal\",\"azp\":\"other-browser\"");
        var duplicateAudiencePayload = harness.PayloadJson(
            TenantA,
            audienceJson: "[\"plant-api\",\"plant-api\"]");

        var multiAudience = await harness.SendAsync(harness.TokenWithCustomPayload(multiAudiencePayload));
        var duplicateAzp = await harness.SendAsync(harness.TokenWithCustomPayload(duplicateAzpPayload));
        var duplicateAudience = await harness.SendAsync(harness.TokenWithCustomPayload(duplicateAudiencePayload));

        Assert.Equal(HttpStatusCode.OK, multiAudience.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, duplicateAzp.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, duplicateAudience.StatusCode);
    }

    [Theory]
    [InlineData(1, 2)]
    [InlineData(2, 1)]
    public async Task Stale_membership_or_projection_version_is_denied(long currentMembership, long currentProjection)
    {
        await using var harness = await Harness.StartAsync();
        harness.State.Set(Subject, TenantA, ActiveState() with
        {
            MembershipVersion = currentMembership,
            ProjectionVersion = currentProjection,
        });

        var response = await harness.SendAsync(harness.Token(TenantA));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Downgrade_version_bump_rejects_old_token_and_accepts_fresh_projection()
    {
        await using var harness = await Harness.StartAsync();
        harness.State.Set(Subject, TenantA, ActiveState());
        var oldToken = harness.Token(TenantA);
        Assert.Equal(HttpStatusCode.OK, (await harness.SendAsync(oldToken)).StatusCode);

        harness.State.Set(Subject, TenantA, ActiveState("spaceos.qa") with { ProjectionVersion = 2 });
        var stale = await harness.SendAsync(oldToken);
        var fresh = await harness.SendAsync(harness.Token(
            TenantA,
            new TokenMutation(ProjectionVersion: 2, Module: "spaceos.qa")));

        Assert.Equal(HttpStatusCode.Unauthorized, stale.StatusCode);
        Assert.Equal(HttpStatusCode.OK, fresh.StatusCode);
    }

    [Fact]
    public async Task Same_version_but_widened_projection_is_denied_by_online_content_readback()
    {
        await using var harness = await Harness.StartAsync();
        harness.State.Set(Subject, TenantA, ActiveState("spaceos.qa"));

        var response = await harness.SendAsync(harness.Token(TenantA));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData(false, true)]
    [InlineData(true, false)]
    public async Task Tenant_or_membership_deactivation_is_denied(bool tenantActive, bool membershipActive)
    {
        await using var harness = await Harness.StartAsync();
        harness.State.Set(Subject, TenantA, ActiveState() with
        {
            TenantActive = tenantActive,
            MembershipActive = membershipActive,
        });

        var response = await harness.SendAsync(harness.Token(TenantA));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Revocation_cutoff_denies_old_token_but_allows_newly_issued_token()
    {
        await using var harness = await Harness.StartAsync();
        var cutoff = IssuedAt.AddMinutes(5);
        harness.State.Set(Subject, TenantA, ActiveState() with { AcceptTokensIssuedAtOrAfter = cutoff });

        var oldResponse = await harness.SendAsync(harness.Token(TenantA));
        var freshResponse = await harness.SendAsync(harness.Token(
            TenantA,
            new TokenMutation(IssuedAt: cutoff.AddSeconds(1))));

        Assert.Equal(HttpStatusCode.Unauthorized, oldResponse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, freshResponse.StatusCode);
    }

    [Fact]
    public async Task Jwks_rotation_accepts_new_key_then_rejects_removed_and_unknown_kids()
    {
        await using var harness = await Harness.StartAsync();
        harness.State.Set(Subject, TenantA, ActiveState());
        var oldToken = harness.Token(TenantA, signingKey: harness.KeyA);
        Assert.Equal(HttpStatusCode.OK, (await harness.SendAsync(oldToken)).StatusCode);

        harness.Keys.Add(harness.KeyB);
        var newToken = harness.Token(TenantA, signingKey: harness.KeyB);
        Assert.Equal(
            HttpStatusCode.OK,
            await EventuallyStatusAsync(harness, newToken, HttpStatusCode.OK));

        await Task.Delay(TimeSpan.FromMilliseconds(1100));
        harness.Keys.Remove(harness.KeyA.KeyId!);
        var removed = await EventuallyStatusAsync(
            harness,
            oldToken,
            HttpStatusCode.Unauthorized);
        var unknown = await harness.SendAsync(harness.Token(TenantA, signingKey: harness.UnknownKey));

        Assert.Equal(HttpStatusCode.Unauthorized, removed);
        Assert.Equal(HttpStatusCode.Unauthorized, unknown.StatusCode);
    }

    [Fact]
    public async Task Multi_entry_mixed_and_flat_authority_profiles_are_denied()
    {
        await using var harness = await Harness.StartAsync();
        harness.State.Set(Subject, TenantA, ActiveState());
        harness.State.Set(Subject, TenantB, ActiveState(tenantId: TenantB));

        var multi = await harness.SendAsync(harness.Token(
            TenantA, new TokenMutation(SecondTenant: TenantB)));
        var mixed = await harness.SendAsync(harness.Token(
            TenantA, new TokenMutation(IncludeLegacyTid: true)));
        var flat = await harness.SendAsync(harness.Token(
            TenantA, new TokenMutation(OmitNativeAuthority: true, IncludeLegacyTid: true)));

        Assert.Equal(HttpStatusCode.Unauthorized, multi.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, mixed.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, flat.StatusCode);
    }

    [Fact]
    public async Task Raw_object_wire_claim_is_denied_even_though_claim_materialization_uses_objects()
    {
        await using var harness = await Harness.StartAsync();
        harness.State.Set(Subject, TenantA, ActiveState());

        var response = await harness.SendAsync(harness.Token(
            TenantA, new TokenMutation(NativeAuthorityAsObject: true)));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData("string")]
    [InlineData("boolean")]
    [InlineData("zero")]
    public async Task Non_positive_or_non_integer_authority_versions_are_denied(string shape)
    {
        await using var harness = await Harness.StartAsync();
        harness.State.Set(Subject, TenantA, ActiveState());
        object version = shape switch
        {
            "string" => "1",
            "boolean" => true,
            _ => 0L,
        };

        var response = await harness.SendAsync(harness.Token(
            TenantA, new TokenMutation(MembershipVersionValue: version)));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Missing_or_malformed_issued_at_is_denied_by_the_real_bearer_pipeline()
    {
        await using var harness = await Harness.StartAsync();
        harness.State.Set(Subject, TenantA, ActiveState());

        var missing = await harness.SendAsync(harness.TokenWithCustomPayload(
            harness.PayloadJson(TenantA, includeIssuedAt: false)));
        var malformed = await harness.SendAsync(harness.TokenWithCustomPayload(
            harness.PayloadJson(TenantA, issuedAtJson: "\"not-a-unix-second\"")));

        Assert.Equal(HttpStatusCode.Unauthorized, missing.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, malformed.StatusCode);
    }

    [Fact]
    public async Task Non_rs256_token_is_denied_even_with_a_known_key()
    {
        await using var harness = await Harness.StartAsync();
        harness.State.Set(Subject, TenantA, ActiveState());

        var response = await harness.SendAsync(harness.Token(
            TenantA, new TokenMutation(Algorithm: SecurityAlgorithms.RsaSha512)));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData("subject")]
    [InlineData("tenant")]
    public async Task Online_provider_must_echo_the_exact_subject_and_tenant_scope(string mismatch)
    {
        await using var harness = await Harness.StartAsync();
        var state = mismatch == "subject"
            ? ActiveState() with { Subject = "other-subject" }
            : ActiveState() with { TenantId = TenantB };
        harness.State.Set(Subject, TenantA, state);

        var response = await harness.SendAsync(harness.Token(TenantA));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private static OnlineIdentityAuthorityState ActiveState(
        string module = "spaceos.maintenance",
        Guid? tenantId = null) => new(
        Subject: Subject,
        TenantId: tenantId ?? TenantA,
        TenantActive: true,
        MembershipActive: true,
        MembershipVersion: 1,
        ProjectionVersion: 1,
        AcceptTokensIssuedAtOrAfter: IssuedAt.AddMinutes(-1),
        Permissions: new[] { $"{module}.view" },
        EnabledModules: new[] { module });

    private static async Task<HttpStatusCode> EventuallyStatusAsync(
        Harness harness,
        string token,
        HttpStatusCode expected)
    {
        var last = default(HttpStatusCode);
        for (var attempt = 0; attempt < 60; attempt++)
        {
            using var response = await harness.SendAsync(token);
            last = response.StatusCode;
            if (last == expected)
                return last;

            await Task.Delay(TimeSpan.FromMilliseconds(50));
        }

        return last;
    }

    private sealed record TokenMutation(
        string Issuer = CanonicalOidcEndToEndTests.Issuer,
        string Audience = CanonicalOidcEndToEndTests.Audience,
        string AuthorizedParty = CanonicalOidcEndToEndTests.AuthorizedParty,
        long MembershipVersion = 1,
        long ProjectionVersion = 1,
        object? MembershipVersionValue = null,
        DateTimeOffset? IssuedAt = null,
        string Module = "spaceos.maintenance",
        Guid? SecondTenant = null,
        bool IncludeLegacyTid = false,
        bool OmitNativeAuthority = false,
        bool NativeAuthorityAsObject = false,
        string Algorithm = SecurityAlgorithms.RsaSha256,
        string JoseTokenType = "JWT",
        string Subject = CanonicalOidcEndToEndTests.Subject);

    private sealed class Harness : IAsyncDisposable
    {
        private readonly IHost _host;
        private readonly HttpClient _client;
        private readonly FakeOidcAuthority _oidc;

        private Harness(
            IHost host,
            HttpClient client,
            MutableJwksKeyRing keys,
            MutableIdentityStateProvider state,
            RsaSecurityKey keyA,
            RsaSecurityKey keyB,
            RsaSecurityKey unknownKey,
            FakeOidcAuthority oidc)
        {
            _host = host;
            _client = client;
            Keys = keys;
            State = state;
            KeyA = keyA;
            KeyB = keyB;
            UnknownKey = unknownKey;
            _oidc = oidc;
        }

        public MutableJwksKeyRing Keys { get; }
        public MutableIdentityStateProvider State { get; }
        public RsaSecurityKey KeyA { get; }
        public RsaSecurityKey KeyB { get; }
        public RsaSecurityKey UnknownKey { get; }

        public static async Task<Harness> StartAsync(bool registerOnlineProvider = true)
        {
            var oidc = new FakeOidcAuthority();
            var keyA = oidc.SigningKeyForTests(ProtocolSigningKey.A);
            var keyB = oidc.SigningKeyForTests(ProtocolSigningKey.B);
            var unknownKey = oidc.SigningKeyForTests(ProtocolSigningKey.C);
            var keys = new MutableJwksKeyRing(oidc);
            var state = new MutableIdentityStateProvider();
            var authConfiguration = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Jwt:Authority"] = Issuer,
                    ["Jwt:Audience"] = Audience,
                    ["Jwt:AuthorizedParty"] = AuthorizedParty,
                    ["Jwt:TokenType"] = "JWT",
                    ["Jwt:OidcAuthority:RefreshIntervalSeconds"] = "1",
                })
                .Build();

            var host = await new HostBuilder()
                .ConfigureWebHost(web => web
                    .UseTestServer()
                    .ConfigureServices(services =>
                    {
                        services.AddRouting();
                        services.AddSpaceOsModuleTenancy();
                        if (registerOnlineProvider)
                            services.AddSingleton<IOnlineIdentityAuthorityStateProvider>(state);
                        services.AddSpaceOsModuleAuth(
                            authConfiguration,
                            new HostingEnvironment
                            {
                                EnvironmentName = Environments.Production,
                                ApplicationName = OidcAuthorityTransport.TestAssemblyName,
                            });
                        services.AddOidcAuthorityTestTransport(() => oidc.CreateStrictHandler());
                    })
                    .Configure(app =>
                    {
                        app.UseRouting();
                        app.UseAuthentication();
                        app.UseAuthorization();
                        app.UseSpaceOsModuleTenancy();
                        app.UseEndpoints(endpoints => endpoints.MapGet(
                                "/tenant",
                                (ITenantContext tenant) => Results.Ok(new { tenantId = tenant.TenantId }))
                            .RequireAuthorization());
                    }))
                .StartAsync();

            var configurationManager = host.Services.GetRequiredService<StrictOidcConfigurationManager>();
            keys.Attach(configurationManager);
            _ = await configurationManager.GetConfigurationAsync(CancellationToken.None);
            return new Harness(host, host.GetTestClient(), keys, state, keyA, keyB, unknownKey, oidc);
        }

        public string Token(Guid tenantId, TokenMutation? mutation = null, RsaSecurityKey? signingKey = null)
        {
            mutation ??= new TokenMutation();
            signingKey ??= KeyA;
            var issuedAt = mutation.IssuedAt ?? CanonicalOidcEndToEndTests.IssuedAt;
            var tenantEntries = new List<object>
            {
                TenantEntry(tenantId, mutation.Module),
            };
            if (mutation.SecondTenant is { } secondTenant)
                tenantEntries.Add(TenantEntry(secondTenant, mutation.Module));

            var claims = new Dictionary<string, object>
            {
                ["sub"] = mutation.Subject,
                ["azp"] = mutation.AuthorizedParty,
                ["typ"] = "Bearer",
                [TenancyDefaults.MembershipVersionClaim] = mutation.MembershipVersionValue ?? mutation.MembershipVersion,
                [TenancyDefaults.ProjectionVersionClaim] = mutation.ProjectionVersion,
            };
            if (!mutation.OmitNativeAuthority)
            {
                claims[TenancyDefaults.TenantListClaim] = mutation.NativeAuthorityAsObject
                    ? tenantEntries[0]
                    : tenantEntries;
            }
            if (mutation.IncludeLegacyTid)
                claims[TenancyDefaults.TenantIdClaim] = tenantId.ToString("D");

            return new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
            {
                Issuer = mutation.Issuer,
                Audience = mutation.Audience,
                Claims = claims,
                IssuedAt = issuedAt.UtcDateTime,
                NotBefore = issuedAt.AddSeconds(-1).UtcDateTime,
                Expires = issuedAt.AddHours(1).UtcDateTime,
                SigningCredentials = new SigningCredentials(signingKey, mutation.Algorithm),
                TokenType = mutation.JoseTokenType,
            });
        }

        public string TokenWithCustomHeader(Guid tenantId, string headerJson)
        {
            var normal = Token(tenantId);
            var payload = normal.Split('.')[1];
            return SignCompact(Base64UrlEncoder.Encode(Encoding.UTF8.GetBytes(headerJson)), payload);
        }

        public string TokenWithCustomPayload(string payloadJson)
        {
            var normal = Token(TenantA);
            var header = normal.Split('.')[0];
            var payload = Base64UrlEncoder.Encode(Encoding.UTF8.GetBytes(payloadJson));
            return SignCompact(header, payload);
        }

        public string PayloadJson(
            Guid tenantId,
            string? audienceJson = null,
            string? authorizedPartyJson = null,
            string? payloadTypeJson = null,
            bool includePayloadType = true,
            string? issuedAtJson = null,
            bool includeIssuedAt = true)
        {
            audienceJson ??= $"\"{Audience}\"";
            authorizedPartyJson ??= $"\"{AuthorizedParty}\"";
            payloadTypeJson ??= "\"Bearer\"";
            issuedAtJson ??= IssuedAt.ToUnixTimeSeconds().ToString(CultureInfo.InvariantCulture);
            var issuedSeconds = IssuedAt.ToUnixTimeSeconds();
            return "{" +
                   $"\"iss\":\"{Issuer}\"," +
                   $"\"aud\":{audienceJson}," +
                   $"\"sub\":\"{Subject}\"," +
                   $"\"azp\":{authorizedPartyJson}," +
                   (includePayloadType ? $"\"typ\":{payloadTypeJson}," : string.Empty) +
                   $"\"{TenancyDefaults.MembershipVersionClaim}\":1," +
                   $"\"{TenancyDefaults.ProjectionVersionClaim}\":1," +
                   $"\"{TenancyDefaults.TenantListClaim}\":[{{" +
                   $"\"tenant_id\":\"{tenantId:D}\"," +
                   "\"permissions\":[\"spaceos.maintenance.view\"]," +
                   "\"enabled_modules\":[\"spaceos.maintenance\"]}]," +
                   (includeIssuedAt ? $"\"iat\":{issuedAtJson}," : string.Empty) +
                   $"\"nbf\":{issuedSeconds - 1}," +
                   $"\"exp\":{issuedSeconds + 3600}" +
                   "}";
        }

        public async Task<HttpResponseMessage> SendAsync(string token)
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, "/tenant");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            return await _client.SendAsync(request);
        }

        public async ValueTask DisposeAsync()
        {
            _client.Dispose();
            await _host.StopAsync();
            _host.Dispose();
            await _oidc.DisposeAsync();
        }

        private static Dictionary<string, object> TenantEntry(Guid tenantId, string module)
            => new()
            {
                ["tenant_id"] = tenantId.ToString("D").ToLowerInvariant(),
                ["permissions"] = new[] { $"{module}.view" },
                ["enabled_modules"] = new[] { module },
            };

        private string SignCompact(string encodedHeader, string encodedPayload)
        {
            var signingInput = Encoding.ASCII.GetBytes($"{encodedHeader}.{encodedPayload}");
            var signature = KeyA.Rsa.SignData(
                signingInput,
                HashAlgorithmName.SHA256,
                RSASignaturePadding.Pkcs1);
            return $"{encodedHeader}.{encodedPayload}.{Base64UrlEncoder.Encode(signature)}";
        }
    }

    private sealed class MutableJwksKeyRing(FakeOidcAuthority oidc)
    {
        private readonly HashSet<ProtocolSigningKey> _keys = [ProtocolSigningKey.A];
        private StrictOidcConfigurationManager? _manager;

        public void Attach(StrictOidcConfigurationManager manager) => _manager = manager;

        public void Add(SecurityKey key)
        {
            _keys.Add(ToProtocolKey(key.KeyId));
            PublishAndRefresh();
        }

        public void Remove(string keyId)
        {
            _keys.Remove(ToProtocolKey(keyId));
            PublishAndRefresh();
        }

        private void PublishAndRefresh()
        {
            oidc.Publish(_keys.OrderBy(static key => key).ToArray());
            _manager?.RequestRefresh();
        }

        private static ProtocolSigningKey ToProtocolKey(string? keyId)
            => keyId switch
            {
                "key-a" => ProtocolSigningKey.A,
                "key-b" => ProtocolSigningKey.B,
                "key-c" => ProtocolSigningKey.C,
                _ => throw new ArgumentOutOfRangeException(nameof(keyId)),
            };
    }

    private sealed class MutableIdentityStateProvider : IOnlineIdentityAuthorityStateProvider
    {
        private readonly Dictionary<(string Subject, Guid TenantId), OnlineIdentityAuthorityState> _states = new();

        public void Set(string subject, Guid tenantId, OnlineIdentityAuthorityState state)
            => _states[(subject, tenantId)] = state;

        public ValueTask<OnlineIdentityAuthorityState?> GetCurrentAsync(
            string subject,
            Guid tenantId,
            CancellationToken cancellationToken)
        {
            cancellationToken.ThrowIfCancellationRequested();
            return ValueTask.FromResult(_states.GetValueOrDefault((subject, tenantId)));
        }
    }
}
