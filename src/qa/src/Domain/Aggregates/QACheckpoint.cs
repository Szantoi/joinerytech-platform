using SpaceOS.Kernel.Domain.Exceptions;
using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.Events;
using SpaceOS.Modules.QA.Domain.StrongIds;
using SpaceOS.Modules.QA.Domain.ValueObjects;

namespace SpaceOS.Modules.QA.Domain.Aggregates;

/// <summary>
/// QACheckpoint aggregate root.
/// Defines a quality control checkpoint with criteria, critical level, and activation status.
/// Immutable after creation except for Update/Deactivate operations.
/// </summary>
public class QACheckpoint : AggregateRoot
{
    private readonly List<InspectionCriteria> _criteria = new();

    public QACheckpointId Id { get; private set; } = null!;
    public Guid TenantId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public CheckpointType CheckpointType { get; private set; }
    public CriticalLevel CriticalLevel { get; private set; }
    public string? Description { get; private set; }
    public bool IsActive { get; private set; }
    public IReadOnlyList<InspectionCriteria> Criteria => _criteria.AsReadOnly();
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    // EF Core constructor
    private QACheckpoint() { }

    private QACheckpoint(
        QACheckpointId id,
        Guid tenantId,
        string name,
        CheckpointType checkpointType,
        CriticalLevel criticalLevel,
        string? description = null)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("Checkpoint name is required");
        if (name.Length < 3 || name.Length > 100)
            throw new DomainException("Checkpoint name must be between 3 and 100 characters");

        Id = id;
        TenantId = tenantId;
        Name = name;
        CheckpointType = checkpointType;
        CriticalLevel = criticalLevel;
        Description = description;
        IsActive = true;
        CreatedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;

        AddDomainEvent(new CheckpointCreatedEvent(
            Id,
            TenantId,
            Name,
            CheckpointType,
            CriticalLevel));
    }

    /// <summary>
    /// Factory method to create a new checkpoint.
    /// </summary>
    public static QACheckpoint Create(
        Guid tenantId,
        string name,
        CheckpointType checkpointType,
        CriticalLevel criticalLevel,
        string? description = null)
    {
        return new QACheckpoint(
            QACheckpointId.New(),
            tenantId,
            name,
            checkpointType,
            criticalLevel,
            description);
    }

    /// <summary>
    /// Updates checkpoint properties.
    /// </summary>
    public void Update(string name, CriticalLevel criticalLevel, string? description = null)
    {
        if (!IsActive)
            throw new DomainException("Cannot update inactive checkpoint");

        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("Checkpoint name is required");
        if (name.Length < 3 || name.Length > 100)
            throw new DomainException("Checkpoint name must be between 3 and 100 characters");

        Name = name;
        CriticalLevel = criticalLevel;
        Description = description;
        UpdatedAt = DateTime.UtcNow;

        AddDomainEvent(new CheckpointUpdatedEvent(
            Id,
            TenantId,
            Name,
            CriticalLevel));
    }

    /// <summary>
    /// Adds inspection criteria to the checkpoint.
    /// </summary>
    public void AddCriteria(CriteriaType criteriaType, string description)
    {
        if (!IsActive)
            throw new DomainException("Cannot add criteria to inactive checkpoint");

        if (string.IsNullOrWhiteSpace(description))
            throw new DomainException("Criteria description is required");

        // Check for duplicate criteria type
        if (_criteria.Any(c => c.Type == criteriaType))
            throw new DomainException($"Criteria type {criteriaType} already exists for this checkpoint");

        var criteria = InspectionCriteria.Create(criteriaType, description);
        _criteria.Add(criteria);
        UpdatedAt = DateTime.UtcNow;

        AddDomainEvent(new CheckpointCriteriaAddedEvent(
            Id,
            TenantId,
            criteriaType,
            description));
    }

    /// <summary>
    /// Removes inspection criteria from the checkpoint.
    /// </summary>
    public void RemoveCriteria(string criteriaId)
    {
        if (!IsActive)
            throw new DomainException("Cannot remove criteria from inactive checkpoint");

        var criteria = _criteria.FirstOrDefault(c => c.Id == criteriaId);
        if (criteria == null)
            throw new DomainException($"Criteria {criteriaId} not found");

        _criteria.Remove(criteria);
        UpdatedAt = DateTime.UtcNow;

        AddDomainEvent(new CheckpointCriteriaRemovedEvent(
            Id,
            TenantId,
            criteriaId));
    }

    /// <summary>
    /// Deactivates the checkpoint (soft delete).
    /// </summary>
    public void Deactivate()
    {
        if (!IsActive)
            throw new DomainException("Checkpoint is already inactive");

        IsActive = false;
        UpdatedAt = DateTime.UtcNow;

        AddDomainEvent(new CheckpointDeactivatedEvent(
            Id,
            TenantId,
            Name));
    }

    /// <summary>
    /// Reactivates a previously deactivated checkpoint.
    /// </summary>
    public void Reactivate()
    {
        if (IsActive)
            throw new DomainException("Checkpoint is already active");

        IsActive = true;
        UpdatedAt = DateTime.UtcNow;

        AddDomainEvent(new CheckpointReactivatedEvent(
            Id,
            TenantId,
            Name));
    }
}
