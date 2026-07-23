using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SpaceOS.Modules.Ehs.Api.Endpoints;
using SpaceOS.Modules.Ehs.Application.Common.Behaviors;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.Wire;
using SpaceOS.Modules.Ehs.Domain.Aggregates.IncidentAggregate;
using SpaceOS.Modules.Ehs.Domain.Aggregates.LocationAggregate;
using SpaceOS.Modules.Ehs.Domain.Aggregates.RiskAssessmentAggregate;
using SpaceOS.Modules.Ehs.Infrastructure.Data;

namespace SpaceOS.Modules.Ehs.Infrastructure.Tests.Api;

/// <summary>
/// Endpoint host with the REAL MediatR pipeline: handlers + validators from the
/// Application assembly and the shared <see cref="ValidationBehavior{TRequest,TResponse}"/>,
/// wired exactly like EhsServiceCollectionExtensions.AddEhsModule (same AddBehavior call,
/// same wire JSON converters as Program.cs). Repositories are recording fakes, so the
/// tests can prove that a validation failure short-circuits BEFORE the handler runs.
/// No database, no Docker. The wiring here is a deliberate copy — the PRODUCTION
/// registration itself is pinned separately by <see cref="EhsModuleRegistrationTests"/>.
/// </summary>
public sealed class EhsValidationPipelineTestHost : IAsyncDisposable
{
    public static readonly Guid TenantId = EhsEndpointTestHost.TenantId;

    private readonly IHost _host;

    public HttpClient Client { get; }
    public RecordingRiskAssessmentRepository RiskAssessments { get; }
    public RecordingEhsLocationRepository Locations { get; }
    public RecordingCorrectiveActionRepository CorrectiveActions { get; }

    private EhsValidationPipelineTestHost(
        IHost host,
        RecordingRiskAssessmentRepository riskAssessments,
        RecordingEhsLocationRepository locations,
        RecordingCorrectiveActionRepository correctiveActions)
    {
        _host = host;
        Client = host.GetTestClient();
        RiskAssessments = riskAssessments;
        Locations = locations;
        CorrectiveActions = correctiveActions;
    }

    public static async Task<EhsValidationPipelineTestHost> StartAsync()
    {
        var riskAssessments = new RecordingRiskAssessmentRepository();
        var locations = new RecordingEhsLocationRepository();
        var correctiveActions = new RecordingCorrectiveActionRepository();
        var applicationAssembly = typeof(ValidationBehavior<,>).Assembly;

        var host = await new HostBuilder()
            .ConfigureWebHost(webBuilder => webBuilder
                .UseTestServer()
                .ConfigureServices(services =>
                {
                    services.AddRouting();
                    services.AddLogging(logging => logging.SetMinimumLevel(LogLevel.Warning));
                    services.AddAuthentication(EhsTestAuthHandler.SchemeName)
                        .AddScheme<AuthenticationSchemeOptions, EhsTestAuthHandler>(
                            EhsTestAuthHandler.SchemeName,
                            static _ => { });
                    services.AddAuthorization();

                    // Same wire JSON setup as the production host (Program.cs) —
                    // bodies speak the canonical Hungarian vocabulary (ADR-059).
                    services.ConfigureHttpJsonOptions(options =>
                    {
                        options.SerializerOptions.Converters.AddEhsWireConverters();
                        options.SerializerOptions.Converters.Add(
                            new System.Text.Json.Serialization.JsonStringEnumConverter());
                    });

                    // Real pipeline — mirrors EhsServiceCollectionExtensions.AddEhsModule
                    // (steps 6 + 8): handlers, the single shared behavior, validators.
                    services.AddMediatR(cfg =>
                    {
                        cfg.RegisterServicesFromAssembly(applicationAssembly);
                        cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
                    });
                    services.AddValidatorsFromAssembly(applicationAssembly);
                    services.AddAutoMapper(applicationAssembly);

                    services.AddSingleton(RiskBandConfiguration.Default);
                    services.AddSingleton<IRiskAssessmentRepository>(riskAssessments);
                    services.AddSingleton<IEhsLocationRepository>(locations);
                    services.AddSingleton<ICorrectiveActionRepository>(correctiveActions);
                    services.AddSingleton<ITenantContext>(new FixedTenantContext(TenantId));
                })
                .Configure(app =>
                {
                    app.UseRouting();
                    app.UseAuthentication();
                    app.UseAuthorization();
                    app.UseEndpoints(endpoints => endpoints.MapRiskAssessmentEndpoints());
                }))
            .StartAsync()
            .ConfigureAwait(false);

        return new EhsValidationPipelineTestHost(host, riskAssessments, locations, correctiveActions);
    }

    /// <summary>Combined handler-side traffic — 0 proves the pipeline short-circuited.</summary>
    public int TotalRepositoryCalls =>
        RiskAssessments.TotalCalls + Locations.TotalCalls + CorrectiveActions.TotalCalls;

    public void ResetCounters()
    {
        RiskAssessments.ResetCounters();
        Locations.ResetCounters();
        CorrectiveActions.ResetCounters();
    }

    public async ValueTask DisposeAsync()
    {
        Client.Dispose();
        await _host.StopAsync().ConfigureAwait(false);
        _host.Dispose();
    }

    private sealed record FixedTenantContext(Guid TenantId) : ITenantContext;
}

/// <summary>
/// In-memory recording fake — counts every call so tests can assert the handler
/// was (or was not) reached; stores aggregates by reference like the EF repo.
/// </summary>
public sealed class RecordingRiskAssessmentRepository : IRiskAssessmentRepository
{
    private readonly List<RiskAssessment> _store = new();

