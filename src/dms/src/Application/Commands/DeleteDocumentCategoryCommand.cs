using MediatR;

namespace SpaceOS.Modules.DMS.Application.Commands;

/// <summary>
/// Command to delete a DocumentCategory.
/// </summary>
public record DeleteDocumentCategoryCommand(
    Guid Id,
    Guid TenantId
) : IRequest<bool>;
