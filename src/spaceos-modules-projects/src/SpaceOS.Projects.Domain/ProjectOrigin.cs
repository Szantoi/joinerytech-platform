namespace SpaceOS.Projects.Domain;

/// <summary>
/// Where a project came from, when it did not start life here — a CRM order, typically
/// (ADR-072 §7.2).
/// </summary>
/// <remarks>
/// <para>
/// <b>Gábor's decision (2026-08-03), and the word that shaped this type.</b> The question was put
/// as an either/or — is a project born from a CRM order, or standalone? The answer was *"igen a
/// CRM-ből <b>is</b> születhet"*: **both**. So the origin is <b>optional</b> — a project with no
/// origin is not an incomplete project, it is the other legal way of being born — and the create
/// path must never require one.
/// </para>
/// <para>
/// <b>Why it names a system instead of typing the order.</b> ADR-072's first decision is that
/// this module is industry-neutral, and ADR-068 O2 rejected giving the project level to
/// JoineryTech. A <c>CrmOrderId</c> property would quietly undo both. The pair here is opaque in
/// the same sense <see cref="Project.CustomerId"/> is: a pointer, never a copy. The order's
/// lines, price and number stay in CRM — copying them here would create the second truth
/// ADR-072 §4 exists to prevent.
/// </para>
/// <para>
/// <b>The direction of the arrow.</b> CRM calls this module; this module never reads CRM. That is
/// what keeps <c>spaceos.projects</c> deployable without a CRM at all, which is the whole point of
/// it being its own bounded context.
/// </para>
/// <para>
/// <b>Cardinality is deliberately undecided.</b> Whether one order can spawn several projects (a
/// job on two sites) or one project can serve several orders is an open product question. A
/// single optional reference is the smallest thing that satisfies the decision, and because the
/// reference is opaque, growing it into a link table later is an <i>additive</i> change rather
/// than a breaking one.
/// </para>
/// </remarks>
/// <param name="System">The module the project was born in, normalised (e.g. <c>crm</c>).</param>
/// <param name="ExternalId">That module's identifier for the originating record.</param>
public sealed record ProjectOrigin(string System, Guid ExternalId)
{
    /// <summary>Longest accepted system name; the column is bounded and so is this.</summary>
    public const int MaxSystemLength = 32;

    /// <summary>Creates an origin reference from caller input.</summary>
    /// <param name="system">The originating module's name (case-insensitive).</param>
    /// <param name="externalId">The originating record's identifier.</param>
    /// <exception cref="ArgumentException">
    /// The system is missing or too long, or the identifier is empty. An empty identifier is a
    /// caller mistake rather than "no origin": the way to say there is no origin is to pass no
    /// origin at all.
    /// </exception>
    public static ProjectOrigin Create(string system, Guid externalId)
    {
        if (string.IsNullOrWhiteSpace(system))
            throw new ArgumentException(
                "An origin must name the system it came from; an identifier alone cannot be " +
                "resolved by anyone.", nameof(system));

        var trimmed = system.Trim();

        if (trimmed.Length > MaxSystemLength)
            throw new ArgumentException(
                $"An origin system name may be at most {MaxSystemLength} characters; got {trimmed.Length}.",
                nameof(system));

        if (externalId == Guid.Empty)
            throw new ArgumentException(
                "Pass no origin at all for a standalone project; an empty identifier means a " +
                "value went missing on the way here.", nameof(externalId));

        // Lower-cased so that "CRM" and "crm" cannot become two origin systems. Same reasoning as
        // ProjectCode's upper-casing: one normalisation point, because the database compares bytes.
        return new ProjectOrigin(trimmed.ToLowerInvariant(), externalId);
    }
}
