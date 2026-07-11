using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Application.Incidents.DTOs;

public record IncidentDto(
    Guid IncidentId,
    Guid TenantId,
    IncidentType IncidentType,
    DateTimeOffset IncidentDate,
    string Location,
    string Description,
    Severity Severity,
    IncidentStatus Status,
    Guid ReportedBy,
    DateTimeOffset ReportedAt,
    Guid? InvestigatedBy,
    DateTimeOffset? InvestigatedAt,
    DateTimeOffset? ClosedAt,
    IncidentInvestigationDto? Investigation,
    List<CorrectiveActionDto> CorrectiveActions,
    List<IncidentWitnessDto> Witnesses
);

public record IncidentInvestigationDto(
    Guid IncidentInvestigationId,
    string Findings,
    string RootCause,
    string? Recommendations,
    Guid InvestigatedBy,
    DateTimeOffset CompletedAt
);

public record CorrectiveActionDto(
    Guid CorrectiveActionId,
    string Description,
    Guid AssignedTo,
    DateTimeOffset DueDate,
    DateTimeOffset? CompletedAt,
    bool IsCompleted
);

public record IncidentWitnessDto(
    Guid IncidentWitnessId,
    Guid EmployeeId,
    string Statement,
    DateTimeOffset RecordedAt
);

public record IncidentListItemDto(
    Guid IncidentId,
    IncidentType IncidentType,
    DateTimeOffset IncidentDate,
    string Location,
    Severity Severity,
    IncidentStatus Status,
    Guid ReportedBy
);

public record IncidentSummaryDto(
    int TotalIncidents,
    Dictionary<string, int> ByType,
    Dictionary<string, int> BySeverity,
    Dictionary<string, int> ByStatus
);

public record IncidentTrendsDto(
    List<MonthlyIncidentCount> MonthlyTrends
);

public record MonthlyIncidentCount(
    int Year,
    int Month,
    int Count,
    Dictionary<string, int> ByType
);
