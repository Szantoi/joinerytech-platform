using SpaceOS.Projects.Domain;
using Xunit;

namespace SpaceOS.Projects.Tests;

/// <summary>
/// The project aggregate (ADR-072 v1): identity, master data, lifecycle label, epic membership.
/// </summary>
public class ProjectTests
{
    private static readonly Guid Tenant = Guid.Parse("11111111-1111-4111-8111-111111111111");
    private static readonly Guid Customer = Guid.Parse("22222222-2222-4222-8222-222222222222");
    private static readonly DateTimeOffset Now = new(2026, 7, 31, 10, 0, 0, TimeSpan.Zero);

    private static Project NewProject(string code = "PRJ-2026-014", Guid? customerId = null)
        => Project.Create(Tenant, ProjectCode.Create(code), "Hegyi lakás — konyha", Now, customerId);

    [Fact]
    public void A_new_project_starts_as_a_draft_with_its_identity_in_place()
    {
        var project = NewProject();

        Assert.NotEqual(Guid.Empty, project.Id);
        Assert.Equal(Tenant, project.TenantId);
        Assert.Equal("PRJ-2026-014", project.Code.Value);
        Assert.Equal("Hegyi lakás — konyha", project.Name);
        Assert.Equal(ProjectLifecycleStatus.Draft, project.Status);
        Assert.Null(project.CustomerId);
        Assert.Empty(project.Epics);
        Assert.Equal(1, project.RowVersion);
    }

    [Fact]
    public void A_project_must_name_its_tenant_and_have_a_name()
    {
        Assert.Throws<ArgumentException>(() =>
            Project.Create(Guid.Empty, ProjectCode.Create("PRJ-1"), "Név", Now));

        Assert.Throws<ArgumentException>(() =>
            Project.Create(Tenant, ProjectCode.Create("PRJ-1"), "   ", Now));
    }

    [Fact]
    public void An_empty_customer_reference_is_a_mistake_not_an_absent_customer()
    {
        // Null means "no customer yet"; Guid.Empty means a value went missing on the way here,
        // and the two must not look alike.
        Assert.Null(NewProject().CustomerId);
        Assert.Equal(Customer, NewProject(customerId: Customer).CustomerId);
        Assert.Throws<ArgumentException>(() => NewProject(customerId: Guid.Empty));
    }

    // ---------------------------------------------------------------------------------------
    // The business code
    // ---------------------------------------------------------------------------------------

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void A_project_code_cannot_be_blank(string value)
        => Assert.Throws<ArgumentException>(() => ProjectCode.Create(value));

    [Fact]
    public void A_project_code_is_bounded()
        => Assert.Throws<ArgumentException>(() => ProjectCode.Create(new string('X', ProjectCode.MaxLength + 1)));

    [Fact]
    public void A_project_code_is_trimmed_and_case_stable()
    {
        // Otherwise "prj-2026-014" and "PRJ-2026-014" become two projects, and the per-tenant
        // uniqueness index would not catch it.
        Assert.Equal("PRJ-2026-014", ProjectCode.Create("  prj-2026-014 ").Value);
        Assert.Equal(ProjectCode.Create("PRJ-2026-014"), ProjectCode.Create("prj-2026-014"));
    }

    // ---------------------------------------------------------------------------------------
    // The lifecycle LABEL — deliberately not an FSM
    // ---------------------------------------------------------------------------------------

    [Fact]
    public void Any_label_may_follow_any_other()
    {
        // This pins a DECISION, not an accident (ADR-072): the Kernel's FlowEpic owns the real
        // state machine, and a second lifecycle authority over the same reality would only teach
        // people to lie to the system. A job put back on hold after installation started is an
        // ordinary Tuesday.
        var project = NewProject();

        project.MoveTo(ProjectLifecycleStatus.Install);
        project.MoveTo(ProjectLifecycleStatus.OnHold);
        project.MoveTo(ProjectLifecycleStatus.Active);
        project.MoveTo(ProjectLifecycleStatus.Done);
        project.MoveTo(ProjectLifecycleStatus.Draft);

        Assert.Equal(ProjectLifecycleStatus.Draft, project.Status);
    }

