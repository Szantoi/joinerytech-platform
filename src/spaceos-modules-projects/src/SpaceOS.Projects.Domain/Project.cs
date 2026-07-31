namespace SpaceOS.Projects.Domain;

/// <summary>
/// A customer job: the unit that ties several Kernel flow-epics together (ADR-072).
/// </summary>
/// <remarks>
/// <para>
/// <b>Why this aggregate exists.</b> Gábor's product decision (2026-07-31): *"a projekt az epikek
/// felett egy összefogó egység"*. Before it, four consumers referenced a project that no module
/// owned — the portal's Projects world (running on mocks), Kontrolling's two parallel stub ports,
/// and the collaboration/scheduling work scopes carrying an unresolvable <c>projectId</c>.
/// </para>
/// <para>
/// <b>What it deliberately does NOT own</b> (ADR-072 §4): line items and prices stay with CRM,
/// margin and cost lines with Kontrolling, and the work itself with the Kernel's
/// <c>FlowEpic</c>. This aggregate owns identity, master data, lifecycle label and the
/// epic membership — nothing that already has a home elsewhere.
/// </para>
/// </remarks>
public class Project
{
    /// <summary>Internal identifier — what other modules already store in their work scopes.</summary>
    public Guid Id { get; private set; }

    /// <summary>Owning tenant; every read is filtered by it (RLS + query filter).</summary>
    public Guid TenantId { get; private set; }

    /// <summary>Human-facing business key; unique per tenant.</summary>
    public ProjectCode Code { get; private set; } = null!;

    /// <summary>What people call this job.</summary>
    public string Name { get; private set; } = string.Empty;

    /// <summary>Lifecycle label — see <see cref="ProjectLifecycleStatus"/>.</summary>
    public ProjectLifecycleStatus Status { get; private set; }

    /// <summary>
    /// The customer this job is for — an opaque reference to whatever CRM owns.
    /// </summary>
    /// <remarks>
    /// A bare identifier on purpose, not a copied name. The portal's mock carries
    /// <c>customer: string</c>, but storing that string here would create a second customer name
    /// that drifts the first time CRM renames one. Optional, because a project can be drafted
    /// before the customer record exists.
    /// </remarks>
    public Guid? CustomerId { get; private set; }

    public DateTimeOffset CreatedAtUtc { get; private set; }

    /// <summary>Optimistic concurrency token; increments on every change.</summary>
    public int RowVersion { get; private set; }

    private readonly List<ProjectEpicAssignment> _epics = new();

    /// <summary>The Kernel flow-epics this project ties together.</summary>
    public IReadOnlyList<ProjectEpicAssignment> Epics => _epics.AsReadOnly();

    private Project() { }

