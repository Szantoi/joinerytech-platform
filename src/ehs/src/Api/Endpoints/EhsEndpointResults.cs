using FluentValidation;
using Microsoft.AspNetCore.Http;

namespace SpaceOS.Modules.Ehs.Api.Endpoints;

/// <summary>Safe HTTP error responses shared by the legacy EHS endpoint handlers.</summary>
internal static class EhsEndpointResults
{
    /// <summary>Returns a client-safe validation error without exposing stack or provider details.</summary>
    public static IResult ValidationFailure(ValidationException exception) =>
        Results.BadRequest(new
        {
            Error = exception.Errors.FirstOrDefault()?.ErrorMessage ?? "Érvénytelen kérés."
        });

    /// <summary>Keeps expected state or reference conflicts at HTTP 409 without raw details.</summary>
    public static IResult Conflict() =>
        Results.Conflict(new
        {
            Error = "Conflict",
            Message = "Az erőforrás állapota ütközik a kéréssel."
        });

    /// <summary>Returns a generic response for unexpected infrastructure failures.</summary>
    public static IResult InternalServerError() =>
        Results.Json(
            new { Error = "InternalServerError", Message = "Váratlan kiszolgálóhiba történt." },
            statusCode: StatusCodes.Status500InternalServerError);
}
