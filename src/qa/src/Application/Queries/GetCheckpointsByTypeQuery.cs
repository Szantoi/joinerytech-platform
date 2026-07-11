using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Application.DTOs;
using SpaceOS.Modules.QA.Domain.Enums;

namespace SpaceOS.Modules.QA.Application.Queries;

/// <summary>
/// Query to get QA checkpoints by checkpoint type.
/// </summary>
public record GetCheckpointsByTypeQuery(
    CheckpointType CheckpointType,
    Guid TenantId
) : IRequest<Result<QACheckpointListDto[]>>;
