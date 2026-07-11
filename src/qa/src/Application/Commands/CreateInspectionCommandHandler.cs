using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Domain.Aggregates;
using SpaceOS.Modules.QA.Domain.Repositories;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Application.Commands;

/// <summary>
/// Handler for CreateInspectionCommand.
/// </summary>
public class CreateInspectionCommandHandler : IRequestHandler<CreateInspectionCommand, Result<InspectionId>>
{
    private readonly IInspectionRepository _inspectionRepository;

    public CreateInspectionCommandHandler(IInspectionRepository inspectionRepository)
    {
        _inspectionRepository = inspectionRepository;
    }

    public async Task<Result<InspectionId>> Handle(CreateInspectionCommand request, CancellationToken ct)
    {
        try
        {
            // Create the inspection
            var inspection = Inspection.Create(
                request.TenantId,
                request.CheckpointId,
                request.InspectorId,
                request.PlannedAt,
                request.OrderId,
                request.ProductId);

            // Save to repository
            await _inspectionRepository.AddAsync(inspection, ct).ConfigureAwait(false);

            return Result<InspectionId>.Success(inspection.Id);
        }
        catch (Exception ex)
        {
            return Result<InspectionId>.Error($"Failed to create inspection: {ex.Message}");
        }
    }
}
