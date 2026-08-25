using System.Collections.Concurrent;
using System.Globalization;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Primitives;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using SpaceOS.Modules.Hosting.Tenancy;

namespace SpaceOS.Modules.Hosting.Tests.Auth.Protocol;

internal enum ProtocolSigningKey
{
    A,
    B,
    C,
}

public enum ProtocolEndpointFault
{
    None,
    Timeout,
    Malformed,
    WrongIssuer,
    DuplicateIssuer,
    DuplicateJwksUri,
}

public enum ProtocolJwksFault
{
    None,
    Timeout,
    Malformed,
    DuplicateKeyId,
    MissingKeyId,
    TooManyKeys,
    Oversized,
    DuplicateKeyPropertyKid,
    DuplicateKeyPropertyModulus,
    WrongUse,
    WrongAlgorithm,
    WeakRsa,
    PrivateRsa,
    WrongExponent,
    SymmetricKey,
    MixedSigningAndEncryption,
}

internal enum ProtocolNonceFault
{
    None,
    Wrong,
}

internal sealed record ProtocolOidcGrant(
    string Subject,
    Guid TenantId,
    long MembershipVersion,
    long ProjectionVersion,
    IReadOnlyList<string> Permissions,
    IReadOnlyList<string> EnabledModules,
    DateTimeOffset IssuedAt,
    DateTimeOffset NotBefore,
    IReadOnlyList<string> Audiences,
    string AuthorizedParty,
    ProtocolSigningKey SigningKey)
{
    internal static ProtocolOidcGrant Create(
        Guid tenantId,
        string subject = FakeOidcAuthority.Subject,
        long membershipVersion = 1,
        long projectionVersion = 1,
        string module = "spaceos.maintenance",
        DateTimeOffset? issuedAt = null,
        DateTimeOffset? notBefore = null,
        IReadOnlyList<string>? audiences = null,
        string authorizedParty = FakeOidcAuthority.ClientId,
        ProtocolSigningKey signingKey = ProtocolSigningKey.A)
    {
        var effectiveIssuedAt = issuedAt ?? DateTimeOffset.UtcNow.AddSeconds(-5);
        return new ProtocolOidcGrant(
            subject,
            tenantId,
            membershipVersion,
            projectionVersion,
            [$"{module}.view"],
            [module],
            effectiveIssuedAt,
            notBefore ?? effectiveIssuedAt.AddSeconds(-1),
            audiences ?? [FakeOidcAuthority.Audience],
            authorizedParty,
            signingKey);
    }
}

/// <summary>
/// A strict, local-only OIDC authority. It exposes real discovery, authorization, token and
/// JWKS HTTP endpoints while keeping all private signing material inside this test fixture.
/// </summary>
internal sealed class FakeOidcAuthority : IAsyncDisposable
{
    internal const string Origin = "https://identity.protocol.test";
    internal const string Issuer = Origin + "/realms/spaceos";
    internal const string DiscoveryPath = "/realms/spaceos/.well-known/openid-configuration";
    internal const string AuthorizationPath = "/realms/spaceos/protocol/openid-connect/auth";
    internal const string TokenPath = "/realms/spaceos/protocol/openid-connect/token";
    internal const string JwksPath = "/realms/spaceos/protocol/openid-connect/certs";
    internal const string ClientId = "joinerytech-portal";
    internal const string Audience = "plant-api";
    internal const string RedirectUri = "https://portal.protocol.test/auth/callback";
    internal const string Subject = "operator-123";

    private static readonly string[] AuthorizationQueryNames =
    [
        "response_type",
        "client_id",
        "redirect_uri",
        "scope",
        "state",
        "nonce",
        "code_challenge",
        "code_challenge_method",
    ];
    private static readonly string[] TokenFormNames =
    [
        "grant_type",
        "code",
        "client_id",
        "redirect_uri",
        "code_verifier",
    ];
    private readonly TestServer _server;
    private readonly IReadOnlyDictionary<ProtocolSigningKey, RSA> _rsaKeys;
    private readonly IReadOnlyDictionary<ProtocolSigningKey, RsaSecurityKey> _signingKeys;
    private readonly ConcurrentQueue<ProtocolOidcGrant> _pendingGrants = new();
    private readonly ConcurrentDictionary<string, StoredAuthorizationCode> _codes = new(StringComparer.Ordinal);
    private readonly object _publishedKeysLock = new();
    private ProtocolSigningKey[] _publishedKeys = [ProtocolSigningKey.A];
    private int _authorizationRequests;
    private int _tokenRequests;
    private int _discoveryRequests;
    private int _jwksRequests;

