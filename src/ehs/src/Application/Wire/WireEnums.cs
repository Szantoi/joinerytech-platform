namespace SpaceOS.Modules.Ehs.Application.Wire;

using SpaceOS.Modules.Hosting.Wire;
using Enums = SpaceOS.Modules.Ehs.Domain.Enums;

/// <summary>
/// The EHS module's wire vocabulary — the CANONICAL Hungarian wire keys (ADR-059).
/// </summary>
/// <remarks>
/// <para>
/// Enums travel as strings, but the contract's spellings are a TRANSLATION,
/// not a convention (ADR-059: Hungarian keys on the wire, English in the
/// domain): <c>IncidentType.Accident</c> is <c>"baleset"</c>,
/// <c>SafetyWalkStatus.ActionRequired</c> is <c>"intezkedes_szukseges"</c>.
/// No naming policy derives those, so each map is written out explicitly and
/// this class is the single place the EHS wire vocabulary is defined — the
/// JSON converters (<see cref="EhsWireConverters"/>), the query-string
/// binding, and the summary dictionary keys all read it.
/// </para>
/// <para>
/// ⚠ CANONICAL SOURCE FOR THE FE ALIGNMENT: the portal's EHS world still
/// speaks English PascalCase; per ADR-059 it converges to THESE keys in a
/// separate frontend task. Any key change here is a breaking contract change
/// and must be mirrored in docs/openapi.yaml and the portal task.
/// </para>
/// </remarks>
public static class EhsWire
{
    /// <summary>Incident type keys (baleset / majdnem_baleset / veszelyes_allapot).</summary>
    public static readonly EnumWireMap<Enums.IncidentType> IncidentType = new(
        new Dictionary<Enums.IncidentType, string>
        {
            [Enums.IncidentType.Accident] = "baleset",
            [Enums.IncidentType.NearMiss] = "majdnem_baleset",
            [Enums.IncidentType.HazardousCondition] = "veszelyes_allapot"
        });

    /// <summary>Incident FSM status keys.</summary>
    public static readonly EnumWireMap<Enums.IncidentStatus> IncidentStatus = new(
        new Dictionary<Enums.IncidentStatus, string>
        {
            [Enums.IncidentStatus.Reported] = "bejelentve",
            [Enums.IncidentStatus.Investigated] = "kivizsgalva",
            [Enums.IncidentStatus.CorrectiveActionPlanned] = "intezkedes_tervezve",
            [Enums.IncidentStatus.Closed] = "lezarva",
            [Enums.IncidentStatus.Reopened] = "ujranyitva"
        });

    /// <summary>Severity scale keys (1-5, ISO 45001 matrix axis).</summary>
    public static readonly EnumWireMap<Enums.Severity> Severity = new(
        new Dictionary<Enums.Severity, string>
        {
            [Enums.Severity.Negligible] = "elhanyagolhato",
            [Enums.Severity.Minor] = "enyhe",
            [Enums.Severity.Moderate] = "kozepes",
            [Enums.Severity.Major] = "sulyos",
            [Enums.Severity.Catastrophic] = "katasztrofalis"
        });

    /// <summary>Likelihood scale keys (1-5, ISO 45001 matrix axis).</summary>
    public static readonly EnumWireMap<Enums.Likelihood> Likelihood = new(
        new Dictionary<Enums.Likelihood, string>
        {
            [Enums.Likelihood.Rare] = "ritka",
            [Enums.Likelihood.Unlikely] = "valoszinutlen",
            [Enums.Likelihood.Possible] = "lehetseges",
            [Enums.Likelihood.Likely] = "valoszinu",
            [Enums.Likelihood.AlmostCertain] = "szinte_biztos"
        });

    /// <summary>Risk band keys (config-driven band boundaries, wire names fixed).</summary>
    public static readonly EnumWireMap<Enums.RiskLevel> RiskLevel = new(
        new Dictionary<Enums.RiskLevel, string>
        {
            [Enums.RiskLevel.Low] = "alacsony",
            [Enums.RiskLevel.Medium] = "kozepes",
            [Enums.RiskLevel.High] = "magas",
            [Enums.RiskLevel.Critical] = "kritikus"
        });

