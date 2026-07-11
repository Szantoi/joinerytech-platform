namespace SpaceOS.Modules.CRM.Application.DTOs;

/// <summary>
/// Lead response DTO
/// </summary>
public record LeadResponse
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string? Phone { get; init; }
    public string? Company { get; init; }
    public string Status { get; init; } = string.Empty;
    public string Source { get; init; } = string.Empty;
    public Guid AssignedTo { get; init; }
    public Guid? OpportunityRef { get; init; }
    public int ActivityCount { get; init; }
    public int TaskCount { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}
