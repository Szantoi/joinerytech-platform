using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.DTOs;

/// <summary>Detail DTO — full assessment with control measures (unified CAPA links)</summary>
public record RiskAssessmentDto(
    Guid RiskAssessmentId,
    Guid TenantId,
    string HazardDescription,
    Guid? LocationId,
    Severity Severity,
    Likelihood Likelihood,
    int RiskScore,
    RiskLevel RiskLevel,
    RiskStatus Status,
    Guid AssessedBy,
    DateTimeOffset AssessedAt,
    DateTimeOffset ReviewDueDate,
    DateTimeOffset? SubmittedAt,
    DateTimeOffset? ApprovedAt,
    DateTimeOffset? ArchivedAt,
    List<ControlMeasureDto> ControlMeasures
);

/// <summary>Control measure with its optional unified-CAPA link</summary>
public record ControlMeasureDto(
    Guid RiskControlId,
    string ControlMeasure,
    string ResponsiblePerson,
    DateTimeOffset ImplementedAt,
    DateTimeOffset? VerifiedAt,
    bool IsVerified,
    Guid? CorrectiveActionId
);

/// <summary>List item — everything the RisksScreen list + matrix placement needs</summary>
public record RiskAssessmentListItemDto(
    Guid RiskAssessmentId,
    string HazardDescription,
    Guid? LocationId,
    Severity Severity,
    Likelihood Likelihood,
    int RiskScore,
    RiskLevel RiskLevel,
    RiskStatus Status,
    DateTimeOffset AssessedAt,
    DateTimeOffset ReviewDueDate
);

/// <summary>5×5 matrix summary for the dashboard (per-cell counts, all 25 cells)</summary>
public record RiskMatrixSummaryDto(
    int TotalAssessments,
    Dictionary<string, int> ByRiskLevel,
    Dictionary<string, int> ByStatus,
    List<RiskMatrixCellDto> MatrixCells
);

/// <summary>One cell of the 5×5 matrix (Severity × Likelihood → count + band)</summary>
public record RiskMatrixCellDto(
    Severity Severity,
    Likelihood Likelihood,
    int Count,
    RiskLevel RiskLevel
);
