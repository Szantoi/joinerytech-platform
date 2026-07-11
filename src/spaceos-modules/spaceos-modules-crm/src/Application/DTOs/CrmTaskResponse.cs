namespace SpaceOS.Modules.CRM.Application.DTOs;

/// <summary>
/// CRM Task response DTO
/// </summary>
public record CrmTaskResponse
{
    public Guid TaskId { get; init; }
    public string Title { get; init; } = string.Empty;
    public DateTime DueDate { get; init; }
    public string Priority { get; init; } = string.Empty;
    public bool Completed { get; init; }
    public DateTime? CompletedAt { get; init; }
    public Guid CreatedBy { get; init; }
    public Guid? CompletedBy { get; init; }
    public string EntityType { get; init; } = string.Empty; // "Lead" or "Opportunity"
    public Guid EntityId { get; init; }
    public bool IsOverdue { get; init; }
}
