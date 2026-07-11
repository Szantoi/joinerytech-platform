using SpaceOS.Modules.QA.Domain.Enums;

namespace SpaceOS.Modules.QA.Application.DTOs;

/// <summary>
/// Ticket list item DTO (lightweight for lists).
/// </summary>
public record TicketListDto(
    Guid Id,
    TicketType TicketType,
    TicketStatus Status,
    CrmTaskPriority Priority,
    string Title,
    Guid ReportedBy,
    Guid? AssignedTo,
    DateTime ReportedAt,
    DateTime? ResolvedAt
);
