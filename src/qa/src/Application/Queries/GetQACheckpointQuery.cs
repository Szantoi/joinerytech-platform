using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Application.DTOs;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Application.Queries;

/// <summary>
/// Query to get a single QA checkpoint by ID.
/// </summary>
public record GetQACheckpointQuery(
    QACheckpointId CheckpointId,
    Guid TenantId
) : IRequest<Result<QACheckpointDto>>;
