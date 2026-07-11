using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Domain.Repositories;

namespace SpaceOS.Modules.QA.Application.Commands;

/// <summary>
/// Handler for AddInspectionFailureNoteCommand.
/// </summary>
public class AddInspectionFailureNoteCommandHandler : IRequestHandler<AddInspectionFailureNoteCommand, Result>
{
    private readonly IInspectionRepository _inspectionRepository;

    public AddInspectionFailureNoteCommandHandler(IInspectionRepository inspectionRepository)
    {
        _inspectionRepository = inspectionRepository;
    }

    public async Task<Result> Handle(AddInspectionFailureNoteCommand request, CancellationToken ct)
    {
        try
        {
            // Get the inspection
            var inspection = await _inspectionRepository
                .GetByIdAsync(request.InspectionId, request.TenantId, ct)
                .ConfigureAwait(false);

            if (inspection == null)
                return Result.NotFound("Inspection not found");

            // Add failure note
            inspection.AddFailureNote(
                request.FailureType,
                request.Description,
                request.PhotoUrl);

            // Save changes
            await _inspectionRepository.UpdateAsync(inspection, ct).ConfigureAwait(false);

            return Result.Success();
        }
        catch (Exception ex)
        {
            return Result.Error($"Failed to add inspection failure note: {ex.Message}");
        }
    }
}
