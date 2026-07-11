using MediatR;

namespace SpaceOS.Modules.DMS.Application.Commands;

/// <summary>
/// Command to create a new DocumentCategory.
/// </summary>
public record CreateDocumentCategoryCommand(
    Guid TenantId,
    string Name,
    string? Description
) : IRequest<Guid>;
