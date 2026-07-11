using SpaceOS.Modules.QA.Domain.Enums;

namespace SpaceOS.Modules.QA.Application.DTOs;

/// <summary>
/// DTO for resolution actions (nested in TicketDto).
/// </summary>
public record ResolutionActionDto(
    ActionType ActionType,
    string Description,
    decimal CostAmount
);
