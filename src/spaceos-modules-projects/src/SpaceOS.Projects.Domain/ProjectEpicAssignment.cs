namespace SpaceOS.Projects.Domain;

/// <summary>
/// One Kernel flow-epic tied to a project — the link that makes "a project is a unit above the
/// epics" real (ADR-072).
/// </summary>
/// <remarks>
/// An entity rather than a bare <c>Guid</c> in a list, for one reason that shows up later:
/// <see cref="AssignedAtUtc"/>. A project's reporting has to answer "what belonged to it WHEN",
/// and a plain id collection cannot. It stays deliberately thin otherwise — no title, no status,
/// no dates copied from the epic: those live in the Kernel, and a copy here would be a second
/// truth that drifts on the first Kernel update nobody mirrors.
/// </remarks>
public class ProjectEpicAssignment
{
    public Guid Id { get; private set; }

    /// <summary>The project this assignment belongs to.</summary>
    public Guid ProjectId { get; private set; }

    /// <summary>
    /// The owning tenant — the same one the parent project carries.
    /// </summary>
    /// <remarks>
    /// <b>Denormalised on purpose, and it is not for convenience.</b> "An epic belongs to at most
    /// one project" is the invariant that makes this aggregation mean anything, and
    /// <see cref="Project.EnsureEpicUnassigned"/> can only enforce it as a check-then-act: two
    /// concurrent assignments of the same epic both read "free" and both write. Only a unique
    /// index closes that race, and an index needs the tenant in the same row — a child that
    /// borrowed its parent's tenant through a join could not be indexed on
    /// <c>(TenantId, EpicId)</c>.
    /// <para>
    /// It is scoped per tenant rather than globally for a reason worth stating: a globally unique
    /// index would also reject an epic already claimed inside <i>another</i> tenant, which turns a
    /// write conflict into a cross-tenant existence oracle. Whether two tenants may claim one
    /// Kernel epic is a question for the Kernel, where the epic actually lives.
    /// </para>
    /// </remarks>
    public Guid TenantId { get; private set; }

    /// <summary>Opaque reference to the Kernel <c>FlowEpic</c>; never a foreign key.</summary>
    public Guid EpicId { get; private set; }

    /// <summary>When the epic became part of the project.</summary>
    public DateTimeOffset AssignedAtUtc { get; private set; }

    private ProjectEpicAssignment() { }

    internal static ProjectEpicAssignment Record(
        Guid projectId, Guid tenantId, Guid epicId, DateTimeOffset assignedAtUtc)
        => new()
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            TenantId = tenantId,
            EpicId = epicId,
            AssignedAtUtc = assignedAtUtc
        };
}
