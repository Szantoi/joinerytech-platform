using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Application.Commands;

/// <summary>
/// Command to reactivate a previously deactivated QA checkpoint.
/// </summary>
public record ReactivateQACheckpointCommand(
    QACheckpointId CheckpointId,
    Guid TenantId
) : IRequest<Result>;
