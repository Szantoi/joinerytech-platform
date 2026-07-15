using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;

namespace SpaceOS.Modules.Ehs.Application.SafetyWalks.Commands.CancelSafetyWalk;

/// <summary>
/// Handler for CancelSafetyWalkCommand.
/// Not-found → KeyNotFoundException (404); illegal transition → InvalidOperationException (409).
/// </summary>
public class CancelSafetyWalkCommandHandler : IRequestHandler<CancelSafetyWalkCommand, Unit>
{
    private readonly ISafetyWalkRepository _repository;

    public CancelSafetyWalkCommandHandler(ISafetyWalkRepository repository)
    {
        _repository = repository;
    }

    public async Task<Unit> Handle(CancelSafetyWalkCommand request, CancellationToken ct)
    {
        var walk = await _repository.GetByIdAsync(request.SafetyWalkId, request.TenantId, ct).ConfigureAwait(false)
            ?? throw new KeyNotFoundException($"Safety walk {request.SafetyWalkId} not found");

        walk.Cancel();

        await _repository.UpdateAsync(walk, ct).ConfigureAwait(false);

        return Unit.Value;
    }
}
