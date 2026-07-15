using MediatR;
using Microsoft.Extensions.Logging;
using SpaceOS.Modules.Ehs.Application.Contracts;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.ArchiveRiskAssessment;

/// <summary>
/// FSM: Approved → Archived.
/// Not-found → KeyNotFoundException (404); illegal state → InvalidOperationException (409).
/// </summary>
public class ArchiveRiskAssessmentCommandHandler : IRequestHandler<ArchiveRiskAssessmentCommand, Unit>
{
    private readonly IRiskAssessmentRepository _repository;
    private readonly ILogger<ArchiveRiskAssessmentCommandHandler> _logger;

    public ArchiveRiskAssessmentCommandHandler(
        IRiskAssessmentRepository repository,
        ILogger<ArchiveRiskAssessmentCommandHandler> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public async Task<Unit> Handle(ArchiveRiskAssessmentCommand request, CancellationToken ct)
    {
        var riskAssessment = await _repository
            .GetByIdAsync(request.RiskAssessmentId, request.TenantId, ct)
            .ConfigureAwait(false)
            ?? throw new KeyNotFoundException($"RiskAssessment {request.RiskAssessmentId} not found");

        riskAssessment.Archive();

        await _repository.UpdateAsync(riskAssessment, ct).ConfigureAwait(false);

        _logger.LogInformation(
            "Risk assessment {RiskAssessmentId} archived", riskAssessment.RiskAssessmentId);

        return Unit.Value;
    }
}
