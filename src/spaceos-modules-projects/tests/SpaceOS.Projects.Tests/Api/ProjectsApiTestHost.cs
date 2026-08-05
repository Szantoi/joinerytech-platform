using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SpaceOS.Modules.Hosting.Tenancy;
using SpaceOS.Projects.Api;
using SpaceOS.Projects.Api.Kernel;
using SpaceOS.Projects.Application.Idempotency;
using SpaceOS.Projects.Application.Projects;
using SpaceOS.Projects.Application.Repositories;
using SpaceOS.Projects.Application.Tenancy;
using SpaceOS.Projects.Domain;

namespace SpaceOS.Projects.Tests.Api;

/// <summary>
/// Boots the REAL projects API pipeline — exception handler, idempotency middleware, tenancy,
/// module gate, endpoints, MediatR handlers — over in-memory ports. What is faked is storage and
/// the Kernel; what is measured is the HTTP contract.
/// </summary>
internal static class ProjectsApiTestHost
{
    /// <summary>The tenant the test requests act as.</summary>
    public static readonly Guid TenantId = Guid.NewGuid();

    public static async Task<IHost> StartAsync(
        InMemoryProjectStore store,
        FakeFlowEpicResolver epicResolver,
        InMemoryIdempotencyStore idempotency)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                // ValidateOnStart demands a base URL; the fake resolver means it is never dialled.
                ["Projects:Kernel:BaseUrl"] = "http://kernel.test"
            })
            .Build();

        var host = await new HostBuilder()
            .ConfigureWebHost(web => web
                .UseTestServer()
                .UseEnvironment("Production")
                .ConfigureServices(services =>
                {
                    services.AddSingleton<IConfiguration>(configuration);
                    services.AddRouting();

                    services.AddProjectsApi(configuration);
                    services.AddSpaceOsModuleTenancy();

                    services
                        .AddAuthentication(TestAuthHandler.SchemeName)
                        .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                            TestAuthHandler.SchemeName, static _ => { });
                    services.AddAuthorization();

                    // The in-memory ports, replacing what Infrastructure would register.
                    services.AddSingleton(store);
                    services.AddScoped<IProjectRepository>(sp => sp.GetRequiredService<InMemoryProjectStore>());
                    services.AddScoped<IProjectDirectory>(sp => sp.GetRequiredService<InMemoryProjectStore>());
                    services.AddSingleton(idempotency);
                    services.AddScoped<IIdempotencyStore>(sp => sp.GetRequiredService<InMemoryIdempotencyStore>());
                    services.AddScoped<ICurrentTenant, TenantContextCurrentTenant>();
                    services.AddScoped<IProjectCodeAllocator, SequentialFakeAllocator>();

                    // Replace the HTTP resolver AddProjectsApi registered with the scripted fake.
                    services.RemoveAll<IFlowEpicResolver>();
                    services.AddSingleton(epicResolver);
                    services.AddSingleton<IFlowEpicResolver>(sp => sp.GetRequiredService<FakeFlowEpicResolver>());
                })
                .Configure(app =>
                {
                    app.UseExceptionHandler();
                    app.UseRouting();
                    app.UseAuthentication();
                    app.UseAuthorization();
                    app.UseSpaceOsModuleTenancy();
                    app.UseProjectsIdempotency();
                    app.UseEndpoints(endpoints => endpoints.MapProjectsEndpoints());
                }))
            .StartAsync();

        return host;
    }

    /// <summary>The application-layer tenant, read from the shared tenant context.</summary>
    private sealed class TenantContextCurrentTenant(ITenantContext tenantContext) : ICurrentTenant
    {
        public Guid TenantId => tenantContext.TenantId;
    }

    /// <summary>Allocates PRJ-2026-001, -002, … — deterministic, database-free.</summary>
    private sealed class SequentialFakeAllocator(InMemoryProjectStore store) : IProjectCodeAllocator
    {
        public Task<ProjectCode> AllocateAsync(CancellationToken cancellationToken = default) =>
            Task.FromResult(ProjectCode.Create($"PRJ-2026-{store.NextCodeNumber():000}"));
    }
}

/// <summary>
/// Header-driven test authentication (the hosting suite's pattern): the request declares the
/// claims its "token" carries, so one host covers every entitlement scenario.
/// </summary>
internal sealed class TestAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "Test";

    /// <summary>Carries the tenant id; its presence authenticates the request.</summary>
    public const string TenantHeader = "X-Test-Tid";

    /// <summary>Comma-separated module ids → <c>enabled_modules</c> JSON-array claim.</summary>
    public const string ModulesHeader = "X-Test-Enabled-Modules";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(TenantHeader, out var tid))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var claims = new List<Claim>
        {
            new("sub", "test-subject"),
            new(TenancyDefaults.TenantIdClaim, tid.ToString())
        };

        if (Request.Headers.TryGetValue(ModulesHeader, out var modules))
        {
            var list = modules.ToString()
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            claims.Add(new Claim(TenancyDefaults.EnabledModulesClaim, JsonSerializer.Serialize(list)));
        }

        var identity = new ClaimsIdentity(claims, SchemeName);
        return Task.FromResult(AuthenticateResult.Success(
            new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName)));
    }
}

