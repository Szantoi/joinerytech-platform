using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.DMS.Application.DTOs;
using SpaceOS.Modules.DMS.Domain.StrongIds;
using SpaceOS.Modules.DMS.Domain.ValueObjects;

namespace SpaceOS.Modules.DMS.Application.Queries;

/// <summary>
/// Query to search documents with filtering and pagination.
/// </summary>
public record SearchDocumentsQuery(
    TenantId TenantId,
    FolderId? FolderId,
    string? SearchTerm,
    string[]? Tags,
    int PageNumber,
    int PageSize
) : IRequest<Result<PagedResult<DocumentListDto>>>;

/// <summary>
/// Paged result wrapper for queries.
/// </summary>
public record PagedResult<T>(
    IReadOnlyList<T> Items,
    int PageNumber,
    int PageSize,
    int TotalCount
);
