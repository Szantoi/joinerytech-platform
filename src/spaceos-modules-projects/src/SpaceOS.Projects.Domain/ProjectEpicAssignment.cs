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

    /// <summary>Opaque reference to the Kernel <c>FlowEpic</c>; never a foreign key.</summary>
    public Guid EpicId { get; private set; }

    /// <summary>When the epic became part of the project.</summary>
    public DateTimeOffset AssignedAtUtc { get; private set; }

    private ProjectEpicAssignment() { }

    internal static ProjectEpicAssignment Record(Guid projectId, Guid epicId, DateTimeOffset assignedAtUtc)
        => new()
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            EpicId = epicId,
            AssignedAtUtc = assignedAtUtc
        };
}
