using SpaceOS.Modules.Ehs.Domain.Aggregates.IncidentAggregate;
using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Application.Contracts;

/// <summary>
/// Repository contract for the UNIFIED CAPA registry (CorrectiveAction).
/// Incident-sourced and safety-walk-sourced actions live in the same table,
/// so the portal gets a single CAPA board.
/// Implementation in Infrastructure layer.
/// </summary>
public interface ICorrectiveActionRepository
{
    Task<CorrectiveAction?> GetByIdAsync(Guid correctiveActionId, Guid tenantId, CancellationToken ct = default);
    Task<List<CorrectiveAction>> ListAsync(CapaFilter filter, Guid tenantId, CancellationToken ct = default);
    Task AddAsync(CorrectiveAction action, CancellationToken ct = default);
    Task UpdateAsync(CorrectiveAction action, CancellationToken ct = default);

    /// <summary>
    /// True when every CAPA spawned by the given source aggregate is completed
    /// (SafetyWalk close guard).
    /// </summary>
    Task<bool> AllCompletedForSourceAsync(Guid sourceId, Guid tenantId, CancellationToken ct = default);
}

/// <summary>Filter for the unified CAPA board</summary>
public record CapaFilter(
    bool? Completed = null,
    Guid? AssignedTo = null,
    CapaSource? Source = null,
    Guid? SourceId = null
);
