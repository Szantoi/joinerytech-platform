using Microsoft.AspNetCore.Http;
using Microsoft.Net.Http.Headers;

namespace SpaceOS.Collaboration.Api;

/// <summary>
/// <c>ETag</c> / <c>If-Match</c> handling for the collaboration API (B2B-10 F3/3).
/// </summary>
/// <remarks>
/// <para>
/// The entity tag is the aggregate's <c>RowVersion</c> — the same integer the database uses as its
/// concurrency token. Inventing a separate hash would have meant two versions of the truth, and
/// the one on the wire would be the one nobody checks on write.
/// </para>
/// <para>
/// The tag is <b>weak</b> (<c>W/"3"</c>): it identifies the STATE of the resource, not a
/// byte-identical representation. Two callers with different grants get different
/// <c>allowedActions</c> for the same version, so a strong tag would be a lie.
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
    /// <param name="request">The incoming request.</param>
    /// <param name="required">
    /// Whether the endpoint refuses to act blind. Required where the client can obtain a tag (the
    /// work packages have a read endpoint); optional on the agreement routes only until F3/4 gives
    /// them one — an API that demands a precondition nobody can satisfy is not safer, just unusable.
    /// </param>
    /// <returns>The expected version, or <c>null</c> when absent and not required.</returns>
    /// <exception cref="CollaborationPreconditionRequiredException">Absent where it is required.</exception>
    /// <exception cref="ArgumentException">Present but not a version this API ever issued.</exception>
    public static int? ReadIfMatch(HttpRequest request, bool required)
    {
        ArgumentNullException.ThrowIfNull(request);

        var header = request.Headers[HeaderNames.IfMatch].ToString();

        if (string.IsNullOrWhiteSpace(header))
        {
            if (required)
            {
                throw new CollaborationPreconditionRequiredException();
            }

            return null;
        }

        // "*" means "any current version" in RFC 9110 — legal, and honestly answered by proceeding
        // without an expectation. Refusing it would break a client that only wants "if it exists".
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
            // A tag from somewhere else is a client bug, not a precondition failure: answering 412
            // would send it into a re-read loop that cannot converge.
            throw new ArgumentException(
                "If-Match must carry an entity tag issued by this API.", nameof(request));
        }

        return version;
    }
}

/// <summary>
/// The endpoint refuses to act without an <c>If-Match</c> — mapped to <c>428</c>.
/// </summary>
/// <remarks>
/// A blind transition is how the lost update this whole slice is about happens in the first place:
/// two people open the same offered package and both answer it. 428 says what to do about it
/// (read, then send the tag), which a 400 would not.
/// </remarks>
public sealed class CollaborationPreconditionRequiredException()
    : Exception("This endpoint requires an If-Match header carrying the version you intend to act on.");
