using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;

namespace SpaceOS.Modules.Ehs.Application.Ppe.Commands.AcknowledgePpeIssuance;

/// <summary>
/// Handler for AcknowledgePpeIssuanceCommand.
/// Not-found → KeyNotFoundException (404); illegal transition → InvalidOperationException (409).
/// </summary>
public class AcknowledgePpeIssuanceCommandHandler : IRequestHandler<AcknowledgePpeIssuanceCommand, Unit>
{
    private readonly IPpeIssuanceRepository _repository;

    public AcknowledgePpeIssuanceCommandHandler(IPpeIssuanceRepository repository)
    {
        _repository = repository;
    }

    public async Task<Unit> Handle(AcknowledgePpeIssuanceCommand request, CancellationToken ct)
    {
        var issuance = await _repository.GetByIdAsync(request.IssuanceId, request.TenantId, ct).ConfigureAwait(false)
            ?? throw new KeyNotFoundException($"PPE issuance {request.IssuanceId} not found");

        issuance.Acknowledge();

        await _repository.UpdateAsync(issuance, ct).ConfigureAwait(false);

        return Unit.Value;
    }
}
