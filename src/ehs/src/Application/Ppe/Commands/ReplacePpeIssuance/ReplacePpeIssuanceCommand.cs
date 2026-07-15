using MediatR;

namespace SpaceOS.Modules.Ehs.Application.Ppe.Commands.ReplacePpeIssuance;

/// <summary>
/// Command for FSM transition Acknowledged → Replaced (csere).
/// Returns the id of the NEW issuance spawned by the replacement.
/// </summary>
public record ReplacePpeIssuanceCommand(
    Guid IssuanceId,
    Guid TenantId,
    Guid ReplacedBy,
    DateTimeOffset? NewExpiresAt
) : IRequest<Guid>;
