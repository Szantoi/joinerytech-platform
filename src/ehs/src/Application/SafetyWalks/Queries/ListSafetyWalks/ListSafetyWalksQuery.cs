using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.SafetyWalks.DTOs;

namespace SpaceOS.Modules.Ehs.Application.SafetyWalks.Queries.ListSafetyWalks;

/// <summary>
/// Query for the safety walk list
/// </summary>
public record ListSafetyWalksQuery(
    Guid TenantId,
    SafetyWalkFilter Filter
) : IRequest<List<SafetyWalkListItemDto>>;
