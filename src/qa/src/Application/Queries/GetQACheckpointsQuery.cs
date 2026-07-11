using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Application.DTOs;

namespace SpaceOS.Modules.QA.Application.Queries;

/// <summary>
/// Query to get all active QA checkpoints for a tenant.
/// </summary>
public record GetQACheckpointsQuery(
    Guid TenantId
) : IRequest<Result<QACheckpointListDto[]>>;
