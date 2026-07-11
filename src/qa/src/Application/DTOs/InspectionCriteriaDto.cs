using SpaceOS.Modules.QA.Domain.Enums;

namespace SpaceOS.Modules.QA.Application.DTOs;

/// <summary>
/// DTO for inspection criteria (nested in QACheckpointDto).
/// </summary>
public record InspectionCriteriaDto(
    string Id,
    CriteriaType Type,
    string Description
);
