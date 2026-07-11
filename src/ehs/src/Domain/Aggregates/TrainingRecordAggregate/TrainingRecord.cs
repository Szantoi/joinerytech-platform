using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.Ehs.Domain.Enums;
using SpaceOS.Modules.Ehs.Domain.Events;

namespace SpaceOS.Modules.Ehs.Domain.Aggregates.TrainingRecordAggregate;

/// <summary>
/// Training Record aggregate root - tracks safety training and certifications
/// Status calculated based on expiration date:
/// Valid (>30d), Expiring (≤30d), Expired (<0d)
/// </summary>
public class TrainingRecord : AggregateRoot
{
    public Guid TrainingRecordId { get; private set; }
    public Guid TenantId { get; private set; }
    public Guid EmployeeId { get; private set; }  // FK to HR module
    public string TrainingType { get; private set; } = string.Empty;
    public DateTimeOffset CompletedAt { get; private set; }
    public DateTimeOffset? ExpiresAt { get; private set; }
    public string IssuedBy { get; private set; } = string.Empty;
    public string? CertificateNumber { get; private set; }
    public TrainingStatus Status => CheckTrainingExpiry(ExpiresAt);

    private TrainingRecord() { }  // EF Core

    /// <summary>
    /// Create new training record
    /// </summary>
    public static TrainingRecord Create(
        Guid tenantId,
        Guid employeeId,
        string trainingType,
        DateTimeOffset completedAt,
        string issuedBy,
        DateTimeOffset? expiresAt = null,
        string? certificateNumber = null)
    {
        if (tenantId == Guid.Empty)
            throw new ArgumentException("TenantId is required", nameof(tenantId));

        if (employeeId == Guid.Empty)
            throw new ArgumentException("EmployeeId is required", nameof(employeeId));

        if (string.IsNullOrWhiteSpace(trainingType))
            throw new ArgumentException("TrainingType is required", nameof(trainingType));

        if (string.IsNullOrWhiteSpace(issuedBy))
            throw new ArgumentException("IssuedBy is required", nameof(issuedBy));

        if (completedAt > DateTimeOffset.UtcNow)
            throw new ArgumentException("CompletedAt cannot be in the future", nameof(completedAt));

        if (expiresAt.HasValue && expiresAt.Value <= completedAt)
            throw new ArgumentException("ExpiresAt must be after CompletedAt", nameof(expiresAt));

        var record = new TrainingRecord
        {
            TrainingRecordId = Guid.NewGuid(),
            TenantId = tenantId,
            EmployeeId = employeeId,
            TrainingType = trainingType,
            CompletedAt = completedAt,
            ExpiresAt = expiresAt,
            IssuedBy = issuedBy,
            CertificateNumber = certificateNumber
        };

        record.AddDomainEvent(new TrainingRecordCreatedEvent(
            record.TrainingRecordId,
            record.EmployeeId,
            record.TrainingType));

        return record;
    }

    /// <summary>
    /// Renew expired or expiring training
    /// Creates new training record (immutability principle)
    /// </summary>
    public TrainingRecord Renew(
        DateTimeOffset newCompletedAt,
        DateTimeOffset? newExpiresAt = null,
        string? newCertificateNumber = null)
    {
        if (newCompletedAt < CompletedAt)
            throw new ArgumentException("Renewal date must be after original completion date", nameof(newCompletedAt));

        var renewedRecord = TrainingRecord.Create(
            TenantId,
            EmployeeId,
            TrainingType,
            newCompletedAt,
            IssuedBy,
            newExpiresAt,
            newCertificateNumber ?? CertificateNumber);

        AddDomainEvent(new TrainingRecordRenewedEvent(
            renewedRecord.TrainingRecordId,
            newExpiresAt ?? DateTimeOffset.MaxValue));

        return renewedRecord;
    }

    /// <summary>
    /// Calculate training status based on expiration date
    /// Valid: >30 days | Expiring: ≤30 days | Expired: past expiration
    /// </summary>
    public static TrainingStatus CheckTrainingExpiry(DateTimeOffset? expiresAt)
    {
        if (expiresAt == null)
            return TrainingStatus.Valid;  // No expiration

        var daysUntilExpiry = (expiresAt.Value - DateTimeOffset.UtcNow).TotalDays;

        return daysUntilExpiry switch
        {
            > 30 => TrainingStatus.Valid,
            > 0 => TrainingStatus.Expiring,
            _ => TrainingStatus.Expired
        };
    }
}
