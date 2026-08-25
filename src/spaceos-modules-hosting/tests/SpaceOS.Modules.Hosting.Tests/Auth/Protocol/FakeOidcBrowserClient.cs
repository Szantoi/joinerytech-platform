using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace SpaceOS.Modules.Hosting.Tests.Auth.Protocol;

internal sealed class ProtocolBrowserException(string message, Exception? innerException = null)
    : Exception(message, innerException);

internal sealed record ProtocolAuthorizationExchange(
    HttpStatusCode StatusCode,
    ProtocolDiscoveryDocument Discovery,
    string ClientId,
    string RedirectUri,
    string Verifier,
    string ExpectedState,
    string ReturnedState,
    string Nonce,
    string? Code)
{
    internal bool HasExactState
        => string.Equals(ExpectedState, ReturnedState, StringComparison.Ordinal);
}

internal sealed record ProtocolTokenExchange(
    HttpStatusCode StatusCode,
    string? AccessToken,
    string? IdToken);

internal sealed record ProtocolDiscoveryDocument(
    string Issuer,
    Uri AuthorizationEndpoint,
    Uri TokenEndpoint,
    Uri JwksUri);

/// <summary>
/// A minimal public-client driver. It performs the real HTTP code flow and refuses to expose
/// an access token until redirect state and the signed ID-token nonce have both been verified.
/// </summary>
internal sealed class FakeOidcBrowserClient : IDisposable
{
    private readonly HttpClient _httpClient;

    internal FakeOidcBrowserClient(FakeOidcAuthority authority)
    {
        _httpClient = new HttpClient(authority.CreateStrictHandler())
        {
            Timeout = TimeSpan.FromSeconds(2),
        };
        Authority = authority;
    }

    internal FakeOidcAuthority Authority { get; }

