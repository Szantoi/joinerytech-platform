using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.CRM.Application.DTOs;

namespace SpaceOS.Modules.CRM.Application.Queries.GetLeadById;

/// <summary>
/// Query to get a Lead by ID
/// </summary>
public record GetLeadByIdQuery : IRequest<Result<LeadResponse>>
{
    public Guid LeadId { get; init; }
    public Guid TenantId { get; init; }
}
