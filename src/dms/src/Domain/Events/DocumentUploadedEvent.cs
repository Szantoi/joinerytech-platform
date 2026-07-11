using SpaceOS.Kernel.Domain.Primitives;

namespace SpaceOS.Modules.DMS.Domain.Events;

/// <summary>
/// Domain event raised when a document is uploaded.
/// </summary>
public record DocumentUploadedEvent(
    Guid DocumentId,
    Guid TenantId,
    string FileName,
    string MimeType,
    long SizeBytes,
    Guid UploadedByUserId) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
