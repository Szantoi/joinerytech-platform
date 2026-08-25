using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Hosting;
using System.Security.Cryptography;
using System.Text.Json;

namespace SpaceOS.Modules.Hosting.Auth;

/// <summary>
/// Fail-closed facade over the real IdentityModel configuration manager. Network retrieval,
/// refresh-on-unknown-kid and caching remain IdentityModel behavior; this facade removes LKG
/// fallback and enforces a source-pinned maximum age for the last fully validated configuration.
/// </summary>
internal sealed class StrictOidcConfigurationManager :
    BaseConfigurationManager,
    IConfigurationManager<OpenIdConnectConfiguration>,
    IDisposable
{
    private readonly HttpClient _sourceOwnedBackchannel;
    private readonly OidcAuthorityRuntimeState _runtimeState;
    private readonly TimeSpan _maximumConfigurationAge;
    private readonly string _expectedMetadataAddress;
    private readonly TimeSpan _expectedAutomaticRefreshInterval;
    private readonly TimeSpan _expectedRefreshInterval;
    private readonly ConfigurationManager<OpenIdConnectConfiguration> _inner;
    private bool _disposed;

    internal StrictOidcConfigurationManager(
        string metadataAddress,
        string expectedIssuer,
        OidcAuthoritySecurityOptions options,
        OidcAuthorityRuntimeState runtimeState,
        IHostEnvironment environment,
        OidcAuthorityTestTransportOverride? testTransport)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(metadataAddress);
        ArgumentException.ThrowIfNullOrWhiteSpace(expectedIssuer);
        ArgumentNullException.ThrowIfNull(options);
        ArgumentNullException.ThrowIfNull(runtimeState);
        ArgumentNullException.ThrowIfNull(environment);

        var authority = new Uri(expectedIssuer, UriKind.Absolute);
        _sourceOwnedBackchannel = OidcAuthorityTransport.CreateHttpClient(
            expectedIssuer,
            options,
            environment,
            testTransport);
        var documents = new BoundedOidcDocumentRetriever(
            _sourceOwnedBackchannel,
            authority,
            options.MaximumDocumentBytes);
        var retriever = new StrictOidcConfigurationRetriever(
            expectedIssuer,
            options.MaximumSigningKeys,
            runtimeState);
        _inner = new ConfigurationManager<OpenIdConnectConfiguration>(
            metadataAddress,
            retriever,
            documents)
        {
            AutomaticRefreshInterval = TimeSpan.FromMinutes(options.AutomaticRefreshIntervalMinutes),
            RefreshInterval = TimeSpan.FromSeconds(options.RefreshIntervalSeconds),
            UseLastKnownGoodConfiguration = false,
        };
        MetadataAddress = metadataAddress;
        AutomaticRefreshInterval = _inner.AutomaticRefreshInterval;
        RefreshInterval = _inner.RefreshInterval;
        UseLastKnownGoodConfiguration = false;
        _expectedMetadataAddress = metadataAddress;
        _expectedAutomaticRefreshInterval = _inner.AutomaticRefreshInterval;
        _expectedRefreshInterval = _inner.RefreshInterval;
        _runtimeState = runtimeState;
        _maximumConfigurationAge = TimeSpan.FromSeconds(options.MaximumConfigurationAgeSeconds);
    }

    internal bool UsesRealIdentityModelConfigurationManager
        => _inner.GetType() == typeof(ConfigurationManager<OpenIdConnectConfiguration>);

    internal bool InnerLastKnownGoodDisabled => !_inner.UseLastKnownGoodConfiguration;

    internal bool HasExactSourceOwnedRuntimeContract()
        => !_disposed
           && !UseLastKnownGoodConfiguration
           && UsesRealIdentityModelConfigurationManager
           && InnerLastKnownGoodDisabled
           && string.Equals(MetadataAddress, _expectedMetadataAddress, StringComparison.Ordinal)
           && string.Equals(_inner.MetadataAddress, _expectedMetadataAddress, StringComparison.Ordinal)
           && AutomaticRefreshInterval == _expectedAutomaticRefreshInterval
           && _inner.AutomaticRefreshInterval == _expectedAutomaticRefreshInterval
           && RefreshInterval == _expectedRefreshInterval
           && _inner.RefreshInterval == _expectedRefreshInterval;

    /// <inheritdoc />
    public async Task<OpenIdConnectConfiguration> GetConfigurationAsync(CancellationToken cancel)
    {
        var configuration = await _inner.GetConfigurationAsync(cancel).ConfigureAwait(false);
        if (HasFreshValidatedConfiguration())
            return CreateDefensiveSnapshot(configuration);

        // A cached configuration never extends freshness. Trigger a real network refresh, but
        // fail this authorization until the tracking retriever records a full parsed success.
        _inner.RequestRefresh();
        _ = await _inner.GetConfigurationAsync(cancel).ConfigureAwait(false);
        if (!HasFreshValidatedConfiguration())
        {
            throw new InvalidOperationException(
                "The OIDC discovery/JWKS configuration exceeded its maximum trusted age.");
        }

        configuration = await _inner.GetConfigurationAsync(cancel).ConfigureAwait(false);
        return CreateDefensiveSnapshot(configuration);
    }

    /// <inheritdoc />
    public override async Task<BaseConfiguration> GetBaseConfigurationAsync(CancellationToken cancel)
        => await GetConfigurationAsync(cancel).ConfigureAwait(false);

    /// <inheritdoc />
    public override void RequestRefresh() => _inner.RequestRefresh();

    public void Dispose()
    {
        if (_disposed)
            return;

        _disposed = true;
        _sourceOwnedBackchannel.Dispose();
    }

    private bool HasFreshValidatedConfiguration()
    {
        var success = _runtimeState.GetSnapshot().LastSuccessfulConfigurationAt;
        if (success is not { } timestamp)
            return false;

        var age = _runtimeState.UtcNow - timestamp;
        return age >= TimeSpan.Zero && age <= _maximumConfigurationAge;
    }

    private static OpenIdConnectConfiguration CreateDefensiveSnapshot(
        OpenIdConnectConfiguration source)
    {
        var snapshot = OpenIdConnectConfiguration.Create(
            OpenIdConnectConfiguration.Write(source));
        snapshot.SigningKeys.Clear();
        snapshot.TokenDecryptionKeys.Clear();

        var sourceJwks = source.JsonWebKeySet
            ?? throw new InvalidOperationException(
                "The validated OIDC configuration lost its JWKS before snapshot creation.");
        snapshot.JsonWebKeySet = CloneJsonWebKeySet(sourceJwks);

        // Build the trust keys directly from the validated canonical RSA N/E values. Ancillary
        // public JWK certificate metadata may remain visible in the raw defensive JWKS, but can
        // never replace N/E as the signature-verification material. The SigningKeys collection
        // therefore shares no mutable key or crypto-factory reference with either raw JWKS copy
        // or IdentityModel's private cached configuration.
        foreach (var jsonWebKey in sourceJwks.Keys.Where(
                     static key => StrictOidcConfigurationRetriever.HasExactRsaSigningProfile(key)))
        {
            snapshot.SigningKeys.Add(
                StrictOidcConfigurationRetriever.CreateExactRsaSigningKey(jsonWebKey));
        }

        var expectedSigningKeyCount = sourceJwks.Keys.Count(
            static key => StrictOidcConfigurationRetriever.HasExactRsaSigningProfile(key));
        if (snapshot.SigningKeys.Count != expectedSigningKeyCount)
        {
            throw new InvalidOperationException(
                "The defensive OIDC snapshot did not preserve the validated signing-key set.");
        }

        return snapshot;
    }

    private static JsonWebKeySet CloneJsonWebKeySet(JsonWebKeySet source)
    {
        var clone = new JsonWebKeySet
        {
            SkipUnresolvedJsonWebKeys = source.SkipUnresolvedJsonWebKeys,
        };
        CloneAdditionalData(source.AdditionalData, clone.AdditionalData);
        foreach (var key in source.Keys)
            clone.Keys.Add(CloneJsonWebKey(key));
        return clone;
    }

    private static JsonWebKey CloneJsonWebKey(JsonWebKey source)
    {
        var clone = new JsonWebKey
        {
            Alg = source.Alg,
            Crv = source.Crv,
            D = source.D,
            DP = source.DP,
            DQ = source.DQ,
            E = source.E,
            K = source.K,
            KeyId = source.KeyId,
            Kid = source.Kid,
            Kty = source.Kty,
            N = source.N,
            P = source.P,
            Q = source.Q,
            QI = source.QI,
            Use = source.Use,
            X = source.X,
            X5t = source.X5t,
            X5tS256 = source.X5tS256,
            X5u = source.X5u,
            Y = source.Y,
            CryptoProviderFactory = CreateKeyCryptoProviderFactory(),
        };
        foreach (var operation in source.KeyOps)
            clone.KeyOps.Add(operation);
        foreach (var certificate in source.X5c)
            clone.X5c.Add(certificate);
        foreach (var otherPrime in source.Oth)
            clone.Oth.Add(otherPrime);
        CloneAdditionalData(source.AdditionalData, clone.AdditionalData);
        return clone;
    }

    private static void CloneAdditionalData(
        IEnumerable<KeyValuePair<string, object>> source,
        IDictionary<string, object> target)
    {
        foreach (var pair in source)
        {
            target.Add(
                pair.Key,
                pair.Value is null
                    ? null!
                    : JsonSerializer.SerializeToElement(pair.Value, pair.Value.GetType()));
        }
    }

    private static CryptoProviderFactory CreateKeyCryptoProviderFactory()
        => new() { CacheSignatureProviders = false };

}

