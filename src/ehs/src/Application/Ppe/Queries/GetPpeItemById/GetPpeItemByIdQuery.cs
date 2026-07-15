using MediatR;
using SpaceOS.Modules.Ehs.Application.Ppe.DTOs;

namespace SpaceOS.Modules.Ehs.Application.Ppe.Queries.GetPpeItemById;

/// <summary>
/// Query for a single PPE catalogue item
/// </summary>
public record GetPpeItemByIdQuery(
    Guid PpeItemId,
    Guid TenantId
) : IRequest<PpeItemDto>;
