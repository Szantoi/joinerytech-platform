using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.Ppe.DTOs;

namespace SpaceOS.Modules.Ehs.Application.Ppe.Queries.ListPpeItems;

/// <summary>
/// Query for the PPE catalogue list
/// </summary>
public record ListPpeItemsQuery(
    Guid TenantId,
    PpeItemFilter Filter
) : IRequest<List<PpeItemDto>>;
