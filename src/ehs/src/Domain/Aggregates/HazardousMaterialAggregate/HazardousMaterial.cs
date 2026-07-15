using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.Ehs.Domain.Enums;
using SpaceOS.Modules.Ehs.Domain.Events;

namespace SpaceOS.Modules.Ehs.Domain.Aggregates.HazardousMaterialAggregate;

/// <summary>
/// Hazardous material aggregate root — SDS (Safety Data Sheet) registry.
/// Lifecycle: Active → Archived (RiskStatus pattern).
/// SDS validity is CALCULATED from SdsExpiresAt (TrainingStatus pattern):
/// Valid (&gt;30d), Expiring (≤30d), Expired (&lt;0d).
/// </summary>
public class HazardousMaterial : AggregateRoot
{
    public Guid MaterialId { get; private set; }
    public Guid TenantId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string Supplier { get; private set; } = string.Empty;

    /// <summary>CAS registry number, e.g. "67-64-1" (optional)</summary>
    public string? CasNumber { get; private set; }

    /// <summary>GHS pictogram codes, e.g. "GHS02" (flammable)</summary>
    public List<string> GhsHazardClasses { get; private set; } = new();

    /// <summary>Storage location — FK to EhsLocation</summary>
    public Guid StorageLocationId { get; private set; }

    public decimal QuantityOnSite { get; private set; }

    /// <summary>Unit of measure for QuantityOnSite, e.g. "kg", "l"</summary>
    public string Unit { get; private set; } = string.Empty;

    /// <summary>Current SDS document — FK to DMS document (optional)</summary>
    public Guid? SdsDocumentId { get; private set; }

    public DateTimeOffset SdsIssuedAt { get; private set; }
    public DateTimeOffset SdsExpiresAt { get; private set; }
    public MaterialStatus Status { get; private set; }
    public DateTimeOffset RegisteredAt { get; private set; }

    /// <summary>CALCULATED SDS validity — never stored (TrainingStatus pattern)</summary>
    public SdsValidity SdsValidity => CheckSdsValidity(SdsExpiresAt);

    private HazardousMaterial() { }  // EF Core

    /// <summary>
    /// Register a new hazardous material in Active status.
    /// </summary>
    public static HazardousMaterial Create(
        Guid tenantId,
        string name,
        string supplier,
        Guid storageLocationId,
        decimal quantityOnSite,
        string unit,
        DateTimeOffset sdsIssuedAt,
        DateTimeOffset sdsExpiresAt,
        string? casNumber = null,
        List<string>? ghsHazardClasses = null,
        Guid? sdsDocumentId = null)
    {
        if (tenantId == Guid.Empty)
            throw new ArgumentException("TenantId is required", nameof(tenantId));

        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Name is required", nameof(name));

        if (string.IsNullOrWhiteSpace(supplier))
            throw new ArgumentException("Supplier is required", nameof(supplier));

        if (storageLocationId == Guid.Empty)
            throw new ArgumentException("StorageLocationId is required", nameof(storageLocationId));

        if (quantityOnSite < 0)
            throw new ArgumentException("QuantityOnSite cannot be negative", nameof(quantityOnSite));

        if (string.IsNullOrWhiteSpace(unit))
            throw new ArgumentException("Unit is required", nameof(unit));

        if (sdsExpiresAt <= sdsIssuedAt)
            throw new ArgumentException("SdsExpiresAt must be after SdsIssuedAt", nameof(sdsExpiresAt));

        var material = new HazardousMaterial
        {
            MaterialId = Guid.NewGuid(),
            TenantId = tenantId,
            Name = name,
            Supplier = supplier,
            CasNumber = casNumber,
            GhsHazardClasses = ghsHazardClasses ?? new List<string>(),
            StorageLocationId = storageLocationId,
            QuantityOnSite = quantityOnSite,
            Unit = unit,
            SdsDocumentId = sdsDocumentId,
            SdsIssuedAt = sdsIssuedAt,
            SdsExpiresAt = sdsExpiresAt,
            Status = MaterialStatus.Active,
            RegisteredAt = DateTimeOffset.UtcNow
        };

        material.AddDomainEvent(new HazardousMaterialRegisteredEvent(
            material.MaterialId,
            material.Name));

        return material;
    }

    /// <summary>
    /// Update master data (name, supplier, storage, quantity).
    /// Guard: only Active materials can be updated.
    /// </summary>
    public void UpdateMasterData(
        string name,
        string supplier,
        Guid storageLocationId,
        decimal quantityOnSite,
        string unit,
        string? casNumber,
        List<string>? ghsHazardClasses)
    {
        if (Status != MaterialStatus.Active)
            throw new InvalidOperationException("Cannot update an archived hazardous material");

        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Name is required", nameof(name));

        if (string.IsNullOrWhiteSpace(supplier))
            throw new ArgumentException("Supplier is required", nameof(supplier));

        if (storageLocationId == Guid.Empty)
            throw new ArgumentException("StorageLocationId is required", nameof(storageLocationId));

        if (quantityOnSite < 0)
            throw new ArgumentException("QuantityOnSite cannot be negative", nameof(quantityOnSite));

        if (string.IsNullOrWhiteSpace(unit))
            throw new ArgumentException("Unit is required", nameof(unit));

        Name = name;
        Supplier = supplier;
        StorageLocationId = storageLocationId;
        QuantityOnSite = quantityOnSite;
        Unit = unit;
        CasNumber = casNumber;
        GhsHazardClasses = ghsHazardClasses ?? new List<string>();
    }

    /// <summary>
    /// Register a new SDS version (RenewTrainingRecord pattern):
    /// new issue/expiry dates and optionally a new DMS document link.
    /// Guard: only Active materials can receive a new SDS.
    /// </summary>
    public void RenewSds(
        DateTimeOffset newIssuedAt,
        DateTimeOffset newExpiresAt,
        Guid? newSdsDocumentId = null)
    {
        if (Status != MaterialStatus.Active)
            throw new InvalidOperationException("Cannot renew SDS of an archived hazardous material");

        if (newExpiresAt <= newIssuedAt)
            throw new ArgumentException("New SDS expiry must be after its issue date", nameof(newExpiresAt));

        if (newIssuedAt < SdsIssuedAt)
            throw new ArgumentException("New SDS issue date must not precede the current one", nameof(newIssuedAt));

        SdsIssuedAt = newIssuedAt;
        SdsExpiresAt = newExpiresAt;

        if (newSdsDocumentId.HasValue)
            SdsDocumentId = newSdsDocumentId;

        AddDomainEvent(new SdsRenewedEvent(MaterialId, newExpiresAt));
    }

    /// <summary>
    /// Lifecycle transition: Active → Archived (material phased out).
    /// Guard: only from Active.
    /// </summary>
    public void Archive()
    {
        if (Status != MaterialStatus.Active)
            throw new InvalidOperationException("Hazardous material is already archived");

        Status = MaterialStatus.Archived;

        AddDomainEvent(new HazardousMaterialArchivedEvent(MaterialId));
    }

    /// <summary>
    /// Calculate SDS validity from the expiry date.
    /// Valid: &gt;30 days | Expiring: ≤30 days | Expired: past expiration
    /// </summary>
    public static SdsValidity CheckSdsValidity(DateTimeOffset expiresAt)
    {
        var daysUntilExpiry = (expiresAt - DateTimeOffset.UtcNow).TotalDays;

        return daysUntilExpiry switch
        {
            > 30 => SdsValidity.Valid,
            > 0 => SdsValidity.Expiring,
            _ => SdsValidity.Expired
        };
    }
}
