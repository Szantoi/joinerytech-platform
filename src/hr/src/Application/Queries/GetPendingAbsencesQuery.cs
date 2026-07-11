using Ardalis.Result;
using MediatR;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.HR.Application.DTOs;

namespace SpaceOS.Modules.HR.Application.Queries;

/// <summary>
/// Query to get all pending absences for a tenant.
/// </summary>
public record GetPendingAbsencesQuery(TenantId TenantId) : IRequest<Result<List<AbsenceListDto>>>;
