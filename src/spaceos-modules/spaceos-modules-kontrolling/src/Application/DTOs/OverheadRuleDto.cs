namespace SpaceOS.Modules.Kontrolling.Application.DTOs;

using SpaceOS.Modules.Kontrolling.Domain.Enums;

/// <summary>
/// Overhead rule DTO (owned collection from OverheadConfig)
/// </summary>
public record OverheadRuleDto(
    CostCategory CostCategory,
    bool Exclude,
    decimal? CustomRate
);
