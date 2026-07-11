using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.DMS.Domain.Enums;

namespace SpaceOS.Modules.DMS.Domain.Events;

/// <summary>
/// Domain event raised when a permission is granted on a document.
/// </summary>
public record DocumentPermissionGrantedEvent(
    Guid DocumentId,
    Guid TenantId,
    PermissionType PermissionType,
    Guid? GrantedToUserId,
    Guid? GrantedToRoleId) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
