using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;

namespace SpaceOS.Modules.Ehs.Application.HazardousMaterials.Commands.UpdateHazardousMaterial;

/// <summary>
/// Handler for UpdateHazardousMaterialCommand.
/// Not-found → KeyNotFoundException (404); archived material → InvalidOperationException (409).
/// </summary>
public class UpdateHazardousMaterialCommandHandler : IRequestHandler<UpdateHazardousMaterialCommand, Unit>
{
    private readonly IHazardousMaterialRepository _repository;
    private readonly IEhsLocationRepository _locationRepository;

    public UpdateHazardousMaterialCommandHandler(
        IHazardousMaterialRepository repository,
        IEhsLocationRepository locationRepository)
    {
        _repository = repository;
        _locationRepository = locationRepository;
    }

    public async Task<Unit> Handle(UpdateHazardousMaterialCommand request, CancellationToken ct)
    {
        var material = await _repository.GetByIdAsync(request.MaterialId, request.TenantId, ct).ConfigureAwait(false)
            ?? throw new KeyNotFoundException($"Hazardous material {request.MaterialId} not found");

        // Guard: the new storage location must exist within the same tenant
        var locationExists = await _locationRepository
            .ExistsAsync(request.StorageLocationId, request.TenantId, ct)
            .ConfigureAwait(false);

        if (!locationExists)
            throw new InvalidOperationException($"Storage location {request.StorageLocationId} not found");

        material.UpdateMasterData(
            request.Name,
            request.Supplier,
            request.StorageLocationId,
            request.QuantityOnSite,
            request.Unit,
            request.CasNumber,
            request.GhsHazardClasses);

        await _repository.UpdateAsync(material, ct).ConfigureAwait(false);

        return Unit.Value;
    }
}
