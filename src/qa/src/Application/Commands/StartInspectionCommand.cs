using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Application.Commands;

/// <summary>
/// Command to start an inspection (FSM: Planned → InProgress).
/// </summary>
public record StartInspectionCommand(
    InspectionId InspectionId,
    Guid TenantId
) : IRequest<Result>;
