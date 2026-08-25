using System.Net;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Hosting.Internal;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using SpaceOS.Modules.Hosting.Auth;
using SpaceOS.Modules.Hosting.Tests.Auth.Protocol;
using Xunit;

namespace SpaceOS.Modules.Hosting.Tests.Auth;

public sealed class OidcJwtBearerMutationSafetyTests
{
    private static readonly Guid TenantA = Guid.Parse("11111111-1111-1111-1111-111111111111");

    [Fact]
    public async Task Public_backchannel_overrides_registered_after_auth_are_never_source_trust()
    {
        await using var attacker = new FakeOidcAuthority();
        attacker.Publish(ProtocolSigningKey.C);
        var handlerCalls = 0;
        var clientCalls = 0;
        using var publicHandler = attacker.CreateStrictHandler(
            _ => Interlocked.Increment(ref handlerCalls));
        using var publicClient = new HttpClient(attacker.CreateStrictHandler(
            _ => Interlocked.Increment(ref clientCalls)));

        await using var harness = await CanonicalOidcProtocolHarness.StartAsync(
            configureAfterAuth: services => services.Configure<JwtBearerOptions>(
                JwtBearerDefaults.AuthenticationScheme,
                options =>
                {
                    options.BackchannelHttpHandler = publicHandler;
                    options.Backchannel = publicClient;
                    options.MetadataAddress = FakeOidcAuthority.Issuer
                                              + "/.well-known/openid-configuration";
                }));
        var attackerGrant = ProtocolOidcGrant.Create(
            TenantA,
            signingKey: ProtocolSigningKey.C);
        harness.Oidc.Publish(ProtocolSigningKey.C);
        var attackerToken = await harness.Browser.LoginAsync(attackerGrant);
        harness.Oidc.Publish(ProtocolSigningKey.A);
        harness.Kernel.Set(CanonicalOidcProtocolHarness.ActiveState(attackerGrant));

        using var response = await harness.SendAsync(attackerToken);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.IsType<StrictOidcConfigurationManager>(harness.JwtOptions.ConfigurationManager);
        Assert.Same(publicHandler, harness.JwtOptions.BackchannelHttpHandler);
        Assert.Same(publicClient, harness.JwtOptions.Backchannel);
        Assert.Equal(0, handlerCalls);
        Assert.Equal(0, clientCalls);
        Assert.Equal(0, harness.Kernel.RequestCount);
    }

    [Theory]
    [InlineData("configuration-manager")]
    [InlineData("signing-key")]
    [InlineData("signing-keys")]
    [InlineData("resolver")]
    [InlineData("signature-validator")]
    [InlineData("algorithm")]
    [InlineData("type")]
    [InlineData("issuer")]
    [InlineData("audience")]
    [InlineData("lifetime")]
    [InlineData("lkg")]
    [InlineData("events")]
    [InlineData("same-events-message")]
    [InlineData("same-events-token-validated")]
    [InlineData("same-events-challenge")]
    [InlineData("same-events-forbidden")]
    [InlineData("token-handler")]
    [InlineData("handler-map")]
    [InlineData("crypto-factory")]
    [InlineData("crypto-provider")]
    [InlineData("crypto-cache-policy")]
    [InlineData("type-validator")]
    [InlineData("token-reader")]
    [InlineData("transform-before-signature")]
    [InlineData("algorithm-validator")]
    [InlineData("audience-validator")]
    [InlineData("issuer-validator")]
    [InlineData("issuer-validator-configuration")]
    [InlineData("signing-key-validator")]
    [InlineData("signing-key-validator-configuration")]
    [InlineData("lifetime-validator")]
    [InlineData("replay-validator")]
    [InlineData("name-retriever")]
    [InlineData("role-retriever")]
    [InlineData("resolver-configuration")]
    [InlineData("signature-validator-configuration")]
    [InlineData("decryption-key-resolver")]
    [InlineData("name-claim-type")]
    [InlineData("role-claim-type")]
    [InlineData("save-token")]
    [InlineData("include-error-details")]
    [InlineData("include-token-failure")]
    [InlineData("save-signin-token")]
    [InlineData("try-all-signing-keys")]
    public async Task Runtime_trust_profile_mutation_denies_before_Kernel(string mutation)
    {
        await using var harness = await CanonicalOidcProtocolHarness.StartAsync();
        var grant = ProtocolOidcGrant.Create(TenantA);
        harness.Kernel.Set(CanonicalOidcProtocolHarness.ActiveState(grant));
        var token = await harness.Browser.LoginAsync(grant);
        var attackerKey = harness.Oidc.SigningKeyForTests(ProtocolSigningKey.C);
        Mutate(harness.JwtOptions, mutation, attackerKey);

        using var response = await harness.SendAsync(token);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal(0, harness.Kernel.RequestCount);
    }

