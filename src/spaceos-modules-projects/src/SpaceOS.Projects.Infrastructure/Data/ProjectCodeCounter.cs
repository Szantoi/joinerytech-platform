namespace SpaceOS.Projects.Infrastructure.Data;

/// <summary>
/// The per-tenant, per-year counter behind <c>PRJ-2026-001</c> (ADR-072 §7.3).
/// </summary>
/// <remarks>
/// <para>
/// <b>Infrastructure, not domain, on purpose.</b> A project does not know how its code was
/// derived, and it must not: the numbering scheme is a product decision that can change, while the
/// aggregate's rule ("a project carries a code, unique in its tenant") does not. Putting the
/// counter in the domain would make every future format change a domain change.
/// </para>
/// <para>
/// <b>Why a table and not <c>max(code) + 1</c>.</b> Reading the highest existing code and adding
/// one is a check-then-act: two concurrent creates read the same maximum and both propose the same
/// code. The unique index would reject the second, which turns an ordinary concurrent create into
/// a user-visible error. A counter row updated by a single atomic statement has no window.
/// </para>
/// </remarks>
public sealed class ProjectCodeCounter
{
    /// <summary>The tenant this counter belongs to.</summary>
    public Guid TenantId { get; private set; }

    /// <summary>The calendar year the counter runs in; it restarts each year.</summary>
    public int Year { get; private set; }

    /// <summary>The last number handed out for this tenant and year.</summary>
    public int LastValue { get; private set; }
}
