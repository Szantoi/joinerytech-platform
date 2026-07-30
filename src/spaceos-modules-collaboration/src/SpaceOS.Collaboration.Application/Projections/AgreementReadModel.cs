namespace SpaceOS.Collaboration.Application.Projections;

/// <summary>
/// What one party may see of an agreement (B2B-10 F3/4).
/// </summary>
/// <param name="CurrentRevisionHash">
/// The canonical hash of the terms in force, or <c>null</c> while none are. Nullable rather than
/// an empty string on purpose: a draft agreement HAS no terms hash, and "" would read as one.
/// </param>
/// <param name="RowVersion">The concurrency token, handed out as the ETag for the next write.</param>
public record AgreementReadModel(
    Guid AgreementId,
    Guid HostTenantId,
    Guid GuestTenantId,
    string Title,
    string Status,
    string? CurrentRevisionHash,
    int ActiveWorkPackageCount,
    int RowVersion,
    List<string> AllowedActions,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc
);
