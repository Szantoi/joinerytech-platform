using MediatR;
using Microsoft.Extensions.Logging;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Domain.Aggregates.IncidentAggregate;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.AddControlMeasure;

/// <summary>
/// Handler for AddControlMeasureCommand.
/// 1. Adds the control to the aggregate (guard: assessment must not be archived).
/// 2. When CAPA data is provided, spawns a CorrectiveAction with
///    Source=RiskAssessment (unified CAPA) and links it to the control.
/// Not-found → KeyNotFoundException (404); illegal state → InvalidOperationException (409).
/// </summary>
public class AddControlMeasureCommandHandler
    : IRequestHandler<AddControlMeasureCommand, AddControlMeasureResult>
{
    private readonly IRiskAssessmentRepository _repository;
    private readonly ICorrectiveActionRepository _capaRepository;
    private readonly ILogger<AddControlMeasureCommandHandler> _logger;

    public AddControlMeasureCommandHandler(
        IRiskAssessmentRepository repository,
        ICorrectiveActionRepository capaRepository,
        ILogger<AddControlMeasureCommandHandler> logger)
    {
        _repository = repository;
        _capaRepository = capaRepository;
        _logger = logger;
    }

    public async Task<AddControlMeasureResult> Handle(AddControlMeasureCommand request, CancellationToken ct)
    {
        var riskAssessment = await _repository
            .GetByIdAsync(request.RiskAssessmentId, request.TenantId, ct)
            .ConfigureAwait(false)
            ?? throw new KeyNotFoundException($"RiskAssessment {request.RiskAssessmentId} not found");

        var control = riskAssessment.AddControl(
            request.ControlMeasure,
            request.ResponsiblePerson);

        Guid? correctiveActionId = null;

        // Optional CAPA generation through the unified mechanism
        if (request.CapaAssignedTo.HasValue && request.CapaDueDate.HasValue)
        {
            var capa = CorrectiveAction.CreateForRiskAssessment(
                request.TenantId,
                riskAssessment.RiskAssessmentId,
                request.CapaDescription ?? request.ControlMeasure,
                request.CapaAssignedTo.Value,
                request.CapaDueDate.Value);

            riskAssessment.LinkControlCorrectiveAction(control.RiskControlId, capa.CorrectiveActionId);

            await _capaRepository.AddAsync(capa, ct).ConfigureAwait(false);
            correctiveActionId = capa.CorrectiveActionId;
        }

        await _repository.UpdateAsync(riskAssessment, ct).ConfigureAwait(false);

        _logger.LogInformation(
            "Control {RiskControlId} added to risk assessment {RiskAssessmentId} (CAPA: {CorrectiveActionId})",
            control.RiskControlId, riskAssessment.RiskAssessmentId, correctiveActionId);

        return new AddControlMeasureResult(control.RiskControlId, correctiveActionId);
    }
}
