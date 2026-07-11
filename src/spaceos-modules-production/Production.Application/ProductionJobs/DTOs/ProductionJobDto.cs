namespace SpaceOS.Modules.Production.Application.ProductionJobs.DTOs;

/// <summary>
/// ProductionJob DTO (matches Frontend production.ts types)
/// </summary>
public record ProductionJobDto(
    Guid JobId,
    Guid OrderId,
    string ProjectName,
    DateTimeOffset Deadline,
    string Status, // "Queued" | "InProgress" | "ShippingReady"
    List<WorkflowStepDto> Steps,
    bool IsOverdue,
    DateTimeOffset CreatedAt
);

/// <summary>
/// WorkflowStep DTO
/// </summary>
public record WorkflowStepDto(
    string Name,        // "SzabaszatElőgyártás", "Megmunkálás", etc.
    string Status,      // "Pending" | "InProgress" | "Done"
    DateTimeOffset? StartedAt,
    DateTimeOffset? CompletedAt,
    string? PhotoUrl,
    string? CompletedBy
);

/// <summary>
/// ProductionOverview DTO (tulaj/sales dashboard)
/// </summary>
public record ProductionOverviewDto(
    int ActiveJobs,
    int CompletedJobs,
    int OverdueJobs,
    int ShippingReadyJobs,
    List<ProductionJobDto> ActiveProjects
);
