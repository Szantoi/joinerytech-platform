using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Domain.Enums;

namespace SpaceOS.Modules.QA.Application.Commands;

/// <summary>
/// Command to update inspection criteria for a QA checkpoint (owned collection update).
/// </summary>
public record UpdateQACheckpointCriteriaCommand(
    Guid CheckpointId,
    List<CriteriaItemForUpdate> Criteria,
    Guid TenantId
) : IRequest<Result>;

/// <summary>
/// Represents a single criteria item in the update request.
/// </summary>
public record CriteriaItemForUpdate(
    CriteriaType Type,
    string Description,
    string? AcceptanceThreshold
);
