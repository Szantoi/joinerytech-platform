namespace SpaceOS.Modules.CRM.Application.Wire;

using SpaceOS.Modules.CRM.Domain.Enums;
using SpaceOS.Modules.Hosting.Wire;

/// <summary>
/// The CRM module's wire vocabulary (ADR-059, kontrolling precedent).
/// </summary>
/// <remarks>
/// <para>
/// Enums travel as strings, but the CRM contract's spellings are a
/// TRANSLATION, not a convention: <c>LeadStatus.Nurturing</c> is
/// <c>"nurturing"</c> on the wire, <c>OpportunityStatus.Negotiation</c> is
/// <c>"targyalas"</c>. No naming policy derives those, so the map is written
/// out explicitly and is the single place the wire vocabulary is defined —
/// <see cref="Application.DTOs.CrmDtoMapper"/>, the JSON converters
/// (<c>CrmApiJsonOptions</c>), the query-string parsing in the endpoints, and
/// the 409 guard-message seam all read it.
/// </para>
/// <para>
/// OPEN SET-DIFFERENCES (documented, not invented here — portal-side follow-up):
/// <list type="bullet">
/// <item><description>The portal's <c>crmSourceSchema</c> also knows
/// <c>'webshop'</c> and <c>'belsoepitesz'</c> — there is no backend
/// <see cref="LeadSource"/> member for either. Not mapped; needs a domain
/// decision before the portal fetcher can switch over.</description></item>
/// <item><description><see cref="OpportunityStatus.Abandoned"/> ("felhagyva")
/// is backend-only — the portal's <c>oppStatusSchema</c>/FSM has no matching
/// state.</description></item>
/// </list>
/// </para>
/// <para>
/// NOT covered by this task (scope-bounded, reported as a follow-up rather
/// than attempted piecemeal): <c>Activity.Type</c> and <c>CrmTask.Priority</c>
/// are free-form strings on the aggregates today, not enums
/// (<c>hivas</c>/<c>email</c>/<c>talalkozo</c>/<c>megjegyzes</c> and
/// <c>magas</c>/<c>kozepes</c>/<c>alacsony</c> per the portal's
/// <c>activityKindSchema</c>/<c>taskPrioritySchema</c>). Introducing
/// <c>ActivityKind</c>/<c>TaskPriority</c> domain enums ripples through both
/// aggregates, commands, DTOs and EF configuration — a separate, focused
/// change from the enum-map work here.
/// </para>
/// </remarks>
public static class CrmWire
{
    /// <summary>Lead FSM status keys (portal LEAD_FSM mirror).</summary>
    public static readonly EnumWireMap<LeadStatus> LeadStatus = new(
        new Dictionary<LeadStatus, string>
        {
            [Domain.Enums.LeadStatus.New] = "uj",
            [Domain.Enums.LeadStatus.Contacted] = "kapcsolat",
            [Domain.Enums.LeadStatus.Qualified] = "minosites",
            [Domain.Enums.LeadStatus.Disqualified] = "elvetve",
            [Domain.Enums.LeadStatus.Opportunity] = "konvertalva",
            [Domain.Enums.LeadStatus.Nurturing] = "nurturing"
        });

    /// <summary>
    /// Lead source keys. NOTE: the portal set also has 'webshop' and
    /// 'belsoepitesz' with no backend member — see the type-level remarks.
    /// </summary>
    public static readonly EnumWireMap<LeadSource> LeadSource = new(
        new Dictionary<LeadSource, string>
        {
            [Domain.Enums.LeadSource.Unknown] = "ismeretlen",
            [Domain.Enums.LeadSource.Website] = "weboldal",
            [Domain.Enums.LeadSource.Phone] = "telefon",
            [Domain.Enums.LeadSource.Email] = "email",
            [Domain.Enums.LeadSource.TradeShow] = "kiallitas",
            [Domain.Enums.LeadSource.Referral] = "ajanlas",
            [Domain.Enums.LeadSource.Partner] = "partner",
            [Domain.Enums.LeadSource.Direct] = "direkt",
            [Domain.Enums.LeadSource.Marketing] = "marketing",
            [Domain.Enums.LeadSource.SocialMedia] = "kozossegi"
        });

    /// <summary>
    /// Opportunity FSM stage keys (portal OPP_FSM mirror). NOTE: 'Abandoned' is
    /// backend-only — see the type-level remarks.
    /// </summary>
    public static readonly EnumWireMap<OpportunityStatus> OpportunityStatus = new(
        new Dictionary<OpportunityStatus, string>
        {
            [Domain.Enums.OpportunityStatus.Open] = "nyitott",
            [Domain.Enums.OpportunityStatus.NeedsAssessment] = "igenyfelmeres",
            [Domain.Enums.OpportunityStatus.SolutionAssembly] = "osszeallitas",
            [Domain.Enums.OpportunityStatus.Proposal] = "ajanlat",
            [Domain.Enums.OpportunityStatus.Negotiation] = "targyalas",
            [Domain.Enums.OpportunityStatus.Won] = "megnyert",
            [Domain.Enums.OpportunityStatus.Lost] = "elveszett",
            [Domain.Enums.OpportunityStatus.Abandoned] = "felhagyva"
        });

    /// <summary>Computed task SLA state keys (portal sla.ts mirror — already English).</summary>
    public static readonly EnumWireMap<TaskSla> TaskSla = new(
        new Dictionary<TaskSla, string>
        {
            [Domain.Enums.TaskSla.Ok] = "ok",
            [Domain.Enums.TaskSla.Soon] = "soon",
            [Domain.Enums.TaskSla.Overdue] = "overdue"
        });

    /// <summary>Cross-entity reference-type keys (portal refType mirror).</summary>
    public static readonly EnumWireMap<CrmRefType> RefType = new(
        new Dictionary<CrmRefType, string>
        {
            [Domain.Enums.CrmRefType.Lead] = "lead",
            [Domain.Enums.CrmRefType.Opportunity] = "opp"
        });
}
