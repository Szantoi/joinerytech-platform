using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;

namespace SpaceOS.Modules.Ehs.Application.Ppe.Commands.ReturnPpeIssuance;

/// <summary>
/// Handler for ReturnPpeIssuanceCommand.
/// Not-found → KeyNotFoundException (404); illegal transition → InvalidOperationException (409).
/// </summary>
public class ReturnPpeIssuanceCommandHandler : IRequestHandler<ReturnPpeIssuanceCommand, Unit>
{
    private readonly IPpeIssuanceRepository _repository;

    public ReturnPpeIssuanceCommandHandler(IPpeIssuanceRepository repository)
    {
        _repository = repository;
    }

    public async Task<Unit> Handle(ReturnPpeIssuanceCommand request, CancellationToken ct)
    {
        var issuance = await _repository.GetByIdAsync(request.IssuanceId, request.TenantId, ct).ConfigureAwait(false)
            ?? throw new KeyNotFoundException($"PPE issuance {request.IssuanceId} not found");

        issuance.Return();

        await _repository.UpdateAsync(issuance, ct).ConfigureAwait(false);

        return Unit.Value;
    }
}
