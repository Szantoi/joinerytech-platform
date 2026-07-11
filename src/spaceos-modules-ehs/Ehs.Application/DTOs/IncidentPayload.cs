// Ehs.Application/DTOs/IncidentPayload.cs

namespace Ehs.Application.DTOs;

/// <summary>
/// Incident event payload (JSON-serializable).
/// </summary>
public sealed record IncidentPayload
{
    public Guid ReporterId { get; init; }
    public string IncidentType { get; init; } = string.Empty;
    public string LocationId { get; init; } = string.Empty;
    public DateTimeOffset Timestamp { get; init; }
    public string? PhotoS3Key { get; init; }
    public string Description { get; init; } = string.Empty;
}
