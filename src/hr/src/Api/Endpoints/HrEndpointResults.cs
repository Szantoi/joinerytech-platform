using Ardalis.Result;
using Microsoft.AspNetCore.Http;

namespace SpaceOS.Modules.HR.Api.Endpoints;

/// <summary>
/// Shared Ardalis.Result → HTTP mapping for the HR module error contract
/// (QA QaEndpointResults / EHS RiskAssessmentEndpoints precedent):
/// 404 = not found, 409 = forbidden FSM transition, 400 = payload/aggregate
/// validation, everything else = 400 with the raw errors.
///
/// This is the server side of the portal MSW contract (mocks/hrApi/db.ts):
/// { error, message } bodies, 409 on a forbidden ABSENCE_FSM action.
/// </summary>
internal static class HrEndpointResults
{
    public static Microsoft.AspNetCore.Http.IResult Failure(Ardalis.Result.IResult result)
    {
        return result.Status switch
        {
            ResultStatus.NotFound => Results.NotFound(),
            // 409 = forbidden absence FSM transition. The domain guard interpolates
            // the English AbsenceStatus member names ("Cannot approve absence in
            // Approved status …"); ADR-059 says status names in error messages are
            // wire keys, so this API seam translates them (domain stays English).
            ResultStatus.Conflict => Results.Conflict(
                new { error = HrWire.AbsenceStatus.TranslateNames(FirstMessage(result)) }),
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
