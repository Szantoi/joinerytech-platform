namespace SpaceOS.Modules.Kontrolling.Domain.Entities;

using SpaceOS.Modules.Kontrolling.Domain.Enums;
using SpaceOS.Modules.Kontrolling.Domain.ValueObjects;

/// <summary>
/// Cost adjustment entity - manual corrections to cost data
/// Stored in database for audit trail and reporting
/// </summary>
public sealed class CostAdjustment
{
    /// <summary>
    /// Adjustment identifier
    /// </summary>
    public Guid AdjustmentId { get; private set; }

    /// <summary>
    /// Tenant identifier
    /// </summary>
    public Guid TenantId { get; private set; }

    /// <summary>
    /// Project identifier (null if Portfolio scope)
    /// </summary>
    public Guid? ProjectId { get; private set; }

    /// <summary>
    /// Cost category affected
    /// </summary>
    public CostCategory Category { get; private set; }

    /// <summary>
    /// Adjustment amount (can be positive or negative)
    /// </summary>
    public Money Amount { get; private set; }

    /// <summary>
    /// Scope of adjustment (Project-specific or Portfolio-wide)
    /// </summary>
    public AdjustmentScope Scope { get; private set; }

    /// <summary>
    /// Reason for adjustment (audit trail)
    /// </summary>
    public string Reason { get; private set; } = string.Empty;

    /// <summary>
    /// User who created the adjustment
    /// </summary>
    public Guid CreatedBy { get; private set; }

    /// <summary>
    /// When the adjustment was created
    /// </summary>
    public DateTime CreatedAt { get; private set; }

    /// <summary>
    /// Soft delete flag
    /// </summary>
    public bool IsDeleted { get; private set; }

    /// <summary>
    /// Who deleted the adjustment
    /// </summary>
    public Guid? DeletedBy { get; private set; }

    /// <summary>
    /// When the adjustment was deleted
    /// </summary>
    public DateTime? DeletedAt { get; private set; }

    private CostAdjustment()
    {
        // EF Core constructor
        Amount = null!;
    }

    /// <summary>
    /// Create a new cost adjustment
    /// </summary>
    public static CostAdjustment Create(
        Guid tenantId,
        Guid? projectId,
        CostCategory category,
        Money amount,
        AdjustmentScope scope,
        string reason,
        Guid createdBy)
    {
        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("Reason is required for cost adjustment", nameof(reason));

        if (scope == AdjustmentScope.Project && projectId == null)
            throw new InvalidOperationException("ProjectId is required for project-scoped adjustments");

        if (scope == AdjustmentScope.Portfolio && projectId != null)
            throw new InvalidOperationException("ProjectId must be null for portfolio-scoped adjustments");

        if (amount.IsZero)
            throw new ArgumentException("Adjustment amount cannot be zero", nameof(amount));

        var adjustment = new CostAdjustment
        {
            AdjustmentId = Guid.NewGuid(),
            TenantId = tenantId,
            ProjectId = projectId,
            Category = category,
            Amount = amount,
            Scope = scope,
            Reason = reason,
            CreatedBy = createdBy,
            CreatedAt = DateTime.UtcNow,
            IsDeleted = false
        };

        return adjustment;
    }

    /// <summary>
    /// Soft delete the adjustment
    /// </summary>
    public void Delete(Guid deletedBy)
    {
        if (IsDeleted)
            throw new InvalidOperationException("Adjustment is already deleted");

        IsDeleted = true;
        DeletedBy = deletedBy;
        DeletedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Check if adjustment applies to a specific project
    /// </summary>
    public bool AppliesTo(Guid projectId)
    {
        if (IsDeleted)
            return false;

        return Scope switch
        {
            AdjustmentScope.Project => ProjectId == projectId,
            AdjustmentScope.Portfolio => true,
            _ => false
        };
    }

    /// <summary>
    /// Check if this is a positive adjustment (increases cost)
    /// </summary>
    public bool IsIncrease => Amount.IsPositive;

    /// <summary>
    /// Check if this is a negative adjustment (decreases cost)
    /// </summary>
    public bool IsDecrease => Amount.IsNegative;
}
