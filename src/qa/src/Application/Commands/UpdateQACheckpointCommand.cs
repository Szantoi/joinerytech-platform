using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Application.Commands;

/// <summary>
/// Command to update an existing QA checkpoint.
/// </summary>
public record UpdateQACheckpointCommand(
    QACheckpointId CheckpointId,
    string Name,
    CriticalLevel CriticalLevel,
    string? Description,
    Guid TenantId
) : IRequest<Result>;
