namespace SpaceOS.Collaboration.Domain;

/// <summary>
/// Transactional outbox message for B2B collaboration event dispatching (B2B-05).
/// </summary>
public class CollaborationOutboxMessage
{
    public Guid Id { get; private set; }
    public Guid MessageId { get; private set; }
    public string SchemaId { get; private set; } = string.Empty;
    public Guid SenderTenantId { get; private set; }
    public Guid ReceiverTenantId { get; private set; }
    public string EnvelopeJson { get; private set; } = string.Empty;
    public OutboxMessageStatus Status { get; private set; }
    public int RetryCount { get; private set; }
    public DateTimeOffset CreatedAtUtc { get; private set; }
    public DateTimeOffset? NextAttemptAtUtc { get; private set; }
    public DateTimeOffset? ProcessedAtUtc { get; private set; }
    public string? LastError { get; private set; }

    private CollaborationOutboxMessage() { }

    public static CollaborationOutboxMessage Enqueue(CollaborationExchangeEnvelope envelope, DateTimeOffset createdAtUtc)
    {
        ArgumentNullException.ThrowIfNull(envelope);

        string envelopeJson = System.Text.Json.JsonSerializer.Serialize(envelope);

        return new CollaborationOutboxMessage
        {
            Id = Guid.NewGuid(),
            MessageId = envelope.MessageId,
            SchemaId = envelope.SchemaId,
            SenderTenantId = envelope.SenderTenantId,
            ReceiverTenantId = envelope.ReceiverTenantId,
            EnvelopeJson = envelopeJson,
            Status = OutboxMessageStatus.Pending,
            RetryCount = 0,
            CreatedAtUtc = createdAtUtc,
            NextAttemptAtUtc = createdAtUtc
        };
    }

    public void MarkProcessed(DateTimeOffset processedAtUtc)
    {
        Status = OutboxMessageStatus.Processed;
        ProcessedAtUtc = processedAtUtc;
        LastError = null;
    }

    public void RecordFailure(string error, DateTimeOffset attemptedAtUtc, int maxRetries = 5)
    {
        RetryCount++;
        LastError = error?.Trim();

        if (RetryCount >= maxRetries)
        {
            Status = OutboxMessageStatus.DeadLetter;
            NextAttemptAtUtc = null;
        }
        else
        {
            Status = OutboxMessageStatus.Failed;
            // Exponential backoff
            double delaySeconds = Math.Pow(2, RetryCount);
            NextAttemptAtUtc = attemptedAtUtc.AddSeconds(delaySeconds);
        }
    }
}
