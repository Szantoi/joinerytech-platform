namespace SpaceOS.Collaboration.Domain;

/// <summary>
/// Deduplicating transactional inbox message for B2B collaboration event receiving (B2B-05).
/// </summary>
public class CollaborationInboxMessage
{
    public Guid MessageId { get; private set; }
    public string IdempotencyKey { get; private set; } = string.Empty;
    public string SchemaId { get; private set; } = string.Empty;
    public string SchemaVersion { get; private set; } = string.Empty;
    public Guid SenderTenantId { get; private set; }
    public Guid ReceiverTenantId { get; private set; }
    public long SequenceNumber { get; private set; }
    public string EnvelopeJson { get; private set; } = string.Empty;
    public InboxMessageStatus Status { get; private set; }
    public DateTimeOffset ReceivedAtUtc { get; private set; }
    public DateTimeOffset? ProcessedAtUtc { get; private set; }
    public string? QuarantineReason { get; private set; }

    private CollaborationInboxMessage() { }

    public static CollaborationInboxMessage Receive(CollaborationExchangeEnvelope envelope, DateTimeOffset receivedAtUtc)
    {
        ArgumentNullException.ThrowIfNull(envelope);

        string envelopeJson = System.Text.Json.JsonSerializer.Serialize(envelope);

        var inbox = new CollaborationInboxMessage
        {
            MessageId = envelope.MessageId,
            IdempotencyKey = envelope.IdempotencyKey,
            SchemaId = envelope.SchemaId,
            SchemaVersion = envelope.SchemaVersion,
            SenderTenantId = envelope.SenderTenantId,
            ReceiverTenantId = envelope.ReceiverTenantId,
            SequenceNumber = envelope.SequenceNumber,
            EnvelopeJson = envelopeJson,
            Status = InboxMessageStatus.Received,
            ReceivedAtUtc = receivedAtUtc
        };

        if (!envelope.VerifyChecksum())
        {
            inbox.Quarantine("Payload SHA-256 checksum mismatch.", receivedAtUtc);
        }

        return inbox;
    }

    public void MarkProcessed(DateTimeOffset processedAtUtc)
    {
        if (Status == InboxMessageStatus.Quarantined)
            throw new InvalidOperationException("Cannot mark a quarantined inbox message as processed.");

        Status = InboxMessageStatus.Processed;
        ProcessedAtUtc = processedAtUtc;
    }

    public void Quarantine(string reason, DateTimeOffset quarantinedAtUtc)
    {
        Status = InboxMessageStatus.Quarantined;
        QuarantineReason = reason?.Trim() ?? "Quarantined";
        ProcessedAtUtc = quarantinedAtUtc;
    }
}
