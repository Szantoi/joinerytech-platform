using Ardalis.Result;
using Microsoft.AspNetCore.Http;

namespace SpaceOS.Modules.QA.Api.Endpoints;

/// <summary>
/// Shared Ardalis.Result → HTTP mapping for the QA module error contract
/// (EHS RiskAssessmentEndpoints precedent):
/// 404 = not found, 409 = illegal FSM transition / status-guarded action,
/// 400 = aggregate/payload validation, everything else = 400 with raw errors.
/// This is the ADR-059 wire seam: domain error messages interpolate enum
/// values with their English member names ("Cannot transition from Reported
/// to Assigned") — the vocabulary is translated to the wire keys here, so the
/// domain stays wire-agnostic.
/// </summary>
internal static class QaEndpointResults
{
    public static Microsoft.AspNetCore.Http.IResult Failure(Ardalis.Result.IResult result)
    {
        return result.Status switch
        {
            ResultStatus.NotFound => Results.NotFound(),
            ResultStatus.Conflict => Results.Conflict(new { error = TranslateWireNames(FirstMessage(result)) }),
            ResultStatus.Invalid => Results.BadRequest(new { error = TranslateWireNames(FirstValidationMessage(result)) }),
            _ => Results.BadRequest(result.Errors)
        };
    }

    private static string FirstMessage(Ardalis.Result.IResult result)
        => result.Errors.FirstOrDefault() ?? "Conflict";

    private static string FirstValidationMessage(Ardalis.Result.IResult result)
        => result.ValidationErrors.FirstOrDefault()?.ErrorMessage
           ?? result.Errors.FirstOrDefault()
           ?? "Invalid request";

    /// <summary>
    /// Replaces status/result member names in a domain error message with their
    /// ADR-059 wire spellings (e.g. "Reported" → "bejelentve", "Completed" →
    /// "lezarva", "Conditional" → "felteteles"). Chained maps: both InProgress
    /// homonyms spell "folyamatban", so ordering is not contract-relevant.
    /// </summary>
    private static string TranslateWireNames(string message)
        => QaWire.InspectionResult.TranslateNames(
            QaWire.InspectionStatus.TranslateNames(
                QaWire.TicketStatus.TranslateNames(message)));
}
