namespace SpaceOS.Modules.Kontrolling.Application.DTOs;

using SpaceOS.Modules.Kontrolling.Domain.Enums;

/// <summary>
/// Overhead configuration DTO
/// </summary>
public record OverheadConfigDto(
    Guid OverheadConfigId,
    Guid TenantId,
    OverheadAllocationMethod AllocationMethod,
    decimal OverheadRate,
    IReadOnlyCollection<OverheadRuleDto> OverheadRules,
    DateTime UpdatedAt,
    Guid UpdatedBy
);
