using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.Kontrolling.Application.DTOs;

namespace SpaceOS.Modules.Kontrolling.Application.Queries;

/// <summary>
/// Query: Get EAC (Estimate at Completion) calculation for a project
/// </summary>
public record GetEACCalculationQuery(Guid ProjectId, Guid TenantId) : IRequest<Result<EACCalculationDto>>;
