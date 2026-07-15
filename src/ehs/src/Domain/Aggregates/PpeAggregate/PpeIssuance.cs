using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.Ehs.Domain.Enums;
using SpaceOS.Modules.Ehs.Domain.Events;

namespace SpaceOS.Modules.Ehs.Domain.Aggregates.PpeAggregate;

/// <summary>
/// PPE issuance aggregate root — one PPE hand-out to one employee.
/// FSM (UI plan: kiadva → atvett → visszavett | cserelve):
///
///   Issued → Acknowledged → Returned
///                         ↘ Replaced (spawns a new issuance in Issued state)
///
/// The "expired" (lejart) state is CALCULATED from ExpiresAt, never stored.
/// All transitions are guarded — illegal transitions throw InvalidOperationException.
/// </summary>
public class PpeIssuance : AggregateRoot
{
    public Guid IssuanceId { get; private set; }
    public Guid TenantId { get; private set; }

    /// <summary>Employee receiving the PPE — FK to HR module</summary>
    public Guid EmployeeId { get; private set; }

    /// <summary>Issued PPE catalogue item — FK to PpeItem</summary>
    public Guid PpeItemId { get; private set; }

    public DateTimeOffset IssuedAt { get; private set; }
    public Guid IssuedBy { get; private set; }
    public int Quantity { get; private set; }

    /// <summary>Expiry derived from PpeItem.DefaultLifetimeMonths or set explicitly</summary>
    public DateTimeOffset? ExpiresAt { get; private set; }

    public PpeIssuanceStatus Status { get; private set; }
    public DateTimeOffset? AcknowledgedAt { get; private set; }
    public DateTimeOffset? ReturnedAt { get; private set; }
    public DateTimeOffset? ReplacedAt { get; private set; }

    /// <summary>Set when this issuance is replaced — points to the new issuance</summary>
    public Guid? ReplacementIssuanceId { get; private set; }

    /// <summary>CALCULATED — true when ExpiresAt passed and the PPE is still out (Issued/Acknowledged)</summary>
    public bool IsExpired =>
        ExpiresAt.HasValue
        && ExpiresAt.Value < DateTimeOffset.UtcNow
        && (Status == PpeIssuanceStatus.Issued || Status == PpeIssuanceStatus.Acknowledged);

    private PpeIssuance() { }  // EF Core

    /// <summary>
    /// FSM entry: record a PPE hand-out in Issued status.
    /// </summary>
    public static PpeIssuance Issue(
        Guid tenantId,
        Guid employeeId,
        Guid ppeItemId,
        Guid issuedBy,
        int quantity,
        DateTimeOffset? expiresAt = null)
    {
        if (tenantId == Guid.Empty)
            throw new ArgumentException("TenantId is required", nameof(tenantId));

        if (employeeId == Guid.Empty)
            throw new ArgumentException("EmployeeId is required", nameof(employeeId));

        if (ppeItemId == Guid.Empty)
            throw new ArgumentException("PpeItemId is required", nameof(ppeItemId));

        if (issuedBy == Guid.Empty)
            throw new ArgumentException("IssuedBy is required", nameof(issuedBy));

        if (quantity <= 0)
            throw new ArgumentException("Quantity must be positive", nameof(quantity));

        if (expiresAt.HasValue && expiresAt.Value <= DateTimeOffset.UtcNow)
            throw new ArgumentException("ExpiresAt must be in the future", nameof(expiresAt));

        var issuance = new PpeIssuance
        {
            IssuanceId = Guid.NewGuid(),
            TenantId = tenantId,
            EmployeeId = employeeId,
            PpeItemId = ppeItemId,
            IssuedAt = DateTimeOffset.UtcNow,
            IssuedBy = issuedBy,
            Quantity = quantity,
            ExpiresAt = expiresAt,
            Status = PpeIssuanceStatus.Issued
        };

        issuance.AddDomainEvent(new PpeIssuedEvent(
            issuance.IssuanceId,
            issuance.EmployeeId,
            issuance.PpeItemId));

        return issuance;
    }

    /// <summary>
    /// FSM Transition: Issued → Acknowledged (dolgozói átvétel).
    /// </summary>
    public void Acknowledge()
    {
        if (Status != PpeIssuanceStatus.Issued)
            throw new InvalidOperationException("Only issued PPE can be acknowledged");

        AcknowledgedAt = DateTimeOffset.UtcNow;
        Status = PpeIssuanceStatus.Acknowledged;

        AddDomainEvent(new PpeAcknowledgedEvent(IssuanceId, EmployeeId));
    }

    /// <summary>
    /// FSM Transition: Acknowledged → Returned (visszavétel, terminal).
    /// </summary>
    public void Return()
    {
        if (Status != PpeIssuanceStatus.Acknowledged)
            throw new InvalidOperationException("Only acknowledged PPE can be returned");

        ReturnedAt = DateTimeOffset.UtcNow;
        Status = PpeIssuanceStatus.Returned;

        AddDomainEvent(new PpeReturnedEvent(IssuanceId, EmployeeId));
    }

    /// <summary>
    /// FSM Transition: Acknowledged → Replaced (csere, terminal).
    /// Spawns and returns the replacement issuance (same employee/item/quantity)
    /// which starts its own lifecycle in Issued status.
    /// </summary>
    public PpeIssuance Replace(Guid replacedBy, DateTimeOffset? newExpiresAt = null)
    {
        if (Status != PpeIssuanceStatus.Acknowledged)
            throw new InvalidOperationException("Only acknowledged PPE can be replaced");

        var replacement = Issue(
            TenantId,
            EmployeeId,
            PpeItemId,
            replacedBy,
            Quantity,
            newExpiresAt);

        ReplacedAt = DateTimeOffset.UtcNow;
        ReplacementIssuanceId = replacement.IssuanceId;
        Status = PpeIssuanceStatus.Replaced;

        AddDomainEvent(new PpeReplacedEvent(IssuanceId, replacement.IssuanceId, EmployeeId));

        return replacement;
    }
}
