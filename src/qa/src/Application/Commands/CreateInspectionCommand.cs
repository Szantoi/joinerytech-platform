using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Application.Commands;

/// <summary>
/// Command to create a new inspection.
/// </summary>
public record CreateInspectionCommand(
    QACheckpointId CheckpointId,
    Guid InspectorId,
    DateTime PlannedAt,
    Guid? OrderId,
    Guid? ProductId,
    Guid TenantId
) : IRequest<Result<InspectionId>>;
