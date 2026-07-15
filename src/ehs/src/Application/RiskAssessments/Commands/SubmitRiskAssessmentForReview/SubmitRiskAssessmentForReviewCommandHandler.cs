using MediatR;
using Microsoft.Extensions.Logging;
using SpaceOS.Modules.Ehs.Application.Contracts;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.SubmitRiskAssessmentForReview;

/// <summary>
/// FSM: Draft → UnderReview.
/// Not-found → KeyNotFoundException (404); illegal state → InvalidOperationException (409).
/// </summary>
public class SubmitRiskAssessmentForReviewCommandHandler
    : IRequestHandler<SubmitRiskAssessmentForReviewCommand, Unit>
{
    private readonly IRiskAssessmentRepository _repository;
    private readonly ILogger<SubmitRiskAssessmentForReviewCommandHandler> _logger;

    public SubmitRiskAssessmentForReviewCommandHandler(
        IRiskAssessmentRepository repository,
        ILogger<SubmitRiskAssessmentForReviewCommandHandler> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public async Task<Unit> Handle(SubmitRiskAssessmentForReviewCommand request, CancellationToken ct)
    {
        var riskAssessment = await _repository
            .GetByIdAsync(request.RiskAssessmentId, request.TenantId, ct)
            .ConfigureAwait(false)
            ?? throw new KeyNotFoundException($"RiskAssessment {request.RiskAssessmentId} not found");

        riskAssessment.SubmitForReview();

        await _repository.UpdateAsync(riskAssessment, ct).ConfigureAwait(false);

        _logger.LogInformation(
            "Risk assessment {RiskAssessmentId} submitted for review", riskAssessment.RiskAssessmentId);

        return Unit.Value;
    }
}
