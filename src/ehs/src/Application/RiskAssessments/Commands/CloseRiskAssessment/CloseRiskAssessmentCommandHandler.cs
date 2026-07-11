using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.CloseRiskAssessment;

public class CloseRiskAssessmentCommandHandler : IRequestHandler<CloseRiskAssessmentCommand, Unit>
{
    private readonly IRiskAssessmentRepository _repository;

    public CloseRiskAssessmentCommandHandler(IRiskAssessmentRepository repository)
    {
        _repository = repository;
    }

    public async Task<Unit> Handle(CloseRiskAssessmentCommand request, CancellationToken ct)
    {
        var riskAssessment = await _repository.GetByIdAsync(request.RiskAssessmentId, request.TenantId, ct).ConfigureAwait(false);

        if (riskAssessment == null)
            throw new InvalidOperationException($"RiskAssessment {request.RiskAssessmentId} not found");

        riskAssessment.Archive();

        await _repository.UpdateAsync(riskAssessment, ct).ConfigureAwait(false);

        return Unit.Value;
    }
}
