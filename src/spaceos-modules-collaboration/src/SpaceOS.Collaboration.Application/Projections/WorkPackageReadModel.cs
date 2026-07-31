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
    DateTimeOffset CreatedAtUtc,
    WorkScopeDto? WorkScope = null
);

/// <summary>
/// The Kernel anchor of a package on the wire (B2B-10 F5/1): project → epic → optional task.
/// </summary>
/// <remarks>
/// Nullable on the read model because packages created before the anchor existed have none; the
/// guest treats the ids as opaque either way (ADR-068 §11). Appended with a default so that the
/// wire shape only grows — the enum SHAPE decision stays with F4.
/// </remarks>
public record WorkScopeDto(Guid ProjectId, Guid EpicId, Guid? TaskId);

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
