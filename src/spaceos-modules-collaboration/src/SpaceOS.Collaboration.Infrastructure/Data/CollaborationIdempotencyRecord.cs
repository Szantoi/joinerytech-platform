using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace SpaceOS.Collaboration.Infrastructure.Data;

/// <summary>
/// One claimed idempotency key and the answer it produced (B2B-10 F3/3).
/// </summary>
/// <remarks>
/// Lives in Infrastructure rather than the domain: nothing in the collaboration language knows
/// about retries, and giving the domain a "request record" entity would be modelling the transport
/// inside the business.
/// </remarks>
public sealed class CollaborationIdempotencyRecord
{
    public Guid Id { get; set; }

    /// <summary>Owning tenant — the key space is per tenant, so two customers cannot collide.</summary>
    public Guid TenantId { get; set; }

    /// <summary>The client's key.</summary>
    public string Key { get; set; } = string.Empty;

    /// <summary>Identifies the request, so reuse can be told apart from a retry.</summary>
    public string Fingerprint { get; set; } = string.Empty;

    /// <summary>When the claim was made — also the basis for reclaiming a stalled one.</summary>
    public DateTimeOffset ClaimedAtUtc { get; set; }

    /// <summary>Null while the request is still running.</summary>
    public DateTimeOffset? CompletedAtUtc { get; set; }

    /// <summary>The recorded status code, once completed.</summary>
    public int? StatusCode { get; set; }

    /// <summary>The recorded response body, once completed.</summary>
    public string? Body { get; set; }
}

internal sealed class CollaborationIdempotencyRecordConfiguration
    : IEntityTypeConfiguration<CollaborationIdempotencyRecord>
{
    public void Configure(EntityTypeBuilder<CollaborationIdempotencyRecord> builder)
    {
        builder.ToTable("collaboration_idempotency_records");

        builder.HasKey(record => record.Id);
        builder.Property(record => record.Id).ValueGeneratedNever();

        builder.Property(record => record.TenantId).IsRequired();
        builder.Property(record => record.Key).HasMaxLength(200).IsRequired();
        builder.Property(record => record.Fingerprint).HasMaxLength(128).IsRequired();
        builder.Property(record => record.ClaimedAtUtc).IsRequired();

        // The uniqueness is the whole mechanism: two concurrent retries race for this index, and
        // the loser is told the request is already in flight instead of both being let through.
        // A "check then insert" in application code would leave exactly that window open.
        builder.HasIndex(record => new { record.TenantId, record.Key }).IsUnique();
    }
}
