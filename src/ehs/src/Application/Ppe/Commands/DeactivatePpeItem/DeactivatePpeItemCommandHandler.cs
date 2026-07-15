using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;

namespace SpaceOS.Modules.Ehs.Application.Ppe.Commands.DeactivatePpeItem;

/// <summary>
/// Handler for DeactivatePpeItemCommand.
/// Not-found → KeyNotFoundException (404); already inactive → InvalidOperationException (409).
/// </summary>
public class DeactivatePpeItemCommandHandler : IRequestHandler<DeactivatePpeItemCommand, Unit>
{
    private readonly IPpeItemRepository _repository;

    public DeactivatePpeItemCommandHandler(IPpeItemRepository repository)
    {
        _repository = repository;
    }

    public async Task<Unit> Handle(DeactivatePpeItemCommand request, CancellationToken ct)
    {
        var item = await _repository.GetByIdAsync(request.PpeItemId, request.TenantId, ct).ConfigureAwait(false)
            ?? throw new KeyNotFoundException($"PPE item {request.PpeItemId} not found");

        item.Deactivate();

        await _repository.UpdateAsync(item, ct).ConfigureAwait(false);

        return Unit.Value;
    }
}
