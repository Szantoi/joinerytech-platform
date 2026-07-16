namespace SpaceOS.Modules.Kontrolling.Api.Endpoints;

using Ardalis.Result;
using Microsoft.AspNetCore.Http;
using IResult = Microsoft.AspNetCore.Http.IResult;

/// <summary>
/// Ardalis.Result → HTTP mapping for the Kontrolling error contract
/// (QA <c>QaEndpointResults</c> precedent).
/// </summary>
/// <remarks>
/// <para>
/// The contract: payload/validation failure → 400, unknown id → 404,
/// state conflict → 409. Kontrolling has no state machine, so 409 has exactly
/// one cause here: deleting an already-deleted adjustment.
/// </para>
/// <para>
/// The body is always <c>{ error, message }</c> — the shape the client's
/// apiClient normalises into <c>ApiError</c>, preferring <c>message</c>.
/// A bare status with no body would leave the UI with nothing to show.
/// </para>
/// </remarks>
internal static class KontrollingEndpointResults
{
    /// <summary>Maps a failed result to its HTTP response.</summary>
    public static IResult Failure(Ardalis.Result.IResult result) => result.Status switch
    {
        ResultStatus.NotFound => NotFound(FirstMessage(result, "A kért erőforrás nem található.")),
        ResultStatus.Conflict => Conflict(FirstMessage(result, "Az erőforrás állapota ütközik a kéréssel.")),
        ResultStatus.Invalid => BadRequest(FirstValidationMessage(result)),
        _ => BadRequest(FirstMessage(result, "Érvénytelen kérés."))
    };

    /// <summary>400 — the payload is unusable.</summary>
    public static IResult BadRequest(string message) =>
        Results.BadRequest(new { error = "BadRequest", message });

    /// <summary>404 — no such resource.</summary>
    public static IResult NotFound(string message) =>
        Results.NotFound(new { error = "NotFound", message });

    /// <summary>409 — the resource's state contradicts the request.</summary>
    public static IResult Conflict(string message) =>
        Results.Conflict(new { error = "Conflict", message });

    private static string FirstMessage(Ardalis.Result.IResult result, string fallback) =>
        result.Errors.FirstOrDefault() ?? fallback;

    private static string FirstValidationMessage(Ardalis.Result.IResult result) =>
        result.ValidationErrors.FirstOrDefault()?.ErrorMessage
        ?? result.Errors.FirstOrDefault()
        ?? "Érvénytelen kérés.";
}
