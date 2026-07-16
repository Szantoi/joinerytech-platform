using SpaceOS.Modules.Maintenance.Domain.StrongIds;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Common shape of the work order transition/assignment commands — lets
/// <see cref="WorkOrderTransitionHandlerBase{TCommand}"/> share the
/// load → act → persist → map-to-DTO pipeline and the error contract.
/// </summary>
public interface IWorkOrderTransitionCommand
{
    WorkOrderId WorkOrderId { get; }
    Guid TenantId { get; }
}
