using SpaceOS.Modules.CRM.Domain.Primitives;
using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.CRM.Domain.Enums;

namespace SpaceOS.Modules.CRM.Domain.Entities;

/// <summary>
/// Activity entity - logged interaction with Lead or Opportunity
/// </summary>
public sealed class Activity : Entity<Guid>
{
    public Guid ActivityId { get; private set; }
    public ActivityType Type { get; private set; }
    public DateTime LoggedAt { get; private set; }
    public string Description { get; private set; } = string.Empty;
    public Guid CreatedBy { get; private set; }

    private Activity() { } // EF Core

    /// <summary>
    /// Factory method to log a new activity
    /// </summary>
    public static Activity Log(ActivityType type, string description, Guid createdBy)
    {
        if (string.IsNullOrWhiteSpace(description))
            throw new ArgumentException("Description is required", nameof(description));

        if (createdBy == Guid.Empty)
            throw new ArgumentException("CreatedBy user is required", nameof(createdBy));

        return new Activity
        {
            ActivityId = Guid.NewGuid(),
            Type = type,
            LoggedAt = DateTime.UtcNow,
            Description = description,
            CreatedBy = createdBy
        };
    }
}