    [Fact]
    public async Task Late_public_clock_skew_widening_is_denied_before_Kernel()
    {
        await using var harness = await CanonicalOidcProtocolHarness.StartAsync();
        var grant = ProtocolOidcGrant.Create(TenantA);
        harness.Kernel.Set(CanonicalOidcProtocolHarness.ActiveState(grant));
        var token = await harness.Browser.LoginAsync(grant);

        harness.JwtOptions.TokenValidationParameters.ClockSkew = TimeSpan.FromMinutes(5);

        using var response = await harness.SendAsync(token);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal(0, harness.Kernel.RequestCount);
    }

    [Fact]
    public async Task Midflight_public_event_mutation_is_inert_and_next_request_detects_drift()
    {
        await using var harness = await CanonicalOidcProtocolHarness.StartAsync();
        var grant = ProtocolOidcGrant.Create(TenantA);
        harness.Kernel.Set(CanonicalOidcProtocolHarness.ActiveState(grant));
        var token = await harness.Browser.LoginAsync(grant);
        var entered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var release = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        harness.Oidc.BeforeJwksResponseAsync = async cancellationToken =>
        {
            entered.TrySetResult();
            await release.Task.WaitAsync(cancellationToken).ConfigureAwait(false);
        };
        var publicDelegateCalls = 0;

        var request = harness.SendAsync(token);
        await entered.Task.WaitAsync(TimeSpan.FromSeconds(2));
        InstallPublicEventMutations(
            harness.JwtOptions,
            () => Interlocked.Increment(ref publicDelegateCalls));
        release.TrySetResult();
        using var response = await request;

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(0, publicDelegateCalls);
        Assert.Equal(1, harness.Kernel.RequestCount);

        using var nextResponse = await harness.SendAsync(token);
        Assert.Equal(HttpStatusCode.Unauthorized, nextResponse.StatusCode);
        Assert.Equal(0, publicDelegateCalls);
        Assert.Equal(1, harness.Kernel.RequestCount);
    }

    [Fact]
    public async Task Midflight_public_trust_mutation_cannot_reach_request_private_forged_validation()
    {
        await using var harness = await CanonicalOidcProtocolHarness.StartAsync();
        var grant = ProtocolOidcGrant.Create(TenantA, signingKey: ProtocolSigningKey.C);
        harness.Kernel.Set(CanonicalOidcProtocolHarness.ActiveState(grant));
        var forged = harness.Oidc.CreateAccessTokenForTests(grant, keyIdOverride: "key-a");
        var entered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var release = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        harness.Oidc.BeforeJwksResponseAsync = async cancellationToken =>
        {
            entered.TrySetResult();
            await release.Task.WaitAsync(cancellationToken).ConfigureAwait(false);
        };
        var publicDelegateCalls = 0;
        var cryptoProvider = new AlwaysValidCryptoProvider();

        var request = harness.InspectAuthenticationAsync(forged);
        await entered.Task.WaitAsync(TimeSpan.FromSeconds(2));
        harness.JwtOptions.TokenValidationParameters.ValidAlgorithms =
            [SecurityAlgorithms.RsaSha256, SecurityAlgorithms.None];
        harness.JwtOptions.TokenValidationParameters.ValidTypes = ["JWT", "at+jwt"];
        harness.JwtOptions.TokenValidationParameters.CryptoProviderFactory =
            new CryptoProviderFactory { CustomCryptoProvider = cryptoProvider };
        harness.JwtOptions.TokenValidationParameters.IncludeTokenOnFailedValidation = true;
        harness.JwtOptions.TokenValidationParameters.SaveSigninToken = true;
        harness.JwtOptions.TokenValidationParameters.TryAllIssuerSigningKeys = true;
        harness.JwtOptions.TokenHandlers.Clear();
        harness.JwtOptions.TokenHandlers.Add(new JsonWebTokenHandler { MapInboundClaims = true });
        harness.JwtOptions.SaveToken = true;
        InstallPublicEventMutations(
            harness.JwtOptions,
            () => Interlocked.Increment(ref publicDelegateCalls));
        release.TrySetResult();
        using var response = await request;
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("\"succeeded\":false", body, StringComparison.Ordinal);
        Assert.Contains("\"hasBootstrapContext\":false", body, StringComparison.Ordinal);
        Assert.Contains("\"hasStoredToken\":false", body, StringComparison.Ordinal);
        Assert.DoesNotContain(forged, body, StringComparison.Ordinal);
        Assert.Equal(0, publicDelegateCalls);
        Assert.Equal(0, cryptoProvider.Calls);
        Assert.Equal(0, harness.Kernel.RequestCount);

        using var nextResponse = await harness.SendAsync(forged);
        Assert.Equal(HttpStatusCode.Unauthorized, nextResponse.StatusCode);
        Assert.Equal(0, harness.Kernel.RequestCount);
    }

