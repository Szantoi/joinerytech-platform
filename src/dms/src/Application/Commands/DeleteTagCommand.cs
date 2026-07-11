using MediatR;

namespace SpaceOS.Modules.DMS.Application.Commands;

/// <summary>
/// Command to delete a Tag.
/// </summary>
public record DeleteTagCommand(
    Guid Id,
    Guid TenantId
) : IRequest<bool>;
