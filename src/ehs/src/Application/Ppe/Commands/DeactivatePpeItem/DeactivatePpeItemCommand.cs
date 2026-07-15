using MediatR;

namespace SpaceOS.Modules.Ehs.Application.Ppe.Commands.DeactivatePpeItem;

/// <summary>
/// Command to soft-deactivate a PPE catalogue item
/// </summary>
public record DeactivatePpeItemCommand(
    Guid PpeItemId,
    Guid TenantId
) : IRequest<Unit>;
