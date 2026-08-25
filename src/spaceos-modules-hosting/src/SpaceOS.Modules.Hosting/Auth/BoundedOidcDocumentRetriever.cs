using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.IdentityModel.Protocols;

namespace SpaceOS.Modules.Hosting.Auth;

/// <summary>Strict same-origin, bounded JSON document reader used by the OIDC configuration manager.</summary>
internal sealed class BoundedOidcDocumentRetriever(
    HttpClient httpClient,
    Uri authority,
    int maximumDocumentBytes) : IDocumentRetriever
{
    private const int MaximumJsonDepth = 32;
    private static readonly UTF8Encoding StrictUtf8 = new(
        encoderShouldEmitUTF8Identifier: false,
        throwOnInvalidBytes: true);
    private readonly Uri _authorityOrigin = new(authority.GetLeftPart(UriPartial.Authority), UriKind.Absolute);

    public async Task<string> GetDocumentAsync(string address, CancellationToken cancel)
    {
        if (!Uri.TryCreate(address, UriKind.Absolute, out var uri)
            || !IsExactOrigin(uri)
            || uri.Scheme != Uri.UriSchemeHttps
            || !string.IsNullOrEmpty(uri.UserInfo)
            || !string.IsNullOrEmpty(uri.Query)
            || !string.IsNullOrEmpty(uri.Fragment))
        {
            throw new InvalidOperationException(
                "OIDC metadata/JWKS attempted to leave the source-pinned HTTPS authority origin.");
        }

        using var request = new HttpRequestMessage(HttpMethod.Get, uri);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        using var response = await httpClient.SendAsync(
            request,
            HttpCompletionOption.ResponseHeadersRead,
            cancel).ConfigureAwait(false);
        response.EnsureSuccessStatusCode();

        var contentType = response.Content.Headers.ContentType;
        var charset = contentType?.CharSet?.Trim('"');
        if (!string.Equals(contentType?.MediaType, "application/json", StringComparison.OrdinalIgnoreCase)
            || (!string.IsNullOrEmpty(charset)
                && !string.Equals(charset, "utf-8", StringComparison.OrdinalIgnoreCase)))
        {
            throw new InvalidOperationException("OIDC metadata/JWKS must be UTF-8 application/json.");
        }

        if (response.Content.Headers.ContentLength is > 0
            && response.Content.Headers.ContentLength > maximumDocumentBytes)
        {
            throw new InvalidOperationException("OIDC metadata/JWKS exceeded the configured body limit.");
        }

        await using var stream = await response.Content.ReadAsStreamAsync(cancel).ConfigureAwait(false);
        var buffer = new byte[maximumDocumentBytes + 1];
        var totalRead = 0;
        while (totalRead < buffer.Length)
        {
            var read = await stream.ReadAsync(
                buffer.AsMemory(totalRead, buffer.Length - totalRead),
                cancel).ConfigureAwait(false);
            if (read == 0)
                break;
            totalRead += read;
        }

        if (totalRead > maximumDocumentBytes)
            throw new InvalidOperationException("OIDC metadata/JWKS exceeded the configured body limit.");

        var document = StrictUtf8.GetString(buffer, 0, totalRead);
        ValidateDuplicateSafeJson(document);
        return document;
    }

    private bool IsExactOrigin(Uri uri)
        => string.Equals(uri.Scheme, _authorityOrigin.Scheme, StringComparison.Ordinal)
           && string.Equals(uri.IdnHost, _authorityOrigin.IdnHost, StringComparison.Ordinal)
           && uri.Port == _authorityOrigin.Port;

    private static void ValidateDuplicateSafeJson(string value)
    {
        using var document = JsonDocument.Parse(value, new JsonDocumentOptions
        {
            AllowTrailingCommas = false,
            CommentHandling = JsonCommentHandling.Disallow,
            MaxDepth = MaximumJsonDepth,
        });
        if (document.RootElement.ValueKind != JsonValueKind.Object)
            throw new InvalidOperationException("OIDC metadata/JWKS must be a JSON object.");

        RejectDuplicateProperties(document.RootElement);
    }

    private static void RejectDuplicateProperties(JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.Object)
        {
            var names = new HashSet<string>(StringComparer.Ordinal);
            foreach (var property in element.EnumerateObject())
            {
                if (!names.Add(property.Name))
                {
                    throw new InvalidOperationException(
                        "OIDC metadata/JWKS contains a duplicate JSON property.");
                }

                RejectDuplicateProperties(property.Value);
            }

            return;
        }

        if (element.ValueKind != JsonValueKind.Array)
            return;

        foreach (var item in element.EnumerateArray())
            RejectDuplicateProperties(item);
    }
}

/// <summary>Rejects redirects, proxies, cookies and every origin other than the configured authority.</summary>
internal sealed class ExactOidcOriginBackchannelHandler : DelegatingHandler
{
    private readonly Uri _authorityOrigin;

    internal ExactOidcOriginBackchannelHandler(Uri authority, TimeSpan connectTimeout)
        : this(authority, new SocketsHttpHandler
        {
            AllowAutoRedirect = false,
            UseProxy = false,
            UseCookies = false,
            AutomaticDecompression = System.Net.DecompressionMethods.None,
            ConnectTimeout = connectTimeout,
            MaxResponseHeadersLength = 16,
        })
    {
    }

    internal ExactOidcOriginBackchannelHandler(Uri authority, HttpMessageHandler sourceOwnedTransport)
        : base(sourceOwnedTransport)
    {
        ArgumentNullException.ThrowIfNull(authority);
        ArgumentNullException.ThrowIfNull(sourceOwnedTransport);
        _authorityOrigin = new Uri(authority.GetLeftPart(UriPartial.Authority), UriKind.Absolute);
    }

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        var uri = request.RequestUri;
        if (uri is null
            || !uri.IsAbsoluteUri
            || !string.Equals(uri.Scheme, _authorityOrigin.Scheme, StringComparison.Ordinal)
            || !string.Equals(uri.IdnHost, _authorityOrigin.IdnHost, StringComparison.Ordinal)
            || uri.Port != _authorityOrigin.Port)
        {
            throw new HttpRequestException("OIDC backchannel request violated the source-pinned origin.");
        }

        return base.SendAsync(request, cancellationToken);
    }
}
