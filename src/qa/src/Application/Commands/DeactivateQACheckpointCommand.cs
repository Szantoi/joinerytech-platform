using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Application.Commands;

/// <summary>
/// Command to deactivate a QA checkpoint (soft delete).
/// </summary>
public record DeactivateQACheckpointCommand(
    QACheckpointId CheckpointId,
    Guid TenantId
) : IRequest<Result>;
