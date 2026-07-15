using MediatR;

namespace SpaceOS.Modules.Ehs.Application.Ppe.Commands.IssuePpe;

/// <summary>
/// Command to record a PPE hand-out (FSM entry: Issued).
/// When ExpiresAt is omitted it is derived from PpeItem.DefaultLifetimeMonths.
/// </summary>
public record IssuePpeCommand(
    Guid TenantId,
    Guid EmployeeId,
    Guid PpeItemId,
    Guid IssuedBy,
    int Quantity,
    DateTimeOffset? ExpiresAt
) : IRequest<Guid>;