    internal FakeOidcAuthority()
    {
        var rsaA = RSA.Create(2048);
        var rsaB = RSA.Create(2048);
        var rsaC = RSA.Create(2048);
        _rsaKeys = new Dictionary<ProtocolSigningKey, RSA>
        {
            [ProtocolSigningKey.A] = rsaA,
            [ProtocolSigningKey.B] = rsaB,
            [ProtocolSigningKey.C] = rsaC,
        };
        _signingKeys = new Dictionary<ProtocolSigningKey, RsaSecurityKey>
        {
            [ProtocolSigningKey.A] = new(rsaA) { KeyId = KeyId(ProtocolSigningKey.A) },
            [ProtocolSigningKey.B] = new(rsaB) { KeyId = KeyId(ProtocolSigningKey.B) },
            [ProtocolSigningKey.C] = new(rsaC) { KeyId = KeyId(ProtocolSigningKey.C) },
        };
        _server = new TestServer(new WebHostBuilder().Configure(app => app.Run(HandleAsync)));
    }

    internal ProtocolEndpointFault DiscoveryFault { get; set; }

    internal ProtocolJwksFault JwksFault { get; set; }

    internal Func<CancellationToken, Task>? BeforeJwksResponseAsync { get; set; }

    internal bool ReturnWrongState { get; set; }

    internal ProtocolNonceFault NonceFault { get; set; }

    internal int AuthorizationRequestCount => Volatile.Read(ref _authorizationRequests);

    internal int TokenRequestCount => Volatile.Read(ref _tokenRequests);

    internal int DiscoveryRequestCount => Volatile.Read(ref _discoveryRequests);

    internal int JwksRequestCount => Volatile.Read(ref _jwksRequests);

    internal RsaSecurityKey SigningKeyForTests(ProtocolSigningKey key) => _signingKeys[key];

    internal string CreateAccessTokenForTests(
        ProtocolOidcGrant grant,
        string? keyIdOverride = null)
    {
        if (keyIdOverride is null)
            return CreateAccessToken(grant);

        var signingKey = new RsaSecurityKey(_rsaKeys[grant.SigningKey]) { KeyId = keyIdOverride };
        return CreateAccessToken(grant, signingKey);
    }

    internal string CreateAccessTokenWithAdditionalClaimsForTests(
        ProtocolOidcGrant grant,
        IReadOnlyDictionary<string, object> additionalClaims)
    {
        ArgumentNullException.ThrowIfNull(additionalClaims);
        var claims = CreateAccessTokenClaims(grant);
        foreach (var claim in additionalClaims)
        {
            if (!claims.TryAdd(claim.Key, claim.Value))
                throw new ArgumentException("Additional access-token claims must be unique.", nameof(additionalClaims));
        }

        return CreateToken(grant, claims, audience: null);
    }

    internal void QueueGrant(ProtocolOidcGrant grant) => _pendingGrants.Enqueue(grant);

    internal void Publish(params ProtocolSigningKey[] keys)
    {
        ArgumentNullException.ThrowIfNull(keys);
        if (keys.Length == 0 || keys.Distinct().Count() != keys.Length)
            throw new ArgumentException("Published protocol keys must be a non-empty unique set.", nameof(keys));

        lock (_publishedKeysLock)
            _publishedKeys = keys.ToArray();
    }

    internal IReadOnlyList<string> PublishedKeyIds()
    {
        lock (_publishedKeysLock)
            return _publishedKeys.Select(KeyId).ToArray();
    }

    internal HttpMessageHandler CreateStrictHandler(Action<HttpRequestMessage>? observer = null)
        => new ExactOriginTestServerHandler(Origin, _server.CreateHandler(), observer);

