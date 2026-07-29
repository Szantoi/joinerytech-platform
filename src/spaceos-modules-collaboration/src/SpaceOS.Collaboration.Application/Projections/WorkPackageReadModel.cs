using SpaceOS.Collaboration.Domain;

namespace SpaceOS.Collaboration.Application.Projections;

public record WorkPackageReadModel(
    Guid WorkPackageId,
    Guid AgreementId,
    Guid HostTenantId,
    Guid GuestTenantId,
    string Title,
    string ScopeDescription,
    WorkPackageStatus Status,
    DateTimeOffset DueAtUtc,
    int RowVersion,
    string? DeliverableRef,
    string? CompletionProofRef,
    string? RejectionOrChangeReason,
    List<string> AllowedActions,
    List<WorkPackageHistoryDto> History,
    DateTimeOffset CreatedAtUtc
);

public record WorkPackageHistoryDto(
    Guid Id,
    WorkPackageStatus FromStatus,
    WorkPackageStatus ToStatus,
    Guid ActorTenantId,
    Guid ActorUserId,
    string ActionName,
    string? Reason,
    DateTimeOffset TimestampUtc
);
