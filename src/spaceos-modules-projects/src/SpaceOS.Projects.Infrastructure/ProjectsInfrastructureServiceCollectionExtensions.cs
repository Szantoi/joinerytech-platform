using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Modules.Hosting.Persistence;
using SpaceOS.Modules.Hosting.Tenancy;
using SpaceOS.Projects.Application.Projects;
using SpaceOS.Projects.Application.Repositories;
using SpaceOS.Projects.Application.Tenancy;
using SpaceOS.Projects.Infrastructure.Data;
using SpaceOS.Projects.Infrastructure.Tenancy;

namespace SpaceOS.Projects.Infrastructure;

/// <summary>
/// Registers the projects persistence: the DbContext with the shared ADR-062 RLS session
/// interceptor, the repository, and the tenant adapter the application layer asked for.
/// </summary>
public static class ProjectsInfrastructureServiceCollectionExtensions
{
    /// <summary>The configuration key holding this module's PostgreSQL connection string.</summary>
    public const string ConnectionStringName = "ProjectsDatabase";

    /// <summary>Adds the tenant-intercepted DbContext and the EF-backed repository.</summary>
    /// <param name="services">The container.</param>
    /// <param name="configuration">Supplies <c>ConnectionStrings:ProjectsDatabase</c>.</param>
    /// <exception cref="InvalidOperationException">
    /// The connection string is missing. Deliberately fatal at first resolution rather than
    /// falling back to a localhost default: a module that silently connects somewhere else is
    /// worse than one that refuses to start.
    /// </exception>
    public static IServiceCollection AddProjectsPersistence(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        // Shared tenant context + RLS session interceptor (ADR-061/062). Registered here, in the
        // module, rather than left to each host — leaving it optional is precisely how a module
        // ends up deployed with policies nothing satisfies.
        services.AddSpaceOsModuleTenancy();

        services.AddDbContext<ProjectsDbContext>((serviceProvider, options) =>
        {
            var connectionString = configuration.GetConnectionString(ConnectionStringName)
                ?? throw new InvalidOperationException(
                    $"ConnectionStrings:{ConnectionStringName} is not configured for the projects module host.");

            options
                .UseNpgsql(connectionString)
                .AddInterceptors(serviceProvider.GetRequiredService<SpaceOsTenantSessionInterceptor>());
        });

        return services.AddProjectsRepositories();
    }

    /// <summary>
    /// Adds only the repository and the tenant adapter, for callers that own the
    /// <see cref="ProjectsDbContext"/> registration themselves — integration tests and tooling.
    /// </summary>
    /// <remarks>
    /// Kept separate and named for what it is, so "no interceptor" is always a visible choice at
    /// the call site rather than a side effect of picking the shorter overload.
    /// </remarks>
    public static IServiceCollection AddProjectsRepositories(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        services.AddScoped<IProjectRepository, ProjectRepository>();
        services.AddScoped<Application.Projects.IProjectDirectory, ProjectDirectory>();
        services.AddScoped<Application.Idempotency.IIdempotencyStore, EfIdempotencyStore>();
        services.AddScoped<ICurrentTenant, TenantContextCurrentTenant>();

        // ADR-072 §7.3 (Gábor, 2026-08-03): PRJ-<year>-<sequence>, allocated by the module. Until
        // that decision landed this port deliberately had no implementation, so that no default
        // format could answer the question quietly.
        services.AddScoped<IProjectCodeAllocator, SequentialProjectCodeAllocator>();

        return services;
    }
}
