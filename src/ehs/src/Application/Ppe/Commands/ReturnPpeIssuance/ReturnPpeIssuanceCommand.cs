using MediatR;

namespace SpaceOS.Modules.Ehs.Application.Ppe.Commands.ReturnPpeIssuance;

/// <summary>
/// Command for FSM transition Acknowledged → Returned (visszavétel)
/// </summary>
public record ReturnPpeIssuanceCommand(
    Guid IssuanceId,
    Guid TenantId
) : IRequest<Unit>;
