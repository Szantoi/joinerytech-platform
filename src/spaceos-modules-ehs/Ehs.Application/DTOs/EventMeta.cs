// Ehs.Application/DTOs/EventMeta.cs

namespace Ehs.Application.DTOs;

/// <summary>
/// Event metadata (JSON-serializable).
/// </summary>
public sealed record EventMeta
{
    public string DeviceId { get; init; } = string.Empty;
    public DateTimeOffset ClientTimestamp { get; init; }
}