/// <summary>In-memory aggregate store: repository and directory over one dictionary.</summary>
internal sealed class InMemoryProjectStore : IProjectRepository, IProjectDirectory
{
    private readonly Dictionary<Guid, Project> _projects = [];
    private int _codeCounter;

    /// <summary>When set, the next load throws it — the "provider blew up" scenario.</summary>
    public Exception? ThrowOnNextLoad { get; set; }

    public int Count => _projects.Count;

    public int NextCodeNumber() => Interlocked.Increment(ref _codeCounter);

    public Task<Project?> GetByIdAsync(Guid projectId, CancellationToken cancellationToken = default)
    {
        if (ThrowOnNextLoad is { } planted)
        {
            ThrowOnNextLoad = null;
            throw planted;
        }

        return Task.FromResult(_projects.GetValueOrDefault(projectId));
    }

    public Task<Project?> GetByCodeAsync(ProjectCode code, CancellationToken cancellationToken = default) =>
        Task.FromResult(_projects.Values.FirstOrDefault(p => p.Code.Value == code.Value));

    public Task<bool> CodeExistsAsync(ProjectCode code, CancellationToken cancellationToken = default) =>
        Task.FromResult(_projects.Values.Any(p => p.Code.Value == code.Value));

    public Task<Guid?> FindOwningProjectIdAsync(Guid epicId, CancellationToken cancellationToken = default) =>
        Task.FromResult(_projects.Values
            .Where(p => p.Epics.Any(e => e.EpicId == epicId))
            .Select(p => (Guid?)p.Id)
            .FirstOrDefault());

    public void Add(Project project) => _projects[project.Id] = project;

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;

    public Task<IReadOnlyList<ProjectSummary>> ListAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<ProjectSummary>>(_projects.Values
            .OrderByDescending(p => p.CreatedAtUtc)
            .Select(p => new ProjectSummary(
                p.Id, p.Code.Value, p.Name, p.Status, p.CustomerId, p.CreatedAtUtc, p.RowVersion))
            .ToList());
}

/// <summary>Scripted Kernel: exists / not-yours / refused / down, per test.</summary>
internal sealed class FakeFlowEpicResolver : IFlowEpicResolver
{
    public enum Answer { Exists, Unknown, Rejected, Unavailable }

    public Answer NextAnswer { get; set; } = Answer.Exists;

    public Task<bool> FlowEpicExistsAsync(Guid flowEpicId, CancellationToken cancellationToken = default) =>
        NextAnswer switch
        {
            Answer.Exists => Task.FromResult(true),
            Answer.Unknown => Task.FromResult(false),
            Answer.Rejected => throw new EpicResolutionRejectedException(403),
            _ => throw new EpicResolutionUnavailableException("the Kernel could not be reached")
        };
}

/// <summary>The idempotency contract over a dictionary — same semantics, no database.</summary>
internal sealed class InMemoryIdempotencyStore : IIdempotencyStore
{
    private sealed record Entry(string Fingerprint, int? StatusCode, string? Body, bool Completed);

    private readonly Dictionary<(Guid Tenant, string Key), Entry> _entries = [];

    public Task<IdempotencyClaim> ClaimAsync(
        Guid tenantId, string key, string fingerprint, CancellationToken cancellationToken = default)
    {
        lock (_entries)
        {
            if (!_entries.TryGetValue((tenantId, key), out var entry))
            {
                _entries[(tenantId, key)] = new Entry(fingerprint, null, null, Completed: false);
                return Task.FromResult(new IdempotencyClaim(IdempotencyOutcome.Started));
            }

            if (!entry.Completed)
            {
                return Task.FromResult(new IdempotencyClaim(IdempotencyOutcome.InFlight));
            }

            if (!string.Equals(entry.Fingerprint, fingerprint, StringComparison.Ordinal))
            {
                return Task.FromResult(new IdempotencyClaim(IdempotencyOutcome.FingerprintMismatch));
            }

            return Task.FromResult(new IdempotencyClaim(IdempotencyOutcome.Replay, entry.StatusCode, entry.Body));
        }
    }

    public Task CompleteAsync(
        Guid tenantId, string key, int statusCode, string body, CancellationToken cancellationToken = default)
    {
        lock (_entries)
        {
            if (_entries.TryGetValue((tenantId, key), out var entry))
            {
                _entries[(tenantId, key)] = entry with { StatusCode = statusCode, Body = body, Completed = true };
            }
        }

        return Task.CompletedTask;
    }

    public Task AbandonAsync(Guid tenantId, string key, CancellationToken cancellationToken = default)
    {
        lock (_entries)
        {
            _entries.Remove((tenantId, key));
        }

        return Task.CompletedTask;
    }
}