/// <summary>Validates the entire network configuration before IdentityModel can cache it.</summary>
internal sealed class StrictOidcConfigurationRetriever(
    string expectedIssuer,
    int maximumSigningKeys,
    OidcAuthorityRuntimeState runtimeState)
    : IConfigurationRetriever<OpenIdConnectConfiguration>
{
    private const int MinimumRsaModulusBits = 2048;
    private const int MaximumRsaModulusBits = 8192;
    private static readonly byte[] RequiredRsaExponent = [0x01, 0x00, 0x01];
    private readonly OpenIdConnectConfigurationRetriever _inner = new();

    public async Task<OpenIdConnectConfiguration> GetConfigurationAsync(
        string address,
        IDocumentRetriever retriever,
        CancellationToken cancel)
    {
        try
        {
            var configuration = await ((IConfigurationRetriever<OpenIdConnectConfiguration>)_inner)
                .GetConfigurationAsync(address, retriever, cancel)
                .ConfigureAwait(false);
            ValidateAndSanitize(configuration);
            runtimeState.RecordConfigurationSuccess();
            return configuration;
        }
        catch (OperationCanceledException) when (cancel.IsCancellationRequested)
        {
            throw;
        }
        catch
        {
            runtimeState.RecordFailure("configuration_refresh_failed");
            throw;
        }
    }

    private void ValidateAndSanitize(OpenIdConnectConfiguration configuration)
    {
        if (!string.Equals(configuration.Issuer, expectedIssuer, StringComparison.Ordinal))
            throw new InvalidOperationException("OIDC discovery issuer did not exactly match the configured authority.");

        var jsonWebKeys = configuration.JsonWebKeySet?.Keys;
        if (jsonWebKeys is null
            || jsonWebKeys.Count is < 1
            || jsonWebKeys.Count > maximumSigningKeys
            || configuration.TokenDecryptionKeys.Count != 0)
        {
            throw new InvalidOperationException("OIDC JWKS did not contain a bounded usable signing-key set.");
        }

        var keyIds = jsonWebKeys.Select(static key => key.Kid).ToArray();
        if (keyIds.Any(static keyId =>
                string.IsNullOrWhiteSpace(keyId)
                || keyId.Length > 256
                || keyId.Any(char.IsControl))
            || keyIds.Distinct(StringComparer.Ordinal).Count() != keyIds.Length
            || jsonWebKeys.Any(static key =>
                !HasExactRsaSigningProfile(key) && !HasExactRsaEncryptionProfile(key)))
        {
            throw new InvalidOperationException(
                "OIDC JWKS keys must be unique, bounded, public-only RSA signing or encryption keys.");
        }

        var signingJsonWebKeys = jsonWebKeys
            .Where(static key => HasExactRsaSigningProfile(key))
            .ToArray();
        if (signingJsonWebKeys.Length < 1)
        {
            throw new InvalidOperationException(
                "OIDC JWKS must contain at least one usable exact RS256 RSA signing key.");
        }

        configuration.SigningKeys.Clear();
        foreach (var signingJsonWebKey in signingJsonWebKeys)
            configuration.SigningKeys.Add(CreateExactRsaSigningKey(signingJsonWebKey));
    }

    internal static bool HasExactRsaSigningProfile(JsonWebKey key)
        => HasExactPublicRsaMaterial(key)
           && string.Equals(key.Use, "sig", StringComparison.Ordinal)
           && string.Equals(key.Alg, SecurityAlgorithms.RsaSha256, StringComparison.Ordinal)
           && HasOnlyKeyOperations(key, "verify");

    internal static RsaSecurityKey CreateExactRsaSigningKey(JsonWebKey key)
    {
        if (!HasExactRsaSigningProfile(key))
            throw new InvalidOperationException("Only an exact validated RSA signing JWK may enter token trust.");

        return new RsaSecurityKey(new RSAParameters
        {
            Modulus = Base64UrlEncoder.DecodeBytes(key.N),
            Exponent = Base64UrlEncoder.DecodeBytes(key.E),
        })
        {
            KeyId = key.Kid,
            CryptoProviderFactory = new CryptoProviderFactory
            {
                CacheSignatureProviders = false,
            },
        };
    }

    private static bool HasExactRsaEncryptionProfile(JsonWebKey key)
        => HasExactPublicRsaMaterial(key)
           && string.Equals(key.Use, "enc", StringComparison.Ordinal)
           && key.Alg is "RSA-OAEP" or "RSA-OAEP-256"
           && HasOnlyKeyOperations(key, "encrypt", "wrapKey");

    private static bool HasExactPublicRsaMaterial(JsonWebKey key)
    {
        if (!string.Equals(key.Kty, "RSA", StringComparison.Ordinal)
            || string.IsNullOrWhiteSpace(key.N)
            || string.IsNullOrWhiteSpace(key.E)
            || key.AdditionalData.Count != 0
            || HasPrivateOrNonRsaMaterial(key))
        {
            return false;
        }

        try
        {
            var modulus = Base64UrlEncoder.DecodeBytes(key.N);
            var exponent = Base64UrlEncoder.DecodeBytes(key.E);
            return modulus.Length > 0
                   && modulus[0] != 0
                   && string.Equals(Base64UrlEncoder.Encode(modulus), key.N, StringComparison.Ordinal)
                   && string.Equals(Base64UrlEncoder.Encode(exponent), key.E, StringComparison.Ordinal)
                   && GetUnsignedBitLength(modulus) is >= MinimumRsaModulusBits and <= MaximumRsaModulusBits
                   && exponent.AsSpan().SequenceEqual(RequiredRsaExponent);
        }
        catch (FormatException)
        {
            return false;
        }
    }

    private static bool HasOnlyKeyOperations(JsonWebKey key, params string[] allowed)
        => key.KeyOps.Count == 0
           || (key.KeyOps.Count <= allowed.Length
               && key.KeyOps.Distinct(StringComparer.Ordinal).Count() == key.KeyOps.Count
               && key.KeyOps.All(operation => allowed.Contains(operation, StringComparer.Ordinal)));

    private static bool HasPrivateOrNonRsaMaterial(JsonWebKey key)
        => !string.IsNullOrEmpty(key.D)
           || !string.IsNullOrEmpty(key.DP)
           || !string.IsNullOrEmpty(key.DQ)
           || !string.IsNullOrEmpty(key.P)
           || !string.IsNullOrEmpty(key.Q)
           || !string.IsNullOrEmpty(key.QI)
           || !string.IsNullOrEmpty(key.K)
           || !string.IsNullOrEmpty(key.Crv)
           || !string.IsNullOrEmpty(key.X)
           || !string.IsNullOrEmpty(key.Y)
           || key.Oth.Count != 0;

    private static int GetUnsignedBitLength(ReadOnlySpan<byte> value)
    {
        var first = value[0];
        var significantBits = 0;
        while (first != 0)
        {
            significantBits++;
            first >>= 1;
        }

        return ((value.Length - 1) * 8) + significantBits;
    }
}
