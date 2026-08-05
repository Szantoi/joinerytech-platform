using Microsoft.AspNetCore.Http;
using Microsoft.Net.Http.Headers;

namespace SpaceOS.Projects.Api;

/// <summary>
/// <c>ETag</c> / <c>If-Match</c> handling for the projects API (PROJ-06; the collaboration
/// module's B2B-10 F3/3 contract, unchanged).
/// </summary>
/// <remarks>
/// <para>
/// The entity tag is the aggregate's <c>RowVersion</c> — the same integer the database uses as
/// its concurrency token, so there is exactly one version of the truth and it is the one that is
/// checked on write.
/// </para>
/// <para>
/// The tag is <b>weak</b> (<c>W/"3"</c>): it identifies the state of the resource, not a
/// byte-identical representation.
/// </para>
/// </remarks>
public static class ConditionalRequests
{
    /// <summary>Formats a version as a weak entity tag.</summary>
    public static string Format(int rowVersion) => $"W/\"{rowVersion}\"";

    /// <summary>Writes the entity tag of the state being returned.</summary>
    public static void SetETag(HttpResponse response, int rowVersion)
    {
        ArgumentNullException.ThrowIfNull(response);
        response.Headers[HeaderNames.ETag] = Format(rowVersion);
    }

    /// <summary>
    /// Reads the caller's <c>If-Match</c> expectation.
    /// </summary>
    /// <remarks>
    /// Every mutation on this API requires the header (unlike collaboration's transition-era
    /// optional branch): <c>GET /projects/{id}</c> exists from day one, so a tag is always
    /// obtainable, and a blind write is exactly the lost update this contract exists to prevent.
    /// <c>*</c> stays legal per RFC 9110 ("any current version").
    /// </remarks>
    /// <returns>The expected version, or <c>null</c> for <c>*</c>.</returns>
    /// <exception cref="ProjectsPreconditionRequiredException">The header is absent.</exception>
    /// <exception cref="ArgumentException">Present but not a version this API ever issued.</exception>
    public static int? ReadIfMatch(HttpRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        var header = request.Headers[HeaderNames.IfMatch].ToString();

        if (string.IsNullOrWhiteSpace(header))
        {
            throw new ProjectsPreconditionRequiredException();
        }

        if (header.Trim() == "*")
        {
            return null;
        }

        var value = header.Trim();

        if (value.StartsWith("W/", StringComparison.Ordinal))
        {
            value = value[2..];
        }

        value = value.Trim('"');

        if (!int.TryParse(value, out var version))
        {
            // A tag from somewhere else is a client bug, not a precondition failure: answering
            // 412 would send it into a re-read loop that cannot converge.
            throw new ArgumentException(
                "If-Match must carry an entity tag issued by this API.", nameof(request));
        }

        return version;
    }
}

/// <summary>
/// The endpoint refuses to act without an <c>If-Match</c> — mapped to <c>428</c>.
/// </summary>
public sealed class ProjectsPreconditionRequiredException()
    : Exception("This endpoint requires an If-Match header carrying the version you intend to act on.");
