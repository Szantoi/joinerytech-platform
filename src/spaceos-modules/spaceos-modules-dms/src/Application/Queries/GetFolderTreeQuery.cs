using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.DMS.Application.DTOs;
using SpaceOS.Modules.DMS.Domain.StrongIds;

namespace SpaceOS.Modules.DMS.Application.Queries;

/// <summary>
/// Query to get the folder tree (hierarchical structure).
/// </summary>
public record GetFolderTreeQuery(TenantId TenantId) : IRequest<Result<IReadOnlyList<FolderTreeDto>>>;
