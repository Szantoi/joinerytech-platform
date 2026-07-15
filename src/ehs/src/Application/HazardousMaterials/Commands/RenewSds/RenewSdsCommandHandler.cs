using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;

namespace SpaceOS.Modules.Ehs.Application.HazardousMaterials.Commands.RenewSds;

/// <summary>
/// Handler for RenewSdsCommand.
/// Not-found → KeyNotFoundException (404); archived material → InvalidOperationException (409).
/// </summary>
public class RenewSdsCommandHandler : IRequestHandler<RenewSdsCommand, Unit>
{
    private readonly IHazardousMaterialRepository _repository;

    public RenewSdsCommandHandler(IHazardousMaterialRepository repository)
    {
        _repository = repository;
    }

    public async Task<Unit> Handle(RenewSdsCommand request, CancellationToken ct)
    {
        var material = await _repository.GetByIdAsync(request.MaterialId, request.TenantId, ct).ConfigureAwait(false)
            ?? throw new KeyNotFoundException($"Hazardous material {request.MaterialId} not found");

        material.RenewSds(request.NewIssuedAt, request.NewExpiresAt, request.NewSdsDocumentId);

        await _repository.UpdateAsync(material, ct).ConfigureAwait(false);

        return Unit.Value;
    }
}