    internal async Task<ProtocolAuthorizationExchange> BeginAsync(
        ProtocolOidcGrant grant,
        string clientId = FakeOidcAuthority.ClientId,
        string redirectUri = FakeOidcAuthority.RedirectUri)
    {
        var discovery = await ReadDiscoveryAsync().ConfigureAwait(false);
        var verifier = Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(48));
        var challenge = Base64UrlEncoder.Encode(SHA256.HashData(Encoding.ASCII.GetBytes(verifier)));
        var state = Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(32));
        var nonce = Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(32));
        Authority.QueueGrant(grant);

        var query = new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["response_type"] = "code",
            ["client_id"] = clientId,
            ["redirect_uri"] = redirectUri,
            ["scope"] = "openid",
            ["state"] = state,
            ["nonce"] = nonce,
            ["code_challenge"] = challenge,
            ["code_challenge_method"] = "S256",
        };
        var requestUri = discovery.AuthorizationEndpoint + "?" + FormEncode(query);
        using var response = await _httpClient.GetAsync(requestUri).ConfigureAwait(false);

        if (response.StatusCode != HttpStatusCode.Found)
        {
            return new ProtocolAuthorizationExchange(
                response.StatusCode,
                discovery,
                clientId,
                redirectUri,
                verifier,
                state,
                string.Empty,
                nonce,
                null);
        }

        var location = response.Headers.Location;
        if (location is null || !location.IsAbsoluteUri)
            throw new ProtocolBrowserException("The authorization response omitted an absolute callback URI.");
        if (!string.Equals(location.GetLeftPart(UriPartial.Path), redirectUri, StringComparison.Ordinal))
            throw new ProtocolBrowserException("The authorization response targeted an unexpected callback URI.");

        var callback = ParseQuery(location.Query);
        if (callback.Count != 2
            || !TryReadSingle(callback, "code", out var code)
            || !TryReadSingle(callback, "state", out var returnedState))
        {
            throw new ProtocolBrowserException("The authorization callback did not contain one code and one state.");
        }

        return new ProtocolAuthorizationExchange(
            response.StatusCode,
            discovery,
            clientId,
            redirectUri,
            verifier,
            state,
            returnedState,
            nonce,
            code);
    }

    internal async Task<ProtocolTokenExchange> RedeemRawAsync(
        ProtocolAuthorizationExchange authorization,
        string? verifier = null,
        string? clientId = null,
        string? redirectUri = null)
    {
        if (authorization.Code is null)
            throw new ProtocolBrowserException("A failed authorization response has no redeemable code.");

        var form = new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["grant_type"] = "authorization_code",
            ["code"] = authorization.Code,
            ["client_id"] = clientId ?? authorization.ClientId,
            ["redirect_uri"] = redirectUri ?? authorization.RedirectUri,
            ["code_verifier"] = verifier ?? authorization.Verifier,
        };
        using var content = new FormUrlEncodedContent(form);
        using var response = await _httpClient.PostAsync(authorization.Discovery.TokenEndpoint, content)
            .ConfigureAwait(false);
        if (response.StatusCode != HttpStatusCode.OK)
            return new ProtocolTokenExchange(response.StatusCode, null, null);

        var body = await response.Content.ReadAsByteArrayAsync().ConfigureAwait(false);
        try
        {
            using var document = JsonDocument.Parse(body, new JsonDocumentOptions
            {
                AllowTrailingCommas = false,
                CommentHandling = JsonCommentHandling.Disallow,
                MaxDepth = 8,
            });
            var root = document.RootElement;
            if (root.ValueKind != JsonValueKind.Object)
                throw new ProtocolBrowserException("The token response root was not an object.");
            var properties = root.EnumerateObject().ToArray();
            if (properties.Length != 4
                || properties.Select(static property => property.Name)
                       .Distinct(StringComparer.Ordinal).Count() != properties.Length
                || !properties.Select(static property => property.Name)
                    .ToHashSet(StringComparer.Ordinal)
                    .SetEquals(["access_token", "token_type", "expires_in", "id_token"]))
            {
                throw new ProtocolBrowserException("The token response property set was not exact.");
            }

            var tokenType = root.GetProperty("token_type");
            var expiresIn = root.GetProperty("expires_in");
            if (tokenType.ValueKind != JsonValueKind.String
                || !string.Equals(tokenType.GetString(), "Bearer", StringComparison.Ordinal)
                || expiresIn.ValueKind != JsonValueKind.Number
                || !expiresIn.TryGetInt32(out var seconds)
                || seconds <= 0)
            {
                throw new ProtocolBrowserException("The token response metadata was invalid.");
            }

            var accessToken = ReadRequiredString(root, "access_token");
            var idToken = ReadRequiredString(root, "id_token");
            return new ProtocolTokenExchange(response.StatusCode, accessToken, idToken);
        }
        catch (JsonException exception)
        {
            throw new ProtocolBrowserException("The token response was malformed JSON.", exception);
        }
    }

    internal async Task<string> LoginAsync(ProtocolOidcGrant grant)
    {
        var authorization = await BeginAsync(grant).ConfigureAwait(false);
        if (authorization.StatusCode != HttpStatusCode.Found
            || authorization.Code is null
            || !authorization.HasExactState)
        {
            throw new ProtocolBrowserException("The browser rejected the authorization callback state.");
        }

        var tokens = await RedeemRawAsync(authorization).ConfigureAwait(false);
        if (tokens.StatusCode != HttpStatusCode.OK
            || tokens.AccessToken is null
            || tokens.IdToken is null)
        {
            throw new ProtocolBrowserException("The authorization code could not be redeemed.");
        }

        await ValidateIdTokenAsync(
            authorization.Discovery,
            tokens.IdToken,
            authorization.Nonce).ConfigureAwait(false);
        return tokens.AccessToken;
    }

    private async Task<ProtocolDiscoveryDocument> ReadDiscoveryAsync()
    {
        var uri = FakeOidcAuthority.Origin + FakeOidcAuthority.DiscoveryPath;
        using var response = await _httpClient.GetAsync(uri).ConfigureAwait(false);
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadAsByteArrayAsync().ConfigureAwait(false);
        using var document = JsonDocument.Parse(body);
        var root = document.RootElement;
        var issuer = ReadRequiredString(root, "issuer");
        if (!string.Equals(issuer, FakeOidcAuthority.Issuer, StringComparison.Ordinal))
            throw new ProtocolBrowserException("Discovery returned an unexpected issuer.");

        return new ProtocolDiscoveryDocument(
            issuer,
            ReadExactAuthorityUri(root, "authorization_endpoint"),
            ReadExactAuthorityUri(root, "token_endpoint"),
            ReadExactAuthorityUri(root, "jwks_uri"));
    }

    private async Task ValidateIdTokenAsync(
        ProtocolDiscoveryDocument discovery,
        string idToken,
        string expectedNonce)
    {
        using var response = await _httpClient.GetAsync(discovery.JwksUri).ConfigureAwait(false);
        response.EnsureSuccessStatusCode();
        var jwks = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
        var signingKeys = new JsonWebKeySet(jwks).GetSigningKeys();
        var validation = await new JsonWebTokenHandler().ValidateTokenAsync(
            idToken,
            new TokenValidationParameters
            {
                RequireSignedTokens = true,
                ValidateIssuerSigningKey = true,
                IssuerSigningKeys = signingKeys,
                ValidateIssuer = true,
                ValidIssuer = discovery.Issuer,
                ValidateAudience = true,
                ValidAudience = FakeOidcAuthority.ClientId,
                ValidateLifetime = true,
                ValidAlgorithms = [SecurityAlgorithms.RsaSha256],
                ValidTypes = ["JWT"],
                ClockSkew = TimeSpan.Zero,
            }).ConfigureAwait(false);
        if (!validation.IsValid || validation.ClaimsIdentity is null)
            throw new ProtocolBrowserException("The browser rejected the signed ID token.", validation.Exception);

        var nonces = validation.ClaimsIdentity.FindAll("nonce").ToArray();
        if (nonces.Length != 1
            || !string.Equals(nonces[0].Value, expectedNonce, StringComparison.Ordinal))
        {
            throw new ProtocolBrowserException("The browser rejected the ID-token nonce.");
        }
    }

    private static Uri ReadExactAuthorityUri(JsonElement root, string propertyName)
    {
        var raw = ReadRequiredString(root, propertyName);
        if (!Uri.TryCreate(raw, UriKind.Absolute, out var uri)
            || !string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.Ordinal)
            || !string.Equals(uri.GetLeftPart(UriPartial.Authority), FakeOidcAuthority.Origin, StringComparison.Ordinal))
        {
            throw new ProtocolBrowserException($"Discovery returned an unpinned {propertyName} URI.");
        }

        return uri;
    }

    private static string ReadRequiredString(JsonElement root, string propertyName)
    {
        if (!root.TryGetProperty(propertyName, out var property)
            || property.ValueKind != JsonValueKind.String
            || string.IsNullOrWhiteSpace(property.GetString()))
        {
            throw new ProtocolBrowserException($"The OIDC response omitted {propertyName}.");
        }

        return property.GetString()!;
    }

    private static string FormEncode(IReadOnlyDictionary<string, string> values)
        => string.Join(
            "&",
            values.Select(pair =>
                $"{Uri.EscapeDataString(pair.Key)}={Uri.EscapeDataString(pair.Value)}"));

    private static IReadOnlyDictionary<string, IReadOnlyList<string>> ParseQuery(string query)
    {
        var parsed = new Dictionary<string, List<string>>(StringComparer.Ordinal);
        foreach (var item in query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var separator = item.IndexOf('=');
            var name = Uri.UnescapeDataString(separator >= 0 ? item[..separator] : item);
            var value = Uri.UnescapeDataString(separator >= 0 ? item[(separator + 1)..] : string.Empty);
            if (!parsed.TryGetValue(name, out var values))
            {
                values = [];
                parsed[name] = values;
            }

            values.Add(value);
        }

        return parsed.ToDictionary(
            static pair => pair.Key,
            static pair => (IReadOnlyList<string>)pair.Value,
            StringComparer.Ordinal);
    }

    private static bool TryReadSingle(
        IReadOnlyDictionary<string, IReadOnlyList<string>> values,
        string name,
        out string value)
    {
        value = string.Empty;
        if (!values.TryGetValue(name, out var matches) || matches.Count != 1)
            return false;
        value = matches[0];
        return true;
    }

    public void Dispose() => _httpClient.Dispose();
}
