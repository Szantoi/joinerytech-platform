using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Domain.Aggregates.LocationAggregate;

namespace SpaceOS.Modules.Ehs.Application.Locations.Commands.CreateLocation;

/// <summary>
/// Handler for CreateLocationCommand.
/// Verifies the parent exists (when provided) before creating the node.
/// </summary>
public class CreateLocationCommandHandler : IRequestHandler<CreateLocationCommand, Guid>
{
    private readonly IEhsLocationRepository _repository;

    public CreateLocationCommandHandler(IEhsLocationRepository repository)
    {
        _repository = repository;
    }

    public async Task<Guid> Handle(CreateLocationCommand request, CancellationToken ct)
    {
        // Guard: the parent node must exist within the same tenant
        if (request.ParentLocationId.HasValue)
        {
            var parentExists = await _repository
                .ExistsAsync(request.ParentLocationId.Value, request.TenantId, ct)
                .ConfigureAwait(false);

            if (!parentExists)
                throw new InvalidOperationException($"Parent location {request.ParentLocationId} not found");
        }

        var location = EhsLocation.Create(
            request.TenantId,
            request.Code,
            request.Name,
            request.Kind,
            request.ParentLocationId);

        await _repository.AddAsync(location, ct).ConfigureAwait(false);

        return location.LocationId;
    }
}
