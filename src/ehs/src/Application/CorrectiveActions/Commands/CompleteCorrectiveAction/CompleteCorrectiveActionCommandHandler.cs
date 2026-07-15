using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;

namespace SpaceOS.Modules.Ehs.Application.CorrectiveActions.Commands.CompleteCorrectiveAction;

/// <summary>
/// Handler for CompleteCorrectiveActionCommand.
/// Not-found → KeyNotFoundException (404); already completed → InvalidOperationException (409).
/// </summary>
public class CompleteCorrectiveActionCommandHandler : IRequestHandler<CompleteCorrectiveActionCommand, Unit>
{
    private readonly ICorrectiveActionRepository _repository;

    public CompleteCorrectiveActionCommandHandler(ICorrectiveActionRepository repository)
    {
        _repository = repository;
    }

    public async Task<Unit> Handle(CompleteCorrectiveActionCommand request, CancellationToken ct)
    {
        var action = await _repository
            .GetByIdAsync(request.CorrectiveActionId, request.TenantId, ct)
            .ConfigureAwait(false)
            ?? throw new KeyNotFoundException($"Corrective action {request.CorrectiveActionId} not found");

        action.MarkCompleted();

        await _repository.UpdateAsync(action, ct).ConfigureAwait(false);

        return Unit.Value;
    }
}
