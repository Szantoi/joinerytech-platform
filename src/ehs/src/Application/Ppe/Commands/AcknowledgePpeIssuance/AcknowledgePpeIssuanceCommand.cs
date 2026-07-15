using MediatR;

namespace SpaceOS.Modules.Ehs.Application.Ppe.Commands.AcknowledgePpeIssuance;

/// <summary>
/// Command for FSM transition Issued → Acknowledged (dolgozói átvétel)
/// </summary>
public record AcknowledgePpeIssuanceCommand(
    Guid IssuanceId,
    Guid TenantId
) : IRequest<Unit>;
