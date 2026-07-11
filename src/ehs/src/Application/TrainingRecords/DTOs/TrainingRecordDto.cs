using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Application.TrainingRecords.DTOs;

public record TrainingRecordDto(
    Guid TrainingRecordId,
    Guid TenantId,
    Guid EmployeeId,
    string TrainingType,
    string TrainingProvider,
    DateTimeOffset CompletedAt,
    DateTimeOffset? ExpiresAt,
    TrainingStatus Status
);

public record TrainingRecordListItemDto(
    Guid TrainingRecordId,
    Guid EmployeeId,
    string TrainingType,
    DateTimeOffset CompletedAt,
    DateTimeOffset? ExpiresAt,
    TrainingStatus Status
);

public record TrainingComplianceSummaryDto(
    int TotalRecords,
    Dictionary<string, int> ByStatus,
    Dictionary<string, int> ByTrainingType,
    List<ExpiringTrainingDto> ExpiringWithin30Days
);

public record ExpiringTrainingDto(
    Guid TrainingRecordId,
    Guid EmployeeId,
    string TrainingType,
    DateTimeOffset ExpiresAt,
    int DaysUntilExpiry
);
