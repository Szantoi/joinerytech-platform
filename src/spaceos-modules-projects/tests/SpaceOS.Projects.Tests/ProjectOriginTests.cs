using SpaceOS.Projects.Domain;
using Xunit;

namespace SpaceOS.Projects.Tests;

/// <summary>
/// The origin reference introduced by Gábor's ADR-072 §7.2 decision (2026-08-03).
/// </summary>
public class ProjectOriginTests
{
    [Fact]
    public void A_project_can_be_created_with_no_origin_at_all()
    {
        // THE decision, as a test. The question was asked as either/or and answered "a CRM-ből IS
        // születhet" — both births are legal, so a project without an origin is not incomplete.
        // If a later change makes the origin mandatory, this is the test that says who decided
        // otherwise and when.
        var project = Project.Create(
            Guid.NewGuid(), ProjectCode.Create("PRJ-2026-001"), "Standalone", DateTimeOffset.UtcNow);

        Assert.Null(project.Origin);
        Assert.Null(project.OriginSystem);
        Assert.Null(project.OriginExternalId);
    }

    [Fact]
    public void A_project_born_from_a_CRM_order_keeps_an_opaque_reference_to_it()
    {
        var orderId = Guid.NewGuid();

        var project = Project.Create(
            Guid.NewGuid(), ProjectCode.Create("PRJ-2026-002"), "From an order", DateTimeOffset.UtcNow,
            origin: ProjectOrigin.Create("crm", orderId));

        Assert.Equal(new ProjectOrigin("crm", orderId), project.Origin);
    }

    [Fact]
    public void The_system_name_is_normalised_so_CRM_and_crm_are_one_origin_system()
    {
        var id = Guid.NewGuid();

        Assert.Equal(ProjectOrigin.Create("crm", id), ProjectOrigin.Create("  CRM  ", id));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void An_origin_without_a_system_is_refused(string system) =>
        Assert.Throws<ArgumentException>(() => ProjectOrigin.Create(system, Guid.NewGuid()));

    [Fact]
    public void An_origin_system_longer_than_the_column_is_refused() =>
        Assert.Throws<ArgumentException>(() =>
            ProjectOrigin.Create(new string('x', ProjectOrigin.MaxSystemLength + 1), Guid.NewGuid()));

    [Fact]
    public void An_empty_identifier_is_a_lost_value_not_a_missing_origin()
    {
        // The way to say "no origin" is to pass no origin. An empty GUID reaching here means
        // something upstream dropped a value, and storing it would make a standalone project and
        // a broken CRM hand-off indistinguishable afterwards.
        Assert.Throws<ArgumentException>(() => ProjectOrigin.Create("crm", Guid.Empty));
    }
}
