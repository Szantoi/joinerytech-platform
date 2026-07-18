using Ardalis.Result;
using Microsoft.AspNetCore.Http;
using SpaceOS.Modules.CRM.Application.Wire;

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
/// (<c>modules/crm/mocks/db.ts</c> — jsonError). This is also the ADR-059 wire
/// seam: domain conflict messages interpolate enum values with their English
/// member names ("Cannot transition lead from Qualified to Nurturing") — the
/// vocabulary is translated to the wire keys here, so the domain stays
/// wire-agnostic.
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
                new { error = "Conflict", message = TranslateWireNames(FirstMessage(result, "Conflict")) }),

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

    /// <summary>
    /// Replaces LeadStatus/OpportunityStatus member names in a domain error
    /// message with their ADR-059 wire spellings (e.g. "Nurturing" →
    /// "nurturing", "Negotiation" → "targyalas"). Chained maps: neither
    /// vocabulary shares a member name with the other, so ordering is not
    /// contract-relevant.
    /// </summary>
    private static string TranslateWireNames(string message)
        => CrmWire.OpportunityStatus.TranslateNames(CrmWire.LeadStatus.TranslateNames(message));
}
