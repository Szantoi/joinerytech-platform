using MediatR;
using SpaceOS.Modules.DMS.Application.DTOs;

namespace SpaceOS.Modules.DMS.Application.Queries;

/// <summary>
/// Query to get a Tag by ID.
/// </summary>
public record GetTagQuery(
    Guid Id,
    Guid TenantId
) : IRequest<TagDto?>;
