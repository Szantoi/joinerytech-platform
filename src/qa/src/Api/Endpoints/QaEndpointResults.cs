using Ardalis.Result;
using Microsoft.AspNetCore.Http;

namespace SpaceOS.Modules.QA.Api.Endpoints;

/// <summary>
/// Shared Ardalis.Result → HTTP mapping for the QA module error contract
/// (EHS RiskAssessmentEndpoints precedent):
/// 404 = not found, 409 = illegal FSM transition / status-guarded action,
/// 400 = aggregate/payload validation, everything else = 400 with raw errors.
/// </summary>
internal static class QaEndpointResults
{
    public static Microsoft.AspNetCore.Http.IResult Failure(Ardalis.Result.IResult result)
    {
        return result.Status switch
        {
            ResultStatus.NotFound => Results.NotFound(),
            ResultStatus.Conflict => Results.Conflict(new { error = FirstMessage(result) }),
            ResultStatus.Invalid => Results.BadRequest(new { error = FirstValidationMessage(result) }),
            _ => Results.BadRequest(result.Errors)
        };
    }

    private static string FirstMessage(Ardalis.Result.IResult result)
        => result.Errors.FirstOrDefault() ?? "Conflict";

    private static string FirstValidationMessage(Ardalis.Result.IResult result)
        => result.ValidationErrors.FirstOrDefault()?.ErrorMessage
           ?? result.Errors.FirstOrDefault()
           ?? "Invalid request";
}
