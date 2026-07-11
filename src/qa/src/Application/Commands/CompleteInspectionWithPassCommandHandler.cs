using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Domain.Repositories;

namespace SpaceOS.Modules.QA.Application.Commands;

/// <summary>
/// Handler for CompleteInspectionWithPassCommand.
/// </summary>
public class CompleteInspectionWithPassCommandHandler : IRequestHandler<CompleteInspectionWithPassCommand, Result>
{
    private readonly IInspectionRepository _inspectionRepository;

    public CompleteInspectionWithPassCommandHandler(IInspectionRepository inspectionRepository)
    {
        _inspectionRepository = inspectionRepository;
    }

    public async Task<Result> Handle(CompleteInspectionWithPassCommand request, CancellationToken ct)
    {
        try
        {
            // Get the inspection
            var inspection = await _inspectionRepository
                .GetByIdAsync(request.InspectionId, request.TenantId, ct)
                .ConfigureAwait(false);

            if (inspection == null)
                return Result.NotFound("Inspection not found");

            // Complete with Pass result
            inspection.CompleteWithPass(request.Notes);

            // Save changes
            await _inspectionRepository.UpdateAsync(inspection, ct).ConfigureAwait(false);

            return Result.Success();
        }
        catch (Exception ex)
        {
            return Result.Error($"Failed to complete inspection with pass: {ex.Message}");
        }
    }
}
