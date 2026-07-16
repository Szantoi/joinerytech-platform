using SpaceOS.Modules.HR.Domain.Enums;

namespace SpaceOS.Modules.HR.Application.DTOs;

/// <summary>
/// Absence response DTO — a faithful projection of the Absence aggregate; returned by
/// the list, the detail AND every FSM transition endpoint (portal contract: the UI
/// reconciles its optimistic update from the transition response).
///
/// Enums travel as strings on the wire (JsonStringEnumConverter — EHS/QA precedent).
/// NOTE: the portal's absence shape additionally carries requestedAt and a `log[]`
/// audit trail; the aggregate tracks neither (domain events are raised but not
/// persisted as a trail). Not invented here — see the gap list in
/// docs/tasks/EPIC-UI-PORTAL-2026Q3/HR-BE-HOST.md.
/// </summary>
public record AbsenceDto(
    Guid Id,
    Guid EmployeeId,
    string EmployeeName,
    AbsenceType Type,
    DateOnly StartDate,
    DateOnly EndDate,
    AbsenceStatus Status,
    /// <summary>Work days covered (weekends excluded) — the aggregate's own count.</summary>
    int WorkDays,
    string Reason,
    Guid? ApprovedByUserId,
    DateTime? ApprovedAt,
    Guid? RejectedByUserId,
    DateTime? RejectedAt,
    string? RejectionReason
);
