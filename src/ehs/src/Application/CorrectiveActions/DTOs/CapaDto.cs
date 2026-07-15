using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Application.CorrectiveActions.DTOs;

/// <summary>
/// Unified CAPA board row — corrective actions from every source
/// (incident, safety walk, risk assessment) in one shape.
/// </summary>
public record CapaDto(
    Guid CorrectiveActionId,
    Guid TenantId,
    CapaSource Source,
    Guid SourceId,
    Guid? IncidentId,
    Guid? FindingId,
    string Description,
    Guid AssignedTo,
    DateTimeOffset DueDate,
    DateTimeOffset? CompletedAt,
    bool IsCompleted
);
