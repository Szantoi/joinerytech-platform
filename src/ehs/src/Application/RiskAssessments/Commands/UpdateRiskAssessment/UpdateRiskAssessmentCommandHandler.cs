using MediatR;
using Microsoft.Extensions.Logging;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Domain.Aggregates.RiskAssessmentAggregate;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.UpdateRiskAssessment;

/// <summary>
/// Handler for UpdateRiskAssessmentCommand.
/// Not-found → KeyNotFoundException (404); non-Draft state → InvalidOperationException (409).
/// </summary>
public class UpdateRiskAssessmentCommandHandler : IRequestHandler<UpdateRiskAssessmentCommand, Unit>
{
    private readonly IRiskAssessmentRepository _repository;
    private readonly IEhsLocationRepository _locationRepository;
    private readonly RiskBandConfiguration _bands;
    private readonly ILogger<UpdateRiskAssessmentCommandHandler> _logger;

    public UpdateRiskAssessmentCommandHandler(
        IRiskAssessmentRepository repository,
        IEhsLocationRepository locationRepository,
        RiskBandConfiguration bands,
        ILogger<UpdateRiskAssessmentCommandHandler> logger)
    {
        _repository = repository;
        _locationRepository = locationRepository;
        _bands = bands;
        _logger = logger;
    }

    public async Task<Unit> Handle(UpdateRiskAssessmentCommand request, CancellationToken ct)
    {
        var riskAssessment = await _repository
            .GetByIdAsync(request.RiskAssessmentId, request.TenantId, ct)
            .ConfigureAwait(false)
            ?? throw new KeyNotFoundException($"RiskAssessment {request.RiskAssessmentId} not found");

        // Guard: the referenced location must exist within the same tenant
        if (request.LocationId.HasValue)
        {
            var locationExists = await _locationRepository
                .ExistsAsync(request.LocationId.Value, request.TenantId, ct)
                .ConfigureAwait(false);

            if (!locationExists)
                throw new InvalidOperationException($"Location {request.LocationId} not found");
        }

        riskAssessment.UpdateDetails(
            request.HazardDescription,
            request.Severity,
            request.Likelihood,
            request.ReviewDueDate,
            _bands,
            request.LocationId
        );

        await _repository.UpdateAsync(riskAssessment, ct).ConfigureAwait(false);

        _logger.LogInformation(
            "Risk assessment {RiskAssessmentId} updated (score {RiskScore}, level {RiskLevel})",
            riskAssessment.RiskAssessmentId, riskAssessment.RiskScore, riskAssessment.RiskLevel);

        return Unit.Value;
    }
}
