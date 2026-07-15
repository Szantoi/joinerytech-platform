using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;

namespace SpaceOS.Modules.Ehs.Application.Locations.Commands.DeactivateLocation;

/// <summary>
/// Handler for DeactivateLocationCommand.
/// Checks the active-children guard against the repository and lets the
/// aggregate enforce it (domain-guarded deactivation).
/// </summary>
public class DeactivateLocationCommandHandler : IRequestHandler<DeactivateLocationCommand, Unit>
{
    private readonly IEhsLocationRepository _repository;

    public DeactivateLocationCommandHandler(IEhsLocationRepository repository)
    {
        _repository = repository;
    }

    public async Task<Unit> Handle(DeactivateLocationCommand request, CancellationToken ct)
    {
        var location = await _repository.GetByIdAsync(request.LocationId, request.TenantId, ct).ConfigureAwait(false)
            ?? throw new KeyNotFoundException($"Location {request.LocationId} not found");

        var hasActiveChildren = await _repository
            .HasActiveChildrenAsync(request.LocationId, request.TenantId, ct)
            .ConfigureAwait(false);

        location.Deactivate(hasActiveChildren);

        await _repository.UpdateAsync(location, ct).ConfigureAwait(false);

        return Unit.Value;
    }
}