    private async Task HandleAsync(HttpContext context)
    {
        if (context.Request.Path == DiscoveryPath && HttpMethods.IsGet(context.Request.Method))
        {
            await HandleDiscoveryAsync(context).ConfigureAwait(false);
            return;
        }

        if (context.Request.Path == JwksPath && HttpMethods.IsGet(context.Request.Method))
        {
            await HandleJwksAsync(context).ConfigureAwait(false);
            return;
        }

        if (context.Request.Path == AuthorizationPath && HttpMethods.IsGet(context.Request.Method))
        {
            await HandleAuthorizationAsync(context).ConfigureAwait(false);
            return;
        }

        if (context.Request.Path == TokenPath && HttpMethods.IsPost(context.Request.Method))
        {
            await HandleTokenAsync(context).ConfigureAwait(false);
            return;
        }

        context.Response.StatusCode = StatusCodes.Status404NotFound;
    }

    private async Task HandleDiscoveryAsync(HttpContext context)
    {
        Interlocked.Increment(ref _discoveryRequests);
        if (await ApplyEndpointFaultAsync(context, DiscoveryFault).ConfigureAwait(false))
            return;

        if (DiscoveryFault is ProtocolEndpointFault.DuplicateIssuer
            or ProtocolEndpointFault.DuplicateJwksUri)
        {
            var duplicateProperty = DiscoveryFault == ProtocolEndpointFault.DuplicateIssuer
                ? $"\"issuer\":\"{Issuer}\",\"issuer\":\"{Issuer}\""
                : $"\"jwks_uri\":\"{Origin + JwksPath}\",\"jwks_uri\":\"{Origin + JwksPath}\"";
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(
                "{" + duplicateProperty + "}",
                context.RequestAborted).ConfigureAwait(false);
            return;
        }

        await WriteJsonAsync(context, new
        {
            issuer = DiscoveryFault == ProtocolEndpointFault.WrongIssuer
                ? "https://substituted.protocol.test/realms/spaceos"
                : Issuer,
            authorization_endpoint = Origin + AuthorizationPath,
            token_endpoint = Origin + TokenPath,
            jwks_uri = Origin + JwksPath,
            response_types_supported = new[] { "code" },
            subject_types_supported = new[] { "public" },
            id_token_signing_alg_values_supported = new[] { "RS256" },
            token_endpoint_auth_methods_supported = new[] { "none" },
            code_challenge_methods_supported = new[] { "S256" },
            scopes_supported = new[] { "openid" },
        }).ConfigureAwait(false);
    }

