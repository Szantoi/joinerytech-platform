using SpaceOS.Modules.CRM.Domain.Primitives;
using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.CRM.Domain.Enums;

namespace SpaceOS.Modules.CRM.Domain.Entities;

/// <summary>
/// CRM Task entity - follow-up task for Lead or Opportunity
/// </summary>
public sealed class CrmTask : Entity<Guid>
{
    public Guid TaskId { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public DateTime DueDate { get; private set; }
    public bool Completed { get; private set; }
    public CrmTaskPriority Priority { get; private set; }
    public Guid CreatedBy { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? CompletedAt { get; private set; }
    public Guid? CompletedBy { get; private set; }

    private CrmTask() { } // EF Core

    /// <summary>
    /// Factory method to create a new task
    /// </summary>
    public static CrmTask Create(string title, DateTime dueDate, CrmTaskPriority priority, Guid createdBy)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Title is required", nameof(title));

        if (createdBy == Guid.Empty)
            throw new ArgumentException("CreatedBy user is required", nameof(createdBy));

        return new CrmTask
        {
            TaskId = Guid.NewGuid(),
            Title = title,
            DueDate = dueDate.Date, // Store only date part
            Completed = false,
            Priority = priority,
            CreatedBy = createdBy,
            CreatedAt = DateTime.UtcNow
        };
    }

    /// <summary>
    /// Mark task as completed
    /// </summary>
    public void Complete(Guid completedBy)
    {
        if (Completed)
            throw new InvalidOperationException("Task is already completed");

        Completed = true;
        CompletedAt = DateTime.UtcNow;
        CompletedBy = completedBy;
    }

    /// <summary>
    /// Check if task is overdue
    /// </summary>
    public bool IsOverdue() => !Completed && DateTime.UtcNow.Date > DueDate.Date;
}
