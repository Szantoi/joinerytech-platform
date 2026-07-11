using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.Kontrolling.Application.DTOs;

namespace SpaceOS.Modules.Kontrolling.Application.Queries;

/// <summary>
/// Query: Get variance analysis comparing planned vs actual costs by category
/// </summary>
public record GetVarianceAnalysisQuery(Guid ProjectId, Guid TenantId) : IRequest<Result<VarianceAnalysisDto>>;
