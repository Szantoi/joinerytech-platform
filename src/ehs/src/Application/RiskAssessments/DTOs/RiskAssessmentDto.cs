using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.DTOs;

public record RiskAssessmentDto(
    Guid RiskAssessmentId,
    Guid TenantId,
    string HazardDescription,
    Severity Severity,
    Likelihood Likelihood,
    int RiskScore,
    RiskLevel RiskLevel,
    RiskStatus Status,
    Guid AssessedBy,
    DateTimeOffset AssessedAt,
    DateTimeOffset ReviewDueDate,
    List<ControlMeasureDto> ControlMeasures
);

public record ControlMeasureDto(
    Guid RiskControlId,
    string ControlMeasure,
    string ResponsiblePerson,
    DateTimeOffset ImplementedAt,
    DateTimeOffset? VerifiedAt,
    bool IsVerified
);

public record RiskAssessmentListItemDto(
    Guid RiskAssessmentId,
    string HazardDescription,
    Severity Severity,
    Likelihood Likelihood,
    RiskLevel RiskLevel,
    RiskStatus Status,
    DateTimeOffset AssessedAt
);

public record RiskMatrixSummaryDto(
    int TotalAssessments,
    Dictionary<string, int> ByRiskLevel,
    Dictionary<string, int> ByStatus,
    List<RiskMatrixCellDto> MatrixCells
);

public record RiskMatrixCellDto(
    Severity Severity,
    Likelihood Likelihood,
    int Count,
    RiskLevel RiskLevel
);
