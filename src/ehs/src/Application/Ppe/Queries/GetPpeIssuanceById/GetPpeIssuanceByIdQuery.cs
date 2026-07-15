using MediatR;
using SpaceOS.Modules.Ehs.Application.Ppe.DTOs;

namespace SpaceOS.Modules.Ehs.Application.Ppe.Queries.GetPpeIssuanceById;

/// <summary>
/// Query for a single PPE issuance
/// </summary>
public record GetPpeIssuanceByIdQuery(
    Guid IssuanceId,
    Guid TenantId
) : IRequest<PpeIssuanceDto>;
