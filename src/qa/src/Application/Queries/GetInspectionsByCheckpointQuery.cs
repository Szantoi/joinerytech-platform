using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Application.DTOs;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Application.Queries;

/// <summary>
/// Query to get inspections by checkpoint for analysis.
/// </summary>
public record GetInspectionsByCheckpointQuery(
    QACheckpointId CheckpointId,
    Guid TenantId
) : IRequest<Result<InspectionListDto[]>>;
