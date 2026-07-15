using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Application.SafetyWalks.Commands.CompleteSafetyWalk;

/// <summary>
/// Handler for CompleteSafetyWalkCommand.
/// The aggregate decides the resulting state: ActionRequired when any finding
/// requires action, Closed otherwise.
/// Not-found → KeyNotFoundException (404); illegal transition → InvalidOperationException (409).
/// </summary>
public class CompleteSafetyWalkCommandHandler : IRequestHandler<CompleteSafetyWalkCommand, SafetyWalkStatus>
{
    private readonly ISafetyWalkRepository _repository;

    public CompleteSafetyWalkCommandHandler(ISafetyWalkRepository repository)
    {
        _repository = repository;
    }

    public async Task<SafetyWalkStatus> Handle(CompleteSafetyWalkCommand request, CancellationToken ct)
    {
        var walk = await _repository.GetByIdAsync(request.SafetyWalkId, request.TenantId, ct).ConfigureAwait(false)
            ?? throw new KeyNotFoundException($"Safety walk {request.SafetyWalkId} not found");

        walk.Complete();

        await _repository.UpdateAsync(walk, ct).ConfigureAwait(false);

        return walk.Status;
    }
}
