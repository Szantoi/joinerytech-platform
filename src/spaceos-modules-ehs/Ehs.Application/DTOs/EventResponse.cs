// Ehs.Application/DTOs/EventResponse.cs

namespace Ehs.Application.DTOs;

/// <summary>
/// Response DTO for event submission.
/// </summary>
public sealed record EventResponse
{
    public Guid EventId { get; init; }
    public long Sequence { get; init; }
    public string Status { get; init; } = "accepted";
    public DateTimeOffset ServerTimestamp { get; init; }
}
