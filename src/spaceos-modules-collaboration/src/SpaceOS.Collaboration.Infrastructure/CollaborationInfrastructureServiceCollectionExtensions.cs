using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using SpaceOS.Collaboration.Application.Adapters;
using SpaceOS.Collaboration.Application.Idempotency;
using SpaceOS.Collaboration.Application.Projections;
using SpaceOS.Collaboration.Application.Repositories;
using SpaceOS.Collaboration.Infrastructure.Data;
using SpaceOS.Collaboration.Infrastructure.Kernel;
using SpaceOS.Modules.Hosting.Persistence;
using SpaceOS.Modules.Hosting.Tenancy;

namespace SpaceOS.Collaboration.Infrastructure;

/// <summary>
/// Registers the Collaboration persistence: the DbContext with the shared RLS session
/// interceptor, and the repositories the application layer declares.
/// </summary>
/// <remarks>
/// <para>
/// Tenancy comes from the ADR-061/062 hosting baseline: the claims-backed
/// <c>ITenantContext</c> plus the fail-loud <see cref="SpaceOsTenantSessionInterceptor"/>, which
/// writes <c>app.current_tenant_id</c> on every opened connection and clears it before the
/// connection returns to the pool. This is the same registration the other six module
/// infrastructures use, and wiring it here rather than in each host is what stops the module
/// from acquiring a private interceptor copy later.
/// </para>
/// <para>
/// <b>Until F2 this method registered repositories only</b>, on the reasoning that the host owns
/// the DbContext. That left the module in a state where nothing set the session key at all,
/// while the migrations already installed <c>FORCE ROW LEVEL SECURITY</c> policies that read it
/// — the policies had no counterpart in the application. The connection string stays the host's
/// business; the interceptor does not, because leaving it optional is precisely how a module
/// ends up running without isolation.
/// </para>
/// </remarks>
public static class CollaborationInfrastructureServiceCollectionExtensions
{
    /// <summary>The configuration key holding this module's PostgreSQL connection string.</summary>
    public const string ConnectionStringName = "CollaborationDatabase";

    /// <summary>
    /// Adds the Collaboration DbContext (tenant-intercepted) and the EF-backed repositories.
    /// </summary>
    /// <param name="services">The container.</param>
    /// <param name="configuration">Supplies <c>ConnectionStrings:CollaborationDatabase</c>.</param>
    /// <exception cref="InvalidOperationException">
    /// The connection string is missing. Deliberately fatal at first resolution rather than
    /// falling back to a default: a module that silently connects somewhere else is worse than
    /// one that refuses to start.
    /// </exception>
    public static IServiceCollection AddCollaborationInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        // Shared tenant context + RLS session interceptor (ADR-061/062).
        services.AddSpaceOsModuleTenancy();

        services.AddDbContext<CollaborationDbContext>((serviceProvider, options) =>
        {
            var connectionString = configuration.GetConnectionString(ConnectionStringName)
                ?? throw new InvalidOperationException(
                    $"ConnectionStrings:{ConnectionStringName} is not configured for the Collaboration module host.");

            options
                .UseNpgsql(connectionString)
                .AddInterceptors(serviceProvider.GetRequiredService<SpaceOsTenantSessionInterceptor>());
        });

        return services.AddCollaborationRepositories();
    }

    /// <summary>
    /// Adds only the repositories, for callers that own the <see cref="CollaborationDbContext"/>
    /// registration themselves — integration tests against a container, and design-time tooling.
    /// </summary>
    /// <remarks>
    /// Kept separate and named for what it is, so that "no interceptor" is always a visible
    /// choice at the call site rather than a side effect of picking the shorter overload.
    /// </remarks>
    public static IServiceCollection AddCollaborationRepositories(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        services.AddScoped<IWorkPackageRepository, WorkPackageRepository>();
        services.AddScoped<IAgreementRepository, AgreementRepository>();

        // Durable idempotency (B2B-10 F3/3). Registered next to the repositories because it is the
        // same kind of thing — a store on the module's own database — and because a host that
        // composed the API without it would advertise the Idempotency-Key header and quietly not
        // honour it.
        services.AddScoped<IIdempotencyStore, EfIdempotencyStore>();

        // Read-side queries for the agreement view (B2B-10 F3/4).
        services.AddScoped<IAgreementViewQueries, AgreementViewQueries>();

        return services;
    }

    /// <summary>
    /// Adds the Kernel-backed <see cref="IProjectAdapter"/> — the on-behalf-of anchor resolution
    /// (B2B-10 F5/2).
    /// </summary>
    /// <remarks>
    /// <para>
    /// <b>Fail-fast:</b> the base URL binds from <see cref="KernelProjectAdapterOptions.SectionName"/>
    /// with no default, and <c>ValidateOnStart</c> turns a missing value into a startup failure —
    /// the F5 task doc bans the tree's <c>?? "http://127.0.0.1:500x"</c> fallback pattern by name.
    /// </para>
    /// <para>
    /// The adapter itself needs an <see cref="IOnBehalfOfTokenSource"/>, which this method does
    /// NOT register: only the composition that knows what "the current request" means can supply
    /// it (the API host does, from the incoming Authorization header). Composing the adapter
    /// without one fails at the first resolution — loudly, as the request-scope decree demands.
    /// </para>
    /// </remarks>
    public static IServiceCollection AddKernelBackedProjectAdapter(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        services.AddOptions<KernelProjectAdapterOptions>()
            .Bind(configuration.GetSection(KernelProjectAdapterOptions.SectionName))
            .ValidateOnStart();
        services.AddSingleton<IValidateOptions<KernelProjectAdapterOptions>, KernelProjectAdapterOptionsValidator>();

        services.AddHttpClient<IProjectAdapter, HttpProjectAdapter>((serviceProvider, client) =>
        {
            var options = serviceProvider.GetRequiredService<IOptions<KernelProjectAdapterOptions>>().Value;

            // Trailing slash so relative paths append instead of replacing the last segment.
            client.BaseAddress = new Uri(options.BaseUrl.TrimEnd('/') + "/");
        });

        return services;
    }
}
