using SpaceOS.Modules.QA.Domain.Enums;

namespace SpaceOS.Modules.QA.Application.DTOs;

/// <summary>
/// Full ticket details DTO.
/// </summary>
public record TicketDto(
    Guid Id,
    TicketType TicketType,
    TicketStatus Status,
    CrmTaskPriority Priority,
    Guid? OrderId,
    Guid? ProductId,
    Guid? InspectionId,
    string Title,
    string Description,
    Guid ReportedBy,
    Guid? AssignedTo,
    string? ResolutionNotes,
    ResolutionActionDto[] ResolutionActions,
    DateTime ReportedAt,
    DateTime? AssignedAt,
    DateTime? StartedAt,
    DateTime? ResolvedAt
);
