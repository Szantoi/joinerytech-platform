using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Application.Commands;

/// <summary>
/// Command to complete an inspection with Pass result (FSM: InProgress → Completed).
/// </summary>
public record CompleteInspectionWithPassCommand(
    InspectionId InspectionId,
    string? Notes,
    Guid TenantId
) : IRequest<Result>;
