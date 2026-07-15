using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;

namespace SpaceOS.Modules.Ehs.Application.Ppe.Commands.UpdatePpeItem;

/// <summary>
/// Handler for UpdatePpeItemCommand.
/// Not-found → KeyNotFoundException (404); inactive item → InvalidOperationException (409).
/// </summary>
public class UpdatePpeItemCommandHandler : IRequestHandler<UpdatePpeItemCommand, Unit>
{
    private readonly IPpeItemRepository _repository;

    public UpdatePpeItemCommandHandler(IPpeItemRepository repository)
    {
        _repository = repository;
    }

    public async Task<Unit> Handle(UpdatePpeItemCommand request, CancellationToken ct)
    {
        var item = await _repository.GetByIdAsync(request.PpeItemId, request.TenantId, ct).ConfigureAwait(false)
            ?? throw new KeyNotFoundException($"PPE item {request.PpeItemId} not found");

        item.Update(request.Name, request.Category, request.StandardRef, request.DefaultLifetimeMonths);

        await _repository.UpdateAsync(item, ct).ConfigureAwait(false);

        return Unit.Value;
    }
}
