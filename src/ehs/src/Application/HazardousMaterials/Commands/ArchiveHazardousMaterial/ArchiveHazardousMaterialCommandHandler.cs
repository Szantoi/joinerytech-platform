using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;

namespace SpaceOS.Modules.Ehs.Application.HazardousMaterials.Commands.ArchiveHazardousMaterial;

/// <summary>
/// Handler for ArchiveHazardousMaterialCommand.
/// Not-found → KeyNotFoundException (404); already archived → InvalidOperationException (409).
/// </summary>
public class ArchiveHazardousMaterialCommandHandler : IRequestHandler<ArchiveHazardousMaterialCommand, Unit>
{
    private readonly IHazardousMaterialRepository _repository;

    public ArchiveHazardousMaterialCommandHandler(IHazardousMaterialRepository repository)
    {
        _repository = repository;
    }

    public async Task<Unit> Handle(ArchiveHazardousMaterialCommand request, CancellationToken ct)
    {
        var material = await _repository.GetByIdAsync(request.MaterialId, request.TenantId, ct).ConfigureAwait(false)
            ?? throw new KeyNotFoundException($"Hazardous material {request.MaterialId} not found");

        material.Archive();

        await _repository.UpdateAsync(material, ct).ConfigureAwait(false);

        return Unit.Value;
    }
}