    /// <summary>Opens a new project.</summary>
    /// <exception cref="ArgumentException">Missing tenant, code or name.</exception>
    public static Project Create(
        Guid tenantId,
        ProjectCode code,
        string name,
        DateTimeOffset createdAtUtc,
        Guid? customerId = null)
    {
        ArgumentNullException.ThrowIfNull(code);

        if (tenantId == Guid.Empty)
            throw new ArgumentException("A project must name its tenant.", nameof(tenantId));

        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("A project must have a name.", nameof(name));

        // An explicitly empty customer is a caller mistake, not "no customer yet": passing
        // Guid.Empty means something was expected there and did not arrive.
        if (customerId == Guid.Empty)
            throw new ArgumentException(
                "Pass null for a project with no customer yet; an empty identifier means a value went missing.",
                nameof(customerId));

        return new Project
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Code = code,
            Name = name.Trim(),
            Status = ProjectLifecycleStatus.Draft,
            CustomerId = customerId,
            CreatedAtUtc = createdAtUtc,
            RowVersion = 1
        };
    }

    /// <summary>Renames the project.</summary>
    public void Rename(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("A project must have a name.", nameof(name));

        var trimmed = name.Trim();

        if (trimmed == Name)
            return;

        Name = trimmed;
        RowVersion++;
    }

    /// <summary>Attaches the project to a customer, or moves it to another one.</summary>
    public void AssignCustomer(Guid customerId)
    {
        if (customerId == Guid.Empty)
            throw new ArgumentException("A customer reference cannot be empty.", nameof(customerId));

        if (customerId == CustomerId)
            return;

        CustomerId = customerId;
        RowVersion++;
    }

    /// <summary>
    /// Moves the lifecycle label.
    /// </summary>
    /// <remarks>
    /// <b>Any label may follow any other, on purpose.</b> This is a label, not a state machine —
    /// the same stance Kontrolling's port already documents for its copy. The real state machine
    /// for the work lives on the Kernel's <c>FlowEpic</c>, and a project that also enforced
    /// transitions would be a second lifecycle authority over the same reality: a job put back
    /// on hold after installation started is an ordinary Tuesday, and a rule forbidding it would
    /// only teach people to lie to the system. Setting the label it already has is refused,
    /// because there is nothing to record.
    /// </remarks>
    /// <exception cref="InvalidOperationException">The project already carries this label.</exception>
    public void MoveTo(ProjectLifecycleStatus status)
    {
        if (status == Status)
            throw new InvalidOperationException($"The project is already {Status}.");

        Status = status;
        RowVersion++;
    }

    /// <summary>
    /// Guards the "an epic belongs to at most one project" invariant across aggregates.
    /// </summary>
    /// <remarks>
    /// The rule that makes the aggregation mean anything: an epic counted under two projects
    /// would make both projects' reporting wrong, and neither would be detectably at fault.
    /// Projects are separate aggregates, so the check needs the current owner handed in — the
    /// caller that can query it is the only one who can. Keeping the RULE here (rather than
    /// writing an `if` in a handler) means there is still one place that says what it means.
    /// </remarks>
    /// <param name="currentOwnerProjectId">The project the epic belongs to today, or null.</param>
    /// <param name="epicId">The epic being assigned.</param>
    /// <exception cref="InvalidOperationException">The epic already belongs to another project.</exception>
    public static void EnsureEpicUnassigned(Guid? currentOwnerProjectId, Guid epicId)
    {
        if (currentOwnerProjectId is { } owner)
            throw new InvalidOperationException(
                $"Flow-epic {epicId} already belongs to project {owner}; an epic counted under two " +
                "projects would make both projects' reporting wrong.");
    }

    /// <summary>Ties a Kernel flow-epic to this project.</summary>
    /// <remarks>
    /// The epic id is an opaque UUID reference (the ADR-068 §5 <c>EpicKernelId</c> pattern): this
    /// module never joins to Kernel tables, and whether the epic EXISTS is verified by the caller
    /// against the Kernel, not here — the same on-behalf-of resolution the collaboration module
    /// uses for its work-scope anchor.
    /// </remarks>
    /// <exception cref="ArgumentException">The epic id is empty.</exception>
    /// <exception cref="InvalidOperationException">This project already carries that epic.</exception>
    public ProjectEpicAssignment AssignEpic(Guid epicId, DateTimeOffset assignedAtUtc)
    {
        if (epicId == Guid.Empty)
            throw new ArgumentException("An epic assignment must name its epic.", nameof(epicId));

        if (_epics.Any(assignment => assignment.EpicId == epicId))
            throw new InvalidOperationException(
                $"Flow-epic {epicId} is already part of this project.");

        var assignment = ProjectEpicAssignment.Record(Id, epicId, assignedAtUtc);

        _epics.Add(assignment);
        RowVersion++;

        return assignment;
    }

    /// <summary>Detaches a flow-epic from this project.</summary>
    /// <exception cref="InvalidOperationException">The epic is not part of this project.</exception>
    public void ReleaseEpic(Guid epicId)
    {
        var assignment = _epics.SingleOrDefault(entry => entry.EpicId == epicId)
            ?? throw new InvalidOperationException(
                $"Flow-epic {epicId} is not part of this project.");

        _epics.Remove(assignment);
        RowVersion++;
    }
}
