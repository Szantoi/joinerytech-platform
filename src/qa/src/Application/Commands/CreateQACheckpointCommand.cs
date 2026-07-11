using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Application.Commands;

/// <summary>
/// Command to create a new QA checkpoint.
/// </summary>
public record CreateQACheckpointCommand(
    string Name,
    CheckpointType CheckpointType,
    CriticalLevel CriticalLevel,
    string? Description,
    Guid TenantId
) : IRequest<Result<QACheckpointId>>;
