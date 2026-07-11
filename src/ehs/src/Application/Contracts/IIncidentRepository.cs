using SpaceOS.Modules.Ehs.Application.Incidents.DTOs;
using SpaceOS.Modules.Ehs.Domain.Aggregates.IncidentAggregate;
using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Application.Contracts;

/// <summary>
/// Repository contract for Incident aggregate
/// Implementation in Infrastructure layer (Week 3)
/// </summary>
public interface IIncidentRepository
{
    Task<Incident?> GetByIdAsync(Guid incidentId, Guid tenantId, CancellationToken ct = default);
    Task<List<Incident>> ListAsync(IncidentFilter filter, Guid tenantId, CancellationToken ct = default);
    Task<IncidentSummary> GetSummaryAsync(Guid tenantId, CancellationToken ct = default);
    Task<IncidentTrendsDto> GetTrendsAsync(Guid tenantId, int monthsBack, CancellationToken ct = default);
    Task AddAsync(Incident incident, CancellationToken ct = default);
    Task UpdateAsync(Incident incident, CancellationToken ct = default);
    Task<bool> ExistsAsync(Guid incidentId, Guid tenantId, CancellationToken ct = default);
}

public record IncidentFilter(
    IncidentType? Type = null,
    IncidentStatus? Status = null,
    DateTimeOffset? OccurredAfter = null,
    DateTimeOffset? OccurredBefore = null,
    Severity? MinSeverity = null
);

public record IncidentSummary(
    int TotalIncidents,
    Dictionary<IncidentType, int> ByType,
    Dictionary<Severity, int> BySeverity,
    Dictionary<IncidentStatus, int> ByStatus
);
