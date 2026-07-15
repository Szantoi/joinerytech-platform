using MediatR;
using Microsoft.Extensions.Logging;
using SpaceOS.Modules.Ehs.Application.Contracts;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.ReturnRiskAssessmentToDraft;

/// <summary>
/// FSM: UnderReview → Draft.
/// Not-found → KeyNotFoundException (404); illegal state → InvalidOperationException (409).
/// </summary>
public class ReturnRiskAssessmentToDraftCommandHandler
    : IRequestHandler<ReturnRiskAssessmentToDraftCommand, Unit>
{
    private readonly IRiskAssessmentRepository _repository;
    private readonly ILogger<ReturnRiskAssessmentToDraftCommandHandler> _logger;

    public ReturnRiskAssessmentToDraftCommandHandler(
        IRiskAssessmentRepository repository,
        ILogger<ReturnRiskAssessmentToDraftCommandHandler> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public async Task<Unit> Handle(ReturnRiskAssessmentToDraftCommand request, CancellationToken ct)
    {
        var riskAssessment = await _repository
            .GetByIdAsync(request.RiskAssessmentId, request.TenantId, ct)
            .ConfigureAwait(false)
            ?? throw new KeyNotFoundException($"RiskAssessment {request.RiskAssessmentId} not found");

        riskAssessment.ReturnToDraft();

        await _repository.UpdateAsync(riskAssessment, ct).ConfigureAwait(false);

        _logger.LogInformation(
            "Risk assessment {RiskAssessmentId} returned to draft", riskAssessment.RiskAssessmentId);

        return Unit.Value;
    }
}
