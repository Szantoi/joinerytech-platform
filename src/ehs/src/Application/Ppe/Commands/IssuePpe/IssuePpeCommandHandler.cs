using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Domain.Aggregates.PpeAggregate;

namespace SpaceOS.Modules.Ehs.Application.Ppe.Commands.IssuePpe;

/// <summary>
/// Handler for IssuePpeCommand.
/// Verifies the PPE item exists and is active; derives the expiry from
/// PpeItem.DefaultLifetimeMonths when no explicit expiry is provided.
/// </summary>
public class IssuePpeCommandHandler : IRequestHandler<IssuePpeCommand, Guid>
{
    private readonly IPpeIssuanceRepository _issuanceRepository;
    private readonly IPpeItemRepository _itemRepository;

    public IssuePpeCommandHandler(
        IPpeIssuanceRepository issuanceRepository,
        IPpeItemRepository itemRepository)
    {
        _issuanceRepository = issuanceRepository;
        _itemRepository = itemRepository;
    }

    public async Task<Guid> Handle(IssuePpeCommand request, CancellationToken ct)
    {
        var item = await _itemRepository.GetByIdAsync(request.PpeItemId, request.TenantId, ct).ConfigureAwait(false)
            ?? throw new InvalidOperationException($"PPE item {request.PpeItemId} not found");

        if (!item.IsActive)
            throw new InvalidOperationException("Cannot issue an inactive PPE item");

        // Derive expiry from the catalogue default when not provided explicitly
        var expiresAt = request.ExpiresAt;
        if (!expiresAt.HasValue && item.DefaultLifetimeMonths.HasValue)
            expiresAt = DateTimeOffset.UtcNow.AddMonths(item.DefaultLifetimeMonths.Value);

        var issuance = PpeIssuance.Issue(
            request.TenantId,
            request.EmployeeId,
            request.PpeItemId,
            request.IssuedBy,
            request.Quantity,
            expiresAt);

        await _issuanceRepository.AddAsync(issuance, ct).ConfigureAwait(false);

        return issuance.IssuanceId;
    }
}
