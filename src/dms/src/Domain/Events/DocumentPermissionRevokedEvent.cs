using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.DMS.Domain.Enums;

namespace SpaceOS.Modules.DMS.Domain.Events;

/// <summary>
/// Domain event raised when a permission is revoked from a document.
/// </summary>
public record DocumentPermissionRevokedEvent(
    Guid DocumentId,
    Guid TenantId,
    PermissionType PermissionType) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