    [Fact]
    public async Task Late_EventsType_bypass_is_denied_by_source_handler_before_Kernel()
    {
        await using var harness = await CanonicalOidcProtocolHarness.StartAsync(
            configureAfterAuth: services => services.AddSingleton<AttackerJwtBearerEvents>());
        var grant = ProtocolOidcGrant.Create(TenantA);
        harness.Kernel.Set(CanonicalOidcProtocolHarness.ActiveState(grant));
        var token = await harness.Browser.LoginAsync(grant);
        harness.JwtOptions.EventsType = typeof(AttackerJwtBearerEvents);

        using var response = await harness.SendAsync(token);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal(0, harness.Kernel.RequestCount);
    }

    [Fact]
    public async Task Always_valid_crypto_provider_cannot_reach_a_forged_signature()
    {
        await using var harness = await CanonicalOidcProtocolHarness.StartAsync();
        var grant = ProtocolOidcGrant.Create(TenantA);
        harness.Kernel.Set(CanonicalOidcProtocolHarness.ActiveState(grant));
        var token = await harness.Browser.LoginAsync(grant);
        var provider = new AlwaysValidCryptoProvider();
        harness.JwtOptions.TokenValidationParameters.CryptoProviderFactory =
            new CryptoProviderFactory { CustomCryptoProvider = provider };
        var segments = token.Split('.');
        var forged = string.Join(
            '.',
            segments[0],
            segments[1],
            Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(256)));

