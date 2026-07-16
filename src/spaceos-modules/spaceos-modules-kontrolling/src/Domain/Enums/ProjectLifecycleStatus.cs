namespace SpaceOS.Modules.Kontrolling.Domain.Enums;

/// <summary>
/// Project lifecycle label for the controlling portfolio views.
/// </summary>
/// <remarks>
/// DELIBERATELY NOT A STATE MACHINE. The Kontrolling module is a read-side
/// (calculating) module: it never transitions a project, it only reports on one.
/// The label is owned by the project master data (sourced through
/// <see cref="Application.Services.IIntegrationDataProvider"/>) and is echoed
/// as-is — there are no transition endpoints and no guards, unlike the QA /
/// Maintenance / EHS aggregates.
/// </remarks>
public enum ProjectLifecycleStatus
{
    /// <summary>Quotation / calculation stage — planned cost only, no actuals yet.</summary>
    Draft = 1,

    /// <summary>Running project (manufacturing).</summary>
    Active = 2,

    /// <summary>On-site installation stage.</summary>
    Install = 3,

    /// <summary>Finished and handed over.</summary>
    Done = 4,

    /// <summary>Temporarily suspended.</summary>
    OnHold = 5
}
