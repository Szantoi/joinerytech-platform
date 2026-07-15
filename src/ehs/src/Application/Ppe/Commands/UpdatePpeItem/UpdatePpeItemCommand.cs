using MediatR;
using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Application.Ppe.Commands.UpdatePpeItem;

/// <summary>
/// Command to update a PPE catalogue item
/// </summary>
public record UpdatePpeItemCommand(
    Guid PpeItemId,
    Guid TenantId,
    string Name,
    PpeCategory Category,
    string? StandardRef,
    int? DefaultLifetimeMonths
) : IRequest<Unit>;