    private async Task HandleJwksAsync(HttpContext context)
    {
        Interlocked.Increment(ref _jwksRequests);
        if (BeforeJwksResponseAsync is { } beforeResponse)
            await beforeResponse(context.RequestAborted).ConfigureAwait(false);

        if (JwksFault == ProtocolJwksFault.Timeout)
        {
            await WaitUntilCancelledAsync(context).ConfigureAwait(false);
            return;
        }

        if (JwksFault == ProtocolJwksFault.Malformed)
        {
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync("{", context.RequestAborted).ConfigureAwait(false);
            return;
        }

        if (JwksFault == ProtocolJwksFault.Oversized)
        {
            await WriteJsonAsync(context, new
            {
                keys = Array.Empty<object>(),
                padding = new string('x', 40_000),
            }).ConfigureAwait(false);
            return;
        }

        if (JwksFault is ProtocolJwksFault.DuplicateKeyPropertyKid
            or ProtocolJwksFault.DuplicateKeyPropertyModulus)
        {
            var parameters = _rsaKeys[ProtocolSigningKey.A].ExportParameters(
                includePrivateParameters: false);
            var keyId = JsonSerializer.Serialize(KeyId(ProtocolSigningKey.A));
            var modulus = JsonSerializer.Serialize(Base64UrlEncoder.Encode(parameters.Modulus!));
            var exponent = JsonSerializer.Serialize(Base64UrlEncoder.Encode(parameters.Exponent!));
            var duplicateProperty = JwksFault == ProtocolJwksFault.DuplicateKeyPropertyKid
                ? $"\"kid\":{keyId},\"kid\":{keyId}"
                : $"\"n\":{modulus},\"n\":{modulus}";
            var remainingProperty = JwksFault == ProtocolJwksFault.DuplicateKeyPropertyKid
                ? $"\"n\":{modulus}"
                : $"\"kid\":{keyId}";
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(
                $"{{\"keys\":[{{\"kty\":\"RSA\",\"use\":\"sig\",\"alg\":\"RS256\",{duplicateProperty},{remainingProperty},\"e\":{exponent}}}]}}",
                context.RequestAborted).ConfigureAwait(false);
            return;
        }

        object[] keys;
        if (JwksFault == ProtocolJwksFault.DuplicateKeyId)
        {
            keys =
            [
                PublicJwk(ProtocolSigningKey.A, KeyId(ProtocolSigningKey.A)),
                PublicJwk(ProtocolSigningKey.B, KeyId(ProtocolSigningKey.A)),
            ];
        }
        else if (JwksFault == ProtocolJwksFault.MissingKeyId)
        {
            keys = [PublicJwk(ProtocolSigningKey.A, null)];
        }
        else if (JwksFault == ProtocolJwksFault.TooManyKeys)
        {
            keys = Enumerable.Range(0, 9)
                .Select(index => PublicJwk(ProtocolSigningKey.A, $"overbound-key-{index}"))
                .ToArray();
        }
        else if (JwksFault is ProtocolJwksFault.WrongUse
                 or ProtocolJwksFault.WrongAlgorithm
                 or ProtocolJwksFault.WeakRsa
                 or ProtocolJwksFault.PrivateRsa
                 or ProtocolJwksFault.WrongExponent)
        {
            keys = [FaultedRsaJwk(JwksFault)];
        }
        else if (JwksFault == ProtocolJwksFault.SymmetricKey)
        {
            keys =
            [
                PublicJwk(ProtocolSigningKey.A, KeyId(ProtocolSigningKey.A)),
                new Dictionary<string, object>
                {
                    ["kty"] = "oct",
                    ["use"] = "enc",
                    ["alg"] = "A256KW",
                    ["kid"] = "symmetric-key",
                    ["k"] = Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(32)),
                },
            ];
        }
        else if (JwksFault == ProtocolJwksFault.MixedSigningAndEncryption)
        {
            keys =
            [
                PublicJwk(ProtocolSigningKey.A, KeyId(ProtocolSigningKey.A)),
                PublicEncryptionJwk(ProtocolSigningKey.B),
            ];
        }
        else
        {
            ProtocolSigningKey[] published;
            lock (_publishedKeysLock)
                published = _publishedKeys.ToArray();
            keys = published.Select(key => PublicJwk(key, KeyId(key))).ToArray();
        }

