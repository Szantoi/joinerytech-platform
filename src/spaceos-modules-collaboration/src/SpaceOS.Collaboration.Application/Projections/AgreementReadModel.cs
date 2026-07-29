namespace SpaceOS.Collaboration.Application.Projections;

public record AgreementReadModel(
    Guid AgreementId,
    Guid HostTenantId,
    Guid GuestTenantId,
    string Title,
    string Status,
    string CurrentRevisionHash,
    int ActiveWorkPackageCount,
    List<string> AllowedActions,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc
);
