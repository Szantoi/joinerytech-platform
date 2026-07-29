using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Collaboration.Application.Repositories;
using SpaceOS.Collaboration.Infrastructure;
using SpaceOS.Collaboration.Infrastructure.Data;
using SpaceOS.Modules.Hosting.Persistence;
using Xunit;

namespace SpaceOS.Collaboration.Tests;

/// <summary>
/// B2B-10 F2 — the module's DbContext really carries the shared tenant interceptor.
/// </summary>
/// <remarks>
/// Registering the interceptor and <i>attaching</i> it to the context are two different things,
/// and only the second one isolates anything. A registration that resolves but never reaches
/// <c>AddInterceptors</c> would leave <c>app.current_tenant_id</c> unset on every connection —
/// which, with the fail-closed policies now in place, means the module quietly returns nothing
/// instead of quietly returning everything. Both are failures; this test rules them out.
/// </remarks>
public class InfrastructureRegistrationTests
{
    private static ServiceProvider BuildProvider()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:CollaborationDatabase"] =
                    "Host=localhost;Port=5432;Database=collaboration_registration_test;Username=none;Password=none",
            })
            .Build();

        var services = new ServiceCollection();
        services.AddLogging();
        services.AddCollaborationInfrastructure(configuration);
        return services.BuildServiceProvider();
    }

    [Fact]
    public void The_db_context_is_built_with_the_shared_tenant_session_interceptor()
    {
        using var provider = BuildProvider();
        using var scope = provider.CreateScope();

        var options = scope.ServiceProvider.GetRequiredService<DbContextOptions<CollaborationDbContext>>();
        var interceptors = options.FindExtension<CoreOptionsExtension>()?.Interceptors ?? [];

        Assert.Contains(interceptors, interceptor => interceptor is SpaceOsTenantSessionInterceptor);
    }

    [Fact]
    public void The_repositories_are_registered_alongside_it()
    {
        using var provider = BuildProvider();
        using var scope = provider.CreateScope();

        Assert.NotNull(scope.ServiceProvider.GetService<IAgreementRepository>());
        Assert.NotNull(scope.ServiceProvider.GetService<IWorkPackageRepository>());
    }

    [Fact]
    public void A_missing_connection_string_fails_loudly_instead_of_defaulting()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddCollaborationInfrastructure(new ConfigurationBuilder().Build());

        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();

        // The options factory runs on first resolution, so this is where the absence surfaces.
        var failure = Assert.Throws<InvalidOperationException>(
            () => scope.ServiceProvider.GetRequiredService<DbContextOptions<CollaborationDbContext>>());

        Assert.Contains(
            CollaborationInfrastructureServiceCollectionExtensions.ConnectionStringName,
            failure.Message,
            StringComparison.Ordinal);
    }

    [Fact]
    public void The_repository_only_overload_leaves_the_context_to_the_caller()
    {
        // Integration tests and design-time tooling use this path; the point of asserting it is
        // that "no interceptor here" stays an explicit, named choice.
        var services = new ServiceCollection();
        services.AddCollaborationRepositories();

        // Asserted on the descriptors, not by resolving: without a DbContext the repositories
        // cannot be constructed at all, and that is the overload's whole point — it registers
        // the repositories and hands the context decision to the caller.
        Assert.Contains(services, descriptor => descriptor.ServiceType == typeof(IAgreementRepository));
        Assert.Contains(services, descriptor => descriptor.ServiceType == typeof(IWorkPackageRepository));
        Assert.DoesNotContain(services, descriptor => descriptor.ServiceType == typeof(CollaborationDbContext));
    }
}
