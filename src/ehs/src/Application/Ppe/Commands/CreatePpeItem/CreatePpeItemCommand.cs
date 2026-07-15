using MediatR;
using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Application.Ppe.Commands.CreatePpeItem;

/// <summary>
/// Command to create a PPE catalogue item
/// </summary>
public record CreatePpeItemCommand(
    Guid TenantId,
    string Name,
    PpeCategory Category,
    string? StandardRef,
    int? DefaultLifetimeMonths
) : IRequest<Guid>;
