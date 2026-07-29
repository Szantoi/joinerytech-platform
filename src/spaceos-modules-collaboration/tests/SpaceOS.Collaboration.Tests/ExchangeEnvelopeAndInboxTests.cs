using SpaceOS.Collaboration.Domain;
using Xunit;

namespace SpaceOS.Collaboration.Tests;

public sealed class ExchangeEnvelopeAndInboxTests
{
    private static readonly Guid AgreementId = Guid.NewGuid();
    private static readonly Guid SenderTenant = Guid.NewGuid();
    private static readonly Guid ReceiverTenant = Guid.NewGuid();
    private static readonly DateTimeOffset Now = DateTimeOffset.UtcNow;
    private const string SamplePayload = """{"event":"WorkPackageOffered","scope":"cutting"}""";

    [Fact]
    public void Envelope_Create_ComputesChecksumAndIdempotencyKey()
    {
        var envelope = CollaborationExchangeEnvelope.Create(
            "spaceos.collaboration.work_package",
            "1.0.0",
            AgreementId,
            null,
            SenderTenant,
            ReceiverTenant,
            Guid.NewGuid(),
            null,
            1,
            SamplePayload,
            Now);

        Assert.Equal("spaceos.collaboration.work_package", envelope.SchemaId);
        Assert.True(envelope.VerifyChecksum());
        Assert.Contains("1", envelope.IdempotencyKey);
    }

    [Fact]
    public void Envelope_SameSenderAndReceiver_ThrowsInvalidOperationException()
    {
        var sameTenant = Guid.NewGuid();

        Assert.Throws<InvalidOperationException>(() =>
            CollaborationExchangeEnvelope.Create(
                "spaceos.collaboration.work_package",
                "1.0.0",
                AgreementId,
                null,
                sameTenant,
                sameTenant,
                Guid.NewGuid(),
                null,
                1,
                SamplePayload,
                Now));
    }

    [Fact]
    public void Inbox_Receive_ValidEnvelope_StatusReceived()
    {
        var envelope = CollaborationExchangeEnvelope.Create(
            "spaceos.collaboration.work_package",
            "1.0.0",
            AgreementId,
            null,
            SenderTenant,
            ReceiverTenant,
            Guid.NewGuid(),
            null,
            1,
            SamplePayload,
            Now);

        var inbox = CollaborationInboxMessage.Receive(envelope, Now);

        Assert.Equal(InboxMessageStatus.Received, inbox.Status);
        Assert.Null(inbox.QuarantineReason);
    }

    [Fact]
    public void Inbox_Receive_TamperedPayload_QuarantinesMessage()
    {
        var envelope = CollaborationExchangeEnvelope.Create(
            "spaceos.collaboration.work_package",
            "1.0.0",
            AgreementId,
            null,
            SenderTenant,
            ReceiverTenant,
            Guid.NewGuid(),
            null,
            1,
            SamplePayload,
            Now);

        // Simulate payload tampering in transit by changing envelope payload after checksum creation
        var tamperedEnvelope = CollaborationExchangeEnvelope.Create(
            envelope.SchemaId,
            envelope.SchemaVersion,
            envelope.AgreementId,
            envelope.WorkPackageId,
            envelope.SenderTenantId,
            envelope.ReceiverTenantId,
            envelope.CorrelationId,
            envelope.CausationId,
            envelope.SequenceNumber,
            """{"event":"WorkPackageOffered","tampered":true}""",
            Now);

        // Force old checksum onto tampered payload
        typeof(CollaborationExchangeEnvelope)
            .GetProperty(nameof(CollaborationExchangeEnvelope.PayloadChecksum))!
            .SetValue(tamperedEnvelope, envelope.PayloadChecksum);

        var inbox = CollaborationInboxMessage.Receive(tamperedEnvelope, Now);

        Assert.Equal(InboxMessageStatus.Quarantined, inbox.Status);
        Assert.Contains("checksum mismatch", inbox.QuarantineReason);
    }

    [Fact]
    public void Outbox_RecordFailure_MaxRetriesExceeded_TransitionsToDeadLetter()
    {
        var envelope = CollaborationExchangeEnvelope.Create(
            "spaceos.collaboration.work_package",
            "1.0.0",
            AgreementId,
            null,
            SenderTenant,
            ReceiverTenant,
            Guid.NewGuid(),
            null,
            1,
            SamplePayload,
            Now);

        var outbox = CollaborationOutboxMessage.Enqueue(envelope, Now);

        for (int i = 0; i < 4; i++)
        {
            outbox.RecordFailure("Network timeout", Now, maxRetries: 5);
            Assert.Equal(OutboxMessageStatus.Failed, outbox.Status);
        }

        // 5th failure triggers DeadLetter
        outbox.RecordFailure("Network timeout", Now, maxRetries: 5);
        Assert.Equal(OutboxMessageStatus.DeadLetter, outbox.Status);
        Assert.Null(outbox.NextAttemptAtUtc);
    }
}
