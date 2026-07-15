using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;

namespace SpaceOS.Modules.Ehs.Application.SafetyWalks.Commands.StartSafetyWalk;

/// <summary>
/// Handler for StartSafetyWalkCommand.
/// Not-found → KeyNotFoundException (404); illegal transition → InvalidOperationException (409).
/// </summary>
public class StartSafetyWalkCommandHandler : IRequestHandler<StartSafetyWalkCommand, Unit>
{
    private readonly ISafetyWalkRepository _repository;

    public StartSafetyWalkCommandHandler(ISafetyWalkRepository repository)
    {
        _repository = repository;
    }

    public async Task<Unit> Handle(StartSafetyWalkCommand request, CancellationToken ct)
    {
        var walk = await _repository.GetByIdAsync(request.SafetyWalkId, request.TenantId, ct).ConfigureAwait(false)
            ?? throw new KeyNotFoundException($"Safety walk {request.SafetyWalkId} not found");

        walk.Start();

        await _repository.UpdateAsync(walk, ct).ConfigureAwait(false);

        return Unit.Value;
    }
}
