using Ardalis.Result;
using Microsoft.AspNetCore.Http;

namespace SpaceOS.Modules.CRM.Api.Endpoints;

/// <summary>
/// Shared Ardalis.Result → HTTP mapping for the CRM module error contract
/// (QA <c>QaEndpointResults</c> / EHS RiskAssessmentEndpoints precedent):
///
///   404 = not found
///   409 = illegal FSM transition / status-guarded action (aggregate → Result.Conflict)
///   400 = payload / aggregate validation (aggregate → Result.Invalid)
///   everything else = 400 with the raw errors
///
/// Mirrors the portal MSW guard shape: <c>{ error, message }</c>
/// (<c>modules/crm/mocks/db.ts</c> — jsonError).
/// </summary>
internal static class CrmEndpointResults
{
    public static Microsoft.AspNetCore.Http.IResult Failure(Ardalis.Result.IResult result)
    {
        return result.Status switch
        {
            ResultStatus.NotFound => Results.NotFound(
                new { error = "NotFound", message = FirstMessage(result, "Not found") }),

            ResultStatus.Conflict => Results.Conflict(
                new { error = "Conflict", message = FirstMessage(result, "Conflict") }),

            ResultStatus.Invalid => Results.BadRequest(
                new { error = "BadRequest", message = FirstValidationMessage(result) }),

            _ => Results.BadRequest(new { error = "BadRequest", message = FirstMessage(result, "Invalid request") })
        };
    }

    /// <summary>Payload guard rejected before a command was even built.</summary>
    public static Microsoft.AspNetCore.Http.IResult BadRequest(string message)
        => Results.BadRequest(new { error = "BadRequest", message });

    private static string FirstMessage(Ardalis.Result.IResult result, string fallback)
        => result.Errors.FirstOrDefault() ?? fallback;

    private static string FirstValidationMessage(Ardalis.Result.IResult result)
        => result.ValidationErrors.FirstOrDefault()?.ErrorMessage
           ?? result.Errors.FirstOrDefault()
           ?? "Invalid request";
}
