using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Domain.Aggregates.PpeAggregate;

namespace SpaceOS.Modules.Ehs.Application.Ppe.Commands.CreatePpeItem;

/// <summary>
/// Handler for CreatePpeItemCommand
/// </summary>
public class CreatePpeItemCommandHandler : IRequestHandler<CreatePpeItemCommand, Guid>
{
    private readonly IPpeItemRepository _repository;

    public CreatePpeItemCommandHandler(IPpeItemRepository repository)
    {
        _repository = repository;
    }

    public async Task<Guid> Handle(CreatePpeItemCommand request, CancellationToken ct)
    {
        var item = PpeItem.Create(
            request.TenantId,
            request.Name,
            request.Category,
            request.StandardRef,
            request.DefaultLifetimeMonths);

        await _repository.AddAsync(item, ct).ConfigureAwait(false);

        return item.PpeItemId;
    }
}
