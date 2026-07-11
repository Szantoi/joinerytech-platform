using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Application.DTOs;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Application.Queries;

/// <summary>
/// Query to get a single inspection by ID.
/// </summary>
public record GetInspectionQuery(
    InspectionId InspectionId,
    Guid TenantId
) : IRequest<Result<InspectionDto>>;