    public int GetByIdCalls { get; private set; }
    public int ListCalls { get; private set; }
    public int MatrixCalls { get; private set; }
    public int AddCalls { get; private set; }
    public int UpdateCalls { get; private set; }
    public int ExistsCalls { get; private set; }

    public int TotalCalls =>
        GetByIdCalls + ListCalls + MatrixCalls + AddCalls + UpdateCalls + ExistsCalls;

    public IReadOnlyList<RiskAssessment> Stored => _store;

    public void Seed(RiskAssessment assessment) => _store.Add(assessment);

    public void ResetCounters()
    {
        GetByIdCalls = ListCalls = MatrixCalls = AddCalls = UpdateCalls = ExistsCalls = 0;
    }

    public Task<RiskAssessment?> GetByIdAsync(Guid riskAssessmentId, Guid tenantId, CancellationToken ct = default)
    {
        GetByIdCalls++;
        return Task.FromResult(_store.FirstOrDefault(
            a => a.RiskAssessmentId == riskAssessmentId && a.TenantId == tenantId));
    }

    public Task<List<RiskAssessment>> ListAsync(RiskAssessmentFilter filter, Guid tenantId, CancellationToken ct = default)
    {
        ListCalls++;
        return Task.FromResult(_store.Where(a => a.TenantId == tenantId).ToList());
    }

    public Task<List<RiskMatrixProjection>> GetMatrixProjectionAsync(Guid tenantId, CancellationToken ct = default)
    {
        MatrixCalls++;
        return Task.FromResult(_store
            .Where(a => a.TenantId == tenantId)
            .Select(a => new RiskMatrixProjection(a.Severity, a.Likelihood, a.RiskLevel, a.Status))
            .ToList());
    }

    public Task AddAsync(RiskAssessment assessment, CancellationToken ct = default)
    {
        AddCalls++;
        _store.Add(assessment);
        return Task.CompletedTask;
    }

    public Task UpdateAsync(RiskAssessment assessment, CancellationToken ct = default)
    {
        UpdateCalls++;
        return Task.CompletedTask;
    }

    public Task<bool> ExistsAsync(Guid riskAssessmentId, Guid tenantId, CancellationToken ct = default)
    {
        ExistsCalls++;
        return Task.FromResult(_store.Any(
            a => a.RiskAssessmentId == riskAssessmentId && a.TenantId == tenantId));
    }
}

/// <summary>Recording fake — only the existence check matters for risk commands.</summary>
public sealed class RecordingEhsLocationRepository : IEhsLocationRepository
{
    private readonly HashSet<Guid> _knownLocationIds = new();

    public int ExistsCalls { get; private set; }
    public int OtherCalls { get; private set; }

    public int TotalCalls => ExistsCalls + OtherCalls;

    public void SeedExisting(Guid locationId) => _knownLocationIds.Add(locationId);

    public void ResetCounters()
    {
        ExistsCalls = 0;
        OtherCalls = 0;
    }

    public Task<EhsLocation?> GetByIdAsync(Guid locationId, Guid tenantId, CancellationToken ct = default)
    {
        OtherCalls++;
        return Task.FromResult<EhsLocation?>(null);
    }

    public Task<List<EhsLocation>> ListAsync(LocationFilter filter, Guid tenantId, CancellationToken ct = default)
    {
        OtherCalls++;
        return Task.FromResult(new List<EhsLocation>());
    }

    public Task AddAsync(EhsLocation location, CancellationToken ct = default)
    {
        OtherCalls++;
        return Task.CompletedTask;
    }

    public Task UpdateAsync(EhsLocation location, CancellationToken ct = default)
    {
        OtherCalls++;
        return Task.CompletedTask;
    }

    public Task<bool> ExistsAsync(Guid locationId, Guid tenantId, CancellationToken ct = default)
    {
        ExistsCalls++;
        return Task.FromResult(_knownLocationIds.Contains(locationId));
    }

    public Task<bool> HasActiveChildrenAsync(Guid locationId, Guid tenantId, CancellationToken ct = default)
    {
        OtherCalls++;
        return Task.FromResult(false);
    }
}

/// <summary>Recording fake for the unified CAPA registry (spawn proof on add-control).</summary>
public sealed class RecordingCorrectiveActionRepository : ICorrectiveActionRepository
{
    private readonly List<CorrectiveAction> _store = new();

    public int AddCalls { get; private set; }
    public int OtherCalls { get; private set; }

    public int TotalCalls => AddCalls + OtherCalls;

    public IReadOnlyList<CorrectiveAction> Stored => _store;

    public void ResetCounters()
    {
        AddCalls = 0;
        OtherCalls = 0;
    }

    public Task<CorrectiveAction?> GetByIdAsync(Guid correctiveActionId, Guid tenantId, CancellationToken ct = default)
    {
        OtherCalls++;
        return Task.FromResult(_store.FirstOrDefault(
            a => a.CorrectiveActionId == correctiveActionId && a.TenantId == tenantId));
    }

    public Task<List<CorrectiveAction>> ListAsync(CapaFilter filter, Guid tenantId, CancellationToken ct = default)
    {
        OtherCalls++;
        return Task.FromResult(_store.Where(a => a.TenantId == tenantId).ToList());
    }

    public Task AddAsync(CorrectiveAction action, CancellationToken ct = default)
    {
        AddCalls++;
        _store.Add(action);
        return Task.CompletedTask;
    }

    public Task UpdateAsync(CorrectiveAction action, CancellationToken ct = default)
    {
        OtherCalls++;
        return Task.CompletedTask;
    }

    public Task<bool> AllCompletedForSourceAsync(Guid sourceId, Guid tenantId, CancellationToken ct = default)
    {
        OtherCalls++;
        return Task.FromResult(true);
    }
}