    /// <summary>Risk assessment lifecycle keys.</summary>
    public static readonly EnumWireMap<Enums.RiskStatus> RiskStatus = new(
        new Dictionary<Enums.RiskStatus, string>
        {
            [Enums.RiskStatus.Draft] = "piszkozat",
            [Enums.RiskStatus.UnderReview] = "ellenorzes",
            [Enums.RiskStatus.Approved] = "jovahagyva",
            [Enums.RiskStatus.Archived] = "archivalt"
        });

    /// <summary>Location hierarchy node kind keys.</summary>
    public static readonly EnumWireMap<Enums.LocationKind> LocationKind = new(
        new Dictionary<Enums.LocationKind, string>
        {
            [Enums.LocationKind.Site] = "telephely",
            [Enums.LocationKind.Building] = "epulet",
            [Enums.LocationKind.Hall] = "csarnok",
            [Enums.LocationKind.Zone] = "zona",
            [Enums.LocationKind.Outdoor] = "kulteri"
        });

    /// <summary>Hazardous material registry status keys.</summary>
    public static readonly EnumWireMap<Enums.MaterialStatus> MaterialStatus = new(
        new Dictionary<Enums.MaterialStatus, string>
        {
            [Enums.MaterialStatus.Active] = "aktiv",
            [Enums.MaterialStatus.Archived] = "archivalt"
        });

    /// <summary>Computed SDS validity keys.</summary>
    public static readonly EnumWireMap<Enums.SdsValidity> SdsValidity = new(
        new Dictionary<Enums.SdsValidity, string>
        {
            [Enums.SdsValidity.Valid] = "ervenyes",
            [Enums.SdsValidity.Expiring] = "lejaro",
            [Enums.SdsValidity.Expired] = "lejart"
        });

    /// <summary>Computed training certificate validity keys.</summary>
    public static readonly EnumWireMap<Enums.TrainingStatus> TrainingStatus = new(
        new Dictionary<Enums.TrainingStatus, string>
        {
            [Enums.TrainingStatus.Valid] = "ervenyes",
            [Enums.TrainingStatus.Expiring] = "lejaro",
            [Enums.TrainingStatus.Expired] = "lejart"
        });

    /// <summary>PPE (EVE) category keys (EN/ISO grouping).</summary>
    public static readonly EnumWireMap<Enums.PpeCategory> PpeCategory = new(
        new Dictionary<Enums.PpeCategory, string>
        {
            [Enums.PpeCategory.Head] = "fej",
            [Enums.PpeCategory.Eye] = "szem",
            [Enums.PpeCategory.Hearing] = "hallas",
            [Enums.PpeCategory.Respiratory] = "legzes",
            [Enums.PpeCategory.Hand] = "kez",
            [Enums.PpeCategory.Foot] = "lab",
            [Enums.PpeCategory.Body] = "test",
            [Enums.PpeCategory.Fall] = "leeses"
        });

    /// <summary>PPE issuance FSM status keys.</summary>
    public static readonly EnumWireMap<Enums.PpeIssuanceStatus> PpeIssuanceStatus = new(
        new Dictionary<Enums.PpeIssuanceStatus, string>
        {
            [Enums.PpeIssuanceStatus.Issued] = "kiadva",
            [Enums.PpeIssuanceStatus.Acknowledged] = "atveve",
            [Enums.PpeIssuanceStatus.Returned] = "visszaadva",
            [Enums.PpeIssuanceStatus.Replaced] = "cserelve"
        });

    /// <summary>Safety walk FSM status keys.</summary>
    public static readonly EnumWireMap<Enums.SafetyWalkStatus> SafetyWalkStatus = new(
        new Dictionary<Enums.SafetyWalkStatus, string>
        {
            [Enums.SafetyWalkStatus.Scheduled] = "utemezve",
            [Enums.SafetyWalkStatus.InProgress] = "folyamatban",
            [Enums.SafetyWalkStatus.ActionRequired] = "intezkedes_szukseges",
            [Enums.SafetyWalkStatus.Closed] = "lezarva",
            [Enums.SafetyWalkStatus.Cancelled] = "torolve"
        });

    /// <summary>Unified CAPA source keys.</summary>
    public static readonly EnumWireMap<Enums.CapaSource> CapaSource = new(
        new Dictionary<Enums.CapaSource, string>
        {
            [Enums.CapaSource.Incident] = "esemeny",
            [Enums.CapaSource.SafetyWalk] = "bejaras",
            [Enums.CapaSource.RiskAssessment] = "kockazatertekeles"
        });
}
