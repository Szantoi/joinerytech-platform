namespace SpaceOS.Collaboration.Domain;

/// <summary>
/// Which Kernel work a delegated package serves: project → epic → (optional) task.
/// </summary>
/// <remarks>
/// <para>
/// <b>Structurally identical to the scheduling module's work scope, deliberately NOT shared.</b>
/// (Root decision, B2B-10 F1.) A package dependency from Collaboration to Scheduling would tie
/// two peer module repositories together in the wrong direction for the sake of a three-field
/// value object. The contract here is the SHAPE — same three fields, same meaning, same wire
/// form — and a conformance test pins it against the delivered scheduling contract so a drift
/// fails instead of quietly parting ways.
/// </para>
/// <para>
/// The guest receives this as an OPAQUE identifier (ADR-068 §11, one-way projection): it does
/// not resolve the ids, and does not need to. It is an anchor for the host's own systems, not a
/// window into them.
/// </para>
/// <para>
/// This does NOT replace <c>ScopeDescription</c> — that stays as the human-readable title. One
/// is for people, the other for machines, and collapsing them would lose whichever audience was
/// not thought of first.
/// </para>
/// </remarks>
public sealed record CollaborationWorkScope
{
    private CollaborationWorkScope(Guid projectId, Guid epicId, Guid? taskId)
    {
        ProjectId = projectId;
        EpicId = epicId;
        TaskId = taskId;
    }

    /// <summary>Kernel project the work belongs to; required.</summary>
    public Guid ProjectId { get; }

    /// <summary>Kernel epic the work belongs to; required.</summary>
    public Guid EpicId { get; }

    /// <summary>Kernel task, when the work is anchored that precisely; optional.</summary>
    public Guid? TaskId { get; }

    /// <summary>Creates a scope.</summary>
    /// <remarks>
    /// Project and epic are mandatory because a delegated package with no epic cannot be
    /// reported against anything the host plans; the task is optional because work is often
    /// delegated before it is broken down that far.
    /// </remarks>
    /// <exception cref="ArgumentException">Project or epic is missing, or the task is empty.</exception>
    public static CollaborationWorkScope Create(Guid projectId, Guid epicId, Guid? taskId = null)
    {
        if (projectId == Guid.Empty)
            throw new ArgumentException("A work scope must name its project.", nameof(projectId));

        if (epicId == Guid.Empty)
            throw new ArgumentException("A work scope must name its epic.", nameof(epicId));

        // An explicitly empty task is a caller mistake, not "no task": passing Guid.Empty means
        // something was expected there and did not arrive.
        if (taskId == Guid.Empty)
            throw new ArgumentException(
                "Pass null for an unanchored task; an empty identifier means a value went missing.",
                nameof(taskId));

        return new CollaborationWorkScope(projectId, epicId, taskId);
    }
}