    [Fact]
    public void Moving_to_the_label_it_already_carries_is_refused()
    {
        var project = NewProject();

        var exception = Assert.Throws<InvalidOperationException>(
            () => project.MoveTo(ProjectLifecycleStatus.Draft));

        Assert.Contains("already", exception.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(1, project.RowVersion);
    }

    [Fact]
    public void The_five_labels_are_the_ones_two_consumers_already_agreed_on()
    {
        // CONFORMANCE PIN. The portal's Projects world (draft/active/install/done/on_hold) and
        // Kontrolling's ProjectLifecycleStatus arrived at the same five INDEPENDENTLY, before
        // this module existed. This test fails if someone "improves" the set here, which would
        // silently desynchronise two shipped consumers.
        Assert.Equal(
            ["Draft", "Active", "Install", "Done", "OnHold"],
            Enum.GetNames<ProjectLifecycleStatus>());
    }

    // ---------------------------------------------------------------------------------------
    // Epic membership — what makes "a unit above the epics" real
    // ---------------------------------------------------------------------------------------

    [Fact]
    public void A_project_ties_several_epics_together()
    {
        var project = NewProject();
        var first = Guid.NewGuid();
        var second = Guid.NewGuid();

        project.AssignEpic(first, Now);
        project.AssignEpic(second, Now.AddHours(1));

        Assert.Equal([first, second], project.Epics.Select(assignment => assignment.EpicId));
        Assert.Equal(Now.AddHours(1), project.Epics[1].AssignedAtUtc);
        Assert.All(project.Epics, assignment => Assert.Equal(project.Id, assignment.ProjectId));
    }

    [Fact]
    public void The_same_epic_cannot_be_added_twice_to_one_project()
    {
        var project = NewProject();
        var epic = Guid.NewGuid();
        project.AssignEpic(epic, Now);

        Assert.Throws<InvalidOperationException>(() => project.AssignEpic(epic, Now));
    }

    [Fact]
    public void An_epic_assignment_must_name_its_epic()
        => Assert.Throws<ArgumentException>(() => NewProject().AssignEpic(Guid.Empty, Now));

    [Fact]
    public void An_epic_belongs_to_at_most_one_project()
    {
        // The rule that makes the aggregation mean anything: an epic counted under two projects
        // would make both projects' reporting wrong. Projects are separate aggregates, so the
        // current owner is handed in as a FACT — the rule itself stays here.
        var epic = Guid.NewGuid();

        Project.EnsureEpicUnassigned(null, epic);   // free: anything goes

        var exception = Assert.Throws<InvalidOperationException>(
            () => Project.EnsureEpicUnassigned(Guid.NewGuid(), epic));

        Assert.Contains("already belongs", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Releasing_an_epic_removes_it_and_refuses_an_unknown_one()
    {
        var project = NewProject();
        var epic = Guid.NewGuid();
        project.AssignEpic(epic, Now);

        project.ReleaseEpic(epic);
        Assert.Empty(project.Epics);

        Assert.Throws<InvalidOperationException>(() => project.ReleaseEpic(epic));
    }

    // ---------------------------------------------------------------------------------------
    // Concurrency token
    // ---------------------------------------------------------------------------------------

    [Fact]
    public void Every_change_moves_the_version_and_a_no_op_does_not()
    {
        var project = NewProject();
        var start = project.RowVersion;

        project.Rename("Hegyi lakás — konyha és nappali");
        project.AssignCustomer(Customer);
        project.MoveTo(ProjectLifecycleStatus.Active);
        project.AssignEpic(Guid.NewGuid(), Now);

        Assert.Equal(start + 4, project.RowVersion);

        // Rewriting the same values changes nothing, so it must not look like a change to a
        // concurrent writer holding the earlier tag.
        project.Rename("Hegyi lakás — konyha és nappali");
        project.AssignCustomer(Customer);

        Assert.Equal(start + 4, project.RowVersion);
    }
}
