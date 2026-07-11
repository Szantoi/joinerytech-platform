using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.Kontrolling.Application.DTOs;

namespace SpaceOS.Modules.Kontrolling.Application.Queries;

/// <summary>
/// Query: Get overhead configuration for a tenant
/// </summary>
public record GetOverheadConfigQuery(Guid TenantId) : IRequest<Result<OverheadConfigDto>>;
