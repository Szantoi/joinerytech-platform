using Microsoft.AspNetCore.Http;
using Microsoft.Net.Http.Headers;
using SpaceOS.Collaboration.Application.Adapters;

namespace SpaceOS.Collaboration.Api.Authorization;

/// <summary>
/// The current request's bearer token, read from its <c>Authorization</c> header (B2B-10 F5/2).
/// </summary>
/// <remarks>
/// The HTTP half of the on-behalf-of decree: inside a request the token is always there (it got
/// the caller through authentication), so <see cref="RequireToken"/> failing means the path was
/// entered from OUTSIDE a request — a background job, a startup hook — and that is exactly the
/// case the root decision says must fail loudly instead of degrading to a service identity.
/// </remarks>
public sealed class HttpOnBehalfOfTokenSource(IHttpContextAccessor httpContextAccessor) : IOnBehalfOfTokenSource
{
    private const string BearerPrefix = "Bearer ";

    public string RequireToken()
    {
        var header = httpContextAccessor.HttpContext?.Request.Headers[HeaderNames.Authorization]
            .ToString();

        if (header is null || !header.StartsWith(BearerPrefix, StringComparison.OrdinalIgnoreCase))
        {
            throw new OnBehalfOfTokenUnavailableException();
        }

        var token = header[BearerPrefix.Length..].Trim();

        if (token.Length == 0)
        {
            throw new OnBehalfOfTokenUnavailableException();
        }

        return token;
    }
}
