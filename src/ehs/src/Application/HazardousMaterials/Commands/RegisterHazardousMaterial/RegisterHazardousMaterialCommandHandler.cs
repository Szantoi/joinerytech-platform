using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Domain.Aggregates.HazardousMaterialAggregate;

namespace SpaceOS.Modules.Ehs.Application.HazardousMaterials.Commands.RegisterHazardousMaterial;

/// <summary>
/// Handler for RegisterHazardousMaterialCommand.
/// Verifies the storage location exists before registering the material.
/// </summary>
public class RegisterHazardousMaterialCommandHandler : IRequestHandler<RegisterHazardousMaterialCommand, Guid>
{
    private readonly IHazardousMaterialRepository _repository;
    private readonly IEhsLocationRepository _locationRepository;

    public RegisterHazardousMaterialCommandHandler(
        IHazardousMaterialRepository repository,
        IEhsLocationRepository locationRepository)
    {
        _repository = repository;
        _locationRepository = locationRepository;
    }

    public async Task<Guid> Handle(RegisterHazardousMaterialCommand request, CancellationToken ct)
    {
        // Guard: the storage location must exist within the same tenant
        var locationExists = await _locationRepository
            .ExistsAsync(request.StorageLocationId, request.TenantId, ct)
            .ConfigureAwait(false);

        if (!locationExists)
            throw new InvalidOperationException($"Storage location {request.StorageLocationId} not found");

        var material = HazardousMaterial.Create(
            request.TenantId,
            request.Name,
            request.Supplier,
            request.StorageLocationId,
            request.QuantityOnSite,
            request.Unit,
            request.SdsIssuedAt,
            request.SdsExpiresAt,
            request.CasNumber,
            request.GhsHazardClasses,
            request.SdsDocumentId);

        await _repository.AddAsync(material, ct).ConfigureAwait(false);

        return material.MaterialId;
    }
}
