using System.Security.Cryptography;
using System.Text;

namespace SpaceOS.Collaboration.Domain;

/// <summary>
/// Immutable B2B exchange envelope for versioned cross-tenant data transmission (B2B-05).
/// </summary>
public class CollaborationExchangeEnvelope
{
    public Guid MessageId { get; private set; }
    public string SchemaId { get; private set; } = string.Empty;
    public string SchemaVersion { get; private set; } = string.Empty;
    public Guid AgreementId { get; private set; }
    public Guid? WorkPackageId { get; private set; }
    public Guid SenderTenantId { get; private set; }
    public Guid ReceiverTenantId { get; private set; }
    public Guid CorrelationId { get; private set; }
    public Guid? CausationId { get; private set; }
    public long SequenceNumber { get; private set; }
    public string PayloadJson { get; private set; } = string.Empty;
    public string PayloadChecksum { get; private set; } = string.Empty;
    public string IdempotencyKey { get; private set; } = string.Empty;
    public DateTimeOffset CreatedAtUtc { get; private set; }

    private CollaborationExchangeEnvelope() { }

    public static CollaborationExchangeEnvelope Create(
        string schemaId,
        string schemaVersion,
        Guid agreementId,
        Guid? workPackageId,
        Guid senderTenantId,
        Guid receiverTenantId,
        Guid correlationId,
        Guid? causationId,
        long sequenceNumber,
        string payloadJson,
        DateTimeOffset createdAtUtc)
    {
        if (string.IsNullOrWhiteSpace(schemaId))
            throw new ArgumentException("Schema ID cannot be empty.", nameof(schemaId));

        if (string.IsNullOrWhiteSpace(schemaVersion))
            throw new ArgumentException("Schema version cannot be empty.", nameof(schemaVersion));

        if (agreementId == Guid.Empty || senderTenantId == Guid.Empty || receiverTenantId == Guid.Empty)
            throw new ArgumentException("IDs cannot be empty.");

        if (senderTenantId == receiverTenantId)
            throw new InvalidOperationException("Sender and receiver tenant cannot be the same.");

        if (string.IsNullOrWhiteSpace(payloadJson))
            throw new ArgumentException("Payload JSON cannot be empty.", nameof(payloadJson));

        string checksum = ComputeChecksum(payloadJson);
        Guid messageId = Guid.NewGuid();
        string idempotencyKey = $"{schemaId}:{agreementId}:{sequenceNumber}:{checksum}";

        return new CollaborationExchangeEnvelope
        {
            MessageId = messageId,
            SchemaId = schemaId.Trim(),
            SchemaVersion = schemaVersion.Trim(),
            AgreementId = agreementId,
            WorkPackageId = workPackageId,
            SenderTenantId = senderTenantId,
            ReceiverTenantId = receiverTenantId,
            CorrelationId = correlationId == Guid.Empty ? messageId : correlationId,
            CausationId = causationId,
            SequenceNumber = sequenceNumber,
            PayloadJson = payloadJson,
            PayloadChecksum = checksum,
            IdempotencyKey = idempotencyKey,
            CreatedAtUtc = createdAtUtc
        };
    }

    public bool VerifyChecksum()
    {
        string expected = ComputeChecksum(PayloadJson);
        return string.Equals(PayloadChecksum, expected, StringComparison.OrdinalIgnoreCase);
    }

    public static string ComputeChecksum(string payloadJson)
    {
        byte[] bytes = Encoding.UTF8.GetBytes(payloadJson);
        byte[] hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