        using var response = await harness.SendAsync(forged);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal(0, provider.Calls);
        Assert.Equal(0, harness.Kernel.RequestCount);
    }

    [Fact]
    public async Task Returned_configuration_snapshots_never_alias_the_private_cache_or_each_other()
    {
        await using var harness = await CanonicalOidcProtocolHarness.StartAsync();
        var manager = Assert.IsType<StrictOidcConfigurationManager>(
            harness.JwtOptions.ConfigurationManager);
        var snapshots = await Task.WhenAll(Enumerable.Range(0, 4)
            .Select(_ => manager.GetConfigurationAsync(CancellationToken.None)));
        Assert.All(snapshots, snapshot =>
        {
            Assert.All(snapshot.SigningKeys, signingKey =>
                Assert.DoesNotContain(snapshot.JsonWebKeySet.Keys, jwk =>
                    ReferenceEquals(jwk, signingKey)));
        });
        for (var left = 0; left < snapshots.Length; left++)
        {
            for (var right = left + 1; right < snapshots.Length; right++)
            {
                Assert.NotSame(snapshots[left], snapshots[right]);
                Assert.NotSame(snapshots[left].JsonWebKeySet, snapshots[right].JsonWebKeySet);
                Assert.All(snapshots[left].JsonWebKeySet!.Keys, key =>
                    Assert.DoesNotContain(snapshots[right].JsonWebKeySet!.Keys, other =>
                        ReferenceEquals(key, other)));
                Assert.All(snapshots[left].SigningKeys, key =>
                    Assert.DoesNotContain(snapshots[right].SigningKeys, other =>
                        ReferenceEquals(key, other)));
            }
        }

        var attackerKey = harness.Oidc.SigningKeyForTests(ProtocolSigningKey.C);
        snapshots[0].Issuer = "https://substituted.protocol.test/realms/spaceos";
        snapshots[0].JsonWebKeySet!.Keys.Clear();
        snapshots[0].JsonWebKeySet.Keys.Add(JsonWebKeyConverter.ConvertFromRSASecurityKey(attackerKey));
        snapshots[0].SigningKeys.Clear();
        snapshots[0].SigningKeys.Add(attackerKey);

        var clean = await manager.GetConfigurationAsync(CancellationToken.None);
        Assert.Equal(FakeOidcAuthority.Issuer, clean.Issuer);
        Assert.Equal(["key-a"], clean.JsonWebKeySet!.Keys.Select(static key => key.Kid));
        Assert.Equal(["key-a"], clean.SigningKeys.Select(static key => key.KeyId));
        var baseSnapshot = await manager.GetBaseConfigurationAsync(CancellationToken.None);
        Assert.NotSame(clean, baseSnapshot);
        Assert.NotSame(clean.SigningKeys.Single(), baseSnapshot.SigningKeys.Single());

        var attackerGrant = ProtocolOidcGrant.Create(TenantA, signingKey: ProtocolSigningKey.C);
        harness.Kernel.Set(CanonicalOidcProtocolHarness.ActiveState(attackerGrant));
        using var response = await harness.SendAsync(
            harness.Oidc.CreateAccessTokenForTests(attackerGrant));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal(0, harness.Kernel.RequestCount);
    }

    [Fact]
    public async Task Disabled_signature_provider_cache_ignores_an_injected_always_valid_provider()
    {
        await using var harness = await CanonicalOidcProtocolHarness.StartAsync();
        var manager = Assert.IsType<StrictOidcConfigurationManager>(
            harness.JwtOptions.ConfigurationManager);
        var configuration = await manager.GetConfigurationAsync(CancellationToken.None);
        var legitimateKey = Assert.Single(configuration.SigningKeys);
        Assert.Null(harness.JwtOptions.TokenValidationParameters.CryptoProviderFactory);
        Assert.False(legitimateKey.CryptoProviderFactory.CacheSignatureProviders);
        var cryptoFactory = new CryptoProviderFactory { CacheSignatureProviders = true };
        var maliciousProvider = new AlwaysValidSignatureProvider(
            legitimateKey,
            SecurityAlgorithms.RsaSha256)
        {
            CryptoProviderCache = cryptoFactory.CryptoProviderCache,
        };
        Assert.True(cryptoFactory.CryptoProviderCache.TryAdd(maliciousProvider));
        harness.JwtOptions.TokenValidationParameters.CryptoProviderFactory = cryptoFactory;

        var attackerGrant = ProtocolOidcGrant.Create(TenantA, signingKey: ProtocolSigningKey.C);
        harness.Kernel.Set(CanonicalOidcProtocolHarness.ActiveState(attackerGrant));
        var forged = harness.Oidc.CreateAccessTokenForTests(attackerGrant, keyIdOverride: "key-a");
        using var response = await harness.SendAsync(forged);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal(0, maliciousProvider.VerifyCalls);
        Assert.Equal(0, harness.Kernel.RequestCount);
        Assert.True(cryptoFactory.CryptoProviderCache.TryRemove(maliciousProvider));
        maliciousProvider.Dispose();
    }

    [Fact]
    public async Task Source_profile_never_retains_returns_or_logs_the_raw_bearer()
    {
        var logs = new CapturingLoggerProvider();
        await using var harness = await CanonicalOidcProtocolHarness.StartAsync(
            configureAfterAuth: services => services.AddSingleton<ILoggerProvider>(logs));
        var grant = ProtocolOidcGrant.Create(TenantA);
        harness.Kernel.Set(CanonicalOidcProtocolHarness.ActiveState(grant));
        var token = await harness.Browser.LoginAsync(grant);

        using var accepted = await harness.InspectAuthenticationAsync(token);
        var acceptedBody = await accepted.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, accepted.StatusCode);
        Assert.Contains("\"succeeded\":true", acceptedBody, StringComparison.Ordinal);
        Assert.Contains("\"hasBootstrapContext\":false", acceptedBody, StringComparison.Ordinal);
        Assert.Contains("\"hasStoredToken\":false", acceptedBody, StringComparison.Ordinal);
        Assert.DoesNotContain(token, acceptedBody, StringComparison.Ordinal);

        var segments = token.Split('.');
        var forged = string.Join(
            '.',
            segments[0],
            segments[1],
            Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(256)));
        using var denied = await harness.InspectAuthenticationAsync(forged);
        var deniedBody = await denied.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, denied.StatusCode);
        Assert.Contains("\"succeeded\":false", deniedBody, StringComparison.Ordinal);
        Assert.Contains("\"hasBootstrapContext\":false", deniedBody, StringComparison.Ordinal);
        Assert.Contains("\"hasStoredToken\":false", deniedBody, StringComparison.Ordinal);
        Assert.DoesNotContain(forged, deniedBody, StringComparison.Ordinal);
        Assert.DoesNotContain(logs.Messages, message =>
            message.Contains(token, StringComparison.Ordinal)
            || message.Contains(forged, StringComparison.Ordinal));
        Assert.Equal(1, harness.Kernel.RequestCount);
    }

    [Fact]
    public async Task Pinned_fake_authority_without_internal_marker_fails_before_public_transport()
    {
        await using var attacker = new FakeOidcAuthority();
        var calls = 0;
        using var publicHandler = attacker.CreateStrictHandler(
            _ => Interlocked.Increment(ref calls));
        using var publicClient = new HttpClient(attacker.CreateStrictHandler(
            _ => Interlocked.Increment(ref calls)));
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(CanonicalOidcProtocolHarness.ConfigurationValues())
            .Build();
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSpaceOsModuleAuth(configuration, ProductionTestEnvironment());
        services.Configure<JwtBearerOptions>(
            JwtBearerDefaults.AuthenticationScheme,
            options =>
            {
                options.BackchannelHttpHandler = publicHandler;
                options.Backchannel = publicClient;
            });
        using var provider = services.BuildServiceProvider();

        var exception = Assert.Throws<InvalidOperationException>(() => provider
            .GetRequiredService<IOptionsMonitor<JwtBearerOptions>>()
            .Get(JwtBearerDefaults.AuthenticationScheme));

        Assert.Contains("requires the friend-test transport marker", exception.Message, StringComparison.Ordinal);
        Assert.Equal(0, calls);
    }

    private static void Mutate(
        JwtBearerOptions options,
        string mutation,
        SecurityKey attackerKey)
    {
        switch (mutation)
        {
            case "configuration-manager":
                var configuration = new OpenIdConnectConfiguration
                {
                    Issuer = FakeOidcAuthority.Issuer,
                };
                configuration.SigningKeys.Add(attackerKey);
                options.ConfigurationManager = new FabricatedOidcConfigurationManager(configuration);
                break;
            case "signing-key":
                options.TokenValidationParameters.IssuerSigningKey = attackerKey;
                break;
            case "signing-keys":
                options.TokenValidationParameters.IssuerSigningKeys = [attackerKey];
                break;
            case "resolver":
                options.TokenValidationParameters.IssuerSigningKeyResolver =
                    (_, _, _, _) => [attackerKey];
                break;
            case "signature-validator":
                options.TokenValidationParameters.SignatureValidator =
                    (encoded, _) => new JsonWebToken(encoded);
                break;
            case "algorithm":
                options.TokenValidationParameters.ValidAlgorithms = [SecurityAlgorithms.None];
                break;
            case "type":
                options.TokenValidationParameters.ValidTypes = ["at+jwt"];
                break;
            case "issuer":
                options.TokenValidationParameters.ValidIssuer = "https://substituted.example.test";
                break;
            case "audience":
                options.TokenValidationParameters.ValidAudience = "substituted-api";
                break;
            case "lifetime":
                options.TokenValidationParameters.ValidateLifetime = false;
                break;
            case "lkg":
                options.TokenValidationParameters.ValidateWithLKG = true;
                break;
            case "events":
                options.Events = new JwtBearerEvents
                {
                    OnChallenge = context =>
                    {
                        context.HandleResponse();
                        context.Response.StatusCode = StatusCodes.Status204NoContent;
                        return Task.CompletedTask;
                    },
                };
                break;
            case "same-events-message":
                options.Events.OnMessageReceived = _ => Task.CompletedTask;
                break;
            case "same-events-token-validated":
                options.Events.OnTokenValidated = _ => Task.CompletedTask;
                break;
            case "same-events-challenge":
                options.Events.OnChallenge = context =>
                {
                    context.HandleResponse();
                    context.Response.StatusCode = StatusCodes.Status204NoContent;
                    return Task.CompletedTask;
                };
                break;
            case "same-events-forbidden":
                options.Events.OnForbidden = context =>
                {
                    context.Response.StatusCode = StatusCodes.Status204NoContent;
                    return Task.CompletedTask;
                };
                break;
            case "token-handler":
                options.TokenHandlers.Clear();
                options.TokenHandlers.Add(new JsonWebTokenHandler { MapInboundClaims = false });
                break;
            case "handler-map":
                ((JsonWebTokenHandler)options.TokenHandlers.Single()).MapInboundClaims = true;
                break;
            case "crypto-factory":
                options.TokenValidationParameters.CryptoProviderFactory = new CryptoProviderFactory();
                break;
            case "crypto-provider":
                options.TokenValidationParameters.CryptoProviderFactory = new CryptoProviderFactory
                {
                    CustomCryptoProvider = new AlwaysValidCryptoProvider(),
                };
                break;
            case "crypto-cache-policy":
                options.TokenValidationParameters.CryptoProviderFactory = new CryptoProviderFactory
                {
                    CacheSignatureProviders = true,
                };
                break;
            case "type-validator":
                options.TokenValidationParameters.TypeValidator = (type, _, _) => type;
                break;
            case "token-reader":
                options.TokenValidationParameters.TokenReader = (encoded, _) => new JsonWebToken(encoded);
                break;
            case "transform-before-signature":
                options.TokenValidationParameters.TransformBeforeSignatureValidation = (token, _) => token;
                break;
            case "algorithm-validator":
                options.TokenValidationParameters.AlgorithmValidator = (_, _, _, _) => true;
                break;
            case "audience-validator":
                options.TokenValidationParameters.AudienceValidator = (_, _, _) => true;
                break;
            case "issuer-validator":
                options.TokenValidationParameters.IssuerValidator = (issuer, _, _) => issuer;
                break;
            case "issuer-validator-configuration":
                options.TokenValidationParameters.IssuerValidatorUsingConfiguration = (issuer, _, _, _) => issuer;
                break;
            case "signing-key-validator":
                options.TokenValidationParameters.IssuerSigningKeyValidator = (_, _, _) => true;
                break;
            case "signing-key-validator-configuration":
                options.TokenValidationParameters.IssuerSigningKeyValidatorUsingConfiguration = (_, _, _, _) => true;
                break;
            case "lifetime-validator":
                options.TokenValidationParameters.LifetimeValidator = (_, _, _, _) => true;
                break;
            case "replay-validator":
                options.TokenValidationParameters.TokenReplayValidator = (_, _, _) => true;
                break;
            case "name-retriever":
                options.TokenValidationParameters.NameClaimTypeRetriever = (_, _) => "sub";
                break;
            case "role-retriever":
                options.TokenValidationParameters.RoleClaimTypeRetriever = (_, _) => "role";
                break;
            case "resolver-configuration":
                options.TokenValidationParameters.IssuerSigningKeyResolverUsingConfiguration =
                    (_, _, _, _, _) => [attackerKey];
                break;
            case "signature-validator-configuration":
                options.TokenValidationParameters.SignatureValidatorUsingConfiguration =
                    (encoded, _, _) => new JsonWebToken(encoded);
                break;
            case "decryption-key-resolver":
                options.TokenValidationParameters.TokenDecryptionKeyResolver = (_, _, _, _) => [attackerKey];
                break;
            case "name-claim-type":
                options.TokenValidationParameters.NameClaimType = "sub";
                break;
            case "role-claim-type":
                options.TokenValidationParameters.RoleClaimType = "role";
                break;
            case "save-token":
                options.SaveToken = true;
                break;
            case "include-error-details":
                options.IncludeErrorDetails = true;
                break;
            case "include-token-failure":
                options.TokenValidationParameters.IncludeTokenOnFailedValidation = true;
                break;
            case "save-signin-token":
                options.TokenValidationParameters.SaveSigninToken = true;
                break;
            case "try-all-signing-keys":
                options.TokenValidationParameters.TryAllIssuerSigningKeys = true;
                break;
            default:
                throw new ArgumentOutOfRangeException(nameof(mutation));
        }
    }

    private static void InstallPublicEventMutations(
        JwtBearerOptions options,
        Action onCall)
    {
        options.Events.OnMessageReceived = _ =>
        {
            onCall();
            return Task.CompletedTask;
        };
        options.Events.OnTokenValidated = _ =>
        {
            onCall();
            return Task.CompletedTask;
        };
        options.Events.OnChallenge = context =>
        {
            onCall();
            context.HandleResponse();
            context.Response.StatusCode = StatusCodes.Status204NoContent;
            return Task.CompletedTask;
        };
        options.Events.OnForbidden = context =>
        {
            onCall();
            context.Response.StatusCode = StatusCodes.Status204NoContent;
            return Task.CompletedTask;
        };
    }

    private static IHostEnvironment ProductionTestEnvironment()
        => new HostingEnvironment
        {
            EnvironmentName = Environments.Production,
            ApplicationName = OidcAuthorityTransport.TestAssemblyName,
        };

    private sealed class FabricatedOidcConfigurationManager(OpenIdConnectConfiguration configuration)
        : IConfigurationManager<OpenIdConnectConfiguration>
    {
        public Task<OpenIdConnectConfiguration> GetConfigurationAsync(CancellationToken cancel)
        {
            cancel.ThrowIfCancellationRequested();
            return Task.FromResult(configuration);
        }

        public void RequestRefresh()
        {
        }
    }

    private sealed class AttackerJwtBearerEvents : JwtBearerEvents
    {
        public AttackerJwtBearerEvents()
        {
            OnChallenge = context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = StatusCodes.Status204NoContent;
                return Task.CompletedTask;
            };
        }
    }

    private sealed class AlwaysValidCryptoProvider : ICryptoProvider
    {
        private int _calls;

        public int Calls => Volatile.Read(ref _calls);

        public bool IsSupportedAlgorithm(string algorithm, params object[] args)
        {
            Interlocked.Increment(ref _calls);
            return true;
        }

        public object Create(string algorithm, params object[] args)
        {
            Interlocked.Increment(ref _calls);
            var key = args.OfType<SecurityKey>().First();
            return new AlwaysValidSignatureProvider(key, algorithm);
        }

        public void Release(object cryptoInstance)
        {
            Interlocked.Increment(ref _calls);
            if (cryptoInstance is IDisposable disposable)
                disposable.Dispose();
        }
    }

    private sealed class AlwaysValidSignatureProvider : AsymmetricSignatureProvider
    {
        private int _verifyCalls;

        internal AlwaysValidSignatureProvider(SecurityKey key, string algorithm)
            : base(key, algorithm, willCreateSignatures: false)
        {
        }

        internal int VerifyCalls => Volatile.Read(ref _verifyCalls);

        public override byte[] Sign(byte[] input) => throw new NotSupportedException();

        public override bool Verify(byte[] input, byte[] signature)
        {
            Interlocked.Increment(ref _verifyCalls);
            return true;
        }

        public override bool Verify(
            byte[] input,
            int inputOffset,
            int inputLength,
            byte[] signature,
            int signatureOffset,
            int signatureLength)
        {
            Interlocked.Increment(ref _verifyCalls);
            return true;
        }

        protected override void Dispose(bool disposing)
        {
        }
    }

    private sealed class CapturingLoggerProvider : ILoggerProvider
    {
        private readonly System.Collections.Concurrent.ConcurrentQueue<string> _messages = new();

        internal IReadOnlyCollection<string> Messages => _messages.ToArray();

        public ILogger CreateLogger(string categoryName) => new CapturingLogger(_messages);

        public void Dispose()
        {
        }

        private sealed class CapturingLogger(
            System.Collections.Concurrent.ConcurrentQueue<string> messages) : ILogger
        {
            public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

            public bool IsEnabled(LogLevel logLevel) => true;

            public void Log<TState>(
                LogLevel logLevel,
                EventId eventId,
                TState state,
                Exception? exception,
                Func<TState, Exception?, string> formatter)
            {
                messages.Enqueue(formatter(state, exception));
                if (exception is not null)
                    messages.Enqueue(exception.ToString());
            }
        }
    }
}
