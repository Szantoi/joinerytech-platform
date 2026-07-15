using MediatR;
using Microsoft.Extensions.Logging;
using SpaceOS.Modules.Ehs.Application.Contracts;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.ApproveRiskAssessment;

/// <summary>
/// FSM: UnderReview → Approved.
/// Not-found → KeyNotFoundException (404); illegal state → InvalidOperationException (409).
/// </summary>
public class ApproveRiskAssessmentCommandHandler : IRequestHandler<ApproveRiskAssessmentCommand, Unit>
{
    private readonly IRiskAssessmentRepository _repository;
    private readonly ILogger<ApproveRiskAssessmentCommandHandler> _logger;

    public ApproveRiskAssessmentCommandHandler(
        IRiskAssessmentRepository repository,
        ILogger<ApproveRiskAssessmentCommandHandler> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public async Task<Unit> Handle(ApproveRiskAssessmentCommand request, CancellationToken ct)
    {
        var riskAssessment = await _repository
            .GetByIdAsync(request.RiskAssessmentId, request.TenantId, ct)
            .ConfigureAwait(false)
            ?? throw new KeyNotFoundException($"RiskAssessment {request.RiskAssessmentId} not found");

        riskAssessment.Approve();

        await _repository.UpdateAsync(riskAssessment, ct).ConfigureAwait(false);

        _logger.LogInformation(
            "Risk assessment {RiskAssessmentId} approved (level {RiskLevel})",
            riskAssessment.RiskAssessmentId, riskAssessment.RiskLevel);

        return Unit.Value;
    }
}
