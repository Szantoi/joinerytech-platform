using MediatR;
using SpaceOS.Modules.Ehs.Application.SafetyWalks.DTOs;

namespace SpaceOS.Modules.Ehs.Application.SafetyWalks.Queries.GetSafetyWalkById;

/// <summary>
/// Query for a single safety walk with findings
/// </summary>
public record GetSafetyWalkByIdQuery(
    Guid SafetyWalkId,
    Guid TenantId
) : IRequest<SafetyWalkDto>;
