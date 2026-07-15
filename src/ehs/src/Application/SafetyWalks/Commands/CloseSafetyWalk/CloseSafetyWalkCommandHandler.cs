using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;

namespace SpaceOS.Modules.Ehs.Application.SafetyWalks.Commands.CloseSafetyWalk;

/// <summary>
/// Handler for CloseSafetyWalkCommand.
/// The CAPA completeness check spans the CorrectiveAction aggregate, so the
/// handler verifies it against the unified CAPA repository and passes the
/// result to the domain guard.
/// Not-found → KeyNotFoundException (404); open CAPAs / illegal transition → InvalidOperationException (409).
/// </summary>
public class CloseSafetyWalkCommandHandler : IRequestHandler<CloseSafetyWalkCommand, Unit>
{
    private readonly ISafetyWalkRepository _repository;
    private readonly ICorrectiveActionRepository _capaRepository;

    public CloseSafetyWalkCommandHandler(
        ISafetyWalkRepository repository,
        ICorrectiveActionRepository capaRepository)
    {
        _repository = repository;
        _capaRepository = capaRepository;
    }

    public async Task<Unit> Handle(CloseSafetyWalkCommand request, CancellationToken ct)
    {
        var walk = await _repository.GetByIdAsync(request.SafetyWalkId, request.TenantId, ct).ConfigureAwait(false)
            ?? throw new KeyNotFoundException($"Safety walk {request.SafetyWalkId} not found");

        var allCapasCompleted = await _capaRepository
            .AllCompletedForSourceAsync(walk.SafetyWalkId, request.TenantId, ct)
            .ConfigureAwait(false);

        walk.Close(allCapasCompleted);

        await _repository.UpdateAsync(walk, ct).ConfigureAwait(false);

        return Unit.Value;
    }
}
