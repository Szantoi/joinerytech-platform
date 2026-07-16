using Ardalis.Result;
using SpaceOS.Kernel.Domain.Exceptions;
using MediatR;
using SpaceOS.Modules.QA.Domain.Exceptions;
using SpaceOS.Modules.QA.Domain.Repositories;

namespace SpaceOS.Modules.QA.Application.Commands;

/// <summary>
/// Handler for StartInspectionCommand.
/// </summary>
public class StartInspectionCommandHandler : IRequestHandler<StartInspectionCommand, Result>
{
    private readonly IInspectionRepository _inspectionRepository;

    public StartInspectionCommandHandler(IInspectionRepository inspectionRepository)
    {
        _inspectionRepository = inspectionRepository;
    }

    public async Task<Result> Handle(StartInspectionCommand request, CancellationToken ct)
    {
        try
        {
            // Get the inspection
            var inspection = await _inspectionRepository
                .GetByIdAsync(request.InspectionId, request.TenantId, ct)
                .ConfigureAwait(false);

            if (inspection == null)
                return Result.NotFound("Inspection not found");

            // Start the inspection (FSM transition)
            inspection.Start();

            // Save changes
            await _inspectionRepository.UpdateAsync(inspection, ct).ConfigureAwait(false);

            return Result.Success();
        }
        catch (InvalidStatusTransitionException ex)
        {
            // Illegal FSM transition / status-guarded action -> HTTP 409 at the endpoint
            return Result.Conflict(ex.Message);
        }
        catch (DomainException ex)
        {
            // Aggregate payload validation -> HTTP 400 at the endpoint
            return Result.Invalid(new ValidationError(ex.Message));
        }
        catch (Exception ex)
        {
            return Result.Error($"Failed to start inspection: {ex.Message}");
        }
    }
}
