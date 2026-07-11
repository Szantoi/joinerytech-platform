using SpaceOS.Kernel.Domain.Exceptions;

namespace SpaceOS.Modules.DMS.Domain.ValueObjects;

/// <summary>
/// Value object representing document metadata.
/// </summary>
public record DocumentMetadata
{
    public string? Description { get; init; }
    public DateOnly? ExpiryDate { get; init; }

    public DocumentMetadata(string? description, DateOnly? expiryDate)
    {
        if (description?.Length > 500)
            throw new DomainException("Description max 500 chars");

        Description = description;
        ExpiryDate = expiryDate;
    }

    public bool IsExpired() => ExpiryDate.HasValue && ExpiryDate.Value < DateOnly.FromDateTime(DateTime.UtcNow);

    public bool IsExpiringSoon(int daysThreshold = 30) =>
        ExpiryDate.HasValue &&
        ExpiryDate.Value < DateOnly.FromDateTime(DateTime.UtcNow.AddDays(daysThreshold));
}
