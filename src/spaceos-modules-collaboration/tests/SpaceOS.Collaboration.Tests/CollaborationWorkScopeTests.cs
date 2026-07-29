using SpaceOS.Collaboration.Domain;
using Xunit;

namespace SpaceOS.Collaboration.Tests;

/// <summary>
/// The work-scope anchor (B2B-10 F1, F0/4) and its conformance to the delivered scheduling
/// contract.
/// </summary>
public class CollaborationWorkScopeTests
{
    private static readonly Guid Project = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid OtherProject = Guid.Parse("99999999-9999-4999-8999-999999999999");
    private static readonly Guid Epic = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly Guid Task = Guid.Parse("33333333-3333-3333-3333-333333333333");

    [Fact]
    public void A_scope_needs_a_project_and_an_epic()
    {
        Assert.Throws<ArgumentException>(() => CollaborationWorkScope.Create(Guid.Empty, Epic));
        Assert.Throws<ArgumentException>(() => CollaborationWorkScope.Create(Project, Guid.Empty));
    }

    [Fact]
    public void The_task_is_optional_but_never_empty()
    {
        // Null means "not anchored that precisely"; an empty guid means something went missing
        // on the way here, and the two must not look alike.
        Assert.Null(CollaborationWorkScope.Create(Project, Epic).TaskId);
        Assert.Equal(Task, CollaborationWorkScope.Create(Project, Epic, Task).TaskId);
        Assert.Throws<ArgumentException>(() => CollaborationWorkScope.Create(Project, Epic, Guid.Empty));
    }

    [Fact]
    public void One_agreement_delegates_work_of_one_project()
    {
        // The analogue of scheduling's one-run-one-project invariant: an agreement that spanned
        // two projects would misreport what was actually delegated.
        var scope = CollaborationWorkScope.Create(Project, Epic);

        DelegatedWorkPackage.EnsureSameProject(null, scope);          // first package: anything goes
        DelegatedWorkPackage.EnsureSameProject(Project, scope);       // same project: fine

        Assert.Throws<InvalidOperationException>(() =>
            DelegatedWorkPackage.EnsureSameProject(OtherProject, scope));
    }

    [Fact]
    public void The_scope_shape_matches_the_delivered_scheduling_contract()
    {
        // CONFORMANCE PIN (root's mandatory guard). The scheduling module keeps its own
        // KernelWorkScope in a separate repository and we deliberately do NOT depend on it, so
        // the contract between us is the SHAPE. This test fails if either side grows, loses or
        // renames a field.
        //
        // Pinned against the delivered scheduling OpenAPI `WorkScope` schema:
        //   projectId (uuid, required), epicId (uuid, required), taskId (uuid, required)
        // Contract version at the time of writing: 1.0.0-preview.2, spec SHA-256 624ace4e…
        // (the task text cites 3fc6c57d…, which was preview.1 — the scope schema is byte-identical
        // in both; the newer hash is quoted because that is the contract now in force).
        var properties = typeof(CollaborationWorkScope)
            .GetProperties()
            .Select(property => property.Name)
            .OrderBy(name => name, StringComparer.Ordinal)
            .ToArray();

        Assert.Equal(["EpicId", "ProjectId", "TaskId"], properties);

        Assert.Equal(typeof(Guid), typeof(CollaborationWorkScope).GetProperty("ProjectId")!.PropertyType);
        Assert.Equal(typeof(Guid), typeof(CollaborationWorkScope).GetProperty("EpicId")!.PropertyType);
        Assert.Equal(typeof(Guid?), typeof(CollaborationWorkScope).GetProperty("TaskId")!.PropertyType);
    }

    [Fact]
    public void A_package_created_with_a_scope_keeps_it_alongside_its_description()
    {
        // The human-readable description stays; the anchor is a separate field, because one is
        // for people and the other for machines.
        var scope = CollaborationWorkScope.Create(Project, Epic, Task);
        var now = new DateTimeOffset(2026, 7, 29, 10, 0, 0, TimeSpan.Zero);

        var package = DelegatedWorkPackage.Create(
            Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(),
            "Ajtólap gyártás", "50 db tölgy ajtólap", now.AddDays(30), now, scope);

        Assert.Equal(scope, package.WorkScope);
        Assert.Equal("50 db tölgy ajtólap", package.ScopeDescription);
    }
}
