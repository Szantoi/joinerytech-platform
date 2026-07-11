namespace SpaceOS.Modules.CRM.Application.DTOs;

/// <summary>
/// Opportunity response DTO
/// </summary>
public record OpportunityResponse
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string? Phone { get; init; }
    public string? Company { get; init; }
    public string Status { get; init; } = string.Empty;
    public decimal EstimatedValue { get; init; }
    public string Currency { get; init; } = string.Empty;
    public decimal Probability { get; init; }
    public DateTime? ExpectedCloseDate { get; init; }
    public Guid AssignedTo { get; init; }
    public Guid? LeadRef { get; init; }
    public Guid? QuoteRef { get; init; }
    public int ActivityCount { get; init; }
    public int TaskCount { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}
