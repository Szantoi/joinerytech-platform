using SpaceOS.Projects.Application.Projects;
using SpaceOS.Projects.Application.Repositories;
using SpaceOS.Projects.Application.Tenancy;
using SpaceOS.Projects.Domain;
using Xunit;

namespace SpaceOS.Projects.Tests;

/// <summary>
/// The five commands, against in-memory doubles.
/// </summary>
/// <remarks>
/// <b>What these tests cannot see, stated up front.</b> The doubles below have no query filter and
/// no RLS, so nothing here proves tenant isolation — that property belongs to the database and is
/// measured in <c>SpaceOS.Projects.IntegrationTests</c> against a real, non-superuser PostgreSQL.
/// Likewise the "one epic, one project" invariant is enforced by a unique index; the handler check
/// tested here is the friendly error, not the guarantee.
/// </remarks>
public class ProjectCommandHandlerTests
{
    private static readonly Guid Tenant = Guid.NewGuid();
    private static readonly DateTimeOffset Now = new(2026, 8, 3, 19, 0, 0, TimeSpan.Zero);

    private sealed class FixedTenant : ICurrentTenant
    {
        public Guid TenantId => Tenant;
    }

    private sealed class FixedClock : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => Now;
    }

    /// <summary>Hands out codes from a queue, so a test never depends on a format.</summary>
    private sealed class StubAllocator(params string[] codes) : IProjectCodeAllocator
    {
        private readonly Queue<string> _codes = new(codes.Length == 0 ? ["PRJ-TEST-001"] : codes);

        public int Calls { get; private set; }

        public Task<ProjectCode> AllocateAsync(CancellationToken cancellationToken = default)
        {
            Calls++;
            return Task.FromResult(ProjectCode.Create(_codes.Dequeue()));
        }
    }

    private sealed class InMemoryProjectRepository : IProjectRepository
    {
        private readonly List<Project> _projects = [];

        public int SaveCount { get; private set; }

        public void Seed(Project project) => _projects.Add(project);

        public Task<Project?> GetByIdAsync(Guid projectId, CancellationToken cancellationToken = default) =>
            Task.FromResult(_projects.SingleOrDefault(p => p.Id == projectId));

        public Task<Project?> GetByCodeAsync(ProjectCode code, CancellationToken cancellationToken = default) =>
            Task.FromResult(_projects.SingleOrDefault(p => p.Code == code));

        public Task<bool> CodeExistsAsync(ProjectCode code, CancellationToken cancellationToken = default) =>
            Task.FromResult(_projects.Any(p => p.Code == code));

        public Task<Guid?> FindOwningProjectIdAsync(Guid epicId, CancellationToken cancellationToken = default) =>
            Task.FromResult(_projects
                .Where(p => p.Epics.Any(e => e.EpicId == epicId))
                .Select(p => (Guid?)p.Id)
                .SingleOrDefault());

        public void Add(Project project) => _projects.Add(project);

        public Task SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            SaveCount++;
            return Task.CompletedTask;
        }
    }

    private static (ProjectCommandHandlers Handlers, InMemoryProjectRepository Repository, StubAllocator Allocator)
        Build(params string[] codes)
    {
        var repository = new InMemoryProjectRepository();
        var allocator = new StubAllocator(codes);
        var handlers = new ProjectCommandHandlers(repository, new FixedTenant(), allocator, new FixedClock());
        return (handlers, repository, allocator);
    }

    private static Project SeededProject(InMemoryProjectRepository repository, string code = "PRJ-TEST-900")
    {
        var project = Project.Create(Tenant, ProjectCode.Create(code), "Seeded", Now);
        repository.Seed(project);
        return project;
    }

    [Fact]
    public async Task Create_allocates_the_code_rather_than_taking_one_from_the_caller()
    {
        // ADR-072 §7.2/D3: with two independent birth paths (CRM and standalone), a caller-supplied
        // code is how the portal and Kontrolling ended up with two formats for one concept. If a
        // Code property ever appears on CreateProjectCommand, this test is the objection.
        var (handlers, repository, allocator) = Build("PRJ-ALLOC-1");

        var result = await handlers.Handle(new CreateProjectCommand("Kitchen refit"), default);

        Assert.Equal(1, allocator.Calls);
        var stored = await repository.GetByIdAsync(result.ProjectId);
        Assert.Equal("PRJ-ALLOC-1", stored!.Code.Value);
    }

    [Fact]
    public async Task Create_without_an_origin_is_a_legal_birth()
    {
        var (handlers, repository, _) = Build();

        var result = await handlers.Handle(new CreateProjectCommand("Standalone"), default);

        var stored = await repository.GetByIdAsync(result.ProjectId);
        Assert.Null(stored!.Origin);
    }

    [Fact]
    public async Task Create_from_a_CRM_order_stores_the_origin()
    {
        var (handlers, repository, _) = Build();
        var orderId = Guid.NewGuid();

        var result = await handlers.Handle(
            new CreateProjectCommand("From order", Origin: ProjectOrigin.Create("crm", orderId)), default);

        var stored = await repository.GetByIdAsync(result.ProjectId);
        Assert.Equal(new ProjectOrigin("crm", orderId), stored!.Origin);
    }

    [Fact]
    public async Task Create_puts_the_project_under_the_calling_tenant_not_one_the_command_names()
    {
        var (handlers, repository, _) = Build();

        var result = await handlers.Handle(new CreateProjectCommand("Ambient tenant"), default);

        Assert.Equal(Tenant, (await repository.GetByIdAsync(result.ProjectId))!.TenantId);
    }

    [Fact]
    public async Task A_project_the_caller_cannot_see_is_reported_as_not_found()
    {
        var (handlers, _, _) = Build();

        await Assert.ThrowsAsync<ProjectNotFoundException>(() =>
            handlers.Handle(new RenameProjectCommand(Guid.NewGuid(), "Nope"), default));
    }

    [Fact]
    public async Task A_stale_If_Match_is_refused_and_reports_both_versions()
    {
        var (handlers, repository, _) = Build();
        var project = SeededProject(repository);

        var failure = await Assert.ThrowsAsync<ProjectPreconditionFailedException>(() =>
            handlers.Handle(new RenameProjectCommand(project.Id, "Renamed", ExpectedRowVersion: 99), default));

        Assert.Equal(99, failure.ExpectedRowVersion);
        Assert.Equal(project.RowVersion, failure.ActualRowVersion);
    }

    [Fact]
    public async Task An_invisible_project_reports_not_found_even_when_the_precondition_is_also_wrong()
    {
        // Ordering, not politeness (the B2B-10 F3/3a lesson): if the version were checked first,
        // a 412 on an unknown id would confirm that the id exists somewhere. Not-found has to win.
        var (handlers, _, _) = Build();

        await Assert.ThrowsAsync<ProjectNotFoundException>(() =>
            handlers.Handle(new RenameProjectCommand(Guid.NewGuid(), "Nope", ExpectedRowVersion: 1), default));
    }

    [Fact]
    public async Task A_matching_If_Match_lets_the_change_through_and_returns_the_new_version()
    {
        var (handlers, repository, _) = Build();
        var project = SeededProject(repository);
        var before = project.RowVersion;

        var result = await handlers.Handle(
            new RenameProjectCommand(project.Id, "Renamed", ExpectedRowVersion: before), default);

        Assert.Equal(before + 1, result.RowVersion);
        Assert.Equal("Renamed", (await repository.GetByIdAsync(project.Id))!.Name);
        Assert.Equal(1, repository.SaveCount);
    }

    [Fact]
    public async Task Moving_the_lifecycle_label_saves_the_new_status()
    {
        var (handlers, repository, _) = Build();
        var project = SeededProject(repository);

        await handlers.Handle(
            new ChangeProjectStatusCommand(project.Id, ProjectLifecycleStatus.Install), default);

        Assert.Equal(ProjectLifecycleStatus.Install, (await repository.GetByIdAsync(project.Id))!.Status);
    }

    [Fact]
    public async Task An_epic_already_owned_by_another_project_cannot_be_assigned()
    {
        var (handlers, repository, _) = Build();
        var owner = SeededProject(repository, "PRJ-TEST-901");
        var other = SeededProject(repository, "PRJ-TEST-902");
        var epicId = Guid.NewGuid();
        await handlers.Handle(new AssignEpicCommand(owner.Id, epicId), default);

        var failure = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            handlers.Handle(new AssignEpicCommand(other.Id, epicId), default));

        Assert.Contains(owner.Id.ToString(), failure.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Re_assigning_an_epic_to_the_project_that_already_has_it_reports_that_and_not_a_conflict()
    {
        // Without the same-owner short-circuit in the handler this would say "belongs to <itself>",
        // which sends the reader looking for a second project that does not exist.
        var (handlers, repository, _) = Build();
        var project = SeededProject(repository);
        var epicId = Guid.NewGuid();
        await handlers.Handle(new AssignEpicCommand(project.Id, epicId), default);

        var failure = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            handlers.Handle(new AssignEpicCommand(project.Id, epicId), default));

        Assert.Contains("already part of this project", failure.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task An_assigned_epic_records_when_it_joined()
    {
        var (handlers, repository, _) = Build();
        var project = SeededProject(repository);
        var epicId = Guid.NewGuid();

        await handlers.Handle(new AssignEpicCommand(project.Id, epicId), default);

        var assignment = Assert.Single((await repository.GetByIdAsync(project.Id))!.Epics);
        Assert.Equal(epicId, assignment.EpicId);
        Assert.Equal(Now, assignment.AssignedAtUtc);
        Assert.Equal(Tenant, assignment.TenantId);
    }

    [Fact]
    public async Task Releasing_an_epic_frees_it_for_another_project()
    {
        var (handlers, repository, _) = Build();
        var first = SeededProject(repository, "PRJ-TEST-903");
        var second = SeededProject(repository, "PRJ-TEST-904");
        var epicId = Guid.NewGuid();
        await handlers.Handle(new AssignEpicCommand(first.Id, epicId), default);

        await handlers.Handle(new ReleaseEpicCommand(first.Id, epicId), default);
        await handlers.Handle(new AssignEpicCommand(second.Id, epicId), default);

        Assert.Empty((await repository.GetByIdAsync(first.Id))!.Epics);
        Assert.Single((await repository.GetByIdAsync(second.Id))!.Epics);
    }
}
