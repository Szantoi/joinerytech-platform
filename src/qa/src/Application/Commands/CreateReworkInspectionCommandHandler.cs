using Ardalis.Result;
using SpaceOS.Kernel.Domain.Exceptions;
using MediatR;
using SpaceOS.Modules.QA.Domain.Aggregates;
using SpaceOS.Modules.QA.Domain.Exceptions;
using SpaceOS.Modules.QA.Domain.Repositories;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Application.Commands;

/// <summary>
/// Handler for CreateReworkInspectionCommand (ADR-063).
/// Loads the original inspection (404 when missing), lets the aggregate guard the
/// rework precondition (Completed + Conditional → otherwise 409) and persists the
/// new inspection referencing the original.
/// </summary>
public class CreateReworkInspectionCommandHandler
    : IRequestHandler<CreateReworkInspectionCommand, Result<InspectionId>>
{
    private readonly IInspectionRepository _inspectionRepository;

    public CreateReworkInspectionCommandHandler(IInspectionRepository inspectionRepository)
    {
        _inspectionRepository = inspectionRepository;
    }

    public async Task<Result<InspectionId>> Handle(CreateReworkInspectionCommand request, CancellationToken ct)
    {
        try
        {
            var original = await _inspectionRepository
                .GetByIdAsync(request.OriginalInspectionId, request.TenantId, ct)
                .ConfigureAwait(false);

            if (original == null)
                return Result<InspectionId>.NotFound("Inspection not found");

            var rework = Inspection.CreateRework(original, request.InspectorId, request.PlannedAt);

            await _inspectionRepository.AddAsync(rework, ct).ConfigureAwait(false);

            return Result<InspectionId>.Success(rework.Id);
        }
        catch (InvalidStatusTransitionException ex)
        {
            // Original not in Completed+Conditional state -> HTTP 409 at the endpoint
            return Result<InspectionId>.Conflict(ex.Message);
        }
        catch (DomainException ex)
        {
            // Payload validation (missing inspector, past plannedAt) -> HTTP 400
            return Result<InspectionId>.Invalid(new ValidationError(ex.Message));
        }
        catch (Exception ex)
        {
            return Result<InspectionId>.Error($"Failed to create rework inspection: {ex.Message}");
        }
    }
}
