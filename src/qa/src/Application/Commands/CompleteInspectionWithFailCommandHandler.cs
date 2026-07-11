using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.QA.Domain.Repositories;
using SpaceOS.Modules.QA.Domain.ValueObjects;

namespace SpaceOS.Modules.QA.Application.Commands;

/// <summary>
/// Handler for CompleteInspectionWithFailCommand.
/// </summary>
public class CompleteInspectionWithFailCommandHandler : IRequestHandler<CompleteInspectionWithFailCommand, Result>
{
    private readonly IInspectionRepository _inspectionRepository;

    public CompleteInspectionWithFailCommandHandler(IInspectionRepository inspectionRepository)
    {
        _inspectionRepository = inspectionRepository;
    }

    public async Task<Result> Handle(CompleteInspectionWithFailCommand request, CancellationToken ct)
    {
        try
        {
            // Get the inspection
            var inspection = await _inspectionRepository
                .GetByIdAsync(request.InspectionId, request.TenantId, ct)
                .ConfigureAwait(false);

            if (inspection == null)
                return Result.NotFound("Inspection not found");

            // Convert FailureNoteInput to FailureNote value objects
            var failureNotes = request.FailureNotes
                .Select(fn => FailureNote.Create(fn.FailureType, fn.Description, fn.PhotoUrl))
                .ToList();

            // Complete with Fail result
            inspection.CompleteWithFail(failureNotes, request.Notes);

            // Save changes
            await _inspectionRepository.UpdateAsync(inspection, ct).ConfigureAwait(false);

            return Result.Success();
        }
        catch (Exception ex)
        {
            return Result.Error($"Failed to complete inspection with fail: {ex.Message}");
        }
    }
}
