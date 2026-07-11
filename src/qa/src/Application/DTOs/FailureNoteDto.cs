using SpaceOS.Modules.QA.Domain.Enums;

namespace SpaceOS.Modules.QA.Application.DTOs;

/// <summary>
/// DTO for failure notes (nested in InspectionDto).
/// </summary>
public record FailureNoteDto(
    FailureType FailureType,
    string Description,
    string? PhotoUrl
);
