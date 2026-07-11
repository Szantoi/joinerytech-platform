using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Application.Commands;

/// <summary>
/// Command to add additional failure note to a completed failed inspection (for audit trail).
/// </summary>
public record AddInspectionFailureNoteCommand(
    InspectionId InspectionId,
    FailureType FailureType,
    string Description,
    string? PhotoUrl,
    Guid TenantId
) : IRequest<Result>;
