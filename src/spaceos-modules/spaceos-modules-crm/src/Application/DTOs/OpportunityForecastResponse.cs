namespace SpaceOS.Modules.CRM.Application.DTOs;

/// <summary>
/// Opportunity forecast response with weighted probability calculation
/// </summary>
public record OpportunityForecastResponse
{
    public decimal TotalEstimatedValue { get; init; }
    public decimal WeightedForecast { get; init; }
    public string Currency { get; init; } = string.Empty;
    public int OpportunityCount { get; init; }
    public List<OpportunityForecastItem> Items { get; init; } = new();
}

public record OpportunityForecastItem
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public decimal EstimatedValue { get; init; }
    public decimal Probability { get; init; }
    public decimal WeightedValue { get; init; }
    public DateTime? ExpectedCloseDate { get; init; }
}
