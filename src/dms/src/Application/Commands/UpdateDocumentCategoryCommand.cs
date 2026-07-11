using MediatR;

namespace SpaceOS.Modules.DMS.Application.Commands;

/// <summary>
/// Command to update an existing DocumentCategory.
/// </summary>
public record UpdateDocumentCategoryCommand(
    Guid Id,
    Guid TenantId,
    string Name,
    string? Description
) : IRequest<bool>;
