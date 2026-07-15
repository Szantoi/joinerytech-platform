using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.Ppe.DTOs;

namespace SpaceOS.Modules.Ehs.Application.Ppe.Queries.ListPpeIssuances;

/// <summary>
/// Query for PPE issuance listing.
/// The same query backs /ppe-issuances, /ppe-issuances/by-employee/{id}
/// and /ppe-issuances/expiring — they differ only in the filter.
/// </summary>
public record ListPpeIssuancesQuery(
    Guid TenantId,
    PpeIssuanceFilter Filter
) : IRequest<List<PpeIssuanceDto>>;
