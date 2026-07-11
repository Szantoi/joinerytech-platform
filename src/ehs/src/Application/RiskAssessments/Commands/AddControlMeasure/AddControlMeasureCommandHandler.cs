using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.AddControlMeasure;

public class AddControlMeasureCommandHandler : IRequestHandler<AddControlMeasureCommand, Unit>
{
    private readonly IRiskAssessmentRepository _repository;

    public AddControlMeasureCommandHandler(IRiskAssessmentRepository repository)
    {
        _repository = repository;
    }

    public async Task<Unit> Handle(AddControlMeasureCommand request, CancellationToken ct)
    {
        var riskAssessment = await _repository.GetByIdAsync(request.RiskAssessmentId, request.TenantId, ct).ConfigureAwait(false);

        if (riskAssessment == null)
            throw new InvalidOperationException($"RiskAssessment {request.RiskAssessmentId} not found");

        riskAssessment.AddControl(
            request.ControlMeasure,
            request.ResponsiblePerson
        );

        await _repository.UpdateAsync(riskAssessment, ct).ConfigureAwait(false);

        return Unit.Value;
    }
}
