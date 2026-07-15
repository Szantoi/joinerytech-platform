using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;

namespace SpaceOS.Modules.Ehs.Application.Locations.Commands.UpdateLocation;

/// <summary>
/// Handler for UpdateLocationCommand.
/// Not-found → KeyNotFoundException (404); domain guard violation → InvalidOperationException (409).
/// </summary>
public class UpdateLocationCommandHandler : IRequestHandler<UpdateLocationCommand, Unit>
{
    private readonly IEhsLocationRepository _repository;

    public UpdateLocationCommandHandler(IEhsLocationRepository repository)
    {
        _repository = repository;
    }

    public async Task<Unit> Handle(UpdateLocationCommand request, CancellationToken ct)
    {
        var location = await _repository.GetByIdAsync(request.LocationId, request.TenantId, ct).ConfigureAwait(false)
            ?? throw new KeyNotFoundException($"Location {request.LocationId} not found");

        // Guard: the new parent must exist within the same tenant
        if (request.ParentLocationId.HasValue && request.ParentLocationId.Value != location.ParentLocationId)
        {
            var parentExists = await _repository
                .ExistsAsync(request.ParentLocationId.Value, request.TenantId, ct)
                .ConfigureAwait(false);

            if (!parentExists)
                throw new InvalidOperationException($"Parent location {request.ParentLocationId} not found");
        }

        location.Update(request.Code, request.Name, request.Kind, request.ParentLocationId);

        await _repository.UpdateAsync(location, ct).ConfigureAwait(false);

        return Unit.Value;
    }
}
