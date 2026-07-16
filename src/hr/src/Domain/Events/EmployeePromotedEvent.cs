using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.HR.Domain.Enums;
using SpaceOS.Modules.HR.Domain.StrongIds;

namespace SpaceOS.Modules.HR.Domain.Events;

/// <summary>
/// Raised when an employee moves to a new pay grade band. Carries the band key only —
/// the hourly rate is tenant configuration (ADR-060), not event payload.
/// </summary>
public record EmployeePromotedEvent(
    EmployeeId EmployeeId,
    Guid TenantId,
    PayGradeBand NewPayGrade) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