        await WriteJsonAsync(context, new { keys }).ConfigureAwait(false);
    }

    private async Task HandleAuthorizationAsync(HttpContext context)
    {
        Interlocked.Increment(ref _authorizationRequests);
        var query = context.Request.Query;
        if (!HasExactNames(query, AuthorizationQueryNames)
            || !HasSingleExact(query, "response_type", "code")
            || !HasSingleExact(query, "client_id", ClientId)
            || !HasSingleExact(query, "redirect_uri", RedirectUri)
            || !HasSingleExact(query, "scope", "openid")
            || !HasSingleExact(query, "code_challenge_method", "S256")
            || !TryReadBounded(query, "state", out var state)
            || !TryReadBounded(query, "nonce", out var nonce)
            || !TryReadPkceChallenge(query, out var challenge)
            || !_pendingGrants.TryDequeue(out var grant))
        {
            await WriteProtocolErrorAsync(context, "invalid_request").ConfigureAwait(false);
            return;
        }

        var code = Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(32));
        var stored = new StoredAuthorizationCode(
            ClientId,
            RedirectUri,
            challenge,
            nonce,
            grant,
            DateTimeOffset.UtcNow.AddMinutes(1));
        if (!_codes.TryAdd(code, stored))
            throw new InvalidOperationException("A synthetic authorization code collided.");

        var returnedState = ReturnWrongState ? state + "-wrong" : state;
        var location = $"{RedirectUri}?code={Uri.EscapeDataString(code)}&state={Uri.EscapeDataString(returnedState)}";
        context.Response.StatusCode = StatusCodes.Status302Found;
        context.Response.Headers.Location = location;
    }

    private async Task HandleTokenAsync(HttpContext context)
    {
        Interlocked.Increment(ref _tokenRequests);
        if (!context.Request.HasFormContentType)
        {
            await WriteProtocolErrorAsync(context, "invalid_request").ConfigureAwait(false);
            return;
        }

        var form = await context.Request.ReadFormAsync(context.RequestAborted).ConfigureAwait(false);
        if (!HasExactNames(form, TokenFormNames)
            || !TryReadSingle(form, "code", out var code)
            || !_codes.TryRemove(code, out var stored))
        {
            await WriteProtocolErrorAsync(context, "invalid_grant").ConfigureAwait(false);
            return;
        }

        // The code is deliberately removed before any client/redirect/verifier validation.
        // A failed first redemption attempt cannot leave a reusable bearer-minting handle.
        if (stored.ExpiresAt <= DateTimeOffset.UtcNow
            || !HasSingleExact(form, "grant_type", "authorization_code")
            || !HasSingleExact(form, "client_id", stored.ClientId)
            || !HasSingleExact(form, "redirect_uri", stored.RedirectUri)
            || !TryReadSingle(form, "code_verifier", out var verifier)
            || !IsValidVerifier(verifier)
            || !ChallengeMatches(verifier, stored.CodeChallenge))
        {
            await WriteProtocolErrorAsync(context, "invalid_grant").ConfigureAwait(false);
            return;
        }

        var accessToken = CreateAccessToken(stored.Grant);
        var idTokenNonce = NonceFault == ProtocolNonceFault.Wrong
            ? stored.Nonce + "-wrong"
            : stored.Nonce;
        var idToken = CreateIdToken(stored.Grant, idTokenNonce);
        var expiresIn = Math.Max(
            1,
            (int)(stored.Grant.IssuedAt.AddMinutes(30) - DateTimeOffset.UtcNow).TotalSeconds);
        await WriteJsonAsync(context, new
        {
            access_token = accessToken,
            token_type = "Bearer",
            expires_in = expiresIn,
            id_token = idToken,
        }).ConfigureAwait(false);
    }

    private string CreateAccessToken(
        ProtocolOidcGrant grant,
        RsaSecurityKey? signingKey = null)
    {
        var claims = CreateAccessTokenClaims(grant);
        return CreateToken(grant, claims, audience: null, signingKey);
    }

    private static Dictionary<string, object> CreateAccessTokenClaims(ProtocolOidcGrant grant)
    {
        var audienceValue = grant.Audiences.Count == 1
            ? (object)grant.Audiences[0]
            : grant.Audiences.ToArray();
        var claims = new Dictionary<string, object>
        {
            ["sub"] = grant.Subject,
            ["aud"] = audienceValue,
            ["azp"] = grant.AuthorizedParty,
            ["typ"] = "Bearer",
            [TenancyDefaults.MembershipVersionClaim] = grant.MembershipVersion,
            [TenancyDefaults.ProjectionVersionClaim] = grant.ProjectionVersion,
            [TenancyDefaults.TenantListClaim] = new[]
            {
                new Dictionary<string, object>
                {
                    ["tenant_id"] = grant.TenantId.ToString("D", CultureInfo.InvariantCulture).ToLowerInvariant(),
                    ["permissions"] = grant.Permissions.ToArray(),
                    ["enabled_modules"] = grant.EnabledModules.ToArray(),
                },
            },
        };

        return claims;
    }

    private string CreateIdToken(ProtocolOidcGrant grant, string nonce)
        => CreateToken(
            grant,
            new Dictionary<string, object>
            {
                ["sub"] = grant.Subject,
                ["nonce"] = nonce,
            },
            ClientId);

    private string CreateToken(
        ProtocolOidcGrant grant,
        IDictionary<string, object> claims,
        string? audience,
        RsaSecurityKey? signingKey = null)
    {
        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = Issuer,
            Audience = audience,
            Claims = claims,
            IssuedAt = grant.IssuedAt.UtcDateTime,
            NotBefore = grant.NotBefore.UtcDateTime,
            Expires = grant.IssuedAt.AddMinutes(30).UtcDateTime,
            SigningCredentials = new SigningCredentials(
                signingKey ?? _signingKeys[grant.SigningKey],
                SecurityAlgorithms.RsaSha256),
            TokenType = "JWT",
        };
        return new JsonWebTokenHandler().CreateToken(descriptor);
    }

    private object PublicJwk(ProtocolSigningKey key, string? keyId)
    {
        var parameters = _rsaKeys[key].ExportParameters(includePrivateParameters: false);
        return new
        {
            kty = "RSA",
            use = "sig",
            alg = "RS256",
            kid = keyId,
            n = Base64UrlEncoder.Encode(parameters.Modulus!),
            e = Base64UrlEncoder.Encode(parameters.Exponent!),
        };
    }

    private object PublicEncryptionJwk(ProtocolSigningKey key)
    {
        var parameters = _rsaKeys[key].ExportParameters(includePrivateParameters: false);
        return new
        {
            kty = "RSA",
            use = "enc",
            alg = "RSA-OAEP",
            kid = KeyId(key),
            n = Base64UrlEncoder.Encode(parameters.Modulus!),
            e = Base64UrlEncoder.Encode(parameters.Exponent!),
        };
    }

    private object FaultedRsaJwk(ProtocolJwksFault fault)
    {
        RSA? weakRsa = null;
        try
        {
            var rsa = _rsaKeys[ProtocolSigningKey.A];
            if (fault == ProtocolJwksFault.WeakRsa)
            {
                weakRsa = RSA.Create();
                weakRsa.KeySize = 1024;
                rsa = weakRsa;
            }

            var includePrivate = fault == ProtocolJwksFault.PrivateRsa;
            var parameters = rsa.ExportParameters(includePrivate);
            var key = new Dictionary<string, object?>
            {
                ["kty"] = "RSA",
                ["use"] = fault == ProtocolJwksFault.WrongUse ? "enc" : "sig",
                ["alg"] = fault == ProtocolJwksFault.WrongAlgorithm ? "RS512" : "RS256",
                ["kid"] = KeyId(ProtocolSigningKey.A),
                ["n"] = Base64UrlEncoder.Encode(parameters.Modulus!),
                ["e"] = fault == ProtocolJwksFault.WrongExponent
                    ? Base64UrlEncoder.Encode([0x03])
                    : Base64UrlEncoder.Encode(parameters.Exponent!),
            };
            if (includePrivate)
            {
                key["d"] = Base64UrlEncoder.Encode(parameters.D!);
                key["p"] = Base64UrlEncoder.Encode(parameters.P!);
                key["q"] = Base64UrlEncoder.Encode(parameters.Q!);
                key["dp"] = Base64UrlEncoder.Encode(parameters.DP!);
                key["dq"] = Base64UrlEncoder.Encode(parameters.DQ!);
                key["qi"] = Base64UrlEncoder.Encode(parameters.InverseQ!);
            }

            return key;
        }
        finally
        {
            weakRsa?.Dispose();
        }
    }

    private static string KeyId(ProtocolSigningKey key)
        => key switch
        {
            ProtocolSigningKey.A => "key-a",
            ProtocolSigningKey.B => "key-b",
            ProtocolSigningKey.C => "key-c",
            _ => throw new ArgumentOutOfRangeException(nameof(key)),
        };

    private static bool HasExactNames(IQueryCollection values, IReadOnlyCollection<string> expected)
        => values.Count == expected.Count
           && values.Keys.ToHashSet(StringComparer.Ordinal).SetEquals(expected);

    private static bool HasExactNames(IFormCollection values, IReadOnlyCollection<string> expected)
        => values.Count == expected.Count
           && values.Keys.ToHashSet(StringComparer.Ordinal).SetEquals(expected);

    private static bool HasSingleExact(
        IEnumerable<KeyValuePair<string, StringValues>> values,
        string name,
        string expected)
        => TryReadSingle(values, name, out var value)
           && string.Equals(value, expected, StringComparison.Ordinal);

    private static bool TryReadSingle(
        IEnumerable<KeyValuePair<string, StringValues>> values,
        string name,
        out string value)
    {
        var match = values.SingleOrDefault(pair => string.Equals(pair.Key, name, StringComparison.Ordinal));
        value = match.Value.Count == 1 ? match.Value[0] ?? string.Empty : string.Empty;
        return match.Value.Count == 1;
    }

    private static bool TryReadBounded(IQueryCollection query, string name, out string value)
        => TryReadSingle(query, name, out value)
           && value.Length is >= 16 and <= 512
           && !value.Any(char.IsControl);

    private static bool TryReadPkceChallenge(IQueryCollection query, out string challenge)
        => TryReadSingle(query, "code_challenge", out challenge)
           && challenge.Length == 43
           && challenge.All(IsBase64UrlCharacter);

    private static bool IsValidVerifier(string verifier)
        => verifier.Length is >= 43 and <= 128
           && verifier.All(static character =>
               char.IsAsciiLetterOrDigit(character) || character is '-' or '.' or '_' or '~');

    private static bool IsBase64UrlCharacter(char character)
        => char.IsAsciiLetterOrDigit(character) || character is '-' or '_';

    private static bool ChallengeMatches(string verifier, string expected)
    {
        var actual = Base64UrlEncoder.Encode(SHA256.HashData(Encoding.ASCII.GetBytes(verifier)));
        var actualBytes = Encoding.ASCII.GetBytes(actual);
        var expectedBytes = Encoding.ASCII.GetBytes(expected);
        return actualBytes.Length == expectedBytes.Length
               && CryptographicOperations.FixedTimeEquals(actualBytes, expectedBytes);
    }

    private static async Task<bool> ApplyEndpointFaultAsync(
        HttpContext context,
        ProtocolEndpointFault fault)
    {
        if (fault == ProtocolEndpointFault.Timeout)
        {
            await WaitUntilCancelledAsync(context).ConfigureAwait(false);
            return true;
        }

        if (fault == ProtocolEndpointFault.Malformed)
        {
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync("{", context.RequestAborted).ConfigureAwait(false);
            return true;
        }

        return false;
    }

    private static async Task WaitUntilCancelledAsync(HttpContext context)
    {
        try
        {
            await Task.Delay(Timeout.InfiniteTimeSpan, context.RequestAborted).ConfigureAwait(false);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            // The bounded client timeout is the expected completion path for this synthetic fault.
        }
    }

    private static Task WriteProtocolErrorAsync(HttpContext context, string error)
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        return WriteJsonAsync(context, new { error });
    }

    private static Task WriteJsonAsync(HttpContext context, object value)
    {
        context.Response.ContentType = "application/json";
        return context.Response.WriteAsync(JsonSerializer.Serialize(value), context.RequestAborted);
    }

    public ValueTask DisposeAsync()
    {
        _server.Dispose();
        foreach (var rsa in _rsaKeys.Values)
            rsa.Dispose();
        return ValueTask.CompletedTask;
    }

    private sealed record StoredAuthorizationCode(
        string ClientId,
        string RedirectUri,
        string CodeChallenge,
        string Nonce,
        ProtocolOidcGrant Grant,
        DateTimeOffset ExpiresAt);
}

/// <summary>Routes one logical HTTPS origin into TestServer and rejects every other destination.</summary>
internal sealed class ExactOriginTestServerHandler(
    string allowedOrigin,
    HttpMessageHandler innerHandler,
    Action<HttpRequestMessage>? observer = null) : DelegatingHandler(innerHandler)
{
    private readonly Uri _allowedOrigin = new(allowedOrigin, UriKind.Absolute);

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        var uri = request.RequestUri;
        if (uri is null
            || !uri.IsAbsoluteUri
            || !string.Equals(uri.Scheme, _allowedOrigin.Scheme, StringComparison.Ordinal)
            || !string.Equals(uri.Authority, _allowedOrigin.Authority, StringComparison.Ordinal))
        {
            throw new HttpRequestException("The protocol fixture blocked an unpinned outbound origin.");
        }

        observer?.Invoke(request);
        return base.SendAsync(request, cancellationToken);
    }
}
