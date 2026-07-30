namespace SpaceOS.Collaboration.Domain;

/// <summary>
/// The capability vocabulary a <see cref="CollaborationParticipantGrant"/> can carry (B2B-10 F3).
/// </summary>
/// <remarks>
/// <para>
/// Until F3 the scope was free text: a grant could be issued for <c>"subcontract.execute"</c> and
/// checked against nothing, because nothing checked it. A free-text permission that no reader
/// enumerates is not a permission — it is a label. These constants are the readers' side of it.
/// </para>
/// <para>
/// <b>Matching is exact, never prefix-based.</b> A hierarchical match (<c>collaboration.workpackage</c>
/// covering <c>collaboration.workpackage.execute</c>) reads well and broadens silently: adding a
/// new capability under an existing prefix would hand it to every grant already issued for the
/// parent. Widening a grant must be an act, not a side effect of naming.
/// </para>
/// </remarks>
public static class CollaborationCapability
{
    /// <summary>Read the delegated work the agreement carries.</summary>
    public const string WorkPackageRead = "collaboration.workpackage.read";

    /// <summary>Move a delegated work package through its lifecycle.</summary>
    public const string WorkPackageExecute = "collaboration.workpackage.execute";

    /// <summary>Every capability this module recognises.</summary>
    public static IReadOnlyList<string> All { get; } = new[]
    {
        WorkPackageRead,
        WorkPackageExecute
    };

    /// <summary>
    /// Normalises a capability the way <see cref="CollaborationParticipantGrant.Issue"/> stores it,
    /// so that comparison never depends on how the caller typed it.
    /// </summary>
    public static string Normalise(string capability)
        => string.IsNullOrWhiteSpace(capability)
            ? string.Empty
            : capability.Trim().ToLowerInvariant();

    /// <summary>
    /// True when the module recognises the capability.
    /// </summary>
    /// <remarks>
    /// Callers use this to fail loudly on a typo instead of denying access for a reason nobody can
    /// see: an unknown capability can never be satisfied by any grant, so a mistyped constant
    /// would look exactly like a missing permission.
    /// </remarks>
    public static bool IsKnown(string capability)
        => All.Contains(Normalise(capability), StringComparer.Ordinal);
}
