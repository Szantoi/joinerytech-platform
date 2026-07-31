namespace SpaceOS.Projects.Domain;

/// <summary>
/// Where a project stands in its life (ADR-072 §4).
/// </summary>
/// <remarks>
/// <para>
/// <b>These five labels are not invented here.</b> The portal's Projects world
/// (<c>draft/active/install/done/on_hold</c>) and the Kontrolling module's own
/// <c>ProjectLifecycleStatus</c> (<c>Draft/Active/Install/Done/OnHold</c>) arrived at the same
/// five independently, before this module existed. That agreement is the evidence the concept
/// was settled in the product long before it had a home — so this enum COPIES it rather than
/// improving on it. Changing a label here is a product decision, not a refactor.
/// </para>
/// <para>
/// A label, deliberately <b>not</b> an FSM. Kontrolling's port documents its own copy the same
/// way ("Lifecycle label — not an FSM"), and the Kernel's <c>FlowEpic</c> already owns the real
/// state machine for the work underneath. A project that also enforced transitions would be a
/// second lifecycle authority over the same reality.
/// </para>
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
