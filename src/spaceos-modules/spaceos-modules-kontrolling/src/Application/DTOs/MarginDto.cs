namespace SpaceOS.Modules.Kontrolling.Application.DTOs;

/// <summary>
/// Margin DTO - profit margin representation
/// </summary>
public record MarginDto(MoneyDto Amount, decimal Percentage);
